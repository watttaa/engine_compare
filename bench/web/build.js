/**
 * bench/web/build.js — 组装 GitHub Pages 静态站点
 *
 * 用法：node bench/web/build.js
 * 输出：bench/web/dist/
 *
 * 结构：
 *   dist/
 *     index.html        导航页（自动生成，标注各引擎可用状态）
 *     sim/              sim-core 4 个 js（三引擎共用）
 *     assets/           12 张 bunny 贴图
 *     egret/            Egret 自研引擎基准（index.html 路径已重写 + 引擎库）
 *     laya/             LayaAir 发布产物（本地 IDE 发布后手动拷贝，本脚本不覆盖）
 *     cocos/            Cocos Creator 构建产物（本地构建后手动拷贝，本脚本不覆盖）
 *
 * 说明：
 *  - Laya/Cocos 需本地 IDE 发布，本脚本只负责把已存在的 dist/laya、dist/cocos 保留不动；
 *    若不存在则导航页显示「待发布」。
 *  - Egret 全自动：sim-core + 贴图 + 引擎库 + 路径重写全部本脚本完成。
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const WEB = path.join(ROOT, 'bench', 'web');
const DIST = path.join(WEB, 'dist');

const SIM = path.join(ROOT, 'bench', 'sim-core');
const ASSETS = path.join(ROOT, 'bench', 'assets');
const EGRET = path.join(ROOT, 'bench', 'engines', 'egret');
const EGRET_LIB = path.join(ROOT, 'egret-selfdev', '5.4.1', 'build', 'egret');

function cp(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  console.log('  copy ' + path.relative(ROOT, from) + ' -> ' + path.relative(ROOT, to));
}

function main() {
  console.log('== 组装 GitHub Pages 站点 ==');
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });

  // 1. sim-core（4 个 js）
  console.log('[sim]');
  for (const n of ['stats.js', 'bunny-sim.js', 'boids-sim.js', 'bench-runner.js']) {
    cp(path.join(SIM, n), path.join(DIST, 'sim', n));
  }

  // 2. 贴图（12 张）
  console.log('[assets]');
  for (const n of fs.readdirSync(ASSETS)) {
    if (n.endsWith('.png')) cp(path.join(ASSETS, n), path.join(DIST, 'assets', n));
  }

  // 3. Egret：主脚本 + 引擎库 + 重写 index.html 路径
  console.log('[egret]');
  cp(path.join(EGRET, 'main.js'), path.join(DIST, 'egret', 'main.js'));
  cp(path.join(EGRET_LIB, 'egret.js'), path.join(DIST, 'egret', 'egret-lib', 'egret.js'));
  cp(path.join(EGRET_LIB, 'egret.web.js'), path.join(DIST, 'egret', 'egret-lib', 'egret.web.js'));

  let egHtml = fs.readFileSync(path.join(EGRET, 'index.html'), 'utf8');
  egHtml = egHtml
    .replace(/\.\.\/\.\.\/sim-core\//g, '../sim/')
    .replace(/\.\.\/\.\.\/\.\.\/egret-selfdev\/5\.4\.1\/build\/egret\//g, 'egret-lib/');
  fs.writeFileSync(path.join(DIST, 'egret', 'index.html'), egHtml, 'utf8');

  // main.js 里贴图路径 ../../assets -> ../assets
  let egMain = fs.readFileSync(path.join(DIST, 'egret', 'main.js'), 'utf8');
  egMain = egMain.replace(/\.\.\/\.\.\/assets\//g, '../assets/');
  fs.writeFileSync(path.join(DIST, 'egret', 'main.js'), egMain, 'utf8');

  // 3.5. Laya / Cocos：本地 IDE 发布产物，提交在 vendor/，CI 整目录拷贝
  const VENDOR = path.join(WEB, 'vendor');
  for (const name of ['laya', 'cocos']) {
    const src = path.join(VENDOR, name);
    if (fs.existsSync(src) && fs.readdirSync(src).length > 0) {
      console.log('[' + name + '] 从 vendor 拷贝发布产物');
      fs.cpSync(src, path.join(DIST, name), { recursive: true });
    } else {
      console.log('[' + name + '] vendor 缺失，跳过');
    }
  }

  // 4. 导航页（标注 laya/cocos 是否已就位）
  const layaReady = fs.existsSync(path.join(DIST, 'laya', 'index.html'));
  const cocosReady = fs.existsSync(path.join(DIST, 'cocos', 'index.html'));

  const card = (title, sub, href, ready) => `
    <a class="card ${ready ? '' : 'pending'}" href="${href}" ${ready ? '' : 'onclick="return false" style="opacity:.45;cursor:not-allowed"'}>
      <h2>${title}</h2>
      <p>${sub}</p>
      <span class="tag">${ready ? '可测' : '待发布'}</span>
    </a>`;

  const nav = `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<title>引擎性能对比 · 基准测试</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;background:#14161a;color:#e6e8ec;font:14px/1.7 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif;
       min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:32px 16px}
  h1{font-size:20px;margin:0 0 4px}
  .sub{color:#8a90a0;margin:0 0 28px;font-size:13px}
  .grid{display:grid;gap:14px;width:100%;max-width:560px}
  .card{display:block;text-decoration:none;color:inherit;background:#1d2027;border:1px solid #2b2f38;
        border-radius:10px;padding:16px 18px;transition:border-color .15s}
  .card:hover{border-color:#4a5568}
  .card h2{margin:0 0 4px;font-size:16px}
  .card p{margin:0 0 10px;color:#9aa0ad;font-size:13px}
  .tag{font-size:12px;padding:2px 8px;border-radius:999px;background:#2b6e3f;color:#7fdc9a}
  .card.pending .tag{background:#5a5240;color:#e0c97f}
  .note{margin-top:28px;max-width:560px;font-size:12px;color:#6b7280}
</style>
</head>
<body>
  <h1>引擎性能对比 · 基准测试</h1>
  <p class="sub">同机、同分辨率、同资源，三引擎横向对比 | 手机扫码直测 WebGL</p>
  <div class="grid">
    ${card('Egret 自研 5.4.1', 'BunnyMark 4 变体 + 2D 水族馆（WebGL）', 'egret/', true)}
    ${card('LayaAir 3.4', 'BunnyMark 4 变体 + 2D 水族馆（WebGL/WebGPU）', 'laya/', layaReady)}
    ${card('Cocos Creator 3.8.8', 'BunnyMark 4 变体 + 2D 水族馆（WebGL/WebGPU）', 'cocos/', cocosReady)}
  </div>
  <p class="note">说明：手机浏览器可测 WebGL（全引擎）；WebGPU 主要靠 PC 端 Chrome/Edge。
  每轮先预热 3 秒再采样 10 秒；结果可在页面内复制 JSON 发回分析。</p>
</body>
</html>`;
  fs.writeFileSync(path.join(DIST, 'index.html'), nav, 'utf8');
  console.log('  生成 dist/index.html（laya=' + layaReady + ' cocos=' + cocosReady + '）');

  console.log('== 完成：' + path.relative(ROOT, DIST) + ' ==');
}

main();
