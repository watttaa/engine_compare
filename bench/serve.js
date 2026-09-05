/**
 * bench 本地静态服务器（GitHub Pages 的本地等价物）
 * 用法：node bench/serve.js [port]    默认 8700
 * 服务 bench/web/dist/（先 node bench/web/build.js 构建）
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const DIST = path.resolve(__dirname, 'web', 'dist');
const OPT_WWW = path.resolve(__dirname, 'opt-www'); // dist 外的 WebGPU 优化版资产（隔离 dist 快照还原）
const PORT = parseInt(process.argv[2], 10) || 8700;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.bin': 'application/octet-stream',
  '.atlas': 'text/plain',
  '.txt': 'text/plain'
};

http.createServer((req, res) => {
  let url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/' ) url = '/index.html';
  let rel = url.replace(/^\/+/, '');
  if (rel.indexOf('..') >= 0) { res.writeHead(403); res.end('forbidden'); return; }
  let p = null;
  if (rel.startsWith('opt-www/')) {
    // /opt-www/*：WebGPU 优化臂页面；缺资源回退 egret-mc（main.js/egret-lib/mc-assets 共享），再回退 dist 根
    const rest = rel.slice('opt-www/'.length);
    for (const f of [path.join(OPT_WWW, rest), path.join(DIST, 'egret-mc', rest), path.join(DIST, rel)]) {
      try { if (fs.existsSync(f) && fs.statSync(f).isFile()) { p = f; break; } } catch (e) { /* 下一个 */ }
    }
  } else {
    const cand = path.join(DIST, rel);
    if (!cand.startsWith(DIST)) { res.writeHead(403); res.end('forbidden'); return; }
    try { if (fs.existsSync(cand) && fs.statSync(cand).isFile()) p = cand; } catch (e) { /* 目录兜底 */ }
  }
  if (!p) {
    // 目录 → 找 index.html
    const idx = path.join(DIST, rel, 'index.html');
    if (idx.startsWith(DIST) && fs.existsSync(idx)) p = idx;
  }
  if (!p) { res.writeHead(404); res.end('404: ' + url); return; }
  const ext = path.extname(p).toLowerCase();
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp'
  });
  fs.createReadStream(p).pipe(res);
}).listen(PORT, () => {
  console.log('bench 站点服务: http://127.0.0.1:' + PORT + '/');
  console.log('目录:', DIST);
  console.log('(改动后先 node bench/web/build.js 再刷新；WebGPU 需真机浏览器)');
});
