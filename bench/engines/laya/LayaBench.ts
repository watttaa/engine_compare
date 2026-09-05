/**
 * LayaBench — LayaAir 3.4 适配器（标准 Sprite 路径）
 * 实现 BenchRunner 契约：init / setCount / step / readDrawCalls / nodeCount
 *
 * 使用步骤（README 详述）：
 *  1. LayaAir IDE 3.4 新建空 TS 项目
 *  2. bench/sim-core 的 4 个 js 放入项目（全局加载，如 GameConfig 前引入）
 *  3. bench/assets 的 12 张 png 拷到 res/bench/
 *  4. 在入口（Game.ts 的 Laya.init 完成后）调用 LayaBench.start()
 *
 * 验证过的引擎 API（layaair v3.4.0 源码）：
 *  - DrawCall: LayaGL.statAgent.getElementData(StatElement.CT_DrawCall)
 *    （引擎自带 sample Sprite_LargeTexManager_Simple.ts L156 同款用法）
 *  - Laya 坐标系与仿真核心一致（左上原点、y 向下），无需换算
 */
declare const BunnySim: any;
declare const BoidsSim: any;
declare const BenchStats: any;
declare const BenchRunner: any;

const BUNNY_IMGS = [
    'rabbitv3.png', 'rabbitv3_ash.png', 'rabbitv3_batman.png', 'rabbitv3_bb8.png',
    'rabbitv3_neo.png', 'rabbitv3_sonic.png', 'rabbitv3_spidey.png', 'rabbitv3_stormtrooper.png',
    'rabbitv3_superman.png', 'rabbitv3_tron.png', 'rabbitv3_wolverine.png', 'rabbitv3_frankenstein.png'
];
const FISH_IMGS = BUNNY_IMGS.slice(1, 6);
const RES_PREFIX = 'res/bench/';

export class LayaBench {
    static start(): void {
        const g: any = globalThis as any;
        const Laya = g.Laya;
        const W = Laya.stage.width, H = Laya.stage.height;

        const adapter = new LayaAdapter(Laya.stage, W, H);
        const stats = new BenchStats();
        const runner = new BenchRunner(adapter, stats);
        LayaBench.buildHud(Laya, runner, adapter);

        // 帧循环入口：与 egret/cocos 适配器保持同一相对位置
        Laya.timer.frameLoop(1, null, () => {
            const ts = performance.now();
            runner.tick(ts);
            adapter.step(ts);
        });
    }

    private static buildHud(Laya: any, runner: any, adapter: any): void {
        const hud = document.createElement('div');
        hud.style.cssText = 'position:fixed;top:8px;left:8px;z-index:99;color:#fff;' +
            'font:12px/1.6 Consolas,monospace;background:rgba(0,0,0,.55);padding:8px 10px;border-radius:4px';
        hud.innerHTML =
            'LayaAir-3.4 | ' +
            '<select id="lv">' +
            '<option value="V1">Bunny V1 同纹理合批</option>' +
            '<option value="V2">Bunny V2 atlas多帧</option>' +
            '<option value="V3">Bunny V3 随机变换</option>' +
            '<option value="V4">Bunny V4 不合批</option>' +
            '<option value="boids">水族馆 2D Boids</option>' +
            '</select>' +
            '<input id="cnt" type="number" value="10000" step="1000" style="width:70px">' +
            '<button id="fixed">固定采样</button>' +
            '<button id="ramp">阶梯压测</button>' +
            '<button id="sdir">保存目录</button>' +
            '<div id="out">待命中…</div>';
        document.body.appendChild(hud);
        const $v = hud.querySelector('#lv') as HTMLSelectElement;
        const $c = hud.querySelector('#cnt') as HTMLInputElement;
        const $out = hud.querySelector('#out') as HTMLElement;

        runner.onReport = (json: any) => {
            $out.innerHTML = '完成: ' + JSON.stringify(json).slice(0, 500);
            BenchRunner.exportJSON(json);
        };
        BenchRunner.onSaved = (name: string) => {
            $out.textContent += ' | 已存: ' + name;
        };
        hud.querySelector('#sdir')!.addEventListener('click', () => BenchRunner.pickSaveDir());

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

        hud.querySelector('#fixed')!.addEventListener('click', () => {
            loadAssets($v.value, () => {
                runner.fixedRun({
                    engine: 'layaair-3.4.0', variant: $v.value, backend: 'webgl',
                    count: parseInt($c.value, 10) || 10000
                });
                $out.textContent = '运行中…';
            });
        });
        hud.querySelector('#ramp')!.addEventListener('click', () => {
            loadAssets($v.value, () => {
                runner.rampRun({
                    engine: 'layaair-3.4.0', variant: $v.value, backend: 'webgl',
                    stepCount: 1000, stepMs: 2000, maxCount: 200000
                });
                $out.textContent = '阶梯压测中…';
            });
        });
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
        this.sim = this.mode === 'boids'
            ? new BoidsSim(b.right - b.left, b.bottom - b.top)
            : new BunnySim(b);
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
        sp.pivot(this.mode === 'boids' ? 13 : 13, this.mode === 'boids' ? 18 : 37);
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

    /**
     * DrawCall 采集：WebGL API hook（window.__layaGlProbe）
     *  - build.js 在 Laya 产物 index.html 注入探针（同 Cocos 的 __ccGlProbe 方案，口径一致）
     *  - 探针 hook WebGL(2)RenderingContext.prototype 的 draw* 方法 + getExtension 包装
     *  - 每帧增量 = drawTotal 差值 / frameTotal 差值（窗口均值，同 Egret/Cocos 口径）
     *  - WebGPU 后端不走 WebGL 路径，probe 无效，回落 CT_2DDrawCall（合批后元素数，引擎官方口径）
     */
    readDrawCalls(): number {
        const P = (globalThis as any).__layaGlProbe;
        if (P) {
            const fd = P.frameTotal - P.lastFrame;
            const dd = P.drawTotal - P.lastDraw;
            P.lastFrame = P.frameTotal;
            P.lastDraw = P.drawTotal;
            // fd>0 且 dd>0 表示 WebGL 路径有实际 draw，优先使用
            if (fd > 0 && dd > 0) return dd / fd;
        }
        // WebGPU 后端或 probe 未注入：回落引擎计数器（CT_2DDrawCall）
        const g: any = globalThis as any;
        const statEl = g.StatElement || (g.Laya && g.Laya.StatElement);
        if (g.LayaGL && g.LayaGL.statAgent && statEl != null) {
            const dc2d = g.LayaGL.statAgent.getElementData(statEl.CT_2DDrawCall);
            return dc2d >= 0 ? dc2d : -1;
        }
        return -1;
    }

    nodeCount(): number { return this.nodes.length; }
}
