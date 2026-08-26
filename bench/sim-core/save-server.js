/**
 * bench 结果本地保存服务（零交互导出）
 * 用法：node save-server.js [resultsDir]   默认 D:\engine_compare\bench\results
 * 页面端 BenchRunner.exportJSON 会优先 POST 到 http://127.0.0.1:8081/save
 */
var http = require('http');
var fs = require('fs');
var path = require('path');

var dir = process.argv[2] || 'D:\\engine_compare\\bench\\results';
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

http.createServer(function (req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (req.method === 'POST' && req.url.indexOf('/save') === 0) {
    var name = decodeURIComponent((req.url.split('name=')[1] || '').split('&')[0]);
    // 只接受形如 bench_xxx_V1_123.json 的文件名，防路径注入
    if (!/^[A-Za-z0-9_.\-]+\.json$/.test(name)) {
      res.writeHead(400); res.end('bad name'); return;
    }
    var body = '';
    req.on('data', function (c) { body += c; if (body.length > 5e6) req.destroy(); });
    req.on('end', function () {
      fs.writeFile(path.join(dir, name), body, 'utf8', function (err) {
        if (err) { res.writeHead(500); res.end(String(err)); }
        else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end('{"ok":true}');
        }
      });
    });
    return;
  }
  res.writeHead(404); res.end();
}).listen(8081, '127.0.0.1', function () {
  console.log('bench save-server ready -> ' + dir);
});
