/**
 * bench/web/build.js — 组装 GitHub Pages 静态站点
 *
 * 用法：node bench/web/build.js
 * 输出：bench/web/dist/
 *
 * 结构（引擎 × 后端矩阵）：
 *   dist/
 *     index.html        导航页（按引擎分组，标注各后端可用状态）
 *     sim/              sim-core 4 个 js（三引擎共用）
 *     assets/           12 张 bunny 贴图
 *     egret/            Egret 统一基准（WebGL，V1-V4 + 水族馆）
 *     egret-webgpu/     Egret WebGPU vs WebGL 自比面板（godot 物理，独立面板）
 *     laya/             LayaAir WebGPU 发布产物（vendor/laya）
 *     laya-webgl/       LayaAir WebGL 发布产物（vendor/laya-webgl，待发布）
 *     cocos/            Cocos WebGPU 构建产物（vendor/cocos，待构建）
 *     cocos-webgl/      Cocos WebGL 构建产物（vendor/cocos-webgl，待构建）
 *
 * vendor/ 目录提交进仓库；本脚本从 vendor 拷贝到 dist，再被 Actions 部署。
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const WEB = path.join(ROOT, 'bench', 'web');
const DIST = path.join(WEB, 'dist');
const VENDOR = path.join(WEB, 'vendor');

const SIM = path.join(ROOT, 'bench', 'sim-core');
const ASSETS = path.join(ROOT, 'bench', 'assets');
const EGRET = path.join(ROOT, 'bench', 'engines', 'egret');
const EGRET_LIB = path.join(ROOT, 'egret-selfdev', '5.4.1', 'build', 'egret');
const EGRET_WEBGPU = path.join(ROOT, 'bench', 'engines', 'egret-webgpu');

function cp(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  console.log('  copy ' + path.relative(ROOT, from) + ' -> ' + path.relative(ROOT, to));
}

function hasVendor(name) {
  const p = path.join(VENDOR, name);
  return fs.existsSync(path.join(p, 'index.html'));
}

function main() {
  console.log('== 组装 GitHub Pages 站点 ==');
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });

  // 1. sim-core
  console.log('[sim]');
  for (const n of ['stats.js', 'bunny-sim.js', 'boids-sim.js', 'bench-runner.js']) {
    cp(path.join(SIM, n), path.join(DIST, 'sim', n));
  }

  // 2. 贴图
  console.log('[assets]');
  for (const n of fs.readdirSync(ASSETS)) {
    if (n.endsWith('.png')) cp(path.join(ASSETS, n), path.join(DIST, 'assets', n));
  }

  // 3. Egret 统一基准（WebGL）
  console.log('[egret]');
  cp(path.join(EGRET, 'main.js'), path.join(DIST, 'egret', 'main.js'));
  cp(path.join(EGRET_LIB, 'egret.js'), path.join(DIST, 'egret', 'egret-lib', 'egret.js'));
  cp(path.join(EGRET_LIB, 'egret.web.js'), path.join(DIST, 'egret', 'egret-lib', 'egret.web.js'));
  let egHtml = fs.readFileSync(path.join(EGRET, 'index.html'), 'utf8')
    .replace(/\.\.\/\.\.\/sim-core\//g, '../sim/')
    .replace(/\.\.\/\.\.\/\.\.\/egret-selfdev\/5\.4\.1\/build\/egret\//g, 'egret-lib/');
  fs.writeFileSync(path.join(DIST, 'egret', 'index.html'), egHtml, 'utf8');
  let egMain = fs.readFileSync(path.join(DIST, 'egret', 'main.js'), 'utf8')
    .replace(/\.\.\/\.\.\/assets\//g, '../assets/');
  fs.writeFileSync(path.join(DIST, 'egret', 'main.js'), egMain, 'utf8');

  // 4. Egret WebGPU vs WebGL 自比面板（整目录拷贝，bunnymark.html 内部引用相对路径）
  console.log('[egret-webgpu]');
  fs.cpSync(EGRET_WEBGPU, path.join(DIST, 'egret-webgpu'), { recursive: true });

  // 5. Laya / Cocos 各后端产物（从 vendor 拷贝）
  for (const [name, label] of [
    ['laya', 'LayaAir WebGPU'],
    ['laya-webgl', 'LayaAir WebGL'],
    ['cocos', 'Cocos WebGPU'],
    ['cocos-webgl', 'Cocos WebGL']
  ]) {
    const src = path.join(VENDOR, name);
    if (hasVendor(name)) {
      console.log('[' + name + '] ' + label + ' 产物就位');
      fs.cpSync(src, path.join(DIST, name), { recursive: true });
    } else {
      console.log('[' + name + '] ' + label + ' 待发布（vendor/' + name + '/index.html 缺失）');
    }
  }

  // 6. 导航页（引擎分组 × 后端卡片）
  const group = (title, items) => {
    const cards = items.map(it => {
      const ready = it.ready;
      return `<a class="card ${ready ? '' : 'pending'}" href="${it.href}" ${ready ? '' : 'onclick="return false" style="opacity:.45;cursor:not-allowed"'}>
        <h2>${it.title}</h2>
        <p>${it.sub}</p>
        <span class="tag">${ready ? '可测' : '待发布'}</span>
      </a>`;
    }).join('');
    return `<section class="grp"><h3>${title}</h3><div class="cards">${cards}</div></section>`;
  };

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
  .sub{color:#8a90a0;margin:0 0 28px;font-size:13px;text-align:center}
  .wrap{width:100%;max-width:640px}
  .grp{margin-bottom:22px}
  .grp h3{font-size:15px;color:#7fd4ff;margin:0 0 10px;font-weight:600}
  .cards{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  @media(max-width:480px){.cards{grid-template-columns:1fr}}
  .card{display:block;text-decoration:none;color:inherit;background:#1d2027;border:1px solid #2b2f38;
        border-radius:10px;padding:14px 16px;transition:border-color .15s}
  .card:hover{border-color:#4a5568}
  .card h2{margin:0 0 4px;font-size:15px}
  .card p{margin:0 0 10px;color:#9aa0ad;font-size:12.5px}
  .tag{font-size:11.5px;padding:2px 8px;border-radius:999px;background:#2b6e3f;color:#7fdc9a}
  .card.pending .tag{background:#5a5240;color:#e0c97f}
  .note{margin-top:26px;font-size:12px;color:#6b7280}
</style>
</head>
<body>
  <h1>引擎性能对比 · 基准测试</h1>
  <p class="sub">同机、同分辨率、同资源，三引擎 × WebGL/WebGPU 横向对比</p>
  <div class="wrap">
    ${group('🐰 Egret 自研 5.4.1', [
      { title: 'WebGL · 统一基准', sub: 'BunnyMark V1-V4 + 水族馆（三引擎同口径）', href: 'egret/', ready: true },
      { title: 'WebGPU vs WebGL 自比', sub: '同机同场景只切后端，直接看加速比', href: 'egret-webgpu/bunnymark.html', ready: true }
    ])}
    ${group('🔵 LayaAir 3.4', [
      { title: 'WebGPU · 统一基准', sub: 'BunnyMark V1-V4 + 水族馆', href: 'laya/', ready: hasVendor('laya') },
      { title: 'WebGL · 统一基准', sub: 'BunnyMark V1-V4 + 水族馆', href: 'laya-webgl/', ready: hasVendor('laya-webgl') }
    ])}
    ${group('🟢 Cocos Creator 3.8.8', [
      { title: 'WebGPU · 统一基准', sub: 'BunnyMark V1-V4 + 水族馆', href: 'cocos/', ready: hasVendor('cocos') },
      { title: 'WebGL · 统一基准', sub: 'BunnyMark V1-V4 + 水族馆', href: 'cocos-webgl/', ready: hasVendor('cocos-webgl') }
    ])}
  </div>
  <p class="note">说明：手机浏览器可测 WebGL（全引擎）；WebGPU 主要在 PC Chrome/Edge 测。
  每轮先预热 3 秒再采样 10 秒；结果 JSON 自动复制到剪贴板，粘贴发回分析。</p>
</body>
</html>`;
  fs.writeFileSync(path.join(DIST, 'index.html'), nav, 'utf8');

  console.log('== 完成：' + path.relative(ROOT, DIST) + ' ==');
  console.log('    laya=' + hasVendor('laya') + ' laya-webgl=' + hasVendor('laya-webgl') +
    ' cocos=' + hasVendor('cocos') + ' cocos-webgl=' + hasVendor('cocos-webgl'));
}

main();
