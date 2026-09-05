/**
 * 总控面板逻辑（四场景测试子界面共用）
 * 页面需定义 window.APP = {
 *   scene: 'bunny' | 'boids' | 'dhxy' | 'cloth',
 *   sceneTitle: '标题',
 *   engines: [ { key, name, backends: { webgl: 'url', webgpu: 'url' } } ]
 * }
 *
 * 功能：
 *  1. 单轮测试：跳转所选引擎×后端产物页
 *  2. 自动对比两后端：iframe 跑同引擎两后端，出加速比
 *  3. 全轮次自动测试：单引擎×可用后端×全部场景变体，逐轮 iframe 跑完存 localStorage
 *  4. 三引擎对比：汇总 localStorage 历史结果，出横向对比表（+复制 JSON）
 */
(function () {
  'use strict';
  var APP = window.APP;
  if (!APP) return;

  var $ = function (s) { return document.querySelector(s); };
  var STORE_KEY = 'benchResults_v1';

  // 各场景页对应的轮次（变体）
  var SCENARIOS = {
    bunny: ['V1', 'V2', 'V3', 'V4'],
    boids: ['boids'],
    boids3d: ['boids3d'],
    dhxy: ['M2'],
    cloth: []
  };

  // 承载力场景：自动对比走 autoRamp 阶梯（出 cap + 逐档曲线），而非固定单点
  // boids（2D 水族馆）同为容量型场景：各引擎极限差一个量级，固定单点对比无意义 → ramp
  var RAMP_SCENES = { boids3d: true, boids: true };
  function isRampScene() { return !!RAMP_SCENES[APP.scene]; }

  // ---------- 存储 ----------
  function loadResults() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); } catch (e) { return []; }
  }
  function saveResult(r) {
    var all = loadResults();
    // 同 engine+backend+variant+count 只留最新
    all = all.filter(function (x) {
      return !(x.engine === r.engine && x.backend === r.backend &&
        x.variant === r.variant && x.count === r.count);
    });
    all.push(r);
    localStorage.setItem(STORE_KEY, JSON.stringify(all));
  }

  // ---------- UI ----------
  function build() {
    var ctrl = document.getElementById('ctrl');
    var isDhxy = APP.scene === 'dhxy';
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
      '<input id="cntSel" type="number" value="' + (isDhxy ? '20' : '10000') + '" step="' + (isDhxy ? '10' : '1000') + '"></div>' +
      '<div class="row">' +
      '<button id="goBtn" class="primary">▶ ' + (isDhxy ? '进入场景' : '单轮测试') + '</button>' +
      (isDhxy ? '' : '<button id="autoBtn">⚡ 自动对比两后端</button>') +
      '</div>' +
      (isDhxy ? '' : '<div class="row"><button id="fullBtn">🔄 全轮次自动测试</button><button id="cmpBtn">📊 三引擎对比</button></div>') +
      '<div class="live" id="status">选择引擎和后端，点击测试。</div>' +
      (isDhxy ? '<div class="tip">本页打开即进入场景（默认 10 角色）；HUD 上点「固定采样」或「自动双后端」（WebGL 原版 → WebGPU 实例化层）出数据。</div>' :
        '<div class="tip">全轮次：所有引擎×可用后端×全部变体逐轮跑（每轮预热3s+采样10s），结果自动存浏览器，跑完自动打开对比表。' +
        '三引擎对比：汇总本浏览器历史结果出表。WebGPU 需 PC Chrome/Edge。</div>');

    $('#engineSel').onchange = function () { updateBackendOptions(); };
    $('#goBtn').onclick = function () { go(); };
    if (!isDhxy) {
      $('#autoBtn').onclick = function () { autoCompare(); };
      $('#fullBtn').onclick = function () { fullRun(); };
      $('#cmpBtn').onclick = function () { compareView(); };
    }
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
    var extra = (e === 'egret' || e === 'egret-spine') ? ('backend=' + b) : '';
    location.href = url + sep + 'scene=' + APP.scene + (extra ? '&' + extra : '');
  }

  // ---------- 通用 iframe 轮次执行（全屏可见，实时观看） ----------
  function runInIframe(url, params, timeoutMs, cb) {
    var sep = url.indexOf('?') >= 0 ? '&' : '?';
    // 移除上一轮 iframe（每轮新建，避免读到上一轮残留的 __benchLastResult）
    var old = document.getElementById('benchFrame');
    if (old) old.remove();
    var iframe = document.createElement('iframe');
    iframe.id = 'benchFrame';
    // 全屏显示在 #stage：实时看到每轮画面；也保证画布是真实视口尺寸
    // （1px 隐藏 iframe 会低估 GPU 负载，帧时间偏乐观）
    iframe.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;border:0;background:#14161a;z-index:1';
    iframe.src = url + sep + params;
    var stage = document.getElementById('stage') || document.body;
    stage.appendChild(iframe);
    var deadline_active = 0;   // 仅前台累计的耗时（后台标签 rAF 冻结，测试无法推进）
    var lastTick = Date.now();
    var hiddenWarned = false;
    var watch = setInterval(function () {
      var now = Date.now();
      if (!document.hidden) {
        deadline_active += now - lastTick;
      } else if (!hiddenWarned) {
        hiddenWarned = true;
        $('#status').textContent = '⚠ 页面在后台——测试已暂停，请回到本标签页（后台时 rAF 冻结，测试无法推进）';
      }
      lastTick = now;
      if (deadline_active > (timeoutMs || 70000)) {
        clearInterval(watch);
        iframe.remove();
        cb(null);
        return;
      }
      var res = null;
      try { res = iframe.contentWindow.__benchLastResult; } catch (err) { /* 加载中 */ }
      if (res) {
        clearInterval(watch);
        cb(res); // iframe 保留显示，下一轮开始时才替换
      }
    }, 500);
  }

  function makeParams(url, backend, variant, count, ramp) {
    var params = 'auto=1&backend=' + backend;
    if (url.indexOf('laya') >= 0 || url.indexOf('cocos') >= 0 || url.indexOf('egret') >= 0) {
      params += '&variant=' + variant + '&count=' + count;
    }
    if (ramp) params += '&mode=ramp';
    return params;
  }

  // ---------- 自动对比两后端 ----------
  var RESULTS = {};
  var autoState = { running: false };

  function autoCompare() {
    if (autoState.running) { $('#status').textContent = '自动对比进行中，请稍候…'; return; }
    var e = $('#engineSel').value;
    var eng = APP.engines.find(function (x) { return x.key === e; });
    var count = parseInt($('#cntSel').value, 10) || 10000;
    var sc = SCENARIOS[APP.scene] || [];
    var variant = sc.length ? sc[0] : 'V1';

    var order = [];
    if (eng.backends.webgpu) order.push('webgpu');
    if (eng.backends.webgl) order.push('webgl');
    if (order.length < 2) {
      $('#status').textContent = eng.name + ' 只有 ' + order.length + ' 个后端产物，无法自动对比。';
      return;
    }

    RESULTS = {};
    autoState.running = true;
    $('#autoBtn').disabled = true;
    $('#fullBtn').disabled = true;
    runNextCompare(eng, order, variant, count);
  }

  function runNextCompare(eng, order, variant, count) {
    var backend = order.shift();
    if (!backend) { finishCompare(eng); return; }
    $('#status').textContent = '【自动对比】' + eng.name + ' · ' +
      (backend === 'webgpu' ? 'WebGPU' : 'WebGL') + ' · ' + variant + ' 运行中…';
    // 3D 水族馆阶梯：粗梯 20 档（50→100000）+ 临界后 500 细扫（≤16 档）+ 重试 ≈ 550s 内
    var timeoutMs = isRampScene() ? 600000 : 70000;
    runInIframe(eng.backends[backend], makeParams(eng.backends[backend], backend, variant, count, isRampScene()), timeoutMs, function (res) {
      RESULTS[backend] = res || { error: '超时' };
      runNextCompare(eng, order, variant, count);
    });
  }

  function finishCompare(eng) {
    autoState.running = false;
    $('#autoBtn').disabled = false;
    $('#fullBtn').disabled = false;
    if (isRampScene()) { finishRampCompare(eng); return; }
    var wg = RESULTS.webgpu, gl = RESULTS.webgl;
    if (!wg || !gl || wg.error || gl.error) {
      $('#status').textContent = '对比完成（有缺失）：\n' + JSON.stringify(RESULTS).slice(0, 600);
      return;
    }
    var wgActual = wg.actualBackend || (wg.meta && wg.meta.backend) || '?';
    var glActual = gl.actualBackend || (gl.meta && gl.meta.backend) || '?';
    var wgValid = wg.backendValid !== false && wgActual === 'webgpu';
    var glValid = gl.backendValid !== false && glActual === 'webgl';
    if (!wgValid || !glValid) {
      $('#status').textContent = '对比完成但无效：WebGL 实际后端=' + glActual + '，WebGPU 实际后端=' + wgActual + '。不生成胜负结论。';
      return;
    }
    var speedup = gl.p95 && wg.p95 ? (gl.p95 / wg.p95).toFixed(2) : '?';
    $('#status').textContent =
      '=== ' + eng.name + ' 两后端对比（' + wg.nodeCount + ' 只 · ' + (wg.meta && wg.meta.variant) + '）===\n' +
      'WebGL :  p50=' + gl.p50 + 'ms  p95=' + gl.p95 + 'ms  p99=' + gl.p99 + 'ms  dc=' + gl.drawCallAvg + '（实际 ' + glActual + '）\n' +
      'WebGPU:  p50=' + wg.p50 + 'ms  p95=' + wg.p95 + 'ms  p99=' + wg.p99 + 'ms  dc=' + wg.drawCallAvg + '（实际 ' + wgActual + '）\n' +
      '加速比: WebGPU 是 WebGL 的 ' + speedup + ' 倍（按 p95）';
  }

  // ---------- 承载力（autoRamp）对比：cap 数字 + count→p95 曲线 ----------
  function finishRampCompare(eng) {
    var wg = RESULTS.webgpu, gl = RESULTS.webgl;
    if (!wg || !gl || wg.error || gl.error) {
      $('#status').textContent = '对比完成（有缺失）：\n' + JSON.stringify(RESULTS).slice(0, 600);
      return;
    }
    var capWg = wg.cap != null ? wg.cap : 0;
    var capGl = gl.cap != null ? gl.cap : 0;
    var wgReal = (wg.meta && wg.meta.backend) || '?';
    var glReal = (gl.meta && gl.meta.backend) || '?';
    var wgValid = !(wg.meta && wg.meta.backendValid === false) && wgReal === 'webgpu' && !wg.invalidCurve;
    var glValid = !(gl.meta && gl.meta.backendValid === false) && glReal === 'webgl' && !gl.invalidCurve;
    var best = Math.max(wgValid ? capWg : 0, glValid ? capGl : 0);
    function firstFps(r) {
      var lv = (r && r.levels && r.levels.length) ? r.levels[0] : null;
      return lv && lv.fps != null ? lv.fps : null;
    }
    function line(label, cap, r) {
      var s = label + ':  cap=' + cap + ' 只';
      if (cap === 0) {
        var lv0 = (r && r.levels && r.levels[0]) || null;
        var f = firstFps(r);
        if (f != null) s += '（首档' + (lv0 ? lv0.count : '?') + '只未达55fps，实测 ' + f + 'fps）';
      }
      if (r.jankAt != null) s += ' · 掉帧档=' + r.jankAt;
      if (r.thresholdAt != null) s += ' · 临界=' + r.thresholdAt + (r.fineStep ? '(+' + r.fineStep + '细扫)' : '');
      return s;
    }
    var fGl = firstFps(gl), fWg = firstFps(wg);
    function invalidReason(r, valid, expected) {
      if (valid) return '';
      if (r.meta && r.meta.backendValid === false) return '⚠ 无效：请求 WebGPU 但运行时回退 ' + ((r.meta && r.meta.backend) || '?');
      if (r.invalidCurve) return '⚠ 无效：低档掉帧后高档恢复，采样受启动/调度污染，请重跑';
      return '⚠ 无效：实际后端不是 ' + expected;
    }
    var txt =
      '=== ' + eng.name + ' 承载力对比（稳定门槛 fps≥55，越大越好）===\n' +
      line('WebGL ', capGl, gl) + '（实际后端:' + glReal + '）' + (glValid ? '' : '\n' + invalidReason(gl, glValid, 'webgl')) + '\n' +
      line('WebGPU', capWg, wg) + '（实际后端:' + wgReal + '）' + (wgValid ? '' : '\n' + invalidReason(wg, wgValid, 'webgpu')) + '\n';
    function ctxLine(r) {
      var parts = [];
      var l0 = (r && r.levels && r.levels[0]) || {};
      if (l0.renderWidth && l0.renderHeight) parts.push('画布=' + l0.renderWidth + '×' + l0.renderHeight);
      if (l0.dpr) parts.push('DPR=' + l0.dpr);
      var gpu = l0.gpuRenderer || null;
      if (gpu) parts.push('GPU=' + String(gpu).slice(0, 60));
      if (l0.renderWidth && l0.renderHeight) parts.push('填充=' + (l0.renderWidth * l0.renderHeight / 1000000).toFixed(1) + 'MP');
      return parts.length ? '　↳ ' + parts.join(' · ') : '';
    }
    if (glValid) txt += ctxLine(gl) + '\n';
    if (wgValid) txt += ctxLine(wg) + '\n';
    if (!wgValid || !glValid) {
      txt += '结论: 本轮存在无效数据，不比较后端强弱；请重跑无效臂。';
    } else if (best > 0) {
      txt += '结论: ' + (capWg >= capGl ? 'WebGPU' : 'WebGL') + ' 承载力更强（' + best + ' 只 @≥55fps）';
    } else {
      txt += '结论: 两后端均未能在最低档(50只)稳定 55fps' +
        ((fGl != null && fWg != null) ? '（WebGL ' + fGl + 'fps · WebGPU ' + fWg + 'fps）' : '');
    }
    // 完整对比 JSON：存 window.__benchCompareResult 供外部采集，并附复制按钮
    // summary = 自描述结论块（程序化分析直接读，不用重新解析 levels）
    function ctxOf(r) {
      var l0 = (r && r.levels && r.levels[0]) || {};
      return {
        renderWidth: l0.renderWidth || null, renderHeight: l0.renderHeight || null,
        dpr: l0.dpr || null, gpuVendor: l0.gpuVendor || null, gpuRenderer: l0.gpuRenderer || null,
        fillMP: (l0.renderWidth && l0.renderHeight) ? Math.round(l0.renderWidth * l0.renderHeight / 10000) / 100 : null
      };
    }
    var bothValid = wgValid && glValid;
    var compareResult = {
      meta: {
        scene: APP.scene, variant: APP.scene, engine: eng.key, engineName: eng.name,
        mode: 'autoRamp', time: new Date().toISOString(),
        userAgent: navigator.userAgent, dpr: window.devicePixelRatio || 1,
        gate: '稳定=fps≥55 且 p95≤18.2ms；临界点=首个未达稳定的档位（命中后 +500 细扫，连3档硬掉帧收）；cap=首个硬掉帧前的最高稳定档；粗梯 50→50000 共 15 档'
      },
      summary: {
        capWebgl: glValid ? capGl : null,
        capWebgpu: wgValid ? capWg : null,
        jankAtWebgl: gl.jankAt != null ? gl.jankAt : null,
        jankAtWebgpu: wg.jankAt != null ? wg.jankAt : null,
        thresholdAtWebgl: gl.thresholdAt != null ? gl.thresholdAt : null,
        thresholdAtWebgpu: wg.thresholdAt != null ? wg.thresholdAt : null,
        webglValid: glValid, webgpuValid: wgValid,
        invalidCurveWebgl: !!gl.invalidCurve, invalidCurveWebgpu: !!wg.invalidCurve,
        winner: bothValid ? (capWg >= capGl ? 'webgpu' : 'webgl') : null,
        winnerCap: bothValid ? Math.max(capWg, capGl) : null,
        speedupCap: (bothValid && capGl > 0) ? Math.round(capWg / capGl * 100) / 100 : null,
        ctx: { webgl: ctxOf(gl), webgpu: ctxOf(wg) }
      },
      arms: { webgl: gl, webgpu: wg }
    };
    window.__benchCompareResult = compareResult;
    txt += '\n[完整JSON已就绪] window.__benchCompareResult';
    var oldBtn = document.getElementById('cmpCopyBtn');
    if (oldBtn) oldBtn.remove();
    var btn = document.createElement('button');
    btn.id = 'cmpCopyBtn';
    btn.textContent = '📋 复制完整对比 JSON';
    btn.style.cssText = 'margin-top:8px;padding:4px 12px;cursor:pointer';
    btn.onclick = function () {
      var data = JSON.stringify(window.__benchCompareResult, null, 2);
      var done = function () { btn.textContent = '✓ 已复制'; setTimeout(function () { btn.textContent = '📋 复制完整对比 JSON'; }, 2000); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(data).then(done).catch(function () { window.prompt('手动复制', data); });
      else window.prompt('手动复制', data);
    };
    $('#status').parentNode.insertBefore(btn, $('#status'));
    $('#status').textContent = txt;
    drawRampChart('WebGL', gl.levels, 'WebGPU', wg.levels);
  }

  // SVG 折线：count → p95(ms)，两后端叠加；掉帧档 ✗ / 中间档 △
  // x 轴用固定档位 + 等距（不再 log 压缩，避免大 maxCount 把稳定点挤到左边）
  function drawRampChart(labelA, levelsA, labelB, levelsB) {
    var old = document.getElementById('rampChart');
    if (old) old.remove();
    var W = 660, H = 320, padL = 52, padR = 24, padT = 20, padB = 42;
    function clean(lv) { return (lv || []).filter(function (l) { return l && l.count && l.p95; }); }
    var A = clean(levelsA), B = clean(levelsB);
    var all = A.concat(B);
    if (!all.length) return;
    // X 轴槽位从实际数据动态生成（档位表改动无需同步此文件），固定顺序等距
    var present = [];
    all.forEach(function (l) {
      if (l.count && present.indexOf(l.count) < 0) present.push(l.count);
    });
    present.sort(function (a, b) { return a - b; });
    var nSlots = present.length;
    function lx(count) {
      var i = present.indexOf(count);
      if (i < 0) return padL;
      if (nSlots <= 1) return padL + (W - padL - padR) / 2;
      return padL + (i / (nSlots - 1)) * (W - padL - padR);
    }
    var maxP95 = Math.max.apply(null, all.map(function (l) { return l.p95; }));
    // Y 轴上限钳制到 40ms（约 25fps），避免掉帧档的 55ms 把稳定区压扁；超限点贴底 + ✗ 标记
    var yCeil = Math.min(Math.max(20, Math.ceil(maxP95 / 5) * 5), 40);
    function ly(ms) { return padT + (Math.min(ms, yCeil) / yCeil) * (H - padT - padB); }
    var svg = '<svg id="rampChart" xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H +
      '" style="display:block;margin-top:10px;background:#0d1218;border:1px solid #2b3947;border-radius:8px;max-width:100%">';
    // 60fps 预算线（16.7ms）
    svg += '<line x1="' + padL + '" y1="' + ly(16.7) + '" x2="' + (W - padR) + '" y2="' + ly(16.7) +
      '" stroke="#3a4a5a" stroke-dasharray="4,4"/>';
    svg += '<text x="' + (W - padR) + '" y="' + (ly(16.7) - 4) + '" fill="#8aa0b4" font-size="10" text-anchor="end">16.7ms=60fps</text>';
    // 55fps 稳定门槛线（18.2ms）
    var y55 = ly(18.18);
    if (y55 > padT && y55 < H - padB) {
      svg += '<line x1="' + padL + '" y1="' + y55 + '" x2="' + (W - padR) + '" y2="' + y55 + '" stroke="#274a6b" stroke-dasharray="2,4"/>';
      svg += '<text x="' + (W - padR) + '" y="' + (y55 - 4) + '" fill="#4a7dab" font-size="10" text-anchor="end">18.2ms=55fps 门槛</text>';
    }
    function line(color, levels) {
      var s = clean(levels), d = '', p = '';
      s.forEach(function (l, i) {
        var x = lx(l.count), y = ly(l.p95);
        if (i === 0) d += 'M' + x + ',' + y; else d += 'L' + x + ',' + y;
        p += '<circle cx="' + x + '" cy="' + y + '" r="3.5" fill="' + color + '"/>';
      });
      return (d ? '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="2"/>' : '') + p;
    }
    svg += line('#f0a14a', levelsA);
    svg += line('#5ba3ff', levelsB);
    // 掉帧/中间档标记
    function jankMark(color, levels) {
      var out = '';
      (levels || []).forEach(function (l) {
        if (!l || !l.count) return;
        var x = lx(l.count), y = ly(l.p95);
        var sym;
        if (l.fps < 50) sym = '✗';
        else if (l.fps < 55) sym = '△';
        else return;
        out += '<text x="' + x + '" y="' + (y - 7) + '" fill="' + color + '" font-size="13" text-anchor="middle">' + sym + '</text>';
      });
      return out;
    }
    svg += jankMark('#f0a14a', levelsA);
    svg += jankMark('#5ba3ff', levelsB);
    // 坐标轴
    svg += '<line x1="' + padL + '" y1="' + (H - padB) + '" x2="' + (W - padR) + '" y2="' + (H - padB) + '" stroke="#33475a"/>';
    svg += '<line x1="' + padL + '" y1="' + padT + '" x2="' + padL + '" y2="' + (H - padB) + '" stroke="#33475a"/>';
    // Y 刻度（0..yCeil 每 5ms）
    for (var g = 0; g <= yCeil; g += 5) {
      var y = ly(g);
      svg += '<text x="' + (padL - 6) + '" y="' + (y + 3) + '" fill="#7d93a8" font-size="9" text-anchor="end">' + g + '</text>';
    }
    // X 刻度（只标实际出现的档位）
    present.forEach(function (t) {
      var x = lx(t);
      svg += '<text x="' + x + '" y="' + (H - padB + 14) + '" fill="#7d93a8" font-size="9" text-anchor="middle">' + t + '</text>';
    });
    // 图例
    svg += '<circle cx="' + (padL + 6) + '" cy="' + (padT + 8) + '" r="4" fill="#f0a14a"/><text x="' + (padL + 16) + '" y="' + (padT + 11) + '" fill="#cdd9e5" font-size="10">' + labelA + '</text>';
    svg += '<circle cx="' + (padL + 86) + '" cy="' + (padT + 8) + '" r="4" fill="#5ba3ff"/><text x="' + (padL + 96) + '" y="' + (padT + 11) + '" fill="#cdd9e5" font-size="10">' + labelB + '</text>';
    svg += '<text x="' + padL + '" y="' + (H - 6) + '" fill="#7d93a8" font-size="9">X=数量(固定档等距) · Y=p95帧时(ms,>40贴底) · ✗=掉帧(&lt;50fps) · △=中间档(50-54fps)</text>';
    svg += '</svg>';
    var host = document.getElementById('ctrl');
    host.insertAdjacentHTML('beforeend', svg);
  }

  // ---------- 全轮次自动测试 ----------
  var fullRunning = false;
  function fullRun() {
    if (fullRunning) { $('#status').textContent = '全轮次测试进行中，请稍候…'; return; }
    var scenarios = SCENARIOS[APP.scene] || [];
    if (!scenarios.length) {
      $('#status').textContent = '该场景暂无自动轮次（骨骼/布料适配器未开发）。';
      return;
    }
    var count = parseInt($('#cntSel').value, 10) || 10000;

    // 队列：所有引擎 × 可用后端 × 全部变体（一次点完 cocos3d/laya3d × WebGL/WebGPU）
    var queue = [];
    var order = ['webgl', 'webgpu'];
    APP.engines.forEach(function (eng) {
      for (var b = 0; b < order.length; b++) {
        if (!eng.backends[order[b]]) continue;
        for (var s = 0; s < scenarios.length; s++) {
          queue.push({ eng: eng, backend: order[b], variant: scenarios[s] });
        }
      }
    });
    if (!queue.length) {
      $('#status').textContent = '没有任何引擎×后端产物就位，无法全轮次测试。';
      return;
    }

    fullRunning = true;
    $('#autoBtn').disabled = true;
    $('#fullBtn').disabled = true;
    $('#status').textContent = '【全轮次】' +
      APP.engines.map(function (x) { return x.name; }).join(' + ') +
      ' × WebGL/WebGPU 共 ' + queue.length + ' 臂，开始…';

    var idx = 0;
    var saved = 0;
    (function next() {
      if (idx >= queue.length) {
        fullRunning = false;
        $('#autoBtn').disabled = false;
        $('#fullBtn').disabled = false;
        $('#status').textContent = '【全轮次完成】' + saved + '/' + queue.length + ' 臂已存（数量 ' + count +
          '）。已打开三引擎对比。';
        compareView();
        return;
      }
      var q = queue[idx];
      var ramp = isRampScene();
      $('#status').textContent = '【全轮次 ' + (idx + 1) + '/' + queue.length + '】' + q.eng.name +
        ' · ' + (q.backend === 'webgpu' ? 'WebGPU' : 'WebGL') + ' · ' + q.variant +
        (ramp ? '（阶梯跑批，约 4-6 分钟）' : ' 运行中…');
      runInIframe(q.eng.backends[q.backend], makeParams(q.eng.backends[q.backend], q.backend, q.variant, count, ramp), ramp ? 600000 : 70000, function (res) {
        if (res) {
          if (ramp && res.cap != null) {
            // 承载力记录：cap 摘要 + 完整逐档曲线一起进 localStorage（count 字段用 'ramp' 参与去重）
            var l0 = (res.levels && res.levels[0]) || {};
            saveResult({
              ts: Date.now(),
              engine: q.eng.key, engineName: q.eng.name,
              backend: q.backend, variant: q.variant, count: 'ramp',
              ramp: true,
              cap: res.cap, jankAt: res.jankAt, capped: res.capped,
              invalidCurve: !!res.invalidCurve, levels: res.levels || [],
              gpuRenderer: res.gpuRenderer || (res.meta && res.meta.gpuRenderer) || (l0.gpuRenderer || null),
              requestedBackend: q.backend,
              actualBackend: (res.meta && res.meta.backend) || res.actualBackend || null,
              backendValid: !(res.meta && res.meta.backendValid === false),
              renderWidth: l0.renderWidth || null, renderHeight: l0.renderHeight || null,
              dpr: l0.dpr || null
            });
          } else {
            saveResult({
              ts: Date.now(),
              engine: q.eng.key, engineName: q.eng.name,
              backend: q.backend, variant: q.variant, count: count,
              fps: res.fps, p50: res.p50, p95: res.p95, p99: res.p99,
              drawCallAvg: res.drawCallAvg, nodeCount: res.nodeCount,
              overBudgetPct: res.overBudgetPct, jsHeapMB: res.jsHeapMB,
              gpuRenderer: res.gpuRenderer || null,
              requestedBackend: q.backend,
              actualBackend: res.actualBackend || null,
              backendValid: (res.actualBackend || null) === q.backend,
              comparisonEligible: (res.actualBackend || null) === q.backend,
              renderWidth: res.renderWidth || null, renderHeight: res.renderHeight || null,
              antialias: res.antialias, workloadClass: res.workloadClass || null,
              textureCount: res.textureCount || null
            });
          }
          saved++;
        }
        idx++;
        next();
      });
    })();
  }

  // ---------- 三引擎对比 ----------
  function compareView() {
    var all = loadResults();
    if (!all.length) {
      $('#status').textContent = '暂无历史结果——先跑「🔄 全轮次自动测试」。';
      return;
    }
    // 分组：variant+count → engine+backend → result（ramp 承载力记录单列，不进固定点表）
    var groups = {};
    var rampLatest = {};
    all.forEach(function (r) {
      if (r.ramp) {
        var rk = r.engine + '_' + r.backend;
        if (!rampLatest[rk] || r.ts > rampLatest[rk].ts) rampLatest[rk] = r;
        return;
      }
      var k = r.variant + '_' + r.count;
      groups[k] = groups[k] || {};
      groups[k][r.engine + '_' + r.backend] = r;
    });

    // 引擎顺序
    var engOrder = APP.engines.map(function (e) { return e.key; });

    var html = '<div id="cmpOverlay" style="position:fixed;inset:0;z-index:99999;background:rgba(10,13,17,.92);overflow:auto;padding:24px">' +
      '<div style="max-width:960px;margin:0 auto;background:#161a21;border:1px solid #2b3947;border-radius:12px;padding:20px">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
      '<h3 style="margin:0;color:#7fd4ff;font-size:16px">📊 三引擎对比（p95 帧时 ms，越小越好 · 共 ' + all.length + ' 条）</h3>' +
      '<div><button id="cmpCopy" style="background:#2f6feb;color:#fff;border:0;border-radius:7px;padding:6px 14px;cursor:pointer">复制 JSON</button> ' +
      '<button id="cmpClear" style="background:#7a2f2f;color:#fff;border:0;border-radius:7px;padding:6px 14px;cursor:pointer">清空历史</button> ' +
      '<button id="cmpClose" style="background:#1d2833;color:#cdd9e5;border:1px solid #33475a;border-radius:7px;padding:6px 14px;cursor:pointer">关闭</button></div></div>';

    // ---- 承载力（ramp cap）专区：boids3d 全轮次/自动对比产出的 cap 记录 ----
    var rampKeys = Object.keys(rampLatest);
    if (rampKeys.length) {
      var bestRamp = 0;
      rampKeys.forEach(function (k) {
        var r = rampLatest[k];
        if (!r.invalidCurve && r.backendValid !== false && r.cap > bestRamp) bestRamp = r.cap;
      });
      html += '<h4 style="color:#7fd4ff;margin:14px 0 6px;font-size:14px">🏗 承载力 cap（autoRamp 阶梯 · 稳定门槛 fps≥55 且 p95≤20ms · 越大越好）</h4>';
      html += '<table style="width:100%;border-collapse:collapse;font-size:12.5px">';
      html += '<tr style="color:#8aa0b4"><th style="text-align:left;padding:6px 8px">引擎</th><th>cap</th><th>掉帧档</th><th>实际后端</th><th>画布</th><th>GPU</th><th>时间</th></tr>';
      rampKeys.sort().forEach(function (k) {
        var r = rampLatest[k];
        var valid = !r.invalidCurve && r.backendValid !== false;
        var isBest = valid && r.cap === bestRamp && bestRamp > 0;
        var canvas = r.renderWidth && r.renderHeight ? (r.renderWidth + '×' + r.renderHeight) : '-';
        var gpu = r.gpuRenderer ? String(r.gpuRenderer).slice(0, 46) : '-';
        var t = new Date(r.ts);
        var tstr = ('0' + (t.getMonth() + 1)).slice(-2) + '-' + ('0' + t.getDate()).slice(-2) + ' ' + ('0' + t.getHours()).slice(-2) + ':' + ('0' + t.getMinutes()).slice(-2);
        html += '<tr style="border-top:1px solid #232a34' + (isBest ? ';background:#12281c' : '') + '">' +
          '<td style="padding:6px 8px">' + r.engineName + ' <span style="color:#8aa0b4">[' + r.backend + ']</span>' + (isBest ? ' 🏆' : '') +
            (r.invalidCurve ? ' <span style="color:#e0a040" title="低档掉帧后高档恢复，曲线受污染">⚠脏曲线</span>' : '') +
            (r.backendValid === false ? ' <span style="color:#e06060">⚠后端不符</span>' : '') + '</td>' +
          '<td style="text-align:center;font-weight:' + (isBest ? '700' : '400') + '">' + (r.cap != null ? r.cap : '-') + '</td>' +
          '<td style="text-align:center">' + (r.jankAt != null ? r.jankAt : '-') + '</td>' +
          '<td style="text-align:center">' + (r.actualBackend || '-') + '</td>' +
          '<td style="text-align:center">' + canvas + (r.dpr ? ' @' + r.dpr : '') + '</td>' +
          '<td style="text-align:center" title="' + gpu + '">' + gpu + '</td>' +
          '<td style="text-align:center">' + tstr + '</td></tr>';
      });
      html += '</table>';
      html += '<p style="color:#6b7280;font-size:11.5px;margin:6px 0 0">cap = 首个掉帧档之前的最高稳定档；⚠脏曲线 = 低档掉帧后高档恢复（采样受污染），仅展示不评奖。</p>';
    }


    Object.keys(groups).sort().forEach(function (k) {
      var g = groups[k];
      html += '<h4 style="color:#cdd9e5;margin:16px 0 6px;font-size:14px">场景 ' + k.replace('_', ' · ') + '</h4>';
      html += '<table style="width:100%;border-collapse:collapse;font-size:12.5px">';
      html += '<tr style="color:#8aa0b4"><th style="text-align:left;padding:6px 8px">引擎</th><th>p50</th><th>p95</th><th>p99</th><th>fps</th><th>dc</th><th>掉帧%</th></tr>';
      // 找本组最小 p95
      var best = null;
      engOrder.forEach(function (ek) { ['webgl', 'webgpu'].forEach(function (bk) {
        var r = g[ek + '_' + bk];
        if (r && (best === null || r.p95 < best)) best = r.p95;
      }); });
      engOrder.forEach(function (ek) {
        ['webgl', 'webgpu'].forEach(function (bk) {
          var r = g[ek + '_' + bk];
          if (!r) return;
          var isBest = r.p95 === best;
          html += '<tr style="border-top:1px solid #232a34' + (isBest ? ';background:#12281c' : '') + '">' +
            '<td style="padding:6px 8px">' + r.engineName + ' <span style="color:#8aa0b4">[' + bk + ']</span>' + (isBest ? ' 🏆' : '') + '</td>' +
            '<td style="text-align:center">' + r.p50 + '</td>' +
            '<td style="text-align:center;color:' + (isBest ? '#7fdc9a' : '#e6edf3') + ';font-weight:' + (isBest ? '700' : '400') + '">' + r.p95 + '</td>' +
            '<td style="text-align:center">' + r.p99 + '</td>' +
            '<td style="text-align:center">' + r.fps + '</td>' +
            '<td style="text-align:center">' + r.drawCallAvg + '</td>' +
            '<td style="text-align:center">' + r.overBudgetPct + '</td></tr>';
        });
      });
      html += '</table>';
    });
    html += '<p style="color:#6b7280;font-size:11.5px;margin-top:16px">说明：同一 variant+count 的多引擎横比；🏆=本组 p95 最优。' +
      '结果存在浏览器 localStorage（benchResults_v1），换浏览器/清缓存会丢，需要归档请复制 JSON。</p></div></div>';

    // 移除旧 overlay，直接注入
    var old = document.getElementById('cmpOverlay');
    if (old) old.remove();
    document.body.insertAdjacentHTML('beforeend', html);
    document.getElementById('cmpClose').onclick = function () {
      document.getElementById('cmpOverlay').remove();
    };
    document.getElementById('cmpCopy').onclick = function () {
      try {
        navigator.clipboard.writeText(JSON.stringify(loadResults(), null, 2));
        this.textContent = '已复制';
      } catch (e) { /* 忽略 */ }
    };
    document.getElementById('cmpClear').onclick = function () {
      if (confirm('清空全部历史结果？')) {
        localStorage.removeItem(STORE_KEY);
        document.getElementById('cmpOverlay').remove();
      }
    };
  }

  build();

  // dhxy：打开即自动进入场景（默认 WebGL + 10 个角色，HUD 上可固定采样 / 自动双后端）。
  // URL 带任意查询参数时视为手动模式（本面板可选引擎/后端），不自动接管。
  if (APP.scene === 'dhxy' && !location.search) {
    $('#status').textContent = '进入场景…';
    setTimeout(function () {
      location.replace('/egret-mc/index.html?scene=dhxy&backend=webgl');
    }, 300);
  }
})();
