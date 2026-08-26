Egret Bunnymark · WebGPU vs WebGL 后端对比
==================================================

这是一个自包含的 Egret 版 bunnymark（移植自 godot-bunnymark），
用于在任意支持 WebGPU/WebGL 的环境里对比两个渲染后端。

【内容清单】
  bunnymark.html        主页面（引擎注入 + 物理 + 指标采集 + 测试面板）
  bunny\                12 张兔子纹理
  libs\modules\egret\   Egret 引擎运行时（egret.js / egret.web.js）
  webgpu-dist\          自研 WebGPU 渲染后端（全部 .js，依赖已闭合）
  serve.cjs             极简静态服务器（可选，方便本地跑）

【运行方式】
必须在 http(s) 环境打开（不能 file:// 双击，因为用了 ES module import 和 ImageLoader）。
任选其一：
  1) 本目录执行  node serve.cjs   然后访问  http://localhost:5180
  2) 把本目录所有文件放进你项目已有的静态服务器，访问  <host>/bunnymark.html

【重要】目录结构不要改：bunnymark.html 用相对路径引用
  libs/modules/egret/* 、 webgpu-dist/* 、 bunny/* ，三者必须与 bunnymark.html 同级。

【怎么测】
  1. 打开页面（默认 WebGPU 后端），点左上角「★ 一键承载力测试」。
  2. 测完点「WebGL 后端」（页面会用 ?renderer=webgl 重载）。
  3. 再点一次「★ 一键承载力测试」。
  4. 面板底部自动出对比表 + 三段式结论：① 承载力 ② drawCall ③ 渲染主线程。

【URL 参数】
  ?renderer=webgl   强制 WebGL 后端（默认尝试 WebGPU）
  ?bunny=20000      设置初始兔子数量（默认 10000）

【指标含义】
  FPS               帧率（高刷屏会超过 60）
  drawCall          每帧绘制调用数（WebGPU 多纹理合批，约 1-4；WebGL 每切纹理断批，数千）
  渲染主线程 renderMs  每帧主线程 JS 耗时（两端完全同口径：包住引擎整帧 update+render）
  %帧               renderMs / 实际帧时长，反映主线程是否成为瓶颈
    · %帧 低 + 掉帧  → 瓶颈在 GPU/drawCall（主线程在空等）
    · %帧 接近 100   → 瓶颈在主线程（物理+场景图 或 drawCall 提交开销）

【结论参考】桌面高刷屏实测：承载力 WebGPU 约为 WebGL 的 4-6 倍，
drawCall 约为 1/3000；低档位主线程 CPU 两端接近，高档位 WebGL 因 drawCall
提交开销 + GPU 背压而 CPU、帧率一起崩。
