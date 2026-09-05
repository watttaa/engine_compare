import { GlobalValue } from "GlobalValueDefine";
export class ProgressBarFx extends eui.ProgressBar {
    public _isEuiex = true;
    private aniKeyPrefix = "aini_";
    private upgradeFx: egret.tween.TweenGroup; //升级光效
    private blblGap: eui.BitmapLabel; //提升数值提示
    private $blblGapOriginY: number;
    private $needGap: boolean = false; //需要显示提升数字
    private $fixDigitNum: number = 0; //需要保留小数

    public set fixDigitNum(value: number) {
        this.$fixDigitNum = value;
    }

    private set aniVisible(value: boolean) {
        if (!this.skin) {
            return;
        }
        for (let id of this.skin.skinParts) {
            if (id.substr(0, this.aniKeyPrefix.length) === this.aniKeyPrefix) {
                this[id].visible = value;
            }
        }
    }

    /**
     * 是否需要显示提升数值
     */
    public set needGap(value: boolean) {
        this.$needGap = value;
        // if (value === true) {
        //     ProtDispatcher.getInstance().addProtListener_(GlobalValue.AutoFailProtNumber, this.onProtAutoFail, this);
        // } else {
        //     ProtDispatcher.getInstance().removeProtListener_(GlobalValue.AutoFailProtNumber, this.onProtAutoFail, this);
        // }
    }

    public get needGap(): boolean {
        return this.$needGap;
    }

    private onProtAutoFail() {
        this.needGap = false;
    }

    public constructor() {
        super();
        this.slideDuration = GlobalValue.PrgDurationDefault;
        this.addEventListener(eui.UIEvent.COMPLETE, this.onComplete, this);
    }

    private onTweenGroupComplete(e: egret.TouchEvent) {
        this.aniVisible = false;
    }

    private onComplete(e: egret.TouchEvent) {
        this.upgradeFx && this.upgradeFx.addEventListener("complete", this.onTweenGroupComplete, this);
        if (this.blblGap) {
            this.$blblGapOriginY = this.blblGap.y;
            this.addEventListener(egret.Event.CHANGE, this.onChange, this);
        }
    }

    private onChange(evt: egret.Event) {
        //Logger.log("----- change event", this.$needGap, evt.data);
        if (!this.blblGap || !this.needGap) {
            return;
        }
        if (evt.data) {
            let gap = evt.data.new_value - evt.data.old_value;
            if (gap <= 0) { //记录归零前的步长
                gap = evt.data.old_max - evt.data.old_value;
            }
            if (gap > 0) {
                this.playTween(gap);
            }
            if (evt.data.new_value === 0) {
                this.slideDuration = GlobalValue.PrgDurationToZero;
            } else {
                this.slideDuration = GlobalValue.PrgDurationDefault;
            }
            this.needGap = false;
        }
    }

    private playTween(vGap: number) {
        let strGap = vGap.toString();
        if (this.$fixDigitNum)
            strGap = vGap.toFixed(this.$fixDigitNum);

        if (this.blblGap) {
            egret.Tween.removeTweens(this.blblGap);
            (this.blblGap as eui.BitmapLabel).y = this.$blblGapOriginY;
            (this.blblGap as eui.BitmapLabel).text = `+${strGap}`;
            (this.blblGap as eui.BitmapLabel).alpha = 1;
            (this.blblGap as eui.BitmapLabel).visible = true;
            let tw = egret.Tween.get(this.blblGap);
            tw.to({ "alpha": 0, "y": this.$blblGapOriginY - 15 }, 666).call(() => {
                (this.blblGap as eui.BitmapLabel).visible = false;
                (this.blblGap as eui.BitmapLabel).alpha = 1;
                (this.blblGap as eui.BitmapLabel).y = this.$blblGapOriginY;
            });
        }
    }

    public play() {
        if (!this.upgradeFx) return;
        if (this.upgradeFx.isPlaying) return;
        this.aniVisible = true;
        this.upgradeFx.play(0);
    }

    public stop() {
        if (!this.upgradeFx) return;
        this.aniVisible = false;
        this.upgradeFx.stop();
    }

    public refresh(cur: number, max: number) {
        this.value = cur;
        this.maximum = max;
    }

    public $onRemoveFromStage() {
        if (this.blblGap) {
            egret.Tween.removeTweens(this.blblGap);
        }
        super.$onRemoveFromStage();
    }
}
