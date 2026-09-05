/** 搭建 dist 之外的优化版资产（隔离 dist 快照还原）：
 * bench/opt-www/webgpu-dist/  ← webgpu-dist 副本 + 新版 bridge/channel
 * bench/opt-www/index-opt.html ← 入口，import 指向 ../opt-www/webgpu-dist/ */
const fs = require('fs');
const path = require('path');
const SRC = path.join(__dirname, 'web', 'dist', 'egret-webgpu', 'webgpu-dist');
const OPT = path.join(__dirname, 'opt-www', 'webgpu-dist');
const MC = path.join(__dirname, 'web', 'dist', 'egret-mc', 'index.html');
fs.mkdirSync(OPT, { recursive: true });
for (const f of fs.readdirSync(SRC)) {
  if (f.endsWith('.js') || f.endsWith('.map'))
    fs.copyFileSync(path.join(SRC, f), path.join(OPT, f));
}
// 新版 bridge：世界矩阵两级缓存（layerConcat）+ gpuTex 桥级缓存
const bridgePath = path.join(OPT, 'egret-bridge.js');
let bridge = fs.readFileSync(bridgePath, 'utf8');
if (!bridge.includes('_useLayerConcat')) {
  const lines = bridge.split('\n');
  const start = lines.findIndex(l => l.startsWith('    _drawBatchedSpriteLayer(layer, buffer) {'));
  if (start < 0) { console.error('bridge: 未定位到函数起点'); process.exit(1); }
  let end = -1;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].replace(/\r$/, '') === '    }') { end = i; break; }
  }
  if (end < 0) { console.error('bridge: 未定位到函数结尾'); process.exit(1); }
  const newFn = `    _drawBatchedSpriteLayer(layer, buffer) {
        const children = layer.$children;
        if (!children || !children.length)
            return true;
        const channel = this.r.getSpriteChannel();
        this.r._batch.flush();
        channel.beginFrame();
        // 世界矩阵两级缓存：concat(dp) = concat(layer) ∘ lm(dp)（结合律，dp 直挂 layer 下）。
        // 每帧仅 1 次 layer 级 concat（父链遍历），每 MC 6 次乘法合成（$getMatrix 无分配）。
        // 快路径等价条件（缺一即回退逐对象 concat）：
        //   dp.$parent === layer            —— 父链一致
        //   !dp.$scrollRect                 —— 引擎在 concat 尾部对 scrollRect 后乘平移修正
        //   anchor/percentAnchor 全为 0     —— 引擎在 concat 尾部后乘 -offset 平移修正
        //   this.r._useLayerConcat !== false —— A/B 对照开关
        const root = this._rootMatrix;
        const useLC = this.r._useLayerConcat !== false && !!layer.$getConcatenatedMatrix;
        let rw = null;
        if (useLC) {
            const lc = layer.$getConcatenatedMatrix();
            rw = this._rw || (this._rw = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 });
            this._composeWorld(rw, lc, root);
        }
        const w = this._wx || (this._wx = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 });
        // bitmapData → GPU 纹理桥级缓存（boot.getTexture 链式查找的二级缓存）。
        // 缓存条目带 src 校验：同一 bitmapData 的底层 source 被替换（动态图集回填）时失效重取。
        const texCache = this._gpuTexCache || (this._gpuTexCache = new WeakMap());
        for (let i = 0; i < children.length; i++) {
            const dp = children[i];
            if (!dp.$visible || !dp.renderVisible || dp.$alpha <= 0 || dp.$maskedObject || dp.$filters || dp.filters || dp.$cacheAsBitmap)
                return false;
            const lm = dp.$getMatrix ? dp.$getMatrix() : null;
            if (rw && lm && dp.$parent === layer && !dp.$scrollRect
                && !dp.$anchorOffsetX && !dp.$anchorOffsetY
                && !dp.$percentAnchorOffsetX && !dp.$percentAnchorOffsetY) {
                this._composeWorld(w, lm, rw); // = root ∘ concat(layer) ∘ lm(dp)
            }
            else {
                const cm = dp.$getConcatenatedMatrix ? dp.$getConcatenatedMatrix() : lm;
                if (cm)
                    this._composeWorld(w, cm, root);
                else { channel.skipSprite(dp); continue; } // 无法获得矩阵：占位透明，避免沿用旧 w
            }
            const frameTex = dp.$texture;
            if (!frameTex || !frameTex.$bitmapData) { channel.skipSprite(dp); continue; }
            const bd = frameTex.$bitmapData;
            const src = bd.$source || bd.source;
            let ent = texCache.get(bd);
            let gpuTex = ent && ent.src === src ? ent.t : undefined;
            if (gpuTex === undefined) {
                gpuTex = this.getTexture(bd);
                if (gpuTex)
                    texCache.set(bd, { src, t: gpuTex });
            }
            if (!gpuTex)
                return false;
            const alpha = dp.$getConcatenatedAlpha ? dp.$getConcatenatedAlpha() : 1;
            const op = dp.offsetPoint;
            if (!channel.mirrorSprite(dp, gpuTex, frameTex, op ? op.x : 0, op ? op.y : 0, w.a, w.b, w.c, w.d, w.tx, w.ty, alpha))
                return false;
        }
        channel.flush();
        this._drawCalls += channel.batchCount;
        return true;
    }
    // w = root ∘ cm（行向量右乘，同 _setNodeTransform），原地写 w 并返回
    _composeWorld(w, cm, root) {
        const mA = cm.a, mB = cm.b, mC = cm.c, mD = cm.d, mTx = cm.tx, mTy = cm.ty;
        const rA = root.a, rB = root.b, rC = root.c, rD = root.d, rTx = root.tx, rTy = root.ty;
        w.a = mA * rA + mB * rC; w.b = mA * rB + mB * rD;
        w.c = mC * rA + mD * rC; w.d = mC * rB + mD * rD;
        w.tx = mTx * rA + mTy * rC + rTx; w.ty = mTx * rB + mTy * rD + rTy;
        return w;
    }`;
  lines.splice(start, end - start + 1, newFn);
  bridge = lines.join('\n');
  fs.writeFileSync(bridgePath, bridge);
  console.log('bridge: 已写入新版 (layerConcat)');
}
else console.log('bridge: 已是新版');
// 新版 channel：12 参 mirrorSprite（桥接层预合成世界矩阵直写）
const chanPath = path.join(OPT, 'sprite-channel.js');
let chan = fs.readFileSync(chanPath, 'utf8');
if (!chan.includes('wa, wb, wc, wd, wt, wu, alpha)')) {
  // 直接按锚点重写签名段与矩阵段
  chan = chan.replace(
    'mirrorSprite(dp, gpuTex, frameTex, opX, opY, cm, root, alpha) {',
    'mirrorSprite(dp, gpuTex, frameTex, opX, opY, wa, wb, wc, wd, wt, wu, alpha) {'
  );
  chan = chan.replace(
    `        // 世界矩阵 = root ∘ cm（行向量右乘，同 _setNodeTransform）
        const mA = cm.a, mB = cm.b, mC = cm.c, mD = cm.d, mTx = cm.tx, mTy = cm.ty;
        const rA = root.a, rB = root.b, rC = root.c, rD = root.d, rTx = root.tx, rTy = root.ty;
        const wa = mA * rA + mB * rC, wb = mA * rB + mB * rD;
        const wc = mC * rA + mD * rC, wd = mC * rB + mD * rD;
        const wt = mTx * rA + mTy * rC + rTx, wu = mTx * rB + mTy * rD + rTy;`,
    `        // 世界矩阵由桥接层算好（每帧仅一次父链遍历），此处直接写入`
  );
  chan = chan.replace(
    '     * 返回 false = 需要回退通用路径。',
    `     * wa..wu:   桥接层预合成的世界矩阵 root∘layerConcat∘lm（见 bridge 两级缓存注释）。
     * 返回 false = 需要回退通用路径。`
  );
  fs.writeFileSync(chanPath, chan);
  console.log('channel: 已写入新版 (12参 mirrorSprite)');
}
else console.log('channel: 已是新版');
// 入口页
let html = fs.readFileSync(MC, 'utf8');
html = html.replace('webgpu-dist/egret-webgpu-boot.js', '../opt-www/webgpu-dist/egret-webgpu-boot.js');
fs.writeFileSync(path.join(__dirname, 'opt-www', 'index-opt.html'), html);
console.log('index-opt.html: 已生成');
// 校验
const okB = fs.readFileSync(bridgePath, 'utf8').includes('_useLayerConcat');
const okC = fs.readFileSync(chanPath, 'utf8').includes('wa, wb, wc, wd, wt, wu, alpha)');
const okH = fs.readFileSync(path.join(__dirname, 'opt-www', 'index-opt.html'), 'utf8').includes('../opt-www/webgpu-dist/');
console.log('VERIFY', JSON.stringify({ okB, okC, okH }));
if (!(okB && okC && okH)) process.exit(1);
