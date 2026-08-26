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
      // 公平性：Laya 发布产物默认 isAntialias:true，此处关抗锯齿（对齐 Egret 默认关 / WebGPU 单采样）
      if (name.startsWith('laya')) {
        const idx = path.join(DIST, name, 'js', 'index.js');
        if (fs.existsSync(idx)) {
          let c = fs.readFileSync(idx, 'utf8');
          if (c.indexOf('"isAntialias":true') >= 0) {
            c = c.replace(/"isAntialias":true/g, '"isAntialias":false');
            fs.writeFileSync(idx, c, 'utf8');
            console.log('  ' + name + ': 关闭 isAntialias');
          }
        }
      }
    } else {
      console.log('[' + name + '] ' + label + ' 待发布（vendor/' + name + '/index.html 缺失）');
    }
  }

  // 6. 导航页（四场景入口）+ 四个测试子界面（总控面板）
  const SCENES = [
    { key: 'bunny', title: 'BunnyMark', icon: '🐰', sub: '2D 精灵压力 · V1-V4 合批/破批/变换' },
    { key: 'boids', title: '水族馆', icon: '🐟', sub: '大量 2D 单位综合运动（旋转+多纹理）' },
    { key: 'dhxy', title: '大话西游', icon: '⚔️', sub: '骨骼动画 · 8 角色真实资源（MMO 核心）' },
    { key: 'cloth', title: '布料', icon: '🧵', sub: '布料/物理模拟（规划中）' }
  ];

  // 引擎×后端 → 产物入口（相对 dist 根）
  const BACKENDS = {
    'egret':  { name: 'Egret 自研 5.4.1', webgl: 'egret/index.html', webgpu: 'egret-webgpu/bunnymark.html' },
    'laya':   { name: 'LayaAir 3.4',      webgl: 'laya-webgl/index.html', webgpu: 'laya/index.html' },
    'cocos':  { name: 'Cocos Creator 3.8.8', webgl: 'cocos-webgl/index.html', webgpu: 'cocos/index.html' }
  };

  // 导航页
  const sceneCards = SCENES.map(s => {
    // 该场景是否已有任一引擎可进（当前骨架阶段：全部显示，进子页后按产物可用性判定）
    return `<a class="scene" href="scene-${s.key}.html">
      <div class="ic">${s.icon}</div>
      <div class="tx"><h2>${s.title}</h2><p>${s.sub}</p></div>
      <span class="arrow">→</span>
    </a>`;
  }).join('');

  const nav = `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<title>引擎性能对比 · 四场景基准</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;background:#14161a;color:#e6e8ec;font:14px/1.7 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif;
       min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:32px 16px}
  h1{font-size:20px;margin:0 0 4px}
  .sub{color:#8a90a0;margin:0 0 28px;font-size:13px;text-align:center}
  .wrap{width:100%;max-width:640px}
  .scene{display:flex;align-items:center;gap:14px;text-decoration:none;color:inherit;
       background:#1d2027;border:1px solid #2b2f38;border-radius:12px;padding:18px 20px;
       margin-bottom:12px;transition:border-color .15s}
  .scene:hover{border-color:#4a5568}
  .scene .ic{font-size:32px;line-height:1}
  .scene .tx{flex:1}
  .scene h2{margin:0 0 2px;font-size:16px}
  .scene p{margin:0;color:#9aa0ad;font-size:12.5px}
  .scene .arrow{color:#5a6470;font-size:18px}
  .note{margin-top:26px;font-size:12px;color:#6b7280;text-align:center;max-width:640px}
</style>
</head>
<body>
  <h1>引擎性能对比</h1>
  <p class="sub">三引擎（Egret / Laya / Cocos）× 两后端（WebGL / WebGPU）· 四场景横向基准</p>
  <div class="wrap">${sceneCards}</div>
  <p class="note">每个测试子界面内切换引擎与后端；结果 JSON 自动复制。WebGPU 需 PC 端 Chrome/Edge。</p>
</body>
</html>`;
  fs.writeFileSync(path.join(DIST, 'index.html'), nav, 'utf8');

  // 测试子界面（总控面板：切引擎/后端）
  for (const s of SCENES) {
    const engines = [];
    for (const [key, info] of Object.entries(BACKENDS)) {
      const webglOk = key === 'egret' || hasVendor(key === 'laya' ? 'laya-webgl' : 'cocos-webgl');
      const webgpuOk = key === 'egret' || hasVendor(key);
      const bs = {};
      if (webgpuOk) bs.webgpu = info.webgpu;
      if (webglOk) bs.webgl = info.webgl;
      engines.push({ key, name: info.name, backends: bs });
    }
    const appConfig = { scene: s.key, sceneTitle: s.icon + ' ' + s.title, engines };
    const sceneHtml = `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<title>${s.title} · 引擎基准</title>
<link rel="stylesheet" href="tpl/ctrl.css">
</head>
<body>
<div id="stage"></div>
<div id="ctrl"></div>
<script>
  window.APP = ${JSON.stringify(appConfig)};
</script>
<script src="tpl/ctrl.js"></script>
</body>
</html>`;
    fs.writeFileSync(path.join(DIST, 'scene-' + s.key + '.html'), sceneHtml, 'utf8');
    console.log('  生成 scene-' + s.key + '.html（' + engines.filter(e => Object.keys(e.backends).length).length + ' 引擎可用）');
  }

  // 拷贝共用样样式 + 总控脚本
  cp(path.join(WEB, 'tpl', 'ctrl.css'), path.join(DIST, 'tpl', 'ctrl.css'));
  cp(path.join(WEB, 'tpl', 'ctrl.js'), path.join(DIST, 'tpl', 'ctrl.js'));

  console.log('== 完成：' + path.relative(ROOT, DIST) + ' ==');
  console.log('    laya=' + hasVendor('laya') + ' laya-webgl=' + hasVendor('laya-webgl') +
    ' cocos=' + hasVendor('cocos') + ' cocos-webgl=' + hasVendor('cocos-webgl'));
}

main();
