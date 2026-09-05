import { SoundUIType } from "base/Enum";
import { BehaviorBaseWidget } from "behaviorCamp/BehaviorBaseView";
import { SOUND_CUSTOM_CLICK_SHOP, SOUND_CUSTOM_REWARD, SOUND_CUSTOM_VICTORY } from "GlobalText";
import { GlobalValue } from "GlobalValueDefine";
import { CallManyTimes } from "lib/Timer_CallManyTimes";

/**
 * 自动关闭基类
 */
export class BaseAutoCloseWidget extends BehaviorBaseWidget {

    protected lblTimeDown: eui.Label;
    protected countdownAutoClose: number;
    /**
     * 界面自动关闭倒计时
     */
    private $autoCloseTimer: CallManyTimes;
    /**特殊处理的
     * 猜测是 是否有奖励列表显示
     */
    protected isAward: boolean;

    /**猜测，是否要自动关闭 */
    protected isAutoClose: boolean;

    protected openSound: SoundUIType;

    protected initBehavior(): void {

    }

    protected initData(): void {
        this.countdownAutoClose = GlobalValue.CountdownFive;
        this.isAward = false;
        this.isAutoClose = true;
        this.openSound = SoundUIType.NONE;
    }

    public onOpen(visChanged?: boolean, playOpenAni?: boolean): void {
        this.initData();
        super.onOpen(visChanged, playOpenAni);
        this.beforeDelayAni();
        this.stopAutoCloseTimer();
        if (!this.isAward) {
            this.startAutoCloseTimer();
        }
        this.updataDelayAni();
        this.playOpenSound();
    }

    public playOpenSound() {
        if (this.openSound == SoundUIType.VICTORY) {
            SoundUtils.getMgrInstance().playUISoundEffect(SOUND_CUSTOM_VICTORY);
        } else if (this.openSound == SoundUIType.REWARD) {
            SoundUtils.getMgrInstance().playUISoundEffect(SOUND_CUSTOM_REWARD);
        } else if (this.openSound == SoundUIType.MAll) {
            SoundUtils.getMgrInstance().playUISoundEffect(SOUND_CUSTOM_CLICK_SHOP);
        }
    }


    /**动画后 */
    public updataDelayAni(): void {

    }

    /**动画前 */
    public beforeDelayAni(): void {

    }

    public startAutoCloseTimer() {
        if (this.isAutoClose) {
            this.setLblTimeDownVis(true);
            let maxCountdown = this.countdownAutoClose;
            this.refreshCountdown(maxCountdown);
            if (!this.$autoCloseTimer) {
                this.$autoCloseTimer = new CallManyTimes(maxCountdown, 1000, this.refreshCountdown, [], this, this.onCountdownCompleted);
            }
            this.$autoCloseTimer.restart();
        }
    }

    public setMaxCountdown(maxCD: number): void {
        if (this.$autoCloseTimer) {
            this.countdownAutoClose = maxCD;
            this.$autoCloseTimer.setMaxCountAndRestart(maxCD);
        }
    }

    public stopAutoCloseTimer() {
        this.setLblTimeDownVis(false);
        if (this.$autoCloseTimer) {
            this.$autoCloseTimer.stop();
        }
    }

    private refreshCountdown(remainCount: number) {
        this.setLblTimeDownLab(remainCount);
    }

    protected onCountdownCompleted(): void {
        this.closeSelf();
    }

    protected setLblTimeDownLab(remainSecond: number): void {
        if (!remainSecond || remainSecond < 0) {
            remainSecond = 0;
        }
        if (this.lblTimeDown) {
            this.lblTimeDown.text = this.lblTimeDown.text.replace(/\d+/g, "" + remainSecond);
        }
    }

    /**逻辑好乱，todo整理成倒计时类型？ */
    protected setLblTimeDownVis(vis: boolean) {
        if (this.lblTimeDown) {
            this.lblTimeDown.visible = vis;
        }
    }

    private $destroyTimer() {
        if (this.$autoCloseTimer) {
            this.$autoCloseTimer.cancel();
            this.$autoCloseTimer = null;
        }
    }

    public onClose(visChanged?: boolean): void {
        this.$destroyTimer();
        super.onClose(visChanged);
    }


    public onDestroy(): void {
        this.$destroyTimer();
        super.onDestroy();
    }
}

/**自动关闭的BaseWidget */
export class ResultBaseUIWidget extends BaseAutoCloseWidget {

    // private in: egret.tween.TweenGroup;
    // private loop: egret.tween.TweenGroup;
    private anim_stop: egret.tween.TweenGroup;


    protected setAnimStopNull(): void {
        this.anim_stop = null;
    }

    public onClose(): void {
        this.in && this.in.stop();
        this.loop && this.loop.stop();
        if (this.anim_stop) {
            this.anim_stop.stop();
        }
        super.onClose();
    }


    public destroy(): void {
        if (this.anim_stop) {
            this.anim_stop.stop();
            this.anim_stop = null
        }
        super.destroy();
    }

}