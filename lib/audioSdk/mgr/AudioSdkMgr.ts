/**
 * 实时语音SDK - 核心管理器
 * 引擎生命周期管理、多Session状态机、DSP控制
 */
import { AudioSdkConf } from "lib/audioSdk/conf/AudioSdkConf";
import { AudioSdkDefine } from "lib/audioSdk/define/AudioSdkDefine";
import { AudioSdkEvent, AudioSdkEventBus } from "lib/audioSdk/event/AudioSdkEvent";
import { AudioSdkCNet } from "lib/audioSdk/net/AudioSdkCNet";
import { AudioSdkUtil } from "lib/audioSdk/util/AudioSdkUtil";
import { createNativeBackend } from "lib/audioSdk/native/AudioSdkNativeBackend";

export class AudioSdkMgr extends SingletonClassEx {

    // ======================== 私有属性 ========================

    /** CC AudioEngine实例 */
    private engine: AudioSdkDefine.AudioEngineInstance = null;

    /** 引擎状态 */
    private engineState: AudioSdkConf.EngineState = AudioSdkConf.EngineState.NONE;

    /**
     * 麦克风权限挂起标志（仅 native backend）
     * StartCCMini 返回 -2(RET_PERMISSION_PENDING) 时置位：native 已拉起系统授权弹窗、引擎尚未真正启动，engineState 仍为 NONE。
     * 这是"等用户操作"的可重试态：用户再次点击进入时允许软重置后重走 StartCCMini。
     * 授权通过后由 engine-state 就绪码经 onEngineReady 清除；拒绝/失败/关闭时复位 false。
     */
    private permissionPending: boolean = false;

    /**
     * 当前引擎后端类型（SDK 2.2.5 CCMiniFacade 双后端）
     * native-sdk：原生 App（iOS/Android）；WASM：小游戏 / 普通 H5（SDK 字符串契约仍为 "js"）
     * 业务层不感知，仅 wrapper 内部用于 start-capture stereo / BGM 恢复边界判定
     */
    private backend: AudioSdkConf.Backend = AudioSdkConf.Backend.WASM;

    /**
     * 事件轮询定时器句柄（SDK 2.2.5 统一 GetJsonData(out) 轮询模型）
     * 由 startEventPolling 启动、stopEventPolling 停止，close/clear/destroy 必须清理防泄漏
     */
    private eventPollTimer: number = 0;

    /** Session状态Map，key=SessionID，value=SessionState */
    private sessions: Map<AudioSdkConf.SessionID, AudioSdkConf.SessionState> = new Map();

    /** 测试模式标志：开启后onJoinVoiceResult不走一条龙，将数据交给回调处理 */
    private testMode: boolean = false;

    /** 测试模式回调函数 */
    private testModeCallback: ((data: AudioSdkDefine.JoinVoiceResultData) => void) | null = null;

    /**
     * 服务端语音功能总开关，默认 true
     * 收到 S_CCMINI_VOICE_ENABLE(false) 后置为 false
     */
    private voiceEnabled: boolean = true;

    /**
     * 官方禁言解禁时间戳（秒），默认 0=未禁言
     * 收到 S_CCMINI_VOICE_ENABLE 后更新；宏定义：0=未禁言, -1=永久禁言, >0=解禁时间戳
     */
    private voiceUnlockTs: number = 0;

    /**
     * 最近一次 SDK CONNECT_CHANGE 缓存的 result 状态码
     * 用途：S_CCMINI_VOICE_ENABLE 重连场景下，根据该值决定向服务端补发 on_join 或 on_quit
     * 缓存策略：任意收到的 result 均缓存；判断逻辑只识别 100/107/108 三个稳定态
     */
    private lastConnectResult: AudioSdkConf.ConnectResult | null = null;

    /**
     * 与 lastConnectResult 配套缓存的 sessionId
     * 用途：onVoiceEnable 重连补发 on_join/on_quit 时，需带上归属 session 做校验（见 reportVoiceStreamByResult）
     */
    private lastConnectSessionId: AudioSdkConf.SessionID = AudioSdkConf.SessionID.CUSTOM_0;

    // ======================== SessionId映射 ========================

    /**
     * 根据频道类型获取对应的SDK Session ID
     * 当前阶段固定返回 ChannelType.TEAM，后续扩展多频道时按需映射
     * @param channelType 频道类型
     * @returns SDK session-id（0~7）
     */
    private getSessionId(channelType: AudioSdkConf.ChannelType): AudioSdkConf.SessionID {
        switch (channelType) {
            case AudioSdkConf.ChannelType.JIEBAN_TEAM:
                return AudioSdkConf.SessionID.JIEBAN_TEAM;
            case AudioSdkConf.ChannelType.PLAY_TEAM:
                return AudioSdkConf.SessionID.PLAY_TEAM;
            default:
                return null;
        }
    }

    /**
     * 根据 SDK Session ID 反向解析频道类型
     * 供业务层（ChatAudioMgr.onSdkConnectChange）在重试场景下还原 channelType
     * @param sessionId SDK session-id（0~7）
     * @returns ChannelType；未注册的预留 sessionId 返回 null
     */
    public getChannelTypeBySessionId(sessionId: AudioSdkConf.SessionID): AudioSdkConf.ChannelType | null {
        switch (sessionId) {
            case AudioSdkConf.SessionID.JIEBAN_TEAM:
                return AudioSdkConf.ChannelType.JIEBAN_TEAM;
            case AudioSdkConf.SessionID.PLAY_TEAM:
                return AudioSdkConf.ChannelType.PLAY_TEAM;
            default:
                return null;
        }
    }

    // ======================== 引擎生命周期 ========================

    /**
     * 初始化语音引擎
     * 根据平台选择 backend（小游戏/普通H5→wasm；原生App→native-sdk），创建 CCMiniFacade 并启动
     */
    public async initEngine(): Promise<void> {
        // 已就绪则直接返回，避免重复初始化
        if (this.engineState === AudioSdkConf.EngineState.READY) {
            AudioSdkUtil.warn("Engine already initialized, state:", this.engineState);
            this.reportVoiceLog(AudioSdkDefine.VoiceLogEvent.ENGINE_INIT, undefined, undefined, undefined, undefined, "already_ready");
            return;
        }
        // permission-pending 是"等用户授权"的可重试态：用户再次点击进入时软重置后重走 StartCCMini，
        // 避免授权弹窗被忽略/拒绝后引擎卡死导致后续点击全部失效
        if (this.permissionPending) {
            AudioSdkUtil.log("re-init while permission pending, soft reset & retry StartCCMini");
            this.reportVoiceLog(AudioSdkDefine.VoiceLogEvent.ENGINE_INIT, undefined, undefined, undefined, undefined, "permission_pending_retry");
            this.softResetEngine();
        }

        const isNativeApp = AudioSdkUtil.isNativeApp();
        const isMiniGame = AudioSdkUtil.isMiniGameMode();
        this.backend = isNativeApp ? AudioSdkConf.Backend.NATIVE : AudioSdkConf.Backend.WASM;
        AudioSdkUtil.log("Initializing engine, backend:", this.backend, "miniGame:", isMiniGame, "nativeApp:", isNativeApp);
        this.reportVoiceLog(AudioSdkDefine.VoiceLogEvent.ENGINE_INIT, undefined, undefined, undefined, undefined, "backend_selected");

        // 加载 SDK bundle，暴露到 window['AudioEngine']
        // SDK 2.2.5（2026-06-16 起）：ccmini-facade 改为轻量 facade，不再内置 WASM 引擎
        //  - WASM backend：先加载完整引擎包（module_ccminisdk），暂存其构造器，再加载 facade（module_ccminifacade），
        //    并在构造参数里显式传入 AudioEngineClass
        //  - native backend：只加载 facade（module_ccminifacade），由 nativeBackend 透传到 native 桥，无需完整引擎
        let jsAudioEngineClass: AudioSdkDefine.AudioEngineConstructor | null = null;
        try {
            if (this.backend === AudioSdkConf.Backend.WASM) {
                // 完整引擎包 UMD 同样导出到 window['AudioEngine']，须先暂存再被 facade 覆盖
                window["AudioEngine"] = (await import(/* webpackChunkName: "game_ccminisdk" */'module_ccminisdk')).default;
                jsAudioEngineClass = AudioSdkUtil.getAudioEngineClass();
                if (!jsAudioEngineClass) {
                    this.engineState = AudioSdkConf.EngineState.NONE;
                    AudioSdkUtil.error("Full AudioEngine class not available");
                    this.reportVoiceLog(AudioSdkDefine.VoiceLogEvent.ENGINE_INIT, undefined, undefined, undefined, undefined, "wasm_class_unavailable");
                    return;
                }
            }
            // 加载轻量 facade（覆盖 window['AudioEngine'] 为 CCMiniFacade 构造器）
            window["AudioEngine"] = (await import(/* webpackChunkName: "game_ccminisdk" */'module_ccminifacade')).default;
        } catch (e) {
            this.engineState = AudioSdkConf.EngineState.NONE;
            AudioSdkUtil.error("Failed to load SDK bundle", e);
            this.reportVoiceLog(AudioSdkDefine.VoiceLogEvent.ENGINE_INIT, undefined, undefined, undefined, undefined, "bundle_load_fail");
            return;
        }

        // 获取 CCMiniFacade 构造函数
        const AudioEngineClass = AudioSdkUtil.getAudioEngineClass();
        if (!AudioEngineClass) {
            this.engineState = AudioSdkConf.EngineState.NONE;
            AudioSdkUtil.error("CCMiniFacade class not available");
            this.reportVoiceLog(AudioSdkDefine.VoiceLogEvent.ENGINE_INIT, undefined, undefined, undefined, undefined, "facade_class_unavailable");
            return;
        }

        // 按 backend 组装构造参数
        const options: AudioSdkDefine.EngineOptions = { debugLog: false };
        if (this.backend === AudioSdkConf.Backend.NATIVE) {
            // native-sdk backend：采集/播放/路由交给 native SDK，不加载 wasm/worklet，注入同步桥适配对象
            options.backend = AudioSdkConf.Backend.NATIVE;
            options.nativeBackend = createNativeBackend();
        } else {
            // wasm backend（小游戏 / 普通 H5）：轻量 facade 需显式拿到完整引擎构造器
            options.backend = AudioSdkConf.Backend.WASM;
            options.AudioEngineClass = jsAudioEngineClass;
            options.wasmPath = AudioSdkUtil.getWasmPath();
            // 注意：WASM 加载完成 ≠ 引擎就绪。就绪以 engine-state INIT_SUCCESS 事件为唯一准绳，
            // 故此处仅记录加载完成，不在 onWasmLoaded 触发 onEngineReady（由 onSdkEngineState 统一驱动）。
            options.onWasmLoaded = () => {
                AudioSdkUtil.log("wasm loaded, waiting engine-state INIT_SUCCESS for ready");
            };
            // 普通 H5 需要 worklet / h5RequestMode / nativeAudioBridge，小游戏不需要
            if (!isMiniGame) {
                const workletUrl = AudioSdkUtil.getWorkletUrl();
                if (workletUrl) {
                    options.workletProcessorUrl = workletUrl;
                }
                options.h5RequestMode = AudioSdkConf.H5RequestMode.DIRECT;
                options.nativeAudioBridge = "auto";
                options.audioBridgeHandlerName = "ccminiAudioRecovery";
            }
        }

        try {
            this.engine = new AudioEngineClass(options);
            // 启动事件轮询循环（SDK 2.2.5 唯一事件出口是 GetJsonData(out) 轮询，须在 StartCCMini 前后启动避免遗漏首个 engine-state）
            this.startEventPolling();
            const ret = this.engine.StartCCMini();
            AudioSdkUtil.log("Engine StartCCMini called, backend:", this.backend, "ret:", ret);
            // native backend 启动结果分流（就绪信号统一以 engine-state INIT_SUCCESS 事件为准，不在此同步置就绪）：
            //  - ret === -2（RET_PERMISSION_PENDING）：缺麦克风权限，native 已自动拉起系统授权弹窗并将在授权后内部重发
            //    StartCCMini。此处不可判失败：保持 NONE、继续事件轮询，等待 engine-state INIT_SUCCESS（onSdkEngineState）
            //    驱动 onEngineReady，从而自动续跑被缓存的 join（修复"安卓首次进房需点两次"）。
            //  - ret 为 -2 以外的负数：真失败，走原路径（NONE + 停轮询）。
            //  - ret >= 0：StartCCMini 已发起，保持 NONE、继续事件轮询，等待 engine-state INIT_SUCCESS 再 onEngineReady。
            if (this.backend === AudioSdkConf.Backend.NATIVE) {
                if (ret === AudioSdkConf.RET_ENGINE_ALREADY_READY) {
                    // 引擎单次启动模型：native 引擎为进程级、独立于 H5 JS 生命周期。H5 被整体重置（断线重连失败重进）后
                    // engineState 归 NONE，但 native 引擎从未销毁仍存活，重复 StartCCMini 不会再抛 engine-state INIT_SUCCESS(-201)。
                    // native 桥检测到已启动并返回该码，此处直接就绪，避免干等永不到来的 -201 而卡死。
                    // 复用的引擎已是运行态（不再有 stop-engine 暂停路径），直接就绪即可，无需 reset-engine 恢复。
                    AudioSdkUtil.log("native engine already started (reuse), go ready directly");
                    this.reportVoiceLog(AudioSdkDefine.VoiceLogEvent.ENGINE_INIT, undefined, undefined, undefined, undefined, "native_already_ready");
                    this.onEngineReady();
                    return;
                }
                if (ret === AudioSdkConf.RET_PERMISSION_PENDING) {
                    this.permissionPending = true;
                    AudioSdkUtil.log("native StartCCMini permission pending, waiting for grant & engine-state INIT_SUCCESS");
                    this.reportVoiceLog(AudioSdkDefine.VoiceLogEvent.ENGINE_INIT, undefined, undefined, undefined, undefined, "native_permission_pending");
                    return;
                }
                if (typeof ret === "number" && ret < 0) {
                    this.engineState = AudioSdkConf.EngineState.NONE;
                    this.stopEventPolling();
                    AudioSdkUtil.error("native StartCCMini failed, ret:", ret);
                    this.reportVoiceLog(AudioSdkDefine.VoiceLogEvent.ENGINE_INIT, undefined, undefined, ret, undefined, "native_start_fail");
                    return;
                }
                AudioSdkUtil.log("native StartCCMini ok, waiting engine-state INIT_SUCCESS for ready, ret:", ret);
                this.reportVoiceLog(AudioSdkDefine.VoiceLogEvent.ENGINE_INIT, undefined, undefined, undefined, undefined, "launched");
            } else {
                this.reportVoiceLog(AudioSdkDefine.VoiceLogEvent.ENGINE_INIT, undefined, undefined, undefined, undefined, "launched");
            }
        } catch (e) {
            this.engine = null;
            this.engineState = AudioSdkConf.EngineState.NONE;
            this.stopEventPolling();
            AudioSdkUtil.error("Failed to create or start engine", e);
            this.reportVoiceLog(AudioSdkDefine.VoiceLogEvent.ENGINE_INIT, undefined, undefined, undefined, undefined, "engine_create_exception");
        }
    }

    /**
     * 引擎就绪回调
     * 唯一触发点：收到 engine-state INIT_SUCCESS 事件（两种 backend 一致，经 onSdkEngineState 驱动）。
     * 不再由 WASM onWasmLoaded 或 native StartCCMini 同步返回值触发。
     * 自带 READY 守卫，重复进入直接返回（事件可能多次到达，幂等）。
     * 设置默认降噪/回声消除参数，派发就绪事件
     */
    private onEngineReady(): void {
        if (this.engineState === AudioSdkConf.EngineState.READY) {
            return;
        }
        this.engineState = AudioSdkConf.EngineState.READY;
        this.permissionPending = false;
        AudioSdkUtil.log("Engine ready, backend:", this.backend);
        this.reportVoiceLog(AudioSdkDefine.VoiceLogEvent.ENGINE_INIT, undefined, undefined, undefined, undefined, "ready");

        // 设置默认降噪级别为最高
        this.callSdk(AudioSdkConf.SDK_METHOD.SET_NS_LEVEL, { level: AudioSdkConf.NsLevel.MAX });
        // 开启回声消除
        this.callSdk(AudioSdkConf.SDK_METHOD.ENABLE_AEC3, { enable: 1 });

        // native（App）下交由 SDK 自动接管前后台：Android 切后台/息屏停止采集、回前台恢复，
        // 修复"切后台仍能语音"。WASM/H5 由浏览器自身处理，无需下发。
        if (this.backend === AudioSdkConf.Backend.NATIVE) {
            this.callSdk(AudioSdkConf.SDK_METHOD.AUTO_DEAL_HOME, { enable: 1 });
        }

        this.dispatchSdkEvent(AudioSdkEvent.ENGINE_READY);
    }

    /**
     * 软重置引擎到未初始化态（不调用 CloseCCMini）
     * 用于 permission-pending 可重试态：当前 facade 实例尚未真正启动引擎（StartCCMini 已被 native 因缺权限延后），
     * 直接停轮询、丢弃 facade、复位状态即可，使后续 initEngine 能干净重走 StartCCMini
     * （再次触发 native 授权弹窗，或在已授权时直接启动）
     */
    private softResetEngine(): void {
        this.stopEventPolling();
        this.engine = null;
        this.engineState = AudioSdkConf.EngineState.NONE;
        this.permissionPending = false;
    }

    /**
     * native 麦克风(RECORD_AUDIO)授权结果回调
     * 由 src/net/NativeSNet_game.ts 监听 native sendToJS("onRequestPermissionsResult") 后转入
     * 仅在 native backend 且处于 permission-pending 时有意义：
     *  - 授权通过：软重置后由 JS 主动重新 initEngine。此次 bridge 检测到已有麦克风权限，StartCCMini 同步返回 >=0，
     *    随后 native 经事件轮询透出 engine-state INIT_SUCCESS → onEngineReady → 派发 ENGINE_READY →
     *    ChatAudioMgr.onEngineReady 消费缓存的 join 自动入房。
     *  - 授权拒绝：native 不再补发、引擎也不应启动，软重置回 NONE，清除 permissionPending，
     *    否则后续点击进入会被 permissionPending 分支反复软重置
     * @param granted 是否授权通过
     */
    public onRecordPermissionResult(granted: boolean): void {
        if (this.backend !== AudioSdkConf.Backend.NATIVE || !this.permissionPending) {
            return;
        }
        if (granted) {
            AudioSdkUtil.log("RECORD_AUDIO granted, soft reset & re-init to start engine with permission");
            this.reportVoiceLog(AudioSdkDefine.VoiceLogEvent.PERMISSION_DENIED, undefined, undefined, undefined, undefined, "granted");
            this.softResetEngine();
            // 主动重走 StartCCMini：此次有权限 → engine-state INIT_SUCCESS → onEngineReady → ChatAudioMgr 自动入房
            this.initEngine();
            return;
        }
        AudioSdkUtil.warn("RECORD_AUDIO denied, soft reset engine so next join can retry");
        this.softResetEngine();
        this.reportVoiceLog(AudioSdkDefine.VoiceLogEvent.PERMISSION_DENIED);
        // 拒权反馈：派发事件由 ChatAudioMgr 弹提示，修复"拒权进房无反馈"
        this.dispatchSdkEvent(AudioSdkEvent.PERMISSION_DENIED);
    }

    // ======================== 事件轮询（SDK 2.2.5 GetJsonData(out) 统一模型） ========================

    /**
     * 启动事件轮询循环
     * 约 200ms 一次，每次 tick 内连续取事件直到 ret<=0，对 ret>0 解析 out.json 按 type 分发
     */
    private startEventPolling(): void {
        this.stopEventPolling();
        this.eventPollTimer = egret.setInterval(this.pollEvents, this, AudioSdkConf.EVENT_POLL_INTERVAL_MS);
    }

    /** 停止事件轮询循环并清理句柄 */
    private stopEventPolling(): void {
        if (this.eventPollTimer) {
            egret.clearInterval(this.eventPollTimer);
            this.eventPollTimer = 0;
        }
    }

    /**
     * 单次轮询 tick：循环取出本批事件并分发
     * ret>0：out.json 为一条事件 JSON；ret==0：无更多事件；ret<0：未启动/失败
     */
    private pollEvents(): void {
        if (!this.engine || typeof this.engine.GetJsonData !== "function") {
            return;
        }
        for (let i = 0; i < AudioSdkConf.EVENT_POLL_BATCH; i++) {
            const out: AudioSdkDefine.GetJsonDataOut = {};
            const ret = this.engine.GetJsonData(out);
            if (ret <= 0) {
                break;
            }
            let data: any;
            try {
                data = JSON.parse(out.json);
            } catch (e) {
                AudioSdkUtil.warn("GetJsonData parse failed:", out.json);
                continue;
            }
            this.dispatchPolledEvent(data);
        }
    }

    /**
     * 把轮询出的一条事件按 type 分发到内部处理器
     * 事件字段（type/result/session-id/code）SDK 双后端一致
     */
    private dispatchPolledEvent(data: any): void {
        const type: string = data?.type ?? "";
        switch (type) {
            case "engine-state":
                this.onSdkEngineState(data);
                break;
            case "connect-change":
                this.onSdkConnectChange(data);
                break;
            default:
                // start-capture 等 JSON_CONTROL 类事件
                this.onSdkJsonControl(data);
                break;
        }
    }

    /**
     * 关闭语音引擎
     * 停轮询 → 遍历所有活跃Session执行logout → 关闭引擎释放资源
     */
    public closeEngine(): void {
        if (!this.engine || this.engineState === AudioSdkConf.EngineState.NONE) {
            this.stopEventPolling();
            this.reportVoiceLog(AudioSdkDefine.VoiceLogEvent.ENGINE_CLOSE, undefined, undefined, undefined, undefined, "already_closed");
            return;
        }

        this.reportVoiceLog(AudioSdkDefine.VoiceLogEvent.ENGINE_CLOSE);
        AudioSdkUtil.log("Closing engine...");

        // 关闭语音引擎的时候，一定通知服务端
        const allTypes: AudioSdkConf.ChannelType[] = [
            AudioSdkConf.ChannelType.JIEBAN_TEAM,
            AudioSdkConf.ChannelType.PLAY_TEAM,
        ];
        for (const t of allTypes) {
            AudioSdkCNet.C_ON_QUIT_CCMINI_STREAM(t);
        }

        // 先停轮询，避免关闭过程中继续派发事件
        this.stopEventPolling();

        // 遍历所有Session，对非IDLE的执行logout
        for (let i = 0; i < AudioSdkConf.MAX_SESSION_COUNT; i++) {
            const state = this.sessions.get(i);
            if (state !== undefined && state !== AudioSdkConf.SessionState.IDLE) {
                try {
                    this.engine.ControlMini(AudioSdkConf.SDK_METHOD.LOGOUT_SESSION, { 'session-id': i });
                } catch (e) {
                    // 忽略logout错误，确保引擎能正常关闭
                }
                this.sessions.set(i, AudioSdkConf.SessionState.IDLE);
            }
        }

        // 关闭引擎
        try {
            this.engine.CloseCCMini();
        } catch (e) {
            AudioSdkUtil.error("CloseCCMini error", e);
        }

        this.engine = null;
        this.engineState = AudioSdkConf.EngineState.NONE;
        this.permissionPending = false;
        this.sessions.clear();

        AudioSdkUtil.log("Engine closed");
    }

    /** 引擎是否就绪（WASM已加载） */
    public isEngineReady(): boolean {
        return this.engineState === AudioSdkConf.EngineState.READY;
    }

    /** 获取引擎当前状态 */
    public getEngineState(): AudioSdkConf.EngineState {
        return this.engineState;
    }

    /**
     * 当前是否为 Wasm 后端
     * 注意：BGM 路由恢复边界已改用 AudioSdkUtil.isNativeApp() 判定（iOS/安卓 App 才走，不论 backend）。
     * 本方法仅用于其它需要区分 wasm/native backend 的场景，不再用于 BGM 门控。
     */
    public isWasmBackend(): boolean {
        return this.backend === AudioSdkConf.Backend.WASM;
    }

    /**
     * 收到 S_CCMINI_VOICE_ENABLE 协议后调用
     * 1. 更新功能开关与官方禁言时间戳，派发 VOICE_ENABLE_CHANGE 事件
     * 2. enable=true 时（重连场景）按缓存的最新 CONNECT_CHANGE result 补发 on_join/on_quit
     *    服务端在心跳断开时会主动将 voice_eid 置 0；重连后客户端需根据本地 SDK 真实状态再次同步
     * @param data 服务端下发的开关对象 { enable, unlock_ts }
     */
    public onVoiceEnable(data: AudioSdkDefine.VoiceEnableData): void {
        this.voiceEnabled = data.enable;
        this.voiceUnlockTs = data.unlock_ts;
        AudioSdkUtil.log("Voice enable changed:", data, "lastConnectResult:", this.lastConnectResult);
        this.dispatchSdkEvent(AudioSdkEvent.VOICE_ENABLE_CHANGE, { enable: data.enable, unlock_ts: data.unlock_ts });

        // 仅在 enable=true 时按缓存的最新 result 补发 voice_eid 同步
        if (data.enable) {
            if (this.lastConnectResult !== null) {
                this.reportVoiceStreamByResult(this.lastConnectResult, this.lastConnectSessionId);
            } else {
                this.reportVoiceLog(AudioSdkDefine.VoiceLogEvent.CONNECT_RESULT, undefined, undefined, undefined, undefined, "voice_enable_no_cache");
                const allTypes: AudioSdkConf.ChannelType[] = [
                    AudioSdkConf.ChannelType.JIEBAN_TEAM,
                    AudioSdkConf.ChannelType.PLAY_TEAM,
                ];
                for (const t of allTypes) {
                    AudioSdkCNet.C_ON_QUIT_CCMINI_STREAM(t);
                }
            }
        }
    }

    /**
     * 查询服务端语音功能总开关
     * @returns true 表示功能开启；false 表示服务端已关闭语音功能
     */
    public isVoiceEnabled(): boolean {
        return this.voiceEnabled;
    }

    /**
     * 查询官方禁言解禁时间戳（由 S_CCMINI_VOICE_ENABLE 下发）
     * @returns 0=未禁言，-1=永久禁言，>0=解禁时间戳（秒，与 ServerTimer 对齐）
     */
    public getVoiceUnlockTs(): number {
        return this.voiceUnlockTs;
    }

    /**
     * 查询当前是否处于官方禁言态（带时间到期判断）
     * - 0 → false（未禁言）
     * - -1 → true（永久禁言）
     * - >0 且未到 unlock_ts → true
     * - >0 且已到 unlock_ts → false（视为已解禁，但不主动清零缓存值）
     */
    public isOfficialMuted(): boolean {
        if (this.voiceUnlockTs === 0) {
            return false;
        }
        if (this.voiceUnlockTs === -1) {
            return true;
        }
        return this.voiceUnlockTs > ServerTimer.second();
    }

    // ======================== SDK调用封装 ========================

    /**
     * 统一封装SDK ControlMini调用
     * 前置检查引擎就绪 → 调用 → 返回值检查 → 错误日志&事件
     * @param method SDK方法名
     * @param params 参数对象
     * @returns SDK返回值；引擎未就绪或调用异常返回null
     */
    private callSdk(method: string, params: Record<string, unknown>, showLog: boolean = true): number | Record<string, unknown> | null {
        if (!this.engine || this.engineState !== AudioSdkConf.EngineState.READY) {
            AudioSdkUtil.warn("Engine not ready, cannot call:", method);
            this.reportVoiceLog(AudioSdkDefine.VoiceLogEvent.SDK_ERROR, undefined, undefined, undefined, undefined, method);
            return null;
        }

        try {
            // native backend 下 start-capture 强制注入 stereo:1（reference 约定，wasm 不强制）
            if (this.backend === AudioSdkConf.Backend.NATIVE && method === AudioSdkConf.SDK_METHOD.START_CAPTURE) {
                params = Object.assign({ stereo: 1 }, params);
            }
            const ret = this.engine.ControlMini(method, params);
            if (typeof ret === 'number' && ret < AudioSdkConf.SdkErrorCode.SUCCESS) {
                AudioSdkUtil.error(`SDK call failed: ${method}, errorCode: ${ret}`);
                this.reportVoiceLog(AudioSdkDefine.VoiceLogEvent.SDK_ERROR, undefined, undefined, ret, undefined, method);
                this.dispatchSdkEvent(AudioSdkEvent.ERROR, { method, errorCode: ret });
            } else {
                showLog && AudioSdkUtil.log(`SDK call: ${method}`, params, "=>", ret);
            }
            return ret;
        } catch (e) {
            AudioSdkUtil.error(`SDK call exception: ${method}`, e);
            this.reportVoiceLog(AudioSdkDefine.VoiceLogEvent.SDK_ERROR, undefined, undefined, undefined, undefined, method);
            this.dispatchSdkEvent(AudioSdkEvent.ERROR, { method, error: e });
            return null;
        }
    }

    /**
     * 检查SDK调用返回值是否为错误
     * @param ret callSdk的返回值
     * @returns true表示发生错误（null或负数），false表示成功
     */
    private isSdkError(ret: number | Record<string, unknown> | null): boolean {
        if (ret === null) {
            return true;
        }
        return typeof ret === 'number' && ret < AudioSdkConf.SdkErrorCode.SUCCESS;
    }

    // ======================== testMode 控制 ========================

    /**
     * 设置测试模式
     * 开启后onJoinVoiceResult不走一条龙，而是将数据交给callback处理
     * @param enable 是否开启测试模式
     * @param callback 测试模式回调，收到S_CCMINI_JOIN_VOICE_RESULT数据后调用
     */
    public setTestMode(enable: boolean, callback?: (data: AudioSdkDefine.JoinVoiceResultData) => void): void {
        this.testMode = enable;
        this.testModeCallback = enable && callback ? callback : null;
        AudioSdkUtil.log("TestMode:", enable);
    }

    // ======================== Session生命周期 ========================

    /**
     * 获取指定频道的Session状态
     * @param channelType 频道类型
     */
    public getSessionState(channelType: AudioSdkConf.ChannelType): AudioSdkConf.SessionState {
        const sessionId = this.getSessionId(channelType);
        return this.sessions.get(sessionId) || AudioSdkConf.SessionState.IDLE;
    }

    /**
     * 通过sessionId获取Session状态
     * @param sessionId SDK Session ID
     */
    public getSessionStateById(sessionId: AudioSdkConf.SessionID): AudioSdkConf.SessionState {
        return this.sessions.get(sessionId) || AudioSdkConf.SessionState.IDLE;
    }

    /**
     * 判断指定频道是否有活跃Session（非IDLE状态）
     * @param channelType 频道类型
     */
    public isSessionActive(channelType: AudioSdkConf.ChannelType): boolean {
        const state = this.getSessionState(channelType);
        return state !== AudioSdkConf.SessionState.IDLE;
    }

    /**
     * 判断指定频道是否已经连接成功
     * @param channelType 频道类型
     */
    public isSessionConnected(channelType: AudioSdkConf.ChannelType): boolean {
        const state = this.getSessionState(channelType);
        return state >= AudioSdkConf.SessionState.CONNECTED;
    }

    /**
     * 判断指定频道是否正在连接中
     * @param channelType 频道类型
     */
    public isSessionConnecting(channelType: AudioSdkConf.ChannelType): boolean {
        const state = this.getSessionState(channelType);
        return state === AudioSdkConf.SessionState.CREATED || state === AudioSdkConf.SessionState.LOGGING;
    }

    /**
     * 判断玩家自己是否开麦中
     * @param channelType 频道类型
     */
    public isSessionSpeaking(channelType: AudioSdkConf.ChannelType): boolean {
        const state = this.getSessionState(channelType);
        return state === AudioSdkConf.SessionState.SPEAKING;
    }

    // ======================== Session 原子操作 ========================

    /**
     * 创建Session
     * @param sessionId SDK Session ID（0~7）
     * @returns SDK调用结果，错误返回null
     */
    public createSession(sessionId: AudioSdkConf.SessionID): number | Record<string, unknown> | null {
        const ret = this.callSdk(AudioSdkConf.SDK_METHOD.CREATE_SESSION, { 'session-id': sessionId });
        if (!this.isSdkError(ret)) {
            this.setSessionState(sessionId, AudioSdkConf.SessionState.CREATED);
        }
        return ret;
    }

    /**
     * 销毁Session
     * @param sessionId SDK Session ID（0~7）
     * @returns SDK调用结果，错误返回null
     */
    public destroySession(sessionId: AudioSdkConf.SessionID): number | Record<string, unknown> | null {
        const ret = this.callSdk(AudioSdkConf.SDK_METHOD.DESTROY_SESSION, { 'session-id': sessionId });
        if (!this.isSdkError(ret)) {
            this.setSessionState(sessionId, AudioSdkConf.SessionState.IDLE);
        }
        return ret;
    }

    /**
     * 登录Session
     * @param sessionId SDK Session ID（0~7）
     * @param info SDK鉴权参数JSON字符串（ccmini对象序列化）
     * @returns SDK调用结果，错误返回null
     */
    public loginSession(sessionId: AudioSdkConf.SessionID, info: string): number | Record<string, unknown> | null {
        this.setSessionState(sessionId, AudioSdkConf.SessionState.LOGGING);
        const ret = this.callSdk(AudioSdkConf.SDK_METHOD.LOGIN_SESSION, {
            'session-id': sessionId,
            'info': info,
        });
        if (this.isSdkError(ret)) {
            // 登录失败，状态不回退（由调用方决定后续处理）
            return ret;
        }
        this.setSessionState(sessionId, AudioSdkConf.SessionState.CONNECTED);
        return ret;
    }

    /**
     * 登出Session
     * @param sessionId SDK Session ID（0~7）
     * @returns SDK调用结果，错误返回null
     */
    public logoutSession(sessionId: AudioSdkConf.SessionID): number | Record<string, unknown> | null {
        const ret = this.callSdk(AudioSdkConf.SDK_METHOD.LOGOUT_SESSION, { 'session-id': sessionId });
        if (!this.isSdkError(ret)) {
            this.setSessionState(sessionId, AudioSdkConf.SessionState.IDLE);
        }
        return ret;
    }

    /**
     * 开始采集
     * @param sessionId SDK Session ID（0~7）
     * @returns SDK调用结果，错误返回null
     */
    public startCapture(sessionId: AudioSdkConf.SessionID): number | Record<string, unknown> | null {
        const ret = this.callSdk(AudioSdkConf.SDK_METHOD.START_CAPTURE, { 'session-id': sessionId });
        if (!this.isSdkError(ret)) {
            this.setSessionState(sessionId, AudioSdkConf.SessionState.SPEAKING);
        }
        return ret;
    }

    /**
     * 停止采集
     * @param sessionId SDK Session ID（0~7）
     * @returns SDK调用结果，错误返回null
     */
    public stopCapture(sessionId: AudioSdkConf.SessionID): number | Record<string, unknown> | null {
        const ret = this.callSdk(AudioSdkConf.SDK_METHOD.STOP_CAPTURE, { 'session-id': sessionId });
        if (!this.isSdkError(ret)) {
            this.setSessionState(sessionId, AudioSdkConf.SessionState.CONNECTED);
        }
        return ret;
    }

    // ======================== 高层编排 ========================

    /**
     * 收到S_CCMINI_JOIN_VOICE_RESULT后的处理入口
     * testMode时将数据交给回调处理，否则按顺序执行一条龙流程
     * @param data 服务端下发的语音流参数
     */
    public onJoinVoiceResult(data: AudioSdkDefine.JoinVoiceResultData): void {
        // 测试模式：数据交给测试界面处理
        if (this.testMode && this.testModeCallback) {
            this.testModeCallback(data);
            return;
        }

        if (!this.isEngineReady()) {
            AudioSdkUtil.error("Cannot join channel: engine not ready");
            this.reportVoiceLog(AudioSdkDefine.VoiceLogEvent.ENGINE_INIT, data.channel_type, undefined, undefined, undefined, "engine_not_ready");
            return;
        }

        const channelType = data.channel_type;
        const sessionId = this.getSessionId(channelType);

        // 如果该频道已有活跃连接，先清理
        if (this.isSessionActive(channelType)) {
            AudioSdkUtil.warn("Channel already active, cleaning up first. channelType:", channelType);
            this.reportVoiceLog(AudioSdkDefine.VoiceLogEvent.SESSION_CREATE, channelType, sessionId, undefined, undefined, "cleanup_existing");
            this.cleanupSession(channelType);
        }

        AudioSdkUtil.log("Joining channel, type:", channelType, "sessionId:", sessionId);

        // 1. 创建会话
        const createRet = this.createSession(sessionId);
        if (this.isSdkError(createRet)) {
            this.reportVoiceLog(AudioSdkDefine.VoiceLogEvent.SESSION_CREATE_FAIL, channelType, sessionId, createRet as number);
            return;
        }
        this.reportVoiceLog(AudioSdkDefine.VoiceLogEvent.SESSION_CREATE, channelType, sessionId, 0);

        // 2. 登录会话
        const loginRet = this.loginSession(sessionId, JSON.stringify(data.ccmini));
        if (this.isSdkError(loginRet)) {
            // 登录失败，销毁session回滚
            this.reportVoiceLog(AudioSdkDefine.VoiceLogEvent.SESSION_LOGIN_FAIL, channelType, sessionId, loginRet as number);
            this.destroySession(sessionId);
            return;
        }
        this.reportVoiceLog(AudioSdkDefine.VoiceLogEvent.SESSION_LOGIN, channelType, sessionId, 0);

        // 3. 开始采集（默认加入频道后自动开麦）
        // 官方禁言态下跳过 startCapture：禁言玩家只能听不能说，进房后保持 CONNECTED 态
        if (this.isOfficialMuted()) {
            AudioSdkUtil.log("Official muted, skip startCapture. staying CONNECTED. channelType:", channelType);
            this.reportVoiceLog(AudioSdkDefine.VoiceLogEvent.CAPTURE_START_SKIP, channelType, sessionId);
            return;
        }
        const captureRet = this.startCapture(sessionId);
        if (this.isSdkError(captureRet)) {
            // 采集失败，保持CONNECTED状态（已登录但未采集）
            AudioSdkUtil.warn("Start capture failed, staying CONNECTED. channelType:", channelType);
            this.reportVoiceLog(AudioSdkDefine.VoiceLogEvent.CAPTURE_START_FAIL, channelType, sessionId, captureRet as number);
            return;
        }
        this.reportVoiceLog(AudioSdkDefine.VoiceLogEvent.CAPTURE_START, channelType, sessionId, 0);

        // 4. 加入成功，打印日志
        AudioSdkUtil.log("Channel joined successfully, type:", channelType);
    }

    /**
     * 离开语音频道
     * stop-capture → logout-session → destroy-session
     * 服务端 voice_eid 同步统一由 SDK CONNECT_CHANGE(107/108) 回调中的 on_quit_ccmini_stream 触发
     * @param channelType 频道类型
     */
    public leaveChannel(channelType: AudioSdkConf.ChannelType): void {
        if (!this.isSessionActive(channelType)) {
            AudioSdkUtil.log("Session already idle, nothing to leave. channelType:", channelType);
            return;
        }

        AudioSdkUtil.log("Leaving channel, type:", channelType);
        this.cleanupSession(channelType);
    }

    /**
     * 离开所有活跃频道
     * 遍历 Session Map，对非 IDLE 的执行 cleanupSession
     * 服务端 voice_eid 同步统一由 SDK CONNECT_CHANGE(107/108) 回调中的 on_quit_ccmini_stream 触发
     */
    public leaveAllChannels(): void {
        this.sessions.forEach((state, sessionId) => {
            if (state !== AudioSdkConf.SessionState.IDLE) {
                this.doCleanupSession(sessionId);
            }
        });
    }

    /**
     * SDK CONNECT_CHANGE 事件回调（由 engine.GetJsonData 注册）
     * 1. 缓存最新 result（任意值），供 S_CCMINI_VOICE_ENABLE 重连后判断
     * 2. 100 → 上报服务端 on_join_ccmini_stream；107/108 → 上报 on_quit_ccmini_stream
     * 3. 透传事件给上层
     */
    private onSdkConnectChange(data: any): void {
        const result: AudioSdkConf.ConnectResult = data?.result ?? -1;
        const sessionId: AudioSdkConf.SessionID = (data?.["session-id"] ?? 0) as AudioSdkConf.SessionID;

        AudioSdkUtil.log("onSdkConnectChange", result, sessionId);

        // 缓存最新 result + sessionId（任意值）
        this.lastConnectResult = result;
        this.lastConnectSessionId = sessionId;

        // 根据稳定态向服务端同步 voice_eid（带 sessionId 做归属校验）
        this.reportVoiceStreamByResult(result, sessionId);

        // 上报连接结果（含成功 -100 与各失败码 -101~-113），便于线上排查
        this.reportVoiceLog(
            AudioSdkDefine.VoiceLogEvent.CONNECT_RESULT,
            this.getChannelTypeBySessionId(sessionId),
            sessionId,
            result,
        );

        // 透传给上层（ChatAudioMgr 监听 CONNECT_CHANGE 后再透传给 UI）
        this.dispatchSdkEvent(AudioSdkEvent.CONNECT_CHANGE, {
            sessionId,
            result,
        } as any);
    }

    /**
     * SDK JSON_CONTROL 事件回调（由 engine.GetJsonData 注册）
     * 仅 Wasm backend 消费 type==='start-capture' 的 result 字段，派发 WASM_CAPTURE_RESULT 事件给上层
     * native backend 下不派发该事件（native start-capture 结果码语义不同，业务层不消费），仅打日志
     * 本回调严格只做透传：不修改任何 Session 状态机、不主动调用任何 SDK 方法或上行协议
     * 失败时是否回退由上层（ChatAudioMgr）决定，按需求开麦失败不做 leaveChannel 等回退
     */
    private onSdkJsonControl(data: any): void {
        const type: string = data?.type ?? "";
        if (type !== AudioSdkConf.SDK_METHOD.START_CAPTURE) {
            // 其他 type（如 stop-capture / mute-capture 等）暂不消费，仅打日志便于排查
            AudioSdkUtil.log("onSdkJsonControl ignore type:", type);
            return;
        }

        const code: AudioSdkConf.WasmCaptureResult = (data?.result ?? 0) as AudioSdkConf.WasmCaptureResult;
        const sessionId: AudioSdkConf.SessionID = (data?.["session-id"] ?? 0) as AudioSdkConf.SessionID;

        // native backend 不派发 Wasm 采集结果事件，仅打日志便于排查
        if (!this.isWasmBackend()) {
            AudioSdkUtil.log("onSdkJsonControl start-capture (native, not dispatched)", code, sessionId);
            return;
        }

        AudioSdkUtil.log("onSdkJsonControl start-capture", code, sessionId);

        // 采集失败（-1001~-1099）即时上报，成功(0)不上报，避免噪声
        if (code !== AudioSdkConf.WasmCaptureResult.SUCCESS) {
            this.reportVoiceLog(
                AudioSdkDefine.VoiceLogEvent.CAPTURE_FAIL,
                this.getChannelTypeBySessionId(sessionId),
                sessionId,
                code,
            );
        }

        this.dispatchSdkEvent(AudioSdkEvent.WASM_CAPTURE_RESULT, {
            sessionId,
            code,
        } as any);
    }

    /**
     * SDK ENGINE_STATE 事件回调（由 engine.GetJsonData 注册）
     * 仅做日志记录与事件透传，不修改任何 Session 状态机、不主动调用任何 SDK 方法或上行协议
     * 业务层若需要对特定状态码（如 INIT_FAIL/CAPTURE_ERROR 等）做弹窗或重试，自行订阅 AudioSdkEvent.SDK_ENGINE_STATE
     *
     * 数据格式（来自 SDK）：
     *   { type: 'engine-state', result: number, code: number, "session-id"?: number }
     *   ─ result：引擎状态码（详见 AudioSdkConf.SdkEngineStateCode，-200 ~ -214）
     *   ─ code  ：附加错误码或底层状态码；无额外错误时通常为 0
     */
    private onSdkEngineState(data: any): void {
        const result: AudioSdkConf.SdkEngineStateCode = (data?.result ?? 0) as AudioSdkConf.SdkEngineStateCode;
        const code: number = (data?.code ?? 0) as number;

        AudioSdkUtil.log("onSdkEngineState result=", result, "code=", code);

        // 引擎就绪/失败信号统一经 engine-state 事件驱动（两种 backend 一致）：
        //  - 唯一就绪准绳：INIT_SUCCESS（-201）。WASM 与 native 均以此触发 onEngineReady，
        //    不再依赖 WASM onWasmLoaded 或 native StartCCMini 同步返回值。
        //  - 仅在尚未 READY 时处理，onEngineReady 内部自带 READY 守卫，重复进入幂等。
        if (this.engineState !== AudioSdkConf.EngineState.READY) {
            if (result === AudioSdkConf.SdkEngineStateCode.INIT_SUCCESS) {
                AudioSdkUtil.log("engine ready via engine-state INIT_SUCCESS, backend:", this.backend);
                this.onEngineReady();
            } else if (result === AudioSdkConf.SdkEngineStateCode.INIT_FAIL
                || result === AudioSdkConf.SdkEngineStateCode.START_FAIL) {
                // 初始化/启动失败：复位状态、停轮询，避免上层缓存的 join 永久挂起
                AudioSdkUtil.error("engine init/start failed via engine-state code:", result, "code:", code);
                this.engineState = AudioSdkConf.EngineState.NONE;
                this.permissionPending = false;
                this.stopEventPolling();
                this.reportVoiceLog(AudioSdkDefine.VoiceLogEvent.ENGINE_STATE_FAIL, undefined, undefined, result);
            }
        }

        this.dispatchSdkEvent(AudioSdkEvent.SDK_ENGINE_STATE, {
            result,
            code,
        });

        // 非就绪/失败类的其他引擎状态（STOP_PLAY/CAPTURE_ERROR 等），统一上报便于线上排查
        if (result !== AudioSdkConf.SdkEngineStateCode.INIT_SUCCESS
            && result !== AudioSdkConf.SdkEngineStateCode.INIT_FAIL
            && result !== AudioSdkConf.SdkEngineStateCode.START_FAIL) {
            this.reportVoiceLog(AudioSdkDefine.VoiceLogEvent.ENGINE_STATE_OTHER, undefined, undefined, result, code);
        }
    }

    /**
     * 根据 SDK CONNECT_CHANGE 的 result 向服务端上报 on_join/on_quit_ccmini_stream
     * 仅识别两个稳定态：100→on_join，107→on_quit；其他值（101/108/110/112/500 等）不发包，
     * 由业务层（ChatAudioMgr.onSdkConnectChange）按分组规则做提示/重试/退出处理
     *  - SUCCESS：记录该 session 为 owner 并上报 on_join
     *  - ACTIVE_CLOSE：仅当关闭的正是 owner 才上报 on_quit 并清空 owner；
     *    否则视为切频道时旧频道迟到的关闭事件（WASM 下异步 teardown 会迟于新频道 SUCCESS），直接丢弃
     * @param result    CONNECT_CHANGE 的 result 状态码
     * @param sessionId 该事件归属的 SDK session-id
     */
    private reportVoiceStreamByResult(result: AudioSdkConf.ConnectResult, sessionId: AudioSdkConf.SessionID): void {
        const channelType = AudioSdkMgr.getInstance().getChannelTypeBySessionId(sessionId);
        if (result === AudioSdkConf.ConnectResult.SUCCESS) {
            AudioSdkCNet.C_ON_JOIN_CCMINI_STREAM(channelType);
        } else if (result === AudioSdkConf.ConnectResult.ACTIVE_CLOSE) {
            AudioSdkCNet.C_ON_QUIT_CCMINI_STREAM(channelType);
        }
    }

    /**
     * 统一上报实时语音关键事件至 Hubble（自动补 backend 字段）
     * 独立埋点，不影响 AudioSdkUtil 日志；便于线上还原语音链路
     */
    private reportVoiceLog(event: AudioSdkDefine.VoiceLogEvent, channelType?: number, sessionId?: number, result?: number, retry?: number, reason?: string): void {
        const extra = reason ? JSON.stringify({ reason }) : undefined;
        HubbleManager.collectVoiceLog({
            event,
            channel_type: channelType,
            session_id: sessionId,
            result,
            retry,
            extra,
            backend: this.backend,
        });
    }

    /**
     * 按channelType清理Session
     * 内部转换为sessionId后执行实际清理
     */
    private cleanupSession(channelType: AudioSdkConf.ChannelType): void {
        const sessionId = this.getSessionId(channelType);
        this.doCleanupSession(sessionId);
    }

    /**
     * 按sessionId执行实际Session清理
     * 按安全顺序调用原子方法：stopCapture → logoutSession → destroySession
     */
    private doCleanupSession(sessionId: AudioSdkConf.SessionID): void {
        const currentState = this.sessions.get(sessionId) || AudioSdkConf.SessionState.IDLE;

        // 如果正在采集，先停止
        if (currentState === AudioSdkConf.SessionState.SPEAKING) {
            this.callSdk(AudioSdkConf.SDK_METHOD.STOP_CAPTURE, { 'session-id': sessionId });
        }

        // 如果已连接或登录中，执行logout
        if (currentState >= AudioSdkConf.SessionState.LOGGING) {
            this.callSdk(AudioSdkConf.SDK_METHOD.LOGOUT_SESSION, { 'session-id': sessionId });
        }

        // 如果已创建或更高状态，执行destroy
        if (currentState >= AudioSdkConf.SessionState.CREATED) {
            this.callSdk(AudioSdkConf.SDK_METHOD.DESTROY_SESSION, { 'session-id': sessionId });
            // destroy-session时，一定上报服务端，与-107（AudioSdkConf.ConnectResult.ACTIVE_CLOSE）进行双保险
            const channelType = AudioSdkMgr.getInstance().getChannelTypeBySessionId(sessionId);
            AudioSdkCNet.C_ON_QUIT_CCMINI_STREAM(channelType);
        }

        this.setSessionState(sessionId, AudioSdkConf.SessionState.IDLE);
    }

    /**
     * 更新Session状态并派发状态变更事件
     * @param sessionId SDK Session ID
     * @param state 新状态
     */
    private setSessionState(sessionId: AudioSdkConf.SessionID, state: AudioSdkConf.SessionState): void {
        this.sessions.set(sessionId, state);
        this.dispatchSdkEvent(AudioSdkEvent.SESSION_STATE_CHANGE, { sessionId, state });
    }

    // ======================== 麦克风控制 ========================

    /**
     * 麦克风开关（开始/停止采集）
     * @param channelType 频道类型
     * @param on true=开麦，false=关麦
     */
    public toggleMic(channelType: AudioSdkConf.ChannelType, on: boolean): void {
        const sessionId = this.getSessionId(channelType);
        const curState = this.getSessionState(channelType);

        if (on) {
            // 开麦：CONNECTED → SPEAKING
            if (curState !== AudioSdkConf.SessionState.CONNECTED) {
                AudioSdkUtil.warn("Cannot start capture, session not CONNECTED. state:", curState);
                this.reportVoiceLog(AudioSdkDefine.VoiceLogEvent.SDK_ERROR, channelType, sessionId, curState, undefined, "toggle_mic_not_connected");
                return;
            }
            const ret = this.callSdk(AudioSdkConf.SDK_METHOD.START_CAPTURE, { 'session-id': sessionId });
            if (!this.isSdkError(ret)) {
                this.setSessionState(sessionId, AudioSdkConf.SessionState.SPEAKING);
            }
        } else {
            // 关麦：SPEAKING → CONNECTED
            if (curState !== AudioSdkConf.SessionState.SPEAKING) {
                AudioSdkUtil.warn("Cannot stop capture, session not SPEAKING. state:", curState);
                this.reportVoiceLog(AudioSdkDefine.VoiceLogEvent.SDK_ERROR, channelType, sessionId, curState, undefined, "toggle_mic_not_speaking");
                return;
                return;
            }
            const ret = this.callSdk(AudioSdkConf.SDK_METHOD.STOP_CAPTURE, { 'session-id': sessionId });
            if (!this.isSdkError(ret)) {
                this.setSessionState(sessionId, AudioSdkConf.SessionState.CONNECTED);
            }
        }
    }

    // ======================== 静音控制 ========================

    /**
     * 采集静音控制（静音后仍发送空数据包，保持连接）
     * @param channelType 频道类型
     * @param mute true=静音，false=取消静音
     */
    public muteCapture(channelType: AudioSdkConf.ChannelType, mute: boolean): void {
        this.callSdk(AudioSdkConf.SDK_METHOD.MUTE_CAPTURE, { 'session-id': this.getSessionId(channelType), mute: mute ? 1 : 0 });
    }

    /**
     * 播放静音控制
     * @param channelType 频道类型
     * @param mute true=静音，false=取消静音
     */
    public mutePlayback(channelType: AudioSdkConf.ChannelType, mute: boolean): void {
        this.callSdk(AudioSdkConf.SDK_METHOD.MUTE_PLAYBACK, { 'session-id': this.getSessionId(channelType), mute: mute ? 1 : 0 });
    }

    /**
     * 设置播放（队友）音量
     * @param channelType 频道类型（内部映射为 session-id）
     * @param percent 音量百分比，0~200（默认100，超过100为增益）
     */
    public setPlaybackVolume(channelType: AudioSdkConf.ChannelType, percent: number): void {
        this.callSdk(AudioSdkConf.SDK_METHOD.SET_PLAYBACK_VOL, { 'session-id': this.getSessionId(channelType), percent: percent });
    }

    // ======================== DSP音频处理 ========================

    /**
     * 设置降噪级别
     * @param level AudioSdkConf.NsLevel（0=最低，3=最高）
     */
    public setNsLevel(level: AudioSdkConf.NsLevel): void {
        this.callSdk(AudioSdkConf.SDK_METHOD.SET_NS_LEVEL, { level: level });
    }

    /**
     * 开关AI降噪
     * @param enable true=开启，false=关闭
     */
    public enableAiNs(enable: boolean): void {
        this.callSdk(AudioSdkConf.SDK_METHOD.ENABLE_AI_NS, { enable: enable ? 1 : 0 });
    }

    /**
     * 开关回声消除（AEC3）
     * @param enable true=开启，false=关闭
     */
    public enableAec(enable: boolean): void {
        this.callSdk(AudioSdkConf.SDK_METHOD.ENABLE_AEC3, { enable: enable ? 1 : 0 });
    }

    /**
     * 设置采集音量
     * @param percent 音量百分比，0~200（默认100，超过100为增益）
     */
    public setCaptureVolume(percent: number): void {
        this.callSdk(AudioSdkConf.SDK_METHOD.SET_CAPTURE_VOL, { percent: percent });
    }

    /**
     * 强制关闭VAD（语音活动检测）
     * 关闭后持续发送音频数据，适用于音乐等场景
     * @param enable true=强制关闭VAD（持续发送），false=恢复VAD
     */
    public forceNoVad(enable: boolean): void {
        this.callSdk(AudioSdkConf.SDK_METHOD.FORCE_NO_VAD, { enable: enable ? 1 : 0 });
    }

    /**
     * 启用基于分贝的VAD检测
     * @param enable true=启用，false=禁用
     * @param threshold 分贝阈值
     */
    public enableDbVad(enable: boolean, threshold: number): void {
        this.callSdk(AudioSdkConf.SDK_METHOD.ENABLE_DB_VAD, { enable: enable ? 1 : 0, threshold: threshold });
    }

    // ======================== 状态查询 ========================

    /**
     * 获取当前正在说话的用户列表（EID → energy 映射）
     * 注意：此接口仅反映「实时说话事实」，不可用于判断「是否在频道内」——
     * 「在频道」的语义由业务层基于服务端 voice_eid 自行维护
     * @param channelType 频道类型
     * @returns Map<eid, energy> 或 null（未连接 / SDK 调用失败 时返回 null）
     */
    public getSpeakingList(channelType: AudioSdkConf.ChannelType): Map<number, number> | null {
        if (this.getSessionState(channelType) < AudioSdkConf.SessionState.CONNECTED) {
            return null;
        }
        const ret = this.callSdk(AudioSdkConf.SDK_METHOD.GET_SPEAKING_LIST, { 'session-id': this.getSessionId(channelType) }, false) as unknown;
        if (!(ret instanceof Map)) {
            return null;
        }
        return ret as Map<number, number>;
    }

    /**
     * 只收听指定用户的语音
     * @param channelType 频道类型
     * @param enable true=开启只收听模式，false=关闭（恢复收听所有人）
     * @param eids 要收听的用户eid数组
     */
    public onlyListenEids(channelType: AudioSdkConf.ChannelType, enable: boolean, eids: number[]): void {
        this.callSdk(AudioSdkConf.SDK_METHOD.ONLY_LISTEN_EIDS, {
            'session-id': this.getSessionId(channelType),
            enable: enable,
            eids: new Uint32Array(eids),
        });
    }

    // ======================== 调试与测试 ========================

    /**
     * 麦克风环回测试（自己听自己）
     * @param channelType 频道类型
     * @param start true=开始测试，false=停止测试
     */
    public testMic(channelType: AudioSdkConf.ChannelType, start: boolean): void {
        this.callSdk(AudioSdkConf.SDK_METHOD.TEST_MIC, { 'session-id': this.getSessionId(channelType), start: start });
    }

    /**
     * 麦克风环回测试（按 SessionID 直接调用，仅供 GM 面板等测试场景使用）
     * @param sessionId SDK session-id
     * @param start true=开始测试，false=停止测试
     */
    public testMicBySid(sessionId: AudioSdkConf.SessionID, start: boolean): void {
        this.callSdk(AudioSdkConf.SDK_METHOD.TEST_MIC, { 'session-id': sessionId, start: start });
    }

    // ======================== 事件派发 ========================

    /**
     * 通过AudioSdkEventBus派发事件
     * @param type 事件类型（AudioSdkEvent静态常量）
     * @param data 事件数据（可选）
     */
    private dispatchSdkEvent(type: string, data?: Record<string, unknown>): void {
        AudioSdkEventBus.getInstance().dispatchEvent(new AudioSdkEvent(type, data));
    }

    // ======================== SingletonClassEx 生命周期 ========================

    /**
     * 软重置（登出/切服时调用）
     * 引擎单次启动模型收敛为唯一的 StartCCMini / CloseCCMini：登出/切服直接 closeEngine（logout 全部 Session + CloseCCMini），
     * 再次进房时由 initEngine 重新 StartCCMini。不再维护 stop-engine/reset-engine 暂停复用路径。
     */
    public clear(): void {
        this.setTestMode(false);
        this.closeEngine();
        this.permissionPending = false;
        this.lastConnectResult = null;
        this.lastConnectSessionId = AudioSdkConf.SessionID.CUSTOM_0;
    }

    /**
     * 硬销毁
     * 关闭引擎、置空所有引用
     */
    public destroy(): void {
        this.setTestMode(false);
        this.closeEngine();
        this.stopEventPolling();
        this.permissionPending = false;
        this.engine = null;
        this.sessions = null;
        this.lastConnectResult = null;
        this.lastConnectSessionId = AudioSdkConf.SessionID.CUSTOM_0;
    }
}