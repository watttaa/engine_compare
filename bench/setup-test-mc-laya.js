/**
 * setup-test-mc-laya —— Laya MC 适配器独立测试床（不依赖 Laya IDE 构建）
 *
 *  1. tsc 编译 proj-laya-skel/src（sim/*.ts + LayaBench_MC.ts）→ bench/test-mc-laya/js/
 *  2. 拷贝 Laya 引擎库（WebGL 组，与 proj-laya 发布产物同源）
 *  3. 拷贝 MC 资源（assets/resources/mc → resources/mc，Laya loader 运行时 URL 同工程）
 *  4. 生成 index.html（复刻发布产物 index.js 的 boot 序列：config + Laya.init + 启动适配器）
 *
 * 用法：node bench/setup-test-mc-laya.js && node bench/serve.js 8090 时访问
 *   http://127.0.0.1:8090/test-mc-laya/index.html   （serve.js 以 bench/web/dist 为根 → 见 build-test-laya-harness.js）
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'proj-laya-skel', 'src');
const OUT = path.join(__dirname, 'test-mc-laya');
const LIBS = path.join(ROOT, 'proj-laya', 'release', 'web', 'libs');
const RES = path.join(ROOT, 'proj-laya-skel', 'assets', 'resources');
const TSC = path.join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc');

// 1. 转译（transpileModule：纯语法级，对齐 Laya IDE 宽松编译；ES5 库文件不做类型门禁）
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'js', 'sim'), { recursive: true });
const ts = require(path.join(ROOT, 'node_modules', 'typescript'));
const TFILES = [
  ['sim/stats.ts', 'js/sim/stats.js'],
  ['sim/bench-runner.ts', 'js/sim/bench-runner.js'],
  ['sim/mc-compare.ts', 'js/sim/mc-compare.js'],
  ['sim/pathfinding.ts', 'js/sim/pathfinding.js'],
  ['sim/mc-sim.ts', 'js/sim/mc-sim.js'],
  ['LayaBench_MC.ts', 'js/LayaBench_MC.js']
];
for (const [src, dstRel] of TFILES) {
  const js = ts.transpileModule(fs.readFileSync(path.join(SRC, src), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.None }
  }).outputText;
  fs.writeFileSync(path.join(OUT, dstRel), js, 'utf8');
}
// LayaBench_MC.js 是 ES 模块（export class）→ 追加挂 window，经典脚本可调
const adapterJs = path.join(OUT, 'js', 'LayaBench_MC.js');
fs.appendFileSync(adapterJs, '\n;(typeof window !== \'undefined\' ? window : globalThis).LayaBench_MC = LayaBench_MC;\n');

// 2. 引擎库
fs.mkdirSync(path.join(OUT, 'libs'), { recursive: true });
for (const f of fs.readdirSync(LIBS)) fs.copyFileSync(path.join(LIBS, f), path.join(OUT, 'libs', f));

// 3. 资源
fs.cpSync(RES, path.join(OUT, 'resources'), { recursive: true });

// 4. index.html（boot 序列对齐发布产物 js/index.js）
const html = `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0,minimum-scale=1.0,maximum-scale=1.0,user-scalable=no">
<title>LayaBench_MC 测试床（WebGL）</title>
<style>html,body{margin:0;padding:0;background:#1a1a2e;overflow:hidden}</style>
</head>
<body>
<script type="text/javascript" src="libs/laya.core.js"></script>
<script type="text/javascript" src="libs/laya.d3.js"></script>
<script type="text/javascript" src="libs/laya.webgl_2D.js"></script>
<script type="text/javascript" src="libs/laya.webgl_3D.js"></script>
<script type="text/javascript" src="libs/laya.ui2.js"></script>
<script type="text/javascript" src="js/sim/stats.js"></script>
<script type="text/javascript" src="js/sim/bench-runner.js"></script>
<script type="text/javascript" src="js/sim/mc-compare.js"></script>
<script type="text/javascript" src="js/sim/pathfinding.js"></script>
<script type="text/javascript" src="js/sim/mc-sim.js"></script>
<script type="text/javascript" src="js/LayaBench_MC.js"></script>
<script>
(function () {
  const config = JSON.parse(\`{"addons":{},"webgpu":false,
    "resolution":{"designWidth":1280,"designHeight":720,"scaleMode":"fixedheight","alignV":"top","alignH":"left","screenMode":"none","backgroundColor":"#888888"},
    "2D":{"FPS":60,"isAntialias":false,"useRetinalCanvas":false,"isAlpha":false},
    "pkgs":[{"path":"","autoLoad":true}]}\`);
  Object.assign(Laya.PlayerConfig, config);
  Object.assign(Laya.Config, config['2D']);
  let pkgs = [];
  for (let pkg of config.pkgs) {
    const path0 = pkg.path.length > 0 ? (pkg.path + '/') : pkg.path;
    if (pkg.autoLoad) pkgs.push(pkg);
  }
  Laya.addBeforeInitCallback(() => Promise.all(pkgs.map(pkg => Laya.loader.loadPackage(pkg.path))));
  Laya.init(config.resolution).then(() => {
    window.LayaBench_MC.start();
  }).catch(err => console.error('Initialization failed:', err));
})();
</script>
</body>
</html>`;
fs.writeFileSync(path.join(OUT, 'index.html'), html, 'utf8');

console.log('[setup-test-mc-laya] 测试床就绪: bench/test-mc-laya/index.html');
