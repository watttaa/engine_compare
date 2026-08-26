// 最终依赖检查：WebGPUDriver 的 .ts 所有相对 import 是否可解析
const fs = require('fs');
const path = require('path');

const ROOT = 'D:/engine_compare/layaair/src/layaAir/laya';
const WGPU = path.join(ROOT, 'RenderDriver/WebGPUDriver');

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.name.endsWith('.ts')) yield p;
  }
}

const missing = new Set();
let checked = 0;

for (const f of walk(WGPU)) {
  const code = fs.readFileSync(f, 'utf8');
  const re = /from\s+["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(code)) !== null) {
    const spec = m[1];
    if (!spec.startsWith('.')) continue;
    checked++;
    const abs = path.resolve(path.dirname(f), spec);
    const candidates = [abs, abs + '.js', abs + '.ts', path.join(abs, 'index.js'), path.join(abs, 'index.ts')];
    if (!candidates.some(c => fs.existsSync(c))) {
      missing.add(spec + '  <-  ' + path.relative(ROOT, f));
    }
  }
}

console.log('checked relative imports:', checked);
console.log('missing:', missing.size);
[...missing].sort().forEach(s => console.log('  ', s));
