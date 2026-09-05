/**
 * bench/web/build.js — 组装 GitHub Pages 静态站点
 *
 * 用法：node bench/web/build.js
 * 输出：bench/web/dist/
 *
 * 结构（引擎 × 后端矩阵）：
 *   dist/
 *     index.html        导航页（按引擎分组，标注各后端可用状态）
 *     sim/              sim-core 4 个 js（三引擎共用）
 *     assets/           12 张 bunny 贴图
 *     egret/            Egret 统一基准（WebGL，V1-V4 + 水族馆）
 *     egret-webgpu/     Egret WebGPU vs WebGL 自比面板（godot 物理，独立面板）
 *     laya/             LayaAir WebGPU 发布产物（vendor/laya）
 *     laya-webgl/       LayaAir WebGL 发布产物（vendor/laya-webgl，待发布）
 *     cocos/            Cocos WebGPU 构建产物（vendor/cocos，待构建）
 *     cocos-webgl/      Cocos WebGL 构建产物（vendor/cocos-webgl，待构建）
 *
 * vendor/ 目录提交进仓库；本脚本从 vendor 拷贝到 dist，再被 Actions 部署。
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const WEB = path.join(ROOT, 'bench', 'web');
const DIST = path.join(WEB, 'dist');
const VENDOR = path.join(WEB, 'vendor');

const SIM = path.join(ROOT, 'bench', 'sim-core');
const ASSETS = path.join(ROOT, 'bench', 'assets');
const EGRET = path.join(ROOT, 'bench', 'engines', 'egret');
const EGRET_LIB = path.join(ROOT, 'egret-selfdev', '5.4.1', 'build', 'egret');
const EGRET_WEBGPU = path.join(ROOT, 'bench', 'engines', 'egret-webgpu');

// Laya 2D bundle.js 注入用：loadAndRamp 静态方法（与 proj-laya/src/LayaBench.ts 同步）。
// ?auto=1&mode=ramp → autoRamp 承载力阶梯，组合结果写 __benchLastResult 供总控 iframe 采集。
const LAYA_RAMP_METHOD = `    /** 载入贴图并跑承载力阶梯（?auto=1&mode=ramp）：组合结果 cap/levels 写 __benchLastResult 供总控采集 */
    static loadAndRamp(Laya2, runner, adapter, backend, $v) {
      const variant = $v ? $v.value : "boids";
      const names = variant === "boids" ? FISH_IMGS : variant === "V1" ? BUNNY_IMGS.slice(0, 1) : variant === "V2" ? BUNNY_IMGS.slice(0, 8) : BUNNY_IMGS;
      const prefix = variant === "boids" ? FISH_PREFIX : RES_PREFIX;
      const urls = names.map((u) => prefix + u);
      const requested = new URLSearchParams(location.search).get("backend");
      const levels = [];
      Laya2.loader.load(urls, Laya2.Handler.create(null, () => {
        adapter.textures = urls.map((u) => Laya2.loader.getRes(u));
        runner.autoRamp({
          engine: "layaair-3.4.0",
          variant,
          backend,
          counts: [2000, 5000, 10000, 20000, 30000, 40000, 50000, 60000, 70000, 80000],
          preWarmSec: 5,
          sampleSec: 6,
          onLevel: (lv) => {
            if (lv.phase === "retry" || (lv.phase === "done" && !lv.json)) return;
            if (lv.phase === "done") {
              const j = lv.json;
              levels.push({ count: lv.count, fps: j.fps, p50: j.p50, p95: j.p95, p99: j.p99, p1Low: j.p1Low, stdDev: j.stdDev, drawCallAvg: j.drawCallAvg, nodeCount: j.nodeCount, actualBackend: j.actualBackend, backendValid: j.backendValid, gpuVendor: j.gpuVendor, gpuRenderer: j.gpuRenderer, renderWidth: j.renderWidth, renderHeight: j.renderHeight, dpr: j.dpr, stable: lv.stable });
            }
          },
          onDone: (r) => {
            const acts = [];
            levels.forEach((l) => {
              const b = l.actualBackend;
              if (b && acts.indexOf(b) < 0) acts.push(b);
            });
            const resolved = adapter._resolvedBackend || (adapter.readBenchMetrics ? adapter.readBenchMetrics().actualBackend : null) || backend || "webgl";
            const rt = acts.length === 1 ? acts[0] : resolved;
            const rv = acts.length === 1 && rt === (requested || "webgl");
            const res = {
              meta: { engine: "layaair-3.4.0", variant, backend: rt, requestedBackend: requested || rt, backendValid: rv, mode: "autoRamp" },
              cap: r.cap, jankAt: r.jankAt, capped: r.capped, invalidCurve: r.invalidCurve,
              thresholdAt: r.thresholdAt, fineStart: r.fineStart, fineStep: r.fineStep,
              levels
            };
            window.__benchRampResult = res;
            globalThis.BenchRunner.exportJSON(res);
          }
        });
      }));
    }`;

function cp(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  console.log('  copy ' + path.relative(ROOT, from) + ' -> ' + path.relative(ROOT, to));
}

function hasVendor(name) {
  const p = path.join(VENDOR, name);
  return fs.existsSync(path.join(p, 'index.html'));
}

function main() {
  console.log('== 组装 GitHub Pages 站点 ==');
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });

  // 1. sim-core
  console.log('[sim]');
  for (const n of ['stats.js', 'bunny-sim.js', 'boids-sim.js', 'bench-runner.js']) {
    cp(path.join(SIM, n), path.join(DIST, 'sim', n));
  }

  // 2. 贴图（含 fish 子目录：boids 鱼种贴图）
  console.log('[assets]');
  for (const n of fs.readdirSync(ASSETS)) {
    if (n.endsWith('.png')) cp(path.join(ASSETS, n), path.join(DIST, 'assets', n));
  }
  const fishDir = path.join(ASSETS, 'fish');
  if (fs.existsSync(fishDir)) {
    for (const n of fs.readdirSync(fishDir)) {
      if (n.endsWith('.png')) cp(path.join(fishDir, n), path.join(DIST, 'assets', 'fish', n));
    }
  }

  // 3. Egret 统一基准（完整游戏引擎 + WebGPU 分支：动态合图/SDF 全套）
  console.log('[egret]');
  cp(path.join(EGRET, 'main.js'), path.join(DIST, 'egret', 'main.js'));
  cp(path.join(ROOT, 'bench', 'engines', 'egret-engine', 'egret.js'), path.join(DIST, 'egret', 'egret-lib', 'egret.js'));
  cp(path.join(ROOT, 'bench', 'engines', 'egret-engine', 'egret.web.js'), path.join(DIST, 'egret', 'egret-lib', 'egret.web.js'));
  let egHtml = fs.readFileSync(path.join(EGRET, 'index.html'), 'utf8')
    .replace(/\.\.\/\.\.\/sim-core\//g, '../sim/')
    .replace(/\.\.\/egret-engine\//g, 'egret-lib/');
  fs.writeFileSync(path.join(DIST, 'egret', 'index.html'), egHtml, 'utf8');
  let egMain = fs.readFileSync(path.join(DIST, 'egret', 'main.js'), 'utf8')
    .replace(/\.\.\/\.\.\/assets\//g, '../assets/');
  fs.writeFileSync(path.join(DIST, 'egret', 'main.js'), egMain, 'utf8');

  // 4. Egret WebGPU vs WebGL 自比面板（整目录拷贝，bunnymark.html 内部引用相对路径）
  console.log('[egret-webgpu]');
  fs.cpSync(EGRET_WEBGPU, path.join(DIST, 'egret-webgpu'), { recursive: true });

  // 5. Laya / Cocos 各后端产物（从 vendor 拷贝）
  // Laya：两份独立产物（webgpu 开关决定引擎库不同，无法单源派生）
  for (const [name, label] of [
    ['laya', 'LayaAir WebGPU'],
    ['laya-webgl', 'LayaAir WebGL']
  ]) {
    const src = path.join(VENDOR, name);
    if (hasVendor(name)) {
      console.log('[' + name + '] ' + label + ' 产物就位');
      fs.cpSync(src, path.join(DIST, name), { recursive: true });

      // patch A: js/index.js — antialias 关闭 + __layaInitConfig 后端探针
      const idx = path.join(DIST, name, 'js', 'index.js');
      if (fs.existsSync(idx)) {
        let c = fs.readFileSync(idx, 'utf8');
        if (c.indexOf('"isAntialias":true') >= 0) {
          c = c.replace(/"isAntialias":true/g, '"isAntialias":false');
          console.log('  ' + name + ': 关闭 isAntialias');
        }
        // 后端探针兜底：注入 window.__layaInitConfig，供 LayaBench 帧循环检测（config.webgpu 决定臂意图）。
        // 权威判定仍以渲染画布 getContext('webgpu') 为准；此处为异步初始化未就绪时的回落信号。
        if (c.indexOf('__layaInitConfig') < 0) {
          const wantGpu = /"webgpu"\s*:\s*true/.test(c);
          c = c.replace(/(Object\.assign\(Laya\.PlayerConfig,\s*config\);)/,
            'window.__layaInitConfig = { webgpu: ' + wantGpu + ' };\n    $1');
          console.log('  ' + name + ': 注入 __layaInitConfig(webgpu=' + wantGpu + ')');
        }
        fs.writeFileSync(idx, c, 'utf8');
      }

      // patch B: index.html — 注入早期 WebGL drawCall 探针（必须早于引擎加载，引擎建立 GL 上下文前 hook）
      // 口径与 Egret/Cocos 完全一致：hook drawElements/drawArrays/Instanced + getExtension 包装 multi_draw
      // readDrawCalls() 读 window.__layaGlProbe（增量窗口均值 draw/frame）
      const ih = path.join(DIST, name, 'index.html');
      if (fs.existsSync(ih) && !fs.readFileSync(ih, 'utf8').includes('__layaGlProbe')) {
        const probe =
          '<script>(function(){' +
          'if(window.__layaGlProbe)return;' +
          'var P=window.__layaGlProbe={drawTotal:0,frameTotal:0,lastDraw:0,lastFrame:0};' +
          'var hd=function(o){if(!o||o.__layaHooked)return;o.__layaHooked=1;' +
          '["drawElements","drawArrays","drawElementsInstanced","drawArraysInstanced"].forEach(function(nm){' +
          'var f=o[nm];if(typeof f!=="function")return;' +
          'o[nm]=function(){P.drawTotal++;return f.apply(this,arguments);}});};' +
          'hd(window.WebGLRenderingContext&&window.WebGLRenderingContext.prototype);' +
          'hd(window.WebGL2RenderingContext&&window.WebGL2RenderingContext.prototype);' +
          '[window.WebGLRenderingContext&&window.WebGLRenderingContext.prototype,' +
          'window.WebGL2RenderingContext&&window.WebGL2RenderingContext.prototype].forEach(function(pr){' +
          'if(!pr||pr.__layaGxHooked)return;pr.__layaGxHooked=1;' +
          'var ge=pr.getExtension;if(typeof ge!=="function")return;' +
          'pr.getExtension=function(){' +
          'var e=ge.apply(this,arguments);var nm=arguments[0];' +
          'if(e&&typeof nm==="string"&&/multi_draw|draw_instanced/.test(nm)){' +
          'Object.keys(e).forEach(function(k){' +
          'if(typeof e[k]==="function"&&/draw/i.test(k)&&!e["__layaBh_"+k]){' +
          'var o=e[k];e["__layaBh_"+k]=1;' +
          'e[k]=function(){P.drawTotal++;return o.apply(this,arguments);};}});}' +
          'return e;};});' +
          '(function fc(){P.frameTotal++;requestAnimationFrame(fc);})();' +
          '})()</script>\n';
        let c = fs.readFileSync(ih, 'utf8');
        // 在第一个外部引擎 lib（laya.core.js）之前插入探针。
        // 不能用 replace('<script', ...) —— index.html 第一个 <script> 是 splash screen 内联块，
        // 嵌套 <script> 标签会破坏 HTML 解析（同 Cocos 排坑记录 Bug5）。
        // 必须在 <script src="libs/laya.core.js"> 之前插入一个独立的 <script> 块（外部引擎最早的加载点）。
        const coreTag = '<script type="text/javascript" src="libs/laya.core.js">';
        if (c.includes(coreTag)) {
          c = c.replace(coreTag, probe + coreTag);
          fs.writeFileSync(ih, c, 'utf8');
          console.log('  ' + name + ': 注入早期 drawCall 探针（__layaGlProbe）');
        } else {
          console.warn('  ' + name + ': 未找到 laya.core.js script 标签，探针未注入！');
        }
      }

      // patch C: index.html —— bundle.js 里烤进的是构建时的旧版 sim-core（esbuild 快照：
      //          autoRamp 无 p95 门槛/重试/细扫）。在 bundle.js/index.js 之后追加覆盖加载，
      //          用 bench/sim-core 最新版重定义 window.BenchStats / window.BenchRunner。
      if (fs.existsSync(ih) && !fs.readFileSync(ih, 'utf8').includes('../sim/bench-runner.js')) {
        const idxTag = '<script type="text/javascript" src="js/index.js"></script>';
        let hc = fs.readFileSync(ih, 'utf8');
        if (hc.includes(idxTag)) {
          hc = hc.replace(idxTag, idxTag +
            '\n<script type="text/javascript" src="../sim/stats.js"></script>' +
            '\n<script type="text/javascript" src="../sim/bench-runner.js"></script>');
          fs.writeFileSync(ih, hc, 'utf8');
          console.log('  ' + name + ': 注入 sim-core 覆盖加载（stats/bench-runner 最新版）');
        } else {
          console.warn('  ' + name + ': 未找到 js/index.js script 标签，sim 覆盖未注入');
        }
      }

      // patch D: js/bundle.js —— LayaBench 增加 loadAndRamp（?auto=1&mode=ramp 承载力阶梯，
      //          组合结果 cap/levels + runtime 后端校验写 __benchLastResult 供总控采集），
      //          auto 入口按 mode 分流。与 proj-laya/src/LayaBench.ts 源码保持同步。
      const bjL = path.join(DIST, name, 'js', 'bundle.js');
      if (fs.existsSync(bjL)) {
        let bc = fs.readFileSync(bjL, 'utf8');
        const bp = [];
        const anchorAuto = '        if ($c) {\n' +
          '          $c.value = String(count);\n' +
          '        }\n' +
          '        _LayaBench.loadAndRun(Laya2, runner, adapter, backend, $v, $c);';
        if (bc.includes(anchorAuto)) {
          bc = bc.replace(anchorAuto,
            '        if ($c) {\n' +
            '          $c.value = String(count);\n' +
            '        }\n' +
            '        if (q.get("mode") === "ramp") {\n' +
            '          _LayaBench.loadAndRamp(Laya2, runner, adapter, backend, $v);\n' +
            '        } else {\n' +
            '          _LayaBench.loadAndRun(Laya2, runner, adapter, backend, $v, $c);\n' +
            '        }');
          bp.push('auto-mode-branch');
        }
        const anchorStatic = '    /** 载入贴图并跑固定采样（HUD 按钮与自动测试共用） */\n' +
          '    static loadAndRun(Laya2, runner, adapter, backend, $v, $c) {';
        if (bc.includes(anchorStatic) && !bc.includes('static loadAndRamp')) {
          bc = bc.replace(anchorStatic, LAYA_RAMP_METHOD + '\n' + anchorStatic);
          bp.push('loadAndRamp');
        }
        if (bp.length) {
          fs.writeFileSync(bjL, bc, 'utf8');
          console.log('  ' + name + ' bundle patches: ' + bp.join(','));
        }
      }
    } else {
      console.log('[' + name + '] ' + label + ' 待发布（vendor/' + name + '/index.html 缺失）');
    }
  }

  // Cocos：单源双臂。vendor/cocos 是唯一构建产物；
  // dist/cocos = renderMode:4（WebGPU，不支持时引擎自动回退 WebGL）
  // dist/cocos-webgl = renderMode:2（强制 WebGL）
  // 同一份二进制只差 renderMode —— 后端对比的最严格控制变量。
  if (hasVendor('cocos')) {
    console.log('[cocos] 构建产物就位，派生双后端臂');
    for (const [dir, renderMode] of [['cocos', 4], ['cocos-webgl', 2]]) {
      fs.cpSync(path.join(VENDOR, 'cocos'), path.join(DIST, dir), { recursive: true });
      // patch 0: sim 插件脚本 —— 构建产物里烤进去的是旧版 Aquarium 时钟模型 boids-sim
      // （鱼绕屏幕中心 Lissajous 转圈），三引擎一致性要求用 sim-core 的
      // CppFishingCode 从右往左游动版。jsList 是裸脚本加载（不进打包），直接覆盖即可。
      for (const n of ['stats.js', 'bunny-sim.js', 'boids-sim.js', 'bench-runner.js']) {
        cp(path.join(SIM, n), path.join(DIST, dir, 'src', 'assets', 'scripts', 'sim', n));
      }
      // patch 1: settings.json rendering.renderMode
      const st = path.join(DIST, dir, 'src', 'settings.json');
      if (fs.existsSync(st)) {
        let c = fs.readFileSync(st, 'utf8');
        c = c.replace(/"rendering"\s*:\s*\{/, '"rendering":{"renderMode":' + renderMode + ',');
        fs.writeFileSync(st, c, 'utf8');
      }
      // patch 2: index.html —— System.import 前注入 drawCall 早期探针。
      // 必须早于引擎加载：Cocos 3.8.8 WebGL 后端 numDrawCalls 恒 0（命令缓冲不计数），
      // 且 2D 合批走 WEBGL_multi_draw 扩展（方法在扩展对象上，不在原型）→
      // hook 原型 draw* + 包装 getExtension，都要在引擎创建上下文之前完成。
      // 口径与 Egret WebGL probe 一致（draw/frame 窗口均值）。
      const ih = path.join(DIST, dir, 'index.html');
      if (fs.existsSync(ih) && !fs.readFileSync(ih, 'utf8').includes('__ccGlProbe')) {
        // 裸 JS（不带 script 标签）：插入到已有 <script> 块内 System.import 之前，
        // 避免嵌套 <script> 破坏 HTML 解析
        const probe = '(function(){if(window.__ccGlProbe)return;var P=window.__ccGlProbe={drawTotal:0,frameTotal:0,lastDraw:0,lastFrame:0};\n' +
          'var hd=function(o){if(!o||o.__bh)return;o.__bh=1;["drawElements","drawArrays","drawElementsInstanced","drawArraysInstanced"].forEach(function(nm){var f=o[nm];if(typeof f!=="function")return;o[nm]=function(){P.drawTotal++;return f.apply(this,arguments)}})};\n' +
          'hd(window.WebGLRenderingContext&&window.WebGLRenderingContext.prototype);\n' +
          'hd(window.WebGL2RenderingContext&&window.WebGL2RenderingContext.prototype);\n' +
          '[window.WebGLRenderingContext&&window.WebGLRenderingContext.prototype,window.WebGL2RenderingContext&&window.WebGL2RenderingContext.prototype].forEach(function(pr){if(!pr||pr.__gx)return;pr.__gx=1;var ge=pr.getExtension;if(typeof ge!=="function")return;pr.getExtension=function(){var e=ge.apply(this,arguments);var nm=arguments[0];if(e&&typeof nm==="string"&&/multi_draw|draw_instanced/.test(nm)){Object.keys(e).forEach(function(k){if(typeof e[k]==="function"&&/draw/i.test(k)&&!e["__bh_"+k]){var o=e[k];e["__bh_"+k]=1;e[k]=function(){P.drawTotal++;return o.apply(this,arguments)}}})}return e}});\n' +
          '(function fc(){P.frameTotal++;requestAnimationFrame(fc)})();})();\n    ';
        let c = fs.readFileSync(ih, 'utf8');
        c = c.replace('System.import(\'./index.js\')', probe + 'System.import(\'./index.js\')');
        fs.writeFileSync(ih, c, 'utf8');
        console.log('  dist/' + dir + ': 注入早期 drawCall 探针');
      }
      // patch 3: assets/main/index.js —— 后端探测改为看实际设备（renderMode:2 时 navigator.gpu 仍存在）
      //          + V3 纹理选择修复（旧构建 bug：V3 误用 12 张轮换，应为单贴图+变换）
      const mi = path.join(DIST, dir, 'assets', 'main', 'index.js');
      if (fs.existsSync(mi)) {
        let c = fs.readFileSync(mi, 'utf8');
        let patched = [];
        const oldBackend = 'this.liveBackend="undefined"!=typeof navigator&&navigator.gpu?"webgpu":"webgl"';
        if (c.indexOf(oldBackend) >= 0) {
          c = c.replace(oldBackend,
            'this.liveBackend=window.cc&&cc.director&&cc.director.root&&cc.director.root.device&&cc.director.root.device.gl?"webgl":"webgpu"');
          patched.push('backend-detect');
        }
        const oldV3 = '"boids"===this.mode?this.frames[this.sim.list[t].species%this.frames.length]:"V1"===this.variant?this.frames[0]:this.frames[t%this.frames.length]';
        if (c.indexOf(oldV3) >= 0) {
          c = c.replace(oldV3,
            '"boids"===this.mode?this.frames[this.sim.list[t].species%this.frames.length]:("V1"===this.variant||"V3"===this.variant)?this.frames[0]:this.frames[t%this.frames.length]');
          patched.push('V3-texture');
        }
        const oldDC = 'readDrawCalls=function(){var t=a.root&&a.root.device;return t?t.numDrawCalls:-1}';
        if (c.indexOf(oldDC) >= 0) {
          c = c.replace(oldDC,
            'readDrawCalls=function(){var t=a.root&&a.root.device;if(!t)return -1;if(t.gl){var P=window.__ccGlProbe;if(!P)return-1;var fd=P.frameTotal-P.lastFrame,dd=P.drawTotal-P.lastDraw;P.lastFrame=P.frameTotal;P.lastDraw=P.drawTotal;return fd>0?dd/fd:-1}return t.numDrawCalls}');
          patched.push('dc-probe');
        }
        // patch 5: boids 游动逻辑 —— 旧构建的 boids step 只写 setRotationFromEuler(0,0,-angle)，
        // 没处理"鱼贴图朝左"的朝向翻转，也没应用鱼种缩放（配合 patch 0 的新版 sim 必须一起换，
        // 否则角度 160°~220° 取负后鱼头永远背对前进方向）。对齐源工程 CocosBench.ts 的翻转公式。
        const oldBoids = 'if("boids"===this.mode){this.sim.update(e);for(var r=0;r<i;r++)o[r].setPosition(this.toX(n[r].x),this.toY(n[r].y),0),o[r].setRotationFromEuler(0,0,57.29577951*-n[r].angle)}';
        if (c.indexOf(oldBoids) >= 0) {
          c = c.replace(oldBoids,
            'if("boids"===this.mode){this.sim.update(e);for(var r=0;r<i;r++){var cA=Math.cos(n[r].angle),fS=n[r].scale||1;o[r].setPosition(this.toX(n[r].x),this.toY(n[r].y),0);o[r].setScale(cA>0?-fS:fS,fS,1);o[r].setRotationFromEuler(0,0,-57.29577951*(cA>0?n[r].angle:n[r].angle-Math.PI))}}');
          patched.push('boids-motion');
        }
        // patch 6: 2D 承载力闭环 —— ?auto=1&mode=ramp 走 autoRamp（cap+逐档曲线），
        //          组合结果经 __bRampExport 写 __benchLastResult 供总控 iframe 采集。
        //          R1: auto 入口按 mode 分流；R2: ramp 分支 rampRun→autoRamp（口径=3D 水族馆）。
        const oldAutoFixed = 'this.runVariant(e,n,"fixed")';
        if (c.indexOf(oldAutoFixed) >= 0) {
          c = c.replace(oldAutoFixed, 'this.runVariant(e,n,"ramp"===t.get("mode")?"ramp":"fixed")');
          patched.push('auto-mode-branch');
        }
        const oldRampRun = 'i.runner.rampRun({engine:"cocos-creator-3.8.8",variant:t,backend:i.liveBackend,stepCount:1e3,stepMs:2e3,maxCount:2e5,bounds:o})';
        if (c.indexOf(oldRampRun) >= 0) {
          c = c.replace(oldRampRun,
            '(function(){window.__bRampLevels=[];i.runner.autoRamp({engine:"cocos-creator-3.8.8",variant:t,backend:i.liveBackend,' +
            'counts:[2e3,5e3,1e4,2e4,3e4,4e4,5e4,6e4,7e4,8e4],preWarmSec:5,sampleSec:6,' +
            'onLevel:function(lv){if("retry"===lv.phase){i.outEl.textContent="档 "+lv.count+" 疑似抖动，加倍预热重测…";return}' +
            'if("done"===lv.phase&&lv.json){var j=lv.json;window.__bRampLevels.push({count:lv.count,fps:j.fps,p50:j.p50,p95:j.p95,p99:j.p99,' +
            'p1Low:j.p1Low,stdDev:j.stdDev,drawCallAvg:j.drawCallAvg,nodeCount:j.nodeCount,actualBackend:j.actualBackend,backendValid:j.backendValid,' +
            'gpuVendor:j.gpuVendor,gpuRenderer:j.gpuRenderer,renderWidth:j.renderWidth,renderHeight:j.renderHeight,dpr:j.dpr,stable:lv.stable});' +
            'if(i.outEl){i.outEl.style.display="block";i.outEl.textContent+="\\n  "+lv.count+" 只: "+j.fps+"fps "+(lv.stable?"✓稳":"✗掉帧")+" | p95 "+j.p95+"ms | dc "+j.drawCallAvg}}},' +
            'onDone:function(rd){__bRampExport("cocos-creator-3.8.8",t,i.liveBackend,rd,window.__bRampLevels)}})})()');
          patched.push('autoRamp-drive');
        }
        if (patched.length) fs.writeFileSync(mi, c, 'utf8');
        // patch 4: 自动测试 shim —— ?auto=1 时模拟点固定采样按钮（轮询等 HUD 就绪；
        //          若源码级 auto 已跑过（__benchAutoStarted 标记）则跳过，防双重触发）
        if (!c.includes('q.get("auto")==="1"&&!window.__benchAutoStarted')) {
          const shim = '\n(function(){var q=new URLSearchParams(location.search);' +
            'if(q.get("auto")==="1"&&!window.__benchAutoStarted){var tries=0;var t=setInterval(function(){' +
            'var sv=document.querySelector("#cbv"),sc=document.querySelector("#ccnt"),b=document.querySelector("#cfixed");' +
            'if(b){clearInterval(t);if(sv)sv.value=q.get("variant")||"V1";' +
            'if(sc)sc.value=q.get("count")||"10000";b.click();}else if(++tries>60){clearInterval(t);}},500);}})();\n';
          fs.appendFileSync(mi, shim, 'utf8');
        }
        // patch 7: __bRampExport —— autoRamp 逐档结果聚合导出（runtime 后端校验 + cap/levels 组合 JSON）
        if (!c.includes('window.__bRampExport=function')) {
          const rampExport = '\nif(!window.__bRampExport){window.__bRampExport=function(engine,variant,actualBackend,rd,levels){' +
            'var acts=[];(levels||[]).forEach(function(l){var b=l.actualBackend;b&&acts.indexOf(b)<0&&acts.push(b)});' +
            'var rt=1===acts.length?acts[0]:actualBackend||"webgl";' +
            'var req=new URLSearchParams(location.search).get("backend");' +
            'var rv=1===acts.length&&rt===(req||"webgl");' +
            'var res={meta:{engine:engine,variant:variant,backend:rt,requestedBackend:req||rt,backendValid:rv,mode:"autoRamp"},' +
            'cap:rd.cap,jankAt:rd.jankAt,capped:rd.capped,invalidCurve:rd.invalidCurve,' +
            'thresholdAt:rd.thresholdAt,fineStart:rd.fineStart,fineStep:rd.fineStep,levels:levels||[]};' +
            'window.__benchRampResult=res;BenchRunner.exportJSON(res)}}\n';
          fs.appendFileSync(mi, rampExport, 'utf8');
        }
        if (patched.length) console.log('  dist/' + dir + ' patches: ' + patched.join(','));
      }
      console.log('  dist/' + dir + '（renderMode=' + renderMode + '）');
    }
  } else {
    console.log('[cocos] 待发布（vendor/cocos/index.html 缺失，双臂均跳过）');
  }

  // Cocos 3D 水族馆：单产物双后端（renderMode 控制 gfxAPI）。
  // 3D 用 MeshRenderer + 动态 mesh + 尾巴顶点动画，与 2D Sprite 合批路径不同，
  // 不套用 2D 的 sim/贴图/合批 patch，只做双臂拆分 + drawCall 探针 + auto-shim。
  if (hasVendor('cocos3d')) {
    console.log('[cocos3d] 3D 水族馆产物就位，派生双后端臂');
    for (const [dir, renderMode] of [['cocos3d', 4], ['cocos3d-webgl', 2]]) {
      fs.cpSync(path.join(VENDOR, 'cocos3d'), path.join(DIST, dir), { recursive: true });
      // patch 0: sim 插件脚本覆盖 —— 与 2D 分支同理：jsList 裸脚本加载不进打包，
      // 用 bench/sim-core 源文件覆盖产物内烤进去的旧副本，保证 stats/bench-runner
      // 与三引擎一致（含 p1Low/stdDev、autoRamp）。路径 jsList 写 assets/scripts/sim-core/*.js，
      // 物理文件在 src/assets/scripts/sim-core/（loader 处理 src/ 前缀）。
      for (const n of ['stats.js', 'bunny-sim.js', 'boids-sim.js', 'boids3d-sim.js', 'bench-runner.js']) {
        cp(path.join(SIM, n), path.join(DIST, dir, 'src', 'assets', 'scripts', 'sim-core', n));
      }
      // patch 1: settings.json rendering.renderMode
      // 注：不要动 customPipeline。3.8.8 的引擎 bundle 只打了 "Builtin" custom pipeline
      // （custom-pipeline + custom-pipeline-builtin-scripts），根本没有独立 legacy 前向管线；
      // 运行时把 customPipeline 置 false → root.setRenderPipeline 找不到 legacy_rendering
      // → errorID(1223) → 管线 null → 全场景崩黑屏。WebGPU 下 "18 UBO 超 12" 只是非致命
      // 校验警告，场景仍正常渲染出 fps 数据。
      const st = path.join(DIST, dir, 'src', 'settings.json');
      if (fs.existsSync(st)) {
        let c = fs.readFileSync(st, 'utf8');
        c = c.replace(/"rendering"\s*:\s*\{/, '"rendering":{"renderMode":' + renderMode + ',');
        // jsList 缓存击穿：sim-core 判定/统计代码迭代频繁，浏览器磁盘缓存会让 iframe 子资源
        // 停在旧版（判定标签与数值对不上、修复不生效）。构建时间戳做版本参数强制重新拉取
        const stamp = Date.now().toString(36);
        c = c.replace(/(assets\/scripts\/sim-core\/[a-z-]+\.js)(?!\?)/g, '$1?v=' + stamp);
        fs.writeFileSync(st, c, 'utf8');
      }
      // patch 2: index.html —— System.import 前注入 drawCall 早期探针（WebGL 后端 numDrawCalls 恒 0）
      const ih = path.join(DIST, dir, 'index.html');
      if (fs.existsSync(ih) && !fs.readFileSync(ih, 'utf8').includes('__ccGlProbe')) {
        const probe = '(function(){if(window.__ccGlProbe)return;var P=window.__ccGlProbe={drawTotal:0,frameTotal:0,lastDraw:0,lastFrame:0};\n' +
          'var hd=function(o){if(!o||o.__bh)return;o.__bh=1;["drawElements","drawArrays","drawElementsInstanced","drawArraysInstanced"].forEach(function(nm){var f=o[nm];if(typeof f!=="function")return;o[nm]=function(){P.drawTotal++;return f.apply(this,arguments)}})};\n' +
          'hd(window.WebGLRenderingContext&&window.WebGLRenderingContext.prototype);\n' +
          'hd(window.WebGL2RenderingContext&&window.WebGL2RenderingContext.prototype);\n' +
          '[window.WebGLRenderingContext&&window.WebGLRenderingContext.prototype,window.WebGL2RenderingContext&&window.WebGL2RenderingContext.prototype].forEach(function(pr){if(!pr||pr.__gx)return;pr.__gx=1;var ge=pr.getExtension;if(typeof ge!=="function")return;pr.getExtension=function(){var e=ge.apply(this,arguments);var nm=arguments[0];if(e&&typeof nm==="string"&&/multi_draw|draw_instanced/.test(nm)){Object.keys(e).forEach(function(k){if(typeof e[k]==="function"&&/draw/i.test(k)&&!e["__bh_"+k]){var o=e[k];e["__bh_"+k]=1;e[k]=function(){P.drawTotal++;return o.apply(this,arguments)}}})}return e}});\n' +
          '(function fc(){P.frameTotal++;requestAnimationFrame(fc)})();})();\n    ';
        let c = fs.readFileSync(ih, 'utf8');
        c = c.replace('System.import(\'./index.js\')', probe + 'System.import(\'./index.js\')');
        fs.writeFileSync(ih, c, 'utf8');
        console.log('  dist/' + dir + ': 注入早期 drawCall 探针');
      }
      // patch 2b: assets/main/index.js —— FishBench3D 已在源码内实现 readDrawCalls 探针 + autoRamp
      // （独立于 CocosBench3D，走 HUD fb3* 按钮 / ?auto=1 URL 驱动），无需再对产物做
      // readDrawCalls / runRamp / auto-shim 字符串替换。唯一仍需要的是下方 index.html 探针。
      // patch 2c: 修正 backend() 枚举 + 暴露真实后端。FishBench3D/CocosBench3D 源码里写了
      // `gfxAPI===6?'webgpu':'webgl'`，但 gfx.API 真枚举是 WEBGL=6, WEBGL2=7, WEBGPU=8。
      // ↑ 会把 webgpu 臂（renderMode=4）在浏览器无可用 WebGPU（非安全上下文 / requestAdapter
      // 返回 null，如虚拟显示器无 GPU）时静默回退 WebGL 这一事实掩盖掉——两臂都跑 WebGL
      // 才导致 cap 完全一致。此处按 8===webgpu 判定，并把 gfxAPI + navigator.gpu 打到
      // window.__fb3RealBackend 和控制台，供诊断对比有效性。
      // 注意：产物里有【两份】编译后的 backend()（CocosBench3D 与 FishBench3D），压缩后变量名
      // 不同（s.backend/a.root 与 u.backend/f.root）——必须正则全量替换，只匹配其一必漏。
      const mi3 = path.join(DIST, dir, 'assets', 'main', 'index.js');
      if (fs.existsSync(mi3)) {
        let c3 = fs.readFileSync(mi3, 'utf8');
        let patchedB3 = 0;
        const reB3 = /([a-zA-Z_$][\w$]*)\.backend=function\(\)\{var ([a-zA-Z_$][\w$]*)=([a-zA-Z_$][\w$]*)\.root&&\3\.root\.device;return \2&&void 0!==\2\.gfxAPI\?6===\2\.gfxAPI\?"webgpu":"webgl":navigator\.gpu\?"webgpu":"webgl"\}/g;
        c3 = c3.replace(reB3, function (_m, cls, dev, dirVar) {
          patchedB3++;
          return cls + '.backend=function(){var ' + dev + '=' + dirVar + '.root&&' + dirVar +
            '.root.device;if(' + dev + '&&void 0!==' + dev + '.gfxAPI){var b=8===' + dev +
            '.gfxAPI?"webgpu":"webgl";window.__fb3RealBackend=b;window.__fb3GfxAPI=' + dev +
            '.gfxAPI;console.info("[Bench3D] gfxAPI="+' + dev + '.gfxAPI+" -> "+b+" , navigator.gpu="+!!(navigator&&navigator.gpu));return b}' +
            'var b2=navigator.gpu?"webgpu":"webgl";window.__fb3RealBackend=b2;return b2}';
        });
        // 附加 WebGPU adapter 探针：navigator.gpu 存在 ≠ 有可用 adapter。
        // 虚拟显示器/无 GPU 机器 requestAdapter() 返回 null → renderMode=4 静默回退 WebGL，
        // 必须在控制台显式暴露（否则"两臂数据一样"无法定位）。
        if (!c3.includes('__fb3AdapterProbe')) {
          c3 += '\n/*__fb3AdapterProbe*/(function(){try{var g=navigator.gpu;if(!g){console.warn("[Bench3D] navigator.gpu MISSING -> renderMode4 将回退 WebGL");return}g.requestAdapter().then(function(ad){window.__fb3Adapter=!!ad;if(!ad){console.warn("[Bench3D] WebGPU requestAdapter -> NULL（无可用 GPU adapter，如虚拟显示器）-> renderMode4 回退 WebGL，WebGPU 臂对比无效");return}function say(ai){console.info("[Bench3D] WebGPU adapter OK: "+(ai?((ai.vendor||"")+" "+(ai.description||ai.architecture||"")).trim():"(no info)"))}var ii=ad.info;if(ii){say(ii)}else if(ad.requestAdapterInfo){ad.requestAdapterInfo().then(say,function(){say(null)})}else{say(null)}},function(e){console.warn("[Bench3D] WebGPU requestAdapter rejected:",e&&e.message)})}catch(e){}})();\n';
        }
        fs.writeFileSync(mi3, c3, 'utf8');
        if (patchedB3) console.log('  dist/' + dir + ': 修正 backend() x' + patchedB3 + '（8=webgpu）+ adapter 探针');
      }
      // 档位上限热扩（过渡期免引擎重建）：50..50000 → 追加 60000..100000（源码 counts 已同步扩）
      const c3counts = path.join(DIST, dir, 'assets', 'main', 'index.js');
      if (fs.existsSync(c3counts)) {
        let cc = fs.readFileSync(c3counts, 'utf8');
        if (!cc.includes('1e5')) {
          if (cc.includes('45e3,5e4]')) {
            cc = cc.replace('45e3,5e4]', '45e3,5e4,6e4,7e4,8e4,9e4,1e5]');
            fs.writeFileSync(c3counts, cc, 'utf8');
            console.log('  dist/' + dir + ': 档位上限热扩至 100000');
          } else {
            console.log('  [warn] dist/' + dir + ': 未找到档位表尾部');
          }
        }
        // 鱼种分布 v2 热补：旧 fishSetting=2 封顶（大恒2/中恒80）→ 大2%/种 中8%/种 小补满（与源码 buildDefs v2 同式）
        // ⚠ 修复分支：早期补丁串漏了 return（buildDefs 返回 undefined → setCount 崩），检测到即修复
        const V2_FIXED = 'a=Math.floor(.02*t),r=Math.floor(.08*t);n[3].count=Math.min(a,t),n[4].count=Math.min(a,t);return n[1].count=Math.min(r,t),n[2].count=Math.min(r,t),n[0].count=Math.max(0,t-n[1].count-n[2].count-n[3].count-n[4].count),n';
        const V2_BROKEN = 'a=Math.floor(.02*t),r=Math.floor(.08*t);n[3].count=Math.min(a,t),n[4].count=Math.min(a,t);n[1].count=Math.min(r,t),n[2].count=Math.min(r,t);n[0].count=Math.max(0,t-n[1].count-n[2].count-n[3].count-n[4].count),n';
        const V2_ORIG = 'a=t<100?1:2,r=Math.min(Math.floor(t/10),80);n[3].count=Math.min(a,t),n[4].count=Math.min(a,t);var i=t-n[3].count-n[4].count;return n[1].count=Math.min(r,Math.floor(i/2)),n[2].count=Math.min(r,Math.floor(i/2)),i=t-n[1].count-n[2].count-n[3].count-n[4].count,n[0].count=Math.max(0,i),n';
        if (cc.includes(V2_BROKEN)) {
          cc = cc.replace(V2_BROKEN, V2_FIXED);
          fs.writeFileSync(c3counts, cc, 'utf8');
          console.log('  dist/' + dir + ': 修复 v2 热补缺 return（buildDocs 崩溃根因）');
        } else if (!cc.includes('return n[1].count=Math.min(r,t)') && cc.includes(V2_ORIG)) {
          cc = cc.replace(V2_ORIG, V2_FIXED);
          fs.writeFileSync(c3counts, cc, 'utf8');
          console.log('  dist/' + dir + ': 鱼种分布 v2 热补（大2%/种 中8%/种）');
        } else if (!cc.includes('.02*t')) {
          console.log('  [warn] dist/' + dir + ': 未找到分布公式（bundle 模板变更?）');
        }
      }
      console.log('  dist/' + dir + '（renderMode=' + renderMode + '）');
    }
  } else {
    console.log('[cocos3d] 待发布（vendor/cocos3d/index.html 缺失，双臂均跳过）——需在 Cocos Creator 构建 proj-cocos-3d 为 web-mobile 后拷入 vendor/cocos3d');
  }

  // 7. 骨骼动画场景（egret-spine 直接从 bench/engines/spine-bench/egret/ 组装；
  //    laya-spine / cocos-spine 等 IDE 发布产物就位后从 vendor 拷贝）
  console.log('[spine/dhxy]');

  // -- Egret 骨骼（零配置，直接组装，同 egret 主入口做法） --
  const SPINE_EGRET = path.join(ROOT, 'bench', 'engines', 'spine-bench', 'egret');
  const SPINE_SIM   = path.join(ROOT, 'bench', 'engines', 'spine-bench');
  const SPINE_ASSETS = path.join(ROOT, 'bench', 'assets', 'spine-scene');

  // index.html：修正脚本路径（开发路径 → dist 相对路径）
  let spEgHtml = fs.readFileSync(path.join(SPINE_EGRET, 'index.html'), 'utf8')
    .replace(/\.\.\/\.\.\/\.\.\/sim-core\//g, '../sim/')
    .replace(/\.\.\/spine-sim\.js/g, 'spine-sim.js')
    .replace(/\.\.\/\.\.\/egret-engine\//g, 'egret-lib/')
    .replace(/\.\.\/\.\.\/egret-webgpu\//g, '../egret-webgpu/')
    .replace(/\.\.\/\.\.\/\.\.\/\.\.\/egret-selfdev\/5\.4\.1\/build\/egret-spine\//g, 'egret-lib/');
  fs.mkdirSync(path.join(DIST, 'egret-spine'), { recursive: true });
  fs.writeFileSync(path.join(DIST, 'egret-spine', 'index.html'), spEgHtml, 'utf8');

  // main.js：修正资源路径
  let spEgMain = fs.readFileSync(path.join(SPINE_EGRET, 'main.js'), 'utf8')
    .replace(/\.\.\/\.\.\/\.\.\/assets\/spine-scene\//g, 'spine-assets/');
  fs.writeFileSync(path.join(DIST, 'egret-spine', 'main.js'), spEgMain, 'utf8');

  // spine-sim.js
  cp(path.join(SPINE_SIM, 'spine-sim.js'), path.join(DIST, 'egret-spine', 'spine-sim.js'));

  // 引擎库（和主 egret 共享，直接拷贝）
  cp(path.join(ROOT, 'bench', 'engines', 'egret-engine', 'egret.js'),     path.join(DIST, 'egret-spine', 'egret-lib', 'egret.js'));
  cp(path.join(ROOT, 'bench', 'engines', 'egret-engine', 'egret.web.js'), path.join(DIST, 'egret-spine', 'egret-lib', 'egret.web.js'));
  // Spine 运行时
  const spineRtSrc = path.join(ROOT, 'egret-selfdev', '5.4.1', 'build', 'egret-spine', 'egret-spine.js');
  if (fs.existsSync(spineRtSrc)) {
    cp(spineRtSrc, path.join(DIST, 'egret-spine', 'egret-lib', 'egret-spine.js'));
  } else {
    console.log('  ⚠ egret-spine.js 缺失（egret-selfdev/5.4.1/build/egret-spine/），骨骼动画无法加载');
  }

  // spine 资源：.json / .atlas / .png + bg.jpg（全量拷贝到 spine-assets/spine/）
  const spineDir = path.join(SPINE_ASSETS, 'spine');
  const spineDistDir = path.join(DIST, 'egret-spine', 'spine-assets', 'spine');
  fs.mkdirSync(spineDistDir, { recursive: true });
  for (const f of fs.readdirSync(spineDir)) {
    cp(path.join(spineDir, f), path.join(spineDistDir, f));
  }
  const bgSrc = path.join(SPINE_ASSETS, 'bg.jpg');
  if (fs.existsSync(bgSrc)) cp(bgSrc, path.join(DIST, 'egret-spine', 'spine-assets', 'bg.jpg'));
  console.log('  dist/egret-spine 就位（Egret + egret-spine 3.8 + 大话西游资源）');

  // -- Laya / Cocos 骨骼产物（等 IDE 发布后拷入 vendor/laya-spine 等目录） --
  for (const vname of ['laya-spine', 'laya-spine-webgl', 'cocos-spine', 'cocos-spine-webgl']) {
    if (hasVendor(vname)) {
      console.log('[' + vname + '] 就位');
      fs.cpSync(path.join(VENDOR, vname), path.join(DIST, vname), { recursive: true });
    } else {
      console.log('[' + vname + '] 待发布（vendor/' + vname + '/index.html 缺失）');
    }
  }
  // 8. 预烘焙骨骼动画（mc-bench）—— Egret 直接组装，Laya/Cocos 等 vendor 就绪后接入
  console.log('[mc/dhxy-mc]');
  const MC_EGRET = path.join(ROOT, 'bench', 'engines', 'mc-bench', 'egret');
  const MC_SIM   = path.join(ROOT, 'bench', 'engines', 'mc-bench');
  const MC_ASSETS = path.join(ROOT, 'bench', 'assets', 'mc-scene');

  // index.html：修路径
  let mcEgHtml = fs.readFileSync(path.join(MC_EGRET, 'index.html'), 'utf8')
    .replace(/\.\.\/\.\.\/\.\.\/sim-core\//g, '../sim/')
    .replace(/\.\.\/pathfinding\.js/g, 'pathfinding.js')
    .replace(/\.\.\/mc-sim\.js/g, 'mc-sim.js')
    .replace(/\.\.\/\.\.\/egret-engine\//g, 'egret-lib/')
    .replace(/\.\.\/\.\.\/egret-webgpu\//g, '../egret-webgpu/')
    .replace(/\.\.\/\.\.\/\.\.\/\.\.\/egret-selfdev\/5\.4\.1\/build\/game\//g, 'egret-lib/');
  fs.mkdirSync(path.join(DIST, 'egret-mc'), { recursive: true });
  fs.writeFileSync(path.join(DIST, 'egret-mc', 'index.html'), mcEgHtml, 'utf8');

  // main.js：修资源路径
  let mcEgMain = fs.readFileSync(path.join(MC_EGRET, 'main.js'), 'utf8')
    .replace(/mc-assets\//g, 'mc-assets/');
  fs.writeFileSync(path.join(DIST, 'egret-mc', 'main.js'), mcEgMain, 'utf8');

  cp(path.join(MC_SIM, 'mc-sim.js'), path.join(DIST, 'egret-mc', 'mc-sim.js'));
  // pathfinding.js（游戏同款 A* 库）
  const pfJsSrc = path.join(MC_SIM, 'pathfinding.js');
  if (fs.existsSync(pfJsSrc)) {
    cp(pfJsSrc, path.join(DIST, 'egret-mc', 'pathfinding.js'));
  }
  cp(path.join(ROOT, 'bench', 'engines', 'egret-engine', 'egret.js'),     path.join(DIST, 'egret-mc', 'egret-lib', 'egret.js'));
  cp(path.join(ROOT, 'bench', 'engines', 'egret-engine', 'egret.web.js'), path.join(DIST, 'egret-mc', 'egret-lib', 'egret.web.js'));
  // game.js：MovieClip / MovieClipDataFactory
  const gameJsSrc = path.join(ROOT, 'egret-selfdev', '5.4.1', 'build', 'game', 'game.js');
  if (fs.existsSync(gameJsSrc)) {
    cp(gameJsSrc, path.join(DIST, 'egret-mc', 'egret-lib', 'game.js'));
  } else {
    console.log('  ⚠ game.js 缺失，MovieClip 无法使用');
  }

  // 常规玩家模型：body/head/weapon 三层资源（与 ShapeComponent 标准路径一致）
  // 保留旧 mc-scene/body 的 animate2，供原始方向资源缺失时回退。
  const mcModelSrc = path.join(ROOT, 'model');
  for (const layer of ['body', 'head', 'weapon']) {
    const layerSrc = path.join(mcModelSrc, layer);
    if (!fs.existsSync(layerSrc)) continue;
    for (const modelId of fs.readdirSync(layerSrc)) {
      const modelSrc = path.join(layerSrc, modelId);
      if (!fs.statSync(modelSrc).isDirectory()) continue;
      for (const f of fs.readdirSync(modelSrc)) {
        cp(path.join(modelSrc, f), path.join(DIST, 'egret-mc', 'mc-assets', layer, modelId, f));
      }
    }
  }

  // 原 bench 的合并 body 资源保留为 animate2 方向补充；游戏常规模型的 animate0
  // 与该资源方向数据同源，按游戏 0/2 资源组 + 水平镜像组成四方向。
  const mcBodySrc  = path.join(MC_ASSETS, 'body');
  const mcBodyDist = path.join(DIST, 'egret-mc', 'mc-assets', 'legacy-body');
  for (const charId of fs.readdirSync(mcBodySrc)) {
    const charSrc = path.join(mcBodySrc, charId);
    if (!fs.statSync(charSrc).isDirectory()) continue;
    for (const f of fs.readdirSync(charSrc)) {
      cp(path.join(charSrc, f), path.join(mcBodyDist, charId, f));
      if (f.startsWith('animate2.')) {
        cp(path.join(charSrc, f), path.join(DIST, 'egret-mc', 'mc-assets', 'body', charId, f));
      }
    }
  }

  // 地图资源（场景背景切片 + .map 寻路文件）
  const mcMapSrc  = path.join(MC_ASSETS, 'map', '1001');
  const mcMapDist = path.join(DIST, 'egret-mc', 'mc-assets', 'map', '1001');
  if (fs.existsSync(mcMapSrc)) {
    for (const f of fs.readdirSync(mcMapSrc)) {
      cp(path.join(mcMapSrc, f), path.join(mcMapDist, f));
    }
  }
  console.log('  dist/egret-mc 就位（8职业预烘焙骨骼动画）');

  // Laya/Cocos mc 产物（等 IDE 发布后拷入 vendor）
  for (const vname of ['laya-mc', 'laya-mc-webgl', 'cocos-mc', 'cocos-mc-webgl']) {
    if (hasVendor(vname)) {
      console.log('[' + vname + '] 就位');
      fs.cpSync(path.join(VENDOR, vname), path.join(DIST, vname), { recursive: true });
    } else {
      console.log('[' + vname + '] 待发布（vendor/' + vname + '/index.html 缺失）');
    }
  }

  const SCENES = [
    { key: 'bunny', title: 'BunnyMark', icon: '🐰', sub: '2D 精灵压力 · V1-V4 合批/破批/变换',
      engines: ['egret', 'laya', 'cocos'] },
    { key: 'boids', title: '水族馆', icon: '🐟', sub: '大量 2D 单位综合运动（旋转+多纹理）',
      engines: ['egret', 'laya', 'cocos'] },
    { key: 'boids3d', title: '3D 水族馆', icon: '🐠', sub: 'Laya/Cocos 3D 鱼群 · GPU instancing · 网格/光照/尾巴动画', engines: ['cocos3d', 'laya3d'] },
    { key: 'dhxy',   title: '大话西游骨骼（预烘焙）', icon: '⚔️', sub: '8职业混编 · 三层帧动画 + A* 随机行走（MMO核心）',
      engines: ['egret-mc', 'laya-mc', 'cocos-mc'] },
    { key: 'cloth', title: '布料', icon: '🧵', sub: '布料/物理模拟（规划中）' }
  ];

  // 引擎×后端 → 产物入口（相对 dist 根）
  const BACKENDS = {
    'egret':       { name: 'Egret 自研 5.4.1',       webgl: 'egret/index.html',          webgpu: 'egret/index.html' },
    'laya':        { name: 'LayaAir 3.4',             webgl: 'laya-webgl/index.html',     webgpu: 'laya/index.html' },
    'cocos':       { name: 'Cocos Creator 3.8.8',     webgl: 'cocos-webgl/index.html',    webgpu: 'cocos/index.html' },
    'cocos3d':     { name: 'Cocos Creator 3.8.8 (3D)',webgl: 'cocos3d-webgl/index.html',  webgpu: 'cocos3d/index.html' },
    'laya3d':      { name: 'LayaAir 3.4 (3D)',        webgl: 'laya3d/index.html',         webgpu: 'laya3d-webgpu/index.html' },
    // laya3d-webgpu：诊断臂。laya.webgpu_2D/3D.js 走 LayaX 新管线（GLSL→SPIR-V→WGSL）。
    // 自定义 Shader3D 是否兼容需实测：页面会捕获 console.error 显示编译失败的 shader 与 info_log。
    // 骨骼动画专用产物目录（Spine Q版）
    'egret-spine': { name: 'Egret 自研 5.4.1 骨骼（Spine）',   webgl: 'egret-spine/index.html',    webgpu: 'egret-spine/index.html' },
    'laya-spine':  { name: 'LayaAir 3.4 骨骼（Spine）',        webgl: 'laya-spine-webgl/index.html', webgpu: 'laya-spine/index.html' },
    'cocos-spine': { name: 'Cocos Creator 3.8.8 骨骼（Spine）', webgl: 'cocos-spine-webgl/index.html', webgpu: 'cocos-spine/index.html' },
    // 预烘焙骨骼动画（真实战斗角色 mc 帧序列）
    'egret-mc':   { name: 'Egret 自研 5.4.1 预烘焙骨骼',  webgl: 'egret-mc/index.html',    webgpu: 'egret-mc/index.html' },
    'laya-mc':    { name: 'LayaAir 3.4 预烘焙骨骼',       webgl: 'laya-mc-webgl/index.html', webgpu: 'laya-mc/index.html' },
    'cocos-mc':   { name: 'Cocos Creator 3.8.8 预烘焙骨骼', webgl: 'cocos-mc-webgl/index.html', webgpu: 'cocos-mc/index.html' }
  };

  // 测试中心：承载全部测试入口、场景说明与 JSON 数据看板链接，避免主站混入跑分操作。
  const testCards = SCENES.map(s => {
    return `<a class="scene" href="scene-${s.key}.html">
      <div class="ic">${s.icon}</div>
      <div class="tx"><h3>${s.title}</h3><p>${s.sub}</p></div>
      <span class="arrow">→</span>
    </a>`;
  }).join('\n');
  const tests = `<!DOCTYPE html>
<html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>测试中心 · 引擎对比基准</title><style>
:root{--bg:#fff;--soft:#f6f6f7;--text:#213547;--muted:#666;--border:#d7d7db;--brand:#3451b2}
@media(prefers-color-scheme:dark){:root{--bg:#1b1b1f;--soft:#252529;--text:#eee;--muted:#aaa;--border:#3a3a3f;--brand:#7e93e0}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.7 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif}.wrap{max-width:1000px;margin:0 auto;padding:48px 24px}a{color:var(--brand);text-decoration:none}.back{font-size:14px}h1{font-size:32px;margin:24px 0 6px}h2{font-size:22px;border-top:1px solid var(--border);padding-top:28px;margin-top:42px}.lead{color:var(--muted);max-width:760px}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.scene{display:flex;align-items:center;gap:14px;color:var(--text);border:1px solid var(--border);border-radius:12px;padding:18px 20px}.scene:hover{border-color:var(--brand)}.ic{font-size:30px}.tx{flex:1}.tx h3{margin:0;font-size:16px}.tx p{margin:2px 0 0;color:var(--muted);font-size:13px}.arrow{color:var(--muted);font-size:18px}.data{display:inline-block;border:1px solid var(--brand);color:#fff;background:var(--brand);padding:9px 20px;border-radius:8px;font-weight:600}@media(max-width:640px){.grid{grid-template-columns:1fr}}
</style></head><body><main class="wrap">
<a class="back" href="index.html">← 返回主站</a><h1>测试中心</h1><p class="lead">运行统一基准、导出 JSON，并在数据看板进行横向比较。主站只保留源码、机制与结论；所有测试操作集中在此处。</p>
<h2>测试场景</h2><div class="grid">${testCards}</div>
<h2>结果数据</h2><p class="lead">各引擎测试完成后导出 <code>bench_*.json</code>；将文件拖入看板生成固定采样与阶梯承载力对比表。</p><a class="data" href="dashboard/index.html">📊 打开 JSON 数据看板</a>
</main></body></html>`;
  fs.writeFileSync(path.join(DIST, 'tests.html'), tests, 'utf8');
  console.log('  dist/tests.html（测试中心）就位');

  // 主页（知识与结论），模板见 bench/web/tpl/home.html
  const armLine = (name, ok, note) =>
    '<div>' + (ok ? '<span class="ok">✓</span>' : '<span class="no">✗</span>') + ' ' +
    name + (note ? ' — ' + note : '') + '</div>';
  const armRows = [
    armLine('Egret 自研 5.4.1（WebGL + WebGPU）', fs.existsSync(path.join(EGRET_LIB, 'egret.js')), 'build.js 全自动组装'),
    armLine('Egret WebGPU vs WebGL 自比面板', fs.existsSync(path.join(EGRET_WEBGPU, 'bunnymark.html')), ''),
    armLine('LayaAir 3.4 WebGPU 臂', hasVendor('laya'), 'vendor/laya'),
    armLine('LayaAir 3.4 WebGL 臂', hasVendor('laya-webgl'), 'vendor/laya-webgl'),
    armLine('Cocos Creator 3.8.8 双后端臂', hasVendor('cocos'), 'vendor/cocos 单产物派生'),
    armLine('LayaAir 3D（WebGL / WebGPU）', fs.existsSync(path.join(ROOT, 'laya-proj-3d', 'release', 'web', 'index.html')), 'laya-proj-3d/release/web'),
    armLine('Cocos Creator 3D（WebGL / WebGPU）', hasVendor('cocos3d'), 'vendor/cocos3d'),
    armLine('骨骼 / 预烘焙多引擎臂（Spine · MC）', hasVendor('laya-spine') && hasVendor('cocos-spine') && hasVendor('laya-mc') && hasVendor('cocos-mc'),
      'Egret 侧内置，Laya/Cocos 待 vendor 就位')
  ];

  const BUILD_TS = new Date().toISOString().replace('T', ' ').slice(0, 19);
  let home = fs.readFileSync(path.join(WEB, 'tpl', 'home.html'), 'utf8')
    .replace(/{{ARM_STATUS}}/g, armRows.join('\n'))
    .replace(/{{BUILD_TS}}/g, BUILD_TS);
  fs.writeFileSync(path.join(DIST, 'index.html'), home, 'utf8');
  console.log('  dist/index.html（主界面，SDF-Kit 风格）就位');

  // 数据看板（拖入各引擎导出 JSON 出对比表）
  fs.cpSync(path.join(ROOT, 'bench', 'dashboard'), path.join(DIST, 'dashboard'), { recursive: true });
  console.log('  dist/dashboard 就位（实测数据看板）');

  // 测试子界面（总控面板：切引擎/后端）
  for (const s of SCENES) {
    const engines = [];
    const allowed = s.engines || Object.keys(BACKENDS);
    for (const key of allowed) {
      const info = BACKENDS[key];
      if (!info) continue;
      // egret / egret-spine / egret-mc / laya3d：无 vendor，直接从源码/构建产物组装，始终可用
      // laya：两份独立产物（webgpu/webgl 各自发布）
      // cocos / cocos3d / cocos-spine：单 vendor 双后端派生
      // laya-spine / laya-spine-webgl：vendor 独立产物
      const isEgretDirect = key === 'egret' || key === 'egret-spine' || key === 'egret-mc' || key === 'laya3d';
      const webglOk  = isEgretDirect
        || (key === 'laya'       ? hasVendor('laya-webgl')       : false)
        || (key === 'laya-spine' ? hasVendor('laya-spine-webgl') : false)
        || (!['egret','egret-spine','laya','laya-spine'].includes(key) && hasVendor(key));
      const webgpuOk = isEgretDirect || hasVendor(key);
      const bs = {};
      if (webgpuOk) bs.webgpu = info.webgpu;
      if (webglOk)  bs.webgl  = info.webgl;
      engines.push({ key, name: info.name, backends: bs });
    }
    const appConfig = { scene: s.key, sceneTitle: s.icon + ' ' + s.title, engines };
    const sceneHtml = `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<title>${s.title} · 引擎基准</title>
<link rel="stylesheet" href="tpl/ctrl.css">
</head>
<body>
<div id="stage"></div>
<div id="ctrl"></div>
<script>
  window.APP = ${JSON.stringify(appConfig)};
</script>
<script src="tpl/ctrl.js"></script>
</body>
</html>`;
    fs.writeFileSync(path.join(DIST, 'scene-' + s.key + '.html'), sceneHtml, 'utf8');
    console.log('  生成 scene-' + s.key + '.html（' + engines.filter(e => Object.keys(e.backends).length).length + ' 引擎可用）');
  }

  // 拷贝共用样样式 + 总控脚本
  cp(path.join(WEB, 'tpl', 'ctrl.css'), path.join(DIST, 'tpl', 'ctrl.css'));
  cp(path.join(WEB, 'tpl', 'ctrl.js'), path.join(DIST, 'tpl', 'ctrl.js'));

  // laya3d：LayaAir IDE Web 构建产物派生双后端臂（同一份二进制，仅 index.js 内嵌 config 的 webgpu 开关不同）
  // dist/laya3d       = WebGL 臂（强制 webgpu:false）
  // dist/laya3d-webgpu= WebGPU 臂（webgpu:true，走 LayaX 管线）+ 注入 console.error 捕获层，把 shader 编译报错显示到页面
  // aquarium 裸资源为引擎 fetch 直读，不经打包，两臂都要拷
  const laya3dSrc = path.join(ROOT, 'laya-proj-3d', 'release', 'web');
  if (fs.existsSync(path.join(laya3dSrc, 'index.html'))) {
    for (const [dir, webgpuFlag] of [['laya3d', false], ['laya3d-webgpu', true]]) {
      const dst = path.join(DIST, dir);
      fs.rmSync(dst, { recursive: true, force: true });
      fs.cpSync(laya3dSrc, dst, { recursive: true });
      // aquarium 运行时直读资源整目录拷贝（含 *.shader / fish / source / skybox）——
      // Main.ts 运行时 fetch 'aquarium/*.shader' 注册 Shader3D，漏拷即 404 → 白模
      fs.cpSync(path.join(ROOT, 'laya-proj-3d', 'assets', 'aquarium'), path.join(dst, 'aquarium'), { recursive: true });
      const ij = path.join(dst, 'js', 'index.js');
      let c = fs.readFileSync(ij, 'utf8');
      const before = c;
      c = c.replace('"webgpu":true', '"webgpu":' + webgpuFlag);
      if (c === before && !webgpuFlag) console.log('  [warn] ' + dir + ': 未找到 webgpu 开关（IDE 模板变更?）');
      fs.writeFileSync(ij, c, 'utf8');
      // 后端判定热修：release 产物里引擎类名可能被混淆（'Ae'），/webgpu/i 误判 → WebGPU 臂被标成 webgl（假回退）。
      // 用 canvas 已配置的 context 类型做真值（引擎建了 webgpu context 即 LayaX 管线）。Main.ts 源码已同步修，
      // 未混淆的新构建里此补丁自动变 no-op
      const bj = path.join(dst, 'js', 'bundle.js');
      if (fs.existsSync(bj)) {
        let bcode = fs.readFileSync(bj, 'utf8');
        const NEEDLE = 'const backend = /webgpu/i.test(name) ? "webgpu" : "webgl";';
        const PATCH = 'const backend = (function(){try{var c=document.querySelector("canvas");if(c&&c.getContext&&c.getContext("webgpu"))return "webgpu"}catch(e){}return /webgpu/i.test(name) ? "webgpu" : "webgl"})()';
        if (bcode.includes(NEEDLE)) {
          bcode = bcode.replace(NEEDLE, PATCH);
          fs.writeFileSync(bj, bcode, 'utf8');
          console.log('  ' + dir + ': actualBackend 热修（canvas context 真值，防类名混淆误判）');
        } else if (!bcode.includes('getContext("webgpu")')) {
          console.log('  [warn] ' + dir + ': 未找到 actualBackend 判定模式（bundle 模板变更?）');
        }
      }
      // dc 探针热修：StatElement 枚举未挂全局 → readDrawCalls 恒 -1 → dc=0。
      // 兜底用枚举序数值（CT_3DDrawCall=25/CT_DrawCall=26，见 layagl/StatisticsContext.ts）
      const bj2 = path.join(dst, 'js', 'bundle.js');
      if (fs.existsSync(bj2)) {
        let bcode2 = fs.readFileSync(bj2, 'utf8');
        const N2 = 'const element = ((_b = g.Laya) == null ? void 0 : _b.StatElement) || g.StatElement;';
        const P2 = 'const element = ((_b = g.Laya) == null ? void 0 : _b.StatElement) || g.StatElement || { CT_3DDrawCall: 25, CT_DrawCall: 26 };';
        if (bcode2.includes(N2)) {
          bcode2 = bcode2.replace(N2, P2);
          // dc 探针升级：WebGPU 臂用 __wgpuProbe 累计差分（statAgent 在 LayaX Web 构建恒 0）
          const N3 = 'const value = stat.getElementData((_c = element.CT_3DDrawCall) != null ? _c : element.CT_DrawCall);';
          const P3 = 'if (window.__wgpuProbe) { var _pw = window.__wgpuProbe; var _pd = _pw.drawTotal - (this._lastWgpuDraws || 0); this._lastWgpuDraws = _pw.drawTotal; return _pd >= 0 ? _pd : 0; } ' + N3;
          if (bcode2.includes(N3) && !bcode2.includes('__wgpuProbe')) {
            bcode2 = bcode2.replace(N3, P3);
          }
          fs.writeFileSync(bj2, bcode2, 'utf8');
          console.log('  ' + dir + ': dc 探针热修（StatElement 枚举数值兜底）');
        }
        // stat 缺定义修复：源码重构时误删 `const stat = g.LayaGL?.statAgent`，
        // 编译后 readDrawCalls 在无 __wgpuProbe 的臂（WebGL）上抛 stat is not defined → 渲染循环死
        if (bcode2.includes('|| g.StatElement || { CT_3DDrawCall: 25, CT_DrawCall: 26 };') && !bcode2.includes('const stat = (g.LayaGL || {}).statAgent;')) {
          bcode2 = bcode2.replace(
            '|| g.StatElement || { CT_3DDrawCall: 25, CT_DrawCall: 26 };',
            '|| g.StatElement || { CT_3DDrawCall: 25, CT_DrawCall: 26 }; const stat = (g.LayaGL || {}).statAgent; if (!stat) return -1;'
          );
          fs.writeFileSync(bj2, bcode2, 'utf8');
          console.log('  ' + dir + ': stat 缺定义修复（readDrawCalls 崩溃）');
        }
        // 临界点防抖热补：连续 2 档未达稳定才进细扫（旧产物单档即触发，偶发抖动会提前带偏粗梯）
        {
          let b4 = fs.readFileSync(bj2, 'utf8');
          const NA = 'let fine = false, fineNext = 0, fineCount = 0, fineJankStreak = 0;';
          const PA = 'let fine = false, fineNext = 0, fineCount = 0, fineJankStreak = 0; let unstableStreak = 0;';
          const NB = 'if (!stable && !fine) {\n            fine = true;\n            if (thresholdAt == null) thresholdAt = count;';
          const PB = 'if (!stable && !fine) {\n            unstableStreak++;\n            if (unstableStreak >= 2) {\n            fine = true;\n            if (thresholdAt == null) thresholdAt = count;';
          const NC = '            fineJankStreak = 0;\n            this.hudOut.textContent = `档 ${count} 触及临界点（fps=${json.fps} p95=${json.p95}ms），转入 +${FINE_STEP} 细扫…`;\n          }\n          if (jank) {';
          const PC = '            fineJankStreak = 0;\n            this.hudOut.textContent = `档 ${count} 连续未达稳定，转入 +${FINE_STEP} 细扫…`;\n            }\n          } else if (stable) {\n            unstableStreak = 0;\n          }\n          if (jank) {';
          if (b4.includes(NB) && b4.includes(NC) && !b4.includes('unstableStreak')) {
            b4 = b4.replace(NA, PA).replace(NB, PB).replace(NC, PC);
            fs.writeFileSync(bj2, b4, 'utf8');
            console.log('  ' + dir + ': 临界点防抖热补（连续2档未达稳定才进细扫）');
          }
        }
        // 判定门槛热补（60Hz vsync 语义）：p95 18.2→20（95% 帧最多丢 1 拍）、硬掉帧 50/33.4→45/35。
        // 旧门槛正好切在 vsync 工况噪声带里（±2ms 抖动翻转判定）。源码已同步
        {
          let b5 = fs.readFileSync(bj2, 'utf8');
          let c5changed = false;
          const N6 = 'const stable = json.fps >= 55 && (json.p95 > 0 ? json.p95 <= 18.2 : true);';
          const P6 = 'const stable = json.fps >= 55 && (json.p95 > 0 ? json.p95 <= 20 : true);';
          const N7 = 'const jank = json.fps < 50 || (json.p95 > 0 && json.p95 >= 33.4);';
          const P7 = 'const jank = json.fps < 45 || (json.p95 > 0 && json.p95 >= 35);';
          const N7b = 'const jank = json.fps < 50 || json.p95 > 0 && json.p95 >= 33.4;';
          const P7b = 'const jank = json.fps < 45 || json.p95 > 0 && json.p95 >= 35;';
          if (b5.includes(N6)) { b5 = b5.split(N6).join(P6); c5changed = true; }
          if (b5.includes(N7)) { b5 = b5.split(N7).join(P7); c5changed = true; }
          if (b5.includes(N7b)) { b5 = b5.split(N7b).join(P7b); c5changed = true; }
          if (c5changed) {
            fs.writeFileSync(bj2, b5, 'utf8');
            console.log('  ' + dir + ': 判定门槛热补（p95≤20 / 硬掉帧 45|35）');
          }
        }
        // 合批开关热补：自定义 Shader3D 默认 _enableInstancing=false → 批次代理 _canBatch 永假
        // （两驱动同一条件：materialRenderQueue<2500 && canDynamicBatch && subShader._owner._enableInstancing）
        // → LayaX 1 鱼 1 draw 且渲染队列丢元素（100k 鱼只画 ~1.7%）。源码已显式打开；旧产物在此热补
        {
          let b3 = fs.readFileSync(bj2, 'utf8');
          let c3changed = false;
          const N4 = 'this.fishShader = Laya.Shader3D.find("AquariumFish");';
          const P4 = N4 + '["AquariumFish","AquariumEnvironment","AquariumProp","AquariumSeaweed"].forEach(function(n){var s=Laya.Shader3D.find(n);if(s)s._enableInstancing=!0});';
          if (b3.includes(N4) && !b3.includes('s._enableInstancing=!0')) {
            b3 = b3.replace(N4, P4);
            c3changed = true;
          }
          const libFile = path.join(dst, 'libs', 'laya.webgpu_3D.js');
          if (fs.existsSync(libFile)) {
            let lib = fs.readFileSync(libFile, 'utf8');
            const N5 = 'e.materialRenderQueue<2500&&e.canDynamicBatch&&';
            if (lib.includes(N5)) {
              lib = lib.replace(N5, 'e.materialRenderQueue<2500&&');
              fs.writeFileSync(libFile, lib, 'utf8');
              c3changed = true;
              console.log('  ' + dir + ': LayaX _canBatch canDynamicBatch 中和（库级）');
            }
          }
          if (c3changed) {
            fs.writeFileSync(bj2, b3, 'utf8');
            console.log('  ' + dir + ': 合批开关热补（_enableInstancing=true）');
          }
        }
        // 遮挡剔除默认关闭（库级）：BaseCamera 构造 useOcclusionCulling=!0 → CPU 剔除器
        // 逐元素 _needRender 遮挡测试；鱼节点 Bounds 为参数假矩阵算出的 origin 假 AABB，
        // 密集鱼墙大面积误剔 → 100k 鱼只提交 ~1.7% → 压测负载严重失真。压测需全量提交
        {
          const d3lib = path.join(dst, 'libs', 'laya.d3.js');
          if (fs.existsSync(d3lib)) {
            let d3 = fs.readFileSync(d3lib, 'utf8');
            if (d3.includes('this.useOcclusionCulling=!0')) {
              d3 = d3.replace('this.useOcclusionCulling=!0', 'this.useOcclusionCulling=!1');
              fs.writeFileSync(d3lib, d3, 'utf8');
              console.log('  ' + dir + ': 遮挡剔除默认关闭（laya.d3.js 库级，压测全量提交）');
            }
          }
        }
      }
      // __wgpuProbe（仅 WebGPU 臂）：LayaX Web 构建无原生统计桥（LayaXRenderEngine._syncStatistics
      // 因缺 frameOpaqueDrawCall 早退）→ 引擎 dc/instance 统计恒 0。hook GPURenderPassEncoder 的
      // draw/drawIndexed 自计累计值（draw 次数 + instance 数 = arguments[1]），Main 侧读差分
      if (webgpuFlag) {
        const ih2 = path.join(dst, 'index.html');
        let h2 = fs.readFileSync(ih2, 'utf8');
        if (!h2.includes('__wgpuProbe')) {
          const probe = '<script>(function(){if(!window.GPUDevice)return;var P=window.__wgpuProbe={drawTotal:0,instTotal:0,hist:{},bDraw:0,bInst:0,iDraw:0,iInst:0};' +
            'function rec(a0,a1){P.drawTotal++;var ic=a1||1;P.instTotal+=ic;var k=a0+":"+ic;P.hist[k]=(P.hist[k]||0)+1}' +
            'var d=GPURenderPassEncoder.prototype.draw,di=GPURenderPassEncoder.prototype.drawIndexed,ri=GPURenderPassEncoder.prototype.drawIndirect,rii=GPURenderPassEncoder.prototype.drawIndexedIndirect;' +
            'if(typeof d==="function")GPURenderPassEncoder.prototype.draw=function(){rec(arguments[0],arguments[1]);return d.apply(this,arguments)};' +
            'if(typeof di==="function")GPURenderPassEncoder.prototype.drawIndexed=function(){rec(arguments[0],arguments[1]);return di.apply(this,arguments)};' +
            'if(typeof ri==="function")GPURenderPassEncoder.prototype.drawIndirect=function(){P.iDraw++;return ri.apply(this,arguments)};' +
            'if(typeof rii==="function")GPURenderPassEncoder.prototype.drawIndexedIndirect=function(){P.iDraw++;return rii.apply(this,arguments)};' +
            'if(window.GPURenderBundleEncoder){var bd=GPURenderBundleEncoder.prototype.draw,bdi=GPURenderBundleEncoder.prototype.drawIndexed;' +
            'if(typeof bd==="function")GPURenderBundleEncoder.prototype.draw=function(){P.bDraw++;P.bInst+=(arguments[1]||1);return bd.apply(this,arguments)};' +
            'if(typeof bdi==="function")GPURenderBundleEncoder.prototype.drawIndexed=function(){P.bDraw++;P.bInst+=(arguments[1]||1);return bdi.apply(this,arguments)}};' +
            'setInterval(function(){var ks=Object.keys(P.hist);if(!ks.length)return;ks.sort(function(a,b){return P.hist[b]-P.hist[a]});' +
            'var top=ks.slice(0,8).map(function(k){return k+" x"+P.hist[k]}).join(" | ");' +
            'console.warn("[WGPUProbe] passDraw="+P.drawTotal+" passInst="+P.instTotal+" bundleDraw="+P.bDraw+" bundleInst="+P.bInst+" indirect="+P.iDraw+" top(idx:inst x次数) "+top);' +
            'try{var sa=window.Laya&&Laya.LayaGL&&Laya.LayaGL.statAgent;if(sa&&sa.getElementData){var out=[];for(var q=0;q<64;q++){var v=sa.getElementData(q);if(v)out.push(q+"="+v)}console.warn("[WGPUProbe][statAgent] "+(out.join(" ")||"(all zero)"))}}catch(e){}},3000);})();</script>';
          h2 = h2.replace('</head>', probe + '\n</head>');
          fs.writeFileSync(ih2, h2, 'utf8');
          console.log('  ' + dir + ': __wgpuProbe v3 注入（pass/bundle/indirect 全路径）');
        }
      }
      // 鱼种分布 v2 热补：fishCounts/fishTypeFor 两处同步（旧封顶公式 → 大2%/种 中8%/种 小补满，与源码 v2 同式）
      {
        let bc = fs.readFileSync(bj2, 'utf8');
        let changed = false;
        if (!bc.includes('total * 0.02')) {
          if (bc.includes('const bigEach = total < 100 ? 1 : 2;')) {
            bc = bc.split('const bigEach = total < 100 ? 1 : 2;').join('const bigEach = Math.floor(total * 0.02);');
            bc = bc.split('const mediumEach = Math.min(Math.floor(total / 10), 80);').join('const mediumEach = Math.floor(total * 0.08);');
            changed = true;
          } else {
            console.log('  [warn] ' + dir + ': 未找到分布公式（bundle 模板变更?）');
          }
        }
        if (changed) {
          fs.writeFileSync(bj2, bc, 'utf8');
          console.log('  ' + dir + ': 鱼种分布 v2 热补（大2%/种 中8%/种，fishCounts+fishTypeFor 同步）');
        }
      }
      // 档位上限热扩（过渡期免引擎重建）：50..50000 → 追加 60000..100000。
      // 源码 rampCounts/counts 已同步扩；新构建含 1e5 后此补丁自动 no-op
      const bj3 = path.join(dst, 'js', 'bundle.js');
      if (fs.existsSync(bj3)) {
        let bcode3 = fs.readFileSync(bj3, 'utf8');
        if (!bcode3.includes('1e5')) {
          let n3 = 0;
          for (const tail of ['45e3, 5e4]', '45e3,5e4]']) { // Laya bundle 带空格 / Cocos 压缩无空格
            if (bcode3.includes(tail)) {
              bcode3 = bcode3.replace(tail, tail.slice(0, -1) + ', 6e4, 7e4, 8e4, 9e4, 1e5]');
              n3++;
              break;
            }
          }
          if (n3) {
            fs.writeFileSync(bj3, bcode3, 'utf8');
            console.log('  ' + dir + ': 档位上限热扩至 100000');
          } else {
            console.log('  [warn] ' + dir + ': 未找到档位表尾部（bundle 模板变更?）');
          }
        }
      }
      // WebGPU 诊断臂：注入 console.error/warn 捕获层，把 shader 编译报错显示到页面浮层（免 F12）
      if (webgpuFlag) {
        const ih = path.join(dst, 'index.html');
        let h = fs.readFileSync(ih, 'utf8');
        if (!h.includes('__layaErrCatch')) {
          const inject = '<script>(function(){if(window.__layaErrCatch)return;window.__layaErrCatch=[];' +
            'var box=null;function ensure(){if(box)return box;box=document.createElement("div");' +
            'box.style.cssText="position:fixed;right:8px;top:8px;width:520px;max-height:60vh;overflow:auto;z-index:2147483647;background:rgba(40,0,0,.92);color:#ff9b9b;font:11px/1.45 monospace;padding:8px;border:1px solid #f55;border-radius:6px;white-space:pre-wrap";' +
            'var t=document.createElement("div");t.textContent="⚠ LayaX/WebGPU shader 报错捕获（复制发我）";t.style.cssText="color:#fff;font-weight:bold;margin-bottom:6px";box.appendChild(t);' +
            'var btn=document.createElement("button");btn.textContent="📋复制全部";btn.style.cssText="margin-bottom:6px;cursor:pointer";btn.onclick=function(){var s=window.__layaErrCatch.join("\\n");(navigator.clipboard&&navigator.clipboard.writeText)?navigator.clipboard.writeText(s):window.prompt("复制",s)};box.appendChild(btn);' +
            'document.body.appendChild(box);return box}' +
            'function push(pfx,args){var s=pfx+Array.prototype.map.call(args,function(a){try{return (a&&a.stack)||(typeof a==="object"?JSON.stringify(a):String(a))}catch(e){return String(a)}}).join(" ");' +
            'if(/texture-compression-(etc2|astc|bc7|etc1|pvrtc) is not supported/.test(s))return;' + // 无害：可选压缩格式探测
            'window.__layaErrCatch.push(s);var b=ensure();var d=document.createElement("div");d.textContent=s;d.style.borderTop="1px solid #833";d.style.padding="3px 0";b.appendChild(d)}' +
            'var oe=console.error,ow=console.warn;console.error=function(){push("[ERR] ",arguments);return oe.apply(console,arguments)};console.warn=function(){push("[WARN] ",arguments);return ow.apply(console,arguments)};' +
            'window.addEventListener("error",function(e){push("[UNCAUGHT] ",[e.message+" @"+(e.filename||"")+":"+(e.lineno||"")])});' +
            'window.addEventListener("unhandledrejection",function(e){push("[PROMISE] ",[e.reason])});})();</script>';
          h = h.replace('<script type="text/javascript" src="libs/laya.core.js">', inject + '\n    <script type="text/javascript" src="libs/laya.core.js">');
          fs.writeFileSync(ih, h, 'utf8');
        }
        console.log('  ' + dir + ' 就位（webgpu=true + console 报错捕获层）');
      } else {
        console.log('  ' + dir + ' 就位（webgpu=false，强制 WebGL）');
      }
    }
  } else {
    console.log('  [laya3d] 待发布（laya-proj-3d/release/web/index.html 缺失）');
  }

  console.log('== 完成：' + path.relative(ROOT, DIST) + ' ==');
  console.log('    laya=' + hasVendor('laya') + ' laya-webgl=' + hasVendor('laya-webgl') +
    ' cocos(双臂)=' + hasVendor('cocos') + ' cocos3d(双臂)=' + hasVendor('cocos3d'));
}

main();
