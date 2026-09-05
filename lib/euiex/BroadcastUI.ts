import { dealTouchMsg } from "chat/ChatUtils";
import { GlobalValue } from "GlobalValueDefine";
import { setBroadcastBlock } from "utils/BroadcastUtils";
import { RichLabelEvent } from "GlobalEvent";
import { uiPath2 } from "GlobalValue";

export interface BroadcastUI {
    grpTips: eui.Group;
    imgMask: eui.Image;
    rblContent: RichLabel;
    btnClose: eui.Button;
}
export class BroadcastUI extends eui.Component {
    /** 样式配置 0：状态 1：动画 */
    private static readonly style = {
        0: ["nor", "redpack", "preteam"],
        1: [],
    }

    public _isEuiex = true;

    private msgStr: string;
    private nextFun: Function;
    private curTween: string;
    private style: number;

    public constructor() {
        super();
        this.skinName = uiPath2("main/hangup/MainHangUp_TopTips.exml");
    }

    protected onSkinLoadCompleted() {
        super.onSkinLoadCompleted();
        this.btnClose.addEventListener(egret.TouchEvent.TOUCH_TAP, this.onTouchTapBtnClose, this);
        // this.rblContent.mask = this.imgMask;
        this.rblContent.addEventListener(RichLabelEvent.RBL_TOUCH_EVENT, dealTouchMsg, this);
        // this.rblContent.addEventListener(RichLabelEvent.RBL_LAYOUT_CHANGED, this.playTween, this);
        this.rblContent.touchThrough = true;
        this.setRblText();
        this.touchEnabled = false;
    }

    @SafeCallFunction()
    public setStyle(value: number) {
        if (isVain(value)) value = 0;//做个兼容
        this.style = value;
        let [state, tween] = BroadcastUI.style[value];

        if (state) {
            this.currentState = state;
            this.validateNow();
        }

        this.curTween && (this[`${this.curTween}`] as egret.tween.TweenGroup).stop();

        if (tween) {
            tween && (this[`${tween}`] as egret.tween.TweenGroup).play(0);
            this.curTween = tween;
        }
    }

    public setText(text: string, nextFun: Function) {
        this.msgStr = text;
        this.nextFun = nextFun;
        this.setRblText();
    }

    private setRblText() {
        if (this.completed && this.msgStr) {
            this.rblContent.text = this.msgStr;
            this.playTween();
        }
    }

    private playTween() {
        egret.Tween.removeTweens(this.rblContent);
        let tw = egret.Tween.get(this.rblContent);
        tw.to({ x: this.imgMask.width }, 0)
        tw.to({ x: -this.rblContent.width }, (this.imgMask.width + this.rblContent.width) * GlobalValue.MagicLampSpeed);
        tw.call(() => {
            egret.Tween.removeTweens(this.rblContent)
            this.nextFun && this.nextFun(this.style);
        }, this);
    }

    private onTouchTapBtnClose() {
        egret.Tween.removeTweens(this.rblContent);
        setBroadcastBlock();
        this.nextFun && this.nextFun(this.style);
    }

    public destroy() {
        this.rblContent.removeEventListener(RichLabelEvent.RBL_TOUCH_EVENT, dealTouchMsg, this);
        egret.Tween.removeTweens(this.rblContent);
        this.parent && this.parent.removeChild(this);
    }
}
