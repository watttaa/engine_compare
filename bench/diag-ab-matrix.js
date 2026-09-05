/** 同页面 A/B：世界矩阵共享（shared） vs 逐层 concat（perLayer，旧行为）。
 * 每秒交替切换，各采 6 窗，比较 render/帧 中位数 —— 消除环境漂移/GPU 争用对单次测量的污染。 */
const puppeteer = require('puppeteer-core');
const http = require('http');
const fs = require('fs');
const path = require('path');
const DIST = path.resolve(__dirname, 'web', 'dist');
const CHROME = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
(async () => {
  const server = http.createServer((req, res) => {
    let f = path.join(DIST, decodeURIComponent(req.url.split('?')[0].replace(/^\//, '')));
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(DIST, 'egret-mc', 'index.html');
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png' };
    res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  await new Promise(r => server.listen(8781, r));
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--enable-unsafe-webgpu', '--window-size=1280,720'] });
  const pg = await b.newPage();
  await pg.setViewport({ width: 1280, height: 720 });
  const count = process.argv[2] || 2080;
  await pg.goto(`http://127.0.0.1:8781/egret-mc/index.html?backend=webgpu&channel=instanced&auto=1&count=${count}`, { waitUntil: 'domcontentloaded' });
  await pg.waitForFunction(() => window.__mcAdapter && window.__mcAdapter.isReady && window.__mcAdapter.isReady(), { timeout: 40000 });
  await new Promise(r => setTimeout(r, 6000));
  const errs = [];
  pg.on('pageerror', e => errs.push('pageerror: ' + e.message));
  pg.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  // 注入：render 计时 + _lmSame 开关（false = 每层独立 concat+compose，即旧行为）
  await pg.evaluate(() => {
    window.__ab = { mode: 'shared', samples: { shared: [], perLayer: [] } };
    const SR = Object.getPrototypeOf(window.egret.sys.systemRenderer);
    const orender = SR.render;
    SR.render = function () {
      const t0 = performance.now();
      try { return orender.apply(this, arguments); }
      finally { window.__ab.samples[window.__ab.mode].push(performance.now() - t0); }
    };
    const proto = SR; // systemRenderer 实例的原型即 WebGPUSystemRenderer.prototype
    const oSame = proto._lmSame;
    proto._lmSame = function (lm, ref) {
      return window.__ab.mode === 'shared' ? oSame.call(this, lm, ref) : false;
    };
  });
  // 12 窗交替，每窗 2s，首窗丢弃预热
  for (let i = 0; i < 12; i++) {
    const mode = i % 2 === 0 ? 'shared' : 'perLayer';
    await pg.evaluate(m => { window.__ab.mode = m; }, mode);
    await new Promise(r => setTimeout(r, 2000));
  }
  const out = await pg.evaluate(() => {
    const trim = a => a.slice(Math.floor(a.length / 4));
    const med = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return +s[Math.floor(s.length / 2)].toFixed(2); };
    const p95 = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return +s[Math.min(s.length - 1, Math.floor(s.length * 0.95))].toFixed(2); };
    // 各丢前 25%（模式切换边界的过渡样本）
    const s = { shared: trim(window.__ab.samples.shared), perLayer: trim(window.__ab.samples.perLayer) };
    return {
      count: window.__mcAdapter ? window.__mcAdapter.nodes.length : null,
      shared: { n: s.shared.length, med: med(s.shared), p95: p95(s.shared) },
      perLayer: { n: s.perLayer.length, med: med(s.perLayer), p95: p95(s.perLayer) },
      speedup: med(s.shared) && med(s.perLayer) ? +(med(s.perLayer) / med(s.shared)).toFixed(2) : null,
      usedSlots: (() => { const ch = window.__webgpu.renderer._spriteChannel; return ch ? ch.usedSlots : null; })(),
    };
  });
  out.errs = errs.slice(0, 6);
  console.log(JSON.stringify(out, null, 1));
  await b.close();
  await new Promise(r => server.close(r));
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
