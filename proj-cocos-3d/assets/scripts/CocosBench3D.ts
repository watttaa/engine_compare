/**
 * CocosBench3D — Cocos Creator 3.8.8 3D 水族馆适配器
 * 实现 BenchRunner 契约：init / setCount / step / readDrawCalls / nodeCount
 *
 * 与 2D CocosBench.ts 区别：
 *   - 用 MeshRenderer + 3D 鱼模型（resources/models/*.json + textures/*_DM.jpg）
 *   - 仿真用 Boids3DSim（Aquarium Lissajous 椭圆轨迹，sim-core/boids3d-sim.js）
 *   - 每鱼独立动态 mesh（尾巴弯曲顶点动画）
 *
 * 使用：把 sim-core 4 件 + boids3d-sim.js 设为插件脚本；
 *      本文件放入 proj-cocos-3d 的 assets/scripts/，挂到任意节点；
 *      模型/贴图已在 assets/resources/models、assets/resources/textures。
 */
import { _decorator, Component, Node, MeshRenderer, resources, JsonAsset, Mesh, utils,
         ImageAsset, Texture2D, Material, director, Color, EffectAsset, Vec3, Camera, Scene } from 'cc';

declare const Boids3DSim: any;
declare const BenchStats: any;
declare const BenchRunner: any;

const { ccclass } = _decorator;

const FISH_NAMES = ['SmallFishA', 'MediumFishA', 'MediumFishB', 'BigFishA', 'BigFishB'];
// 尾巴弯曲常数（与 boids3d-sim.js 对齐，渲染层专用）
const FISH_LENGTH = 10;
const FISH_WAVE_LENGTH = [1, -2, -2, -1, -0.7];
const FISH_BEND_AMOUNT = [2, 2, 2, 0.5, 0.3];

@ccclass('CocosBench3D')
export class CocosBench3D extends Component {
    private adapter: any = null;
    private stats: any = null;
    private runner: any = null;

    onLoad() {
        // 运行时清理：销毁同节点残留的 FishBench3D（之前自动挂载遗留，会重复 spawn 卡死）
        const olds = this.node.getComponents('FishBench3D') as Component[];
        for (const c of olds) {
            if (c && c.isValid) c.destroy();
        }
        this.setupEnvironment();
        this.adapter = new Cocos3DAdapter(this.node);
        this.stats = new BenchStats();
        this.runner = new BenchRunner(this.adapter, this.stats);
        this.buildHud();
        this.autoDrive();
    }

    /** URL 参数驱动（供 bench 总控 iframe 自动采集）：
     *  ?auto=1&count=N&mode=fixed|ramp
     *  走 exportJSON（内部设 window.__benchLastResult），父页轮询到即结束本轮。 */
    private autoDrive() {
        const q = new URLSearchParams(location.search);
        if (q.get('auto') !== '1' || (window as any).__benchAutoStarted) return;
        (window as any).__benchAutoStarted = 1;
        const mode = q.get('mode') === 'ramp' ? 'ramp' : 'fixed';
        const count = parseInt(q.get('count') || '50', 10);
        this.adapter.ready(() => {
            if (mode === 'ramp') this.runRamp(); else this.runFixed(count);
        });
    }

    // 固定相机 + 背景，框住鱼群（保证每轮测试视野一致，鱼不被视锥裁掉）
    private setupEnvironment() {
        const scene = director.getScene();
        if (!scene) return;
        scene.globals.skybox.enabled = false;

        const camNode = scene.getChildByName('Main Camera');
        if (camNode) {
            const cam = camNode.getComponent(Camera);
            if (cam) {
                cam.clearColor = new Color(0, 0.8 * 255, 255, 255);
                cam.fov = 60;
                cam.near = 1;
                cam.far = 25000;
            }
            camNode.setWorldPosition(0, 30, -130);
            camNode.lookAt(new Vec3(0, 25, 0));
        }
    }

    update(dt: number) {
        const ts = performance.now();
        this.runner.tick(ts);
        this.adapter.step(ts);
    }

    private runFixed(count: number) {
        this.adapter.ready(() => {
            this.runner.fixedRun({
                engine: 'cocos-creator-3.8.8', variant: 'boids3d',
                backend: this.backend(), count,
                bounds: null
            });
            this.outEl.textContent = '运行中…';
        });
    }

    private runRamp() {
        this.adapter.ready(() => {
            this.runner.rampRun({
                engine: 'cocos-creator-3.8.8', variant: 'boids3d',
                backend: this.backend(),
                stepCount: 50, stepMs: 2000, maxCount: 400
            });
            this.outEl.textContent = '阶梯压测中…';
        });
    }

    private backend(): string {
        const dev: any = director.root && director.root.device;
        if (dev && dev.gfxAPI !== undefined) {
            // gfx.API（cocos 3.8）：GLES2=1, GLES3=2, METAL=3, VULKAN=4, NVN=5, WEBGL=6, WEBGL2=7, WEBGPU=8
            return dev.gfxAPI === 8 ? 'webgpu' : 'webgl';
        }
        return (navigator as any).gpu ? 'webgpu' : 'webgl';
    }

    // ---------------- HUD ----------------
    private outEl!: HTMLElement;
    private buildHud() {
        const runner = this.runner;
        const hud = document.createElement('div');
        hud.style.cssText = 'position:fixed;bottom:8px;left:8px;z-index:99999;color:#fff;' +
            'font:12px/1.6 Consolas,monospace;background:rgba(0,0,0,.55);padding:8px 10px;border-radius:4px';
        hud.innerHTML =
            'Cocos-3.8.8 3D水族馆 | ' +
            '<select id="c3v">' +
            '<option value="boids3d">水族馆 3D Boids</option>' +
            '</select>' +
            '<input id="c3cnt" type="number" value="50" step="50" style="width:70px">' +
            '<button id="c3fixed">固定采样</button>' +
            '<button id="c3ramp">阶梯压测</button>' +
            '<button id="c3dir">保存目录</button>' +
            '<div id="c3out">待命中…</div>';
        document.body.appendChild(hud);
        this.outEl = hud.querySelector('#c3out') as HTMLElement;
        const $c = hud.querySelector('#c3cnt') as HTMLInputElement;

        runner.onReport = (json: any) => {
            this.outEl.innerHTML = '完成: ' + JSON.stringify(json).slice(0, 500);
            BenchRunner.exportJSON(json);
        };
        BenchRunner.onSaved = (name: string) => {
            this.outEl.textContent += ' | 已存: ' + name;
        };
        hud.querySelector('#c3dir')!.addEventListener('click', () => BenchRunner.pickSaveDir());
        hud.querySelector('#c3fixed')!.addEventListener('click', () =>
            this.runFixed(parseInt($c.value, 10) || 50));
        hud.querySelector('#c3ramp')!.addEventListener('click', () => this.runRamp());
    }
}

/** 3D 适配器主体 */
class Cocos3DAdapter {
    private sim: any = null;
    private nodes: Node[] = [];
    private meshes: Mesh[] = [];
    private basePos: Float32Array[] = [];   // 每鱼原始顶点（变形基准）
    private indices16: Uint16Array[] = [];
    private vertCount: number[] = [];
    private lastTick = 0;

    // 共享资源（5 鱼种模型数据 + 材质 + 贴图）
    private modelData: any[] = [];
    private materials: (Material | null)[] = [];
    private effect: EffectAsset | null = null;
    private _readyCbs: (() => void)[] = [];
    private _loading = false;

    constructor(private root: Node) { }

    /** 资源就绪后回调（并发去重） */
    ready(cb: () => void) {
        if (this.effect && this.modelData.length >= 5) { cb(); return; }
        this._readyCbs.push(cb);
        if (this._loading) return;
        this._loading = true;
        this.loadResources();
    }

    private async loadResources() {
        // 自定义 fish effect（Blinn-Phong），失败回退 unlit
        this.effect = await this.loadEffect();
        for (const name of FISH_NAMES) {
            const data = await this.loadJson(`models/${name}`);
            this.modelData.push(data);
            this.materials.push(await this.buildMaterial(name, data));
        }
        this._loading = false;
        const cbs = this._readyCbs.splice(0);
        cbs.forEach((c) => c());
    }

    private loadJson(path: string): Promise<any> {
        return new Promise((resolve) => {
            resources.load(path, JsonAsset, (err, asset) => {
                resolve(err ? null : (asset as JsonAsset).json);
            });
        });
    }

    private loadTexture(path: string): Promise<Texture2D | null> {
        return new Promise((resolve) => {
            resources.load(`textures/${path}/texture`, Texture2D, (err, tex) => {
                if (!err && tex) { resolve(tex as Texture2D); return; }
                resources.load(`textures/${path}`, ImageAsset, (e2, img) => {
                    if (!e2 && img) {
                        const t = new Texture2D();
                        t.image = img as ImageAsset;
                        resolve(t);
                        return;
                    }
                    resolve(null);
                });
            });
        });
    }

    private loadEffect(): Promise<EffectAsset | null> {
        return new Promise((resolve) => {
            resources.load('effects/fish', EffectAsset, (err, eff) => {
                resolve(err ? null : (eff as EffectAsset));
            });
        });
    }

    private async buildMaterial(name: string, data: any): Promise<Material | null> {
        if (!data) return null;
        const textures = data.models[0].textures || {};
        const mat = new Material();
        if (this.effect) {
            mat.initialize({ effectAsset: this.effect });
        } else {
            mat.initialize({ effectName: 'builtin-unlit', defines: { USE_TEXTURE: true } });
        }
        mat.setProperty('mainColor', Color.WHITE);
        if (textures.diffuse) {
            const base = textures.diffuse.replace(/\.(jpg|png)$/, '');
            const tex = await this.loadTexture(base);
            if (tex) mat.setProperty('mainTexture', tex);
        }
        if (textures.normalMap && this.effect) {
            const base = textures.normalMap.replace(/\.(png|jpg)$/, '');
            const nm = await this.loadTexture(base);
            if (nm) mat.setProperty('normalMap', nm);
        }
        return mat;
    }

    // ---- BenchRunner 契约 ----
    init(variant: string, bounds: any) {
        this.clearAll();
        this.sim = new Boids3DSim();
    }

    clearAll() {
        for (const n of this.nodes) n.destroy();
        this.nodes.length = 0;
        this.meshes.length = 0;
        this.basePos.length = 0;
        this.indices16.length = 0;
        this.vertCount.length = 0;
    }

    setCount(n: number) {
        const cur = this.nodes.length;
        if (n > cur) {
            this.sim.add(n - cur);
            for (let i = cur; i < n; i++) this.makeFish(this.sim.list[i]);
        } else if (n < cur) {
            this.sim.remove(cur - n);
            for (let j = cur - 1; j >= n; j--) {
                this.nodes[j].destroy();
                this.nodes.pop();
                this.meshes.pop();
                this.basePos.pop();
                this.indices16.pop();
                this.vertCount.pop();
            }
        }
    }

    private makeFish(f: any) {
        const species = f.species % 5;
        const data = this.modelData[species];
        const mat = this.materials[species];
        if (!data || !mat) {
            // 兜底：空节点
            const n = new Node('fish');
            this.root.addChild(n);
            this.nodes.push(n);
            this.meshes.push(null as any);
            this.basePos.push(new Float32Array(0));
            this.indices16.push(new Uint16Array(0));
            this.vertCount.push(0);
            return;
        }
        const model = data.models[0];
        const fld = model.fields;
        const pos = fld.position.data;
        const nor = fld.normal.data;
        const uv = fld.texCoord.data;
        const tan = fld.tangent ? fld.tangent.data : null;
        const idx = fld.indices.data;
        const vc = pos.length / 3;

        const positions = new Float32Array(pos);
        const normals = new Float32Array(nor);
        const uvs = new Float32Array(uv);
        const tangents = tan ? new Float32Array(vc * 4) : null;
        if (tangents) {
            for (let i = 0; i < vc; i++) {
                tangents[i * 4] = tan[i * 3];
                tangents[i * 4 + 1] = tan[i * 3 + 1];
                tangents[i * 4 + 2] = tan[i * 3 + 2];
                tangents[i * 4 + 3] = 1;
            }
        }
        const indices = new Uint16Array(idx.length);
        for (let i = 0; i < idx.length; i++) indices[i] = idx[i];

        const geom: any = {
            positions, normals, uvs, indices16: indices,
            minPos: { x: -5, y: -3, z: -10 },
            maxPos: { x: 5, y: 3, z: 10 },
        };
        if (tangents) geom.tangents = tangents;
        const mesh = utils.MeshUtils.createDynamicMesh(0, geom, undefined, {
            maxSubMeshes: 1, maxSubMeshVertices: vc, maxSubMeshIndices: idx.length,
        });

        const n = new Node('fish');
        n.layer = 1 << 30;
        const r = n.addComponent(MeshRenderer);
        r.mesh = mesh;
        r.material = mat;
        this.root.addChild(n);

        this.nodes.push(n);
        this.meshes.push(mesh);
        this.basePos.push(positions);
        this.indices16.push(indices);
        this.vertCount.push(vc);
    }

    step(ts: number) {
        const dt = this.lastTick ? Math.min(ts - this.lastTick, 100) : 16.7;
        this.lastTick = ts;
        if (!this.sim) return;
        this.sim.update(dt / 1000);

        const list = this.sim.list, nodes = this.nodes;
        const len = Math.min(list.length, nodes.length);
        for (let i = 0; i < len; i++) {
            const f = list[i];
            const n = nodes[i];
            if (!n) continue;
            n.setWorldPosition(f.x, f.y, f.z);
            // 鱼头朝前进方向：绕 Y 轴 angleY（模型 +z 朝 -? 由 angleY 校正）
            n.setWorldRotationFromEuler(0, f.angleY * 57.29577951 + 90, 0);

            // 尾巴弯曲（CPU 顶点变形）
            const mesh = this.meshes[i];
            const vc = this.vertCount[i];
            if (!mesh || !vc) continue;
            const base = this.basePos[i];
            const out = new Float32Array(vc * 3);
            for (let v = 0; v < vc; v++) {
                const z = base[v * 3 + 2];
                const species = f.species % 5;
                const wave = FISH_WAVE_LENGTH[species];
                const bend = FISH_BEND_AMOUNT[species];
                const mult = z > 0 ? z / FISH_LENGTH : (-z / FISH_LENGTH) * 2;
                const offset = mult * mult * Math.sin(f.tailTime + mult * wave) * bend;
                out[v * 3] = base[v * 3] + offset;
                out[v * 3 + 1] = base[v * 3 + 1];
                out[v * 3 + 2] = base[v * 3 + 2];
            }
            mesh.updateSubMesh(0, { positions: out, indices16: this.indices16[i] });
        }
    }

    readDrawCalls(): number {
        const dev: any = director.root && director.root.device;
        return dev ? dev.numDrawCalls : -1;
    }

    nodeCount(): number { return this.nodes.length; }
}
