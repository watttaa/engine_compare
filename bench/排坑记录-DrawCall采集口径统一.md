# 排坑记录 · DrawCall 采集口径统一（2026-09-02）

> 背景：三引擎基准（BunnyMark V1-V4）测试数据中，DrawCall 数字异常：
> Laya V2/V4 `drawCallAvg=10000`（等于精灵数），Egret WebGL 所有变体 `drawCallAvg=5`，
> 两者都不符合预期。本文记录调查→根因→修复全过程，供后续维护对照。
>
> 修复涉及文件：`bench/web/build.js`、`bench/sim-core/stats.js`、`bench/engines/laya/LayaBench.ts`、`bench/engines/egret/main.js`

---

## 问题一：Laya V2/V4 `drawCallAvg = nodeCount`（10000）

### 症状

- Laya WebGL V1/V3（单纹理）：drawCallAvg=2，正常
- Laya WebGL V2（8纹理）/V4（12纹理）：drawCallAvg=**10000**，等于精灵数
- 已多次修改 `readDrawCalls()` 仍无法修复

### 根因链（三层）

**第一层：`CT_2DDrawCall` 语义误解**

最初 `readDrawCalls()` 读的是 `LayaGL.statAgent.getElementData(StatElement.CT_2DDrawCall)`。
查 Laya 3.4 源码（`WebGLRenderContext2D.ts:62`）：

```typescript
LayaGL.statAgent.recordCTData(StatElement.CT_2DDrawCall, list.length);
```

`list.length` = **合批后的渲染元素数**，不是 GPU drawcall 数。

**第二层：多纹理场景合批失败**

查 `WebGraphicsBatch.ts:isCompatible`：

```typescript
let elementTexId = element.textureKey & (~defineMask);
if (elementTexId !== 0 && elementTexId !== this.textureId && this.textureId !== 0)
    return false;  // 不同 textureKey → 不合批
```

V2/V4 相邻精灵纹理不同 → `textureKey` 不同 → 每只精灵单独一个渲染元素 → `list.length = 10000`。

**第三层：Laya 无自动运行时合图**

Egret 有 `TextureAtlasManager`（零配置自动合图），Laya 的 `DynamicAtlasManager` 需要手动调用 `addTexture()`——这不是配置问题，是引擎设计决策。

**结论：`CT_2DDrawCall = 10000` 是 Laya 合批能力上限的真实反映，不是采集代码问题。**

### 修复方案

改用 WebGL API hook（`__layaGlProbe`），与 Egret/Cocos 口径完全一致：

**`build.js` — 在 Laya 产物 `index.html` 注入探针（patch B）：**

注入点选在 `<script type="text/javascript" src="libs/laya.core.js">` 之前。
**不能**用 `c.replace('<script', ...)` ——index.html 里第一个 `<script>` 是 splash screen 内联脚本，嵌套 `<script>` 标签破坏 HTML 解析（同旧 Cocos 排坑记录 Bug5）。

```javascript
// build.js:patch B 关键逻辑
const coreTag = '<script type="text/javascript" src="libs/laya.core.js">';
c = c.replace(coreTag, probe + coreTag);
```

探针 hook：`drawElements/drawArrays/Instanced` + `getExtension` 包装 `multi_draw`。

**`LayaBench.ts` — `readDrawCalls()` 改读 probe，WebGPU 回落 `CT_2DDrawCall`：**

```typescript
readDrawCalls(): number {
    const P = (globalThis as any).__layaGlProbe;
    if (P) {
        const fd = P.frameTotal - P.lastFrame;
        const dd = P.drawTotal - P.lastDraw;
        P.lastFrame = P.frameTotal;
        P.lastDraw = P.drawTotal;
        if (fd > 0 && dd > 0) return dd / fd;  // WebGL：probe 优先
    }
    // WebGPU 后端：probe dd=0，回落 CT_2DDrawCall
    const statEl = g.StatElement || (g.Laya && g.Laya.StatElement);
    if (g.LayaGL && g.LayaGL.statAgent && statEl != null) {
        return g.LayaGL.statAgent.getElementData(statEl.CT_2DDrawCall);
    }
    return -1;
}
```

### 验证

诊断脚本（`diag-laya-probe.js`，用后删除）确认：
- `__layaGlProbe.drawTotal / frameTotal = 1000`（1000只精灵每帧1000次draw）
- probe 工作正常，Laya V2/V4 每帧真的是 nodeCount 次 drawcall

**最终结论：V2/V4 dc=10000 是正确数据，是 Laya 2D 标准 Sprite 在散图场景下的真实性能瓶颈。**

---

## 问题二：Egret WebGL 所有变体 `drawCallAvg = 5`（预期 ≈1）

### 症状

- Egret WebGL V1（单纹理）：drawCallAvg=**5**，预期应为 1
- Egret WebGL V4（12纹理）：drawCallAvg=**5**，与 V1 完全相同
- 1000只精灵时 dc=1，10000只时 dc=5，数量10×但 dc 仅5×

### 调查过程

**第一轮假设：probe 窗口问题（`lastFrame/lastDraw` 未重置）**

统计期开始前 3s 预热中探针持续计数，采样第一帧的 `fd` 窗口覆盖了预热期，可能包含初始化时的额外 draw。

修复尝试：在 `stats.js` 的 prewarm→sampling 切换时调一次 `readDrawCalls()` 重置基准：

```javascript
// stats.js
if (this._elapsed >= this._phaseEnd) {
    this._phase = 'sampling';
    this._elapsed = 0;
    if (this._readDrawCalls) this._readDrawCalls();  // 丢弃预热期积累
}
```

**修复后 dc 仍为 5 → 假设不成立。**

**第二轮：诊断实测**

写 `diag-dc-detail.js`，直接在 `stats.js` 里注入 console 打印每帧 dc：

```
DC_SAMPLE 1 fd_check 0    ← 1000只时每帧1次draw，正确
DC_SAMPLE 5 fd_check 0    ← 10000只时每帧5次draw，稳定
```

**每帧稳定 5 次，不是窗口噪声。** 真实结论：10000 只精灵每帧就是 5 次 `gl.drawElements`。

**第三轮：源码定位**

Egret batcher 的 VBO 大小限制：

```javascript
// egret.web.js:213
this.maxQuadsCount = 2048;  // 每次最多提交 2048 个四边形
```

**10000 / 2048 = ceil = 5。**

这与纹理数量完全无关——所有散图被 `TextureAtlasManager` 打进同一张 Atlas，GPU 看到的只有 1 张纹理，合批不会因纹理切换断裂，断裂的唯一原因是 VBO 装满。

### 最终结论

**dc=5 是正确的数据，不是 bug。**

| 精灵数 | dc | 计算 |
|---|---|---|
| 1000 | 1 | ceil(1000/2048)=1 |
| 5000 | 3 | ceil(5000/2048)=3 |
| 10000 | **5** | ceil(10000/2048)=**5** ✅ |

stats.js 的 prewarm 重置修复虽然对 Egret dc 问题无帮助，但逻辑本身是正确的（消除初始化帧 spike 对均值的干扰），保留。

---

## 问题三：Laya 产物 probe 注入位置

### 症状

若在 `build.js` 里直接用：
```javascript
c = c.replace('<script', probe + '<script');
```

Laya `index.html` 第一个 `<script>` 是 splash screen 的**内联样式/逻辑块**，插入后变成嵌套 `<script>`，HTML 解析报 `Unexpected token '<'`。

### 根因

Laya 3.4 发布产物的 `index.html` 结构：

```html
<body>
  <!-- Splash screen start -->
  <style>...</style>
  <script>/* splash screen 内联 JS */</script>  ← 这是第一个 <script>
  <!-- Splash screen end -->

  <script src="libs/laya.core.js"></script>  ← 这才是引擎入口
  <script src="libs/laya.webgl_2D.js"></script>
```

探针必须在**引擎 GL 上下文建立之前**执行，即 `laya.core.js` 之前。

### 修复

```javascript
// build.js:patch B
const coreTag = '<script type="text/javascript" src="libs/laya.core.js">';
if (c.includes(coreTag)) {
    c = c.replace(coreTag, probe + coreTag);  // 精确定位，不影响 splash
}
```

验证（`dist/laya/index.html`）：
```html
<!-- Splash screen end -->

<script>(function(){...探针代码...})()</script>   ← 第155行，独立完整块
<script type="text/javascript" src="libs/laya.core.js"></script>  ← 第156行
```

同样的陷阱在旧 Cocos 接入时已踩过（参见 2026-08-27 排坑记录 Bug5）。**教训：永远不要用第一个 `<script>` 作为注入锚点，必须找到引擎入口 script 标签。**

---

## 问题四：Egret `bd.url = uniqUrl` 是关键，不能省

### 症状（2026-08-27 遗留）

早期版本 Egret V4 dc 和帧时与 V1 完全一样，以为合批成功。后来才意识到更早期版本里 `texFrom()` 没有设 `bd.url`，导致合图失败（白屏或图片重叠）。

### 根因

Egret `TextureAtlasManager` 用 `bitmapData["uriValue"]` 作 Atlas grid 唯一键：

```javascript
// egret.web.js:13468
var id = TextureAtlasManager.getGirdID(bitmapData["uriValue"]);
```

`uriValue` 是只读 getter，由 `bd.url` 的 setter 派生（仅在 `openAutoBatch=true` 时计算 hashCode）：

```javascript
// egret.js:8821
if (egret.sys.openAutoBatch) {
    this.$uriValue = egret.NumberUtils.convertStringToHashCode(value);
}
```

运行时 `new Image()` 加载的图片，如果不手动设 `bd.url`，`$uriValue` 为 `undefined`，所有散图 hash 相同，Atlas 发生 grid 冲突。

### 修复

```javascript
// bench/engines/egret/main.js:texFrom()
var uniqUrl = source && source.src ? source.src : ('rt_' + (texFrom._seq = (texFrom._seq || 0) + 1));
bd.url = uniqUrl;  // 每张图不同的 url → 引擎 setter 自动生成唯一 uriValue
```

---

## 修复总结

| 问题 | 根因 | 修复文件 | 是否为引擎 bug |
|---|---|---|---|
| Laya V2/V4 dc=10000 | 散图无跨纹理合批能力 | LayaBench.ts、build.js | ❌ 引擎设计决策 |
| Laya probe 注入位置 | HTML 嵌套 script 破坏解析 | build.js | ❌ 注入脚本设计问题 |
| Egret dc=5（1万只） | VBO 2048 quad 上限，5次 flush | — | ❌ 正确行为 |
| stats.js 预热基准 | 预热期 probe 积累未重置 | stats.js | ❌ 采集框架设计问题 |
| Egret bd.url 未设 | uriValue=undefined，Atlas 冲突 | egret/main.js | ❌ 使用方式问题 |

---

## 关键教训

### 教训1：dc 数字需结合引擎机制解读

- Egret dc = **VBO flush 次数**（= ceil(N/2048)，与纹理数无关）
- Cocos dc = **MeshBuffer 批次**（= ceil(N/1000)，与纹理数无关）
- Laya dc = **纹理切换次数**（= 1 if 全同纹理，= N if 全散图）

**三引擎 dc 数不可直接横向比较大小，只能在同引擎内比较不同变体的相对变化。**

### 教训2：`ct` 引擎统计 API 的语义不等于 GPU drawcall

Laya `CT_2DDrawCall`、Egret `getPerformace().drawCall`、Cocos `numDrawCalls` 三者语义各不相同，都不是直接的 WebGL drawElements 调用次数。**只有 WebGL API hook 是三引擎统一可比的口径。**

### 教训3：HTML 注入锚点要用引擎入口 script，不能用"第一个 `<script>`"

Laya/Cocos 的 `index.html` 里第一个 `<script>` 可能是 splash screen、meta、或 preload，不是引擎入口。探针必须早于引擎 JS，应精确定位到引擎第一个 `<script src=...>` 标签。

### 教训4："数据正确"和"符合预期"是两件事

Egret dc=5 看起来不对（预期=1），但源码验证后确认完全正确。Laya dc=10000 看起来是 bug，但也是正确的引擎行为。**在断定采集错误之前，先用诊断脚本确认底层 WebGL 调用次数。**

### 教训5：Laya 散图性能劣势是选型关键数据

V4（12 散图 10000 只）实测：
```
Egret p50=17ms  fps=60   dc=5
Cocos p50=16.68ms fps=58.9  dc=10
Laya  p50=33ms  fps=29.8  dc=10000  ← 帧时 2 倍差距完全来自高 dc
```
这不是测试偏差，是引擎在"散图混排"场景下的真实能力差距。Laya 要达到同等性能需要开发者手动实现 `DynamicAtlasManager` 注册逻辑。

---

## 现状（修复后）

| 组件 | 状态 |
|---|---|
| `bench/sim-core/stats.js` | ✅ 预热结束时重置 probe 基准 |
| `bench/engines/laya/LayaBench.ts` | ✅ `readDrawCalls` 走 `__layaGlProbe`，WebGPU 回落 CT_2DDrawCall |
| `bench/web/build.js` | ✅ Laya 两份产物注入探针（laya.core.js 之前），antialias=false，__layaInitConfig |
| `bench/web/vendor/laya` | ✅ LayaAir WebGPU 产物就位 |
| `bench/web/vendor/laya-webgl` | ✅ LayaAir WebGL 产物就位 |
| `bench/engines/egret/main.js` | ✅ 删除无效的 `__lastRead` 死代码 |
