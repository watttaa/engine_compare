const puppeteer = require('puppeteer-core');
const http = require('http');
const fs = require('fs');
const path = require('path');
(async () => {
  const DIST = path.resolve('bench/web/dist');
  const srv = http.createServer((q, r) => {
    let p = path.join(DIST, decodeURIComponent(q.url.split('?')[0].replace(/^\//, '')));
    if (p.endsWith('/') || !fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(DIST, 'index.html');
    const m = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' };
    if (!fs.existsSync(p)) { r.writeHead(404); r.end(); return; }
    r.writeHead(200, { 'Content-Type': m[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(r);
  });
  await new Promise(r => srv.listen(8832, r));
  const b = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: 'new', args: ['--no-sandbox', '--window-size=1280,720'] });
  const p = await b.newPage();
  await p.setViewport({ width: 1280, height: 720 });
  await p.goto('http://127.0.0.1:8832/egret/index.html?backend=webgl&auto=1&variant=boids&count=500', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 12000));
  await p.screenshot({ path: 'bench/results/boids-shot.png' });
  const sz = fs.statSync('bench/results/boids-shot.png').size;
  console.log('截图大小: ' + sz + ' 字节 (500 鱼应 >200KB)');
  await b.close(); srv.close(); process.exit(0);
})().catch(e => { console.error('TOP', e); process.exit(1); });
