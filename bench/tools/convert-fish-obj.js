/**
 * 把 Khronos Aquarium 鱼模型 JSON → Wavefront OBJ（+ 引用贴图）
 * 用法：node bench/tools/convert-fish-obj.js
 * 输出：bench/assets/models/ 下每鱼一个 .obj（顶点/法线/UV/面）
 * OBJ 是 Cocos Creator / LayaAir 都能直接拖入场景的标准格式。
 */
'use strict';
const fs = require('fs');
const path = require('path');

const SRC = 'D:/engine_compare/aquarium/aquarium/assets';
const OUT = 'D:/engine_compare/bench/assets/models';
const FISH = ['SmallFishA', 'MediumFishA', 'MediumFishB', 'BigFishA', 'BigFishB'];

fs.mkdirSync(OUT, { recursive: true });

for (const name of FISH) {
  const srcFile = path.join(SRC, name + '.js');
  const raw = fs.readFileSync(srcFile, 'utf8');
  // 每个 .js 是：{ "models": [...] } —— 直接 JSON.parse
  const data = JSON.parse(raw);
  const model = data.models[0];
  const f = model.fields;

  const pos = f.position.data;
  const nor = f.normal.data;
  const uv = f.texCoord.data;
  const idx = f.indices.data;

  const lines = [];
  lines.push('# ' + name + ' (Khronos Aquarium)');
  lines.push('# textures: ' + JSON.stringify(model.textures));
  // 顶点（OBJ 索引从 1 开始）
  for (let i = 0; i < pos.length; i += 3) {
    lines.push(`v ${pos[i].toFixed(6)} ${pos[i + 1].toFixed(6)} ${pos[i + 2].toFixed(6)}`);
  }
  // 法线
  for (let i = 0; i < nor.length; i += 3) {
    lines.push(`vn ${nor[i].toFixed(6)} ${nor[i + 1].toFixed(6)} ${nor[i + 2].toFixed(6)}`);
  }
  // UV（OBJ v 从左上还是下？obj 约定 uv v 向下，原版可能 y-up；这里先原样导出，进引擎后看贴图朝向再翻转）
  for (let i = 0; i < uv.length; i += 2) {
    lines.push(`vt ${uv[i].toFixed(6)} ${uv[i + 1].toFixed(6)}`);
  }
  // 面（v/vt/vn 三索引，均 +1）
  for (let i = 0; i < idx.length; i += 3) {
    const a = idx[i] + 1, b = idx[i + 1] + 1, c = idx[i + 2] + 1;
    lines.push(`f ${a}/${a}/${a} ${b}/${b}/${b} ${c}/${c}/${c}`);
  }

  const out = path.join(OUT, name + '.obj');
  fs.writeFileSync(out, lines.join('\n'), 'utf8');
  console.log(`${name}: ${pos.length / 3} 顶点 ${idx.length / 3} 面 -> ${name}.obj`);
}
console.log('完成 → bench/assets/models/');
