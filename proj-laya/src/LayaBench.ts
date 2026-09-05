/**
 * LayaBench — LayaAir 3.4 适配器（标准 Sprite 路径，接入 proj-laya 工程）
 * 实现 BenchRunner 契约：init / setCount / step / readDrawCalls / nodeCount
 *
 * 集成方式：
 *  - sim-core 4 个 js 已在 src/sim/（由 IDE 作为普通脚本编译，需在 Main.ts 前全局加载）
 *  - bunny 12 张图在 assets/resources/bench/（运行时 URL = resources/bench/xxx.png）
 *  - Main.onStart() 调 LayaBench.start()
 *  - WebGPU：项目 settings/PlayerSettings.json 已开 webgpu:true，发布产物走 webgpu 引擎
 *
 * 引擎 API（layaair v3.4.0 源码核实）：
 *  - DrawCall: LayaGL.statAgent.getElementData(StatElement.CT_DrawCall)
 *  - Laya 坐标系左上原点、y 向下，与仿真核心一致，无需换算
 */

const BUNNY_IMGS = [
    'rabbitv3.png', 'rabbitv3_ash.png', 'rabbitv3_batman.png', 'rabbitv3_bb8.png',
    'rabbitv3_neo.png', 'rabbitv3_sonic.png', 'rabbitv3_spidey.png', 'rabbitv3_stormtrooper.png',
    'rabbitv3_superman.png', 'rabbitv3_tron.png', 'rabbitv3_wolverine.png', 'rabbitv3_frankenstein.png'
];
const FISH_IMGS = [
    'fish_1.png', 'fish_2.png', 'fish_3.png', 'fish_1.png', 'fish_2.png'
];
const RES_PREFIX = 'resources/bench/';
const FISH_PREFIX = 'resources/fish/';

// 实时读数状态（buildHud 与 updateLive 共享）
let liveEl: HTMLElement | null = null;
let liveBackend = '';
let liveLastTs = 0;
let liveFpsEma = 16.7;

// 公平性说明：V2/V4 多纹理场景一律测引擎原生跨纹理批处理能力，不做任何手动图集干预
// （与 Egret/Cocos 测法一致）。Laya 此 build 的 WebGPU render-to-texture 仅在引擎帧渲染
// encoder 内有效，无法从 app 层合图；为保证两后端对等，WebGL 也不再手动合图。

export class LayaBench {
    static start(): void {
        const g: any = globalThis as any;
        const Laya = g.Laya;

        // init config 存入 window，供帧循环后端检测使用
        try {
            const cfgEl = document.querySelector('script[type="text/javascript"][src*="index.js"]');
            // Laya 3.4 index.js 在 Laya.init 之前把 config 对象暴露在 Laya.Config 或 _config
            // 此处保留 config 解析：直接从 Laya.Config 读取
            if (g.Laya && g.Laya.Config) {
                g.__layaInitConfig = {
                    webgpu: !!(g.Laya.Config.enableWebGPU ?? g.Laya.Config.webgpu ?? false)
                };
            }
        } catch (_) {}

        // 【公平性·SPEC 0】固定舞台逻辑尺寸 1280×720，三引擎统一（对齐 egret fixedSize）
        Laya.stage.setScreenSize(1280, 720);
        Laya.stage.scaleMode = Laya.stage.SCALE_NOSCALE;
        // 【公平性·SPEC 0】关抗锯齿（对齐 Egret 默认关 + WebGPU 单采样）
        if (g.Laya && g.Laya.Config) g.Laya.Config.isAntialias = false;

        const W = Laya.stage.width, H = Laya.stage.height;

        const adapter = new LayaAdapter(Laya.stage, W, H);
        const stats = new (g as any).BenchStats();
        const runner = new (g as any).BenchRunner(adapter, stats);

        const renderEngine = g.LayaGL && g.LayaGL.renderEngine;
        // ---- 全面诊断：把 renderEngine 状态暴露给 window，便于 DevTools 观察 ----
        try {
            const diag: any = {
                ctorName: renderEngine ? renderEngine.constructor.name : 'null',
                ctorStr: renderEngine ? Object.prototype.toString.call(renderEngine) : '',
                hasGPUDevice: typeof (globalThis as any).GPUDevice !== 'undefined',
                gpuAvailable: !!(globalThis as any).navigator?.gpu,
                keys: renderEngine ? Object.keys(renderEngine).slice(0, 30) : [],
            };
            if (renderEngine) {
                // 尝试常见字段
                for (const k of ['_device','device','_nativeDevice','_gpuDevice','_wgDevice','gpuDevice',
                    '_context','context','_gl','gl','_renderContext','renderContext',
                    '__gpu__','_webgpu','webgpu']) {
                    if (renderEngine[k] !== undefined) diag['field_' + k] = String(renderEngine[k]).slice(0, 80);
                }
            }
            (globalThis as any).__layaDiag = diag;
            console.log('[LayaBench] WebGPU diag:', JSON.stringify(diag).slice(0, 400));
        } catch (_) {}

        // 同 readBenchMetrics 多策略探针，确保 backend 与 readBenchMetrics 一致
        // NOTE：此时 renderEngine 可能为 null（WebGPU 异步初始化中）
        // 实际后端由帧循环延迟检测后写入 adapter._resolvedBackend
        let backend = 'pending';
        (globalThis as any).__layaBackend = backend;
        (globalThis as any).__layaEngineCtorName = renderEngine ? renderEngine.constructor.name : 'null';

        LayaBench.buildHud(Laya, runner, adapter, backend);

        // 帧循环入口：与 egret/cocos 适配器保持同一相对位置
        // NOTE：后端检测不依赖 LayaGL.renderEngine（该字段在部分 Laya 版本/路径下长期为 null），
        //       改用主渲染画布是否持有 webgpu 上下文作权威判定。
        Laya.timer.frameLoop(1, null, () => {
            const ts = performance.now();
            // 权威后端检测：主渲染画布（尺寸最大者）已持有 webgpu 上下文 → 真 WebGPU；
            // 已持有 webgl 上下文时 getContext('webgpu') 返回 null → WebGL。
            if ((adapter as any)._resolvedBackend === undefined) {
                let detected: string | undefined;
                const canvases = Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[];
                let main: HTMLCanvasElement | null = null;
                for (const c of canvases) {
                    if (!main || (c.width * c.height) > (main.width * main.height)) main = c;
                }
                if (main && main.width > 0) {
                    try {
                        detected = (main.getContext('webgpu') !== null) ? 'webgpu' : 'webgl';
                    } catch (_) { detected = 'webgl'; }
                }
                if (detected) {
                    (adapter as any)._resolvedBackend = detected;
                    (globalThis as any).__layaBackend = detected;
                    const eng = (globalThis as any).LayaGL && (globalThis as any).LayaGL.renderEngine;
                    (globalThis as any).__layaEngineCtorName = eng ? eng.constructor.name : 'null';
                    try {
                        (globalThis as any).__layaDiagReady = {
                            ctorName: eng ? eng.constructor.name : 'null',
                            detectedBackend: detected,
                            mainCanvas: main ? (main.width + 'x' + main.height) : 'none'
                        };
                        console.log('[LayaBench] backend resolved:', detected, main.width + 'x' + main.height);
                    } catch (_) {}
                }
            }
            runner.tick(ts);
            adapter.step(ts);
            LayaBench.updateLive(ts, runner, adapter);
        });

        // 自动测试：?auto=1&mode=fixed|ramp&variant=V1&count=10000（编排页用）
        // mode=ramp：承载力阶梯（autoRamp 出 cap + 逐档曲线），与 3D 水族馆/总控 RAMP_SCENES 口径一致
        const q = new URLSearchParams(location.search);
        if (q.get('auto') === '1') {
            const variant = q.get('variant') || 'V1';
            const count = parseInt(q.get('count') || '10000', 10) || 10000;
            const $v = document.querySelector('#lv') as HTMLSelectElement;
            const $c = document.querySelector('#cnt') as HTMLInputElement;
            if ($v) { $v.value = variant; }
            if ($c) { $c.value = String(count); }
            if (q.get('mode') === 'ramp') {
                LayaBench.loadAndRamp(Laya, runner, adapter, backend, $v);
            } else {
                LayaBench.loadAndRun(Laya, runner, adapter, backend, $v, $c);
            }
        }
    }

    /** 载入贴图并跑承载力阶梯（?auto=1&mode=ramp）：组合结果 cap/levels 写 __benchLastResult 供总控采集 */
    static loadAndRamp(Laya: any, runner: any, adapter: any, backend: string, $v: HTMLSelectElement): void {
        const $live = document.querySelector('#live') as HTMLElement;
        const variant = $v ? $v.value : 'boids';
        const names = variant === 'boids' ? FISH_IMGS
            : variant === 'V1' ? BUNNY_IMGS.slice(0, 1)
                : variant === 'V2' ? BUNNY_IMGS.slice(0, 8)
                    : BUNNY_IMGS;
        const prefix = variant === 'boids' ? FISH_PREFIX : RES_PREFIX;
        const urls = names.map((n: string) => prefix + n);
        const requested = new URLSearchParams(location.search).get('backend');
        const levels: any[] = [];
        Laya.loader.load(urls, Laya.Handler.create(null, () => {
            adapter.textures = urls.map((u: string) => Laya.loader.getRes(u));
            runner.autoRamp({
                engine: 'layaair-3.4.0', variant, backend,
                counts: [2000, 5000, 10000, 20000, 30000, 40000, 50000, 60000, 70000, 80000],
                preWarmSec: 5, sampleSec: 6,
                onLevel: (lv: any) => {
                    if (lv.phase === 'retry' && $live) {
                        $live.textContent = '档 ' + lv.count + ' 疑似抖动，加倍预热重测…';
                        return;
                    }
                    if (lv.phase === 'done' && lv.json) {
                        const j = lv.json;
                        levels.push({
                            count: lv.count, fps: j.fps, p50: j.p50, p95: j.p95, p99: j.p99,
                            p1Low: j.p1Low, stdDev: j.stdDev, drawCallAvg: j.drawCallAvg, nodeCount: j.nodeCount,
                            actualBackend: j.actualBackend, backendValid: j.backendValid,
                            gpuVendor: j.gpuVendor, gpuRenderer: j.gpuRenderer,
                            renderWidth: j.renderWidth, renderHeight: j.renderHeight, dpr: j.dpr,
                            stable: lv.stable
                        });
                    }
                },
                onDone: (r: any) => {
                    // 聚合逐档真实后端：WebGPU 臂中途静默回退 WebGL 必须在此暴露
                    const acts: string[] = [];
                    levels.forEach((l: any) => {
                        const b = l.actualBackend;
                        if (b && acts.indexOf(b) < 0) acts.push(b);
                    });
                    const resolved: string = (adapter as any)._resolvedBackend || backend || 'webgl';
                    const rt = acts.length === 1 ? acts[0] : resolved;
                    const rv = acts.length === 1 && rt === (requested || 'webgl');
                    const result = {
                        meta: {
                            engine: 'layaair-3.4.0', variant,
                            backend: rt, requestedBackend: requested || rt, backendValid: rv, mode: 'autoRamp'
                        },
                        cap: r.cap, jankAt: r.jankAt, capped: r.capped, invalidCurve: r.invalidCurve,
                        thresholdAt: r.thresholdAt, fineStart: r.fineStart, fineStep: r.fineStep,
                        levels
                    };
                    (window as any).__benchRampResult = result;
                    (globalThis as any).BenchRunner.exportJSON(result);
                    if ($live) {
                        $live.textContent = '承载力 ' + r.cap + ' 只' +
                            (r.jankAt != null ? '（掉帧档 ' + r.jankAt + '）' : '') +
                            (rv ? '' : ' ⚠ 运行时后端与请求不符');
                    }
                }
            });
            if ($live) { $live.textContent = '阶梯承载力测试中…'; }
        }));
    }

    /** 载入贴图并跑固定采样（HUD 按钮与自动测试共用） */
    private static loadAndRun(Laya: any, runner: any, adapter: any, backend: string,
        $v: HTMLSelectElement, $c: HTMLInputElement): void {
        const $live = document.querySelector('#live') as HTMLElement;
        const variant = $v ? $v.value : 'V1';
        const count = $c ? parseInt($c.value, 10) || 10000 : 10000;
        const names = variant === 'boids' ? FISH_IMGS
            : variant === 'V1' ? BUNNY_IMGS.slice(0, 1)
                : variant === 'V2' ? BUNNY_IMGS.slice(0, 8)
                    : BUNNY_IMGS;
        const prefix = variant === 'boids' ? FISH_PREFIX : RES_PREFIX;
        const urls = names.map((n: string) => prefix + n);
        Laya.loader.load(urls, Laya.Handler.create(null, () => {
            adapter.textures = urls.map((u: string) => Laya.loader.getRes(u));
            runner.fixedRun({
                engine: 'layaair-3.4.0', variant, backend, count
            });
            if ($live) { $live.textContent = '运行中…'; }
        }));
    }

    /** 实时读数：每 400ms 刷新一次（对齐 6_21 面板） */
    private static updateLive(ts: number, runner: any, adapter: any): void {
        if (liveLastTs) {
            const dt = Math.min(ts - liveLastTs, 100);
            liveFpsEma = liveFpsEma * 0.9 + dt * 0.1;
        }
        liveLastTs = ts;
        if (!liveEl) return;
        const now = performance.now();
        const lastLive = (window as any).__layaLastLive || 0;
        if (now - lastLive > 400) {
            (window as any).__layaLastLive = now;
            const dc = adapter.readDrawCalls ? adapter.readDrawCalls() : -1;
            liveEl.textContent =
                '后端: ' + liveBackend + '\n' +
                '视口: ' + adapter.W + '×' + adapter.H + '\n' +
                '数量: ' + adapter.nodeCount() + '\n' +
                'FPS: ' + (1000 / liveFpsEma).toFixed(1) + '\n' +
                (dc >= 0 ? 'drawCall: ' + Math.round(dc) : '');
        }
    }

    private static buildHud(Laya: any, runner: any, adapter: any, backend: string): void {
        liveBackend = backend;
        const style = document.createElement('style');
        style.textContent =
            '#hud{position:fixed;left:8px;top:8px;z-index:99998;background:rgba(16,22,30,.86);' +
            'backdrop-filter:blur(6px);border:1px solid #2b3947;border-radius:10px;padding:10px 12px;' +
            'color:#e6edf3;font:13px -apple-system,"PingFang SC","Microsoft YaHei",sans-serif;' +
            'width:380px;max-width:92vw;max-height:96vh;overflow:auto}' +
            '#hud h3{margin:0 0 8px;font-size:13px;color:#7fd4ff;font-weight:600}' +
            '#hud .row{display:flex;align-items:center;gap:8px;margin:6px 0;flex-wrap:wrap}' +
            '#hud .lbl{width:40px;color:#8aa0b4;flex:none;font-size:12px}' +
            '#hud select,#hud input{background:#0d1218;color:#e6edf3;border:1px solid #33475a;' +
            'border-radius:7px;padding:4px 8px;font-size:12px}' +
            '#hud input{width:70px}' +
            '#hud button{background:#1d2833;color:#cdd9e5;border:1px solid #33475a;' +
            'border-radius:7px;padding:4px 10px;cursor:pointer;font-size:12px}' +
            '#hud button:hover:not(:disabled){background:#27405f}' +
            '#hud button:disabled{opacity:.45;cursor:default}' +
            '#hud button.primary{background:#2f6feb;border-color:#2f6feb;color:#fff;font-weight:600}' +
            '#hud button.danger{background:#7a2f2f;border-color:#7a2f2f;color:#fff}' +
            '#hud .live{background:#0d1218;border:1px solid #2b3947;border-radius:8px;padding:7px 9px;' +
            'white-space:pre;font:11px/1.6 ui-monospace,Consolas,monospace;color:#9fe8a8}' +
            '#hud .bar{height:4px;background:#0d1218;border-radius:2px;overflow:hidden;margin:6px 0}' +
            '#hud .bar .fill{height:100%;width:0;background:#2f6feb;transition:width .2s}' +
            '#hud #report{background:#0d1218;border:1px solid #2b3947;border-radius:8px;padding:7px 9px;' +
            'white-space:pre-wrap;font:11px/1.6 ui-monospace,Consolas,monospace;color:#cdd9e5;' +
            'max-height:30vh;overflow:auto;display:none}' +
            '#hud .tip{margin-top:6px;font-size:11.5px;color:#7d93a8;line-height:1.5}';
        document.head.appendChild(style);

        const hud = document.createElement('div');
        hud.id = 'hud';
        hud.innerHTML =
            '<h3>🐰 LayaAir 3.4 [' + backend + ']</h3>' +
            '<div class="row"><span class="lbl">场景</span>' +
            '<select id="lv">' +
            '<option value="V1">Bunny V1 同纹理合批</option>' +
            '<option value="V2">Bunny V2 atlas多帧</option>' +
            '<option value="V3">Bunny V3 随机变换</option>' +
            '<option value="V4">Bunny V4 12纹理压力</option>' +
            '<option value="boids">水族馆 2D Boids</option>' +
            '</select></div>' +
            '<div class="row"><span class="lbl">数量</span>' +
            '<input id="cnt" type="number" value="10000" step="1000">' +
            '<button id="fixed" class="primary">固定采样</button>' +
            '<button id="ramp">阶梯压测</button></div>' +
            '<div class="row"><span class="lbl">增减</span>' +
            '<button id="add1k">+1千</button><button id="sub1k">-1千</button>' +
            '<button id="add10k">+1万</button><button id="sub10k">-1万</button></div>' +
            '<div class="row">' +
            '<button id="autoBtn" class="primary">▶ 一键自动测试</button>' +
            '<button id="stopBtn" class="danger">停止</button></div>' +
            '<div class="live" id="live">等待首帧…</div>' +
            '<div class="bar"><div class="fill" id="progFill"></div></div>' +
            '<div id="report"></div>' +
            '<div class="tip">固定采样：预热 3s + 采样 10s 出 P50/P95/P99。一键自动测试：档位阶梯逐级加压（预热1.2s+采样2s），≥55fps 记承载力，&lt;50fps 掉帧即停。结果 JSON 自动复制。</div>';
        document.body.appendChild(hud);
        const $v = hud.querySelector('#lv') as HTMLSelectElement;
        const $c = hud.querySelector('#cnt') as HTMLInputElement;
        const $out = hud.querySelector('#report') as HTMLElement;
        const $live = hud.querySelector('#live') as HTMLElement;
        const $fill = hud.querySelector('#progFill') as HTMLElement;
        liveEl = $live;

        runner.onReport = (json: any) => {
            $live.textContent = '完成: fps=' + json.fps + ' p50=' + json.p50 + 'ms p95=' + json.p95 +
                'ms p99=' + json.p99 + 'ms dc=' + json.drawCallAvg + ' nodes=' + json.nodeCount;
            (globalThis as any).BenchRunner.exportJSON(json);
        };
        (globalThis as any).BenchRunner.onSaved = (name: string) => {
            $live.textContent += ' | 已存: ' + name;
        };
        (globalThis as any).BenchRunner.onCopied = () => {
            $live.textContent += ' | 已复制 JSON';
        };

        hud.querySelector('#fixed')!.addEventListener('click', () => {
            LayaBench.loadAndRun(Laya, runner, adapter, backend, $v, $c);
        });
        hud.querySelector('#ramp')!.addEventListener('click', () => {
            loadAssets($v.value, () => {
                runner.rampRun({
                    engine: 'layaair-3.4.0', variant: $v.value, backend,
                    stepCount: 1000, stepMs: 2000, maxCount: 200000
                });
                $live.textContent = '阶梯压测中…';
            });
        });

        // 手动加减
        const bump = (d: number) => {
            if (!adapter.sim) { loadAssets($v.value, () => { }); }
            const cur = adapter.nodeCount();
            const next = Math.max(0, cur + d);
            adapter.setCount(next);
            $c.value = String(next);
        };
        hud.querySelector('#add1k')!.addEventListener('click', () => bump(1000));
        hud.querySelector('#sub1k')!.addEventListener('click', () => bump(-1000));
        hud.querySelector('#add10k')!.addEventListener('click', () => bump(10000));
        hud.querySelector('#sub10k')!.addEventListener('click', () => bump(-10000));

        // 一键自动测试（承载力阶梯）
        hud.querySelector('#autoBtn')!.addEventListener('click', () => {
            loadAssets($v.value, () => {
                $out.style.display = 'block';
                const lines: string[] = ['== 承载力测试 [' + backend + ' · ' + $v.value + '] =='];
                $out.textContent = lines.join('\n');
                runner.autoRamp({
                    engine: 'layaair-3.4.0', variant: $v.value, backend,
                    onLevel: (lv: any) => {
                        if (lv.phase === 'start') {
                            $fill.style.width = (lv.index / lv.total * 100).toFixed(1) + '%';
                            $live.textContent = lv.count + ' 只 · 稳定中…';
                        } else {
                            $fill.style.width = ((lv.index + 1) / lv.total * 100).toFixed(1) + '%';
                            const j = lv.json;
                            lines.push('  ' + lv.count + ' 只: ' + j.fps + 'fps ' +
                                (lv.stable ? '✓稳' : '✗掉帧') + ' | p95 ' + j.p95 + 'ms | dc ' + j.drawCallAvg);
                            $out.textContent = lines.join('\n');
                            (globalThis as any).BenchRunner.exportJSON(j);
                        }
                    },
                    onDone: (r: any) => {
                        if (r.capped) lines.push('▶ ⚠ 最高档 ' + r.cap + ' 只仍未掉帧：承载力被天花板截断');
                        else if (r.jankAt != null) lines.push('▶ 承载力: ' + r.cap + ' 只稳 ≥55fps（' + r.jankAt + ' 只掉帧）');
                        else lines.push('▶ 承载力: ' + r.cap + ' 只');
                        $out.textContent = lines.join('\n');
                        $fill.style.width = '100%';
                        $live.textContent = '自动测试完成，承载力 ' + r.cap + ' 只。';
                    }
                });
            });
        });
        hud.querySelector('#stopBtn')!.addEventListener('click', () => {
            runner.stopAuto();
            $live.textContent = '已停止。';
        });

        function loadAssets(variant: string, cb: () => void): void {
            const names = variant === 'boids' ? FISH_IMGS
                : variant === 'V1' ? BUNNY_IMGS.slice(0, 1)
                    : variant === 'V2' ? BUNNY_IMGS.slice(0, 8)
                        : BUNNY_IMGS;
            const prefix = variant === 'boids' ? FISH_PREFIX : RES_PREFIX;
            const urls = names.map((n: string) => prefix + n);
            Laya.loader.load(urls, Laya.Handler.create(null, () => {
                adapter.textures = urls.map((u: string) => Laya.loader.getRes(u));
                cb();
            }));
        }
    }
}

/** 适配器主体：标准 Laya.Sprite 路径 */
class LayaAdapter {
    textures: any[] = [];
    private sim: any = null;
    private nodes: any[] = [];
    private variant = 'V1';
    private mode = 'bunny';
    private extra: { rotSpeed: number; phase: number }[] = [];
    private lastTick = 0;

    constructor(private root: any, private W: number, private H: number) { }

    init(variant: string, bounds: any): void {
        this.clearAll();
        this.variant = variant;
        this.mode = variant === 'boids' ? 'boids' : 'bunny';
        const b = bounds || { left: 0, top: 0, right: this.W, bottom: this.H };
        const g: any = globalThis as any;
        this.sim = this.mode === 'boids'
            ? new g.BoidsSim(b.right - b.left, b.bottom - b.top)
            : new g.BunnySim(b);
    }

    clearAll(): void {
        this.root.removeChildren();
        this.nodes.length = 0;
        this.extra.length = 0;
    }

    private makeSprite(i: number): any {
        const g: any = globalThis as any;
        // 纹理选择（三引擎一致，SPEC 1.1）：
        //  boids: 鱼种 5 张轮换；V1/V3: 单贴图（V3=单贴图+变换）；V2: 8 张轮换；V4: 12 张轮换
        const tex = this.mode === 'boids'
            ? this.textures[this.sim.list[i].species % this.textures.length]
            : (this.variant === 'V1' || this.variant === 'V3') ? this.textures[0]
                : this.textures[i % this.textures.length];
        const sp = new g.Laya.Sprite();
        sp.texture = tex;
        // bunny 原版 anchor(0.5,1) → Laya pivot 底部中心；boids 用中心
        sp.pivot(13, this.mode === 'boids' ? 18 : 37);
        this.root.addChild(sp);
        if (this.variant === 'V3') {
            this.extra.push({ rotSpeed: (Math.random() - 0.5) * 4, phase: Math.random() * 6.28 });
        }
        return sp;
    }

    setCount(n: number): void {
        const cur = this.nodes.length;
        if (n > cur) {
            this.sim.add(n - cur);
            for (let i = cur; i < n; i++) this.nodes.push(this.makeSprite(i));
        } else if (n < cur) {
            this.sim.remove(cur - n);
            for (let j = cur - 1; j >= n; j--) {
                this.nodes[j].removeSelf();
                this.nodes.pop();
                if (this.extra.length) this.extra.pop();
            }
        }
    }

    step(ts: number): void {
        const dt = this.lastTick ? Math.min(ts - this.lastTick, 100) : 16.7;
        this.lastTick = ts;
        if (!this.sim) return;

        const list = this.sim.list, nodes = this.nodes, len = list.length;
        if (this.mode === 'boids') {
            this.sim.update(dt);
            for (let i = 0; i < len; i++) {
                nodes[i].pos(list[i].x, list[i].y);
                const cosA = Math.cos(list[i].angle);
                const s = list[i].scale || 1;
                nodes[i].scaleX = (cosA > 0 ? -s : s);
                nodes[i].scaleY = s;
                const tilt = cosA > 0 ? list[i].angle : (list[i].angle - Math.PI);
                nodes[i].rotation = tilt * 57.29577951;
            }
        } else {
            this.sim.update();
            if (this.variant === 'V3') {
                for (let i = 0; i < len; i++) {
                    nodes[i].pos(list[i].x, list[i].y);
                    this.extra[i].phase += 0.1;
                    nodes[i].rotation += this.extra[i].rotSpeed;
                    const s = 0.75 + 0.25 * Math.sin(this.extra[i].phase);
                    nodes[i].scale(s, s);
                }
            } else {
                for (let i = 0; i < len; i++) {
                    nodes[i].pos(list[i].x, list[i].y);
                }
            }
        }
    }

    readDrawCalls(): number {
        const g: any = globalThis as any;
        const L = g.Laya;
        // statAgent 在 Laya.LayaGL 命名空间下（发布产物里 globalThis.LayaGL 不存在）
        const statAgent = (g.LayaGL && g.LayaGL.statAgent) || (L && L.LayaGL && L.LayaGL.statAgent);
        const statEl = g.StatElement || (L && L.StatElement);
        if (statAgent && statEl) {
            const v = statAgent.getElementData(statEl.CT_2DDrawCall);
            return typeof v === 'number' ? v : -1;
        }
        return -1;
    }

    readBenchMetrics(): any {
        const g: any = globalThis as any;
        const engine = g.LayaGL && g.LayaGL.renderEngine;
        // 多策略探针：优先查 device 是否为 GPUDevice；其次查 constructor 名；duck-type；最后记录 diag
        // 使用帧循环设置的 _resolvedBackend，确保引擎已异步初始化完成
        const resolvedBackend: string = (this as any)._resolvedBackend || 'webgl';
        let actualBackend = resolvedBackend;
        // 记录调试信息供后续观察（DevTools: window.__layaActualBackend / __layaDiag）
        (globalThis as any).__layaActualBackend = actualBackend;
        (globalThis as any).__layaEngineCtorName = engine ? engine.constructor.name : 'null';
        try {
            if (engine) {
                const d2: any = {};
                for (const k of ['_device','device','_nativeDevice','_gpuDevice','gpuDevice',
                    '_wgDevice','_gl','gl','_context','context']) {
                    if (engine[k] !== undefined) d2['f_' + k] = String(engine[k]).slice(0, 60);
                }
                (globalThis as any).__layaDiagMetrics = d2;
            }
        } catch (_) {}
        return {
            actualBackend,
            renderWidth: this.W,
            renderHeight: this.H,
            antialias: false,
            workloadClass: this.variant === 'V4' ? 'finite-multi-texture-pressure' : 'standard',
            textureCount: this.variant === 'V1' || this.variant === 'V3' ? 1 : this.variant === 'V2' ? 8 : 12,
        };
    }

    nodeCount(): number { return this.nodes.length; }
}
