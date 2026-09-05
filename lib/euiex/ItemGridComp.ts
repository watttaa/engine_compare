import { uiSkinPath2 } from "GlobalValue";
import { PPStarComp } from "lib/euiex/PPStarComp";
import { ItemInfo } from "s2/bag/ItemInfo";
import { BaseGrid } from "./BaseGrid";
import { TagSkin } from "lib/euiex/TagSkin";
import { TagSkinEx } from "lib/euiex/TagSkinEx";
import { CommonAniComp } from "lib/euiex/AniActivityRewardLight";
import { ui_utils_constraint } from "utils/UIUtils_constraint";
import { s2_text_utils } from "auto/text";
import { ConstraintEnum } from "base/Enum";
import { ui_utils_equip } from "utils/UIUtils_equip";
import { ui_utils_tag } from "utils/UIUtils_tag";
import { s2_itemtag_cfg } from "auto/ItemTag";
import { ItemGridCompEnum } from "lib/euiex/ItemGridCompConst";
import { CompTreeCfgs } from "lib/euiex/FollowerItemComponent";

/**
 * 0.8倍物品格子
 * 存在意义：皮肤中图片缩放，字体不放放
 */
export class ItemGridComp extends BaseGrid {
    public _isEuiex = true;

    //角标
    private _imgRightTag: eui.Image;
    private _tagLow: TagSkin;
    private _tag: TagSkin;
    private _tagEx: TagSkinEx;
    private _starComp: ItemGridComp_Star;
    private _barComp: eui.ProgressBar;
    private _lowStar: eui.Image;
    private _lblObj: ItemGridComp_Lb;
    private _lblStrengUp: ItemGridComp_Lb;
    private _labelName: ItemGridComp_Lb;
    private _compSel: eui.Component;
    private _redComp: eui.Component;
    private _rectMask: eui.Rect;
    private _imgCenter: eui.Image;
    private _imgRightTop: eui.Image;//右上角角标
    protected _commonAni: CommonAniComp;// 通用动效
    protected $needSelect: boolean;
    // 选中框类型
    protected selType: number;

    public isDynamicRedPoint = true; // 用来标识组件是动态红点，使红点管理器取其redComp组件

    public set needSelect(value: boolean) {
        this.$needSelect = value;
    }

    protected _showLeftTag: boolean = true;
    public set showLeftTag(show: boolean) {
        this._showLeftTag = show;
    }

    /**
     * 选中框类型
     * @param value 0：全局通用（默认） 1：作坊用 
     */
    public set compSelType(value: number) {
        this.selType = value;
    }

    $onRemoveFromStage() {
        this._labelName && egret.Tween.removeTweens(this._labelName);
        super.$onRemoveFromStage()
    }

    protected onSkinLoadCompleted() {
        if (this._compSel) {
            this._compSel.visible = false;
        }
        super.onSkinLoadCompleted()
    }

    protected $setSelected(value: boolean) {
        super.$setSelected(value);
        if (this.$needSelect) {
            this.compSel && (this.compSel.visible = this.selected);
        }
    }

    protected onUpdateCustom() {
    }

    protected refresh() {
        //更新装备等阶标记
        let itemInfo = this.data as ItemInfo;
        if (itemInfo instanceof ItemInfo) {
            // 优先itemInfo的tag，再处理custom的tags，最后是表格默认
            super.refresh()
            return true;
        }
    }
    private getShowTags(tags1: number[], tags2: number[], tags3: number[]) {

        let tagDict: { [index: number]: number } = {};
        let setTagFun = (tags: number[]) => {
            if (tags && tags.length) {
                for (let tag of tags) {
                    let tagIndex = this.getTagPos(tag);
                    if (!tagDict[tagIndex]) {
                        tagDict[tagIndex] = tag;
                    }
                }
            }
        }
        setTagFun(tags1);
        setTagFun(tags2);
        setTagFun(tags3);
        let tags: number[] = [];
        for (let index in tagDict) {
            tags.push(tagDict[index]);
        }
        return tags;
    }

    /**
     * 返回标识的位置
     * @param tagId 
     * @returns 1是左边，2是右边 0不存在
     */
    private getTagPos(tagId: number) {
        let tagInfo = s2_itemtag_cfg.ItemtagInfo[tagId];
        if (!tagInfo) {
            Logger.error("TagId Error!");
            return 0;
        }
        let tagPos = tagInfo[s2_itemtag_cfg.iPosition];
        return Math.floor(tagPos / 10);
    }



    public get starComp() {
        if (!this.completed) return null;
        if (!this._starComp) {
            this._starComp = new ItemGridComp_Star();
            this._starComp.bottom = 2;
            this._starComp.horizontalCenter = 0;
        }
        this.addToWidget(this._starComp, ItemGridCompEnum.Star);
        return this._starComp;
    }

    public isStarCompExit() {
        return !!this._starComp;
    }

    public get barComp() {
        if (!this.completed) return null;
        if (!this._barComp) {
            this._barComp = new eui.ProgressBar();
            this._barComp.skinName = uiSkinPath2(`ItemGridCompSkin_Bar.exml`);
            this._barComp.bottom = 0;
            this._barComp.horizontalCenter = 0;
        }
        this.addToWidget(this._barComp, ItemGridCompEnum.Bar);
        return this._barComp;
    }

    public get lowStar() {
        if (!this.completed) return null;
        if (!this._lowStar) {
            this._lowStar = new eui.Image("ginseng_dijie_png")
            this._lowStar.width = this._lowStar.height = 92;
            this._lowStar.verticalCenter = 0;
            this._lowStar.horizontalCenter = 0;
        }
        this.addToWidget(this._lowStar, ItemGridCompEnum.LowStar);
        return this._lowStar;
    }

    public get tagLow() {
        if (!this.completed) return null;
        if (!this._tagLow) {
            this._tagLow = new TagSkin();
            this._tagLow.left = this._tagLow.top = -1;
        }
        this.addToWidget(this._tagLow, ItemGridCompEnum.TagLow);
        return this._tagLow;
    }

    public isTagLowExit() {
        return !!this._tagLow;
    }

    public get tag() {
        if (!this.completed) return null;
        if (!this._tag) {
            this._tag = new TagSkin();
            this._tag.left = this._tag.top = -1;
        }
        this.addToWidget(this._tag, ItemGridCompEnum.Tag);
        return this._tag;
    }

    public isTagExit() {
        return !!this._tag;
    }

    public get tagEx() {
        if (!this.completed) return null;
        if (!this._tagEx) {
            this._tagEx = new TagSkinEx();
            this._tagEx.right = this._tagEx.top = -1;
        }
        this.addToWidget(this._tagEx, ItemGridCompEnum.TagEx);
        return this._tagEx;
    }

    public isTagExExit() {
        return !!this._tagEx;
    }

    public get imgRightTag() {
        if (!this.completed) return null;
        if (!this._imgRightTag) {
            this._imgRightTag = new eui.Image();
            this._imgRightTag.right = this._imgRightTag.top = 0;
        }
        this.addToWidget(this._imgRightTag, ItemGridCompEnum.RightTag);
        return this._imgRightTag;
    }

    public isImgRightTagExit() {
        return !!this._imgRightTag;
    }

    public get lblObj() {
        if (!this.completed) return null;
        if (!this._lblObj) {
            this._lblObj = new ItemGridComp_Lb();
            this._lblObj.skinName = uiSkinPath2(`ItemGridCompSkin_BottomLb.exml`)
            this._lblObj.bottom = 4
            this._lblObj.horizontalCenter = 0;
        }
        this.addToWidget(this._lblObj, ItemGridCompEnum.BottomLb);
        return this._lblObj;
    }

    public get lblStrengUp() {
        if (!this.completed) return null;
        if (!this._lblStrengUp) {
            this._lblStrengUp = new ItemGridComp_Lb();
            this._lblStrengUp.skinName = uiSkinPath2(`ItemGridCompSkin_RightTopLb.exml`)
            this._lblStrengUp.top = 2;
            this._lblStrengUp.right = 4;
        }
        this.addToWidget(this._lblStrengUp, ItemGridCompEnum.RightTopLb);
        return this._lblStrengUp;
    }

    public get labelName() {
        if (!this.completed) return null;
        if (!this._labelName) {
            this._labelName = new ItemGridComp_Lb();
            this._labelName.skinName = uiSkinPath2('ItemGridCompSkin_NameLb.exml')
            this._labelName.top = 4;
            this._labelName.horizontalCenter = 0;
        }
        this.addToWidget(this._labelName, ItemGridCompEnum.NameLb);
        return this._labelName;
    }

    public get compSel() {
        if (!this.completed) return null;
        if (!this._compSel) {
            this._compSel = new eui.Component();
            this._compSel.skinName = 'resource/eui_skins/ItemGridSkin_Selected.exml'
            this._compSel.top = this._compSel.left = this._compSel.bottom = this._compSel.right = 0;
        }
        this.addToWidget(this._compSel, ItemGridCompEnum.Selected);
        return this._compSel;
    }

    public get redComp() {
        if (!this.completed) return null;
        if (!this._redComp) {
            this._redComp = new eui.Component();
            this._redComp.name = "point";
            this._redComp.skinName = 'resource/eui_skins/Panel_Reddot.exml';
            this._redComp.top = this._redComp.right = 0;
        }
        this.addToWidget(this._redComp, ItemGridCompEnum.RedPoint);
        return this._redComp;
    }

    public get rectMask() {
        if (!this.completed) return null;
        if (!this._rectMask) {
            this._rectMask = new eui.Rect();
            this._rectMask.top = this._rectMask.left = this._rectMask.bottom = this._rectMask.right = 4;
            this._rectMask.ellipseWidth = this._rectMask.ellipseHeight = 14;
            // this._rectMask.fillAlpha = 0.5;
        }
        this.addToWidget(this._rectMask, ItemGridCompEnum.Mask);
        return this._rectMask;
    }

    public get imgPlus() {
        if (!this.completed) return null;
        this.imgCenter.source = "pet_star_add_png";
        return this.imgCenter;
    }

    public get imgCenter() {
        if (!this.completed) return null;
        if (!this._imgCenter) {
            this._imgCenter = new eui.Image();
            this._imgCenter.horizontalCenter = this._imgCenter.verticalCenter = 0;
        }
        this.addToWidget(this._imgCenter, ItemGridCompEnum.CenterImg);
        return this._imgCenter;
    }

    /**
     * 右上角角标
     */
    public get imgTopRight() {
        if (!this.completed) return null;
        if (!this._imgRightTop) {
            this._imgRightTop = new eui.Image();
            this._imgRightTop.right = this._imgRightTop.top = -1;
        }
        this.addToWidget(this._imgRightTop, ItemGridCompEnum.TopRightImg);
        return this._imgRightTop;
    }

    /**
     * 通用动效组件
     */
    public get commonAni() {
        if (!this.completed) return null;
        if (!this._commonAni) {
            this._commonAni = new CommonAniComp();
            // this._commonAni.setAniSkinName("AniReceiveLight");
            this._commonAni.touchEnabled = false;
            this.addToWidget(this._commonAni, ItemGridCompEnum.Mc);
        }
        return this._commonAni;
    }

    @SafeCallFunction()
    public setCommonAni(baseSkinName: string, state: string = undefined) {
        if (!this.completed) return null;
        if (baseSkinName) {
            this.commonAni.setAniSkinName(baseSkinName, state)
            this.setCommonAniVisible(true);
        } else {
            this.setCommonAniVisible(false);
        }
        return this._commonAni;
    }

    public setCommonAniVisible(isVisible: boolean) {
        if (isVisible) {
            this.commonAni.visible = true;
        } else {
            this._commonAni && (this._commonAni.visible = false);
        }
    }

    public limitNameWidth() {
        this.labelName.setAttribute("autoAdjustFontSize", true);
    }

    private clearTag() {
        this._tagLow && (this._tagLow.visible = false);
        this._tag && (this._tag.visible = false);
        this._tagEx && (this._tagEx.visible = false);
        this._imgRightTag && (this._imgRightTag.visible = false);
    }

    private updateTag(tags: number[]) {
        this.clearTag();
        if (!tags || tags.length == 0)
            return;

        for (let tagID of tags) {
            ui_utils_tag.updateTagData(this, tagID);
        }
    }

    protected $reset() {
        if (this._redComp) {
            this._redComp.visible = false;
        }
        this._rectMask && (this._rectMask.visible = false);
        this._imgCenter && (this._imgCenter.visible = false);
        this.clearTag();

        this._lblObj && (this._lblObj.visible = false);
        this._lblStrengUp && (this._lblStrengUp.visible = false)

        this._starComp && (this._starComp.visible = false);
        this._barComp && (this._barComp.visible = false);
        this._commonAni && this.setCommonAni(undefined);
    }

    public addToWidget(widget: egret.DisplayObject, compTag: ItemGridCompEnum) {
        if (!widget.parent) {
            let compCfg = CompTreeCfgs[compTag];
            widget["order"] = compCfg.order;
            this.addChildByOrder(compCfg, widget);
        }
    }

    // 红点
    public setRedPoint(b: number) {
    }

    public addChildByOrder(comCfg: CompTreeCfgType, widget: egret.DisplayObject) {
        let parent = this[comCfg.parent];
        if (!parent) return;
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

}



export type CompTreeCfgType = {
    parent: string,
    order: ItemGridCompEnum,
}


export class ItemGridComp_Star extends eui.Component {
    star: PPStarComp;

    public constructor() {
        super();
        this.skinName = uiSkinPath2(`ItemGridCompSkin_Star.exml`);
    }

    @SafeCallFunction()
    public updateView(data: { value: number, max_value?: number }) {
        let value = data.value;
        let max_value = data.max_value || value;
        let showEmpty = max_value > value;
        this.star.setData(value, showEmpty);
    }

}

export class ItemGridComp_EquipLv extends eui.Component {
    imgEquipTag: eui.Image;
    lblLevel: eui.Label;

    public constructor() {
        super();
        this.skinName = uiSkinPath2("ItemGridCompSkin_EquipLv.exml");
    }

    @SafeCallFunction()
    public updateView(itemInfo: ItemInfo) {
        if (this.lblLevel) {
            this.lblLevel.text = `${itemInfo.eqmDegree || 1}`;
            this.lblLevel.visible = true;
        }
    }

    /**
     * 针对定制系统，需要显示定制等阶，例如神炼系统
     * @param level 显示等阶
     */
    @SafeCallFunction()
    public updateCustomLevel(level: number) {
        if (this.lblLevel) {
            this.lblLevel.text = `${level}`;
            this.lblLevel.visible = true;
        }
    }

}

export class ItemGridComp_Lb extends eui.Component {
    lblDes: eui.Label;

    public constructor() {
        super();
    }

    @SafeCallFunction()
    public setText(text: string) {
        this.lblDes.text = text;
    }

    @SafeCallFunction()
    public setAttribute(key: keyof eui.Label, value: any) {
        this.lblDes[key as string] = value;
    }
}

export enum ItemGridMaskIconEnum {
    Got_Com = "com_tag_tick_png", //通用已领取（黄色）
    Got_Green = "popup_win_right_png", //已领取（绿色）
    Sel_Com = "com_tag_tick_png", //通用选中（黄色）
}