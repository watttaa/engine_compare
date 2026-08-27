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

        // 自动测试：?auto=1&variant=V1&count=10000（编排页 iframe 用，进入即跑固定采样）
        const q = new URLSearchParams(location.search);
        if (q.get('auto') === '1') {
            const variant = q.get('variant') || 'V1';
            const count = parseInt(q.get('count') || '10000', 10) || 10000;
            const $v = document.querySelector('#cbv') as HTMLSelectElement;
            const $c = document.querySelector('#ccnt') as HTMLInputElement;
            if ($v) { $v.value = variant; }
            if ($c) { $c.value = String(count); }
            this.runVariant(variant, count, 'fixed');
        }
    }

    /** 帧回调入口：与 egret/laya 适配器保持同一相对位置 */
    update(dt: number) {
        const ts = performance.now();
        this.runner.tick(ts);
        this.adapter.step(ts);
        this.updateLive(ts);
    }

    private liveLastTs = 0;
    private liveFpsEma = 16.7;
    private liveBackend = '';
    private updateLive(ts: number) {
        if (this.liveLastTs) {
            const d = Math.min(ts - this.liveLastTs, 100);
            this.liveFpsEma = this.liveFpsEma * 0.9 + d * 0.1;
        }
        this.liveLastTs = ts;
        if (!this.liveEl) return;
        const now = performance.now();
        if (now - (this as any)._lastLive > 400) {
            (this as any)._lastLive = now;
            const dc = this.adapter.readDrawCalls ? this.adapter.readDrawCalls() : -1;
            this.liveEl.textContent =
                '后端: ' + this.liveBackend + '\n' +
                '数量: ' + this.adapter.nodeCount() + '\n' +
                'FPS: ' + (1000 / this.liveFpsEma).toFixed(1) + '\n' +
                (dc >= 0 ? 'drawCall: ' + Math.round(dc) : '');
        }
    }

    private runVariant(variant: string, count: number, mode: 'fixed' | 'ramp') {
        this.loadAssets(variant, () => {
            const bounds = { left: 0, top: 0, right: this.W, bottom: this.H };
            if (mode === 'fixed') {
                this.runner.fixedRun({
                    engine: 'cocos-creator-3.8.8', variant, backend: this.liveBackend,
                    count, bounds
                });
            } else {
                this.runner.rampRun({
                    engine: 'cocos-creator-3.8.8', variant, backend: this.liveBackend,
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
    private liveEl!: HTMLElement;
    private buildHud() {
        const runner = this.runner;
        const adapter = this.adapter;
        // 运行时后端探测
        // 运行时后端探测：看实际 gfx 设备（WebGL 设备有 gl 属性，WebGPU 没有）。
        // 不用 navigator.gpu 猜——renderMode 强制 WebGL 时 navigator.gpu 依然存在
        const dev: any = (director.root as any) ? (director.root as any).device : null;
        this.liveBackend = (dev && dev.gl) ? 'webgl' : 'webgpu';

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
            '<h3>🐰 Cocos Creator 3.8.8 [' + this.liveBackend + ']</h3>' +
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
            '<div class="row"><span class="lbl">增减</span>' +
            '<button id="cadd1k">+1千</button><button id="csub1k">-1千</button>' +
            '<button id="cadd10k">+1万</button><button id="csub10k">-1万</button></div>' +
            '<div class="row">' +
            '<button id="cautoBtn" class="primary">▶ 一键自动测试</button>' +
            '<button id="cstopBtn" class="danger">停止</button></div>' +
            '<div class="live" id="clive">等待首帧…</div>' +
            '<div class="bar"><div class="fill" id="cprogFill"></div></div>' +
            '<div id="report"></div>' +
            '<div class="tip">固定采样：预热 3s + 采样 10s 出 P50/P95/P99。一键自动测试：档位阶梯逐级加压（预热1.2s+采样2s），≥55fps 记承载力，&lt;50fps 掉帧即停。结果 JSON 自动复制。</div>';
        document.body.appendChild(hud);
        this.outEl = hud.querySelector('#report') as HTMLElement;
        this.liveEl = hud.querySelector('#clive') as HTMLElement;
        const $v = hud.querySelector('#cbv') as HTMLSelectElement;
        const $c = hud.querySelector('#ccnt') as HTMLInputElement;
        const $fill = hud.querySelector('#cprogFill') as HTMLElement;

        runner.onReport = (json: any) => {
            this.liveEl.textContent = '完成: fps=' + json.fps + ' p50=' + json.p50 + 'ms p95=' + json.p95 +
                'ms p99=' + json.p99 + 'ms dc=' + json.drawCallAvg + ' nodes=' + json.nodeCount;
            BenchRunner.exportJSON(json);
        };
        BenchRunner.onCopied = () => {
            this.liveEl.textContent += ' | 已复制 JSON';
        };
        BenchRunner.onSaved = (name: string) => {
            this.liveEl.textContent += ' | 已存: ' + name;
        };
        hud.querySelector('#cfixed')!.addEventListener('click', () =>
            this.runVariant($v.value, parseInt($c.value, 10) || 10000, 'fixed'));
        hud.querySelector('#cramp')!.addEventListener('click', () =>
            this.runVariant($v.value, 0, 'ramp'));

        // 手动加减
        const bump = (d: number) => {
            const load = () => {
                const cur = this.adapter.nodeCount();
                const next = Math.max(0, cur + d);
                this.adapter.setCount(next);
                $c.value = String(next);
            };
            if (!this.adapter.sim) { this.loadAssets($v.value, load); } else { load(); }
        };
        hud.querySelector('#cadd1k')!.addEventListener('click', () => bump(1000));
        hud.querySelector('#csub1k')!.addEventListener('click', () => bump(-1000));
        hud.querySelector('#cadd10k')!.addEventListener('click', () => bump(10000));
        hud.querySelector('#csub10k')!.addEventListener('click', () => bump(-10000));

        // 一键自动测试
        hud.querySelector('#cautoBtn')!.addEventListener('click', () => {
            this.loadAssets($v.value, () => {
                this.outEl.style.display = 'block';
                const lines: string[] = ['== 承载力测试 [' + this.liveBackend + ' · ' + $v.value + '] =='];
                this.outEl.textContent = lines.join('\n');
                this.runner.autoRamp({
                    engine: 'cocos-creator-3.8.8', variant: $v.value, backend: this.liveBackend,
                    onLevel: (lv: any) => {
                        if (lv.phase === 'start') {
                            $fill.style.width = (lv.index / lv.total * 100).toFixed(1) + '%';
                            this.liveEl.textContent = lv.count + ' 只 · 稳定中…';
                        } else {
                            $fill.style.width = ((lv.index + 1) / lv.total * 100).toFixed(1) + '%';
                            const j = lv.json;
                            lines.push('  ' + lv.count + ' 只: ' + j.fps + 'fps ' +
                                (lv.stable ? '✓稳' : '✗掉帧') + ' | p95 ' + j.p95 + 'ms | dc ' + j.drawCallAvg);
                            this.outEl.textContent = lines.join('\n');
                            BenchRunner.exportJSON(j);
                        }
                    },
                    onDone: (r: any) => {
                        if (r.capped) lines.push('▶ ⚠ 最高档 ' + r.cap + ' 只仍未掉帧：承载力被天花板截断');
                        else if (r.jankAt != null) lines.push('▶ 承载力: ' + r.cap + ' 只稳 ≥55fps（' + r.jankAt + ' 只掉帧）');
                        else lines.push('▶ 承载力: ' + r.cap + ' 只');
                        this.outEl.textContent = lines.join('\n');
                        $fill.style.width = '100%';
                        this.liveEl.textContent = '自动测试完成，承载力 ' + r.cap + ' 只。';
                    }
                });
            });
        });
        hud.querySelector('#cstopBtn')!.addEventListener('click', () => {
            this.runner.stopAuto();
            this.liveEl.textContent = '已停止。';
        });
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
