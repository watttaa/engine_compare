/**
 * Egret 骨骼动画适配器（自研 5.4.1 + egret-spine 3.8 运行时）
 *
 * 实现 BenchRunner 契约（骨骼变体 S1/S2/S3）
 * 资源路径（dist 相对）：spine-assets/spine/<key>.json/.atlas/.png
 *
 * spine API（egret-spine 3.8）：
 *   spine.createSkeletonData(jsonObj, atlas)  → SkeletonData
 *   spine.createTextureAtlas(atlasText, {filename: egretTexture})  → TextureAtlas
 *   new spine.SkeletonAnimation(skeletonData)  → DisplayObjectContainer，.play(anim,loop)
 */
(function () {
  'use strict';

  var SPINE_ROOT = 'spine-assets/spine/';
  var BG_PATH    = 'spine-assets/bg.jpg';

  // -------- 工具 --------
  function xhr(url) {
    return new Promise(function (resolve, reject) {
      var r = new XMLHttpRequest();
      r.open('GET', url);
      r.onload = function () { resolve(r.responseText); };
      r.onerror = function () { reject(new Error('XHR: ' + url)); };
      r.send();
    });
  }
  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('Image: ' + src)); };
      img.src = src;
    });
  }
  function texFrom(img) {
    var bd = new egret.BitmapData(img);
    var t  = new egret.Texture(); t.bitmapData = bd; return t;
  }

  // -------- 角色资源缓存 --------
  var _cache = {};
  function loadCharacter(key) {
    if (_cache[key]) return Promise.resolve(_cache[key]);
    return Promise.all([
      xhr(SPINE_ROOT + key + '.json'),
      xhr(SPINE_ROOT + key + '.atlas'),
      loadImage(SPINE_ROOT + key + '.png')
    ]).then(function (r) {
      var tex   = texFrom(r[2]);
      var atlas = spine.createTextureAtlas(r[1], { [key + '.png']: tex });
      var sd    = spine.createSkeletonData(JSON.parse(r[0]), atlas);
      _cache[key] = { skeletonData: sd };
      return _cache[key];
    });
  }

  // -------- 适配器 --------
  function EgretSpineAdapter(root) {
    this.root    = root;
    this.sim     = null;
    this.nodes   = [];
    this.variant = 'S1';
    this._lastTick = 0;
    this._bg = null;
  }

  EgretSpineAdapter.prototype.init = function (variant, bounds) {
    this._clearAll();
    this.variant = variant || 'S1';
    this.sim = new SpineSim(this.variant, 1280, 720);
    var self = this;
    if (!this._bg) {
      loadImage(BG_PATH).then(function (img) {
        var bg = new egret.Bitmap(texFrom(img));
        bg.width = 1280; bg.height = 720;
        self.root.addChildAt(bg, 0);
        self._bg = bg;
      });
    }
  };

  EgretSpineAdapter.prototype._clearAll = function () {
    for (var i = 0; i < this.nodes.length; i++) {
      var n = this.nodes[i];
      if (n && n.parent) n.parent.removeChild(n);
    }
    this.nodes.length = 0;
    if (this.sim) this.sim.list.length = 0;
  };

  EgretSpineAdapter.prototype.setCount = function (n) {
    if (!this.sim) return;
    var cur = this.sim.list.length;
    if (n > cur) {
      this.sim.add(n - cur);
      var self = this;
      for (var i = cur; i < n; i++) {
        (function (idx) {
          var entry = self.sim.list[idx];
          loadCharacter(entry.charKey).then(function (res) {
            if (!self.sim || idx >= self.sim.list.length) return;
            var sa = new spine.SkeletonAnimation(res.skeletonData);
            sa.scaleX = sa.scaleY = entry.scale;
            sa.x = entry.x; sa.y = entry.y;
            try { sa.play(entry.animName, true); } catch (e) {
              var anims = res.skeletonData.animations;
              if (anims && anims.length) sa.play(anims[0].name, true);
            }
            self.root.addChild(sa);
            self.nodes[idx] = sa;
          }).catch(function (e) { console.warn('[spine] load fail:', e); });
        })(i);
      }
    } else if (n < cur) {
      this.sim.remove(cur - n);
      for (var j = cur - 1; j >= n; j--) {
        if (this.nodes[j] && this.nodes[j].parent) this.nodes[j].parent.removeChild(this.nodes[j]);
        this.nodes.pop();
      }
    }
  };

  EgretSpineAdapter.prototype.step = function (ts) {
    var dt = this._lastTick ? Math.min(ts - this._lastTick, 100) : 16.7;
    this._lastTick = ts;
    if (!this.sim) return;
    var changed = this.sim.update(dt);
    for (var ci = 0; ci < changed.length; ci++) {
      var idx   = changed[ci];
      var sa    = this.nodes[idx];
      if (!sa) continue;
      var entry = this.sim.list[idx];
      // 同步位置（Egret 坐标系：原点左上角）
      sa.x = entry.x;
      sa.y = entry.y;
      // 同步动画
      var animName = entry.animName;
      try {
        sa.play(animName, true);
      } catch (e) {
        var anims = sa.skeletonData && sa.skeletonData.animations;
        if (anims && anims.length) {
          try { sa.play(anims[0].name, true); } catch (e2) {}
        }
      }
    }
  };

  EgretSpineAdapter.prototype.readDrawCalls = function () {
    var probe = window.__webglProbe;
    if (!probe) return -1;
    var fd = probe.frameTotal - probe.lastFrame;
    var dd = probe.drawTotal  - probe.lastDraw;
    probe.lastFrame = probe.frameTotal;
    probe.lastDraw  = probe.drawTotal;
    return fd > 0 ? dd / fd : -1;
  };

  EgretSpineAdapter.prototype.nodeCount = function () {
    return this.nodes.filter(Boolean).length;
  };

  // -------- BenchMain（入口类：和 bench/engines/egret/main.js 一致的继承模式） --------
  function BenchMain() {
    egret.DisplayObjectContainer.call(this);
    this.addEventListener(egret.Event.ADDED_TO_STAGE, this._onAdded, this);
  }
  BenchMain.prototype = Object.create(egret.DisplayObjectContainer.prototype);
  BenchMain.prototype.constructor = BenchMain;

  BenchMain.prototype._onAdded = function () {
    this.removeEventListener(egret.Event.ADDED_TO_STAGE, this._onAdded, this);

    egret.sys.startGetPerformance(1000);

    var adapter = new EgretSpineAdapter(this);
    var stats   = new BenchStats();
    var runner  = new BenchRunner(adapter, stats);
    stats.captureGpuInfo();

    var backend = window.__effectiveBackend || 'webgl';
    var liveEl, outEl, $v, $c;

    // ---- HUD ----
    var style = document.createElement('style');
    style.textContent =
      '#hud{position:fixed;left:8px;top:8px;z-index:99998;background:rgba(16,22,30,.86);' +
      'border:1px solid #2b3947;border-radius:10px;padding:10px 12px;color:#e6edf3;' +
      'font:13px -apple-system,sans-serif;width:380px;max-width:92vw;max-height:96vh;overflow:auto}' +
      '#hud h3{margin:0 0 8px;font-size:13px;color:#7fd4ff}' +
      '#hud .row{display:flex;align-items:center;gap:8px;margin:6px 0;flex-wrap:wrap}' +
      '#hud .lbl{width:40px;color:#8aa0b4;flex:none;font-size:12px}' +
      '#hud select,#hud input{background:#0d1218;color:#e6edf3;border:1px solid #33475a;border-radius:7px;padding:4px 8px;font-size:12px}' +
      '#hud input{width:70px}' +
      '#hud button{background:#1d2833;color:#cdd9e5;border:1px solid #33475a;border-radius:7px;padding:4px 10px;cursor:pointer;font-size:12px}' +
      '#hud button.primary{background:#2f6feb;border-color:#2f6feb;color:#fff;font-weight:600}' +
      '#hud .live{background:#0d1218;border:1px solid #2b3947;border-radius:8px;padding:7px 9px;white-space:pre;font:11px/1.6 ui-monospace,Consolas,monospace;color:#9fe8a8}' +
      '#hud #sp-report{background:#0d1218;border:1px solid #2b3947;border-radius:8px;padding:7px 9px;white-space:pre-wrap;font:11px/1.6 ui-monospace,Consolas,monospace;color:#cdd9e5;max-height:30vh;overflow:auto;display:none}';
    document.head.appendChild(style);

    var hud = document.createElement('div');
    hud.id = 'hud';
    hud.innerHTML =
      '<h3>🦴 Egret 自研 5.4.1 骨骼动画 [' + backend + ']</h3>' +
      '<div class="row"><span class="lbl">变体</span>' +
      '<select id="sv">' +
      '<option value="S1">S1 同角色同动画（合批测试）</option>' +
      '<option value="S2">S2 8角色混合（破批测试）</option>' +
      '<option value="S3">S3 同角色多动画混播</option>' +
      '</select></div>' +
      '<div class="row"><span class="lbl">数量</span>' +
      '<input id="scnt" type="number" value="20" step="10">' +
      '<button id="sfixed" class="primary">固定采样</button>' +
      '<button id="sramp">阶梯压测</button></div>' +
      '<div class="row">' +
      '<button id="sadd10">+10</button><button id="ssub10">-10</button>' +
      '<button id="sadd50">+50</button><button id="ssub50">-50</button></div>' +
      '<div class="live" id="slive">等待资源加载…</div>' +
      '<div id="sp-report"></div>';
    document.body.appendChild(hud);

    liveEl = hud.querySelector('#slive');
    outEl  = hud.querySelector('#sp-report');
    $v     = hud.querySelector('#sv');
    $c     = hud.querySelector('#scnt');

    // 实时 HUD
    var _lastLive = 0, _fpsBuf = 16.7, _lastTs2 = 0;
    var _origTick = runner.tick.bind(runner);
    runner.tick = function (ts) {
      _origTick(ts);
      if (_lastTs2) _fpsBuf = _fpsBuf * 0.9 + Math.min(ts - _lastTs2, 100) * 0.1;
      _lastTs2 = ts;
      if (ts - _lastLive > 400) {
        _lastLive = ts;
        var dc = adapter.readDrawCalls();
        liveEl.textContent =
          '后端: ' + backend + '\n' +
          '变体: ' + (adapter.variant || '-') + '\n' +
          '角色: ' + adapter.nodeCount() + '\n' +
          'FPS: ' + (1000 / _fpsBuf).toFixed(1) + '\n' +
          (dc >= 0 ? 'drawCall: ' + Math.round(dc) : '');
      }
    };

    runner.onReport = function (json) {
      liveEl.textContent = '完成: fps=' + json.fps + ' p50=' + json.p50 + 'ms p95=' + json.p95 + 'ms dc=' + json.drawCallAvg;
      BenchRunner.exportJSON(json);
    };

    function runVariant(mode) {
      var v = $v.value, n = parseInt($c.value, 10) || 20;
      var bounds = { left: 0, top: 0, right: 1280, bottom: 720 };
      adapter.init(v, bounds);
      adapter.setCount(n);
      if (mode === 'fixed') {
        runner.fixedRun({ engine: 'egret-selfdev-5.4.1', variant: v, backend: backend, count: n, bounds: bounds });
      } else {
        runner.rampRun({ engine: 'egret-selfdev-5.4.1', variant: v, backend: backend,
          stepCount: 10, stepMs: 2000, maxCount: 500, bounds: bounds });
      }
      outEl.style.display = 'block';
      outEl.textContent = '运行中（等资源加载完毕后开始渲染）…';
    }

    hud.querySelector('#sfixed').addEventListener('click', function () { runVariant('fixed'); });
    hud.querySelector('#sramp').addEventListener('click',  function () { runVariant('ramp'); });
    var bump = function (d) {
      var cur  = adapter.sim ? adapter.sim.list.length : 0;
      var next = Math.max(0, cur + d);
      adapter.setCount(next);
      $c.value = String(next);
    };
    hud.querySelector('#sadd10').addEventListener('click', function () { bump(10); });
    hud.querySelector('#ssub10').addEventListener('click', function () { bump(-10); });
    hud.querySelector('#sadd50').addEventListener('click', function () { bump(50); });
    hud.querySelector('#ssub50').addEventListener('click', function () { bump(-50); });

    // 自动测试
    var q = new URLSearchParams(location.search);
    if (q.get('auto') === '1') {
      window.__benchAutoStarted = true;
      $v.value = q.get('variant') || 'S1';
      $c.value = q.get('count')   || '20';
      runVariant('fixed');
    }

    // 帧驱动
    this.addEventListener(egret.Event.ENTER_FRAME, function () {
      var ts = performance.now();
      runner.tick(ts);
      adapter.step(ts);
    });
  };

  // Egret getDefinitionByName → window['SpineBenchMain']
  window.SpineBenchMain = BenchMain;

})();
