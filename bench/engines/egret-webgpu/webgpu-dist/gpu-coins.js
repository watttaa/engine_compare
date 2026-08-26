// GPU compute 金币迸溅粒子层（真实工程落地：把捕鱼击杀迸溅的金币视觉搬到 GPU）。
// 独立叠加 canvas + 独立 WebGPU device，零侵入 Egret 渲染管线。
// 主线程只在击杀时 emit(写少量起始态)，逐粒子物理积分全在 compute 并行。
// 对比对象：原版每金币一个 egret.Bitmap + 每帧 JS tickCoin + 显示树遍历。
//
// 用法：
//   const layer = await createGPUCoinLayer(canvas, { vaultX, vaultY });
//   layer.emit(x, y, n);   // 击杀处迸溅 n 个金币
//   （内部自带 RAF 循环渲染；layer.setVault(x,y) 可更新金库坐标）

const MAX = 200000;          // 粒子池上限
const FPP = 8;               // 每粒子 float 数：pos2 vel2 life1 seed1 size1 pad1
const PARTICLE_BYTES = FPP * 4;

const COMPUTE = /* wgsl */`
struct P { pos: vec2f, vel: vec2f, life: f32, seed: f32, size: f32, mode: f32 };
struct Sim { count: u32, vaultX: f32, vaultY: f32, dt: f32 };
@group(0) @binding(0) var<storage, read_write> ps: array<P>;
@group(0) @binding(1) var<uniform> sim: Sim;
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let i = gid.x;
  if (i >= sim.count) { return; }
  var p = ps[i];
  if (p.life <= 0.0) { return; }
  if (p.mode > 0.5) {
    // ===== 烟花模式：与 WebGL Bitmap 路径完全相同的物理 =====
    // 对应 JS: vy += 0.18; vx *= 0.985; vy *= 0.985; pos += v; life--
    p.vel.y += 0.18 * sim.dt;
    p.vel *= 0.985;
    p.pos += p.vel * sim.dt;
    p.life -= 0.02 * sim.dt;                 // 约 50 帧寿命，与 JS 侧 _life 一致
  } else {
    // ===== 金币模式：两段式，弹出后飞金库 =====
    let vault = vec2f(sim.vaultX, sim.vaultY);
    if (p.life > 0.7) {
      p.vel.y += 0.5 * sim.dt;
    } else {
      let d = vault - p.pos;
      let dist = max(length(d), 1.0);
      p.vel += (d / dist) * 3.2 * sim.dt;
      p.vel *= 0.92;
    }
    p.pos += p.vel * sim.dt;
    p.life -= 0.012 * sim.dt;
    if (length(vault - p.pos) < 24.0 && p.life < 0.7) { p.life = 0.0; }
  }
  ps[i] = p;
}`;

const RENDER = /* wgsl */`
struct P { pos: vec2f, vel: vec2f, life: f32, seed: f32, size: f32, mode: f32 };
struct U { proj: mat4x4f };
@group(0) @binding(0) var<uniform> u: U;
@group(0) @binding(1) var<storage, read> ps: array<P>;
@group(0) @binding(2) var samp: sampler;
@group(0) @binding(3) var tex: texture_2d<f32>;
struct Out { @builtin(position) pos: vec4f, @location(0) uv: vec2f, @location(1) tint: vec4f };
var<private> C: array<vec2f,4> = array<vec2f,4>(vec2f(-0.5,-0.5),vec2f(0.5,-0.5),vec2f(-0.5,0.5),vec2f(0.5,0.5));
@vertex fn vs(@builtin(vertex_index) vi:u32, @builtin(instance_index) ii:u32) -> Out {
  let p = ps[ii]; let c = C[vi];
  var o: Out;
  if (p.life <= 0.0) { o.pos = vec4f(2.0,2.0,2.0,1.0); return o; }
  var sz = p.size * (0.5 + 0.5*p.life);
  if (p.mode > 0.5) { sz = p.size; }
  o.pos = u.proj * vec4f(p.pos + c*sz, 0.0, 1.0);
  o.uv = c + vec2f(0.5, 0.5);                  // 贴图 uv: 0..1
  if (p.mode > 0.5) {
    // 烟花：与 WebGL 侧 egret.Bitmap 完全相同——原色贴图 + 末段线性淡出
    let fade = select(1.0, p.life / 0.3, p.life < 0.3);
    o.tint = vec4f(1.0, 1.0, 1.0, fade);
  } else {
    o.tint = vec4f(1.0, 1.0, 1.0, min(1.0, p.life*2.2));
  }
  return o;
}
@fragment fn fs(o: Out) -> @location(0) vec4f {
  let t = textureSample(tex, samp, o.uv);
  let a = t.a * o.tint.a;
  if (a <= 0.004) { discard; }
  return vec4f(t.rgb * a, a);                  // premultiplied
}`;

function orthoTL(w, h) {
  return new Float32Array([2 / w, 0, 0, 0, 0, -2 / h, 0, 0, 0, 0, 1, 0, -1, 1, 0, 1]);
}

export async function createGPUCoinLayer(canvas, opts = {}) {
  if (!('gpu' in navigator)) throw new Error('no navigator.gpu');
  const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
  if (!adapter) throw new Error('no adapter');
  const device = await adapter.requestDevice();
  const ctx = canvas.getContext('webgpu');
  const format = navigator.gpu.getPreferredCanvasFormat();
  // 叠加层必须透明合成，才能透出下面的 Egret 游戏画面。
  ctx.configure({ device, format, alphaMode: 'premultiplied' });

  const pbuf = device.createBuffer({ size: MAX * PARTICLE_BYTES, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
  const simBuf = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const projBuf = device.createBuffer({ size: 64, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

  const cBgl = device.createBindGroupLayout({ entries: [
    { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
    { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } }] });
  const cPipe = device.createComputePipeline({ layout: device.createPipelineLayout({ bindGroupLayouts: [cBgl] }),
    compute: { module: device.createShaderModule({ code: COMPUTE }), entryPoint: 'main' } });
  const cBind = device.createBindGroup({ layout: cBgl, entries: [
    { binding: 0, resource: { buffer: pbuf } }, { binding: 1, resource: { buffer: simBuf } }] });

  // ===== 粒子贴图 =====
  // 用与 Egret 侧同一张金币图，保证 GPU 路径与 WebGL Bitmap 路径视觉完全一致。
  // 贴图未就绪前先用 1x1 透明占位，避免管线创建失败。
  const sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear' });
  let particleTex = device.createTexture({
    size: [1, 1], format: 'rgba8unorm',
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT });
  device.queue.writeTexture({ texture: particleTex }, new Uint8Array([255, 255, 255, 255]), {}, [1, 1]);

  const rBgl = device.createBindGroupLayout({ entries: [
    { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform' } },
    { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: 'read-only-storage' } },
    { binding: 2, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
    { binding: 3, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } }] });
  const rPipe = device.createRenderPipeline({ layout: device.createPipelineLayout({ bindGroupLayouts: [rBgl] }),
    vertex: { module: device.createShaderModule({ code: RENDER }), entryPoint: 'vs' },
    fragment: { module: device.createShaderModule({ code: RENDER }), entryPoint: 'fs',
      targets: [{ format, blend: { color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' }, alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' } } }] },
    primitive: { topology: 'triangle-strip' } });
  let rBind = device.createBindGroup({ layout: rBgl, entries: [
    { binding: 0, resource: { buffer: projBuf } }, { binding: 1, resource: { buffer: pbuf } },
    { binding: 2, resource: sampler }, { binding: 3, resource: particleTex.createView() }] });

  // 外部注入真实贴图（ImageBitmap / HTMLImageElement / Canvas）
  async function setTexture(src) {
    let bmp = src;
    if (!(src instanceof ImageBitmap)) bmp = await createImageBitmap(src);
    particleTex = device.createTexture({
      size: [bmp.width, bmp.height], format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT });
    device.queue.copyExternalImageToTexture({ source: bmp }, { texture: particleTex }, [bmp.width, bmp.height]);
    rBind = device.createBindGroup({ layout: rBgl, entries: [
      { binding: 0, resource: { buffer: projBuf } }, { binding: 1, resource: { buffer: pbuf } },
      { binding: 2, resource: sampler }, { binding: 3, resource: particleTex.createView() }] });
  }

  let vaultX = opts.vaultX || 100, vaultY = opts.vaultY || 100;
  let W = canvas.width, H = canvas.height;
  let head = 0;                 // 环形写头
  let liveHint = 0;             // 活跃粒子上界（渲染/dispatch 只算到此，省开销）
  let enabled = true;
  let emitted = 0;              // 累计发射数（统计用）

  // CPU 侧临时缓冲：emit 时批量写起始态，一次 writeBuffer 上传。
  // mode: 0=金币(飞金库) 1=烟花(重力+阻尼+淡出，与 WebGL Bitmap 路径同物理)
  // szMin/szMax: 烟花模式的火花像素尺寸区间，由调用方按 WebGL 侧 贴图宽×scale 换算传入
  function emit(x, y, n, mode, szMin, szMax) {
    if (!enabled || n <= 0) return;
    n = Math.min(n, 2000);      // 单次上限，防爆
    const isFw = mode === 1;
    const s0 = szMin || 16, s1 = szMax || 32;
    const arr = new Float32Array(n * FPP);
    for (let i = 0; i < n; i++) {
      const o = i * FPP;
      const ang = Math.random() * Math.PI * 2;
      if (isFw) {
        // 与 WebGL 侧 spawnFirework 完全相同的初始分布
        const spd = 2 + Math.random() * 6;
        arr[o] = x; arr[o + 1] = y;
        arr[o + 2] = Math.cos(ang) * spd;
        arr[o + 3] = Math.sin(ang) * spd;
        arr[o + 4] = 1.0;                      // life
        arr[o + 5] = Math.random();
        arr[o + 6] = s0 + Math.random() * (s1 - s0);
        arr[o + 7] = 1;                        // mode=烟花
      } else {
        const pw = 4 + Math.random() * 6;
        arr[o] = x; arr[o + 1] = y;
        arr[o + 2] = Math.cos(ang) * pw;
        arr[o + 3] = Math.sin(ang) * pw - 3;
        arr[o + 4] = 1.0;
        arr[o + 5] = Math.random();
        arr[o + 6] = 9 + Math.random() * 6;
        arr[o + 7] = 0;                        // mode=金币
      }
    }
    // 环形写入：若尾部放不下则回绕，分两段写。
    let start = head;
    if (start + n <= MAX) {
      device.queue.writeBuffer(pbuf, start * PARTICLE_BYTES, arr.buffer, 0, n * PARTICLE_BYTES);
      head = (start + n) % MAX;
    } else {
      const first = MAX - start;
      device.queue.writeBuffer(pbuf, start * PARTICLE_BYTES, arr.buffer, 0, first * PARTICLE_BYTES);
      device.queue.writeBuffer(pbuf, 0, arr.buffer, first * PARTICLE_BYTES, (n - first) * PARTICLE_BYTES);
      head = n - first;
    }
    liveHint = Math.min(MAX, Math.max(liveHint, head === 0 ? MAX : head, start + n));
    emitted += n;
  }

  function frame() {
    W = canvas.width; H = canvas.height;
    const count = liveHint;
    // sim uniform：count, vaultX, vaultY, dt
    const u = new Float32Array([0, vaultX, vaultY, 1.0]);
    new Uint32Array(u.buffer)[0] = count;
    device.queue.writeBuffer(simBuf, 0, u.buffer);
    device.queue.writeBuffer(projBuf, 0, orthoTL(W, H).buffer);
    const enc = device.createCommandEncoder();
    if (count > 0) {
      const cp = enc.beginComputePass();
      cp.setPipeline(cPipe); cp.setBindGroup(0, cBind);
      cp.dispatchWorkgroups(Math.ceil(count / 64)); cp.end();
    }
    const rp = enc.beginRenderPass({ colorAttachments: [{
      view: ctx.getCurrentTexture().createView(),
      clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: 'clear', storeOp: 'store' }] });
    if (count > 0) { rp.setPipeline(rPipe); rp.setBindGroup(0, rBind); rp.draw(4, count); }
    rp.end();
    device.queue.submit([enc.finish()]);
  }

  let raf = 0;
  function loop() { if (enabled) frame(); raf = requestAnimationFrame(loop); }
  loop();

  return {
    emit,
    setTexture,
    setVault(x, y) { vaultX = x; vaultY = y; },
    setEnabled(v) { enabled = !!v; if (enabled && !raf) loop(); },
    resize(w, h) { canvas.width = w; canvas.height = h; },
    stats() { return { emitted, liveHint, drawCall: liveHint > 0 ? 1 : 0 }; },
    device
  };
}
