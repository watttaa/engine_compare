import { TweenGroupPanel } from "lib/TweenGroupPanel";
import { UIManagerFactroy } from "lib/UIManagerFactory";
import { StartUpMaxCnt } from "GlobalValue";

export class SoulUpgradeBtn extends eui.Component {
    public _isEuiex = true;
    public imgStar: eui.Image;
    public touchRect: eui.Rect;
    public grpNum: eui.Group;
    public lblNum1: eui.Label;
    public lblNum2: eui.Label;
    public labelDisplay: eui.Label;
    public grpLock: eui.Group;
    public AniCommonPointLight: eui.Group;
    public imgTips: eui.Rect;

    private maxCnt: number;//当前最大开放数量（比如绿色召唤兽开放三个，白金召唤兽开放6个）

    private selfIdx: number;
    private curIdx: number;
    private propDict: { [key: string]: number };
    private unlockTween: TweenGroupPanel;

    private green: egret.tween.TweenGroup;
    private callBackCfg: CallbackConfig;

    private constructor() {
        super();
        this.skinName = "resource/eui/StarUpNode.exml";
        this.propDict = undefined;
        this.callBackCfg = null;
    }

    protected onSkinLoadCompleted() {
        super.onSkinLoadCompleted();
        this.touchRect.addEventListener(egret.TouchEvent.TOUCH_TAP, this.swithShowProp, this);
    }

    public $onRemoveFromStage() {
        super.$onRemoveFromStage();
        if (this.unlockTween) {
            this.unlockTween.destroy();
            this.unlockTween = null;
            this.propDict = undefined;
        }
    }

    private swithShowProp() {
        this.showPropTips();
    }

    private showPropTips() {
        if (!this.propDict) return;
        // GlobalEvent.SendEvent(FOLLOWER_EVENT.EVENT_SHOW_PROP_TIPS, this.propDict, this.imgTips, PropTipsType.name_value);
        // showPopPropTips(this.propDict, this.imgTips, PropTipsType.name_value)
    }

    public initData(selfIdx: number, curIdx: number, propDict: { [key: string]: number }, maxCnt: number) {
        this.selfIdx = selfIdx;
        this.curIdx = curIdx;
        this.maxCnt = maxCnt;
        this.propDict = propDict;
        this.updateState();
        this.checkTips();
    }

    @SafeCallFunction()
    public playLightAni(callBackCfg: CallbackConfig = null) {
        this.callBackCfg = callBackCfg;
        if (!this.unlockTween) {
            this.unlockTween = UIManagerFactroy.createTweenGroupPanel(this.AniCommonPointLight, "resource/eui_skins/AniCommonPointLight.exml");
        }
        this.unlockTween.play(1, this.execCallBack, this);
        this.currentState = "Light";//点亮完要变成点亮状态
        this.validateNow();
    }

    public isPlaying() {
        if (this.unlockTween && this.unlockTween.playing) {
            return true;
        }
        return false;
    }

    private execCallBack() {
        if (this.callBackCfg) {
            this.callBackCfg.callbackFunc.call(this.callBackCfg.thisObject, this.callBackCfg.args);
            this.callBackCfg = null;
        }
    }

    public updateState() {
        //未点亮常规状态， 当前需要点亮，   已点亮常规状态，
        //["Lock",        "Current"  ,     "Unlock"     ]
        let isCur = this.selfIdx == this.curIdx;//当前
        let isLight = this.selfIdx < this.curIdx;//已解锁+已点亮
        let isUnlight = this.selfIdx > this.curIdx && this.selfIdx < this.maxCnt;//已解锁+未点亮
        let isLock = this.selfIdx >= this.maxCnt && this.selfIdx < StartUpMaxCnt;
        let isPlay = isCur || isLight
        if (isCur) {//当前
            this.currentState = "Current";
        } else if (isUnlight) {//未点亮
            this.currentState = "Unlight";
        } else if (isLight) {//已点亮
            this.currentState = "Light";
        } else if (isLock) {//当前品质未开放的槽
            this.currentState = "Lock";
        }
        if (isPlay) {
            this.green.play(0);
        }
        else {
            this.green.stop();
        }
    }

    public checkTips() {
        if (this.currentState == "Current") {
            this.showPropTips();
        }
    }

}
