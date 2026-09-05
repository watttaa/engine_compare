// ============================================================================
// Egret → WebGPU 后端桥接
// ----------------------------------------------------------------------------
// 提供 egret.sys.systemRenderer 与 egret.sys.RenderBuffer 两个实现：
//   egret.sys.systemRenderer  ← WebGPUSystemRenderer（本文件）
//   egret.sys.RenderBuffer    ← WebGPURenderBuffer（构造函数）
// Egret 的 Player/DisplayList 通过 systemRenderer.render(root, buffer, matrix)
// 驱动渲染，与后端无关。本文件复刻 WebGLRenderer.drawDisplayObject 的遍历主干，
// 把每个 RenderNode 下发到已验证的 WebGPURenderer（src/egret-webgpu.ts）。
//
// 遍历只依赖 Egret 公开的 $ 前缀字段（编译保留）：
//   displayObject.$children / $renderNode / $getRenderNode() / $renderDirty
//   $visible / $alpha / $maskedObject / $getConcatenatedMatrix() / $getConcatenatedAlpha()
// 位置存 matrix.tx/ty（此引擎无 $x/$y/$useTranslate），故用世界矩阵而非手动 offset 累加。
// 节点类型用固定数值常量 NODE（egret RenderNodeType 是 TS const enum，编译后运行时不存在该对象）。
//
// 本文件为纯逻辑（遍历 + 变换栈），GPU 侧全部委托传入的 renderer，
// 故可脱离浏览器用 mock renderer + mock 显示树单测。
// ============================================================================
// Egret 固定的 RenderNodeType 值（见 player/rendering/RenderNode.ts）。
// 这些数值是引擎稳定契约；egret 的 RenderNodeType 是 const enum，编译后被内联擦除，
// 运行时 egret.sys.RenderNodeType 通常为 undefined，故本常量是唯一可靠来源。
export const NODE = {
    Bitmap: 1, Text: 2, Graphics: 3, Group: 4, Mesh: 5, NormalBitmap: 6,
};
// 归一化外部注入的 RenderNodeType：同时兼容两种键名（Bitmap / BitmapNode），
// 缺失项回退到 NODE。这样即便未来某构建以 BitmapNode 键暴露该枚举也不会误判成 undefined。
function resolveNodeType(injected) {
    if (!injected)
        return NODE;
    const pick = (a, b) => (injected[a] != null ? injected[a] : (injected[b] != null ? injected[b] : NODE[a]));
    return {
        Bitmap: pick('Bitmap', 'BitmapNode'),
        Text: pick('Text', 'TextNode'),
        Graphics: pick('Graphics', 'GraphicsNode'),
        Group: pick('Group', 'GroupNode'),
        Mesh: pick('Mesh', 'MeshNode'),
        NormalBitmap: pick('NormalBitmap', 'NormalBitmapNode'),
    };
}
// Egret 数值 blend 枚举 → renderer.setBlendMode 字符串（对齐 egret sys.blendModeToNumber：["normal","add","erase"]）。
const BLEND_NAME = { 0: 'normal', 1: 'add', 2: 'erase' };
export class WebGPUSystemRenderer {
    /**
     * @param renderer  WebGPURenderer 实例（提供 drawImage/drawMesh/drawRect/setBlendMode/setTransform）
     * @param opts.nodeType  可选，注入 egret.sys.RenderNodeType（兼容 Bitmap/BitmapNode 两种键名，缺失回退 NODE）
     * @param opts.getTexture  (image) => texObj，位图→GPU 纹理缓存查找/上传
     */
    constructor(renderer, opts = {}) {
        this._drawCalls = 0;
        this._rootMatrix = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };
        this._textCache = null;
        this.r = renderer;
        this.NODE = resolveNodeType(opts.nodeType);
        this.getTexture = opts.getTexture || ((img) => img.__gpuTex || null);
        this._drawCalls = 0;
    }
    // SystemRenderer 契约：渲染整棵树，返回 drawCall 数。
    // 帧界：舞台 buffer 每帧被调一次 → 在此 begin GPU pass、遍历下发、end 提交。
    render(displayObject, buffer, matrix, forRenderTexture) {
        this._drawCalls = 0;
        this._rootMatrix = { a: matrix.a, b: matrix.b, c: matrix.c, d: matrix.d, tx: matrix.tx || 0, ty: matrix.ty || 0 };
        const framed = !forRenderTexture && this.r.begin;
        if (framed)
            this.r.begin({ r: 0, g: 0, b: 0, a: 1 });
        this._drawDisplayObject(displayObject, buffer, true);
        if (framed && this.r.end)
            this.r.end();
        return this._drawCalls;
    }
    _dumpTree(dp, depth) {
        return;
    }
    // 复刻 WebGLRenderer.drawDisplayObject 主干：每节点用世界矩阵 $getConcatenatedMatrix，
    // 再左乘根矩阵 → buffer.globalMatrix。不做手动 offset 累加（此引擎位置存 matrix.tx/ty）。
    _drawDisplayObject(dp, buffer, _isStage) {
        if (!dp.$visible || !dp.renderVisible || dp.$alpha <= 0 || dp.$maskedObject)
            return;
        if (dp.__webgpuBatchedSpriteLayer && this._drawBatchedSpriteLayer(dp, buffer))
            return;
        const NODE = this.NODE;
        const node = dp.$renderDirty && dp.$getRenderNode ? dp.$getRenderNode() : dp.$renderNode;
        if (node) {
            this._drawCalls++;
            this._setNodeTransform(dp, buffer);
            buffer.globalAlpha = dp.$getConcatenatedAlpha ? dp.$getConcatenatedAlpha() : 1;
            switch (node.type) {
                case NODE.Bitmap:
                    this._renderBitmap(node, buffer);
                    break;
                case NODE.NormalBitmap:
                    this._renderNormalBitmap(node, buffer);
                    break;
                case NODE.Mesh:
                    this._renderMesh(node, buffer, dp);
                    break;
                case NODE.Graphics:
                    this._renderGraphics(node, buffer);
                    break;
                case NODE.Text:
                    this._renderText(node, buffer);
                    break;
                case NODE.Group:
                    this._renderGroup(node, buffer);
                    break;
            }
        }
        const children = dp.$children;
        if (!children)
            return;
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            if (!child.$visible || !child.renderVisible || child.$alpha <= 0 || child.$maskedObject)
                continue;
            this._drawDisplayObject(child, buffer);
        }
    }
    _drawBatchedSpriteLayer(layer, buffer) {
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
    }
    // 世界矩阵 = rootMatrix × concatenatedMatrix，写入 buffer.globalMatrix。
    _setNodeTransform(dp, buffer) {
        const cm = dp.$getConcatenatedMatrix ? dp.$getConcatenatedMatrix() : dp.$getMatrix();
        const r = this._rootMatrix;
        // r ∘ cm （行向量右乘约定，同 egret matrix.$preMultiplyInto）
        const a = cm.a * r.a + cm.b * r.c;
        const b = cm.a * r.b + cm.b * r.d;
        const c = cm.c * r.a + cm.d * r.c;
        const d = cm.c * r.b + cm.d * r.d;
        const tx = cm.tx * r.a + cm.ty * r.c + r.tx;
        const ty = cm.tx * r.b + cm.ty * r.d + r.ty;
        // 原地写现有 globalMatrix，避免每节点 new 对象（省大量 GC）。
        const g = buffer.globalMatrix;
        g.a = a; g.b = b; g.c = c; g.d = d; g.tx = tx; g.ty = ty;
        buffer.$offsetX = 0;
        buffer.$offsetY = 0;
    }
    // ---- 节点渲染：把 buffer.globalMatrix 烘进 renderer 顶点，再下发绘制 ----
    _applyMatrix(buffer) {
        const m = buffer.globalMatrix;
        this.r.setTransform(m.a, m.b, m.c, m.d, m.tx + buffer.$offsetX, m.ty + buffer.$offsetY);
    }
    _renderBitmap(node, buffer) {
        const tex = this.getTexture(node.image);
        if (!tex)
            return;
        if (node.blendMode)
            this.r.setBlendMode(BLEND_NAME[node.blendMode] || 'normal');
        // node.drawData: [sx,sy,sw,sh,dx,dy,dw,dh] * n 个子图
        const m = node.matrix;
        if (m)
            buffer.pushLocalMatrix(m);
        this._applyMatrix(buffer);
        const d = node.drawData;
        for (let p = 0; p < d.length;) {
            this.r.drawImage(tex, d[p++], d[p++], d[p++], d[p++], d[p++], d[p++], d[p++], d[p++], tintOf(buffer, node.alpha));
        }
        if (m)
            buffer.popLocalMatrix();
        if (node.blendMode)
            this.r.setBlendMode('normal');
    }
    // NormalBitmapNode（type 6）：单图直绘，字段为 sourceX/Y/W/H + drawX/Y/W/H（无 drawData 数组）。
    // eui.Image / 无 scale9 的位图走此节点，占游戏位图绝大多数。
    _renderNormalBitmap(node, buffer) {
        const tex = this.getTexture(node.image);
        if (!tex)
            return;
        if (node.blendMode)
            this.r.setBlendMode(BLEND_NAME[node.blendMode] || 'normal');
        this._applyMatrix(buffer);
        this.r.drawImage(tex, node.sourceX, node.sourceY, node.sourceW, node.sourceH, node.drawX, node.drawY, node.drawW, node.drawH, tintOf(buffer, node.alpha));
        if (node.blendMode)
            this.r.setBlendMode('normal');
    }
    _renderMesh(node, buffer, dp) {
        // SDF 文字网格：宿主 DisplayObject 带 _sdfFilter → 用距离场着色器 + uniforms 上色。
        const isSDF = dp && dp._sdfFilter && this.r.drawMeshSDF;
        // SDF atlas 必须非预乘上传（shader 读 .r 原始距离场；预乘会把 .r 乘 alpha 破坏距离）。
        const tex = this.getTexture(node.image, !isSDF);
        if (!tex)
            return;
        const m = node.matrix;
        if (m)
            buffer.pushLocalMatrix(m);
        const gm = buffer.globalMatrix;
        const mat = { a: gm.a, b: gm.b, c: gm.c, d: gm.d, tx: gm.tx + buffer.$offsetX, ty: gm.ty + buffer.$offsetY };
        if (isSDF) {
            this.r.drawMeshSDF(tex, node.vertices, node.uvs, node.indices, mat, sdfUniformsOf(dp._sdfFilter), buffer.globalAlpha);
        }
        else {
            this.r.drawMesh(tex, node.vertices, node.uvs, node.indices, mat, tintOf(buffer, node.alpha));
        }
        if (m)
            buffer.popLocalMatrix();
    }
    _renderGraphics(node, buffer) {
        // egret 真实 GraphicsNode：drawData = Path[]，FillPath(type=1) 含 fillColor/fillAlpha
        // 与 $commands(1=moveTo,2=lineTo,3=curveTo,4=cubicCurveTo) / $data(坐标)。
        // 每个子路径(以 moveTo 分界)取包围盒填纯色矩形（矩形精确；圆角矩形/圆近似）。
        const paths = node.drawData;
        if (!paths || !paths.length)
            return;
        this._applyMatrix(buffer);
        const ga = buffer.globalAlpha;
        for (const path of paths) {
            if (!path || path.type !== 1)
                continue; // 只填充 FillPath
            const col = path.fillColor || 0;
            const r = ((col >> 16) & 0xff) / 255, g = ((col >> 8) & 0xff) / 255, b = (col & 0xff) / 255;
            const a = (path.fillAlpha == null ? 1 : path.fillAlpha) * ga;
            const cmds = path.$commands, data = path.$data;
            if (!cmds || !data)
                continue;
            let di = 0, minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9, started = false;
            for (let ci = 0; ci < cmds.length; ci++) {
                const c = cmds[ci];
                let x, y;
                if (c === 1) {
                    if (started && maxX > minX && maxY > minY)
                        this.r.drawRect(minX, minY, maxX - minX, maxY - minY, r, g, b, a);
                    minX = 1e9;
                    minY = 1e9;
                    maxX = -1e9;
                    maxY = -1e9;
                    started = false;
                    x = data[di++];
                    y = data[di++];
                }
                else if (c === 2) {
                    x = data[di++];
                    y = data[di++];
                }
                else if (c === 3) {
                    di += 2;
                    x = data[di++];
                    y = data[di++];
                }
                else if (c === 4) {
                    di += 4;
                    x = data[di++];
                    y = data[di++];
                }
                else
                    continue;
                started = true;
                if (x < minX)
                    minX = x;
                if (y < minY)
                    minY = y;
                if (x > maxX)
                    maxX = x;
                if (y > maxY)
                    maxY = y;
            }
            if (started && maxX > minX && maxY > minY)
                this.r.drawRect(minX, minY, maxX - minX, maxY - minY, r, g, b, a);
        }
    }
    _renderText(node, buffer) {
        // 原生 TextNode：drawData = [x, y, text, format] * n 行。
        // Egret WebGL/Canvas 后端都靠 Canvas2D 栅格化。此处同法：把整个 TextNode
        // 栅格到离屏 canvas → 上传为 GPU 纹理 → drawImage。按内容缓存，文本不变则复用。
        const d = node.drawData;
        if (!d || !d.length)
            return;
        const W = Math.max(1, Math.ceil(node.width || 0));
        const H = Math.max(1, Math.ceil(node.height || 0));
        if (W <= 1 || H <= 1)
            return;
        // 缓存键：尺寸 + 每行 (x,y,text,颜色/字号/粗体)
        let key = W + 'x' + H;
        for (let p = 0; p < d.length; p += 4) {
            const f = d[p + 3] || {};
            key += '|' + d[p] + ',' + d[p + 1] + ',' + d[p + 2] + ',' +
                (f.textColor != null ? f.textColor : node.textColor) + ',' +
                (f.size != null ? f.size : node.size) + ',' + (f.bold != null ? f.bold : node.bold);
        }
        this._textCache = this._textCache || new Map();
        let entry = this._textCache.get(node);
        if (!entry || entry.key !== key) {
            const cv = (entry && entry.canvas) || document.createElement('canvas');
            cv.width = W;
            cv.height = H;
            const ctx = cv.getContext('2d');
            ctx.clearRect(0, 0, W, H);
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.lineJoin = 'round';
            for (let p = 0; p < d.length;) {
                const x = d[p++], y = d[p++], text = d[p++], format = d[p++] || {};
                const italic = format.italic == null ? node.italic : format.italic;
                const bold = format.bold == null ? node.bold : format.bold;
                const size = format.size == null ? node.size : format.size;
                const fontFamily = format.fontFamily || node.fontFamily || 'sans-serif';
                ctx.font = (italic ? 'italic ' : 'normal ') + (bold ? 'bold ' : 'normal ') + size + 'px ' + fontFamily;
                const textColor = format.textColor == null ? node.textColor : format.textColor;
                const strokeColor = format.strokeColor == null ? node.strokeColor : format.strokeColor;
                const stroke = format.stroke == null ? node.stroke : format.stroke;
                if (stroke) {
                    ctx.lineWidth = stroke * 2;
                    ctx.strokeStyle = colorStr(strokeColor);
                    ctx.strokeText(text, x, y);
                }
                ctx.fillStyle = colorStr(textColor);
                ctx.fillText(text, x, y);
            }
            const tex = this.r.createTexture(cv, W, H);
            entry = { key, canvas: cv, tex };
            this._textCache.set(node, entry);
        }
        this._applyMatrix(buffer);
        this.r.drawImage(entry.tex, 0, 0, W, H, 0, 0, W, H, tintOf(buffer, node.alpha));
    }
    _renderGroup(node, buffer) {
        const list = node.drawData || [];
        for (const child of list) {
            if (child && child.type != null) {
                switch (child.type) {
                    case this.NODE.Bitmap:
                        this._renderBitmap(child, buffer);
                        break;
                    case this.NODE.Mesh:
                        this._renderMesh(child, buffer);
                        break;
                }
            }
        }
    }
    drawNodeToBuffer() { }
    renderClear() { }
}
// 顶点 tint：把 globalAlpha 折进 [r,g,b,a]（白色，预乘由 Batcher 处理）。
// 复用持久 scratch 数组，避免每精灵 new 一个数组（40000 精灵 = 4 万数组/帧 GC）。
// 返回值仅在 drawImage→pushImage→_pushQuad 内被同步读入顶点缓冲，不被持有，复用安全。
const _tintScratch = [1, 1, 1, 1];
function tintOf(buffer, nodeAlpha) {
    const na = (nodeAlpha == null || nodeAlpha !== nodeAlpha) ? 1 : nodeAlpha; // NaN → 1
    _tintScratch[3] = buffer.globalAlpha * na;
    return _tintScratch;
}
// 从 egret.CustomFilter.$uniforms 抽取 SDF 参数 → drawMeshSDF 期望的数组形。
// egret vec4 uniform = {x,y,z,w}，vec2 = {x,y}。
function sdfUniformsOf(filter) {
    const u = filter.$uniforms || filter.uniforms || {};
    const v4 = (o, def) => o ? [o.x, o.y, o.z, o.w] : def;
    const v2 = (o) => o ? [o.x, o.y] : [0, 0];
    return {
        textColor: v4(u.uTextColor, [1, 1, 1, 1]),
        strokeColor: v4(u.uStrokeColor, [0, 0, 0, 1]),
        glowColor: v4(u.uGlowColor, [0, 0, 0, 1]),
        shadowColor: v4(u.uShadowColor, [0, 0, 0, 0.5]),
        shadowOffset: v2(u.uShadowOffset),
        texSize: v2(u.uTexSize),
        boldness: u.uBoldness || 0,
        effectMask: u.uEffectMask || 0,
        strokeWidth: u.uStrokeWidth || 0,
        glowRadius: u.uGlowRadius || 0,
        shadowRadius: u.uShadowRadius || 0,
        isMSDF: u.uIsMSDF || 0,
        pxRange: u.uPxRange || 8,
    };
}
// 0xRRGGBB → 'rgb(r,g,b)'
function colorStr(color) {
    const c = (color == null || color !== color) ? 0 : color;
    return 'rgb(' + ((c >> 16) & 0xff) + ',' + ((c >> 8) & 0xff) + ',' + (c & 0xff) + ')';
}
// ============================================================================
// WebGPURenderBuffer：implements egret.sys.RenderBuffer
// 维护 globalMatrix / globalAlpha 与变换栈，把 begin/end 映射到 renderer 帧。
// ============================================================================
export class WebGPURenderBuffer {
    constructor(renderer, width, height) {
        this._surface = null;
        this._context = null;
        this._root = false;
        this.r = renderer;
        this.globalMatrix = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };
        this.globalAlpha = 1;
        this.$offsetX = 0;
        this.$offsetY = 0;
        this._matrixPool = [];
        this._w = width || 0;
        this._h = height || 0;
    }
    get width() { return this._w; }
    get height() { return this._h; }
    get surface() { return this._surface || this.r.canvas; }
    setRootMatrix(m) {
        this.globalMatrix = { a: m.a, b: m.b, c: m.c, d: m.d, tx: m.tx || 0, ty: m.ty || 0 };
        this.globalAlpha = 1;
    }
    // 右乘局部变换到 globalMatrix（对齐 Egret buffer.transform）。
    transform(a, b, c, d, tx, ty) {
        const m = this.globalMatrix;
        const na = m.a * a + m.c * b;
        const nb = m.b * a + m.d * b;
        const nc = m.a * c + m.c * d;
        const nd = m.b * c + m.d * d;
        const ntx = m.a * tx + m.c * ty + m.tx;
        const nty = m.b * tx + m.d * ty + m.ty;
        m.a = na;
        m.b = nb;
        m.c = nc;
        m.d = nd;
        m.tx = ntx;
        m.ty = nty;
    }
    saveMatrix() {
        const m = this.globalMatrix;
        return { a: m.a, b: m.b, c: m.c, d: m.d, tx: m.tx, ty: m.ty };
    }
    restoreMatrix(s) { this.globalMatrix = s; }
    pushLocalMatrix(m) {
        this._matrixPool.push(this.saveMatrix());
        this.transform(m.a, m.b, m.c, m.d, m.tx, m.ty);
    }
    popLocalMatrix() { this.globalMatrix = this._matrixPool.pop(); }
    // 舞台 buffer 的 surface = 真实 gpuCanvas。engine setClipRect → resize(stageW*canvasScaleX, ...)
    // 携带 HiDPI 放大后的 backing 尺寸；必须写进 canvas.width/height，否则 SDF 仍按逻辑分辨率渲染再被上采样 → 糊。
    resize(w, h) {
        this._w = w;
        this._h = h;
        const s = this._surface;
        if (s && (s.width !== w || s.height !== h)) {
            s.width = w;
            s.height = h;
        }
    }
    clear() { }
    destroy() { }
    // ── egret DisplayList.drawToSurface 契约方法（舞台无裁剪，空实现）──
    beginClip() { }
    endClip() { }
    setDirtyRegionPolicy() { }
    onRenderFinish() { }
    get context() { return null; }
}
//# sourceMappingURL=egret-bridge.js.map