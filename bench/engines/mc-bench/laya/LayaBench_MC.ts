/**
 * LayaBench_MC — LayaAir 3.4 预烘焙骨骼动画适配器
 *
 * 集成：
 *  1. bench/sim-core 4 个 js + mc-sim.js 全局加载
 *  2. bench/assets/mc-scene/body/ 拷到 resources/mc/body/
 *  3. Main.onStart() 调 LayaBench_MC.start()
 *
 * 实现：
 *  - 读 mc JSON + 加载 PNG → 自建 SpriteSheet → Laya.Sprite 每帧手动 drawTexture
 *  - 与 Egret MovieClip 等价，公平性一致
 */

const MC_RES = 'resources/mc/body/';

interface McLabel { name: string; frame: number; end: number; }
interface McFrame  { res: string; x: number; y: number; }
interface McRes    { x: number; y: number; w: number; h: number; }
interface McData   { frameRate: number; labels: McLabel[]; frames: McFrame[]; resMap: Record<string, McRes>; }

function parseMcJson(raw: any): McData {
  const a = raw.mc.animate;
  return { frameRate: a.frameRate || 8, labels: a.labels, frames: a.frames, resMap: raw.res };
}

class LayaMcPlayer {
  private mcData: McData;
  private tex: any;          // Laya.Texture
  private sp: any;           // Laya.Sprite
  private curLabel: McLabel | null = null;
  private localFrame = 0;
  private elapsed = 0;

  constructor(sp: any, mcData: McData, tex: any) {
    this.sp = sp; this.mcData = mcData; this.tex = tex;
  }

  play(animName: string) {
    this.curLabel = this.mcData.labels.find(l => l.name === animName) || this.mcData.labels[0];
    this.localFrame = 0; this.elapsed = 0;
    this._applyFrame();
  }

  tick(dtMs: number) {
    if (!this.curLabel) return;
    this.elapsed += dtMs;
    const dur = 1000 / this.mcData.frameRate;
    while (this.elapsed >= dur) {
      this.elapsed -= dur;
      const len = this.curLabel.end - this.curLabel.frame;
      this.localFrame = (this.localFrame + 1) % (len + 1);
      this._applyFrame();
    }
  }

  private _applyFrame() {
    if (!this.curLabel) return;
    const f = this.mcData.frames[this.curLabel.frame - 1 + this.localFrame];
    if (!f) return;
    const r = this.mcData.resMap[f.res];
    if (!r) return;
    this.sp.graphics.clear();
    // Laya drawTexture(tex, x, y, w, h, matrix, alpha, blendMode, uv)
    // 从图集切取矩形，用 uv 坐标指定区域
    const imgW = this.tex.width, imgH = this.tex.height;
    const uv = [r.x / imgW, r.y / imgH, (r.x + r.w) / imgW, r.y / imgH,
                (r.x + r.w) / imgW, (r.y + r.h) / imgH, r.x / imgW, (r.y + r.h) / imgH];
    this.sp.graphics.drawTexture(this.tex, f.x, f.y, r.w, r.h, null, 1, null, uv);
  }
}

export class LayaBench_MC {
  static start(): void {
    const g: any = globalThis as any;
    const Laya = g.Laya;

    Laya.stage.setScreenSize(1280, 720);
    Laya.stage.scaleMode = Laya.stage.SCALE_NOSCALE;
    if (g.Laya?.Config) g.Laya.Config.isAntialias = false;

    const W = 1280, H = 720;
    const adapter = new LayaMCAdapter(Laya.stage, W, H);
    const stats = new (g as any).BenchStats();
    const runner = new (g as any).BenchRunner(adapter, stats);
    const backend = (typeof navigator !== 'undefined' && (navigator as any).gpu) ? 'webgpu' : 'webgl';

    LayaBench_MC.buildHud(Laya, runner, adapter, backend);

    let _lastLive = 0, _fpsBuf = 16.7, _lastTs = 0;
    const _origTick = runner.tick.bind(runner);
    runner.tick = (ts: number) => {
      _origTick(ts);
      if (_lastTs) _fpsBuf = _fpsBuf * 0.9 + Math.min(ts - _lastTs, 100) * 0.1;
      _lastTs = ts;
      const liveEl = document.getElementById('lmlive');
      if (liveEl && ts - _lastLive > 400) {
        _lastLive = ts;
        const dc = adapter.readDrawCalls();
        liveEl.textContent =
          '后端: ' + backend + '  变体: ' + (adapter.variant || '-') + '\n' +
          '角色: ' + adapter.nodeCount() + '  FPS: ' + (1000 / _fpsBuf).toFixed(1) + '\n' +
          (dc >= 0 ? 'drawCall: ' + Math.round(dc) : '');
      }
    };
    runner.onReport = (json: any) => {
      const el = document.getElementById('lmlive');
      if (el) el.textContent = '完成: fps=' + json.fps + ' p50=' + json.p50 + 'ms p95=' + json.p95 + 'ms dc=' + json.drawCallAvg;
      (g as any).BenchRunner.exportJSON(json);
    };

    Laya.timer.frameLoop(1, null, () => {
      const ts = performance.now();
      runner.tick(ts);
      adapter.step(ts);
    });

    const q = new URLSearchParams(location.search);
    if (q.get('auto') === '1') {
      const v = q.get('variant') || 'M1', n = parseInt(q.get('count') || '50') || 50;
      LayaBench_MC._loadAndRun(Laya, runner, adapter, backend, v, n);
    }
  }

  private static _loadAndRun(Laya: any, runner: any, adapter: any, backend: string, variant: string, count: number) {
    adapter.init(variant);
    const g: any = globalThis;
    const ids: string[] = variant === 'M2' ? g.MCSim.CHARACTERS : [g.MCSim.CHARACTERS[0]];
    let done = 0;
    ids.forEach((id: string) => {
      Laya.loader.load([MC_RES + id + '/animate0.json', MC_RES + id + '/animate0.png'],
        Laya.Handler.create(null, () => {
          const json = Laya.loader.getRes(MC_RES + id + '/animate0.json');
          const tex  = Laya.loader.getRes(MC_RES + id + '/animate0.png');
          if (json && tex) adapter.loaded[id] = { mcData: parseMcJson(json), tex };
          if (++done >= ids.length) {
            adapter.setCount(count);
            runner.fixedRun({ engine: 'layaair-3.4.0', variant, backend, count });
          }
        })
      );
    });
  }

  private static buildHud(Laya: any, runner: any, adapter: any, backend: string) {
    const style = document.createElement('style');
    style.textContent = '#hud{position:fixed;left:8px;top:8px;z-index:99998;background:rgba(16,22,30,.86);border:1px solid #2b3947;border-radius:10px;padding:10px 12px;color:#e6edf3;font:13px sans-serif;width:360px;max-width:92vw}#hud h3{margin:0 0 8px;color:#7fd4ff;font-size:13px}#hud .row{display:flex;gap:8px;margin:5px 0;align-items:center;flex-wrap:wrap}#hud .lbl{width:40px;color:#8aa0b4;font-size:12px}#hud select,#hud input{background:#0d1218;color:#e6edf3;border:1px solid #33475a;border-radius:7px;padding:3px 7px;font-size:12px}#hud input{width:68px}#hud button{background:#1d2833;color:#cdd9e5;border:1px solid #33475a;border-radius:7px;padding:3px 9px;cursor:pointer;font-size:12px}#hud button.primary{background:#2f6feb;color:#fff}#hud .live{background:#0d1218;border:1px solid #2b3947;border-radius:8px;padding:6px 9px;white-space:pre;font:11px/1.6 monospace;color:#9fe8a8;margin-top:6px}';
    document.head.appendChild(style);
    const hud = document.createElement('div'); hud.id = 'hud';
    hud.innerHTML = '<h3>🎭 LayaAir 3.4 · 预烘焙骨骼动画 [' + backend + ']</h3>' +
      '<div class="row"><span class="lbl">变体</span><select id="lmv"><option value="M1">M1 同职业待机</option><option value="M2">M2 8职业混合</option><option value="M3">M3 动作切换</option></select></div>' +
      '<div class="row"><span class="lbl">数量</span><input id="lmcnt" type="number" value="50" step="10"><button id="lmfixed" class="primary">固定采样</button><button id="lmramp">阶梯压测</button></div>' +
      '<div class="row"><button id="lmadd20">+20</button><button id="lmsub20">-20</button><button id="lmadd100">+100</button><button id="lmsub100">-100</button></div>' +
      '<div class="live" id="lmlive">等待资源加载…</div>';
    document.body.appendChild(hud);
    const $v = hud.querySelector('#lmv') as HTMLSelectElement;
    const $c = hud.querySelector('#lmcnt') as HTMLInputElement;
    hud.querySelector('#lmfixed')!.addEventListener('click', () =>
      LayaBench_MC._loadAndRun(Laya, runner, adapter, backend, $v.value, parseInt($c.value)||50));
    hud.querySelector('#lmramp')!.addEventListener('click', () => {
      adapter.init($v.value);
      const g: any = globalThis;
      const ids: string[] = $v.value === 'M2' ? g.MCSim.CHARACTERS : [g.MCSim.CHARACTERS[0]];
      let done = 0;
      ids.forEach((id: string) => {
        Laya.loader.load([MC_RES + id + '/animate0.json', MC_RES + id + '/animate0.png'],
          Laya.Handler.create(null, () => {
            const json = Laya.loader.getRes(MC_RES + id + '/animate0.json');
            const tex  = Laya.loader.getRes(MC_RES + id + '/animate0.png');
            if (json && tex) adapter.loaded[id] = { mcData: parseMcJson(json), tex };
            if (++done >= ids.length) runner.rampRun({ engine: 'layaair-3.4.0', variant: $v.value, backend, stepCount: 20, stepMs: 2000, maxCount: 1000 });
          })
        );
      });
    });
    const bump = (d: number) => { const n = Math.max(0, adapter.nodeCount() + d); adapter.setCount(n); $c.value = String(n); };
    hud.querySelector('#lmadd20')!.addEventListener('click',  () => bump(20));
    hud.querySelector('#lmsub20')!.addEventListener('click',  () => bump(-20));
    hud.querySelector('#lmadd100')!.addEventListener('click', () => bump(100));
    hud.querySelector('#lmsub100')!.addEventListener('click', () => bump(-100));
  }
}

class LayaMCAdapter {
  variant = 'M1';
  loaded: Record<string, { mcData: McData; tex: any }> = {};
  private sim: any = null;
  private nodes: any[] = [];
  private players: LayaMcPlayer[] = [];
  private lastTick = 0;

  constructor(private root: any, private W: number, private H: number) {}

  init(variant: string) { this.clearAll(); this.variant = variant; const g: any = globalThis; this.sim = new g.MCSim(variant, this.W, this.H); }

  clearAll() {
    this.root.removeChildren();
    this.nodes.length = 0; this.players.length = 0;
    if (this.sim) this.sim.list.length = 0;
  }

  setCount(n: number) {
    const cur = this.nodes.length;
    if (!this.sim) return;
    const g: any = globalThis; const Laya = g.Laya;
    if (n > cur) {
      this.sim.add(n - cur);
      for (let i = cur; i < n; i++) {
        const entry = this.sim.list[i];
        const res = this.loaded[entry.charId] || Object.values(this.loaded)[0];
        if (!res) continue;
        const sp = new Laya.Sprite();
        sp.pos(entry.x, entry.y);
        this.root.addChild(sp);
        this.nodes.push(sp);
        const player = new LayaMcPlayer(sp, res.mcData, res.tex);
        player.play('stand');
        this.players.push(player);
      }
    } else if (n < cur) {
      this.sim.remove(cur - n);
      for (let j = cur - 1; j >= n; j--) { this.nodes[j].removeSelf(); this.nodes.pop(); this.players.pop(); }
    }
  }

  step(ts: number) {
    const dt = this.lastTick ? Math.min(ts - this.lastTick, 100) : 16.7;
    this.lastTick = ts;
    for (let i = 0; i < this.players.length; i++) this.players[i].tick(dt);
    if (!this.sim || this.variant !== 'M3') return;
    const changed: number[] = this.sim.update(dt);
    for (const idx of changed) { if (this.players[idx]) this.players[idx].play(this.sim.list[idx].animName); }
  }

  readDrawCalls(): number {
    const g: any = globalThis; const L = g.Laya;
    const sa = g.LayaGL?.statAgent || L?.LayaGL?.statAgent;
    const se = g.StatElement || L?.StatElement;
    if (sa && se) { const v = sa.getElementData(se.CT_2DDrawCall); return typeof v === 'number' ? v : -1; }
    return -1;
  }

  nodeCount() { return this.nodes.length; }
}
