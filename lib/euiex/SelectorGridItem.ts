import { s2_global_value_cfg } from "auto/global_value";
import { uiSkinPath } from "GlobalValue";
import { GlobalValue } from "GlobalValueDefine";
import { EgretExEntry } from "lib/EgretExUtils_Entry";

export class SelectorGridItem extends eui.ItemRenderer {
    public _isEuiex = true;
    //五行，品质，类型，特性，伤害类型
    private $SelType: EgretExEntry.FollowerSelEntry;//"elem"|"quality"|"type"|"talent"|"hurt";
    private $value: number;

    imgIcon: eui.Image;
    grpSelected: eui.Group;//选中框
    grpReddot: eui.Group;

    constructor() {
        super();
        this.skinName = uiSkinPath("ElemSelectorSkin_RowItem.exml");
    }

    $onRemoveFromStage() {
        super.$onRemoveFromStage();
    }

    protected onSkinLoadCompleted() {
        super.onSkinLoadCompleted();
        // this.imgIcon.addEventListener(egret.TouchEvent.TOUCH_TAP, this.onTouchItem, this);
    }

    dataChanged() {
        let data = this.data as [EgretExEntry.FollowerSelEntry, number];
        this.$SelType = data[0] as EgretExEntry.FollowerSelEntry;
        this.$value = data[1] as number;
        let selType = this.$SelType == EgretExEntry.FollowerSelEntry.talent ? "trait" : this.$SelType
        if (this.$SelType != EgretExEntry.FollowerSelEntry.iFightNum) {
            this.imgIcon.source = this.$value == 0 ? `icon_type_0_png` : `icon_${selType}_${this.$value}_png`;
        } else {
            this.imgIcon.source = this.$value == 0 ? `icon_type_0_png` : `icon_${selType}_${s2_global_value_cfg.GlobalValueInfo["G_LINEUP_FIGHT_NUM"][this.$value]}_png`;
        }
        //icon_quality_1_png
        this.grpReddot.visible = false;//红点
        this.grpSelected.visible = this.selected;//选中
        // this.selected = false;//当前出战
    }

    // protected onTouchItem() {
    // }

    protected $setSelected(value: boolean) {
        super.$setSelected(value);
        if (this.grpSelected) {
            this.grpSelected.visible = value;
        }
    }
}