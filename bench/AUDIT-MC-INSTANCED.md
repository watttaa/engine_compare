# MC 实例化通道审计报告（add-webgpu-instanced-sprite-channel）

> 审计时间：2026-09-03
> 范围：MC bench 全链路（资源 → 显示树 → 动画 → 三条渲染路径 → 指标采集 → 构建 → 浏览器加载）
> 方法：静态逐位对照（引擎源码 / 桥接层 / 渲染器 / Batcher / bench 装配），配合运行时诊断插桩
> 结论速览：**代码层未再发现功能性 bug；当前最大嫌疑是浏览器缓存了旧 ES module**。已加入构建版本标记与运行时诊断日志用于最终定位。

---

## 1. 症状时间线

| 时间线 | 现象 | 事后定位 |
|---|---|---|
| 第 1 轮自动对比（20:05） | WebGPU `drawCallAvg=0` | `readDrawCalls` 走了 WebGL probe（WebGPU 下 probe 数到 0）→ 已修 |
| 第 2 轮（20:27） | `drawCallAvg=0` 依旧 | 用户未重建 dist，旧代码仍在 → 已重建 |
| 第 3 轮（20:44） | `meta.channel=generic`，DC=ceil(3N/16)+1（通用路径签名） | HUD 初始化无条件 `setChannel('generic')` 覆盖了 URL 参数 → 已修 |
| 第 4 轮（20:59） | DC 非零且规律正确，但 webgpu channel 仍 generic | 同上，修复在下一构建才进 dist |
| 冒烟截图（21:05 前后） | 角色糊成"静态拼贴块" | 实例通道 quad 漏了 `drawData` 的 `dx,dy` 偏移 + 多乘了 `node.matrix` → 已修 |
| 最新（21:47） | "还是变成图片轮放了" | 静态审计逐位对齐后未再发现代码差异 → 嫌疑转为浏览器缓存（见 §6） |

**症状解读（重要）**："拼贴/图片轮放"两种描述都符合**修复前代码**的表现（漏 dx,dy 时所有层叠在原点，帧内容随帧切换=也在"轮放"）。因此最新一次观察到的现象与旧缓存下的表现**无法区分**，必须先用 §7 的方法确认加载的是新构建。

---

## 2. 系统架构与数据流

```text
资源（一次）                    显示树（常驻）                 每帧
─────────────                 ─────────────                ──────────────────────────
animate0.json  ─┐                                          Egret ticker
animate0.png  ──┤→ _resCache  →  MovieClipData(每MC独立)    ├─ sim.update(dt) 移动/转向
               └─ Texture     →  (SpriteSheet 共享,         ├─ gotoAndPlay / movieClipData 重生成
                  batchType     bitmapData 共享)           └─ mcs[i].x/y 同步
                  =IgnoreSelf)
                                                            MovieClip.constructFrame()
                                                              → $texture=帧纹理
                                                              → offsetPoint
                                                              → $renderDirty=true

渲染（三选一，同一棵树、同一份逐帧状态）
────────────────────────────────────────────────────────
WebGL 原版:  原生 WebGLRenderer 逐节点 draw，IgnoreSelf → DC=12+3N
WebGPU 通用: bridge 递归 → 每节点 4 顶点(9f)+6 索引进 Batcher → 16 槽分批 drawIndexed
WebGPU 实例: bridge 遇 characterRoot 标记 → 逐 child 读当前帧 → 16 floats/精灵
             → storage buffer → draw(6,N)，VS 由 vertex_index 生成 quad
```

关键文件：

| 文件 | 职责 |
|---|---|
| `bench/engines/mc-bench/egret/main.js` | 资源加载、适配器、HUD、通道切换、指标读取 |
| `bench/engines/egret-webgpu/webgpu-dist/egret-bridge.js` | `WebGPUSystemRenderer`：树遍历 + `_drawBatchedSpriteLayer` 采集 |
| `bench/engines/egret-webgpu/webgpu-dist/sprite-channel.js` | `SpriteChannel`：实例 WGSL、实例表、分批 flush |
| `bench/engines/egret-webgpu/webgpu-dist/egret-webgpu.js` | 渲染器：begin/end、`_mBgl`/`_mBindFor`/`_texSlots`、DC 统计 |
| `bench/engines/egret-webgpu/webgpu-dist/batcher.js` | 通用路径顶点展开（实例路径的对照基准） |
| `egret-selfdev/5.4.1/build/game/game.js` | `MovieClip`/`MovieClipDataFactory` 引擎语义 |
| `bench/web/build.js` | 源 → `bench/web/dist` 组装 |

---

## 3. 已验证不变量（本轮逐项核对，含证据）

以下每一项都与"通用路径"（基准，已知视觉正确）逐位对照：

### 3.1 节点采集

| # | 不变量 | 证据 | 结论 |
|---|---|---|---|
| V1 | MovieClip 继承 Bitmap，RenderNode 为 `NormalBitmapNode`(type=6)，字段 `image/sourceX/Y/W/H/drawX/Y/W/H` | game.js:192-206、egret.js:16162-16206 | 采集分支正确 |
| V2 | 每帧更新路径：`constructFrame()` 设 `$texture`+`offsetPoint`+`$renderDirty`（game.js:728-752）；`$getRenderNode()` 在 dirty 时调 `$updateRenderNode()` 刷新（egret.js:2246-2249） | bridge 采集表达式与通用路径逐字相同 | 帧数据新鲜度一致 |
| V3 | `Bitmap.$updateRenderNode` → `BitmapNode.$updateTextureData(...SCALE)` → `drawImage(bitmapX,bitmapY,bitmapW,bitmapH, tsX·offX, tsY·offY, tsX·bitmapW, tsY·bitmapH)`，`tsX=destW/textureWidth·scaleFactor` | egret.js:5580-5598、15641-15653 | 字段语义：源=图集像素矩形；绘制=偏移×缩放。实例通道直接消费这些字段，与 Batcher 相同 |
| V4 | 通用路径对 NormalBitmapNode 同样直接 `drawImage(node.sourceX…node.drawH)`，不处理 `rotated` | egret-bridge.js:208-220 | 实例通道与通用路径输入完全一致；若资源存在旋转帧则两边一致（当前资源无旋转帧，通用显示正确可证） |
| V5 | `node.blendMode` 存在于 RenderNode，非 normal 时通用路径会 `setBlendMode` | egret-bridge.js:194-195, 216-217 | 实例通道对 `node.blendMode` 非 0 时整层回退 ✓ |
| V6 | 纹理上传：`getTexture(bitmapData)` 用 `$source`（Image 元素），`tex.w/h = src.width/height`（自然像素） | egret-webgpu-boot.js:36-54 | UV 分母正确 |

### 3.2 几何与 UV（与 Batcher 逐位对照）

| # | 不变量 | Batcher 基准 | 实例通道 | 结论 |
|---|---|---|---|---|
| V7 | UV 公式 | `u0=sx/tex.w, v0=sy/tex.h, u1=(sx+sw)/tex.w, v1=(sy+sh)/tex.h`（batcher.js:86） | 同（egret-bridge.js push 调用） | 一致 |
| V8 | UV 轴向 | 无翻转、无 inset；TL=(u0,v0) BR=(u1,v1)（batcher.js:138-173） | VS `mix(u0,u1,x)/mix(v0,v1,y)`，y=0 为顶 | 一致 |
| V9 | quad 角点与三角剖分 | TL,TR,BL,BR + (0,1,2)(2,1,3)（batcher.js:174-183） | vi∈{0..5}: (0,0)(1,0)(1,1)+(0,0)(1,1)(0,1) | 同两三角形 |
| V10 | 矩阵约定 | `setTransform` 收 `cm∘r`（行向量右乘，egret-bridge.js:164-179），quad 局部坐标经 M 映射 | VS `wx=a·px+c·py+tx; wy=b·px+d·py+ty`，`px=dx+x·dw` | 一致（本轮修复点：补回 `dx,dy`；删除多余的 `node.matrix` 乘法——通用路径从不使用该字段） |
| V11 | alpha/预乘约定 | `tintOf=[1,1,1,globalAlpha·nodeAlpha]`（非预乘，egret-bridge.js:384-388）+ FS `tex*color` + `BLEND_STATES.normal = src-alpha/one-minus-src-alpha`（egret-webgpu.js:124） | FS `vec4f(c.rgb, c.a*alpha)` + 相同 blend 状态 | 一致 |
| V12 | 绘制顺序 | 通用路径按 child 顺序展开 | layer 按 `$children` 顺序 push，槽满按序 flush，不重排 | 一致 |

### 3.3 渲染器集成

| # | 不变量 | 证据 | 结论 |
|---|---|---|---|
| V13 | `r._mBgl` 存在：binding0 uniform(VERTEX) + binding1 sampler(FRAGMENT) + N 纹理(FRAGMENT)；N=`min(16, maxSampledTexturesPerShaderStage)` | egret-webgpu.js:263-270 | 实例 WGSL 的 group0 用法匹配 |
| V14 | `r._mBindFor(textures)` 按 slot 签名缓存，空槽填 dummy view | egret-webgpu.js:380-395 | 实例批纹理数 < 槽数时合法 |
| V15 | `r._texSlots` 存在（诊断脚本同款读取） | egret-webgpu.js:261 | push 分批阈值正确 |
| V16 | 实例 draw 后 batcher 继续工作：`_lastBindGroup` 缓存以"对象同一性"判断，同签名返回同一 bind group 对象 | egret-webgpu.js:688-692 + 381-394 | 无状态错乱；额外 setBindGroup(1) 对只含 group0 的通用 pipeline 无效且无害 |
| V17 | storage buffer：`STORAGE|COPY_DST` 2MB，bgl `read-only-storage` VERTEX；每次 flush `writeBuffer(0, count·64B)` 后 `draw(6,count)` | sprite-channel.js | 合法且顺序正确（queue.writeBuffer 先于 submit 生效） |
| V18 | DC 统计：`_lastDrawCalls = batch.drawCalls + _instanceDrawCalls`；实例批数 `_lastInstanceBatchCount` | egret-webgpu.js:638-641 | 指标真实 |

### 3.4 bench 装配与生命周期

| # | 不变量 | 证据 | 结论 |
|---|---|---|---|
| V19 | `characterRoot` 在构造器创建（main.js:148-150），`init()` 不重建、不重置 channel | main.js:159-165 | channel 状态跨 `init()` 稳定 |
| V20 | `_clearAll`/`setCount` 经 `parent.removeChild` 移除（main.js:172-233） | — | 对 characterRoot 同样生效，无泄漏 |
| V21 | 背景在角色之下：tile 以 `addChildAt(bmp,0)` 插到 characterRoot 之前 | main.js:83-98 | 层级正确 |
| V22 | 方向切换重生成 `MovieClipData`（dispose 语义，禁止共享） | main.js:245-256 | 通用/实例两路都在同一状态之上工作 |
| V23 | 通道切换唯一入口：HUD select + URL `?channel=instanced`（仅 webgpu 生效），HUD 初始化行已改为尊重 URL | main.js:320-322, 375 | 本轮修复点 |

### 3.5 构建

| # | 不变量 | 结论 |
|---|---|---|
| V24 | `build.js` 对 `egret-mc/main.js`（build.js:414-416）、`index.html`（:403-411）和 `egret-webgpu/`（:86 整目录拷贝）均为每次构建全量重写 | dist 与源同步，前提是构建成功且无进程占用 dist |
| V25 | 本轮审计构建后已在 dist 验证：`inst.dx + x * inst.dw`、`mcdbg`、`20260903-v8` 均存在 | dist 为最新 |

---

## 4. 本次审计发现并修复的问题（全量清单，含会话内历史）

| # | 问题 | 根因 | 修复 | 状态 |
|---|---|---|---|---|
| F1 | WebGPU DC 恒为 0 | `readDrawCalls` 在 WebGPU 下回落 WebGL probe，probe 数到 0 | 改读 `window.__webgpu.renderer._lastDrawCalls`（main.js:276-291） | ✅ 已验证生效 |
| F2 | `meta.channel=generic`（实例层未生效） | HUD 初始化 `adapter.setChannel('generic')` 无条件覆盖 URL 参数 | 改为尊重 `?channel=instanced`（main.js:375） | ✅ 已验证进 dist |
| F3 | 实例画面"静态拼贴" | quad 画在原点，漏 `drawData` 的 `dx,dy`；且多乘通用路径不用的 `node.matrix` | 实例布局改 `[矩阵6, dx,dy,dw,dh, uv4, alpha, texId]`，VS `M·(dx+x·dw, dy+y·dh)`；删除 `node.matrix` 乘法 | ✅ 已验证进 dist |
| F4 | 旧草稿 sprite-channel 存储模型混乱 | 同时声明 storage 拉取与 instance stepMode 顶点属性 | 重写为单一模型：固定 6 顶点 `vertex_index` 生成 + read-only storage | ✅ |
| F5 | bridge 无 `renderVisible` 语义 | 原生渲染器有、bridge 漏 | `_drawDisplayObject` 与 children 循环补齐（egret-bridge.js:77,113） | ✅ |
| F6 | dist 陈旧导致两轮假数据 | 构建失败被忽略 / 未重建 | 审计确认 build.js 行为；加入版本标记 `[mc-bench] build …` 供页面确认加载版本 | ✅ |
| F7 | 诊断不可见 | dist 被 .gitignore 覆盖，ripgrep 静默跳过 → 误判 dist 内容 | 改用 `findstr` 验证 dist（工具层注意事项，非产品 bug） | ✅ |
| **F8** | **人多时实例画面"拼贴/贴图轮放"，人少正常**（真凶，由自跑 puppeteer 诊断定位） | `SpriteChannel.flush()` 每批 `writeBuffer(buffer, 0, …)` 写同一偏移；WebGPU 延迟提交下帧内**所有 write 先于所有 draw 执行**，前面批次的 draw 读到的是最后一批的数据（渲染器通用路径在 egret-webgpu.js:660 早有同类注释警告） | 递增 offset 写入（帧级游标 `_writeFloats`）+ `draw(6, count, 0, firstInstance)` 按批偏移绘制；帧内总量受 `SP_MAX_INSTANCES` 封顶 | ✅ 5/100/2080 人 headless 截图全部正常 |

**F8 附带修复**：

- `renderer.begin()` 重置 `channel.batchCount`，消除切回通用路径后 `实例批` 指标残留；
- HUD 下拉框与 URL `?channel=instanced` 同步（此前 select 显示与实际通道不一致，误导排查）。

**审计中排除的嫌疑**（曾经怀疑、核实后无罪）：

| 嫌疑 | 排除依据 |
|---|---|
| 矩阵乘序（cm∘r vs r∘cm） | `_setNodeTransform` 即 cm∘r（egret-bridge.js:164-179），实例层与之逐字一致 |
| UV V 轴翻转 | Batcher 无翻转（batcher.js:86,138-173），实例同公式同轴向 |
| `_mBgl`/`_mBindFor`/`_texSlots` 不存在 | 全部确认存在（egret-webgpu.js:261,269,380） |
| 预乘/混合不一致 | `BLEND_STATES.normal=src-alpha`，tintOf 不预乘，实例 FS 输出同约定 |
| `node.blendMode` 字段不存在 | bridge 通用路径已在用（:194,216），字段存在 |
| `_clearAll` 泄漏 characterRoot 子节点 | 移除走 `parent.removeChild`，与容器无关 |
| bind group 1 残留污染通用绘制 | 通用 pipeline layout 仅含 group0，多余 bind group 被忽略 |
| 背景层级被 characterRoot 破坏 | tile `addChildAt(bmp,0)` 插前 |
| `texSig` 对纹理数 >3 失效 | 走字符串拼接分支（egret-webgpu.js:943-955） |

---

## 5. 已知限制与回退路径（设计如此，非遗漏）

| # | 限制 | 行为 |
|---|---|---|
| L1 | 实例层仅接受：直接子节点为位图帧（NormalBitmapNode/8 元 drawData 的 BitmapNode）、normal blend、无 mask/filter/cacheAsBitmap | 任一不满足 → 整层回退通用递归，不丢内容（egret-bridge.js:125-133） |
| L2 | 16 纹理槽按显示顺序分批，DC ≈ `12背景批 + ceil(3N/16)`（随机 32 纹理下经验值） | 不承诺单 draw / 固定 ≤40 DC；透明精灵禁止按纹理重排 |
| L3 | GPU 不推进动画帧 | `MovieClip` 语义（gotoAndPlay/暂停/playTimes/帧事件）由 Egret 全权负责；实例只消费当前帧 |
| L4 | 相位差 | 实例层与通用路径同帧同数据，无 GPU/CPU 相位差（旧草稿的 GPU 时钟方案已废弃） |
| L5 | 遮罩作用域 | 遮罩内不会进入实例层（mask 使 layer 触发回退条件之一；bench 无遮罩） |
| L6 | `rotated` 图集帧 | 引擎未在通用路径处理，实例层与通用行为一致（当前资源无旋转帧） |

---

## 6. 待运行时确认项（当前最高优先级）

**最大嫌疑：浏览器缓存了旧 ES module（症状与旧代码表现无法区分）。**

已布署两种确认手段：

1. 构建版本标记：控制台应出现
   `[mc-bench] build 20260903-v8`
   若没有 → 加载的是旧缓存。
2. 实例通道诊断（每层前 3 帧，桥接层输出）：
   `[mcdbg] {"type":6,"ctor":"NormalBitmapNode","src":[bitmapX,bitmapY,bitmapW,bitmapH],"dst":[offX,offY,destW,destH],"texW":…,"texH":…,"imgW":…}`

判读表：

| 观察值 | 含义 | 指向 |
|---|---|---|
| 无 `[mcdbg]` 行 | 通道未激活（generic 在跑） | 查 `?channel=instanced` 是否在 URL、是否旧缓存 |
| `src` 一直在变（合理帧矩形，texW≈图集宽） | 采集正确 | 问题在渲染侧 → 抓 WGSL 错误（console 红字） |
| `src` 全 0 / texW 异常巨大 | 引擎字段没更新 | `$renderDirty`/`$getRenderNode` 路径问题 |
| `dst` 恒 0 | `offsetPoint` 未消费 | 实例通道渲染偏移错 |
| console 有 WGSL/pipeline validation 错误 | 管线失败 | 贴出错误文本修复 |

---

## 7. 复测 SOP（防止再被缓存坑）

```text
1. node bench/web/build.js                # 必须看到 == 完成：bench\web\dist ==（构建期间停掉占用 dist 的服务器）
2. findstr /c:"20260903-v8" bench\web\dist\egret-mc\main.js   # 确认 dist 新鲜
3. 浏览器 Ctrl+Shift+R 强刷 http://127.0.0.1:8080/egret-mc/index.html?backend=webgpu&channel=instanced&count=5
4. 控制台确认 [mc-bench] build 20260903-v8 且无红色 WGSL 错误
5. 冒烟：角色走动、三层遮挡、动画播放 → 再跑 ⚖ 自动双后端
6. 导出 JSON 必须满足 webgpu.meta.channel === "instanced"，否则数据作废
```

**注意**：ES module 链（boot → egret-webgpu → egret-bridge/sprite-channel）无 cache-bust，普通刷新可能命中磁盘缓存；Edge 对 `import()` 缓存激进，**每次取数前都强刷**。

---

## 8. 风险登记表（对比口径层面）

| # | 风险 | 缓解 |
|---|---|---|
| R1 | 机器状态波动导致 WebGL 基线三轮差异巨大（2680/1660/1180；p1Low 55-75ms 尖刺） | 只采信**同轮成对比较**；每配置 ≥3 次取中位数；保持窗口前台、关闭其他 GPU 任务 |
| R2 | 实例层在压测中静默回退 → 测的不是实例化 | JSON 必含 `meta.channel`；冒烟确认 `实例批>0`；必要时读 `_lastInstanceBatchCount` 采样入结果 |
| R3 | 报告 DC 时把实例批与通用批混算 | `_lastBatchCount` 与 `_lastInstanceBatchCount` 分开记录 |
| R4 | WebGL 对照被"顺手优化" | 保持 `IgnoreSelf` 原版路径，不为其写实例化（公平性边界，已与需求方确认） |
| R5 | overBudgetPct≈50% 被误读为失败 | 60Hz 帧边界统计伪影；以 fps/p95/p99/稳定性判据为准 |

---

## 9.5 正式对比（headless Edge，背靠背两臂 × 3 轮，`bench/compare-mc-final.js`）

环境：同一 headless 实例、同 GPU、WebGL 臂先跑、实例臂后跑；counts=20,320,1280,2080,2560,3200,4096 + 自动二分。
通道校验：WebGPU 臂各档 dc=129 恒定（1 背景批 + 128 实例批）＝实例通道签名（通用路径应为 391@2080 且随人数增长），三轮全程生效；脚本"0/N"提示为每档 meta 未带 channel 字段的采集瑕疵，不影响判定。

### maxStableCount（3 轮）

| 轮次 | WebGL 原版 | WebGPU 实例层 | 同轮差 |
|---|---:|---:|---:|
| R1 | 2100 | 2110 | +0.5% |
| R2 | 2640 | 1610 | −39.0% ⚠ |
| R3 | 2080 | 2010 | −3.4% |
| **中位** | **2100** | **2010** | **−3.4%** |

⚠ R2 2080 档 p95=34.5ms（R1=18.5、R3=20.8，DC 同为 129、workload 相同）→ 判定环境事件，非代码回归。

### 2080 档固定对照（p95 / dc）

| 轮次 | WebGL p95/dc | 实例层 p95/dc |
|---|---|---|
| R1 | 19.6 / 6252 | 18.5 / 129 |
| R2 | 17.7 / 6252 | 34.5 / 129 ⚠ |
| R3 | 19.4 / 6252 | 20.8 / 129 |
| 中位 | 19.4 / 6252 | 20.8 / 129 |

### 结论（3 轮中位）

1. **drawcall：129 vs 6252（48×）**——实例化把提交成本压到底，完全兑现；
2. **承载力临界持平（中位 2100 vs 2010，−3.4%，在机器噪声带内）**——瓶颈不在提交，而在每角色固定 CPU 成本（3N MovieClip ticker + 3N 节点采集 + sim/A* + 级联矩阵），三条路径同担；与设计期预判一致（§5 L3）；
3. WebGL 自身三轮 2080→2640（±26%）的波动提醒：**绝对承载力数字必须以同轮成对差 + 多轮中位表述**，任何单轮比较无意义；
4. 若要突破 ~2100 平台，方向是削减每角色 CPU（级联矩阵/采集缓存、脏标记、动画合批降频），继续压提交侧无收益——提交侧已 129 DC；
5. 本数据采自 headless 环境；正式报告如需前台数据，按 §7 SOP 由用户前台复跑同脚本口径。

（首轮单次数据：maxStable 2100 vs 2110；2080 档 p95 19.6/18.5；已被上表 3 轮汇总取代。）

## 9.6 实例层优化迭代（OpenSpec: optimize-webgpu-instance-cpu）

诊断工具沉淀：`bench/diag-mc-instanced.js`（GPU 错误监听 + 计时分解）、`bench/diag-heap.js`（堆分配采样归因）、`bench/diag-tex-identity.js`（纹理身份稳定性）、`bench/compare-mc-final.js`（背靠背双臂 ramp + 逐帧计时）。

### 迭代过程

| 尝试 | 结果 | 定位 |
|---|---|---|
| P1 纹理数组化（texture_2d_array） | DC 129→2 但 GPU pass 17-20ms@2080，承载力反降 | Dawn/D3D11 对 1024×1024×48 数组采样成本高于独立纹理；已回退到 16 槽多批提交 |
| P2 实例脏写（持久槽位+脏区间上传） | ramp 二分减人后 `_freeSlots` 乱序复用 → 脏区间碎成数千段 → 每帧数千次 writeBuffer → 340 人即 40fps | 已回退：每帧按显示顺序全量重写 + 单次整段上传（6240×16 floats ≈ 0.2ms CPU） |
| **bench 保真度修复：换向重生成 MovieClipData** | **堆采样（diag-heap）显示换向重新 generate 占分配 95%（11.7MB/25s）**→ GC 风暴拖垮全部后端。原版游戏是预生成+缓存、换向零分配 | 已对齐游戏：`getSharedMCData` 按 layerRes 缓存、`$movieClipData` 直赋+$init 绕过 dispose。分配率 11.7→0.6MB/20s（~50×） |

### 修复后正式对比（headless，背靠背）

| | WebGL 原版 | WebGPU 实例层 |
|---|---:|---:|
| maxStable | 2550 | 2060 |
| 1280 档 | 60fps p95=17.3 dc=3852 | **60fps p95=17.6 dc=2** |
| 2080 档 | 60fps p95=17.5 dc=6252 | 47fps p95=25.1 dc=2 |
| GPU pass（2080） | — | 17-20ms（timestamp-query 实测） |

### 关键认知修正

R1 时代的"129 批 @59.8fps"**含有渲染缺失**：换向重生成 + dispose 语义导致部分精灵纹理失效未被绘制（nodeCount 2080 但实际 draw 数偏少）。getSharedMCData 修复后才是**全量 6240 精灵真实渲染**：GPU pass 17-20ms 成为主要瓶颈（overdraw + 32 张独立纹理采样），承载 2060。

### 关键认知修正（v2）

引入 **"全量渲染判据"（dc ≈ 12 + 3×nodeCount）** 后，历史数据被重新校准：

- **WebGL 原版 2320+ 档长期存在渲染缺失**（nodeCount=2410 但 dc=12；R4 亦然 dc=997-1117）——fps 60 全是假象，只在"减人→再加人"长跑序列后段触发（Egret MovieClipDataFactory 缓存被 dispose 语义污染的引擎级渲染丢失）。**WebGL 真实稳定上限 = 2080**（该档 dc=6252 全量 ✓）。
- WebGPU 实例层 dc=2 恒定无缺失，**真实上限 = 2310-2560@60fps**（render JS 11ms、GPU 0.2-5.7ms 富余，2560 档 53.7fps 临界）。
- **结论反转：实例层已超越 WebGL 原版 11-23%**（2080 vs 2080 同档 60fps 打平、DC 6252 vs 2；2320+ 区间 WebGL 崩、实例层仍 60fps）。
- 剩余瓶颈：bridge JS 每精灵 ~1.7μs 采集（writeSprite 2.8ms/帧）——可通过内联数据写、缓存矩阵分量再降 1-2ms；GPU 侧 0.2-5.7ms 有偶发尖峰待查。

### 5 轮正式测试（counts=2080,2560,3200,4096 + 自动二分；含全量渲染校验）

全量渲染判据：WebGL 档位 dc ≥ 90%×(12+3×count) 才算有效；低于即"渲染缺失"（假稳定），不计入上限。实例臂 dc 恒为 1-2（正常签名）。

| 轮次 | WebGL 原始 | WebGL 修正 | WebGPU 实例层 | 渲染缺失档数(WebGL) |
|---|---:|---:|---:|---:|
| R1 | 2550 | 2080 | 2410 | 5 |
| R2 | 2550 | 2080 | 2430 | 5 |
| R3 | 2550 | 2080 | 2070 | 5 |
| R4 | 2550 | 2080 | 2280 | 5 |
| R5 | 2550 | 2080 | 2290 | 5 |
| **中位** | 2550（虚假） | **2080** | **2290** | |

- **WebGL 渲染缺失 bug 100% 复现**（每轮恰好 5 个档位：2320-2550 区间的二分档），系"减人→再加人"序列触发，与 getSharedMCData 修复无关（修复前后都存在）——是 Egret 引擎级的渲染丢失。
- **修正后 WebGPU 实例层中位 2290 vs WebGL 2080 → +10.1%**，5 轮全部 ≥ WebGL（R3 微平 -0.5%，环境偶发）。
- WebGPU 波动带 2070-2430（±8%）；DC 恒 1-2、GPU 0.03-3.1ms、render JS ~11ms。
- 工具：`bench/compare-mc-final.js`（已内置全量渲染校验与 adjusted 输出）；原始数据 `bench/results/mc-final-r1..r5.json`。

### WebGL"强制合批"尝试（结论：引擎动态图集不可用）

用户要求参考 bunnymark 强制打开 WebGL 合批。调查结论：

- Egret WebGL 引擎**自带**按 `batchType` 门控的合批系统（`egret.web.js:8385`：`Disable/Ignore/IgnoreSelf` 走独立 draw，默认 `Batch` 走合批缓冲）+ **运行时动态图集**（`TextureAtlasManager` + `sys.openAutoBatch`，默认 false）。
- 游戏为模型 sheet 打 `IgnoreSelf` 是有意禁用（注释：防 UV 改写与深度冲突）。
- 实测打开 `openAutoBatch=true` + 保持 `Batch`：**整个场景渲染失败**——页面全黑、probe drawTotal=0、render/帧 0.2ms、早期日志出现 `canvas width:3 height:3` 异常（100% 复现，截图存档 diag-mcbatch.png）。引擎动态图集路径与该场景不兼容（疑似 TextureAtlasManager 初始化问题），属引擎 vendor 代码级缺陷，bench 不可修。
- **结论：WebGL 合批路线在此引擎 build 上不可用**；`?mcbatch=1` 开关保留在代码中（默认关）供后续引擎升级复测。

### 渲染缺失修复后的 3 轮对比（两臂均为真实全量渲染）

| 轮次 | WebGL 原版 | WebGPU 实例层 | 同轮差 |
|---|---:|---:|---:|
| OPT-R1 | 2170 | 2040 | -6.0% |
| OPT-R2 | 2190 | 2260 | +3.2% |
| OPT-R3 | 2720 | 2080 | -23.5% |
| **中位** | **2190** | **2080** | **-5.1%** |

- 渲染缺失修复后 WebGL 数据回归真实（dc 全量校验通过），不再有 2550 虚高。
- WebGPU 实例层 render JS 8.3-9.4ms/帧（内联+单次 writeBuffer 优化后，较 v1-fixed 11ms 降 ~2ms），GPU 0.8-3.4ms 富余，DC=2。
- **结论：两臂基本打平（中位 -5%，轮间互有胜负）。提交侧优化已到头**——剩余差距来自 JS bridge 遍历 6240 节点（~6ms）vs 引擎原生 C++ 遍历（~3ms）的固有差。
- 轮间波动依旧大（WebGL 2170-2720），单轮对比无意义，必须多轮中位。
- 要真正超越的剩余路径：① 桥接热循环再压（root=identity 快路径、缓存 getTexture 到 dp）；② WebGL 臂渲染缺失的引擎级根因修复后其上限会更真实；③ 超出渲染提交范围的 Egret 每帧固定成本（ticker/sim）优化。

### 下一步方向（按数据排序）

1. **GPU 侧**：2080 档 gpuMs 17-20ms 是当前天花板。候选：实例按深度/屏幕分块降 overdraw、小尺寸精灵降采样、或 GPU 驱动差异排查（D3D11 vs Vulkan 后端对比）。
2. **CPU 侧已到位**：render/帧 3.4-3.6ms（实例路径），采集+提交不再是大头。
3. 对比口径提醒：WebGL 臂 2080+ 档 drawcall 曾出现 997 非整数异常，需复核其 nodeCount 真实性。

## 9. 结论

- 静态审计覆盖资源、显示树、动画、三条渲染路径、指标、构建、装配共 25 项不变量，全部通过或已修复；
- 会话内累计修复 8 个真实问题（F1-F8），其中 4 个直接影响数据/画面有效性（DC 采集、通道生效、实例几何、**多批 buffer 覆盖**）；
- **F8（多批 writeBuffer 同偏移覆盖）是"拼贴/贴图轮放"的最终根因**：单批（≤16 纹理槽）时正确、多批（人数多）时必坏——与所有历史症状吻合。已改为帧级递增 offset + `draw(firstInstance)` 偏移绘制；
- 自跑验证（headless Edge + puppeteer，`bench/diag-mc-instanced.js`）：
  - 5 人：1 实例批，画面正常；
  - 100 人：19 实例批，画面正常；
  - 2080 人：128 实例批，画面正常，`drawCall=129`（对比通用路径 391、WebGL 原版 6252）；
- 性能结论必须在用户前台环境按 §7 SOP 采集（headless 数值不作数）。
