/**
 * CocosBench_MC — Cocos Creator 3.8.8 预烘焙骨骼动画基准（对齐 Egret 参照实现 M2 语义）
 *
 * 语义对齐清单（参照 bench/web/dist/egret-mc/main.js）：
 *  1. 三层 body/head/weapon 帧动画（每角色 3 个 Sprite，层级顺序一致）
 *  2. MC JSON 帧数据（labels 1-based 闭区间、frames[].{res,x,y}、res 区域表）逐帧切图
 *     —— SpriteFrame(texture, rect)：rect 原点=贴图左上（引擎上传翻 Y，v=0 为图顶部，已按源码核实）
 *  3. 方向语义：resDirOf(dir)>1 → animate2，否则 animate0；flipOf(dir) 1/3 → 容器 scaleX=-1
 *  4. 地图 1001 十二切片背景（行列偏移与 Egret 完全一致）+ A* 随机行走（同一 mc-sim/pathfinding）
 *  5. 承载力压测走 bench-runner.capacityRamp（同档位同判定 p95≤20/p99≤35）
 *  6. 自动双后端走 sim-core/mc-compare.js 跨页状态机（WebGL 臂 → WebGPU 臂 → 汇总提升倍数）
 *  7. HUD：默认进场景 10 角色，只留 固定采样 / 自动双后端 / 复制结果 / 中止 / 返回
 *
 * 工程接入（bench/setup-mc-skel.js 自动装配）：
 *  - assets/scripts/sim/*.js —— 引擎无关层（插件脚本，全局暴露：BenchStats/BenchRunner/MCSim/PF/MCCompare）
 *  - assets/scripts/mc-data/mc-data.js —— MC JSON + 地图位图（插件脚本全局 __MC_DATA，规避构建期资产格式转换）
 *  - assets/resources/mc/… —— 贴图（resources.load 动态加载）
 *  - assets/Scene/main.scene —— Canvas+Camera 最小场景（本组件 EVENT_AFTER_SCENE_LAUNCH 自动挂载）
 *
 * 引擎 API（cocos-engine 3.8.8 源码核实）：
 *  - DrawCall: WebGL 走 __glProbe（含 WEBGL_multi_draw 扩展 hook）；WebGPU 走 device.numDrawCalls
 *  - 后端判定: director.root.device.gl 存在 → webgl，否则 webgpu
 *  - 坐标系: UI 中心原点 y 向上 —— 地图容器 + 逐节点 y 翻转（MAP_H - y）
 */
import { _decorator, Component, Node, Sprite, SpriteFrame, UITransform, Texture2D, resources, director, view, macro, Director, game, Rect, Size, Vec2 } from 'cc';

// 【公平性·SPEC 0】关抗锯齿，对齐 Egret（默认关）与 WebGPU（单采样）。
// 模块顶层执行：本脚本随场景加载，早于 swapchain 创建，宏读取时已生效。
(macro as any).ENABLE_WEBGL_ANTIALIAS = false;

// 【drawCall 探针·模块顶层安装】必须在引擎创建 WebGL 上下文之前：
//  1. Cocos 3.8.8 WebGL 后端 device.numDrawCalls 恒 0（webgl2-command-buffer 从不递增）
//  2. 2D 合批走 WEBGL_multi_draw 扩展（方法在扩展对象上，不在原型上）
//     → hook 原型 draw* + 包一层 getExtension 拦截扩展对象
// 口径与 Egret WebGL probe 一致：窗口内 draw/frame 均值
const __glProbe: any = { drawTotal: 0, frameTotal: 0, lastDraw: 0, lastFrame: 0 };
(function installGlProbe() {
    const g: any = window as any;
    function hookDraws(obj: any) {
        if (!obj || obj.__benchHooked) return;
        obj.__benchHooked = true;
        for (const nm of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced',
            'multiDrawArraysWEBGL', 'multiDrawElementsWEBGL', 'multiDrawArraysInstancedWEBGL', 'multiDrawElementsInstancedWEBGL']) {
            const orig = obj[nm];
            if (typeof orig !== 'function') continue;
            obj[nm] = function () { __glProbe.drawTotal++; return orig.apply(this, arguments); };
        }
    }
    hookDraws(g.WebGLRenderingContext && g.WebGLRenderingContext.prototype);
    hookDraws(g.WebGL2RenderingContext && g.WebGL2RenderingContext.prototype);
    const origGetExt = g.HTMLCanvasElement.prototype.getContext;
    g.HTMLCanvasElement.prototype.getContext = function (type: string) {
        const ctx = origGetExt.apply(this, arguments as any);
        if (ctx && (type === 'webgl' || type === 'webgl2')) {
            const origGE = (ctx as any).getExtension;
            (ctx as any).getExtension = function (nm: string) {
                const ext = origGE.call(this, nm);
                if (ext && nm.indexOf('multi_draw') >= 0) hookDraws(ext);
                return ext;
            };
        }
        return ctx;
    } as any;
    (function fc() { __glProbe.frameTotal++; requestAnimationFrame(fc); })();
})();

// -------- 常量（与 Egret 参照实现逐项一致） --------
const MC_RES = 'mc/';
const LAYERS = ['body', 'head', 'weapon'];
const WEAPON_BY_CHAR: Record<string, string> = {
    '1001': '10001', '1002': '11001', '1003': '12001', '1004': '13001',
    '1005': '14001', '1006': '15001', '1007': '16001', '1008': '17001'
};
const MAP_FULL_W = 1080, MAP_FULL_H = 1880;   // = MCSim.MAP_W_PX / MAP_H_PX
const STAGE_W = 1280, STAGE_H = 720;
const MAP_SCALE = Math.min(STAGE_W / MAP_FULL_W, STAGE_H / MAP_FULL_H);
const MAP_OFFSET_X = (STAGE_W - MAP_FULL_W * MAP_SCALE) / 2;
const MAP_OFFSET_Y = (STAGE_H - MAP_FULL_H * MAP_SCALE) / 2;
const TILE_COL_WIDTHS = [512, 512, 56];
const TILE_ROW_HEIGHTS = [512, 512, 512, 344];
const TILE_ROWS = 4, TILE_COLS = 3;
const UI_LAYER = 1 << 25;   // Layers.Enum.UI_2D（相机可见层；默认 1<<30 不可见）

const G: any = globalThis as any;

// sim 坐标（左上原点 y 向下）→ cocos UI 坐标（中心原点 y 向上）
function toX(x: number) { return x - STAGE_W / 2; }
function toY(y: number) { return STAGE_H / 2 - y; }

// -------- 资源加载 --------
/** resources 子资产路径双形式兜底（'dir/name/texture' 与 'dir/name@texture' 均见于 3.x 文档/实践） */
function loadResAny(path: string, type: any): Promise<any> {
    return new Promise((resolve, reject) => {
        const forms = [path, path.replace(/\/([^/]+)$/, '@$1')];
        let idx = 0;
        const tryNext = () => {
            if (idx >= forms.length) { reject(new Error('资源缺失: ' + path)); return; }
            const p = forms[idx++];
            resources.load(p, type, (err: Error | null, asset: any) => {
                if (err || !asset) tryNext();
                else resolve(asset);
            });
        };
        tryNext();
    });
}

/** MC 帧资源：贴图 Texture2D + JSON（全局 __MC_DATA）+ 逐 res 的 SpriteFrame 缓存 */
class McRes {
    frameRate: number;
    labels: any[];
    frames: any[];
    resMap: any;
    tex: any;                        // Texture2D
    private _sf: Record<string, SpriteFrame> = {};

    constructor(json: any, tex: any) {
        const a = json.mc.animate;
        this.frameRate = a.frameRate || 8;
        this.labels = a.labels;
        this.frames = a.frames;
        this.resMap = json.res;
        this.tex = tex;
    }
    /** res 区域 → SpriteFrame（缓存复用；packable=false 禁动态合图，对齐 Egret IgnoreSelf 语义） */
    sf(resKey: string): SpriteFrame | null {
        if (!this._sf[resKey]) {
            const r = this.resMap[resKey];
            if (!r) return null;
            const f = new SpriteFrame();
            f.texture = this.tex;                 // reset({texture}) → 全图 rect + UV
            f.rect = new Rect(r.x, r.y, r.w, r.h); // rect 原点=贴图左上（v=0 为图顶部）
            f.originalSize = new Size(r.w, r.h);
            f.offset = new Vec2(0, 0);
            f.packable = false;                    // 公平性：禁 Cocos 动态合图（对齐 Egret batchType.IgnoreSelf）
            this._sf[resKey] = f;
        }
        return this._sf[resKey];
    }
}

const _resCache: Record<string, Promise<McRes>> = {};
function loadMcRes(layer: string, modelId: string, direction: number): Promise<McRes> {
    const suffix = direction === 2 && layer === 'body' ? 'animate2' : 'animate0';
    const key = layer + '/' + modelId + '/' + suffix;
    if (_resCache[key]) return _resCache[key];
    const json = (G.__MC_DATA && G.__MC_DATA.json && G.__MC_DATA.json[key]) || null;
    _resCache[key] = loadResAny(MC_RES + key + '/texture', Texture2D)
        .then((tex: any) => {
            if (!json) throw new Error('__MC_DATA 缺 ' + key);
            return new McRes(json, tex);
        });
    return _resCache[key];
}
function loadChar(charId: string): Promise<{ data0: McRes[]; data2: McRes[] }> {
    const key = 'char:' + charId;
    if (_resCache[key]) return _resCache[key] as any;
    const weaponId = WEAPON_BY_CHAR[charId];
    _resCache[key] = Promise.all([
        loadMcRes('body', charId, 0), loadMcRes('head', charId, 0), loadMcRes('weapon', weaponId, 0),
        loadMcRes('body', charId, 2), loadMcRes('head', charId, 2), loadMcRes('weapon', weaponId, 2)
    ]).then(layers => ({ data0: layers.slice(0, 3), data2: layers.slice(3, 6) })) as any;
    return _resCache[key] as any;
}

// -------- 帧播放器：labels 1-based 闭区间循环，帧率推进语义同 egret.MovieClip --------
class McPlayer {
    private res: McRes;
    private sp: Sprite;
    private labelIdx = 0;
    private cur = 1;
    private elapsed = 0;

    constructor(res: McRes, sp: Sprite) {
        this.res = res; this.sp = sp;
    }
    setRes(res: McRes) {
        this.res = res;
        this.cur = 1;
        this.elapsed = 0;
    }
    play(animName: string) {
        const ls = this.res.labels;
        let i = 0;
        for (let k = 0; k < ls.length; k++) if (ls[k].name === animName) { i = k; break; }
        this.labelIdx = i;
        this.cur = ls[i].frame;
        this.elapsed = 0;
        this.apply();
    }
    tick(dtMs: number) {
        this.elapsed += dtMs;
        const dur = 1000 / this.res.frameRate;
        const lbl = this.res.labels[this.labelIdx];
        let dirty = false;
        while (this.elapsed >= dur) {
            this.elapsed -= dur;
            this.cur++;
            if (this.cur > lbl.end) this.cur = lbl.frame;
            dirty = true;
        }
        if (dirty) this.apply();
    }
    private apply() {
        const f = this.res.frames[this.cur - 1];
        if (!f) return;
        const sf = this.res.sf(f.res);
        if (!sf) return;
        this.sp.spriteFrame = sf;
        // 帧偏移 (f.x, f.y)：与 egret MovieClip offsetPoint 语义一致。
        // 节点 anchor(0,1)：content 顶边中点对齐 position —— 顶左角 = position + (0,0)，
        // x 向右、content 向下延伸 h；容器局部 y 向上，故 y = -f.y（镜像由容器 scaleX=-1 统一处理）
        this.sp.node.setPosition(f.x, -f.y, 0);
    }
}

// -------- 适配器（BenchRunner 契约） --------
class CocosMCAdapter {
    sim: any = null;
    nodes: any[] = [];
    channel = 'generic';
    variant = 'M2';
    actualBackend = 'unknown';
    root: Node = null as any;
    characterRoot: Node = null as any;
    private _loadEpoch = 0;
    private _pendingLoads = 0;
    private _lastTick = 0;

    constructor(holder: Node) {
        // 地图容器：背景+角色整体缩放进 1280×720（与 Egret 参照实现同常量）；
        // 容器自身无翻转 —— 逐节点做 y 翻转（MAP_FULL_H - y），纹理不镜像
        const mapRoot = new Node('MCMapRoot');
        mapRoot.layer = UI_LAYER;
        mapRoot.setPosition(toX(MAP_OFFSET_X), toY(MAP_OFFSET_Y), 0);
        mapRoot.setScale(MAP_SCALE, MAP_SCALE, 1);
        holder.addChild(mapRoot);
        this.root = mapRoot;
        this.characterRoot = new Node('MCCharacters');
        this.characterRoot.layer = UI_LAYER;
        mapRoot.addChild(this.characterRoot);
    }

    init(_variant?: string) {
        this._loadEpoch++;
        this._clearAll();
        this.variant = 'M2';
        this.sim = new G.MCSim('M2', G.MCSim.MAP_W_PX, G.MCSim.MAP_H_PX);
    }

    setChannel(channel: string) {
        this.channel = channel === 'instanced' ? 'generic' : 'generic'; // Cocos 无实例化通道，仅引擎原生路径
    }

    private _clearAll() {
        for (let i = 0; i < this.nodes.length; i++) {
            const n = this.nodes[i];
            if (n && n.cont) n.cont.destroy();
        }
        this.nodes.length = 0;
        if (this.sim) this.sim.list.length = 0;
    }

    setCount(n: number) {
        if (!this.sim) return;
        const cur = this.sim.list.length;
        if (n > cur) {
            this.sim.add(n - cur);
            const self = this;
            const loadEpoch = this._loadEpoch;
            for (let i = cur; i < n; i++) {
                const entry = this.sim.list[i];
                // 角色容器：位置/镜像在容器层（三层共享，与 Egret 每 MC 同 scaleX 数学等价）
                const cont = new Node('char' + i);
                cont.layer = UI_LAYER;
                this.characterRoot.addChild(cont);
                const node: any = { cont: cont, players: [], loaded: false, dir: entry.dir, resDir: 0, res: null };
                this.nodes[i] = node;
                this._pendingLoads++;
                loadChar(entry.charId).then((res: any) => {
                    self._pendingLoads--;
                    if (!self.sim || self._loadEpoch !== loadEpoch || i >= self.sim.list.length || self.nodes[i] !== node) return;
                    node.res = res;
                    const data = node.resDir === 2 ? res.data2 : res.data0;
                    for (let li = 0; li < LAYERS.length; li++) {
                        const spNode = new Node(LAYERS[li]);
                        spNode.layer = UI_LAYER;
                        const ut = spNode.addComponent(UITransform);
                        ut.setAnchorPoint(0, 1);          // 左上锚点：position = 帧顶左角
                        const sp = spNode.addComponent(Sprite);
                        sp.type = Sprite.Type.SIMPLE;
                        cont.addChild(spNode);
                        const p = new McPlayer(data[li], sp);
                        p.play(entry.animName);
                        node.players.push(p);
                    }
                    node.loaded = true;
                }).catch((e: any) => {
                    self._pendingLoads--;
                    console.warn('[mc-cocos] load fail:', e);
                });
            }
        } else if (n < cur) {
            this.sim.remove(cur - n);
            for (let j = cur - 1; j >= n; j--) {
                if (this.nodes[j] && this.nodes[j].cont) this.nodes[j].cont.destroy();
                this.nodes.pop();
            }
        }
    }

    step(ts: number) {
        const dt = this._lastTick ? Math.min(ts - this._lastTick, 100) : 16.7;
        this._lastTick = ts;
        if (!this.sim) return;

        const updates = this.sim.update(dt);
        for (let ui = 0; ui < updates.length; ui++) {
            const u = updates[ui];
            const node = this.nodes[u.idx];
            if (!node || !node.loaded || !node.res) continue;
            if (u.dirChange && typeof u.dir === 'number') {
                node.dir = u.dir;
                const resDir = G.MCSim.resDirOf(u.dir);
                const flipX = G.MCSim.flipOf(u.dir);
                const data = resDir === 2 ? node.res.data2 : node.res.data0;
                node.resDir = resDir;
                node.cont.setScale(flipX, 1, 1);
                for (let mi = 0; mi < node.players.length; mi++) {
                    node.players[mi].setRes(data[mi]);
                    node.players[mi].play(u.animName);
                }
            } else if (u.animName) {
                for (let mi = 0; mi < node.players.length; mi++) {
                    node.players[mi].play(u.animName);
                }
            }
        }
        // 每帧：位置同步（y 翻转）+ 帧动画推进（egret MovieClip 由引擎时钟逐帧推进，此处同 dt）
        const list = this.sim.list;
        for (let i = 0; i < this.nodes.length; i++) {
            const nd = this.nodes[i];
            if (!nd || !nd.loaded || !list[i]) continue;
            nd.cont.setPosition(list[i].x, MAP_FULL_H - list[i].y, 0);
            for (let mi = 0; mi < nd.players.length; mi++) nd.players[mi].tick(dt);
        }
    }

    readDrawCalls(): number {
        const dev: any = director.root && director.root.device;
        if (!dev) return -1;
        if (dev.gl) {
            const fd = __glProbe.frameTotal - __glProbe.lastFrame;
            const dd = __glProbe.drawTotal - __glProbe.lastDraw;
            __glProbe.lastFrame = __glProbe.frameTotal;
            __glProbe.lastDraw = __glProbe.drawTotal;
            return fd > 0 ? dd / fd : -1;
        }
        return dev.numDrawCalls; // WebGPU
    }

    readBenchMetrics(): any {
        return {
            actualBackend: this.actualBackend,
            renderWidth: STAGE_W,
            renderHeight: STAGE_H,
            antialias: false
        };
    }

    nodeCount(): number {
        return this.nodes.filter((n: any) => n && n.loaded).length;
    }

    isReady(): boolean {
        return this.nodes.length === this.sim.list.length && this._pendingLoads === 0 && this.nodeCount() === this.sim.list.length;
    }
}

// -------- 入口组件（EVENT_AFTER_SCENE_LAUNCH 自动挂载，无需场景内引用） --------
export class CocosBench_MC extends Component {
    private adapter: CocosMCAdapter | null = null;
    private stats: any = null;
    private runner: any = null;
    private liveEl: HTMLElement | null = null;
    private $c: HTMLInputElement | null = null;
    private capacityRunning = false;
    private lastResult: any = null;
    private capacityStatus = '';
    private _lvlStartTs = 0;
    private _hudFrameBuf: number[] = [];
    private liveFpsEma = 16.7;
    private liveLastTs = 0;
    private _lastLive = 0;
    private requested = 'webgl';

    /** 精灵容器：Canvas 下独立节点。不能直接用 Canvas 当 root——
     *  clearAll 会 removeAllChildren 把场景自带的 Camera 删掉，导致黑屏不渲染。 */
    private makeHolder(): Node {
        const old = this.node.getChildByName('BenchRoot');
        if (old) return old;
        const holder = new Node('BenchRoot');
        holder.layer = UI_LAYER;
        this.node.addChild(holder);
        return holder;
    }

    onLoad() {
        // 【公平性】固定逻辑分辨率 1280×720（三引擎统一逻辑坐标）；帧率上限 60 对齐 egret
        view.setDesignResolutionSize(STAGE_W, STAGE_H, 0); // 0=EXACT_FIT
        game.frameRate = 60;

        this.adapter = new CocosMCAdapter(this.makeHolder());
        this.stats = new G.BenchStats();
        this.runner = new G.BenchRunner(this.adapter, this.stats);

        // 运行时后端探测：WebGL 设备有 gl 属性，WebGPU 没有（不用 navigator.gpu 猜）
        const dev: any = (director.root as any) ? (director.root as any).device : null;
        const backend = (dev && dev.gl) ? 'webgl' : 'webgpu';
        this.adapter.actualBackend = backend;
        this.requested = new URLSearchParams(location.search).get('backend') || 'webgl';

        this.buildBackground();
        this.initPathfinder();
        this.buildHud();

        // 自动测试 / 自动双后端入口
        const q = new URLSearchParams(location.search);
        if (q.get('autoCompare')) {
            setTimeout(() => this.runCapacity(), 0);
        } else if (q.get('auto') === '1') {
            const n = parseInt(q.get('count') || '50', 10) || 50;
            if (this.$c) this.$c.value = String(n);
            this.runFixed();
        } else {
            // 默认进入：场景 + 10 个角色（只看不测）
            this.adapter.init('M2');
            this.adapter.setCount(10);
        }
    }

    /** 帧回调入口：与 egret/laya 适配器保持同一相对位置 */
    update(_dt: number) {
        const ts = performance.now();
        if (this.liveLastTs) {
            const ft = Math.min(ts - this.liveLastTs, 100);
            this.liveFpsEma = this.liveFpsEma * 0.9 + ft * 0.1;
            this._hudFrameBuf.push(ft);
            if (this._hudFrameBuf.length > 240) this._hudFrameBuf.shift();
        }
        this.liveLastTs = ts;
        this.runner.tick(ts);
        if (this.adapter) this.adapter.step(ts);
        this.updateLive();
    }

    /** 地图背景：十二切片按行列偏移拼合（与 Egret 同常量） */
    private buildBackground() {
        const root = this.adapter!.root;
        let rowY = 0;
        for (let row = 0; row < TILE_ROWS; row++) {
            let colX = 0;
            for (let col = 0; col < TILE_COLS; col++) {
                const key = 'mc/map/1001/' + row + '_' + col;
                loadResAny(key + '/spriteFrame', SpriteFrame).then((sf: SpriteFrame) => {
                    const n = new Node('tile' + row + '_' + col);
                    n.layer = UI_LAYER;
                    const ut = n.addComponent(UITransform);
                    ut.setAnchorPoint(0, 1);
                    const sp = n.addComponent(Sprite);
                    sp.type = Sprite.Type.SIMPLE;
                    sp.spriteFrame = sf;
                    (sf as any).packable = false;
                    root.insertChild(n, 0);   // 背景垫底
                    n.setPosition(colX, MAP_FULL_H - (rowY + TILE_ROW_HEIGHTS[row]), 0);
                }).catch((e: any) => console.warn('[mc-cocos] 地图切片加载失败:', e));
                colX += TILE_COL_WIDTHS[col];
            }
            rowY += TILE_ROW_HEIGHTS[row];
        }
    }

    /** A* 寻路位图（全局 __MC_DATA.mapBytes，插件脚本随构建原样拷贝） */
    private initPathfinder() {
        try {
            const bytes = G.__MC_DATA && G.__MC_DATA.mapBytes;
            if (bytes) G.MCSim.initPathfinder(new Uint8Array(bytes));
            else console.warn('[mc-cocos] __MC_DATA.mapBytes 缺失（寻路降级随机游走）');
        } catch (e) {
            console.warn('[mc-cocos] 地图位图初始化失败:', e);
        }
    }

    // ---------------- HUD ----------------
    private buildHud() {
        const hud = document.createElement('div');
        hud.id = 'hud';
        hud.innerHTML =
            '<h3>⚔️ Cocos Creator 3.8.8 · 大话西游战斗场景 [' + this.requested + ']</h3>' +
            '<div class="row"><button id="cmback">← 返回场景列表</button></div>' +
            '<div class="row"><span class="lbl">场景</span><span>8职业混编 · A* 随机行走</span></div>' +
            '<div class="row"><span class="lbl">数量</span>' +
            '<input id="cmcnt" type="number" value="10" step="10">' +
            '<button id="cmfixed" class="primary">固定采样</button>' +
            '<button id="cmcompare" class="primary">⚖ 自动双后端</button>' +
            '<button id="cmcopy" disabled>复制结果</button>' +
            '<button id="cmstop" disabled>中止</button></div>' +
            '<div class="live" id="cmlive">加载地图中…</div>';
        document.body.appendChild(hud);

        const style = document.createElement('style');
        style.textContent =
            '#hud{position:fixed;left:8px;top:8px;z-index:99998;background:rgba(16,22,30,.86);' +
            'backdrop-filter:blur(6px);border:1px solid #2b3947;border-radius:10px;padding:10px 12px;' +
            'color:#e6edf3;font:13px -apple-system,"PingFang SC","Microsoft YaHei",sans-serif;' +
            'width:380px;max-width:92vw;max-height:96vh;overflow:auto}' +
            '#hud h3{margin:0 0 8px;color:#7fd4ff;font-size:13px}' +
            '#hud .row{display:flex;gap:8px;margin:5px 0;align-items:center;flex-wrap:wrap}' +
            '#hud .lbl{width:40px;color:#8aa0b4;font-size:12px}' +
            '#hud select,#hud input{background:#0d1218;color:#e6edf3;border:1px solid #33475a;border-radius:7px;padding:3px 7px;font-size:12px}' +
            '#hud input{width:68px}' +
            '#hud button{background:#1d2833;color:#cdd9e5;border:1px solid #33475a;border-radius:7px;padding:3px 9px;cursor:pointer;font-size:12px}' +
            '#hud button.primary{background:#2f6feb;color:#fff}' +
            '#hud button:disabled{opacity:.45;cursor:default}' +
            '#hud .live{background:#0d1218;border:1px solid #2b3947;border-radius:8px;padding:6px 9px;white-space:pre;font:11px/1.6 ui-monospace,Consolas,monospace;color:#9fe8a8;margin-top:6px}';
        document.head.appendChild(style);

        this.liveEl = hud.querySelector('#cmlive');
        this.$c = hud.querySelector('#cmcnt');
        const copyBtn = hud.querySelector('#cmcopy') as HTMLButtonElement;
        const stopBtn = hud.querySelector('#cmstop') as HTMLButtonElement;
        const compareBtn = hud.querySelector('#cmcompare') as HTMLButtonElement;
        const runner = this.runner;
        const adapter = this.adapter!;
        const self = this;

        function setCapacityRunning(running: boolean) {
            self.capacityRunning = running;
            compareBtn.disabled = running;
            stopBtn.disabled = !running;
            (hud.querySelector('#cmfixed') as HTMLButtonElement).disabled = running;
            if (self.$c) self.$c.disabled = running;
        }
        (this as any)._setCapacityRunning = setCapacityRunning;

        // 自动双后端：跨页状态机在 sim-core/mc-compare.js（引擎无关，三引擎同款）
        const mcCompare = new G.MCCompare({
            engine: 'cocos-creator-3.8.8',
            webglPage: '/cocos-mc-webgl/index.html',
            webgpuPage: '/cocos-mc/index.html',
            webglQuery: 'scene=mc',
            webgpuQuery: 'scene=mc',
            onProgress: (msg: string) => { if (self.liveEl) self.liveEl.textContent = msg; },
            onDone: (result: any) => {
                self.lastResult = result;
                copyBtn.disabled = false;
                const webgl = result.webgl, webgpu = result.webgpu;
                const lift = webgl.maxStableCount > 0 ? (webgpu.maxStableCount / webgl.maxStableCount).toFixed(2) : '?';
                if (self.liveEl) self.liveEl.textContent = '双后端对比完成\nWebGL: ' + webgl.maxStableCount + ' 人  首失败: ' + webgl.firstFailCount +
                    '\nWebGPU: ' + webgpu.maxStableCount + ' 人  首失败: ' + webgpu.firstFailCount +
                    '\n承载力提升: ' + (lift === '?' ? '无法计算' : lift + ' 倍') +
                    '\n结果已导出，可点击复制结果';
                G.BenchRunner.exportJSON(result);
            }
        });
        (this as any)._mcCompare = mcCompare;

        runner.onReport = (json: any) => {
            self.lastResult = json;
            copyBtn.disabled = false;
            if (self.liveEl) self.liveEl.textContent = '完成: fps=' + json.fps + ' p50=' + json.p50 + 'ms p95=' + json.p95 + 'ms dc=' + json.drawCallAvg;
            G.BenchRunner.exportJSON(json);
        };

        hud.querySelector('#cmback').addEventListener('click', () => {
            if (self.capacityRunning) runner.stopCapacityRamp();
            (window.parent !== window) ? window.parent.history.back() : window.history.back();
        });
        copyBtn.addEventListener('click', () => {
            if (!self.lastResult) return;
            const text = JSON.stringify(self.lastResult, null, 2);
            const done = () => {
                copyBtn.textContent = '已复制';
                setTimeout(() => { copyBtn.textContent = '复制结果'; }, 1500);
            };
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(done);
                return;
            }
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.cssText = 'position:fixed;left:-9999px;top:0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            done();
        });
        hud.querySelector('#cmfixed').addEventListener('click', () => self.runFixed());
        compareBtn.addEventListener('click', () => { if (!self.capacityRunning) mcCompare.start(); });
        stopBtn.addEventListener('click', () => { runner.stopCapacityRamp(); });
    }

    private runFixed() {
        const n = parseInt((this.$c ? this.$c.value : '10'), 10) || 10;
        this.adapter!.init('M2');
        this.adapter!.setCount(n);
        this.runner.fixedRun({
            engine: 'cocos-creator-3.8.8', variant: 'M2',
            backend: this.adapter!.actualBackend, channel: this.adapter!.channel, count: n
        });
    }

    private runCapacity() {
        const v = 'M2';
        const capacityCounts = new URLSearchParams(location.search).get('capacityCounts');
        const counts = capacityCounts ? capacityCounts.split(',').map(Number).filter((n: number) => n > 0) : null;
        const setRunning = (this as any)._setCapacityRunning as (b: boolean) => void;
        const liveEl = this.liveEl!;
        const runner = this.runner;
        const adapter = this.adapter!;
        const self = this;
        setRunning(true);
        this.capacityStatus = '承载力压测准备中\n变体: ' + v + '\n粗测: ' + (counts ? counts.join(' → ') : '20 → 40 → 80 → 160 → 320 → 640 → 1280 → 2560 → 5120 → 10240 → 20480');
        liveEl.textContent = this.capacityStatus;
        runner.capacityRamp({
            counts: counts || undefined,
            engine: 'cocos-creator-3.8.8', variant: v,
            backend: adapter.actualBackend,
            channel: adapter.channel,
            onLevel: (info: any) => {
                if (info.phase === 'start') {
                    if (self.$c) self.$c.value = String(info.count);
                    self._lvlStartTs = performance.now();
                    self.capacityStatus = '承载力压测\n变体: ' + v + '  阶段: ' + (info.stage === 'coarse' ? '倍增粗测' : '临界补测') +
                        '\n当前档位: ' + info.count + ' 角色\n状态: 预热 ' + (info.preWarmSec || 3) + 's + 采样 ' + (info.sampleSec || 10) + 's';
                    liveEl.textContent = self.capacityStatus;
                } else if (info.phase === 'invalid') {
                    self.capacityStatus = '承载力压测\n档位: ' + info.count + ' 角色\n状态: 页面曾在后台，采样无效；回到前台后自动重测';
                    liveEl.textContent = self.capacityStatus;
                } else {
                    const stableWhy = (j: any) => {
                        const r: string[] = [];
                        if (!(j.p95 <= 20)) r.push('p95 ' + j.p95 + '>20ms');
                        if (!(j.p99 <= 35)) r.push('p99 ' + j.p99 + '>35ms');
                        return r.join(' · ');
                    };
                    self.capacityStatus = '承载力压测\n档位: ' + info.count + ' 角色  ' + (info.stable ? '✅ 稳定' : '❌ 不稳定（' + (stableWhy(info.json) || '采样帧不足') + '）') +
                        '\nfps: ' + info.json.fps +
                        '\np95: ' + info.json.p95 + 'ms  p99: ' + info.json.p99 + 'ms  超预算: ' + info.json.overBudgetPct + '%';
                    liveEl.textContent = self.capacityStatus;
                }
            },
            onDone: (summary: any) => {
                setRunning(false);
                const json = {
                    meta: {
                        engine: 'cocos-creator-3.8.8', variant: v,
                        backend: adapter.actualBackend,
                        channel: adapter.channel, mode: 'capacity-ramp'
                    },
                    maxStableCount: summary.cap,
                    firstFailCount: summary.firstFail,
                    cancelled: summary.cancelled,
                    capped: summary.capped,
                    results: summary.results.map((r: any) => ({ count: r.count, stable: r.stable, result: r.json }))
                };
                self.lastResult = json;
                const copyBtn = document.querySelector('#cmcopy') as HTMLButtonElement;
                if (copyBtn) copyBtn.disabled = false;
                liveEl.textContent = summary.cancelled
                    ? '承载力压测已中止\n已完成档位: ' + summary.results.length
                    : '承载力压测完成\n最大稳定承载力: ' + summary.cap + ' 角色' +
                      '\n首次失败档: ' + (summary.firstFail == null ? '无（已到上限）' : summary.firstFail) +
                      '\n已完成档位: ' + summary.results.length;
                G.BenchRunner.exportJSON(json);
                const mcCompare = (self as any)._mcCompare;
                if (mcCompare) mcCompare.continueAfterArm(json);
            }
        });
    }

    private updateLive() {
        const liveEl = this.liveEl;
        if (!liveEl || !this.adapter) return;
        const now = performance.now();
        if (now - this._lastLive <= 400) return;
        this._lastLive = now;
        const dc = this.adapter.readDrawCalls();
        const mapSt = G.MCSim.isMapLoaded() ? '✅' : '⏳';
        if (this.capacityRunning) {
            const buf = this._hudFrameBuf.slice().sort((a: number, b: number) => a - b);
            const p95 = buf.length ? buf[Math.min(buf.length - 1, Math.floor(buf.length * 0.95))] : 0;
            const el = this._lvlStartTs ? ((performance.now() - this._lvlStartTs) / 1000).toFixed(0) : '-';
            liveEl.textContent = this.capacityStatus +
                '\n[实时] fps: ' + (1000 / this.liveFpsEma).toFixed(1) +
                '  帧p95: ' + p95.toFixed(1) + 'ms  已进行: ' + el + 's';
        } else {
            liveEl.textContent =
                '后端: ' + this.adapter.actualBackend + '  地图: ' + mapSt + '\n' +
                '通道: ' + this.adapter.channel + '  变体: ' + (this.adapter.variant || '-') + '\n' +
                '角色: ' + this.adapter.nodeCount() + '  FPS: ' + (1000 / this.liveFpsEma).toFixed(1) + '\n' +
                (dc >= 0 ? 'drawCall: ' + Math.round(dc) : '');
        }
    }
}

// 【运行时自动挂载】场景启动后把本组件挂到 Canvas —— 不依赖场景序列化里的脚本引用
director.once(Director.EVENT_AFTER_SCENE_LAUNCH, () => {
    try {
        const scene = director.getScene();
        if (!scene) return;
        const canvas = scene.getChildByName('Canvas') || (scene.children.length ? scene.children[0] : null);
        if (!canvas) { console.warn('[CocosBench_MC] 场景无 Canvas 节点'); return; }
        if (canvas.getComponent('CocosBench_MC')) return; // 防双重挂载
        canvas.addComponent(CocosBench_MC);
        console.log('[CocosBench_MC] 已自动挂载到', canvas.name);
    } catch (e) {
        console.error('[CocosBench_MC] 自动挂载失败:', e);
    }
});
