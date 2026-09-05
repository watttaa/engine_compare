/**
 * 实时语音SDK - 数据声明
 */
import { AudioSdkConf } from "lib/audioSdk/conf/AudioSdkConf";

export namespace AudioSdkDefine {

    /**
     * 实时语音 Hubble 上报事件枚举（SDK 概念，统一入口）
     * AudioSdkMgr（底层）与 ChatAudioMgr（业务层）均复用本枚举作为上报 event 字段，
     * 禁止另立平行枚举。字符串值即 Hubble 侧观测到的 event 名。
     */
    export const enum VoiceLogEvent {
        /** 业务层：发出加入语音请求（C_REQ_JOIN_CCMINI_STREAM） */
        JOIN_REQ = "join_req",
        /** 业务层：加入被版本过低拦截 */
        JOIN_BLOCKED_VERSION = "join_blocked_version",
        /** 业务层：加入被低端机型拦截 */
        JOIN_BLOCKED_LOW_LEVEL = "join_blocked_low_level",
        /** 业务层：引擎未就绪，join 请求缓存等待 */
        JOIN_ENGINE_NOT_READY = "join_engine_not_ready",
        /** 业务层：用户切房 */
        SWITCH_CHANNEL = "switch_channel",
        /** 业务层：离开语音 */
        LEAVE = "leave",
        /** 业务层：离开所有语音 */
        LEAVE_ALL = "leave_all",
        /** 业务层：切换麦克风开关 */
        MIC_TOGGLE = "mic_toggle",
        /** 业务层：静音/取消静音其他玩家 */
        MUTE_OTHER = "mute_other",
        /** 业务层：邀请玩家加入语音 */
        INVITE = "invite",
        /** 业务层：邀请被 Gate 拦截（reason 携带具体 Gate） */
        INVITE_BLOCKED = "invite_blocked",
        /** 业务层：收到邀请被 Gate 拦截（reason 携带具体 Gate） */
        INVITED_BLOCKED = "invited_blocked",
        /** 业务层：致命重试（retry 携带当前计数） */
        FATAL_RETRY = "fatal_retry",
        /** 业务层：致命重试 3 次耗尽 */
        FATAL_RETRY_EXHAUSTED = "fatal_retry_exhausted",
        /** 业务层：重连提示（D 组） */
        RECONNECT_PROMPT = "reconnect_prompt",
        /** 业务层：静默忽略（C 组） */
        SILENT_IGNORE = "silent_ignore",
        /** 业务层：被踢离队自动退出语音 */
        TEAM_KICKED_LEAVE = "team_kicked_leave",
        /** 业务层：服务端关闭语音功能（强制清理） */
        VOICE_ENABLE_DISABLED = "voice_enable_disabled",
        /** 业务层：官方禁言 stopCapture */
        OFFICIAL_MUTE_APPLIED = "official_mute_applied",
        /** 业务层：麦克风恢复可用 */
        CAPTURE_RECOVER = "capture_recover",
        /** 业务层：开麦被中断 */
        CAPTURE_INTERRUPTED = "capture_interrupted",

        // ======== SDK 层 ========

        /** SDK 层：引擎初始化（reason 携带阶段标识） */
        ENGINE_INIT = "engine_init",
        /** SDK 层：引擎关闭 */
        ENGINE_CLOSE = "engine_close",
        /** SDK 层：引擎初始化/启动失败（result 携带 -202/-204） */
        ENGINE_STATE_FAIL = "engine_state_fail",
        /** SDK 层：引擎状态变更（非 fail 类，result 携带具体状态码） */
        ENGINE_STATE_OTHER = "engine_state_other",
        /** SDK 层：SDK 调用错误/异常 */
        SDK_ERROR = "sdk_error",
        /** SDK 层：createSession */
        SESSION_CREATE = "session_create",
        /** SDK 层：createSession 失败 */
        SESSION_CREATE_FAIL = "session_create_fail",
        /** SDK 层：loginSession */
        SESSION_LOGIN = "session_login",
        /** SDK 层：loginSession 失败 */
        SESSION_LOGIN_FAIL = "session_login_fail",
        /** SDK 层：startCapture 下发 */
        CAPTURE_START = "capture_start",
        /** SDK 层：startCapture 失败 */
        CAPTURE_START_FAIL = "capture_start_fail",
        /** SDK 层：startCapture 跳过（官方禁言） */
        CAPTURE_START_SKIP = "capture_start_skip",
        /** SDK 层：采集失败（result 携带 -1001~-1099） */
        CAPTURE_FAIL = "capture_fail",
        /** SDK 层：connect-change 稳定态（result 携带 -100~-113） */
        CONNECT_RESULT = "connect_result",
        /** SDK 层：麦克风权限被拒绝 */
        PERMISSION_DENIED = "permission_denied",
    }

    /**
     * S_CCMINI_VOICE_ENABLE 协议载荷与服务端语音开关状态
     * 同时作为 AudioSdkEvent.VOICE_ENABLE_CHANGE 事件 data 的结构
     */
    export interface VoiceEnableData {
        /** 语音功能总开关：true=开启，false=服务端关闭 */
        enable: boolean;
        /**
         * 官方禁言解禁时间戳（秒）
         * 宏定义：0=未禁言，-1=永久禁言，>0=解禁时间戳（ServerTimer 对齐）
         * 与 STeamMemberVo.voice_unlock_ts 是同一概念，但作用域为全局开关 vs 单个成员
         */
        unlock_ts: number;
    }

    /**
     * GetJsonData 轮询输出参数（SDK 2.2.5 CCMiniFacade 统一轮询模型）
     * 业务侧传入空对象，SDK 在 ret>0 时写回 json 字段
     */
    export interface GetJsonDataOut {
        /** 事件 JSON 字符串，仅在返回值 ret>0 时有内容，业务侧 JSON.parse 后按 type 分发 */
        json?: string;
        /** 业务上下文回传，native backend 透传请求中的 context；缺省 0 */
        context?: number;
        /** 出错描述，仅用于日志，不参与业务判断 */
        error?: string;
    }

    /**
     * CC AudioEngine SDK实例接口
     * 对应 libs/ccsdk/ccmini-facade.es5.js 导出的 CCMiniFacade 类
     * SDK 2.2.5 起统一为 CCMiniFacade，Wasm 与 native-sdk 双后端共用同一套调用契约
     */
    export interface AudioEngineInstance {
        /**
         * 启动引擎
         * - wasm 后端：触发 WASM 异步加载，返回 0；就绪以 onWasmLoaded 回调为准
         * - native 后端：同步转发 StartCCMini 到 nativeBackend，返回 native SDK 的 ret（0 成功）
         */
        StartCCMini(): number;
        /** 关闭引擎 */
        CloseCCMini(): void;
        /**
         * SDK统一控制方法
         * @param method 方法名（见 AudioSdkConf.SDK_METHOD）
         * @param params 参数对象
         * @param context 业务自定义上下文（可选，native backend 透传）
         * @returns 数值型错误码或结果对象，取决于具体方法
         */
        ControlMini(method: string, params: Record<string, unknown>, context?: number): number | Record<string, unknown>;
        /**
         * 轮询读取一条事件（SDK 2.2.5 CCMiniFacade 统一轮询模型）
         * @param out 输出参数对象，ret>0 时 SDK 把事件 JSON 写到 out.json
         * @returns ret>0：事件 JSON 长度；ret==0：当前无事件；ret<0：未启动或失败
         */
        GetJsonData(out: GetJsonDataOut): number;
    }

    /**
     * native bridge 同步控制的完整响应（ControlMiniFull 返回值）
     * 对齐 SDK 文档：native backend 下可读取 native bridge 完整同步响应 { ret, json, context, error }
     */
    export interface ControlMiniFullResult {
        /** 0 成功 / 负数错误码 */
        ret: number;
        /** native bridge 附带的同步 JSON 字符串，无内容时为空串 */
        json: string;
        /** 业务上下文回传，缺省 0 */
        context: number;
        /** 出错描述，仅用于日志，无错误时为空串 */
        error: string;
    }

    /**
     * native-sdk backend 适配对象（业务在 H5 侧提供给 CCMiniFacade）
     * CCMiniFacade 在 backend='native-sdk' 时把 5 个调用直接透传给本对象，
     * 本对象再经 window.ccminiNativeSdk.postMessage(jsonStr) 同步桥接到 native SDK
     * 所有方法均为同步返回
     */
    export interface NativeBackend {
        /** 启动 native SDK，返回 0 成功 / 负数错误码 */
        StartCCMini(): number;
        /** 透传控制命令；多数方法返回 native SDK 的 ret（0 成功 / 负数错误码），get-speaking-list 返回 Map<eid, energy> */
        ControlMini(method: string, params: Record<string, unknown>, context?: number): number | Map<number, number>;
        /**
         * 透传控制命令并返回完整同步响应 { ret, json, context, error }（SDK 文档新增）
         * 内部仍发 action='ControlMini'，仅返回结构比 ControlMini 更完整，便于读取 native 同步附带信息或调试
         */
        ControlMiniFull(method: string, params: Record<string, unknown>, context?: number): ControlMiniFullResult;
        /** 轮询一条事件，写回 out.json/context/error，返回 ret（>0 长度 / 0 无事件 / <0 失败） */
        GetJsonData(out: GetJsonDataOut): number;
        /** 关闭 native SDK，返回 0 成功 / 负数错误码 */
        CloseCCMini(): number;
    }

    /**
     * CC AudioEngine构造函数类型（= CCMiniFacade 类）
     * H5/App: window['AudioEngine']（facade bundle UMD 入口即 CCMiniFacade 本身）
     */
    export interface AudioEngineConstructor {
        new(options: EngineOptions): AudioEngineInstance;
        /** 静态常量：Wasm 后端标识，SDK 侧契约值固定为 'js'（属性名沿用 SDK 的 BACKEND_JS，不可改） */
        BACKEND_JS?: string;
        /** 静态常量：native SDK 后端标识 'native-sdk' */
        BACKEND_NATIVE?: string;
    }

    /** SDK引擎构造参数 */
    export interface EngineOptions {
        /**
         * 后端类型（SDK 2.2.5 CCMiniFacade 新增）
         * - 不传 / 'js'：Wasm 后端（浏览器 H5、小游戏、未集成 native SDK 的 App；命名用 WASM，SDK 字符串仍为 'js'）
         * - 'native-sdk'：native SDK 后端（已集成 CCMini native SDK 的 iOS/Android App）
         */
        backend?: string;
        /**
         * Wasm backend 必填（SDK 2026-06-16 轻量 facade 起）：完整 Wasm 引擎构造器
         * 轻量 facade 不再内置引擎，backend='js'（Wasm）时由 facade 用本构造器实例化内部 AudioEngine；
         * native backend 不需要
         */
        AudioEngineClass?: AudioEngineConstructor | null;
        /**
         * native-sdk backend 必填：实现 4 方法的适配对象
         * backend='native-sdk' 时 CCMiniFacade 不实例化内部 AudioEngine，全部调用透传给本对象
         */
        nativeBackend?: NativeBackend;
        /** WASM文件路径（native backend 下被忽略） */
        wasmPath?: string;
        /** H5平台AudioWorklet处理器URL，小游戏/native backend 不需要 */
        workletProcessorUrl?: string;
        /** WASM加载成功回调（native backend 下不触发） */
        onWasmLoaded?: () => void;
        /** 是否开启调试日志 */
        debugLog?: boolean;
        /**
         * H5 平台请求模式，小游戏/native backend 不需要
         * direct：只直连，不回退代理
         * auto：先直连，失败后回退代理
         * proxy：只走代理
         */
        h5RequestMode?: string;
        /**
         * H5 Native WebView 音频桥开关（仅 wasm backend 下 H5 WebView 宿主生效，普通浏览器/小游戏/native backend 忽略）
         * - auto：默认。SDK 自动探测 native handler；探测不到则静默 noop，不影响主流程
         * - always：无论是否探测到 handler 都派发；适合 100% 确认 native 已对接的场景
         * - off：禁用桥派发；适合宿主明确不接收该桥的场景
         */
        nativeAudioBridge?: "auto" | "always" | "off";
        /**
         * H5 Native WebView 音频桥 handler 名称（仅 wasm backend 下 H5 WebView 宿主生效）
         * 与 iOS WKUserContentController.addScriptMessageHandler / Android addJavascriptInterface
         * 注册的名称对齐；默认 'ccminiAudioRecovery'
         */
        audioBridgeHandlerName?: string;
    }

    /** CC SDK join_stream返回的原始数据 */
    export interface CcminiSdkParams {
        /** 语音流eid */
        eid: number;
        /** 登录信息JSON字符串，包含stream_name/account/uid/game等 */
        info: string;
        /** 语音节点地址列表 */
        nodes: string[];
        /** 签名 */
        sign: string;
        /** 语音流名称 */
        stream_name: string;
        /** 流ID */
        streamid: string;
        /** 时间戳 */
        ts: string;
    }

    /** S_CCMINI_JOIN_VOICE_RESULT下行数据 */
    export interface JoinVoiceResultData {
        /** 频道类型 */
        channel_type: AudioSdkConf.ChannelType;
        /** CC SDK参数，客户端凭此加入语音流 */
        ccmini: CcminiSdkParams;
    }

    /** S_CCMINI_VOICE_INVITE下行数据 */
    export interface JoinVoiceInviteData {
        channel_type: number;
        inviter_uid: number;
        inviter_name: string;
        streamid: string;
    }

}
