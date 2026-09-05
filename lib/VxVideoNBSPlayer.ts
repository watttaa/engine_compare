// 主线程模式：webpack 静态编译胶水 JS，直接得到 NBSWechatModule 函数对象，
// 无需 eval / new Function，规避微信小游戏的 CSP 限制。
// nbs_minigame.js 已合并 SIMD/非SIMD 为单文件（通过 Module._wasmName 动态选择 WASM）
import NbsMinigameFactory from './vxvideonbs/nbs_minigame';
import { HeroMainModel } from "heroMain/HeroMainModel";

/**
 * VxVideoNBSPlayer.ts
 * NBS 视频播放器 —— 基于 NBS WASM 主线程软解 + Egret 主 GL context FBO 渲染
 * 视频帧通过 FBO 离屏渲染后注入 egret.BitmapData，融入 Egret 渲染树
 * 支持 z-order / alpha / mask，无需独立 Canvas，支持多路并发播放
 *
 * 用法示例（多路）：
 *   const p1 = VxVideoNBSPlayer.create();
 *   p1.play('resource/assets/vxvideo/wuyi25_nor.bin', container1, true, 0);
 *
 *   const p2 = VxVideoNBSPlayer.create();
 *   p2.play('resource/assets/vxvideo/squirrel.bin', container2, true, 0);
 *
 *   // 停止时单独调用
 *   p1.stop();
 *   p2.stop();
 *
 * 用法示例（兼容旧单例，等价于只播一路）：
 *   VxVideoNBSPlayer.getInst().play(...);  // 会自动 stop 上一路
 */

export class VxVideoNBSPlayer {

    // ── 单例（向后兼容，只管理单路） ──────────────────────
    private static $inst: VxVideoNBSPlayer;

    // ── 全局实例注册表（防止 WASM 泄漏） ──────────────────
    private static $registry: VxVideoNBSPlayer[] = [];

    // ── 延迟清理 Module 定时器 ──────────────────
    private static $clearModuleTimer: number | null = null;
    private static readonly $CLEAR_MODULE_INTERVAL = 3000;

    // ── 构造耗时统计 ──────────────────
    private static $constructMaxMs: number = 0;
    public static get constructMaxMs(): number { return VxVideoNBSPlayer.$constructMaxMs; }

    /** 获取单例（向后兼容接口，调用 play 时会 stop 上一路） */
    public static getInst(): VxVideoNBSPlayer {
        if (!VxVideoNBSPlayer.$inst) {
            VxVideoNBSPlayer.$inst = new VxVideoNBSPlayer();
            VxVideoNBSPlayer.$registry.push(VxVideoNBSPlayer.$inst);
        }
        return VxVideoNBSPlayer.$inst;
    }

    /**
     * 创建一个新的独立播放器实例，支持多路并发
     * 调用者负责在合适时机调用 instance.stop() 释放资源
     */
    public static create(): VxVideoNBSPlayer {
        const inst = new VxVideoNBSPlayer();
        VxVideoNBSPlayer.$registry.push(inst);
        return inst;
    }

    /**
     * 停止所有活跃实例并释放资源（防泄漏兜底）
     * 建议在 UIManager.destroyAll() 或活动模块整体卸载时调用
     */
    public static stopAll(): void {
        // 浅拷贝后遍历，因为 stop() 内部会修改 $registry
        const all = VxVideoNBSPlayer.$registry.slice();
        for (let i = 0; i < all.length; i++) {
            all[i].stop();
        }
    }

    private $doPendingOps(): void {
        const ops = this.$pendingOps;
        this.$pendingOps = [];
        for (const fn of ops) fn();
    }

    /** $player 未就绪时缓存操作，返回 null；就绪则执行并返回结果 */
    private $ensureReady<T>(fn: () => T): T | null {
        if (this.$player) {
            return fn();
        } else {
            this.$pendingOps.push(() => { fn(); });
            return null;
        }
    }

    /**
     * 清理主线程共享 WASM Module 缓存（释放 ~16MB）
     *
     * 【谨慎调用】一般情况下不调此方法，销毁 WASM Module 后下次 play 需重新编译，
     * 部分机型（尤其低端 Android）编译耗时，会导致明显掉帧/卡顿。
     *
     * 内部使用 3 秒轮询定时器，检测所有实例 stop 后才真正清理，弹脸→抽奖切换场景安全。
     * 建议仅在活动模块完全退出（destroy）时调用，避免在界面切换途中调用。
     */
    public static clearModuleCache(): void {
        // 鸿蒙系统：WASM 清理可能导致崩溃，跳过
        const perfData = PerformanceMgr.getInstance().perfData;
        if (perfData && (perfData as any).isHarmony) {
            Logger.log('[VxNBSPlayer] clearModuleCache: harmony skip');
            return;
        }
        // Android 微信小游戏：WASM native 强持 instance，清理后内存无法回收反而泄漏，跳过
        if (preload_utils_platform.isWxGame()) {
            Logger.log('[VxNBSPlayer] clearModuleCache: wechat skip, avoid memory leak');
            VxVideoNBSPlayer.stopAll();
            return;
        }
        // 已有定时器在跑，先清除再重建
        if (VxVideoNBSPlayer.$clearModuleTimer !== null) {
            egret.clearInterval(VxVideoNBSPlayer.$clearModuleTimer);
            VxVideoNBSPlayer.$clearModuleTimer = null;
        }
        VxVideoNBSPlayer.$clearModuleTimer = egret.setInterval(() => {
            if (VxVideoNBSPlayer.$registry.length > 0) {
                if (DEBUG) {
                    const paths = VxVideoNBSPlayer.$registry.map(r => r.$nbsPath || 'unknown').join(', ');
                    Logger.warn('[VxNBSPlayer] clearModuleCache: '
                        + VxVideoNBSPlayer.$registry.length + ' active instances [' + paths + '], skip');
                }
                return;
            }
            // 无活跃实例，执行清理并停止定时器
            egret.clearInterval(VxVideoNBSPlayer.$clearModuleTimer!);
            VxVideoNBSPlayer.$clearModuleTimer = null;
            VxVideoNBSPlayer.$doClearModuleCache();
        }, this, VxVideoNBSPlayer.$CLEAR_MODULE_INTERVAL);
    }

    private static $doClearModuleCache(): void {
        // 用 globalThis 兼容微信小游戏（window 在小游戏中可能不存在）
        const NBSRuntime: any = (globalThis as any)['VxVideoNBS'];
        if (NBSRuntime && NBSRuntime.modulePool) {
            NBSRuntime.modulePool.clearCache();
            Logger.log('[VxNBSPlayer] clearModuleCache: shared WASM module cache released');
        }
    }

    /** 当前活跃实例数量（调试用） */
    public static get activeCount(): number {
        return VxVideoNBSPlayer.$registry.length;
    }

    /**
     * 获取当前环境可用的 WebAssembly 对象
     * - 标准浏览器 / H5：全局 WebAssembly
     * - 微信小游戏：WXWebAssembly（微信专属，挂在 globalThis 上）
     * - 抖音小游戏：TTWebAssembly
     * 返回 null 表示当前环境不支持 WASM
     */
    public static getWasmApi(): typeof WebAssembly | null {
        if (typeof WebAssembly !== 'undefined') return WebAssembly;
        const wxWasm = (globalThis as any)['WXWebAssembly'];
        if (wxWasm) return wxWasm as typeof WebAssembly;
        const ttWasm = (globalThis as any)['TTWebAssembly'];
        if (ttWasm) return ttWasm as typeof WebAssembly;
        return null;
    }

    public static isSupported(): boolean {
        // WASM 是必须的基础条件（兼容微信小游戏的 WXWebAssembly）
        if (!VxVideoNBSPlayer.getWasmApi()) return false;
        if (typeof globalThis === 'undefined') return false;
        return true;
    }

    private $player:   any            = null;
    private $bitmap:   egret.Bitmap   = null;
    private $texture:  egret.Texture  = null;
    /** stop() 已被调用的标志，用于取消尚未完成的异步 play() */
    private $stopped:  boolean        = false;
    /** 缓存 $player 未就绪时的操作，等 $player 创建后自动执行 */
    private $pendingOps: Array<() => void> = [];
    /** 当前播放的 nbsPath，用于日志调试 */
    private $nbsPath:  string         = '';

    private constructor() {}

    /**
     * 灰度开关：从 manifest config.VxVideoNbs 读取
     * 1 → true（开启）；0 或未配置 → false（关闭）
     */
    public static get ENABLE_NBS_GRAY(): boolean {
        const val = launch_mgr?.curManifestData?.config?.VxVideoNbs;
        return val === 1;
    }

    public static isNbsEnabled(): boolean {
        if (DEBUG) return true;
        // 鸿蒙系统：当前主线程 WASM 软解兼容性问题，强制关闭
        // TODO: 等 app 支持 Worker 播放视频后再开放
        const perfData = PerformanceMgr.getInstance().perfData;
        if (perfData && (perfData as any).isHarmony) {
            return false;
        }
        return VxVideoNBSPlayer.ENABLE_NBS_GRAY;
    }
 
    /**
     * 播放 NBS 视频
     * @param nbsPath      .bin 文件相对路径
     * @param container    Bitmap 挂载父容器（eui.Group / egret.DisplayObjectContainer）
     * @param loop         是否循环，默认 true
     * @param childIndex   Bitmap 在容器内的层级，默认 0（最底层）
     * @param fitContainer 是否以容器宽高作为显示尺寸（视频降分辨率时用于放缩还原），默认 false
     * @param frameDelay   错帧调度延迟帧数：视频1传0，视频2传1，视频3传2，依此类推
     * @param frameMod     调度周期：通常 = 设备帧率 ÷ 视频帧率（如 60fps÷20fps=3），<=1 时不限制
     * @param playMode     播放模式：0=Normal（普通播放），1=Animation（多clip的视频播放模式）
     */
    public play(
        nbsPath: string,
        container: egret.DisplayObjectContainer,
        loop: boolean = true,
        childIndex: number = 0,
        fitContainer: boolean = true,
        frameDelay: number = 0,
        frameMod: number = 3,
        playMode: number = 0
    ): void {
        // 灰度控制：账号 id 尾号为 8 且非小游戏才开放
        if (!VxVideoNBSPlayer.isNbsEnabled()) {
            Logger.log('[VxNBSPlayer] gray scale miss, skip NBS play');
            return;
        }

        if (!VxVideoNBSPlayer.isSupported()) {
            Logger.warn('[VxNBSPlayer] platform not supported, skip');
            return;
        }
        // 用 globalThis 兼容微信小游戏（window 在小游戏中可能不存在）
        const NBSRuntime: any = (globalThis as any)['VxVideoNBS'];
        if (!NBSRuntime || !NBSRuntime.NBSPlayer) {
            const msg = '[VxNBSPlayer] VxVideoNBS module not loaded, ensure libs/vxvideonbs/vxvideonbs.js is included';
            Logger.error(msg);
            uploadDump_(msg, msg, 'VxNBSPlayer_ModuleNotLoaded', 'SCRIPT_ERROR');
            return;
        }

        // 注入 WASM 工厂函数（确保在引擎模块就绪后注入）
        // import 时引擎可能还未加载，因此在 play() 时懒注入，重复注入无害
        if (typeof NBSRuntime.injectMainThreadFactory === 'function') {
            NBSRuntime.injectMainThreadFactory(NbsMinigameFactory);
        }

        // 停止当前实例上一路（不影响其他实例），并重置 stopped 标志以允许本次新 play
        this.stop();
        this.$stopped = false;

        const useSimd = this.$detectSimd();
        let wasmFile: string;
        if (DEBUG) {
            wasmFile = useSimd
                ? 'libs/nbswasm/nbs_wechat_simd.wasm'
                : 'libs/nbswasm/nbs_wechat.wasm';
        } else if (MINIGAME) {
            wasmFile = useSimd
                ? getWasmPath_('nbs_wechat_simd')
                : getWasmPath_('nbs_wechat');
            wasmFile = "vxvideonbs/" + wasmFile.split("/").pop();
        } else {
            wasmFile = useSimd
                ? getWasmPath_('nbs_wechat_simd')
                : getWasmPath_('nbs_wechat');
        }

        Logger.log('[VxNBSPlayer] play nbsPath=' + nbsPath + ' useSimd=' + useSimd);
        this.$nbsPath = nbsPath;

        // NBS 播放引用计数，供 Hubble 上报当前是否有视频在播
        if ((window as any)["__nbs_playing"] == null) {
            (window as any)["__nbs_playing"] = 0;
        }

        // 小游戏：wasm 走包内路径，由引擎 instantiateWasm hook 直接加载，不需要提前下载
        // H5：wasm 走网络下载，传 ArrayBuffer 给引擎
        const loadPromise: Promise<ArrayBuffer[]> = MINIGAME
            ? this.$loadBin(nbsPath).then((nbsBuffer: ArrayBuffer) => [null, nbsBuffer])
            : Promise.all([this.$loadBin(wasmFile), this.$loadBin(nbsPath)]);

        loadPromise
            .then((results: ArrayBuffer[]) => {
                // stop() 在下载期间被调用，丢弃本次结果，不创建 decoder
                if (this.$stopped) {
                    Logger.log('[VxNBSPlayer] download complete but instance stopped, discard');
                    return;
                }
                const wasmBinary = results[0];
                const nbsBuffer  = results[1];
                Logger.log('[VxNBSPlayer] resources downloaded'
                    + (wasmBinary ? ' wasm=' + wasmBinary.byteLength : ' wasm=<in-package path>')
                    + ' nbs=' + nbsBuffer.byteLength);

                try {
                    const constructStart = egret.getTimer();
                    this.$player = new NBSRuntime.NBSPlayer({
                        wasmBinary: wasmBinary,
                        useSimd:    useSimd,
                        wasmPath:   wasmFile,
                        nbsBuffer:  nbsBuffer,
                        loop:       loop,
                        withAlpha:  true,
                        frameDelay: frameDelay,
                        frameMod:   frameMod,
                        playMode:   playMode,
                        onReady: (w: number, h: number) => {
                            // fitContainer：以容器宽高显示，忽略视频原始分辨率（适合降分辨率后放缩还原）
                            const dispW = fitContainer && container.width  > 0 ? container.width  : w;
                            const dispH = fitContainer && container.height > 0 ? container.height : h;
                            this.$setupBitmap(container, dispW, dispH, childIndex);
                            Logger.log('[VxNBSPlayer] video ready ' + w + 'x' + h
                                + (fitContainer ? ' -> display ' + dispW + 'x' + dispH : ''));
                        },
                        onError: (msg: string) => {
                            Logger.error('[VxNBSPlayer] error: ' + msg);
                            uploadDump_('[VxNBSPlayer] onError: ' + msg, msg, 'VxNBSPlayer_onError', 'SCRIPT_ERROR');
                        },
                    });
                    const constructMs = egret.getTimer() - constructStart;
                    if (constructMs > VxVideoNBSPlayer.$constructMaxMs) {
                        VxVideoNBSPlayer.$constructMaxMs = constructMs;
                        (window as any)["__nbs_construct_max_ms"] = constructMs;
                    }
                    Logger.log('[VxNBSPlayer] NBSPlayer construct ' + constructMs + 'ms, max ' + VxVideoNBSPlayer.$constructMaxMs + 'ms');
                    // decoder 创建成功后重新加入注册表（stop() 可能在下载期间已将其移除）
                    // 再次检查 $stopped 防止极端竞态：
                    // 若 stop() 在 new NBSPlayer() 执行期间再次被调用，直接销毁并退出
                    if (this.$stopped) {
                        Logger.log('[VxNBSPlayer] decoder created but stop detected, dispose immediately');
                        this.$player.dispose();
                        this.$player = null;
                        return;
                    }
                    const reg = VxVideoNBSPlayer.$registry;
                    if (reg.indexOf(this) < 0) {
                        reg.push(this);
                    }
                    this.$player.play();
                    if (playMode === 0) {
                        this.$player.seekAll();
                    }
                    this.$doPendingOps();
                    (window as any)["__nbs_playing"]++;
                } catch (e) {
                    const msg = '[VxNBSPlayer] NBSPlayer construct/play error: ' + e;
                    Logger.error(msg);
                    uploadDump_(msg, msg, 'VxNBSPlayer_ConstructError', 'SCRIPT_ERROR');
                }
            })
            .catch((e: any) => {
                let msg = '[VxNBSPlayer] load failed: ' + nbsPath;
                if (e) {
                    if (typeof e === 'string') {
                        msg += ' reason:' + e;
                    } else if (e instanceof Error) {
                        msg += ' reason:' + (e.stack || e.message);
                    }
                }
                Logger.error(msg);
                uploadDump_(msg, msg, 'VxNBSPlayer_LoadFail:' + nbsPath, 'SCRIPT_ERROR');
            });
    }

    /** 停止播放并释放资源（只影响当前实例） */
    public stop(): void {
        // 标记已停止，防止异步 play() 的 .then() 在 stop 之后继续创建 decoder
        this.$stopped = true;
        if (this.$player) {
            this.$player.dispose();
            this.$player = null;
        }
        Logger.log('[VxNBSPlayer] stop: ' + this.$nbsPath);
        this.$nbsPath = '';
        this.$destroyBitmap();
        // NBS 播放引用计数 -1
        if ((window as any)["__nbs_playing"] != null && (window as any)["__nbs_playing"] > 0) {
            (window as any)["__nbs_playing"]--;
        }
        // 从注册表移除，防止 stopAll 重复调用
        const reg = VxVideoNBSPlayer.$registry;
        const idx = reg.indexOf(this);
        if (idx >= 0) reg.splice(idx, 1);
        // 若是单例，重置单例引用
        if (VxVideoNBSPlayer.$inst === this) {
            VxVideoNBSPlayer.$inst = null;
        }
    }

    /** 当前播放状态 */
    public get state(): string {
        return this.$player ? this.$player.state : 'idle';
    }

    /** 获取底层 NBSPlayer 实例（供脚本层调用播放控制等高级接口） */
    public get player(): any {
        return this.$player;
    }

    /** 设置播放速度（$player 未就绪时缓存，等 play() 加载完后自动应用） */
    public setTimeSpeed(speed: number): void {
        this.$ensureReady(() => { this.$player.setTimeSpeed(speed); });
    }

    /** 跳转到指定 clip（$player 未就绪时缓存，就绪后执行） */
    public seekClip(clipName: string): boolean {
        return this.$ensureReady(() => this.$player.seekClip(clipName)) ?? false;
    }

    /** 检测当前 clip 播完时自动跳转到目标 clip，返回是否已触发跳转（每帧反复调用不可走 $ensureReady，避免 pendingOps 堆积） */
    public checkEndAndSeekClip(clipName: string): boolean {
        if (!this.$player) return false;
        return this.$player.checkEndAndSeekClip(clipName);
    }

    /** 预加载 clip 数据（$player 未就绪时缓存） */
    public warmUp(clipName?: string): void {
        this.$ensureReady(() => { this.$player.warmUp(clipName); });
    }

    /** 获取视频 Bitmap */
    public get bitmap(): egret.Bitmap {
        return this.$bitmap;
    }

    /** 隐藏/显示视频 */
    public setVisible(visible: boolean): void {
        if (this.$bitmap) {
            this.$bitmap.visible = visible;
        }
    }

    // ── 私有方法 ──────────────────────────────────────────

    private $loadBin(path: string): Promise<ArrayBuffer> {
        return new Promise((resolve, reject) => {
            getResByPath_(path, (data: ArrayBuffer) => {
                if (!data || data.byteLength === 0) {
                    reject(new Error('[VxNBSPlayer] download failed: ' + path));
                    return;
                }
                Logger.log('[VxNBSPlayer] downloaded: ' + path + ' size=' + data.byteLength);
                resolve(data);
            }, this, RES.ResourceItem.TYPE_BIN);
        });
    }

    private $detectSimd(): boolean {
        // 抖音小游戏真机不支持 SIMD（官方限制），强制关闭。
        // 注意：抖音真机宿主可能同时暴露标准 WebAssembly 全局（底层 JS 引擎支持 SIMD），
        // 导致 validate() 返回 true，但抖音沙箱层运行 SIMD wasm 会崩溃/解码异常（绿屏）。
        // 因此必须在 validate() 调用之前先判断抖音平台。
        if (preload_utils_platform.isMiniGameDouyin()) {
            Logger.log('[VxNBSPlayer] Douyin mini-game, force SIMD off');
            return false;
        }
        try {
            // 用 getWasmApi() 兼容微信小游戏（WXWebAssembly）和标准浏览器（WebAssembly）
            const wasm = VxVideoNBSPlayer.getWasmApi();
            if (!wasm) return false;
            return wasm.validate(new Uint8Array([
                0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123,
                3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11
            ]));
        } catch (_e) {
            return false;
        }
    }

    private $setupBitmap(
        container: egret.DisplayObjectContainer,
        videoW: number, videoH: number,
        childIndex: number
    ): void {
        this.$destroyBitmap();

        const bitmapData: egret.BitmapData = this.$player.bitmapData;
        if (!bitmapData) {
            const msg = '[VxNBSPlayer] NBSPlayer.bitmapData is null';
            Logger.error(msg);
            uploadDump_(msg, msg, 'VxNBSPlayer_BitmapDataNull', 'SCRIPT_ERROR');
            return;
        }

        this.$texture = new egret.Texture();
        this.$texture._setBitmapData(bitmapData);

        this.$bitmap              = new egret.Bitmap();
        this.$bitmap.texture      = this.$texture;
        this.$bitmap.width        = videoW;
        this.$bitmap.height       = videoH;
        // 禁用触摸命中检测：视频 Bitmap 不需要交互，禁用后省去 Egret 每帧的像素级命中检测开销
        this.$bitmap.touchEnabled = false;
        // 关闭平滑过滤：视频以原始分辨率渲染时 NEAREST 采样，质量与性能均优于 LINEAR
        // 若业务层有缩放需求，可在获取 bitmap 后重新设为 true
        this.$bitmap.smoothing    = false;
        // 默认居中：视频宽高可能小于容器，居中显示在容器中心
        this.$bitmap.x = Math.max(0, (container.width  - videoW) / 2);
        this.$bitmap.y = Math.max(0, (container.height - videoH) / 2);

        const safeIndex = Math.min(childIndex, container.numChildren);
        container.addChildAt(this.$bitmap, safeIndex);
        Logger.log('[VxNBSPlayer] bitmap added to container ' + videoW + 'x' + videoH
            + ' centered(' + this.$bitmap.x + ',' + this.$bitmap.y + ')');
    }

    private $destroyBitmap(): void {
        if (this.$bitmap) {
            if (this.$bitmap.parent) {
                this.$bitmap.parent.removeChild(this.$bitmap);
            }
            this.$bitmap = null;
        }
        if (this.$texture) {
            this.$texture.dispose();
            this.$texture = null;
        }
    }
}
