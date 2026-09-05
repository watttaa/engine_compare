const { execSync } = require('child_process');
const o = execSync('"C:\\Program Files\\Git\\cmd\\git.exe" status --porcelain', { cwd: 'D:/engine_compare', encoding: 'utf8' });
const m = {};
const untrackedTop = new Set();
for (const l of o.split('\n')) {
  if (!l.trim()) continue;
  const k = l.slice(0, 2);
  m[k] = (m[k] || 0) + 1;
  if (k === '??') untrackedTop.add(l.slice(3).trim().split('/')[0]);
}
console.log('porcelain:', m);
console.log('untracked top-level:', [...untrackedTop].join(' | '));
