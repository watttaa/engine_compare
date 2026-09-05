/**
 * LayaBench_Spine — LayaAir 3.4 骨骼动画适配器（Spine 3.8 运行时）
 * 实现 BenchRunner 契约（骨骼变体 S1/S2/S3）
 *
 * 集成方式：
 *  1. LayaAir IDE 3.4 工程（与 LayaBench 同工程）
 *  2. bench/sim-core 4 个 js + bench/engines/spine-bench/spine-sim.js 加入全局加载
 *  3. bench/assets/spine-scene/spine/ 拷到 resources/spine/
 *     （每角色：<charKey>.json + <charKey>.atlas + <charKey>.png）
 *     bg.jpg 拷到 resources/bg.jpg
 *  4. IDE 安装 laya.spine 模块（PlayerSettings.json 中 "laya.spine": true）
 *  5. 入口（Main.onStart）调用 LayaBench_Spine.start()
 *
 * LayaAir 3.4 Spine API：
 *   Laya.loader.load(url, Handler) → Laya.Skeleton
 *   new Laya.Skeleton()  sp.skeleton = skeletonData
 *   skeleton.setAnimation(trackIndex, animName, loop)
 */

const SPINE_RES = 'resources/spine/';
const BG_RES_SPINE = 'resources/bg.jpg';

let _liveEl: HTMLElement | null = null;
let _liveBackend = '';
let _liveFps = 16.7;
let _liveLastTs = 0;
let _lastLive = 0;

export class LayaBench_Spine {
  static start(): void {
    const g: any = globalThis as any;
    const Laya = g.Laya;

    Laya.stage.setScreenSize(1280, 720);
    Laya.stage.scaleMode = Laya.stage.SCALE_NOSCALE;
    if (g.Laya && g.Laya.Config) g.Laya.Config.isAntialias = false;

    const W = 1280, H = 720;
    const adapter = new LayaSpineAdapter(Laya.stage, W, H);
    const stats = new (g as any).BenchStats();
    const runner = new (g as any).BenchRunner(adapter, stats);
    const backend = (typeof navigator !== 'undefined' && (navigator as any).gpu) ? 'webgpu' : 'webgl';

    LayaBench_Spine.buildHud(Laya, runner, adapter, backend);

    Laya.timer.frameLoop(1, null, () => {
      const ts = performance.now();
      runner.tick(ts);
      adapter.step(ts);
      LayaBench_Spine.updateLive(ts, adapter);
    });

    const q = new URLSearchParams(location.search);
    if (q.get('auto') === '1') {
      const variant = q.get('variant') || 'S1';
      const count = parseInt(q.get('count') || '20', 10) || 20;
      const $v = document.querySelector('#lsv') as HTMLSelectElement;
      const $c = document.querySelector('#lscnt') as HTMLInputElement;
      if ($v) $v.value = variant;
      if ($c) $c.value = String(count);
      LayaBench_Spine.loadAndRun(Laya, runner, adapter, backend, variant, count);
    }
  }

  private static loadAndRun(Laya: any, runner: any, adapter: any, backend: string,
    variant: string, count: number): void {
    const bounds = { left: 0, top: 0, right: 1280, bottom: 720 };
    adapter.init(variant, bounds);
    const g: any = globalThis;
    const keys: string[] = variant === 'S2' ? g.SpineSim.CHARACTERS : [g.SpineSim.CHARACTERS[0]];
    const urls = keys.map((k: string) => SPINE_RES + k + '.json');
    Laya.loader.load(urls, Laya.Handler.create(null, () => {
      adapter.skeletonDataMap = {};
      keys.forEach((k: string) => {
        adapter.skeletonDataMap[k] = Laya.loader.getRes(SPINE_RES + k + '.json');
      });
      adapter.setCount(count);
      runner.fixedRun({ engine: 'layaair-3.4.0', variant, backend, count, bounds });
      if (_liveEl) _liveEl.textContent = '运行中…';
    }));
  }

  private static updateLive(ts: number, adapter: any): void {
    if (_liveLastTs) _liveFps = _liveFps * 0.9 + Math.min(ts - _liveLastTs, 100) * 0.1;
    _liveLastTs = ts;
    if (!_liveEl) return;
    if (ts - _lastLive > 400) {
      _lastLive = ts;
      const dc = adapter.readDrawCalls ? adapter.readDrawCalls() : -1;
      _liveEl.textContent =
        '后端: ' + _liveBackend + '\n' +
        '变体: ' + (adapter.variant || '-') + '\n' +
        '角色: ' + adapter.nodeCount() + '\n' +
        'FPS: ' + (1000 / _liveFps).toFixed(1) + '\n' +
        (dc >= 0 ? 'drawCall: ' + Math.round(dc) : '');
    }
  }

  private static buildHud(Laya: any, runner: any, adapter: any, backend: string): void {
    _liveBackend = backend;
    const style = document.createElement('style');
    style.textContent = '#hud{position:fixed;left:8px;top:8px;z-index:99998;background:rgba(16,22,30,.86);' +
      'border:1px solid #2b3947;border-radius:10px;padding:10px 12px;color:#e6edf3;font:13px sans-serif;' +
      'width:380px;max-width:92vw;max-height:96vh;overflow:auto}' +
      '#hud h3{margin:0 0 8px;color:#7fd4ff}' +
      '#hud .row{display:flex;gap:8px;margin:6px 0;align-items:center;flex-wrap:wrap}' +
      '#hud .lbl{width:40px;color:#8aa0b4;font-size:12px}' +
      '#hud select,#hud input{background:#0d1218;color:#e6edf3;border:1px solid #33475a;border-radius:7px;padding:4px 8px;font-size:12px}' +
      '#hud input{width:70px}' +
      '#hud button{background:#1d2833;color:#cdd9e5;border:1px solid #33475a;border-radius:7px;padding:4px 10px;cursor:pointer;font-size:12px}' +
      '#hud button.primary{background:#2f6feb;color:#fff}' +
      '#hud .live{background:#0d1218;border:1px solid #2b3947;border-radius:8px;padding:7px 9px;white-space:pre;font:11px/1.6 monospace;color:#9fe8a8}' +
      '#hud #ls-report{background:#0d1218;border:1px solid #2b3947;border-radius:8px;padding:7px 9px;white-space:pre-wrap;font:11px/1.6 monospace;color:#cdd9e5;max-height:30vh;overflow:auto;display:none}';
    document.head.appendChild(style);
    const hud = document.createElement('div');
    hud.id = 'hud';
    hud.innerHTML =
      '<h3>🦴 LayaAir 3.4 骨骼动画 [' + backend + ']</h3>' +
      '<div class="row"><span class="lbl">变体</span>' +
      '<select id="lsv"><option value="S1">S1 同角色同动画</option>' +
      '<option value="S2">S2 8角色混合</option>' +
      '<option value="S3">S3 多动画混播</option></select></div>' +
      '<div class="row"><span class="lbl">数量</span>' +
      '<input id="lscnt" type="number" value="20" step="10">' +
      '<button id="lsfixed" class="primary">固定采样</button>' +
      '<button id="lsramp">阶梯压测</button></div>' +
      '<div class="row">' +
      '<button id="lsadd10">+10</button><button id="lssub10">-10</button>' +
      '<button id="lsadd50">+50</button><button id="lssub50">-50</button></div>' +
      '<div class="live" id="lslive">等待资源加载…</div>' +
      '<div id="ls-report"></div>';
    document.body.appendChild(hud);
    _liveEl = hud.querySelector('#lslive');
    const $v = hud.querySelector('#lsv') as HTMLSelectElement;
    const $c = hud.querySelector('#lscnt') as HTMLInputElement;
    const $out = hud.querySelector('#ls-report') as HTMLElement;

    runner.onReport = (json: any) => {
      if (_liveEl) _liveEl.textContent = '完成: fps=' + json.fps + ' p50=' + json.p50 + 'ms p95=' + json.p95 + 'ms dc=' + json.drawCallAvg;
      (globalThis as any).BenchRunner.exportJSON(json);
    };

    hud.querySelector('#lsfixed')!.addEventListener('click', () => {
      LayaBench_Spine.loadAndRun(Laya, runner, adapter, backend, $v.value, parseInt($c.value, 10) || 20);
    });
    hud.querySelector('#lsramp')!.addEventListener('click', () => {
      const bounds = { left: 0, top: 0, right: 1280, bottom: 720 };
      adapter.init($v.value, bounds);
      const g: any = globalThis;
      const keys: string[] = $v.value === 'S2' ? g.SpineSim.CHARACTERS : [g.SpineSim.CHARACTERS[0]];
      const urls = keys.map((k: string) => SPINE_RES + k + '.json');
      Laya.loader.load(urls, Laya.Handler.create(null, () => {
        adapter.skeletonDataMap = {};
        keys.forEach((k: string) => { adapter.skeletonDataMap[k] = Laya.loader.getRes(SPINE_RES + k + '.json'); });
        runner.rampRun({ engine: 'layaair-3.4.0', variant: $v.value, backend,
          stepCount: 10, stepMs: 2000, maxCount: 500, bounds });
      }));
    });

    const bump = (d: number) => {
      const next = Math.max(0, adapter.nodeCount() + d);
      adapter.setCount(next);
      $c.value = String(next);
    };
    hud.querySelector('#lsadd10')!.addEventListener('click', () => bump(10));
    hud.querySelector('#lssub10')!.addEventListener('click', () => bump(-10));
    hud.querySelector('#lsadd50')!.addEventListener('click', () => bump(50));
    hud.querySelector('#lssub50')!.addEventListener('click', () => bump(-50));
  }
}

/** 适配器主体 */
class LayaSpineAdapter {
  variant = 'S1';
  skeletonDataMap: Record<string, any> = {};
  private sim: any = null;
  private nodes: any[] = [];
  private lastTick = 0;

  constructor(private root: any, private W: number, private H: number) {}

  init(variant: string, _bounds: any): void {
    this.clearAll();
    this.variant = variant;
    const g: any = globalThis;
    this.sim = new g.SpineSim(variant, this.W, this.H);
  }

  clearAll(): void {
    this.root.removeChildren();
    this.nodes.length = 0;
    if (this.sim) this.sim.list.length = 0;
  }

  setCount(n: number): void {
    const cur = this.nodes.length;
    if (!this.sim) return;
    const g: any = globalThis;
    const Laya = g.Laya;

    if (n > cur) {
      this.sim.add(n - cur);
      for (let i = cur; i < n; i++) {
        const entry = this.sim.list[i];
        const skData = this.skeletonDataMap[entry.charKey]
          || Object.values(this.skeletonDataMap)[0];
        if (!skData) continue;

        const sk = new Laya.Skeleton();
        sk.loadData(skData);
        sk.pos(entry.x, entry.y);
        sk.scale(entry.scale, entry.scale);
        sk.pivot(0, 0);  // 骨骼 root 在原点，底部站立
        const validAnim = this._resolveAnim(sk, entry.animName);
        sk.setAnimation(0, validAnim, true);
        this.root.addChild(sk);
        this.nodes.push(sk);
      }
    } else if (n < cur) {
      this.sim.remove(cur - n);
      for (let j = cur - 1; j >= n; j--) {
        this.nodes[j].removeSelf();
        this.nodes.pop();
      }
    }
  }

  /** 若目标动画名不存在则回退到骨骼第一个动画 */
  private _resolveAnim(sk: any, name: string): string {
    try {
      const data = sk.skeletonData || sk._skeleton?.data;
      if (data && data.animations) {
        const has = (data.animations as any[]).some((a: any) => a.name === name);
        if (has) return name;
        return (data.animations as any[])[0]?.name || name;
      }
    } catch (_) {}
    return name;
  }

  step(ts: number): void {
    const dt = this.lastTick ? Math.min(ts - this.lastTick, 100) : 16.7;
    this.lastTick = ts;
    if (!this.sim) return;
    const changed: number[] = this.sim.update(dt);
    for (const idx of changed) {
      const sk = this.nodes[idx];
      if (!sk) continue;
      const entry = this.sim.list[idx];
      // 同步位置
      sk.pos(entry.x, entry.y);
      // 同步动画
      const animName = entry.animName;
      const validAnim = this._resolveAnim(sk, animName);
      try { sk.setAnimation(0, validAnim, true); } catch (_) {}
    }
  }

  readDrawCalls(): number {
    const g: any = globalThis;
    const L = g.Laya;
    const statAgent = (g.LayaGL && g.LayaGL.statAgent) || (L && L.LayaGL && L.LayaGL.statAgent);
    const statEl = g.StatElement || (L && L.StatElement);
    if (statAgent && statEl) {
      const v = statAgent.getElementData(statEl.CT_2DDrawCall);
      return typeof v === 'number' ? v : -1;
    }
    return -1;
  }

  nodeCount(): number { return this.nodes.length; }
}
