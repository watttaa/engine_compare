import { GlobalEventSource, ListenEvent, UnListenEvent } from "GlobalEvent";
import { topPannelZConfig } from "GlobalValue";
import { GlobalValue } from "GlobalValueDefine";

import { VideoOptionsType, VideoPlayerHost, VideoPlayerHandler } from "./video/VideoPlayerHandler";
import { WebVideoHandler } from "./video/WebVideoHandler";
import { WxVideoHandler } from "./video/WxVideoHandler";

/**
* @des 视频播放容器
* @author LiuYonggen
* @since 2023/02/22
*
* 平台策略重构：容器只保留 UI 壳与生命周期编排，平台播放逻辑（web/wx/抖音）
* 委托给 `VideoPlayerHandler` 实现。`setData` 按平台选择 handler 并注入续流回调。
*/
export interface VideoPlayerContainer {
    grpMain: eui.Group;
}

@UIDef("resource/eui/Video.exml", UIManager.TopPanel)
export class VideoPlayerContainer extends BaseWidget implements VideoPlayerHost {
    protected opts: VideoOptionsType;
    /** 平台播放策略 handler，由 setData 按平台创建 */
    protected $handler: VideoPlayerHandler;

    private defaultOpts = {
        x: 0,
        y: 0,
        inline: true,
        autoplay: true,
        disablePictureInPicture: true,
        controls: true,
        width: 720,
        height: 1280,
    }

    public init() {
        super.init();
        this.z = topPannelZConfig.Video;
        this.grpMain.visible = false;
        let isLongScreen = UIManager.stageH / UIManager.stageW >= 2; // 是否是全面屏（长屏）手机
        this.defaultOpts.height = isLongScreen ? 1588 : 1280;
    }

    /**
     * 是否允许播放视频。
     * 微信小游戏端现通过 wx.createVideo 原生组件播放，并配合 JS 侧定时器兜底
     * （总时长超时 + 疑似卡死 showModal 出口 + 切后台墙钟补偿），保证视频层卡死时
     * 玩家仍能回到游戏。故不再屏蔽。
     */
    public static isCanPlayVideo(): boolean {
        return true;
    }

    public setData(opts: VideoOptionsType) {
        this.opts = { ...this.defaultOpts, ...opts };
        // 关闭场景声音
        // SoundUtils.getMgrInstance().enableMusic = false;
        if (preload_utils_platform.isWxGame()) {
            this.$handler = new WxVideoHandler(this);
        } else {
            // 抖音本次仍走 WebVideoHandler（与现状一致，DouyinVideoHandler 仅预留不接入）
            this.$handler = new WebVideoHandler(this);
        }
        this.$handler.setOnEnded(() => this.onVideoEnded());
        this.$handler.play(this.opts);
    }

    protected onVideoEnded() {
        this.closeVideoPlayer();
        if (this.opts.endCB) {
            this.opts.endCB.apply(this.opts.endCBThis, this.opts.endCBArgs);
        }
    }

    private closeVideo() {
        // 开启场景声音
        // SoundUtils.getMgrInstance().enableMusic = true;
        let music = SoundUtils.getMapMusicUrl(2010);
        SoundUtils.getMgrInstance().playSceneMusic(music, true);
        // 委托 handler 清理（收敛，幂等；不触发 onEnded）
        if (this.$handler) {
            this.$handler.close();
        }
    }

    /** 完整关闭：场景音乐恢复 + handler.close + closeSelf，不触发 endCB。public 供 handler 经 host 接口调用 */
    public closeVideoPlayer() {
        this.closeVideo();
        this.closeSelf();
    }

    private onLifecycleChange(e: LoginEvent) {
        // e.data 为 [LIFECYCLE_STATE, is_handle_ticker] 数组，状态取 data[0]
        let state = e && e.data && e.data[0];
        if (!this.$handler) return;
        if (state == LIFECYCLE_STATE.PAUSE) {
            this.$handler.onLifecyclePause();
        } else if (state == LIFECYCLE_STATE.RESUME) {
            this.$handler.onLifecycleResume();
        }
    }

    public onOpen(): void {
        super.onOpen();
        LoginEventBus.getInstance().addEventListener(LoginEvent.LIFECYCLE_FOCUS, this.onLifecycleChange, this);
        SoundUtils.getMgrInstance().destroyDelayConstantEffects(); // 需要先删除音效，避免因为webMediaPlayer满了造成创建video出错
    }

    public onClose(): void {
        super.onClose();
        this.grpMain.visible = false;
        LoginEventBus.getInstance().removeEventListener(LoginEvent.LIFECYCLE_FOCUS, this.onLifecycleChange, this);
        SoundUtils.getMgrInstance().loadDelayConstantEffects(); // 恢复删除的音效
    }

}
