/**
 * MC 场景双后端承载力对比：WebGL vs 自研 WebGPU
 * 用法：node bench/compare-mc-backends.js [counts csv]
 * 输出：逐档 fps / p95 / drawcall 对比表
 */
const puppeteer = require('puppeteer-core');
const http = require('http');
const fs = require('fs');
const path = require('path');

const DIST = path.resolve(__dirname, 'web', 'dist');
const CHROME = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const COUNTS = (process.argv[2] || '20,80,320,1280,2560,5120').split(',').map(Number);

function serve(req, res) {
  let file = path.join(DIST, decodeURIComponent(req.url.split('?')[0].replace(/^\//, '')));
  if (file.endsWith('/') || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, 'index.html');
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.map': 'application/octet-stream' };
  if (!fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}

async function runBackend(page, backend) {
  await page.goto('http://127.0.0.1:8771/egret-mc/index.html?backend=' + backend + '&capacityCounts=' + COUNTS.join(','), { waitUntil: 'domcontentloaded' });
  await page.bringToFront();
  await page.waitForSelector('#mcapacity', { timeout: 30000 });
  const eff = await page.evaluate(() => window.__effectiveBackend);
  if (eff !== backend) throw new Error(backend + ' 后端未生效，实际=' + eff);

  await page.click('#mcapacity');
  const levels = [];
  const seen = new Set();
  const deadline = Date.now() + 1000 * 60 * 30;
  while (Date.now() < deadline) {
    const state = await page.evaluate(() => ({
      result: window.__benchLastResult || null,
      live: document.getElementById('mlive') ? document.getElementById('mlive').innerText : '',
      hidden: document.hidden
    }));
    if (state.hidden) console.log('  [warn] 页面进入后台！');
    const m = state.live && state.live.match(/档位: (\d+) 角色/);
    if (m && !seen.has(m[1])) {
      seen.add(m[1]);
      console.log('  [' + backend + '] ' + state.live.replace(/\n/g, ' | '));
    }
    if (state.result && state.result.meta && state.result.meta.mode === 'capacity-ramp') {
      for (const r of state.result.results) {
        levels.push({ count: r.count, stable: r.stable, fps: r.result.fps, p95: r.result.p95, dc: r.result.drawCallAvg, frames: r.result.frames });
      }
      return { maxStable: state.result.maxStableCount, firstFail: state.result.firstFailCount, levels };
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error(backend + ' 压测未完成');
}

(async () => {
  const server = http.createServer(serve);
  await new Promise(r => server.listen(8771, r));
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--enable-unsafe-webgpu', '--window-size=1280,720', '--mute-audio']
  });
  try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  page.on('pageerror', e => console.log('  [pageerror]', e.message.slice(0, 200)));
  page.on('crash', () => console.log('  [PAGE CRASHED]'));

    console.log('=== WebGPU（先测，防窗口降频偏差）===');
    const webgpu = await runBackend(page, 'webgpu');
    console.log('最大稳定:', webgpu.maxStable, ' 首次失败:', webgpu.firstFail);

    console.log('=== WebGL ===');
    const webgl = await runBackend(page, 'webgl');
    console.log('最大稳定:', webgl.maxStable, ' 首次失败:', webgl.firstFail);

    console.log('\n===== 对比（fps / p95ms / drawcall）=====');
    console.log('count |        webgl           |        webgpu');
    console.log('------+------------------------+------------------------');
    for (const c of COUNTS) {
      const a = webgl.levels.find(l => l.count === c);
      const b = webgpu.levels.find(l => l.count === c);
      const fmt = l => l ? `${l.fps}fps p95=${l.p95} dc=${l.dc}${l.stable ? '' : ' ❌'}` : '-';
      console.log(String(c).padStart(5) + ' | ' + fmt(a).padEnd(22) + ' | ' + fmt(b));
    }
    const out = { counts: COUNTS, webgl, webgpu, timestamp: Date.now() };
    const outPath = path.resolve(__dirname, 'results', 'mc-backend-compare.json');
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
    console.log('\n已保存: ' + outPath);
  } finally {
    await browser.close();
    await new Promise(r => server.close(r));
  }
})().catch(e => { console.error('失败:', e.message); process.exit(1); });
