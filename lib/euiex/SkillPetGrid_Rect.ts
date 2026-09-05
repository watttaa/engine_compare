import { ItemMcTypeEnum, TypeEnum } from "base/Enum";
import { ObjectTypeEnum } from "auto/object_type_enum";
import { ItemMCSelectControl } from "common/ItemMCSelectControl";
import { GlobalValue } from "GlobalValueDefine";
import { ItemUtils } from "s2/bag/ItemUtils";

export class SkillPetGrid_Rect extends eui.ItemRenderer {
    public _isEuiex = true;
    grpFloor: eui.Group;
    imgFrame: eui.Image;
    imgIcon: eui.Image;
    imgFrameF: eui.Image;
    grpNum: eui.Group;
    labelNum: eui.Label;
    grpMc: eui.Group;

    private $mc: ItemMCSelectControl;

    @SafeCallFunction()
    public setData(icon: string, quality: number, count: number) {
        this.imgFrame.source = GlobalValue.QuaBorder[quality];
        this.imgFrameF.source = GlobalValue.QuaFrame[quality];
        this.imgIcon.source = ItemUtils.getItemByIcon(icon, TypeEnum.SKILL);
        this.labelNum.text = count.toString();
        // if (!this.$mc) {
        //     this.grpMc.touchChildren = false;
        //     this.$mc = new egret.MovieClip();
        //     this.$mc.touchEnabled = false;
        //     this.$mc.blendMode = egret.BlendMode.NORMAL;
        //     this.grpMc.addChild(this.$mc);
        // }
        this.resetQualityAni(quality);
    }

    public resetQualityAni(quality: number) {
        if (!this.$mc) {
            this.$mc = ItemMCSelectControl.create(this.grpMc, ItemMcTypeEnum.MovieClip);
        }
        this.$mc.resetQualityAni(quality);
        // let skin = GlobalValue.QuaMcName[quality];
        // if (skin) {
        //     if (!this.grpMc) {
        //         return Logger.error(` ${this.skinName} 不包含 grpMc 请联系UI同学添加`);
        //     }
        //     if (!this.$mc) {
        //         this.grpMc.touchChildren = false;
        //         this.$mc = new egret.MovieClip();
        //         this.$mc.touchEnabled = false;
        //         this.$mc.blendMode = egret.BlendMode.NORMAL;
        //         this.grpMc.addChild(this.$mc);
        //     }
        //     // this.$mc.scaleX = this.$mc.scaleY = 2;
        //     this.$mc.visible = true;
        //     getMCData(`resource/assets/animate/${skin}.json`, this.onMCDataComplete, this);
        // } else {
        //     if (this.$mc) {
        //         this.$mc.stop();
        //         this.$mc.visible = false;
        //     }
        // }
    }

    protected onSkinLoadCompleted() {
        super.onSkinLoadCompleted();
        //GlobalEvent.ListenEvent(ItemMCSelectControl.ITEM_MCSELCT_CREATE, this.listenItemMcCreate, this);
    }

    $onRemoveFromStage() {
        //GlobalEvent.UnListenEvent(ItemMCSelectControl.ITEM_MCSELCT_CREATE, this.listenItemMcCreate, this);
        super.$onRemoveFromStage();
    }

    //剔除多余的引用
    public listenItemMcCreate(evt: egret.Event): void {
        let ctrl = evt.data[0] as ItemMCSelectControl;
        if (!this.$mc || !(ctrl instanceof ItemMCSelectControl)) return;
        if (ctrl.hashCode == this.$mc.hashCode) {
            let grpParent = this.grpMc;
            if (ctrl.grpParent && grpParent) {
                if (ctrl.grpParent.hashCode != grpParent.hashCode) {
                    this.$mc = null;
                }
            }
        }
    }
}
