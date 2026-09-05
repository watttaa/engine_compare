const { execSync } = require('child_process');
const GIT = '"C:\\Program Files\\Git\\cmd\\git.exe"';
const CWD = 'D:/engine_compare';
const g = (cmd) => execSync(`${GIT} ${cmd}`, { cwd: CWD, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
g('add -A');
g('commit -m "骨骼基准源码微调 + cc-stub 类型门禁桩入库;清理误提交的临时脚本"');
try { console.log('push:', g('push origin HEAD').slice(0, 300)); } catch (e) { console.log('push fail:', (e.stderr || '').slice(0, 500)); }
console.log('HEAD:', g('log --oneline -2'));
