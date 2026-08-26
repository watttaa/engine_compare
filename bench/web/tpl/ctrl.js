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
      '<div class="row">' +
      '<button id="goBtn" class="primary">▶ 开始测试</button>' +
      '</div>' +
      '<div class="live" id="status">选择引擎和后端，点击开始测试。</div>' +
      '<div class="tip">切片规则：同一引擎、同一后端跑一轮（预热 3s + 采样 10s），结果 JSON 自动复制。' +
      'WebGPU 需 PC 端 Chrome/Edge；手机可测 WebGL。</div>';

    $('#engineSel').onchange = function () { updateBackendOptions(); };
    $('#goBtn').onclick = function () { go(); };
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

  build();
})();
