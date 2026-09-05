/**
 * 冒烟：Egret 自动双后端（重构到 mc-compare.js 后）
 * 快档 capacityCounts=20 跑完 webgl 臂 → 跳 opt-www webgpu 臂 → 汇总 auto-backend-compare。
 * 用法：node bench/smoke-mc-compare.js
 */
const puppeteer = require('puppeteer-core');
const http = require('http');
const fs = require('fs');
const path = require('path');

const DIST = path.resolve(__dirname, 'web', 'dist');
const OPT = path.resolve(__dirname, 'opt-www');
const CHROME = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 8774;

function serve(req, res) {
  const clean = decodeURIComponent(req.url.split('?')[0].replace(/^\//, ''));
  let file;
  if (clean.startsWith('opt-www/')) file = path.join(OPT, clean.slice(8));
  else file = path.join(DIST, clean);
  const fallbacks = clean.startsWith('opt-www/')
    ? [file, path.join(DIST, 'egret-mc', clean.slice(8)), path.join(DIST, clean)]
    : [file];
  file = fallbacks.find(f => { try { return fs.existsSync(f) && fs.statSync(f).isFile(); } catch (e) { return false; } }) || fallbacks[fallbacks.length - 1];
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, 'index.html');
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.atlas': 'text/plain', '.txt': 'text/plain', '.map': 'application/octet-stream' };
  if (!fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}

(async () => {
  const srv = http.createServer(serve).listen(PORT);
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--disable-vulkan-surface', '--no-sandbox', '--window-size=1300,800']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1300, height: 800 });
  page.on('pageerror', e => console.log('[pageerror]', String(e).slice(0, 200)));
  const start = 'http://127.0.0.1:' + PORT + '/egret-mc/index.html?backend=webgl&capacityCounts=20&autoCompare=webgl';
  console.log('打开:', start);
  await page.goto(start, { waitUntil: 'domcontentloaded' });
  const t0 = Date.now();
  let lastUrl = '';
  while (Date.now() - t0 < 200000) {
    const st = await page.evaluate(() => {
      const r = window.__benchLastResult;
      return {
        url: location.pathname,
        mode: r && r.meta && r.meta.mode,
        webgl: r && r.webgl ? r.webgl.maxStableCount : null,
        webgpu: r && r.webgpu ? r.webgpu.maxStableCount : null,
        live: document.getElementById('mlive') ? document.getElementById('mlive').innerText.split('\n')[0] : ''
      };
    }).catch(() => null);
    if (st) {
      if (st.url !== lastUrl) { console.log('  → 页面:', st.url); lastUrl = st.url; }
      if (st.mode === 'auto-backend-compare') {
        console.log('\n== 冒烟通过 ==');
        console.log('webgl.maxStable:', st.webgl, ' webgpu.maxStable:', st.webgpu, ' 提升:', (st.webgpu / st.webgl).toFixed(2) + 'x');
        break;
      }
    }
    await new Promise(r => setTimeout(r, 1500));
  }
  if ((await page.evaluate(() => window.__benchLastResult && window.__benchLastResult.meta.mode)) !== 'auto-backend-compare') {
    console.log('!! 超时未出对比结果');
    process.exitCode = 1;
  }
  await browser.close();
  srv.close();
})();
