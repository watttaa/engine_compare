/**
 * BenchStats — 引擎无关的帧时间与指标采集
 *
 * 测量协议（三引擎必须一致）：
 *  - 帧时间(ms) 优先于 FPS，输出 p50/p95/p99
 *  - 先预热 preWarmSec 秒，预热帧不进统计
 *  - drawCalls / 节点数由各自适配器每帧写入（引擎 API 不同）
 *  - tick() 必须放在同一相对位置：帧回调入口（引擎 tick 开始时）
 */
(function (global) {
    'use strict';
    function BenchStats() {
        this.samples = [];
        this._drawCallSamples = [];
        this._lastTs = 0;
        this._phase = 'idle'; // idle -> prewarm -> sampling -> done
        this._elapsed = 0;
        this._phaseEnd = 0;
        this._sampleDur = 0;
        this._onDone = null;
        this._readDrawCalls = null; // adapter.readDrawCalls 函数，每帧调用采集
        this.nodeCount = 0;
        this.meta = {};
    }
    BenchStats.prototype.start = function (preWarmSec, sampleSec, onDone) {
        this.samples.length = 0;
        this._drawCallSamples.length = 0;
        this._lastTs = 0;
        this._phase = 'prewarm';
        this._elapsed = 0;
        this._phaseEnd = (preWarmSec || 3) * 1000;
        this._maxWarm = this._phaseEnd * 3; // 收敛失败时的强制上限
        this._warmFrames = [];
        this._calmSince = 0;
        this._sampleDur = (sampleSec || 10) * 1000;
        this._onDone = onDone;
    };
    BenchStats.prototype.tick = function (ts) {
        if (this._phase === 'idle' || this._phase === 'done')
            return;
        // 标签页不可见时 requestAnimationFrame 会降频；这些帧不能计入性能结果。
        if (global.document && global.document.hidden) {
            this._lastTs = 0;
            return;
        }
        if (this._lastTs === 0) {
            this._lastTs = ts;
            return;
        }
        var dt = ts - this._lastTs;
        this._lastTs = ts;
        // >200ms 的大间隙丢弃（后台切换半程 / 大 GC 停顿），与 Laya 3D 适配器同口径；
        // 该帧不进预热也不进样本，但时钟照常推进
        if (dt <= 0 || dt > 200)
            return;
        if (this._phase === 'prewarm') {
            // 动态预热：固定时长易被 WebGPU 首跑 PSO 编译 / 资源解码污染采样窗。
            // 帧时间滑动窗口收敛（p95≤20ms 且均值≤18.2ms 持续 1s）则提前进入采样；
            // 最短预热 = preWarmSec，最长 = 3×preWarmSec（收敛失败强制开采样）。
            this._warmFrames.push(dt);
            if (this._warmFrames.length > 40)
                this._warmFrames.shift();
            var warmOk = false;
            if (this._warmFrames.length >= 30) {
                var ws = this._warmFrames.slice().sort(function (a, b) { return a - b; });
                var wp95 = ws[Math.floor(ws.length * 0.95)];
                var wavg = 0;
                for (var wi = 0; wi < ws.length; wi++)
                    wavg += ws[wi];
                wavg /= ws.length;
                warmOk = wp95 <= 20 && wavg <= 18.2;
            }
            if (warmOk && !this._calmSince)
                this._calmSince = this._elapsed;
            if (!warmOk)
                this._calmSince = 0;
            this._elapsed += dt;
            var converged = warmOk && this._calmSince > 0 && (this._elapsed - this._calmSince) >= 1000;
            if (this._elapsed >= this._phaseEnd && (converged || this._elapsed >= this._maxWarm) || this._elapsed >= this._maxWarm) {
                this._phase = 'sampling';
                this._elapsed = 0;
                // 重置 drawCall 基准：预热期积累的 probe 计数全部丢弃，
                // 采样期第一帧的增量从 0 开始（三引擎同一时机，公平）
                if (this._readDrawCalls)
                    this._readDrawCalls();
            }
            return;
        }
        this.samples.push(dt);
        if (this._readDrawCalls) {
            var dc = this._readDrawCalls();
            if (dc >= 0)
                this._drawCallSamples.push(dc);
        }
        this._elapsed += dt;
        if (this._elapsed >= this._sampleDur) {
            this._phase = 'done';
            if (this._onDone)
                this._onDone(this.toJSON());
        }
    };
    function percentile(sorted, p) {
        if (!sorted.length)
            return 0;
        return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p / 100))];
    }
    // GPU 信息采集（公平性核对：WebGL debug_renderer_info / WebGPU adapter.info）
    // 由各引擎适配器在 init 时调用一次，写入 stats 静态字段；结果 JSON 输出 gpuVendor/gpuRenderer。
    BenchStats.prototype.captureGpuInfo = function () {
        var g = global, out = { gpuVendor: null, gpuRenderer: null };
        try {
            // WebGPU：navigator.gpu 同步 adapter 不可得（requestAdapter 异步），
            // 引擎若在 adapter 里存了 info 则取；否则标记需要异步上报。
            if (g.navigator && g.navigator.gpu && g.navigator.gpu.__adapterInfo) {
                var ai = g.navigator.gpu.__adapterInfo;
                out.gpuVendor = ai.vendor || null;
                out.gpuRenderer = ai.architecture || null;
            }
            // WebGL：debug_renderer_info 扩展（Chrome/Firefox 支持）
            var cv = document.createElement('canvas');
            var gl = cv.getContext('webgl') || cv.getContext('experimental-webgl');
            if (gl) {
                var dbg = gl.getExtension('WEBGL_debug_renderer_info');
                if (dbg) {
                    out.gpuVendor = gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) || out.gpuVendor;
                    out.gpuRenderer = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || out.gpuRenderer;
                }
            }
        }
        catch (e) { /* 忽略：GPU 信息是辅助字段，拿不到不影响主结果 */ }
        this.gpuVendor = out.gpuVendor;
        this.gpuRenderer = out.gpuRenderer;
    };
    BenchStats.prototype.toJSON = function () {
        var s = this.samples.slice().sort(function (a, b) { return a - b; });
        var sum = 0, over = 0, i;
        for (i = 0; i < s.length; i++) {
            sum += s[i];
            if (s[i] > 16.7)
                over++;
        }
        var avg = s.length ? sum / s.length : 0;
        // drawCall 采样期统计：均值 + 峰值（三引擎统一口径）
        var dcs = this._drawCallSamples;
        var dcAvg = 0, dcMax = 0;
        if (dcs.length) {
            dcs.sort(function (a, b) { return a - b; });
            var dcSum = 0;
            for (i = 0; i < dcs.length; i++)
                dcSum += dcs[i];
            dcAvg = Math.round(dcSum / dcs.length * 10) / 10;
            dcMax = dcs[dcs.length - 1];
        }
        // 1% low（最慢 1% 帧的平均帧时，jank 一致性指标）+ 帧时间标准差
        var p1Low = 0, stdDev = 0;
        if (s.length) {
            var tailN = Math.max(1, Math.ceil(s.length * 0.01));
            var tailSum = 0;
            for (i = s.length - tailN; i < s.length; i++)
                tailSum += s[i];
            p1Low = tailSum / tailN;
            var variance = 0;
            for (i = 0; i < s.length; i++) {
                var d = s[i] - avg;
                variance += d * d;
            }
            stdDev = Math.sqrt(variance / s.length);
        }
        return {
            meta: this.meta,
            nodeCount: this.nodeCount,
            drawCallAvg: dcAvg,
            drawCallMax: dcMax,
            drawCallSamples: dcs.length,
            frames: s.length,
            fps: avg ? Math.round(1000 / avg * 10) / 10 : 0,
            p50: Math.round(percentile(s, 50) * 100) / 100,
            p95: Math.round(percentile(s, 95) * 100) / 100,
            p99: Math.round(percentile(s, 99) * 100) / 100,
            p1Low: Math.round(p1Low * 100) / 100,
            stdDev: Math.round(stdDev * 100) / 100,
            overBudgetPct: s.length ? Math.round(over / s.length * 1000) / 10 : 0,
            jsHeapMB: (global.performance && global.performance.memory)
                ? Math.round(global.performance.memory.usedJSHeapSize / 1048576) : null,
            gpuVendor: this.gpuVendor || null,
            gpuRenderer: this.gpuRenderer || null,
            userAgent: global.navigator.userAgent,
            timestamp: Date.now()
        };
    };
    global.BenchStats = BenchStats;
})(typeof window !== 'undefined' ? window : globalThis);
