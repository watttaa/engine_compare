// 游戏内"鱼群风暴"特效层：数万条小鱼 Boids 群集（分离/对齐/聚合 + 空间哈希）。
// 照 gpu-coins.js 模式：独立叠加 canvas，零侵入 Egret 渲染管线。
//
// 两种模式（同一 API、同一算法，用于同屏 A/B）：
//   mode:'gpu' —— 独立 WebGPU device，物理+渲染全在 GPU（三段 compute：建网格→求力→积分）
//   mode:'cpu' —— WebGL 后端没有 compute 的现实：同一套 Boids 落在 CPU 主线程 + 2D canvas 画点
//
// 用法：
//   const school = await createSchoolLayer(canvas, { mode:'gpu' });
//   await school.setTexture(img, frameW, frameH, swimFrames);  // 用游戏原版鱼图集（竖排帧）
//   school.setCount(30000);      // 0 = 关闭
//   school.scare(x, y);          // 开炮处惊散鱼群
//   school.stats();              // { n, mode, physMs }

const MAX = 100000;          // 鱼数上限
const F = 6;                 // 每鱼 float：x y vx vy phase size
const MAXCELLS = 8192;       // 1280x720 / 22px 网格 ≈ 59×33=1947，留足余量
const SCARES = 4;            // 同时生效的惊吓点槽位
const P = { R: 22, sepW: 90, aliW: 4, cohW: 6, maxSpeed: 130, minSpeed: 55, maxNb: 24 };
const CELL = P.R;

function orthoTL(w, h) {
    return new Float32Array([2 / w, 0, 0, 0, 0, -2 / h, 0, 0, 0, 0, 1, 0, -1, 1, 0, 1]);
}

function seedFish(n, w, h) {
    const a = new Float32Array(n * F);
    for (let i = 0; i < n; i++) {
        const o = i * F;
        a[o] = Math.random() * w;
        a[o + 1] = Math.random() * h * 0.86;            // 留出底部操作栏
        const dir = Math.random() < 0.5 ? 1 : -1;
        a[o + 2] = dir * (35 + Math.random() * 70);     // px/s
        a[o + 3] = (Math.random() - 0.5) * 36;
        a[o + 4] = Math.random() * 6.28;
        a[o + 5] = 5 + Math.random() * 6;               // 小鱼 5~11px
    }
    return a;
}

// ============ WGSL ============
const BUILD_WGSL = /* wgsl */`
struct Fish { pos: vec2f, vel: vec2f, phase: f32, size: f32 };
struct Sim { a: vec4f, b: vec4f, c: vec4f, d: vec4f };
@group(0) @binding(0) var<storage, read> fish: array<Fish>;
@group(0) @binding(1) var<storage, read_write> cellHead: array<atomic<i32>>;
@group(0) @binding(2) var<storage, read_write> nextIdx: array<i32>;
@group(0) @binding(3) var<uniform> sim: Sim;
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let i = gid.x;
  if (i >= u32(sim.a.x)) { return; }
  let cs = sim.b.x;
  let gw = i32(sim.b.y);
  let gh = i32(sim.b.z);
  let p = fish[i].pos;
  let cx = max(0, min(gw - 1, i32(floor(p.x / cs))));
  let cy = max(0, min(gh - 1, i32(floor(p.y / cs))));
  nextIdx[i] = atomicExchange(&cellHead[cy * gw + cx], i32(i));
}`;

const FORCE_WGSL = /* wgsl */`
struct Fish { pos: vec2f, vel: vec2f, phase: f32, size: f32 };
struct Sim { a: vec4f, b: vec4f, c: vec4f, d: vec4f };
struct Scares { s: array<vec4f, ${SCARES}> };   // xy=位置 z=强度 w=半径
@group(0) @binding(0) var<storage, read> fish: array<Fish>;
@group(0) @binding(1) var<storage, read_write> forces: array<vec2f>;
@group(0) @binding(2) var<storage, read> cellHead: array<i32>;
@group(0) @binding(3) var<storage, read> nextIdx: array<i32>;
@group(0) @binding(4) var<uniform> sim: Sim;
@group(0) @binding(5) var<uniform> scares: Scares;
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let i = gid.x;
  if (i >= u32(sim.a.x)) { return; }
  let f = fish[i];
  let R = sim.b.w;
  let R2 = R * R;
  let cs = sim.b.x;
  let gw = i32(sim.b.y);
  let gh = i32(sim.b.z);
  let maxNb = i32(sim.d.y);
  let cx = max(0, min(gw - 1, i32(floor(f.pos.x / cs))));
  let cy = max(0, min(gh - 1, i32(floor(f.pos.y / cs))));
  var sep = vec2f(0.0);
  var ali = vec2f(0.0);
  var coh = vec2f(0.0);
  var cnt = 0.0;
  for (var dy = -1; dy <= 1; dy = dy + 1) {
    let ny = cy + dy;
    if (ny < 0 || ny >= gh) { continue; }
    for (var dx = -1; dx <= 1; dx = dx + 1) {
      let nx = cx + dx;
      if (nx < 0 || nx >= gw) { continue; }
      var j = cellHead[ny * gw + nx];
      var guard = 0;
      while (j >= 0 && guard < maxNb) {
        if (j != i32(i)) {
          let g = fish[j];
          let dv = g.pos - f.pos;
          let d2 = dot(dv, dv);
          if (d2 < R2 && d2 > 0.0001) {
            let d = sqrt(d2);
            let wgt = 1.0 - d / R;
            sep = sep - (dv / d) * wgt;
            ali = ali + g.vel;
            coh = coh + dv;
            cnt = cnt + 1.0;
          }
        }
        j = nextIdx[j];
        guard = guard + 1;
      }
    }
  }
  var acc = vec2f(0.0);
  if (cnt > 0.0) {
    let sl = length(sep);
    if (sl > 0.0001) { acc = acc + (sep / sl) * sim.c.x; }
    acc = acc + (ali / cnt - f.vel) * sim.c.y;
    acc = acc + (coh / cnt) * sim.c.z;
  }
  // 惊吓点：炮口落点向外的排斥脉冲
  for (var k = 0; k < ${SCARES}; k = k + 1) {
    let s = scares.s[k];
    if (s.z > 0.5) {
      let dv = f.pos - s.xy;
      let d = max(length(dv), 6.0);
      if (d < s.w) { acc = acc + (dv / d) * s.z * (1.0 - d / s.w); }
    }
  }
  forces[i] = acc;
}`;

const INTEG_WGSL = /* wgsl */`
struct Fish { pos: vec2f, vel: vec2f, phase: f32, size: f32 };
struct Sim { a: vec4f, b: vec4f, c: vec4f, d: vec4f };
@group(0) @binding(0) var<storage, read_write> fish: array<Fish>;
@group(0) @binding(1) var<storage, read> forces: array<vec2f>;
@group(0) @binding(2) var<uniform> sim: Sim;
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let i = gid.x;
  if (i >= u32(sim.a.x)) { return; }
  var f = fish[i];
  let dt = sim.a.w;
  f.vel = f.vel + forces[i] * dt;
  let sp = length(f.vel);
  let maxSp = sim.c.w;
  let minSp = sim.d.x;
  if (sp > maxSp) { f.vel = f.vel / sp * maxSp; }
  if (sp < minSp && sp > 0.0001) { f.vel = f.vel / sp * minSp; }
  f.phase = f.phase + dt * 7.0;
  f.pos = f.pos + f.vel * dt;
  let w = sim.a.y; let h = sim.a.z; let m = 20.0;
  if (f.pos.x < -m) { f.pos.x = f.pos.x + w + 2.0 * m; }
  if (f.pos.x > w + m) { f.pos.x = f.pos.x - w - 2.0 * m; }
  if (f.pos.y < -m) { f.pos.y = f.pos.y + h + 2.0 * m; }
  if (f.pos.y > h + m) { f.pos.y = f.pos.y - h - 2.0 * m; }
  fish[i] = f;
}`;

const RENDER_WGSL = /* wgsl */`
struct Fish { pos: vec2f, vel: vec2f, phase: f32, size: f32 };
struct U { proj: mat4x4f };
@group(0) @binding(0) var<uniform> u: U;
@group(0) @binding(1) var<storage, read> fish: array<Fish>;
struct Out { @builtin(position) pos: vec4f, @location(0) uv: vec2f, @location(1) tint: vec3f, @location(2) phase: f32 };
var<private> CORN: array<vec2f, 4> = array<vec2f, 4>(
  vec2f(-0.5,-0.5), vec2f(0.5,-0.5), vec2f(-0.5,0.5), vec2f(0.5,0.5));
@vertex fn vs(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> Out {
  let f = fish[ii];
  let c = CORN[vi];
  let local = vec2f(c.x * f.size, c.y * f.size * 0.45);
  let ang = atan2(f.vel.y, f.vel.x);
  let ca = cos(ang); let sa = sin(ang);
  let rot = vec2f(local.x * ca - local.y * sa, local.x * sa + local.y * ca);
  var o: Out;
  o.pos = u.proj * vec4f(f.pos + rot, 0.0, 1.0);
  o.uv = c;
  o.phase = f.phase;
  // 银蓝色小鱼群，随相位微微闪光——像鱼鳞反光
  let g = 0.5 + 0.5 * sin(f.phase * 0.9);
  o.tint = vec3f(0.55 + 0.3 * g, 0.72 + 0.2 * g, 0.9);
  return o;
}
@fragment fn fs(o: Out) -> @location(0) vec4f {
  let p = o.uv;
  let body = length(vec2f(p.x * 1.7, p.y * 2.6));
  let wigAmp = 0.20 * clamp(-p.x * 2.2, 0.0, 1.0);
  let wig = sin(o.phase * 2.0 + p.x * 9.0) * wigAmp;
  let tail = length(vec2f((p.x + 0.45) * 2.6, (p.y + wig) * 2.0));
  var a = 1.0 - smoothstep(0.72, 1.0, body);
  let at = (1.0 - smoothstep(0.6, 1.0, tail)) * 0.85;
  a = max(a, at) * 0.82;          // 半透明，不抢游戏主体
  if (a <= 0.004) { discard; }
  return vec4f(o.tint * a, a);    // premultiplied
}`;

// 用游戏原版鱼图集渲染：竖排帧 spritesheet + 按相位播摆尾动画。
// 素材默认朝右；沿速度方向旋转，向左游时镜像 local.y 避免倒立（与游戏里 scaleX 翻转同理）。
const RENDER_TEX_WGSL = /* wgsl */`
struct Fish { pos: vec2f, vel: vec2f, phase: f32, size: f32 };
struct U { proj: mat4x4f };
struct TexInfo { a: vec4f };   // x=swim帧数 y=单帧v占比(fh/sheetH) z=宽高比(fh/fw) w=显示倍率
@group(0) @binding(0) var<uniform> u: U;
@group(0) @binding(1) var<storage, read> fish: array<Fish>;
@group(0) @binding(2) var samp: sampler;
@group(0) @binding(3) var tex: texture_2d<f32>;
@group(0) @binding(4) var<uniform> info: TexInfo;
struct Out { @builtin(position) pos: vec4f, @location(0) uv: vec2f };
var<private> CORN: array<vec2f, 4> = array<vec2f, 4>(
  vec2f(-0.5,-0.5), vec2f(0.5,-0.5), vec2f(-0.5,0.5), vec2f(0.5,0.5));
@vertex fn vs(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> Out {
  let f = fish[ii];
  let c = CORN[vi];
  let w = f.size * info.a.w;
  let h = w * info.a.z;
  var local = vec2f(c.x * w, c.y * h);
  if (f.vel.x < 0.0) { local.y = -local.y; }      // 向左游：镜像，免倒立
  let ang = atan2(f.vel.y, f.vel.x);
  let ca = cos(ang); let sa = sin(ang);
  let rot = vec2f(local.x * ca - local.y * sa, local.x * sa + local.y * ca);
  var o: Out;
  o.pos = u.proj * vec4f(f.pos + rot, 0.0, 1.0);
  // 摆尾动画：相位选帧（各鱼相位随机，天然错帧不同步）
  let idx = f32(u32(f.phase * 1.6) % u32(info.a.x));
  o.uv = vec2f(c.x + 0.5, (idx + (c.y + 0.5)) * info.a.y);
  return o;
}
@fragment fn fs(o: Out) -> @location(0) vec4f {
  let t = textureSample(tex, samp, o.uv);
  let a = t.a * 0.95;
  if (a <= 0.01) { discard; }
  return vec4f(t.rgb * a, a);    // premultiplied
}`;

// ============ GPU 实现 ============
async function createGPU(canvas) {
    if (!('gpu' in navigator)) throw new Error('no navigator.gpu');
    const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
    if (!adapter) throw new Error('no adapter');
    const device = await adapter.requestDevice();
    const ctx = canvas.getContext('webgpu');
    const format = navigator.gpu.getPreferredCanvasFormat();
    ctx.configure({ device, format, alphaMode: 'premultiplied' });

    const fishBuf = device.createBuffer({ size: MAX * F * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    const forceBuf = device.createBuffer({ size: MAX * 2 * 4, usage: GPUBufferUsage.STORAGE });
    const headBuf = device.createBuffer({ size: MAXCELLS * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    const nextBuf = device.createBuffer({ size: MAX * 4, usage: GPUBufferUsage.STORAGE });
    const simBuf = device.createBuffer({ size: 64, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    const scareBuf = device.createBuffer({ size: SCARES * 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    const projBuf = device.createBuffer({ size: 64, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

    const C = GPUShaderStage.COMPUTE, V = GPUShaderStage.VERTEX;
    const ent = (binding, type, vis) => ({ binding, visibility: vis, buffer: { type } });
    const buildBGL = device.createBindGroupLayout({
        entries: [
            ent(0, 'read-only-storage', C), ent(1, 'storage', C), ent(2, 'storage', C), ent(3, 'uniform', C)]
    });
    const forceBGL = device.createBindGroupLayout({
        entries: [
            ent(0, 'read-only-storage', C), ent(1, 'storage', C), ent(2, 'read-only-storage', C),
            ent(3, 'read-only-storage', C), ent(4, 'uniform', C), ent(5, 'uniform', C)]
    });
    const integBGL = device.createBindGroupLayout({
        entries: [
            ent(0, 'storage', C), ent(1, 'read-only-storage', C), ent(2, 'uniform', C)]
    });
    const renderBGL = device.createBindGroupLayout({
        entries: [
            ent(0, 'uniform', V), ent(1, 'read-only-storage', V)]
    });
    const FRAG = GPUShaderStage.FRAGMENT;
    const renderTexBGL = device.createBindGroupLayout({
        entries: [
            ent(0, 'uniform', V), ent(1, 'read-only-storage', V),
            { binding: 2, visibility: FRAG, sampler: {} },
            { binding: 3, visibility: FRAG, texture: { sampleType: 'float' } },
            ent(4, 'uniform', V)]
    });

    const mkC = (code, bgl) => device.createComputePipeline({
        layout: device.createPipelineLayout({ bindGroupLayouts: [bgl] }),
        compute: { module: device.createShaderModule({ code }), entryPoint: 'main' }
    });
    const buildPipe = mkC(BUILD_WGSL, buildBGL);
    const forcePipe = mkC(FORCE_WGSL, forceBGL);
    const integPipe = mkC(INTEG_WGSL, integBGL);

    const rMod = device.createShaderModule({ code: RENDER_WGSL });
    const renderPipe = device.createRenderPipeline({
        layout: device.createPipelineLayout({ bindGroupLayouts: [renderBGL] }),
        vertex: { module: rMod, entryPoint: 'vs' },
        fragment: {
            module: rMod, entryPoint: 'fs', targets: [{
                format, blend: {
                    color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' },
                    alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' }
                }
            }]
        },
        primitive: { topology: 'triangle-strip' }
    });
    const rtMod = device.createShaderModule({ code: RENDER_TEX_WGSL });
    const renderTexPipe = device.createRenderPipeline({
        layout: device.createPipelineLayout({ bindGroupLayouts: [renderTexBGL] }),
        vertex: { module: rtMod, entryPoint: 'vs' },
        fragment: {
            module: rtMod, entryPoint: 'fs', targets: [{
                format, blend: {
                    color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' },
                    alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' }
                }
            }]
        },
        primitive: { topology: 'triangle-strip' }
    });
    const sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear' });
    const texInfoBuf = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    let texBind = null;    // setTexture 后非空 → 改走真贴图管线

    const res = (buffer) => ({ resource: { buffer } });
    const buildBind = device.createBindGroup({
        layout: buildBGL, entries: [
            { binding: 0, ...res(fishBuf) }, { binding: 1, ...res(headBuf) },
            { binding: 2, ...res(nextBuf) }, { binding: 3, ...res(simBuf) }]
    });
    const forceBind = device.createBindGroup({
        layout: forceBGL, entries: [
            { binding: 0, ...res(fishBuf) }, { binding: 1, ...res(forceBuf) },
            { binding: 2, ...res(headBuf) }, { binding: 3, ...res(nextBuf) },
            { binding: 4, ...res(simBuf) }, { binding: 5, ...res(scareBuf) }]
    });
    const integBind = device.createBindGroup({
        layout: integBGL, entries: [
            { binding: 0, ...res(fishBuf) }, { binding: 1, ...res(forceBuf) }, { binding: 2, ...res(simBuf) }]
    });
    const renderBind = device.createBindGroup({
        layout: renderBGL, entries: [
            { binding: 0, ...res(projBuf) }, { binding: 1, ...res(fishBuf) }]
    });

    const NEG = new Int32Array(MAXCELLS).fill(-1);
    const simArr = new Float32Array(16);
    const scareArr = new Float32Array(SCARES * 4);
    let count = 0, scareIdx = 0;

    return {
        setCount(n) {
            n = Math.min(MAX, Math.max(0, n | 0));
            if (n > 0) device.queue.writeBuffer(fishBuf, 0, seedFish(n, canvas.width, canvas.height).buffer);
            count = n;
        },
        // 上传游戏原版鱼图集（竖排帧 spritesheet），之后渲染改走真贴图管线
        async setTexture(src, frameW, frameH, swimFrames) {
            let bmp = src;
            if (!(src instanceof ImageBitmap)) bmp = await createImageBitmap(src);
            const tex = device.createTexture({
                size: [bmp.width, bmp.height], format: 'rgba8unorm',
                usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
            });
            device.queue.copyExternalImageToTexture(
                { source: bmp }, { texture: tex, premultipliedAlpha: false }, [bmp.width, bmp.height]);
            // x=swim帧数 y=单帧v占比 z=高宽比 w=显示倍率（size 5~11px → 鱼宽 11~24px）
            device.queue.writeBuffer(texInfoBuf, 0, new Float32Array([
                swimFrames, frameH / bmp.height, frameH / frameW, 2.2]).buffer);
            texBind = device.createBindGroup({
                layout: renderTexBGL, entries: [
                    { binding: 0, ...res(projBuf) }, { binding: 1, ...res(fishBuf) },
                    { binding: 2, resource: sampler }, { binding: 3, resource: tex.createView() },
                    { binding: 4, ...res(texInfoBuf) }]
            });
        },
        scare(x, y, strength, radius) {
            const o = scareIdx * 4; scareIdx = (scareIdx + 1) % SCARES;
            scareArr[o] = x; scareArr[o + 1] = y;
            scareArr[o + 2] = strength || 900; scareArr[o + 3] = radius || 230;
        },
        frame(dt) {
            if (count <= 0) {                       // 清屏保持透明
                const enc0 = device.createCommandEncoder();
                const rp0 = enc0.beginRenderPass({
                    colorAttachments: [{
                        view: ctx.getCurrentTexture().createView(),
                        clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: 'clear', storeOp: 'store'
                    }]
                });
                rp0.end(); device.queue.submit([enc0.finish()]);
                return;
            }
            const W = canvas.width, H = canvas.height;
            const gw = Math.max(1, Math.ceil(W / CELL)), gh = Math.max(1, Math.ceil(H / CELL));
            device.queue.writeBuffer(headBuf, 0, NEG.buffer, 0, gw * gh * 4);
            const s = simArr;
            s[0] = count; s[1] = W; s[2] = H; s[3] = dt;
            s[4] = CELL; s[5] = gw; s[6] = gh; s[7] = P.R;
            s[8] = P.sepW; s[9] = P.aliW; s[10] = P.cohW; s[11] = P.maxSpeed;
            s[12] = P.minSpeed; s[13] = P.maxNb; s[14] = 0; s[15] = 0;
            device.queue.writeBuffer(simBuf, 0, s.buffer);
            device.queue.writeBuffer(scareBuf, 0, scareArr.buffer);
            device.queue.writeBuffer(projBuf, 0, orthoTL(W, H).buffer);
            // 惊吓强度衰减（CPU 侧维护，量极小）
            for (let k = 0; k < SCARES; k++) scareArr[k * 4 + 2] *= Math.pow(0.03, dt);   // ~0.3s 消散
            const enc = device.createCommandEncoder();
            const wg = Math.ceil(count / 64);
            let cp = enc.beginComputePass();
            cp.setPipeline(buildPipe); cp.setBindGroup(0, buildBind); cp.dispatchWorkgroups(wg); cp.end();
            cp = enc.beginComputePass();
            cp.setPipeline(forcePipe); cp.setBindGroup(0, forceBind); cp.dispatchWorkgroups(wg); cp.end();
            cp = enc.beginComputePass();
            cp.setPipeline(integPipe); cp.setBindGroup(0, integBind); cp.dispatchWorkgroups(wg); cp.end();
            const rp = enc.beginRenderPass({
                colorAttachments: [{
                    view: ctx.getCurrentTexture().createView(),
                    clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: 'clear', storeOp: 'store'
                }]
            });
            if (texBind) { rp.setPipeline(renderTexPipe); rp.setBindGroup(0, texBind); }
            else { rp.setPipeline(renderPipe); rp.setBindGroup(0, renderBind); }
            rp.draw(4, count);
            rp.end();
            device.queue.submit([enc.finish()]);
        },
        getCount() { return count; },
        physMs() { return 0; },                    // 物理在 GPU，主线程 ≈0
    };
}

// ============ CPU 实现（WebGL 后端的现实：无 compute，同一套算法落在主线程） ============
function createCPU(canvas) {
    const ctx = canvas.getContext('2d');
    let state = null, next = null, nxt = null, head = null;
    let count = 0, physMs = 0;
    const scares = new Float32Array(SCARES * 4);
    let scareIdx = 0;
    let sprite = null;   // {img, fw, fh, frames} —— setTexture 后用真贴图画

    function step(dt) {
        const t0 = performance.now();
        const W = canvas.width, H = canvas.height;
        const gw = Math.max(1, Math.ceil(W / CELL)), gh = Math.max(1, Math.ceil(H / CELL));
        const numCells = gw * gh;
        if (!head || head.length < numCells) head = new Int32Array(numCells);
        const R = P.R, R2 = R * R;
        let i, o, cx, cy;
        head.fill(-1, 0, numCells);
        for (i = 0; i < count; i++) {
            o = i * F;
            cx = Math.floor(state[o] / CELL); if (cx < 0) cx = 0; else if (cx >= gw) cx = gw - 1;
            cy = Math.floor(state[o + 1] / CELL); if (cy < 0) cy = 0; else if (cy >= gh) cy = gh - 1;
            nxt[i] = head[cy * gw + cx]; head[cy * gw + cx] = i;
        }
        const sepW = P.sepW, aliW = P.aliW, cohW = P.cohW, maxSp = P.maxSpeed, minSp = P.minSpeed, maxNb = P.maxNb;
        for (i = 0; i < count; i++) {
            o = i * F;
            const px = state[o], py = state[o + 1], vx = state[o + 2], vy = state[o + 3];
            let sx = 0, sy = 0, ax = 0, ay = 0, mx = 0, my = 0, cnt = 0;
            cx = Math.floor(px / CELL); if (cx < 0) cx = 0; else if (cx >= gw) cx = gw - 1;
            cy = Math.floor(py / CELL); if (cy < 0) cy = 0; else if (cy >= gh) cy = gh - 1;
            const y0 = cy > 0 ? cy - 1 : 0, y1 = cy < gh - 1 ? cy + 1 : gh - 1;
            const x0 = cx > 0 ? cx - 1 : 0, x1 = cx < gw - 1 ? cx + 1 : gw - 1;
            for (let ny = y0; ny <= y1; ny++) {
                for (let nx2 = x0; nx2 <= x1; nx2++) {
                    let j = head[ny * gw + nx2], guard = 0;
                    while (j >= 0 && guard < maxNb) {
                        if (j !== i) {
                            const q = j * F;
                            const dx = state[q] - px, dy = state[q + 1] - py;
                            const d2 = dx * dx + dy * dy;
                            if (d2 < R2 && d2 > 1e-4) {
                                const d = Math.sqrt(d2);
                                const wgt = 1 - d / R;
                                sx -= dx / d * wgt; sy -= dy / d * wgt;
                                ax += state[q + 2]; ay += state[q + 3];
                                mx += dx; my += dy;
                                cnt++;
                            }
                        }
                        j = nxt[j]; guard++;
                    }
                }
            }
            let fx = 0, fy = 0;
            if (cnt > 0) {
                const sl = Math.sqrt(sx * sx + sy * sy);
                if (sl > 1e-4) { fx += sx / sl * sepW; fy += sy / sl * sepW; }
                fx += (ax / cnt - vx) * aliW; fy += (ay / cnt - vy) * aliW;
                fx += (mx / cnt) * cohW; fy += (my / cnt) * cohW;
            }
            for (let k = 0; k < SCARES; k++) {
                const so = k * 4, st = scares[so + 2];
                if (st > 0.5) {
                    const dx = px - scares[so], dy = py - scares[so + 1];
                    const d = Math.max(Math.sqrt(dx * dx + dy * dy), 6);
                    const rad = scares[so + 3];
                    if (d < rad) { fx += dx / d * st * (1 - d / rad); fy += dy / d * st * (1 - d / rad); }
                }
            }
            let nvx = vx + fx * dt, nvy = vy + fy * dt;
            const sp = Math.sqrt(nvx * nvx + nvy * nvy);
            if (sp > maxSp) { nvx = nvx / sp * maxSp; nvy = nvy / sp * maxSp; }
            else if (sp < minSp && sp > 1e-4) { nvx = nvx / sp * minSp; nvy = nvy / sp * minSp; }
            let npx = px + nvx * dt, npy = py + nvy * dt;
            const m = 20;
            if (npx < -m) npx += W + 2 * m; if (npx > W + m) npx -= W + 2 * m;
            if (npy < -m) npy += H + 2 * m; if (npy > H + m) npy -= H + 2 * m;
            next[o] = npx; next[o + 1] = npy; next[o + 2] = nvx; next[o + 3] = nvy;
            next[o + 4] = state[o + 4] + dt * 7; next[o + 5] = state[o + 5];
        }
        const tmp = state; state = next; next = tmp;
        for (let k = 0; k < SCARES; k++) scares[k * 4 + 2] *= Math.pow(0.03, dt);
        physMs = physMs * 0.8 + (performance.now() - t0) * 0.2;
    }

    function render() {
        const W = canvas.width, H = canvas.height;
        ctx.clearRect(0, 0, W, H);
        ctx.globalAlpha = 0.82;
        if (sprite) {
            // 用游戏原版鱼贴图：按相位选帧，向左游镜像批次翻转（不旋转，省开销）
            const img = sprite.img, fw = sprite.fw, fh = sprite.fh, nf = sprite.frames;
            for (let pass = 0; pass < 2; pass++) {
                if (pass === 1) { ctx.save(); ctx.scale(-1, 1); }
                for (let i = 0; i < count; i++) {
                    const o = i * F;
                    const left = state[o + 2] < 0;
                    if ((pass === 1) !== left) continue;
                    const w = state[o + 5] * 2.2, h = w * fh / fw;
                    const idx = ((state[o + 4] * 1.6) | 0) % nf;
                    const x = pass === 1 ? -state[o] : state[o];
                    ctx.drawImage(img, 0, fh * idx, fw, fh, x - w / 2, state[o + 1] - h / 2, w, h);
                }
                if (pass === 1) ctx.restore();
            }
            ctx.globalAlpha = 1;
            return;
        }
        // 银蓝 4 色分桶，fillRect 画点——刻意用最便宜的画法，让瓶颈聚焦在"CPU 物理"
        const cols = ['#8fb8e8', '#a8cdf0', '#7da6d8', '#bcd9f5'];
        for (let c = 0; c < 4; c++) {
            ctx.fillStyle = cols[c];
            for (let i = c; i < count; i += 4) {
                const o = i * F;
                const s = state[o + 5] * 0.55;
                ctx.fillRect(state[o] - s / 2, state[o + 1] - s / 2, s, s);
            }
        }
        ctx.globalAlpha = 1;
    }

    return {
        setCount(n) {
            n = Math.min(MAX, Math.max(0, n | 0));
            if (n > 0) {
                state = seedFish(n, canvas.width, canvas.height);
                next = new Float32Array(n * F);
                nxt = new Int32Array(n);
            } else {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
            count = n; physMs = 0;
        },
        scare(x, y, strength, radius) {
            const o = scareIdx * 4; scareIdx = (scareIdx + 1) % SCARES;
            scares[o] = x; scares[o + 1] = y;
            scares[o + 2] = strength || 900; scares[o + 3] = radius || 230;
        },
        frame(dt) {
            if (count <= 0) return;
            step(dt);          // ★ 主线程物理——WebGL 后端没有 compute 的代价就在这
            render();
        },
        getCount() { return count; },
        physMs() { return physMs; },
        async setTexture(src, frameW, frameH, swimFrames) {
            let img = src;
            if (typeof createImageBitmap === 'function' && !(src instanceof ImageBitmap)) {
                try { img = await createImageBitmap(src); } catch (e) { img = src; }
            }
            sprite = { img: img, fw: frameW, fh: frameH, frames: swimFrames };
        },
    };
}

// ============ 统一入口 ============
export async function createSchoolLayer(canvas, opts = {}) {
    const mode = opts.mode === 'cpu' ? 'cpu' : 'gpu';
    const impl = mode === 'gpu' ? await createGPU(canvas) : createCPU(canvas);
    let enabled = true, raf = 0, lastT = performance.now();
    function loop(now) {
        const dt = Math.min((now - lastT) / 1000, 1 / 20); lastT = now;
        if (enabled) impl.frame(dt);
        raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return {
        mode,
        setCount(n) { impl.setCount(n); },
        setTexture(src, fw, fh, frames) { return impl.setTexture ? impl.setTexture(src, fw, fh, frames) : Promise.resolve(); },
        scare(x, y, strength, radius) { impl.scare(x, y, strength, radius); },
        setEnabled(v) { enabled = !!v; if (!v) impl.setCount(0); },
        stats() { return { n: impl.getCount(), mode, physMs: impl.physMs() }; },
    };
}
