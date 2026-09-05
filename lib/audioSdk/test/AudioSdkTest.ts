/**
 * 实时语音SDK - 测试界面
 * 对齐 release.html 的全部功能，提供引擎控制/分步Session操作/采集播放/DSP/日志
 */
import { uiPath2 } from "GlobalValue";
import { AudioSdkConf } from "lib/audioSdk/conf/AudioSdkConf";
import { AudioSdkDefine } from "lib/audioSdk/define/AudioSdkDefine";
import { AudioSdkEvent, AudioSdkEventBus } from "lib/audioSdk/event/AudioSdkEvent";
import { AudioSdkMgr } from "lib/audioSdk/mgr/AudioSdkMgr";
import { AudioSdkCNet } from "lib/audioSdk/net/AudioSdkCNet";

export interface AudioSdkTest {
    lblStatus: eui.Label;
    // 引擎控制
    btnInitEngine: eui.Button;
    btnCloseEngine: eui.Button;
    // 快速加入
    inputSessionId: eui.TextInput;
    btnQuickJoin: eui.Button;
    btnQuickLeave: eui.Button;
    // 分步操作
    btnCreateSession: eui.Button;
    btnDestroySession: eui.Button;
    btnLogin: eui.Button;
    btnLogout: eui.Button;
    // 采集控制
    btnStartCapture: eui.Button;
    btnStopCapture: eui.Button;
    btnMuteCapture: eui.Button;
    btnUnmuteCapture: eui.Button;
    // 播放控制
    btnMutePlayback: eui.Button;
    btnUnmutePlayback: eui.Button;
    // DSP控制
    inputNsLevel: eui.TextInput;
    btnSetNs: eui.Button;
    btnAiNsOn: eui.Button;
    btnAiNsOff: eui.Button;
    btnAecOn: eui.Button;
    btnAecOff: eui.Button;
    btnVadOff: eui.Button;
    btnVadOn: eui.Button;
    inputCaptureVol: eui.TextInput;
    btnSetVol: eui.Button;
    btnTestMicStart: eui.Button;
    btnTestMicStop: eui.Button;
    btnGetSpeaking: eui.Button;
    // 日志
    btnClearLog: eui.Button;
    lblLog: eui.Label;
}

@UIDef(uiPath2("gm/Audio_Sdk_Test.exml"), UIManager.DevelopPanel)
export class AudioSdkTest extends BaseWidget {

    /** 日志文本缓存 */
    private $logText: string = "";

    /** 日志最大行数 */
    private static LOG_MAX_LINES = 200;

    public init() {
        super.init();
        // 注册AudioSdkEventBus事件监听
        const bus = AudioSdkEventBus.getInstance();
        bus.addEventListener(AudioSdkEvent.ENGINE_READY, this.onEngineReady, this);
        bus.addEventListener(AudioSdkEvent.SESSION_STATE_CHANGE, this.onSessionStateChange, this);
        bus.addEventListener(AudioSdkEvent.ERROR, this.onSdkError, this);

        this.refreshStatus();
        this.appendLog("测试界面已打开");
    }

    // ======================== 辅助方法 ========================

    /** 获取当前输入的SessionID */
    private getInputSessionId(): AudioSdkConf.SessionID {
        return (parseInt(this.inputSessionId.text) || 0) as AudioSdkConf.SessionID;
    }

    /** 获取ChannelType（测试界面固定使用PLAY_TEAM） */
    private getChannelType(): AudioSdkConf.ChannelType {
        return AudioSdkConf.ChannelType.PLAY_TEAM;
    }

    /** 获取AudioSdkMgr单例 */
    private getMgr(): AudioSdkMgr {
        return AudioSdkMgr.getInstance();
    }

    /** 刷新状态栏 */
    private refreshStatus(): void {
        const mgr = this.getMgr();
        const engineState = mgr.getEngineState();
        const sid = this.getInputSessionId();
        const sessionState = mgr.getSessionStateById(sid);
        this.lblStatus.text = `引擎: ${this.engineStateName(engineState)} | Session[${sid}]: ${this.sessionStateName(sessionState)}`;
    }

    /** 引擎状态名 */
    private engineStateName(state: AudioSdkConf.EngineState): string {
        switch (state) {
            case AudioSdkConf.EngineState.NONE: return "NONE";
            case AudioSdkConf.EngineState.READY: return "READY";
            default: return "UNKNOWN";
        }
    }

    /** Session状态名 */
    private sessionStateName(state: AudioSdkConf.SessionState): string {
        switch (state) {
            case AudioSdkConf.SessionState.IDLE: return "IDLE";
            case AudioSdkConf.SessionState.CREATED: return "CREATED";
            case AudioSdkConf.SessionState.LOGGING: return "LOGGING";
            case AudioSdkConf.SessionState.CONNECTED: return "CONNECTED";
            case AudioSdkConf.SessionState.SPEAKING: return "SPEAKING";
            default: return "UNKNOWN";
        }
    }

    // ======================== 日志 ========================

    /** 追加日志条目 */
    private appendLog(msg: string): void {
        const now = new Date();
        const h = String(now.getHours()).padStart(2, "0");
        const m = String(now.getMinutes()).padStart(2, "0");
        const s = String(now.getSeconds()).padStart(2, "0");
        const line = `[${h}:${m}:${s}] ${msg}`;

        if (this.$logText) {
            this.$logText = line + "\n" + this.$logText;
        } else {
            this.$logText = line;
        }

        // 限制日志行数
        const lines = this.$logText.split("\n");
        if (lines.length > AudioSdkTest.LOG_MAX_LINES) {
            this.$logText = lines.slice(0, AudioSdkTest.LOG_MAX_LINES).join("\n");
        }

        this.lblLog.text = this.$logText;
    }

    // ======================== 事件回调 ========================

    private onEngineReady(evt: AudioSdkEvent): void {
        this.appendLog(">>> ENGINE_READY");
        this.refreshStatus();
    }

    private onSessionStateChange(evt: AudioSdkEvent): void {
        const data = evt.data as any;
        const stateName = data ? this.sessionStateName(data.state) : "?";
        const sid = data ? data.sessionId : "?";
        this.appendLog(`>>> SESSION_STATE_CHANGE sid=${sid} state=${stateName}`);
        this.refreshStatus();
    }

    private onSdkError(evt: AudioSdkEvent): void {
        const data = evt.data as any;
        const method = data ? data.method : "";
        const code = data ? data.errorCode : "";
        this.appendLog(`>>> ERROR method=${method} code=${code}`);
        this.refreshStatus();
    }

    // ======================== 引擎控制 ========================

    private onTouchTapbtnInitEngine(): void {
        this.appendLog("initEngine...");
        this.getMgr().initEngine();
        this.refreshStatus();
    }

    private onTouchTapbtnCloseEngine(): void {
        this.appendLog("closeEngine...");
        this.getMgr().closeEngine();
        this.refreshStatus();
    }

    // ======================== 快速加入 ========================

    private onTouchTapbtnQuickJoin(): void {
        // 关闭testMode，走正常一条龙
        this.getMgr().setTestMode(false);
        const channelType = this.getChannelType();
        this.appendLog(`quickJoin: C_REQ_JOIN_CCMINI_STREAM channelType=${channelType}`);
        AudioSdkCNet.C_REQ_JOIN_CCMINI_STREAM(channelType);
    }

    private onTouchTapbtnQuickLeave(): void {
        const channelType = this.getChannelType();
        this.appendLog(`quickLeave: channelType=${channelType}`);
        this.getMgr().leaveChannel(channelType);
        this.refreshStatus();
    }

    // ======================== 分步操作 ========================

    private onTouchTapbtnCreateSession(): void {
        const sid = this.getInputSessionId();
        this.appendLog(`createSession: sid=${sid}`);
        this.getMgr().createSession(sid);
        this.refreshStatus();
    }

    private onTouchTapbtnDestroySession(): void {
        const sid = this.getInputSessionId();
        this.appendLog(`destroySession: sid=${sid}`);
        this.getMgr().destroySession(sid);
        this.refreshStatus();
    }

    private onTouchTapbtnLogin(): void {
        const sid = this.getInputSessionId();
        const channelType = this.getChannelType();
        // 开启testMode，拿到token后只做loginSession
        this.getMgr().setTestMode(true, (data: AudioSdkDefine.JoinVoiceResultData) => {
            const ccminiStr = JSON.stringify(data.ccmini);
            this.appendLog(`收到token, loginSession: sid=${sid} info=${ccminiStr}`);
            this.getMgr().loginSession(sid, ccminiStr);
            this.refreshStatus();
            // 登录完成后关闭testMode
            this.getMgr().setTestMode(false);
        });

        this.appendLog(`login: 发送C_REQ_JOIN_CCMINI_STREAM等待token... channelType=${channelType}`);
        AudioSdkCNet.C_REQ_JOIN_CCMINI_STREAM(channelType);
    }

    private onTouchTapbtnLogout(): void {
        const sid = this.getInputSessionId();
        this.appendLog(`logoutSession: sid=${sid}`);
        this.getMgr().logoutSession(sid);
        this.refreshStatus();
    }

    // ======================== 采集控制 ========================

    private onTouchTapbtnStartCapture(): void {
        const sid = this.getInputSessionId();
        this.appendLog(`startCapture: sid=${sid}`);
        this.getMgr().startCapture(sid);
        this.refreshStatus();
    }

    private onTouchTapbtnStopCapture(): void {
        const sid = this.getInputSessionId();
        this.appendLog(`stopCapture: sid=${sid}`);
        this.getMgr().stopCapture(sid);
        this.refreshStatus();
    }

    private onTouchTapbtnMuteCapture(): void {
        this.appendLog("muteCapture: true");
        this.getMgr().muteCapture(this.getChannelType(), true);
    }

    private onTouchTapbtnUnmuteCapture(): void {
        this.appendLog("muteCapture: false");
        this.getMgr().muteCapture(this.getChannelType(), false);
    }

    // ======================== 播放控制 ========================

    private onTouchTapbtnMutePlayback(): void {
        this.appendLog("mutePlayback: true");
        this.getMgr().mutePlayback(this.getChannelType(), true);
    }

    private onTouchTapbtnUnmutePlayback(): void {
        this.appendLog("mutePlayback: false");
        this.getMgr().mutePlayback(this.getChannelType(), false);
    }

    // ======================== DSP控制 ========================

    private onTouchTapbtnSetNs(): void {
        const level = parseInt(this.inputNsLevel.text) || 0;
        this.appendLog(`setNsLevel: ${level}`);
        this.getMgr().setNsLevel(level);
    }

    private onTouchTapbtnAiNsOn(): void {
        this.appendLog("enableAiNs: true");
        this.getMgr().enableAiNs(true);
    }

    private onTouchTapbtnAiNsOff(): void {
        this.appendLog("enableAiNs: false");
        this.getMgr().enableAiNs(false);
    }

    private onTouchTapbtnAecOn(): void {
        this.appendLog("enableAec: true");
        this.getMgr().enableAec(true);
    }

    private onTouchTapbtnAecOff(): void {
        this.appendLog("enableAec: false");
        this.getMgr().enableAec(false);
    }

    private onTouchTapbtnVadOff(): void {
        this.appendLog("forceNoVad: true (VAD off)");
        this.getMgr().forceNoVad(true);
    }

    private onTouchTapbtnVadOn(): void {
        this.appendLog("forceNoVad: false (VAD on)");
        this.getMgr().forceNoVad(false);
    }

    private onTouchTapbtnSetVol(): void {
        const vol = parseInt(this.inputCaptureVol.text) || 100;
        this.appendLog(`setCaptureVolume: ${vol}`);
        this.getMgr().setCaptureVolume(vol);
    }

    private onTouchTapbtnTestMicStart(): void {
        const sid = this.getInputSessionId();
        this.appendLog(`testMic: start sid=${sid}`);
        this.getMgr().testMicBySid(sid, true);
    }

    private onTouchTapbtnTestMicStop(): void {
        const sid = this.getInputSessionId();
        this.appendLog(`testMic: stop sid=${sid}`);
        this.getMgr().testMicBySid(sid, false);
    }

    private onTouchTapbtnGetSpeaking(): void {
        const result = this.getMgr().getSpeakingList(this.getChannelType());
        if (result && result.size > 0) {
            const items: string[] = [];
            result.forEach((energy, eid) => {
                items.push(`eid=${eid} energy=${energy}`);
            });
            this.appendLog(`getSpeakingList: ${items.join(", ")}`);
        } else {
            this.appendLog("getSpeakingList: null");
        }
    }

    // ======================== 日志操作 ========================

    private onTouchTapbtnClearLog(): void {
        this.$logText = "";
        this.lblLog.text = "";
    }

    // ======================== 生命周期 ========================

    public onClose(visChanged?: boolean): void {
        // 关闭testMode
        this.getMgr().setTestMode(false);
        // 移除事件监听
        const bus = AudioSdkEventBus.getInstance();
        bus.removeEventListener(AudioSdkEvent.ENGINE_READY, this.onEngineReady, this);
        bus.removeEventListener(AudioSdkEvent.SESSION_STATE_CHANGE, this.onSessionStateChange, this);
        bus.removeEventListener(AudioSdkEvent.ERROR, this.onSdkError, this);
        this.$logText = null;
        super.onClose(visChanged);
    }
}