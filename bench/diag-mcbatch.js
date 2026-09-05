/** mcbatch 模式验证：截图 + 控制台 + probe 状态 */
const puppeteer = require('puppeteer-core');
const http = require('http');
const fs = require('fs');
const path = require('path');
const DIST = path.resolve(__dirname, 'web', 'dist');
const CHROME = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
(async () => {
  const server = http.createServer((req, res) => {
    let f = path.join(DIST, decodeURIComponent(req.url.split('?')[0].replace(/^\//, '')));
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(DIST, 'egret-mc', 'index.html');
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' };
    res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  await new Promise(r => server.listen(8778, r));
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--enable-unsafe-webgpu', '--window-size=1280,720'] });
  const pg = await b.newPage();
  await pg.setViewport({ width: 1280, height: 720 });
  const logs = [];
  pg.on('console', m => logs.push(m.text().slice(0, 200)));
  pg.on('pageerror', e => logs.push('[pageerror] ' + e.message.slice(0, 300)));
  await pg.goto('http://127.0.0.1:8778/egret-mc/index.html?backend=webgl&mcbatch=1&auto=1&count=320', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 9000));
  await pg.screenshot({ path: path.join(__dirname, 'results', 'mc-instanced', 'diag-mcbatch.png') });
  const st = await pg.evaluate(() => {
    function find(dp) { if (dp.__webgpuBatchedSpriteLayer) return dp; if (dp.$children) for (const c of dp.$children) { const r2 = find(c); if (r2) return r2; } return null; }
    const L = find(egret.MainContext.instance.stage);
    const probe = window.__webglProbe;
    return {
      openAutoBatch: egret.sys.openAutoBatch,
      layer: !!L,
      childCount: L ? L.$children.length : 0,
      sampleChildTex: L && L.$children[0] && L.$children[0].$renderNode && L.$children[0].$renderNode.image ? L.$children[0].$renderNode.image.batchType : null,
      probeDcPerFrame: probe ? +(probe.drawTotal / Math.max(1, probe.frameTotal)).toFixed(1) : null,
      drawTotal: probe ? probe.drawTotal : null,
    };
  });
  console.log(JSON.stringify(st, null, 1));
  console.log('--- console ---');
  logs.slice(0, 20).forEach(l => console.log(l));
  console.log('--- 截图: results/mc-instanced/diag-mcbatch.png ---');
  await b.close();
  await new Promise(r => server.close(r));
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
