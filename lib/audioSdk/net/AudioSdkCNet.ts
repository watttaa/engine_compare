/**
 * 实时语音SDK - 上行协议
 * CNet只做发包，禁止包含业务判断逻辑
 * 协议方法名来自服务端ImpCcmini文档
 */
import { AudioSdkConf } from "lib/audioSdk/conf/AudioSdkConf";
import { AudioSdkUtil } from "lib/audioSdk/util/AudioSdkUtil";

export namespace AudioSdkCNet {

    /**
     * 申请加入语音流
     * 服务端收到后：添加 voice_eid，并向CC语音服务获取流参数，通过S_CCMINI_JOIN_VOICE_RESULT下行返回
     * @param channelType 频道类型（AudioSdkConf.ChannelType，1=固定队，2=玩法队）
     */
    export function C_REQ_JOIN_CCMINI_STREAM(channelType: AudioSdkConf.ChannelType): void {
        const isNativeApp = AudioSdkUtil.isNativeApp();
        ProtDispatcher.getInstance().callServerAvatarMessage_("req_join_ccmini_stream", [channelType, isNativeApp]);
    }

    /**
     * 客户端 SDK 进入语音流成功后上报服务端
     * 服务端收到后将本玩家的 voice_eid 设为 req_join_ccmini_stream 阶段从 SDK 获取到的 voice_eid
     * 调用时机：SDK CONNECT_CHANGE 回调返回 SUCCESS(100) 时
     */
    export function C_ON_JOIN_CCMINI_STREAM(channelType: AudioSdkConf.ChannelType): void {
        ProtDispatcher.getInstance().callServerAvatarMessage_("on_join_ccmini_stream", [channelType]);
    }

    /**
     * 客户端 SDK 退出语音流后上报服务端
     * 服务端收到后将本玩家的 voice_eid 置为 0
     * 调用时机：SDK CONNECT_CHANGE 回调返回 PASSIVE_CLOSE(107) 或 ACTIVE_CLOSE(108) 时
     */
    export function C_ON_QUIT_CCMINI_STREAM(channelType: AudioSdkConf.ChannelType): void {
        ProtDispatcher.getInstance().callServerAvatarMessage_("on_quit_ccmini_stream", [channelType]);
    }

    /**
     * 邀请队友加入语音房间
     * 服务端收到后通知目标玩家有邀请（下发 S_CCMINI_VOICE_INVITE）
     * @param channelType 语音频道类型（AudioSdkConf.ChannelType）
     * @param uid 被邀请的玩家 uid
     */
    export function C_REQ_INVITE_CCMINI_VOICE(channelType: number, uid: number): void {
        ProtDispatcher.getInstance().callServerAvatarMessage_("req_invite_ccmini_voice", [channelType, uid]);
    }

}
