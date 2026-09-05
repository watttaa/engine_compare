/**
 * 实时语音SDK - 工具类
 * 平台判断、SDK加载、路径拼接、调试日志
 * 所有方法均为 public static，不持有状态
 */
import { AudioSdkDefine } from "lib/audioSdk/define/AudioSdkDefine";

/** SDK资源根路径 */
const SDK_BASE_PATH = "libs/ccsdk";
/** 日志前缀 */
const LOG_PREFIX = "[AudioSdk]";
/** 使用brotli压缩的wasm后缀 */
const WASM_SUFFIX = ".br";

export class AudioSdkUtil {

    // ======================== 平台判断 ========================

    /**
     * 是否为小游戏模式（微信小游戏 或 抖音小游戏）
     * 小游戏模式下使用 require() 加载SDK，否则使用 <script> 标签加载
     */
    public static isMiniGameMode(): boolean {
        // return preload_utils_platform.isWxGame() || preload_utils_platform.isDouyin();
        return MINIGAME;
    }

    /**
     * 是否为已集成 CCMini native SDK 的原生 App（iOS / Android）
     * 仅在此场景使用 native-sdk backend（采集/播放/路由交给 native SDK，不加载 wasm/worklet）；
     * 普通浏览器 H5 与小游戏仍走 Wasm backend
     */
    public static isNativeApp(): boolean {
        return preload_utils_platform.isIOSApp() || preload_utils_platform.isAndroidApp();
    }

    // ======================== 路径拼接 ========================

    /**
     * 获取WASM文件路径
     * H5: 相对URL路径
     * 小游戏: 本地路径
     */
    public static getWasmPath(): string {
        if (AudioSdkUtil.isMiniGameMode()) {
            return `s2_game_ccminisdk/${getWasmPath_("audioservice").split("/")[1]}`;
        } else if (DEBUG) {
            return `${SDK_BASE_PATH}/wasm/audioservice.wasm`;
        } else {
            return `${getCDNPath_()}${getWasmPath_('audioservice')}`;
        }
    }

    /**
     * 获取AudioWorklet处理器URL（仅H5模式需要）
     * 小游戏模式返回null
     */
    public static getWorkletUrl(): string | null {
        if (AudioSdkUtil.isMiniGameMode()) {
            return null;
        }
        if (DEBUG) {
            return `${SDK_BASE_PATH}/recorder-worklet-processor.js`;
        } else {
            return getCDNPath_() + getWasmPath_('recorder-worklet-processor');
        }
    }

    // ======================== SDK加载 ========================

    /**
     * 获取当前 window['AudioEngine'] 上的构造函数
     * SDK 2026-06-16 轻量 facade：initEngine 分两步注入——
     *  - Wasm backend：先注入完整引擎构造器（取出暂存），再被 facade 覆盖
     *  - 最终 window['AudioEngine'] 为 CCMiniFacade 构造器
     * @returns 构造函数，未加载返回null
     */
    public static getAudioEngineClass(): AudioSdkDefine.AudioEngineConstructor | null {
        // 主路径 / 小游戏分包均通过 window['AudioEngine'] 取构造函数（由 import('module_*') 注入）
        const AE = window['AudioEngine'] as AudioSdkDefine.AudioEngineConstructor | undefined;
        if (!AE) {
            AudioSdkUtil.error("AudioEngine constructor not found on window['AudioEngine'], SDK bundle not loaded");
            return null;
        }
        return AE;
    }

    // ======================== 调试日志 ========================

    /** 输出调试日志（仅DEV模式生效） */
    public static log(...args: any[]): void {
        if (DEV) {
            Logger.log(LOG_PREFIX, ...args);
        }
    }

    /** 输出警告日志（仅DEV模式生效） */
    public static warn(...args: any[]): void {
        if (DEV) {
            Logger.warn(LOG_PREFIX, ...args);
        }
    }

    /**
     * 输出错误日志（始终输出，错误不受DEV限制）
     * 注意：此方法仅做日志输出，不派发事件。SDK错误事件由AudioSdkMgr统一派发
     */
    public static error(...args: any[]): void {
        Logger.error(LOG_PREFIX, ...args);
    }
}