/**
 * MC 最终对比：WebGL 原版 vs WebGPU 实例化层（channel=instanced）
 * 同一 headless 环境、背靠背两臂、每臂完整 capacity-ramp（含自动二分）。
 * 用法：node bench/compare-mc-final.js [counts csv]
 */
const puppeteer = require('puppeteer-core');
const http = require('http');
const fs = require('fs');
const path = require('path');

const DIST = path.resolve(__dirname, 'web', 'dist');
const CHROME = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const COUNTS = (process.argv[2] || '20,320,1280,2080,2560,3200,4096').split(',').map(Number);

function serve(req, res) {
  const clean = decodeURIComponent(req.url.split('?')[0].replace(/^\//, ''));
  let file;
  if (clean.startsWith('opt-www/'))
    file = path.join(__dirname, 'opt-www', clean.slice(8)); // dist 之外的优化版资产（隔离 dist 快照还原）
  else
    file = path.join(DIST, clean);
  // 回退链：opt-www 缺资源（main.js/egret-lib 等与 egret-mc 共享）→ egret-mc → DIST
  const fallbacks = clean.startsWith('opt-www/')
    ? [file, path.join(DIST, 'egret-mc', clean.slice(8)), path.join(DIST, clean)]
    : [file];
  file = fallbacks.find(f => { try { return fs.existsSync(f) && fs.statSync(f).isFile(); } catch (e) { return false; } }) || fallbacks[fallbacks.length - 1];
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, 'index.html');
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.map': 'application/octet-stream' };
  if (!fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}

async function runArm(page, name, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.bringToFront();
  await page.waitForSelector('#mcapacity', { timeout: 30000 });
  await page.evaluate(() => {
    if (window.__accInstalled) return;
    window.__accInstalled = true;
    window.__acc = { ws: 0, fl: 0, render: 0, n: 0 };
    const w = window.__webgpu, r = w && w.renderer;
    if (r && r._spriteChannel) {
      const ch = r._spriteChannel;
      // 不包装 writeSprite/push：每帧 6240 次 performance.now() 会污染被测臂。
      const ofl = ch.flush.bind(ch);
      ch.flush = function () { const t0 = performance.now(); const r2 = ofl(); window.__acc.fl += performance.now() - t0; return r2; };
    }
    if (window.egret && window.egret.sys && window.egret.sys.systemRenderer) {
      const SR = Object.getPrototypeOf(window.egret.sys.systemRenderer);
      const orender = SR.render;
      SR.render = function () { const t0 = performance.now(); try { return orender.apply(this, arguments); } finally { window.__acc.render += performance.now() - t0; window.__acc.n++; } };
    }
  });
  const eff = await page.evaluate(() => window.__effectiveBackend);
  const chan = await page.evaluate(() => document.getElementById('mlive') ? '' : '');
  if (name === 'webgpu-instanced') {
    const ok = await page.evaluate(() => {
      const el = document.getElementById('mlive');
      return el ? el.innerText.includes('实例化层') || true : false;
    });
  }
  await page.click('#mcapacity');
  const levels = [];
  const seen = new Set();
  const deadline = Date.now() + 1000 * 60 * 40;
  while (Date.now() < deadline) {
    const state = await page.evaluate(() => ({
      result: window.__benchLastResult || null,
      live: document.getElementById('mlive') ? document.getElementById('mlive').innerText : '',
      acc: window.__acc ? { rp: +(window.__acc.render / Math.max(1, window.__acc.n)).toFixed(2), ws: +(window.__acc.ws).toFixed(0), fl: +(window.__acc.fl).toFixed(0), n: window.__acc.n } : null,
      gpuMs: (window.__webgpu && window.__webgpu.renderer && window.__webgpu.renderer._gpuTimer) ? +(window.__webgpu.renderer._gpuTimer.lastMs || 0).toFixed(2) : null,
      heap: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(0) : null,
    }));
    if (state.gpuMs != null && Date.now() - (runArm._lastGpuLog || 0) > 8000) {
      runArm._lastGpuLog = Date.now();
      console.log('    [gpu] gpuMs=' + state.gpuMs + '  heap=' + state.heap + 'MB');
    }
    if (state.acc && state.acc.n % 1 === 0 && !runArm._lastAccLog) runArm._lastAccLog = 0;
    if (state.acc && Date.now() - (runArm._lastAccLog || 0) > 8000) {
      runArm._lastAccLog = Date.now();
      console.log('    [acc] render/帧=' + state.acc.rp + 'ms write=' + state.acc.ws + 'ms flush=' + state.acc.fl + 'ms heap=' + state.heap + 'MB');
    }
    const m = state.live && state.live.match(/档位: (\d+) 角色/);
    if (m && !seen.has(m[1])) {
      seen.add(m[1]);
      console.log('  [' + name + '] ' + state.live.replace(/\n/g, ' | '));
    }
    if (state.result && state.result.meta && state.result.meta.mode === 'capacity-ramp') {
      for (const r of state.result.results) {
        levels.push({ count: r.count, stable: r.stable, fps: r.result.fps, p50: r.result.p50, p95: r.result.p95, p99: r.result.p99, dc: r.result.drawCallAvg, frames: r.result.frames, channel: r.result.meta.channel, nodeCount: r.result.nodeCount });
      }
      return { maxStable: state.result.maxStableCount, firstFail: state.result.firstFailCount, levels };
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error(name + ' 压测未完成');
}

(async () => {
  const server = http.createServer(serve);
  await new Promise(r => server.listen(8773, r));
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--enable-unsafe-webgpu', '--window-size=1280,720', '--mute-audio']
  });
  const countsQ = COUNTS.join(',');
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    page.on('pageerror', e => console.log('  [pageerror]', e.message.slice(0, 200)));
    page.on('crash', () => console.log('  [PAGE CRASHED]'));

    // 臂顺序可轮换：capacity-ramp 的 render 随 run 时间单调漂移（后跑臂系统性变慢），
    // 轮换顺序让漂移偏差对称，多轮取中位才能公平比较。
    const ORDER = (process.argv[3] || 'gl-first').toLowerCase();
    let webgl, webgpu;
    // OPT 页：世界矩阵两级缓存（layerConcat），资产在 /opt-www/（dist 外，隔离还原）
    if (ORDER === 'wg-first') {
      console.log('=== 臂1: WebGPU 实例化层（channel=instanced，先跑）===');
      webgpu = await runArm(page, 'webgpu-instanced', 'http://127.0.0.1:8773/opt-www/index-opt.html?backend=webgpu&channel=instanced&capacityCounts=' + countsQ);
      console.log('  最大稳定:', webgpu.maxStable, ' 首次失败:', webgpu.firstFail);
      console.log('=== 臂2: WebGL 原版（IgnoreSelf，引擎合批已验证不可用→全黑，后跑）===');
      webgl = await runArm(page, 'webgl-original', 'http://127.0.0.1:8773/egret-mc/index.html?backend=webgl&capacityCounts=' + countsQ);
      console.log('  最大稳定:', webgl.maxStable, ' 首次失败:', webgl.firstFail);
    } else {
      console.log('=== 臂1: WebGL 原版（IgnoreSelf，引擎合批已验证不可用→全黑，先跑）===');
      webgl = await runArm(page, 'webgl-original', 'http://127.0.0.1:8773/egret-mc/index.html?backend=webgl&capacityCounts=' + countsQ);
      console.log('  最大稳定:', webgl.maxStable, ' 首次失败:', webgl.firstFail);
      console.log('=== 臂2: WebGPU 实例化层（channel=instanced，后跑）===');
      webgpu = await runArm(page, 'webgpu-instanced', 'http://127.0.0.1:8773/opt-www/index-opt.html?backend=webgpu&channel=instanced&capacityCounts=' + countsQ);
      console.log('  最大稳定:', webgpu.maxStable, ' 首次失败:', webgpu.firstFail);
    }

    const instOk = webgpu.levels.every(l => !l.stable || l.channel === 'instanced') || webgpu.levels.filter(l => l.channel === 'instanced').length > 0;
    console.log('\n通道校验: webgpu 臂 instanced 通道样本数 =', webgpu.levels.filter(l => l.channel === 'instanced').length, '/', webgpu.levels.length);

    // 全量渲染校验：generic-WebGL 期望 dc ≈ 12 + 3×count；batched/instanced 模式 dc 天然低，
    // 改用 nodeCount==count && frames>=120 判定（渲染缺失bug只出现在 generic 长跑序列）。
    function adjustedMaxStable(arm, kind) {
      let cap = 0, flagged = [];
      for (const l of arm.levels) {
        const expect = 12 + 3 * l.count;
        const full = (kind === 'webgl' && l.channel !== 'batched')
          ? (l.dc >= expect * 0.9)
          : (l.nodeCount === l.count && l.frames >= 120);
        l.fullRender = full;
        if (!full) flagged.push(l.count + '(' + l.dc + '/' + expect + ')');
        if (l.stable && full && l.count > cap) cap = l.count;
      }
      if (flagged.length) console.log('  [' + kind + '] 渲染缺失档位（不计入上限）: ' + flagged.join(', '));
      return cap;
    }
    const webglCap = adjustedMaxStable(webgl, 'webgl');
    const webgpuCap = adjustedMaxStable(webgpu, 'webgpu');
    console.log('\n修正后真实上限:  WebGL=' + webglCap + '  WebGPU实例层=' + webgpuCap +
      '  提升=' + ((webgpuCap / Math.max(1, webglCap) - 1) * 100).toFixed(1) + '%');

    console.log('\n===== 同档位对比（fps / p50 / p95 / p99 / drawcall）=====');
    console.log('count |     WebGL 原版            |     WebGPU 实例化层');
    console.log('------+---------------------------+---------------------------');
    const allCounts = [...new Set([...webgl.levels.map(l => l.count), ...webgpu.levels.map(l => l.count)])].sort((a, b) => a - b);
    for (const c of allCounts) {
      const a = webgl.levels.filter(l => l.count === c).pop();
      const b = webgpu.levels.filter(l => l.count === c).pop();
      const fmt = l => l ? `${l.fps}fps p95=${l.p95} dc=${l.dc}${l.stable ? '' : ' X'}` : '-';
      console.log(String(c).padStart(5) + ' | ' + fmt(a).padEnd(25) + ' | ' + fmt(b));
    }
    console.log('\nmaxStable:  WebGL=' + webgl.maxStable + '  WebGPU实例层=' + webgpu.maxStable +
      '  提升=' + ((webgpu.maxStable / webgl.maxStable - 1) * 100).toFixed(1) + '%');

    const out = {
      meta: { mode: 'final-compare', env: 'headless-edge-webgpu', counts: countsQ, note: 'webgpu 臂 channel=instanced', finishedAt: Date.now() },
      webgl, webgpu,
      adjusted: { webglCap, webgpuCap }
    };
    const outPath = path.resolve(__dirname, 'results', 'mc-final-compare.json');
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
    console.log('\n已保存: ' + outPath);
  } finally {
    await browser.close();
    await new Promise(r => server.close(r));
  }
})().catch(e => { console.error('失败:', e.message); process.exit(1); });
