"use strict";
(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));
  var __decorateClass = (decorators, target, key, kind) => {
    var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc(target, key) : target;
    for (var i = decorators.length - 1, decorator; i >= 0; i--)
      if (decorator = decorators[i])
        result = (kind ? decorator(target, key, result) : decorator(result)) || result;
    if (kind && result) __defProp(target, key, result);
    return result;
  };

  // src/sim/stats.ts
  var require_stats = __commonJS({
    "src/sim/stats.ts"() {
      "use strict";
      (function(global) {
        "use strict";
        function BenchStats() {
          this.samples = [];
          this._drawCallSamples = [];
          this._lastTs = 0;
          this._phase = "idle";
          this._elapsed = 0;
          this._phaseEnd = 0;
          this._sampleDur = 0;
          this._onDone = null;
          this._readDrawCalls = null;
          this.nodeCount = 0;
          this.meta = {};
        }
        BenchStats.prototype.start = function(preWarmSec, sampleSec, onDone) {
          this.samples.length = 0;
          this._drawCallSamples.length = 0;
          this._lastTs = 0;
          this._phase = "prewarm";
          this._elapsed = 0;
          this._phaseEnd = (preWarmSec || 3) * 1e3;
          this._sampleDur = (sampleSec || 10) * 1e3;
          this._onDone = onDone;
        };
        BenchStats.prototype.tick = function(ts) {
          if (this._phase === "idle" || this._phase === "done") return;
          if (this._lastTs === 0) {
            this._lastTs = ts;
            return;
          }
          var dt = ts - this._lastTs;
          this._lastTs = ts;
          if (dt <= 0 || dt > 1e3) return;
          if (this._phase === "prewarm") {
            this._elapsed += dt;
            if (this._elapsed >= this._phaseEnd) {
              this._phase = "sampling";
              this._elapsed = 0;
            }
            return;
          }
          this.samples.push(dt);
          if (this._readDrawCalls) {
            var dc = this._readDrawCalls();
            if (dc >= 0) this._drawCallSamples.push(dc);
          }
          this._elapsed += dt;
          if (this._elapsed >= this._sampleDur) {
            this._phase = "done";
            if (this._onDone) this._onDone(this.toJSON());
          }
        };
        function percentile(sorted, p) {
          if (!sorted.length) return 0;
          return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p / 100))];
        }
        BenchStats.prototype.captureGpuInfo = function() {
          var g = global, out = { gpuVendor: null, gpuRenderer: null };
          try {
            if (g.navigator && g.navigator.gpu && g.navigator.gpu.__adapterInfo) {
              var ai = g.navigator.gpu.__adapterInfo;
              out.gpuVendor = ai.vendor || null;
              out.gpuRenderer = ai.architecture || null;
            }
            var cv = document.createElement("canvas");
            var gl = cv.getContext("webgl") || cv.getContext("experimental-webgl");
            if (gl) {
              var dbg = gl.getExtension("WEBGL_debug_renderer_info");
              if (dbg) {
                out.gpuVendor = gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) || out.gpuVendor;
                out.gpuRenderer = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || out.gpuRenderer;
              }
            }
          } catch (e) {
          }
          this.gpuVendor = out.gpuVendor;
          this.gpuRenderer = out.gpuRenderer;
        };
        BenchStats.prototype.toJSON = function() {
          var s = this.samples.slice().sort(function(a, b) {
            return a - b;
          });
          var sum = 0, over = 0, i;
          for (i = 0; i < s.length; i++) {
            sum += s[i];
            if (s[i] > 16.7) over++;
          }
          var avg = s.length ? sum / s.length : 0;
          var dcs = this._drawCallSamples;
          var dcAvg = 0, dcMax = 0;
          if (dcs.length) {
            dcs.sort(function(a, b) {
              return a - b;
            });
            var dcSum = 0;
            for (i = 0; i < dcs.length; i++) dcSum += dcs[i];
            dcAvg = Math.round(dcSum / dcs.length * 10) / 10;
            dcMax = dcs[dcs.length - 1];
          }
          return {
            meta: this.meta,
            nodeCount: this.nodeCount,
            drawCallAvg: dcAvg,
            drawCallMax: dcMax,
            drawCallSamples: dcs.length,
            frames: s.length,
            fps: avg ? Math.round(1e3 / avg * 10) / 10 : 0,
            p50: Math.round(percentile(s, 50) * 100) / 100,
            p95: Math.round(percentile(s, 95) * 100) / 100,
            p99: Math.round(percentile(s, 99) * 100) / 100,
            overBudgetPct: s.length ? Math.round(over / s.length * 1e3) / 10 : 0,
            jsHeapMB: global.performance && global.performance.memory ? Math.round(global.performance.memory.usedJSHeapSize / 1048576) : null,
            gpuVendor: this.gpuVendor || null,
            gpuRenderer: this.gpuRenderer || null,
            userAgent: global.navigator.userAgent,
            timestamp: Date.now()
          };
        };
        global.BenchStats = BenchStats;
      })(typeof window !== "undefined" ? window : globalThis);
    }
  });

  // src/sim/bunny-sim.ts
  var require_bunny_sim = __commonJS({
    "src/sim/bunny-sim.ts"() {
      "use strict";
      (function(global) {
        "use strict";
        function BunnySim(bounds) {
          this.bounds = bounds || { left: 0, top: 0, right: 800, bottom: 600 };
          this.list = [];
        }
        BunnySim.prototype.add = function(n) {
          var b = this.bounds;
          for (var i = 0; i < n; i++) {
            var count = this.list.length;
            this.list.push({
              x: count % 2 * 800,
              y: 0,
              speedX: Math.random() * 10,
              speedY: Math.random() * 10 - 5
            });
          }
        };
        BunnySim.prototype.remove = function(n) {
          this.list.length = Math.max(0, this.list.length - n);
        };
        BunnySim.prototype.update = function() {
          var b = this.bounds, list = this.list, g = 0.75;
          for (var i = 0, len = list.length; i < len; i++) {
            var bny = list[i];
            bny.x += bny.speedX;
            bny.y += bny.speedY;
            bny.speedY += g;
            if (bny.x > b.right) {
              bny.speedX *= -1;
              bny.x = b.right;
            } else if (bny.x < b.left) {
              bny.speedX *= -1;
              bny.x = b.left;
            }
            if (bny.y > b.bottom) {
              bny.speedY *= -0.85;
              bny.y = b.bottom;
              if (Math.random() > 0.5) bny.speedY -= Math.random() * 6;
            } else if (bny.y < b.top) {
              bny.speedY = 0;
              bny.y = b.top;
            }
          }
        };
        global.BunnySim = BunnySim;
      })(typeof window !== "undefined" ? window : globalThis);
    }
  });

  // src/sim/boids-sim.ts
  var require_boids_sim = __commonJS({
    "src/sim/boids-sim.ts"() {
      "use strict";
      (function(global) {
        "use strict";
        var FISH_SPECIES = 5;
        var DEG = Math.PI / 180;
        var SPECIES_SCALE = [0.45, 0.55, 1, 0.45, 0.55];
        function BoidsSim(width, height) {
          this.width = width || 800;
          this.height = height || 600;
          this.list = [];
        }
        BoidsSim.prototype.add = function(n) {
          for (var i = 0; i < n; i++) {
            this.list.push(this._spawn(this.list.length % FISH_SPECIES));
          }
        };
        BoidsSim.prototype.remove = function(n) {
          this.list.length = Math.max(0, this.list.length - n);
        };
        function angleTypeOf(angType) {
          var r = Math.random;
          switch (angType) {
            case 0:
              return [160 + r() * 20, 200 + r() * 20];
            // 左
            case 1:
              return [170 + r() * 10, 190 + r() * 10];
            // 近水平向左
            case 2:
              return [150 + r() * 15, 210 + r() * 15];
            // 左 + 上下摆动
            case 3:
              return [135 + r() * 10, 170 + r() * 10];
            // 左上
            case 4:
              return [190 + r() * 10, 225 + r() * 10];
            // 左下
            case 5:
              return [160 + r() * 30, 200 + r() * 30];
            // 左 + 大摆动
            default:
              return [170, 190];
          }
        }
        BoidsSim.prototype._spawn = function(species) {
          var w = this.width, h = this.height;
          var x = w + 50 + Math.random() * 100;
          var y = Math.random() * h;
          var angType = Math.floor(Math.random() * 6);
          var range = angleTypeOf(angType);
          var minA = range[0], maxA = range[1];
          var initAngle = (minA + maxA) / 2;
          return {
            species,
            x,
            y,
            angle: initAngle * DEG,
            // 当前角度（弧度）
            minAngle: minA * DEG,
            maxAngle: maxA * DEG,
            angleAdd: Math.random() < 0.5,
            // cpp 的 angleAdd：true 则角度 ++，false 则 --
            speed: 2 + Math.random() * 2,
            // 2~4 px/帧
            scale: (0.6 + Math.random() * 0.8) * SPECIES_SCALE[species % FISH_SPECIES]
          };
        };
        BoidsSim.prototype.update = function(dtMs) {
          var step = (dtMs || 16.7) / 16.7;
          var w = this.width, h = this.height;
          var list = this.list;
          var margin = 120;
          for (var i = 0; i < list.length; i++) {
            var f = list[i];
            if (f.angleAdd) f.angle += 0.5 * DEG * step;
            else f.angle -= 0.5 * DEG * step;
            if (f.angle > f.maxAngle) {
              f.angle = f.maxAngle;
              f.angleAdd = false;
            } else if (f.angle < f.minAngle) {
              f.angle = f.minAngle;
              f.angleAdd = true;
            }
            f.x += Math.cos(f.angle) * f.speed * step;
            f.y += Math.sin(f.angle) * f.speed * step;
            if (f.x < -margin || f.x > w + margin || f.y < -margin || f.y > h + margin) {
              list[i] = this._spawn(f.species);
            }
          }
        };
        BoidsSim.FISH_SPECIES = FISH_SPECIES;
        global.BoidsSim = BoidsSim;
      })(typeof window !== "undefined" ? window : globalThis);
    }
  });

  // src/sim/bench-runner.ts
  var require_bench_runner = __commonJS({
    "src/sim/bench-runner.ts"() {
      "use strict";
      (function(global) {
        "use strict";
        var VARIANTS = {
          V1: { textures: 1, rotate: false, scale: false, desc: "same texture, batched" },
          V2: { textures: 8, rotate: false, scale: false, desc: "atlas random frame" },
          V3: { textures: 1, rotate: true, scale: true, desc: "random transforms" },
          V4: { textures: 12, rotate: false, scale: false, desc: "finite multi-texture pressure" }
        };
        function BenchRunner(adapter, stats) {
          this.adapter = adapter;
          this.stats = stats;
          this._ramp = null;
          this._fpsEma = 16.7;
          this._lastTs = 0;
          this.onReport = null;
        }
        BenchRunner.VARIANTS = VARIANTS;
        BenchRunner.prototype.fixedRun = function(opts) {
          var o = opts || {};
          var self = this;
          this.stats.meta = {
            engine: o.engine || "unknown",
            variant: o.variant || "V1",
            backend: o.backend || "webgl",
            mode: "fixed",
            count: o.count
          };
          this.adapter.init(o.variant || "V1", o.bounds);
          this.adapter.setCount(o.count);
          if (this.stats.captureGpuInfo) this.stats.captureGpuInfo();
          this.stats._readDrawCalls = this.adapter.readDrawCalls ? this.adapter.readDrawCalls.bind(this.adapter) : null;
          this.stats.start(o.preWarmSec || 3, o.sampleSec || 10, function(json) {
            json.nodeCount = self.adapter.nodeCount();
            if (self.adapter.readBenchMetrics) {
              var metrics = self.adapter.readBenchMetrics();
              for (var key in metrics) json[key] = metrics[key];
            }
            json.actualBackend = json.actualBackend || json.meta.backend;
            json.backendValid = json.actualBackend === json.meta.backend;
            json.comparisonEligible = json.backendValid;
            self._ramp = null;
            if (self.onReport) self.onReport(json);
          });
        };
        BenchRunner.prototype.rampRun = function(opts) {
          var o = opts || {};
          var self = this;
          this._ramp = {
            stepCount: o.stepCount || 1e3,
            stepMs: o.stepMs || 2e3,
            maxCount: o.maxCount || 1e5,
            thresholdMs: 1e3 / (o.fpsThreshold || 55),
            lastStepTs: 0,
            overSince: 0,
            engine: o.engine || "unknown",
            variant: o.variant || "V1",
            backend: o.backend || "webgl"
          };
          this.stats.meta = {
            engine: this._ramp.engine,
            variant: this._ramp.variant,
            backend: this._ramp.backend,
            mode: "ramp"
          };
          this.adapter.init(o.variant || "V1", o.bounds);
          this.adapter.setCount(this._ramp.stepCount);
          if (this.stats.captureGpuInfo) this.stats.captureGpuInfo();
          this.stats._readDrawCalls = this.adapter.readDrawCalls ? this.adapter.readDrawCalls.bind(this.adapter) : null;
          this.stats.start(1, 86400, function() {
          });
          this.stats._onDone = null;
        };
        BenchRunner.prototype.tick = function(ts) {
          this.stats.tick(ts);
          if (!this._ramp) return;
          if (this._lastTs) {
            var dt = ts - this._lastTs;
            if (dt > 0 && dt < 1e3) this._fpsEma = this._fpsEma * 0.9 + dt * 0.1;
          }
          this._lastTs = ts;
          var r = this._ramp, cur = this.adapter.nodeCount();
          if (this._fpsEma > r.thresholdMs) {
            if (!r.overSince) r.overSince = ts;
            if (ts - r.overSince > 2e3) {
              var json = this.stats.toJSON();
              json.meta = {
                engine: r.engine,
                variant: r.variant,
                backend: r.backend,
                mode: "ramp"
              };
              json.maxStableCount = Math.max(0, cur - r.stepCount);
              this._ramp = null;
              if (this.onReport) this.onReport(json);
              return;
            }
          } else {
            r.overSince = 0;
          }
          if (ts - r.lastStepTs >= r.stepMs) {
            r.lastStepTs = ts;
            if (cur + r.stepCount <= r.maxCount) this.adapter.setCount(cur + r.stepCount);
          }
        };
        BenchRunner.prototype.autoRamp = function(opts) {
          var o = opts || {};
          var IS_MOBILE = /Android|iPhone|iPad|iPod|Mobile/i.test(global.navigator.userAgent);
          var COUNTS = o.counts || (IS_MOBILE ? [1e3, 2e3, 4e3, 8e3, 15e3, 25e3, 4e4, 6e4] : [2e3, 5e3, 1e4, 2e4, 4e4, 7e4, 11e4, 16e4, 22e4, 3e5]);
          var self = this;
          var cap = 0, jankAt = null, idx = 0, jankStreak = 0, invalidCurve = false;
          var sawJank = false;
          var onLevel = o.onLevel || function() {
          };
          var onDone = o.onDone || function() {
          };
          this._autoStop = false;
          function step() {
            if (self._autoStop || idx >= COUNTS.length) {
              onDone({ cap, jankAt, capped: cap >= COUNTS[COUNTS.length - 1], invalidCurve });
              return;
            }
            var n = COUNTS[idx];
            onLevel({ phase: "start", count: n, index: idx, total: COUNTS.length });
            var prevReport = self.onReport;
            self.onReport = function(json) {
              self.onReport = prevReport;
              var stable = json.fps >= 55;
              var jank = json.fps < 50;
              if (sawJank && stable) invalidCurve = true;
              if (stable && !sawJank) cap = n;
              if (jank) {
                sawJank = true;
                if (jankAt == null) jankAt = n;
              }
              onLevel({ phase: "done", count: n, index: idx, total: COUNTS.length, json, stable });
              idx++;
              if (jank) {
                jankStreak++;
                if (jankStreak >= 2) {
                  onDone({ cap, jankAt, capped: false, invalidCurve });
                  return;
                }
              } else {
                jankStreak = 0;
              }
              step();
            };
            self.fixedRun({
              engine: o.engine || self.stats.meta.engine,
              variant: o.variant || self.stats.meta.variant,
              backend: o.backend || self.stats.meta.backend,
              count: n,
              preWarmSec: 2.5,
              sampleSec: 4
            });
          }
          step();
        };
        BenchRunner.prototype.stopAuto = function() {
          this._autoStop = true;
        };
        BenchRunner.saveDirHandle = null;
        BenchRunner.onSaved = null;
        BenchRunner.onCopied = null;
        BenchRunner.pickSaveDir = function() {
          if (!window.showDirectoryPicker) {
            alert("当前浏览器不支持指定保存目录，将继续使用下载方式");
            return;
          }
          window.showDirectoryPicker({ mode: "readwrite" }).then(function(h) {
            BenchRunner.saveDirHandle = h;
          }).catch(function() {
          });
        };
        BenchRunner.exportJSON = function(json) {
          var name = "bench_" + (json.meta.engine || "x") + "_" + (json.meta.variant || "x") + "_" + Date.now() + ".json";
          var text = JSON.stringify(json, null, 2);
          try {
            global.__benchLastResult = json;
          } catch (e) {
          }
          function download() {
            var blob = new Blob([text], { type: "application/json" });
            var a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = name;
            a.click();
            URL.revokeObjectURL(a.href);
          }
          function writeHandle() {
            BenchRunner.saveDirHandle.getFileHandle(name, { create: true }).then(function(fh) {
              return fh.createWritable();
            }).then(function(w) {
              return w.write(text).then(function() {
                return w.close();
              });
            }).then(function() {
              if (BenchRunner.onSaved) BenchRunner.onSaved(name);
            }).catch(function(e) {
              console.error("写入指定目录失败，回退下载:", e);
              download();
            });
          }
          function copyToClipboard() {
            var done = function() {
              if (BenchRunner.onCopied) BenchRunner.onCopied(text);
            };
            function fallback() {
              var ta = document.createElement("textarea");
              ta.value = text;
              ta.style.cssText = "position:fixed;left:-9999px;top:0";
              document.body.appendChild(ta);
              ta.select();
              try {
                document.execCommand("copy");
                done();
              } catch (e) {
                console.error("复制失败，回退下载:", e);
                download();
              }
              document.body.removeChild(ta);
            }
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(text).then(done).catch(fallback);
            } else {
              fallback();
            }
          }
          if (window.location.protocol === "file:" || window.location.hostname && !window.location.hostname.match(/127\.0\.0\.1|localhost/)) {
            copyToClipboard();
            return;
          }
          if (window.fetch) {
            fetch("http://127.0.0.1:8081/save?name=" + encodeURIComponent(name), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: text
            }).then(function(r) {
              if (!r.ok) throw new Error("http " + r.status);
              if (BenchRunner.onSaved) BenchRunner.onSaved(name);
            }).catch(function() {
              if (BenchRunner.saveDirHandle) writeHandle();
              else copyToClipboard();
            });
          } else if (BenchRunner.saveDirHandle) {
            writeHandle();
          } else {
            copyToClipboard();
          }
        };
        global.BenchRunner = BenchRunner;
      })(typeof window !== "undefined" ? window : globalThis);
    }
  });

  // src/Main.ts
  var import_stats = __toESM(require_stats());
  var import_bunny_sim = __toESM(require_bunny_sim());
  var import_boids_sim = __toESM(require_boids_sim());
  var import_bench_runner = __toESM(require_bench_runner());

  // src/LayaBench.ts
  var BUNNY_IMGS = [
    "rabbitv3.png",
    "rabbitv3_ash.png",
    "rabbitv3_batman.png",
    "rabbitv3_bb8.png",
    "rabbitv3_neo.png",
    "rabbitv3_sonic.png",
    "rabbitv3_spidey.png",
    "rabbitv3_stormtrooper.png",
    "rabbitv3_superman.png",
    "rabbitv3_tron.png",
    "rabbitv3_wolverine.png",
    "rabbitv3_frankenstein.png"
  ];
  var FISH_IMGS = [
    "fish_1.png",
    "fish_2.png",
    "fish_3.png",
    "fish_1.png",
    "fish_2.png"
  ];
  var RES_PREFIX = "resources/bench/";
  var FISH_PREFIX = "resources/fish/";
  var liveEl = null;
  var liveBackend = "";
  var liveLastTs = 0;
  var liveFpsEma = 16.7;
  var LayaBench = class _LayaBench {
    static start() {
      var _a, _b, _c;
      const g = globalThis;
      const Laya2 = g.Laya;
      try {
        const cfgEl = document.querySelector('script[type="text/javascript"][src*="index.js"]');
        if (g.Laya && g.Laya.Config) {
          g.__layaInitConfig = {
            webgpu: !!((_b = (_a = g.Laya.Config.enableWebGPU) != null ? _a : g.Laya.Config.webgpu) != null ? _b : false)
          };
        }
      } catch (_) {
      }
      Laya2.stage.setScreenSize(1280, 720);
      Laya2.stage.scaleMode = Laya2.stage.SCALE_NOSCALE;
      if (g.Laya && g.Laya.Config) g.Laya.Config.isAntialias = false;
      const W = Laya2.stage.width, H = Laya2.stage.height;
      const adapter = new LayaAdapter(Laya2.stage, W, H);
      const stats = new g.BenchStats();
      const runner = new g.BenchRunner(adapter, stats);
      const renderEngine = g.LayaGL && g.LayaGL.renderEngine;
      try {
        const diag = {
          ctorName: renderEngine ? renderEngine.constructor.name : "null",
          ctorStr: renderEngine ? Object.prototype.toString.call(renderEngine) : "",
          hasGPUDevice: typeof globalThis.GPUDevice !== "undefined",
          gpuAvailable: !!((_c = globalThis.navigator) == null ? void 0 : _c.gpu),
          keys: renderEngine ? Object.keys(renderEngine).slice(0, 30) : []
        };
        if (renderEngine) {
          for (const k of [
            "_device",
            "device",
            "_nativeDevice",
            "_gpuDevice",
            "_wgDevice",
            "gpuDevice",
            "_context",
            "context",
            "_gl",
            "gl",
            "_renderContext",
            "renderContext",
            "__gpu__",
            "_webgpu",
            "webgpu"
          ]) {
            if (renderEngine[k] !== void 0) diag["field_" + k] = String(renderEngine[k]).slice(0, 80);
          }
        }
        globalThis.__layaDiag = diag;
        console.log("[LayaBench] WebGPU diag:", JSON.stringify(diag).slice(0, 400));
      } catch (_) {
      }
      let backend = "pending";
      globalThis.__layaBackend = backend;
      globalThis.__layaEngineCtorName = renderEngine ? renderEngine.constructor.name : "null";
      _LayaBench.buildHud(Laya2, runner, adapter, backend);
      Laya2.timer.frameLoop(1, null, () => {
        const ts = performance.now();
        if (adapter._resolvedBackend === void 0) {
          let detected;
          const canvases = Array.from(document.querySelectorAll("canvas"));
          let main = null;
          for (const c of canvases) {
            if (!main || c.width * c.height > main.width * main.height) main = c;
          }
          if (main && main.width > 0) {
            try {
              detected = main.getContext("webgpu") !== null ? "webgpu" : "webgl";
            } catch (_) {
              detected = "webgl";
            }
          }
          if (detected) {
            adapter._resolvedBackend = detected;
            globalThis.__layaBackend = detected;
            const eng = globalThis.LayaGL && globalThis.LayaGL.renderEngine;
            globalThis.__layaEngineCtorName = eng ? eng.constructor.name : "null";
            try {
              globalThis.__layaDiagReady = {
                ctorName: eng ? eng.constructor.name : "null",
                detectedBackend: detected,
                mainCanvas: main ? main.width + "x" + main.height : "none"
              };
              console.log("[LayaBench] backend resolved:", detected, main.width + "x" + main.height);
            } catch (_) {
            }
          }
        }
        runner.tick(ts);
        adapter.step(ts);
        _LayaBench.updateLive(ts, runner, adapter);
      });
      const q = new URLSearchParams(location.search);
      if (q.get("auto") === "1") {
        const variant = q.get("variant") || "V1";
        const count = parseInt(q.get("count") || "10000", 10) || 1e4;
        const $v = document.querySelector("#lv");
        const $c = document.querySelector("#cnt");
        if ($v) {
          $v.value = variant;
        }
        if ($c) {
          $c.value = String(count);
        }
        _LayaBench.loadAndRun(Laya2, runner, adapter, backend, $v, $c);
      }
    }
    /** 载入贴图并跑固定采样（HUD 按钮与自动测试共用） */
    static loadAndRun(Laya2, runner, adapter, backend, $v, $c) {
      const $live = document.querySelector("#live");
      const variant = $v ? $v.value : "V1";
      const count = $c ? parseInt($c.value, 10) || 1e4 : 1e4;
      const names = variant === "boids" ? FISH_IMGS : variant === "V1" ? BUNNY_IMGS.slice(0, 1) : variant === "V2" ? BUNNY_IMGS.slice(0, 8) : BUNNY_IMGS;
      const prefix = variant === "boids" ? FISH_PREFIX : RES_PREFIX;
      const urls = names.map((n) => prefix + n);
      Laya2.loader.load(urls, Laya2.Handler.create(null, () => {
        adapter.textures = urls.map((u) => Laya2.loader.getRes(u));
        runner.fixedRun({
          engine: "layaair-3.4.0",
          variant,
          backend,
          count
        });
        if ($live) {
          $live.textContent = "运行中…";
        }
      }));
    }
    /** 实时读数：每 400ms 刷新一次（对齐 6_21 面板） */
    static updateLive(ts, runner, adapter) {
      if (liveLastTs) {
        const dt = Math.min(ts - liveLastTs, 100);
        liveFpsEma = liveFpsEma * 0.9 + dt * 0.1;
      }
      liveLastTs = ts;
      if (!liveEl) return;
      const now = performance.now();
      const lastLive = window.__layaLastLive || 0;
      if (now - lastLive > 400) {
        window.__layaLastLive = now;
        const dc = adapter.readDrawCalls ? adapter.readDrawCalls() : -1;
        liveEl.textContent = "后端: " + liveBackend + "\n视口: " + adapter.W + "×" + adapter.H + "\n数量: " + adapter.nodeCount() + "\nFPS: " + (1e3 / liveFpsEma).toFixed(1) + "\n" + (dc >= 0 ? "drawCall: " + Math.round(dc) : "");
      }
    }
    static buildHud(Laya2, runner, adapter, backend) {
      liveBackend = backend;
      const style = document.createElement("style");
      style.textContent = '#hud{position:fixed;left:8px;top:8px;z-index:99998;background:rgba(16,22,30,.86);backdrop-filter:blur(6px);border:1px solid #2b3947;border-radius:10px;padding:10px 12px;color:#e6edf3;font:13px -apple-system,"PingFang SC","Microsoft YaHei",sans-serif;width:380px;max-width:92vw;max-height:96vh;overflow:auto}#hud h3{margin:0 0 8px;font-size:13px;color:#7fd4ff;font-weight:600}#hud .row{display:flex;align-items:center;gap:8px;margin:6px 0;flex-wrap:wrap}#hud .lbl{width:40px;color:#8aa0b4;flex:none;font-size:12px}#hud select,#hud input{background:#0d1218;color:#e6edf3;border:1px solid #33475a;border-radius:7px;padding:4px 8px;font-size:12px}#hud input{width:70px}#hud button{background:#1d2833;color:#cdd9e5;border:1px solid #33475a;border-radius:7px;padding:4px 10px;cursor:pointer;font-size:12px}#hud button:hover:not(:disabled){background:#27405f}#hud button:disabled{opacity:.45;cursor:default}#hud button.primary{background:#2f6feb;border-color:#2f6feb;color:#fff;font-weight:600}#hud button.danger{background:#7a2f2f;border-color:#7a2f2f;color:#fff}#hud .live{background:#0d1218;border:1px solid #2b3947;border-radius:8px;padding:7px 9px;white-space:pre;font:11px/1.6 ui-monospace,Consolas,monospace;color:#9fe8a8}#hud .bar{height:4px;background:#0d1218;border-radius:2px;overflow:hidden;margin:6px 0}#hud .bar .fill{height:100%;width:0;background:#2f6feb;transition:width .2s}#hud #report{background:#0d1218;border:1px solid #2b3947;border-radius:8px;padding:7px 9px;white-space:pre-wrap;font:11px/1.6 ui-monospace,Consolas,monospace;color:#cdd9e5;max-height:30vh;overflow:auto;display:none}#hud .tip{margin-top:6px;font-size:11.5px;color:#7d93a8;line-height:1.5}';
      document.head.appendChild(style);
      const hud = document.createElement("div");
      hud.id = "hud";
      hud.innerHTML = "<h3>🐰 LayaAir 3.4 [" + backend + ']</h3><div class="row"><span class="lbl">场景</span><select id="lv"><option value="V1">Bunny V1 同纹理合批</option><option value="V2">Bunny V2 atlas多帧</option><option value="V3">Bunny V3 随机变换</option><option value="V4">Bunny V4 12纹理压力</option><option value="boids">水族馆 2D Boids</option></select></div><div class="row"><span class="lbl">数量</span><input id="cnt" type="number" value="10000" step="1000"><button id="fixed" class="primary">固定采样</button><button id="ramp">阶梯压测</button></div><div class="row"><span class="lbl">增减</span><button id="add1k">+1千</button><button id="sub1k">-1千</button><button id="add10k">+1万</button><button id="sub10k">-1万</button></div><div class="row"><button id="autoBtn" class="primary">▶ 一键自动测试</button><button id="stopBtn" class="danger">停止</button></div><div class="live" id="live">等待首帧…</div><div class="bar"><div class="fill" id="progFill"></div></div><div id="report"></div><div class="tip">固定采样：预热 3s + 采样 10s 出 P50/P95/P99。一键自动测试：档位阶梯逐级加压（预热1.2s+采样2s），≥55fps 记承载力，&lt;50fps 掉帧即停。结果 JSON 自动复制。</div>';
      document.body.appendChild(hud);
      const $v = hud.querySelector("#lv");
      const $c = hud.querySelector("#cnt");
      const $out = hud.querySelector("#report");
      const $live = hud.querySelector("#live");
      const $fill = hud.querySelector("#progFill");
      liveEl = $live;
      runner.onReport = (json) => {
        $live.textContent = "完成: fps=" + json.fps + " p50=" + json.p50 + "ms p95=" + json.p95 + "ms p99=" + json.p99 + "ms dc=" + json.drawCallAvg + " nodes=" + json.nodeCount;
        globalThis.BenchRunner.exportJSON(json);
      };
      globalThis.BenchRunner.onSaved = (name) => {
        $live.textContent += " | 已存: " + name;
      };
      globalThis.BenchRunner.onCopied = () => {
        $live.textContent += " | 已复制 JSON";
      };
      hud.querySelector("#fixed").addEventListener("click", () => {
        _LayaBench.loadAndRun(Laya2, runner, adapter, backend, $v, $c);
      });
      hud.querySelector("#ramp").addEventListener("click", () => {
        loadAssets($v.value, () => {
          runner.rampRun({
            engine: "layaair-3.4.0",
            variant: $v.value,
            backend,
            stepCount: 1e3,
            stepMs: 2e3,
            maxCount: 2e5
          });
          $live.textContent = "阶梯压测中…";
        });
      });
      const bump = (d) => {
        if (!adapter.sim) {
          loadAssets($v.value, () => {
          });
        }
        const cur = adapter.nodeCount();
        const next = Math.max(0, cur + d);
        adapter.setCount(next);
        $c.value = String(next);
      };
      hud.querySelector("#add1k").addEventListener("click", () => bump(1e3));
      hud.querySelector("#sub1k").addEventListener("click", () => bump(-1e3));
      hud.querySelector("#add10k").addEventListener("click", () => bump(1e4));
      hud.querySelector("#sub10k").addEventListener("click", () => bump(-1e4));
      hud.querySelector("#autoBtn").addEventListener("click", () => {
        loadAssets($v.value, () => {
          $out.style.display = "block";
          const lines = ["== 承载力测试 [" + backend + " · " + $v.value + "] =="];
          $out.textContent = lines.join("\n");
          runner.autoRamp({
            engine: "layaair-3.4.0",
            variant: $v.value,
            backend,
            onLevel: (lv) => {
              if (lv.phase === "start") {
                $fill.style.width = (lv.index / lv.total * 100).toFixed(1) + "%";
                $live.textContent = lv.count + " 只 · 稳定中…";
              } else {
                $fill.style.width = ((lv.index + 1) / lv.total * 100).toFixed(1) + "%";
                const j = lv.json;
                lines.push("  " + lv.count + " 只: " + j.fps + "fps " + (lv.stable ? "✓稳" : "✗掉帧") + " | p95 " + j.p95 + "ms | dc " + j.drawCallAvg);
                $out.textContent = lines.join("\n");
                globalThis.BenchRunner.exportJSON(j);
              }
            },
            onDone: (r) => {
              if (r.capped) lines.push("▶ ⚠ 最高档 " + r.cap + " 只仍未掉帧：承载力被天花板截断");
              else if (r.jankAt != null) lines.push("▶ 承载力: " + r.cap + " 只稳 ≥55fps（" + r.jankAt + " 只掉帧）");
              else lines.push("▶ 承载力: " + r.cap + " 只");
              $out.textContent = lines.join("\n");
              $fill.style.width = "100%";
              $live.textContent = "自动测试完成，承载力 " + r.cap + " 只。";
            }
          });
        });
      });
      hud.querySelector("#stopBtn").addEventListener("click", () => {
        runner.stopAuto();
        $live.textContent = "已停止。";
      });
      function loadAssets(variant, cb) {
        const names = variant === "boids" ? FISH_IMGS : variant === "V1" ? BUNNY_IMGS.slice(0, 1) : variant === "V2" ? BUNNY_IMGS.slice(0, 8) : BUNNY_IMGS;
        const prefix = variant === "boids" ? FISH_PREFIX : RES_PREFIX;
        const urls = names.map((n) => prefix + n);
        Laya2.loader.load(urls, Laya2.Handler.create(null, () => {
          adapter.textures = urls.map((u) => Laya2.loader.getRes(u));
          cb();
        }));
      }
    }
  };
  var LayaAdapter = class {
    constructor(root, W, H) {
      this.root = root;
      this.W = W;
      this.H = H;
      this.textures = [];
      this.sim = null;
      this.nodes = [];
      this.variant = "V1";
      this.mode = "bunny";
      this.extra = [];
      this.lastTick = 0;
    }
    init(variant, bounds) {
      this.clearAll();
      this.variant = variant;
      this.mode = variant === "boids" ? "boids" : "bunny";
      const b = bounds || { left: 0, top: 0, right: this.W, bottom: this.H };
      const g = globalThis;
      this.sim = this.mode === "boids" ? new g.BoidsSim(b.right - b.left, b.bottom - b.top) : new g.BunnySim(b);
    }
    clearAll() {
      this.root.removeChildren();
      this.nodes.length = 0;
      this.extra.length = 0;
    }
    makeSprite(i) {
      const g = globalThis;
      const tex = this.mode === "boids" ? this.textures[this.sim.list[i].species % this.textures.length] : this.variant === "V1" || this.variant === "V3" ? this.textures[0] : this.textures[i % this.textures.length];
      const sp = new g.Laya.Sprite();
      sp.texture = tex;
      sp.pivot(13, this.mode === "boids" ? 18 : 37);
      this.root.addChild(sp);
      if (this.variant === "V3") {
        this.extra.push({ rotSpeed: (Math.random() - 0.5) * 4, phase: Math.random() * 6.28 });
      }
      return sp;
    }
    setCount(n) {
      const cur = this.nodes.length;
      if (n > cur) {
        this.sim.add(n - cur);
        for (let i = cur; i < n; i++) this.nodes.push(this.makeSprite(i));
      } else if (n < cur) {
        this.sim.remove(cur - n);
        for (let j = cur - 1; j >= n; j--) {
          this.nodes[j].removeSelf();
          this.nodes.pop();
          if (this.extra.length) this.extra.pop();
        }
      }
    }
    step(ts) {
      const dt = this.lastTick ? Math.min(ts - this.lastTick, 100) : 16.7;
      this.lastTick = ts;
      if (!this.sim) return;
      const list = this.sim.list, nodes = this.nodes, len = list.length;
      if (this.mode === "boids") {
        this.sim.update(dt);
        for (let i = 0; i < len; i++) {
          nodes[i].pos(list[i].x, list[i].y);
          const cosA = Math.cos(list[i].angle);
          const s = list[i].scale || 1;
          nodes[i].scaleX = cosA > 0 ? -s : s;
          nodes[i].scaleY = s;
          const tilt = cosA > 0 ? list[i].angle : list[i].angle - Math.PI;
          nodes[i].rotation = tilt * 57.29577951;
        }
      } else {
        this.sim.update();
        if (this.variant === "V3") {
          for (let i = 0; i < len; i++) {
            nodes[i].pos(list[i].x, list[i].y);
            this.extra[i].phase += 0.1;
            nodes[i].rotation += this.extra[i].rotSpeed;
            const s = 0.75 + 0.25 * Math.sin(this.extra[i].phase);
            nodes[i].scale(s, s);
          }
        } else {
          for (let i = 0; i < len; i++) {
            nodes[i].pos(list[i].x, list[i].y);
          }
        }
      }
    }
    readDrawCalls() {
      const g = globalThis;
      const L = g.Laya;
      const statAgent = g.LayaGL && g.LayaGL.statAgent || L && L.LayaGL && L.LayaGL.statAgent;
      const statEl = g.StatElement || L && L.StatElement;
      if (statAgent && statEl) {
        const v = statAgent.getElementData(statEl.CT_2DDrawCall);
        return typeof v === "number" ? v : -1;
      }
      return -1;
    }
    readBenchMetrics() {
      const g = globalThis;
      const engine = g.LayaGL && g.LayaGL.renderEngine;
      const resolvedBackend = this._resolvedBackend || "webgl";
      let actualBackend = resolvedBackend;
      globalThis.__layaActualBackend = actualBackend;
      globalThis.__layaEngineCtorName = engine ? engine.constructor.name : "null";
      try {
        if (engine) {
          const d2 = {};
          for (const k of [
            "_device",
            "device",
            "_nativeDevice",
            "_gpuDevice",
            "gpuDevice",
            "_wgDevice",
            "_gl",
            "gl",
            "_context",
            "context"
          ]) {
            if (engine[k] !== void 0) d2["f_" + k] = String(engine[k]).slice(0, 60);
          }
          globalThis.__layaDiagMetrics = d2;
        }
      } catch (_) {
      }
      return {
        actualBackend,
        renderWidth: this.W,
        renderHeight: this.H,
        antialias: false,
        workloadClass: this.variant === "V4" ? "finite-multi-texture-pressure" : "standard",
        textureCount: this.variant === "V1" || this.variant === "V3" ? 1 : this.variant === "V2" ? 8 : 12
      };
    }
    nodeCount() {
      return this.nodes.length;
    }
  };

  // src/Main.ts
  var { regClass, property } = Laya;
  var Main = class extends Laya.Script {
    onStart() {
      console.log("Game start");
      LayaBench.start();
    }
  };
  Main = __decorateClass([
    regClass("e60XQm7tTY2BwFAdxb8D1g")
  ], Main);
})();
