/**
 * CocosBench — Cocos Creator 3.8.8 适配器（标准节点路径）
 * 实现 BenchRunner 契约：init / setCount / step / readDrawCalls / nodeCount
 *
 * 使用步骤（README 详述）：
 *  1. Creator 3.8.8 新建空 2D 项目
 *  2. bench/sim-core 的 4 个 js 设为项目「插件脚本」（全局作用域）
 *  3. bench/assets 的 12 张 png 拷到 assets/resources/bench/
 *  4. 本文件放入 assets/scripts/，挂到 Canvas 节点
 *
 * 验证过的引擎 API（cocos-engine 3.8.8 源码）：
 *  - DrawCall: director.root.device.numDrawCalls（gfx/base/device.ts getter）
 *  - 3.8.8 gfx 自带 WebGPU 后端（cocos/gfx/webgpu/），后续可切换后端对照
 */
import { _decorator, Component, Node, Sprite, SpriteFrame, UITransform, resources, director, view, macro } from 'cc';

// 【公平性·SPEC 0】关抗锯齿，对齐 Egret（默认关）与 WebGPU（单采样）。
// 模块顶层执行：本脚本随场景加载，早于 swapchain 创建，宏读取时已生效。
(macro as any).ENABLE_WEBGL_ANTIALIAS = false;

declare const BunnySim: any;
declare const BoidsSim: any;
declare const BenchStats: any;
declare const BenchRunner: any;

const { ccclass } = _decorator;

const BUNNY_IMGS = [
    'rabbitv3', 'rabbitv3_ash', 'rabbitv3_batman', 'rabbitv3_bb8',
    'rabbitv3_neo', 'rabbitv3_sonic', 'rabbitv3_spidey', 'rabbitv3_stormtrooper',
    'rabbitv3_superman', 'rabbitv3_tron', 'rabbitv3_wolverine', 'rabbitv3_frankenstein'
];
const FISH_IMGS = BUNNY_IMGS.slice(1, 6);

@ccclass('CocosBench')
export class CocosBench extends Component {
    private adapter: any = null;
    private stats: any = null;
    private runner: any = null;
    private W = 0;
    private H = 0;

    onLoad() {
        // 【公平性·SPEC 0】固定逻辑分辨率 1280×720（三引擎统一逻辑坐标，缩放交给引擎 canvas 适配层）
        this.W = 1280;
        this.H = 720;
        view.setDesignResolutionSize(this.W, this.H, 0); // 0=EXACT_FIT：可见区恒等于设计分辨率，逻辑坐标即 1280×720
        // 帧率上限 60（对齐 egret data-frame-rate=60）
        (director.game as any).frameRate = 60;

        this.adapter = new CocosAdapter(this.node, this.W, this.H);
        this.stats = new BenchStats();
        this.runner = new BenchRunner(this.adapter, this.stats);
        this.buildHud();
    }

    /** 帧回调入口：与 egret/laya 适配器保持同一相对位置 */
    update(dt: number) {
        const ts = performance.now();
        this.runner.tick(ts);
        this.adapter.step(ts);
    }

    private runVariant(variant: string, count: number, mode: 'fixed' | 'ramp') {
        this.loadAssets(variant, () => {
            const bounds = { left: 0, top: 0, right: this.W, bottom: this.H };
            // 后端探测：当前项目已启用 gfx-webgpu 模块；若 navigator.gpu 可用则视为 webgpu 后端
            const backend = (typeof navigator !== 'undefined' && (navigator as any).gpu) ? 'webgpu' : 'webgl';
            if (mode === 'fixed') {
                this.runner.fixedRun({
                    engine: 'cocos-creator-3.8.8', variant, backend,
                    count, bounds
                });
            } else {
                this.runner.rampRun({
                    engine: 'cocos-creator-3.8.8', variant, backend,
                    stepCount: 1000, stepMs: 2000, maxCount: 200000, bounds
                });
            }
            this.outEl.textContent = '运行中…';
        });
    }

    private loadAssets(variant: string, cb: () => void) {
        const names = variant === 'boids' ? FISH_IMGS
            : variant === 'V1' ? BUNNY_IMGS.slice(0, 1)
                : variant === 'V2' ? BUNNY_IMGS.slice(0, 8)
                    : BUNNY_IMGS;
        const pending = names.length;
        let done = 0;
        const frames: SpriteFrame[] = [];
        names.forEach((n, i) => {
            resources.load(`bench/${n}/spriteFrame`, SpriteFrame, (err: Error | null, sf: SpriteFrame) => {
                if (err) { console.error('资源缺失:', n, err); }
                frames[i] = sf;
                if (++done >= pending) {
                    const ok = frames.filter(Boolean);
                    if (!ok.length) {
                        this.outEl.textContent = '贴图加载失败，开 F12 控制台看缺失信息';
                        return;
                    }
                    this.adapter.frames = ok;
                    cb();
                }
            });
        });
    }

    // ---------------- HUD（DOM 覆盖层，样式对齐 6_21 bunnymark） ----------------
    private outEl!: HTMLElement;
    private buildHud() {
        const runner = this.runner;
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
            '<h3>🐰 Cocos Creator 3.8.8</h3>' +
            '<div class="row"><span class="lbl">场景</span>' +
            '<select id="cbv">' +
            '<option value="V1">Bunny V1 同纹理合批</option>' +
            '<option value="V2">Bunny V2 atlas多帧</option>' +
            '<option value="V3">Bunny V3 随机变换</option>' +
            '<option value="V4">Bunny V4 不合批</option>' +
            '<option value="boids">水族馆 2D Boids</option>' +
            '</select></div>' +
            '<div class="row"><span class="lbl">数量</span>' +
            '<input id="ccnt" type="number" value="10000" step="1000">' +
            '<button id="cfixed" class="primary">固定采样</button>' +
            '<button id="cramp">阶梯压测</button></div>' +
            '<div class="live" id="cout">待命中…</div>' +
            '<div class="tip">固定采样：预热 3s + 采样 10s 出 P50/P95/P99；阶梯压测：每 2s +1000，跌破 55fps 持续 2s 判定承载力。结果 JSON 自动复制。</div>';
        document.body.appendChild(hud);
        this.outEl = hud.querySelector('#cout') as HTMLElement;
        const $v = hud.querySelector('#cbv') as HTMLSelectElement;
        const $c = hud.querySelector('#ccnt') as HTMLInputElement;

        runner.onReport = (json: any) => {
            this.outEl.innerHTML = '完成: ' + JSON.stringify(json).slice(0, 500);
            BenchRunner.exportJSON(json);
        };
        BenchRunner.onCopied = () => {
            this.outEl.textContent += ' | 已复制 JSON';
        };
        BenchRunner.onSaved = (name: string) => {
            this.outEl.textContent += ' | 已存: ' + name;
        };
        hud.querySelector('#cfixed')!.addEventListener('click', () =>
            this.runVariant($v.value, parseInt($c.value, 10) || 10000, 'fixed'));
        hud.querySelector('#cramp')!.addEventListener('click', () =>
            this.runVariant($v.value, 0, 'ramp'));
    }
}

/** 适配器主体：标准 Sprite 节点路径 */
class CocosAdapter {
    frames: SpriteFrame[] = [];
    private sim: any = null;
    private nodes: Node[] = [];
    private variant = 'V1';
    private mode = 'bunny';
    private extra: { rotSpeed: number; phase: number }[] = [];
    private lastTick = 0;

    constructor(private root: Node, private W: number, private H: number) { }

    init(variant: string, bounds: any) {
        this.clearAll();
        this.variant = variant;
        this.mode = variant === 'boids' ? 'boids' : 'bunny';
        const b = bounds || { left: 0, top: 0, right: this.W, bottom: this.H };
        this.sim = this.mode === 'boids'
            ? new BoidsSim(b.right - b.left, b.bottom - b.top)
            : new BunnySim(b);
    }

    clearAll() {
        this.root.removeAllChildren();
        this.nodes.length = 0;
        this.extra.length = 0;
    }

    private makeNode(i: number): Node {
        const frame = this.mode === 'boids'
            ? this.frames[this.sim.list[i].species % this.frames.length]
            : this.variant === 'V1' ? this.frames[0]
                : this.frames[i % this.frames.length];
        const n = new Node();
        const sp = n.addComponent(Sprite);
        sp.spriteFrame = frame;
        const ut = n.getComponent(UITransform)!;
        // bunny 原版 anchor(0.5,1) → cocos 锚点(0.5,0)（底部中心）；boids 用中心
        ut.setAnchorPoint(0.5, this.mode === 'boids' ? 0.5 : 0);
        this.root.addChild(n);
        if (this.variant === 'V3') {
            this.extra.push({ rotSpeed: (Math.random() - 0.5) * 4, phase: Math.random() * 6.28 });
        }
        return n;
    }

    setCount(n: number) {
        const cur = this.nodes.length;
        if (n > cur) {
            this.sim.add(n - cur);
            for (let i = cur; i < n; i++) this.nodes.push(this.makeNode(i));
        } else if (n < cur) {
            this.sim.remove(cur - n);
            for (let j = cur - 1; j >= n; j--) {
                this.nodes[j].destroy();
                this.nodes.pop();
                if (this.extra.length) this.extra.pop();
            }
        }
    }

    /** sim 坐标（左上原点 y 向下）→ cocos UI 坐标（中心原点 y 向上） */
    private toX(x: number) { return x - this.W / 2; }
    private toY(y: number) { return this.H / 2 - y; }

    step(ts: number) {
        const dt = this.lastTick ? Math.min(ts - this.lastTick, 100) : 16.7;
        this.lastTick = ts;
        if (!this.sim) return;

        const list = this.sim.list, nodes = this.nodes, len = list.length;
        if (this.mode === 'boids') {
            this.sim.update(dt);
            for (let i = 0; i < len; i++) {
                nodes[i].setPosition(this.toX(list[i].x), this.toY(list[i].y), 0);
                nodes[i].setRotationFromEuler(0, 0, -list[i].angle * 57.29577951);
            }
        } else {
            this.sim.update();
            if (this.variant === 'V3') {
                for (let i = 0; i < len; i++) {
                    nodes[i].setPosition(this.toX(list[i].x), this.toY(list[i].y), 0);
                    this.extra[i].phase += 0.1;
                    nodes[i].setRotationFromEuler(0, 0, (nodes[i].eulerAngles.z + this.extra[i].rotSpeed) % 360);
                    const s = 0.75 + 0.25 * Math.sin(this.extra[i].phase);
                    nodes[i].setScale(s, s, 1);
                }
            } else {
                for (let i = 0; i < len; i++) {
                    nodes[i].setPosition(this.toX(list[i].x), this.toY(list[i].y), 0);
                }
            }
        }
    }

    /** 已验证 API：gfx Device.numDrawCalls getter（device.ts L110） */
    readDrawCalls(): number {
        const dev: any = director.root && director.root.device;
        return dev ? dev.numDrawCalls : -1;
    }

    nodeCount(): number { return this.nodes.length; }
}
