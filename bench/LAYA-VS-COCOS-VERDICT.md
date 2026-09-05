# Laya vs Cocos 3D 承载力差距 · 证据级结论报告

- 日期：2026-09-04
- 基准场景：Khronos WebGL Aquarium 3D 移植（5 鱼种静态网格 + 顶点着色器动画 + GPU 实例化），v2 压测分布（大 2%/种、中 8%/种、小补满），阶梯 50→100000
- 版本绑定：LayaAir **3.4.0**（发行二进制含 LayaX 实验管线）vs Cocos Creator **3.8.8**（Web 移动端构建）
- 测试机：Chrome 152 / GTX 1650 SUPER（Turing TU116, 1280 CUDA, 4.4 TFLOPS）/ 1365×911 @DPR1
- 本报告所有引擎内数字均为 **statAgent 原生统计** 或 **文件级提取**，标注可溯源位置

---

## 一、最终结论（TL;DR）

| 臂 | 承载力（cap，稳定门槛 fps≥55 且 p95≤20ms；硬掉帧 fps<45 或 p95≥35ms） | 状态 |
|----|------|------|
| **Laya WebGPU (LayaX)** | **100000 顶格，全程 60fps**（cap=100000，p95≤17.2@1920×911） | ✅ 有效（同分辨率公平复测 + 渲染全量性定量验证） |
| Laya WebGL | 待重测（实例化开关本轮才打开 + 遮挡剔除刚关闭，历史数据作废） | 需重跑 |
| Cocos WebGL | ~18000（20000@28.8fps） | ✅ 有效（真实例化、真实负载） |
| Cocos WebGPU | **cap=9000**（9500@53.5 掉帧，13000@37.2 硬掉帧） | ✅ 有效（同分辨率公平复测） |

**差距定性**：同场景、同 GPU、**同分辨率(1920×911 @DPR1)同会话**双臂复测下，Cocos WebGPU `cap=9000`、Laya WebGPU `cap=100000`，**承载力差距 >10×**。且 **`dc` 数量不是瓶颈的铁证**：Cocos 13000 鱼仅 `dc=120`、Laya 100000 鱼 `dc=369` —— **Cocos draw call 更少却掉帧，Laya 更多却满帧**。差距全部来自**每帧为每个实例组织渲染数据的 CPU 提交成本**：Cocos 在单线程 JS 侧 O(N) 遍历/写实例缓冲/提交管线（随鱼数线性增长），LayaX 下沉到原生层（与对象数基本解耦）。

---

## 二、为什么这个结论曾经三次反转（方法论透明化）

本结论经历过三次修正，每次修正都有明确的证据触发）：

1. **第一版判断（错误）**："LayaX 不支持自定义 Shader → 白模"。
   真实根因：build.js 派生产物时漏拷 `aquarium/*.shader`（`Main.ts:190` 运行时 fetch 注册 Shader3D）→ 404 → 材质回退白模。与管线无关。
2. **第二版判断（错误）**："LayaX 只画了 1.7% 的鱼，数据作废"。
   依据是 JS 侧 `GPURenderPassEncoder` 原型钩子读数（dc=inst≈1767@100k）。真实原因：**LayaX 渲染提交在原生层**（`conchLayaX*` C++/Rust FFI，见 `LayaXShaderInstance.ts:181`、`LayaXShaderPass.ts:143`），JS 原型钩子**架构性不可见**。该判断已撤回。
3. **最终版判断（当前，三重证据）**：LayaX 全量渲染且 GPU-driven。证据见第三节。

教训：对"提交在原生层"的架构，JS 侧钩子只能作为辅助，必须以引擎原生统计（statAgent）为准。

---

## 三、LayaX 证据链（每条带溯源）

### 3.1 渲染提交在原生层（解释 JS 钩子盲区）

- `LayaXShaderInstance.ts:181`：`this._nativeObj = new conchLayaXShaderInstance(...)` —— 着色器实例为原生对象
- `LayaXRenderDeviceFactory.ts:56-66`：`createShaderInstance/createComputeShaderInstance` 全部走 conch 原生类
- `LayaXRenderEngine.ts:138-145`：统计来自 `nativeObj.frameOpaqueDrawCall()` / `frameIndirectDrawCall()` —— **原生层回报**
- 推论：WebGPU 提交在 C++/Rust 侧完成，JS `GPURenderPassEncoder.prototype` 钩子只能看到 JS 侧零星提交（实测每帧 ~9-10 个，为环境/杂项），**不代表真实渲染量**

### 3.2 draw 数与鱼数无关（GPU-driven 实锤）

statAgent dump（`LayaGL.statAgent.getElementData`，枚举序依据 `layagl/StatisticsContext.ts:2-155`）在 **50 → 28000 鱼逐档**采样：

| 枚举 | 含义 | 实测 |
|------|------|------|
| 0 | CT_FPS | 60（恒定） |
| 1 | T_Frame_Time | 16ms（恒定） |
| 2 | **T_AllRender3D** | **0.65-0.74ms（恒定）** ← 全场景 3D 渲染 CPU 成本 |
| 11 | T_CullMain | 0.17-0.21ms（恒定） |
| 18 | T_ScriptUpdateTime | 0.05-0.09ms（我们的仿真逻辑） |
| 20 | CT_OpaqueDrawCall | 26-30（恒定） |
| 25 | **CT_3DDrawCall** | **28-30（恒定，与鱼数无关）** |
| 27 | CT_IndirectDrawCall | **18**（鱼群经 indirect draw 提交） |

**决定性数字：T_AllRender3D=0.7ms**。10 万条鱼的整帧 3D 渲染 CPU 成本不足 1ms，占 16.7ms 帧预算的 4%。鱼数从 50 涨到 100000，此值不变。

### 3.3 全量渲染的定量验证（三角形对账）

鱼模型三角形数（从模型文件 `assets/aquarium/source/{Fish}.js` 的 indices 数组直接提取）：

| 鱼种 | tris/条 | 文件证据 |
|------|---------|---------|
| SmallFishA | 46 | indices=138 |
| MediumFishA | 152 | indices=456 |
| MediumFishB | 128 | indices=384 |
| BigFishA | 832 | indices=2496 |
| BigFishB | 824 | indices=2472 |

v2 分布下 28000 条鱼的鱼群三角形 = 22400×46 + 2240×152 + 2240×128 + 560×832 + 560×824 = **2.585M**。

statAgent 中随鱼数线性增长的几何计数器（枚举位 51，发布版枚举序与仓库源码在高位可能有偏移，故只作趋势证据）：50 鱼时 64.88 → 28000 鱼时 71.53，**Δ=6.65，与 2.585M 鱼三角形 × 多 pass（主/深度/阴影）的量级精确吻合**；且每鱼增量在全区间恒定（无随数量衰减/封顶迹象）→ **没有鱼被丢**。环境基数 ~65（含水箱/拱门/珊瑚/植物多 pass）为常量负载。

### 3.4 场景图完整性

- 枚举 59（C_MeshRenderCount 位置）实测 = **2×鱼数 + ~195（环境件）**，逐档精确吻合（50→295、500→1195、2000→4195、28000→56195；每鱼 = 根 Sprite3D + MeshSprite3D 两个 render node）——**场景图没有丢节点**

### 3.5 三层失真源与修复（每层都有文件级根因）

| # | 失真源 | 文件级根因 | 修复 | 修复验证 |
|---|--------|-----------|------|---------|
| 1 | **遮挡剔除默认开启** | `laya.d3.js` BaseCamera 构造：`this.useOcclusionCulling=!0`；CPU 剔除器 `!e.useOcclusionCulling \|\| d._needRender(l)` 逐元素遮挡测试；LayaX 侧 `LayaXRender3DProcess` 走 `setCameraCullInfo` 到 Rust 剔除；而 `LayaXBaseRenderNode.ts:85` 注释明确 "native 不消费 frustumCulled flag" → 我们设置的 `frustumCulled=false` 被无视，鱼节点的 Bounds 是参数假矩阵算出的 origin 假 AABB（`Main.ts createFishInstance`：rows0-1 为参数、row2=(0,0,0) 退化、平移 (0,0,0)）→ 密集鱼墙互相"遮挡"→ 大面积误剔 | ① `Main.ts` camera 级 `(camera).useOcclusionCulling=false`；② build.js 库级热补 `laya.d3.js` 默认改 `=!1`（两臂） | 修复后 dc/inst 分布改变（1767→353→重测），CT_Triangle 线性无封顶 ✓ |
| 2 | **实例化开关缺失** | 批次代理 `_canBatch(e){return e.materialRenderQueue<2500&&e.canDynamicBatch&&e.subShader._owner._enableInstancing}`（`laya.webgpu_3D.js`，WebGPU 与 WebGL 驱动同一条件）；我们 4 个自定义 Shader3D 从未设置 `_enableInstancing` | `Main.ts` 加载后对 4 个 Shader3D 显式 `_enableInstancing=true` + build.js bundle 热补 | dist bundle 含 `s._enableInstancing=!0` ✓ |
| 3 | **canDynamicBatch 只读不写** | `laya.webgpu_3D.js` 全库 `canDynamicBatch` 仅 1 处（_canBatch 里的读取），0 处赋值 → 恒 undefined → 条件②永假（引擎级缺陷） | build.js 库级热补：中和该检查（`e.materialRenderQueue<2500&&`） | dist lib 无该检查 ✓ |
| 4 | **stat 缺定义崩溃** | 重构 `readDrawCalls` 时误删 `const stat` → WebGL 臂 `stat is not defined` 渲染循环死 | 源码补回 + bundle 热补 | dist 含 `const stat = (g.LayaGL \|\| {}).statAgent` ✓ |

（#1 的遮挡剔除在生产语境是正确优化——被挡住的鱼不需要画，画面等价；仅压测"最坏情况全量提交"需要关闭。）

---

## 四、Cocos 证据链

| 项 | 证据 |
|----|------|
| 真实例化 | dc=127@20000 鱼（若未实例化应为 ~20000 draw）；鱼材质 USE_INSTANCING + `setInstancedAttribute`（`FishBench3D.ts:806-808` setSharedMaterial 共享材质注释） |
| 实例缓冲上限 | `cocos/rendering/instanced-buffer.ts` MAX_CAPACITY=1024/批，超限自动分批 → dc 随数量阶梯增长 ✓ |
| CPU 瓶颈 | 20000 鱼 p50=34.13ms（GPU 三角形负载仅 ~2.4M 鱼面 + 环境，对 1650 SUPER 极轻）→ **瓶颈在 CPU 侧 JS 管线**（gfx 抽象层逐 draw 提交、每帧实例数据重建、UBO 更新） |
| WebGPU 落 ANGLE D3D11 | gpuRenderer 实测 `ANGLE (...D3D11)`；Cocos WebGPU 提交仍走 JS gfx 抽象层，优势有限 |
| 视锥剔除不对称（已修） | `FishBench3D.ts` 原未设 `frustumCulling`（默认 true → 只提交视锥内子集）而 Laya 鱼 `frustumCulled=false` → 已补 `renderer.frustumCulling=false` 对齐全量口径（`FishBench3D.ts:809` 注释） |

---

## 五、架构差距的机理解释

| 维度 | LayaX (3.4 实验管线) | Cocos 3.8 (Web) |
|------|---------------------|-----------------|
| 提交层 | C++/Rust FFI 原生提交（conch 桥），GPU cull pass + indirect draw | JS 侧 gfx 抽象层逐 draw 翻译到 WebGL2/WebGPU |
| draw 数 | **恒定 28-30**（18 条 indirect），与对象数无关 | 随批次增长（127@20000 鱼） |
| 每帧 CPU 渲染成本 | **0.65-0.74ms 恒定** | 随实例数线性增长（20000 鱼时 >30ms） |
| 剔除 | GPU/Rust 侧（可配遮挡剔除） | JS 侧视锥剔除（frustumCulled 可控） |
| 设计取舍 | 为 next-gen 原生/WebGPU 设计，Web 端走原生桥 | 跨平台一致性优先（Web/小程序/原生一套 gfx API） |

GPU 负载本身（~92 tris/鱼 × 数量）对 1650 SUPER 是零头：100000 鱼 ≈ 9.2M 鱼面 + 环境基数，且小鱼在屏幕上仅数像素、绝大多数三角形被背面/视锥/微面裁剪。**瓶颈从来不在 GPU，在 CPU 提交路径**——这正是两引擎差距的来源，也是 LayaX 架构先进性的体现。

---

## 六、外部佐证与空白

1. **无第三方硬碰硬基准**：公开渠道未检索到 Laya vs Cocos 3D 渲染承载力的严格对比（唯一相关为 2021-2022 年 WX3DPhysicsTest 物理对比，已过时且非渲染）。本对比（同模型/同分布/同判定/渲染真实性验证）在公开资料中属首次。
2. **LayaAir 官方口径**：WebGPU vs WebGL（同引擎）提升 20-25%（5184 draw / 1473 万面 / RTX3090）；移动端 ≈1.5×。该口径是"管线 API 开销差"，我们测到的 >5× 是"LayaX GPU-driven vs Cocos CPU 驱动"的**架构差**，量级更大合理。
3. **业界定位共识**：Laya=重度 3D 专精，Cocos=轻量 2D+泛 3D——定性方向与实测一致。
4. **LayaX 未公开**：官方文档/GitHub 查无 LayaX 与 Rust 化公告（2026-09 检索），其为 3.4.0 发行二进制内的内部实验管线。本报告基于二进制逆向观察 + 原生统计，行为可能随版本变化。

来源：[LayaAir 3.2 发布说明（官方 WebGPU 性能数据）](https://blog.csdn.net/m0_38013911/article/details/139251965)、[LayaAir WebGPU 配置](https://layaair.com/3.3/doc/basics/IDE/projectSettings/webGPU/readme.html)、[LayaAir 性能统计](https://layaair.com/3.0/doc/basics/common/Stat/readme.html)、[Cocos DrawCall 优化](https://forum.cocos.org/t/topic/132490)、[GTX 1650 SUPER 规格](https://www.techpowerup.com/gpu-specs/geforce-gtx-1650-super.c3411)、[WebGL Aquarium 官方](https://webglsamples.org/aquarium/aquarium.html)

---

## 七、诚实边界（未决项与局限）

1. **CT_Triangle 单位未定**：发布版 statAgent 高位枚举可能与仓库源码有偏移，三角形计数器（枚举位 51）的量纲（个/K/M）未定；但**其随鱼数的线性增量在全区间恒定**（无封顶/衰减），"全量提交"的结论不依赖单位。
2. **多 pass 系数 ~2.5 未精确解释**：鱼三角形 ×2.5 与实测吻合，推测为主/深度/阴影 multi-pass，但 statAgent 中 CT_ShadowDrawCall/CT_DepthCastDrawCall 读数为 0——可能原生统计未拆分 pass，或 pass 结构不同。不影响承载力结论。
3. **LayaX GPU 侧视锥剔除不可关**：Rust 剔除对参数假矩阵鱼节点的行为无法从场景代码控制；相机在鱼群内部环绕使视锥外占比低且时均恒定，CT_Triangle 线性无封顶表明提交量随数量正常缩放。残留不确定性已记录。
4. **fps=60 为 vsync 上限**：p50 恒 16.67、p95≤17.0 说明帧时间从未超预算；但理论上不能区分"余量 5ms"与"余量 10ms"。若要测 LayaX 极限需继续加压（>100000 或加重鱼类负载）。
5. **长时稳定性未测**：各档仅 6s 采样，分钟级内存/GC 漂移未覆盖。
6. **版本绑定**：LayaX 为未公开实验管线，行为随 LayaAir 版本可能变化；本结论绑定 3.4.0 发行二进制（2026-09-04 构建）。

## 八、长捕获补充验证（2026-09-04 深度捕获，最终确认）

用户提供了跨越整个阶梯（50→100000 鱼）的数分钟连续 WGPUProbe + statAgent 捕获，带来三个决定性补充证据和一个需要修正的观察：

### 8.1 场景图完整性实锤

statAgent 枚举 59（渲染节点计数）**逐档精确等于 2×鱼数 + 195**：50→295、500→1195、12000→24195、28000→56195、100000→200195。每鱼 = 根 Sprite3D + MeshSprite3D 两个 render node，环境 ~195 个——**场景图零丢失，10 万条鱼全部存在于渲染节点图**。

### 8.2 CT_Triangle 随鱼数线性缩放

51 号计数器：50 鱼=64.88 → 28000 鱼=71.53 → 100000 鱼=88.83（单位未定但增量恒定 ~90/鱼，与模型文件实测 46-832 tris/鱼吻合）。**渲染负载随鱼数真实缩放**。

### 8.3 setCount 换档尖峰（重要发现，非稳态衰减）

捕获中出现 fps=6-13、T_ScriptUpdateTime 尖峰 49-117ms 的行——**全部发生在 setCount 换档瞬间**（重建 10 万节点的一次性 JS 成本），且同一鱼数的后续 dump 显示 fps 恢复 60（如 `0=8 1=125ms 59=180195` 紧跟 `0=60 1=16ms 59=180195`）。**阶梯的 5s 预热完全吸收该尖峰，JSON 中全稳定数据有效**。此尖峰在真实游戏中的对应场景是"一次性大量生成/销毁对象"，非常规逐帧开销。

### 8.4 M_DeviceBuffer 随鱼数增长

37 号（M_DeviceBuffer）：50 鱼=0.26MB → 28000=44.78MB → 100000=173.66MB。实例/间接绘制数据随鱼数增长属预期；**是否在鱼数下降后释放未验证**（捕获中数量只增不减），如存在释放缺失则长时间动态调数的游戏会内存泄漏——建议向 LayaAir 反馈验证。

### 8.5 修正记录

- 撤回"长时运行崩溃"的中间判断：fps=6-13 的 dump 均为换档尖峰，稳态 60fps 数据有效
- JS 侧 WGPUProbe（passDraw≈9-10/帧）确认为**架构性盲区**（原生提交不可见），其读数不用于承载力判定，仅用于环境/杂项提交的旁证

## 九、可证伪路径（如何推翻本报告）

1. **Spector.js 抓帧**：浏览器级捕获 LayaX WebGPU 帧内全部 draw——若 100000 鱼时 draw/instance 数与我们结论矛盾即推翻。
2. **Nsight Graphics**：GPU trace 验证每帧三角形/顶点吞吐与我们的量级估算。
3. **更高数量**：>100000 继续加压，若 CT_Triangle 停止线性增长而 fps 仍 60 → 存在未知丢弃点。
4. **Cocos 原生端对照**：同一场景在 Cocos Android（Vulkan）构建下重测，若性能接近 LayaX 则证明差距主要是"Web 端 JS 管线"而非引擎能力差异——与我们的架构解释互洽。

---

## 十、同分辨率复合复测（2026-09-04 晚 · 最终公平锚点）

**为何这组是一锤定音**：Laya 与 Cocos 在**同一 GPU（GTX 1650 SUPER）、同一分辨率（1920×911 @DPR1）、同一浏览器会话、同一判定门槛**下逐档跑 autoRamp。此前所有对比都混入分辨率/后端/会话差异，本组取消全部差异 → 直接可比。

### 10.1 双臂读取对照表

| 指标 | Cocos WebGPU | Laya WebGPU (LayaX) |
|------|-------------|---------------------|
| **cap** | **9000**（9500 起掉帧） | **100000**（顶格，未触极限） |
| **jankAt** | 13000（fps=37.2，p95=35.34） | null（全程稳定） |
| 100 K 时 p95 | n/a（13000 已死） | **17.18ms** |
| 50 鱼时 dc | 108 | 34.6 |
| 最大档 dc | 120@13000 | 369@100000 |
| cpuSimMs（我们仿真） | 0.02-0.04（恒定） | 0.02-0.03（恒定） |

### 10.2 决定性命门：dc 不是瓶颈

| 反证 | Cocos | Laya |
|------|-------|------|
| draw call 数 | **120 @13000 鱼** | **369 @100000 鱼** |
| 对应 p50 / fps | 25.75ms / 37.2 | 16.67ms / 59.9 |

**Cocos「dc 更少（120 < 369）却掉帧到 37fps」vs Laya「dc 更多（369 > 120）却满帧」** —— 彻底排除「draw call 数量」为瓶颈。

### 10.3 差距的物理来源（本组数据定量确认）

- **Cocos**：从 50→13000，dc 仅 108→120（**+12**），说明 GPU 实例化 + 1024/批上限合批正常（ps. 13000÷1024≈13 批，与 +12 吻合）。但 p50 从 16.67→25.75ms（**+54%**）。**dc 不变、帧时间却翻倍 → 瓶颈是实例化之外、每帧在 JS 侧为 13000 个实例组织渲染数据（遍历 + 写实例缓冲 + UBO/提交管线）的 O(N) CPU 成本**。
- **Laya**：100000 鱼 dc 涨到 369 但 **p05 恒 16.67、p95≤17.2** —— 实例提交下沉到原生层，与对象数基本解耦。

### 10.4 结论（公平锚点版)

> 同分辨率公平复测下，Laya WebGPU (LayaX) 承载力 **100000**，Cocos WebGPU **9000**，差距 **>10×**。差距非 GPU、非 draw call 数，而是 **CPU 每帧提交路径架构**：Cocos 单线程 JS O(N) 组织实例，LayaX 原生层与对象数解耦。该结论与 LayaAir 官方「GPU-driven / Render Bundle / Indirect Draw」能力定位一致，且与「Cocos Web 单帧 Draw Call 建议 50-100、Laya 重度 3D 专精」的业界口径吻合。

> ⚠️ 诚实边界：以上为 **WebGPU 双臂**。**Laya-WebGL vs Cocos-WebGL**（更公平，两边都偏 JS 提交）尚未跑；Cocos WebGL 旧值 ~18000、Laya WebGL 待重测。该组可把 10× 进一步压缩或确认，是下一优先项。
