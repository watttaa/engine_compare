// ============================================================================
// 纯 CPU 合批核心（无 GPU 依赖，可单测）。
// 累积 drawImage/drawMesh/drawRect 的顶点/索引，破批时经 onFlush 吐出一批。
// 渲染器把 onFlush 接到 GPU writeBuffer + drawIndexed。
// 顶点格式：pos2 + uv2 + color4 + texId1（9 floats）。
// 多纹理合批：一批内维护最多 MAX_TEX_SLOTS 张纹理槽，顶点带 texId 选纹理；
//   只有纹理种类超槽数、或混合模式变化、或缓冲满时才破批。关闭 multiTex 时退回
//   “纹理一变即破批”的单纹理老逻辑（texId 恒 0，textures 为空）。
// ============================================================================
export const FLOATS_PER_VERT = 9; // pos2 + uv2 + color4 + texId1
export const MAX_TEX_SLOTS = 16; // 一批最多绑定的纹理数（参考 Pixi MAX_TEXTURES=16 的业界惯例；Laya 3.4 的纹理阵列未接线，无可对齐的实现）
export class Batcher {
    constructor({ maxQuads = 16384, whiteTex = null, onFlush, multiTex = false, maxTexSlots = MAX_TEX_SLOTS } = {}) {
        this._maxVerts = maxQuads * 4;
        this._maxIdx = maxQuads * 6;
        this._white = whiteTex;
        this._onFlush = onFlush || (() => { });
        this._cpuV = new Float32Array(this._maxVerts * FLOATS_PER_VERT);
        this._cpuI = new Uint32Array(this._maxIdx);
        this._vertCount = 0;
        this._idxCount = 0;
        this._curTex = null;
        this._curBlend = 'normal';
        this._drawCalls = 0;
        this._m = null;
        this._multiTex = multiTex;
        this._slots = [];
        this._slotCount = 0;
        this._maxSlots = Math.max(1, maxTexSlots);
    }
    get drawCalls() { return this._drawCalls; }
    // 设置当前变换 {a,b,c,d,tx,ty}，作用于后续 pushImage/pushRect 的角点。
    // 变换烘进顶点 → 不破批（旋转/缩放/斜切精灵仍可合批）。null 清回单位。
    setTransform(a, b, c, d, tx, ty) {
        // 复用持久 scratch，避免每精灵 new 一个矩阵对象（40000 精灵 = 4 万对象/帧 GC）。
        // _m 仅在 setTransform 与紧随的 pushImage/_pushQuad 之间同步读取，复用安全。
        if (a == null) { this._m = null; return; }
        const m = this._mScratch || (this._mScratch = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 });
        m.a = a; m.b = b; m.c = c; m.d = d; m.tx = tx; m.ty = ty;
        this._m = m;
    }
    setBlend(mode) {
        if (mode === this._curBlend)
            return;
        this.flush();
        this._curBlend = mode;
    }
    reset() {
        this._vertCount = 0;
        this._idxCount = 0;
        this._curTex = null;
        this._curBlend = 'normal';
        this._drawCalls = 0;
        this._m = null;
        this._slotCount = 0;
    }
    // 多纹理模式：在当前批纹理槽里找 tex，找不到就新增；槽满返回 -1（需破批）。
    _slotFor(tex) {
        for (let i = 0; i < this._slotCount; i++)
            if (this._slots[i] === tex)
                return i;
        if (this._slotCount >= this._maxSlots)
            return -1;
        this._slots[this._slotCount] = tex;
        return this._slotCount++;
    }
    // 取当前 push 用的 texId（并在需要时破批）。返回槽号。
    _acquire(tex, addVerts, addIdx) {
        if (this._vertCount + addVerts > this._maxVerts || this._idxCount + addIdx > this._maxIdx)
            this.flush();
        if (!this._multiTex) {
            if (this._curTex && this._curTex !== tex)
                this.flush();
            this._curTex = tex;
            return 0;
        }
        let slot = this._slotFor(tex);
        if (slot < 0) {
            this.flush();
            slot = this._slotFor(tex);
        }
        return slot;
    }
    pushImage(texObj, sx, sy, sw, sh, dx, dy, dw, dh, tint) {
        const slot = this._acquire(texObj, 4, 6);
        const u0 = sx / texObj.w, v0 = sy / texObj.h, u1 = (sx + sw) / texObj.w, v1 = (sy + sh) / texObj.h;
        const c = tint || [1, 1, 1, 1];
        this._pushQuad(dx, dy, dw, dh, u0, v0, u1, v1, c, slot);
    }
    pushMesh(texObj, verts, uvs, indices, matrix, tint) {
        const vn = verts.length >> 1;
        const slot = this._acquire(texObj, vn, indices.length);
        const base = this._vertCount;
        const V = this._cpuV;
        let o = base * FLOATS_PER_VERT;
        const c = tint || [1, 1, 1, 1];
        const m = matrix;
        for (let i = 0; i < vn; i++) {
            const lx = verts[i * 2], ly = verts[i * 2 + 1];
            const x = m ? m.a * lx + m.c * ly + m.tx : lx;
            const y = m ? m.b * lx + m.d * ly + m.ty : ly;
            V[o++] = x;
            V[o++] = y;
            V[o++] = uvs[i * 2];
            V[o++] = uvs[i * 2 + 1];
            V[o++] = c[0];
            V[o++] = c[1];
            V[o++] = c[2];
            V[o++] = c[3];
            V[o++] = slot;
        }
        const I = this._cpuI;
        let io = this._idxCount;
        for (let i = 0; i < indices.length; i++)
            I[io++] = base + indices[i];
        this._vertCount += vn;
        this._idxCount += indices.length;
    }
    pushRect(x, y, w, h, r, g, b, a) {
        const slot = this._acquire(this._white, 4, 6);
        this._pushQuad(x, y, w, h, 0.5, 0.5, 0.5, 0.5, [r * a, g * a, b * a, a], slot);
    }
    _pushQuad(x, y, w, h, u0, v0, u1, v1, c, slot) {
        const base = this._vertCount;
        const V = this._cpuV;
        let o = base * FLOATS_PER_VERT;
        const x1 = x + w, y1 = y + h;
        const m = this._m;
        // 4 角局部坐标，按当前变换 (a,b,c,d,tx,ty) 映射到像素：X=a·lx+c·ly+tx, Y=b·lx+d·ly+ty
        const tlx = m ? m.a * x + m.c * y + m.tx : x;
        const tly = m ? m.b * x + m.d * y + m.ty : y;
        const trx = m ? m.a * x1 + m.c * y + m.tx : x1;
        const try_ = m ? m.b * x1 + m.d * y + m.ty : y;
        const blx = m ? m.a * x + m.c * y1 + m.tx : x;
        const bly = m ? m.b * x + m.d * y1 + m.ty : y1;
        const brx = m ? m.a * x1 + m.c * y1 + m.tx : x1;
        const bry = m ? m.b * x1 + m.d * y1 + m.ty : y1;
        V[o++] = tlx;
        V[o++] = tly;
        V[o++] = u0;
        V[o++] = v0;
        V[o++] = c[0];
        V[o++] = c[1];
        V[o++] = c[2];
        V[o++] = c[3];
        V[o++] = slot;
        V[o++] = trx;
        V[o++] = try_;
        V[o++] = u1;
        V[o++] = v0;
        V[o++] = c[0];
        V[o++] = c[1];
        V[o++] = c[2];
        V[o++] = c[3];
        V[o++] = slot;
        V[o++] = blx;
        V[o++] = bly;
        V[o++] = u0;
        V[o++] = v1;
        V[o++] = c[0];
        V[o++] = c[1];
        V[o++] = c[2];
        V[o++] = c[3];
        V[o++] = slot;
        V[o++] = brx;
        V[o++] = bry;
        V[o++] = u1;
        V[o++] = v1;
        V[o++] = c[0];
        V[o++] = c[1];
        V[o++] = c[2];
        V[o++] = c[3];
        V[o++] = slot;
        const I = this._cpuI;
        let io = this._idxCount;
        I[io++] = base;
        I[io++] = base + 1;
        I[io++] = base + 2;
        I[io++] = base + 2;
        I[io++] = base + 1;
        I[io++] = base + 3;
        this._vertCount += 4;
        this._idxCount += 6;
    }
    flush() {
        if (!this._idxCount) {
            this._vertCount = 0;
            this._idxCount = 0;
            this._slotCount = 0;
            this._curTex = null;
            return;
        }
        const tex0 = this._multiTex ? (this._slots[0] || this._white) : this._curTex;
        this._onFlush({
            vertices: this._cpuV, vertCount: this._vertCount,
            indices: this._cpuI, idxCount: this._idxCount,
            texture: tex0, blend: this._curBlend,
            textures: this._multiTex ? this._slots.slice(0, this._slotCount) : undefined,
        });
        this._drawCalls++;
        this._vertCount = 0;
        this._idxCount = 0;
        this._curTex = null;
        this._slotCount = 0;
    }
}
//# sourceMappingURL=batcher.js.map