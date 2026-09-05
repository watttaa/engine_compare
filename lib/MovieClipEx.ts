

/**
 * 主要解决【egret.MovieClip】还没加载完就播放会出现问题。
 */


export class MovieClipEx extends egret.MovieClip {
    private completed: boolean;

    private playCallback: CallbackConfig = null;

    constructor(movieClipData?: egret.MovieClipData) {
        super(movieClipData);

        this.once(egret.Event.COMPLETE, () => { }, this);

        this.completed = false;
    }

    public setRes(json_source: string) {
        getMCData(json_source, this.onMCComplete, this);
    }

    public gotoAndPlay(frame: string | number, playTimes: number = 0): void {
        if (this.completed) {
            super.gotoAndPlay(frame, playTimes);
        } else {
            this.regiesterPlayerCall(super.gotoAndPlay, this, [frame, playTimes]);
        }
    }

    public play(playTimes: number = 1): void {
        if (playTimes == 1) {
            this.addEventListener(egret.Event.COMPLETE, this.playComplete, this);
        }

        if (this.completed) {
            super.play(playTimes);
        } else {
            this.regiesterPlayerCall(super.play, this, [playTimes]);
        }
    }

    public gotoAndStop(frame: string | number): void {
        if (this.completed) {
            super.gotoAndStop(frame);
        } else {
            this.regiesterPlayerCall(super.gotoAndStop, this, [frame]);
        }
    }

    public stop(): void {
        this.regiesterPlayerCall(null);
        super.stop();
    }

    private onMCComplete(mcData: MCData) {
        this.movieClipData = egret.MovieClipDataFactory.getInstance().generateMovieClipData(mcData.mcData, mcData.mcTexture);
        this.completed = true;
        this.execPlayerCall();
    }

    private regiesterPlayerCall(callback?: Function, thisObject?: any, args?: any) {
        this.playCallback = callback ? { callbackFunc: callback, thisObject, args } : null;
    }
    private execPlayerCall() {
        if (this.playCallback) {
            this.playCallback.callbackFunc.call(this.playCallback.thisObject, ...this.playCallback.args);
            this.playCallback = null;
        }
    }

    // =============
    private playComplete(): void {
        this.parent?.removeChild(this);
    }

    // =============
    $onRemoveFromStage(): void {
        this.removeEventListener(egret.Event.COMPLETE, this.playComplete, this);

        super.$onRemoveFromStage();
    }
}