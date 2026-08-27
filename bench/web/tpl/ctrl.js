/**
 * 总控面板逻辑（四场景测试子界面共用）
 * 页面需定义 window.APP = {
 *   scene: 'bunny' | 'boids' | 'dhxy' | 'cloth',
 *   engines: [ { key, name, backends: { webgl: '相对产物路径', webgpu: '相对产物路径' } } ]
 * }
 * 切引擎/后端：点击「开始测试」→ 跳转到对应产物入口（带上 scene 参数供目标页恢复场景）。
 */
(function () {
  'use strict';
  var APP = window.APP;
  if (!APP) return;

  var $ = function (s) { return document.querySelector(s); };

  function build() {
    var ctrl = document.getElementById('ctrl');
    ctrl.innerHTML =
      '<div class="title"><h2>' + APP.sceneTitle + '</h2><a class="back" href="../index.html">← 返回</a></div>' +
      '<div class="row"><span class="lbl">引擎</span>' +
      '<select id="engineSel">' +
      APP.engines.map(function (e) {
        return '<option value="' + e.key + '">' + e.name + '</option>';
      }).join('') +
      '</select></div>' +
      '<div class="row"><span class="lbl">后端</span>' +
      '<select id="backendSel">' +
      '<option value="webgpu">WebGPU</option>' +
      '<option value="webgl">WebGL</option>' +
      '</select></div>' +
      '<div class="row"><span class="lbl">数量</span>' +
      '<input id="cntSel" type="number" value="10000" step="1000" style="background:#0d1218;color:#e6edf3;border:1px solid #33475a;border-radius:7px;padding:4px 8px;font-size:12px;width:90px"></div>' +
      '<div class="row">' +
      '<button id="goBtn" class="primary">▶ 单轮测试</button>' +
      '<button id="autoBtn">⚡ 自动对比两后端</button>' +
      '</div>' +
      '<div class="live" id="status">选择引擎和后端，点击测试。自动对比：同引擎 WebGPU→WebGL 各跑一轮，出加速比。</div>' +
      '<div class="tip">切片规则：同一引擎、同一后端跑一轮（预热 3s + 采样 10s），结果 JSON 自动复制。' +
      'WebGPU 需 PC 端 Chrome/Edge；手机可测 WebGL。数量对应场景：Bunny 10000 / 水族馆 1000。</div>';

    $('#engineSel').onchange = function () { updateBackendOptions(); };
    $('#goBtn').onclick = function () { go(); };
    $('#autoBtn').onclick = function () { autoCompare(); };
    updateBackendOptions();
  }

  function updateBackendOptions() {
    var e = $('#engineSel').value;
    var eng = APP.engines.find(function (x) { return x.key === e; });
    var backendSel = $('#backendSel');
    var cur = backendSel.value;
    backendSel.innerHTML = Object.keys(eng.backends).map(function (b) {
      return '<option value="' + b + '">' + (b === 'webgpu' ? 'WebGPU' : 'WebGL') + '</option>';
    }).join('');
    if (eng.backends[cur]) backendSel.value = cur;
    $('#status').textContent = '已选：' + eng.name + ' · ' +
      (backendSel.value === 'webgpu' ? 'WebGPU' : 'WebGL');
  }

  function go() {
    var e = $('#engineSel').value;
    var b = $('#backendSel').value;
    var eng = APP.engines.find(function (x) { return x.key === e; });
    var url = eng.backends[b];
    if (!url) {
      $('#status').textContent = '该组合暂未发布产物（待 IDE 构建后接入）。';
      return;
    }
    var sep = url.indexOf('?') >= 0 ? '&' : '?';
    location.href = url + sep + 'scene=' + APP.scene;
  }

  // 自动对比：iframe 里跑同一引擎的两后端，轮流收集结果，出加速比
  var RESULTS = {};       // backend -> json
  var autoState = { running: false, queue: [], timer: null };

  function autoCompare() {
    if (autoState.running) { $('#status').textContent = '自动对比进行中，请稍候…'; return; }
    var e = $('#engineSel').value;
    var eng = APP.engines.find(function (x) { return x.key === e; });
    var count = parseInt($('#cntSel').value, 10) || 10000;

    // 自动对比依赖 ?auto=1 参数（Laya/Cocos 产物已支持；Egret 请用其自带的一键自比面板）
    if (e === 'egret') {
      $('#status').textContent = 'Egret 暂不支持 iframe 自动对比——请进 Egret WebGPU vs WebGL 自比面板（页内有「一键自动测试」）。';
      return;
    }

    // 只跑已发布的后端
    var order = [];
    if (eng.backends.webgpu) order.push('webgpu');
    if (eng.backends.webgl) order.push('webgl');
    if (order.length < 2) {
      $('#status').textContent = eng.name + ' 只有 ' + order.length + ' 个后端产物，无法自动对比。先单轮测试。';
      return;
    }

    RESULTS = {};
    autoState.running = true;
    autoState.queue = order.slice();
    $('#autoBtn').disabled = true;
    $('#goBtn').disabled = true;
    runNext(eng, count);
  }

  function runNext(eng, count) {
    var backend = autoState.queue.shift();
    if (!backend) { finishCompare(eng); return; }
    $('#status').textContent = '【自动对比】' + eng.name + ' · ' +
      (backend === 'webgpu' ? 'WebGPU' : 'WebGL') + ' 运行中（预热3s+采样10s，约15s）…';

    var url = eng.backends[backend];
    // Laya / Cocos 支持 ?auto=1&variant&count（进入即跑固定采样）；Egret 自比面板走自己的逻辑
    var params = 'auto=1&backend=' + backend;
    if (url.indexOf('laya') >= 0 || url.indexOf('cocos') >= 0) {
      params += '&variant=' + (APP.scene === 'boids' ? 'boids' : 'V1') + '&count=' + count;
    }
    var sep = url.indexOf('?') >= 0 ? '&' : '?';
    var iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;border:0';
    iframe.src = url + sep + params;
    document.body.appendChild(iframe);

    // 轮询 iframe 里的 __benchLastResult（引擎自动跑完会写；Cocos 启动较慢给足时间）
    var deadline = Date.now() + 70000;
    var watch = setInterval(function () {
      if (Date.now() > deadline) {
        clearInterval(watch);
        iframe.remove();
        RESULTS[backend] = { error: '超时（40s）', meta: { variant: 'V1' } };
        runNext(eng, count);
        return;
      }
      var res = null;
      try { res = iframe.contentWindow.__benchLastResult; } catch (err) { /* 跨域/未加载完 */ }
      if (res) {
        clearInterval(watch);
        RESULTS[backend] = res;
        iframe.remove();
        runNext(eng, count);
      }
    }, 500);
  }

  function finishCompare(eng) {
    autoState.running = false;
    $('#autoBtn').disabled = false;
    $('#goBtn').disabled = false;

    var wg = RESULTS.webgpu, gl = RESULTS.webgl;
    var hasErr = !wg || !gl || wg.error || gl.error;
    if (hasErr) {
      $('#status').textContent = '对比完成（有缺失）:\n' + JSON.stringify(RESULTS, null, 2).slice(0, 800);
      return;
    }
    var wgP95 = wg.p95, glP95 = gl.p95;
    var speedup = glP95 && wgP95 ? (glP95 / wgP95).toFixed(2) : '?';
    var txt =
      '=== ' + eng.name + ' 两后端对比（p95 帧时，越小越好）===\n' +
      'WebGL :  p50=' + gl.p50 + 'ms  p95=' + glP95 + 'ms  p99=' + gl.p99 + 'ms  dc=' + gl.drawCallAvg + '\n' +
      'WebGPU:  p50=' + wg.p50 + 'ms  p95=' + wgP95 + 'ms  p99=' + wg.p99 + 'ms  dc=' + wg.drawCallAvg + '\n' +
      '加速比: WebGPU 是 WebGL 的 ' + speedup + ' 倍（按 p95）\n' +
      'nodes=' + wg.nodeCount + ' fps=' + wg.fps + ' / ' + gl.fps;
    $('#status').textContent = txt;
    // 附加完整 JSON 供复制
    RESULTS.__summary = txt;
    window.__benchAutoResult = RESULTS;
    try { navigator.clipboard.writeText(JSON.stringify(RESULTS, null, 2)); } catch (e) { /* 忽略 */ }
  }

  build();
})();
