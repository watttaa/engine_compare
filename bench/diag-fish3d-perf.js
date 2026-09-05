// [DIAG-fish3dperf] 无头性能反馈环：逐档固定鱼数，rAF 自测 fps + 读 drawCall
// 目的：分离"固定基线开销"(count=0) 与"每鱼扩展开销"，定位性能回归根因
// 用法: node bench/diag-fish3d-perf.js <arm>   arm = cocos3d-webgl | cocos3d
const puppeteer = require('puppeteer-core');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ARM = process.argv[2] || 'cocos3d-webgl';
const COUNTS = (process.argv[3] || '800,1600,3200,4000').split(',').map(Number);
const REPEATS = Math.max(1, parseInt(process.argv[4] || '3', 10));
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DIST = path.resolve('bench/web/dist');
const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.json':'application/json','.wasm':'application/wasm','.bin':'application/octet-stream','.atlas':'text/plain','.txt':'text/plain' };

async function measure(page) {
  return await page.evaluate(() => new Promise((resolve) => {
    const P = window.__ccGlProbe;
    const startDraw = P ? P.drawTotal : 0;
    const startFrame = P ? P.frameTotal : 0;
    let raf = 0;
    const t0 = performance.now();
    function loop() {
      raf++;
      const dt = performance.now() - t0;
      if (dt < 2000) { requestAnimationFrame(loop); return; }
      const fps = raf / (dt / 1000);
      const df = P ? (P.frameTotal - startFrame) : 0;
      const dd = P ? (P.drawTotal - startDraw) : 0;
      resolve({
        fps: +fps.toFixed(1),
        dcPerFrame: df > 0 ? +(dd / df).toFixed(1) : -1,
        simMs: +(window.__fb3SimMs || 0).toFixed(2),
        fishN: window.__fb3FishN || 0,
      });
    }
    requestAnimationFrame(loop);
  }));
}

(async () => {
  const srv = http.createServer((req, res) => {
    let url = decodeURIComponent(req.url.split('?')[0]);
    if (url === '/') url = '/index.html';
    let p = path.join(DIST, url);
    if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { const idx = path.join(p, 'index.html'); if (fs.existsSync(idx)) p = idx; }
    if (!fs.existsSync(p)) { res.writeHead(404); res.end('404'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p).toLowerCase()] || 'application/octet-stream', 'Cache-Control':'no-store',
      'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'require-corp' });
    fs.createReadStream(p).pipe(res);
  });
  await new Promise(r => srv.listen(8834, r));

  const b = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--no-sandbox','--window-size=1280,720','--enable-unsafe-webgpu',
      '--ignore-gpu-blocklist','--enable-gpu',
      '--disable-frame-rate-limit','--disable-gpu-vsync']
  });
  const p = await b.newPage();
  const logs = [];
  p.on('console', m => logs.push('[' + m.type() + '] ' + m.text()));
  p.on('pageerror', e => logs.push('[pageerror] ' + e.message));
  await p.setViewport({ width: 1280, height: 720 });

  console.log('== ' + ARM + ' 性能扫描（每档 ' + REPEATS + ' 轮）==');
  console.log('count\tround\tfps\tdc/frame\tsimMs(CPU)\tfishN');
  for (const c of COUNTS) {
    for (let round = 1; round <= REPEATS; round++) {
      const url = 'http://127.0.0.1:8834/' + ARM + '/index.html?auto=1&mode=fixed&count=' + c;
      console.log('start\t' + c + '\t' + round);
      await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      console.log('loaded\t' + c + '\t' + round);
      try {
        await p.waitForFunction((expected) => window.__fb3FishN === expected, { timeout: 30000 }, c);
      } catch (e) {
        const state = await p.evaluate(() => ({
          backend: window.__fb3RealBackend,
          gfxAPI: window.__fb3GfxAPI,
          fishN: window.__fb3FishN,
          readyState: document.readyState,
        }));
        console.error('not-ready\t' + JSON.stringify(state));
        logs.forEach(l => { if (/FishBench3D|error|Error|WebGPU|webgpu|pipeline|uniform/i.test(l)) console.error(l); });
        throw e;
      }
      console.log('ready\t' + c + '\t' + round);
      await new Promise(r => setTimeout(r, 3000)); // 资源、实例队列与 GPU buffer 稳定后再计时
      const m = await measure(p);
      console.log(c + '\t' + round + '\t' + m.fps + '\t' + m.dcPerFrame + '\t' + m.simMs + '\t' + m.fishN);
    }
  }
  await b.close(); srv.close(); process.exit(0);
})().catch(e => { console.error('TOP', e); process.exit(1); });
