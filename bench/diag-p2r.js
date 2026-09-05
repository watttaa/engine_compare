/** P2R 诊断：层调用次数、usedSlots、MCD/纹理状态、mirrorSprite 返回值 */
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
  await new Promise(r => server.listen(8780, r));
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--enable-unsafe-webgpu', '--window-size=1280,720'] });
  const pg = await b.newPage();
  await pg.setViewport({ width: 1280, height: 720 });
  const pageName = process.argv[3] || 'index.html';
  const url = pageName.startsWith('http') ? pageName + `?backend=webgpu&channel=instanced&auto=1&count=${process.argv[2] || 100}`
    : `http://127.0.0.1:8780/egret-mc/${pageName}?backend=webgpu&channel=instanced&auto=1&count=${process.argv[2] || 100}`;
  await pg.goto(url, { waitUntil: 'domcontentloaded' });
  await pg.waitForFunction(() => window.__mcAdapter && window.__mcAdapter.isReady && window.__mcAdapter.isReady(), { timeout: 40000 });
  await new Promise(r => setTimeout(r, 5000));
  const errs = [];
  pg.on('pageerror', e => errs.push('pageerror: ' + e.message));
  pg.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await pg.evaluate(() => {
    window.__acc = { render: 0, n: 0, flush: 0, ws: 0 };
    const SR = Object.getPrototypeOf(window.egret.sys.systemRenderer);
    const orender = SR.render;
    SR.render = function () { const t0 = performance.now(); try { return orender.apply(this, arguments); } finally { window.__acc.render += performance.now() - t0; window.__acc.n++; } };
    const r = window.__webgpu.renderer;
    const ch = r._spriteChannel;
    if (ch) {
      const ofl = ch.flush.bind(ch);
      ch.flush = function () { const t0 = performance.now(); try { return ofl(); } finally { window.__acc.flush += performance.now() - t0; } };
    }
  });
  await new Promise(r => setTimeout(r, 6000));
  const out = await pg.evaluate(() => {
    const r = window.__webgpu.renderer;
    const ch = r._spriteChannel;
    const A = window.__mcAdapter;
    const mc = A.nodes[0] && A.nodes[0].mcs[0];
    const t = mc && mc.$texture;
    const bd = t && t.$bitmapData;
    const op = mc && mc.offsetPoint;
    const mcd = mc && mc.$movieClipData;
    let slotDump = null;
    if (ch && ch.data) {
      const o = 0;
      const v = Array.from(ch.data.slice(o, o + 16));
      const bid = Math.round(v[14]);
      slotDump = { v, texId: bid, tex: bid != null && ch._textures[bid] ? { w: ch._textures[bid].w, h: ch._textures[bid].h } : null };
    }
    let layerDump = null;
    const layer = mc && mc.$parent;
    if (layer) {
      const kids = layer.$children || [];
      const kid0 = kids[0];
      const lw = layer.$getConcatenatedMatrix ? layer.$getConcatenatedMatrix() : null;
      const cmOf = (k) => k && k.$getConcatenatedMatrix ? (() => { const m = k.$getConcatenatedMatrix(); return { a: +m.a.toFixed(4), b: +m.b.toFixed(4), c: +m.c.toFixed(4), d: +m.d.toFixed(4), tx: +m.tx.toFixed(2), ty: +m.ty.toFixed(2) }; })() : null;
      const opOf = (k) => k && k.offsetPoint ? { x: k.offsetPoint.x, y: k.offsetPoint.y } : null;
      layerDump = {
        layerType: layer.$type || layer.constructor && layer.constructor.name,
        kidCount: kids.length,
        kid0Name: kid0 && kid0.constructor && kid0.constructor.name,
        kid0HasTexture: !!(kid0 && kid0.$texture),
        kid0IsMC: !!(kid0 && kid0.$movieClipData),
        layerConcat: lw ? { a: +lw.a.toFixed(4), tx: +lw.tx.toFixed(2), ty: +lw.ty.toFixed(2) } : null,
        kid0Local: kid0 && kid0.$matrix ? { a: kid0.$matrix.a, tx: kid0.$matrix.tx, ty: kid0.$matrix.ty } : null,
        // 同角色 body/head/weapon 三层 concat 是否相等（决定能否角色级共享矩阵）
        charLayers: [0, 1, 2].map(k => ({
          name: kids[k] && kids[k].constructor && kids[k].constructor.name,
          local: kids[k] && kids[k].$matrix ? { a: +kids[k].$matrix.a.toFixed(4), tx: +kids[k].$matrix.tx.toFixed(2), ty: +kids[k].$matrix.ty.toFixed(2) } : null,
          concat: cmOf(kids[k]),
          op: opOf(kids[k]),
        })),
      };
    }
    return {
      usedSlots: ch ? ch.usedSlots : null,
      lastInstanceDC: r._instanceDrawCalls,
      lastDrawCalls: r._lastDrawCalls,
      renderMsPerFrame: window.__acc.n ? +(window.__acc.render / window.__acc.n).toFixed(2) : null,
      frames: window.__acc.n,
      mc: mc ? {
        bitmapX: t ? t.$bitmapX : null, bitmapY: t ? t.$bitmapY : null,
        bitmapW: t ? t.$bitmapWidth : null, bitmapH: t ? t.$bitmapHeight : null,
        bdW: bd ? bd.width : null, bdH: bd ? bd.height : null,
        opX: op ? op.x : null, opY: op ? op.y : null,
      } : null,
      slotDump,
      layerDump,
    };
  });
  out.errs = errs.slice(0, 6);
  console.log(JSON.stringify(out, null, 1));
  await b.close();
  await new Promise(r => server.close(r));
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
