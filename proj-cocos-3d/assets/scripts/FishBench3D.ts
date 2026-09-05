/**
 * FishBench3D — Cocos Creator 3.8 3D 鱼群基准
 *
 * 移植自 Khronos webglsamples Aquarium：
 *   - 5 种鱼（SmallFishA / MediumFishA / MediumFishB / BigFishA / BigFishB）
 *   - 椭圆轨迹：x=sin(xClock)*xRadius, y=sin(yClock)*yRadius+height, z=cos(zClock)*zRadius
 *   - lookAt(nextPosition) 朝向游动方向
 *   - 尾巴弯曲：offset = mult^2 * sin(time + mult*waveLength) * bendAmount（CPU 顶点变形）
 *
 * 资源：resources/models/*.json + resources/textures/*_DM.jpg
 */
import { _decorator, Component, Node, MeshRenderer, resources, JsonAsset, Mesh, utils,
         ImageAsset, Texture2D, TextureCube, Material, director, game, Scene, Color, Vec3, Vec4, Camera, EffectAsset,
         Mat3, Quat } from 'cc';
const { ccclass, property } = _decorator;

// 外挂 sim-core 插件脚本（bench/web/sim-core，作为 Cocos 插件脚本随构建打入）
declare const BenchStats: any;
declare const BenchRunner: any;

interface FishDef {
    name: string;
    speed: number;
    speedRange: number;
    radius: number;
    radiusRange: number;
    tailSpeed: number;
    heightOffset: number;
    heightRange: number;
    fishLength: number;
    fishWaveLength: number;
    fishBendAmount: number;
    scale: number;      // 模型尺度
    count: number;      // 本种鱼数量
}

// 鱼种尾巴参数 [fishLength, fishWaveLength, fishBendAmount]（照原版 g_fishTable constUniforms）
const FISH_TAIL: Record<string, [number, number, number]> = {
    SmallFishA: [10, 1, 2],
    MediumFishA: [10, -2, 2],
    MediumFishB: [10, -2, 2],
    BigFishA: [10, -1, 0.5],
    BigFishB: [10, -0.7, 0.3],
};

interface FishInstance {
    def: FishDef;
    node: Node;
    renderer: MeshRenderer;    // 共享鱼种材质（实例化），per-fish 数据走 setInstancedAttribute
    phaseIdx: number;          // 本种内序号（相位错开）
    speed: number;
    xRadius: number;
    yRadius: number;
    zRadius: number;
    height: number;
    scale: number;
}

@ccclass('FishBench3D')
export class FishBench3D extends Component {

    @property
    public fishCount: number = 50;

    // 全局单例 guard：场景里若挂了多个 FishBench3D（编辑器内存遗留），只保留第一个
    private static _active: FishBench3D | null = null;

    // ---- 基准适配器（BenchRunner 契约）----
    private _runner: any = null;      // BenchRunner
    private _adapter: any = null;     // 适配器（本组件自实现契约）
    private _lastTs = 0;
    private _autoStarted = false;
    private _fishCountDynamic = -1;   // -1 表示未进入压测，用 fishCount 初始值
    private _outEl: HTMLElement | null = null;
    private _rampEl: HTMLElement | null = null;
    private _lastRampResult: any = null;

    private _fish: FishInstance[] = [];
    private _pos = new Vec3();
    private _next = new Vec3();
    private _fishMotion = new Float32Array(4);
    private _fishMotion2 = new Float32Array(4);
    private _clock = 0;          // 全局时钟（秒，模拟原版 clock）
    private _camNode: Node | null = null;
    private _lightNode: Node | null = null;
    private _eyeClock = 0;
    private _eyePos = new Vec3();
    private _effect: EffectAsset | null = null;
    private _envEffect: EffectAsset | null = null;
    private _seaweedEffect: EffectAsset | null = null;
    private _seaweedMats: { mat: Material; timeOffset: number }[] = [];
    // 原版 g.fish 全局参数
    private readonly _fishSpeed = 0.124;
    private readonly _fishOffset = 0.52;
    private readonly _fishHeight = 25;
    private readonly _fishHeightRange = 1;
    private readonly _fishXClock = 1;
    private readonly _fishYClock = 0.556;
    private readonly _fishZClock = 1;
    private readonly _fishTailSpeed = 1;

    onDestroy() {
        // 清除静态单例引用，防止 IDE 停止预览后重新运行时新实例被误判为"第二个"
        if (FishBench3D._active === this) FishBench3D._active = null;
    }

    onLoad() {
        // 单例：只让一个实例生效，其余直接失活（编辑器内存里可能残留多个节点）
        // 额外检查：若旧 _active 的节点已无效（IDE 重启预览后），强制清除
        if (FishBench3D._active && FishBench3D._active !== this) {
            const oldNode = FishBench3D._active.node;
            if (!oldNode || !oldNode.isValid) {
                FishBench3D._active = null;  // 旧实例已销毁，清除引用
            } else {
                this.enabled = false;
                return;
            }
        }
        FishBench3D._active = this;
        game.frameRate = 60;
        this.setupEnvironment();
        // 基准驱动：本组件即适配器，实现 BenchRunner 契约
        this._adapter = this;
        this._runner = new BenchRunner(this, new BenchStats());
        this._runner.onReport = (json: any) => {
            if (this._outEl) this._outEl.innerHTML = '完成: ' + JSON.stringify(json).slice(0, 500);
            BenchRunner.exportJSON(json);
        };
        BenchRunner.onSaved = (name: string) => {
            if (this._outEl) this._outEl.textContent += ' | 已存: ' + name;
        };
        this.buildHud();
        this.autoDrive();
    }

    // ---- BenchRunner 适配器契约 ----
    /** 资源就绪后执行（effect/props/materials 加载完才可 spawn） */
    private _ready = false;
    private _readyCbs: (() => void)[] = [];
    ready(cb: () => void) {
        if (this._ready) { cb(); return; }
        this._readyCbs.push(cb);
    }

    init(variant: string, bounds: any) {
        this.clearFish();
    }

    clearFish() {
        for (const f of this._fish) if (f.node && f.node.isValid) f.node.destroy();
        this._fish.length = 0;
    }

    /** 动态加减鱼到 n 条（按 buildDefs 分鱼种） */
    setCount(n: number) {
        const target = this.buildDefs(n);
        const curCount: Record<string, number> = {};
        for (const f of this._fish) curCount[f.def.name] = (curCount[f.def.name] || 0) + 1;
        for (const def of target) {
            const have = curCount[def.name] || 0;
            if (def.count > have) {
                for (let i = have; i < def.count; i++) this.spawnFish(def, i);
            } else if (def.count < have) {
                let toRemove = have - def.count;
                for (let i = this._fish.length - 1; i >= 0 && toRemove > 0; i--) {
                    if (this._fish[i].def.name === def.name) {
                        this._fish[i].node.destroy();
                        this._fish.splice(i, 1);
                        toRemove--;
                    }
                }
            }
        }
    }

    step(ts: number) {
        const dt = this._lastTs ? Math.min(ts - this._lastTs, 100) : 16.7;
        this._lastTs = ts;
        this._clock += dt / 1000;
        // CPU sim 计时探针：每帧鱼群模拟耗时滚动平均 → window.__fb3SimMs（定位 CPU vs GPU 瓶颈）
        const t0 = performance.now();
        for (const mat of this._fishMats.values()) mat.setProperty('simulationTime', new Vec4(this._clock, 0, 0, 0));
        for (const seaweed of this._seaweedMats) seaweed.mat.setProperty('waveTime', this._clock + seaweed.timeOffset);
        const simMs = performance.now() - t0;
        this._simMsAvg = this._simMsAvg * 0.9 + simMs * 0.1;
        (window as any).__fb3SimMs = this._simMsAvg;
        (window as any).__fb3FishN = this._fish.length;
        this.updateCamera(dt / 1000);
    }
    private _simMsAvg = 0;

    readDrawCalls(): number {
        const dev: any = director.root && director.root.device;
        if (!dev) return -1;
        if (dev.gl) {
            const P = (window as any).__ccGlProbe;
            if (!P) return -1;
            const fd = P.frameTotal - P.lastFrame;
            const dd = P.drawTotal - P.lastDraw;
            P.lastFrame = P.frameTotal;
            P.lastDraw = P.drawTotal;
            return fd > 0 ? dd / fd : -1;
        }
        return dev.numDrawCalls;
    }

    nodeCount(): number { return this._fish.length; }

    readBenchMetrics(): any {
        const backend = this.backend();
        const requested = new URLSearchParams(location.search).get('backend');
        const canvas: any = (game as any).canvas;
        return {
            actualBackend: backend,
            requestedBackend: requested || backend,
            backendValid: requested !== 'webgpu' || backend === 'webgpu',
            cpuSimMs: Math.round(this._simMsAvg * 100) / 100,
            fishCount: this._fish.length,
            renderWidth: canvas ? canvas.width : null,
            renderHeight: canvas ? canvas.height : null,
            dpr: window.devicePixelRatio || 1,
            userAgent: navigator.userAgent
        };
    }

    private backend(): string {
        const dev: any = director.root && director.root.device;
        if (dev && dev.gfxAPI !== undefined) {
            // gfx.API（cocos 3.8）：GLES2=1, GLES3=2, METAL=3, VULKAN=4, NVN=5, WEBGL=6, WEBGL2=7, WEBGPU=8
            const api = dev.gfxAPI;
            const b = api === 8 ? 'webgpu' : 'webgl';
            // 调试：把真实渲染后端暴露出来（webgpu 臂若浏览器无 navigator.gpu 会被 renderMode=4
            // 静默回退到 WebGL，此时 gfxAPI=6/7 = WEBGL/WEBGL2，必须如实标注而非沿用 webgpu）
            (window as any).__fb3RealBackend = b;
            (window as any).__fb3GfxAPI = api;
            console.info('[FishBench3D] gfxAPI=' + api + ' → backend=' + b + ' , navigator.gpu=' + !!(navigator as any).gpu);
            return b;
        }
        return (navigator as any).gpu ? 'webgpu' : 'webgl';
    }

    /** URL 参数驱动（bench 总控 iframe 自动采集）：?auto=1&mode=ramp|fixed&count=N */
    private autoDrive() {
        const q = new URLSearchParams(location.search);
        if (q.get('auto') !== '1' || this._autoStarted) return;
        this._autoStarted = true;
        const mode = q.get('mode') === 'ramp' ? 'ramp' : 'fixed';
        const count = parseInt(q.get('count') || '50', 10);
        if (mode === 'ramp') this.runAutoRamp(); else this.runFixed(count);
    }

    private runFixed(count: number) {
        this.ready(() => {
            const backend = this.backend();
            this._runner.fixedRun({
                engine: 'cocos-creator-3.8.8', variant: 'boids3d',
                backend, count
            });
            if (this._outEl) this._outEl.textContent = '运行中…';
        });
    }

    private runAutoRamp() {
        this.ready(() => {
            this._lastRampResult = null;
            const copyButton = document.querySelector('#fb3copy') as HTMLButtonElement | null;
            if (copyButton) copyButton.disabled = true;
            const backend = this.backend();
            const requested = new URLSearchParams(location.search).get('backend');
            const counts = [50, 500, 2000, 5000, 8000, 12000, 16000, 20000, 24000, 28000, 32000, 36000, 40000, 45000, 50000, 60000, 70000, 80000, 90000, 100000];
            const L: any[] = [];
            const renderLevels = () => {
                if (!this._rampEl) return;
                this._rampEl.textContent = L.map((l, i) =>
                    `${String(i + 1).padStart(2, '0')}. ${String(l.count).padStart(5, ' ')} 鱼 | ` +
                    `fps=${l.fps ?? '-'} | p95=${l.p95 ?? '-'}ms | ` +
                    `dc=${l.drawCallAvg ?? '-'} | cpu=${l.cpuSimMs ?? '-'}ms | ` +
                    `${l.stable ? '稳定' : '掉帧'}`
                ).join('\n');
            };
            this._runner.autoRamp({
                engine: 'cocos-creator-3.8.8', variant: 'boids3d', backend,
                counts, preWarmSec: 5, sampleSec: 6,
                onLevel: (l: any) => {
                    if (l.phase === 'retry' && this._outEl) {
                        this._outEl.textContent = `档 ${l.count} 疑似抖动，加倍预热重测…`;
                        return;
                    }
                    if (l.phase === 'done' && l.json) {
                        L.push({ count: l.count, fps: l.json.fps, p50: l.json.p50, p95: l.json.p95, p99: l.json.p99, p1Low: l.json.p1Low, stdDev: l.json.stdDev, drawCallAvg: l.json.drawCallAvg, cpuSimMs: l.json.cpuSimMs, fishCount: l.json.fishCount, actualBackend: l.json.actualBackend, backendValid: l.json.backendValid, gpuVendor: l.json.gpuVendor, gpuRenderer: l.json.gpuRenderer, renderWidth: l.json.renderWidth, renderHeight: l.json.renderHeight, dpr: l.json.dpr, stable: l.stable });
                        renderLevels();
                        if (this._outEl) this._outEl.textContent = `档 ${l.count} 完成 · ${L.length}/${l.total} 档`;
                    }
                },
                onDone: (r: any) => {
                    // 聚合逐档运行时真实后端（gfxAPI 读数）：WebGPU 臂中途静默回退 WebGL 必须在此暴露，
                    // 否则总控有效性判定基于发起时的读数放行脏数据
                    const actuals: string[] = [];
                    L.forEach((l: any) => {
                        const b = l.actualBackend;
                        if (b && actuals.indexOf(b) < 0) actuals.push(b);
                    });
                    const runtimeBackend = actuals.length === 1 ? actuals[0] : backend;
                    const runtimeValid = actuals.length === 1 && actuals[0] === backend
                        && (requested !== 'webgpu' || runtimeBackend === 'webgpu');
                    const result = {
                        meta: { engine: 'cocos-creator-3.8.8', variant: 'boids3d', backend: runtimeBackend, requestedBackend: requested || backend, backendValid: runtimeValid, mode: 'autoRamp', gpuVendor: (this._runner as any).stats?.gpuVendor || null, gpuRenderer: (this._runner as any).stats?.gpuRenderer || null },
                        cap: r.cap, jankAt: r.jankAt, capped: r.capped, invalidCurve: r.invalidCurve,
                        thresholdAt: r.thresholdAt, fineStart: r.fineStart, fineStep: r.fineStep, levels: L
                    };
                    this._lastRampResult = result;
                    if (copyButton) copyButton.disabled = false;
                    BenchRunner.exportJSON(result);
                    if (this._outEl) {
                        const tag = r.capped ? 'cap 顶格' : (r.thresholdAt != null ? '细扫收敛' : '跑完全程');
                        this._outEl.textContent = runtimeValid
                            ? `完成 · cap=${r.cap} 鱼 · 临界=${r.thresholdAt ?? '-'} · 掉帧档=${r.jankAt ?? '-'} · ${tag} · ${L.length} 档`
                            : '无效：WebGPU 已回退 WebGL 或逐档后端不一致';
                    }
                }
            });
            if (this._outEl) this._outEl.textContent = '阶梯压测中…';
        });
    }

    private buildHud() {
        const hud = document.createElement('div');
        hud.style.cssText = 'position:fixed;bottom:16px;left:16px;z-index:99999;width:510px;box-sizing:border-box;' +
            'color:#e6edf3;font:13px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;' +
            'background:rgba(13,17,23,.94);border:1px solid #30363d;border-radius:8px;' +
            'box-shadow:0 8px 24px rgba(0,0,0,.35);padding:12px';
        hud.innerHTML =
            '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">' +
            '<strong style="font-size:14px">Cocos 3D 水族馆</strong><span style="color:#8b949e">鱼群压测</span></div>' +
            '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
            '<label style="color:#8b949e">数量</label>' +
            '<input id="fb3cnt" type="number" value="50" step="50" style="width:82px;box-sizing:border-box;padding:5px 7px;color:#e6edf3;background:#0d1117;border:1px solid #30363d;border-radius:6px;outline:none">' +
            '<button id="fb3fixed">固定采样</button><button id="fb3ramp">阶梯压测</button><button id="fb3copy" disabled>复制结果</button></div>' +
            '<div id="fb3out" style="min-height:20px;margin-top:10px;color:#8b949e">待命中…</div>' +
            '<pre id="fb3levels" style="max-height:260px;overflow:auto;margin:8px 0 0;padding:8px;background:#010409;border:1px solid #21262d;border-radius:6px;white-space:pre;font:11px/1.5 Consolas,monospace"></pre>';
        const buttonStyle = 'padding:5px 10px;color:#fff;background:#238636;border:1px solid rgba(240,246,252,.1);border-radius:6px;font:13px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;cursor:pointer';
        for (const button of Array.from(hud.querySelectorAll('button')) as HTMLButtonElement[]) button.style.cssText = buttonStyle;
        const copyButton = hud.querySelector('#fb3copy') as HTMLButtonElement;
        copyButton.style.background = '#1f6feb';
        document.body.appendChild(hud);
        this._outEl = hud.querySelector('#fb3out') as HTMLElement;
        this._rampEl = hud.querySelector('#fb3levels') as HTMLElement;
        copyButton.addEventListener('click', async () => {
            if (!this._lastRampResult) {
                if (this._outEl) this._outEl.textContent = '暂无已完成的阶梯压测结果可复制';
                return;
            }
            const text = `${this._rampEl?.textContent || ''}\n\n--- JSON ---\n${JSON.stringify(this._lastRampResult, null, 2)}`;
            try {
                if (navigator.clipboard?.writeText) {
                    await navigator.clipboard.writeText(text);
                } else {
                    const area = document.createElement('textarea');
                    area.value = text;
                    area.style.cssText = 'position:fixed;opacity:0';
                    document.body.appendChild(area);
                    area.select();
                    const copied = document.execCommand('copy');
                    area.remove();
                    if (!copied) throw new Error('copy failed');
                }
                if (this._outEl) this._outEl.textContent = '结果已复制到剪贴板';
            } catch {
                if (this._outEl) this._outEl.textContent = '复制失败：浏览器未授予剪贴板权限';
            }
        });
        const $c = hud.querySelector('#fb3cnt') as HTMLInputElement;
        hud.querySelector('#fb3fixed')!.addEventListener('click', () => this.runFixed(parseInt($c.value, 10) || 50));
        hud.querySelector('#fb3ramp')!.addEventListener('click', () => this.runAutoRamp());
    }

    // 背景：内景场景 + 蓝绿水雾 + 环境光 + 相机
    private async setupEnvironment() {
        const scene = director.getScene();
        if (!scene) return;

        // 天空盒：水族馆海洋背景（GlobeOuter_EM 六面 cubemap）
        this.setupSkybox(scene);

        // 关阴影：50 鱼 + 90 场景模型全投阴影会在 WebGPU 下冻结（每帧大量 shadow pass）
        const shadows = scene.globals.shadows;
        if (shadows) shadows.enabled = false;

        // 主光关阴影 + 降强度（场景默认 illuminanceHDR=65000 会过曝）
        this._lightNode = scene.getChildByName('Main Light');
        if (this._lightNode) {
            const dl = this._lightNode.getComponent('cc.DirectionalLight') as any;
            if (dl) {
                dl.shadowEnabled = false;
                if (dl.illuminance !== undefined) dl.illuminance = 1.5;
                if (dl.illuminanceHDR !== undefined) dl.illuminanceHDR = 1.5;
            }
        }

        // 雾：蓝绿水色（照原版 fogRed 0.54 / fogGreen 0.86 / fogBlue 1.0）
        const fog = scene.globals.fog;
        fog.enabled = true;
        fog.type = 2; // FogType.EXP_SQUARED（近似原版雾衰减）
        fog.fogColor = new Color(0.54 * 255, 0.86 * 255, 1.0 * 255, 255);
        fog.fogDensity = 0.006;

        // 环境光偏蓝（照原版 ambient），并把场景默认 20000 的超高环境光强度降下来
        const ambient = scene.globals.ambient;
        ambient.skyColor = new Vec4(0.22, 0.25, 0.39, 1);
        ambient.skyIllum = 1.0;   // 场景默认 20000，会照白整个画面

        // 相机：天空盒背景，Inside 视角（相机在鱼群中心附近，鱼环绕四周）
        const camNode = scene.getChildByName('Main Camera');
        if (camNode) {
            this._camNode = camNode;
            const cam = camNode.getComponent(Camera);
            if (cam) {
                cam.clearColor = new Color(0, 0.8 * 255, 255, 255);
                cam.fov = 82.7;
                cam.near = 1;
                cam.far = 25000;
                // 关键：clearFlags 必须含 SKYBOX，否则天空盒不绘制（默认 SOLID_COLOR 只清纯色）
                (cam as any).clearFlags = (Camera as any).ClearFlag.SKYBOX;
            }
        }
    }

    // 天空盒：加载 GlobeOuter_EM 六面图，构造成 cubemap 赋给 skybox.envmap
    private async setupSkybox(scene: Scene) {
        const sky = scene.globals.skybox;
        const faces = ['positive_x', 'negative_x', 'positive_y', 'negative_y', 'positive_z', 'negative_z'];
        try {
            const imgs = await Promise.all(faces.map((f) => this.loadSkyImage(`skybox/GlobeOuter_EM_${f}`)));
            if (imgs.some((i) => !i)) {
                console.warn('天空盒部分面加载失败，回退纯色背景');
                sky.enabled = false;
                return;
            }
            const cube = new TextureCube();
            cube.image = {
                front: imgs[4]!,   // positive_z
                back: imgs[5]!,    // negative_z
                left: imgs[1]!,    // negative_x
                right: imgs[0]!,   // positive_x
                top: imgs[2]!,     // positive_y
                bottom: imgs[3]!,  // negative_y
            };
            sky.envmap = cube;
            sky.enabled = true;
        } catch (e) {
            console.warn('天空盒加载异常，回退纯色背景', e);
            sky.enabled = false;
        }
    }

    private loadSkyImage(path: string): Promise<ImageAsset | null> {
        return new Promise((resolve) => {
            // skybox 图默认导入为 Texture2D，用 /texture 子资源路径加载
            resources.load(`textures/${path}/texture`, Texture2D, (err, tex) => {
                if (!err && tex) {
                    const img = (tex as any).image;
                    resolve(img instanceof ImageAsset ? img : null);
                    return;
                }
                console.warn('天空盒面加载失败:', path, err);
                resolve(null);
            });
        });
    }

    private _started = false;
    async start() {
        if (this._started) return;   // 防止重复 spawn
        this._started = true;
        this._effect = await this.loadEffect();
        this._envEffect = await this.loadEnvEffect();
        this._seaweedEffect = await this.loadSeaweedEffect();
        await this.loadSceneProps();          // 先摆内景场景
        await this.warmupFishMaterials();     // 预构建 5 鱼种材质（各 1 次，shader 只编译 5 遍）
        // 资源就绪，放行等待中的基准驱动（autoRamp/fixed 会调 setCount）
        this._ready = true;
        const cbs = this._readyCbs.splice(0);
        cbs.forEach((c) => c());
        // 非压测访问（无 ?auto=1）：默认 fishCount 条，可直接观赏
        if (!this._autoStarted) this.setCount(this.fishCount);
        console.log(`[FishBench3D] 鱼群就绪: ${this._fish.length} 条`);
    }

    // 5 鱼种共享材质（材质只建一次，鱼实例共用；shader 编译只发生 5 次而非 N 次）
    private _fishMats = new Map<string, Material>();
    private _fishData = new Map<string, any>();
    private _fishMesh = new Map<string, Mesh>();
    private async warmupFishMaterials() {
        for (const name of ['SmallFishA', 'MediumFishA', 'MediumFishB', 'BigFishA', 'BigFishB']) {
            const data = await this.loadJson(`models/${name}`);
            if (!data) continue;
            const tex = await this.loadTexture(`${name}_DM`);
            const nm = await this.loadTexture(`${name}_NM`);
            // 只有部分鱼种有 RM 反射贴图（SmallFishA / MediumFishB）
            const hasRM = !!(data.models[0].textures && data.models[0].textures.reflectionMap);
            const rm = hasRM ? await this.loadTexture(`${name}_RM`) : null;
            const mat = this.buildFishMaterial(data, tex, nm, rm, name);
            if (mat) this._fishMats.set(name, mat);
            this._fishData.set(name, data);
        }
    }

    private buildFishMaterial(data: any, texture: Texture2D | null, normalMap: Texture2D | null, reflectionMap: Texture2D | null, name: string): Material {
        const mat = new Material();
        if (this._effect) {
            // 鱼走 technique 1（fish）：朝向+尾巴在 shader 内算，节点恒等变换 + 静态 mesh
            // USE_INSTANCING：per-fish 位置/朝向走实例化顶点属性，整种鱼合批成 1 draw
            mat.initialize({ effectAsset: this._effect, technique: 1, defines: { USE_INSTANCING: true } });
            mat.setProperty('mainColor', Color.WHITE);
            if (texture) mat.setProperty('mainTexture', texture);
            if (normalMap) mat.setProperty('normalMap', normalMap);
            if (reflectionMap) mat.setProperty('reflectionMap', reflectionMap);
            mat.setProperty('useReflection', reflectionMap ? 1 : 0);
            // 照原版 fishConst：ambient 蓝绿 + specular 白×0.3 + shininess 5（柔和高光）
            mat.setProperty('ambientColor', new Color(0.218 * 255, 0.502 * 255, 0.706 * 255, 255));
            mat.setProperty('specularColor', new Color(0.3 * 255, 0.3 * 255, 0.3 * 255, 255));
            mat.setProperty('shininess', 5.0);
            // 点光源固定在世界中心上方（原版随相机环绕，此处冻结以消除每帧 N 次 uniform 广播）
            mat.setProperty('lightWorldPos', new Vec4(0, 60, 0, 1));
            // 尾巴参数（fishLength, fishWaveLength, fishBendAmount）——按鱼种静态写入，spawn 时克隆
            const t = FISH_TAIL[name] || [10, 1, 2];
            mat.setProperty('fishTail', new Vec4(t[0], t[1], t[2], 0));
        } else {
            mat.initialize({ effectName: 'builtin-unlit', defines: { USE_TEXTURE: true } });
            mat.setProperty('mainColor', Color.WHITE);
            if (texture) mat.setProperty('mainTexture', texture);
        }
        return mat;
    }

    private loadEffect(): Promise<EffectAsset | null> {
        return new Promise((resolve) => {
            resources.load('effects/fish', EffectAsset, (err, eff) => {
                if (!err && eff) { resolve(eff as EffectAsset); return; }
                // 回退内置 unlit
                console.warn('自定义 fish.effect 加载失败，回退 builtin-unlit', err);
                resolve(null);
            });
        });
    }

    // 环境墙（EnvironmentBox/Skybox/GlobeBase）：无雾纯 diffuse（原版 fog:false）
    private loadEnvEffect(): Promise<EffectAsset | null> {
        return new Promise((resolve) => {
            resources.load('effects/env', EffectAsset, (err, eff) => {
                if (!err && eff) { resolve(eff as EffectAsset); return; }
                console.warn('自定义 env.effect 加载失败，回退 builtin-unlit', err);
                resolve(null);
            });
        });
    }

    private loadSeaweedEffect(): Promise<EffectAsset | null> {
        return new Promise((resolve) => {
            resources.load('effects/seaweed', EffectAsset, (err, eff) => {
                if (!err && eff) { resolve(eff as EffectAsset); return; }
                console.warn('自定义 seaweed.effect 加载失败，回退普通道具效果', err);
                resolve(null);
            });
        });
    }

    // 内景场景：珊瑚岩石沉船地板玻璃缸，摆放数据来自 PropPlacement.json
    private _modelCache = new Map<string, any>();
    private _matCache = new Map<string, Material>();
    private _texCache = new Map<string, Promise<Texture2D | null>>();

    private async loadSceneProps() {
        const placement = await this.loadJson('models/PropPlacement');
        if (!placement || !placement.objects) {
            console.warn('PropPlacement 加载失败，跳过场景');
            return;
        }
        // 要移植的模型：跳过鱼（已单独处理）和缸外硬结构（SupportBeams/GlobeOuter）
        // EnvironmentBox/Skybox/GlobeBase 是缸外环境背景墙（原版 fog:false），Inside 视角透过玻璃能看到
        const skip = new Set(['SmallFishA', 'MediumFishA', 'MediumFishB', 'BigFishA', 'BigFishB',
            'SupportBeams', 'GlobeOuter']);
        let count = 0;
        for (const obj of placement.objects) {
            const name: string = obj.name;
            if (skip.has(name)) continue;
            const node = await this.buildProp(name, obj.worldMatrix);
            if (node) count++;
        }
        console.log(`[FishBench3D] 内景场景就绪: ${count} 个模型`);
    }

    private async buildProp(name: string, worldMatrix: number[]): Promise<Node | null> {
        const modelData = await this.loadJson(`models/${name}`);
        if (!modelData) return null;

        // 从行主序 4x4 提取平移和旋转
        const pos = new Vec3(worldMatrix[12], worldMatrix[13], worldMatrix[14]);
        const m3 = new Mat3();
        // 行主序 → 列主序（转置）
        m3.set(
            worldMatrix[0], worldMatrix[4], worldMatrix[8],
            worldMatrix[1], worldMatrix[5], worldMatrix[9],
            worldMatrix[2], worldMatrix[6], worldMatrix[10],
        );
        const quat = new Quat();
        Quat.fromMat3(quat, m3);

        const root = new Node(name);
        root.layer = 1 << 30;

        // 多 model（如 SunknShip 船体/甲板/箱子）各自独立 mesh + 材质
        const models = modelData.models;
        for (let mi = 0; mi < models.length; mi++) {
            const mat = await this.buildPropMaterial(name, mi, models[mi]);
            const mesh = this.buildStaticMesh(models[mi]);
            if (!mesh || !mat) continue;
            const child = new Node(`${name}_${mi}`);
            child.layer = 1 << 30;
            const renderer = child.addComponent(MeshRenderer);
            renderer.mesh = mesh;
            renderer.material = mat;
            root.addChild(child);
        }

        // 挂到场景根节点，避免继承 Main Light 的旋转（灯有 pitch/roll，会让建筑歪出视野）
        const scene = director.getScene();
        const mount = (scene && scene.children.length) ? scene : this.node.parent || this.node;
        mount.addChild(root);
        root.setWorldPosition(pos);
        root.setWorldRotation(quat);
        return root;
    }
    private async buildPropMaterial(name: string, modelIdx: number, modelData: any): Promise<Material | null> {
        // 同名同 submodel 共享材质（shader 只编译一次；贴图相同）
        const key = `${name}_${modelIdx}`;
        const cached = this._matCache.get(key);
        if (cached) return cached;

        const textures = modelData.textures || {};
        const diffuseName = textures.diffuse || null;
        const normalName = textures.normalMap || null;
        const isGlass = name === 'GlobeInner' || name === 'GlobeOuter';
        // 环境背景墙（EnvironmentBox/Skybox/GlobeBase）：原版 fog:false + 无 normalMap，纯 diffuse 无光照
        const isEnvBox = name === 'EnvironmentBox' || name === 'Skybox' || name === 'GlobeBase';

        const isSeaweed = name === 'SeaweedA' || name === 'SeaweedB';
        const mat = new Material();
        if (isSeaweed && this._seaweedEffect) {
            mat.initialize({ effectAsset: this._seaweedEffect, technique: 0 });
            mat.setProperty('ambientColor', new Color(0.22 * 255, 0.25 * 255, 0.39 * 255, 255));
            mat.setProperty('lightWorldPos', new Vec4(0, 60, 0, 1));
            const timeOffset = this._seaweedMats.length;
            mat.setProperty('waveTime', timeOffset);
            this._seaweedMats.push({ mat, timeOffset });
        } else if (isGlass) {
            // 玻璃（GlobeInner 内壁）：纯淡蓝半透明，不贴 GlobeInner_DM 网格纹理，
            // 避免贴图里显眼的球面桁架骨架糊在背景上（原版玻璃近似全透折射）
            mat.initialize({
                effectName: 'builtin-unlit',
                technique: 1, // transparent
            });
            mat.setProperty('mainColor', new Color(190, 225, 255, 45));
            this._matCache.set(key, mat);
            return mat;
        } else if (!isSeaweed && isEnvBox) {
            // 无雾纯 diffuse 环境墙（直接用 env.effect，避免全局雾把远处环境墙冲淡）
            mat.initialize({ effectAsset: this._envEffect, technique: 0 });
        } else if (!isSeaweed && this._effect) {
            mat.initialize({ effectAsset: this._effect, technique: 0 });
            // 道具照原版 genericConst：ambient(0.22,0.25,0.39) + shininess 50 + specular 1
            mat.setProperty('ambientColor', new Color(0.22 * 255, 0.25 * 255, 0.39 * 255, 255));
            mat.setProperty('specularColor', Color.WHITE);
            mat.setProperty('shininess', 50.0);
            mat.setProperty('lightWorldPos', new Vec4(0, 60, 0, 1));
        } else {
            mat.initialize({ effectName: 'builtin-unlit', defines: { USE_TEXTURE: true } });
        }

        if (diffuseName) {
            let base = diffuseName.replace(/\.(jpg|png)$/, '');
            // EnvironmentBox 的环境贴图在 skybox/ 子目录（GlobeOuter_EM_*.jpg）
            if (isEnvBox && base.startsWith('GlobeOuter_EM')) base = `skybox/${base}`;
            const tex = await this.loadTexture(base);
            if (tex) mat.setProperty('mainTexture', tex);
        }
        if (normalName && this._effect && !isEnvBox) {
            const base = normalName.replace(/\.(png|jpg)$/, '');
            const nm = await this.loadTexture(base);
            if (nm) mat.setProperty('normalMap', nm);
        }

        mat.setProperty('mainColor', Color.WHITE);
        this._matCache.set(key, mat);
        return mat;
    }

    private buildStaticMesh(model: any): Mesh | null {
        const f = model.fields;
        const pos = f.position.data;
        const nor = f.normal ? f.normal.data : null;
        const uv = f.texCoord ? f.texCoord.data : null;
        const tan = f.tangent ? f.tangent.data : null;
        const idx = f.indices.data;
        const vertCount = pos.length / 3;

        const positions = new Float32Array(pos);
        const normals = nor ? new Float32Array(nor) : new Float32Array(vertCount * 3);
        const uvs = uv ? new Float32Array(uv) : new Float32Array(vertCount * 2);
        const tangents = tan ? new Float32Array(vertCount * 4) : null;
        if (tangents && tan) {
            for (let i = 0; i < vertCount; i++) {
                tangents[i * 4] = tan[i * 3];
                tangents[i * 4 + 1] = tan[i * 3 + 1];
                tangents[i * 4 + 2] = tan[i * 3 + 2];
                tangents[i * 4 + 3] = 1;
            }
        }
        const indices = new Uint16Array(idx.length);
        for (let i = 0; i < idx.length; i++) indices[i] = idx[i];

        const geom: any = {
            positions, normals, uvs, indices,
            minPos: { x: -1000, y: -1000, z: -1000 },
            maxPos: { x: 1000, y: 1000, z: 1000 },
        };
        if (tangents) geom.tangents = tangents;
        return utils.createMesh(geom);
    }

    private buildDefs(total?: number): FishDef[] {
        const totalFish = Math.max(1, total === undefined ? this.fishCount : total);
        const defs: FishDef[] = [
            { name: 'SmallFishA', speed: 1, speedRange: 1.5, radius: 30, radiusRange: 25, tailSpeed: 10, heightOffset: 0, heightRange: 16, fishLength: 10, fishWaveLength: 1, fishBendAmount: 2, scale: 1, count: 0 },
            { name: 'MediumFishA', speed: 1, speedRange: 2, radius: 10, radiusRange: 20, tailSpeed: 1, heightOffset: 0, heightRange: 16, fishLength: 10, fishWaveLength: -2, fishBendAmount: 2, scale: 1, count: 0 },
            { name: 'MediumFishB', speed: 0.5, speedRange: 4, radius: 10, radiusRange: 20, tailSpeed: 3, heightOffset: -8, heightRange: 5, fishLength: 10, fishWaveLength: -2, fishBendAmount: 2, scale: 1, count: 0 },
            { name: 'BigFishA', speed: 0.5, speedRange: 0.5, radius: 50, radiusRange: 3, tailSpeed: 1.5, heightOffset: 0, heightRange: 16, fishLength: 10, fishWaveLength: -1, fishBendAmount: 0.5, scale: 1, count: 0 },
            { name: 'BigFishB', speed: 0.5, speedRange: 0.5, radius: 45, radiusRange: 3, tailSpeed: 1, heightOffset: 0, heightRange: 16, fishLength: 10, fishWaveLength: -0.7, fishBendAmount: 0.3, scale: 1, count: 0 },
        ];
        // 压测分布 v2：大 2%/种、中 8%/种、小补满 —— 大/中鱼随总量线性增长
        // （旧 fishSetting=2 封顶公式使 5 万后大/中鱼数量恒定，负载不再随数量增长）
        const bigPer = Math.floor(totalFish * 0.02);
        const medPer = Math.floor(totalFish * 0.08);
        defs[3].count = Math.min(bigPer, totalFish);      // BigFishA
        defs[4].count = Math.min(bigPer, totalFish);      // BigFishB
        defs[1].count = Math.min(medPer, totalFish);      // MediumFishA
        defs[2].count = Math.min(medPer, totalFish);      // MediumFishB
        defs[0].count = Math.max(0, totalFish - defs[1].count - defs[2].count - defs[3].count - defs[4].count); // SmallFishA 补满
        return defs;
    }

    private spawnFish(def: FishDef, phaseIdx: number) {
        const data = this._fishData.get(def.name);
        const mat = this._fishMats.get(def.name);
        if (!data || !mat) return;
        const fish = this.buildFish(def, data, mat, phaseIdx);
        if (!fish) return;
        this._fish.push(fish);
    }

    private loadJson(path: string): Promise<any> {
        let p = this._modelCache.get(path);
        if (p) return p;
        p = new Promise((resolve) => {
            resources.load(path, JsonAsset, (err, asset) => {
                if (err) { console.error('模型 JSON 加载失败:', path, err); resolve(null); return; }
                resolve((asset as JsonAsset).json);
            });
        });
        this._modelCache.set(path, p);
        return p;
    }

    private loadTexture(path: string): Promise<Texture2D | null> {
        let p = this._texCache.get(path);
        if (p) return p;
        p = new Promise((resolve) => {
            resources.load(`textures/${path}/texture`, Texture2D, (err, tex) => {
                if (!err && tex) { resolve(tex as Texture2D); return; }
                resources.load(`textures/${path}`, ImageAsset, (e2, img) => {
                    if (!e2 && img) {
                        const t = new Texture2D();
                        t.image = img as ImageAsset;
                        resolve(t);
                        return;
                    }
                    console.error('贴图加载失败:', path, err || e2);
                    resolve(null);
                });
            });
        });
        this._texCache.set(path, p);
        return p;
    }

    private buildFish(def: FishDef, data: any, sharedMat: Material, phaseIdx: number): FishInstance | null {
        // 同种鱼共享同一 mesh（合批必需：实例化按 material+mesh 归组），只解码一次
        const mesh = this.getFishMesh(def.name, data);
        if (!mesh) return null;

        const node = new Node(def.name);
        node.layer = 1 << 30; // DEFAULT
        const renderer = node.addComponent(MeshRenderer);
        renderer.mesh = mesh;
        // 压测口径：关闭视锥剔除，与 Laya 侧 frustumCulled=false 对齐——两引擎都全量提交，
        // 避免一侧视锥剔鱼导致负载口径不对称（鱼位置由着色器实例参数计算，节点变换为参数假矩阵，
        // 引擎按节点 Bounds 视锥剔除的行为不可控且两引擎不一致）
        renderer.frustumCulling = false;

        // 共享鱼种材质（USE_INSTANCING）：必须用 setSharedMaterial（renderer.material= 会克隆成
        // MaterialInstance 破坏合批）。per-fish 位置走 setInstancedAttribute，引擎把整种鱼合批成 1 draw
        renderer.setSharedMaterial(sharedMat, 0);

        // 挂到场景根节点，避免继承 Main Light 的旋转（灯有 pitch/roll，会让鱼肚朝上）
        const scene = director.getScene();
        const root = (scene && scene.children.length) ? scene : this.node.parent || this.node;
        root.addChild(node);

        const scale = def.scale * (1.0 + Math.random());  // 照原版 fishScale=1
        // 实际缩放由 a_fishWorld.w 控制。节点仅保留一个覆盖整座水族馆的静态包围盒：
        // 避免每帧 setWorldPosition 触发 N 次世界矩阵/包围盒/裁剪更新，同时绝不误裁移动鱼。
        node.setScale(100, 100, 100);

        const motion = this._fishMotion;
        motion[0] = phaseIdx;
        motion[1] = def.speed + Math.random() * def.speedRange;
        motion[2] = def.radius + Math.random() * def.radiusRange;
        motion[3] = 2.0 + Math.random() * def.heightRange;
        const motion2 = this._fishMotion2;
        motion2[0] = def.radius + Math.random() * def.radiusRange;
        motion2[1] = def.heightOffset;
        motion2[2] = scale;
        motion2[3] = def.tailSpeed;
        renderer.setInstancedAttribute('a_fishMotion', motion);
        renderer.setInstancedAttribute('a_fishMotion2', motion2);

        return {
            def,
            node,
            renderer,
            phaseIdx,
            speed: motion[1],
            xRadius: motion[2],
            yRadius: motion[3],
            zRadius: motion2[0],
            height: motion2[1],
            scale: motion2[2],
        };
    }

    // 鱼种静态 mesh（朝向/尾巴在 shader 里做，节点恒等变换）：同种共享一个，只解码一次
    private getFishMesh(name: string, data: any): Mesh | null {
        const cached = this._fishMesh.get(name);
        if (cached) return cached;

        const model = data.models[0];
        const f = model.fields;
        const pos = f.position.data;
        const nor = f.normal.data;
        const uv = f.texCoord.data;
        const tan = f.tangent ? f.tangent.data : null;
        const idx = f.indices.data;
        const vertCount = pos.length / 3;

        const positions = new Float32Array(vertCount * 3);
        const normals = new Float32Array(vertCount * 3);
        const uvs = new Float32Array(vertCount * 2);
        const tangents = tan ? new Float32Array(vertCount * 4) : null;
        for (let i = 0; i < vertCount; i++) {
            positions[i * 3] = pos[i * 3];
            positions[i * 3 + 1] = pos[i * 3 + 1];
            positions[i * 3 + 2] = pos[i * 3 + 2];
            normals[i * 3] = nor[i * 3];
            normals[i * 3 + 1] = nor[i * 3 + 1];
            normals[i * 3 + 2] = nor[i * 3 + 2];
            // UV V 翻转：贴图花纹上下方向修正（红鱼不对称花纹需要）
            uvs[i * 2] = uv[i * 2];
            uvs[i * 2 + 1] = 1.0 - uv[i * 2 + 1];
            if (tangents && tan) {
                tangents[i * 4] = tan[i * 3];
                tangents[i * 4 + 1] = tan[i * 3 + 1];
                tangents[i * 4 + 2] = tan[i * 3 + 2];
                tangents[i * 4 + 3] = 1.0;
            }
        }
        const indices = new Uint16Array(idx.length);
        for (let i = 0; i < idx.length; i += 3) {
            // UV V 翻转等效镜像，绕序反转保持正面朝向
            indices[i] = idx[i + 1];
            indices[i + 1] = idx[i];
            indices[i + 2] = idx[i + 2];
        }
        const geom: any = {
            positions,
            normals,
            uvs,
            indices,
            minPos: { x: -5, y: -3, z: -10 },
            maxPos: { x: 5, y: 3, z: 10 },
        };
        if (tangents) geom.tangents = tangents;

        const mesh = utils.createMesh(geom);
        this._fishMesh.set(name, mesh);
        return mesh;
    }

    update(dt: number) {
        if (dt <= 0) return;
        const ts = performance.now();
        if (this._runner) this._runner.tick(ts);
        this.step(ts);
    }

    // 照原版 setToCameraLookAt：Inside 1（相机在鱼群内绕圈，鱼环绕四周）
    private updateCamera(dt: number) {
        const cam = this._camNode;
        if (!cam) return;
        this._eyeClock += dt * 0.0258;
        const t = this._eyeClock;
        this._eyePos.set(
            Math.sin(t) * 13.2,
            7.5,
            Math.cos(t) * 13.2,
        );
        cam.setWorldPosition(this._eyePos);
        this._next.set(
            Math.sin(t + Math.PI) * 91.6,
            35.0,
            Math.cos(t + Math.PI) * 91.6,
        );
        cam.lookAt(this._next);
    }

}

// FishBench3D 已直接挂在 bench3d.scene 的 Main Camera 上作为基准适配器（本组件自实现
// BenchRunner 契约，HUD id 为 fb3*，?auto=1&mode=ramp|fixed&count=N 驱动）。
// 无需再自动挂载，下方代码保留为手动调试入口（取消注释，场景无 FishBench3D 时自动添加）。
// director.on(Director.EVENT_AFTER_SCENE_LAUNCH, (scene: Scene) => {
//     if (!scene) return;
//     if (scene.getComponentInChildren(FishBench3D)) return;
//     const root = scene.getChildByName('Main Light') || scene.children[0];
//     if (root) root.addComponent(FishBench3D);
// });
