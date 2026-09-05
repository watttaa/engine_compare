/**
 * 渲染缺失机制诊断：复现"减人→再加人"序列，逐帧核对幸存角色 MC/纹理状态
 * 用法：node bench/diag-renderloss.js
 */
const puppeteer = require('puppeteer-core');
const http = require('http');
const fs = require('fs');
const path = require('path');
const DIST = path.resolve(__dirname, 'web', 'dist');
const CHROME = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

function serve(req, res) {
  let f = path.join(DIST, decodeURIComponent(req.url.split('?')[0].replace(/^\//, '')));
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(DIST, 'egret-mc', 'index.html');
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' };
  res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}

const INSPECT = `(() => {
  const A = window.__mcAdapter;
  if (!A) return 'no adapter';
  const probe = window.__webglProbe;
  const probeDc = +(probe.drawTotal / Math.max(1, probe.frameTotal)).toFixed(1);
  const nodes = A.nodes.filter(n => n && n.loaded);
  if (!nodes.length) return { probeDc, nodes: 0, note: 'no loaded nodes' };
  const mc = nodes[0].mcs[0];
  const tex = mc.$texture;
  const bd = tex && tex.$bitmapData;
  const mcd = mc.$movieClipData;
  return {
    probeDc,
    nodes: nodes.length,
    simList: A.sim.list.length,
    mcOnStage: !!mc.$stage,
    mcVisible: mc.$visible,
    mcPlaying: mc.$isPlaying,
    mcFrame: mc.$currentFrameNum,
    mcTexture: !!tex,
    bdValid: bd ? bd.$valid : null,
    bdRefCount: bd ? bd.$referenceCount : null,
    bdHasSource: bd ? !!(bd.$source || bd.source) : null,
    bdDeleteSource: bd ? bd.$deleteSource : null,
    bdWebGLTexture: bd ? !!bd.webGLTexture : null,
    bdReleaseStamp: bd ? (bd.$releaseTimeStamp || 0) : null,
    mcdDataValid: mcd ? mcd.$isDataValid() : null,
    mcdTextureValid: mcd ? mcd.$isTextureValid() : null,
    renderNodeImage: !!(mc.$renderNode && mc.$renderNode.image),
    renderNodeDirty: mc.$renderDirty,
  };
})()`;

async function snap(pg, tag) {
  const r = await pg.evaluate(INSPECT);
  console.log('=== ' + tag + ' ===');
  console.log(typeof r === 'string' ? r : JSON.stringify(r, null, 1));
}

(async () => {
  const server = http.createServer(serve);
  await new Promise(r => server.listen(8779, r));
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--window-size=1280,720'] });
  const pg = await b.newPage();
  await pg.setViewport({ width: 1280, height: 720 });
  pg.on('pageerror', e => console.log('[pageerror]', e.message.slice(0, 200)));
  await pg.goto('http://127.0.0.1:8779/egret-mc/index.html?backend=webgl&auto=1&count=2560', { waitUntil: 'domcontentloaded' });
  await pg.waitForFunction(() => window.__mcAdapter && window.__mcAdapter.isReady && window.__mcAdapter.isReady(), { timeout: 40000 });
  await new Promise(r => setTimeout(r, 4000));
  await snap(pg, 'T0 建满 2560（健康基线）');

  // 复现 ramp 的"减人"
  await pg.evaluate(() => window.__mcAdapter.setCount(2320));
  await new Promise(r => setTimeout(r, 3000));
  await snap(pg, 'T1 减到 2320（复现渲染缺失点）');

  // 再加回去（ramp 的加序列）
  await pg.evaluate(() => window.__mcAdapter.setCount(2560));
  await new Promise(r => setTimeout(r, 3000));
  await snap(pg, 'T2 加回 2560（验证是否自愈）');

  await b.close();
  await new Promise(r => server.close(r));
})().catch(e => { console.error('失败:', e.message); process.exit(1); });
