import { ObjectTypeEnum } from "auto/object_type_enum";
import { TypeEnum } from "base/Enum";
import { uiSkinPath } from "GlobalValue";
import { EgretExEntry } from "lib/EgretExUtils_Entry";
import { SkillGridAniComp } from "lib/euiex/SkillGridAniComp";
import { SkillPPCompTreeCfgs, SkillPPCompTreeCfgType, SkillPPGridComp_Feature, SkillPPGridComp_Intro, SkillPPGridComp_Selected, SkillPPGridCompEnum } from "lib/euiex/SkillPPGridComp";
import { ItemUtils } from "s2/bag/ItemUtils";
import { SkillTipsPanel } from "tips/SkillTipsPanel";
import { loadResource } from "utils/ResUtils";

export interface SkillPPGrid {
    grpRoot: eui.Group;
    imgIcon: eui.Image;
    grpReddot: eui.Group;
    imgBg: eui.Image;

}

/**
 * 守护（伙伴）技能格子
 */
export class SkillPPGrid extends eui.ItemRenderer {
    public _isEuiex = true;

    ////////////////////////(自定义)
    protected $custom: EgretExEntry.SkillGridData;
    protected $customShow: EgretExEntry.SkillGridShowData;
    private $mc: egret.MovieClip; //升级动画
    private $showTips: boolean;

    private $touchFunc: Function;
    private $touchFuncObj: any;
    private $touchFuncArgs: any;

    private _featureComp: SkillPPGridComp_Feature; //技能定位
    private _introComp: SkillPPGridComp_Intro; //技能简介
    private _selectedComp: SkillPPGridComp_Selected; //选中框
    protected _commonAni: SkillGridAniComp;// 通用动效

    /**
     * 资源预加载
     * @param data 
     * @returns 
     */
    public static preloadResource(data: EgretExEntry.SkillGridData) {
        if (!data) return
        // imgFrame 底板
        eui.getAssetsAsync(data.quality ? `pet_skill_frame_${data.quality}_png` : `pet_skill_frame_0_png`);
        // imgIcon 
        data.icon && loadResource(ItemUtils.getItemByIcon(data.icon, TypeEnum.SKILL));
    }

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

    public constructor() {
        super();

        this.skinName = uiSkinPath("SkillGrid_PP.exml");
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
                this.imgIcon.source = ItemUtils.getItemByIcon(data.icon, TypeEnum.SKILL);

                /**
                 * 竖的(intro)：miao1、miao3、miao5
                 * 横的(feature)：danti、miaoer、miaowu
                 */
                //技能简介 intro
                this.introComp.visible = false;
                if (data.intro) {
                    this.introComp.visible = true;
                    this.introComp.setBg(`com_tag_name_${data.tagBg}_png`);
                    this.introComp.setText(data.intro);
                }
                //技能定位 feature
                this.featureComp.visible = false;
                if (data.feature) {
                    this.featureComp.visible = true;
                    this.featureComp.setText(data.feature);
                }

                //品质框
                if (data.quality) {
                    this.imgBg.source = data.quality ? `pet_skill_frame_${data.quality}_png` : `pet_skill_frame_0_png`;
                }

            }
            this.selectedComp && (this.selectedComp.visible = this.selected);
        }
    }

    private $reset() {
        this.selectedComp && (this.selectedComp.visible = false);
        this.grpReddot && (this.grpReddot.visible = false);
        this.imgIcon && (this.imgIcon.visible = true);
        this._featureComp && (this._featureComp.visible = false);
        this._introComp && (this._introComp.visible = false);
        this.imgBg.source = `pet_skill_frame_0_png`;
    }

    public setCustomShow(showData: EgretExEntry.SkillGridShowData) {
        this.$customShow = showData;
        this.$reset();
        this.$updateCustomShow();
    }

    protected $updateCustomShow() {
        if (!this.$customShow) return;
        if (this.completed) {
            if (this.$customShow.imgSelected != undefined) { this.selectedComp.visible = this.$customShow.imgSelected; };
            if (this.$customShow.imgSignReddot != undefined) { this.grpReddot.visible = this.$customShow.imgSignReddot; };
            if (this.$customShow.imgIcon != undefined) { this.imgIcon.visible = this.$customShow.imgIcon; };
        }
    }

    protected $setSelected(value: boolean) {
        super.$setSelected(value);
        this.selectedComp && (this.selectedComp.visible = this.selected);
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
            inst.setData(data);
        });
    }

    /*****************************************************************************
     * 组件相关开始
     *****************************************************************************/
    public addToWidget(widget: egret.DisplayObject, compTag: SkillPPGridCompEnum) {
        if (!widget.parent) {
            let compCfg = SkillPPCompTreeCfgs[compTag];
            widget["order"] = compCfg.order;
            this.addChildByOrder(compCfg, widget);
        }
    }

    public addChildByOrder(comCfg: SkillPPCompTreeCfgType, widget: egret.DisplayObject) {
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

    public get featureComp(): SkillPPGridComp_Feature {
        if (!this.completed) return null;
        if (!this._featureComp) {
            this._featureComp = new SkillPPGridComp_Feature();
            this._featureComp.horizontalCenter = 0;
            this._featureComp.bottom = -10;
        }
        this.addToWidget(this._featureComp, SkillPPGridCompEnum.FeatureComp);
        return this._featureComp;
    }

    public get introComp(): SkillPPGridComp_Intro {
        if (!this.completed) return null;
        if (!this._introComp) {
            this._introComp = new SkillPPGridComp_Intro();
            this._introComp.left = -4;
            this._introComp.top = -1;
        }
        this.addToWidget(this._introComp, SkillPPGridCompEnum.IntroComp);
        return this._introComp;
    }

    public get selectedComp(): SkillPPGridComp_Selected {
        if (!this.completed) return null;
        if (!this._selectedComp) {
            this._selectedComp = new SkillPPGridComp_Selected();
            this._selectedComp.horizontalCenter = 0;
            this._selectedComp.verticalCenter = 0;
        }
        this.addToWidget(this._selectedComp, SkillPPGridCompEnum.SelectedComp);
        return this._selectedComp;
    }

    public get commonAni(): SkillPPGridComp_Selected {
        if (!this.completed) return null;
        if (!this._commonAni) {
            this._commonAni = new SkillGridAniComp();
            this._commonAni.horizontalCenter = 0;
            this._commonAni.verticalCenter = 0;
        }
        this.addToWidget(this._commonAni, SkillPPGridCompEnum.SelectedComp);
        return this._commonAni;
    }

    public setCommonAni(baseSkinName: string, state: string = undefined) {
        this._commonAni && this._commonAni.setAniSkinName(baseSkinName, state)
        return this._commonAni;
    }
}