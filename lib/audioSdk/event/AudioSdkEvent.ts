/**
 * 实时语音SDK - 事件系统
 * AudioSdkEventBus: 独立事件总线（单例）
 * AudioSdkEvent: 事件类型定义与事件对象
 */
export class AudioSdkEventBus extends SingletonClassEx {

    /** 软重置：移除所有监听 */
    public clear(): void {
        // egret.EventDispatcher 无 removeAllEventListeners，SingletonClassEx 基类会处理
    }

    /** 硬销毁 */
    public destroy(): void {
    }
}

export class AudioSdkEvent extends egret.Event {

    public constructor(type: string, data?: Record<string, unknown>) {
        super(type, false, false, data);
    }

    /** 引擎WASM加载完成，就绪。无附加数据 */
    public static readonly ENGINE_READY = "AUDIO_SDK_ENGINE_READY";

    /** Session状态变更。data: { sessionId: AudioSdkConf.SessionID, state: AudioSdkConf.SessionState } */
    public static readonly SESSION_STATE_CHANGE = "AUDIO_SDK_SESSION_STATE_CHANGE";

    /** SDK调用错误。data: { method?: string, errorCode?: AudioSdkConf.SdkErrorCode, error?: any } */
    public static readonly ERROR = "AUDIO_SDK_ERROR";

    /** 服务端语音功能总开关变更。data: AudioSdkDefine.VoiceEnableData = { enable: boolean, unlock_ts: number } */
    public static readonly VOICE_ENABLE_CHANGE = "AUDIO_SDK_VOICE_ENABLE_CHANGE";

    /** SDK 连接状态变更（成功/断开/重连）。data: { sessionId: SessionID, result: ConnectResult, reconnecting: boolean } */
    public static readonly CONNECT_CHANGE = "AUDIO_SDK_CONNECT_CHANGE";

    /**
     * 收到队友发来的语音邀请
     * data: AudioSdkDefine.JoinVoiceInviteData
     * { channel_type, inviter_uid, inviter_name, streamid }
     */
    public static readonly INVITE_RECEIVED = "AUDIO_SDK_INVITE_RECEIVED";

    /**
     * start-capture 异步执行结果（仅 Wasm backend，来自 SDK JSON_CONTROL 回调）
     * native backend 不派发本事件（native start-capture 结果码语义不同，业务层不消费）
     * data: { sessionId: AudioSdkConf.SessionID, code: AudioSdkConf.WasmCaptureResult }
     * code===0 为开麦成功，其余为各类失败码（详见 WasmCaptureResult 枚举）
     */
    public static readonly WASM_CAPTURE_RESULT = "AUDIO_SDK_WASM_CAPTURE_RESULT";

    /**
     * SDK ENGINE_STATE 事件透传（来自 SDK GetJsonData({event:'ENGINE_STATE'}) 回调）
     * data: { result: AudioSdkConf.SdkEngineStateCode, code: number }
     * 描述本地引擎生命周期 + 音频链路健康状态，与 CONNECT_CHANGE 正交
     */
    public static readonly SDK_ENGINE_STATE = "AUDIO_SDK_ENGINE_STATE";

    /**
     * native（Android）麦克风权限被拒绝（BUG5）：进房触发 StartCCMini 时 native 请求 RECORD_AUDIO 被拒。
     * 业务层据此弹提示，修复"拒权进房无反馈"。无附加数据。
     */
    public static readonly PERMISSION_DENIED = "AUDIO_SDK_PERMISSION_DENIED";
}
