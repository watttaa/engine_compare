/**
 * 实时语音SDK - 配置枚举
 * 所有枚举使用 const enum 避免运行时对象
 */
export namespace AudioSdkConf {

    /** 语音频道类型，对齐服务端 CC_CHANNEL_XX 常量 */
    export const enum ChannelType {
        /** 固定队语音频道（对应 TeamType.JIEBAN） */
        JIEBAN_TEAM = 1,
        /** 玩法队语音频道（对应 TeamType.PLAY） */
        PLAY_TEAM = 2,
        /** 玩法队语音频道（对应 TeamType.COMPETITION_TEAM */
        COMPETITION_TEAM = 3,
    }

    /** SDK Session ID（0~7），传给 SDK create-session / login-session 等方法 */
    export const enum SessionID {
        /** 自定义（预留） */
        CUSTOM_0 = 0,
        /** 固定队语音频道（对应 TeamType.JIEBAN） */
        JIEBAN_TEAM = 1,
        /** 玩法队语音频道（对应 TeamType.PLAY） */
        PLAY_TEAM = 2,
        /** 自定义（预留） */
        CUSTOM_3 = 3,
        /** 自定义（预留） */
        CUSTOM_4 = 4,
        /** 自定义（预留） */
        CUSTOM_5 = 5,
        /** 自定义（预留） */
        CUSTOM_6 = 6,
        /** 自定义（预留） */
        CUSTOM_7 = 7,
    }

    /** Session状态机 */
    export const enum SessionState {
        /** 空闲，未创建 */
        IDLE = 0,
        /** 已创建，未登录 */
        CREATED = 1,
        /** 登录中 */
        LOGGING = 2,
        /** 已连接（已登录，未采集） */
        CONNECTED = 3,
        /** 正在说话（已登录，已采集） */
        SPEAKING = 4,
    }

    /** 引擎状态 */
    export const enum EngineState {
        /** 未初始化（含加载中、启动中、已关闭等所有未就绪态） */
        NONE = 0,
        /** 引擎就绪 */
        READY = 1,
    }

    /**
     * CONNECT_CHANGE 事件回调中的连接结果码
     * 由 SDK GetJsonData({event:'CONNECT_CHANGE'}, cb) 返回
     * 全量枚举对齐 SDK 文档（ccmini-voice-sdk.md §CONNECT_CHANGE result）
     */
    export const enum ConnectResult {
        /** 连接并登录成功 */
        SUCCESS = -100,
        /** 连接服务器失败，SDK 内部自动重试 */
        SERVER_FAIL = -101,
        /** 登录失败 */
        STREAM_FAIL = -102,
        /** 签名错误 */
        SIGN_ERROR = -103,
        /** 签名超时 */
        SIGN_TIMEOUT = -104,
        /** EID 重复 */
        EID_DUPLICATE = -105,
        /** EID 超时 */
        EID_TIMEOUT = -106,
        /** 正常 / 主动断开 */
        ACTIVE_CLOSE = -107,
        /** 异常断线，SDK 内部自动重连 */
        PASSIVE_CLOSE = -108,
        /** Stream 错误 */
        STREAM_ERROR = -109,
        /** 网络异常，请稍后重试 */
        RETRY_LATER = -110,
        /** 当前服务器/地址已满，SDK 内部尝试其他地址 */
        SERVER_FULL = -111,
        /** 所有服务器/地址已满，不再重试（终态失败） */
        SERVER_ALL_FULL = -112,
        /** EID 封禁 */
        EID_BAN = -113,
        /** 连接异常（兼容保留） */
        EXCEPTION = -500,
    }

    /**
     * start-capture 异步执行结果码（仅 Wasm backend 使用）
     * 由 SDK GetJsonData({event:'JSON_CONTROL'}, cb) 回调中 type==='start-capture' 的 result 字段返回
     * 与同步 ControlMini 返回的 SdkErrorCode 不同：SdkErrorCode 是参数校验类错误，
     * WasmCaptureResult 是底层录音链路启动结果（含权限/设备/超时等异步条件）
     * 注意：native backend 的 start-capture 结果码与本枚举不同，native 下不消费此枚举
     */
    export const enum WasmCaptureResult {
        /** 开麦成功 */
        SUCCESS = 0,
        /** HTTPS、安全域名、Permissions Policy 或宿主策略限制 */
        ERR_HTTPS = -1001,
        /** 麦克风权限被拒绝或未授权 */
        ERR_PERMISSION = -1002,
        /** 未发现可用麦克风、麦克风被占用或不可读取 */
        ERR_NO_DEVICE = -1003,
        /** 当前环境不支持麦克风采集 */
        ERR_UNSUPPORT = -1004,
        /** 底层录音链路启动失败，详见 SDK 日志 */
        ERR_LINK_FAIL = -1005,
        /** 等待底层录音启动超时 */
        ERR_TIMEOUT = -1006,
        /** 开麦流程被后续 stop/pause/destroy 等操作打断 */
        ERR_INTERRUPTED = -1007,
        /** 未知采集启动失败，详见 SDK 日志 */
        ERR_UNKNOWN = -1099,
    }

    /**
     * SDK ENGINE_STATE 事件回调中的引擎状态码
     * 由 SDK GetJsonData({event:'ENGINE_STATE'}, cb) 返回，data = { type:'engine-state', result: number, code: number }
     * 描述本地引擎生命周期 + 音频链路（采集/播放）健康状态，与房间连接（CONNECT_CHANGE）正交
     * 注意：与本 namespace 下的 EngineState（本地维护的引擎生命周期枚举）不同，
     *       SdkEngineStateCode 是 SDK 透出的事件码（来自 SDK 文档原始负数码值）
     */
    export const enum SdkEngineStateCode {
        /** 引擎未初始化时调用操作接口 */
        NOT_READY = -200,
        /** 引擎初始化成功（Wasm/小游戏 StartCCMini 启动成功以此为准） */
        INIT_SUCCESS = -201,
        /** 引擎初始化失败 */
        INIT_FAIL = -202,
        /** 兼容保留：Wasm/小游戏 StartCCMini 不单独通知该码 */
        START_PLAY_SUCCESS = -203,
        /** 引擎启动失败 */
        START_FAIL = -204,
        /** 检测到播放线程停止 */
        STOP_PLAY = -205,
        /** 检测到采集线程停止 */
        STOP_CAPTURE = -206,
        /** 主动停止引擎 */
        STOP = -207,
        /** 播放线程从异常恢复正常 */
        RESUME_PLAY = -208,
        /** 采集线程从异常恢复正常 */
        RESUME_CAPTURE = -209,
        /** 引擎已初始化但未启动时调用操作接口 */
        NOT_STARTED = -210,
        /** 引擎启动成功且需要采集 */
        START_PLAY_AND_RECORD_SUCCESS = -211,
        /** 停止采集完成 */
        STOP_CAPTURE_FINISH = -212,
        /** 采集状态异常 */
        CAPTURE_ERROR = -213,
        /** 开启采集完成 */
        START_CAPTURE_FINISH = -214,
    }

    /** SDK ControlMini 返回的错误码 */
    export const enum SdkErrorCode {
        /** 成功 */
        SUCCESS = 0,
        /** session-id 超出范围（0~7） */
        SESSION_ID_LIMIT = -1,
        /** 该 session-id 已存在 */
        SESSION_ID_EXIST = -2,
        /** 会话池已满 */
        SESSION_FULL = -3,
        /** 该 session-id 不存在 */
        SESSION_ID_NOT_EXIST = -4,
        /** 登录信息中的节点地址无效 */
        SESSION_INVALID_ADDR = -5,
        /** 登录信息 JSON 解析失败 */
        INVALID_LOGIN_INFO = -7,
    }

    /**
     * H5 平台请求模式
     * direct：只直连，不回退代理（本项目选用）
     * auto：先直连真实 HTTPS 接口，失败后再回退代理
     * proxy：只走代理，不尝试直连
     */
    export const enum H5RequestMode {
        AUTO = "auto",
        DIRECT = "direct",
        PROXY = "proxy",
    }

    /** 降噪级别 */
    export const enum NsLevel {
        /** 最低 */
        LOW = 0,
        /** 中等 */
        MEDIUM = 1,
        /** 高 */
        HIGH = 2,
        /** 最高 */
        MAX = 3,
    }

    /**
     * SDK ControlMini 方法名常量，避免字符串硬编码
     * 完整对照 CC实时语音SDK接入文档 API 列表
     */
    export const SDK_METHOD = {
        // 会话管理
        CREATE_SESSION: 'create-session',
        DESTROY_SESSION: 'destroy-session',
        LOGIN_SESSION: 'login-session',
        LOGOUT_SESSION: 'logout-session',

        // 采集控制
        START_CAPTURE: 'start-capture',
        STOP_CAPTURE: 'stop-capture',
        MUTE_CAPTURE: 'mute-capture',
        SET_CAPTURE_VOL: 'set-capture-vol',

        // 播放控制
        MUTE_PLAYBACK: 'mute-playback',
        SET_PLAYBACK_VOL: 'set-playback-vol',
        ONLY_LISTEN_EIDS: 'only-listen-eids',

        // 音频处理（DSP）
        SET_NS_LEVEL: 'set-ns-level',
        ENABLE_AI_NS: 'enable-ai-ns',
        ENABLE_AEC3: 'enable-aec3',
        FORCE_NO_VAD: 'force-no-vad',
        ENABLE_DB_VAD: 'enable-db-vad',

        // 状态查询
        GET_SPEAKING_LIST: 'get-speaking-list',

        // 调试与测试
        TEST_MIC: 'test-mic',
        SET_LOG_CONFIG: 'set-log-config',

        // 前后台自动处理（SDK≥2.2.2）：初始化后下发一次 enable:1，
        // 由 SDK 接管 Android 切后台/息屏时的采集停止与回前台恢复
        AUTO_DEAL_HOME: 'auto-deal-home',
    };

    /**
     * CCMiniFacade 后端类型（SDK 2.2.5）
     * 实时语音两种模式：WASM（浏览器/小游戏/未集成 native SDK 的 App）、NATIVE（已集成 native SDK 的 App）
     * 注意：WASM 的字符串值固定为 "js"，与 ccmini-facade bundle 的 CCMiniFacade.BACKEND_JS 契约对齐，不可改动；
     *       命名上统一用 WASM，仅 SDK 侧仍沿用历史标识 "js"
     */
    export const enum Backend {
        /** WASM 后端：浏览器 H5、微信/抖音小游戏、未集成 native SDK 的 App（SDK 字符串契约固定为 "js"） */
        WASM = "js",
        /** native SDK 后端：已集成 CCMini native SDK 的 iOS/Android App */
        NATIVE = "native-sdk",
    }

    /** native backend 事件轮询间隔（毫秒），对齐 SDK demo release.html 的 200ms */
    export const EVENT_POLL_INTERVAL_MS = 200;

    /**
     * native StartCCMini 麦克风权限挂起返回码
     * 对齐安卓 CCMiniNativeSdkBridge.RET_PERMISSION_PENDING：缺 RECORD_AUDIO 权限时 native 自动拉起系统授权弹窗，
     * 同步返回该码表示"已发起授权、稍后内部重发 StartCCMini"，H5 须保持 STARTING 并等待 engine-state 就绪码，不可判失败
     */
    export const RET_PERMISSION_PENDING = -2;

    /**
     * native StartCCMini 引擎已启动复用返回码（引擎单次启动模型）
     * CC native 引擎为进程级、独立于 H5 的 JS 生命周期。当 H5 被整体重置（如断线重连失败重进游戏）
     * 而 native 引擎实际从未销毁仍在运行时，重复 StartCCMini 不会再抛出 engine-state INIT_SUCCESS(-201)。
     * 此时 native 桥（Android/iOS）检测到进程内引擎已启动，同步返回该码，H5 据此直接置 READY，
     * 不再干等永不到来的 -201。与 RET_PERMISSION_PENDING(-2)/SUCCESS(0)/-201 三者互不冲突。
     * 约定为正数 1（StartCCMini 冷启动成功为 0，故 >0 专用于"已启动复用"）。
     */
    export const RET_ENGINE_ALREADY_READY = 1;

    /** 单次轮询 tick 内最多连续取出的事件数，防止事件洪峰阻塞 */
    export const EVENT_POLL_BATCH = 20;

    /** SDK最大并发Session数量 */
    export const MAX_SESSION_COUNT = 8;
}