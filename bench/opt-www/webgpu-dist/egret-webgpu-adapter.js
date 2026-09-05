// ============================================================================
// M8 · Egret WebGPU 后端适配器（完整实现，策略 A：整体替换后端）
// ----------------------------------------------------------------------------
// 对标 egret-target-wxgame/src/org/WebGLRenderContext.ts —— 它 implements
// egret.sys.RenderContext，是引擎渲染后端的 seam（接缝）。Egret 已有两个适配器：
//   1) WebGLRenderContext  (WebGL 后端)
//   2) CanvasRenderBuffer  (Canvas2D 后端)
// 本文件是「第三适配器」：WebGPU 后端。两适配器=真接缝，加第三个不改调用方。
//
// 三层结构（对齐 egret.sys 三接口）：
//   · WebGPURenderContext  ← egret.sys.RenderContext：底层绘制原语
//   · WebGPURenderBuffer    ← egret.sys.RenderBuffer：帧缓冲 + 变换栈（src/egret-bridge.ts）
//   · WebGPUSystemRenderer  ← egret.sys.SystemRenderer：显示树遍历下发（src/egret-bridge.ts）
//
// 关键约束（见 README / docs/M8-egret-integration.md）：
//   · 单 canvas 单上下文：WebGPU 与 WebGL 互斥，不能寄生共用 gl → 整体替换后端。
//   · 微信小游戏无 navigator.gpu → 保留 WebGL 后端降级，启动探测决定实例化谁。
// ============================================================================
import { WebGPURenderer, BLEND_STATES } from './egret-webgpu.js';
import { WebGPUSystemRenderer, WebGPURenderBuffer } from './egret-bridge.js';
export { BLEND_STATES };
// Egret 数值 blend 枚举 → 字符串（对齐 egret sys.blendModeToNumber：["normal","add","erase"]）。
const BLEND_NAME = { 0: 'normal', 1: 'add', 2: 'erase' };
/**
 * WebGPU 渲染上下文。契约对应 egret.sys.RenderContext。
 * 本类是「门面」：把 RenderContext 契约方法委托给内部 WebGPURenderer。
 */
export class WebGPURenderContext {
    constructor(renderer) {
        this.renderer = renderer;
        this.surface = renderer.canvas; // egret 读 context.surface 当画布
        this.$bufferStack = [];
        this._currentBlend = 'normal';
    }
    /** 异步初始化。对应 WebGLRenderContext.getInstance（此处每 canvas 一例）。 */
    static async create(canvas) {
        const renderer = await WebGPURenderer.create(canvas);
        return new WebGPURenderContext(renderer);
    }
    get width() { return this.surface.width; }
    get height() { return this.surface.height; }
    // ---- 纹理生命周期（对应 createTexture / updateTexture）----
    /** 上传位图/图集为 GPU 纹理。bitmapData: 含 source 或直接传 source。 */
    createTexture(bitmapData, width, height) {
        const source = bitmapData && (bitmapData.source || bitmapData.$source) ? (bitmapData.source || bitmapData.$source) : bitmapData;
        return this.renderer.createTexture(source, width, height);
    }
    /** 局部更新纹理（对应 updateTexture，动态文本图集回填）。 */
    updateTexture(texObj, source, x, y, w, h) {
        this.renderer.updateTexture(texObj, source, x, y, w, h);
    }
    // ---- 帧生命周期（对应 RenderBuffer.beginRender / drawToSurface）----
    /** 开始一帧：建 encoder + render pass（清屏透明黑）。 */
    beginFrame(clear = { r: 0, g: 0, b: 0, a: 0 }) {
        this.renderer.begin(clear);
    }
    /** 结束一帧：flush 批 + 提交队列，返回 { drawCalls, gpuMs }。 */
    endFrame() {
        return this.renderer.end();
    }
    // ---- 绘制原语（对应 drawImage / drawMesh / drawRect）----
    /** 画一张（子）纹理。委托 renderer 合批。 */
    drawImage(texObj, sx, sy, sw, sh, dx, dy, dw, dh, tint) {
        this.renderer.drawImage(texObj, sx, sy, sw, sh, dx, dy, dw, dh, tint);
    }
    /** 画网格（对应 drawMesh，用于变形/九宫格/骨骼）。 */
    drawMesh(texObj, vertices, uvs, indices, matrix, tint) {
        this.renderer.drawMesh(texObj, vertices, uvs, indices, matrix, tint);
    }
    /** SDF 文字网格（距离场着色器 + uniforms 上色）。 */
    drawMeshSDF(texObj, vertices, uvs, indices, matrix, sdf, alpha) {
        this.renderer.drawMeshSDF(texObj, vertices, uvs, indices, matrix, sdf, alpha);
    }
    /** 纯色矩形（对应 drawRect）。 */
    drawRect(x, y, w, h, r, g, b, a) {
        this.renderer.drawRect(x, y, w, h, r, g, b, a);
    }
    // ---- 状态（对应 setGlobalCompositeOperation / pushMask / popMask）----
    /**
     * 混合模式。WebGPU 把混合固化进 pipeline，renderer 按模式取/建对应 pipeline（缓存）。
     * 接受字符串或 egret 数值枚举。
     */
    setBlendMode(mode) {
        const name = typeof mode === 'number' ? (BLEND_NAME[mode] || 'normal') : mode;
        if (name === this._currentBlend)
            return;
        this._currentBlend = name;
        this.renderer.setBlendMode(name);
    }
    // 别名：对齐 WebGLRenderContext 的 API 名
    setGlobalCompositeOperation(op) { this.setBlendMode(op); }
    /** 世界变换（对应 buffer.globalMatrix 烘进顶点）。 */
    setTransform(a, b, c, d, tx, ty) {
        this.renderer.setTransform(a, b, c, d, tx, ty);
    }
    /** 矩形遮罩入栈（scissor）。 */
    pushMask(x, y, w, h) { this.renderer.pushMask(x, y, w, h); }
    popMask() { this.renderer.popMask(); }
    /** 任意形状遮罩（stencil，支持嵌套）。 */
    pushMaskShape(verts, indices, matrix) { this.renderer.pushMaskShape(verts, indices, matrix); }
    popMaskShape() { this.renderer.popMaskShape(); }
    clearRect() { }
    destroy() { }
}
/** 后端选择器：小游戏/webview 无 WebGPU → 回退 WebGL。 */
export async function pickRenderContext(canvas) {
    if ('gpu' in navigator) {
        try {
            const context = await WebGPURenderContext.create(canvas);
            return { backend: 'webgpu', context, renderer: context.renderer };
        }
        catch (e) {
            console.warn('[egret] WebGPU 后端不可用，回退 WebGL:', e.message);
        }
    }
    return { backend: 'webgl' };
}
/**
 * 组装 egret.sys 三件套：把 systemRenderer / RenderBuffer 换成 WebGPU 实现。
 * 供集成层（test-game 启动脚本）在 runEgret 后调用。
 */
export function installEgretBackend(egret, context, getTexture) {
    const renderer = context.renderer;
    const systemRenderer = new WebGPUSystemRenderer(renderer, {
        nodeType: egret.sys && egret.sys.RenderNodeType,
        getTexture,
    });
    // RenderBuffer 构造函数：egret 内部 new sys.RenderBuffer(w,h)。绑定 renderer + context。
    function RenderBufferCtor(width, height) {
        const buf = new WebGPURenderBuffer(renderer, width, height);
        buf._context = context;
        return buf;
    }
    egret.sys.systemRenderer = systemRenderer;
    egret.sys.RenderBuffer = RenderBufferCtor;
    return { systemRenderer, RenderBuffer: RenderBufferCtor };
}
//# sourceMappingURL=egret-webgpu-adapter.js.map