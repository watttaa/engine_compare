/**
 * 三引擎 BunnyMark V1 数字采集（headless）
 * 用法：node bench/run-bunny.js
 * 跑 Egret/Laya/Cocos 三家的 WebGL V1（count 由参数控制），出 JSON 到 bench/results/
 */
'use strict';
const puppeteer = require('puppeteer-core');
const http = require('http');
const fs = require('fs');
const path = require('path');

const DIST = path.resolve(__dirname, 'web', 'dist');
const RESULTS = path.resolve(__dirname, 'results');
const PORT = 8793;
const COUNT = parseInt(process.argv[2], 10) || 5000;
const VARIANT = process.argv[3] || 'V1';
const BACKEND = process.argv[4] || 'webgl'; // 'webgl' | 'webgpu'

if (!fs.existsSync(RESULTS)) fs.mkdirSync(RESULTS, { recursive: true });

// 三引擎入口：backend 决定测 WebGL 还是 WebGPU 臂
// Egret 用 backend 参数；Laya/Cocos 用不同产物目录（laya=webgpu, laya-webgl=webgl, cocos=webgpu, cocos-webgl=webgl）
const TARGETS = (BACKEND === 'webgpu')
  ? [
    { engine: 'egret-selfdev-5.4.1-webgpu', url: '/egret/index.html?backend=webgpu' },
    { engine: 'layaair-3.4.0-webgpu', url: '/laya/index.html' },
    { engine: 'cocos-creator-3.8.8-webgpu', url: '/cocos/index.html' }
  ]
  : [
    { engine: 'egret-selfdev-5.4.1', url: '/egret/index.html?backend=webgl' },
    { engine: 'layaair-3.4.0-webgl', url: '/laya-webgl/index.html' },
    { engine: 'cocos-creator-3.8.8-webgl', url: '/cocos-webgl/index.html' }
  ];

const srv = http.createServer((req, res) => {
  let url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/') url = '/index.html';
  let p = path.join(DIST, url.replace(/^\//, ''));
  if (!p.startsWith(DIST)) { res.writeHead(403); res.end(); return; }
  if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) {
    const idx = path.join(p, 'index.html');
    if (fs.existsSync(idx)) p = idx;
  }
  if (!fs.existsSync(p)) { res.writeHead(404); res.end('404 ' + url); return; }
  const m = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.wasm': 'application/wasm', '.bin': 'application/octet-stream', '.jpg': 'image/jpeg' };
  res.writeHead(200, { 'Content-Type': m[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp' });
  fs.createReadStream(p).pipe(res);
});

(async () => {
  await new Promise(r => srv.listen(PORT, r));
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--window-size=1280,720', '--mute-audio']
  });

  for (const t of TARGETS) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });

    const sep = t.url.includes('?') ? '&' : '?';
    const launchUrl = t.url + sep + 'auto=1&variant=' + encodeURIComponent(VARIANT) + '&count=' + COUNT;
    console.log('\n=== ' + t.engine + ' ===');
    console.log('打开 ' + launchUrl);
    await page.goto('http://127.0.0.1:' + PORT + launchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    let result = null;
    for (let i = 0; i < 45; i++) {
      result = await page.evaluate(() => window.__benchLastResult || null).catch(() => null);
      if (result) { console.log('第 ' + i + 's 出数'); break; }
      await new Promise(r => setTimeout(r, 1000));
    }

    if (result) {
      result.meta.engine = t.engine;
      result.meta.requestedBackend = BACKEND;
      // 权威后端复核：直接读主渲染画布是否持有 webgpu 上下文（地面真相，independent of 引擎自检）。
      // 已持 webgl 上下文的画布 getContext('webgpu') 返回 null；已持 webgpu 的返回上下文。
      const probed = await page.evaluate(() => {
        try {
          const cs = Array.from(document.querySelectorAll('canvas'));
          let main = null;
          for (const c of cs) { if (!main || c.width * c.height > main.width * main.height) main = c; }
          if (main && main.width > 0) return (main.getContext('webgpu') !== null) ? 'webgpu' : 'webgl';
        } catch (e) {}
        return null;
      }).catch(() => null);
      result.actualBackend = probed || result.actualBackend || result.meta.actualBackend || null;
      result.backendProbe = probed;
      result.backendValid = result.actualBackend === BACKEND;
      result.comparisonEligible = result.backendValid;
      result.runId = Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      const file = path.join(RESULTS, 'bench_' + t.engine + '_' + VARIANT + '_' + COUNT + '_' + result.runId + '.json');
      fs.writeFileSync(file, JSON.stringify(result, null, 2));
      console.log('✅ 已存: ' + path.basename(file));
      console.log('   fps=' + result.fps + ' p50=' + result.p50 + 'ms p95=' + result.p95 + 'ms p99=' + result.p99 + 'ms dc=' + result.drawCallAvg + ' nodes=' + result.nodeCount);
    } else {
      console.log('❌ 45s 无数据');
      const hud = await page.evaluate(() => { const h = document.querySelector('#hud, #ctrl'); return h ? h.innerText.slice(0, 500) : '(无 HUD)'; });
      console.log('HUD: ' + hud);
    }
    if (errs.length) { console.log('报错(' + errs.length + '):'); errs.slice(0, 6).forEach(e => console.log('  ' + e)); }
    await page.close();
  }

  await browser.close();
  srv.close();
  console.log('\n完成。结果在 bench/results/');
})().catch(e => { console.error('TOP:', e); process.exit(1); });
