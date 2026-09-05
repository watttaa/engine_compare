/**
 * CocosBench_MC — Cocos Creator 3.8.8 预烘焙骨骼动画适配器
 *
 * 使用步骤：
 *  1. bench/sim-core 4 个 js + bench/engines/mc-bench/mc-sim.js 设为「插件脚本」
 *  2. bench/assets/mc-scene/body/ 拷到 assets/resources/mc/body/
 *  3. 本文件放 assets/scripts/，自动挂载到 Canvas
 *
 * 实现方式：
 *  - 读 mc JSON → 解析 labels（动作段）+ res（sprite 坐标）
 *  - 每个角色一个 Node + Sprite 组件
 *  - 每帧手动推进帧号，从 SpriteAtlas 里取 SpriteFrame 赋给 Sprite
 *  - 与 Egret MovieClip 等价（相同 JSON，相同 PNG，相同逻辑帧率）
 *
 * drawCall：同 CocosBench，WebGL 用 API hook，WebGPU 用 device.numDrawCalls
 */
import { _decorator, Component, Node, Sprite, SpriteFrame, UITransform, Texture2D,
  ImageAsset, resources, director, view, game, Director, macro } from 'cc';

declare const BenchStats: any;
declare const BenchRunner: any;
declare const MCSim: any;

const { ccclass } = _decorator;

const MC_RES_DIR = 'mc/body';  // resources 下路径

// ===== WebGL draw probe（模块顶层安装，同 CocosBench） =====
const __glProbe: any = { drawTotal: 0, frameTotal: 0, lastDraw: 0, lastFrame: 0 };
(function installGlProbe() {
  const g: any = window as any;
  function hookDraws(obj: any) {
    if (!obj || obj.__benchHooked) return;
    obj.__benchHooked = true;
    for (const nm of ['drawElements','drawArrays','drawElementsInstanced','drawArraysInstanced',
      'multiDrawArraysWEBGL','multiDrawElementsWEBGL','multiDrawArraysInstancedWEBGL','multiDrawElementsInstancedWEBGL']) {
      const orig = obj[nm];
      if (typeof orig !== 'function') continue;
      obj[nm] = function () { __glProbe.drawTotal++; return orig.apply(this, arguments); };
    }
  }
  const wrapGetExt = (ctx: any) => {
    if (!ctx || ctx.__extHooked) return; ctx.__extHooked = true;
    const orig = ctx.getExtension.bind(ctx);
    ctx.getExtension = function (name: string) {
      const ext = orig(name);
      if (ext && name.indexOf('multi_draw') >= 0) hookDraws(ext);
      return ext;
    };
  };
  hookDraws(g.WebGLRenderingContext?.prototype);
  hookDraws(g.WebGL2RenderingContext?.prototype);
  const origGetCtx = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type: any, attrs: any) {
    const ctx = origGetCtx.call(this, type, attrs);
    if (ctx && (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl')) wrapGetExt(ctx);
    return ctx;
  } as any;
  (function fc() { __glProbe.frameTotal++; requestAnimationFrame(fc); })();
})();

// ===== mc JSON 解析 =====
interface McLabel { name: string; frame: number; end: number; }
interface McFrame  { res: string; x: number; y: number; }
interface McRes    { x: number; y: number; w: number; h: number; }
interface McData {
  frameRate: number;
  labels: McLabel[];
  frames: McFrame[];
  resMap: Record<string, McRes>;
}

function parseMcJson(raw: any): McData {
  const anim = raw.mc.animate;
  return { frameRate: anim.frameRate || 8, labels: anim.labels, frames: anim.frames, resMap: raw.res };
}

// ===== 帧播放器（单个角色的状态） =====
class McPlayer {
  private mcData: McData;
  private texture: Texture2D;
  private sprite: Sprite;
  private curLabel: McLabel | null = null;
  private localFrame = 0;
  private elapsed = 0;
  private loop = true;

  constructor(sprite: Sprite, mcData: McData, texture: Texture2D) {
    this.sprite = sprite; this.mcData = mcData; this.texture = texture;
  }

  play(animName: string, loop = true) {
    const lbl = this.mcData.labels.find(l => l.name === animName) || this.mcData.labels[0];
    this.curLabel = lbl;
    this.localFrame = 0;
    this.elapsed = 0;
    this.loop = loop;
    this._applyFrame();
  }

  tick(dtMs: number) {
    if (!this.curLabel) return;
    this.elapsed += dtMs;
    const frameDur = 1000 / this.mcData.frameRate;
    while (this.elapsed >= frameDur) {
      this.elapsed -= frameDur;
      const len = this.curLabel.end - this.curLabel.frame;
      this.localFrame++;
      if (this.localFrame > len) this.localFrame = this.loop ? 0 : len;
      this._applyFrame();
    }
  }

  private _applyFrame() {
    if (!this.curLabel) return;
    const globalIdx = this.curLabel.frame - 1 + this.localFrame;
    const f = this.mcData.frames[globalIdx];
    if (!f) return;
    const r = this.mcData.resMap[f.res];
    if (!r) return;
    const sf = new SpriteFrame();
    sf.texture = this.texture;
    sf.rect = new (cc as any).Rect(r.x, r.y, r.w, r.h);
    this.sprite.spriteFrame = sf;
    // 偏移（mc JSON 的 x/y 是相对锚点底部中心的偏移）
    const ut = this.sprite.node.getComponent(UITransform)!;
    ut.contentSize = new (cc as any).Size(r.w, r.h);
  }
}

// ===== 适配器 =====
class MCAdapter {
  variant = 'M1';
  private sim: any = null;
  private nodes: Node[] = [];
  private players: McPlayer[] = [];
  private loaded: Record<string, { mcData: McData; texture: Texture2D }> = {};
  private lastTick = 0;

  constructor(private root: Node, private W: number, private H: number) {}

  init(variant: string) {
    this.clearAll();
    this.variant = variant;
    this.sim = new MCSim(variant, this.W, this.H);
  }

  clearAll() {
    this.root.removeAllChildren();
    this.nodes.length = 0;
    this.players.length = 0;
    if (this.sim) this.sim.list.length = 0;
  }

  /** 预加载角色资源（M1/M3 只需 1001，M2 全部 8 个） */
  preload(charIds: string[], cb: () => void) {
    const ids = this.variant === 'M2' ? charIds : [charIds[0]];
    let done = 0;
    ids.forEach(id => {
      resources.load(`${MC_RES_DIR}/${id}/animate0`, ImageAsset, (_err: any, img: ImageAsset) => {
        resources.load(`${MC_RES_DIR}/${id}/animate0`, (_err2: any, json: any) => {
          if (img && json) {
            const tex = new Texture2D();
            tex.image = img;
            this.loaded[id] = { mcData: parseMcJson(json), texture: tex };
          }
          if (++done >= ids.length) cb();
        });
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
        const res = this.loaded[entry.charId] || Object.values(this.loaded)[0];
        if (!res) continue;
        const nd = new Node();
        nd.layer = 1 << 25;
        const sp = nd.addComponent(Sprite);
        sp.type = Sprite.Type.SIMPLE;
        const ut = nd.getComponent(UITransform)!;
        ut.setAnchorPoint(0.5, 0);
        // Cocos 坐标系：y 向上，原点屏幕中心
        nd.setPosition(entry.x - this.W / 2, this.H / 2 - entry.y, 0);
        this.root.addChild(nd);
        this.nodes.push(nd);
        const player = new McPlayer(sp, res.mcData, res.texture);
        player.play('stand', true);
        this.players.push(player);
      }
    } else if (n < cur) {
      this.sim.remove(cur - n);
      for (let j = cur - 1; j >= n; j--) {
        this.nodes[j].destroy();
        this.nodes.pop();
        this.players.pop();
      }
    }
  }

  step(ts: number) {
    const dt = this.lastTick ? Math.min(ts - this.lastTick, 100) : 16.7;
    this.lastTick = ts;
    // 推进所有角色帧
    for (let i = 0; i < this.players.length; i++) this.players[i].tick(dt);
    if (!this.sim || this.variant !== 'M3') return;
    const changed: number[] = this.sim.update(dt);
    for (const idx of changed) {
      if (this.players[idx]) this.players[idx].play(this.sim.list[idx].animName, true);
    }
  }

  readDrawCalls(): number {
    const dev: any = director.root?.device;
    if (!dev) return -1;
    if (dev.gl) {
      const fd = __glProbe.frameTotal - __glProbe.lastFrame;
      const dd = __glProbe.drawTotal  - __glProbe.lastDraw;
      __glProbe.lastFrame = __glProbe.frameTotal;
      __glProbe.lastDraw  = __glProbe.drawTotal;
      return fd > 0 ? dd / fd : -1;
    }
    return dev.numDrawCalls ?? -1;
  }

  nodeCount() { return this.nodes.length; }
}

// ===== 组件 =====
(macro as any).ENABLE_WEBGL_ANTIALIAS = false;

@ccclass('CocosBench_MC')
export class CocosBench_MC extends Component {
  private adapter!: MCAdapter;
  private stats: any; private runner: any;
  private W = 1280; private H = 720;
  private liveEl!: HTMLElement;
  private _lastLive = 0; private _fpsBuf = 16.7; private _lastTs = 0;
  private liveBackend = '';

  onLoad() {
    view.setDesignResolutionSize(this.W, this.H, 0);
    game.frameRate = 60;
    const dev: any = (director.root as any)?.device;
    this.liveBackend = dev?.gl ? 'webgl' : 'webgpu';

    const holder = (() => {
      const old = this.node.getChildByName('MCRoot');
      if (old) return old;
      const h = new Node('MCRoot'); h.layer = 1 << 25; this.node.addChild(h); return h;
    })();

    this.adapter = new MCAdapter(holder, this.W, this.H);
    this.stats = new BenchStats();
    this.runner = new BenchRunner(this.adapter, this.stats);
    this.buildHud();

    const q = new URLSearchParams(location.search);
    if (q.get('auto') === '1') {
      const v = q.get('variant') || 'M1', n = parseInt(q.get('count') || '50') || 50;
      (document.querySelector('#mv') as any).value = v;
      (document.querySelector('#mcnt') as any).value = String(n);
      this.loadAndRun(v, n);
    }
  }

  update(_dt: number) {
    const ts = performance.now();
    this.runner.tick(ts);
    this.adapter.step(ts);
    if (this._lastTs) this._fpsBuf = this._fpsBuf * 0.9 + Math.min(ts - this._lastTs, 100) * 0.1;
    this._lastTs = ts;
    if (ts - this._lastLive > 400) {
      this._lastLive = ts;
      const dc = this.adapter.readDrawCalls();
      if (this.liveEl) this.liveEl.textContent =
        '后端: ' + this.liveBackend + '  变体: ' + (this.adapter.variant || '-') + '\n' +
        '角色: ' + this.adapter.nodeCount() + '  FPS: ' + (1000 / this._fpsBuf).toFixed(1) + '\n' +
        (dc >= 0 ? 'drawCall: ' + Math.round(dc) : '');
    }
  }

  private loadAndRun(variant: string, count: number) {
    this.adapter.init(variant);
    this.adapter.preload(MCSim.CHARACTERS, () => {
      this.adapter.setCount(count);
      this.runner.fixedRun({ engine: 'cocos-creator-3.8.8', variant, backend: this.liveBackend, count });
    });
  }

  private buildHud() {
    const style = document.createElement('style');
    style.textContent = '#hud2{position:fixed;left:8px;top:8px;z-index:99998;background:rgba(16,22,30,.86);border:1px solid #2b3947;border-radius:10px;padding:10px 12px;color:#e6edf3;font:13px sans-serif;width:360px;max-width:92vw}#hud2 h3{margin:0 0 8px;color:#7fd4ff;font-size:13px}#hud2 .row{display:flex;gap:8px;margin:5px 0;align-items:center;flex-wrap:wrap}#hud2 .lbl{width:40px;color:#8aa0b4;font-size:12px}#hud2 select,#hud2 input{background:#0d1218;color:#e6edf3;border:1px solid #33475a;border-radius:7px;padding:3px 7px;font-size:12px}#hud2 input{width:68px}#hud2 button{background:#1d2833;color:#cdd9e5;border:1px solid #33475a;border-radius:7px;padding:3px 9px;cursor:pointer;font-size:12px}#hud2 button.primary{background:#2f6feb;color:#fff}#hud2 .live{background:#0d1218;border:1px solid #2b3947;border-radius:8px;padding:6px 9px;white-space:pre;font:11px/1.6 monospace;color:#9fe8a8;margin-top:6px}';
    document.head.appendChild(style);
    const hud = document.createElement('div'); hud.id = 'hud2';
    hud.innerHTML = '<h3>🎭 Cocos Creator 3.8.8 · 预烘焙骨骼动画 [' + this.liveBackend + ']</h3>' +
      '<div class="row"><span class="lbl">变体</span><select id="mv"><option value="M1">M1 同职业待机</option><option value="M2">M2 8职业混合</option><option value="M3">M3 动作切换</option></select></div>' +
      '<div class="row"><span class="lbl">数量</span><input id="mcnt" type="number" value="50" step="10"><button id="mfixed" class="primary">固定采样</button><button id="mramp">阶梯压测</button></div>' +
      '<div class="row"><button id="madd20">+20</button><button id="msub20">-20</button><button id="madd100">+100</button><button id="msub100">-100</button></div>' +
      '<div class="live" id="mlive">等待资源加载…</div>';
    document.body.appendChild(hud);
    this.liveEl = hud.querySelector('#mlive') as HTMLElement;
    const $v = hud.querySelector('#mv') as HTMLSelectElement;
    const $c = hud.querySelector('#mcnt') as HTMLInputElement;
    this.runner.onReport = (json: any) => {
      this.liveEl.textContent = '完成: fps=' + json.fps + ' p50=' + json.p50 + 'ms p95=' + json.p95 + 'ms dc=' + json.drawCallAvg;
      BenchRunner.exportJSON(json);
    };
    hud.querySelector('#mfixed')!.addEventListener('click', () => this.loadAndRun($v.value, parseInt($c.value)||50));
    hud.querySelector('#mramp')!.addEventListener('click', () => {
      this.adapter.init($v.value);
      this.adapter.preload(MCSim.CHARACTERS, () => {
        this.runner.rampRun({ engine: 'cocos-creator-3.8.8', variant: $v.value, backend: this.liveBackend, stepCount: 20, stepMs: 2000, maxCount: 1000 });
      });
    });
    const bump = (d: number) => { const n = Math.max(0, this.adapter.nodeCount() + d); this.adapter.setCount(n); $c.value = String(n); };
    hud.querySelector('#madd20')!.addEventListener('click',  () => bump(20));
    hud.querySelector('#msub20')!.addEventListener('click',  () => bump(-20));
    hud.querySelector('#madd100')!.addEventListener('click', () => bump(100));
    hud.querySelector('#msub100')!.addEventListener('click', () => bump(-100));
  }
}

director.once(Director.EVENT_AFTER_SCENE_LAUNCH, () => {
  try {
    const scene = director.getScene();
    const canvas = scene?.getChildByName('Canvas') || scene?.children[0];
    if (!canvas || canvas.getComponent('CocosBench_MC')) return;
    canvas.addComponent(CocosBench_MC);
  } catch (e) { console.error('[CocosBench_MC]', e); }
});

import { cc } from 'cc';
