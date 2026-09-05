import { VideoOptionsType, VideoPlayerHost, VideoPlayerHandler } from "./VideoPlayerHandler";

/**
 * 微信小游戏端视频播放策略。
 * 从 `VideoPlayerContainer` 搬运原 `handlerWxVideo` 及全部卡死兜底逻辑：
 * 总时长超时强制续流 + 疑似卡死心跳 showModal + 切后台墙钟补偿 + 清理收敛。
 *
 * 续流（endCB / closeSelf / 场景音乐恢复）通过 `setOnEnded` 回调上抛容器，
 * handler 不反向依赖容器内部字段。
 */
export class WxVideoHandler implements VideoPlayerHandler {
    protected host: VideoPlayerHost;
    protected opts: VideoOptionsType;

    /** 微信小游戏原生视频对象（wx.createVideo 返回） */
    private $wxVideo: any;
    /** 总时长超时兜底定时器 id（独立于视频层，卡死也触发） */
    private $forceEndId: number;
    /** 疑似卡死心跳检测定时器 id（onTimeUpdate 推进则重置） */
    private $stuckCheckId: number;
    /** 播放起始墙钟时间戳（egret.getTimer），用于切后台回前台补偿 */
    private $wxPlayStartTime: number;
    /** 微信端 showModal 跳过确认弹窗是否已弹出（防重复） */
    private $wxSkipModalShown: boolean;
    /** 微信端视频是否已关闭（防关闭后误弹 showModal / 重复续流） */
    private $wxClosed: boolean;
    /** 微信端最近一次 onTimeUpdate 的 currentTime，用于判定是否推进 */
    private $wxLastTime: number;

    /** 微信端总时长兜底超时（ms），无 duration 时的固定上限 */
    protected static readonly WX_MAX_DURATION_MS = 60000;
    /** 微信端疑似卡死心跳阈值（ms）：进度停止推进超过此值判定疑似卡死 */
    protected static readonly WX_STUCK_THRESHOLD_MS = 8000;

    private $onEnded: () => void;

    constructor(host: VideoPlayerHost) {
        this.host = host;
    }

    public setOnEnded(cb: () => void): void {
        this.$onEnded = cb;
    }

    /** 开始播放（原 handlerWxVideo） */
    public play(opts: VideoOptionsType): void {
        this.opts = opts;
        SoundUtils.getMgrInstance().stopMusic();
        let sysInfo = wx.getSystemInfoSync();
        // wx 使用逻辑像素坐标（相对 windowWidth），视频宽度铺满屏幕宽，高度按原始宽高比换算
        let screenW = sysInfo.windowWidth;
        let scale = screenW / this.opts.width;
        let videoW = screenW;
        let videoH = this.opts.height * scale;
        let posX = 0;
        let posY = Math.max(0, (sysInfo.windowHeight - videoH) / 2);

        let data: any = {
            x: posX,
            y: posY,
            width: videoW,
            height: videoH,
            src: this.opts.src,
            poster: this.opts.poster,
            autoplay: true,
            objectFit: "contain",
            controls: true,          // 显示控制栏
            showProgress: true,      // 底部进度条
            enableProgressGesture: true, // 拖动/滑动快进倒退
            enablePlayGesture: true, // 双击暂停/续播
            showCenterPlayBtn: true,
        };

        try {
            this.$wxVideo = wx.createVideo(data);
        } catch (e) {
            Logger.error("[WxVideo] createVideo failed", e);
            this.onVideoEnded();
            return;
        }
        if (!this.$wxVideo) {
            Logger.log("[WxVideo] createVideo returned null, skip");
            this.onVideoEnded();
            return;
        }
        this.$wxVideo.onEnded(() => this.onVideoEnded());
        this.$wxVideo.onError((e: any) => this.onVideoError(e));
        // onTimeUpdate 推进则视为视频层存活，重置卡死心跳
        this.$wxVideo.onTimeUpdate && this.$wxVideo.onTimeUpdate((res: any) => this.onWxTimeUpdate(res));

        this.host.grpMain.visible = true;
        this.startWxFallbackTimers();
    }

    /**
     * 启动微信端卡死兜底定时器：总时长超时 + 疑似卡死心跳。
     * 均基于原生 setTimeout（callLater），切后台会被挂起，故另有墙钟补偿。
     */
    private startWxFallbackTimers(): void {
        this.$wxPlayStartTime = egret.getTimer();
        this.$wxLastTime = 0;
        this.$wxSkipModalShown = false;
        this.$wxClosed = false;
        // 总时长兜底：到点无条件强制续流
        this.$forceEndId = preload_utils_calldelay.callLater(
            WxVideoHandler.WX_MAX_DURATION_MS, this.onWxForceEnd, undefined, this);
        // 疑似卡死心跳：阈值内无进度推进 → 弹 showModal
        this.resetWxStuckCheck();
    }

    /** 重置疑似卡死心跳定时器 */
    private resetWxStuckCheck(): void {
        if (this.$stuckCheckId) {
            preload_utils_calldelay.clearCallLater(this.$stuckCheckId);
            this.$stuckCheckId = 0;
        }
        this.$stuckCheckId = preload_utils_calldelay.callLater(
            WxVideoHandler.WX_STUCK_THRESHOLD_MS, this.onWxStuckSuspected, undefined, this);
    }

    /** onTimeUpdate：进度推进则重置心跳（视频层存活） */
    private onWxTimeUpdate(res: any): void {
        let cur = res && typeof res.position === "number" ? res.position : (res && res.currentTime);
        if (typeof cur === "number" && cur > this.$wxLastTime) {
            this.$wxLastTime = cur;
            this.resetWxStuckCheck();
        }
    }

    /** 总时长超时兜底：无条件强制续流关闭 */
    private onWxForceEnd(): void {
        this.$forceEndId = 0;
        if (this.$wxClosed) return; // 已关闭则不重复续流
        Logger.log("[WxVideo] force end by max-duration timeout");
        this.onVideoEnded();
    }

    /** 疑似卡死：弹出微信系统弹窗让玩家主动跳过（弹窗层高于视频层，卡死也点得到） */
    private onWxStuckSuspected(): void {
        this.$stuckCheckId = 0;
        // 视频已关闭/对象丢失/弹窗已弹 → 不再弹（防关闭后误弹 showModal）
        if (this.$wxClosed || !this.$wxVideo || this.$wxSkipModalShown) return;
        this.$wxSkipModalShown = true;
        Logger.log("[WxVideo] stuck suspected, show skip modal");
        wx.showModal({
            title: LoginText.TIPS,
            content: LoginText.WX_VIDEO_STUCK_SKIP,
            confirmText: LoginText.CONFIRM,
            cancelText: LoginText.CANCEL,
            showCancel: true,
            success: (res: any) => {
                // 弹窗在途期间视频可能已被关闭，二次校验避免重复续流/重开已关闭的心跳
                if (this.$wxClosed || !this.$wxVideo) return;
                if (res && res.confirm) {
                    this.onVideoEnded();
                } else {
                    // 玩家选择继续等待：重开一轮心跳，仍可再次弹出；总时长兜底始终生效
                    this.$wxSkipModalShown = false;
                    this.resetWxStuckCheck();
                }
            },
        });
    }

    /** 视频出错：日志 + 续流 */
    private onVideoError(e: any): void {
        Logger.error("[WxVideo] onError", e);
        this.onVideoEnded();
    }

    /** 视频正常结束/出错/兜底触发 → 通过注入的 onEnded 回调上抛给容器 */
    protected onVideoEnded(): void {
        if (this.$onEnded) this.$onEnded();
    }

    /** 清除所有微信端兜底定时器并销毁 wx 视频对象（收敛，幂等） */
    private closeWxVideo(): void {
        if (this.$wxClosed && !this.$wxVideo && !this.$forceEndId && !this.$stuckCheckId) return;
        this.$wxClosed = true;
        if (this.$forceEndId) {
            preload_utils_calldelay.clearCallLater(this.$forceEndId);
            this.$forceEndId = 0;
        }
        if (this.$stuckCheckId) {
            preload_utils_calldelay.clearCallLater(this.$stuckCheckId);
            this.$stuckCheckId = 0;
        }
        if (this.$wxVideo) {
            try {
                this.$wxVideo.stop && this.$wxVideo.stop();
                this.$wxVideo.destroy && this.$wxVideo.destroy();
            } catch (e) {
                Logger.error(e);
            }
            this.$wxVideo = null;
        }
        this.$wxSkipModalShown = false;
        this.$wxPlayStartTime = 0;
        this.$wxLastTime = 0;
    }

    /** 切后台：暂停 wx 视频 */
    public onLifecyclePause(): void {
        if (this.$wxVideo) {
            this.$wxVideo.pause && this.$wxVideo.pause();
        }
    }

    /** 回前台：墙钟补偿（超总时长则续流）+ play + 重置心跳 */
    public onLifecycleResume(): void {
        if (!this.$wxVideo) return;
        // 墙钟补偿：微信切后台后 setTimeout 被挂起，不能只依赖挂起的定时器。
        // 用墙钟比对是否已超总时长阈值，超则立即强制续流（不等挂起的兜底定时器）。
        if (this.$wxPlayStartTime &&
            egret.getTimer() - this.$wxPlayStartTime >= WxVideoHandler.WX_MAX_DURATION_MS) {
            Logger.log("[WxVideo] force end on resume by wall-clock timeout");
            this.onVideoEnded();
            return;
        }
        this.$wxVideo.play && this.$wxVideo.play();
        // 回前台重置心跳，避免挂起期间误判卡死
        this.resetWxStuckCheck();
    }

    /** close() 调 closeWxVideo（清定时器+destroy+置空），收敛且幂等；不触发 onEnded */
    public close(): void {
        this.closeWxVideo();
    }
}
