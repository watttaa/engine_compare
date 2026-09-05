/**
 * 把 Khronos Aquarium 鱼模型 JSON → glTF 2.0 (.glb)
 * Cocos Creator 对 glTF 支持最好，拖入即识别为模型。
 * 输出：bench/assets/models/*.glb
 */
'use strict';
const fs = require('fs');
const path = require('path');

const SRC = 'D:/engine_compare/aquarium/aquarium/assets';
const OUT = 'D:/engine_compare/bench/assets/models';
const FISH = ['SmallFishA', 'MediumFishA', 'MediumFishB', 'BigFishA', 'BigFishB'];

// ---- 最小 glTF 2.0 写入器（只含单个 mesh：position/normal/texcoord/indices）----
function buildGlb(name, fields) {
  const pos = fields.position.data;
  const nor = fields.normal.data;
  const uv = fields.texCoord.data;
  const idx = fields.indices.data;

  const vertCount = pos.length / 3;

  // 顶点数据：交错排列成 position(3) + normal(3) + uv(2) = 8 floats
  const interleaved = new Float32Array(vertCount * 8);
  for (let i = 0; i < vertCount; i++) {
    interleaved[i * 8 + 0] = pos[i * 3 + 0];
    interleaved[i * 8 + 1] = pos[i * 3 + 1];
    interleaved[i * 8 + 2] = pos[i * 3 + 2];
    interleaved[i * 8 + 3] = nor[i * 3 + 0];
    interleaved[i * 8 + 4] = nor[i * 3 + 1];
    interleaved[i * 8 + 5] = nor[i * 3 + 2];
    interleaved[i * 8 + 6] = uv[i * 2 + 0];
    interleaved[i * 8 + 7] = uv[i * 2 + 1];
  }
  // 索引（Uint16，鱼模型面数小足够）
  const indices = new Uint16Array(idx.length);
  for (let i = 0; i < idx.length; i++) indices[i] = idx[i];

  // buffer：interleaved + indices，按 4 字节对齐
  const vertBytes = interleaved.buffer;
  const idxBytes = indices.buffer;
  const idxPad = (4 - (vertBytes.byteLength % 4)) % 4;
  const totalLen = vertBytes.byteLength + idxPad + idxBytes.byteLength;
  const buffer = new ArrayBuffer(totalLen);
  const b8 = new Uint8Array(buffer);
  b8.set(new Uint8Array(vertBytes), 0);
  b8.set(new Uint8Array(idxBytes), vertBytes.byteLength + idxPad);

  const gltf = {
    asset: { version: '2.0', generator: 'aquarium-converter' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: name }],
    meshes: [{
      primitives: [{
        attributes: {
          POSITION: 0,
          NORMAL: 0,
          TEXCOORD_0: 0
        },
        indices: 1,
        mode: 4 // TRIANGLES
      }]
    }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: vertBytes.byteLength, byteStride: 32, target: 34962 },
      { buffer: 0, byteOffset: vertBytes.byteLength + idxPad, byteLength: idxBytes.byteLength, target: 34963 }
    ],
    accessors: [
      { bufferView: 0, byteOffset: 0, componentType: 5126, count: vertCount, type: 'VEC3', min: [0, 0, 0], max: [1, 1, 1] },
      { bufferView: 0, byteOffset: 12, componentType: 5126, count: vertCount, type: 'VEC3' },
      { bufferView: 0, byteOffset: 24, componentType: 5126, count: vertCount, type: 'VEC2' },
      { bufferView: 1, byteOffset: 0, componentType: 5123, count: indices.length, type: 'SCALAR' }
    ],
    buffers: [{ byteLength: totalLen }]
  };
  // 修正 accessors 0 的 min/max（POSITION 真实包围盒）
  let minx = Infinity, miny = Infinity, minz = Infinity, maxx = -Infinity, maxy = -Infinity, maxz = -Infinity;
  for (let i = 0; i < vertCount; i++) {
    minx = Math.min(minx, pos[i * 3]); maxx = Math.max(maxx, pos[i * 3]);
    miny = Math.min(miny, pos[i * 3 + 1]); maxy = Math.max(maxy, pos[i * 3 + 1]);
    minz = Math.min(minz, pos[i * 3 + 2]); maxz = Math.max(maxz, pos[i * 3 + 2]);
  }
  gltf.accessors[0].min = [minx, miny, minz];
  gltf.accessors[0].max = [maxx, maxy, maxz];

  return { gltf, buffer };
}

function writeGlb(outPath, gltf, buffer) {
  const jsonStr = JSON.stringify(gltf);
  // JSON 按 4 字节对齐，用空格填充
  let jsonPad = (4 - (jsonStr.length % 4)) % 4;
  const jsonPadded = jsonStr + ' '.repeat(jsonPad);

  const chunk1Len = jsonPadded.length;
  const chunk2Len = buffer.byteLength;

  // glb 头 12 字节 + chunk 头各 8 字节
  const total = 12 + 8 + chunk1Len + 8 + chunk2Len;
  const glb = new ArrayBuffer(total);
  const dv = new DataView(glb);
  const u8 = new Uint8Array(glb);

  // header
  u8.set([0x67, 0x6C, 0x54, 0x46], 0); // magic "glTF"
  dv.setUint32(4, 2, true); // version 2
  dv.setUint32(8, total, true); // total length

  // chunk 1: JSON
  dv.setUint32(12, chunk1Len, true);
  dv.setUint32(16, 0x4E4F534A, true); // "JSON"
  u8.set(new TextEncoder().encode(jsonPadded), 20);

  // chunk 2: BIN
  const binStart = 20 + chunk1Len;
  dv.setUint32(binStart, chunk2Len, true);
  dv.setUint32(binStart + 4, 0x004E4942, true); // "BIN\0"
  u8.set(new Uint8Array(buffer), binStart + 8);

  fs.writeFileSync(outPath, Buffer.from(glb));
}

for (const name of FISH) {
  const raw = fs.readFileSync(path.join(SRC, name + '.js'), 'utf8');
  const data = JSON.parse(raw);
  const model = data.models[0];
  const { gltf, buffer } = buildGlb(name, model.fields);
  writeGlb(path.join(OUT, name + '.glb'), gltf, buffer);
  console.log(`${name}: ${model.fields.position.data.length / 3} 顶点 -> ${name}.glb`);
}
console.log('完成 → bench/assets/models/*.glb');
