import { s2_itemtag_cfg } from "auto/ItemTag";
import { HeroMainModel } from "heroMain/HeroMainModel";
import { ui_utils_hide } from "utils/UIUtils_hide";

export class WarObjLowLvComponent extends eui.Component {
    public _isEuiex = true;

    state: "digong" | "guaji" | "";
    lblLowLv: eui.Label;
    grpLowLvBubble: eui.Group;
    lblLowLvTips: eui.Label;
    touchArea: eui.Rect;

    public constructor() {
        super();
        this.skinName = 'resource/eui/WarObj_LowLv.exml';
    }

    protected onSkinLoadCompleted(): void {
        super.onSkinLoadCompleted();
        this.touchArea.addEventListener(egret.TouchEvent.TOUCH_TAP,this.onTouchTaplHanlder,this);
        ui_utils_hide.hideOnTouchTapOutside_(this.grpLowLvBubble);
    }

    public removeChildren(): void {
        super.removeChildren();
        this.touchArea.removeEventListener(egret.TouchEvent.TOUCH_TAP,this.onTouchTaplHanlder,this);
    }

    @SafeCallFunction()
    public setData(state: "digong" | "guaji", minLevel: number, text: string) {//表格中的tagId
        this.currentState = state;
        this.grpLowLvBubble.visible = false;
        this.lblLowLvTips.text = text;
    }

    protected onTouchTaplHanlder(): void {
        this.grpLowLvBubble.visible = !this.grpLowLvBubble.visible;
    }
}