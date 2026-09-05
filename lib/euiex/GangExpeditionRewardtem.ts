import { ItemUtils } from "s2/bag/ItemUtils";

export interface GangExpeditionRewardtem {
    loop: egret.tween.TweenGroup;
    glow: eui.Image;
    grpEff: eui.Group;
    imgIcon: eui.Image;
}

export class GangExpeditionRewardtem extends BaseWidgetItemRender {
    protected onSkinLoadCompleted() {
        super.onSkinLoadCompleted();
    }

    @SafeCallFunction()
    public dataChanged() {
        super.dataChanged();
        if (this.data.customIcon) {
            this.imgIcon.source = this.data.customIcon
        } else {
            this.imgIcon.source = ItemUtils.getItemByIcon(this.data.itemInfo.icon, this.data.itemInfo.type)
        }

        if (this.data.leftProgress > 0) {
            this.grpEff.visible = false;
            this.loop.stop();
        }
        else {
            this.grpEff.visible = true;
            this.loop.play();
        }
    }
}