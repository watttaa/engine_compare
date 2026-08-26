// ============================================================================
// WebGPU 后端启动注入
// ----------------------------------------------------------------------------
// 两种接法：
//   1) installWebGPUBackendNative()  —— 原生集成（当前用）：引擎已重编，setRenderMode
//      有 "webgpu" 分支。此处在 runEgret【前】预热 device 并注入 egret.sys.$webgpuBackend，
//      引擎随后同步取用：sys.RenderBuffer=注入类、sys.systemRenderer=注入实例。单画布、无叠加。
//   2) installWebGPUBackend() + r.takeOver()  —— 运行时注入（零重编，备选）：runEgret【后】
//      把 WebGPU canvas 叠加显示，替换 systemRenderer / 舞台 renderBuffer。
//
// 触摸/命中检测仍走引擎原生 canvasHitTestBuffer（Canvas2D），不受影响。
// egret canvas 用 opacity:0 隐藏（visibility:hidden 会禁用 pointer 命中 → 点不了）。
// ============================================================================
import { WebGPURenderContext } from './egret-webgpu-adapter.js';
import { WebGPUSystemRenderer, WebGPURenderBuffer } from './egret-bridge.js';
export async function installWebGPUBackend(_opts = {}) {
    if (!('gpu' in navigator)) {
        console.warn('[webgpu-boot] navigator.gpu 不可用 → 保持原生 WebGL 后端');
        return { backend: 'webgl', takeOver() { return false; } };
    }
    const egret = window.egret;
    if (!egret || !egret.sys)
        throw new Error('[webgpu-boot] egret 未加载');
    const gpuCanvas = document.createElement('canvas');
    let context;
    try {
        context = await WebGPURenderContext.create(gpuCanvas);
    }
    catch (e) {
        console.warn('[webgpu-boot] WebGPU 初始化失败 → 保持 WebGL：', e.message);
        return { backend: 'webgl', takeOver() { return false; } };
    }
    const renderer = context.renderer;
    // BitmapData → GPU 纹理缓存（Egret 真实字段：$source / source）
    const texCache = new WeakMap();
    function getTexture(bitmapData) {
        if (!bitmapData)
            return null;
        const src = bitmapData.$source || bitmapData.source ||
            (bitmapData.$bitmapData && (bitmapData.$bitmapData.$source || bitmapData.$bitmapData.source));
        if (!src || !(src.width || src.videoWidth))
            return null;
        let t = texCache.get(src);
        if (t)
            return t;
        try {
            t = renderer.createTexture(src, src.width || bitmapData.width, src.height || bitmapData.height);
        }
        catch (e) {
            return null;
        }
        texCache.set(src, t);
        return t;
    }
    const nodeType = egret.sys.RenderNodeType;
    const sysRenderer = new WebGPUSystemRenderer(renderer, { getTexture, nodeType });
    function takeOver(stage) {
        stage = stage || findStage(egret);
        if (!stage || !stage.$displayList) {
            console.warn('[webgpu-boot] 未找到 stage.$displayList，接管失败');
            return false;
        }
        const dl = stage.$displayList;
        const W = stage.$stageWidth || 640, H = stage.$stageHeight || 1136;
        const egretCanvas = document.querySelector('.egret-player canvas') || document.querySelector('canvas');
        if (!egretCanvas || !egretCanvas.width || !egretCanvas.height)
            return false;
        gpuCanvas.width = egretCanvas.width;
        gpuCanvas.height = egretCanvas.height;
        const rect = egretCanvas.getBoundingClientRect();
        gpuCanvas.style.position = 'fixed';
        gpuCanvas.style.left = rect.left + 'px';
        gpuCanvas.style.top = rect.top + 'px';
        gpuCanvas.style.width = rect.width + 'px';
        gpuCanvas.style.height = rect.height + 'px';
        gpuCanvas.style.zIndex = '10';
        gpuCanvas.style.pointerEvents = 'none';
        document.body.appendChild(gpuCanvas);
        egretCanvas.style.opacity = '0';
        console.log('[webgpu-boot] gpuCanvas', gpuCanvas.width, 'x', gpuCanvas.height, 'rect', Math.round(rect.width), 'x', Math.round(rect.height), '@', Math.round(rect.left), Math.round(rect.top));
        const gpuBuffer = new WebGPURenderBuffer(renderer, W, H);
        gpuBuffer._surface = gpuCanvas;
        gpuBuffer._context = context;
        dl.renderBuffer = gpuBuffer;
        egret.sys.systemRenderer = sysRenderer;
        console.log('[webgpu-boot] WebGPU 接管成功，stage', W, 'x', H);
        return true;
    }
    return { backend: 'webgpu', context, renderer, sysRenderer, getTexture, takeOver, gpuCanvas };
}
// ============================================================================
// 原生集成（策略 B）：引擎已重编，setRenderMode 有 "webgpu" 分支。
// 此处仅在 runEgret【前】预热 device 并注入 egret.sys.$webgpuBackend，
// 引擎随后同步取用：sys.RenderBuffer=注入类、sys.systemRenderer=注入实例。
// WebPlayer 原生 attach 我们的 gpuCanvas（buffer.surface）→ 无叠加、无 opacity hack。
// ============================================================================
export async function installWebGPUBackendNative(_opts = {}) {
    if (!('gpu' in navigator)) {
        console.warn('[webgpu-boot] navigator.gpu 不可用 → 引擎将回退 WebGL');
        return { backend: 'webgl', error: 'navigator.gpu 不存在' };
    }
    const egret = window.egret;
    if (!egret || !egret.sys)
        throw new Error('[webgpu-boot] egret 未加载');
    const gpuCanvas = document.createElement('canvas');
    let context;
    try {
        context = await WebGPURenderContext.create(gpuCanvas);
    }
    catch (e) {
        console.warn('[webgpu-boot] WebGPU 初始化失败 → 引擎回退 WebGL：', e && e.message);
        return { backend: 'webgl', error: (e && (e.message || String(e))) || 'unknown' };
    }
    const renderer = context.renderer;
    const texCache = new WeakMap();
    const texCacheRaw = new WeakMap(); // 非预乘（SDF atlas：保留 .r 原始距离场）
    function getTexture(bitmapData, premultiply = true) {
        if (!bitmapData)
            return null;
        const src = bitmapData.$source || bitmapData.source ||
            (bitmapData.$bitmapData && (bitmapData.$bitmapData.$source || bitmapData.$bitmapData.source));
        if (!src || !(src.width || src.videoWidth))
            return null;
        const cache = premultiply ? texCache : texCacheRaw;
        let t = cache.get(src);
        if (t)
            return t;
        try {
            t = renderer.createTexture(src, src.width || bitmapData.width, src.height || bitmapData.height, premultiply);
        }
        catch (e) {
            return null;
        }
        cache.set(src, t);
        return t;
    }
    const nodeType = egret.sys.RenderNodeType;
    const sysRenderer = new WebGPUSystemRenderer(renderer, { getTexture, nodeType });
    // HiDPI：与引擎 WebGL 后端保持一致的 canvasScaleFactor，保证 WebGPU/WebGL 两端
    // 渲染分辨率相同 → 性能对比公平、SDF 清晰度一致。
    // 若 HTML 配了 data-canvas-scale-factor，引擎已写入 DisplayList.$canvasScaleFactor，直接沿用；
    // 否则默认 1（不强行放大到 devicePixelRatio，避免手机 DPR=3 时 WebGPU 单方面渲染 9× 像素）。
    const existing = egret.sys.DisplayList.$canvasScaleFactor;
    if (!(existing > 0))
        egret.sys.DisplayList.$canvasScaleFactor = 1;
    // 引擎按 (width, height, root) 构造 sys.RenderBuffer；此类把 renderer/gpuCanvas 绑死。
    // 舞台 buffer（root=true）的 surface = gpuCanvas → WebPlayer 原生 attach。
    class NativeWebGPURenderBuffer extends WebGPURenderBuffer {
        constructor(width, height, root) {
            super(renderer, width, height);
            this._surface = gpuCanvas;
            this._context = context;
            this._root = !!root;
        }
    }
    egret.sys['$webgpuBackend'] = { RenderBuffer: NativeWebGPURenderBuffer, systemRenderer: sysRenderer };
    return { backend: 'webgpu', context, renderer, sysRenderer, getTexture, gpuCanvas };
}
function findStage(egret) {
    const el = document.querySelector('.egret-player');
    const player = el && el['egret-player'];
    if (player && player.stage)
        return player.stage;
    if (egret.lifecycle && egret.lifecycle.stage)
        return egret.lifecycle.stage;
    return null;
}
//# sourceMappingURL=egret-webgpu-boot.js.map