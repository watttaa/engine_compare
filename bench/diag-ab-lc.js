/** 同页 A/B v2：layerConcat 两级缓存 vs 逐对象 concat（原始行为）。
 * 切 renderer._useLayerConcat，每 2s 交替，各 6 窗，render/帧中位数对比。 */
const puppeteer = require('puppeteer-core');
const http = require('http');
const fs = require('fs');
const path = require('path');
const DIST = path.resolve(__dirname, 'web', 'dist');
const CHROME = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
(async () => {
  const server = http.createServer((req, res) => {
    const clean = decodeURIComponent(req.url.split('?')[0].replace(/^\//, ''));
    let f = clean.startsWith('opt-www/')
      ? path.join(__dirname, 'opt-www', clean.slice(8))
      : path.join(DIST, clean);
    if (clean.startsWith('opt-www/')) {
      const cands = [f, path.join(DIST, 'egret-mc', clean.slice(8)), path.join(DIST, clean)];
      f = cands.find(c => { try { return fs.existsSync(c) && fs.statSync(c).isFile(); } catch (e) { return false; } }) || cands[cands.length - 1];
    }
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(DIST, 'egret-mc', 'index.html');
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png' };
    res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  await new Promise(r => server.listen(8785, r));
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--enable-unsafe-webgpu', '--window-size=1280,720'] });
  const pg = await b.newPage();
  await pg.setViewport({ width: 1280, height: 720 });
  const count = process.argv[2] || 2080;
  await pg.goto(`http://127.0.0.1:8785/opt-www/index-opt.html?backend=webgpu&channel=instanced&auto=1&count=${count}`, { waitUntil: 'domcontentloaded' });
  await pg.waitForFunction(() => window.__mcAdapter && window.__mcAdapter.isReady && window.__mcAdapter.isReady(), { timeout: 40000 });
  await new Promise(r => setTimeout(r, 6000));
  const errs = [];
  pg.on('pageerror', e => errs.push('pageerror: ' + e.message));
  pg.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await pg.evaluate(() => {
    window.__ab = { mode: 'lc', samples: { lc: [], perDp: [] } };
    const SR = Object.getPrototypeOf(window.egret.sys.systemRenderer);
    const orender = SR.render;
    SR.render = function () {
      const t0 = performance.now();
      try { return orender.apply(this, arguments); }
      finally { window.__ab.samples[window.__ab.mode].push(performance.now() - t0); }
    };
  });
  for (let i = 0; i < 12; i++) {
    const mode = i % 2 === 0 ? 'lc' : 'perDp';
    await pg.evaluate(m => { window.__ab.mode = m; window.__webgpu.renderer._useLayerConcat = (m === 'lc'); }, mode);
    await new Promise(r => setTimeout(r, 2000));
  }
  const out = await pg.evaluate(() => {
    const trim = a => a.slice(Math.floor(a.length / 4));
    const med = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return +s[Math.floor(s.length / 2)].toFixed(2); };
    const p95 = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return +s[Math.min(s.length - 1, Math.floor(s.length * 0.95))].toFixed(2); };
    const s = { lc: trim(window.__ab.samples.lc), perDp: trim(window.__ab.samples.perDp) };
    return {
      count: window.__mcAdapter ? window.__mcAdapter.nodes.length : null,
      lc: { n: s.lc.length, med: med(s.lc), p95: p95(s.lc) },
      perDp: { n: s.perDp.length, med: med(s.perDp), p95: p95(s.perDp) },
      speedup: med(s.lc) && med(s.perDp) ? +(med(s.perDp) / med(s.lc)).toFixed(2) : null,
      usedSlots: (() => { const ch = window.__webgpu.renderer._spriteChannel; return ch ? ch.usedSlots : null; })(),
    };
  });
  out.errs = errs.slice(0, 6);
  console.log(JSON.stringify(out, null, 1));
  await b.close();
  await new Promise(r => server.close(r));
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
