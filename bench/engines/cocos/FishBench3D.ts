/**
 * FishBench3D — Cocos Creator 3.8 3D 鱼群基准
 *
 * 移植自 Khronos webglsamples Aquarium：
 *   - 5 种鱼（SmallFishA / MediumFishA / MediumFishB / BigFishA / BigFishB）
 *   - 椭圆轨迹：x=sin(xClock)*xRadius, y=sin(yClock)*yRadius+height, z=cos(zClock)*zRadius
 *   - lookAt(nextPosition) 朝向游动方向
 *   - 尾巴弯曲：offset = mult^2 * sin(time + mult*waveLength) * bendAmount（CPU 顶点变形）
 *
 * 资源：resources/models/*.json + resources/textures/*_DM.jpg
 */
import { _decorator, Component, Node, MeshRenderer, resources, JsonAsset, Mesh, utils,
         ImageAsset, Texture2D, Material, director, Director, Scene, Color, Vec3, Camera, EffectAsset,
         Mat3, Quat } from 'cc';
const { ccclass, property } = _decorator;

interface FishDef {
    name: string;
    speed: number;
    speedRange: number;
    radius: number;
    radiusRange: number;
    tailSpeed: number;
    heightOffset: number;
    heightRange: number;
    fishLength: number;
    fishWaveLength: number;
    fishBendAmount: number;
    scale: number;      // 模型尺度
    count: number;      // 本种鱼数量
}

interface FishInstance {
    def: FishDef;
    node: Node;
    mesh: Mesh;
    positions: Float32Array;   // 原始顶点（变形基准）
    workPos: Float32Array;     // 预分配工作缓冲（避免每帧 new）
    indices16: Uint16Array;
    vertCount: number;
    phaseIdx: number;          // 本种内序号（相位错开）
    speed: number;
    xRadius: number;
    yRadius: number;
    zRadius: number;
    height: number;
    scale: number;
}

@ccclass('FishBench3D')
export class FishBench3D extends Component {

    @property
    public fishCount: number = 50;

    private _fish: FishInstance[] = [];
    private _pos = new Vec3();
    private _next = new Vec3();
    private _up = new Vec3(0, 1, 0);
    private _clock = 0;          // 全局时钟（秒，模拟原版 clock）
    private _camNode: Node | null = null;
    private _lightNode: Node | null = null;
    private _eyeClock = 0;
    private _eyePos = new Vec3();
    private _targetPos = new Vec3();
    private _effect: EffectAsset | null = null;
    // 原版 g.fish 全局参数
    private readonly _fishSpeed = 0.124;
    private readonly _fishOffset = 0.52;
    private readonly _fishHeight = 25;
    private readonly _fishHeightRange = 1;
    private readonly _fishXClock = 1;
    private readonly _fishYClock = 0.556;
    private readonly _fishZClock = 1;
    private readonly _fishTailSpeed = 1;

    onLoad() {
        // bench 模式下不自动加载（避免与 CocosBench3D 重复加载场景 props + 鱼，导致卡死）
        if (this.node.getComponent('CocosBench3D')) return;
        this.setupEnvironment();  // 并行加载天空盒
        this.start();             // 并行加载鱼群
    }

    // 背景：内景场景 + 蓝绿水雾 + 环境光 + 相机
    private async setupEnvironment() {
        const scene = director.getScene();
        if (!scene) return;

        // 不用天空盒（外景），只留内景，背景用相机 clearColor
        scene.globals.skybox.enabled = false;

        // 雾：蓝绿水色（照原版 fogRed 0.54 / fogGreen 0.86 / fogBlue 1.0）
        const fog = scene.globals.fog;
        fog.enabled = true;
        fog.type = 2; // FogType.EXP_SQUARED（近似原版雾衰减）
        fog.fogColor = new Color(0.54 * 255, 0.86 * 255, 1.0 * 255, 255);
        fog.fogDensity = 0.006;

        // 环境光偏蓝（照原版 ambient）
        const ambient = scene.globals.ambient;
        ambient.skyLightingColor = new Color(0.22 * 255, 0.25 * 255, 0.39 * 255, 255);

        // 相机：天蓝背景，Inside 视角（相机在鱼群中心附近，鱼环绕四周）
        const camNode = scene.getChildByName('Main Camera');
        if (camNode) {
            this._camNode = camNode;
            const cam = camNode.getComponent(Camera);
            if (cam) {
                cam.clearColor = new Color(0, 0.8 * 255, 255, 255);
                cam.fov = 82.7;
                cam.near = 1;
                cam.far = 25000;
            }
        }
        this._lightNode = scene.getChildByName('Main Light');
    }

    async start() {
        this._effect = await this.loadEffect();
        await this.loadSceneProps();          // 先摆内景场景
        const defs = this.buildDefs();
        for (const def of defs) {
            for (let i = 0; i < def.count; i++) {
                await this.spawnFish(def, i);
            }
        }
        console.log(`[FishBench3D] 鱼群就绪: ${this._fish.length} 条`);
    }

    private loadEffect(): Promise<EffectAsset | null> {
        return new Promise((resolve) => {
            resources.load('effects/fish', EffectAsset, (err, eff) => {
                if (!err && eff) { resolve(eff as EffectAsset); return; }
                // 回退内置 unlit
                console.warn('自定义 fish.effect 加载失败，回退 builtin-unlit', err);
                resolve(null);
            });
        });
    }

    // 内景场景：珊瑚岩石沉船地板玻璃缸，摆放数据来自 PropPlacement.json
    private _modelCache = new Map<string, any>();
    private _matCache = new Map<string, Material>();

    private async loadSceneProps() {
        const placement = await this.loadJson('models/PropPlacement');
        if (!placement || !placement.objects) {
            console.warn('PropPlacement 加载失败，跳过场景');
            return;
        }
        // 要移植的模型：跳过鱼（已单独处理）和缸外环境（含玻璃外壳 GlobeOuter）
        const skip = new Set(['SmallFishA', 'MediumFishA', 'MediumFishB', 'BigFishA', 'BigFishB',
            'EnvironmentBox', 'Skybox', 'SupportBeams', 'GlobeBase', 'GlobeOuter', 'SeaweedA', 'SeaweedB']);
        let count = 0;
        for (const obj of placement.objects) {
            const name: string = obj.name;
            if (skip.has(name)) continue;
            const node = await this.buildProp(name, obj.worldMatrix);
            if (node) count++;
        }
        console.log(`[FishBench3D] 内景场景就绪: ${count} 个模型`);
    }

    private async buildProp(name: string, worldMatrix: number[]): Promise<Node | null> {
        let modelData = this._modelCache.get(name);
        if (!modelData) {
            modelData = await this.loadJson(`models/${name}`);
            if (!modelData) return null;
            this._modelCache.set(name, modelData);
        }

        // 从行主序 4x4 提取平移和旋转
        const pos = new Vec3(worldMatrix[12], worldMatrix[13], worldMatrix[14]);
        const m3 = new Mat3();
        // 行主序 → 列主序（转置）
        m3.set(
            worldMatrix[0], worldMatrix[4], worldMatrix[8],
            worldMatrix[1], worldMatrix[5], worldMatrix[9],
            worldMatrix[2], worldMatrix[6], worldMatrix[10],
        );
        const quat = new Quat();
        Quat.fromMat3(quat, m3);

        const root = new Node(name);
        root.layer = 1 << 30;

        // 多 model（如 SunknShip 船体/甲板/箱子）各自独立 mesh + 材质
        const models = modelData.models;
        for (let mi = 0; mi < models.length; mi++) {
            const mat = await this.buildPropMaterial(name, models[mi]);
            const mesh = this.buildStaticMesh(models[mi]);
            if (!mesh || !mat) continue;
            const child = new Node(`${name}_${mi}`);
            child.layer = 1 << 30;
            const renderer = child.addComponent(MeshRenderer);
            renderer.mesh = mesh;
            renderer.material = mat;
            root.addChild(child);
        }

        this.node.addChild(root);
        root.setWorldPosition(pos);
        root.setWorldRotation(quat);
        return root;
    }

    // 场景材质：玻璃缸半透明，其他用 fish effect（lambert + normal）
    private async buildPropMaterial(name: string, modelData: any): Promise<Material | null> {
        const textures = modelData.textures || {};
        const diffuseName = textures.diffuse || null;
        const normalName = textures.normalMap || null;
        const isGlass = name === 'GlobeInner' || name === 'GlobeOuter';

        const mat = new Material();
        if (this._effect) {
            // 注意：fish.effect 目前只有 opaque technique，玻璃暂用 opaque（半透明后续补）
            mat.initialize({ effectAsset: this._effect, technique: 0 });
        } else {
            mat.initialize({ effectName: 'builtin-unlit', defines: { USE_TEXTURE: true } });
        }

        if (diffuseName) {
            const base = diffuseName.replace(/\.(jpg|png)$/, '');
            const tex = await this.loadTexture(base);
            if (tex) mat.setProperty('mainTexture', tex);
        }
        if (normalName && this._effect) {
            const base = normalName.replace(/\.(png|jpg)$/, '');
            const nm = await this.loadTexture(base);
            if (nm) mat.setProperty('normalMap', nm);
        }

        if (isGlass) {
            // 玻璃：白色半透明（alpha 由 mainColor 控制）
            mat.setProperty('mainColor', new Color(255, 255, 255, 90));
        } else {
            mat.setProperty('mainColor', Color.WHITE);
        }
        return mat;
    }

    private buildStaticMesh(model: any): Mesh | null {
        const f = model.fields;
        const pos = f.position.data;
        const nor = f.normal ? f.normal.data : null;
        const uv = f.texCoord ? f.texCoord.data : null;
        const tan = f.tangent ? f.tangent.data : null;
        const idx = f.indices.data;
        const vertCount = pos.length / 3;

        const positions = new Float32Array(pos);
        const normals = nor ? new Float32Array(nor) : new Float32Array(vertCount * 3);
        const uvs = uv ? new Float32Array(uv) : new Float32Array(vertCount * 2);
        const tangents = tan ? new Float32Array(vertCount * 4) : null;
        if (tangents && tan) {
            for (let i = 0; i < vertCount; i++) {
                tangents[i * 4] = tan[i * 3];
                tangents[i * 4 + 1] = tan[i * 3 + 1];
                tangents[i * 4 + 2] = tan[i * 3 + 2];
                tangents[i * 4 + 3] = 1;
            }
        }
        const indices = new Uint16Array(idx.length);
        for (let i = 0; i < idx.length; i++) indices[i] = idx[i];

        const geom: any = {
            positions, normals, uvs, indices,
            minPos: { x: -1000, y: -1000, z: -1000 },
            maxPos: { x: 1000, y: 1000, z: 1000 },
        };
        if (tangents) geom.tangents = tangents;
        return utils.createMesh(geom);
    }

    private buildDefs(): FishDef[] {
        const total = Math.max(1, this.fishCount);
        const defs: FishDef[] = [
            { name: 'SmallFishA', speed: 1, speedRange: 1.5, radius: 30, radiusRange: 25, tailSpeed: 10, heightOffset: 0, heightRange: 16, fishLength: 10, fishWaveLength: 1, fishBendAmount: 2, scale: 1, count: 0 },
            { name: 'MediumFishA', speed: 1, speedRange: 2, radius: 10, radiusRange: 20, tailSpeed: 1, heightOffset: 0, heightRange: 16, fishLength: 10, fishWaveLength: -2, fishBendAmount: 2, scale: 1, count: 0 },
            { name: 'MediumFishB', speed: 0.5, speedRange: 4, radius: 10, radiusRange: 20, tailSpeed: 3, heightOffset: -8, heightRange: 5, fishLength: 10, fishWaveLength: -2, fishBendAmount: 2, scale: 1, count: 0 },
            { name: 'BigFishA', speed: 0.5, speedRange: 0.5, radius: 50, radiusRange: 3, tailSpeed: 1.5, heightOffset: 0, heightRange: 16, fishLength: 10, fishWaveLength: -1, fishBendAmount: 0.5, scale: 1, count: 0 },
            { name: 'BigFishB', speed: 0.5, speedRange: 0.5, radius: 45, radiusRange: 3, tailSpeed: 1, heightOffset: 0, heightRange: 16, fishLength: 10, fishWaveLength: -0.7, fishBendAmount: 0.3, scale: 1, count: 0 },
        ];
        // 照原版 fishSetting=2（500 条档）分配：Big 2 条，Medium 各 total/10，Small 补满
        const bigPer = total < 100 ? 1 : 2;
        const medPer = Math.min(Math.floor(total / 10), 80);
        defs[3].count = Math.min(bigPer, total);      // BigFishA
        defs[4].count = Math.min(bigPer, total);      // BigFishB
        let left = total - defs[3].count - defs[4].count;
        defs[1].count = Math.min(medPer, Math.floor(left / 2)); // MediumFishA
        defs[2].count = Math.min(medPer, Math.floor(left / 2)); // MediumFishB
        left = total - defs[1].count - defs[2].count - defs[3].count - defs[4].count;
        defs[0].count = Math.max(0, left);            // SmallFishA 补满
        return defs;
    }

    private async spawnFish(def: FishDef, phaseIdx: number) {
        const modelData = await this.loadJson(`models/${def.name}`);
        if (!modelData) return;
        const texture = await this.loadTexture(`${def.name}_DM`);
        const normalMap = await this.loadTexture(`${def.name}_NM`);
        const fish = this.buildFish(def, modelData, texture, normalMap, phaseIdx);
        if (!fish) return;
        this._fish.push(fish);
    }

    private loadJson(path: string): Promise<any> {
        return new Promise((resolve) => {
            resources.load(path, JsonAsset, (err, asset) => {
                if (err) { console.error('模型 JSON 加载失败:', path, err); resolve(null); return; }
                resolve((asset as JsonAsset).json);
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
                    console.error('贴图加载失败:', path, err || e2);
                    resolve(null);
                });
            });
        });
    }

    private buildFish(def: FishDef, data: any, texture: Texture2D | null, normalMap: Texture2D | null, phaseIdx: number): FishInstance | null {
        const model = data.models[0];
        const f = model.fields;
        const pos = f.position.data;
        const nor = f.normal.data;
        const uv = f.texCoord.data;
        const tan = f.tangent ? f.tangent.data : null;
        const idx = f.indices.data;
        const vertCount = pos.length / 3;

        const positions = new Float32Array(vertCount * 3);
        const normals = new Float32Array(vertCount * 3);
        const uvs = new Float32Array(vertCount * 2);
        const tangents = tan ? new Float32Array(vertCount * 4) : null;
        for (let i = 0; i < vertCount; i++) {
            positions[i * 3] = pos[i * 3]; positions[i * 3 + 1] = pos[i * 3 + 1]; positions[i * 3 + 2] = pos[i * 3 + 2];
            normals[i * 3] = nor[i * 3]; normals[i * 3 + 1] = nor[i * 3 + 1]; normals[i * 3 + 2] = nor[i * 3 + 2];
            uvs[i * 2] = uv[i * 2]; uvs[i * 2 + 1] = uv[i * 2 + 1];
            if (tangents && tan) {
                tangents[i * 4] = tan[i * 3];
                tangents[i * 4 + 1] = tan[i * 3 + 1];
                tangents[i * 4 + 2] = tan[i * 3 + 2];
                tangents[i * 4 + 3] = 1; // 手性
            }
        }
        const indices = new Uint16Array(idx.length);
        for (let i = 0; i < idx.length; i++) indices[i] = idx[i];

        const geom: any = {
            positions,
            normals,
            uvs,
            indices16: indices,
            minPos: { x: -5, y: -3, z: -10 },
            maxPos: { x: 5, y: 3, z: 10 },
        };
        if (tangents) geom.tangents = tangents;

        const mesh = utils.MeshUtils.createDynamicMesh(0, geom, undefined, {
            maxSubMeshes: 1,
            maxSubMeshVertices: vertCount,
            maxSubMeshIndices: idx.length,
        });

        const node = new Node(def.name);
        node.layer = 1 << 30; // DEFAULT
        const renderer = node.addComponent(MeshRenderer);
        renderer.mesh = mesh;

        // 材质：自定义 Blinn-Phong 鱼渲染（写实），回退 unlit
        const mat = new Material();
        if (this._effect) {
            mat.initialize({ effectAsset: this._effect });
            mat.setProperty('mainColor', Color.WHITE);
            if (texture) mat.setProperty('mainTexture', texture);
            if (normalMap) mat.setProperty('normalMap', normalMap);
            // 照原版 Inside 1：蓝绿环境光 + 白色高光 + shininess 50
            mat.setProperty('ambientColor', new Color(0.218 * 255, 0.502 * 255, 0.706 * 255, 255));
            mat.setProperty('specularColor', Color.WHITE);
            mat.setProperty('shininess', 50.0);
        } else {
            mat.initialize({ effectName: 'builtin-unlit', defines: { USE_TEXTURE: true } });
            mat.setProperty('mainColor', Color.WHITE);
            if (texture) mat.setProperty('mainTexture', texture);
        }
        renderer.material = mat;

        this.node.addChild(node);

        const inst: FishInstance = {
            def,
            node,
            mesh,
            positions,
            workPos: new Float32Array(vertCount * 3),  // 预分配，stepFish() 复用
            indices16: indices,
            vertCount,
            phaseIdx,
            speed: def.speed + Math.random() * def.speedRange,
            xRadius: def.radius + Math.random() * def.radiusRange,
            yRadius: 2.0 + Math.random() * def.heightRange,
            zRadius: def.radius + Math.random() * def.radiusRange,
            height: def.heightOffset,
            scale: def.scale * (1.0 + Math.random()),  // 照原版 fishScale=1
        };
        node.setScale(inst.scale, inst.scale, inst.scale);
        return inst;
    }

    update(dt: number) {
        if (dt <= 0) return;
        this._clock += dt;
        for (const fish of this._fish) {
            this.stepFish(fish);
        }
        this.updateCamera(dt);
    }

    // 照原版 setToCameraLookAt：Inside 1（相机在鱼群内绕圈，鱼环绕四周）
    private updateCamera(dt: number) {
        const cam = this._camNode;
        if (!cam) return;
        this._eyeClock += dt * 0.0258;
        const t = this._eyeClock;
        this._eyePos.set(
            Math.sin(t) * 13.2,
            7.5,
            Math.cos(t) * 13.2,
        );
        cam.setWorldPosition(this._eyePos);
        this._next.set(
            Math.sin(t + Math.PI) * 91.6,
            63.3,
            Math.cos(t + Math.PI) * 91.6,
        );
        cam.lookAt(this._next);

        // 方向光：放相机上方，照向鱼群中心（照原版 lightWorldPos = eye + right*20 + up*30）
        const light = this._lightNode;
        if (light) {
            light.setWorldPosition(this._eyePos.x, this._eyePos.y + 30, this._eyePos.z + 20);
            light.lookAt(this._targetPos.set(0, 25, 0));
        }
    }

    private stepFish(fish: FishInstance) {
        const def = fish.def;
        const clock = this._clock;

        // 照原版 aquarium.js：全局慢时钟 + 种内相位错开 + 个体速度
        const fishBaseClock = clock * this._fishSpeed;
        const fishClock = fishBaseClock + fish.phaseIdx * this._fishOffset;
        const fishSpeedClock = fishClock * fish.speed;
        const xClock = fishSpeedClock * this._fishXClock;
        const yClock = fishSpeedClock * this._fishYClock;
        const zClock = fishSpeedClock * this._fishZClock;

        const pos = this._pos;
        const next = this._next;
        pos.set(
            Math.sin(xClock) * fish.xRadius,
            Math.sin(yClock) * fish.yRadius + this._fishHeight + fish.height,
            Math.cos(zClock) * fish.zRadius,
        );
        next.set(
            Math.sin(xClock - 0.04) * fish.xRadius,
            Math.sin(yClock - 0.01) * fish.yRadius + this._fishHeight + fish.height,
            Math.cos(zClock - 0.04) * fish.zRadius,
        );

        // 用世界坐标：父节点（Main Light）每帧被移动旋转，局部坐标会被污染
        fish.node.setWorldPosition(pos);
        // lookAt(next) 让鱼头(+z)朝前进方向（实测验证）
        fish.node.lookAt(next, this._up);

        // 尾巴弯曲（CPU 顶点变形，照原版 shader：fishTailSpeed = def.tailSpeed * g.fishTailSpeed）
        const time = ((clock + fish.phaseIdx) * def.tailSpeed * this._fishTailSpeed * fish.speed) % (Math.PI * 2);
        const wave = def.fishWaveLength;
        const bend = def.fishBendAmount;
        const len = def.fishLength;
        const base = fish.positions;
        const out = fish.workPos;  // 复用预分配缓冲，无 GC
        for (let i = 0; i < fish.vertCount; i++) {
            const z = base[i * 3 + 2];
            const mult = z > 0 ? z / len : (-z / len) * 2;
            const offset = mult * mult * Math.sin(time + mult * wave) * bend;
            out[i * 3] = base[i * 3] + offset;
            out[i * 3 + 1] = base[i * 3 + 1];
            out[i * 3 + 2] = base[i * 3 + 2];
        }
        // 动态 mesh：更新 position 子网格几何（GPU 自动上传）
        fish.mesh.updateSubMesh(0, { positions: out, indices16: fish.indices16 });
    }
}

// 自动挂载（默认关闭：测试时挂 CocosBench3D 即可，避免重复 spawn）。
// 想单独看鱼群效果时，取消下一行注释让场景启动自动挂载 FishBench3D。
// director.on(Director.EVENT_AFTER_SCENE_LAUNCH, (scene: Scene) => {
//     if (!scene) return;
//     if (scene.getComponentInChildren(FishBench3D)) return;
//     const root = scene.getChildByName('Main Light') || scene.children[0];
//     if (root) root.addComponent(FishBench3D);
// });
