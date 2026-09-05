# 引擎基准测试 · 经验总结与踩坑集

- 项目：LayaAir 3.4.0 vs Cocos Creator 3.8.8 · 3D 水族馆承载力基准
- 配套结论报告：`bench/LAYA-VS-COCOS-VERDICT.md`（本文件只记方法论与坑，不重复数据）
- 日期：2026-09-05

---

## 一、公平性设计（测出来的差距必须站得住）

1. **变量清单化**：同 GPU、同浏览器会话、同分辨率、同 DPR、同判定门槛，缺一不可。
   - 本轮曾因分辨率不一（1365×911 vs 1920×911）导致数据不可比，最后以"同会话双臂复测"为最终锚点。
2. **稳定/掉帧门槛必须切在语义上**，不要切在噪声带里：
   - 稳定 = `fps≥55 && p95≤20ms`（60Hz vsync 语义：95% 帧最多丢 1 拍）
   - 硬掉帧 = `fps<45 || p95≥35ms`
   - 旧门槛 `p95≤18.2` 正好切在 ±2ms 抖动带里，同档位跨次运行判定翻转。
3. **防抖三件套**：首判掉帧加倍预热重测一次；连续 2 档未达稳定才进细扫；临界点 +500 细扫提分辨率。
4. **负载上升后不允许"恢复稳定"**：若出现"掉帧后某档又稳定"，说明是 GC/调度污染，整轮 `invalidCurve` 作废，不产结论。
5. **换档尖峰要识别**：`setCount` 一次性重建 10 万节点有 fps=6-13 的尖峰（一次性 JS 成本），预热窗口能吸收；不能把尖峰当稳态衰减。

## 二、差距定位方法论（"dc 反证法"最有效）

**决策性论证**：Cocos 13000 鱼 `dc=120` 却掉帧到 37fps；Laya 100000 鱼 `dc=369` 却满帧。
→ **draw call 数量与性能无关**（Cocos 更少反而更慢）→ 排除 GPU、排除合批故障 → 瓶颈锁定"每帧为每个实例组织渲染数据的 CPU 提交成本"（Cocos 单线程 JS O(N) vs LayaX 原生层解耦）。

配套对账手段：
- **instancing 生效判定**：dc 增量 ≈ 鱼数/批上限（Cocos 13000÷1024≈13 批，实测 +12 吻合）。
- **全量提交判定**：三角形计数器随鱼数线性、无封顶；场景图节点数 = 2×鱼数+环境，逐档精确对账。
- **cpuSimMs 恒定**（0.02-0.04ms）→ 排除我们自己的仿真逻辑。

## 三、证据链经验（探针的能与不能）

1. **JS 侧原型钩子对"原生层提交"架构性失明**：LayaX 渲染提交在 native（`conchLayaX*` FFI），hook `GPURenderPassEncoder.prototype` 只能看到 JS 侧零星提交（每帧 ~9-10 个环境/杂项）。
   - **教训：对原生管线，以引擎原生统计（statAgent）为准，JS 钩子只作旁证。**
2. **发布版压缩产物的枚举可能漂移**：statAgent 高位枚举序与仓库源码可能不一致 → 只用"随负载线性且恒定增量"的趋势证据，不咬死单位。
3. **WebGPU adapter 存在 ≠ 可用**：`navigator.gpu` 有但 `requestAdapter()` 返回 null（虚拟显示器）→ renderMode=4 静默回退 WebGL → "两臂数据一样"。必须逐档聚合 `actualBackend`，两臂都打 `gfxAPI` 到控制台/结果 JSON。
4. **Cocos WebGL `numDrawCalls` 恒 0**：靠 hook `drawElements/drawArrays/Instanced` 计差分（`__ccGlProbe`）；WebGPU 臂走 `device.numDrawCalls`。

## 四、三次结论反转的教训（每次都有文件级根因）

| # | 当时的错误结论 | 真实根因 | 教训 |
|---|---|---|---|
| 1 | "LayaX 不支持自定义 Shader → 白模" | build.js 派生时漏拷 `aquarium/*.shader` → 404 回退白模 | 先查资源 404，再怀疑管线 |
| 2 | "LayaX 只画了 1.7% 的鱼，数据作废" | 遮挡剔除默认开 + 假 AABB 误剔；`_enableInstancing` 未开 + `canDynamicBatch` 引擎级恒 undefined | 三层失真源要逐层排除（见 VERDICT §3.5） |
| 3 | "Cocos 50 鱼=51 draw，instancing 坏了" | 旧 fixed 数据误读；ramp 真数据显示 50→6400 dc 几乎不变 | 单点数据不下结论，看随负载的曲线 |

**元教训：每次结论反转都是"用一个证据代替了完整证据链"。** 结论前先问：有没有反例数据？有没有第二条独立证据路径？

## 五、产物热补工程经验（build.js 对 IDE 构建产物做字符串手术）

1. **字符串匹配必须考虑压缩产物形态**：
   - 引号风格：TS 源码单引号 → 编译产物可能是双引号（`get('auto')` 搜不到，`get("auto")` 才是真相）。
   - 类名/变量名混淆：`gfxAPI===6?'webgpu'` 的判定在产物里类名是压缩名（`s.backend/a.root`），且**可能有两份副本**（CocosBench3D + FishBench3D）→ 必须正则全量替换，只匹配其一必漏。
2. **热补要带自检与告警**：needle 找不到时打 `[warn] 未找到 xx（bundle 模板变更?）`，否则补丁静默失效、数据带病发布。
3. **补丁幂等**：注入前先 `includes()` 检查，防重复注入（探针/shim 二次叠加）。
4. **jsList 缓存击穿**：浏览器磁盘缓存会让 iframe 子资源停在旧版 → 文件 URL 加 `?v=构建时间戳` 强制重拉。
5. **业务代码位置先确认再动手**：Laya 产物业务逻辑在 `js/bundle.js`（引擎库在 `libs/*.js`），Cocos 在 `assets/main/index.js`；库级缺陷（如 `_canBatch`）要补在 `libs/laya.webgpu_3D.js`。

## 六、自动化基准工程经验（总控 iframe 驱动）

1. **iframe 链路三要素**：URL 参数驱动（`?auto=1&mode=ramp`）→ 结果设置 `window.__benchLastResult` → 总控轮询读取。每轮新建 iframe，防上一轮残留结果串场。
2. **Laya 不走 exportJSON、直接设 `__benchLastResult`**（更干净，避免 save-server/剪贴板副作用）；Cocos 走 `exportJSON`（它开头就设 `__benchLastResult`，本地保存服务失败不阻塞链路）。
3. **"覆盖"语义要讲清**：localStorage 按 `engine+backend+variant+count` 去重只留最新是**设计**；4 臂标识互不相同不会互覆盖，同臂重跑只更新该臂。
4. **超时按前台时间累计**：后台标签 rAF 冻结，测试无法推进 → 用"前台累计时长"判超时并警告用户回前台。
5. **forEach 里 return = continue 外层回调**：遍历构建队列时 `return` 会跳过整个引擎，语义应为 `continue`——检查队列传参依赖下拉框状态的旧逻辑时尤其容易漏。

## 七、外部检索经验（找佐证 vs 找真相）

1. 公开渠道**没有** Cocos vs Laya 3D 同场景正交对比（唯一相关是 2021-22 WX3DPhysicsTest 物理对比，已过时）。没有 ≠ 结论错，但**汇报必须声明空白**，不能让听众以为有行业先例背书。
2. 可用的间接佐证：
   - LayaAir 官方：1473 万三角形 / 5184 dc 场景 WebGPU 较 WebGL +20-25%（RTX3090）；官方示例含 Render Bundle + Indirect Draw GPU 剔除、Compute Shader。
   - 通用事实：100k 同构物体 instancing = 1 dc（Three.js 官方示例）→ 反证 GPU 侧都该轻松，差距只能在 CPU 提交侧。
3. **诚实边界写进报告**：LayaX 为未公开实验管线、CT_Triangle 单位未定、vsync 上限掩盖真实余量、长时稳定性未测——可证伪路径（Spector.js/Nsight/更高数量/原生端对照）单列一章。

## 八、快速排查清单（下次遇到"数据不对"按序过）

1. 资源 404？（shader/纹理漏拷 → 白模/黑屏）
2. 实际后端与请求后端一致？（gfxAPI=8、adapter 非空、逐档聚合）
3. instancing 真开了？（dc 不随数量线性；材质用 `setSharedMaterial` 不克隆）
4. 剔除是否在全量口径？（遮挡剔除默认开、假 AABB、`frustumCulling` 两侧对齐）
5. dc 反证：dc 与性能是否同向？不同向 → CPU 提交侧
6. 门槛是否切在噪声带？（fps≥55/p95≤20/硬 45|35 + 重测 + 防抖）
7. 分辨率/DPR/会话是否一致？（不一致的数据只能看趋势不能比绝对值）
8. 产物补丁真生效了？（构建日志无 `[warn]`、产物 `includes` 自检、`?v=` 缓存击穿）
