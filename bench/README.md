# 三引擎基准框架（BunnyMark + 水族馆 2D）

对比对象：**自研 Egret 5.4.1（WebGL）** vs **Cocos Creator 3.8.8** vs **LayaAir 3.4.0**

```
bench/
├── sim-core/          引擎无关层（三引擎共用，保证仿真完全一致）
│   ├── stats.js         帧时间采集：p50/p95/p99、预热协议、JSON 输出
│   ├── bunny-sim.js     Bunny 物理（逐参数移植自 pixijs/bunny-mark）
│   ├── boids-sim.js     鱼群运动（参数化时钟模型，移植自 webglsamples aquarium）
│   └── bench-runner.js  两种模式：fixedRun 固定采样 / rampRun 阶梯压测
├── engines/
│   ├── egret/         ★ 可直接跑：index.html + main.js（标准显示列表路径）
│   ├── cocos/         CocosBench.ts（拖进 Creator 3.8.8 工程）
│   └── laya/          LayaBench.ts（拖进 LayaAir 3.4 工程）
├── assets/            统一贴图：bunny-mark 原版 12 张 rabbitv3*.png
└── dashboard/         index.html：拖入各引擎导出 JSON，出对比表+透视表
```

## 一、运行方式

### Egret（零配置，直接跑）
```powershell
cd D:\engine_compare\bench
npx http-server . -p 8080
# 浏览器开 http://localhost:8080/engines/egret/index.html
```
> 必须走 http（图片加载），不能 file:// 双击。

### Cocos Creator 3.8.8
1. Dashboard 新建空 **2D** 项目
2. `sim-core/` 的 4 个 js 拖入工程，每个在 Inspector 勾选 **插件脚本（Import As Plugin）** → 全局可用
3. `assets/*.png` 拷到工程 `assets/resources/bench/`（保持文件名）
4. `CocosBench.ts` 放入 `assets/scripts/`，挂到 Canvas 节点，运行
5. WebGPU 对照：构建时后端选 WebGPU（3.8.8 gfx 已内置 `cocos/gfx/webgpu/`）

### LayaAir 3.4
1. IDE 新建空 TS 项目
2. `sim-core/` 4 个 js 放入项目并全局引入（GameConfig 之前）
3. `assets/*.png` 拷到 `res/bench/`
4. 入口（Laya.init 完成后）调用 `LayaBench.start();`

## 二、测试矩阵

| 变体 | 内容 | 考什么 |
|---|---|---|
| V1 | 同一张纹理，只改 position | 合批上限（WebGPU Egret 的主场） |
| V2 | 8 张纹理轮换 | atlas 多帧合批 |
| V3 | V1 + 每帧 rotation/scale（确定性公式） | 变换脏标记开销 |
| V4 | 12 张不同纹理循环，相邻必不同 | 故意不合批，压提交路径 |
| boids | 水族馆鱼群 2D 版（5 鱼种、朝向跟随） | 综合：AI + 变换 + 旋转合批 |

每变体两种模式：**固定采样**（默认 10000 只，预热 3s + 采样 10s，出 p50/p95/p99）；
**阶梯压测**（每 2s 加 1000 只，持续掉帧 2s 即停，出 maxStableCount）。

## 三、引擎统计 API（均已在本地源码验证）

| 引擎 | DrawCall 来源 | 出处 |
|---|---|---|
| Egret 自研 5.4.1 | `egret.sys.startGetPerformance(1000)` + `getPerformace().drawCall` | egret.js L17908-17917（1 秒窗口每帧均值） |
| Cocos 3.8.8 | `director.root.device.numDrawCalls` | cocos/gfx/base/device.ts L110 getter |
| LayaAir 3.4 | `LayaGL.statAgent.getElementData(StatElement.CT_DrawCall)` | 引擎自带 sample L156 同款用法 |

## 四、公平性清单（每轮测试前核对）

1. 同一台机器、同一浏览器（Chrome 同版本）、关无关插件
2. 三个引擎同一套 sim-core（仿真 CPU 成本完全一致）
3. 同一套 12 张贴图，同样 DPR（egret 已固定 `calculateCanvasScaleFactor = devicePixelRatio`）
4. 帧率统一 60；浏览器禁用硬件加速差异项需记录
5. 每轮先预热 3 秒再采样；结果看 p50/p95/p99，不只看 FPS
6. 记录显卡驱动版本；笔记本插电源、关省电模式

## 五、结果归档

每个引擎测完自动下载 `bench_<engine>_<variant>_<ts>.json`；
把 JSON 全部拖进 `dashboard/index.html` 出对比表，截图即可进汇报。

## 六、后续扩展点

- 裸渲染路径（绕过节点系统直写顶点缓冲）——各引擎单独实现第二个 adapter
- MMO 真实切片（50 Spine + 200 飘字 + 粒子 + 卷轴地图）
- Cocos/Laya 切 WebGPU 后端后的 2×2 后端矩阵
