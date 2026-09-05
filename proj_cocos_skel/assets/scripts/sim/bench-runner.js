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
    V4: { textures: 12, rotate: false, scale: false, desc: 'finite multi-texture pressure' }
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
      channel: o.channel,
      mode: 'fixed',
      count: o.count
    };
    function startStats() {
      // 公平性：采集 GPU 信息（WebGL debug_renderer_info / WebGPU adapter info）
      if (self.stats.captureGpuInfo) self.stats.captureGpuInfo();
      // drawCall 每帧采集：把 adapter.readDrawCalls 挂给 stats，采样期逐帧记录
      self.stats._readDrawCalls = self.adapter.readDrawCalls
        ? self.adapter.readDrawCalls.bind(self.adapter)
        : null;
      self.stats.start(o.preWarmSec || 3, o.sampleSec || 10, function (json) {
        json.nodeCount = self.adapter.nodeCount();
        if (self.adapter.readBenchMetrics) {
          var metrics = self.adapter.readBenchMetrics();
          for (var key in metrics) json[key] = metrics[key];
        }
        json.actualBackend = json.actualBackend || json.meta.backend;
        json.backendValid = json.actualBackend === json.meta.backend;
        json.comparisonEligible = json.backendValid;
        self._ramp = null;
        if (self.onReport) self.onReport(json);
      });
    }
    if (!o.preserveScene) this.adapter.init(o.variant || 'V1', o.bounds);
    this.adapter.setCount(o.count);
    // MovieClip 资源异步加载完成后才开始预热/采样，避免结果和画面脱节。
    if (this.adapter.isReady && !this.adapter.isReady()) {
      var waitReady = function () {
        if (self.adapter.isReady()) { startStats(); return; }
        setTimeout(waitReady, 16);
      };
      waitReady();
    } else {
      startStats();
    }
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
    var cap = 0, jankAt = null, idx = 0, invalidCurve = false;
    var sawJank = false;
    // —— 临界点 + 500 细扫（承载力精测）——
    // 临界点（重定义）：首个未达稳定门槛（fps≥55 且 p95≤18.2ms）的档位。
    //   命中前按粗档梯上探；命中后转入 +500 小步长细扫（从最后一个稳定档之上起扫，
    //   cap 分辨率提到 500），连硬掉帧 3 档或越过最高档即收。
    //   全程未触临界点 → 维持原梯跑完到最高档。
    var FINE_STEP = o.fineStep || 500;
    var FINE_MAX_LEVELS = o.fineMaxLevels || 16; // 细扫档数上限（兜底总时长）
    var fine = false, fineNext = 0, fineCount = 0, fineJankStreak = 0;
    var unstableStreak = 0;
    var thresholdAt = null, fineStart = null;
    var tested = 0;
    var MAXC = COUNTS[COUNTS.length - 1];
    var onLevel = o.onLevel || function () {};
    var onDone = o.onDone || function () {};
    this._autoStop = false;

    function finish() {
      onDone({
        cap: cap, jankAt: jankAt, capped: cap >= MAXC, invalidCurve: invalidCurve,
        thresholdAt: thresholdAt, fineStart: fine ? fineStart : null, fineStep: fine ? FINE_STEP : null
      });
    }

    function nextCount() {
      if (fine) {
        if (fineCount >= FINE_MAX_LEVELS) return null;
        var nc = fineNext + FINE_STEP;
        if (nc > MAXC) return null;
        fineNext = nc;
        fineCount++;
        return nc;
      }
      if (idx >= COUNTS.length) return null;
      var n = COUNTS[idx];
      idx++;
      return n;
    }

    function step() {
      if (self._autoStop) { finish(); return; }
      var n = nextCount();
      if (n == null) { finish(); return; }
      var first = tested === 0;
      var total = COUNTS.length + FINE_MAX_LEVELS;
      onLevel({ phase: 'start', count: n, index: tested, total: total });
      var prevReport = self.onReport;
      var retried = false;
      self.onReport = function (json) {
        // 判定（60Hz vsync 语义）：稳定 = fps≥55（平均锁定 vsync，容忍 8% 滑拍）且 p95≤20ms
        //（95% 的帧最多丢 1 个 vsync）；硬掉帧 = fps<45 或 p95≥35（大面积丢拍）。
        // 旧门槛 p95≤18.2 正好切在 vsync 工况的噪声带里（±2ms 抖动翻转判定）——已按语义放宽
        var stable = json.fps >= 55 && (json.p95 > 0 ? json.p95 <= 20 : true);
        var jank = json.fps < 45 || (json.p95 > 0 && json.p95 >= 35);
        // 档位重试：首判掉帧自动带加倍预热重测一次，重测仍掉帧才计入 jank —— 消除偶发抖动误判。
        // 注意：重试期间不能还原 onReport（否则第二次回报会漏接，ramp 卡死）——
        // onReport 在本档最终定论（重测完成或首判非掉帧）时才还原。
        if (jank && !retried) {
          retried = true;
          onLevel({ phase: 'retry', count: n, index: tested, total: total });
          self.fixedRun({
            engine: o.engine || self.stats.meta.engine,
            variant: o.variant || self.stats.meta.variant,
            backend: o.backend || self.stats.meta.backend,
            count: n,
            preWarmSec: (o.preWarmSec || 2.5) * 2,
            sampleSec: o.sampleSec || 4
          });
          return;
        }
        self.onReport = prevReport;
        // 负载上升后不允许从真实掉帧档恢复稳定；这表示启动/GC/调度污染，整轮不能产出结论。
        if (sawJank && stable) invalidCurve = true;
        if (stable && !sawJank) cap = n;
        // 临界点（防抖版）：需连续 2 档未达稳定门槛才转入 +500 细扫——
        // 单档偶发抖动（GC/调度）由下一档恢复自然吸收，不提前终止粗梯上探
        if (!stable && !fine) {
          unstableStreak++;
          if (unstableStreak >= 2) {
            fine = true;
            if (thresholdAt == null) thresholdAt = n;
            fineNext = cap > 0 ? cap : n - FINE_STEP;
            fineStart = fineNext + FINE_STEP;
            fineCount = 0;
            fineJankStreak = 0;
          }
        } else if (stable) {
          unstableStreak = 0;
        }
        if (jank) {
          sawJank = true;
          if (jankAt == null) jankAt = n;
          if (fine) fineJankStreak++;
        } else if (fine) {
          fineJankStreak = 0;
        }
        json.retried = retried;
        json.fine = fine;
        onLevel({ phase: 'done', count: n, index: tested, total: total, json: json, stable: stable, fine: fine });
        tested++;
        // 细扫收敛：连续 3 档硬掉帧 → cap 已被 500 分辨率夹住，提前收
        if (fine && fineJankStreak >= 3) { finish(); return; }
        step();
      };
      // 加长预热+采样窗口：单个短窗口噪声不再能翻档，提升跨次运行可复现性；
      // 首档预热 ×2（WebGPU 首跑 PSO 编译 / 资源上传集中在第一档）
      self.fixedRun({
        engine: o.engine || self.stats.meta.engine,
        variant: o.variant || self.stats.meta.variant,
        backend: o.backend || self.stats.meta.backend,
        count: n,
        preWarmSec: first ? (o.preWarmSec || 2.5) * 2 : (o.preWarmSec || 2.5),
        sampleSec: o.sampleSec || 4
      });
    }
    step();
  };

  BenchRunner.prototype.stopAuto = function () { this._autoStop = true; };

  /**
   * 角色场景承载力：倍增粗测后，在稳定/失败边界内补测。
   * stable: 采样帧≥120、p95≤20ms、p99≤35ms。
   * 60Hz 浏览器帧间隔围绕 16.67ms 浮动；overBudgetPct（>16.7ms）和
   * p1Low（最慢 1% 平均）会被系统调度、GC 放大，不能单独作为承载力淘汰条件。
   */
  BenchRunner.prototype.capacityRamp = function (opts) {
    var o = opts || {};
    var self = this;
    var coarse = o.counts || [20, 40, 80, 160, 320, 640, 1280, 2560, 5120, 10240, 20480];
    var minGap = o.minGap || 20;
    var results = [];
    var lower = 0, upper = null, coarseIndex = 0;
    var onLevel = o.onLevel || function () {};
    var onDone = o.onDone || function () {};
    var baseReport = this.onReport;
    this._capacityStop = false;

    function stable(json) {
      return json.p95 <= 20 && json.p99 <= 35;
    }
    function valid(json) {
      return json.frames >= 120;
    }
    function finish(cancelled) {
      self.onReport = baseReport;
      onDone({
        cap: lower,
        firstFail: upper,
        results: results,
        cancelled: !!cancelled,
        capped: upper == null && lower === coarse[coarse.length - 1]
      });
    }
    function runCount(count, phase) {
      if (self._capacityStop) { finish(true); return; }
      onLevel({ phase: 'start', stage: phase, count: count, lower: lower, upper: upper, results: results,
        preWarmSec: o.preWarmSec || 3, sampleSec: o.sampleSec || 10 });
      self.onReport = function (json) {
        if (!valid(json)) {
          onLevel({ phase: 'invalid', stage: phase, count: count, json: json, lower: lower, upper: upper, results: results });
          setTimeout(function () {
            if (self._capacityStop) { finish(true); return; }
            runCount(count, phase);
          }, 50);
          return;
        }
        var ok = stable(json);
        results.push({ count: count, stable: ok, json: json });
        onLevel({ phase: 'done', stage: phase, count: count, stable: ok, json: json, lower: lower, upper: upper, results: results });
        setTimeout(function () {
          if (self._capacityStop) { finish(true); return; }
          if (phase === 'coarse') {
            if (ok) {
              lower = count;
              coarseIndex++;
              if (coarseIndex >= coarse.length) { finish(false); return; }
              runCount(coarse[coarseIndex], 'coarse');
            } else {
              upper = count;
              refine();
            }
          } else {
            if (ok) lower = count;
            else upper = count;
            refine();
          }
        }, 50);
      };
      self.fixedRun({
        engine: o.engine || 'unknown', variant: o.variant || 'M1', backend: o.backend || 'webgl',
        count: count, preWarmSec: o.preWarmSec || 3, sampleSec: o.sampleSec || 10,
        preserveScene: results.length > 0
      });
    }
    function refine() {
      if (upper - lower <= minGap) { finish(false); return; }
      var mid = Math.ceil(((lower + upper) / 2) / 10) * 10;
      if (mid >= upper) mid = upper - 10;
      runCount(mid, 'refine');
    }
    runCount(coarse[0], 'coarse');
  };

  BenchRunner.prototype.stopCapacityRamp = function () { this._capacityStop = true; };

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
