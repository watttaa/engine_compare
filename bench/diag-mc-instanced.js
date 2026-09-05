/**
 * MC 实例化通道诊断：自动起服务 → Edge/WebGPU 打开 → 抓 mcdbg + 渲染器状态 + 双通道截图
 * 用法：node bench/diag-mc-instanced.js [count]
 */
const puppeteer = require('puppeteer-core');
const http = require('http');
const fs = require('fs');
const path = require('path');

const DIST = path.resolve(__dirname, 'web', 'dist');
const OUT = path.resolve(__dirname, 'results', 'mc-instanced');
const CHROME = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const COUNT = process.argv[2] || '5';

function serve(req, res) {
  let file = path.join(DIST, decodeURIComponent(req.url.split('?')[0].replace(/^\//, '')));
  if (file.endsWith('/') || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, 'index.html');
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.map': 'application/octet-stream' };
  if (!fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}

const logs = [];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const server = http.createServer(serve);
  await new Promise(r => server.listen(8772, r));
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--enable-unsafe-webgpu', '--window-size=1280,720', '--mute-audio'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  const logs2 = [];
  page.on('console', msg => {
    const t = msg.text();
    if (!t.includes('updateScreenSize')) { logs.push(t); logs2.push(t); }
  });
  page.on('pageerror', e => { logs.push('[pageerror] ' + e.message); logs2.push('[pageerror] ' + e.message); });

  try {
    await page.goto('http://127.0.0.1:8772/egret-mc/index.html?backend=webgpu&channel=instanced&auto=1&count=' + COUNT, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__effectiveBackend, { timeout: 15000 });
    await page.evaluate(() => {
      window.__gpuErrors = [];
      const w = window.__webgpu;
      if (w && w.renderer && w.renderer.device) {
        w.renderer.device.addEventListener('uncapturederror', e => {
          window.__gpuErrors.push(String((e.error && e.error.message) || e.error).slice(0, 400));
        });
      } else {
        window.__gpuErrors.push('no device to attach listener');
      }
    });
    await page.waitForFunction(() => window.__webgpu && window.__webgpu.renderer && window.__webgpu.renderer.device, { timeout: 20000 });
    await new Promise(r => setTimeout(r, 500));
    const ctorTest = await page.evaluate(() => {
      try {
        const c = window.__webgpu.renderer.getSpriteChannel();
        return 'ok degraded=' + c.degraded;
      } catch (e) {
        return 'THROW: ' + (e.stack || e.message);
      }
    });
    console.log('=== 构造器试测 ===');
    console.log(ctorTest);
    const INSTALL_WRAPPER = process.env.DIAG_WRAPPER === '1';
    if (INSTALL_WRAPPER) { await page.evaluate(() => {
      window.__gpuErrors = window.__gpuErrors || [];
      window.__hist = [];
      const w = window.__webgpu, r = w.renderer;
      const ch = r._spriteChannel;
      if (ch && ch.push) {
        const ofl = ch.flush.bind(ch);
        ch.flush = function () {
          try { ofl(); } catch (e) { window.__gpuErrors.push('FLUSH THROW: ' + (e.stack || e.message).slice(0, 400)); }
        };
        const ow = ch.push.bind(ch);
        ch.push = function () {
          try { return ow.apply(ch, arguments); } catch (e) { window.__gpuErrors.push('PUSH THROW: ' + (e.stack || e.message).slice(0, 400)); return false; }
        };
      }
      const sr = window.egret.sys.systemRenderer;
      const proto = Object.getPrototypeOf(sr);
      const olayer = proto._drawBatchedSpriteLayer;
      proto._drawBatchedSpriteLayer = function () {
        try { return olayer.apply(this, arguments); } catch (e) { window.__gpuErrors.push('LAYER THROW: ' + (e.stack || e.message).slice(0, 400)); return false; }
      };
      const oend = r.end.bind(r);
      r.end = function () {
        try { return oend(); } finally {
          window.__hist.push({ dc: r._lastDrawCalls, b: r._lastBatchCount, ib: r._lastInstanceBatchCount });
          if (window.__hist.length > 8) window.__hist.shift();
        }
      };
      window.__acc = { ws: 0, fl: 0, lf: 0, render: 0, n: 0 };
      if (ch) {
        if (ch.push) {
          const ows = ch.push.bind(ch);
          ch.push = function () {
            const t0 = performance.now();
            const r2 = ows.apply(ch, arguments);
            window.__acc.ws += performance.now() - t0;
            return r2;
          };
        }
        const ofl = ch.flush.bind(ch);
        ch.flush = function () {
          try {
            const t0 = performance.now();
            const r2 = ofl();
            window.__acc.fl += performance.now() - t0;
            return r2;
          } catch (e) { window.__gpuErrors.push('FLUSH THROW: ' + (e.stack || e.message).slice(0, 400)); }
        };
      }
      const SR = Object.getPrototypeOf(window.egret.sys.systemRenderer);
      const orender = SR.render;
      SR.render = function () {
        const t0 = performance.now();
        try { return orender.apply(this, arguments); } finally { window.__acc.render += performance.now() - t0; window.__acc.n++; }
      };
    });
    }
    await new Promise(r => setTimeout(r, 8500)); // 等资源加载+动画跑起来

    const state = await page.evaluate(() => {
      const w = window.__webgpu, r = w && w.renderer;
      return {
        effectiveBackend: window.__effectiveBackend,
        hasRenderer: !!r,
        lastDrawCalls: r ? r._lastDrawCalls : null,
        gpuMs: r && r._gpuTimer ? r._gpuTimer.lastMs : null,
        lastBatchCount: r ? r._lastBatchCount : null,
        lastInstanceBatchCount: r ? r._lastInstanceBatchCount : null,
        texSlots: r ? r._texSlots : null,
        multiTex: r ? r._multiTex : null,
        chDegraded: r && r._spriteChannel ? r._spriteChannel.degraded : null,
        chReason: r && r._spriteChannel ? r._spriteChannel._degradeReason : null,
        chLayers: r && r._spriteChannel && r._spriteChannel._layers ? r._spriteChannel._layers.size : null,
        chWrittenFloats: r && r._spriteChannel ? r._spriteChannel.writtenFloats : null,
        gpuErrors: window.__gpuErrors || null,
        hist: window.__hist || null,
        acc: window.__acc ? {
          writeSpriteMs: +(window.__acc.ws).toFixed(1),
          flushMs: +(window.__acc.fl).toFixed(1),
          layerForMs: +(window.__acc.lf).toFixed(1),
          renderMsTotal: +(window.__acc.render).toFixed(1),
          frames: window.__acc.n,
          renderMsPerFrame: window.__acc.n ? +(window.__acc.render / window.__acc.n).toFixed(2) : null,
        } : null,
      };
    });
    await page.screenshot({ path: path.join(OUT, 'diag-instanced.png') });

    // 切回通用路径
    await page.evaluate(() => {
      const sel = document.querySelector('#mchannel');
      if (sel) { sel.value = 'generic'; sel.dispatchEvent(new Event('change')); }
    });
    await new Promise(r => setTimeout(r, 2000));
    const stateG = await page.evaluate(() => {
      const w = window.__webgpu, r = w && w.renderer;
      return { lastDrawCalls: r ? r._lastDrawCalls : null, lastInstanceBatchCount: r ? r._lastInstanceBatchCount : null };
    });
    await page.screenshot({ path: path.join(OUT, 'diag-generic.png') });

    console.log('=== state(instanced) ===');
    console.log(JSON.stringify(state, null, 2));
    console.log('=== state(generic) ===');
    console.log(JSON.stringify(stateG, null, 2));
    console.log('=== console 抓取 ===');
    logs.slice(0, 30).forEach(l => console.log(l));
    console.log('=== 截图 ===');
    console.log(path.join(OUT, 'diag-instanced.png'));
    console.log(path.join(OUT, 'diag-generic.png'));
  } finally {
    await browser.close();
    await new Promise(r => server.close(r));
  }
})().catch(e => { console.error('失败:', e.message); console.error('--- console 抓取 ---'); logs.slice(0, 30).forEach(l => console.error(l)); process.exit(1); });
