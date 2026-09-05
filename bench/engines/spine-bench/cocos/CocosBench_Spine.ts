/**
 * CocosBench_Spine — Cocos Creator 3.8.8 骨骼动画适配器
 * 实现 BenchRunner 契约（骨骼变体 S1/S2/S3）
 *
 * 使用步骤：
 *  1. Creator 3.8.8 2D 项目（与 CocosBench 同一工程即可）
 *  2. bench/sim-core 4 个 js 仍设为「插件脚本」
 *  3. bench/engines/spine-bench/spine-sim.js 也设为「插件脚本」
 *  4. bench/assets/spine-scene/spine/ 拷到 assets/resources/spine/
 *     （每角色 3 件：.json + .atlas + .png；bg.jpg 拷到 assets/resources/）
 *  5. 本文件放 assets/scripts/，工程已安装 spine 扩展（cocos store）
 *
 * 注意：Cocos 3.8 内置 spine 扩展，角色通过 sp.Skeleton 组件 + resources.load 加载。
 * Spine 数据路径：resources/spine/<charKey>/<charKey>.json（官方目录规范）
 */
import {
  _decorator, Component, Node, sp, UITransform, resources, director, view, game, Director
} from 'cc';

declare const BenchStats: any;
declare const BenchRunner: any;
declare const SpineSim: any;

const { ccclass } = _decorator;

const SPINE_RES_DIR = 'spine';   // resources 下的子目录
const BG_RES = 'bg';            // resources/bg.jpg

@ccclass('CocosBench_Spine')
export class CocosBench_Spine extends Component {
  private adapter: SpineAdapter | null = null;
  private stats: any = null;
  private runner: any = null;
  private W = 1280;
  private H = 720;
  private liveEl!: HTMLElement;
  private outEl!: HTMLElement;
  private liveBackend = '';
  private liveFpsEma = 16.7;
  private liveLastTs = 0;
  private _lastLive = 0;

  onLoad() {
    this.W = 1280; this.H = 720;
    view.setDesignResolutionSize(this.W, this.H, 0);
    game.frameRate = 60;
    (macro as any).ENABLE_WEBGL_ANTIALIAS = false;

    const dev: any = (director.root as any)?.device;
    this.liveBackend = (dev && dev.gl) ? 'webgl' : 'webgpu';

    this.adapter = new SpineAdapter(this.makeHolder(), this.W, this.H);
    this.stats = new BenchStats();
    this.runner = new BenchRunner(this.adapter, this.stats);
    this.buildHud();

    const q = new URLSearchParams(location.search);
    if (q.get('auto') === '1') {
      (window as any).__benchAutoStarted = true;
      const variant = q.get('variant') || 'S1';
      const count = parseInt(q.get('count') || '20', 10) || 20;
      const $v = document.querySelector('#csv') as HTMLSelectElement;
      const $c = document.querySelector('#sccnt') as HTMLInputElement;
      if ($v) $v.value = variant;
      if ($c) $c.value = String(count);
      this.loadAndRun(variant, count);
    }
  }

  update(dt: number) {
    const ts = performance.now();
    this.runner.tick(ts);
    this.adapter!.step(ts);
    this.updateLive(ts);
  }

  private makeHolder(): Node {
    const old = this.node.getChildByName('SpineRoot');
    if (old) return old;
    const h = new Node('SpineRoot');
    h.layer = 1 << 25;
    this.node.addChild(h);
    return h;
  }

  private updateLive(ts: number) {
    if (this.liveLastTs) {
      const d = Math.min(ts - this.liveLastTs, 100);
      this.liveFpsEma = this.liveFpsEma * 0.9 + d * 0.1;
    }
    this.liveLastTs = ts;
    if (!this.liveEl) return;
    if (ts - this._lastLive > 400) {
      this._lastLive = ts;
      const dc = this.adapter?.readDrawCalls() ?? -1;
      this.liveEl.textContent =
        '后端: ' + this.liveBackend + '\n' +
        '变体: ' + (this.adapter?.variant || '-') + '\n' +
        '角色: ' + (this.adapter?.nodeCount() ?? 0) + '\n' +
        'FPS: ' + (1000 / this.liveFpsEma).toFixed(1) + '\n' +
        (dc >= 0 ? 'drawCall: ' + Math.round(dc) : '');
    }
  }

  private loadAndRun(variant: string, count: number) {
    const bounds = { left: 0, top: 0, right: this.W, bottom: this.H };
    this.adapter!.init(variant, bounds);
    this.adapter!.loadAll(SpineSim.CHARACTERS, () => {
      this.adapter!.setCount(count);
      this.runner.fixedRun({
        engine: 'cocos-creator-3.8.8', variant, backend: this.liveBackend, count, bounds
      });
      this.outEl.textContent = '运行中…';
    });
  }

  private buildHud() {
    const style = document.createElement('style');
    style.textContent = '#hud2{position:fixed;left:8px;top:8px;z-index:99998;background:rgba(16,22,30,.86);' +
      'border:1px solid #2b3947;border-radius:10px;padding:10px 12px;color:#e6edf3;' +
      'font:13px sans-serif;width:380px;max-width:92vw;max-height:96vh;overflow:auto}' +
      '#hud2 h3{margin:0 0 8px;color:#7fd4ff}' +
      '#hud2 .row{display:flex;gap:8px;margin:6px 0;align-items:center;flex-wrap:wrap}' +
      '#hud2 .lbl{width:40px;color:#8aa0b4;font-size:12px}' +
      '#hud2 select,#hud2 input{background:#0d1218;color:#e6edf3;border:1px solid #33475a;border-radius:7px;padding:4px 8px;font-size:12px}' +
      '#hud2 input{width:70px}' +
      '#hud2 button{background:#1d2833;color:#cdd9e5;border:1px solid #33475a;border-radius:7px;padding:4px 10px;cursor:pointer;font-size:12px}' +
      '#hud2 button.primary{background:#2f6feb;color:#fff}' +
      '#hud2 .live{background:#0d1218;border:1px solid #2b3947;border-radius:8px;padding:7px 9px;white-space:pre;font:11px/1.6 monospace;color:#9fe8a8}' +
      '#hud2 #s-report{background:#0d1218;border:1px solid #2b3947;border-radius:8px;padding:7px 9px;white-space:pre-wrap;font:11px/1.6 monospace;color:#cdd9e5;max-height:30vh;overflow:auto;display:none}';
    document.head.appendChild(style);
    const hud = document.createElement('div');
    hud.id = 'hud2';
    hud.innerHTML =
      '<h3>🦴 Cocos Creator 3.8.8 骨骼动画 [' + this.liveBackend + ']</h3>' +
      '<div class="row"><span class="lbl">变体</span>' +
      '<select id="csv"><option value="S1">S1 同角色同动画</option>' +
      '<option value="S2">S2 8角色混合</option>' +
      '<option value="S3">S3 多动画混播</option></select></div>' +
      '<div class="row"><span class="lbl">数量</span>' +
      '<input id="sccnt" type="number" value="20" step="10">' +
      '<button id="scfixed" class="primary">固定采样</button>' +
      '<button id="scramp">阶梯压测</button></div>' +
      '<div class="row">' +
      '<button id="scadd10">+10</button><button id="scsub10">-10</button>' +
      '<button id="scadd50">+50</button><button id="scsub50">-50</button></div>' +
      '<div class="live" id="sclive">等待资源加载…</div>' +
      '<div id="s-report"></div>';
    document.body.appendChild(hud);
    this.liveEl = hud.querySelector('#sclive') as HTMLElement;
    this.outEl = hud.querySelector('#s-report') as HTMLElement;
    const $v = hud.querySelector('#csv') as HTMLSelectElement;
    const $c = hud.querySelector('#sccnt') as HTMLInputElement;

    this.runner.onReport = (json: any) => {
      this.liveEl.textContent = '完成: fps=' + json.fps + ' p50=' + json.p50 + 'ms p95=' + json.p95 + 'ms dc=' + json.drawCallAvg;
      BenchRunner.exportJSON(json);
    };

    hud.querySelector('#scfixed')!.addEventListener('click', () =>
      this.loadAndRun($v.value, parseInt($c.value, 10) || 20));
    hud.querySelector('#scramp')!.addEventListener('click', () => {
      const bounds = { left: 0, top: 0, right: this.W, bottom: this.H };
      this.adapter!.init($v.value, bounds);
      this.adapter!.loadAll(SpineSim.CHARACTERS, () => {
        this.runner.rampRun({
          engine: 'cocos-creator-3.8.8', variant: $v.value, backend: this.liveBackend,
          stepCount: 10, stepMs: 2000, maxCount: 500, bounds
        });
      });
    });
    const bump = (d: number) => {
      const next = Math.max(0, (this.adapter?.nodeCount() ?? 0) + d);
      this.adapter?.setCount(next);
      $c.value = String(next);
    };
    hud.querySelector('#scadd10')!.addEventListener('click', () => bump(10));
    hud.querySelector('#scsub10')!.addEventListener('click', () => bump(-10));
    hud.querySelector('#scadd50')!.addEventListener('click', () => bump(50));
    hud.querySelector('#scsub50')!.addEventListener('click', () => bump(-50));
  }
}

/** 适配器主体 */
class SpineAdapter {
  variant = 'S1';
  private sim: any = null;
  private nodes: Node[] = [];
  private _loaded: Record<string, sp.SkeletonData> = {};
  private lastTick = 0;

  constructor(private root: Node, private W: number, private H: number) {}

  init(variant: string, _bounds: any) {
    this.clearAll();
    this.variant = variant;
    this.sim = new SpineSim(variant, this.W, this.H);
  }

  clearAll() {
    this.root.removeAllChildren();
    this.nodes.length = 0;
    if (this.sim) this.sim.list.length = 0;
  }

  /** 预加载所有角色资源（S1/S3 只需第 0 个；S2 全部） */
  loadAll(charKeys: string[], cb: () => void) {
    const keys = this.variant === 'S2' ? charKeys : [charKeys[0]];
    let done = 0;
    keys.forEach(key => {
      resources.load(`${SPINE_RES_DIR}/${key}/${key}`, sp.SkeletonData,
        (err: Error | null, data: sp.SkeletonData) => {
          if (!err) this._loaded[key] = data;
          if (++done >= keys.length) cb();
        });
    });
  }

  setCount(n: number) {
    const cur = this.nodes.length;
    if (!this.sim) return;
    if (n > cur) {
      this.sim.add(n - cur);
      for (let i = cur; i < n; i++) {
        const entry = this.sim.list[i];
        const skData = this._loaded[entry.charKey] || Object.values(this._loaded)[0];
        if (!skData) continue;
        const nd = new Node();
        nd.layer = 1 << 25;
        const sk = nd.addComponent(sp.Skeleton);
        sk.skeletonData = skData;
        const validAnim = this._resolveAnim(sk, entry.animName);
        sk.setAnimation(0, validAnim, true);
        const ut = nd.getComponent(UITransform)!;
        ut.setAnchorPoint(0.5, 0);  // 底部中心
        nd.setPosition(entry.x - this.W / 2, this.H / 2 - entry.y, 0);
        nd.setScale(entry.scale, entry.scale, 1);
        this.root.addChild(nd);
        this.nodes.push(nd);
      }
    } else if (n < cur) {
      this.sim.remove(cur - n);
      for (let j = cur - 1; j >= n; j--) {
        this.nodes[j].destroy();
        this.nodes.pop();
      }
    }
  }

  /** 若目标动画名不存在则回退到骨骼第一个动画 */
  private _resolveAnim(sk: sp.Skeleton, name: string): string {
    try {
      const data = sk.skeletonData?.getRuntimeData();
      if (data && data.animations) {
        const has = (data.animations as any[]).some((a: any) => a.name === name);
        if (has) return name;
        return (data.animations as any[])[0]?.name || name;
      }
    } catch (_) {}
    return name;
  }

  step(ts: number) {
    const dt = this.lastTick ? Math.min(ts - this.lastTick, 100) : 16.7;
    this.lastTick = ts;
    if (!this.sim) return;
    const changed: number[] = this.sim.update(dt);
    for (const idx of changed) {
      const nd = this.nodes[idx];
      if (!nd) continue;
      const entry = this.sim.list[idx];
      // 同步位置（世界坐标转 Cocos 节点坐标，原点在画布中心）
      nd.setPosition(entry.x - this.W / 2, this.H / 2 - entry.y, 0);
      // 同步动画
      const sk = nd.getComponent(sp.Skeleton);
      if (!sk) continue;
      const validAnim = this._resolveAnim(sk, entry.animName);
      try { sk.setAnimation(0, validAnim, true); } catch (_) {}
    }
  }

  readDrawCalls(): number {
    const dev: any = director.root?.device;
    if (!dev) return -1;
    if (dev.gl) {
      const P = (window as any).__ccGlProbe;
      if (!P) return -1;
      const fd = P.frameTotal - P.lastFrame, dd = P.drawTotal - P.lastDraw;
      P.lastFrame = P.frameTotal; P.lastDraw = P.drawTotal;
      return fd > 0 ? dd / fd : -1;
    }
    return dev.numDrawCalls;
  }

  nodeCount(): number { return this.nodes.length; }
}

import { macro } from 'cc';

director.once(Director.EVENT_AFTER_SCENE_LAUNCH, () => {
  try {
    const scene = director.getScene();
    if (!scene) return;
    const canvas = scene.getChildByName('Canvas') || scene.children[0];
    if (!canvas) return;
    if (canvas.getComponent('CocosBench_Spine')) return;
    canvas.addComponent(CocosBench_Spine);
    console.log('[CocosBench_Spine] 已自动挂载');
  } catch (e) { console.error('[CocosBench_Spine] 自动挂载失败:', e); }
});
