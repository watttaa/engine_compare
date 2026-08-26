# 三引擎基准测试场景规格书（BENCHMARK-SPEC v1.0）

> 本规格是唯一执行标准。所有适配器实现必须与本规格一致；任何偏差需在此文档登记。
> 制定日期：2026-08-26。适用：Egret 自研 5.4.1 / Cocos Creator 3.8.8 / LayaAir 3.4.0。

---

## 0. 全局统一规格（公平性基线）

| 项 | 值 | 说明 |
|---|---|---|
| **仿真区域** | **1280 × 720**（固定） | 三引擎统一。禁止用各自屏幕自适应尺寸（现状：egret 已 fixedSize 1280×720；cocos/laya 需显式固定 bounds 为 1280×720） |
| **DPR** | `window.devicePixelRatio` | 三引擎统一按 DPR 渲染（egret: `calculateCanvasScaleFactor`；cocos: `view.enableRetina(true)`；laya: 默认） |
| **帧率上限** | 60 | egret data-frame-rate=60；cocos `game.frameRate=60`；laya 默认 |
| **antialias** | **关**（对齐 WebGPU 默认） | WebGL 上下文 `antialias: false`（WebGPU 单采样） |
| **贴图** | bunny-mark 原版 12 张 `rabbitv3*.png`（约 26×37） | 同一套文件，同路径加载 |
| **仿真核心** | sim-core 4 件（stats/bunny-sim/boids-sim/bench-runner） | 三引擎逐字节同一份（已同步） |
| **计时** | `performance.now()`（仅此一个时间源） | 禁用引擎 dt / Date.now |
| **GPU 一致性** | 每轮记录 WebGL `WEBGL_debug_renderer_info` / WebGPU `adapter.info` | 结果 JSON 必含 gpuVendor/gpuRenderer（待实现） |
| **环境** | 同机、同浏览器版本、插电、独显直连/同 GPU | 记录 userAgent |

---

## 1. BunnyMark（2D · 三引擎 × 2 后端）

### 1.1 变体定义（不变量）

| 变体 | 纹理策略 | 变换策略 | 考察能力 | MMO 对应 |
|---|---|---|---|---|
| **V1** | 全部 `rabbitv3.png` 单纹理 | 仅 position | 合批上限 | 飘字/弹幕（同图连发） |
| **V2** | 前 8 张轮换 `i % 8` | 仅 position | atlas 多帧合批 | 图集动画/怪物群 |
| **V3** | 同 V1 单纹理 | position + rotation(`+=rotSpeed`) + scale(`0.75+0.25*sin(phase)`) | 变换脏标记 | buff 特效（缩放旋转） |
| **V4** | 12 张循环 `i % 12`（相邻必不同） | 仅 position | 破批提交压力 | UI 混排（贴图各异） |

锚点：bunny `anchor(0.5, 1)`（原版），fish `anchor(0.5, 0.5)`。

### 1.2 仿真物理参数（bunny-sim.js 固定，复刻 pixijs/bunny-mark 原版）

```
gravity  = 0.75 /帧
speedX   = rand() * 10          speedY = rand() * 10 - 5
边界X：反弹 speedX *= -1 并钳位；顶部：speedY = 0 钳位
底部：speedY *= -0.85；50% 概率 speedY -= rand() * 6
初始位置 x = (count % 2) * 1280（规格统一 1280；原版 800 随 bounds 传入）
按帧推进（不用 dt），三引擎一致
```

### 1.3 数量档位（fixedRun 固定采样）

| 档 | 精灵数 | 负载定位 | 依据 |
|---|---|---|---|
| L1 | **1,000** | 轻（MMO 日常同屏量级） | 大话类同屏角色+飘字常态 |
| L2 | **5,000** | 中（活动/多人同屏） | — |
| L3 | **10,000** | 重（业界标准档） | js-game-rendering-benchmark 标准量 |
| L4 | **20,000** | 极限压力 | 压出引擎间差异 |

每档协议：**预热 3s + 采样 10s**（约 600 帧样本），输出 p50/p95/p99。

### 1.4 阶梯压测（rampRun）

```
起始 1,000 → 每 2s +1,000 → 帧时 EMA > 18.18ms（55fps 阈值）持续 2s 停
maxStableCount = 终止时数量 − 1,000（回退最后一步）
上限 200,000
```
精度说明：结果粒度 ±1,000；V4 等重负载可改 stepCount=500 换精度。

---

## 2. 2D 水族馆 Boids（三引擎 × 2 后端）

### 2.1 场景定义

- 5 鱼种按原版 `g_fishTable` 轮换分配（SmallFishA/MediumFishA/MediumFishB/BigFishA/BigFishB），贴图用前 5 张 rabbit 变体图（26×37，同 bunny 一套资源，保证纯变换差异）
- 运动：原版参数化时钟模型（Lissajous 轨道），逐鱼独立，无邻居力
- 朝向：`atan2(nextPos - pos)`，next 超前采样 clock−0.04（原版同参）
- 输出：position + rotation（每帧）——考察"旋转 + 5 纹理混合"下的合批

### 2.2 鱼群参数（boids-sim.js FISH_TABLE，移植自 webglsamples aquarium.js L135-219）

| 鱼种 | speed | speedRange | radius | radiusRange | heightOffset | heightRange |
|---|---|---|---|---|---|---|
| SmallFishA | 1 | 1.5 | 30 | 25 | 0 | 16 |
| MediumFishA | 1 | 2 | 10 | 20 | 0 | 16 |
| MediumFishB | 0.5 | 4 | 10 | 20 | -8 | 5 |
| BigFishA | 0.5 | 0.5 | 50 | 3 | 0 | 16 |
| BigFishB | 0.5 | 0.5 | 45 | 3 | 0 | 16 |

时钟默认：fishSpeed=1, fishOffset=0.1, fishXClock=1, fishYClock=0.556。

### 2.3 数量档位

| 档 | 鱼数 | 说明 |
|---|---|---|
| L1 | **100** | MMO 场景生物常态 |
| L2 | **500** | 密集区域 |
| L3 | **1,000** | 重负载 |
| L4 | **2,000** | 极限 |

ramp：起始 100 → 每 2s **+200** → 同判定停。协议同 1.4。

---

## 3. 3D 水族馆（Cocos / Laya 两引擎 × 2 后端）——待建

### 3.1 场景定义

- 资源：原版 webglsamples aquarium 的 5 鱼种 3D 模型（JS 内嵌顶点）+ 漫反射贴图（`*_DM.jpg`）+ 法线贴图（`*_NM.png`），路径 `aquarium/aquarium/assets/`
- 环境：原版水族箱场景（Arch/地面/宝箱等静态模型），固定光照（原版 3 点光）
- 相机：固定位置与朝向（复刻原版 aquarium.html 默认视角），禁止运行时交互
- 鱼运动：与 2D boids 同款时钟模型，投影到 x/z 平面（3D 版 Lissajous），朝向 `atan2` 绕 Y 轴
- 动画更新：position + rotation 每帧（与 2D 变换压力同源）

### 3.2 数量档位（3D 负载重，档位低于 2D）

| 档 | 鱼数 | 说明 |
|---|---|---|
| L1 | **50** | — |
| L2 | **100** | — |
| L3 | **200** | — |
| L4 | **400** | 极限 |

ramp：起始 50 → 每 2s **+50** → 同判定停。

### 3.3 3D 专属指标

- **三角形数/帧**：Cocos `tricount` / Laya `CT_Triangle`（进核心对比，两引擎都有官方计数）
- drawCall opaque/trans 细分（Laya）：仅参考
- 渲染分时：仅引擎内 WebGPU vs WebGL 自比

---

## 3.5 骨骼动画场景（三引擎 × 2 后端）——资源已备，待建

> MMO 第一大 CPU 开销（蒙皮计算 + 动态顶点上传），且三引擎蒙皮路径（CPU/GPU/WASM）与合批策略差异巨大——选型关键数据。

### 3.5.1 资源（已复制到 `bench/assets/spine-scene/`）

| 资源 | 用途 | 动画 |
|---|---|---|
| `bg.jpg`（1024×576，大话西游战斗场景 1327 裁剪） | 场景底图（静态 1 张，drawCall+1，模拟真实底图开销） | — |
| `spineboy-ess`（Spine 官方标准角色） | S1 主模型，业内可比 | death/hit/idle/jump/run/shoot/walk |
| `vx_role_*` × 8（狐美人/虎头人/逍遥生等大话西游真实角色） | S2 混合模型 | loop |
| `SP_Jellyfish` / `tank` | 备用（水母呼应水族馆/tank 重负载） | — |

Spine **3.8.97** 二进制格式（.skel/.atlas/.png/.json 四件套），三引擎运行时均支持。

### 3.5.2 变体定义

| 变体 | 模型策略 | 动画策略 | 考察能力 | MMO 对应 |
|---|---|---|---|---|
| **S1** | 全部 `spineboy-ess` | 全部播 `walk` | 同骨架合批上限 + 蒙皮计算 ×N | 同类怪海 |
| **S2** | 8 种 `vx_role_*` 轮换 `i%8` | 全部播 `loop` | 多骨架纹理混合 + 破批压力 | 混编玩家/NPC 同屏 |
| **S3** | 全部 `spineboy-ess` | 7 种动画轮换 `i%7`（walk/run/idle/…） | 动画状态混合开销 | 玩家各异动作 |

### 3.5.3 数量档位（蒙皮+顶点上传重，档位最低）

| 档 | 角色数 | 参考量级 |
|---|---|---|
| L1 | **20** | MMO 常态同屏角色 |
| L2 | **50** | 活动场景 |
| L3 | **100** | 重负载 |
| L4 | **200** | 极限（帮战/世界 BOSS） |

ramp：起始 20 → 每 2s **+20** → 同判定停。

### 3.5.4 布局与运动

- 背景：`bg.jpg` 铺满 1280×720（静态，cover 缩放）
- 角色：网格布局（避免重叠遮挡），根节点轻微位移（walk/run 配 ±x 摆动，幅度 20px），**主要负载来自骨骼动画本身**
- 缩放：角色统一 0.5×（spineboy 原尺寸适配 720 高度）
- 时间推进：引擎 spine 运行时自带动画时钟，**统一倍速 1.0**（三引擎必须一致）

### 3.5.5 三引擎适配要点（实现差异=考察对象）

| 引擎 | Spine 运行时 | 关键差异点 |
|---|---|---|
| Egret 自研 | `egret-spine`（+ spine-wasm） | WASM 蒙皮；每角色 drawCall 数待实测 |
| Cocos 3.8 | 内置 `spine` 模块（spine.Skeleton） | GPU 蒙皮；合批策略待实测 |
| LayaAir 3.4 | `laya.spine.js` | 蒙皮路径待实测 |

适配器仍实现 BenchRunner 契约（init/setCount/step/readDrawCalls/nodeCount），复用 sim-core 帧时采集。

### 3.5.6 额外采集字段

- `skinnedVerts`（蒙皮顶点总数/帧 = 角色数 × 单模型顶点数）：负载归一化基数（需在适配器里静态记录单模型顶点数）
- drawCallAvg 重点看：**同骨架多实例是否共享 drawCall**（引擎合批能力的分水岭）

---

## 4. 指标采集规格（每"引擎×场景×后端×档位"组合一份 JSON）

### 4.1 采集协议

```
预热 3s（JIT/纹理上传隔离）→ 采样 10s（≈600 帧）
帧时：performance.now() 差值（sim-core 统一，>1000ms 异常帧，GPU 字段待补）

```json
{
  "meta": { "engine": "egret|cocos|layaair", "variant": "V1|V2|V3|V4|boids|boids3d",
            "backend": "webgl|webgpu", "mode": "fixed|ramp", "count": 10000 },
  "nodeCount": 10000,
  "drawCallAvg": 12.3, "drawCallMax": 45, "drawCallSamples": 600,
  "frames": 600, "fps": 60.0,
  "p50": 16.12, "p95": 16.51, "p99": 18.20,          // ms，核心
  "overBudgetPct": 1.2,                                // >16.7ms 帧占比
  "jsHeapMB": 45.2,
  "tris": 123456,                                      // 仅 3D
  "maxStableCount": 15000,                             // 仅 ramp
  "userAgent": "...", "timestamp": 1725000000000
}
```

### 4.3 三引擎 drawCall 采集口径（已源码验证）

| 引擎 | API | 引擎侧窗口 | 我们的统计 |
|---|---|---|---|
| Egret | `getPerformace().drawCall`（需先 `startGetPerformance(1000)`） | 1s 均值 | 采样期再平均 |
| Cocos | `director.root.device.numDrawCalls` | 当帧值（帧首重置） | 每帧读上一帧值，采样期平均 |
| Laya | `CT_2DDrawCall`（2D）**+** `CT_DrawCall`（3D） | 1s 均值（endFrameLogic） | 采样期再平均 |

统一语义：**采样期平均每帧 drawCall**。注意 Laya `CT_2DDrawCall` = 合批后渲染元素数（引擎官方口径）。

---

## 5. 执行矩阵（总工作量核算）

### 5.1 核心矩阵（必跑）

| 块 | 组合数 | 明细 |
|---|---|---|
| 2D fixed | 3 引擎 × 5 场景 × 4 档 × 2 后端 = **120** | V1-V4 + boids |
| 2D ramp | 3 引擎 × 5 场景 × 2 后端 = **30** | — |
| 3D fixed | 2 引擎 × 4 档 × 2 后端 = **16** | boids3d |
| 3D ramp | 2 引擎 × 2 后端 = **4** | — |
| 骨骼 fixed | 3 引擎 × 3 变体(S1-S3) × 4 档 × 2 后端 = **72** | S1/S2/S3 |
| 骨骼 ramp | 3 引擎 × 3 变体 × 2 后端 = **18** | — |
| **合计** | **260 组** | 每组 ≈ 13s → 纯执行 ≈ 56 分钟/轮 |

### 5.2 精简矩阵（时间紧时的最小可信集）

- V1 + V4 + boids × L2/L4 档 + S1 + S2 × L2/L4 档 × 2 后端 ≈ **64 组（14 分钟）**

### 5.3 每轮环境核对清单（toji.dev 方法论）

```
□ WebGL 与 WebGPU 的 adapter/renderer 信息一致（双 GPU 笔记本陷阱）
□ antialias 关闭、分辨率/DPR 一致、canvas 1280×720 固定
□ 同浏览器同版本、关插件、插电、性能模式
□ 三引擎同一套 sim-core 与贴图
□ 先 WebGL 后 WebGPU，中途不改任何代码
```

---

## 6. 结果呈现（dashboard 汇总规则）

1. **绝对性能表**：行=引擎，列=场景×后端，值=p95（帧时）——越小越好
2. **容量表**：maxStableCount 柱状对比（"能扛多少"）
3. **WebGPU 加速比表**：`p95_webgl / p95_webgpu` 每引擎一个数（引擎内自比，控制变量）
4. **drawCall 合批效率表**：drawCallAvg @ 同档位
5. 3D 加一张 **三角形数 vs 帧时** 散点（看 GPU bound 转折点）

---

## 7. 与现状的差异（待办）

| # | 项 | 状态 |
|---|---|---|
| 1 | cocos/laya 适配器 bounds 固定 1280×720 | ✅ Cocos `setDesignResolutionSize(1280,720)` + Laya `setScreenSize(1280,720)` 已改 |
| 2 | antialias:false（三引擎 WebGL 上下文） | ✅ Egret 默认关（源码确认 `egret.web.js:5468`）；Cocos 顶层设 `macro.ENABLE_WEBGL_ANTIALIAS=false`；Laya `Config.isAntialias=false` |
| 3 | GPU 信息记录（WebGL debug_renderer_info / WebGPU adapter.info） | ✅ `captureGpuInfo()` 已加进 stats.js，bench-runner 两模式调用，JSON 输出 gpuVendor/gpuRenderer，三份 sim-core 已同步 |
| 4 | Laya 视口固定（stage 大小不受窗口影响） | ✅ `setScreenSize(1280,720)` + `SCALE_NOSCALE` |
| 5 | 3D 水族馆（两引擎适配器 + 模型管线） | ❌ 全新开发 |
| 6 | Egret WebGPU 入口（fish-demo1 方案：dist 产物 + renderMode:'webgpu'） | ❌ 待接 |
| 7 | Cocos WebGPU 切换（renderMode=4 或构建选择） | ✅ 后端按 navigator.gpu 自动探测（原硬编码 webgl2 已改） |
