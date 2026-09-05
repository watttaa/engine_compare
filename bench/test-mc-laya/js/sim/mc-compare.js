/**
 * MCCompare —— 预烘焙角色基准「自动双后端」跨页驱动（引擎无关）
 *
 * 职责：把逐臂承载力压测串成一次双后端对比——
 *   start()            按钮入口：写会话状态并跳转 WebGL 臂
 *   continueAfterArm() 各臂压测完成后回调：webgl 臂→跳 WebGPU 臂；webgpu 臂→汇总出对比结果
 *
 * 页面接线约定（各引擎臂一致）：
 *   1. 页面 URL 带 autoCompare 参数时自行启动本臂承载力压测（读 capacityCounts）
 *   2. 压测 onDone 组装本臂 JSON（mode=capacity-ramp）后调 continueAfterArm(json)
 *   3. onDone(result) 收到最终对比 JSON（mode=auto-backend-compare），页面负责展示与导出
 *
 * 状态存 sessionStorage['mcBackendCompare']（同源跨页共享）；状态内带 engine 标识，
 * 跨引擎串档（同标签页先中断一引擎再开另一引擎）时丢弃重建，避免混档。
 */
(function (global) {
    'use strict';
    var STORE_KEY = 'mcBackendCompare';
    var DEFAULT_COUNTS = '20,40,80,160,320,640,1280,2560,3200,4096';
    function MCCompare(opts) {
        this.engine = opts.engine || 'unknown';
        this.webglPage = opts.webglPage; // 例：'/egret-mc/index.html'
        this.webgpuPage = opts.webgpuPage; // 例：'/opt-www/index-opt.html'
        this.webglQuery = opts.webglQuery || ''; // webgl 臂附加参数，如 'scene=mc'
        this.webgpuQuery = opts.webgpuQuery || ''; // webgpu 臂附加参数，如 'scene=mc&channel=instanced'
        this.counts = opts.counts || DEFAULT_COUNTS;
        this.onProgress = opts.onProgress || function () { }; // (msg)
        this.onDone = opts.onDone || function () { }; // (compareResult)
    }
    MCCompare.DEFAULT_COUNTS = DEFAULT_COUNTS;
    MCCompare.prototype.armUrl = function (backend, counts) {
        var extra = backend === 'webgl' ? this.webglQuery : this.webgpuQuery;
        return (backend === 'webgl' ? this.webglPage : this.webgpuPage) +
            '?backend=' + backend +
            '&capacityCounts=' + encodeURIComponent(counts) +
            '&autoCompare=' + backend +
            (extra ? '&' + extra : '');
    };
    MCCompare.prototype.start = function () {
        var q = new URLSearchParams(location.search);
        var counts = q.get('capacityCounts') || this.counts;
        sessionStorage.setItem(STORE_KEY, JSON.stringify({
            engine: this.engine,
            counts: counts,
            startedAt: Date.now(),
            originalUrl: location.href,
            results: {}
        }));
        location.replace(this.armUrl('webgl', counts));
    };
    /** 本臂压测完成回调。返回 true 表示流程已接管（重定向或汇总），页面无须再处理。 */
    MCCompare.prototype.continueAfterArm = function (armJson) {
        var q = new URLSearchParams(location.search);
        var phase = q.get('autoCompare');
        if (!phase)
            return false;
        var state = null;
        var raw = sessionStorage.getItem(STORE_KEY);
        if (raw) {
            try {
                state = JSON.parse(raw);
            }
            catch (e) {
                state = null;
            }
        }
        // 无状态 / 其它引擎的陈旧状态（直接以 URL 打开或同标签页换引擎）：webgl 臂重建状态继续
        if (!state || state.engine !== this.engine) {
            if (phase !== 'webgl')
                return false;
            state = {
                engine: this.engine,
                counts: q.get('capacityCounts') || this.counts,
                startedAt: Date.now(),
                originalUrl: location.href,
                results: {}
            };
        }
        state.results[phase] = armJson;
        if (phase === 'webgl') {
            sessionStorage.setItem(STORE_KEY, JSON.stringify(state));
            this.onProgress('WebGL 完成，正在启动 WebGPU…');
            var self = this;
            setTimeout(function () { location.replace(self.armUrl('webgpu', state.counts)); }, 800);
            return true;
        }
        sessionStorage.removeItem(STORE_KEY);
        var webgl = state.results.webgl, webgpu = state.results.webgpu;
        if (!webgl || !webgpu)
            return false;
        this.onDone({
            meta: {
                engine: this.engine,
                mode: 'auto-backend-compare',
                counts: state.counts,
                startedAt: state.startedAt,
                finishedAt: Date.now()
            },
            webgl: webgl,
            webgpu: webgpu
        });
        return true;
    };
    global.MCCompare = MCCompare;
})(typeof window !== 'undefined' ? window : globalThis);
