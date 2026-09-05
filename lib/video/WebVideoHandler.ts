import { getFullPath_ } from "utils/ResUtils";
import { VideoOptionsType, VideoPlayerHost, VideoPlayerHandler } from "./VideoPlayerHandler";

/**
 * web/H5/iOS 浏览器端视频播放策略。
 * 从 `VideoPlayerContainer` 搬运原 `handlerWebVideo` / `createWebVideo` / 跳过按钮 /
 * 尺寸换算 / web 端 `onLifecycleChange` 逻辑，行为等价。
 *
 * 续流编排（endCB / closeSelf / 场景音乐恢复）留在容器，handler 通过 `setOnEnded`
 * 注入的回调上抛「该续流了」。
 */
export class WebVideoHandler implements VideoPlayerHandler {
    protected host: VideoPlayerHost;
    protected opts: VideoOptionsType;

    private webVideo: HTMLVideoElement;
    protected videoContainer: HTMLDivElement;
    private imgSkip: HTMLImageElement;
    private $callerId: number;
    private $resizeReMeasureId: number;
    private $loaded: boolean;

    private $onEnded: () => void;

    constructor(host: VideoPlayerHost) {
        this.host = host;
    }

    public setOnEnded(cb: () => void): void {
        this.$onEnded = cb;
    }

    /** 开始播放（原 handlerWebVideo） */
    public play(opts: VideoOptionsType): void {
        this.opts = opts;
        SoundUtils.getMgrInstance().stopMusic();
        if (!this.videoContainer) {
            this.videoContainer = document.createElement("div");
            this.videoContainer.style.position = "absolute";
            if (this.opts.landscape) {
                this.videoContainer.style.transform = "rotate(90deg)";
                this.videoContainer.style.transformOrigin = "top left";
            }
        }
        this.createSkipImage();
        preload_utils_calldelay.callDelayFrames(this.createWebVideo, this, 1);
        this.$callerId = preload_utils_calldelay.callLater(3000, this.showSkipImage, undefined, this);
    }

    private createWebVideo(): void {
        var container = G123.get("player")?.container;
        if (!this.webVideo) {
            this.webVideo = document.createElement("video");
            this.webVideo.crossOrigin = "anonymous";
            this.webVideo.preload = "auto";
            this.webVideo.setAttribute("type", "video/mp4")
            this.webVideo.muted = !this.opts.controls && preload_utils_platform.isIOSMobile();
            this.webVideo.setAttribute("raw-controls", "true")
        }
        if (this.opts.disablePictureInPicture) {
            this.webVideo.setAttribute("disablePictureInPicture", "")
        }
        this.webVideo.setAttribute(
            "controlslist",
            this.opts.controlsList ||
            "nodownload noremoteplayback nofullscreen noplaybackrate"
        );
        if (this.opts.autoplay) {
            this.webVideo.setAttribute("autoplay", "autoplay");
        }
        if (this.opts.inline) {
            this.webVideo.setAttribute("webkit-playsinline", "webkit-playsinline");
            this.webVideo.setAttribute("playsinline", "playsinline");
            this.webVideo.setAttribute("x5-video-player-type", "h5-page");
        } else {
            this.webVideo.setAttribute("x5-video-player-type", "h5");
            this.webVideo.setAttribute("x5-video-player-fullscreen", "true");
        }
        if (this.opts.controls) {
            this.webVideo.setAttribute("controls", "controls");
        }
        this.webVideo.oncontextmenu = function () {
            return false;
        }
        this.webVideo.style.zIndex = "999";
        this.webVideo.src = this.opts.src;
        if (this.opts.poster && !preload_utils_platform.isIOSMobile()) {
            this.webVideo.poster = this.opts.poster
        }
        this.webVideo.addEventListener("loadedmetadata", () => this.onVideoLoaded());
        this.webVideo.addEventListener("play", () => this.onVideoPlay());
        this.webVideo.addEventListener("pause", () => this.onVideoPause());
        this.webVideo.addEventListener("playing", () => this.onVideoPlaying());
        this.webVideo.addEventListener("ended", () => this.onVideoEnded());
        this.webVideo.addEventListener("error", (e) => this.onVideoError(e));
        this.webVideo.addEventListener("waiting", () => this.onVideoWaiting());
        this.webVideo.addEventListener("click", () => this.clickVideo());
        this.setVideoSize();
        this.host.baseInst.stage.addEventListener(egret.Event.RESIZE, this.resizeVideo, this);
        this.videoContainer.appendChild(this.webVideo);
        container.appendChild(this.videoContainer);
    }

    private createSkipImage(): void {
        let skipUrl = "resource/assets/video/skip_video.png";
        let fullPath = getFullPath_(skipUrl);
        let realUrl = RES.getVirtualUrl(fullPath);
        if (!this.imgSkip) {
            this.imgSkip = document.createElement("img");
            this.imgSkip.addEventListener("click", () => this.onVideoEnded())
            this.imgSkip.crossOrigin = "anonymous";
            this.imgSkip.style.zIndex = "1000";
            this.imgSkip.style.right = "0px";
            this.imgSkip.style.position = "absolute";
        }
        this.imgSkip.style.display = "none";
        this.imgSkip.src = realUrl;
        this.videoContainer.appendChild(this.imgSkip);
    }

    private showSkipImage(): void {
        this.imgSkip.style.display = "inline";
    }

    private clickVideo(): void {
        if (!this.opts.controls) {
            this.playVideo();
        }
    }

    private playVideo(): void {
        this.webVideo.play();
    }

    protected setVideoSize(): void {
        if (!this.webVideo || !this.videoContainer) return;
        let data = this.getSizeData()
        if (!data) return;
        let scale = data.scale
        let gameCanvasRect = data.gameCanvasRect
        let cutoutHeight = data.cutoutHeight;
        let width = this.$loaded ? this.webVideo.videoWidth : this.opts.width;
        let height = this.$loaded ? this.webVideo.videoHeight : this.opts.height;
        this.videoContainer.style.width = width * scale + "px";
        this.videoContainer.style.height = height * scale + "px";
        let left = this.opts.landscape ? gameCanvasRect.left + height * scale : gameCanvasRect.left;
        this.videoContainer.style.left = Math.ceil(left + this.opts.x * scale) + "px";
        if (this.opts.landscape && this.$loaded) {
            this.videoContainer.style.top = (gameCanvasRect.height - width * scale) / 2 + "px";
        } else {
            this.videoContainer.style.top = Math.floor(cutoutHeight + gameCanvasRect.top + this.opts.y * scale) + "px";
        }
        this.webVideo.width = width * scale;
        this.webVideo.height = height * scale;
    }

    private resizeVideo(): void {
        // 折叠屏/分屏恢复时，egret.RESIZE 触发时机早于浏览器 layout 重排完成，
        // 此刻 canvas.getBoundingClientRect() 仍是旧尺寸，直接取会导致视频按旧尺寸布局、出现大片黑边。
        // 先同步布局一次，再延迟多帧 + 一段延时重新测量，确保拿到重排后的真实尺寸。
        this.setVideoSize();
        preload_utils_calldelay.callDelayFrames(this.setVideoSize, this, 1);
        preload_utils_calldelay.callDelayFrames(this.setVideoSize, this, 3);
        this.$resizeReMeasureId = preload_utils_calldelay.callLater(300, this.setVideoSize, undefined, this);
    }

    private onVideoError(e): void {
        Logger.error(e);
        this.onVideoEnded();
    }

    private onVideoWaiting(): void {
        Logger.log("onVideoWaiting");
    }

    /** 视频结束/出错 → 通过注入的 onEnded 回调上抛给容器 */
    protected onVideoEnded(): void {
        if (this.$onEnded) this.$onEnded();
    }

    private onVideoLoaded(): void {
        this.host.grpMain.visible = true;
        this.$loaded = true;
        this.setVideoSize();
    }

    private onVideoPlay(): void {
        Logger.log("onVideoPlay", this.webVideo.currentTime);
        if (this.opts.audio && preload_utils_platform.isIOSMobile()) {
            let music = this.opts.audio;
            SoundUtils.getMgrInstance().playSceneMusic(music, true);
        }
    }

    private onVideoPause(): void {
        Logger.log("onVideoPause");
    }

    private onVideoPlaying(): void {
        Logger.log("onVideoPlaying");
    }

    protected getSizeData() {
        let screenAdapter = ScreenAdapterMgr.getInstance();
        var canvas = G123.get("player")?.canvas;
        if (!canvas) return null;

        let bound = canvas.getBoundingClientRect();
        let width = this.$loaded ? this.webVideo.videoWidth : this.opts.width;
        let height = this.$loaded ? this.webVideo.videoHeight : this.opts.height;
        if (this.opts.landscape) {
            let temp = width;
            width = height;
            height = temp;
        }
        let upDis = UIManager.AdaptedPanel.y;
        let downDis = Math.max(0, screenAdapter.halfExtraDesign - screenAdapter.downAdaptDis);
        let scale = bound.width / width;
        if (UIManager.stage) {
            if (UIManager.stage.scaleMode === egret.StageScaleMode.FIXED_WIDTH) {
                scale = bound.width / width;
                upDis *= scale
                downDis *= scale
            } else if (UIManager.stage.scaleMode === egret.StageScaleMode.FIXED_HEIGHT) {
                scale = bound.height / height;
                upDis *= scale
                downDis *= scale
            }
        }
        return { cutoutHeight: upDis, downDis, scale, gameCanvasRect: bound };
    }

    /** web 端切后台：iOS 关闭播放器（不触发 endCB）+ 延迟场景音乐；其他平台 pause */
    public onLifecyclePause(): void {
        if (preload_utils_platform.isIOSMobile()) {
            // iOS 切后台：关闭播放器与自身 UI（不触发续流 endCB），等价于原 closeVideoPlayer+closeSelf
            this.host.closeVideoPlayer();
            // 延迟1帧再播场景音乐：closeVideo 已同步播一次，但 iOS 切后台瞬间可能被打断，
            // 等返回游戏帧后再播一次确保音乐真正响起（原 onLifecycleChange 行为保持）
            preload_utils_calldelay.callDelayFrames(() => {
                let music = SoundUtils.getMapMusicUrl(2010);
                SoundUtils.getMgrInstance().playSceneMusic(music, true);
            }, this, 1);
        } else {
            this.webVideo && this.webVideo.pause();
        }
    }

    /** web 端回前台：复位 muted + play（iOS PAUSE 已 close，webVideo=null 跳过） */
    public onLifecycleResume(): void {
        if (this.webVideo) {
            this.webVideo.muted = !this.opts.controls && preload_utils_platform.isIOSMobile();
            this.webVideo.play();
        }
    }

    /** web 端清理（pause/removeAttribute src/load/cloneNode/replaceChild/移除 container/null 字段），收敛且幂等 */
    public close(): void {
        if (this.$callerId) {
            preload_utils_calldelay.clearCallLater(this.$callerId);
            this.$callerId = 0;
        }
        if (this.$resizeReMeasureId) {
            preload_utils_calldelay.clearCallLater(this.$resizeReMeasureId);
            this.$resizeReMeasureId = 0;
        }
        if (this.webVideo) {
            // 主动关闭前先解绑所有监听并中止加载，避免 removeChild/清空 src 触发 aborted MediaError
            // iOS 上中止播放极易抛 error，MediaError 属性不可枚举，Logger.error 打出来是空 {}
            this.webVideo.pause();
            this.webVideo.removeAttribute("src");
            this.webVideo.load();
            let cloned = this.webVideo.cloneNode(false) as HTMLVideoElement;
            this.webVideo.parentNode && this.webVideo.parentNode.replaceChild(cloned, this.webVideo);
            if (this.videoContainer) {
                this.videoContainer.style.left = "-9999px";
                this.videoContainer.style.top = "-9999px";
                this.videoContainer.style.display = "none";
                if (this.videoContainer.parentNode) {
                    this.videoContainer.parentNode.removeChild(this.videoContainer)
                }
                this.videoContainer = null;
            }
            this.host.baseInst.stage.removeEventListener(egret.Event.RESIZE, this.resizeVideo, this);
            this.webVideo = null;
            this.imgSkip = null;
            this.$loaded = false;
        }
    }
}
