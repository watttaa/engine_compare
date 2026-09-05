/**
 * 实时语音SDK - 下行协议
 * 主包直接regProto注册，不使用SNet_delay分包模式
 * 协议方法名来自服务端ImpCcmini文档
 */
import { regProto } from "lib/ProtoS2CMap";
import { AudioSdkDefine } from "lib/audioSdk/define/AudioSdkDefine";
import { AudioSdkMgr } from "lib/audioSdk/mgr/AudioSdkMgr";
import { AudioSdkEvent, AudioSdkEventBus } from "lib/audioSdk/event/AudioSdkEvent";

regProto({

    /**
     * 服务端下发语音流参数
     * 客户端收到后调用AudioSdkMgr执行SDK加入语音流
     */
    S_CCMINI_JOIN_VOICE_RESULT(evt: ProtEvent) {
        const data = evt.data[0] as AudioSdkDefine.JoinVoiceResultData;
        AudioSdkMgr.getInstance().onJoinVoiceResult(data);
    },

    /**
     * 服务端下发实时语音功能总开关
     * params[0]: AudioSdkDefine.VoiceEnableData — { enable: boolean, unlock_ts: number }
     *   - enable: false 表示功能关闭，所有语音入口均应隐藏
     *   - unlock_ts: 0=未禁言, -1=永久禁言, >0=解禁时间戳
     * 状态存储与事件派发统一在 AudioSdkMgr 内处理，上层通过监听 AudioSdkEvent.VOICE_ENABLE_CHANGE 响应
     */
    S_CCMINI_VOICE_ENABLE(evt: ProtEvent) {
        const data = evt.data[0] as AudioSdkDefine.VoiceEnableData;
        AudioSdkMgr.getInstance().onVoiceEnable(data);
    },

    /**
     * 服务端下发语音邀请通知
     * 当队友发送邀请（req_invite_ccmini_voice）后，服务端通知被邀请玩家
     * 此处只做数据路由：派发 INVITE_RECEIVED 事件，业务逻辑由 ChatAudioMgr 处理
     * data[0]: { channel_type, inviter_uid, inviter_name, streamid }
     */
    S_CCMINI_VOICE_INVITE(evt: ProtEvent) {
        const data = evt.data[0] as AudioSdkDefine.JoinVoiceInviteData;
        AudioSdkEventBus.getInstance().dispatchEvent(
            new AudioSdkEvent(AudioSdkEvent.INVITE_RECEIVED, data as any)
        );
    },

});
