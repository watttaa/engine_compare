/**
 * 像素级验证：对比无人背景与各档位截图，量化画面真实渲染的人物像素量。
 */
const puppeteer = require('puppeteer-core');
const http = require('http');
const fs = require('fs');
const path = require('path');

const DIST = path.resolve(__dirname, 'web', 'dist');
const OUT = path.resolve(__dirname, 'results', 'mc-capacity');
const CHROME = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const COUNTS = process.argv[2] || '20,40';

function serve(req, res) {
  let file = path.join(DIST, decodeURIComponent(req.url.split('?')[0].replace(/^\//, '')));
  if (file.endsWith('/') || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, 'index.html');
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json' };
  if (!fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const server = http.createServer(serve);
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--window-size=1280,720', '--mute-audio'] });
  const page = await browser.newPage();
  try {
    await new Promise(r => server.listen(8771, r));
    await page.setViewport({ width: 1280, height: 720 });
    await page.goto('http://127.0.0.1:8771/egret-mc/index.html?capacityCounts=' + COUNTS, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#mcapacity', { timeout: 30000 });
    // 等地图背景加载
    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: path.join(OUT, 'baseline.png') });

    await page.click('#mcapacity');
    let lastCount = 0;
    const shots = ['baseline.png'];
    const trace = [];
    const deadline = Date.now() + 120000;
    while (Date.now() < deadline) {
      const state = await page.evaluate(() => ({
        result: window.__benchLastResult || null,
        live: document.getElementById('mlive') && document.getElementById('mlive').innerText,
        adapter: (function () {
          var a = window.__mcAdapter;
          if (!a) return null;
          var loaded = 0, withParent = 0, withData = 0, playing = 0;
          for (var i = 0; i < a.nodes.length; i++) {
            var n = a.nodes[i];
            if (!n) continue;
            if (n.loaded) loaded++;
            if (n.mcs && n.mcs[0]) {
              if (n.mcs[0].parent) withParent++;
              if (n.mcs[0].movieClipData) withData++;
              if (n.mcs[0].$isPlaying) playing++;
            }
          }
          return { simLen: a.sim ? a.sim.list.length : 0, nodes: a.nodes.length, loaded: loaded, withParent: withParent, withData: withData, playing: playing, pending: a._pendingLoads };
        })()
      }));
      if (state.adapter) trace.push({ t: Math.round((Date.now() - deadline + 120000) / 1000), ...state.adapter });
      const m = state.live && state.live.match(/当前档位: (\d+) 角色/);
      const count = m ? Number(m[1]) : 0;
      if (count && count !== lastCount) {
        await new Promise(r => setTimeout(r, 4000));
        await page.screenshot({ path: path.join(OUT, 'level-' + count + '.png') });
        shots.push('level-' + count + '.png');
        lastCount = count;
      }
      if (state.result && state.result.meta && state.result.meta.mode === 'capacity-ramp') break;
      await new Promise(r => setTimeout(r, 300));
    }

    // 像素对比：与 baseline 相比的差异像素数
    const diff = await page.evaluate(async (files) => {
      async function load(name) {
        const img = new Image();
        img.src = 'data:image/png;base64,' + name.b64;
        await new Promise(r => img.onload = r);
        return img;
      }
      function read(img) {
        const c = document.createElement('canvas');
        c.width = img.width; c.height = img.height;
        const x = c.getContext('2d');
        x.drawImage(img, 0, 0);
        return x.getImageData(0, 0, c.width, c.height).data;
      }
      const fs = await Promise.all(files.map(f => load(f)));
      const base = read(fs[0]);
      const out = [];
      for (let i = 1; i < fs.length; i++) {
        const d = read(fs[i]);
        let diffPx = 0;
        for (let p = 0; p < base.length; p += 4) {
          if (Math.abs(base[p] - d[p]) > 24 || Math.abs(base[p + 1] - d[p + 1]) > 24 || Math.abs(base[p + 2] - d[p + 2]) > 24) diffPx++;
        }
        out.push({ file: files[i].name, diffPixels: diffPx, pct: +(diffPx / (base.length / 4) * 100).toFixed(2) });
      }
      return out;
    }, shots.map(name => ({ name, b64: fs.readFileSync(path.join(OUT, name)).toString('base64') })));

    console.log(JSON.stringify(diff, null, 2));
    // 状态轨迹：每秒一个采样，观察 loaded/withParent 是否在档位切换时下跌
    const compact = trace.filter((v, i) => i % 3 === 0 || v.pending > 0);
    console.log('--- adapter trace (每3秒采样) ---');
    for (const t of compact) console.log(`t=${t.t}s sim=${t.simLen} nodes=${t.nodes} loaded=${t.loaded} parent=${t.withParent} data=${t.withData} playing=${t.playing} pending=${t.pending}`);
  } finally {
    await browser.close();
    await new Promise(r => server.close(r));
  }
})().catch(e => { console.error('失败:', e.message); process.exit(1); });
