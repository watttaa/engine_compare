/**
 * 动态补帧 [预研]
 * 1. 补帧数据需要与原始帧数据相同帧数
 * 2. 不支持添加补帧后，又移除补帧。
 */
export class CMovieClip extends egret.MovieClip {
    public static isTickFrame: boolean = false;
    public static isDebug: boolean = false;

    // =============动态补帧=============
    // 1. 补帧需要等到主帧动画数据完才会启动加载? 不需要！
    // 2. this.$movieClipData则为主帧数据，this.m_objInterpolationMovieClipData为补帧数据!
    // 3. 约定，补帧数据的frameRate要和主帧数据的frameRate相同。否则不支持!
    // 4. 如果某个动作的frame = end，表示是一帧，是否需要处理? 不需要!
    /**
     * 补帧数据
     * 
     * (this.$movieClipData则为主帧数据)
     */
    private m_objInterpolationMovieClipData: egret.MovieClipData;
    private m_objCurHost: { totalFrames: number, frameLabelStart: number, frameLabelEnd: number } = null;
    private m_objCurFrame: string | number;
    private m_bNeedFix: boolean = false;

    /**动态补帧 */
    public interpolation(mcData: egret.MovieClipData) {
        if (this.m_objInterpolationMovieClipData == mcData) {
            return;
        }

        this.disposeInterpolation();

        this.m_objInterpolationMovieClipData = mcData;

        this.tryBuildInterpolation();
    }

    /**开始补帧，重新构建相关数据 */
    private tryBuildInterpolation() {
        if (!this.isHostValid) {
            return;
        }
        if (!this.isInterpolationValid) {
            return;
        }
        if (this.$movieClipData.frameRate != this.m_objInterpolationMovieClipData.frameRate) {
            console.warn(`补帧frameRate != 主帧frameRate`);
            return;
        }

        let hostData: egret.MovieClipData = this.$movieClipData;
        let hostLabelsLength = hostData.labels.length;

        // 更新frameLabels
        this.frameLabels = [];
        for (let index = 0; index < hostLabelsLength; index++) {
            const label: egret.FrameLabel = hostData.labels[index];
            // 公式: start: y = x.frame;  end: y = x.end + ((x.end - x.frame) + 1)
            let newLable = new egret.FrameLabel(label.name, label.frame, label.end + ((label.end - label.frame) + 1));// 需要使用copy，防止污染源数据
            this.frameLabels.push(newLable);
        }

        // 更新frameRate & totalFrames
        this.frameRate = hostData.frameRate * 2;
        this.$totalFrames = hostData.numFrames * 2;

        // 更新frameStartEnd
        if (this.m_objCurFrame) {
            if (typeof this.m_objCurFrame === "string") {
                this.getFrameStartEnd(this.m_objCurFrame);
            } else {
                this.$frameLabelStart = 0;
                this.$frameLabelEnd = 0;
            }
        }

        this.m_bNeedFix = true;

        this.debgLog(`CMovieClip ==== interpolation over`);
    }
    public disposeInterpolation() {
        if (this.m_objInterpolationMovieClipData) {
            this.m_objInterpolationMovieClipData.dispose();
            this.m_objInterpolationMovieClipData = null;
        }

        this.m_bNeedFix = false;
    }

    $init() {
        super.$init();

        this.tryBuildInterpolation(); // host movieClipData loaded
    }

    public gotoAndPlay(frame: string | number, playTimes: number = 0): void {
        this.m_objCurFrame = frame;

        this.updateCurHost(frame);

        super.gotoAndPlay(frame, playTimes);
    }

    private updateCurHost(labelName: string | number) {
        let _totalFrames: number = 0;
        let _frameLabelStart: number = 0;
        let _frameLabelEnd: number = 0;

        let hostData = this.$movieClipData;
        if (hostData && (typeof labelName === "string")) {
            _totalFrames = hostData.numFrames;
            let frameLabels = hostData.labels;
            if (frameLabels) {
                let outputFramelabel: egret.FrameLabel = null;
                for (let i = 0; i < frameLabels.length; i++) {
                    outputFramelabel = frameLabels[i];
                    if (labelName == outputFramelabel.name) {
                        _frameLabelStart = outputFramelabel.frame;
                        _frameLabelEnd = outputFramelabel.end;
                        break;
                    }
                }
            }
        }

        this.m_objCurHost = {
            totalFrames: _totalFrames,
            frameLabelStart: _frameLabelStart,
            frameLabelEnd: _frameLabelEnd,
        }
    }

    $onRemoveFromStage(): void {
        super.$onRemoveFromStage();

        this.disposeInterpolation();

        this.m_objCurHost = null;
        this.m_objCurFrame = null;
    }

    protected advanceTime(timeStamp: number): boolean {
        let self = this;
        let isVisible = self.isVisible;
        if (!isVisible && self.hidePause) {
            return;
        }
        let advancedTime: number = timeStamp - self.lastTime;
        self.lastTime = timeStamp;

        let frameIntervalTime: number = self.frameIntervalTime;
        let currentTime = self.passedTime + advancedTime;
        self.passedTime = currentTime % frameIntervalTime;

        let num: number = currentTime / frameIntervalTime;
        if (num < 1) {
            return false;
        }

        if (CMovieClip.isDebug && CMovieClip.isTickFrame) {
            num = 1; // test 用 每一次tick，都前进一帧
        }

        while (num >= 1) {
            num--;
            self.$nextFrameNum++;

            let oneComplete: boolean = false;
            // old totalFrames
            if (this.m_bNeedFix && this.m_objCurHost) { // mike focus
                this.m_bNeedFix = false;

                // 检查是否到临界点了
                let _totalFrames: number = this.m_objCurHost.totalFrames;
                let _frameLabelStart: number = this.m_objCurHost.frameLabelStart;
                let _frameLabelEnd: number = this.m_objCurHost.frameLabelEnd;

                // 检查是否下一帧从头开始
                if (self.$nextFrameNum > _totalFrames || (_frameLabelStart > 0 && self.$nextFrameNum > _frameLabelEnd)) {
                    if (self.playTimes == -1) {
                        self.$eventPool.push(egret.Event.LOOP_COMPLETE);
                        self.$nextFrameNum = 1;
                    }
                    else {
                        self.playTimes--;
                        if (self.playTimes > 0) {
                            self.$eventPool.push(egret.Event.LOOP_COMPLETE);
                            self.$nextFrameNum = 1;
                        }
                        else {
                            self.$nextFrameNum = _totalFrames;
                            self.$eventPool.push(egret.Event.COMPLETE);
                            break;
                        }
                    }
                    oneComplete = true;
                }
                if (self.$currentFrameNum == _frameLabelEnd) {
                    self.$nextFrameNum = _frameLabelStart;
                    oneComplete = true;
                }

                if (!oneComplete) {
                    this.fixedNextFrame()
                }
            }

            // new totalFrames
            if (!oneComplete) {
                if (self.$nextFrameNum > self.$totalFrames || (self.$frameLabelStart > 0 && self.$nextFrameNum > self.$frameLabelEnd)) {
                    if (self.playTimes == -1) {
                        self.$eventPool.push(egret.Event.LOOP_COMPLETE);
                        self.$nextFrameNum = 1;
                    }
                    else {
                        self.playTimes--;
                        if (self.playTimes > 0) {
                            self.$eventPool.push(egret.Event.LOOP_COMPLETE);
                            self.$nextFrameNum = 1;
                        }
                        else {
                            self.$nextFrameNum = self.$totalFrames;
                            self.$eventPool.push(egret.Event.COMPLETE);
                            self.stop();
                            break;
                        }
                    }
                }
                if (self.$currentFrameNum == self.$frameLabelEnd) {
                    self.$nextFrameNum = self.$frameLabelStart;
                }
            }

            self.advanceFrame();
        }
        if (isVisible) {
            self.constructFrame();
        }
        self.handlePendingEvent();

        return false;
    }

    private fixedNextFrame() {
        // 假如未补帧时候，curFrame = 3,则next应该是4。开始而补帧后，next = 4就有问题了。因为补帧后，curFrame = 3就变成了5，前面下面一帧应该是6
        // fix nextFrame
        let _curFrame = this.$nextFrameNum - 1;
        let _curFrameAfterInterpolation = this.m_objCurHost.frameLabelStart + 2 * (_curFrame - this.m_objCurHost.frameLabelStart)
        this.$nextFrameNum = _curFrameAfterInterpolation + 1;
    }

    /**更新当前帧(& 触发frameEvent) */
    protected advanceFrame(): void { // mike focus
        this.$currentFrameNum = this.$nextFrameNum;

        let currentFrameNum: number = this.$currentFrameNum;
        let formatFrame = currentFrameNum;
        let isHostFrame = true;
        if (this.isInterpolationValid && this.m_objCurHost) {
            isHostFrame = (currentFrameNum - this.m_objCurHost.frameLabelStart) % 2 == 0;
            formatFrame = this.m_objCurHost.frameLabelStart + Math.floor((currentFrameNum - this.m_objCurHost.frameLabelStart) / 2);
        }

        if (isHostFrame) { // host才触发frameLabel event
            let event = this.frameEvents[formatFrame];
            if (event && event != "") {
                egret.MovieClipEvent.dispatchMovieClipEvent(this, egret.MovieClipEvent.FRAME_LABEL, event);
            }
        }

        if (this.isInterpolationValid) {
            this.debgLog(`CMovieClip ==== currentFrameNum: ${this.$currentFrameNum}`)
        }
    }

    /**构建最新帧纹理 */
    protected constructFrame() {
        let self = this;
        let currentFrameNum: number = self.$currentFrameNum;
        if (self.displayedKeyFrameNum == currentFrameNum) {
            return;
        }

        let texture: egret.Texture;
        let movieClipData: egret.MovieClipData = self.$movieClipData;
        let formatFrame = currentFrameNum;
        let isHostFrame = true;
        if (this.isInterpolationValid && this.m_objCurHost) { // mike focus
            isHostFrame = (currentFrameNum - this.m_objCurHost.frameLabelStart) % 2 == 0;
            formatFrame = this.m_objCurHost.frameLabelStart + Math.floor((currentFrameNum - this.m_objCurHost.frameLabelStart) / 2);
            if (isHostFrame) {

            } else {
                movieClipData = self.m_objInterpolationMovieClipData;
            }

            this.debgLog(`CMovieClip ==== isHost:${isHostFrame} formatFrame:${formatFrame}`);
        }

        texture = movieClipData.getTextureByFrame(formatFrame);
        this.$setTexture(texture);
        movieClipData.$getOffsetByFrame(formatFrame, self.offsetPoint);

        self.displayedKeyFrameNum = currentFrameNum;
        self.$renderDirty = true;
        if (egret.nativeRender) {
            if (texture) {
                self.$nativeDisplayObject.setDataToBitmapNode(self.$nativeDisplayObject.id, texture,
                    [texture.$bitmapX, texture.$bitmapY, texture.$bitmapWidth, texture.$bitmapHeight,
                    self.offsetPoint.x, self.offsetPoint.y, texture.$getScaleBitmapWidth(), texture.$getScaleBitmapHeight(),
                    texture.$sourceWidth, texture.$sourceHeight]);
                self.$nativeDisplayObject.setWidth(texture.$getTextureWidth());
                self.$nativeDisplayObject.setHeight(texture.$getTextureHeight());
            }
        }
        else {
            self.markDirtyUp(false);
        }
    }

    // ========================
    public get isInterpolationValid() {
        return this.m_objInterpolationMovieClipData && this.m_objInterpolationMovieClipData.$isDataValid();
    }
    public get isHostValid() {
        let movieClipData: egret.MovieClipData = this.$movieClipData;
        return movieClipData && movieClipData.$isDataValid();
    }

    private debgLog(str: string) {
        if (!CMovieClip.isDebug) {
            return;
        }

        console.log(str);
    }
}