
 /**
 * Egret 预烘焙骨骼动画适配器（自研 5.4.1）
 *
 * 与游戏同路径：egret.MovieClip + MovieClipDataFactory
 * 场景背景：拼接地图 1001 的 4×3 切片 JPG
 * 寻路：加载 1001.map（Uint8Array 位图）→ MCSim.initPathfinder(bytes) → A*
 */
(function () {
  'use strict';

  // WebGL 合批对照开关：?mcbatch=1 → 打开引擎动态图集(openAutoBatch)+不打 IgnoreSelf。
  // 这是 Egret WebGL 引擎自带能力（bunnymark 同款），游戏为规避动态图集 UV/深度问题而禁用。
  var MC_BATCH = new URLSearchParams(location.search).get('mcbatch') === '1';
  if (MC_BATCH && window.egret && egret.sys) {
    egret.sys.openAutoBatch = true;
  }

  var MC_ROOT  = 'mc-assets/';
  var MAP_ROOT = 'mc-assets/map/1001/';
  // 常规玩家模型：body/head/weapon 分层；与 ShapeComponent.loadMCDepth 的资源组织对齐
  var LAYERS = ['body', 'head', 'weapon'];
  var WEAPON_BY_CHAR = {
    '1001': '10001', '1002': '11001', '1003': '12001', '1004': '13001',
    '1005': '14001', '1006': '15001', '1007': '16001', '1008': '17001'
  };

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
  function xhrBin(url) {
    return new Promise(function (resolve, reject) {
      var r = new XMLHttpRequest();
      r.open('GET', url);
      r.responseType = 'arraybuffer';
      r.onload = function () { resolve(r.response); };
      r.onerror = function () { reject(new Error('XHR bin: ' + url)); };
      r.send();
    });
  }
  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('Img: ' + src)); };
      img.src = src;
    });
  }
  function texFrom(img) {
    var bd = new egret.BitmapData(img);
    var t  = new egret.Texture(); t.bitmapData = bd; return t;
  }

  // -------- 地图背景：3列×4行切片拼合 --------
  // 命名规则：row_col.jpg（先行后列）
  // 列宽：[512, 512, 56] → 总宽 1080px
  // 行高：[512, 512, 512, 344] → 总高 1880px
  var MAP_FULL_W = MCSim.MAP_W_PX;   // 1080
  var MAP_FULL_H = MCSim.MAP_H_PX;   // 1880
  var STAGE_W    = 1280;
  var STAGE_H    = 720;
  // 保持宽高比缩放到 stage 内（1880高→高度方向更紧张）
  var MAP_SCALE    = Math.min(STAGE_W / MAP_FULL_W, STAGE_H / MAP_FULL_H);
  var MAP_OFFSET_X = (STAGE_W - MAP_FULL_W * MAP_SCALE) / 2;
  var MAP_OFFSET_Y = (STAGE_H - MAP_FULL_H * MAP_SCALE) / 2;

  var TILE_COL_WIDTHS  = [512, 512, 56];
  var TILE_ROW_HEIGHTS = [512, 512, 512, 344];
  var TILE_ROWS = 4;
  var TILE_COLS = 3;

  function loadMapBackground(root) {
    var promises = [];
    for (var row = 0; row < TILE_ROWS; row++) {
      for (var col = 0; col < TILE_COLS; col++) {
        // 命名：row_col.jpg
        promises.push(loadImage(root + row + '_' + col + '.jpg'));
      }
    }
    return Promise.all(promises);
  }

  function buildBackground(root, container) {
    loadMapBackground(root).then(function (imgs) {
      var y = 0;
      for (var row = 0; row < TILE_ROWS; row++) {
        var x = 0;
        for (var col = 0; col < TILE_COLS; col++) {
          var idx = row * TILE_COLS + col;
          var bmp = new egret.Bitmap(texFrom(imgs[idx]));
          bmp.x = x; bmp.y = y;
          container.addChildAt(bmp, 0);
          x += TILE_COL_WIDTHS[col];
        }
        y += TILE_ROW_HEIGHTS[row];
      }
    }).catch(function (e) { console.warn('[mc-bench] 背景加载失败:', e); });
  }
  // 资源缓存：每个资源一份 { json 对象, 共享 Texture }。
  // 游戏同款（getMCData 缓存 mcData+mcTexture 全局共享；Texture 只建一次）。
  var _resCache = {};
  function loadLayer(layer, modelId, direction) {
    // 游戏资源按 animate0/animate2 两组保存；body 保留了两方向，head/weapon
    // 当前资源只有 animate0，先沿用 animate0 并用镜像补齐左右。
    var suffix = direction === 2 && layer === 'body' ? 'animate2' : 'animate0';
    var base = MC_ROOT + layer + '/' + modelId + '/' + suffix;
    if (_resCache[base]) return _resCache[base];
    _resCache[base] = Promise.all([xhr(base + '.json'), loadImage(base + '.png')])
      .then(function (r) {
        var tex = texFrom(r[1]);
        // 游戏 ShapeComponent 同款策略：模型帧动画禁止动态合图，避免 UV 改写与深度层冲突。
        // ?mcbatch=1 时保持默认 Batch 并打开 openAutoBatch，测 WebGL 引擎自带合批能力。
        if (!MC_BATCH) {
          tex.$bitmapData.batchType = egret.BatchType.IgnoreSelf;
        }
        return { json: JSON.parse(r[0]), tex: tex };
      });
    return _resCache[base];
  }
  function loadChar(charId) {
    var key = 'char:' + charId;
    if (_resCache[key]) return _resCache[key];
    var weaponId = WEAPON_BY_CHAR[charId];
    _resCache[key] = Promise.all([
      loadLayer('body', charId, 0), loadLayer('head', charId, 0), loadLayer('weapon', weaponId, 0),
      loadLayer('body', charId, 2), loadLayer('head', charId, 2), loadLayer('weapon', weaponId, 2)
    ]).then(function (layers) {
      return { data0: layers.slice(0, 3), data2: layers.slice(3, 6) };
    });
    return _resCache[key];
  }

  // 每次生成独立 MovieClipData（引擎语义安全：MC 移出舞台时引擎会 dispose 其 MCD，
  // 见 game.js $onRemoveFromStage —— 共享缓存会被一个角色下台清掉、坑死所有同资源角色，
  // 这正是"减人→再加人"渲染缺失的根因）。换向重新 generate 的分配率实测 0.47MB/s，
  // GC 完全消化（25s 稳态 heap 32MB、fps 60），不是瓶颈。
  function makeMCData(layerRes) {
    return egret.MovieClipDataFactory.getInstance()
      .generateMovieClipData(layerRes.json, layerRes.tex);
  }

  // -------- 适配器 --------
  function EgretMCAdapter(stageRoot) {    // mapContainer：整个地图（背景+角色）缩放到 1280×720 内
    var cont = new egret.DisplayObjectContainer();
    cont.scaleX = cont.scaleY = MAP_SCALE;
    cont.x = MAP_OFFSET_X;
    cont.y = MAP_OFFSET_Y;
    stageRoot.addChild(cont);
    this._mapCont = cont;
    this.root = cont;
    this.characterRoot = new egret.DisplayObjectContainer();
    cont.addChild(this.characterRoot);
    this.channel = 'generic';
    this.sim  = null;
    this.nodes = [];
    this._loadEpoch = 0;
    this._pendingLoads = 0;
    this.variant  = 'M2';
    this._lastTick = 0;
  }

  EgretMCAdapter.prototype.init = function () {
    this._loadEpoch++;
    this._clearAll();
    this.variant = 'M2';
    // 使用地图真实像素尺寸作为仿真区域
    this.sim = new MCSim(this.variant, MCSim.MAP_W_PX, MCSim.MAP_H_PX);
  };

  EgretMCAdapter.prototype.setChannel = function (channel) {
    this.channel = channel === 'instanced' ? 'instanced' : 'generic';
    this.characterRoot.__webgpuBatchedSpriteLayer = this.channel === 'instanced';
  };

  EgretMCAdapter.prototype._clearAll = function () {
    for (var i = 0; i < this.nodes.length; i++) {
      var n = this.nodes[i];
      if (!n || !n.mcs) continue;
      for (var j = 0; j < n.mcs.length; j++) {
        if (n.mcs[j].parent) n.mcs[j].parent.removeChild(n.mcs[j]);
      }
    }
    this.nodes.length = 0;
    if (this.sim) this.sim.list.length = 0;
  };

  EgretMCAdapter.prototype.setCount = function (n) {
    if (!this.sim) return;
    var cur = this.sim.list.length;
    if (n > cur) {
      this.sim.add(n - cur);
      var self = this;
      var loadEpoch = this._loadEpoch;
      for (var i = cur; i < n; i++) {
        (function (idx) {
          var entry = self.sim.list[idx];
          // 游戏常规角色：body → head → weapon 三层，保持固定层级。
          var mcs = [new egret.MovieClip(), new egret.MovieClip(), new egret.MovieClip()];
          for (var mi = 0; mi < mcs.length; mi++) {
            mcs[mi].x = entry.x;
            mcs[mi].y = entry.y;
            self.characterRoot.addChild(mcs[mi]);
          }
          var node = { mcs: mcs, loaded: false, dir: entry.dir, resDir: 0, res: null };
          self.nodes[idx] = node;
          self._pendingLoads++;
          loadChar(entry.charId).then(function (res) {
            self._pendingLoads--;
            if (!self.sim || self._loadEpoch !== loadEpoch || idx >= self.sim.list.length || self.nodes[idx] !== node) return;
            node.res = res;
            for (var li = 0; li < mcs.length; li++) {
              mcs[li].movieClipData = makeMCData(res.data0[li]);
              try { mcs[li].gotoAndPlay(entry.animName, -1); } catch (e) {
                try { mcs[li].gotoAndPlay(1, -1); } catch (_) {}
              }
            }
            node.loaded = true;
          }).catch(function (e) {
            self._pendingLoads--;
            console.warn('[mc] load fail:', e);
          });
        })(i);
      }
    } else if (n < cur) {
      this.sim.remove(cur - n);
      for (var j = cur - 1; j >= n; j--) {
        var nd = this.nodes[j];
        if (nd && nd.mcs) {
          for (var mi = 0; mi < nd.mcs.length; mi++) {
            if (nd.mcs[mi].parent) nd.mcs[mi].parent.removeChild(nd.mcs[mi]);
          }
        }
        this.nodes.pop();
      }
    }
  };

  EgretMCAdapter.prototype.step = function (ts) {
    var dt = this._lastTick ? Math.min(ts - this._lastTick, 100) : 16.7;
    this._lastTick = ts;
    if (!this.sim) return;

    var updates = this.sim.update(dt);
    for (var ui = 0; ui < updates.length; ui++) {
      var u    = updates[ui];
      var node = this.nodes[u.idx];
      if (!node || !node.loaded || !node.res) continue;
      if (u.dirChange && typeof u.dir === 'number') {
        node.dir = u.dir;
        var resDir = MCSim.resDirOf(u.dir);
        var flipX = MCSim.flipOf(u.dir);
        var data = resDir === 2 ? node.res.data2 : node.res.data0;
        node.resDir = resDir;
        for (var mi = 0; mi < node.mcs.length; mi++) {
          node.mcs[mi].scaleX = flipX;
          // 方向切换重新生成独立 MCD（每 MC 独占，引擎 dispose 语义安全）。
          node.mcs[mi].movieClipData = makeMCData(data[mi]);
          try { node.mcs[mi].gotoAndPlay(u.animName, -1); } catch (e) {}
        }
      } else if (u.animName) {
        for (var mi2 = 0; mi2 < node.mcs.length; mi2++) {
          try { node.mcs[mi2].gotoAndPlay(u.animName, -1); } catch (e) {}
        }
      }
    }
    // 每帧同步所有分层角色位置
    var list = this.sim.list;
    for (var i = 0; i < this.nodes.length; i++) {
      var nd = this.nodes[i];
      if (!nd || !nd.loaded || !nd.mcs || !list[i]) continue;
      for (var mi3 = 0; mi3 < nd.mcs.length; mi3++) {
        nd.mcs[mi3].x = list[i].x;
        nd.mcs[mi3].y = list[i].y;
      }
    }
  };

  EgretMCAdapter.prototype.readDrawCalls = function () {
    if (window.__effectiveBackend === 'webgpu') {
      var wgpu = window.__webgpu;
      if (wgpu && wgpu.renderer && typeof wgpu.renderer._lastDrawCalls === 'number') {
        return wgpu.renderer._lastDrawCalls;
      }
      return -1;
    }
    var probe = window.__webglProbe;
    if (!probe) return -1;
    var fd = probe.frameTotal - probe.lastFrame;
    var dd = probe.drawTotal  - probe.lastDraw;
    probe.lastFrame = probe.frameTotal;
    probe.lastDraw  = probe.drawTotal;
    return fd > 0 ? dd / fd : -1;
  };

  EgretMCAdapter.prototype.nodeCount = function () {
    return this.nodes.filter(function (n) { return n && n.loaded; }).length;
  };

  EgretMCAdapter.prototype.isReady = function () {
    return this.nodes.length === this.sim.list.length && this._pendingLoads === 0 && this.nodeCount() === this.sim.list.length;
  };

  // -------- 入口类 --------
  function MCBenchMain() {
    egret.DisplayObjectContainer.call(this);
    this.addEventListener(egret.Event.ADDED_TO_STAGE, this._onAdded, this);
  }
  MCBenchMain.prototype = Object.create(egret.DisplayObjectContainer.prototype);
  MCBenchMain.prototype.constructor = MCBenchMain;

  MCBenchMain.prototype._onAdded = function () {
    this.removeEventListener(egret.Event.ADDED_TO_STAGE, this._onAdded, this);
    console.log('[mc-bench] build 20260904-v9-array-dirty');
    egret.sys.startGetPerformance(1000);

    var self    = this;
    var adapter = new EgretMCAdapter(this);
    window.__mcAdapter = adapter; // 诊断句柄：核对渲染缺失时 MC/纹理的真实状态
    var stats   = new BenchStats();
    var runner  = new BenchRunner(adapter, stats);
    stats.captureGpuInfo();

    var backend = window.__effectiveBackend || 'webgl';
    var bootQ = new URLSearchParams(location.search);
    if (backend === 'webgpu' && bootQ.get('channel')) {
      adapter.setChannel(bootQ.get('channel') === 'instanced' ? 'instanced' : 'generic');
    }
    var liveEl, $v, $c;

    // 先加载地图（背景 + .map 文件）
    xhrBin(MAP_ROOT + '1001.map').then(function (buf) {
      MCSim.initPathfinder(new Uint8Array(buf));
      // 背景加入 mapContainer（与角色同坐标空间，同比缩放）
      buildBackground(MAP_ROOT, adapter.root);
    }).catch(function (e) { console.warn('[mc-bench] 地图加载失败:', e); });

    // ---- HUD ----
    var style = document.createElement('style');
    style.textContent =
      '#hud{position:fixed;left:8px;top:8px;z-index:99998;background:rgba(16,22,30,.86);' +
      'border:1px solid #2b3947;border-radius:10px;padding:10px 12px;color:#e6edf3;' +
      'font:13px -apple-system,sans-serif;width:360px;max-width:92vw}' +
      '#hud h3{margin:0 0 8px;color:#7fd4ff;font-size:13px}' +
      '#hud .row{display:flex;gap:8px;margin:5px 0;align-items:center;flex-wrap:wrap}' +
      '#hud .lbl{width:40px;color:#8aa0b4;font-size:12px}' +
      '#hud select,#hud input{background:#0d1218;color:#e6edf3;border:1px solid #33475a;border-radius:7px;padding:3px 7px;font-size:12px}' +
      '#hud input{width:68px}' +
      '#hud button{background:#1d2833;color:#cdd9e5;border:1px solid #33475a;border-radius:7px;padding:3px 9px;cursor:pointer;font-size:12px}' +
      '#hud button.primary{background:#2f6feb;color:#fff}' +
      '#hud .live{background:#0d1218;border:1px solid #2b3947;border-radius:8px;padding:6px 9px;white-space:pre;font:11px/1.6 ui-monospace,Consolas,monospace;color:#9fe8a8;margin-top:6px}';
    document.head.appendChild(style);

    var hud = document.createElement('div'); hud.id = 'hud';
    hud.innerHTML =
      '<h3>🎭 Egret 自研 5.4.1 · 大话西游战斗场景 [' + backend + ']</h3>' +
      '<div class="row"><button id="mback">← 返回场景列表</button></div>' +
      '<div class="row"><span class="lbl">场景</span><span>8职业混编 · A* 随机行走</span></div>' +
      '<div class="row" id="mchannelrow"><span class="lbl">通道</span><select id="mchannel"><option value="generic">通用路径</option><option value="instanced">实例化层</option></select></div>' +
      '<div class="row"><span class="lbl">数量</span>' +
      '<input id="mcnt" type="number" value="50" step="10">' +
      '<button id="mfixed" class="primary">固定采样</button>' +
      '<button id="mcapacity">📈 承载力压测</button>' +
      '<button id="mcompare" class="primary">⚖ 自动双后端</button>' +
      '<button id="mcopy" disabled>复制结果</button>' +
      '<button id="mstop" disabled>中止</button></div>' +
      '<div class="row"><button id="madd20">+20</button><button id="msub20">-20</button>' +
      '<button id="madd100">+100</button><button id="msub100">-100</button></div>' +
      '<div class="live" id="mlive">加载地图中…</div>';
    document.body.appendChild(hud);

    liveEl = hud.querySelector('#mlive');
    $c = hud.querySelector('#mcnt');
    var channelEl = hud.querySelector('#mchannel');
    if (backend !== 'webgpu') {
      hud.querySelector('#mchannelrow').style.display = 'none';
    } else {
      channelEl.addEventListener('change', function () { adapter.setChannel(channelEl.value); });
    }
    adapter.setChannel(backend === 'webgpu' && bootQ.get('channel') === 'instanced' ? 'instanced' : 'generic');
    if (MC_BATCH) {
      adapter.channel = 'batched';
      if (channelEl) channelEl.value = 'generic';
    }
    if (channelEl) channelEl.value = adapter.channel === 'instanced' ? 'instanced' : 'generic';

    // 实时 HUD
    var _lastLive = 0, _fpsBuf = 16.7, _lastTs2 = 0;
    var capacityStatus = '';
    var _origTick = runner.tick.bind(runner);
    runner.tick = function (ts) {
      _origTick(ts);
      if (_lastTs2) _fpsBuf = _fpsBuf * 0.9 + Math.min(ts - _lastTs2, 100) * 0.1;
      _lastTs2 = ts;
      if (ts - _lastLive > 400 && !capacityRunning) {
        _lastLive = ts;
        var dc = adapter.readDrawCalls();
        var instBatches = backend === 'webgpu' && window.__webgpu && window.__webgpu.renderer
          ? (window.__webgpu.renderer._lastInstanceBatchCount || 0) : 0;
        var mapSt = MCSim.isMapLoaded() ? '✅' : '⏳';
        liveEl.textContent =
          '后端: ' + backend + '  地图: ' + mapSt + '\n' +
          '通道: ' + adapter.channel + '  变体: ' + (adapter.variant || '-') + '\n' +
          '角色: ' + adapter.nodeCount() + '  FPS: ' + (1000 / _fpsBuf).toFixed(1) + '\n' +
          (dc >= 0 ? 'drawCall: ' + Math.round(dc) + (instBatches ? '  实例批: ' + instBatches : '') : '');
      }
    };

    runner.onReport = function (json) {
      lastResult = json;
      copyBtn.disabled = false;
      liveEl.textContent = '完成: fps=' + json.fps + ' p50=' + json.p50 + 'ms p95=' + json.p95 + 'ms dc=' + json.drawCallAvg;
      BenchRunner.exportJSON(json);
    };

    var capacityRunning = false;
    var lastResult = null;
    var capacityBtn = hud.querySelector('#mcapacity');
    var compareBtn = hud.querySelector('#mcompare');
    var copyBtn = hud.querySelector('#mcopy');
    var stopBtn = hud.querySelector('#mstop');

    function setCapacityRunning(running) {
      capacityRunning = running;
      capacityBtn.disabled = running;
      compareBtn.disabled = running;
      stopBtn.disabled = !running;
      hud.querySelector('#mfixed').disabled = running;
      $c.disabled = running;
    }

    function benchMeta(v, n) {
      return { engine: 'egret-selfdev-5.4.1', variant: v, backend: backend, channel: adapter.channel, count: n };
    }

    function runFixed() {
      var v = 'M2', n = parseInt($c.value, 10) || 50;
      adapter.init(v);
      adapter.setCount(n);
      runner.fixedRun(benchMeta(v, n));
    }

    function startAutoBackendCompare() {
      if (capacityRunning) return;
      var q = new URLSearchParams(location.search);
      var counts = q.get('capacityCounts') || '20,40,80,160,320,640,1280,2560,3200,4096';
      var state = {
        counts: counts,
        startedAt: Date.now(),
        originalUrl: location.href,
        results: {}
      };
      sessionStorage.setItem('mcBackendCompare', JSON.stringify(state));
      location.replace(location.pathname + '?backend=webgl&capacityCounts=' + encodeURIComponent(counts) + '&autoCompare=webgl');
    }

    function continueAutoBackendCompare(summary) {
      var q = new URLSearchParams(location.search);
      var phase = q.get('autoCompare');
      if (!phase) return false;
      var raw = sessionStorage.getItem('mcBackendCompare');
      if (!raw) return false;
      var state;
      try { state = JSON.parse(raw); } catch (e) { sessionStorage.removeItem('mcBackendCompare'); return false; }
      state.results[phase] = summary;
      if (phase === 'webgl') {
        sessionStorage.setItem('mcBackendCompare', JSON.stringify(state));
        liveEl.textContent = 'WebGL 完成，正在启动 WebGPU…';
        setTimeout(function () {
          location.replace(location.pathname + '?backend=webgpu&capacityCounts=' + encodeURIComponent(state.counts) + '&autoCompare=webgpu&channel=instanced');
        }, 800);
        return true;
      }
      sessionStorage.removeItem('mcBackendCompare');
      var webgl = state.results.webgl, webgpu = state.results.webgpu;
      var result = {
        meta: { engine: 'egret-selfdev-5.4.1', mode: 'auto-backend-compare', counts: state.counts, startedAt: state.startedAt, finishedAt: Date.now() },
        webgl: webgl,
        webgpu: webgpu
      };
      lastResult = result;
      copyBtn.disabled = false;
      liveEl.textContent = '双后端对比完成\nWebGL 原版: ' + webgl.maxStableCount + ' 人  首失败: ' + webgl.firstFailCount +
        '\nWebGPU 实例化层: ' + webgpu.maxStableCount + ' 人  首失败: ' + webgpu.firstFailCount +
        '\n结果已导出，可点击复制结果';
      BenchRunner.exportJSON(result);
      return true;
    }

    function runCapacity() {
      var v = 'M2';
      var capacityCounts = new URLSearchParams(location.search).get('capacityCounts');
      var counts = capacityCounts ? capacityCounts.split(',').map(Number).filter(function (n) { return n > 0; }) : null;
      setCapacityRunning(true);
      capacityStatus = '承载力压测准备中\n变体: ' + v + '\n粗测: ' + (counts ? counts.join(' → ') : '20 → 40 → 80 → 160 → 320 → 640 → 1280 → 2560 → 5120 → 10240 → 20480');
      liveEl.textContent = capacityStatus;
      runner.capacityRamp({
        counts: counts || undefined,
        engine: 'egret-selfdev-5.4.1', variant: v, backend: backend, channel: adapter.channel,
        onLevel: function (info) {
          if (info.phase === 'start') {
            $c.value = String(info.count);
            capacityStatus = '承载力压测\n变体: ' + v + '  阶段: ' + (info.stage === 'coarse' ? '倍增粗测' : '临界补测') +
              '\n当前档位: ' + info.count + ' 角色\n状态: 预热 3s + 采样 10s';
            liveEl.textContent = capacityStatus;
          } else if (info.phase === 'invalid') {
            capacityStatus = '承载力压测\n档位: ' + info.count + ' 角色\n状态: 页面曾在后台，采样无效；回到前台后自动重测';
            liveEl.textContent = capacityStatus;
          } else {
            capacityStatus = '承载力压测\n档位: ' + info.count + ' 角色  ' + (info.stable ? '✅ 稳定' : '❌ 不稳定') +
              '\np95: ' + info.json.p95 + 'ms  p99: ' + info.json.p99 + 'ms  超预算: ' + info.json.overBudgetPct + '%';
            liveEl.textContent = capacityStatus;
          }
        },
        onDone: function (summary) {
          setCapacityRunning(false);
          var json = {
            meta: { engine: 'egret-selfdev-5.4.1', variant: v, backend: backend, channel: adapter.channel, mode: 'capacity-ramp' },
            maxStableCount: summary.cap,
            firstFailCount: summary.firstFail,
            cancelled: summary.cancelled,
            capped: summary.capped,
            results: summary.results.map(function (r) { return { count: r.count, stable: r.stable, result: r.json }; })
          };
          lastResult = json;
          copyBtn.disabled = false;
          liveEl.textContent = summary.cancelled
            ? '承载力压测已中止\n已完成档位: ' + summary.results.length
            : '承载力压测完成\n最大稳定承载力: ' + summary.cap + ' 角色' +
              '\n首次失败档: ' + (summary.firstFail == null ? '无（已到上限）' : summary.firstFail) +
              '\n已完成档位: ' + summary.results.length;
          BenchRunner.exportJSON(json);
          continueAutoBackendCompare(json);
        }
      });
    }

    hud.querySelector('#mback').addEventListener('click', function () {
      if (capacityRunning) runner.stopCapacityRamp();
      window.parent !== window ? window.parent.history.back() : window.history.back();
    });
    copyBtn.addEventListener('click', function () {
      if (!lastResult) return;
      var text = JSON.stringify(lastResult, null, 2);
      var done = function () {
        copyBtn.textContent = '已复制';
        setTimeout(function () { copyBtn.textContent = '复制结果'; }, 1500);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done);
        return;
      }
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      done();
    });
    hud.querySelector('#mfixed').addEventListener('click', runFixed);
    capacityBtn.addEventListener('click', runCapacity);
    compareBtn.addEventListener('click', startAutoBackendCompare);
    stopBtn.addEventListener('click', function () { runner.stopCapacityRamp(); });
    var bump = function (d) {
      var next = Math.max(0, (adapter.sim ? adapter.sim.list.length : 0) + d);
      adapter.setCount(next); $c.value = String(next);
    };
    hud.querySelector('#madd20').addEventListener('click',  function () { bump(20); });
    hud.querySelector('#msub20').addEventListener('click',  function () { bump(-20); });
    hud.querySelector('#madd100').addEventListener('click', function () { bump(100); });
    hud.querySelector('#msub100').addEventListener('click', function () { bump(-100); });

    var q = new URLSearchParams(location.search);
    if (q.get('autoCompare')) {
      setTimeout(runCapacity, 0);
    } else if (q.get('auto') === '1') {
      window.__benchAutoStarted = true;
      $c.value = q.get('count') || '50';
      runFixed();
    }

    this.addEventListener(egret.Event.ENTER_FRAME, function () {
      var ts = performance.now();
      runner.tick(ts);
      adapter.step(ts);
    });
  };

  window.MCBenchMain = MCBenchMain;
})();
