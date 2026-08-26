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
import { _decorator, Component, Node, Sprite, SpriteFrame, UITransform, resources, director, view } from 'cc';

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
        this.W = view.getVisibleSize().width;
        this.H = view.getVisibleSize().height;

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
            if (mode === 'fixed') {
                this.runner.fixedRun({
                    engine: 'cocos-creator-3.8.8', variant, backend: 'webgl2',
                    count, bounds
                });
            } else {
                this.runner.rampRun({
                    engine: 'cocos-creator-3.8.8', variant, backend: 'webgl2',
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

    // ---------------- HUD（DOM 覆盖层） ----------------
    private outEl!: HTMLElement;
    private buildHud() {
        const runner = this.runner;
        const hud = document.createElement('div');
        hud.style.cssText = 'position:fixed;bottom:8px;left:8px;z-index:99999;color:#fff;' +
            'font:12px/1.6 Consolas,monospace;background:rgba(0,0,0,.55);padding:8px 10px;border-radius:4px';
        hud.innerHTML =
            'Cocos-3.8.8 | ' +
            '<select id="cbv">' +
            '<option value="V1">Bunny V1 同纹理合批</option>' +
            '<option value="V2">Bunny V2 atlas多帧</option>' +
            '<option value="V3">Bunny V3 随机变换</option>' +
            '<option value="V4">Bunny V4 不合批</option>' +
            '<option value="boids">水族馆 2D Boids</option>' +
            '</select>' +
            '<input id="ccnt" type="number" value="10000" step="1000" style="width:70px">' +
            '<button id="cfixed">固定采样</button>' +
            '<button id="cramp">阶梯压测</button>' +
            '<button id="cdir">保存目录</button>' +
            '<div id="cout">待命中…</div>';        document.body.appendChild(hud);
        this.outEl = hud.querySelector('#cout') as HTMLElement;
        const $v = hud.querySelector('#cbv') as HTMLSelectElement;
        const $c = hud.querySelector('#ccnt') as HTMLInputElement;

        runner.onReport = (json: any) => {
            this.outEl.innerHTML = '完成: ' + JSON.stringify(json).slice(0, 500);
            BenchRunner.exportJSON(json);
        };
        BenchRunner.onSaved = (name: string) => {
            this.outEl.textContent += ' | 已存: ' + name;
        };
        hud.querySelector('#cdir')!.addEventListener('click', () => BenchRunner.pickSaveDir());
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
