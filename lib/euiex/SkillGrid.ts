import { ObjectTypeEnum } from "auto/object_type_enum";
import { EgretExEntry } from "lib/EgretExUtils_Entry";
import { ItemSkillGrid_Tick } from "lib/euiex/ItemSkillGrid_Tick";
import { SkillTipsPanel } from "tips/SkillTipsPanel";
import { SkillCompTreeCfgType, SkillCompTreeCfgs, SkillGridCompEnum, SkillGridComp_BgName } from "./SkillGridComp";
import { ItemUtils } from "s2/bag/ItemUtils";
import { TypeEnum } from "base/Enum";

export interface SkillGrid {
    grpRoot: eui.Group;
    imgMask: eui.Image;
    imgFrame: eui.Image;
    imgIcon: eui.Image;
    imgFrameF: eui.Image;
    grpSelected: eui.Group;
    compTick: ItemSkillGrid_Tick;
    grpInfo: eui.Group;
    // grpFeature: eui.Group;
    // imgFeature: eui.Image;
    compFeature: eui.Component;
    imgLv: eui.Image;
    grpValue: eui.Group;
    lblValue: eui.Label;
    grpTag: eui.Group;
    imgTag: eui.Image;
    grpReal: eui.Group;
    imgXuan: eui.Image;
    grpTag0: eui.Group;
    imgSkillTag: eui.Image;
    lbFeature: eui.Label;
    grpReddot: eui.Group;

    grpZhuan?: eui.Group;
    lbZhuan?: eui.Label;
}

/**
 * 技能格子
 */
export class SkillGrid extends eui.ItemRenderer {
    public _isEuiex = true;

    ////////////////////////(自定义)
    protected $custom: EgretExEntry.SkillGridData;
    protected $customShow: EgretExEntry.SkillGridShowData;
    private $mc: egret.MovieClip; //升级动画
    private $showTips: boolean;
    private $showTag: boolean = true;//显示定位

    private $touchFunc: Function;
    private $touchFuncObj: any;
    private $touchFuncArgs: any;

    public openTipsState: "ourSkillTips" | "enemySkillTips" = "ourSkillTips"

    private _bgNameComp: SkillGridComp_BgName;

    public setTouchFunc(func: Function, thisObj?: any, args?: any) {
        this.$touchFunc = func;
        this.$touchFuncObj = thisObj;
        this.$touchFuncArgs = args;
    }

    public clearTouchFunc() {
        this.$touchFunc = undefined;
        this.$touchFuncObj = undefined;
        this.$touchFuncArgs = undefined;
    }

    /**是否弹出提示 */
    public setShowTips(isShow: boolean) {
        this.$showTips = isShow;
        if (isShow && this.completed) {
            this.addEventListener(egret.TouchEvent.TOUCH_TAP, this.$onTouchedItem, this);
        }
    }

    public setShowTag(isShow: boolean) {
        this.$showTag = isShow;
    }

    public constructor() {
        super();
        this.skinName = "resource/eui_skins/SkillGrid_Circle.exml";
        this.$customShow = {};
    }

    protected onSkinLoadCompleted() {
        super.onSkinLoadCompleted();
        this.$reset();
        this.$updateCustomData();
        this.$updateCustomShow();
        if (this.$showTips && this.completed) {
            this.addEventListener(egret.TouchEvent.TOUCH_TAP, this.$onTouchedItem, this);
        }
    }

    protected dataChanged() {
        super.dataChanged();
        this.$custom = this.data;
        this.$updateCustomData();
    }


    public setShowData(data: EgretExEntry.SkillGridData) {
        this.$custom = data;
        this.$updateCustomData();
    }

    protected $updateCustomData() {
        if (this.completed) {
            if (this.$custom) {
                let data = this.$custom;
                this.lbFeature.text = data.feature || "";
                this.imgIcon.source = ItemUtils.getItemByIcon(data.icon, TypeEnum.SKILL);
                this.imgXuan.visible = data.state == 1;
                if (this.grpZhuan) {
                    this.grpZhuan.visible = !!data.rebornLev;
                    this.lbZhuan.text = data.rebornLev;
                }

                /**
                 * 竖的(intro)：miao1、miao3、miao5
                 * 横的(feature)：danti、miaoer、miaowu
                */
                //技能简介 intro
                this.grpTag.visible = this.$showTag && !!data.intro;
                if (data.intro) {
                    this.imgTag.source = `skillsheet_json.skill_grid_tag_${data.intro}`;
                }
                //技能定位 feature
                this.compFeature.visible = false;
                if (data.feature) {
                    this.compFeature.visible = true;
                    // this.imgFeature.source = `skillsheet_json.skill_grid_tag_${data.feature}`;
                    this.compFeature.currentState = data.feature;
                }
                this.imgFrameF.source = data.quality ? `pet_skill_frame_${data.quality}_png` : 'pet_skill_frame_0_png'
            }
            this.grpSelected && (this.grpSelected.visible = this.selected);
        }
    }

    private $reset() {
        this.grpZhuan && (this.grpZhuan.visible = false);
        this.grpSelected && (this.grpSelected.visible = false);
        this.grpReddot && (this.grpReddot.visible = false);
        this.lbFeature && (this.lbFeature.text = "");
        this.imgXuan && (this.imgXuan.visible = false);
        this.imgIcon && (this.imgIcon.visible = true);
        this._bgNameComp && (this._bgNameComp.visible = false);
    }

    public setCustomShow(showData: EgretExEntry.SkillGridShowData) {
        this.$customShow = showData;
        this.$reset();
        this.$updateCustomShow();
    }

    protected $updateCustomShow() {
        if (!this.$customShow) return;
        if (this.completed) {
            if (this.$customShow.grpZhuan != undefined) { this.grpZhuan.visible = this.$customShow.grpZhuan; };
            if (this.$customShow.imgSelected != undefined) { this.grpSelected.visible = this.$customShow.imgSelected; };
            if (this.$customShow.imgSignReddot != undefined) { this.grpReddot.visible = this.$customShow.imgSignReddot; };
            if (this.$customShow.imgXuan != undefined) { this.imgXuan.visible = this.$customShow.imgXuan; };
            if (this.$customShow.imgIcon != undefined) { this.imgIcon.visible = this.$customShow.imgIcon; };
            if (this.$customShow.grpTag != undefined) { this.grpTag.visible = this.$customShow.grpTag; };
            // if (this.$customShow.grpFeature != undefined) { this.grpFeature.visible = this.$customShow.grpFeature; };
            if (this.$customShow.grpFeature != undefined) { this.compFeature.visible = this.$customShow.grpFeature; };
            if (this.$customShow.bgName != undefined) { this.bgName.setText(this.$customShow.bgName); this._bgNameComp.visible = true; };
        }
    }

    protected $setSelected(value: boolean) {
        super.$setSelected(value);
        this.grpSelected && (this.grpSelected.visible = this.selected);
    }

    public onClose() {
        this.selected = false;
        if (this.$mc) {
            this.$mc.visible = false;
            this.$mc.stop();
        }
    }

    public destroy() {
        if (this.$mc) {
            if (this.$mc.parent) {
                this.$mc.parent.removeChild(this.$mc);
            }
            this.$mc = null;
        }
        this.clearTouchFunc();
    }

    protected $onTouchedItem() {
        if (this.$touchFunc) {
            this.$touchFunc.call(this.$touchFuncObj, this.$touchFuncArgs);
            return;
        }
        let data = this.$custom;
        UIManager.open(SkillTipsPanel).then((inst: SkillTipsPanel) => {
            inst.setData(data, this.openTipsState);
        });
    }

    /*****************************************************************************
     * 组件相关开始
     *****************************************************************************/
    public addToWidget(widget: egret.DisplayObject, compTag: SkillGridCompEnum) {
        if (!widget.parent) {
            let compCfg = SkillCompTreeCfgs[compTag];
            widget["order"] = compCfg.order;
            this.addChildByOrder(compCfg, widget);
        }
    }

    public addChildByOrder(comCfg: SkillCompTreeCfgType, widget: egret.DisplayObject) {
        let parent = this[comCfg.parent];
        if (!parent) {
            egret.log("no such parent object:", comCfg.parent, comCfg, this.skinName)
            return;
        }
        let index = parent.numChildren + 1;
        for (let i = 0, l = parent.numChildren; i < l; i++) {
            let comp = parent.getChildAt(i);
            if ((comp["order"] || 0) > comCfg.order) {
                index = i;
                break;
            }
        }
        parent.addChildAt(widget, index);
    }


    /**
     * 带底板的名称
     */
    public get bgName(): SkillGridComp_BgName {
        if (!this.completed) return null;
        if (!this._bgNameComp) {
            this._bgNameComp = new SkillGridComp_BgName();
        }
        this.addToWidget(this._bgNameComp, SkillGridCompEnum.BgNameComp);
        return this._bgNameComp;
    }
}