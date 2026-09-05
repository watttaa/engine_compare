/** 诊断：instance 通道纹理身份稳定性（为什么 390 批/帧） */
const puppeteer = require('puppeteer-core');
const http = require('http');
const fs = require('fs');
const path = require('path');
const DIST = 'd:/engine_compare/bench/web/dist';
function serve(req, res) {
  let f = path.join(DIST, decodeURIComponent(req.url.split('?')[0].replace(/^\//, '')));
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(DIST, 'egret-mc', 'index.html');
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' };
  res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}
(async () => {
  const sv = http.createServer(serve);
  await new Promise(r => sv.listen(8777, r));
  const b = await puppeteer.launch({ executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', headless: 'new', args: ['--no-sandbox', '--enable-unsafe-webgpu'] });
  const pg = await b.newPage();
  await pg.goto('http://127.0.0.1:8777/egret-mc/index.html?backend=webgpu&channel=instanced&auto=1&count=20', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 9000));
  const out = await pg.evaluate(() => {
    window.__cap = { layer: null, snaps: [] };
    const SR = Object.getPrototypeOf(window.egret.sys.systemRenderer);
    const ol = SR._drawBatchedSpriteLayer;
    SR._drawBatchedSpriteLayer = function (l, b2) {
      if (!window.__cap.layer) window.__cap.layer = l;
      if (window.__cap.layer === l && window.__cap.snaps.length < 4) {
        const snap = {};
        const kids = l.$children || [];
        for (let i = 0; i < Math.min(4, kids.length); i++) {
          const n = kids[i] && kids[i].$renderNode;
          snap['s' + i] = n && n.image ? { ref: n.image, bdTag: n.image.$source ? 'has$source' : 'no$source', w: n.sourceW } : null;
        }
        snap.__ident0 = !!snap.s0 && !!snap.s1 && snap.s0.ref === snap.s1.ref;
        snap.__ident2 = !!snap.s0 && !!snap.s2 && snap.s0.ref === snap.s2.ref;
        window.__cap.snaps.push(snap);
      }
      return ol.apply(this, arguments);
    };
    return 'patched';
  });
  await new Promise(r => setTimeout(r, 2500));
  const res = await pg.evaluate(() => {
    const snaps = window.__cap.snaps;
    return {
      captured: !!window.__cap.layer,
      children: window.__cap.layer ? window.__cap.layer.$children.length : 0,
      snaps,
      identityAcrossFrames: snaps.length >= 2 ? snaps[0].s0.ref === snaps[1].s0.ref : null,
    };
  });
  console.log(JSON.stringify(res, null, 1));
  await b.close();
  await new Promise(r => sv.close(r));
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
