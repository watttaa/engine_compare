// ============================================================================
// 通用 WebGPU 2D 渲染器（完整可用，非骨架）
// ----------------------------------------------------------------------------
// API 对齐 egret.sys.RenderContext 的核心绘制面，足以适配多数 2D 游戏的绘制流：
//   createTexture / drawImage / drawRect / setBlendMode / pushMask / popMask / begin / end
//
// 设计：所有四边形（精灵、纯色矩形、栅格化文本）统一成 pos2+uv2+color4 顶点，
// 批累积进一个顶点/索引缓冲；纹理/混合/遮罩变化时破批 flush。纯色矩形用 1×1
// 白纹理 + 顶点色实现，与精灵共用一条管线 → 最大化合批。
// 混合模式固化进 pipeline，按模式缓存（免 WebGL 的 save/restore）。
// 遮罩用 setScissorRect（栈式 push/pop）。
// 合批逻辑抽到纯 CPU 的 Batcher（src/batcher.ts，已单测），本类负责 GPU 侧。
// ============================================================================
import { Batcher } from './batcher.js';
const FLOATS_PER_VERT = 9; // pos2 + uv2 + color4 + texId1
const BYTES_PER_VERT = FLOATS_PER_VERT * 4;
const MAX_QUADS = 16384; // 缓冲容量以四边形数计
const MAX_VERTS = MAX_QUADS * 4; // 顶点上限
const MAX_IDX = MAX_QUADS * 6; // 索引上限 
const SHADER = /* wgsl */ `
struct U { proj: mat4x4f };
@group(0) @binding(0) var<uniform> u: U;
@group(0) @binding(1) var samp: sampler;
@group(0) @binding(2) var tex: texture_2d<f32>;
struct In  { @location(0) pos: vec2f, @location(1) uv: vec2f, @location(2) color: vec4f };
struct Out { @builtin(position) pos: vec4f, @location(0) uv: vec2f, @location(1) color: vec4f };
@vertex fn vs(i: In) -> Out {
  var o: Out; o.pos = u.proj * vec4f(i.pos, 0.0, 1.0); o.uv = i.uv; o.color = i.color; return o;
}
@fragment fn fs(i: Out) -> @location(0) vec4f {
  return textureSample(tex, samp, i.uv) * i.color;   // 预乘 alpha 由混合状态处理
}
`;
// 多纹理合批着色器：一批绑定 N 张纹理，顶点带 texId，fragment 用 switch 选纹理采样。
// WGSL 不支持动态变量索引 texture 数组，故固定 N binding + switch（兼容 iPhone Safari，
// 不依赖 texture-binding-array 可选特性）。对齐 PixiJS/LayaAir WebGPU 的主流做法。
// 纹理无 mipmap（2D 精灵图集不生成 mip，避免竖切帧串色），故用 textureSampleLevel(0)：
// 允许在非 uniform 控制流（switch 分支）调用，且明确采样 mip 0，省去导数计算。
function buildMultiShader(n) {
    let bindings = '';
    for (let k = 0; k < n; k++)
        bindings += `@group(0) @binding(${2 + k}) var tex${k}: texture_2d<f32>;\n`;
    let cases = '';
    for (let k = 0; k < n; k++)
        cases += `    case ${k}u: { return textureSampleLevel(tex${k}, samp, uv, 0.0); }\n`;
    return /* wgsl */ `
struct U { proj: mat4x4f };
@group(0) @binding(0) var<uniform> u: U;
@group(0) @binding(1) var samp: sampler;
${bindings}struct In  { @location(0) pos: vec2f, @location(1) uv: vec2f, @location(2) color: vec4f, @location(3) texId: f32 };
struct Out { @builtin(position) pos: vec4f, @location(0) uv: vec2f, @location(1) color: vec4f, @location(2) @interpolate(flat) texId: u32 };
@vertex fn vs(i: In) -> Out {
  var o: Out; o.pos = u.proj * vec4f(i.pos, 0.0, 1.0); o.uv = i.uv; o.color = i.color; o.texId = u32(i.texId + 0.5); return o;
}
fn sampleTex(id: u32, uv: vec2f) -> vec4f {
  switch id {
${cases}    default: { return textureSampleLevel(tex0, samp, uv, 0.0); }
  }
}
@fragment fn fs(i: Out) -> @location(0) vec4f {
  return sampleTex(i.texId, i.uv) * i.color;
}
`;
}
// SDF 文字着色器：距离场阈值化 + uTextColor/描边/发光/阴影。
// 移植自 libs/sdf/sdf-mesh.js 的 GLSL fragment（screenPxRange 用 fwidth 稳定抗锯齿）。
// 顶点复用主格式（pos/uv/color），color.a 作为整体 alpha 乘子。
const SDF_SHADER = /* wgsl */ `
struct U { proj: mat4x4f };
@group(0) @binding(0) var<uniform> u: U;
@group(0) @binding(1) var samp: sampler;
@group(0) @binding(2) var tex: texture_2d<f32>;
struct SU {
  textColor: vec4f, strokeColor: vec4f, glowColor: vec4f, shadowColor: vec4f,
  shadowOffset: vec2f, texSize: vec2f,
  boldness: f32, effectMask: f32, strokeWidth: f32, glowRadius: f32,
  shadowRadius: f32, isMSDF: f32, pxRange: f32, _pad: f32,
};
@group(0) @binding(3) var<uniform> su: SU;
struct In  { @location(0) pos: vec2f, @location(1) uv: vec2f, @location(2) color: vec4f };
struct Out { @builtin(position) pos: vec4f, @location(0) uv: vec2f, @location(1) color: vec4f };
@vertex fn vs(i: In) -> Out {
  var o: Out; o.pos = u.proj * vec4f(i.pos, 0.0, 1.0); o.uv = i.uv; o.color = i.color; return o;
}
fn sdfDist(t: vec4f) -> f32 {
  if (su.isMSDF > 0.5) { return max(min(t.r, t.g), min(max(t.r, t.g), t.b)); }
  return t.r;
}
@fragment fn fs(i: Out) -> @location(0) vec4f {
  let texel = textureSample(tex, samp, i.uv);
  let dist = sdfDist(texel);
  let unitRange = vec2f(su.pxRange) / su.texSize;
  let screenTexSize = vec2f(1.0) / max(fwidth(i.uv), vec2f(1e-6));
  let scrPxRange = max(0.5 * dot(unitRange, screenTexSize), 1.0);
  let alphaFill = clamp((dist - (0.5 - su.boldness)) * scrPxRange + 0.5, 0.0, 1.0);
  let hasStroke = step(0.5, (su.effectMask % 2.0));
  let hasGlow = step(0.5, (floor(su.effectMask / 2.0) % 2.0));
  let hasShadow = step(0.5, (floor(su.effectMask / 4.0) % 2.0));
  let alphaGlow = clamp((dist - (0.5 - su.glowRadius)) * scrPxRange + 0.5, 0.0, 1.0);
  let alphaStroke = clamp((dist - (0.5 - su.strokeWidth)) * scrPxRange + 0.5, 0.0, 1.0);
  let shadowTexel = textureSample(tex, samp, i.uv - su.shadowOffset);
  let shadowDist = sdfDist(shadowTexel);
  let alphaShadow = clamp((shadowDist - (0.5 - su.shadowRadius)) * scrPxRange + 0.5, 0.0, 1.0);
  let shadowA = hasShadow * alphaShadow * su.shadowColor.a;
  let glowA = hasGlow * alphaGlow * su.glowColor.a * (1.0 - alphaFill);
  let strokeA = hasStroke * alphaStroke * su.strokeColor.a * (1.0 - alphaFill);
  let fillA = alphaFill * su.textColor.a * i.color.a;
  var color = su.shadowColor.rgb;
  var alpha = shadowA;
  var oa = glowA + alpha * (1.0 - glowA);
  color = select(color, (su.glowColor.rgb * glowA + color * alpha * (1.0 - glowA)) / max(oa, 1e-3), oa > 0.001);
  alpha = oa;
  oa = strokeA + alpha * (1.0 - strokeA);
  color = select(color, (su.strokeColor.rgb * strokeA + color * alpha * (1.0 - strokeA)) / max(oa, 1e-3), oa > 0.001);
  alpha = oa;
  oa = fillA + alpha * (1.0 - fillA);
  color = select(color, (su.textColor.rgb * fillA + color * alpha * (1.0 - fillA)) / max(oa, 1e-3), oa > 0.001);
  alpha = oa;
  return vec4f(color * alpha, alpha);   // 预乘输出
}
`;
export const BLEND_STATES = {
    normal: { color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha' }, alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' } },
    add: { color: { srcFactor: 'src-alpha', dstFactor: 'one' }, alpha: { srcFactor: 'one', dstFactor: 'one' } },
    multiply: { color: { srcFactor: 'dst', dstFactor: 'zero' }, alpha: { srcFactor: 'dst-alpha', dstFactor: 'zero' } },
    // erase = destination-out：按 src alpha 抠洞（对齐 egret BlendMode.ERASE）
    erase: { color: { srcFactor: 'zero', dstFactor: 'one-minus-src-alpha' }, alpha: { srcFactor: 'zero', dstFactor: 'one-minus-src-alpha' } },
};
export class WebGPURenderer {
    constructor() {
        this.device = null;
        this.ctx = null;
        this.format = null;
        this.canvas = null;
        this.adapter = null;
        this.features = [];
        this._pipelines = new Map();
        this._samp = null;
        this._white = null;
        this._whiteView = null;
        this._ubuf = null;
        this._vbuf = null;
        this._ibuf = null;
        this._maskVbuf = null;
        this._maskIbuf = null;
        this._batch = null;
        this._scratchV = new Float32Array(4096 * FLOATS_PER_VERT); // 遮罩几何暂存
        this._scratchI = new Uint32Array(4096);
        // 帧级 staging：整帧顶点/索引先攒进 CPU 大数组，end 时一次性 writeBuffer 上传，
        // 取代每批两次 writeBuffer（1000+ 批 = 2000+ 次 API 调用）。Metal/Safari 对小 writeBuffer
        // 开销远高于 Dawn，合并后显著降 GPU 提交与驱动开销。
        this._stageV = new Float32Array(MAX_VERTS * FLOATS_PER_VERT);
        this._stageI = new Uint32Array(MAX_IDX);
        this._stageVFloats = 0; // 已写入 staging 的 float 数
        this._stageICount = 0; // 已写入 staging 的索引数
        this._enc = null;
        this._pass = null;
        // 上批已设状态缓存：连续相同则跳过 setPipeline/setBindGroup（对齐 Cocos/Laya 状态去冗余）。
        // vertex/index buffer 整帧不变 → 每帧首批设一次即可（_vbufBound 标记）。
        this._lastPipeline = null;
        this._lastBindGroup = null;
        this._vbufBound = false;
        this._maskStack = []; // 矩形 scissor 遮罩栈
        this._shapeMaskStack = [];
        this._maskDepth = 0; // 当前 stencil 遮罩嵌套深度
        this._bindCache = new WeakMap(); // tex → BindGroup
        this._blurPipe = null; // 后处理模糊管线（懒建）
        this._maskPipes = new Map(); // stencil 写入管线（按 op 缓存）
        this._depthTex = null;
        this._depthView = null;
        this._depthKey = '';
        this._useStencil = false; // 默认无 stencil 快路径；Egret 捕鱼无任意形状 mask，避免移动 GPU 每帧 depth/stencil 成本
        this._targetW = 0;
        this._targetH = 0;
        this._targetFormat = null;
        this._module = null;
        this._bgl = null;
        this._layout = null;
        this._multiTex = false;
        this._texSlots = 16; // 实际纹理槽数（= min(16, device 上限)）
        this._mModule = null;
        this._mBgl = null;
        this._mLayout = null;
        this._mPipelines = new Map();
        this._mBindSigCache = new Map(); // 槽签名 → 多纹理 BindGroup
        this._mDummyView = null; // 空槽填充（白纹理视图）
        this._sdfModule = null;
        this._sdfBgl = null;
        this._sdfLayout = null;
        this._sdfUbuf = null;
        this._sdfVbuf = null;
        this._sdfIbuf = null;
        this._gpuTimer = null;
        this._timerFrame = 0;
        this._timerInterval = 60; // timestamp-query 本身在 Safari/Metal 上开销很高；默认每 60 帧采一次，避免测量污染 FPS
        this._timedThisFrame = false;
        this._vOffset = 0;
        this._iOffset = 0;
        this._sdfVOff = 0;
        this._sdfIOff = 0;
        this._sdfUOff = 0;
        this._sdfScratch = null;
        this._blurModule = null;
        this._blurBGL = null;
        this._blurUbuf = null;
    }
    static async create(canvas) {
        const r = new WebGPURenderer();
        if (!('gpu' in navigator)) {
            const e = new Error('no-webgpu');
            e.code = 'no-webgpu';
            throw e;
        }
        // 多级回退请求适配器：部分安卓机对 high-performance 返回 null，逐级放宽最大化成功率。
        let adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
        if (!adapter)
            adapter = await navigator.gpu.requestAdapter(); // 默认
        if (!adapter)
            adapter = await navigator.gpu.requestAdapter({ powerPreference: 'low-power' }); // 集显
        if (!adapter)
            adapter = await navigator.gpu.requestAdapter({ forceFallbackAdapter: true }); // 软件兜底
        if (!adapter) {
            const e = new Error('no-adapter');
            e.code = 'no-adapter';
            throw e;
        }
        // 按 adapter 能力开启压缩纹理特性（存在才请求，避免 requestDevice 失败）
        const wanted = ['texture-compression-bc', 'texture-compression-etc2', 'texture-compression-astc'];
        const features = wanted.filter(f => adapter.features.has(f));
        if (adapter.features.has('timestamp-query'))
            features.push('timestamp-query');
        const device = await adapter.requestDevice({ requiredFeatures: features });
        const ctx = canvas.getContext('webgpu');
        const format = navigator.gpu.getPreferredCanvasFormat();
        // alphaMode:'opaque'——捕鱼背景不透明，无需让浏览器合成器把整块 canvas 与网页背景做 per-pixel 混合。
        // premultiplied 会强制合成器多走一遍全屏 alpha 合成，高 DPR(小米 DPR=3=260万像素)下是可观的填充率浪费。
        ctx.configure({ device, format, alphaMode: 'opaque' });
        r.device = device;
        r.ctx = ctx;
        r.format = format;
        r.canvas = canvas;
        r.adapter = adapter;
        r.features = features; // 已启用的压缩纹理特性
        r._module = device.createShaderModule({ code: SHADER });
        r._bgl = device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform' } },
                { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
                { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
            ],
        });
        r._layout = device.createPipelineLayout({ bindGroupLayouts: [r._bgl] });
        // 多纹理合批：槽数按 device 能力协商（对齐行业标准，不写死 16）。
        // maxSampledTexturesPerShaderStage 保证 ≥16，取 min(16, limit) 留余量给 sampler/uniform。
        r._multiTex = WebGPURenderer.MULTI_TEX;
        if (r._multiTex) {
            const limit = device.limits.maxSampledTexturesPerShaderStage || 16;
            r._texSlots = Math.max(1, Math.min(16, limit));
            r._mModule = device.createShaderModule({ code: buildMultiShader(r._texSlots) });
            const mEntries = [
                { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform' } },
                { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
            ];
            for (let k = 0; k < r._texSlots; k++)
                mEntries.push({ binding: 2 + k, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } });
            r._mBgl = device.createBindGroupLayout({ entries: mEntries });
            r._mLayout = device.createPipelineLayout({ bindGroupLayouts: [r._mBgl] });
        }
        // SDF 文字：额外一个 fragment uniform（binding 3）承载 SDF 参数
        r._sdfModule = device.createShaderModule({ code: SDF_SHADER });
        r._sdfBgl = device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform' } },
                { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
                { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
                { binding: 3, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
            ],
        });
        r._sdfLayout = device.createPipelineLayout({ bindGroupLayouts: [r._sdfBgl] });
        r._sdfUbuf = device.createBuffer({ size: 256 * 256, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        // SDF 专用顶点/索引缓冲：不复用 batcher 的 _vbuf/_ibuf（后者累进游标，offset 0 覆盖会毁批数据）
        r._sdfVbuf = device.createBuffer({ size: MAX_VERTS * BYTES_PER_VERT, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
        r._sdfIbuf = device.createBuffer({ size: MAX_IDX * 4, usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST });
        r._samp = device.createSampler({ magFilter: 'linear', minFilter: 'linear' });
        r._ubuf = device.createBuffer({ size: 64, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        r._vbuf = device.createBuffer({ size: MAX_VERTS * BYTES_PER_VERT, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
        r._ibuf = device.createBuffer({ size: MAX_IDX * 4, usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST });
        // 遮罩几何专用小缓冲：与精灵 staging 解耦，避免延迟批量上传时被覆盖。
        r._maskVbuf = device.createBuffer({ size: 4096 * BYTES_PER_VERT, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
        r._maskIbuf = device.createBuffer({ size: 4096 * 4, usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST });
        // 1×1 白纹理（供纯色矩形复用）
        r._white = device.createTexture({ size: [1, 1], format: 'rgba8unorm', usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST });
        device.queue.writeTexture({ texture: r._white }, new Uint8Array([255, 255, 255, 255]), { bytesPerRow: 4 }, [1, 1]);
        r._whiteView = r._white.createView();
        r._mDummyView = r._whiteView; // 多纹理空槽用白纹理视图填充
        const whiteObj = { tex: r._white, view: r._whiteView, w: 1, h: 1 };
        // 合批核心：破批时经 onFlush 落到 GPU
        r._batch = new Batcher({ maxQuads: MAX_QUADS, whiteTex: whiteObj, multiTex: r._multiTex, onFlush: (rec) => r._emit(rec) });
        // GPU 计时（timestamp-query）：与 WebGL timer_query 对等口径（纯 GPU 执行时间戳）。
        r._gpuTimer = null;
        if (device.features.has('timestamp-query')) {
            r._gpuTimer = {
                querySet: device.createQuerySet({ type: 'timestamp', count: 2 }),
                resolveBuf: device.createBuffer({ size: 16, usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC }),
                readBuf: device.createBuffer({ size: 16, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ }),
                busy: false, lastMs: null,
            };
        }
        return r;
    }
    _pipeline(blend) {
        const fmt = this._targetFormat || this.format;
        const key = blend + '|' + fmt + '|' + (this._useStencil ? 'stencil' : 'plain');
        const cached = this._pipelines.get(key);
        if (cached)
            return cached;
        const p = this.device.createRenderPipeline({
            layout: this._layout,
            vertex: {
                module: this._module, entryPoint: 'vs', buffers: [{
                        arrayStride: BYTES_PER_VERT, attributes: [
                            { shaderLocation: 0, offset: 0, format: 'float32x2' },
                            { shaderLocation: 1, offset: 8, format: 'float32x2' },
                            { shaderLocation: 2, offset: 16, format: 'float32x4' },
                        ],
                    }],
            },
            fragment: { module: this._module, entryPoint: 'fs', targets: [{ format: fmt, blend: BLEND_STATES[blend] || BLEND_STATES.normal }] },
            primitive: { topology: 'triangle-list' },
            ...(this._useStencil ? {
                // stencil：ref <= 存储值 时通过 → 只在遮罩区（含嵌套）内绘制；无遮罩时 ref=0 全通过
                depthStencil: {
                    format: 'depth24plus-stencil8', depthWriteEnabled: false, depthCompare: 'always',
                    stencilFront: { compare: 'less-equal', passOp: 'keep', failOp: 'keep', depthFailOp: 'keep' },
                    stencilBack: { compare: 'less-equal', passOp: 'keep', failOp: 'keep', depthFailOp: 'keep' },
                    stencilReadMask: 0xFF, stencilWriteMask: 0x00,
                },
            } : {}),
        });
        this._pipelines.set(key, p);
        return p;
    }
    // 多纹理管线：顶点属性含 texId(loc3)，fragment 用 16-tex switch。
    _mPipeline(blend) {
        const fmt = this._targetFormat || this.format;
        const key = blend + '|' + fmt + '|' + (this._useStencil ? 'stencil' : 'plain');
        const cached = this._mPipelines.get(key);
        if (cached)
            return cached;
        const p = this.device.createRenderPipeline({
            layout: this._mLayout,
            vertex: {
                module: this._mModule, entryPoint: 'vs', buffers: [{
                        arrayStride: BYTES_PER_VERT, attributes: [
                            { shaderLocation: 0, offset: 0, format: 'float32x2' },
                            { shaderLocation: 1, offset: 8, format: 'float32x2' },
                            { shaderLocation: 2, offset: 16, format: 'float32x4' },
                            { shaderLocation: 3, offset: 32, format: 'float32' },
                        ],
                    }],
            },
            fragment: { module: this._mModule, entryPoint: 'fs', targets: [{ format: fmt, blend: BLEND_STATES[blend] || BLEND_STATES.normal }] },
            primitive: { topology: 'triangle-list' },
            ...(this._useStencil ? {
                depthStencil: {
                    format: 'depth24plus-stencil8', depthWriteEnabled: false, depthCompare: 'always',
                    stencilFront: { compare: 'less-equal', passOp: 'keep', failOp: 'keep', depthFailOp: 'keep' },
                    stencilBack: { compare: 'less-equal', passOp: 'keep', failOp: 'keep', depthFailOp: 'keep' },
                    stencilReadMask: 0xFF, stencilWriteMask: 0x00,
                },
            } : {}),
        });
        this._mPipelines.set(key, p);
        return p;
    }
    // 多纹理 BindGroup：按批槽组合缓存（键=槽签名）。空槽用白纹理填充。
    _mBindFor(textures) {
        const sig = texSig(textures);
        const cached = this._mBindSigCache.get(sig);
        if (cached)
            return cached;
        const entries = [
            { binding: 0, resource: { buffer: this._ubuf } },
            { binding: 1, resource: this._samp },
        ];
        for (let k = 0; k < this._texSlots; k++) {
            entries.push({ binding: 2 + k, resource: k < textures.length ? textures[k].view : this._mDummyView });
        }
        const bg = this.device.createBindGroup({ layout: this._mBgl, entries });
        this._mBindSigCache.set(sig, bg);
        return bg;
    }
    _maskPipeline(op) {
        const fmt = this._targetFormat || this.format;
        const key = op + '|' + fmt;
        const cached = this._maskPipes.get(key);
        if (cached)
            return cached;
        const passOp = op === 'incr' ? 'increment-clamp' : 'decrement-clamp';
        const p = this.device.createRenderPipeline({
            layout: this._layout,
            vertex: {
                module: this._module, entryPoint: 'vs', buffers: [{
                        arrayStride: BYTES_PER_VERT, attributes: [
                            { shaderLocation: 0, offset: 0, format: 'float32x2' },
                            { shaderLocation: 1, offset: 8, format: 'float32x2' },
                            { shaderLocation: 2, offset: 16, format: 'float32x4' },
                        ],
                    }],
            },
            fragment: { module: this._module, entryPoint: 'fs', targets: [{ format: fmt, writeMask: 0 }] },
            primitive: { topology: 'triangle-list' },
            depthStencil: {
                format: 'depth24plus-stencil8', depthWriteEnabled: false, depthCompare: 'always',
                // 只在父遮罩区（stencil == 父深度）内增减，保证嵌套正确
                stencilFront: { compare: 'equal', passOp, failOp: 'keep', depthFailOp: 'keep' },
                stencilBack: { compare: 'equal', passOp, failOp: 'keep', depthFailOp: 'keep' },
                stencilReadMask: 0xFF, stencilWriteMask: 0xFF,
            },
        });
        this._maskPipes.set(key, p);
        return p;
    }
    _ensureDepth(w, h) {
        const key = w + 'x' + h;
        if (this._depthKey === key && this._depthTex)
            return;
        if (this._depthTex)
            this._depthTex.destroy();
        this._depthTex = this.device.createTexture({
            size: [w, h], format: 'depth24plus-stencil8', usage: GPUTextureUsage.RENDER_ATTACHMENT,
        });
        this._depthView = this._depthTex.createView(); // 缓存 view，免每帧 createView
        this._depthKey = key;
    }
    _bindFor(texView) {
        // BindGroup 按纹理视图缓存（ubuf/sampler 固定）。免每帧每批重建 → 降 CPU 驱动开销。
        let bg = this._bindCache.get(texView);
        if (bg)
            return bg;
        bg = this.device.createBindGroup({
            layout: this._bgl, entries: [
                { binding: 0, resource: { buffer: this._ubuf } },
                { binding: 1, resource: this._samp },
                { binding: 2, resource: texView },
            ],
        });
        this._bindCache.set(texView, bg);
        return bg;
    }
    /** 上传位图为 GPU 纹理。source: ImageBitmap | HTMLCanvasElement | HTMLImageElement。 */
    createTexture(source, width, height, premultiply = true) {
        const w = width || source.width, h = height || source.height;
        // 注意：2D 精灵图集（SpriteSheet 竖切帧）不生成 mipmap —— 低 mip 会跨帧混色导致缩小时串色/发虚。
        // 这是 Pixi/Laya 对 sprite sheet 的默认做法。靠 linear magFilter 已足够，缩放范围小无需 mip。
        const tex = this.device.createTexture({
            size: [w, h], format: 'rgba8unorm',
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
        });
        this.device.queue.copyExternalImageToTexture({ source }, { texture: tex, premultipliedAlpha: premultiply }, [w, h]);
        return { tex, view: tex.createView(), w, h };
    }
    /** 局部更新纹理（动态文本图集回填）。 */
    updateTexture(texObj, source, x, y, w, h) {
        this.device.queue.copyExternalImageToTexture({ source }, { texture: texObj.tex, origin: [x, y], premultipliedAlpha: true }, [w, h]);
    }
    /** 创建离屏渲染目标（RenderTarget），可作为 begin 的目标，也可当纹理被 drawImage 采样。 */
    createRenderTarget(w, h) {
        const tex = this.device.createTexture({
            size: [w, h], format: 'rgba8unorm',
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_DST,
        });
        return { tex, view: tex.createView(), w, h, isRT: true };
    }
    /**
     * 上传压缩纹理（BC/ETC2/ASTC，GPU 直接采样，省显存省带宽）。
     *   data:   压缩块字节（Uint8Array）
     *   format: 如 'bc3-rgba-unorm' / 'etc2-rgba8unorm' / 'astc-4x4-unorm'
     *   blockW/blockH: 块像素尺寸（BC/ETC2=4，ASTC 视 footprint）
     *   blockBytes: 每块字节（BC1/ETC2-rgb8=8，BC3/ASTC-4x4=16）
     * 需对应特性已启用（见 create 的 requiredFeatures，可查 renderer.features）。
     */
    createCompressedTexture(data, format, w, h, blockW = 4, blockH = 4, blockBytes = 16) {
        const tex = this.device.createTexture({
            size: [w, h], format,
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
        });
        const bytesPerRow = Math.ceil(w / blockW) * blockBytes;
        this.device.queue.writeTexture({ texture: tex }, data, { bytesPerRow, rowsPerImage: Math.ceil(h / blockH) }, [w, h]);
        return { tex, view: tex.createView(), w, h, compressed: true };
    }
    // ---- 后处理：高斯模糊（分离式，水平/垂直各一趟）----
    _ensureBlur() {
        if (this._blurPipe)
            return;
        const code = /* wgsl */ `
      @group(0) @binding(0) var samp: sampler;
      @group(0) @binding(1) var tex: texture_2d<f32>;
      struct BU { dir: vec2f, pad: vec2f };
      @group(0) @binding(2) var<uniform> bu: BU;
      struct VO { @builtin(position) pos: vec4f, @location(0) uv: vec2f };
      @vertex fn vs(@builtin(vertex_index) i: u32) -> VO {
        var p = array<vec2f,3>(vec2f(-1,-1), vec2f(3,-1), vec2f(-1,3));
        var o: VO; let xy = p[i]; o.pos = vec4f(xy, 0, 1);
        o.uv = vec2f((xy.x+1)*0.5, (1-xy.y)*0.5); return o;
      }
      @fragment fn fs(v: VO) -> @location(0) vec4f {
        var w = array<f32,5>(0.227, 0.194, 0.121, 0.054, 0.016);
        var col = textureSample(tex, samp, v.uv) * w[0];
        for (var k = 1; k < 5; k = k + 1) {
          let off = bu.dir * f32(k);
          col = col + textureSample(tex, samp, v.uv + off) * w[k];
          col = col + textureSample(tex, samp, v.uv - off) * w[k];
        }
        return col;
      }`;
        this._blurModule = this.device.createShaderModule({ code });
        this._blurBGL = this.device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
                { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
                { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
            ],
        });
        const layout = this.device.createPipelineLayout({ bindGroupLayouts: [this._blurBGL] });
        this._blurPipe = this.device.createRenderPipeline({
            layout,
            vertex: { module: this._blurModule, entryPoint: 'vs' },
            fragment: { module: this._blurModule, entryPoint: 'fs', targets: [{ format: 'rgba8unorm' }] },
            primitive: { topology: 'triangle-list' },
        });
        this._blurUbuf = this.device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    }
    /** 单趟模糊：把 src 采样后写入 dst。stepX/stepY 为 uv 步长（= 半径/宽高）。独立提交。 */
    blurPass(src, dst, stepX, stepY) {
        this._ensureBlur();
        this.device.queue.writeBuffer(this._blurUbuf, 0, new Float32Array([stepX, stepY, 0, 0]));
        const enc = this.device.createCommandEncoder();
        const pass = enc.beginRenderPass({
            colorAttachments: [{
                    view: dst.view, clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: 'clear', storeOp: 'store',
                }],
        });
        pass.setPipeline(this._blurPipe);
        pass.setBindGroup(0, this.device.createBindGroup({
            layout: this._blurBGL, entries: [
                { binding: 0, resource: this._samp },
                { binding: 1, resource: src.view },
                { binding: 2, resource: { buffer: this._blurUbuf } },
            ],
        }));
        pass.draw(3);
        pass.end();
        this.device.queue.submit([enc.finish()]);
    }
    // ---- 帧生命周期 ----
    begin(clear = { r: 0.05, g: 0.07, b: 0.09, a: 1 }, target = null) {
        const W = target ? target.w : this.canvas.width;
        const H = target ? target.h : this.canvas.height;
        this._targetW = W;
        this._targetH = H;
        this._targetFormat = target ? 'rgba8unorm' : this.format;
        const passDesc = {
            colorAttachments: [{ view: target ? target.view : this.ctx.getCurrentTexture().createView(), clearValue: clear, loadOp: 'clear', storeOp: 'store' }],
        };
        if (this._useStencil) {
            this._ensureDepth(W, H);
            passDesc.depthStencilAttachment = {
                view: this._depthView,
                depthClearValue: 1, depthLoadOp: 'clear', depthStoreOp: 'discard',
                stencilClearValue: 0, stencilLoadOp: 'clear', stencilStoreOp: 'discard',
            };
        }
        this.device.queue.writeBuffer(this._ubuf, 0, orthoTopLeft(W, H).buffer);
        this._enc = this.device.createCommandEncoder();
        // GPU 计时：pass 首尾写时间戳（仅当未在读回中，避免竞态）
        this._timedThisFrame = false;
        this._timerFrame++;
        if (this._gpuTimer && !this._gpuTimer.busy && (this._timerFrame % this._timerInterval === 0)) {
            passDesc.timestampWrites = {
                querySet: this._gpuTimer.querySet,
                beginningOfPassWriteIndex: 0, endOfPassWriteIndex: 1,
            };
            this._timedThisFrame = true;
        }
        this._pass = this._enc.beginRenderPass(passDesc);
        this._maskDepth = 0;
        this._shapeMaskStack.length = 0;
        if (this._useStencil)
            this._pass.setStencilReference(0);
        this._vOffset = 0; // 顶点/索引写入偏移（多批累加，避免 offset 0 覆盖）
        this._iOffset = 0;
        this._stageVFloats = 0;
        this._stageICount = 0; // 帧级 staging 游标
        this._lastPipeline = null;
        this._lastBindGroup = null;
        this._vbufBound = false; // 状态缓存重置
        this._sdfVOff = 0;
        this._sdfIOff = 0;
        this._sdfUOff = 0; // SDF 专用环形游标（同帧多字不覆盖）
        this._batch.reset();
    }
    end() {
        const cpuStart = performance.now();
        this._batch.flush();
        // 整帧顶点/索引一次性上传（取代每批 writeBuffer）。draw 已录入 pass，
        // GPU 在 submit 后执行时读取的即为此完整数据。
        if (this._stageVFloats > 0) {
            this.device.queue.writeBuffer(this._vbuf, 0, this._stageV.buffer, 0, this._stageVFloats * 4);
            this.device.queue.writeBuffer(this._ibuf, 0, this._stageI.buffer, 0, this._stageICount * 4);
        }
        this._pass.end();
        const t = this._gpuTimer;
        if (t && this._timedThisFrame) {
            this._enc.resolveQuerySet(t.querySet, 0, 2, t.resolveBuf, 0);
            this._enc.copyBufferToBuffer(t.resolveBuf, 0, t.readBuf, 0, 16);
        }
        this.device.queue.submit([this._enc.finish()]);
        const submitMs = performance.now() - cpuStart;
        this._lastSubmitCpuMs = submitMs;
        // 累计法：iOS Safari 把 performance.now() 精度钳到 ~1ms，单帧 submit(<0.1ms) 全被截成 0。
        // 累加多帧再由采样端除以帧数 → 平均值可穿透精度钳制，得到可信的每帧 CPU 提交耗时。
        this._cpuSubmitAccum = (this._cpuSubmitAccum || 0) + submitMs;
        this._cpuSubmitFrames = (this._cpuSubmitFrames || 0) + 1;
        if (t && this._timedThisFrame) {
            t.busy = true;
            t.readBuf.mapAsync(GPUMapMode.READ).then(() => {
                const ts = new BigUint64Array(t.readBuf.getMappedRange().slice(0));
                t.readBuf.unmap();
                t.lastMs = Number(ts[1] - ts[0]) / 1e6; // ns → ms（纯 GPU pass 执行时间）
                t.busy = false;
            }).catch(() => { t.busy = false; });
        }
        const drawCalls = this._batch.drawCalls;
        this._lastBatchCount = drawCalls;
        this._lastDrawCalls = drawCalls;
        this._pass = null;
        this._enc = null;
        return { drawCalls, gpuMs: t ? t.lastMs : null };
    }
    setBlendMode(mode) {
        this._batch.setBlend(mode);
    }
    // 设置当前世界变换（对齐 Egret buffer.globalMatrix）。调用序：先 setTransform 再 drawImage/drawRect。
    // 变换烘进顶点 → 旋转/缩放/斜切精灵仍与其它同纹理精灵合批。null 清回单位。
    setTransform(a, b, c, d, tx, ty) {
        this._batch.setTransform(a, b, c, d, tx, ty);
    }
    // Batcher 破批回调：把一批顶点/索引落到 GPU 大缓冲的递增偏移处并 drawIndexed。
    // 关键：多批写同一 buffer 必须用递增 offset，否则后批覆盖前批（WebGPU 延迟提交下会画错+串行化）。
    _emit(rec) {
        const vBytes = rec.vertCount * BYTES_PER_VERT;
        const iCount = rec.idxCount;
        const vFloats = rec.vertCount * FLOATS_PER_VERT;
        // 容量兜底：超出则回绕（极端负载，正常帧不会触发）
        if (this._stageVFloats + vFloats > MAX_VERTS * FLOATS_PER_VERT)
            this._stageVFloats = 0;
        if (this._stageICount + iCount > MAX_IDX)
            this._stageICount = 0;
        const vByteOff = (this._stageVFloats / FLOATS_PER_VERT) * BYTES_PER_VERT;
        const iOff = this._stageICount;
        const baseVertex = this._stageVFloats / FLOATS_PER_VERT;
        // CPU 侧攒进帧级 staging（不发 writeBuffer）——end 时整段一次上传。
        this._stageV.set(rec.vertices.subarray(0, vFloats), this._stageVFloats);
        this._stageI.set(rec.indices.subarray(0, iCount), this._stageICount);
        // 顶点/索引缓冲整帧不变：每帧首批设一次，后续批跳过。
        if (!this._vbufBound) {
            this._pass.setVertexBuffer(0, this._vbuf);
            this._pass.setIndexBuffer(this._ibuf, 'uint32');
            this._vbufBound = true;
        }
        // pipeline/bindGroup 与上批相同则不重设（去冗余命令录制）。
        const pipe = this._multiTex && rec.textures ? this._mPipeline(rec.blend) : this._pipeline(rec.blend);
        if (pipe !== this._lastPipeline) {
            this._pass.setPipeline(pipe);
            this._lastPipeline = pipe;
        }
        const bg = this._multiTex && rec.textures ? this._mBindFor(rec.textures) : this._bindFor(rec.texture.view);
        if (bg !== this._lastBindGroup) {
            this._pass.setBindGroup(0, bg);
            this._lastBindGroup = bg;
        }
        this._pass.drawIndexed(iCount, 1, iOff, baseVertex);
        this._stageVFloats += vFloats;
        this._stageICount += iCount;
    }
    /** 画（子）纹理。dst 为 canvas 像素坐标。委托 Batcher 合批。 */
    drawImage(texObj, sx, sy, sw, sh, dx, dy, dw, dh, tint) {
        this._batch.pushImage(texObj, sx, sy, sw, sh, dx, dy, dw, dh, tint);
    }
    /**
     * 画三角网格（对应 Egret drawMesh，用于骨骼动画 / 网格变形 / 九宫格）。
     *   verts:   局部坐标 [x0,y0,x1,y1,...]
     *   uvs:     纹理坐标 [u0,v0,...]（0..1，图集内子纹理由调用方换算）
     *   indices: 三角索引 [i0,i1,i2,...]
     *   matrix:  {a,b,c,d,tx,ty} 局部→canvas 像素，null 表示已是像素坐标
     *   tint:    [r,g,b,a] 顶点色（预乘由调用方保证），默认白
     * 与精灵共用同一顶点格式与管线 → 同纹理同混合可与精灵合批。
     */
    drawMesh(texObj, verts, uvs, indices, matrix, tint) {
        this._batch.pushMesh(texObj, verts, uvs, indices, matrix, tint);
    }
    /** 纯色矩形（复用 1×1 白纹理 + 顶点色，预乘由 Batcher 处理）。 */
    drawRect(x, y, w, h, r, g, b, a) {
        this._batch.pushRect(x, y, w, h, r, g, b, a);
    }
    _flush() { this._batch.flush(); }
    // ---- 遮罩（scissor，栈式）----
    pushMask(x, y, w, h) {
        this._flush();
        this._maskStack.push([x, y, w, h]);
        this._pass.setScissorRect(x | 0, y | 0, Math.max(0, w | 0), Math.max(0, h | 0));
    }
    popMask() {
        this._flush();
        this._maskStack.pop();
        const prev = this._maskStack[this._maskStack.length - 1];
        if (prev)
            this._pass.setScissorRect(prev[0] | 0, prev[1] | 0, prev[2] | 0, prev[3] | 0);
        else
            this._pass.setScissorRect(0, 0, this._targetW || this.canvas.width, this._targetH || this.canvas.height);
    }
    // ---- 任意形状遮罩（stencil，栈式，支持嵌套）----
    /**
     * 用三角形几何做遮罩（对应 Egret 的 mask 显示对象，非矩形）。
     *   verts/indices/matrix 同 drawMesh。之后的绘制只在该形状内可见。
     */
    pushMaskShape(verts, indices, matrix) {
        if (!this._useStencil) {
            // 首次遇到任意形状遮罩时启用 stencil。下一帧起使用带 stencil 的 pipeline/pass；
            // 当前帧先安全 flush，避免无 depthStencilAttachment 时调用 stencil API 崩溃。
            this._flush();
            this._useStencil = true;
            return;
        }
        this._flush();
        const parent = this._maskDepth;
        // 在父遮罩区（stencil==parent）内把 stencil +1
        this._drawMaskGeo(verts, indices, matrix, 'incr', parent);
        this._maskDepth = parent + 1;
        this._shapeMaskStack.push({ verts, indices, matrix });
        this._pass.setStencilReference(this._maskDepth);
    }
    popMaskShape() {
        if (!this._useStencil)
            return;
        this._flush();
        const m = this._shapeMaskStack.pop();
        const cur = this._maskDepth; // 待撤销的深度
        if (m)
            this._drawMaskGeo(m.verts, m.indices, m.matrix, 'decr', cur); // 在 stencil==cur 区 -1
        this._maskDepth = cur - 1;
        this._pass.setStencilReference(this._maskDepth);
    }
    // 把遮罩几何写入 stencil（不写颜色）。ref 为 compare 'equal' 的参考值（父深度）。
    _drawMaskGeo(verts, indices, matrix, op, ref) {
        const vn = verts.length >> 1;
        const V = this._scratchV;
        let o = 0;
        const m = matrix;
        for (let i = 0; i < vn; i++) {
            const lx = verts[i * 2], ly = verts[i * 2 + 1];
            const x = m ? m.a * lx + m.c * ly + m.tx : lx;
            const y = m ? m.b * lx + m.d * ly + m.ty : ly;
            V[o++] = x;
            V[o++] = y;
            V[o++] = 0;
            V[o++] = 0;
            V[o++] = 0;
            V[o++] = 0;
            V[o++] = 0;
            V[o++] = 0;
            V[o++] = 0;
        }
        const I = this._scratchI;
        for (let i = 0; i < indices.length; i++)
            I[i] = indices[i];
        this.device.queue.writeBuffer(this._maskVbuf, 0, V.buffer, 0, vn * BYTES_PER_VERT);
        this.device.queue.writeBuffer(this._maskIbuf, 0, I.buffer, 0, indices.length * 4);
        const wv = this._whiteView;
        this._pass.setStencilReference(ref);
        this._pass.setPipeline(this._maskPipeline(op));
        this._pass.setBindGroup(0, this._bindFor(wv));
        this._pass.setVertexBuffer(0, this._maskVbuf);
        this._pass.setIndexBuffer(this._maskIbuf, 'uint32');
        this._pass.drawIndexed(indices.length);
        // 本路径改了 pipeline/bindGroup/顶点索引缓冲 → 使 _emit 状态缓存失效，下批必重设。
        this._lastPipeline = null;
        this._lastBindGroup = null;
        this._vbufBound = false;
    }
    _sdfPipeline() {
        const fmt = this._targetFormat || this.format;
        const key = 'sdf|' + fmt;
        const cached = this._pipelines.get(key);
        if (cached)
            return cached;
        const p = this.device.createRenderPipeline({
            layout: this._sdfLayout,
            vertex: {
                module: this._sdfModule, entryPoint: 'vs', buffers: [{
                        arrayStride: BYTES_PER_VERT, attributes: [
                            { shaderLocation: 0, offset: 0, format: 'float32x2' },
                            { shaderLocation: 1, offset: 8, format: 'float32x2' },
                            { shaderLocation: 2, offset: 16, format: 'float32x4' },
                        ],
                    }],
            },
            // 预乘输出 → blend: one, one-minus-src-alpha
            fragment: {
                module: this._sdfModule, entryPoint: 'fs', targets: [{
                        format: fmt, blend: {
                            color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' },
                            alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' },
                        },
                    }],
            },
            primitive: { topology: 'triangle-list' },
            depthStencil: {
                format: 'depth24plus-stencil8', depthWriteEnabled: false, depthCompare: 'always',
                stencilFront: { compare: 'less-equal', passOp: 'keep', failOp: 'keep', depthFailOp: 'keep' },
                stencilBack: { compare: 'less-equal', passOp: 'keep', failOp: 'keep', depthFailOp: 'keep' },
                stencilReadMask: 0xFF, stencilWriteMask: 0x00,
            },
        });
        this._pipelines.set(key, p);
        return p;
    }
    /**
     * 画 SDF 文字网格：距离场着色器 + uniforms（文字色/描边/发光/阴影）。
     *   texObj: SDF atlas 纹理；verts/uvs/indices/matrix 同 drawMesh。
     *   sdf:    { textColor:[r,g,b,a], strokeColor, glowColor, shadowColor,
     *             shadowOffset:[x,y], texSize:[w,h], boldness, effectMask,
     *             strokeWidth, glowRadius, shadowRadius, isMSDF, pxRange }（0..1 颜色）
     *   alpha:  整体 alpha 乘子（globalAlpha）。
     */
    drawMeshSDF(texObj, verts, uvs, indices, matrix, sdf, alpha) {
        this._flush();
        const vn = verts.length >> 1;
        const V = this._scratchV;
        let o = 0;
        const m = matrix;
        for (let i = 0; i < vn; i++) {
            const lx = verts[i * 2], ly = verts[i * 2 + 1];
            const x = m ? m.a * lx + m.c * ly + m.tx : lx;
            const y = m ? m.b * lx + m.d * ly + m.ty : ly;
            V[o++] = x;
            V[o++] = y;
            V[o++] = uvs[i * 2];
            V[o++] = uvs[i * 2 + 1];
            V[o++] = 1;
            V[o++] = 1;
            V[o++] = 1;
            V[o++] = (alpha == null ? 1 : alpha);
            V[o++] = 0;
        }
        const I = this._scratchI;
        for (let i = 0; i < indices.length; i++)
            I[i] = indices[i];
        // 环形游标：同帧多个 SDF 网格各占独立区间，避免 offset 0 互相覆盖（drawIndexed 延迟到 pass end 执行）
        let vByteOff = this._sdfVOff, iOff = this._sdfIOff, uOff = this._sdfUOff;
        const vBytes = vn * BYTES_PER_VERT;
        if (vByteOff + vBytes > MAX_VERTS * BYTES_PER_VERT)
            vByteOff = 0;
        if (iOff + indices.length > MAX_IDX)
            iOff = 0;
        if (uOff + 256 > 256 * 256)
            uOff = 0;
        const baseVertex = vByteOff / BYTES_PER_VERT;
        this.device.queue.writeBuffer(this._sdfVbuf, vByteOff, V.buffer, 0, vBytes);
        this.device.queue.writeBuffer(this._sdfIbuf, iOff * 4, I.buffer, 0, indices.length * 4);
        // SU uniform 布局（std140，128B）：4×vec4(64) + vec2×2(16) + f32×8(32) = 112，补齐 128
        const U = this._sdfScratch || (this._sdfScratch = new Float32Array(32));
        let p = 0;
        const c4 = (a) => { U[p++] = a[0]; U[p++] = a[1]; U[p++] = a[2]; U[p++] = (a[3] == null ? 1 : a[3]); };
        c4(sdf.textColor);
        c4(sdf.strokeColor);
        c4(sdf.glowColor);
        c4(sdf.shadowColor);
        U[p++] = sdf.shadowOffset[0];
        U[p++] = sdf.shadowOffset[1];
        U[p++] = sdf.texSize[0];
        U[p++] = sdf.texSize[1];
        U[p++] = sdf.boldness;
        U[p++] = sdf.effectMask;
        U[p++] = sdf.strokeWidth;
        U[p++] = sdf.glowRadius;
        U[p++] = sdf.shadowRadius;
        U[p++] = sdf.isMSDF;
        U[p++] = sdf.pxRange;
        U[p++] = 0;
        this.device.queue.writeBuffer(this._sdfUbuf, uOff, U.buffer, 0, 128);
        const bg = this.device.createBindGroup({
            layout: this._sdfBgl, entries: [
                { binding: 0, resource: { buffer: this._ubuf } },
                { binding: 1, resource: this._samp },
                { binding: 2, resource: texObj.view },
                { binding: 3, resource: { buffer: this._sdfUbuf, offset: uOff, size: 128 } },
            ],
        });
        this._pass.setPipeline(this._sdfPipeline());
        this._pass.setStencilReference(this._maskDepth);
        this._pass.setBindGroup(0, bg);
        this._pass.setVertexBuffer(0, this._sdfVbuf);
        this._pass.setIndexBuffer(this._sdfIbuf, 'uint32');
        this._pass.drawIndexed(indices.length, 1, iOff, baseVertex);
        this._sdfVOff = vByteOff + vBytes;
        this._sdfIOff = iOff + indices.length;
        this._sdfUOff = uOff + 256;
        // SDF 用独立缓冲/管线 → 使 _emit 状态缓存失效，下批必重设。
        this._lastPipeline = null;
        this._lastBindGroup = null;
        this._vbufBound = false;
    }
}
// 多纹理合批
WebGPURenderer.MULTI_TEX = true; // 全局开关：boot 前可设 WebGPURenderer.MULTI_TEX=false 退回单纹理
/** Egret 习惯：原点左上、y 向下的正交投影（像素→裁剪空间）。 */
function orthoTopLeft(w, h) {
    return new Float32Array([
        2 / w, 0, 0, 0,
        0, -2 / h, 0, 0,
        0, 0, 1, 0,
        -1, 1, 0, 1,
    ]);
}
// 多纹理批的槽签名：给每个 TexObj 惰性分配稳定 id，拼成缓存键。
let __texIdSeq = 0;
const __texIds = new WeakMap();
// 多纹理批签名：给每张纹理分配递增小整数 id。
// ≤3 张时打包成单个数字键（每 id 17 位，3×17=51 < 53 安全整数）→ 免字符串分配与 GC。
// >3 张时退回字符串拼接（少见，正确性优先）。
function texSig(textures) {
    const n = textures.length;
    if (n <= 3) {
        let key = 0;
        for (let i = 0; i < n; i++) {
            let id = __texIds.get(textures[i]);
            if (id == null) {
                id = ++__texIdSeq;
                __texIds.set(textures[i], id);
            }
            key = key * 0x20000 + id; // 17 位一段
        }
        return key * 4 + n; // 混入长度，避免 [a] 与 [0,a] 撞键
    }
    let s = 's';
    for (let i = 0; i < n; i++) {
        let id = __texIds.get(textures[i]);
        if (id == null) {
            id = ++__texIdSeq;
            __texIds.set(textures[i], id);
        }
        s += id + ',';
    }
    return s;
}
/** 后端选择器：无 navigator.gpu（小游戏/老浏览器）→ 返回 null 让上层回退 WebGL。 */
export async function pickBackend(canvas) {
    if ('gpu' in navigator) {
        try {
            return { backend: 'webgpu', renderer: await WebGPURenderer.create(canvas) };
        }
        catch (e) {
            console.warn('[egret-webgpu] 不可用，回退 WebGL:', e.message);
        }
    }
    return { backend: 'webgl', renderer: null };
}
//# sourceMappingURL=egret-webgpu.js.map