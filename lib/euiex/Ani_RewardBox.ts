import { ComponentEx } from "lib/euiex/ComponentEx";

export class Ani_RewardBox extends ComponentEx {
    public _isEuiex = true;
    public digongtiaozhan: egret.tween.TweenGroup;

    private callback: CallbackConfig = null;

    public constructor() {
        super();
        this.skinName = "resource/eui_skins/AniRewardBox.exml";
        this.touchEnabled = false;
        this.touchChildren = false;
        this.callback = null;
    }

    $onRemoveFromStage() {
        this.callback = null;
        this.digongtiaozhan && this.digongtiaozhan.stop();
        super.$onRemoveFromStage()
    }

    protected onSkinLoadCompleted() {
        super.onSkinLoadCompleted();
        this.digongtiaozhan.addEventListener("complete", this.onAniEnd, this);
    }

    private onAniEnd() {
        if (this.callback) {
            this.callback.callbackFunc.call(this.callback.thisObject, this.callback.args);
        }
        this.callback = null;
    }

    @SafeCallFunction()
    public registerCallBack(callback?: CallbackConfig) {
        this.callback = callback ? callback : null;
    }

    @SafeCallFunction()
    public playOnpenAni() {
        this._updateAni(true);
    }

    private _updateAni(showEffect: boolean) {
        let grp_ani = this.digongtiaozhan;
        if (!grp_ani) {
            return;
        }
        if (showEffect && !grp_ani.isPlaying) {
            grp_ani.play(0);
        }
        else if (!showEffect && grp_ani.isPlaying) {
            grp_ani.stop();
        }
    }
}