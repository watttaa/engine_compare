import { ObjectTypeEnum } from "auto/object_type_enum";
import { s2_rebornlevelcolor_cfg } from "auto/RebornLevelColor";
import { s2_rolelevel_cfg } from "auto/RoleLevel";
import { s2_text_utils } from "auto/text";
import { QualityEnum, RedSelectType, TypeEnum } from "base/Enum";
import { ItemEntry, RoleHeadEntry } from "base/ServerEntry";
import { BehaviorBaseRenderer } from "behaviorCamp/BehaviorBaseView";
import { BehvGirdGetState } from "behaviorCamp/commBehavior/BehvBaseGird/BehvGirdGetState";
import { BehvGirdTag } from "behaviorCamp/commBehavior/BehvBaseGird/BehvGirdTag";
import { BrightQuaBorder, BrightQuaFrame, QuaBorder, uiPath2 } from "GlobalValue";
import { HeroMainModel } from "heroMain/HeroMainModel";
import { AniActivityRewardLight, CommonAniComp2, CommonAniComp2Enum } from "lib/euiex/AniActivityRewardLight";
import { DEFAULT_HEAD_FRAME_ID, RoleHead } from "lib/euiex/RoleHead";
import { filter_utils } from "lib/FilterUtils";
import { RedPointTreeHelper } from "lib/RedPointManager";
import { AppearanceConf } from "s2/appearance/conf/AppearanceConf";
import { appearance_define } from "s2/appearance/vo/AppearanceVo";
import { ItemInfo } from "s2/bag/ItemInfo";
import { ItemUtils } from "s2/bag/ItemUtils";
import { BagCNet } from "s2/bag/net/BagCNet";
import { UIReturnMgr } from "s2/uireturn/UIReturnMgr";
import { color_utils } from "utils/ColorUtils";
import { res_utils } from "utils/ResUtils";
import { tween_effect_utils } from "utils/TweenEffectUtils";
import { safeCallComFunc } from "utils/UIUtils_safecall";

const DEFAULT_CUSTOM = { equipLv: true }

export interface BaseGrid {
    get data(): BaseGridData;
    set data(value: BaseGridData);
}

//包含最基本的道具显示，动画以及点击处理
export class BaseGrid extends BehaviorBaseRenderer {
    public _isEuiex = true;

    protected imgFrame: eui.Image;
    public imgIcon: eui.Image;
    protected imgBg: eui.Image;
    protected grpMc: eui.Group;
    protected lblName: eui.Label;
    protected head: RoleHead;
    protected $ani: egret.MovieClip | AniActivityRewardLight
    protected m_ani2: CommonAniComp2;
    private $touchFunc: Function;
    private $touchFuncObj: any;
    private $touchFuncArgs: any;
    protected $behvGirdTag: BehvGirdTag;
    private $behvGirdGetState: BehvGirdGetState;

    protected initBehavior(): void {
        super.initBehavior();
        this.$behvGirdTag = this.addBehavior(this, BehvGirdTag);
        this.$behvGirdGetState = this.addBehavior(this, BehvGirdGetState);
    }

    protected dataChanged() {
        super.dataChanged();
        if (this.completed) {
            this.refresh();
        }
    }

    public setItemVisible(flag: boolean) {
        this.imgBg.visible = this.imgIcon.visible = flag
    }

    protected onSkinLoadCompleted(): void {
        super.onSkinLoadCompleted()
        this.addEventListener(egret.TouchEvent.TOUCH_TAP, this.onTouchItem, this);

        G123.get('game_develop')?.regDebugRightClick(this, this, this.onClickRight);
        this.checkShowAni2();
    }

    private onClickRight() {
        if (DEV) {
            let itemInfo: ItemInfo = this.data.iteminfo;
            if (itemInfo && itemInfo.id) {
                let cmd = `$add_item ${itemInfo.id} 999`;
                LoginCNet.C_GM_COMMAND_REQ([cmd]);
            }
        }
    }

    $onRemoveFromStage(): void {
        super.$onRemoveFromStage();
        if (this.$ani) {
            this.$ani.stop();
            if (this.$ani && this.$ani.parent) {
                this.$ani.parent.removeChild(this.$ani);
            }
            this.$ani = null;
        }
        this.hideAni2();
    }

    @SafeCallFunction()
    public setData(data: BaseGridData) {
        this.setTempData(data);
        if (this.completed)
            this.refresh()
    }

    protected reset() {
        if (!this.completed) return;
        if (this.imgIcon)
            this.imgIcon.source = "";
        if (this.imgBg)
            this.imgBg.source = ""
        if (this.imgFrame)
            this.imgFrame.source = ""
        this.clearAni()
    }

    protected refresh() {
        this.reset();
        if (this.$behvGirdTag)
            this.$behvGirdTag.setData(null);
        if (!this.data) return;
        let itemInfo = this.data.iteminfo

        // 物品
        if (itemInfo instanceof ItemInfo) {
            let appearance = this.data.iteminfo?.entry?.appearance;
            let showHead: boolean = Boolean(appearance && (appearance.type == AppearanceConf.AppearanceType.headPhoto || appearance.type == AppearanceConf.AppearanceType.headFrame));
            if (this.head) {
                this.head.visible = showHead;
            }
            if (showHead) {
                this.setHead(appearance); // 格子设计有问题，但是太多地方调用GoodsGrid了，现在只能先这样，等完全重构才行
            } else {
                let custom = this.data.custom;
                let icon = ItemUtils.getItemByIcon(itemInfo.icon, itemInfo.type);
                if (custom && custom.new_icon != void 0) {
                    icon = ItemUtils.getItemByIcon(custom.new_icon, itemInfo.type); // 定制图标
                }
                this.imgIcon.source = icon;
                // this.currentState = this.data.custom?.bright ? "goods1" : "nor";

                if (this.imgBg) {
                    let bg = this.data.custom?.bright ? BrightQuaBorder[itemInfo.quality] : QuaBorder[itemInfo.quality];
                    this.imgFrame.visible = !!this.data.custom?.bright;
                    this.imgFrame.source = BrightQuaFrame[itemInfo.quality];
                    this.imgBg.source = bg;
                }
                if (this.lblName) {
                    this.lblName.visible = itemInfo.showName;
                    this.lblName.text = itemInfo.name;
                    this.lblName.textColor = color_utils.getQualityColorNum(itemInfo.quality);
                    if (itemInfo.showName) {
                        tween_effect_utils.setTweenEffect(this.lblName, this.lblName.parent?.width);
                    }
                }

                if (this.$behvGirdTag) {
                    let tags = this.$behvGirdTag.getShowTags(itemInfo.tags, custom?.tags, itemInfo.defaultTag);
                    this.$behvGirdTag.setData(tags);
                }
                if (this.$behvGirdGetState) {
                    this.$behvGirdGetState.setData(this.data.getStateMask);
                }



                //this.imgFrame && (this.imgFrame.source = QuaFrame[itemInfo.quality])
            }
        }
        else {
            typeof this.data.icon == 'string' && (this.imgIcon.source = this.data.icon)
            typeof this.data.imgBg == 'string' && (this.imgBg.source = this.data.imgBg)
            if (this.data.imgFrame && (typeof this.data.imgFrame == 'string')) {
                this.imgFrame.visible = true;
                this.imgFrame.source = this.data.imgFrame;
                this.imgFrame.alpha = this.data.imgFrameAlpha || 1;
            }
            if (itemInfo === undefined && this.lblName) {
                this.lblName.visible = false;
            }
        }
        RedPointTreeHelper.addPointOnWidget(this, this.data?.redPoint);
        this.refreshAni()

    }

    private setHead(appearance: appearance_define.AppearanceShowVo) {
        let rolehead: RoleHeadEntry = {};
        if (appearance.frame_type) {
            rolehead.frame_type = appearance.frame_type;
            rolehead.frame = appearance?.icon || DEFAULT_HEAD_FRAME_ID;
            // rolehead.icon = appearance.showRole ? HeroMainModel.getInstance().getHead().icon : 0;
            // 策划说：不管什么情况下，都应该显示玩家的头像
            rolehead.icon = HeroMainModel.getInstance().getHead().icon;
        } else {
            rolehead.icon = appearance?.icon || '';
            rolehead.frame = DEFAULT_HEAD_FRAME_ID;
        }
        let showtips: boolean = true;
        if (this.data.custom?.showtips === false) {
            showtips = false;
        }
        this.head.visible = true;
        this.head.setData({
            rolehead: rolehead,
            clickabled: showtips,
            clickFun: this.onTouchRoleHead,
            clickObj: this,
        });
    }

    public setRoleHead(rolehead: RoleHeadEntry) {
        if (this.head) {
            this.head.setRoleHead(rolehead);
        }
    }
    private onTouchRoleHead() {
        BagCNet.C_GET_ITEM_EXTRA_INFO(this.data.iteminfo);
    }

    private updateImgFrame() {

    }

    public setTouchFunc(func: Function, thisObj?: any, args?: any) {
        this.$touchFunc = func;
        this.$touchFuncObj = thisObj;
        this.$touchFuncArgs = args;
    }

    protected onTouchItem(evt: egret.TouchEvent) {
        if (this.$touchFunc) {
            this.$touchFunc.call(this.$touchFuncObj, this.$touchFuncArgs);
            return;
        }

        if (!this.data)
            return
        let itemInfo: ItemInfo = this.data.iteminfo;
        if (!itemInfo || !itemInfo.id) {
            return;
        }
        this.openTips();
    }


    // 打开道具提示
    public openTips() {
        if (!this.data)
            return
        let itemInfo: ItemInfo = this.data.iteminfo as ItemInfo;
        if (!itemInfo || !itemInfo.id) {
            return;
        }
        if (!this.data.custom || this.data.custom.showtips != false) {
            this.openTipsForce();
        }
    }

    // 强制打开道具提示（跳过 showtips 守卫，供外部"已选中再次点击"等场景手动调用）
    public openTipsForce() {
        if (!this.data)
            return
        let itemInfo: ItemInfo = this.data.iteminfo as ItemInfo;
        if (!itemInfo || !itemInfo.id) {
            return;
        }
        let showSource: boolean = Boolean(this.data.custom?.showSource);
        let tips_extra = this.data.custom?.tips_extra || {};
        if (!itemInfo.rid && tips_extra.show_equip_btn == null) {
            tips_extra.show_equip_btn = false;
        }
        UIReturnMgr.getInstance().push();
        BagCNet.C_GET_ITEM_EXTRA_INFO(itemInfo, tips_extra, showSource);
    }

    /*****************动画*******************/
    private onRenderCheckVisible(): void {
        if (!UIManager.isRealVisible(this))
            this.clearAni();
    }

    protected clearAni(): void {
        if (this.$ani) {
            this.$ani.stop();
            this.$ani.visible = false;
        }
        this.removeEventListener(egret.Event.RENDER, this.onRenderCheckVisible, this);
    }

    protected refreshAni() {
        const showAni = this.data?.showAni as { type: "tween" | "mc", source: string };
        if (showAni) {
            if (!this.$ani) {
                this.$ani = this.data.showAni.type == 'mc' ? new egret.MovieClip() : new AniActivityRewardLight();
                this.$ani.touchEnabled = false;
                this.grpMc.addChild(this.$ani);
            }
            this.$ani.visible = true
            if (!showAni.source) {
                this.$ani.stop()
                this.$ani.visible = false
            }
            else if (this.data.showAni.type == 'mc') {
                //getMCData(uiAnimationPath(`activity/${showAni.source}.json`), this.onMCDataComplete, this);
                getMCData(this.data.showAni.source, this.onMCDataComplete, this);
            }
            else if (this.data.showAni.type == 'tween') {
                (this.$ani as AniActivityRewardLight).setAni(this.data.showAni.source);
                this.$ani.play();
            }

        }
        else if (this.$ani) {
            this.$ani.stop()
            this.$ani.visible = false
        }

        this.checkShowAni2();
    }

    protected onMCDataComplete(mcData: MCData) {
        if (!this.$ani || !(this.$ani instanceof egret.MovieClip)) {
            return;
        }
        this.$ani.movieClipData = egret.MovieClipDataFactory.getInstance().generateMovieClipData(mcData.mcData, mcData.mcTexture);
        this.$ani.play(-1);
    }

    public checkShowAni2() {
        if (this.data?.custom?.showAni2 && this.grpMc) {
            this.showAni2(this.data.custom.showAni2);
        } else
            this.hideAni2();
    }

    @SafeCallFunction()
    public showAni2(type: CommonAniComp2Enum) {
        if (!this.m_ani2) {
            this.m_ani2 = new CommonAniComp2(type);
            this.m_ani2.visible = true;
            this.grpMc.addChild(this.m_ani2);
        } else {
            this.m_ani2.stop();
            this.m_ani2.play();
        }
    }

    public hideAni2() {
        if (this.m_ani2) {
            this.m_ani2.stop();
            this.grpMc.removeChild(this.m_ani2);
            this.m_ani2 = null;
        }
    }
}


export interface GoodsGrid {
    get data(): GoodsGridData;
    set data(value: GoodsGridData);

    iconPet: eui.Image;
    grpPet: eui.Group;
}

export class GoodsGrid extends BaseGrid {
    protected compdict: { [key: string]: GridComp } = {}
    protected grpContent: eui.Group;
    protected grpRoot: eui.Group;

    protected onSkinLoadCompleted(): void {
        super.onSkinLoadCompleted()
    }

    public setCustom(data: GridCompCustom) {
        if (!this.data) {
            this.data = { custom: {} }
        }
        else if (!this.data.custom) {
            this.data.custom = {}
        }
        for (let i in data) {
            this.data.custom[i] = data[i]
        }
        this.refresh()
    }

    public setItemVisible(flag: boolean) {
        super.setItemVisible(flag)
        for (let key in this.compdict) {
            this.compdict[key].visible = flag
        }
        this.grpPet.visible = false;
        let spPetIcon = this.data?.iteminfo?.specificPetIcon;
        if (isNotVain(spPetIcon) && flag) {
            this.grpPet.visible = true;
        }
        if (!flag)
            this.$behvGirdTag.onClose();
        if (flag) {
            this.refresh();
        }
    }

    protected refresh(): void {
        super.refresh()

        // todo
        //要求几乎所有显示装备的地方都要，特殊不显示的地方单独设置equipLv = 0隐藏吧
        if (ItemUtils.isEquip(this.data.iteminfo?.type) && this.data.custom?.equipLv !== 0) {
            let equipLv = this.data.degree || this.data.iteminfo.degree;
            if (!this.data.custom) {
                this.data.custom = { equipLv };
            }
            if (typeof this.data.custom.equipLv != "number") this.data.custom.equipLv = equipLv;
        }
        if (this.data.iteminfo?.type == ObjectTypeEnum.EQUIPMENT_SHENBING && !this.data.hideEquipTag) {// 蛋疼
            const equipTag = s2_text_utils.T(2051033);
            if (!this.data.custom) {
                this.data.custom = { equipTag };
            }
            else if (this.data.custom.equipTag == null && this.data.custom.equipTag !== "null") {
                this.data.custom.equipTag = equipTag;
            }
        }

        if (this.data.iteminfo?.is_big_reward) {
            if (!this.data.custom) {
                this.data.custom = { lt_tag: this.data.iteminfo.is_big_reward ? "com_tar_zsqy_big_png" : '' };
            } else {
                this.data.custom.lt_tag = this.data.iteminfo.is_big_reward ? "com_tar_zsqy_big_png" : '';
            }
        }

        if (this.data.iteminfo) {
            let skillIcon = this.data.iteminfo.getSkillIcon(this.data.iteminfo.id);
            if (skillIcon) {
                if (!this.data.custom) {
                    this.data.custom = { skillIcon: ItemUtils.getItemByIcon(skillIcon, TypeEnum.SKILL) };
                } else {
                    this.data.custom.skillIcon = skillIcon && ItemUtils.getItemByIcon(skillIcon, TypeEnum.SKILL);
                }
            }

            let spPetIcon = this.data.iteminfo?.specificPetIcon;
            if (isNotVain(spPetIcon)) {
                this.iconPet.source = res_utils.getNpcIconSmall(spPetIcon);
            }
        }

        for (let key in this.data.custom) {
            let comp_data = COMP_DICT[key]
            if (!comp_data)
                continue
            let gridcomp = this.compdict[comp_data.compName] as GridComp
            if (!gridcomp) {
                //创建新组件
                let comp = new eui.Component()
                comp.skinName = comp_data.skinName
                this.grpContent.addChild(comp)
                //组件绑定GridComp
                gridcomp = new (comp_data.classname)(comp) as GridComp
                this.compdict[comp_data.compName] = gridcomp
            }
        }

        for (let key in this.compdict) {
            let gridcomp = this.compdict[key] as GridComp
            if (gridcomp) {
                gridcomp.refresh && gridcomp.refresh(this, this.data?.custom)
                gridcomp.setSelect && gridcomp.setSelect(this.selected)
            }
        }

        // todo
        let is_grey = this.data?.custom?.is_grey;
        filter_utils.addGreyFilter(this.grpRoot, is_grey || filter_utils.FilterType.NONE);
        this.updateCurrentState();
    }

    protected updateCurrentState() {
        let states: string[] = [];
        if (this.data?.custom?.bright) {
            states.push("goods1");
        } else {
            states.push("nor");
        }
        let itemInfo = this.data.iteminfo;
        let spPetIcon = itemInfo?.specificPetIcon;
        if (isNotVain(spPetIcon)) {
            states.push("sp_pet");
        }
        this.currentState = states.join(",");
    }

    protected $setSelected(value: boolean) {
        super.$setSelected(value);
        if (!this.data || !this.data.custom) return
        for (let key in this.data.custom) {
            let comp_data = COMP_DICT[key]
            if (!comp_data)
                continue
            let gridcomp = this.compdict[comp_data.compName] as GridComp
            if (gridcomp && this.data.custom[key]) {
                gridcomp.setSelect && gridcomp.setSelect(value)
            }
        }
    }

    $onRemoveFromStage() {
        super.$onRemoveFromStage()
        for (let key in this.compdict) {
            let gridcomp = this.compdict[key] as GridComp
            gridcomp && gridcomp.destroy()
        }
        this.compdict = {}
    }

    public dropComp(compName: string) {
        let gridcomp = this.compdict[compName];
        if (gridcomp) {
            let comp = gridcomp.getComp();
            comp && this.grpContent.removeChild(comp);
            gridcomp.destroy();
            delete this.compdict[compName];
        }
    }
}


class GridComp {
    private $visible: boolean = true
    constructor(comp: eui.Component) {
        this.comp = comp
    }
    protected comp: any
    protected compName
    public refresh(thisObj: BaseGrid, data: any) {
    }

    public set visible(value: boolean) {
        this.$visible = value
        this.comp.visible = value
    }

    public get visible() {
        return this.$visible
    }

    public setSelect(value: boolean) { }

    public destroy() {
        this.comp = null
    }

    public getComp() {
        return this.comp;
    }
}

interface NumCompSkin {

    lblNum: eui.Label;

}

interface NumCompCustom {
    rb_label?: string | number;
    rb_label_state?: "goods1" | "nor";
}

class NumComp extends GridComp {
    protected comp: eui.Component & NumCompSkin;
    protected compName = 'numComp'

    public refresh(thisObj, data: NumCompCustom) {
        safeInvokeFunc(this.comp, () => {
            if (!this.comp) {
                return;
            }
            let rb_label;
            if (data && data.rb_label != null) {
                //amount字段不存在时取到的可能是NaN,NAN也是number类型，让NAN也不显示
                if (typeof data.rb_label == 'number' && !Number.isNaN(data.rb_label)) {
                    rb_label = preload_utils_text.itemNumberFormat(data.rb_label)
                }
                else if (typeof data.rb_label == 'string') {
                    rb_label = data.rb_label
                }
                else {
                    Logger.error("rb_label must be number or string")
                }
            }
            this.comp.lblNum.text = rb_label || "";
            this.comp.lblNum.visible = !!rb_label
            this.comp.currentState = data?.rb_label_state ? 'goods1' : 'nor';
        })
    }
}

interface SelectCompSkin {

    imgSelected: eui.Image;

}

interface SelectCompCustom {
    selectCompSkin?: string;
    need_select?: boolean | string; // 需要选择的状态
}

class SelectComp extends GridComp {
    protected comp: eui.Component & SelectCompSkin;
    protected compName = 'selectComp'
    private needSelect: boolean | string = true

    public set visible(value: boolean) {
    }

    public refresh(thisObj, data: SelectCompCustom) {
        this.needSelect = data?.need_select
        if (data?.selectCompSkin) {
            this.comp.skinName = data?.selectCompSkin;
        }
        safeInvokeFunc(this.comp, () => {
            if (!this.comp)
                return;
            this.comp.visible = this.comp.visible && !!this.needSelect
            if (typeof this.needSelect == 'string')
                this.comp.currentState = this.needSelect
        })
    }

    public setSelect(value: boolean) {
        safeInvokeFunc(this.comp, () => {
            if (!this.comp)
                return;
            this.comp.visible = value && !!this.needSelect
        })
    }
}

interface AddCompSkin {
    addCompSkin?: string;
    add_comp?: boolean; // 需要选择的状态
}

class AddComp extends GridComp {
    protected comp: eui.Component & AddCompSkin;
    protected compName = 'addComp'
    private addComp: boolean = true

    public refresh(thisObj, data: AddCompSkin) {
        this.addComp = data?.add_comp
        if (data?.addCompSkin) {
            this.comp.skinName = data?.addCompSkin;
        }
        safeInvokeFunc(this.comp, () => {
            if (!this.comp)
                return;
            this.comp.visible = this.addComp;
        })
    }
}

interface PetSelectCompSkin {
    imgGot: eui.Image
}

interface PetSelectCompCustom {
    pet_select?: boolean; // 需要选择的状态
    pet_select_scale?: number
}

class PetSelectComp extends GridComp {
    protected comp: eui.Component & PetSelectCompSkin;
    protected compName = 'PetSelect'

    public refresh(thisObj, data: PetSelectCompCustom) {
        safeInvokeFunc(this.comp, () => {
            if (!this.comp)
                return;
            this.comp.visible = !!data.pet_select;
            this.comp.scaleX = this.comp.scaleY = data.pet_select_scale || 1;
        })
    }
}

interface RedSelectCompSkin {

    imgSelected: eui.Image;

}

interface RedSelectCompCustom {
    red_select?: RedSelectType; // 红色选择状态
}

class RedSelectComp extends GridComp {
    protected comp: eui.Component & RedSelectCompSkin;
    protected compName = 'redSelectComp'
    private redSelect: RedSelectType = RedSelectType.HIDE
    private sizeInited = false
    private $thisObj: BaseGrid

    public refresh(thisObj, data: RedSelectCompCustom) {
        this.redSelect = data?.red_select || RedSelectType.HIDE;
        this.$thisObj = thisObj;
        safeInvokeFunc(this.comp, () => {
            if (!this.comp)
                return;
            this.comp.touchEnabled = false;
            this.comp.imgSelected.visible = this.$thisObj.selected || this.redSelect == RedSelectType.RED;
            if (!this.sizeInited) {
                this.comp.width = this.comp.parent.width
                this.comp.height = this.comp.parent.height
                this.sizeInited = true
            }
            this.updateState();
        })
    }

    public setSelect(value: boolean) {
        safeInvokeFunc(this.comp, () => {
            if (!this.comp)
                return;
            this.updateState();
            this.comp.imgSelected.visible = value || this.redSelect == RedSelectType.RED
        })
    }

    private updateState() {
        let select_state = this.$thisObj.selected ? RedSelectType.YELLOW : RedSelectType.RED;
        this.comp.currentState = select_state;
    }
}


interface NameCompSkin {

    grpDes: eui.Group;
    lblDes: eui.Label;

}

interface NameCompCustom {
    name?: string;
    name_color?: number;
    nameCompSkin?: string;
}
const nameCompHeight = 28;
class NameComp extends GridComp {
    protected comp: eui.Component & NameCompSkin;
    protected compName = 'nameComp'

    public refresh(thisObj, data: NameCompCustom) {
        if (this.comp && data?.nameCompSkin && data.nameCompSkin != this.comp.skinName) {
            this.comp.skinName = data.nameCompSkin;
        }
        safeInvokeFunc(this.comp, () => {
            if (!this.comp) return;
            this.comp.lblDes.text = data?.name || ""
            if (data?.name_color) {
                this.comp.lblDes.textColor = data.name_color;
            }
            this.comp.width = this.comp.parent.width
            this.comp.height = this.comp.parent.height;
            tween_effect_utils.setTweenEffect(this.comp.lblDes, this.comp.grpDes.width);
        })
    }
}

interface QuaNameSkin {
    grp: eui.Group;
    labelDisplay: eui.Label;
}

interface QuaNameCustom {
    quaName?: {
        quality?: number; // 品质
        name?: string; // 品质名称
    }
}

class QuaNameComp extends GridComp {
    protected comp: eui.Component & QuaNameSkin;
    protected compName = 'quaNameComp'

    public refresh(thisObj, data: QuaNameCustom) {
        safeInvokeFunc(this.comp, () => {
            if (!this.comp) return;
            let quaName = data?.quaName || {};
            this.comp.currentState = quaName?.quality ? `q${quaName.quality}` : "nor";
            this.comp.validateNow();
            // this.stopTweenEffect();
            this.comp.labelDisplay.text = quaName?.name || "";
            // 添加左右滚动动画
            safeCallComFunc(this, this.comp, () => {
                tween_effect_utils.setTweenEffect(this.comp.labelDisplay, this.comp.grp.width);
            });
        })
    }

    private stopTweenEffect() {
        if (!this.comp || !this.comp.labelDisplay) return;
        this.comp.labelDisplay.horizontalCenter = 0;
        let oldMask = this.comp.labelDisplay.mask as eui.RectangleComponent;
        if (oldMask && oldMask.parent) {
            oldMask.parent.removeChild(oldMask)
        }
        this.comp.labelDisplay.mask = null;
    }
}

interface GotCompSkin {

    grp: eui.Group;
    imgGot: eui.Image;

}

interface GotCompCustom {
    got_icon?: string;
}

class GotComp extends GridComp {
    protected comp: eui.Component & GotCompSkin;
    protected compName = 'gotComp'

    public refresh(thisObj, data: GotCompCustom) {
        safeInvokeFunc(this.comp, () => {
            if (!this.comp) {
                return;
            }
            this.comp.z = 999;
            this.comp.grp.visible = !!(data?.got_icon);
            this.comp.imgGot.source = data?.got_icon || ""
        })
    }
}

interface TagCompSkin {

    imgTag_LT: eui.Image;
    imgTag_RT: eui.Image;

}

interface TagCompCustom {
    lt_tag?: string;
}

class TagComp extends GridComp {
    protected comp: eui.Component & TagCompSkin;
    protected compName = 'tagComp'

    public refresh(thisObj, data: TagCompCustom) {
        safeInvokeFunc(this.comp, () => { if (!this.comp) return; this.comp.imgTag_LT.source = data?.lt_tag || "" })
    }
}

interface RateCompSkin {

    grp: eui.Group;
    lblNum: eui.Label;

}

interface RateCompCustom {
    up_rate?: string;
}

class RateComp extends GridComp {
    protected comp: eui.Component & RateCompSkin;
    protected compName = 'rateComp'

    public refresh(thisObj, data: RateCompCustom) {
        safeInvokeFunc(this.comp, () => {
            if (!this.comp)
                return
            this.comp.grp.visible = !!(data?.up_rate);
            data && (this.comp.lblNum.text = `${data.up_rate}`);
        })
    }
}

interface ZMulCompSkin {

    grp: eui.Group;
    lblRate: eui.Label;

}

interface ZMulCompCustom {
    zmul_rate?: number;
}

class ZMulComp extends GridComp {
    protected comp: eui.Component & ZMulCompSkin;
    protected compName = 'zmulComp'

    public refresh(thisObj, data: ZMulCompCustom) {
        safeInvokeFunc(this.comp, () => {
            if (!this.comp)
                return
            this.comp.lblRate.visible = !!(data?.zmul_rate);
            data && (this.comp.lblRate.text = `x${data.zmul_rate}`);
        })
    }
}

interface DisableCompCustom {
    disable?: boolean;
}

class DisableComp extends GridComp {
    protected compName = 'disableComp'

    public refresh(thisObj, data: DisableCompCustom) {
        if (!this.comp) return;
        safeInvokeFunc(this.comp, () => { this.comp.visible = !!data?.disable })
    }
}

interface SortNumCompSkin {

    grp: eui.Group;
    labelDisplay: eui.Label;

}

interface SortNumCompCustom {
    need_sort?: boolean; // 是否需要排序
    sort_num?: string; // 排序数字
}

class SortNumComp extends GridComp {
    protected comp: eui.Component & SortNumCompSkin;
    protected compName = 'sortnumComp'
    public refresh(thisObj, data: SortNumCompCustom) {
        safeInvokeFunc(this.comp, () => {
            if (!this.comp) return;
            this.comp.grp.visible = !!data?.need_sort;
            this.comp.labelDisplay.text = data?.sort_num || ''
        })
    }
}

interface ExchangeCompSkin {

    grpExchange: eui.Group;
    labelDisplay: eui.Label;

}

interface ExchangeCompCustom {
    can_exchange?: boolean;
    exchange_text?: string; // 交换文字
}

class ExchangeComp extends GridComp {
    protected comp: eui.Component & ExchangeCompSkin;
    protected compName = 'exchangeComp'
    private needExchange = true
    public refresh(thisObj, data: ExchangeCompCustom) {
        this.needExchange = !!data?.can_exchange
        safeInvokeFunc(this.comp, () => { if (!this.comp) return; this.comp.grpExchange.visible = this.comp.grpExchange.visible && this.needExchange })
    }

    public setSelect(value: boolean) {
        safeInvokeFunc(this.comp, () => { if (!this.comp) return; this.comp.grpExchange.visible = !value && this.needExchange })
    }
}

interface EngageCompSkin {

    grp: eui.Group;
    imgTag: eui.Image;

}

interface EngageCompCustom {
    is_engage?: boolean; // 是否是交互状态
}

class EngageComp extends GridComp {
    protected comp: eui.Component & EngageCompSkin;
    protected compName = 'engageComp'
    public refresh(thisObj, data: EngageCompCustom) {
        safeInvokeFunc(this.comp, () => { if (!this.comp) return; this.comp.imgTag.visible = !!data?.is_engage })
    }
}

interface RedPointCompSkin {

    imgRed: eui.Image;
    lblNum: eui.Label;

}

interface RedPointCompCustom {
    red_point?: boolean; // 是否有红点
    red_state?: string; // 红点状态
}

class RedPointComp extends GridComp {
    protected comp: eui.Component & RedPointCompSkin;

    constructor(comp: eui.Component) {
        super(comp);
        safeInvokeFunc(this.comp, () => {
            comp.z = 100;
        })
    }
    protected compName = 'redPointComp';
    protected $data: RedPointCompCustom;
    public refresh(thisObj, data: RedPointCompCustom) {
        this.$data = data;
        safeInvokeFunc(this.comp, () => {
            if (!this.comp)
                return
            this.comp.visible = !!data?.red_point;
            this.comp.currentState = data?.red_state || "";
            this.comp.top = 10;
            this.comp.right = 10;
        })
    }

    public setSelect(value: boolean) {
        if (value && this.$data?.red_point) {
            this.$data.red_point = false;
            this.refresh(null, this.$data);
        }
    }
}

interface LvCompSkin {

    lblLv: eui.Label;

}

interface LvCompCustom {
    lv?: number; // 等级
}

class LvComp extends GridComp {
    protected comp: eui.Component & LvCompSkin;
    protected compName = 'LvComp';

    public refresh(thisObj, data: LvCompCustom) {
        safeInvokeFunc(this.comp, () => {
            if (!this.comp)
                return
            this.comp.visible = !!data?.lv;
            !!data?.lv && (this.comp.lblLv.text = s2_text_utils.T(2010006, { lv: data.lv }));
        });
    }
}

interface PetLvCompSkin {

    grpRoot: eui.Group;
    lblLevel: eui.Label;

}

interface PetLvCompCustom {
    pet_lv?: number; // 宠物等级
}

class PetLvComp extends GridComp {
    protected comp: eui.Component & PetLvCompSkin;
    protected compName = 'petLvComp';

    public refresh(thisObj, data: PetLvCompCustom) {
        safeInvokeFunc(this.comp, () => {
            if (!this.comp)
                return
            this.comp.grpRoot.visible = typeof data?.pet_lv == 'number'
            this.comp.lblLevel.text = `${s2_rebornlevelcolor_cfg.getLvRebornColor(s2_rolelevel_cfg.getRebornLevel(data?.pet_lv))}${s2_rolelevel_cfg.getShowLvEx(data?.pet_lv)}#Z`
        });
    }
}

interface FlashCompSkin {

    grp: eui.Group;
    imgTag: eui.Image;

}

interface FlashCompCustom {
    flash?: boolean; // 是否闪烁
}

class FlashComp extends GridComp {
    protected comp: eui.Component & FlashCompSkin;
    protected compName = 'flashComp';

    public refresh(thisObj, data: FlashCompCustom) {
        safeInvokeFunc(this.comp, () => {
            if (!this.comp)
                return
            this.comp.imgTag.visible = !!data?.flash;
        });
    }
}

interface TipsCompSkin {

    lblTips: eui.Label;

}

interface TipsCompCustom {
    tips?: string | boolean; // 提示文本
}

class TipsComp extends GridComp {
    protected comp: eui.Component & TipsCompSkin;
    protected compName = 'tipsComp'
    public refresh(thisObj, data: TipsCompCustom) {
        safeInvokeFunc(this.comp, () => {
            if (!this.comp)
                return
            if (data && data.tips) {
                typeof data.tips == 'string' && (this.comp.lblTips.text = data.tips);
                this.comp.visible = true
            }
            else {
                this.comp.visible = false
            }

        });
    }
}

interface AddIconCompCustom {
    addIcon?: boolean; // 添加图标
}

class AddIconComp extends GridComp {
    protected compName = 'addIconComp'
    public refresh(thisObj, data: AddIconCompCustom) {
        safeInvokeFunc(this.comp, () => {
            if (!this.comp)
                return;
            this.comp.visible = !!data?.addIcon;
        })
    }
}

interface EquipedCompCustom {
    equiped?: boolean; // 是否装备
}

class EquipedComp extends GridComp {
    protected compName = 'equipedComp'

    public refresh(thisObj: BaseGrid, data: EquipedCompCustom): void {
        safeInvokeFunc(this.comp, () => {
            if (!this.comp) return;
            this.comp.z = 2;
            this.comp.visible = !!data?.equiped;
        })
    }
}

interface GemCompSkin {

    grpLv: eui.Group;
    lblLv: eui.Label;
    btnSub: eui.Button;

}

interface GemCompCustom {
    gem?: {
        text?: string; // 显示的文本
        func?: (item: ItemEntry) => any; // 点击回调函数
        obj?: any; // 回调函数的this对象
        args?: any[]; // 回调函数的参数
    }
}

class GemComp extends GridComp {
    protected comp: eui.Component & GemCompSkin;
    protected compName = 'gemComp';
    private $listened: boolean;
    private $listen: { func?: (item: ItemEntry) => any, obj?: any, args?: any[] };

    public refresh(thisObj: BaseGrid, data: GemCompCustom): void {
        safeInvokeFunc(this.comp, () => {
            if (!this.comp) return;
            this.comp.grpLv.visible = false;
            this.comp.btnSub.visible = !!(data?.gem?.func && data.gem.obj);
            this.$listen = data?.gem;
            this.comp.lblLv.text = data?.gem?.text || "";
            if (!this.$listened) {
                this.comp.btnSub.addEventListener(egret.TouchEvent.TOUCH_TAP, this.callBack, this, false, 3);
                this.$listened = true;
            }
        })
    }

    private callBack(e: egret.TouchEvent): void {
        this.$listen?.func?.call(this.$listen.obj, this.$listen.args);
        e.stopPropagation();
    }

    public destroy(): void {
        this.comp.btnSub.removeEventListener(egret.TouchEvent.TOUCH_TAP, this.callBack, this);
    }
}

interface GemInsetCompSkin {

    imgGem0: eui.Image;
    imgGem1: eui.Image;
    imgGem2: eui.Image;

}

interface GemInsetCompCustom {
    gemInset?: ItemEntry[]; // 宝石镶嵌
}

class GemInsetComp extends GridComp {
    protected comp: eui.Component & GemInsetCompSkin;
    protected compName = 'gemInsetComp'
    private readonly gemNum: number = 3;
    public refresh(thisObj: BaseGrid, data: GemInsetCompCustom): void {
        safeInvokeFunc(this.comp, () => {
            if (!this.comp) return;
            this.comp.visible = !!data?.gemInset;
            for (let i = 0; i < this.gemNum; i++) {
                let img = this.comp[`imgGem${i}`] as eui.Image;
                img.source = data?.gemInset?.[i] ? ItemUtils.getItemById(data.gemInset[i].sid) : "";
            }
        })
    }
}

interface EquipLvCompSkin {
    grpTag: eui.Group;
    lblLv: eui.Label;
}

interface EquipLvCompCustom {
    equipLv?: number; // 装备等级
    equipLvScale?: number; // 缩放
}

class EquipLvComp extends GridComp {
    protected comp: eui.Component & EquipLvCompSkin;
    protected compName = 'equipLvComp'

    public refresh(thisObj: BaseGrid, data: EquipLvCompCustom): void {
        safeInvokeFunc(this.comp, () => {
            if (!this.comp) return;
            this.comp.visible = !!data?.equipLv;
            const grpTag = this.comp.grpTag as eui.Group;
            grpTag.scaleX = grpTag.scaleY = data?.equipLvScale || 1;
            const lblLv = this.comp.lblLv as eui.Label;
            lblLv.text = `${data?.equipLv}`;
        })
    }
}

interface GemPropTypeCompSkin {

    lblLv0: eui.Label;

}

interface GemPropTypeCompCustom {
    gemPropType?: {
        text?: string; // 显示的文本
    }
}

class GemPropTypeComp extends GridComp {
    protected comp: eui.Component & GemPropTypeCompSkin;
    protected compName = 'gemPropTypeComp';

    public refresh(thisObj: BaseGrid, data: GemPropTypeCompCustom): void {
        safeInvokeFunc(this.comp, () => {
            if (!this.comp) return;
            this.comp.visible = !!data?.gemPropType;
            this.comp.lblLv0.text = data.gemPropType?.text || "";
        })
    }
}

interface PetIncubateCompSkin {

    labelDisplay: eui.Label;

}

interface PetIncubateCompCustom {
    petIncubate?: string; // 宠物孵化状态
}

class PetIncubateComp extends GridComp {
    protected comp: eui.Component & PetIncubateCompSkin;
    protected compName = 'petIncubateComp'

    public refresh(thisObj: BaseGrid, data: PetIncubateCompCustom): void {
        safeInvokeFunc(this.comp, () => {
            if (!this.comp) return;
            this.comp.visible = !!data?.petIncubate;
            this.comp.labelDisplay.text = data?.petIncubate || "";
        })
    }
}

interface EquipTagCompSkin {

    lblType: eui.Label;

}

interface EquipTagCompCustom {
    equipTag?: string; // 装备标签
}

class EquipTagComp extends GridComp {
    protected comp: eui.Component & EquipTagCompSkin;
    protected compName = 'equipTagComp'

    public refresh(thisObj: BaseGrid, data: EquipTagCompCustom): void {
        safeInvokeFunc(this.comp, () => {
            if (!this.comp) return;
            const tag = data?.equipTag || "";
            this.comp.visible = !!tag;
            this.comp.lblType.text = tag;
        })
    }
}

interface OnceAniCompCustom {
    onceAni?: boolean; // 装备穿戴动画工程
}

class OnceAniComp extends GridComp {
    // 播完马上干掉的动画
    protected compName = "onceAniComp"

    public refresh(thisObj: BaseGrid, data: OnceAniCompCustom): void {
        // 清理一下可能存在的旧动画
        this.comp.removeEventListener(egret.Event.COMPLETE, this.onAniLoadComplete, this);
        this.comp.in?.removeEventListener(egret.Event.COMPLETE, this.onAniComplete, this);
        this.comp.addEventListener(egret.Event.COMPLETE, this.onAniLoadComplete, this);
        this.comp.skinName = data.onceAni;
        safeInvokeFunc(this.comp, () => {
            if (!this.comp) return;
            this.comp.visible = !!data?.onceAni;
            this.comp.x = thisObj.width / 2;
            this.comp.y = thisObj.height / 2;
        })
    }

    private onAniLoadComplete() {
        safeInvokeFunc(this.comp, () => {
            if (!this.comp || !this.comp.in) return;
            this.comp.in.addEventListener(egret.Event.COMPLETE, this.onAniComplete, this);
            this.comp.in.play();
        });
    }

    private onAniComplete() {
        if (this.comp) {
            this.comp.removeEventListener(egret.Event.COMPLETE, this.onAniLoadComplete, this);
        }

        if (this.comp?.in) {
            this.comp.in.removeEventListener(egret.Event.COMPLETE, this.onAniComplete, this);
            this.comp.in.stop();
        }

        let grpContent = this.comp?.parent as eui.Group;
        if (this.comp && this.comp.parent) {
            this.comp.parent.removeChild(this.comp);
            this.comp = null;
        }
        // 移除组件自身和custom数据
        if (grpContent && grpContent.parent) {
            let grid = grpContent.parent as GoodsGrid;
            grid.dropComp(this.compName);
        }

    }
}

interface StateCompCustom {
    state?: string[] | string; // 状态
}

class StateComp extends GridComp {
    protected compName = 'stateComp';

    public refresh(thisObj: BaseGrid, data: StateCompCustom): void {
        if (!data?.state) {
            thisObj.currentState = '';
        }
        else if (typeof data.state == 'string') {
            thisObj.currentState = data?.state;
        }
        else if (typeof data.state.length == "number") {
            thisObj.currentState = (data.state as string[]).join(',');
        }

    }
}

interface SkillIconCompkin {
    imgSkill: eui.Image;
}

interface SkillIconCustom {
    skillIcon?: string; // 装备标签
}

class SkillIconComp extends GridComp {
    protected comp: eui.Component & SkillIconCompkin;
    protected compName = 'skillIconComp'

    public refresh(thisObj, data: SkillIconCustom) {
        safeInvokeFunc(this.comp, () => {
            if (!this.comp) return;
            this.comp.imgSkill.source = data?.skillIcon || "";
            this.comp.visible = !!data?.skillIcon;
        })
    }

}

const COMP_DICT = {
    rb_label: {
        classname: NumComp,
        compName: 'numComp',
        skinName: uiPath2('common/goods_grid/GoodsGrid_Comp_Num.exml')
    },
    need_select: {
        classname: SelectComp,
        compName: 'selectComp',
        skinName: uiPath2('common/goods_grid/GoodsGrid_Comp_Selected.exml')
    },
    pet_select: {
        classname: PetSelectComp,
        compName: 'PetSelectComp',
        skinName: uiPath2('common/goods_grid/GoodsGrid_Comp_Selected2.exml')
    },
    add_comp: {
        classname: AddComp,
        compName: 'addComp',
        skinName: uiPath2('common/goods_grid/GoodsGrid_Comp_Selected.exml')
    },
    name: {
        classname: NameComp,
        compName: 'nameComp',
        skinName: uiPath2('common/pet_grid/PetGrid_Comp_Namelb.exml')
    },
    got_icon: {
        classname: GotComp,
        compName: 'GotComp',
        skinName: uiPath2('common/goods_grid/GoodsGrid_Comp_Get.exml')
    },
    lt_tag: {
        classname: TagComp,
        compName: 'tagComp',
        skinName: uiPath2('common/goods_grid/GoodsGrid_Comp_Tag.exml')
    },
    up_rate: {
        classname: RateComp,
        compName: 'rateComp',
        skinName: uiPath2('common/goods_grid/GoodsGrid_Comp_UpRate.exml')
    },
    zmul_rate: {
        classname: ZMulComp,
        compName: 'zmulComp',
        skinName: uiPath2('common/goods_grid/GoodsGrid_Comp_WabaoRate.exml')
    },
    disable: {
        classname: DisableComp,
        compName: 'disableComp',
        skinName: uiPath2('common/goods_grid/GoodsGrid_Comp_Disabled.exml')
    },
    can_exchange: {
        classname: ExchangeComp,
        compName: 'exchangeComp',
        skinName: uiPath2('common/pet_grid/PetGrid_Comp_Exchange.exml')
    },
    sort_num: {
        classname: SortNumComp,
        compName: 'sortnumComp',
        skinName: uiPath2('common/pet_grid/PetGrid_Comp_SortNum.exml')
    },
    is_engage: {
        classname: EngageComp,
        compName: 'engageComp',
        skinName: uiPath2('common/pet_grid/PetGrid_Comp_TagFight.exml')
    },
    red_select: {
        classname: RedSelectComp,
        compName: 'redSelectComp',
        skinName: uiPath2('common/goods_grid/GoodsGrid_Comp_Selected.exml')
    },
    red_point: {
        classname: RedPointComp,
        compName: 'redPointComp',
        skinName: uiPath2('common/Com_Reddot.exml')
    },
    lv: {
        classname: LvComp,
        compName: 'LvComp',
        skinName: uiPath2('common/goods_grid/GoodsGrid_Comp_Lv.exml')
    },
    pet_lv: {
        classname: PetLvComp,
        compName: 'petLvComp',
        skinName: uiPath2('common/pet_grid/PetGrid_Comp_Level.exml')
    },
    flash: {
        classname: FlashComp,
        compName: 'flashComp',
        skinName: uiPath2('common/pet_grid/PetGrid_Comp_TagShan.exml')
    },
    tips: {
        classname: TipsComp,
        compName: 'tipsComp',
        skinName: uiPath2('common/goods_grid/GoodsGrid_Comp_Tips.exml')
    },
    addIcon: {
        classname: AddIconComp,
        compName: 'addIconComp',
        skinName: uiPath2('common/goods_grid/GoodsGrid_Comp_Add.exml')
    },
    equiped: {
        classname: EquipedComp,
        compName: 'equipedComp',
        skinName: uiPath2('common/goods_grid/GoodsGrid_Comp_Equiped.exml')
    },
    gemInset: {
        classname: GemInsetComp,
        compName: 'gemInsetComp',
        skinName: uiPath2('common/goods_grid/GoodsGrid_Comp_GemInset.exml')
    },
    gem: {
        classname: GemComp,
        compName: 'gemComp',
        skinName: uiPath2('common/goods_grid/GoodsGrid_Comp_Gem.exml')
    },
    equipLv: {
        classname: EquipLvComp,
        compName: 'equipLvComp',
        skinName: uiPath2('common/goods_grid/GoodsGrid_Comp_EquipLv.exml')
    },
    gemPropType: {
        classname: GemPropTypeComp,
        compName: 'gemPropTypeComp',
        skinName: uiPath2('common/goods_grid/GoodsGrid_Comp_GemPropType.exml')
    },
    petIncubate: {
        classname: PetIncubateComp,
        compName: 'petIncubateComp',
        skinName: uiPath2('common/pet_grid/PetGrid_Comp_Incubate.exml')
    },
    equipTag: {
        classname: EquipTagComp,
        compName: 'equipTagComp',
        skinName: uiPath2('common/goods_grid/GoodsGrid_Comp_EquipTag.exml')
    },
    quaName: {
        classname: QuaNameComp,
        compName: 'quaNameComp',
        skinName: uiPath2('common/goods_grid/GoodsGrid_Comp_QuaName.exml')
    },
    onceAni: {
        classname: OnceAniComp,
        compName: 'onceAniComp',
    },
    state: {
        classname: StateComp,
        compName: 'stateComp',
    },
    skillIcon: {
        classname: SkillIconComp,
        compName: 'skillIconComp',
        skinName: uiPath2('common/goods_grid/GoodsGrid_Comp_Skill.exml')
    },
}

export type BaseGridData = {
    // 实际上在BaseGrid中并没有用到这个字段,只是为了兼容旧代码
    id?: string | number; // 道具ID
    quantity?: number; // 数量
    icon?: string; // 图标
    imgBg?: string; // 背景图
    imgFrame?: string; // 边框图
    imgFrameAlpha?: number; // 边框透明度
    selected?: boolean; // 是否选中
    quality?: QualityEnum; // 道具品质 

    // 新版格子应该要传的数据
    iteminfo?: ItemInfo; // 道具信息
    custom?: GridCompCustom; // 自定义数据
    showAni?: { type: string, source: string }; // 显示动画
    getStateMask?: {
        /**皮肤状态 */
        state: string; // 皮肤状态
        /**
         *  皮肤名
         */
        skin?: string; // 皮肤名
    },
    redPoint?: boolean
    hideEquipTag?: boolean; // 隐藏装备标签
}

export type GoodsGridData = {
    degree?: number; // 装备的品级 todo 为什么要这样写?
    index?: number; // 背包页面用到index, 其实不应该放在这里, 先干掉报错
} & BaseGridData;

export type GridCompCustom = {
    // BaseGrid和 GoodsGrid通用的自定义数据
    bright?: boolean; // 是否高亮  
    showtips?: boolean; // 点击是否显示tips
    showSource?: boolean; // 点击显示tip后，是否自动打开"获取途径"弹窗
    tips_extra?: any;
    showAni2?: number;
    is_grey?: filter_utils.FilterType; // 是否灰色滤镜
    currentState?: string; // 当前状态

    // ?以下是一些不知道用途的字段
    sketch?: string; // 武器剪影资源 todo
    refineMax?: number;
    gridState?: string; // 格子状态
    noTag?: boolean;// 是否显示无角标
    tags?: number[]; // 标签

    // 兽装会替换图标
    new_icon?: number | string;

} & QuaNameCustom
    & NumCompCustom
    & SelectCompCustom
    & AddCompSkin
    & PetSelectCompCustom
    & RedSelectCompCustom
    & NameCompCustom
    & GotCompCustom
    & TagCompCustom
    & RateCompCustom
    & ZMulCompCustom
    & DisableCompCustom
    & RedPointCompCustom
    & SortNumCompCustom
    & ExchangeCompCustom
    & EngageCompCustom
    & LvCompCustom
    & PetLvCompCustom
    & FlashCompCustom
    & TipsCompCustom
    & AddIconCompCustom
    & EquipedCompCustom
    & GemInsetCompCustom
    & GemCompCustom
    & EquipLvCompCustom
    & GemPropTypeCompCustom
    & PetIncubateCompCustom
    & EquipTagCompCustom
    & OnceAniCompCustom
    & StateCompCustom
    & SkillIconCustom;
