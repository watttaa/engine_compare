/** 存活堆剖析：`--expose-gc` 下每帧强制 GC 后采样 usedJSHeapSize，
 *  测"V8 无法回收的每帧存活对象增长"（真泄漏 / 生成时代提升），而非瞬时峰值。
 *  对比 instanced / generic 通道，判断 P2R 是否存在每帧 JS 分配问题。
 *  用法：node bench/diag-heap.js [count=2080] [frames=240]
 */
const puppeteer = require('puppeteer-core');
const http = require('http');
const fs = require('fs');
const path = require('path');
const DIST = path.resolve(__dirname, 'web', 'dist');
const CHROME = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const COUNT = parseInt(process.argv[2] || '2080', 10);
const FRAMES = parseInt(process.argv[3] || '240', 10);

async function profile(channel) {
  const server = http.createServer((req, res) => {
    let f = path.join(DIST, decodeURIComponent(req.url.split('?')[0].replace(/^\//, '')));
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(DIST, 'egret-mc', 'index.html');
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.json': 'application/json' };
    res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  await new Promise(r => server.listen(8781, r));
  const b = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--no-sandbox', '--enable-unsafe-webgpu', '--window-size=1280,720', '--js-flags=--expose-gc'],
  });
  const pg = await b.newPage();
  await pg.setViewport({ width: 1280, height: 720 });
  const url = `http://127.0.0.1:8781/egret-mc/index.html?backend=webgpu&channel=${channel}&auto=1&count=50`;
  await pg.goto(url, { waitUntil: 'domcontentloaded' });
  await pg.waitForFunction(() => window.__mcAdapter && window.__mcAdapter.isReady && window.__mcAdapter.isReady(), { timeout: 90000 });
  await pg.evaluate((n) => { window.__mcAdapter.setCount(n); }, COUNT);
  await pg.waitForFunction(() => window.__mcAdapter.isReady(), { timeout: 90000 });
  await new Promise(r => setTimeout(r, 4000));
  const rows = await pg.evaluate((frames) => new Promise(resolve => {
    const out = [];
    let i = 0;
    function tick() {
      if (window.gc) { window.gc(); window.gc(); }
      out.push([i, +(performance.memory.usedJSHeapSize / 1048576).toFixed(1)]);
      i++;
      if (i >= frames) resolve(out);
      else requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }), FRAMES);
  await b.close();
  await new Promise(r => server.close(r));
  return rows;
}

// 线性斜率：取第一半与后半的中值差 / 半程帧数
function slope(rows) {
  const half = Math.floor(rows.length / 2);
  const med = (arr) => { const s = arr.slice().sort((a, b) => a[1] - b[1]); return s[Math.floor(s.length / 2)][1]; };
  const a = med(rows.slice(0, half));
  const c = med(rows.slice(half));
  return { startKB: a.toFixed(0), endKB: c.toFixed(0), perFrameMB: ((c - a) / half).toFixed(4) };
}

(async () => {
  for (const ch of ['instanced', 'generic']) {
    console.log('=== channel=' + ch + ' @ ' + COUNT + ' ===');
    const rows = await profile(ch);
    console.log('首采样每10帧:', rows.filter((r, i) => i % 20 === 0).map(r => r[1]).join(' '));
    const s = slope(rows);
    console.log('半程起点=' + s.startKB + 'MB 终点=' + s.endKB + 'MB 每帧存活增长=' + s.perFrameMB + 'MB => 每60帧=' + (parseFloat(s.perFrameMB) * 60).toFixed(1) + 'MB');
  }
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
