/**
 * 验证 Egret MC 承载力压测：驱动 HUD，逐档截图，检查画面真实渲染人数。
 * 用法：node bench/verify-mc-capacity.js [counts csv]
 */
const puppeteer = require('puppeteer-core');
const http = require('http');
const fs = require('fs');
const path = require('path');

const DIST = path.resolve(__dirname, 'web', 'dist');
const OUT = path.resolve(__dirname, 'results', 'mc-capacity');
const CHROME = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const COUNTS = process.argv[2] || '20,40,80';

function serve(req, res) {
  let file = path.join(DIST, decodeURIComponent(req.url.split('?')[0].replace(/^\//, '')));
  if (file.endsWith('/') || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    file = path.join(DIST, 'index.html');
  }
  const types = {
    '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json',
    '.map': 'application/octet-stream'
  };
  if (!fs.existsSync(file)) {
    res.writeHead(404);
    res.end('not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const server = http.createServer(serve);
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--window-size=1280,720', '--mute-audio']
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', msg => {
    const t = msg.text();
    if (msg.type() === 'error' && !t.includes('127.0.0.1:8081/save')) errors.push(t);
  });

  try {
    await new Promise(resolve => server.listen(8771, resolve));
    await page.setViewport({ width: 1280, height: 720 });
    await page.goto('http://127.0.0.1:8771/egret-mc/index.html?capacityCounts=' + COUNTS, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#mcapacity', { timeout: 30000 });
    await page.click('#mcapacity');

    let result = null;
    let lastLive = '';
    let lastCount = 0;
    let inspect = null;
    const deadline = Date.now() + 120000;
    while (Date.now() < deadline) {
      const state = await page.evaluate(() => ({
        result: window.__benchLastResult || null,
        live: document.getElementById('mlive') && document.getElementById('mlive').innerText,
        inspect: (function () {
          // 从 egret stage 找 MCBenchMain → adapter 状态无法直接访问，
          // 改为遍历 stage：数出已加入显示树的 MovieClip 数量
          try {
            var st = egret.lifecycle.stage;
            var mcs = [];
            (function walk(d, depth) {
              if (!d || depth > 6) return;
              if (d instanceof egret.MovieClip) {
                mcs.push({
                  hasData: !!d.movieClipData,
                  hasParent: !!d.parent,
                  w: d.width, h: d.height,
                  visible: d.visible,
                  frames: d.movieClipData && d.movieClipData.frames ? d.movieClipData.frames.length : 0
                });
              }
              if (d instanceof egret.DisplayObjectContainer) {
                for (var i = 0; i < d.numChildren; i++) walk(d.getChildAt(i), depth + 1);
              }
            })(st, 0);
            return { total: mcs.length, withData: mcs.filter(function (m) { return m.hasData; }).length,
                     withParent: mcs.filter(function (m) { return m.hasParent; }).length,
                     nonzeroSize: mcs.filter(function (m) { return m.w > 0 && m.h > 0; }).length,
                     sample: mcs.slice(0, 3) };
          } catch (e) { return { error: e.message }; }
        })()
      }));
      if (state.inspect) inspect = state.inspect;
      if (state.live) {
        lastLive = state.live;
        const m = state.live.match(/当前档位: (\d+) 角色/);
        const count = m ? Number(m[1]) : 0;
        if (count && count !== lastCount) {
          // 新档位出现：等 4 秒（资源加载+预热进行中）截图
          await new Promise(r => setTimeout(r, 4000));
          await page.screenshot({ path: path.join(OUT, 'level-' + count + '.png') });
          lastCount = count;
        }
      }
      if (state.result && state.result.meta && state.result.meta.mode === 'capacity-ramp') {
        result = state.result;
        await page.screenshot({ path: path.join(OUT, 'final.png') });
        break;
      }
      await new Promise(r => setTimeout(r, 300));
    }

    if (!result) throw new Error('压测未产出结果；HUD=' + lastLive);
    console.log(JSON.stringify({
      levels: result.results.map(r => r.count),
      maxStableCount: result.maxStableCount,
      firstFailCount: result.firstFailCount,
      displayTree: inspect,
      pageErrors: errors
    }, null, 2));
    console.log('截图目录: ' + OUT);
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {
  console.error('验证失败:', error.message);
  process.exit(1);
});
