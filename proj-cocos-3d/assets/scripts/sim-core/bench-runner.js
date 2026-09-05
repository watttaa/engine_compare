/**
 * BenchRunner — 三引擎统一的基准流程驱动
 *
 * 两种运行模式：
 *  1. fixedRun(count) —— 固定数量，预热+采样，输出 p50/p95/p99（横向对比主数据）
 *  2. rampRun()       —— 阶梯加量直到持续掉帧，得出 maxStableCount（"能扛多少"）
 *
 * 引擎适配器契约（egret/cocos/laya 三个 adapter 都必须实现）：
 * {
 *   init(variant, bounds)   // variant: 'V1'|'V2'|'V3'|'V4'（bunny）或 'boids'
 *   setCount(n)             // 增减节点到 n 个（内部用 BunnySim/BoidsSim）
 *   step(dtMs)              // 推进仿真并把 (x,y[,angle]) 写进显示节点
 *   readDrawCalls()         // 读各自引擎的 drawcall 数（返回当帧值）
 *   nodeCount()             // 当前节点数
 * }
 *
 * Bunny 变体定义（三引擎必须一致）：
 *   V1: 同一张纹理，只改 position          → 测合批上限
 *   V2: N 张纹理轮换（同一 atlas 的不同帧） → 测 atlas 内多帧合批
 *   V3: V1 + 每帧随机 rotation/scale        → 测变换脏标记开销
 *   V4: 每只独立纹理（数量超 atlas 帧数）    → 故意不合批，压提交路径
 */
(function (global) {
  'use strict';

  var VARIANTS = {
    V1: { textures: 1,    rotate: false, scale: false, desc: 'same texture, batched' },
    V2: { textures: 8,    rotate: false, scale: false, desc: 'atlas random frame' },
    V3: { textures: 1,    rotate: true,  scale: true,  desc: 'random transforms' },
    V4: { textures: 9999, rotate: false, scale: false, desc: 'unbatched, unique texture each' }
  };

  function BenchRunner(adapter, stats) {
    this.adapter = adapter;
    this.stats = stats;
    this._ramp = null;
    this._fpsEma = 16.7;
    this._lastTs = 0;
    this.onReport = null; // (json) => void
  }

  BenchRunner.VARIANTS = VARIANTS;

  /** 模式 1：固定数量采样 */
  BenchRunner.prototype.fixedRun = function (opts) {
    var o = opts || {};
    var self = this;
    this.stats.meta = {
      engine: o.engine || 'unknown',
      variant: o.variant || 'V1',
      backend: o.backend || 'webgl',
      mode: 'fixed',
      count: o.count
    };
    this.adapter.init(o.variant || 'V1', o.bounds);
    this.adapter.setCount(o.count);
    // 公平性：采集 GPU 信息（WebGL debug_renderer_info / WebGPU adapter info）
    if (this.stats.captureGpuInfo) this.stats.captureGpuInfo();
    // drawCall 每帧采集：把 adapter.readDrawCalls 挂给 stats，采样期逐帧记录
    this.stats._readDrawCalls = this.adapter.readDrawCalls
      ? this.adapter.readDrawCalls.bind(this.adapter)
      : null;
    this.stats.start(o.preWarmSec || 3, o.sampleSec || 10, function (json) {
      json.nodeCount = self.adapter.nodeCount();
      self._ramp = null;
      if (self.onReport) self.onReport(json);
    });
  };

  /**
   * 模式 2：阶梯加量找 maxStableCount
   * 判定：EMA 帧时间持续 > 1000/fpsThreshold 超过 2 秒 → 回退一阶为结果
   */
  BenchRunner.prototype.rampRun = function (opts) {
    var o = opts || {};
    var self = this;
    this._ramp = {
      stepCount: o.stepCount || 1000,
      stepMs: o.stepMs || 2000,
      maxCount: o.maxCount || 100000,
      thresholdMs: 1000 / (o.fpsThreshold || 55),
      lastStepTs: 0,
      overSince: 0,
      engine: o.engine || 'unknown',
      variant: o.variant || 'V1',
      backend: o.backend || 'webgl'
    };
    this.stats.meta = {
      engine: this._ramp.engine, variant: this._ramp.variant,
      backend: this._ramp.backend, mode: 'ramp'
    };
    this.adapter.init(o.variant || 'V1', o.bounds);
    this.adapter.setCount(this._ramp.stepCount);
    if (this.stats.captureGpuInfo) this.stats.captureGpuInfo();
    this.stats._readDrawCalls = this.adapter.readDrawCalls
      ? this.adapter.readDrawCalls.bind(this.adapter)
      : null;
    this.stats.start(1, 86400, function () {}); // 采样器只做帧计时兜底
    this.stats._onDone = null;
  };

  /**
   * 引擎帧回调入口调用：runner.tick(ts)
   * —— 注意：adapter.step 由各引擎在自己的帧循环里调（为了把仿真的
   * CPU 成本算进引擎帧时间），runner.tick 只负责统计和 ramp 逻辑。
   */
  BenchRunner.prototype.tick = function (ts) {
    this.stats.tick(ts);
    if (!this._ramp) return;

    if (this._lastTs) {
      var dt = ts - this._lastTs;
      if (dt > 0 && dt < 1000) this._fpsEma = this._fpsEma * 0.9 + dt * 0.1;
    }
    this._lastTs = ts;

    var r = this._ramp, cur = this.adapter.nodeCount();
    if (this._fpsEma > r.thresholdMs) {
      if (!r.overSince) r.overSince = ts;
      if (ts - r.overSince > 2000) { // 持续掉帧 2 秒 → 结束
        var json = this.stats.toJSON();
        json.meta = {
          engine: r.engine, variant: r.variant, backend: r.backend, mode: 'ramp'
        };
        json.maxStableCount = Math.max(0, cur - r.stepCount);
        this._ramp = null;
        if (this.onReport) this.onReport(json);
        return;
      }
    } else {
      r.overSince = 0;
    }

    if (ts - r.lastStepTs >= r.stepMs) {
      r.lastStepTs = ts;
      if (cur + r.stepCount <= r.maxCount) this.adapter.setCount(cur + r.stepCount);
    }
  };

  /**
   * 模式 3：一键承载力（固定档位阶梯，逐档预热+采样，掉帧即停）
   * 逻辑对齐 6_21 bunnymark 的 runAuto：
   *   - COUNTS 档位梯（移动端/桌面不同）
   *   - 每档：setCount → 预热 1.2s → 采样 2s → 记录 fps/p95
   *   - fps≥55 记为承载力；fps<50 判定掉帧、停止上探
   * 回调：onLevel({phase:'start'|'done', count, index, total, json, stable})
   *       onDone({cap, jankAt, capped})
   */
  BenchRunner.prototype.autoRamp = function (opts) {
    var o = opts || {};
    var IS_MOBILE = /Android|iPhone|iPad|iPod|Mobile/i.test(global.navigator.userAgent);
    var COUNTS = o.counts || (IS_MOBILE
      ? [1000, 2000, 4000, 8000, 15000, 25000, 40000, 60000]
      : [2000, 5000, 10000, 20000, 40000, 70000, 110000, 160000, 220000, 300000]);
    var self = this;
    var cap = 0, jankAt = null, idx = 0;
    var onLevel = o.onLevel || function () {};
    var onDone = o.onDone || function () {};
    this._autoStop = false;

    function step() {
      if (self._autoStop || idx >= COUNTS.length) {
        onDone({ cap: cap, jankAt: jankAt, capped: cap >= COUNTS[COUNTS.length - 1] });
        return;
      }
      var n = COUNTS[idx];
      onLevel({ phase: 'start', count: n, index: idx, total: COUNTS.length });
      var prevReport = self.onReport;
      self.onReport = function (json) {
        self.onReport = prevReport;
        var stable = json.fps >= 55;
        var jank = json.fps < 50;
        if (stable) cap = n;
        if (jank && jankAt == null) jankAt = n;
        onLevel({ phase: 'done', count: n, index: idx, total: COUNTS.length, json: json, stable: stable });
        idx++;
        if (jank) { onDone({ cap: cap, jankAt: jankAt, capped: false }); return; }
        step();
      };
      self.fixedRun({
        engine: o.engine || self.stats.meta.engine,
        variant: o.variant || self.stats.meta.variant,
        backend: o.backend || self.stats.meta.backend,
        count: n,
        preWarmSec: o.preWarmSec || 2.5,
        sampleSec: o.sampleSec || 4
      });
    }
    step();
  };

  BenchRunner.prototype.stopAuto = function () { this._autoStop = true; };

  /** 指定结果保存目录（File System Access API，Chrome/Edge 支持）；不指定则回退浏览器下载 */
  BenchRunner.saveDirHandle = null;
  BenchRunner.onSaved = null;  // (fileName) => void
  BenchRunner.onCopied = null; // (jsonText) => void —— 复制到剪贴板成功回调（手机端主路径）
  BenchRunner.pickSaveDir = function () {
    if (!window.showDirectoryPicker) {
      alert('当前浏览器不支持指定保存目录，将继续使用下载方式');
      return;
    }
    window.showDirectoryPicker({ mode: 'readwrite' }).then(function (h) {
      BenchRunner.saveDirHandle = h;
    }).catch(function () { /* 用户取消 */ });
  };

  /** 结果 JSON 导出：优先复制到剪贴板（手机友好）→ 本地保存服务 → 指定目录 → 下载。
   *  复制成功则触发 onCopied(text)；手机端粘贴即得完整 JSON。 */
  BenchRunner.exportJSON = function (json) {
    var name = 'bench_' + (json.meta.engine || 'x') + '_' +
      (json.meta.variant || 'x') + '_' + Date.now() + '.json';
    var text = JSON.stringify(json, null, 2);
    // 供编排页（自动测试）通过 iframe 读取：window.__benchLastResult
    try { global.__benchLastResult = json; } catch (e) { /* 忽略 */ }
    function download() {
      var blob = new Blob([text], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      URL.revokeObjectURL(a.href);
    }
    function writeHandle() {
      BenchRunner.saveDirHandle.getFileHandle(name, { create: true }).then(function (fh) {
        return fh.createWritable();
      }).then(function (w) {
        return w.write(text).then(function () { return w.close(); });
      }).then(function () {
        if (BenchRunner.onSaved) BenchRunner.onSaved(name);
      }).catch(function (e) {
        console.error('写入指定目录失败，回退下载:', e);
        download();
      });
    }
    function copyToClipboard() {
      var done = function () { if (BenchRunner.onCopied) BenchRunner.onCopied(text); };
      function fallback() {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;left:-9999px;top:0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); done(); }
        catch (e) { console.error('复制失败，回退下载:', e); download(); }
        document.body.removeChild(ta);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(fallback);
      } else {
        fallback();
      }
    }
    // 手机端优先复制（本地 save-server 在静态页面上必然不可达，直接跳到复制更省时）
    if (window.location.protocol === 'file:' ||
        (window.location.hostname && !window.location.hostname.match(/127\.0\.0\.1|localhost/))) {
      copyToClipboard();
      return;
    }
    if (window.fetch) {
      fetch('http://127.0.0.1:8081/save?name=' + encodeURIComponent(name), {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: text
      }).then(function (r) {
        if (!r.ok) throw new Error('http ' + r.status);
        if (BenchRunner.onSaved) BenchRunner.onSaved(name);
      }).catch(function () {
        if (BenchRunner.saveDirHandle) writeHandle(); else copyToClipboard();
      });
    } else if (BenchRunner.saveDirHandle) {
      writeHandle();
    } else {
      copyToClipboard();
    }
  };

  global.BenchRunner = BenchRunner;
})(typeof window !== 'undefined' ? window : globalThis);
