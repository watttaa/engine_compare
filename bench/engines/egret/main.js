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
  var FISH_IMGS = [ // boids 5 鱼种 = 前 5 张变体图（与 cocos/laya 适配器一致）
    'rabbitv3_ash.png', 'rabbitv3_batman.png', 'rabbitv3_bb8.png', 'rabbitv3_neo.png', 'rabbitv3_sonic.png'
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
    egret.sys.startGetPerformance(1000); // 引擎官方统计开关
  };

  EgretAdapter.prototype.clearAll = function () {
    this.root.removeChildren();
    this.nodes.length = 0;
    this._extra.length = 0;
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
        nodes[i].rotation = list[i].angle * 57.29577951;
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
    var info = egret.sys.getPerformace && egret.sys.getPerformace();
    return info ? info.drawCall : -1;
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

    var adapter = new EgretAdapter(this);
    var stats = new BenchStats();
    var runner = new BenchRunner(adapter, stats);
    window.__bench = { adapter: adapter, stats: stats, runner: runner };

    // HUD
    var hud = document.createElement('div');
    hud.id = 'hud';
    hud.innerHTML =
      'Egret-自研5.4.1 | ' +
      '<select id="bv">' +
      '<option value="V1">Bunny V1 同纹理合批</option>' +
      '<option value="V2">Bunny V2 atlas多帧</option>' +
      '<option value="V3">Bunny V3 随机变换</option>' +
      '<option value="V4">Bunny V4 不合批</option>' +
      '<option value="boids">水族馆 2D Boids</option>' +
      '</select>' +
      '<input id="cnt" type="number" value="10000" step="1000" style="width:70px">' +
      '<button id="fixed">固定采样</button>' +
      '<button id="ramp">阶梯压测</button>' +
      '<button id="sdir">保存目录</button>' +
      '<div id="out">待命中…</div>';
    document.body.appendChild(hud);
    var $v = document.getElementById('bv'), $c = document.getElementById('cnt'),
      $out = document.getElementById('out');

    function loadAssets(variant, cb) {
      var names = variant === 'boids' ? FISH_IMGS
        : variant === 'V1' ? BUNNY_IMGS.slice(0, 1)
          : variant === 'V2' ? BUNNY_IMGS.slice(0, 8)
            : BUNNY_IMGS; // V4：12 张互不相同纹理循环，相邻节点必不合批
      Promise.all(names.map(function (n) { return loadImage('../../assets/' + n); }))
        .then(function (imgs) {
          adapter.textures = imgs.map(texFrom);
          cb();
        });
    }

    function report(json) {
      $out.innerHTML = '完成: ' + JSON.stringify(json, null, 1).replace(/\n/g, '<br>');
      BenchRunner.exportJSON(json);
    }
    runner.onReport = report;
        BenchRunner.onSaved = function (name) { $out.textContent += ' | 已存: ' + name; };
        document.getElementById('sdir').onclick = function () { BenchRunner.pickSaveDir(); };

    document.getElementById('fixed').onclick = function () {
      loadAssets($v.value, function () {
        runner.fixedRun({
          engine: 'egret-selfdev-5.4.1', variant: $v.value, backend: 'webgl',
          count: parseInt($c.value, 10) || 10000, bounds: bounds
        });
        $out.textContent = '运行中（预热+采样）…';
      });
    };
    document.getElementById('ramp').onclick = function () {
      loadAssets($v.value, function () {
        runner.rampRun({
          engine: 'egret-selfdev-5.4.1', variant: $v.value, backend: 'webgl',
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
  };

  function __extends(d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
  }

  window.BenchMain = BenchMain; // data-entry-class 解析需要全局可见
})();
