/**
 * WebGPU MC 场景诊断：读渲染器实际 drawCalls / gpuMs
 * 用法：node bench/diag-mc-webgpu.js [count]
 */
const puppeteer = require('puppeteer-core');
const http = require('http');
const fs = require('fs');
const path = require('path');

const DIST = path.resolve(__dirname, 'web', 'dist');
const CHROME = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const COUNT = process.argv[2] || '2080';

function serve(req, res) {
  let file = path.join(DIST, decodeURIComponent(req.url.split('?')[0].replace(/^\//, '')));
  if (file.endsWith('/') || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, 'index.html');
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json' };
  if (!fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}

(async () => {
  const server = http.createServer(serve);
  await new Promise(r => server.listen(8771, r));
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--enable-unsafe-webgpu', '--window-size=1280,720', '--mute-audio'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  try {
    await page.goto('http://127.0.0.1:8771/egret-mc/index.html?backend=webgpu&auto=1&count=' + COUNT, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__benchLastResult, { timeout: 60000 });
    await new Promise(r => setTimeout(r, 3000));
    const diag = await page.evaluate(() => {
      const w = window.__webgpu;
      const out = { effectiveBackend: window.__effectiveBackend };
      if (w && w.renderer) {
        const r = w.renderer;
        out.rendererKeys = Object.keys(r).filter(k => k.indexOf('raw') < 0).slice(0, 40);
        out.lastDrawCalls = r._lastDrawCalls;
        out.lastBatchCount = r._lastBatchCount;
        out.multiTex = r._multiTex;
        out.texSlots = r._texSlots;
        if (r._batch) { out.batchDrawCalls = r._batch.drawCalls; out.maxQuads = r._batch._maxVerts / 4; }
        if (r._gpuTimer) out.gpuMs = r._gpuTimer.lastMs;
      }
      const res = window.__benchLastResult;
      out.fps = res.fps; out.p95 = res.p95; out.nodeCount = res.nodeCount;
      return out;
    });
    console.log(JSON.stringify(diag, null, 2));
  } finally {
    await browser.close();
    await new Promise(r => server.close(r));
  }
})().catch(e => { console.error('失败:', e.message); process.exit(1); });
