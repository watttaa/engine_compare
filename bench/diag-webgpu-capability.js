/** 验证 headless 浏览器的 WebGPU 能力与适配器身份 */
const puppeteer = require('puppeteer-core');
const http = require('http');
const fs = require('fs');
const path = require('path');
const DIST = path.resolve(__dirname, 'web', 'dist');
const CHROME = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

function serve(req, res) {
  let file = path.join(DIST, decodeURIComponent(req.url.split('?')[0].replace(/^\//, '')));
  if (file.endsWith('/') || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, 'index.html');
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg' };
  if (!fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}

(async () => {
  const server = http.createServer(serve);
  await new Promise(r => server.listen(8774, r));
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--enable-unsafe-webgpu', '--window-size=1280,720'] });
  const page = await browser.newPage();
  try {
    await page.goto('http://127.0.0.1:8774/egret-mc/index.html?backend=webgpu&channel=instanced&auto=1&count=5', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__effectiveBackend, { timeout: 15000 });
    await new Promise(r => setTimeout(r, 6000));
    const info = await page.evaluate(async () => {
      const out = { effectiveBackend: window.__effectiveBackend };
      out.navGpu = 'gpu' in navigator;
      if (navigator.gpu) {
        const ad = await navigator.gpu.requestAdapter();
        out.adapterFound = !!ad;
        if (ad) {
          out.isFallbackAdapter = ad.isFallbackAdapter;
          if (ad.info) out.adapterInfo = { vendor: ad.info.vendor, architecture: ad.info.architecture, description: ad.info.description };
          out.features = [...ad.features].slice(0, 10);
        }
      }
      const w = window.__webgpu, r = w && w.renderer;
      out.rendererReady = !!r;
      if (r) {
        out.texSlots = r._texSlots;
        out.lastDrawCalls = r._lastDrawCalls;
        out.lastInstanceBatchCount = r._lastInstanceBatchCount;
      }
      return out;
    });
    console.log(JSON.stringify(info, null, 2));
  } finally {
    await browser.close();
    await new Promise(r => server.close(r));
  }
})().catch(e => { console.error('失败:', e.message); process.exit(1); });
