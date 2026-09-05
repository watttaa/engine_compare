/** 帧时间分解：定位 WebGPU 臂 p95 尖刺来源。
 * 采样每帧 rAF 间隔 + render CPU + writeBuffer 字节数，对比 WebGL 臂，
 * 区分超时帧里「render CPU 爆 / render 外爆（提交/合成/GC）」。 */
const puppeteer = require('puppeteer-core');
const http = require('http');
const fs = require('fs');
const path = require('path');
const DIST = path.resolve(__dirname, 'web', 'dist');
const CHROME = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function sample(backend, count, seconds) {
  const port = 8782;
  const server = http.createServer((req, res) => {
    let f = path.join(DIST, decodeURIComponent(req.url.split('?')[0].replace(/^\//, '')));
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(DIST, 'egret-mc', 'index.html');
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png' };
    res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  await new Promise(r => server.listen(port, r));
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--enable-unsafe-webgpu', '--window-size=1280,720'] });
  const pg = await b.newPage();
  await pg.setViewport({ width: 1280, height: 720 });
  const ch = backend === 'webgpu' ? '&channel=instanced' : '';
  await pg.goto(`http://127.0.0.1:${port}/egret-mc/index.html?backend=${backend}${ch}&auto=1&count=${count}`, { waitUntil: 'domcontentloaded' });
  await pg.waitForFunction(() => window.__mcAdapter && window.__mcAdapter.isReady && window.__mcAdapter.isReady(), { timeout: 40000 });
  await new Promise(r => setTimeout(r, 6000));
  await pg.evaluate(() => {
    window.__ft = { last: performance.now(), render: 0, wbytes: 0, rows: [] };
    const SR = Object.getPrototypeOf(window.egret.sys.systemRenderer);
    const orender = SR.render;
    SR.render = function () {
      const t0 = performance.now();
      try { return orender.apply(this, arguments); }
      finally { window.__ft.render += performance.now() - t0; }
    };
    const r = window.__webgpu && window.__webgpu.renderer;
    const chn = r && r._spriteChannel;
    if (chn) {
      const ofl = chn.flush.bind(chn);
      chn.flush = function () {
        const wb0 = chn.writtenFloats;
        const fd0 = chn.frameDirty;
        const t0 = performance.now();
        try { return ofl(); }
        finally {
          window.__ft.wbytes = fd0 ? chn.usedSlots * 64 : 0; // 本帧实际计划上传字节
          window.__ft.flush = (window.__ft.flush || 0) + (performance.now() - t0);
        }
      };
    }
  });
  // 每 rAF 记一行：{dt, render, wb}
  await pg.evaluate((sec) => {
    const ft = window.__ft;
    let last = performance.now();
    let renderAcc = 0;
    const SR = Object.getPrototypeOf(window.egret.sys.systemRenderer);
    const orender = SR.render;
    SR.render = function () {
      const t0 = performance.now();
      try { return orender.apply(this, arguments); }
      finally { renderAcc += performance.now() - t0; }
    };
    ft.rows = [];
    ft._stop = false;
    function tick() {
      const now = performance.now();
      ft.rows.push([+(now - last).toFixed(2), +renderAcc.toFixed(2), ft.wbytes | 0]);
      renderAcc = 0;
      last = now;
      if (!ft._stop && ft.rows.length < sec * 60) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, seconds);
  await new Promise(r => setTimeout(r, (seconds + 1) * 1000));
  const out = await pg.evaluate(() => {
    const rows = window.__ft.rows.filter(r => r[0] < 200); // 去掉 tab 切换等离群
    const dts = rows.map(r => r[0]).sort((a, b) => a - b);
    const n = dts.length;
    const pct = p => dts[Math.min(n - 1, Math.floor(n * p))];
    // 超时帧分解：render 内 vs render 外
    let over = rows.filter(r => r[0] > 20);
    const renderBurst = over.filter(r => r[1] > r[0] * 0.6).length;
    const wbVals = [...new Set(rows.map(r => r[2]))].sort((a, b) => a - b);
    return {
      frames: n,
      dt_p50: pct(0.5), dt_p95: pct(0.95), dt_p99: pct(0.99),
      over20: over.length, over20_pct: +(over.length / n * 100).toFixed(1),
      over20_renderBurst: renderBurst, over20_other: over.length - renderBurst,
      over20_max: over.length ? Math.max(...over.map(r => r[0])) : 0,
      over20_renderMax: over.length ? Math.max(...over.map(r => r[1])) : 0,
      wbDistinct: wbVals.slice(0, 8),
      usedSlots: (() => { const c = window.__webgpu && window.__webgpu.renderer && window.__webgpu.renderer._spriteChannel; return c ? c.usedSlots : null; })(),
    };
  });
  await b.close();
  await new Promise(r => server.close(r));
  return out;
}

(async () => {
  const count = process.argv[2] || 2080;
  const sec = parseInt(process.argv[3] || '15', 10);
  console.log('=== WebGPU instanced @' + count + ' ===');
  console.log(JSON.stringify(await sample('webgpu', count, sec), null, 1));
  console.log('=== WebGL original @' + count + ' ===');
  console.log(JSON.stringify(await sample('webgl', count, sec), null, 1));
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
