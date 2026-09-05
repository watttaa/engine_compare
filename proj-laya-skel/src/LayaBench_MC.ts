/**
 * LayaBench_MC — LayaAir 3.4 预烘焙骨骼动画基准（对齐 Egret 参照实现 M2 语义）
 *
 * 语义对齐清单（参照 bench/web/dist/egret-mc/main.js）：
 *  1. 三层 body/head/weapon 帧动画（每角色 3 个显示对象，层级顺序一致）
 *  2. MC JSON 帧数据（labels 1-based 闭区间、frames[].{res,x,y}、res 区域表）逐帧切图
 *  3. 方向语义：resDirOf(dir)>1 → animate2，否则 animate0；flipOf(dir) 1/3 → scaleX=-1
 *  4. 地图 1001 十二切片背景（行列偏移与 Egret 完全一致）+ A* 随机行走（同一 mc-sim/pathfinding）
 *  5. 承载力压测走 bench-runner.capacityRamp（同档位同判定 p95≤20/p99≤35）
 *  6. 自动双后端走 sim-core/mc-compare.js 跨页状态机（WebGL 臂 → WebGPU 臂 → 汇总提升倍数）
 *  7. HUD：默认进场景 10 角色，只留 固定采样 / 自动双后端 / 复制结果 / 中止 / 返回
 *
 * 引擎无关层（src/sim/*.ts 编译后全局暴露）：BenchStats / BenchRunner / MCSim / PF / MCCompare
 * 资源（assets/resources/mc/…）：Laya.loader 运行时 URL = resources/mc/…
 */
const MC_ROOT = 'resources/mc/';
const MAP_ROOT = 'resources/mc/map/1001/';
const LAYERS = ['body', 'head', 'weapon'];
const WEAPON_BY_CHAR: Record<string, string> = {
    '1001': '10001', '1002': '11001', '1003': '12001', '1004': '13001',
    '1005': '14001', '1006': '15001', '1007': '16001', '1008': '17001'
};

// 地图拼合（与 Egret 参照实现逐常量一致）
const MAP_FULL_W = 1080, MAP_FULL_H = 1880;   // = MCSim.MAP_W_PX / MAP_H_PX
const STAGE_W = 1280, STAGE_H = 720;
const MAP_SCALE = Math.min(STAGE_W / MAP_FULL_W, STAGE_H / MAP_FULL_H);
const MAP_OFFSET_X = (STAGE_W - MAP_FULL_W * MAP_SCALE) / 2;
const MAP_OFFSET_Y = (STAGE_H - MAP_FULL_H * MAP_SCALE) / 2;
const TILE_COL_WIDTHS = [512, 512, 56];
const TILE_ROW_HEIGHTS = [512, 512, 512, 344];
const TILE_ROWS = 4, TILE_COLS = 3;

const G: any = (typeof globalThis !== 'undefined' ? globalThis : window) as any;

// -------- 工具（与 Egret 参照实现同款 XHR 路径） --------
function xhr(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const r = new XMLHttpRequest();
        r.open('GET', url);
        r.onload = () => resolve(r.responseText);
        r.onerror = () => reject(new Error('XHR: ' + url));
        r.send();
    });
}
function xhrBin(url: string): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
        const r = new XMLHttpRequest();
        r.open('GET', url);
        r.responseType = 'arraybuffer';
        r.onload = () => resolve(r.response as ArrayBuffer);
        r.onerror = () => reject(new Error('XHR bin: ' + url));
        r.send();
    });
}

// -------- MC 帧资源：JSON + 整图 Texture + 子纹理缓存 --------
class McRes {
    frameRate: number;
    labels: any[];
    frames: any[];
    resMap: any;
    tex: any;                       // Laya.Texture（整图）
    private _sub: Record<string, any> = {};

    constructor(json: any, tex: any) {
        const a = json.mc.animate;
        this.frameRate = a.frameRate || 8;
        this.labels = a.labels;
        this.frames = a.frames;
        this.resMap = json.res;
        this.tex = tex;
    }
    /** res 区域 → 子纹理（缓存复用；同整图的 drawTexture 走引擎原生合批） */
    sub(resKey: string): any {
        if (!this._sub[resKey]) {
            const r = this.resMap[resKey];
            if (!r) return null;
            this._sub[resKey] = G.Laya.Texture.createFromTexture(this.tex, r.x, r.y, r.w, r.h);
        }
        return this._sub[resKey];
    }
}

// -------- 资源加载（缓存策略与 Egret _resCache/loadLayer/loadChar 一致） --------
const _resCache: Record<string, Promise<McRes>> = {};
function loadTex(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
        G.Laya.loader.load(url, G.Laya.Handler.create(null, () => {
            const t = G.Laya.loader.getRes(url);
            if (t) resolve(t); else reject(new Error('Tex: ' + url));
        }));
    });
}
function loadLayer(layer: string, modelId: string, direction: number): Promise<McRes> {
    // body 有向上资源 animate2（游戏同源 legacy），head/weapon 只有 animate0（镜像补齐）
    const suffix = direction === 2 && layer === 'body' ? 'animate2' : 'animate0';
    const base = MC_ROOT + layer + '/' + modelId + '/' + suffix;
    if (_resCache[base]) return _resCache[base];
    _resCache[base] = Promise.all([xhr(base + '.json'), loadTex(base + '.png')])
        .then(r => new McRes(JSON.parse(r[0]), r[1]));
    return _resCache[base];
}
function loadChar(charId: string): Promise<{ data0: McRes[]; data2: McRes[] }> {
    const key = 'char:' + charId;
    if (_resCache[key]) return _resCache[key] as any;
    const weaponId = WEAPON_BY_CHAR[charId];
    _resCache[key] = Promise.all([
        loadLayer('body', charId, 0), loadLayer('head', charId, 0), loadLayer('weapon', weaponId, 0),
        loadLayer('body', charId, 2), loadLayer('head', charId, 2), loadLayer('weapon', weaponId, 2)
    ]).then(layers => ({ data0: layers.slice(0, 3), data2: layers.slice(3, 6) })) as any;
    return _resCache[key] as any;
}

// -------- 帧播放器：labels 1-based 闭区间循环，帧率推进语义同 egret.MovieClip --------
class McPlayer {
    private res: McRes;
    private sp: any;               // Laya.Sprite
    private labelIdx = 0;
    private cur = 1;               // 1-based 帧号
    private elapsed = 0;

    constructor(res: McRes, sp: any) {
        this.res = res; this.sp = sp;
    }
    /** 换向切换资源组（body0/2）后需重新 play 当前动画 */
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
        const sub = this.res.sub(f.res);
        if (!sub) return;
        // 帧偏移 (f.x, f.y)：与 egret MovieClip offsetPoint 语义一致（锚点 = 角色 (x,y)）
        this.sp.graphics.clear();
        this.sp.graphics.drawTexture(sub, f.x, f.y);
    }
}

// -------- 适配器（BenchRunner 契约：init / setCount / step / readDrawCalls / nodeCount / isReady） --------
class LayaMCAdapter {
    sim: any = null;
    nodes: any[] = [];
    channel = 'generic';
    variant = 'M2';
    root: any = null;
    characterRoot: any = null;
    actualBackend = 'unknown';
    _resolvedBackend: string | undefined;
    private _mapCont: any = null;
    private _loadEpoch = 0;
    private _pendingLoads = 0;
    private _lastTick = 0;

    constructor(stage: any) {
        const Laya = G.Laya;
        // 地图容器：背景+角色整体缩放进 1280×720（与 Egret 参照实现同常量）
        const cont = new Laya.Sprite();
        cont.scale(MAP_SCALE, MAP_SCALE);
        cont.pos(MAP_OFFSET_X, MAP_OFFSET_Y);
        stage.addChild(cont);
        this._mapCont = cont;
        this.root = cont;
        this.characterRoot = new Laya.Sprite();
        cont.addChild(this.characterRoot);
    }

    init(_variant?: string) {
        this._loadEpoch++;
        this._clearAll();
        this.variant = 'M2';
        this.sim = new G.MCSim('M2', G.MCSim.MAP_W_PX, G.MCSim.MAP_H_PX);
    }

    setChannel(channel: string) {
        // Laya 无实例化通道；仅 WebGL/WebGPU 引擎原生路径。保留字段对齐结果 JSON 结构。
        this.channel = channel === 'instanced' ? 'instanced' : 'generic';
        if (this.channel === 'instanced') this.channel = 'generic';
    }

    private _clearAll() {
        for (let i = 0; i < this.nodes.length; i++) {
            const n = this.nodes[i];
            if (n && n.cont) n.cont.removeSelf();
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
                const cont = new G.Laya.Sprite();
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
                        const sp = new G.Laya.Sprite();
                        cont.addChild(sp);
                        const p = new McPlayer(data[li], sp);
                        p.play(entry.animName);
                        node.players.push(p);
                    }
                    node.loaded = true;
                }).catch((e: any) => {
                    self._pendingLoads--;
                    console.warn('[mc-laya] load fail:', e);
                });
            }
        } else if (n < cur) {
            this.sim.remove(cur - n);
            for (let j = cur - 1; j >= n; j--) {
                if (this.nodes[j] && this.nodes[j].cont) this.nodes[j].cont.removeSelf();
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
                node.cont.scaleX = flipX;
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
        // 每帧：位置同步 + 帧动画推进（ egret MovieClip 由引擎时钟逐帧推进，此处同 dt）
        const list = this.sim.list;
        for (let i = 0; i < this.nodes.length; i++) {
            const nd = this.nodes[i];
            if (!nd || !nd.loaded || !list[i]) continue;
            nd.cont.pos(list[i].x, list[i].y);
            for (let mi = 0; mi < nd.players.length; mi++) nd.players[mi].tick(dt);
        }
    }

    readDrawCalls(): number {
        const L = G.Laya;
        const statAgent = (G.LayaGL && G.LayaGL.statAgent) || (L && L.LayaGL && L.LayaGL.statAgent);
        const statEl = G.StatElement || (L && L.StatElement);
        if (statAgent && statEl) {
            const v = statAgent.getElementData(statEl.CT_2DDrawCall);
            return typeof v === 'number' ? v : -1;
        }
        return -1;
    }

    readBenchMetrics(): any {
        return {
            actualBackend: this._resolvedBackend || this.actualBackend,
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

// -------- 入口 --------
export class LayaBench_MC {
    private static liveEl: HTMLElement | null = null;
    private static $c: HTMLInputElement | null = null;
    private static capacityRunning = false;
    private static lastResult: any = null;
    private static capacityStatus = '';
    private static _lvlStartTs = 0;
    private static _hudFrameBuf: number[] = [];

    static start(): void {
        const Laya = G.Laya;

        // 【公平性】固定舞台逻辑尺寸 1280×720，三引擎统一；关抗锯齿
        Laya.stage.setScreenSize(STAGE_W, STAGE_H);
        Laya.stage.scaleMode = Laya.stage.SCALE_NOSCALE;
        if (G.Laya && G.Laya.Config) G.Laya.Config.isAntialias = false;

        const adapter = new LayaMCAdapter(Laya.stage);
        const stats = new G.BenchStats();
        const runner = new G.BenchRunner(adapter, stats);

        const requested = new URLSearchParams(location.search).get('backend') || 'webgl';

        // 地图背景（十二切片）+ A* 寻路位图（与 Egret 同资源同拼合）
        LayaBench_MC.buildBackground();
        xhrBin(MAP_ROOT + '1001.map').then((ab: ArrayBuffer) => {
            G.MCSim.initPathfinder(new Uint8Array(ab));
        }).catch((e: any) => console.warn('[mc-laya] 地图位图加载失败（寻路降级随机游走）:', e));

        LayaBench_MC.buildHud(Laya, runner, adapter, requested);

        // 帧循环：与 egret/cocos 适配器保持同一相对位置；后端检测用主画布 webgpu 上下文权威判定
        let _lastTs2 = 0, _fpsBuf = 16.7, _lastLive = 0;
        const origTick = runner.tick.bind(runner);
        runner.tick = (ts: number) => {
            origTick(ts);
            if (_lastTs2) {
                const ft = Math.min(ts - _lastTs2, 100);
                _fpsBuf = _fpsBuf * 0.9 + ft * 0.1;
                LayaBench_MC._hudFrameBuf.push(ft);
                if (LayaBench_MC._hudFrameBuf.length > 240) LayaBench_MC._hudFrameBuf.shift();
            }
            _lastTs2 = ts;
            if (adapter._resolvedBackend === undefined) {
                const canvases = Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[];
                let main: HTMLCanvasElement | null = null;
                for (const c of canvases) {
                    if (!main || (c.width * c.height) > (main.width * main.height)) main = c;
                }
                if (main && main.width > 0) {
                    let detected: string;
                    try {
                        detected = (main.getContext('webgpu') !== null) ? 'webgpu' : 'webgl';
                    } catch (_) { detected = 'webgl'; }
                    adapter._resolvedBackend = detected;
                    adapter.actualBackend = detected;
                }
            }
            if (ts - _lastLive > 400) {
                _lastLive = ts;
                LayaBench_MC.updateLive(adapter, _fpsBuf);
            }
        };

        // 自动测试 / 自动双后端入口
        const q = new URLSearchParams(location.search);
        if (q.get('autoCompare')) {
            setTimeout(() => LayaBench_MC.runCapacity(runner, adapter, requested), 0);
        } else if (q.get('auto') === '1') {
            const n = parseInt(q.get('count') || '50', 10) || 50;
            if (LayaBench_MC.$c) LayaBench_MC.$c.value = String(n);
            LayaBench_MC.runFixed(runner, adapter, requested);
        } else {
            // 默认进入：场景 + 10 个角色（只看不测）
            adapter.init('M2');
            adapter.setCount(10);
        }
    }

    private static buildBackground() {
        const Laya = G.Laya;
        const urls: string[] = [];
        for (let row = 0; row < TILE_ROWS; row++) {
            for (let col = 0; col < TILE_COLS; col++) urls.push(MAP_ROOT + row + '_' + col + '.jpg');
        }
        const adapterCont = LayaBench_MC._mapContHolder;
        Laya.loader.load(urls, Laya.Handler.create(null, () => {
            const holder = adapterCont || (window as any).__mcMapCont;
            if (!holder) return;
            let y = 0;
            for (let row = 0; row < TILE_ROWS; row++) {
                let x = 0;
                for (let col = 0; col < TILE_COLS; col++) {
                    const tex = Laya.loader.getRes(MAP_ROOT + row + '_' + col + '.jpg');
                    if (tex) {
                        const sp = new Laya.Sprite();
                        sp.graphics.drawTexture(tex, x, y);
                        holder.addChildAt(sp, 0);   // 背景垫底（角色在 characterRoot 之上）
                    }
                    x += TILE_COL_WIDTHS[col];
                }
                y += TILE_ROW_HEIGHTS[row];
            }
        }));
    }
    private static _mapContHolder: any = null;

    // ---------------- HUD ----------------
    private static buildHud(Laya: any, runner: any, adapter: LayaMCAdapter, requested: string) {
        LayaBench_MC._mapContHolder = adapter.root;
        const hud = document.createElement('div');
        hud.id = 'hud';
        hud.innerHTML =
            '<h3>⚔️ LayaAir 3.4 · 大话西游战斗场景 [' + requested + ']</h3>' +
            '<div class="row"><button id="lmback">← 返回场景列表</button></div>' +
            '<div class="row"><span class="lbl">场景</span><span>8职业混编 · A* 随机行走</span></div>' +
            '<div class="row"><span class="lbl">数量</span>' +
            '<input id="lmcnt" type="number" value="10" step="10">' +
            '<button id="lmfixed" class="primary">固定采样</button>' +
            '<button id="lmcompare" class="primary">⚖ 自动双后端</button>' +
            '<button id="lmcopy" disabled>复制结果</button>' +
            '<button id="lmstop" disabled>中止</button></div>' +
            '<div class="live" id="lmlive">加载地图中…</div>';
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

        const liveEl = hud.querySelector('#lmlive') as HTMLElement;
        LayaBench_MC.liveEl = liveEl;
        LayaBench_MC.$c = hud.querySelector('#lmcnt') as HTMLInputElement;
        const copyBtn = hud.querySelector('#lmcopy') as HTMLButtonElement;
        const stopBtn = hud.querySelector('#lmstop') as HTMLButtonElement;
        const compareBtn = hud.querySelector('#lmcompare') as HTMLButtonElement;

        function setCapacityRunning(running: boolean) {
            LayaBench_MC.capacityRunning = running;
            compareBtn.disabled = running;
            stopBtn.disabled = !running;
            (hud.querySelector('#lmfixed') as HTMLButtonElement).disabled = running;
            if (LayaBench_MC.$c) LayaBench_MC.$c.disabled = running;
        }

        // 自动双后端：跨页状态机在 sim-core/mc-compare.js（引擎无关，三引擎同款）
        const mcCompare = new G.MCCompare({
            engine: 'layaair-3.4.0',
            webglPage: '/laya-mc-webgl/index.html',
            webgpuPage: '/laya-mc/index.html',
            webglQuery: 'scene=mc',
            webgpuQuery: 'scene=mc',
            onProgress: (msg: string) => { liveEl.textContent = msg; },
            onDone: (result: any) => {
                LayaBench_MC.lastResult = result;
                copyBtn.disabled = false;
                const webgl = result.webgl, webgpu = result.webgpu;
                const lift = webgl.maxStableCount > 0 ? (webgpu.maxStableCount / webgl.maxStableCount).toFixed(2) : '?';
                liveEl.textContent = '双后端对比完成\nWebGL: ' + webgl.maxStableCount + ' 人  首失败: ' + webgl.firstFailCount +
                    '\nWebGPU: ' + webgpu.maxStableCount + ' 人  首失败: ' + webgpu.firstFailCount +
                    '\n承载力提升: ' + (lift === '?' ? '无法计算' : lift + ' 倍') +
                    '\n结果已导出，可点击复制结果';
                G.BenchRunner.exportJSON(result);
            }
        });

        runner.onReport = (json: any) => {
            LayaBench_MC.lastResult = json;
            copyBtn.disabled = false;
            liveEl.textContent = '完成: fps=' + json.fps + ' p50=' + json.p50 + 'ms p95=' + json.p95 + 'ms dc=' + json.drawCallAvg;
            G.BenchRunner.exportJSON(json);
        };

        hud.querySelector('#lmback').addEventListener('click', () => {
            if (LayaBench_MC.capacityRunning) runner.stopCapacityRamp();
            (window.parent !== window) ? window.parent.history.back() : window.history.back();
        });
        copyBtn.addEventListener('click', () => {
            if (!LayaBench_MC.lastResult) return;
            const text = JSON.stringify(LayaBench_MC.lastResult, null, 2);
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
        hud.querySelector('#lmfixed').addEventListener('click', () => LayaBench_MC.runFixed(runner, adapter, requested));
        compareBtn.addEventListener('click', () => { if (!LayaBench_MC.capacityRunning) mcCompare.start(); });
        stopBtn.addEventListener('click', () => { runner.stopCapacityRamp(); });

        (window as any).__lmSetCapacityRunning = setCapacityRunning;
        (window as any).__lmMcCompare = mcCompare;
    }

    private static runFixed(runner: any, adapter: LayaMCAdapter, requested: string) {
        const n = parseInt((LayaBench_MC.$c ? LayaBench_MC.$c.value : '10'), 10) || 10;
        adapter.init('M2');
        adapter.setCount(n);
        runner.fixedRun({
            engine: 'layaair-3.4.0', variant: 'M2',
            backend: adapter._resolvedBackend || requested,
            channel: adapter.channel, count: n
        });
    }

    private static runCapacity(runner: any, adapter: LayaMCAdapter, requested: string) {
        const v = 'M2';
        const capacityCounts = new URLSearchParams(location.search).get('capacityCounts');
        const counts = capacityCounts ? capacityCounts.split(',').map(Number).filter((n: number) => n > 0) : null;
        const setRunning = (window as any).__lmSetCapacityRunning as (b: boolean) => void;
        setRunning(true);
        LayaBench_MC.capacityStatus = '承载力压测准备中\n变体: ' + v + '\n粗测: ' + (counts ? counts.join(' → ') : '20 → 40 → 80 → 160 → 320 → 640 → 1280 → 2560 → 5120 → 10240 → 20480');
        LayaBench_MC.liveEl!.textContent = LayaBench_MC.capacityStatus;
        runner.capacityRamp({
            counts: counts || undefined,
            engine: 'layaair-3.4.0', variant: v,
            backend: adapter._resolvedBackend || requested,
            channel: adapter.channel,
            onLevel: (info: any) => {
                if (info.phase === 'start') {
                    if (LayaBench_MC.$c) LayaBench_MC.$c.value = String(info.count);
                    LayaBench_MC._lvlStartTs = performance.now();
                    LayaBench_MC.capacityStatus = '承载力压测\n变体: ' + v + '  阶段: ' + (info.stage === 'coarse' ? '倍增粗测' : '临界补测') +
                        '\n当前档位: ' + info.count + ' 角色\n状态: 预热 ' + (info.preWarmSec || 3) + 's + 采样 ' + (info.sampleSec || 10) + 's';
                    LayaBench_MC.liveEl!.textContent = LayaBench_MC.capacityStatus;
                } else if (info.phase === 'invalid') {
                    LayaBench_MC.capacityStatus = '承载力压测\n档位: ' + info.count + ' 角色\n状态: 页面曾在后台，采样无效；回到前台后自动重测';
                    LayaBench_MC.liveEl!.textContent = LayaBench_MC.capacityStatus;
                } else {
                    const stableWhy = (j: any) => {
                        const r: string[] = [];
                        if (!(j.p95 <= 20)) r.push('p95 ' + j.p95 + '>20ms');
                        if (!(j.p99 <= 35)) r.push('p99 ' + j.p99 + '>35ms');
                        return r.join(' · ');
                    };
                    LayaBench_MC.capacityStatus = '承载力压测\n档位: ' + info.count + ' 角色  ' + (info.stable ? '✅ 稳定' : '❌ 不稳定（' + (stableWhy(info.json) || '采样帧不足') + '）') +
                        '\nfps: ' + info.json.fps +
                        '\np95: ' + info.json.p95 + 'ms  p99: ' + info.json.p99 + 'ms  超预算: ' + info.json.overBudgetPct + '%';
                    LayaBench_MC.liveEl!.textContent = LayaBench_MC.capacityStatus;
                }
            },
            onDone: (summary: any) => {
                setRunning(false);
                const json = {
                    meta: {
                        engine: 'layaair-3.4.0', variant: v,
                        backend: adapter._resolvedBackend || requested,
                        channel: adapter.channel, mode: 'capacity-ramp'
                    },
                    maxStableCount: summary.cap,
                    firstFailCount: summary.firstFail,
                    cancelled: summary.cancelled,
                    capped: summary.capped,
                    results: summary.results.map((r: any) => ({ count: r.count, stable: r.stable, result: r.json }))
                };
                LayaBench_MC.lastResult = json;
                const copyBtn = document.querySelector('#lmcopy') as HTMLButtonElement;
                if (copyBtn) copyBtn.disabled = false;
                LayaBench_MC.liveEl!.textContent = summary.cancelled
                    ? '承载力压测已中止\n已完成档位: ' + summary.results.length
                    : '承载力压测完成\n最大稳定承载力: ' + summary.cap + ' 角色' +
                      '\n首次失败档: ' + (summary.firstFail == null ? '无（已到上限）' : summary.firstFail) +
                      '\n已完成档位: ' + summary.results.length;
                G.BenchRunner.exportJSON(json);
                const mcCompare = (window as any).__lmMcCompare;
                if (mcCompare) mcCompare.continueAfterArm(json);
            }
        });
    }

    private static updateLive(adapter: LayaMCAdapter, fpsBuf: number) {
        const liveEl = LayaBench_MC.liveEl;
        if (!liveEl) return;
        const dc = adapter.readDrawCalls();
        const mapSt = G.MCSim.isMapLoaded() ? '✅' : '⏳';
        if (LayaBench_MC.capacityRunning) {
            const buf = LayaBench_MC._hudFrameBuf.slice().sort((a: number, b: number) => a - b);
            const p95 = buf.length ? buf[Math.min(buf.length - 1, Math.floor(buf.length * 0.95))] : 0;
            const el = LayaBench_MC._lvlStartTs ? ((performance.now() - LayaBench_MC._lvlStartTs) / 1000).toFixed(0) : '-';
            liveEl.textContent = LayaBench_MC.capacityStatus +
                '\n[实时] fps: ' + (1000 / fpsBuf).toFixed(1) +
                '  帧p95: ' + p95.toFixed(1) + 'ms  已进行: ' + el + 's';
        } else {
            liveEl.textContent =
                '后端: ' + (adapter._resolvedBackend || '-') + '  地图: ' + mapSt + '\n' +
                '通道: ' + adapter.channel + '  变体: ' + (adapter.variant || '-') + '\n' +
                '角色: ' + adapter.nodeCount() + '  FPS: ' + (1000 / fpsBuf).toFixed(1) + '\n' +
                (dc >= 0 ? 'drawCall: ' + Math.round(dc) : '');
        }
    }
}
