/** HUD 观测增强验证：点击承载力压测，抓 mlive 各阶段文本，
 *  确认 (1) 采样中实时行出现 (2) done 行含 fps 与超标原因。 */
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
  await new Promise(r => server.listen(8786, r));
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--enable-unsafe-webgpu', '--window-size=1280,720'] });
  const pg = await b.newPage();
  await pg.setViewport({ width: 1280, height: 720 });
  await pg.goto('http://127.0.0.1:8786/opt-www/index-opt.html?backend=webgpu&channel=instanced', { waitUntil: 'domcontentloaded' });
  await pg.waitForSelector('#mcapacity', { timeout: 40000 });
  await new Promise(r => setTimeout(r, 8000)); // 等地图/资源
  await pg.click('#mcapacity');
  const snaps = [];
  for (let i = 0; i < 26; i++) {
    const t = await pg.evaluate(() => document.getElementById('mlive').textContent);
    snaps.push(t);
    const done = /最大稳定|已中止/.test(t);
    if (done && i > 3) break;
    await new Promise(r => setTimeout(r, 1500));
  }
  const realTimeRows = snaps.filter(s => s.includes('[实时]')).length;
  const reasonRows = snaps.filter(s => /不稳定（|✅ 稳定/.test(s)).length;
  console.log(JSON.stringify({
    snaps: snaps.length,
    realTimeRows,
    reasonRows,
    firstRealTime: snaps.find(s => s.includes('[实时]')) || null,
    firstDone: snaps.find(s => /✅ 稳定|❌ 不稳定/.test(s)) || null,
    last: snaps[snaps.length - 1],
  }, null, 1));
  await b.close();
  await new Promise(r => server.close(r));
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
