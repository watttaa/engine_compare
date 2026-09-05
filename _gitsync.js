const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const GIT = '"C:\\Program Files\\Git\\cmd\\git.exe"';
const CWD = 'D:/engine_compare';
const g = (cmd) => execSync(`${GIT} ${cmd}`, { cwd: CWD, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

g('add -A');
const files = g('diff --cached --name-only -z').split('\0').filter(Boolean);
console.log('staged files:', files.length);
const big = [];
for (const f of files) {
  const p = path.join(CWD, f);
  let st; try { st = fs.statSync(p); } catch (e) { continue; }
  if (st.size > 30 * 1024 * 1024) big.push(f + ' (' + (st.size / 1048576).toFixed(1) + 'MB)');
}
console.log(big.length ? 'BIG FILES:\n' + big.join('\n') : 'no file >30MB ✓');
