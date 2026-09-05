/**
 * Egret 适配器（自研 5.4.1，标准显示列表路径）
 * 实现 BenchRunner 契约：init / setCount / step / readDrawCalls / nodeCount
 *
 * 说明：
 *  - 纹理全部运行时生成/加载，不依赖 RES 模块，HTML 直接可跑
 *  - DrawCall 走引擎官方区间统计：egret.sys.startGetPerformance(1000) +
 *    egret.sys.getPerformace().drawCall（1 秒窗口每帧均值，V1 下基本恒定，可信）
 *  - V3 的 rotation/scale 用确定性公式（不依赖 Math.random 每帧值），三引擎一致：
 *      rotation += rotSpeed(生成时固定)；scale = 0.75 + 0.25*sin(phase)，phase += 0.1
 *  - V4 = 64 张互不相同的纹理循环分配（相邻节点纹理必不同 → 不合批）
 */
(function () {
  'use strict';

  var BUNNY_IMGS = [ // 三引擎统一资源：V1 用第 0 张；V2 循环前 8 张；V4 循环全部 12 张
    'rabbitv3.png', 'rabbitv3_ash.png', 'rabbitv3_batman.png', 'rabbitv3_bb8.png',
    'rabbitv3_neo.png', 'rabbitv3_sonic.png', 'rabbitv3_spidey.png', 'rabbitv3_stormtrooper.png',
    'rabbitv3_superman.png', 'rabbitv3_tron.png', 'rabbitv3_wolverine.png', 'rabbitv3_frankenstein.png'
  ];
  var FISH_IMGS = [ // boids 5 鱼种（3 张真鱼图 + 复用凑 5 种，species%5 轮换）
    'fish/fish_1.png', 'fish/fish_2.png', 'fish/fish_3.png', 'fish/fish_1.png', 'fish/fish_2.png'
  ];

  // ---------------- 资源：img -> egret.Texture ----------------
  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = reject;
      img.src = src;
    });
  }

  function texFrom(source) {
    var bd = new egret.BitmapData(source);
    // 动态合图（TextureAtlasManager）以 uriValue 作 grid 唯一键。uriValue 是只读 getter，
    // 由 bd.url 的 setter 派生（openAutoBatch 为 true 时：$uriValue = hashCode(url)）。
    // 故给每张运行时图设唯一 url → 引擎自动生成唯一 uriValue → 合图正常工作（不改引擎）。
    var uniqUrl = source && source.src ? source.src : ('rt_' + (texFrom._seq = (texFrom._seq || 0) + 1));
    bd.url = uniqUrl;
    var t = new egret.Texture();
    t.bitmapData = bd;
    return t;
  }

  // ---------------- 适配器 ----------------
  function EgretAdapter(root) {
    this.root = root;          // BenchMain（DisplayObjectContainer）
    this.sim = null;
    this.nodes = [];           // egret.Bitmap 数组，与 sim.list 一一对应
    this.variant = 'V1';
    this.textures = [];
    this.bgTex = null;       // boids 背景纹理
    this._bg = null;         // 背景 Bitmap
    this._extra = [];          // V3 的 rotSpeed / phase
    this._lastTick = 0;
    this.mode = 'bunny';       // bunny | boids
  }

  EgretAdapter.prototype.init = function (variant, bounds) {
    this.clearAll();
    this.variant = variant;
    this.mode = variant === 'boids' ? 'boids' : 'bunny';
    var b = bounds || { left: 0, top: 0, right: this.root.stage.stageWidth, bottom: this.root.stage.stageHeight };
    this.sim = this.mode === 'boids'
      ? new BoidsSim(b.right - b.left, b.bottom - b.top)
      : new BunnySim(b);
    // boids 模式：背景图（最底层）
    if (this.mode === 'boids' && this.bgTex) {
      var bg = new egret.Bitmap(this.bgTex);
      bg.width = b.right - b.left;
      bg.height = b.bottom - b.top;
      this.root.addChildAt(bg, 0);
      this._bg = bg;
    }
    // 重编引擎无 startGetPerformance（API 已裁剪），drawCall 走 __webglProbe hook / __webgpu batch 计数
    if (egret.sys.startGetPerformance) egret.sys.startGetPerformance(1000);
  };

  EgretAdapter.prototype.clearAll = function () {
    this.root.removeChildren();
    this.nodes.length = 0;
    this._extra.length = 0;
    this._bg = null;
  };

  EgretAdapter.prototype._makeNode = function (i) {
    var tex;
    if (this.mode === 'boids') {
      tex = this.textures[this.sim.list[i].species % this.textures.length];
    } else if (this.variant === 'V2') {
      tex = this.textures[i % Math.min(8, this.textures.length)];
    } else if (this.variant === 'V4') {
      tex = this.textures[i % this.textures.length];
    } else {
      tex = this.textures[0];
    }
    var bmp = new egret.Bitmap(tex);
    bmp.anchorOffsetX = bmp.width / 2;
    bmp.anchorOffsetY = this.mode === 'boids' ? bmp.height / 2 : bmp.height; // bunny 原版 anchor(0.5,1)
    this.root.addChild(bmp);
    if (this.variant === 'V3') {
      this._extra.push({ rotSpeed: (Math.random() - 0.5) * 4, phase: Math.random() * 6.28 });
    }
    return bmp;
  };

  EgretAdapter.prototype.setCount = function (n) {
    var cur = this.nodes.length;
    if (n > cur) {
      this.sim.add(n - cur);
      for (var i = cur; i < n; i++) this.nodes.push(this._makeNode(i));
    } else if (n < cur) {
      this.sim.remove(cur - n);
      for (var j = cur - 1; j >= n; j--) {
        this.root.removeChild(this.nodes[j]);
        this.nodes.pop();
        if (this._extra.length) this._extra.pop();
      }
    }
  };

  EgretAdapter.prototype.step = function (ts) {
    var dt = this._lastTick ? Math.min(ts - this._lastTick, 100) : 16.7;
    this._lastTick = ts;
    if (!this.sim) return;

    var list = this.sim.list, nodes = this.nodes, i, len = list.length;
    if (this.mode === 'boids') {
      this.sim.update(dt);
      for (i = 0; i < len; i++) {
        nodes[i].x = list[i].x;
        nodes[i].y = list[i].y;
        // 鱼贴图朝左。angle 为前进方向（弧度，0=右 π/2=下 π=左，屏幕坐标）。
        // 朝右（cos>0）水平翻转；rotation = 相对左向的偏转角
        var cosA = Math.cos(list[i].angle);
        var s = list[i].scale || 1;
        nodes[i].scaleX = (cosA > 0 ? -s : s);
        nodes[i].scaleY = s;
        var tilt = cosA > 0 ? list[i].angle : (list[i].angle - Math.PI);
        nodes[i].rotation = tilt * 57.29577951;
      }
    } else {
      this.sim.update(); // bunny 原版按帧推进
      if (this.variant === 'V3') {
        var ex = this._extra;
        for (i = 0; i < len; i++) {
          nodes[i].x = list[i].x;
          nodes[i].y = list[i].y;
          ex[i].phase += 0.1;
          nodes[i].rotation += ex[i].rotSpeed;
          var s = 0.75 + 0.25 * Math.sin(ex[i].phase);
          nodes[i].scaleX = s; nodes[i].scaleY = s;
        }
      } else {
        for (i = 0; i < len; i++) {
          nodes[i].x = list[i].x;
          nodes[i].y = list[i].y;
        }
      }
    }
  };

  EgretAdapter.prototype.readDrawCalls = function () {
    // WebGPU 后端：批处理器计数（_lastBatchCount / _lastDrawCalls）
    var wr = window.__webgpu && window.__webgpu.renderer;
    if (wr) {
      if (wr._lastBatchCount != null) return wr._lastBatchCount;
      if (wr._lastDrawCalls != null) return wr._lastDrawCalls;
      return -1;
    }
    // WebGL 后端：窗口内 draw/frame 均值（照搬 6_21 自比面板口径，免疫基准漂移）
    var probe = window.__webglProbe;
    if (probe) {
      var fd = probe.frameTotal - probe.lastFrame;
      var dd = probe.drawTotal - probe.lastDraw;
      probe.lastFrame = probe.frameTotal;
      probe.lastDraw = probe.drawTotal;
      return fd > 0 ? dd / fd : -1;
    }
    // 兜底：旧引擎官方统计
    var info = egret.sys.getPerformace && egret.sys.getPerformace();
    return info ? info.drawCall : -1;
  };

  EgretAdapter.prototype.readBenchMetrics = function () {
    return {
      actualBackend: window.__effectiveBackend === 'webgpu' ? 'webgpu' : 'webgl',
      renderWidth: this.root.stage.stageWidth,
      renderHeight: this.root.stage.stageHeight,
      antialias: false,
      workloadClass: this.variant === 'V4' ? 'finite-multi-texture-pressure' : 'standard',
      textureCount: this.variant === 'V1' || this.variant === 'V3' ? 1 : this.variant === 'V2' ? 8 : 12
    };
  };

  EgretAdapter.prototype.nodeCount = function () {
    return this.nodes.length;
  };

  // ---------------- 入口类 ----------------
  function BenchMain() {
    egret.DisplayObjectContainer.call(this);
    this.addEventListener(egret.Event.ADDED_TO_STAGE, this.onAdded, this);
  }
  __extends(BenchMain, egret.DisplayObjectContainer);

  BenchMain.prototype.onAdded = function () {
    var self = this;
    var stage = this.stage;
    var bounds = { left: 0, top: 0, right: stage.stageWidth, bottom: stage.stageHeight };

    // 【动态合图·默认开启】Egret WebGL 跨纹理合批靠 TextureAtlasManager（把多张散图打进共享大图集
    // → 同 GL 纹理 → 同纹理合批）。此前因运行时造图缺 uriValue 导致 grid 冲突/白屏，texFrom 已补齐唯一
    // uriValue，故此处默认开启，发挥 Egret WebGL 真实合批能力。?autobatch=0 可关闭作对照。
    var abMode = new URLSearchParams(location.search).get('autobatch');
    if (egret.sys && abMode !== '0') {
      egret.sys.openAutoBatch = true;
    }

    var adapter = new EgretAdapter(this);
    var stats = new BenchStats();
    var runner = new BenchRunner(adapter, stats);
    window.__bench = { adapter: adapter, stats: stats, runner: runner };

    // HUD（样式对齐 6_21 bunnymark：深色毛玻璃面板）
    var style = document.createElement('style');
    style.textContent =
      '#hud{position:fixed;left:8px;top:8px;z-index:99998;background:rgba(16,22,30,.86);' +
      'backdrop-filter:blur(6px);border:1px solid #2b3947;border-radius:10px;padding:10px 12px;' +
      'color:#e6edf3;font:13px -apple-system,"PingFang SC","Microsoft YaHei",sans-serif;' +
      'width:360px;max-width:92vw;max-height:96vh;overflow:auto}' +
      '#hud h3{margin:0 0 8px;font-size:13px;color:#7fd4ff;font-weight:600}' +
      '#hud .row{display:flex;align-items:center;gap:8px;margin:6px 0;flex-wrap:wrap}' +
      '#hud .lbl{width:40px;color:#8aa0b4;flex:none;font-size:12px}' +
      '#hud select,#hud input{background:#0d1218;color:#e6edf3;border:1px solid #33475a;' +
      'border-radius:7px;padding:4px 8px;font-size:12px}' +
      '#hud input{width:70px}' +
      '#hud button{background:#1d2833;color:#cdd9e5;border:1px solid #33475a;' +
      'border-radius:7px;padding:4px 10px;cursor:pointer;font-size:12px}' +
      '#hud button:hover:not(:disabled){background:#27405f}' +
      '#hud button:disabled{opacity:.45;cursor:default}' +
      '#hud button.primary{background:#2f6feb;border-color:#2f6feb;color:#fff;font-weight:600}' +
      '#hud .live{background:#0d1218;border:1px solid #2b3947;border-radius:8px;padding:7px 9px;' +
      'white-space:pre;font:11px/1.6 ui-monospace,Consolas,monospace;color:#9fe8a8}' +
      '#hud .tip{margin-top:6px;font-size:11.5px;color:#7d93a8;line-height:1.5}';
    document.head.appendChild(style);

    var hud = document.createElement('div');
    hud.id = 'hud';
    var bkLabel = (window.__effectiveBackend === 'webgpu') ? 'WebGPU' : 'WebGL';
    hud.innerHTML =
      '<h3>🐰 Egret 自研 5.4.1 · ' + bkLabel + '</h3>' +
      '<div class="row"><span class="lbl">场景</span>' +
      '<select id="bv">' +
      '<option value="V1">Bunny V1 同纹理合批</option>' +
      '<option value="V2">Bunny V2 atlas多帧</option>' +
      '<option value="V3">Bunny V3 随机变换</option>' +
      '<option value="V4">Bunny V4 12纹理压力</option>' +
      '<option value="boids">水族馆 2D Boids</option>' +
      '</select></div>' +
      '<div class="row"><span class="lbl">数量</span>' +
      '<input id="cnt" type="number" value="10000" step="1000">' +
      '<button id="fixed" class="primary">固定采样</button>' +
      '<button id="ramp">阶梯压测</button>' +
      '<button id="blogBtn">📋 复制日志</button></div>' +
      '<div class="live" id="out">待命中…</div>' +
      '<div class="tip">固定采样：预热 3s + 采样 10s 出 P50/P95/P99；阶梯压测：每 2s +1000，跌破 55fps 持续 2s 判定承载力。结果 JSON 自动复制。</div>';
    document.body.appendChild(hud);
    var $v = document.getElementById('bv'), $c = document.getElementById('cnt'),
      $out = document.getElementById('out');

    // ---- 累积日志捕获（console 全量 + 页面错误，供一键复制诊断）----
    var logLines = [];
    window.__benchLog = logLines;
    logLines.push('[boot] backend=' + (window.__effectiveBackend || 'webgl') +
      ' navigator.gpu=' + ('gpu' in navigator));
    ['log', 'warn', 'error'].forEach(function (m) {
      var orig = console[m] ? console[m].bind(console) : function () { };
      console[m] = function () {
        try {
          var parts = [];
          for (var i = 0; i < arguments.length; i++) {
            var a = arguments[i];
            parts.push(typeof a === 'object' ? JSON.stringify(a).slice(0, 300) : String(a).slice(0, 300));
          }
          logLines.push('[' + m + '] ' + parts.join(' '));
          if (logLines.length > 300) logLines.splice(0, logLines.length - 300);
        } catch (e) { /* 忽略序列化失败 */ }
        orig.apply(null, arguments);
      };
    });
    window.addEventListener('error', function (e) {
      logLines.push('[pageerror] ' + (e.message || e.error) + ' @' + (e.filename || '') + ':' + (e.lineno || ''));
    });
    document.getElementById('blogBtn').onclick = function () {
      var text = logLines.join('\n');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
          document.getElementById('blogBtn').textContent = '✅ 已复制(' + logLines.length + '行)';
          setTimeout(function () { document.getElementById('blogBtn').textContent = '📋 复制日志'; }, 2000);
        }, function () { window.prompt('剪贴板被拒，手动复制：', text); });
      } else {
        window.prompt('剪贴板不可用，手动复制：', text);
      }
    };

    function loadAssets(variant, cb) {
      var names = variant === 'boids' ? FISH_IMGS
        : variant === 'V1' ? BUNNY_IMGS.slice(0, 1)
          : variant === 'V2' ? BUNNY_IMGS.slice(0, 8)
            : BUNNY_IMGS; // V4：12 张互不相同纹理循环，相邻节点必不合批
      // boids 额外加载背景图
      var bgPromise = variant === 'boids'
        ? loadImage('../../assets/aquarium_bg.png')
        : Promise.resolve(null);
      Promise.all(names.map(function (n) { return loadImage('../../assets/' + n); }))
        .then(function (imgs) {
          adapter.textures = imgs.map(texFrom);
          return bgPromise;
        })
        .then(function (bgImg) {
          if (bgImg) adapter.bgTex = texFrom(bgImg);
          cb();
        });
    }

    function report(json) {
      $out.innerHTML = '完成: ' + JSON.stringify(json, null, 1).replace(/\n/g, '<br>');
      BenchRunner.exportJSON(json);
    }
    runner.onReport = report;
        BenchRunner.onSaved = function (name) { $out.textContent += ' | 已存: ' + name; };
        BenchRunner.onCopied = function () { $out.textContent += ' | 已复制 JSON'; };

    var CUR_BACKEND = (window.__effectiveBackend === 'webgpu') ? 'webgpu' : 'webgl';

    document.getElementById('fixed').onclick = function () {
      loadAssets($v.value, function () {
        runner.fixedRun({
          engine: 'egret-selfdev-5.4.1', variant: $v.value, backend: CUR_BACKEND,
          count: parseInt($c.value, 10) || 10000, bounds: bounds
        });
        $out.textContent = '运行中（预热+采样）…';
      });
    };
    document.getElementById('ramp').onclick = function () {
      loadAssets($v.value, function () {
        runner.rampRun({
          engine: 'egret-selfdev-5.4.1', variant: $v.value, backend: CUR_BACKEND,
          stepCount: 1000, stepMs: 2000, maxCount: 200000, bounds: bounds
        });
        $out.textContent = '阶梯压测中…';
      });
    };

    // 引擎帧循环入口：runner.tick 与 adapter.step 都在 startTick 里，
    // 与 cocos/laya 适配器的相对位置保持一致（帧回调最前端）
    egret.startTick(function (ts) {
      runner.tick(ts);
      adapter.step(ts);
      return false;
    }, this);

    // 自动测试：?auto=1&mode=fixed|ramp&variant=V1&count=10000（编排页 iframe 用）
    // mode=ramp：承载力阶梯（autoRamp，出 cap + 逐档曲线），与 3D 水族馆/总控 RAMP_SCENES 口径一致
    var q = new URLSearchParams(location.search);
    if (q.get('auto') === '1') {
      window.__benchAutoStarted = true;
      var av = q.get('variant') || 'V1';
      var ac = parseInt(q.get('count') || '10000', 10) || 10000;
      $v.value = av; $c.value = String(ac);
      loadAssets(av, function () {
        if (q.get('mode') === 'ramp') {
          egretRamp(runner, av, CUR_BACKEND, $out);
        } else {
          runner.fixedRun({
            engine: 'egret-selfdev-5.4.1', variant: av, backend: CUR_BACKEND,
            count: ac, bounds: bounds
          });
          $out.textContent = '自动测试运行中…';
        }
      });
    }
  };

  /**
   * 承载力阶梯（2D 水族馆闭环）：逐档预热+采样，稳定=fps≥55 且 p95≤20ms，
   * 掉帧档加倍预热重试，临界后 +500 细扫（口径 = sim-core bench-runner.autoRamp）。
   * 组合结果（cap/levels/runtime 后端校验）经 exportJSON 写 window.__benchLastResult 供总控采集。
   */
  function egretRamp(runner, variant, backend, $out) {
    var requested = new URLSearchParams(location.search).get('backend');
    var levels = [];
    runner.autoRamp({
      engine: 'egret-selfdev-5.4.1', variant: variant, backend: backend,
      counts: [2000, 5000, 10000, 20000, 30000, 40000, 50000, 60000, 70000, 80000],
      preWarmSec: 5, sampleSec: 6,
      onLevel: function (lv) {
        if (lv.phase === 'retry' && $out) {
          $out.textContent = '档 ' + lv.count + ' 疑似抖动，加倍预热重测…';
          return;
        }
        if (lv.phase === 'done' && lv.json) {
          var j = lv.json;
          levels.push({
            count: lv.count, fps: j.fps, p50: j.p50, p95: j.p95, p99: j.p99,
            p1Low: j.p1Low, stdDev: j.stdDev, drawCallAvg: j.drawCallAvg, nodeCount: j.nodeCount,
            actualBackend: j.actualBackend, backendValid: j.backendValid,
            gpuVendor: j.gpuVendor, gpuRenderer: j.gpuRenderer,
            renderWidth: j.renderWidth, renderHeight: j.renderHeight, dpr: j.dpr,
            stable: lv.stable
          });
          if ($out) {
            $out.style.display = 'block';
            $out.textContent += '\n  ' + lv.count + ' 只: ' + j.fps + 'fps ' +
              (lv.stable ? '✓稳' : '✗掉帧') + ' | p95 ' + j.p95 + 'ms | dc ' + j.drawCallAvg;
          }
        }
      },
      onDone: function (r) {
        var acts = [];
        levels.forEach(function (l) {
          var b = l.actualBackend;
          if (b && acts.indexOf(b) < 0) acts.push(b);
        });
        var rt = acts.length === 1 ? acts[0] : (window.__effectiveBackend || backend);
        var rv = acts.length === 1 && rt === (requested || 'webgl');
        var res = {
          meta: {
            engine: 'egret-selfdev-5.4.1', variant: variant,
            backend: rt, requestedBackend: requested || rt, backendValid: rv, mode: 'autoRamp'
          },
          cap: r.cap, jankAt: r.jankAt, capped: r.capped, invalidCurve: r.invalidCurve,
          thresholdAt: r.thresholdAt, fineStart: r.fineStart, fineStep: r.fineStep,
          levels: levels
        };
        window.__benchRampResult = res;
        BenchRunner.exportJSON(res);
        if ($out) {
          $out.textContent += '\n▶ cap=' + r.cap + (r.jankAt != null ? '（掉帧档 ' + r.jankAt + '）' : '') +
            (rv ? '' : ' ⚠ 运行时后端与请求不符');
        }
      }
    });
    if ($out) $out.textContent = '阶梯承载力测试中…';
  }

  function __extends(d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
  }

  window.BenchMain = BenchMain; // data-entry-class 解析需要全局可见
})();
