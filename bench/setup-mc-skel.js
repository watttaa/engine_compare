/**
 * setup-mc-skel —— 往两个 MC 骨架工程装配引擎无关层 + MC 资源（幂等，可重复跑）
 *
 *   node bench/setup-mc-skel.js
 *
 * 产出：
 *  proj-laya-skel/
 *    src/sim/{stats,bench-runner,mc-sim,pathfinding,mc-compare}.ts   （IDE 随工程编译，全局暴露）
 *    assets/resources/mc/{body,head,weapon}/… + mc/map/1001/…        （Laya loader 运行时 URL：resources/mc/…）
 *  proj_cocos_skel/
 *    assets/scripts/sim/{stats,bench-runner,mc-sim,pathfinding,mc-compare}.js + .meta（插件脚本，全局暴露）
 *    assets/Scene/main.scene                                          （Canvas+Camera 最小场景，抄自 proj-cocos bench.scene）
 *    assets/resources/mc/…                                            （resources.load 运行时路径 mc/…）
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SIM = path.join(__dirname, 'sim-core');
const MC = path.join(__dirname, 'engines', 'mc-bench');
const MODEL = path.join(ROOT, 'model');
const LEGACY_BODY = path.join(__dirname, 'assets', 'mc-scene', 'body');
const MAP = path.join(__dirname, 'assets', 'mc-scene', 'map', '1001');

const LAYA_SKEL = path.join(ROOT, 'proj-laya-skel');
const COCOS_SKEL = path.join(ROOT, 'proj_cocos_skel');

const CHARS = ['1001', '1002', '1003', '1004', '1005', '1006', '1007', '1008'];
const WEAPONS = ['10001', '11001', '12001', '13001', '14001', '15001', '16001', '17001'];

const SIM_FILES = ['stats.js', 'bench-runner.js', 'mc-compare.js'];
const MC_SIM_FILES = ['mc-sim.js', 'pathfinding.js'];

function cp(src, dst) {
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
}

// ---------- 引擎无关层 ----------
// Laya：src/sim/*.ts（工程 TS 编译，IIFE 挂全局；ES5 代码作 TS 完全合法）
// pathfinding.js 是 browserify UMD 包，顶层 `(this, fn)` 在模块打包环境会丢 this
// → 外层再包一层 .call(window) 显式绑定，浏览器/打包两栖。
for (const f of [...SIM_FILES, ...MC_SIM_FILES]) {
  const src = MC_SIM_FILES.includes(f) ? path.join(MC, f) : path.join(SIM, f);
  let code = fs.readFileSync(src, 'utf8').replace(/\r\n/g, '\n');
  if (f === 'pathfinding.js') {
    code = ';(function () {\n' + code + '\n}).call(typeof window !== \'undefined\' ? window : globalThis);\n';
  }
  fs.mkdirSync(path.join(LAYA_SKEL, 'src', 'sim'), { recursive: true });
  fs.writeFileSync(path.join(LAYA_SKEL, 'src', 'sim', f.replace(/\.js$/, '.ts')), code, 'utf8');
}
// Cocos：assets/scripts/sim/*.js + 插件 .meta（isPlugin:true，运行时全局暴露，不进打包）
const uuid = (name) => 'mc' + Buffer.from('skel:' + name).toString('hex').slice(0, 30);
for (const f of [...SIM_FILES, ...MC_SIM_FILES]) {
  const src = MC_SIM_FILES.includes(f) ? path.join(MC, f) : path.join(SIM, f);
  const dst = path.join(COCOS_SKEL, 'assets', 'scripts', 'sim', f);
  cp(src, dst);
  const meta = {
    ver: '4.0.24', importer: 'javascript', imported: true,
    uuid: uuid(f), files: ['.js'], subMetas: {},
    userData: { loadPluginInEditor: false, loadPluginInWeb: true, loadPluginInNative: true, loadPluginInMiniGame: true, isPlugin: true }
  };
  fs.writeFileSync(dst + '.meta', JSON.stringify(meta, null, 2), 'utf8');
}

// ---------- MC 资源 ----------
// body：model/animate0 + legacy(游戏同源)/animate2；head/weapon：model/animate0；map：12 切片 + 1001.map
function resDirs() {
  const out = [];
  for (const c of CHARS) {
    out.push({ from: [path.join(MODEL, 'body', c, 'animate0.json'), path.join(MODEL, 'body', c, 'animate0.png'),
                      path.join(LEGACY_BODY, c, 'animate2.json'), path.join(LEGACY_BODY, c, 'animate2.png')],
               to: path.join('mc', 'body', c) });
    out.push({ from: [path.join(MODEL, 'head', c, 'animate0.json'), path.join(MODEL, 'head', c, 'animate0.png')],
               to: path.join('mc', 'head', c) });
  }
  for (const w of WEAPONS) {
    out.push({ from: [path.join(MODEL, 'weapon', w, 'animate0.json'), path.join(MODEL, 'weapon', w, 'animate0.png')],
               to: path.join('mc', 'weapon', w) });
  }
  return out;
}
for (const eng of [LAYA_SKEL, COCOS_SKEL]) {
  for (const e of resDirs()) {
    for (const f of e.from) cp(f, path.join(eng, 'assets', 'resources', e.to, path.basename(f)));
  }
  for (const f of fs.readdirSync(MAP)) {
    if (f === 'thumbnail.jpg' || f === '1001.msk') continue;
    cp(path.join(MAP, f), path.join(eng, 'assets', 'resources', 'mc', 'map', '1001', f));
  }
}

// ---------- Cocos 最小场景（Canvas+Camera，抄自 proj-cocos/bench.scene，无脚本引用） ----------
cp(path.join(ROOT, 'proj-cocos', 'assets', 'bench.scene'), path.join(COCOS_SKEL, 'assets', 'Scene', 'main.scene'));
fs.copyFileSync(path.join(ROOT, 'proj-cocos', 'assets', 'bench.scene.meta'),
  path.join(COCOS_SKEL, 'assets', 'Scene', 'main.scene.meta'));

// ---------- Cocos：MC JSON + 地图位图 → 插件数据脚本（规避构建期资产格式转换） ----------
// 构建产物里 .json/.map 会被转换/打包，XHR 直读不可靠；打进插件脚本随构建原样拷贝。
const mcDataJson = {};
for (const c of CHARS) {
  mcDataJson['body/' + c + '/animate0'] = JSON.parse(fs.readFileSync(path.join(MODEL, 'body', c, 'animate0.json'), 'utf8'));
  mcDataJson['body/' + c + '/animate2'] = JSON.parse(fs.readFileSync(path.join(LEGACY_BODY, c, 'animate2.json'), 'utf8'));
  mcDataJson['head/' + c + '/animate0'] = JSON.parse(fs.readFileSync(path.join(MODEL, 'head', c, 'animate0.json'), 'utf8'));
}
for (const w of WEAPONS) {
  mcDataJson['weapon/' + w + '/animate0'] = JSON.parse(fs.readFileSync(path.join(MODEL, 'weapon', w, 'animate0.json'), 'utf8'));
}
const mapBytes = Array.from(fs.readFileSync(path.join(MAP, '1001.map')));
const mcDataJs = '/* 自动生成（bench/setup-mc-skel.js）：MC JSON + 地图位图，供 CocosBench_MC 全局读取 */\n' +
  '(function (g) {\n' +
  '  g.__MC_DATA = {\n' +
  '    json: ' + JSON.stringify(mcDataJson) + ',\n' +
  '    mapBytes: [' + mapBytes.join(',') + ']\n' +
  '  };\n' +
  '})(typeof window !== \'undefined\' ? window : globalThis);\n';
const mcDataDst = path.join(COCOS_SKEL, 'assets', 'scripts', 'mc-data', 'mc-data.js');
fs.mkdirSync(path.dirname(mcDataDst), { recursive: true });
fs.writeFileSync(mcDataDst, mcDataJs, 'utf8');
fs.writeFileSync(mcDataDst + '.meta', JSON.stringify({
  ver: '4.0.24', importer: 'javascript', imported: true,
  uuid: uuid('mc-data.js'), files: ['.js'], subMetas: {},
  userData: { loadPluginInEditor: false, loadPluginInWeb: true, loadPluginInNative: true, loadPluginInMiniGame: true, isPlugin: true }
}, null, 2), 'utf8');

console.log('[setup-mc-skel] 完成：sim 层 + MC 资源 + main.scene + mc-data 已装配到两个骨架工程');
