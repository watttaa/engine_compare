import { uiSkinPath } from "GlobalValue";
import { GlobalValue } from "GlobalValueDefine";
import { ObjectTypeEnum } from "auto/object_type_enum";
import { EgretExEntry } from "lib/EgretExUtils_Entry";
import { SkillCNet } from "net/SkillCNet";
import { SkillTipsPanel } from "tips/SkillTipsPanel";
import { SkillRoleCompTreeCfgType, SkillRoleCompTreeCfgs, SkillRoleGridCompEnum, SkillRoleGridComp_Intro, SkillRoleGridComp_Lock, SkillRoleGridComp_Selected, SkillRoleGridComp_Tick } from "./SkillRoleGridComp";
import { ItemUtils } from "s2/bag/ItemUtils";
import { TypeEnum } from "base/Enum";

export interface SkillRoleGrid {
    grpSelected: eui.Group;
    imgFrame: eui.Image;
    imgIcon: eui.Image;
    grpInfo: eui.Group;
    grpMC: eui.Group;
    grpLock: eui.Group;
    grpName: eui.Group;
    lblName: eui.Label;

}

/**
 * 角色技能格子
 */
export class SkillRoleGrid extends eui.ItemRenderer {
    public _isEuiex = true;
    public static readonly SEND_LOOK_SKILL_TIPS = "SEND_LOOK_SKILL_TIPS";
    ////////////////////////(自定义)
    protected $custom: EgretExEntry.SkillGridData;
    protected $customShow: EgretExEntry.SkillGridShowData;
    private $mc: egret.MovieClip; //升级动画
    private $showTips: boolean;
    private $touchTapTips: Function;
    protected $showTag = true;
    protected showSelectCom: boolean = true;
    /**长按点击 */
    private isPressTip: boolean;

    private _introComp: SkillRoleGridComp_Intro; //技能简介
    private _selectedComp: SkillRoleGridComp_Selected; //选中框
    private _tickComp: SkillRoleGridComp_Tick; //选中框
    private _lockComp: SkillRoleGridComp_Lock; //未开启
    protected long_look_time: number = GlobalValue.LOOK_SKILL_TIMEOUT;

    public setTouchTapTips(val: Function): void {
        this.$touchTapTips = val;
    }

    /**是否弹出提示 */
    public setShowTips(isShow: boolean) {
        this.$showTips = isShow;
        if (isShow && this.completed) {
            this.addEventListener(egret.TouchEvent.TOUCH_TAP, this.$onTouchedItem, this);
        }
    }

    /**是否支持长按点击 */
    public showPressTip(isPressTip: boolean) {
        this.isPressTip = isPressTip;
        this.addPressListener();
    }

    public setShowTag(isShow: boolean) {
        this.$showTag = isShow;
    }

    public constructor() {
        super();
        if (!this.skinName) {
            this.skinName = uiSkinPath("SkillRoleGrid.exml");
        }
        Logger.log(`SkillRoleGrid ${this.hashCode}`);
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
        this.addPressListener();
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

                //技能简介 intro
                this.introComp.visible = false;
                if (this.$showTag && data.intro) {
                    this.introComp.visible = true;
                    // let tagBg = `com_tag_name_${data.tagBg}_png`
                    let tagBg = data.tagBg;
                    this.introComp.currentState = data.reborn ? "reborn" : "base";
                    // this.introComp.setBg(tagBg);
                    this.introComp.setState(tagBg);
                    this.introComp.setText(data.intro);
                }
                if (data.quality !== undefined || data.plate_color !== undefined) {
                    this.currentState = "famen";
                    this.validateNow();
                    let index = data.quality || data.plate_color;
                    if (index < 1) {
                        index = 1;
                    }
                    this.imgFrame.source = `role_skill_jinengka_frame_${index - 1}_png`;
                }
                else {
                    this.currentState = data.career ? "race" : data.reborn ? "reborn" : "base";
                }
            }
            this.selectedComp && (this.selectedComp.visible = this.selected);
            //this.imgFrame.source = `pet_skill_frame_${this.$custom.plate_color}_png`;
        }
    }

    private $reset() {
        this.selectedComp && (this.selectedComp.visible = false);
        this.imgIcon && (this.imgIcon.visible = true);
        this._introComp && (this._introComp.visible = false);
        this._lockComp && (this._lockComp.visible = false);
        this.lblName && (this.lblName.visible = false);
    }

    public setCustomShow(showData) {
        this.$customShow = showData;
        this.$reset();
        this.$updateCustomShow();
    }

    protected $updateCustomShow() {
        if (!this.$customShow) return;
        if (this.completed) {
            if (this.$customShow.imgSelected != undefined) { this.selectedComp.visible = this.$customShow.imgSelected; };
            if (this.$customShow.imgIcon != undefined) { this.imgIcon.visible = this.$customShow.imgIcon; };
            if (this.$customShow.showName != undefined) { this.lblName.visible = this.$customShow.showName; };
        }
    }

    protected $setSelected(value: boolean) {
        super.$setSelected(value);
        this.selectedComp && (this.selectedComp.visible = this.selected);
    }


    public $onRemoveFromStage() {
        this.isTouch = false;
        this.lookEnable = false;
        this.touchIndex && egret.clearTimeout(this.touchIndex);
        this.isPressTip = false;
        this.clearPressListener();
        this.onClose();
        this.destroy();
        super.$onRemoveFromStage();
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
        this.$touchTapTips = null;
    }

    /**增加长按监听 */
    private addPressListener() {
        if (this.isPressTip && this.completed) {
            this.addEventListener(egret.TouchEvent.TOUCH_BEGIN, this.onTouchBeginItem, this);
            this.addEventListener(egret.TouchEvent.TOUCH_MOVE, this.onTouchMoveItem, this);
            this.addEventListener(egret.TouchEvent.TOUCH_END, this.onTouchEndItem, this);
        } else {
            this.clearPressListener();
        }
    }

    /**移除长按监听 */
    private clearPressListener() {
        if (this.completed) {
            this.removeEventListener(egret.TouchEvent.TOUCH_BEGIN, this.onTouchBeginItem, this);
            this.removeEventListener(egret.TouchEvent.TOUCH_MOVE, this.onTouchMoveItem, this);
            this.removeEventListener(egret.TouchEvent.TOUCH_END, this.onTouchEndItem, this);
        }
    }

    protected $onTouchedItem() {
        if (this.$touchTapTips) {
            this.$touchTapTips();
            return;
        }
        let data = this.$custom;
        UIManager.open(SkillTipsPanel).then((inst: SkillTipsPanel) => {
            inst.setData(data);
        });
    }


    //长按点击
    protected isTouch = false;
    protected lookEnable = false;
    private touchIndex = -1;
    protected beginTouch: egret.Point;
    protected onTouchBeginItem(evt: egret.TouchEvent): void {
        this.beginTouch = egret.Point.create(evt.stageX, evt.stageY);
        this.isTouch = true;
        this.lookEnable = true;
        egret.clearTimeout(this.touchIndex);
        this.touchIndex = egret.setTimeout(() => {
            if (this.isTouch) {
                this.lookSkill();
            }
        }, this, this.long_look_time);
    }

    protected onTouchEndItem(evt: egret.TouchEvent): void {
        this.isTouch = false;
    }

    protected onTouchMoveItem(evt: egret.TouchEvent): void {
        let nowTouch = egret.Point.create(evt.stageX, evt.stageY);
        if (this.beginTouch) {
            let distance = egret.Point.distance(nowTouch, this.beginTouch);
            if (distance > 10) {
                this.lookEnable = false;
            }
        }
    }

    protected lookSkill() {
        egret.clearTimeout(this.touchIndex);
        let data = this.data as EgretExEntry.SkillGridData
        if (!this.lookEnable || !data || !data.id) {
            return;
        }
        if (data && data.id) {
            if (data.quality !== undefined) {
                // SkillCardCNet.C_SKILL_CARD_BRIEF(data.id);
            }
            else {
                SkillCNet.C_CAT_ROLE_SKILL(data.id);
            }
            this.dispatchEvent(new egret.Event(SkillRoleGrid.SEND_LOOK_SKILL_TIPS));
        }
    }

    /*****************************************************************************
     * 组件相关开始
     *****************************************************************************/
    public addToWidget(widget: egret.DisplayObject, compTag: SkillRoleGridCompEnum) {
        if (widget) {
            if (!widget.parent) {
                let compCfg = SkillRoleCompTreeCfgs[compTag];
                widget["order"] = compCfg.order;
                this.addChildByOrder(compCfg, widget);
            }
        } else {
            Logger.error(`widget:${widget}`);
        }
    }

    public addChildByOrder(comCfg: SkillRoleCompTreeCfgType, widget: egret.DisplayObject) {
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

    public get introComp(): SkillRoleGridComp_Intro {
        if (!this.completed) return null;
        if (!this._introComp) {
            this._introComp = new SkillRoleGridComp_Intro();
            this._introComp.left = -4;
            this._introComp.top = -1;
        }
        this.addToWidget(this._introComp, SkillRoleGridCompEnum.IntroComp);
        return this._introComp;
    }

    public get selectedComp(): SkillRoleGridComp_Selected {
        if (!this.completed) return null;
        if (this.showSelectCom) {
            if (!this._selectedComp) {
                this._selectedComp = new SkillRoleGridComp_Selected();
                this._selectedComp.horizontalCenter = 0;
                this._selectedComp.verticalCenter = 0;
            }
            this.addToWidget(this._selectedComp, SkillRoleGridCompEnum.SelectedComp);
        }
        return this._selectedComp;
    }

    public get tickComp(): SkillRoleGridComp_Tick {
        if (!this.completed) return null;
        if (!this._tickComp) {
            this._tickComp = new SkillRoleGridComp_Tick();
            this._tickComp.horizontalCenter = 0;
            this._tickComp.verticalCenter = 0;
        }
        this.addToWidget(this._tickComp, SkillRoleGridCompEnum.TickComp);
        return this._tickComp;
    }

    public get lockComp(): SkillRoleGridComp_Lock {
        if (!this.completed) return null;
        if (!this._lockComp) {
            this._lockComp = new SkillRoleGridComp_Lock();
            this._lockComp.horizontalCenter = 0;
            this._lockComp.verticalCenter = 0;
        }
        this.addToWidget(this._lockComp, SkillRoleGridCompEnum.LockComp);
        return this._lockComp;
    }
}

export class SkillRoleNoSelectedGrid extends SkillRoleGrid {
    protected showSelectCom: boolean = false;
    protected $showTag = false;
}


