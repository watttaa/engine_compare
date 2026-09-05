// 共享 WebGPU / WebGL 初始化与工具。所有 demo 复用。
// 零依赖，ES module，需经 serve.js 以 http 加载。
/** 初始化 WebGPU：适配器→设备→canvas 上下文配置。失败抛带 code 的 Error。 */
export async function initWebGPU(canvas, { alphaMode = 'opaque' } = {}) {
    if (!('gpu' in navigator)) {
        const e = new Error('此浏览器无 navigator.gpu，不支持 WebGPU');
        e.code = 'no-webgpu';
        throw e;
    }
    const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
    if (!adapter) {
        const e = new Error('requestAdapter 返回 null');
        e.code = 'no-adapter';
        throw e;
    }
    const device = await adapter.requestDevice();
    const ctx = canvas.getContext('webgpu');
    const format = navigator.gpu.getPreferredCanvasFormat();
    ctx.configure({ device, format, alphaMode });
    return { adapter, device, ctx, format };
}
/** 初始化 WebGL2（供 M6 基准 / M7 降级用）。
 *  配置严格对齐 WebGPU 侧，遵循 toji《WebGPU/WebGL performance comparison》最佳实践：
 *  - powerPreference 一致：避免笔记本上两 API 选到不同 GPU(独显/核显)造成假差距
 *  - antialias:false：WebGPU canvas 恒为单采样，WebGL 默认多采样会多做光栅化
 *  - depth/stencil:false：2D 粒子无需深度模板，避免 WebGL 侧额外分配与清除
 *  - alpha:false 对应 WebGPU 的 alphaMode:'opaque'
 *  - preserveDrawingBuffer:false：WebGPU 无等价模式
 */
export function initWebGL2(canvas) {
    const gl = canvas.getContext('webgl2', {
        powerPreference: 'high-performance',
        antialias: false,
        alpha: false,
        depth: false,
        stencil: false,
        preserveDrawingBuffer: false,
    });
    if (!gl)
        throw new Error('WebGL2 不可用');
    return gl;
}
/** HiDPI 尺寸同步。回调收到 (w,h) 像素尺寸。返回一个立即触发的 trigger。 */
export function autoResize(canvas, onResize) {
    function apply() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
        const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
        canvas.width = w;
        canvas.height = h;
        onResize(w, h);
    }
    window.addEventListener('resize', apply);
    apply();
    return apply;
}
/** 简易 HUD：传入对象，渲染 key: value 多行。返回 update(obj) 函数。 */
export function makeHUD(el) {
    return function update(obj) {
        let html = '';
        for (const k in obj)
            html += k + ': <b>' + obj[k] + '</b><br>';
        el.innerHTML = html;
    };
}
/** 全屏错误提示。 */
export function showError(msg) {
    let e = document.getElementById('__err');
    if (!e) {
        e = document.createElement('div');
        e.id = '__err';
        e.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;font-size:15px;line-height:1.8;background:#0d1117;color:#e6edf3;z-index:99';
        document.body.appendChild(e);
    }
    e.innerHTML = msg;
}
/** 每秒采样一次的 FPS 计数器。tick() 每帧调用，读 .fps。 */
export function makeFPS() {
    let frames = 0, last = performance.now(), fps = 0;
    return {
        tick() {
            frames++;
            const now = performance.now();
            if (now - last >= 500) {
                fps = Math.round(frames * 1000 / (now - last));
                frames = 0;
                last = now;
            }
            return fps;
        },
        get fps() { return fps; },
    };
}
//# sourceMappingURL=gpu.js.map