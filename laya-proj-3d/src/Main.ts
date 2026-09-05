const { regClass } = Laya;

type BenchPhase = 'idle' | 'warmup' | 'sample';

interface Fish {
    node: Laya.Sprite3D;
    type: number;
    angle: number;
    xRadius: number;
    zRadius: number;
    speed: number;
    height: number;
    heightOffset: number;
    phase: number;
    tailSpeed: number;
    fishLength: number;
    fishWaveLength: number;
    fishBendAmount: number;
    meshParts: FishMeshPart[];
}

interface FishMeshPart {
    sprite: Laya.MeshSprite3D;
    mesh: Laya.Mesh;
    sourcePositions: Float32Array;
    vertices: Float32Array;
    stride: number;
    vertexCount: number;
}

interface FixedResult {
    meta: { engine: string; variant: string; backend: string; mode: string; count: number; requestedBackend: string; gpuVendor?: string | null; gpuRenderer?: string | null };
    nodeCount: number;
    drawCallAvg: number;
    instAvg?: number;
    frames: number;
    fps: number;
    p50: number;
    p95: number;
    p99: number;
    cpuSimMs: number;
    actualBackend: string;
    backendValid: boolean;
    comparisonEligible: boolean;
    overBudgetPct?: number;
    jsHeapMB?: number | null;
    renderWidth?: number | null;
    renderHeight?: number | null;
    antialias?: boolean;
    dpr?: number;
    userAgent?: string;
}

@regClass()
export class Main extends Laya.Script {
    private readonly fish: Fish[] = [];
    private readonly samples: number[] = [];
    private readonly drawCalls: number[] = [];
    private readonly fishNames = ['SmallFishA', 'MediumFishA', 'MediumFishB', 'BigFishA', 'BigFishB'];
    private readonly fishSettings = [
        { xRadius: 30, radiusRange: 25, speed: 1, speedRange: 1.5, tailSpeed: 10, heightOffset: 0, heightRange: 16, fishLength: 10, fishWaveLength: 1, fishBendAmount: 2 },
        { xRadius: 10, radiusRange: 20, speed: 1, speedRange: 2, tailSpeed: 1, heightOffset: 0, heightRange: 16, fishLength: 10, fishWaveLength: -2, fishBendAmount: 2 },
        { xRadius: 10, radiusRange: 20, speed: 0.5, speedRange: 4, tailSpeed: 3, heightOffset: -8, heightRange: 5, fishLength: 10, fishWaveLength: -2, fishBendAmount: 2 },
        { xRadius: 50, radiusRange: 3, speed: 0.5, speedRange: 0.5, tailSpeed: 1.5, heightOffset: 0, heightRange: 16, fishLength: 10, fishWaveLength: -1, fishBendAmount: 0.5 },
        { xRadius: 45, radiusRange: 3, speed: 0.5, speedRange: 0.5, tailSpeed: 1, heightOffset: 0, heightRange: 16, fishLength: 10, fishWaveLength: -0.7, fishBendAmount: 0.3 }
    ];
    private readonly rampCounts = [50, 500, 2000, 5000, 8000, 12000, 16000, 20000, 24000, 28000, 32000, 36000, 40000, 45000, 50000, 60000, 70000, 80000, 90000, 100000];
    private warmupMs = 5000;
    private warmFrames: number[] = [];
    private calmSince = 0;
    private readonly envSkip = new Set([
        'SmallFishA', 'MediumFishA', 'MediumFishB', 'BigFishA', 'BigFishB',
        'SupportBeams', 'GlobeOuter'
    ]);
    private scene!: Laya.Scene3D;
    private camera!: Laya.Camera;
    private root!: Laya.Sprite3D;
    private envRoot!: Laya.Sprite3D;
    private readonly fishSpeciesMats = new Map<string, Laya.Material>();
    private fishShader: Laya.Shader3D | null = null;
    private ready = false;
    private lastFrame = 0;
    private simMs = 0;
    private simFrames = 0;
    private phase: BenchPhase = 'idle';
    private phaseStarted = 0;
    private requestedBackend = 'webgl';
    private hudOut!: HTMLElement;
    private hudLevels!: HTMLElement;
    private fhEl!: HTMLElement;
    private fixedHistory: string[] = [];
    private copyButton!: HTMLButtonElement;
    private lastRampResult: any = null;
    private eyeClock = 0;
    private fishClock = 0;
    private modelDataCache = new Map<string, any>();
    private materialCache = new Map<string, Laya.Material>();
    private readonly textureCache = new Map<string, Laya.Texture2D>();
    private textureFailures = new Set<string>();
    private meshCache = new Map<string, Laya.Mesh>();
    private readonly seaweedMats: Laya.Material[] = [];

    async onStart(): Promise<void> {
        this.createScene();
        this.createHud();
        await this.loadFishShader();
        await this.loadAquariumAssets();
        await this.setupSky();
        this.ready = true;
        this.autoDrive();
        if (new URLSearchParams(location.search).get('auto') !== '1') this.setCount(50);
        console.info('[LayaBench3D] ready');
    }

    onUpdate(): void {
        if (!this.ready) return;
        const now = performance.now();
        const dt = this.lastFrame ? Math.min(now - this.lastFrame, 100) : 16.7;
        this.lastFrame = now;
        const start = performance.now();
        this.fishClock += dt * 0.001;
        this.fishSpeciesMats.forEach((material) => material.setFloat('u_SimulationTime', this.fishClock));
        for (let i = 0; i < this.seaweedMats.length; i++) this.seaweedMats[i].setFloat('u_WaveTime', i + this.fishClock);
        this.simMs += performance.now() - start;
        this.simFrames++;
        this.updateCamera(dt);

        if (this.phase === 'idle') return;
        if (this.phase === 'warmup') {
            // 动态预热收敛：帧时间滑动窗口 p95≤20ms 且均值≤18.2ms 持续 1s 提前进采样；
            // 最短 = warmupMs，最长 = 3×warmupMs（WebGPU 首跑 PSO 编译集中在预热期消化）
            this.warmFrames.push(dt);
            if (this.warmFrames.length > 40) this.warmFrames.shift();
            let warmOk = false;
            if (this.warmFrames.length >= 30) {
                const ws = this.warmFrames.slice().sort((a, b) => a - b);
                const wp95 = ws[Math.floor(ws.length * 0.95)];
                const wavg = ws.reduce((a, b) => a + b, 0) / ws.length;
                warmOk = wp95 <= 20 && wavg <= 18.2;
            }
            if (warmOk && !this.calmSince) this.calmSince = now;
            if (!warmOk) this.calmSince = 0;
            const converged = warmOk && this.calmSince > 0 && now - this.calmSince >= 1000;
            if ((now - this.phaseStarted >= this.warmupMs && (converged || now - this.phaseStarted >= this.warmupMs * 3)) || now - this.phaseStarted >= this.warmupMs * 3) {
                this.phase = 'sample';
                this.phaseStarted = now;
                this.samples.length = 0;
                this.drawCalls.length = 0;
                this.instSamples.length = 0;
                this._lastWgpuDraws = 0;
                this._lastWgpuInst = 0;
                this.simMs = 0;
                this.simFrames = 0;
            }
            return;
        }
        // 采样期丢弃 >200ms 大间隙（后台切换回来被钳制的帧 / 大 GC 停顿），
        // 与 stats.js 口径对齐；相墙时钟推进不受影响
        if (dt <= 200) {
            this.samples.push(dt);
            const dc = this.readDrawCalls();
            if (dc >= 0) this.drawCalls.push(dc);
            const inst = this.readInstances();
            if (inst >= 0) this.instSamples.push(inst);
        }
        if (now - this.phaseStarted >= 6000) this.finishFixed();
    }

    private animateFishTail(fish: Fish, clock: number): void {
        for (const part of fish.meshParts) {
            const vertices = part.vertices;
            const source = part.sourcePositions;
            for (let i = 0; i < part.vertexCount; i++) {
                const z = source[i * 3 + 2];
                const mult = z > 0
                    ? z / fish.fishLength
                    : -z / fish.fishLength * 2;
                const bend = mult * mult * Math.sin(clock + mult * fish.fishWaveLength) * fish.fishBendAmount;
                const offset = i * part.stride;
                vertices[offset] = source[i * 3] + bend;
                vertices[offset + 1] = source[i * 3 + 1];
                vertices[offset + 2] = z;
            }
            part.mesh.vertexBuffer.setData(vertices.buffer, 0, 0, vertices.byteLength);
        }
    }

    private async loadFishShader(): Promise<void> {
        await Laya.loader.load(['aquarium/AquariumFish.shader', 'aquarium/AquariumEnvironment.shader', 'aquarium/AquariumProp.shader', 'aquarium/AquariumSeaweed.shader']);
        this.fishShader = (Laya as any).Shader3D.find('AquariumFish') as Laya.Shader3D;
        // 合批开关：自定义 Shader3D 默认 _enableInstancing=false → 批次代理 _canBatch 永假
        // （LayaX/WebGL 两驱动同一条件）→ 1 鱼 1 draw、100k 鱼只画 ~1.7%。必须显式打开
        for (const n of ['AquariumFish', 'AquariumEnvironment', 'AquariumProp', 'AquariumSeaweed']) {
            const sh: any = (Laya as any).Shader3D.find(n);
            if (sh) sh._enableInstancing = true;
        }
    }

    private createScene(): void {
        const scene = this.findScene3D(Laya.stage);
        if (!scene) throw new Error('LayaBench3D: 默认 Scene3D 未加载');
        scene.removeChildren();
        this.scene = scene;
        const camera = new Laya.Camera(0, 1, 25000);
        camera.name = 'Main Camera';
        scene.addChild(camera);
        this.camera = camera;
        const lightNode = new Laya.Sprite3D('Main Light');
        const light = lightNode.addComponent(Laya.DirectionLightCom);
        light.color = new Laya.Color(1, 250 / 255, 240 / 255, 1);
        light.intensity = 1.5;
        light.shadowMode = Laya.ShadowMode.None;
        lightNode.transform.localRotationEuler = new Laya.Vector3(-117.894, -194.909, 38.562);
        scene.addChild(lightNode);
        scene.enableFog = false;
        scene.fogMode = Laya.FogMode.EXP2;
        scene.fogColor = new Laya.Color(0.54, 0.86, 1, 1);
        scene.fogDensity = 0.0012;
        scene.ambientMode = Laya.AmbientMode.SolidColor;
        scene.ambientColor = new Laya.Color(0.22, 0.25, 0.39, 1);
        scene.ambientIntensity = 1;
        camera.transform.localPosition = new Laya.Vector3(0, 7.5, 13.2);
        camera.transform.lookAt(new Laya.Vector3(0, 35, -91.6), new Laya.Vector3(0, 1, 0), false, true);
        // Cocos 内置天空盒在 HDR+默认曝光下实际渲染≈纯黑（c*skyIllum*exposure≈0），可见背景全部来自 EnvironmentBox 模型
        camera.clearFlag = Laya.CameraClearFlags.SolidColor;
        // 关闭遮挡剔除：鱼的位置由 VS 用实例参数计算，节点 Bounds 全在原点（参数假矩阵），
        // 遮挡查询基于假 Bounds 大面积误剔（密集鱼墙互相"遮挡"）→ 100k 鱼只提交 ~1.7%。
        // 压测要求全量提交，遮挡剔除在 LayaAir 默认开启（BaseCamera 构造 useOcclusionCulling=!0）
        (camera as any).useOcclusionCulling = false;
        camera.clearColor = new Laya.Color(0, 0, 0, 1);
        camera.nearPlane = 1;
        camera.farPlane = 25000;
        camera.fieldOfView = 82.7;
        this.envRoot = new Laya.Sprite3D('AquariumEnvironment');
        this.root = new Laya.Sprite3D('FishRoot');
        scene.addChild(this.envRoot);
        scene.addChild(this.root);
    }

    private findScene3D(node: Laya.Node): Laya.Scene3D | null {
        if (node instanceof Laya.Scene3D) return node;
        for (let i = 0; i < node.numChildren; i++) {
            const found = this.findScene3D(node.getChildAt(i));
            if (found) return found;
        }
        return null;
    }

    private async loadAquariumAssets(): Promise<void> {
        const placement = await this.loadJson('PropPlacement');
        if (placement?.objects) {
            let envCount = 0;
            for (const obj of placement.objects) {
                if (this.envSkip.has(obj.name)) continue;
                const node = await this.createSourceModel(obj.name);
                if (!node) continue;
                this.applySourceTransform(node, obj.worldMatrix);
                this.envRoot.addChild(node);
                envCount++;
            }
            console.info('[LayaBench3D] environment objects=' + envCount);
        }
        await this.warmupFishMaterials();
        for (const name of this.fishNames) {
            const data = await this.loadJson(name);
            if (!data?.models?.length) throw new Error('LayaBench3D: fish source model missing ' + name);
            for (let i = 0; i < data.models.length; i++) this.meshFor(name, i, data.models[i].fields);
        }
    }

    private async setupSky(): Promise<void> {
        const names = ['positive_x', 'negative_x', 'positive_y', 'negative_y', 'positive_z', 'negative_z'];
        const images = await Promise.all(names.map((name) => this.loadSkyImage('GlobeOuter_EM_' + name + '.jpg')));
        if (images.some((image) => !image)) return;
        const cube = new Laya.TextureCube(images[0]!.width, Laya.TextureFormat.R8G8B8, true, false);
        cube.setImageData(images as HTMLImageElement[], false, false);
        const sky = new Laya.SkyBoxMaterial();
        sky.textureCube = cube;
        sky.exposure = 1;
        this.scene.skyRenderer.meshType = 'box';
        this.scene.skyRenderer.material = sky;
    }

    private loadSkyImage(name: string): Promise<HTMLImageElement | null> {
        return new Promise((resolve) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = () => resolve(null);
            image.src = 'aquarium/skybox/' + name;
        });
    }

    private async warmupFishMaterials(): Promise<void> {
        for (const name of this.fishNames) {
            const data = await this.loadJson(name);
            if (!data?.models?.length) continue;
            const textures = data.models[0].textures || {};
            this.fishSpeciesMats.set(name, await this.createSpeciesMaterial(name, textures));
        }
    }

    private async createSpeciesMaterial(name: string, textures: any): Promise<Laya.Material> {
        const material = new Laya.Material();
        material.setShaderName('AquariumFish');
        const diffuse = await this.loadTexture(textures.diffuse || 'error_DM.jpg');
        if (diffuse) material.setTexture('u_MainTex', diffuse);
        const normal = await this.loadTexture(textures.normalMap || 'error_NM.png');
        if (normal) material.setTexture('u_NormalMap', normal);
        if (textures.reflectionMap) {
            const reflection = await this.loadTexture(textures.reflectionMap);
            if (reflection) material.setTexture('u_ReflectionMap', reflection);
        }
        material.setFloat('u_UseReflection', textures.reflectionMap ? 1 : 0);
        const setting = this.fishSettings[this.fishNames.indexOf(name)];
        material.setFloat('u_FishLength', setting.fishLength);
        material.setFloat('u_FishWaveLength', setting.fishWaveLength);
        material.setFloat('u_FishBendAmount', setting.fishBendAmount);
        return material;
    }

    private async loadJson(name: string): Promise<any> {
        const cached = this.modelDataCache.get(name);
        if (cached) return cached;
        const res = await fetch('aquarium/source/' + name + '.js');
        if (!res.ok) throw new Error('load source failed: ' + name);
        const data = JSON.parse(await res.text());
        this.modelDataCache.set(name, data);
        return data;
    }

    private applySourceTransform(node: Laya.Sprite3D, source: number[]): void {
        // 与 Cocos 基准一致：仅取平移+旋转，丢弃缩放（Quat 提取会归一化）
        const sx = Math.hypot(source[0], source[1], source[2]) || 1;
        const sy = Math.hypot(source[4], source[5], source[6]) || 1;
        const sz = Math.hypot(source[8], source[9], source[10]) || 1;
        const matrix = new Laya.Matrix4x4();
        const elements = matrix.elements;
        elements[0] = source[0] / sx;
        elements[1] = source[1] / sx;
        elements[2] = source[2] / sx;
        elements[4] = source[4] / sy;
        elements[5] = source[5] / sy;
        elements[6] = source[6] / sy;
        elements[8] = source[8] / sz;
        elements[9] = source[9] / sz;
        elements[10] = source[10] / sz;
        elements[12] = source[12];
        elements[13] = source[13];
        elements[14] = source[14];
        elements[15] = 1;
        node.transform.localMatrix = matrix;
    }

    private async createSourceModel(name: string): Promise<Laya.Sprite3D | null> {
        let data = this.modelDataCache.get(name);
        if (!data) {
            data = await this.loadJson(name).catch(() => null);
            if (!data?.models?.length) return null;
            this.modelDataCache.set(name, data);
        }
        const root = new Laya.Sprite3D(name);
        for (let i = 0; i < data.models.length; i++) {
            const part = data.models[i];
            const mesh = this.meshFor(name, i, part.fields);
            if (!mesh) continue;
            const sprite = new Laya.MeshSprite3D(mesh, name + '_' + i);
            sprite.meshRenderer.frustumCulled = false;
            sprite.meshRenderer.sharedMaterial = await this.materialFor(name, part.textures || {});
            root.addChild(sprite);
        }
        return root;
    }

    private meshFor(modelName: string, partIndex: number, fields: any): Laya.Mesh | null {
        const key = modelName + ':' + partIndex;
        const cached = this.meshCache.get(key);
        if (cached) return cached;
        const mesh = this.createMesh(fields, this.fishNames.includes(modelName));
        if (mesh) this.meshCache.set(key, mesh);
        return mesh;
    }

    private createMesh(fields: any, flipTexture: boolean): Laya.Mesh | null {
        const pos = fields?.position?.data;
        if (!pos?.length) return null;
        const normal = fields.normal?.data;
        const uv = fields.texCoord?.data;
        const tangent = fields.tangent?.data;
        const idx = fields.indices?.data;
        const count = Math.floor(pos.length / 3);
        const stride = 12;
        const vertices = new Float32Array(count * stride);
        for (let i = 0; i < count; i++) {
            const offset = i * stride;
            vertices[offset] = pos[i * 3];
            vertices[offset + 1] = pos[i * 3 + 1];
            vertices[offset + 2] = pos[i * 3 + 2];
            vertices[offset + 3] = normal ? normal[i * 3] : 0;
            vertices[offset + 4] = normal ? normal[i * 3 + 1] : 1;
            vertices[offset + 5] = normal ? normal[i * 3 + 2] : 0;
            vertices[offset + 6] = uv ? uv[i * 2] : 0;
            vertices[offset + 7] = uv ? (flipTexture ? 1 - uv[i * 2 + 1] : uv[i * 2 + 1]) : 0;
            vertices[offset + 8] = tangent ? tangent[i * 3] : 1;
            vertices[offset + 9] = tangent ? tangent[i * 3 + 1] : 0;
            vertices[offset + 10] = tangent ? tangent[i * 3 + 2] : 0;
            vertices[offset + 11] = 1;
        }
        const source = idx && idx.length ? idx : Array.from({ length: count }, (_, i) => i);
        const indices = new Uint16Array(source.length);
        for (let i = 0; i < source.length; i += 3) {
            if (flipTexture) {
                indices[i] = source[i + 1];
                indices[i + 1] = source[i];
            } else {
                indices[i] = source[i];
                indices[i + 1] = source[i + 1];
            }
            indices[i + 2] = source[i + 2];
        }
        const declaration = (Laya as any).VertexMesh.getVertexDeclaration('POSITION,NORMAL,UV,TANGENT');
        return (Laya.PrimitiveMesh as any)._createMesh(declaration, vertices, indices) as Laya.Mesh;
    }

    private createAnimatedFishMesh(fields: any): { mesh: Laya.Mesh; sourcePositions: Float32Array; vertices: Float32Array; stride: number; vertexCount: number } | null {
        const pos = fields?.position?.data;
        if (!pos?.length) return null;
        const normal = fields.normal?.data;
        const uv = fields.texCoord?.data;
        const tangent = fields.tangent?.data;
        const idx = fields.indices?.data;
        const vertexCount = Math.floor(pos.length / 3);
        const hasTangent = !!tangent;
        const stride = hasTangent ? 12 : 8;
        const vertices = new Float32Array(vertexCount * stride);
        const sourcePositions = new Float32Array(pos);
        for (let i = 0; i < vertexCount; i++) {
            const offset = i * stride;
            vertices[offset] = pos[i * 3];
            vertices[offset + 1] = pos[i * 3 + 1];
            vertices[offset + 2] = pos[i * 3 + 2];
            vertices[offset + 3] = normal ? normal[i * 3] : 0;
            vertices[offset + 4] = normal ? normal[i * 3 + 1] : 1;
            vertices[offset + 5] = normal ? normal[i * 3 + 2] : 0;
            vertices[offset + 6] = uv ? uv[i * 2] : 0;
            vertices[offset + 7] = uv ? 1 - uv[i * 2 + 1] : 0;
            if (tangent) {
                vertices[offset + 8] = tangent[i * 3];
                vertices[offset + 9] = tangent[i * 3 + 1];
                vertices[offset + 10] = tangent[i * 3 + 2];
                vertices[offset + 11] = 1;
            }
        }
        const source = idx && idx.length ? idx : Array.from({ length: vertexCount }, (_, i) => i);
        const indices = new Uint16Array(source.length);
        for (let i = 0; i < source.length; i += 3) {
            indices[i] = source[i + 1];
            indices[i + 1] = source[i];
            indices[i + 2] = source[i + 2];
        }
        const declaration = (Laya as any).VertexMesh.getVertexDeclaration(
            hasTangent ? 'POSITION,NORMAL,UV,TANGENT' : 'POSITION,NORMAL,UV'
        );
        const mesh = (Laya.PrimitiveMesh as any)._createMesh(declaration, vertices, indices) as Laya.Mesh;
        return { mesh, sourcePositions, vertices, stride, vertexCount };
    }

    private async materialFor(modelName: string, textures: any): Promise<Laya.Material> {
        const diffuseName = textures.diffuse || 'error_DM.jpg';
        const normalName = textures.normalMap || '';
        const reflectionName = textures.reflectionMap || '';
        const key = modelName + '|' + diffuseName + '|' + normalName + '|' + reflectionName;
        const cached = this.materialCache.get(key);
        if (cached) return cached;

        const isFish = this.fishNames.includes(modelName);
        const isFloor = modelName === 'FloorBase_Baked' || modelName === 'FloorCenter';
        const isEnvironment = modelName === 'EnvironmentBox' || modelName === 'Skybox' || modelName === 'GlobeBase' || modelName === 'SupportBeams';
        const isGlass = modelName === 'GlobeInner' || modelName === 'GlobeOuter';
        const isSeaweed = modelName === 'SeaweedA' || modelName === 'SeaweedB';
        const isCutout = modelName === 'SeaweedA' || modelName === 'SeaweedB';
        const isCustomProp = !isFish && !isEnvironment && !isFloor && !isGlass && !isSeaweed;
        const mat = isEnvironment || isFloor || isCustomProp || isSeaweed ? new Laya.Material() : new Laya.BlinnPhongMaterial();

        if (isEnvironment || isFloor) {
            mat.setShaderName('AquariumEnvironment');
            if (isFloor) mat.setFloat('u_UsePointLight', 1);
        } else if (isSeaweed) {
            mat.setShaderName('AquariumSeaweed');
            mat.setFloat('u_WaveTime', this.seaweedMats.length);
            this.seaweedMats.push(mat);
            mat.cull = Laya.CullMode.Off;
        } else if (isCustomProp) {
            mat.setShaderName('AquariumProp');
            mat.setFloat('u_UseNormalMap', normalName ? 1 : 0);
        } else if (mat instanceof Laya.BlinnPhongMaterial) {
            mat.albedoColor = isGlass ? new Laya.Color(0.74, 0.88, 1, 0.176) : new Laya.Color(1, 1, 1, 1);
            mat.specularColor = modelName.includes('Fish') ? new Laya.Color(0.3, 0.3, 0.3, 1) : new Laya.Color(1, 1, 1, 1);
            mat.shininess = modelName.includes('Fish') ? 5 : 50;
            if (isGlass) {
                mat.albedoTexture = null as any;
                mat.normalTexture = null as any;
                mat.renderMode = Laya.BlinnPhongMaterial.RENDERMODE_TRANSPARENT;
                mat.cull = Laya.CullMode.Off;
            }
            if (isCutout) {
                mat.renderMode = Laya.BlinnPhongMaterial.RENDERMODE_CUTOUT;
                mat.cull = Laya.CullMode.Off;
            }
        }
        if (isEnvironment || isFloor) mat.cull = Laya.CullMode.Off;

        const diffuse = await this.loadTexture(diffuseName);
        if (diffuse) {
            if (isFloor) {
                diffuse.wrapU = Laya.WrapMode.Repeat;
                diffuse.wrapV = Laya.WrapMode.Repeat;
            }
            if (isEnvironment || isFloor || isCustomProp || isSeaweed) mat.setTexture('u_MainTex', diffuse);
            else (mat as Laya.BlinnPhongMaterial).albedoTexture = diffuse;
        }
        if (normalName && (isCustomProp || isFloor)) {
            const normal = await this.loadTexture(normalName);
            if (normal) mat.setTexture('u_NormalMap', normal);
        }
        this.materialCache.set(key, mat);
        return mat;
    }

    private async loadTexture(name: string): Promise<Laya.Texture2D | null> {
        const cached = this.textureCache.get(name);
        if (cached) return cached;
        try {
            const texture = await Laya.loader.load('aquarium/source/' + name, Laya.Loader.TEXTURE2D) as Laya.Texture2D;
            if (texture) { texture.anisoLevel = 1; texture.filterMode = Laya.FilterMode.Bilinear; }
            this.textureCache.set(name, texture);
            return texture;
        } catch (error) {
            if (!this.textureFailures.has(name)) {
                this.textureFailures.add(name);
                console.error('[LayaBench3D] texture load failed: ' + name, error);
            }
            return null;
        }
    }

    private createFishInstance(fishType: number, motion: any): Laya.Sprite3D {
        const modelName = this.fishNames[fishType];
        const data = this.modelDataCache.get(modelName);
        const speciesMaterial = this.fishSpeciesMats.get(modelName)!;
        const root = new Laya.Sprite3D('Fish');
        for (let i = 0; i < data.models.length; i++) {
            const mesh = this.meshFor(modelName, i, data.models[i].fields);
            if (!mesh) continue;
            const sprite = new Laya.MeshSprite3D(mesh);
            sprite.meshRenderer.frustumCulled = false;
            sprite.meshRenderer.sharedMaterial = speciesMaterial;
            root.addChild(sprite);
        }
        // 鱼参数打包进实例世界矩阵（AquariumFish VS 的 GPU_INSTANCE 分支读取），触发引擎同 mesh+材质自动合批
        const matrix = new Laya.Matrix4x4();
        const e = matrix.elements;
        e[0] = motion.phase; e[1] = motion.speed; e[2] = motion.xRadius; e[3] = motion.height;
        e[4] = motion.zRadius; e[5] = motion.heightOffset; e[6] = motion.scale; e[7] = motion.tailSpeed;
        e[8] = 0; e[9] = 0; e[10] = 0; e[11] = 0;
        e[12] = 0; e[13] = 0; e[14] = 0; e[15] = 1;
        root.transform.localMatrix = matrix;
        return root;
    }

    private fishTypeFor(index: number, total: number): number {
        // 与 fishCounts 同口径的前缀分布
        const counts = this.fishCounts(total);
        let acc = 0;
        for (let t = 0; t < counts.length; t++) {
            acc += counts[t];
            if (index < acc) return t;
        }
        return 0;
    }

    private fishCounts(total: number): number[] {
        // 压测分布 v2：大 2%/种、中 8%/种、小补满 —— 大/中鱼随总量线性增长
        // （与 Cocos buildDefs 同口径；旧 fishSetting=2 封顶公式使 5 万后负载恒定）
        const bigEach = Math.floor(total * 0.02);
        const mediumEach = Math.floor(total * 0.08);
        const small = Math.max(0, total - bigEach * 2 - mediumEach * 2);
        return [small, mediumEach, mediumEach, bigEach, bigEach];
    }

    private setCount(count: number): void {
        const counts = this.fishCounts(count);
        for (let fishType = 0; fishType < counts.length; fishType++) {
            const target = counts[fishType];
            const current = this.fish.filter((fish) => fish.type === fishType);
            while (current.length > target) {
                const fish = current.pop()!;
                fish.node.destroy();
                this.fish.splice(this.fish.indexOf(fish), 1);
            }
            const setting = this.fishSettings[fishType];
            for (let n = current.length; n < target; n++) {
                const scale = 1 + Math.random();
                const motion = {
                    phase: n,
                    xRadius: setting.xRadius + Math.random() * setting.radiusRange,
                    zRadius: setting.xRadius + Math.random() * setting.radiusRange,
                    speed: setting.speed + Math.random() * setting.speedRange,
                    height: 2 + Math.random() * setting.heightRange,
                    heightOffset: setting.heightOffset,
                    scale,
                    tailSpeed: setting.tailSpeed,
                    fishLength: setting.fishLength,
                    fishWaveLength: setting.fishWaveLength,
                    fishBendAmount: setting.fishBendAmount
                };
                const node = this.createFishInstance(fishType, motion);
                node.name = 'Fish';
                this.root.addChild(node);
                this.fish.push({
                    node,
                    type: fishType,
                    angle: n,
                    ...motion,
                    meshParts: []
                });
            }
        }
    }

    private updateCamera(dt: number): void {
        this.eyeClock += dt * 0.0000258;
        const t = this.eyeClock;
        this.camera.transform.localPosition = new Laya.Vector3(Math.sin(t) * 13.2, 7.5, Math.cos(t) * 13.2);
        this.camera.transform.lookAt(new Laya.Vector3(Math.sin(t + Math.PI) * 91.6, 35, Math.cos(t + Math.PI) * 91.6), new Laya.Vector3(0, 1, 0), false, true);
    }

    private actualBackend(): string {
        let backend = 'webgl';
        try {
            // 首选：canvas 已配置的 context 类型 = 引擎真实后端（不受发布版类名混淆影响；
            // 类名在 release 构建里被压缩成 'Ae' 之类，/webgpu/i 会误判成 webgl）
            const cv = document.querySelector('canvas') as HTMLCanvasElement | null;
            const gctx = cv ? (cv as any).getContext('webgpu') : null;
            if (gctx) backend = 'webgpu';
            // 兜底：未混淆构建下类名可读（WebGPURenderEngine）
            if (backend === 'webgl') {
                const engine: any = (Laya as any).LayaGL?.renderEngine;
                const name = engine && engine.constructor && engine.constructor.name || '';
                if (/webgpu/i.test(name)) backend = 'webgpu';
            }
        } catch (e) { /* 探测失败按 webgl 记 */ }
        (window as any).__laya3dRealBackend = backend;
        const engineName: any = (Laya as any).LayaGL?.renderEngine;
        console.info('[LayaBench3D] renderEngine=' + (engineName?.constructor?.name || '?') + ' canvasBackend=' + backend + ', navigator.gpu=' + !!navigator.gpu);
        return backend;
    }

    private _lastWgpuDraws = 0;
    private _lastWgpuInst = 0;
    private instSamples: number[] = [];

    /** LayaX WebGPU 臂专用：每帧 instance 数（探针差分）。≈ 场景真实渲染的鱼数 + 环境实例 */
    private readInstances(): number {
        const probe: any = (globalThis as any).__wgpuProbe;
        if (!probe) return -1;
        const d = probe.instTotal - this._lastWgpuInst;
        this._lastWgpuInst = probe.instTotal;
        return d >= 0 ? d : -1;
    }

    private readDrawCalls(): number {
        const g: any = globalThis as any;
        // LayaX(WebGPU) 臂：引擎原生统计桥在 Web 构建缺失（LayaXRenderEngine._syncStatistics 早退）
        // → statAgent 恒 0。用 __wgpuProbe（hook GPURenderPassEncoder.draw，build.js 注入）累计差分自计
        const probe = g.__wgpuProbe;
        if (probe) {
            const d = probe.drawTotal - this._lastWgpuDraws;
            this._lastWgpuDraws = probe.drawTotal;
            return d >= 0 ? d : -1;
        }
        // WebGL 臂：statAgent。StatElement 枚举在 release 产物里可能未挂到全局 Laya——
        // 兜底用枚举序数值（layagl/StatisticsContext.ts：CT_3DDrawCall=25, CT_DrawCall=26）
        const stat = g.LayaGL?.statAgent;
        if (!stat) return -1;
        const SE: any = g.Laya?.StatElement || g.StatElement || { CT_3DDrawCall: 25, CT_DrawCall: 26 };
        const value = stat.getElementData(SE.CT_3DDrawCall ?? SE.CT_DrawCall);
        return typeof value === 'number' ? value : -1;
    }

    private gpuInfo(): { gpuVendor: string | null; gpuRenderer: string | null } {
        try {
            const cv = document.createElement('canvas');
            const gl = (cv.getContext('webgl2') || cv.getContext('webgl')) as WebGLRenderingContext | null;
            if (gl) {
                const dbg = gl.getExtension('WEBGL_debug_renderer_info');
                if (dbg) {
                    return {
                        gpuVendor: (gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) as string) || null,
                        gpuRenderer: (gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) as string) || null
                    };
                }
            }
        } catch (e) { /* 辅助字段，失败不影响主结果 */ }
        return { gpuVendor: null, gpuRenderer: null };
    }

    private runFixed(count: number, onDone?: (result: FixedResult) => void, warmupMs: number = 5000): void {
        if (!this.ready) return;
        // 防连点：预热/采样/阶梯进行中忽略新请求（上一轮的 phase 未归位，重入会互相污染）
        if (this.phase !== 'idle') {
            this.hudOut.textContent = '有测试在跑（预热/采样/阶梯中），等当前轮结束再点';
            return;
        }
        this.setCount(count);
        this.samples.length = 0;
        this.drawCalls.length = 0;
        this.simMs = 0;
        this.simFrames = 0;
        this.warmupMs = warmupMs;
        this.warmFrames.length = 0;
        this.calmSince = 0;
        this.phaseStarted = performance.now();
        this.phase = 'warmup';
        (this as any)._fixedDone = onDone;
        this.hudOut.textContent = '预热中…';
    }

    private finishFixed(): void {
        this.phase = 'idle';
        const actualBackend = this.actualBackend();
        const sorted = this.samples.slice().sort((a, b) => a - b);
        const percentile = (p: number) => sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p / 100))] : 0;
        const average = (items: number[]) => items.length ? items.reduce((a, b) => a + b, 0) / items.length : 0;
        const avg = average(sorted);
        const result: FixedResult = {
            meta: { engine: 'layaair-3.4.0', variant: 'boids3d', backend: actualBackend, mode: 'fixed', count: this.fish.length, requestedBackend: this.requestedBackend, ...this.gpuInfo() },
            nodeCount: this.fish.length,
            drawCallAvg: Math.round(average(this.drawCalls) * 10) / 10,
            instAvg: this.instSamples.length ? Math.round(average(this.instSamples)) : undefined,
            frames: sorted.length,
            fps: avg ? Math.round(1000 / avg * 10) / 10 : 0,
            p50: Math.round(percentile(50) * 100) / 100,
            p95: Math.round(percentile(95) * 100) / 100,
            p99: Math.round(percentile(99) * 100) / 100,
            cpuSimMs: Math.round((this.simFrames ? this.simMs / this.simFrames : 0) * 100) / 100,
            actualBackend,
            backendValid: actualBackend === this.requestedBackend,
            comparisonEligible: actualBackend === this.requestedBackend,
            overBudgetPct: sorted.length ? Math.round(sorted.filter((ms) => ms > 16.7).length / sorted.length * 1000) / 10 : 0,
            jsHeapMB: (performance as any).memory ? Math.round((performance as any).memory.usedJSHeapSize / 1048576 * 10) / 10 : null,
            renderWidth: Math.round((Laya.Browser.clientWidth * Laya.Browser.pixelRatio) || 0) || null,
            renderHeight: Math.round((Laya.Browser.clientHeight * Laya.Browser.pixelRatio) || 0) || null,
            antialias: !!(Laya.Config as any)?.isAntialias,
            dpr: window.devicePixelRatio || 1,
            userAgent: navigator.userAgent
        };
        const done = (this as any)._fixedDone as ((value: FixedResult) => void) | undefined;
        (this as any)._fixedDone = null;
        if (done) done(result);
        else {
            (window as any).__benchLastResult = result;
            this.hudOut.textContent = result.backendValid ? `完成 · ${result.fps}fps · p95=${result.p95}ms · dc=${result.drawCallAvg}${result.instAvg != null ? ' · inst=' + result.instAvg : ''}` : `无效：请求 ${this.requestedBackend}，实际 ${actualBackend}`;
            // 手动固定采样历史（每次调整数量点一次 → 留一行，方便逐档对照 fps/dc/inst/p95）
            if (!(this as any)._fixedDone) {
                this.fixedHistory.unshift(`固定 ${result.nodeCount} | fps=${result.fps} | p50=${result.p50} p95=${result.p95} p99=${result.p99} | dc=${result.drawCallAvg}${result.instAvg != null ? ' inst=' + result.instAvg : ''} | cpu=${result.cpuSimMs}ms | ${actualBackend}${result.backendValid ? '' : '(后端不符)'}`);
                if (this.fixedHistory.length > 10) this.fixedHistory.length = 10;
                if (this.fhEl) this.fhEl.textContent = this.fixedHistory.join('\n');
            }
        }
    }

    private runRamp(): void {
        const levels: any[] = [];
        let index = 0;
        let tested = 0;
        let cap = 0;
        let jankAt: number | null = null;
        let invalidCurve = false;
        let sawJank = false;
        // 临界点 + 500 细扫：临界点 = 首个未达稳定门槛（fps≥55 且 p95≤18.2）的档位；
        // 命中后从最后稳定档之上按 +500 细扫（连 3 档硬掉帧或越过最高档即收）；
        // 全程未触临界点则维持原梯跑完。与 bench-runner.js autoRamp 同口径，改动须双写。
        const FINE_STEP = 500;
        const FINE_MAX_LEVELS = 16;
        const maxC = this.rampCounts[this.rampCounts.length - 1];
        let fine = false, fineNext = 0, fineCount = 0, fineJankStreak = 0;
        let unstableStreak = 0;
        let thresholdAt: number | null = null;
        let fineStart: number | null = null;
        this.copyButton.disabled = true;
        const finish = (capped: boolean) => {
            const actualBackend = this.actualBackend();
            const result = { meta: { engine: 'layaair-3.4.0', variant: 'boids3d', backend: actualBackend, requestedBackend: this.requestedBackend, backendValid: actualBackend === this.requestedBackend, mode: 'autoRamp', ...this.gpuInfo() }, cap, jankAt, capped, invalidCurve, thresholdAt, fineStart, fineStep: fine ? FINE_STEP : null, levels };
            this.lastRampResult = result;
            (window as any).__benchLastResult = result;
            this.copyButton.disabled = false;
            const tag = capped ? 'cap 顶格' : (thresholdAt != null ? '细扫收敛' : '跑完全程');
            this.hudOut.textContent = result.meta.backendValid ? `完成 · cap=${cap} 鱼 · 临界=${thresholdAt ?? '-'} · 掉帧档=${jankAt ?? '-'} · ${tag}` : `无效：请求 ${this.requestedBackend}，实际 ${actualBackend}`;
        };
        const nextCount = (): number | null => {
            if (fine) {
                if (fineCount >= FINE_MAX_LEVELS) return null;
                const nc = fineNext + FINE_STEP;
                if (nc > maxC) return null;
                fineNext = nc;
                fineCount++;
                return nc;
            }
            if (index >= this.rampCounts.length) return null;
            return this.rampCounts[index++];
        };
        const runLevel = (count: number, retried: boolean) => {
            tested++;
            const first = tested === 1;
            this.runFixed(count, (json) => {
                // 判定（60Hz vsync 语义，与 bench-runner 同口径）：稳定 = fps≥55 且 p95≤20ms
                //（95% 的帧最多丢 1 个 vsync）；硬掉帧 = fps<45 或 p95≥35
                const stable = json.fps >= 55 && (json.p95 > 0 ? json.p95 <= 20 : true);
                const jank = json.fps < 45 || (json.p95 > 0 && json.p95 >= 35);
                if (jank && !retried) {
                    this.hudOut.textContent = `档 ${count} 疑似抖动（fps=${json.fps} p95=${json.p95}ms），加倍预热重测…`;
                    runLevel(count, true);
                    return;
                }
                if (sawJank && stable) invalidCurve = true;
                if (stable && !sawJank) cap = count;
                // 临界点（防抖版）：连续 2 档未达稳定门槛才转 +500 细扫，单档抖动由下档恢复吸收
                if (!stable && !fine) {
                    unstableStreak++;
                    if (unstableStreak >= 2) {
                        fine = true;
                        if (thresholdAt == null) thresholdAt = count;
                        fineNext = cap > 0 ? cap : count - FINE_STEP;
                        fineStart = fineNext + FINE_STEP;
                        fineCount = 0;
                        fineJankStreak = 0;
                        this.hudOut.textContent = `档 ${count} 连续未达稳定，转入 +${FINE_STEP} 细扫…`;
                    }
                } else if (stable) {
                    unstableStreak = 0;
                }
                if (jank) {
                    sawJank = true;
                    jankAt ??= count;
                    if (fine) fineJankStreak++;
                } else if (fine) {
                    fineJankStreak = 0;
                }
                levels.push({ count, fps: json.fps, p50: json.p50, p95: json.p95, p99: json.p99, drawCallAvg: json.drawCallAvg, instAvg: json.instAvg, cpuSimMs: json.cpuSimMs, fishCount: json.nodeCount, actualBackend: json.actualBackend, backendValid: json.backendValid, gpuVendor: json.meta.gpuVendor, gpuRenderer: json.meta.gpuRenderer, renderWidth: json.renderWidth, renderHeight: json.renderHeight, dpr: json.dpr, retried, stable, fine });
                this.hudLevels.textContent = levels.map((level, i) => `${String(i + 1).padStart(2, '0')}. ${level.count} 鱼 | fps=${level.fps} | p95=${level.p95}ms | dc=${level.drawCallAvg} | cpu=${level.cpuSimMs}ms | ${level.stable ? '稳定' : '掉帧'}${level.retried ? '(重测)' : ''}${level.fine ? '(细)' : ''}`).join('\n');
                if (fine && fineJankStreak >= 3) { finish(false); return; }
                const nc = nextCount();
                if (nc == null) { finish(cap >= maxC); return; }
                runLevel(nc, false);
            }, retried ? 10000 : (first ? 10000 : 5000));
        };
        const n0 = nextCount();
        if (n0 == null) finish(true); else runLevel(n0, false);
    }

    private autoDrive(): void {
        const query = new URLSearchParams(location.search);
        this.requestedBackend = query.get('backend') || 'webgl';
        if (query.get('auto') !== '1') return;
        const count = parseInt(query.get('count') || '50', 10);
        if (query.get('mode') === 'ramp') this.runRamp(); else this.runFixed(count);
    }

    private createHud(): void {
        const hud = document.createElement('div');
        hud.style.cssText = 'position:fixed;bottom:16px;left:16px;z-index:99999;width:510px;box-sizing:border-box;color:#e6edf3;font:13px/1.55 sans-serif;background:rgba(13,17,23,.94);border:1px solid #30363d;border-radius:8px;padding:12px';
        hud.innerHTML = '<div style="margin-bottom:10px"><strong>LayaAir 3.4 · 3D 水族馆</strong><span style="color:#8b949e"> 鱼群压测</span></div><div style="display:flex;gap:8px;align-items:center"><label>数量</label><input id="l3cnt" type="number" value="50" step="50" style="width:82px"><button id="l3fixed">固定采样</button><button id="l3ramp">阶梯压测</button><button id="l3copy" disabled>复制结果</button></div><div id="l3out" style="min-height:20px;margin-top:10px;color:#8b949e">资源加载中…</div><pre id="l3levels" style="max-height:260px;overflow:auto;margin:8px 0 0;padding:8px;background:#010409;color:#c9d1d9"></pre><pre id="l3fh" style="max-height:110px;overflow:auto;margin:6px 0 0;padding:8px;background:#061806;color:#9fe0a8;font-size:12px"></pre>';
        document.body.appendChild(hud);
        this.hudOut = hud.querySelector('#l3out') as HTMLElement;
        this.hudLevels = hud.querySelector('#l3levels') as HTMLElement;
        this.fhEl = hud.querySelector('#l3fh') as HTMLElement;
        this.copyButton = hud.querySelector('#l3copy') as HTMLButtonElement;
        const count = hud.querySelector('#l3cnt') as HTMLInputElement;
        hud.querySelector('#l3fixed')!.addEventListener('click', () => this.runFixed(parseInt(count.value, 10) || 50));
        hud.querySelector('#l3ramp')!.addEventListener('click', () => this.runRamp());
        this.copyButton.addEventListener('click', () => {
            const text = JSON.stringify(this.lastRampResult, null, 2);
            const clipboard = navigator.clipboard;
            if (clipboard && clipboard.writeText) {
                clipboard.writeText(text).then(() => this.hudOut.textContent = '结果已复制到剪贴板').catch(() => this.fallbackCopy(text));
            } else {
                this.fallbackCopy(text);
            }
        });
    }

    private fallbackCopy(text: string): void {
        try {
            const area = document.createElement('textarea');
            area.value = text;
            area.style.cssText = 'position:fixed;opacity:0';
            document.body.appendChild(area);
            area.select();
            document.execCommand('copy');
            document.body.removeChild(area);
            this.hudOut.textContent = '结果已复制到剪贴板';
        } catch (e) {
            (window as any).__benchRampResultText = text;
            this.hudOut.textContent = '剪贴板不可用，结果已存到 __benchRampResultText';
        }
    }
}
