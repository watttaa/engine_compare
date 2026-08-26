# 引擎对比基准 · 静态站点部署

在 GitHub Pages 上托管三引擎基准测试，手机扫码直测。

## 快速上手

```bash
# 1. 构建静态站点（Egret 全自动；Laya/Cocos 若已放好发布产物会保留）
node bench/web/build.js

# 2. 推送到 GitHub main/master 分支 → Actions 自动部署到 Pages
git add . && git commit -m "bench site" && git push
```

## 三引擎就位方式

| 引擎 | 方式 | 产物位置 |
|---|---|---|
| Egret | 全自动（build.js 组装 sim-core + 贴图 + 引擎库 + 路径重写） | `bench/web/dist/egret/` |
| LayaAir | 本地 IDE「发布 Web」→ 拷贝产物到 `bench/web/dist/laya/` | 手动 |
| Cocos | 本地 Creator「构建 Web」→ 拷贝产物到 `bench/web/dist/cocos/` | 手动 |

> build.js 会清理整个 dist/，所以 Laya/Cocos 产物需在**每次 build.js 之后**再拷入，
> 或把发布源配置为直接输出到 dist/laya、dist/cocos。

## 手机测试要点

- 手机浏览器只测 **WebGL**（全引擎）；WebGPU 主要在 PC Chrome/Edge 测
- 结果 JSON 自动复制到剪贴板（手机端主路径），粘贴发回分析
- 每轮预热 3 秒 + 采样 10 秒；承载力走阶梯加压
