/**
 * 验证 Egret 统一基准双后端（WebGL / WebGPU）
 * 用法：node bench/verify-egret.js [webgl|webgpu]
 * 反馈信号：页面控制台无报错、HUD 出现、__benchLastResult 有有效数据
 */
const puppeteer = require('puppeteer-core');

const BACKEND = process.argv[2] || 'webgl';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: [
      '--no-sandbox', '--disable-setuid-sandbox',
      '--enable-unsafe-webgpu',           // WebGPU 需要
      '--use-angle=vulkan',                // 用 Vulkan 后端更稳
      '--enable-features=Vulkan',
      '--window-size=1280,720',
      '--hide-scrollbars',
      '--mute-audio'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  const errors = [];
  page.on('console', msg => {
    const t = msg.type();
    if (t === 'error') errors.push('console.error: ' + msg.text());
  });
  page.on('pageerror', err => errors.push('pageerror: ' + err.message));

  // serve 一个静态服务器：直接用 file 协议可能被跨域/import 限制，起本地 http
  const http = require('http');
  const fs = require('fs');
  const path = require('path');
  const ROOT = path.resolve(__dirname, '..');   // bench 目录
  // dist 目录
  const DIST = path.resolve(__dirname, 'web', 'dist');

  const server = http.createServer((req, res) => {
    let p = path.join(DIST, decodeURIComponent(req.url.split('?')[0].replace(/^\//, '')));
    if (p.endsWith('/') || !fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(DIST, 'index.html');
    const ext = path.extname(p);
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.wasm': 'application/wasm', '.bin': 'application/octet-stream', '.jpg': 'image/jpeg' };
    if (!fs.existsSync(p)) { res.writeHead(404); res.end('not found ' + p); return; }
    res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream', 'Access-Control-Allow-Origin': '*' });
    fs.createReadStream(p).pipe(res);
  });
  await new Promise(r => server.listen(8770, r));
  console.log('静态服务器 8770 就绪');

  const url = 'http://127.0.0.1:8770/egret/index.html?backend=' + BACKEND + '&auto=1&variant=V1&count=5000';
  console.log('打开:', url);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(e => console.log('goto 警告:', e.message));

  // 引擎起来后立刻开始轮询结果；总等待 70s（预热3s+采样10s+WebGPU shader 编译可能较慢）
  let result = null;
  for (let i = 0; i < 70; i++) {
    result = await page.evaluate(() => window.__benchLastResult || null).catch(() => null);
    if (result) { console.log('第 ' + i + ' 秒拿到结果'); break; }
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('\n===== 结果 =====');
  if (!result) {
    console.log('❌ 无 __benchLastResult（自动测试未完成或报错）');
    // 看 HUD 内容
    const hud = await page.evaluate(() => {
      const h = document.getElementById('hud');
      return h ? h.innerText : '(无 HUD)';
    });
    console.log('HUD:\n' + hud);
  } else {
    console.log(JSON.stringify(result, null, 2));
    console.log('\n✅ 后端=' + BACKEND + ' 出数成功');
    console.log('   fps=' + result.fps + ' p95=' + result.p95 + 'ms dc=' + result.drawCallAvg + ' nodes=' + result.nodeCount);
  }

  console.log('\n===== 控制台报错 (' + errors.length + ') =====');
  errors.slice(0, 20).forEach(e => console.log('  ' + e.slice(0, 300)));

  await browser.close();
  server.close();
  process.exit(result && !errors.length ? 0 : 1);
})().catch(e => { console.error('顶层错误:', e); process.exit(1); });
