// WebGPU instance path (P2R): persistent per-display-object instance slots.
// - MovieClip state is MIRRORED directly from engine fields ($texture / offsetPoint),
//   skipping RenderNode fetch + drawData decoding entirely.
// - Slots are persistent (never reused) so slot order == display order == draw order;
//   removed sprites get alpha 0. Upload is ONE contiguous writeBuffer per frame —
//   no dirty-range fragmentation (the failure mode that killed the v2 attempt).
// - Textures bound via negotiated slot list (up to 48 on Dawn/D3D11); 32 model sheets
//   fit in one bind group -> ONE draw for all characters.
const SP_MAX_INSTANCES = 32768;
const SP_FLOATS_PER_INSTANCE = 16;

function buildShader(nTex) {
    let bindings = '', cases = '';
    for (let i = 0; i < nTex; i++) {
        bindings += `@group(0) @binding(${i + 2}) var tex${i}: texture_2d<f32>;\n`;
        cases += `case ${i}u: { return textureSampleLevel(tex${i}, samp, uv, 0.0); }\n`;
    }
    return /* wgsl */ `
struct U { proj: mat4x4f };
@group(0) @binding(0) var<uniform> u: U;
@group(0) @binding(1) var samp: sampler;
${bindings}
struct Instance {
  a:f32, b:f32, c:f32, d:f32, tx:f32, ty:f32,
  dx:f32, dy:f32, dw:f32, dh:f32,
  u0:f32, u1:f32, v0:f32, v1:f32,
  texId:f32, alpha:f32,
};
@group(1) @binding(0) var<storage, read> instances: array<Instance>;
struct Out { @builtin(position) pos: vec4f, @location(0) uv: vec2f, @location(1) alpha:f32, @location(2) @interpolate(flat) texId:u32 };
fn sampleTex(id:u32, uv:vec2f) -> vec4f { switch id { ${cases} default: { return textureSampleLevel(tex0, samp, uv, 0.0); } } }
@vertex fn vs(@builtin(vertex_index) vi:u32, @builtin(instance_index) ii:u32) -> Out {
  let x = select(0.0, 1.0, vi == 1u || vi == 2u || vi == 4u);
  let y = select(0.0, 1.0, vi == 2u || vi == 4u || vi == 5u);
  let inst = instances[ii];
  let px = inst.dx + x * inst.dw;
  let py = inst.dy + y * inst.dh;
  let wx = inst.a * px + inst.c * py + inst.tx;
  let wy = inst.b * px + inst.d * py + inst.ty;
  var o:Out;
  o.pos = u.proj * vec4f(wx, wy, 0.0, 1.0);
  o.uv = vec2f(mix(inst.u0, inst.u1, x), mix(inst.v0, inst.v1, y));
  o.alpha = inst.alpha;
  o.texId = u32(inst.texId + 0.5);
  return o;
}
@fragment fn fs(i:Out) -> @location(0) vec4f { let c = sampleTex(i.texId, i.uv); return vec4f(c.rgb, c.a * i.alpha); }
`;
}

export class SpriteChannel {
    constructor(renderer) {
        this.r = renderer;
        this.device = renderer.device;
        this.degraded = false;
        this.data = new Float32Array(SP_MAX_INSTANCES * SP_FLOATS_PER_INSTANCE);
        this.usedSlots = 0;
        this.frameDirty = false;
        this.batchCount = 1;
        this.writtenFloats = 0;
        this._slots = new Map();   // dp -> slot
        this._slotTex = [];        // slot -> frame texture (identity = frame dirty key)
        this._slotRemovers = [];   // slot -> REMOVED listener detach fn
        this._textures = [];       // bound texture list (ordered, stable)
        this._texIndex = new Map();// texture -> bind index
        this._pipeline = null;
        this._buffer = this.device.createBuffer({ size: SP_MAX_INSTANCES * SP_FLOATS_PER_INSTANCE * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
        this._bgl = this.device.createBindGroupLayout({ entries: [{ binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'read-only-storage' } }] });
        this._bg = this.device.createBindGroup({ layout: this._bgl, entries: [{ binding: 0, resource: { buffer: this._buffer } }] });
    }

    _degrade(reason) {
        if (!this.degraded) {
            this.degraded = true;
            console.warn('[sprite-channel] 降级为通用路径:', reason);
        }
    }

    beginFrame() {
        this.frameDirty = false;
    }

    _markDirty() {
        this.frameDirty = true;
    }

    _ensurePipeline() {
        if (this._pipeline) return;
        const nTex = this.r._texSlots;
        const mod = this.device.createShaderModule({ code: buildShader(nTex) });
        const layout = this.device.createPipelineLayout({ bindGroupLayouts: [this.r._mBgl, this._bgl] });
        const fmt = this.r._targetFormat || this.r.format;
        const blend = {
            color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha' },
            alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' },
        };
        this._pipeline = this.device.createRenderPipeline({
            layout,
            vertex: { module: mod, entryPoint: 'vs' },
            fragment: { module: mod, entryPoint: 'fs', targets: [{ format: fmt, blend }] },
            primitive: { topology: 'triangle-list' },
        });
    }

    _bindIndex(gpuTex) {
        let idx = this._texIndex.get(gpuTex);
        if (idx == null) {
            if (this._textures.length >= this.r._texSlots) { this._degrade('纹理数超过槽上限 ' + this.r._texSlots); return -1; }
            idx = this._textures.length;
            this._textures.push(gpuTex);
            this._texIndex.set(gpuTex, idx);
        }
        return idx;
    }

    _slotFor(dp) {
        let s = this._slots.get(dp);
        if (s == null) {
            if (this.usedSlots >= SP_MAX_INSTANCES) { this._degrade('实例槽超过 ' + SP_MAX_INSTANCES); return -1; }
            s = this.usedSlots++;
            this._slots.set(dp, s);
            // 槽不复用：新显示对象永远拿新槽 → 槽序 == 显示序 == 绘制序（遮挡正确）。
            // 移除时 alpha 置 0，槽保留（REMOVED 监听驱动）。
            const onRemove = () => this._release(dp, s);
            dp.addEventListener(egret.Event.REMOVED, onRemove);
            this._slotRemovers[s] = onRemove;
            this._markDirty();
        }
        return s;
    }

    _release(dp, s) {
        const o = s * SP_FLOATS_PER_INSTANCE;
        if (this.data[o + 15] !== 0) {
            this.data[o + 15] = 0;
            this._markDirty();
        }
        this._slots.delete(dp);
        const detach = this._slotRemovers[s];
        if (detach) detach();
        this._slotRemovers[s] = null;
        this._slotTex[s] = null;
    }

    /**
     * 镜像一个 MovieClip 的当前帧状态（仅脏分量重写）。
     * frameTex: mc.$texture（引擎 constructFrame 每帧维护）
     * gpuTex:   boot getTexture(bd) 的 GPU 纹理对象（w/h = sheet 尺寸）
     * wa..wu:   桥接层预合成的世界矩阵 root∘layerConcat∘lm（见 bridge 两级缓存注释）。
     * 返回 false = 需要回退通用路径。
     */
    mirrorSprite(dp, gpuTex, frameTex, opX, opY, wa, wb, wc, wd, wt, wu, alpha) {
        if (this.degraded) return false;
        const s = this._slotFor(dp);
        if (s < 0) return false;
        const o = s * SP_FLOATS_PER_INSTANCE;
        const x = this.data;
        const bind = this._bindIndex(gpuTex);
        if (bind < 0) return false;
        if (this._slotTex[s] !== frameTex) {
            // 帧切换：重写 dst/uv/layer（帧矩形与 offset 由引擎维护，帧不变则不变）
            const bw = frameTex.$bitmapWidth, bh = frameTex.$bitmapHeight;
            x[o + 6] = opX; x[o + 7] = opY; x[o + 8] = bw; x[o + 9] = bh;
            x[o + 10] = frameTex.$bitmapX / gpuTex.w; x[o + 11] = (frameTex.$bitmapX + bw) / gpuTex.w;
            x[o + 12] = frameTex.$bitmapY / gpuTex.h; x[o + 13] = (frameTex.$bitmapY + bh) / gpuTex.h;
            x[o + 14] = bind;
            this._slotTex[s] = frameTex;
            this._markDirty();
        }
        // 世界矩阵由桥接层算好（每帧仅一次父链遍历），此处直接写入
        if (x[o] !== wa || x[o + 1] !== wb || x[o + 2] !== wc || x[o + 3] !== wd) {
            x[o] = wa; x[o + 1] = wb; x[o + 2] = wc; x[o + 3] = wd;
            this._markDirty();
        }
        if (x[o + 4] !== wt || x[o + 5] !== wu) {
            x[o + 4] = wt; x[o + 5] = wu;
            this._markDirty();
        }
        if (x[o + 15] !== alpha) {
            x[o + 15] = alpha;
            this._markDirty();
        }
        return true;
    }

    skipSprite(dp) {
        // 未就绪/暂不可渲染的 sprite：占位透明，保持槽位与显示序
        const s = this._slots.get(dp);
        if (s != null && this.data[s * SP_FLOATS_PER_INSTANCE + 15] !== 0) {
            this.data[s * SP_FLOATS_PER_INSTANCE + 15] = 0;
            this._markDirty();
        }
    }

    flush() {
        if (this.degraded || !this.usedSlots) return;
        this._ensurePipeline();
        if (this.frameDirty) {
            const bytes = this.usedSlots * SP_FLOATS_PER_INSTANCE * 4;
            this.device.queue.writeBuffer(this._buffer, 0, this.data.buffer, 0, bytes);
            this.writtenFloats = this.usedSlots * SP_FLOATS_PER_INSTANCE;
            this.frameDirty = false;
        }
        this.r._pass.setPipeline(this._pipeline);
        this.r._pass.setBindGroup(0, this.r._mBindFor(this._textures));
        this.r._pass.setBindGroup(1, this._bg);
        this.r._pass.draw(6, this.usedSlots);
        this.r._lastBindGroup = null;
        this.r._instanceDrawCalls = (this.r._instanceDrawCalls || 0) + 1;
        this.batchCount = 1;
    }
}
