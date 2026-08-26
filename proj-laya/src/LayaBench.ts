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
const FISH_IMGS = BUNNY_IMGS.slice(1, 6);
const RES_PREFIX = 'resources/bench/';

export class LayaBench {
    static start(): void {
        const g: any = globalThis as any;
        const Laya = g.Laya;

        // 【公平性·SPEC 0】固定舞台逻辑尺寸 1280×720，三引擎统一（对齐 egret fixedSize）
        Laya.stage.setScreenSize(1280, 720);
        Laya.stage.scaleMode = Laya.stage.SCALE_NOSCALE;
        // 【公平性·SPEC 0】关抗锯齿（对齐 Egret 默认关 + WebGPU 单采样）
        if (g.Laya && g.Laya.Config) g.Laya.Config.isAntialias = false;

        const W = Laya.stage.width, H = Laya.stage.height;

        const adapter = new LayaAdapter(Laya.stage, W, H);
        const stats = new (g as any).BenchStats();
        const runner = new (g as any).BenchRunner(adapter, stats);

        // 后端探测：navigator.gpu 可用 && 项目开 webgpu → 跑 webgpu，否则 webgl
        const backend = (typeof navigator !== 'undefined' && (navigator as any).gpu) ? 'webgpu' : 'webgl';

        LayaBench.buildHud(Laya, runner, adapter, backend);

        // 帧循环入口：与 egret/cocos 适配器保持同一相对位置
        Laya.timer.frameLoop(1, null, () => {
            const ts = performance.now();
            runner.tick(ts);
            adapter.step(ts);
        });
    }

    private static buildHud(Laya: any, runner: any, adapter: any, backend: string): void {
        const style = document.createElement('style');
        style.textContent =
            '#hud{position:fixed;left:8px;top:8px;z-index:99998;background:rgba(16,22,30,.86);' +
            'backdrop-filter:blur(6px);border:1px solid #2b3947;border-radius:10px;padding:10px 12px;' +
            'color:#e6edf3;font:13px -apple-system,"PingFang SC","Microsoft YaHei",sans-serif;' +
            'width:360px;max-width:92vw;max-height:96vh;overflow:auto}' +
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
            '#hud .live{background:#0d1218;border:1px solid #2b3947;border-radius:8px;padding:7px 9px;' +
            'white-space:pre;font:11px/1.6 ui-monospace,Consolas,monospace;color:#9fe8a8}' +
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
            '<option value="V4">Bunny V4 不合批</option>' +
            '<option value="boids">水族馆 2D Boids</option>' +
            '</select></div>' +
            '<div class="row"><span class="lbl">数量</span>' +
            '<input id="cnt" type="number" value="10000" step="1000">' +
            '<button id="fixed" class="primary">固定采样</button>' +
            '<button id="ramp">阶梯压测</button></div>' +
            '<div class="live" id="out">待命中…</div>' +
            '<div class="tip">固定采样：预热 3s + 采样 10s 出 P50/P95/P99；阶梯压测：每 2s +1000，跌破 55fps 持续 2s 判定承载力。结果 JSON 自动复制。</div>';
        document.body.appendChild(hud);
        const $v = hud.querySelector('#lv') as HTMLSelectElement;
        const $c = hud.querySelector('#cnt') as HTMLInputElement;
        const $out = hud.querySelector('#out') as HTMLElement;

        runner.onReport = (json: any) => {
            $out.innerHTML = '完成: ' + JSON.stringify(json).slice(0, 500);
            (globalThis as any).BenchRunner.exportJSON(json);
        };
        (globalThis as any).BenchRunner.onSaved = (name: string) => {
            $out.textContent += ' | 已存: ' + name;
        };
        (globalThis as any).BenchRunner.onCopied = () => {
            $out.textContent += ' | 已复制 JSON';
        };
        hud.querySelector('#fixed')!.addEventListener('click', () => {
            loadAssets($v.value, () => {
                runner.fixedRun({
                    engine: 'layaair-3.4.0', variant: $v.value, backend,
                    count: parseInt($c.value, 10) || 10000
                });
                $out.textContent = '运行中…';
            });
        });
        hud.querySelector('#ramp')!.addEventListener('click', () => {
            loadAssets($v.value, () => {
                runner.rampRun({
                    engine: 'layaair-3.4.0', variant: $v.value, backend,
                    stepCount: 1000, stepMs: 2000, maxCount: 200000
                });
                $out.textContent = '阶梯压测中…';
            });
        });

        function loadAssets(variant: string, cb: () => void): void {
            const names = variant === 'boids' ? FISH_IMGS
                : variant === 'V1' ? BUNNY_IMGS.slice(0, 1)
                    : variant === 'V2' ? BUNNY_IMGS.slice(0, 8)
                        : BUNNY_IMGS;
            const urls = names.map((n: string) => RES_PREFIX + n);
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
        const tex = this.mode === 'boids'
            ? this.textures[this.sim.list[i].species % this.textures.length]
            : this.variant === 'V1' ? this.textures[0]
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
                nodes[i].rotation = list[i].angle * 57.29577951;
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
        const statEl = g.StatElement || (g.Laya && g.Laya.StatElement);
        if (g.LayaGL && g.LayaGL.statAgent && statEl) {
            // 2D 场景只记 CT_2DDrawCall（CT_DrawCall 仅 3D 路径），两者相加兼容混合场景
            const dc2d = g.LayaGL.statAgent.getElementData(statEl.CT_2DDrawCall);
            const dcAll = g.LayaGL.statAgent.getElementData(statEl.CT_DrawCall);
            return dc2d + dcAll;
        }
        return -1;
    }

    nodeCount(): number { return this.nodes.length; }
}
