# WebGPU 实例层优化与基准测试经验总结

> 场景：MC（MovieClip 帧动画）角色基准，WebGL 原版 vs 自研 Egret WebGPU（P2R 持久槽实例化通道）。
> 结论：**世界矩阵两级缓存**优化后，WebGPU 实例层 render CPU **-60%**，maxStable **3630/3680 vs WebGL 2370（+55%）**，drawcall 恒 2 vs 7000+。

---

## 1. 优化本体：世界矩阵两级缓存

### 推导

角色 = body/head/weapon 三层 MovieClip，全部直接挂在 characterRoot 下。利用矩阵结合律：

```
concat(dp) = concat(layer) ∘ lm(dp)        （lm = dp.$getMatrix()，父链相同）
world(dp)  = root ∘ concat(dp)
           = (root ∘ concat(layer)) ∘ lm(dp) = rw ∘ lm(dp)
```

- **每帧只调 1 次** `layer.$getConcatenatedMatrix()`（父链遍历），得 `rw = root ∘ concat(layer)`
- 每个 MC 只做 **6 次乘法 + 4 次加法**（`_composeWorld(w, lm, rw)`），`$getMatrix()` 返回持久对象、零分配
- 彻底消除逐 MC 的 concat 调用（CPU profile 显示其占 render **33%**，是第一热点）

代码位置：`bench/opt-www/webgpu-dist/egret-bridge.js` → `_drawBatchedSpriteLayer` / `_composeWorld`；
`sprite-channel.js` → `mirrorSprite` 改 12 参（桥接层预合成世界矩阵直写 slot）。

### 效果（同页 A/B 交替实测，消除环境漂移）

| 档位 | 快路径 | 逐对象（旧） | speedup |
|------|--------|-------------|---------|
| 2080 | 2.90ms (p95 4.7) | 7.30ms (p95 14.2) | **2.52×** |
| 3200 | 5.80ms (p95 7.5) | 15.70ms (p95 18.9) | **2.71×** |

p95 同步大降——之前 frametime 分解发现超时帧 **78% 是 render 重帧**（GC 仅 0.6%，writeBuffer/flush 仅 0.2ms），根源就是 concat 调用毛刺。

### 端到端（capacity-ramp，wg-first/gl-first 各复现）

| 轮次 | WebGL | WebGPU | 说明 |
|------|-------|--------|------|
| r11（wg-first） | 臂崩（页面 404） | **3630** | 4096 档也 pass（render 3.27ms） |
| r12（gl-first） | 2370（先跑最利好） | **3680**（后跑最不利） | **+55.3%** |

两轮独立复现 3600+，WebGL 历史最好 2640 也被超 39%。提升幅度（55%）远超环境噪声（±21%），结论稳定。

---

## 2. 引擎语义关键事实（Egret 5.4.1 源码级）

读 `egret-lib/egret.js` 确认，这些假设是优化正确性的地基：

1. **`$getConcatenatedMatrix`（1163-1190）**
   - 缓存按 `$GlobalFrameID`，帧内首次调用重算，无参调用 = 命中缓存、无分配
   - `out = 父链.concat ∘ self.$getMatrix()`（1174，`$preMultiplyInto` 第二参在前）→ **行向量右乘约定**
   - 尾部对 **anchor offset**（1179-1180）与 **$scrollRect**（1182-1184）后乘 `-offset` 平移修正——快路径必须防御这两个修正
2. **`$getMatrix`（1115-1124）**
   - `$matrixDirty` 时 `$updateScaleAndRotation` 全量重建 a-d；tx/ty 每次从 `$x/$y` 刷新；返回**持久对象零分配**
   - 新鲜度语义与引擎 WebGL 渲染相同 → 与原路径完全等价
3. **MovieClip 帧动画位移在 `offsetPoint`，不进矩阵** —— 三层 concat 恒等的根因（`main.js:205-209`：每角色无条件 3 层、x/y 相同、连续 addChild）
4. `anchorOffsetX` 默认 0，`$getAnchorOffsetX`（1756）是轻量字段读（percentAnchor 才走 `$getWidth()`）

### 快路径等价防御条件（缺一即回退逐对象 concat）

```js
dp.$parent === layer && !dp.$scrollRect
  && !dp.$anchorOffsetX && !dp.$anchorOffsetY
  && !dp.$percentAnchorOffsetX && !dp.$percentAnchorOffsetY
```

---

## 3. 正确性验证方法（不靠肉眼）

1. **slot 对拍**：diag 里同时取「slot 里实际写入的 6 个矩阵分量」与「引擎独立算出的 `charLayers[0].concat`」，逐位比对（含 `a=-1` 翻转角色这种非平凡变换）。多次采样多档位全吻合。
2. **同页 A/B 交替**：monkey-patch 开关（`renderer._useLayerConcat`），每 2s 切换快路径/旧路径，各采 6 窗、丢前 25% 过渡样本，比中位数。**环境漂移对两模式均摊**，比值可归因——比背靠背两臂可信得多。
3. **CPU profile 定位热点**（CDP Profiler）：`$getConcatenatedMatrix` 33% → 优化后应归零；GC 占比 0.6% → 排除 GC 假说；flush 0.2ms → 排除 writeBuffer fence 假说。**先分解再动手，不要猜**。
4. **帧时间分解**（每帧记录 `dt / render / flush` 三元两个假说。

---

## 4. 测量学教训（本机踩过的坑）

1. **p95 临界判据 + 噪声 = 胜负翻转**。`stable = p95≤20 && p99≤35`（bench-runner.js:314），临界档 p95 全挤在 19.2~20.6，±3% 噪声即翻转。单轮 maxStable 不可作结论。
2. **臂顺序偏差**：capacity-ramp 的 render 随 run 时间单调漂移（后跑臂系统性慢 30%+；同一臂因跑序差 500 角色）。r4-r8 全是 gl-first → WebGPU 被系统性低估。**已给 compare-mc-final.js 加臂顺序轮换参数**，多轮取对称样本。
3. **同轮内时间漂移**：人数递减 render 反递增（2220 档 8.25ms > 2080 档 3.79ms）——是 run 内时间效应，不是代码。轮内档位越多污染越重。
4. **环境 GPU 争用**：开发机常驻几十个浏览器进程，gpuMs 偶发 8-15ms 尖刺打爆 p95。r5/r7 的反常轮均源于此。要定论先清负载。
5. **绝对值不可跨轮比，比值可以**：A/B 交替或同轮两臂的**相对值**才是可信量。
6. **diag 与 compare 环境 不同**：diag 页面有 CDP 开销，render 绝对值偏高；以 compare 曲线与 A/B 比值为准。
7. **先排除 GC 再怪 GC**：`(garbage collector)` 在 profile 里只有 0.6%，直觉假设（GC/writeBuffer fence）全部被数据否掉，真凶是 concat 调用。
8. **heap 差异不是泄漏**：diag-heap（--expose-gc 强制回收）证明两通道幸存堆增长几乎相同；compare 里的 heap 差异是容量 ramp 增删角色的瞬态。

---

## 5. dist 快照还原问题（重要）

`bench/web/dist/` 会**周期性恢复到某时点快照**（本次为 17:12 状态）：保留原 mtime、回滚已编辑文件、删除新增文件/目录。导致 3 次优化写入被吞、`webgpu-dist-opt/` 整目录与 `index-opt.html` 被删，并制造了「A/B speedup 归 1」的假象（页面加载到旧代码，patch 开关对旧代码无效）。

**对策（已落地）**：
- 优化资产移到 **dist 外**：`bench/opt-www/webgpu-dist/`（新版 bridge/channel）+ `bench/opt-www/index-opt.html`；serve 路由加 `opt-www/` 前缀映射与回退链（opt-www → egret-mc → DIST）
- 重建脚本：`node bench/setup-opt-www.js`（幂等，含 VERIFY 校验，从 dist 复制其余文件并注入新版 bridge/channel）
- **未决**：还原源未查明（疑似另一会话/工具的 checkpoint 回滚）。确认后把优化合回 `webgpu-dist/` 正式路径，删除 opt-www 隔离层。

**教训**：dist 类"生成物"目录不要直接手工改；任何 A/B 实验前先 `findstr` 确认目标代码特征行真实存在（本次 speedup=1.0 与 1.03 两次假象均源于此）。

---

## 6. 全部 12 轮 compare 数据（优化前后）

**优化前（角色级共享矩阵版或旧版）r4-r10**：

| 轮 | 臂顺序 | WebGL | WebGPU | 提升 |
|----|--------|-------|--------|------|
| r4 | gl-first | 2320 | 2560 | +10.3% |
| r5 | gl-first | 2140 | 2080 | -2.8%（GPU 尖刺轮） |
| r6 | gl-first | 1960 | 2060 | +5.1% |
| r7 | gl-first | 2640 | 2200 | -16.7%（WebGL 异常好） |
| r8 | gl-first | 2200 | 1680 | -23.6%（后跑臂恶化最深） |
| r9 | wg-first | 1710 | 1960 | +14.6% |
| r10 | wg-first | 2190 | 2080 | -5.0% |

→ 分布完全重叠（WebGL 中位 2190 / WebGPU 2080），端到端测不出显著差异。

**优化后（layerConcat 两级缓存，资产在 opt-www）r11-r12**：

| 轮 | 臂顺序 | WebGL | WebGPU | 提升 |
|----|--------|-------|--------|------|
| r11 | wg-first | （臂 404 崩） | **3630** | — |
| r12 | gl-first | 2370 | **3680** | **+55.3%** |

关键 render CPU 对比（r12）：2080 档 WebGPU **1.73ms** vs WebGL 3.39ms（-49%）；4096 档 WebGPU 也仅 3.8ms。

---

## 7. 工具资产清单

| 文件 | 用途 |
|------|------|
| `bench/opt-www/` | **优化版资产**（dist 外，隔离还原）；`setup-opt-www.js` 重建 |
| `bench/compare-mc-final.js` | 两臂承载力对比；`argv[3]` 臂顺序（gl-first/wg-first） |
| `bench/diag-p2r.js` | 通道状态/slot 对拍/charLayers；`argv[3]` 可传完整 URL |
| `bench/diag-ab-lc.js` | layerConcat 开关同页 A/B |
| `bench/diag-frametime.js / -2.js` | 帧时间分解（v2 含 render/flush 分离） |
| `bench/diag-cpu-profile.js` | CDP CPU 热点 + GC 占比 |
| `bench/diag-heap.js` | --expose-gc 幸存堆增长（泄漏判定） |
| `bench/results/mc-final-r*.log` | 12 轮原始日志 |

## 8. 遗留 TODO

1. **查明 dist 快照还原源**（另一会话 checkpoint？同步工具？），处理后将优化合回 `webgpu-dist/` 正式路径并删除 opt-www 隔离层
2. OpenSpec 归档：`optimize-webgpu-instance-cpu` 结果写入（render CPU -60%、maxStable +55%、drawcall 2）；`add-webgpu-instanced-sprite-channel` 同步
3. 可选：判据升级（p95 多窗取中位）进一步压测量方差；`通道校验 0/N` 报告 bug（meta.channel 取样时机）不影响判定，顺手修
4. 可选 GPU 侧：3200+ 实例后 gpuMs 2-5ms，fillrate 逐步成为第二瓶颈（FS switch 采样 32 图集可评估 texture_2d_array）
