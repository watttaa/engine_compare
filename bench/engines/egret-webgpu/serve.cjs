// 极简静态服务器，供本地验证 Egret Bunnymark（WebGPU vs WebGL）。
const http = require('http');
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;
const PORT = 5181;   // 5180 已被 fish-webgpu-site 占用
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.wasm': 'application/wasm' };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/bunnymark.html';
  const fp = path.join(ROOT, p);
  fs.readFile(fp, (err, buf) => {
    if (err) { res.writeHead(404); res.end('404'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
    res.end(buf);
  });
}).listen(PORT, () => console.log('serve bunnymark on http://localhost:' + PORT));
