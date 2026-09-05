/** CPU profile：WebGPU 臂 render 内热点函数 + GC 占比。
 * CDP Profiler 采样 15s，输出 self-time top20 与 GC 帧。 */
const puppeteer = require('puppeteer-core');
const http = require('http');
const fs = require('fs');
const path = require('path');
const DIST = path.resolve(__dirname, 'web', 'dist');
const CHROME = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

(async () => {
  const count = process.argv[2] || 2080;
  const sec = parseInt(process.argv[3] || '15', 10);
  const server = http.createServer((req, res) => {
    let f = path.join(DIST, decodeURIComponent(req.url.split('?')[0].replace(/^\//, '')));
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(DIST, 'egret-mc', 'index.html');
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png' };
    res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  await new Promise(r => server.listen(8784, r));
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--enable-unsafe-webgpu', '--window-size=1280,720'] });
  const pg = await b.newPage();
  await pg.setViewport({ width: 1280, height: 720 });
  await pg.goto(`http://127.0.0.1:8784/egret-mc/index.html?backend=webgpu&channel=instanced&auto=1&count=${count}`, { waitUntil: 'domcontentloaded' });
  await pg.waitForFunction(() => window.__mcAdapter && window.__mcAdapter.isReady && window.__mcAdapter.isReady(), { timeout: 40000 });
  await new Promise(r => setTimeout(r, 6000));
  const cdp = await pg.target().createCDPSession();
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.start');
  await new Promise(r => setTimeout(r, sec * 1000));
  const { profile } = await cdp.send('Profiler.stop');
  // self time per node
  const nodes = new Map(profile.nodes.map(n => [n.id, n]));
  const self = new Map();
  const dt = (profile.timeDeltas || []).map(d => d / 1000); // ms
  (profile.samples || []).forEach((id, i) => {
    const t = dt[i] || 0;
    self.set(id, (self.get(id) || 0) + t);
  });
  const agg = new Map(); // fnKey -> ms
  const cat = new Map();
  for (const [id, ms] of self) {
    const n = nodes.get(id);
    if (!n) continue;
    const f = n.callFrame;
    const url = (f.url || '').replace(/^.*[\\/]/, '');
    const key = `${f.functionName || '(anon)'} @${url}:${f.lineNumber}`;
    agg.set(key, (agg.get(key) || 0) + ms);
    const c = f.url.includes('egret-mc') ? 'bench-mc' : url.includes('egret') ? 'egret-lib' : url.includes('webgpu') ? 'webgpu-dist' : url ? url : '(native)';
    cat.set(c, (cat.get(c) || 0) + ms);
  }
  const total = [...agg.values()].reduce((a, b) => a + b, 0);
  const top = [...agg.entries()].sort((a, b) => b[1] - a[1]).slice(0, 22)
    .map(([k, ms]) => ({ fn: k, ms: +ms.toFixed(0), pct: +(ms / total * 100).toFixed(1) }));
  const cats = [...cat.entries()].sort((a, b) => b[1] - a[1])
    .map(([k, ms]) => ({ src: k, ms: +ms.toFixed(0), pct: +(ms / total * 100).toFixed(1) }));
  console.log(JSON.stringify({ total_ms: +total.toFixed(0), cats, top }, null, 1));
  await b.close();
  await new Promise(r => server.close(r));
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
