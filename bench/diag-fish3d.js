// [DIAG-fish3d] 无头诊断：验证 customPipeline=false（内置 forward 管线）下
//   1) 场景是否正常渲染（非黑屏）—— 决定 effect.bin 是否与管线绑定
//   2) WebGPU 臂是否仍报 "uniform buffers (18) exceeds ... (12)"
// 用法: node bench/diag-fish3d.js <arm>   arm = cocos3d | cocos3d-webgl
const puppeteer = require('puppeteer-core');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ARM = process.argv[2] || 'cocos3d-webgl';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DIST = path.resolve('bench/web/dist');
const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.json':'application/json','.wasm':'application/wasm','.bin':'application/octet-stream','.atlas':'text/plain','.txt':'text/plain' };

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
  await new Promise(r => srv.listen(8833, r));

  const b = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox','--window-size=1280,720','--enable-unsafe-webgpu',
      '--ignore-gpu-blocklist','--enable-gpu']
  });
  const p = await b.newPage();
  await p.setViewport({ width: 1280, height: 720 });
  const logs = [];
  p.on('console', m => logs.push('[' + m.type() + '] ' + m.text()));
  p.on('pageerror', e => logs.push('[pageerror] ' + e.message));
  p.on('response', r => { if (r.status() >= 400) logs.push('[http ' + r.status() + '] ' + r.url()); });
  p.on('requestfailed', r => logs.push('[requestfailed] ' + r.url() + ' ' + (r.failure() && r.failure().errorText)));

  const url = 'http://127.0.0.1:8833/' + ARM + '/index.html';
  console.log('== 打开 ' + url + ' ==');
  await p.goto(url, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 9000));

  // 读取运行时全局 + canvas 像素非黑占比
  const info = await p.evaluate(() => {
    const out = { real: window.__fb3RealBackend, api: window.__fb3GfxAPI, adapter: window.__fb3Adapter };
    const cv = document.querySelector('canvas');
    if (cv) {
      out.cw = cv.width; out.ch = cv.height;
      try {
        // 用 2D 抽样：把 webgl/webgpu canvas 画到离屏 2D，统计非黑像素
        const oc = document.createElement('canvas'); oc.width = 64; oc.height = 36;
        const ctx = oc.getContext('2d'); ctx.drawImage(cv, 0, 0, 64, 36);
        const d = ctx.getImageData(0, 0, 64, 36).data; let nz = 0, tot = 64*36;
        for (let i = 0; i < d.length; i += 4) { if (d[i] > 12 || d[i+1] > 12 || d[i+2] > 12) nz++; }
        out.nonBlackRatio = +(nz / tot).toFixed(3);
      } catch (e) { out.pxErr = e.message; }
    } else out.noCanvas = true;
    return out;
  });

  await p.screenshot({ path: 'bench/results/fish3d-' + ARM + '.png' });
  const sz = fs.statSync('bench/results/fish3d-' + ARM + '.png').size;

  console.log('--- 运行时信息 ---');
  console.log(JSON.stringify(info));
  console.log('截图字节: ' + sz);
  console.log('--- 关键 console（backend/UBO/error）---');
  for (const l of logs) {
    if (/Bench3D|uniform buffer|exceeds|error|Error|WebGPU|webgpu|pipeline|black/i.test(l)) console.log(l);
  }
  console.log('--- 全部 console ---');
  logs.forEach(l => console.log(l));
  await b.close(); srv.close(); process.exit(0);
})().catch(e => { console.error('TOP', e); process.exit(1); });
