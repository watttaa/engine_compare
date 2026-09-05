# 场景 3 · 骨骼动画基准（大话西游真实角色）

对比对象：**自研 Egret 5.4.1** vs **Cocos Creator 3.8.8** vs **LayaAir 3.4.0**

## 目录结构

```
bench/engines/spine-bench/
├── spine-sim.js          引擎无关仿真核心（角色分布 / S3 动画切换状态机）
├── egret/
│   ├── index.html        零配置，直接 http-server 跑
│   └── main.js           Egret 适配器（egret-spine 3.8 运行时）
├── cocos/
│   └── CocosBench_Spine.ts  Cocos 适配器（拖入 Creator 3.8.8 工程）
└── laya/
    └── LayaBench_Spine.ts   Laya 适配器（拖入 LayaAir 3.4 工程）
```

## 测试变体（三引擎统一）

| 变体 | 内容 | 考察 | 对应 MMO 场景 |
|---|---|---|---|
| **S1** | 同一角色 × N，idle 动画循环 | 同骨架合批 + 蒙皮 CPU 成本 | 同类怪海 |
| **S2** | 8 种角色轮换，idle 动画 | 多骨架破批 | 玩家/NPC 混编 |
| **S3** | 同一角色 × N，每 3s 随机切换 5 个动画 | 动画状态混合开销 | 玩家各异动作 |

规模档位：`20 / 50 / 100 / 200`（固定采样）；另做阶梯压测（maxStableCount）。

## 角色资源

来源：**大话西游真实骨骼资源**（Spine 3.8.99）

| Key | 角色 |
|---|---|
| `vx_role_humeiren` | 狐美人 |
| `vx_role_hutouren` | 虎头人 |
| `vx_role_jijianhun` | 激剑魂 |
| `vx_role_qiaoqianjin` | 俏千金 |
| `vx_role_shentianbing` | 神天兵 |
| `vx_role_wutianji` | 无天机 |
| `vx_role_xiaoyaosheng` | 逍遥生 |
| `vx_role_yexiling` | 野溪灵 |

动画名（5 个通用）：`idle / walk / attack / die / skill`

资源位置：`bench/assets/spine-scene/spine/`

## 运行方式

### Egret（零配置）

```powershell
cd D:\engine_compare\bench
npx http-server . -p 8080
# 浏览器打开 http://localhost:8080/engines/spine-bench/egret/index.html
```

> 首次加载会逐个 XHR 读取 `.json/.atlas/.png`，等 HUD 显示角色数后开始采样。

WebGPU 后端：`?backend=webgpu`（需自研 WebGPU 引擎就位）

### Cocos Creator 3.8.8

1. 将 `CocosBench_Spine.ts` 放入工程 `assets/scripts/`
2. `bench/engines/spine-bench/spine-sim.js` 加为「插件脚本」（全局）
3. 将 `bench/assets/spine-scene/spine/` 全部文件拷到工程 `assets/resources/spine/`
   - 目录结构：`resources/spine/vx_role_humeiren.json` 等（扁平，不分子目录）
4. 运行场景（脚本自动挂载到 Canvas）

**注意**：Cocos 需在 IDE 内安装 Spine 扩展，并确认资源导入格式为 `sp.SkeletonData`。

### LayaAir 3.4

1. 将 `LayaBench_Spine.ts` 放入工程 `src/`
2. `bench/engines/spine-bench/spine-sim.js` 加入全局脚本加载
3. 将资源拷到 `resources/spine/<charKey>.json/.atlas/.png`
4. 在 `Main.onStart` 调用 `LayaBench_Spine.start()`
5. IDE `PlayerSettings.json` 已开 `"laya.spine": true`

## drawCall 采集口径

| 引擎 | 口径 |
|---|---|
| Egret WebGL | `__webglProbe` drawElements 帧均值 |
| Egret WebGPU | `_lastBatchCount`（批处理器） |
| Cocos WebGL  下最多能跑多少个角色

## 公平性检查

- 三引擎同一套 `spine-sim.js`（分布逻辑、动画切换时机）
- 同一套 8 个角色资源（Spine 3.8.99，同版本运行时）
- 场景逻辑分辨率固定 1280×720
- antialias 均关闭
- 预热 3s + 采样 10s
