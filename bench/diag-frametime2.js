/** 帧时间分解 v2：每帧记录 [dt, render, flush]。
 * 判定 WebGPU 臂超时帧是否由 channel.flush（writeBuffer→Dawn staging）引起。 */
const puppeteer = require('puppeteer-core');
const http = require('http');
const fs = require('fs');
const path = require('path');
const DIST = path.resolve(__dirname, 'web', 'dist');
const CHROME = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function sample(backend, count, seconds) {
  const server = http.createServer((req, res) => {
    let f = path.join(DIST, decodeURIComponent(req.url.split('?')[0].replace(/^\//, '')));
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(DIST, 'egret-mc', 'index.html');
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png' };
    res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  await new Promise(r => server.listen(8783, r));
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--enable-unsafe-webgpu', '--window-size=1280,720'] });
  const pg = await b.newPage();
  await pg.setViewport({ width: 1280, height: 720 });
  const ch = backend === 'webgpu' ? '&channel=instanced' : '';
  await pg.goto(`http://127.0.0.1:8783/egret-mc/index.html?backend=${backend}${ch}&auto=1&count=${count}`, { waitUntil: 'domcontentloaded' });
  await pg.waitForFunction(() => window.__mcAdapter && window.__mcAdapter.isReady && window.__mcAdapter.isReady(), { timeout: 40000 });
  await new Promise(r => setTimeout(r, 6000));
  await pg.evaluate((sec) => {
    const rows = [];
    let last = performance.now();
    let renderAcc = 0;
    let flushAcc = 0;
    const SR = Object.getPrototypeOf(window.egret.sys.systemRenderer);
    const orender = SR.render;
    SR.render = function () {
      const t0 = performance.now();
      try { return orender.apply(this, arguments); }
      finally { renderAcc += performance.now() - t0; }
    };
    const r = window.__webgpu && window.__webgpu.renderer;
    const chn = r && r._spriteChannel;
    if (chn) {
      const ofl = chn.flush.bind(chn);
      chn.flush = function () {
        const t0 = performance.now();
        try { return ofl(); }
        finally { flushAcc += performance.now() - t0; }
      };
    }
    function tick() {
      const now = performance.now();
      rows.push([+(now - last).toFixed(2), +renderAcc.toFixed(2), +flushAcc.toFixed(2)]);
      renderAcc = 0; flushAcc = 0; last = now;
      if (rows.length < sec * 60) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    window.__rows = rows;
  }, seconds);
  await new Promise(r => setTimeout(r, (seconds + 1) * 1000));
  const out = await pg.evaluate(() => {
    const rows = window.__rows.filter(r => r[0] < 200);
    const dts = rows.map(r => r[0]).sort((a, b) => a - b);
    const pct = p => +dts[Math.min(dts.length - 1, Math.floor(dts.length * p))].toFixed(2);
    const over = rows.filter(r => r[0] > 20);
    const flushHeavy = over.filter(r => r[2] > r[0] * 0.5).length;
    const renderHeavy = over.filter(r => r[1] > r[0] * 0.5).length;
    const flushes = rows.map(r => r[2]).sort((a, b) => a - b);
    const fN = flushes.length;
    const fpct = p => +flushes[Math.min(fN - 1, Math.floor(fN * p))].toFixed(2);
    return {
      frames: rows.length,
      dt: { p50: pct(0.5), p95: pct(0.95), p99: pct(0.99), max: dts[dts.length - 1] },
      over20: { n: over.length, pct: +(over.length / rows.length * 100).toFixed(1), flushHeavy, renderHeavy, other: over.length - flushHeavy - renderHeavy },
      flush: { p50: fpct(0.5), p95: fpct(0.95), p99: fpct(0.99), max: flushes[fN - 1] },
    };
  });
  await b.close();
  await new Promise(r => server.close(r));
  return out;
}

(async () => {
  const count = process.argv[2] || 2080;
  const sec = parseInt(process.argv[3] || '12', 10);
  console.log('=== WebGPU instanced @' + count + ' ===');
  console.log(JSON.stringify(await sample('webgpu', count, sec), null, 1));
  console.log('=== WebGL original @' + count + ' ===');
  console.log(JSON.stringify(await sample('webgl', count, sec), null, 1));
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
