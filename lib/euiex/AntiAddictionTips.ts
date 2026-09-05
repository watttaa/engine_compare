import { ChildPayLimitTips } from "AntiAddiction/AntiAddication";
import { ComponentEx } from "lib/euiex/ComponentEx";

export class AntiAddictionTips extends ComponentEx{
    //grpMain: eui.Group;

    public constructor() {
        super();
        this.skinName = "resource/eui_skins/S2/FangchenmiTips.exml";
    }

    onSkinLoadCompleted(){
        super.onSkinLoadCompleted();
        this.addEventListener(egret.TouchEvent.TOUCH_TAP, this.openPanel, this);
    }

    private openPanel(){
        O3(ChildPayLimitTips, null, this);
    }

    $onRemoveFromStage(){
        this.removeEventListener(egret.TouchEvent.TOUCH_TAP, this.openPanel, this);
        super.$onRemoveFromStage();
    }
}