import { PET, PPEvolveState, PPLockState, RED_SKIN, uiSkinPath } from "GlobalValue";
import { GlobalValue } from "GlobalValueDefine";
import { SpecialTextColor, getTextColorString } from "TextColorUtils";
import { s2_rolelevel_cfg } from "auto/RoleLevel";
import { s2_model_cfg } from "auto/model";
import { ItemInfo } from "s2/bag/ItemInfo";
import { getItemTipsCls } from "s2/bag/TableReadCreater";
import { ConstraintEnum, HunQiStateEnum, ItemMcTypeEnum, QualityEnum, TAG } from "base/Enum";
import { PropEntry, TYPE_PP_ICON_DETAIL } from "base/ServerEntry";
import { ItemMCSelectControl } from "common/ItemMCSelectControl";
import { EgretExEntry } from "lib/EgretExUtils_Entry";
import { RedPointTreeHelper } from "lib/RedPointManager";
import { TagSkin } from "lib/euiex/TagSkin";
import { TagSkinEx } from "lib/euiex/TagSkinEx";

import { s2_text_utils } from "auto/text";
import { BagCNet } from "s2/bag/net/BagCNet";
import { TipsUI } from "tips/TipsUI";
import { loadResource, res_utils } from "utils/ResUtils";
import { ui_utils_constraint } from "utils/UIUtils_constraint";
import { ui_utils_tag } from "utils/UIUtils_tag";
import { CompTreeCfgType, CompTreeCfgs, FollowerGridCompEnum, FollowerGridComp_Add, FollowerGridComp_Attr, FollowerGridComp_Empty, FollowerGridComp_Floor, FollowerGridComp_HunQi, FollowerGridComp_Intro, FollowerGridComp_Lb, FollowerGridComp_Lock, FollowerGridComp_Mask, FollowerGridComp_Star, PPGridCompSkinMaskFightRecord } from "./FollowerItemComponent";
import { ServerAvatarEntry } from "avatar/AvatarEntry";


export type HunQiBasicEntry = {
    star: number;
    id: number;
    state?: HunQiStateEnum;
    skill?: { name: string, desc: string }
}

export type CommonAwardsExt4601Entry = {

    now_score?: number
    old_score?: number
    open_id?: number
    prog_max?: number
    score_sid?: number
    wait_reward_box?: boolean
    desc?: string
}

export type TrialMonsterItemEntry = {
    avatar_model: ServerAvatarEntry;
    name?: string;//怪物名称
    prop: PropEntry;//怪物属性
}


export type PPIconPageData = {
    /**格子所在页签，用于展示特殊数据，例如亲密度等级 */
    page?: string; //PetDetailFrameworkType
}
export type PPIconItemData = TYPE_PP_ICON_DETAIL & PPIconPageData;

export interface IQualityEffect {
    /**初始化品质特效 */
    resetQualityAni(quality: number, frameCon: number, num: number, showAniType: ItemMcTypeEnum, frame: number,);
    listenItemMcCreate(evt: egret.Event): void;
}

// TypeScript file
export class IconItemBase extends eui.ItemRenderer implements IQualityEffect {
    public _isEuiex = true;
    protected grpRoot: eui.Group;
    protected grpMain: eui.Group;
    //底板
    protected grpFloor: eui.Group;
    protected imgFrame: eui.Image;//品质底色
    protected imgIcon: eui.Image;
    protected imgFrameF: eui.Image;//品质底色边框
    //角标、详情
    protected grpInfo: eui.Group;
    //protected grpSPS: eui.Group;//已经废弃
    // protected grpName: eui.Group;
    // protected imgStrength: eui.Image;//已经废弃
    // protected imgHecheng: eui.Image;
    // protected imgStarup: eui.Image;
    // protected imgActive: eui.Image;

    //等级、星级
    protected grpReal: eui.Group;
    //选中
    // protected grpSelected: eui.Group;
    protected Select: eui.Image;
    //编队图标
    // protected grpTeam: eui.Group;
    // protected grpEmpty: eui.Group;
    // protected imgAdd: eui.Image;
    //红点
    // protected grpReddot: eui.Group;
    //品质动效
    protected grpMc: eui.Group;
    // protected _imgTag1: eui.Image;
    // 遮罩
    // protected imgMaskIcon: eui.Image;

    // protected $mc: egret.MovieClip;
    protected $mc: ItemMCSelectControl;

    // protected grpAttr: eui.Group;
    // protected grpFighting: eui.Group;
    // protected imgAttrIcon: eui.Image;
    // protected imgFighting: eui.Image;
    protected teamId: number;

    protected $custom: EgretExEntry.PPIconItemCustomData = {};

    protected noSelect: boolean
    protected isCheckReddot: boolean = true;//默认检测红点
    public isDynamicRedPoint = true; // 用来标识组件是动态红点，使红点管理器取其redComp组件
    protected frameFVisibel: boolean;

    grpLeftTag: eui.Group;
    imgLeftTag: eui.Image;
    lblLeftTag: eui.Label;
    labelNum: eui.Label;
    /**================== */
    private _floorComp: FollowerGridComp_Floor;
    private _lblObj: FollowerGridComp_Lb;// 中间下方文本
    private _lblLevel: FollowerGridComp_Lb;// 右上角文本
    private _lblName: FollowerGridComp_Lb;// 名字
    private _starComp: FollowerGridComp_Star;
    private _lockComp: FollowerGridComp_Lock;
    private _deadComp: eui.Component;
    private _maskComp: FollowerGridComp_Mask;
    private _maskComp2: FollowerGridComp_Mask;
    private _imgRightTag: eui.Image;
    private _tag: TagSkin;
    private _tagEx: TagSkinEx;
    private _compSel: eui.Component;
    private _redComp: eui.Component;
    private _emptyComp: FollowerGridComp_Empty;
    private _addComp: FollowerGridComp_Add;
    private _attrComp: FollowerGridComp_Attr;
    private _prgHp: eui.ProgressBar;
    private _btnTick: eui.Button;
    private _imgZhan: eui.Image;//左上方出战标识
    private _introComp: FollowerGridComp_Intro;//属性简介（高伤、燃烧...）
    private _teamDisComp: PPGridCompSkin_TeamPre_Dis;
    private _teamLockComp: PPGridCompSkin_TeamPre_Lock;
    private _hqComp: FollowerGridComp_HunQi; //右上方魂器标识
    private _fightRecordComp: PPGridCompSkinMaskFightRecord;

    protected onSkinLoadCompleted() {
        this.imgFrame.source = "";
        super.onSkinLoadCompleted();
        if (this.data && this.data.level != undefined) {
            this.updateLevel();
        }
        //GlobalEvent.ListenEvent(ItemMCSelectControl.ITEM_MCSELCT_CREATE, this.listenItemMcCreate, this);
    }

    public $onRemoveFromStage() {
        this.clearQualityMc();
        //GlobalEvent.UnListenEvent(ItemMCSelectControl.ITEM_MCSELCT_CREATE, this.listenItemMcCreate, this);
        super.$onRemoveFromStage();
    }

    //剔除多余的引用
    public listenItemMcCreate(evt: egret.Event): void {
        let ctrl = evt.data[0] as ItemMCSelectControl;
        if (!this.$mc || !(ctrl instanceof ItemMCSelectControl)) return;
        if (ctrl.hashCode == this.$mc.hashCode) {
            let itemInfo: ItemInfo = this.data;
            if (!itemInfo) return;
            let grpParent = this.getMcNode(itemInfo.quality, itemInfo.showAniType)
            if (ctrl.grpParent && grpParent) {
                if (ctrl.grpParent.hashCode != grpParent.hashCode) {
                    this.$mc = null;
                }
            }
        }
    }

    public clearQualityMc() {
        if (this.$mc) {
            this.$mc.stop();
            this.$mc.removeSelf();
            //let parent = this.$qulityMc.parent;
            //parent && parent.removeChild(this.$qulityMc);
            this.$mc = null
        }
    }

    public constructor() {
        super();
        this.setSkinName();
        this.addEventListener(egret.TouchEvent.TOUCH_TAP, this.onTouchTapItem, this);

    }

    public static preloadResource(data: TYPE_PP_ICON_DETAIL) {
        loadResource(res_utils.getNpcIconSmall(data.icon, false));
        eui.getAssetsAsync(GlobalValue.QuaBorder[data.quality]);
        eui.getAssetsAsync(GlobalValue.QuaFrame[data.quality]);
    }

    protected setSkinName() {
        this.skinName = uiSkinPath("PPGridSkin.exml");
    }

    protected defaultInit() {
        /** 没用到的全部隐藏，渲染不然会造成渲染浪费*/
        this.grpFloor.visible = false;
        this.grpInfo.visible = true;
        this.grpReal.visible = false;
        this._compSel && (this._compSel.visible = false);
        this._lockComp && (this._lockComp.visible = false);
        this._redComp && (this._redComp.visible = false);
        this.grpMc.visible = false;
        this._floorComp && (this._floorComp.visible = false);
        if (this._prgHp) this._prgHp.visible = false;
        if (this._attrComp) this._attrComp.visible = false;
        if (this._maskComp) this._maskComp.visible = false;
        if (this._maskComp2) this._maskComp2.visible = false;
        if (this._introComp) this._introComp.visible = false;
        if (this._teamDisComp) this._teamDisComp.visible = false;
        if (this._teamLockComp) this._teamLockComp.visible = false;
        // ui_utils_tag.updateTag(this, TAG.EMPTY);//隐藏角标
        this.clearTag();
        this.noSelect = false;//默认可选中
        this._starComp && (this._starComp.visible = false);
        this._deadComp && (this._deadComp.visible = false);
        this._emptyComp && (this._emptyComp.visible = false);
        this._btnTick && (this._btnTick.visible = false);
        this._imgZhan && (this._imgZhan.visible = false);
        this._lblLevel && (this._lblLevel.visible = false);
        this._hqComp && (this._hqComp.visible = false);
        this.frameFVisibel = true;
        this.imgIcon.source = '';
        if (this.labelNum) {
            this.labelNum.text = "";
        }
    }

    private clearTag() {
        this._tag && (this._tag.visible = false);
        this._tagEx && (this._tagEx.visible = false);
        this._imgRightTag && (this._imgRightTag.visible = false);
    }

    private updateTag(tags: number[]) {
        // ui_utils_tag.updateTag(this, TAG.EMPTY);// 清空所有tag
        this.clearTag();
        if (!tags || tags.length == 0)
            return;

        for (let tagID of tags) {
            ui_utils_tag.updateTagData(this, tagID);
        }
    }


    protected haveDataInit() {
        this.grpFloor.visible = true;
        this.grpReal.visible = true;
        this.grpMc.visible = true;
    }

    protected haveData() { return !!this.data; }

    //出战：state==1
    //可激活：lock==1，锁定中：lock==2
    //已拥有：lock==0, state==0
    protected dataChanged() {
        this.defaultInit();
        let hasData: boolean = this.haveData();
        if (!hasData) return;
        let data = this.data as PPIconItemData;
        this.haveDataInit();
        // let is_lock;
        // if (data.page == PetDetailFrameworkType.Page_PetDetail || data.page == PartnerDetailFrameworkType.Page_Partner) {//详情页签可激活不显示遮罩
        //     is_lock = data.lock === PPLockState.Lock;
        // } else {
        //     is_lock = data.lock === PPLockState.Lock || data.lock === PPLockState.OnActive;
        // }
        let is_lock = data.lock === PPLockState.Lock// || data.lock === PPLockState.OnActive;
        this.setGrpLockVisible(is_lock)
        if (data.star !== undefined) {
            if (!is_lock && data.star > 0) {
                this.starComp.visible = true;
                this.starComp.updateView(data.star);
            }
        } else {
            this._starComp && (this._starComp.visible = false);
        }
        if (isArrayNotVain(data.obj)) {
            this.lblObj.visible = is_lock && data.obj[0] > 0;
            this.lblObj.setText(data.obj[0] + "/" + data.obj[1]);
        } else {
            this._lblObj && (this._lblObj.visible = false);
        }

        this.imgIcon.source = res_utils.getNpcIconSmall(data.icon, false);

        this.setName(data.name);

        this.setQualityFrame(data.quality);
        this.imgFrame.visible = this.frameFVisibel;

        // //守护显示备战
        // if (follower_utils.PID2FollowerType(data.pid) == PET) {
        //     this.imgZhan.source = data.formationFellower <= 1 ? 'com_tag_pp_ready_png' : 'com_grid_tag_battle_png';
        // } else {
        //     this.imgZhan.source = 'com_grid_tag_battle_png';
        // }
        this.imgZhan.visible = this.data.formationFellower >= 0;

        // this.checkMC();
        this.clearQualityMc();
        if (data.isHunQiState) {
            // this.setHunQiComp(data.hunqi_basic);
        } else {
            this.updateLevel();
        }
        this.$updateCustom();
        this.resetQualityAni(data.quality, data.effect_type);

        this.$setSelected(this.selected);
        this.updataTagFightRecord();
    }

    @SafeCallFunction()
    public setIconSource(source: string) {
        if (!this.imgIcon) {
            Logger.error('PPIconItem ' + this.skinName);
            return;
        }
        this.imgIcon.source = source;
    }

    @SafeCallFunction()
    public setQualityFrame(quality: number) {
        if (quality) {
            this.imgFrame.source = GlobalValue.QuaBorder[quality];
            this.imgFrameF.source = GlobalValue.QuaFrame[quality];
        }
    }

    @SafeCallFunction()
    public setName(name: string) {
        this.setLblNameVisible(!!name);
        if (name) {
            this.lblName.setText(`${this.getNameColor()}${name}`);
        }
    }

    @SafeCallFunction()
    public setHunQiComp(hqInfo: HunQiBasicEntry) {
        let isSupport = hqInfo?.id && !isNaN(hqInfo?.state) && hqInfo?.state != HunQiStateEnum.NOT_SUPPORT;
        this.seHunQiCompVisible(isSupport);
        if (isSupport) {
            let isGot = hqInfo?.state != HunQiStateEnum.NOT_GOT;
            this.hqComp.setState(isGot);
        }
    }

    protected getNameColor(): string {
        let data = this.data as TYPE_PP_ICON_DETAIL;
        if (data && data.name_color != undefined) {
            return data.name_color;
        } else {
            return "";
        }
    }

    protected defaultShowStar(isHide: boolean = false) {
        //默认显示逻辑
        let data = this.data as TYPE_PP_ICON_DETAIL;
        if (!data) return;
        if (isHide) {
            this._starComp && (this._starComp.visible = false);
        } else {
            let is_lock = data.lock === PPLockState.Lock;
            if (data.star !== undefined && !is_lock && data.star > 0) {
                this.starComp.visible = true;
                this.starComp.updateView(data.star);
            } else {
                this._starComp && (this._starComp.visible = false);
            }
        }
    }


    protected defaultShowLevel() {
        //默认显示逻辑
        let data = this.data as TYPE_PP_ICON_DETAIL;
        if (!data || data.isHunQiState) return;
        if (data.lock == PPLockState.OnActive) { // 为2时拥有但未激活
            this._lblLevel && (this._lblLevel.visible = false);
        } else {
            if (data.level > 0) {
                this.lblLevel.visible = true;
            } else {
                this._lblLevel && (this._lblLevel.visible = false);
            }
        }
    }

    //五行图标显示
    protected defaultShowWuxing(showWuxing: boolean) {
        //默认显示逻辑
        let data = this.data as TYPE_PP_ICON_DETAIL;
        if (!data) return;
        if (showWuxing && isNotVain(data.elem)) {
            this.attrComp.visible = true;
            this.attrComp.setImgAttrIcon(`icon_elem_${data.elem}_png`);
        } else {
            this._attrComp && (this._attrComp.visible = false);
        }
    }

    // 升级时单独更新等级lbl
    @SafeCallFunction()
    public updateLevel() {
        let data = this.data as PPIconItemData;
        if (data.isHunQiState) {
            //显示魂器专属标记
        } else {
            if (data && data.level) {
                // if (data.page == PartnerDetailFrameworkType.Page_YuQi) {
                //     this.lblLevel.setText(text_utils.T(20007, { level: data.favor_lv }));
                // } else {
                //     this.lblLevel.setText(rolelevel_cfg.getShowLvEx(this.data.level));
                // }
            } else {
                // this.lblLevel.setText(text_utils.T(20007, { level: 0 }));
                this.lblLevel.setText("");
            }
        }
    }

    protected updataTag(isEmpty: boolean) {
        let data = this.data
        if (!data) return;
        if (isEmpty) {
            // ui_utils_tag.updateTag(this, TAG.EMPTY);
            this._tag && (this._tag.visible = false);
        }
        else if (data.lock == PPLockState.OnActive && data.page) {
            ui_utils_tag.updateTag(this, TAG.JIHUO);//激活
        }
        // else if (data.evolve == PPEvolveState.SOUL && (data.page == PartnerDetailFrameworkType.Page_Shengxing || data.page == PetDetailFrameworkType.Page_Shengxing)) {
        //     // ui_utils_tag.updateTag(this, TAG.SHENGXING);//升星
        // }
        else if (data.evolve == PPEvolveState.STAR_UP) {
            ui_utils_tag.updateTag(this, TAG.TUPO);//突破
        }
        else {
            // ui_utils_tag.updateTag(this, TAG.EMPTY);
            this._tag && (this._tag.visible = false);
        }
    }

    protected updataTagFightRecord() {
        let data = this.data;
        if (!data) return;
        if (data.fightRecordMaskSate) {
            this.fightRecordComp.currentState = data.fightRecordMaskSate;
            this.fightRecordComp.visible = true;
        }
        else {
            this._fightRecordComp && (this._fightRecordComp.visible = false)
        }
    }


    public setSelectedFrame(visible: boolean) {
        if (visible && !this.noSelect) {
            this.compSel && (this.compSel.visible = true);
        } else {
            this._compSel && (this._compSel.visible = false);
        }
    }

    protected $setSelected(value: boolean) {
        super.$setSelected(value);
        this.setSelectedFrame(value)
    }

    protected onTouchTapItem(evt: egret.TouchEvent) {
        if (this.$custom?.touchFunc instanceof Function) {
            let ret = this.$custom.touchFunc.call(this.$custom.touchThis);
            if (evt && ret) {
                evt.stopImmediatePropagation();
            }
        }
    }

    public resetQualityAni(quality: number, showAniType: ItemMcTypeEnum = ItemMcTypeEnum.MovieClip) {
        let hideEffect = this.$custom && this.$custom.showEffect === false;
        if (this.$mc) {
            this.$mc.destroy();
        }
        if (!hideEffect && showAniType != ItemMcTypeEnum.None) {
            this.$mc = ItemMCSelectControl.create(this.getMcNode(quality, showAniType), showAniType);
            this.$mc.resetQualityAni(quality);
        }
    }

    public getMcNode(quality: number, showAniType: ItemMcTypeEnum): eui.Group {
        if (showAniType == ItemMcTypeEnum.MovieClip) {
            let obj = {
                [QualityEnum.RED]: "yellow_red",
                [QualityEnum.ORANGE]: "yellow_red",
                [QualityEnum.PLATINUM]: "BaiJin",
                [QualityEnum.RED_PLATINUM]: "BaiJin",
            }
            return obj[quality] && this[obj[quality]] || this.grpMc;
        } else {
            return this.grpMc;
        }
    }

    public getGrpMc() {
        return this.grpMc;
    }

    public getGrpInfo() {
        return this.grpInfo;
    }

    public setState(state: number) {
    }

    protected isCheckRedDot() {
        //默认显示
        let bNoCheck = this.$custom && this.$custom.checkReddot == false;
        return !bNoCheck;
    }

    // 更新红点
    public updateRedPoint() {
        if (!this.isCheckRedDot()) return;
        // let hadRedDot = checkIsShowRedDot(this.data);
        // RedPointTreeHelper.addPointOnWidget(this, hadRedDot);
    }

    public setGrpMaskVisible(isVisible: boolean) {
        if (isVisible) {
            this.maskComp.visible = true;
        } else {
            this._maskComp && (this._maskComp.visible = false);
        }
    }

    protected setGrpLockVisible(isVisible: boolean) {
        if (isVisible) {
            this.lockComp.visible = true;
        } else {
            this._lockComp && (this._lockComp.visible = false);
        }
    }

    public setCustom(data: EgretExEntry.PPIconItemCustomData, isUpdate: boolean = true) {
        this.$custom = data || {};
        if (isUpdate) {
            this.$updateCustom();
        }
    }

    protected resetCustom() {
        //默认显示逻辑
        // this.grpName.visible = true;
        this.defaultShowLevel();
        this.defaultShowStar();
        this.defaultShowWuxing(false);
    }

    protected $updateCustom() {
        if (this.completed) {
            this.resetCustom();
            if (this.$custom) {
                //显示红点
                this.updateRedPoint();
                //显示等级
                if (isNotVain(this.$custom.showLevel)) {
                    if (this.$custom.showLevel) {
                        this.lblLevel.visible = this.$custom.showLevel;
                    } else {
                        this._lblLevel && (this._lblLevel.visible = false);
                    }
                }
                //不显示星级
                if (this.$custom.showStar == false) {
                    this.defaultShowStar(true);
                }
                //五行
                if (isNotVain(this.$custom.showWuxing)) {
                    this.defaultShowWuxing(this.$custom.showWuxing);
                }
                //显示名称
                if (isNotVain(this.$custom.showName)) {
                    this.lblName.visible = this.$custom.showName;
                }
                if (isNotVain(this.$custom.hideZhan)) {
                    this.imgZhan.visible = !this.$custom.hideZhan;
                }
                //显示角标
                this.updataTag(this.$custom.hideTag);
            }
        }
    }

    public setImgFrameF(visible: boolean) {
        this.frameFVisibel = visible;
        this.imgFrameF && (this.imgFrameF.visible = visible);
    }

    /*****************************************************************************
     * 组件相关开始
     *****************************************************************************/
    public addToWidget(widget: egret.DisplayObject, compTag: FollowerGridCompEnum) {
        if (!widget.parent) {
            let compCfg = CompTreeCfgs[compTag];
            widget["order"] = compCfg.order;
            this.addChildByOrder(compCfg, widget);
        }
    }

    public addChildByOrder(comCfg: CompTreeCfgType, widget: egret.DisplayObject) {
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

    protected setFloorComp(source: string, lock: boolean = false, scale: number = 1) {
        if (source == "" && !lock) {
            this._floorComp && (this._floorComp.visible = false);
        } else {
            this.floorComp.visible = true;
            if (source) this.floorComp.setImage(source);
            this.floorComp.setLock(lock);
        }
        if (this._floorComp) {
            this._floorComp.scaleX = scale;
            this._floorComp.scaleY = scale;
        }
    }

    public get floorComp(): FollowerGridComp_Floor {
        if (!this.completed) return null;
        if (!this._floorComp) {
            this._floorComp = new FollowerGridComp_Floor();
            this._floorComp.left = 0;
            this._floorComp.right = 0;
            this._floorComp.top = 0;
            this._floorComp.bottom = 0;
        }
        this.addToWidget(this._floorComp, FollowerGridCompEnum.FloorComp);
        return this._floorComp;
    }

    public get lblObj() {
        if (!this.completed) return null;
        if (!this._lblObj) {
            this._lblObj = new FollowerGridComp_Lb();
            this._lblObj.bottom = 2;
            this._lblObj.horizontalCenter = 0;
            this._lblObj.skinName = 'resource/eui_skins/PPGridCompSkin_BottomLb.exml'
        }
        this.addToWidget(this._lblObj, FollowerGridCompEnum.BottomLb);
        return this._lblObj;
    }

    public get lblLevel() {
        if (!this.completed) return null;
        if (!this._lblLevel) {
            this._lblLevel = new FollowerGridComp_Lb();
            this._lblLevel.skinName = uiSkinPath("PPGridCompSkin_RightTopLb.exml")
            this._lblLevel.top = 4;
            this._lblLevel.right = 6;
        }
        this.addToWidget(this._lblLevel, FollowerGridCompEnum.RightTopLb);
        return this._lblLevel;
    }

    public get lblName() {
        if (!this.completed) return null;
        if (!this._lblName) {
            this._lblName = new FollowerGridComp_Lb();
            this._lblName.skinName = uiSkinPath('PPGridCompSkin_NameLb.exml')
            this._lblName.horizontalCenter = 0;
            this._lblName.y = 104;
        }
        this.addToWidget(this._lblName, FollowerGridCompEnum.Name);
        return this._lblName;
    }

    public get starComp() {
        if (!this.completed) return null;
        if (!this._starComp) {
            this._starComp = new FollowerGridComp_Star();
            this._starComp.bottom = 2;
            this._starComp.horizontalCenter = 0;
        }
        this.addToWidget(this._starComp, FollowerGridCompEnum.Star);
        return this._starComp;
    }

    public get lockComp() {
        if (!this.completed) return null;
        if (!this._lockComp) {
            this._lockComp = new FollowerGridComp_Lock();
        }
        this.addToWidget(this._lockComp, FollowerGridCompEnum.Lock);
        return this._lockComp;
    }

    public get deadComp() {
        if (!this.completed) return null;
        if (!this._deadComp) {
            this._deadComp = new eui.Component();
            this._deadComp.skinName = 'resource/eui_skins/PPGridCompSkin_Dead.exml';
        }
        this.addToWidget(this._deadComp, FollowerGridCompEnum.Dead);
        return this._deadComp;
    }

    public get maskComp() {
        if (!this.completed) return null;
        if (!this._maskComp) {
            this._maskComp = new FollowerGridComp_Mask();
            this._maskComp.skinName = 'resource/eui_skins/PPGridCompSkin_Mask.exml';
            this._maskComp.top = this._maskComp.bottom = this._maskComp.left = this._maskComp.right = 0;
        }
        this.addToWidget(this._maskComp, FollowerGridCompEnum.Mask);
        return this._maskComp;
    }

    public get maskComp2() {
        if (!this.completed) return null;
        if (!this._maskComp2) {
            this._maskComp2 = new FollowerGridComp_Mask();
            this._maskComp2.skinName = 'resource/eui_skins/PPGridCompSkin_Mask.exml';
            this._maskComp2.top = this._maskComp2.bottom = this._maskComp2.left = this._maskComp2.right = 0;
        }
        this.addToWidget(this._maskComp2, FollowerGridCompEnum.Mask2);
        return this._maskComp2;
    }

    public get tag() {
        if (!this.completed) return null;
        if (!this._tag) {
            this._tag = new TagSkin();
            this._tag.left = this._tag.top = -1;
        }
        this.addToWidget(this._tag, FollowerGridCompEnum.Tag);
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
        this.addToWidget(this._tagEx, FollowerGridCompEnum.TagEx);
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
        this.addToWidget(this._imgRightTag, FollowerGridCompEnum.RightTag);
        return this._imgRightTag;
    }

    public isImgRightTagExit() {
        return !!this._imgRightTag;
    }

    public get compSel() {
        if (!this.completed) return null;
        if (!this._compSel) {
            this._compSel = new eui.Component();
            this._compSel.skinName = uiSkinPath("ItemGridSkin_Selected.exml")
            this._compSel.top = this._compSel.left = this._compSel.bottom = this._compSel.right = 0;
        }
        this.addToWidget(this._compSel, FollowerGridCompEnum.Selected);
        return this._compSel;
    }

    public get redComp() {
        if (!this.completed) return null;
        if (!this._redComp) {
            this._redComp = new eui.Component();
            this._redComp.name = "point";
            this._redComp.skinName = RED_SKIN;
            this._redComp.top = this._redComp.right = 6;
        }
        this.addToWidget(this._redComp, FollowerGridCompEnum.RedPoint);
        return this._redComp;
    }

    public get emptyComp() {
        if (!this.completed) return null;
        if (!this._emptyComp) {
            this._emptyComp = new FollowerGridComp_Empty();
        }
        this.addToWidget(this._emptyComp, FollowerGridCompEnum.Empty);
        return this._emptyComp;
    }

    public get addComp() {
        if (!this.completed) return null;
        if (!this._addComp) {
            this._addComp = new FollowerGridComp_Add();
        }
        this.addToWidget(this._addComp, FollowerGridCompEnum.Add);
        return this._addComp;
    }

    public get attrComp() {
        if (!this.completed) return null;
        if (!this._attrComp) {
            this._attrComp = new FollowerGridComp_Attr();
        }
        this.addToWidget(this._attrComp, FollowerGridCompEnum.Attr);
        return this._attrComp;
    }

    // public get imgTag1() {
    //     if (!this.completed) return null;
    //     if (!this._imgTag1) {
    //         this._imgTag1 = new eui.Image();
    //         this._imgTag1.source = "skillsheet_json.skill_grid_tag_fanji";
    //         this._imgTag1.left = -13;
    //         this._imgTag1.top = 8;
    //         this.addToWidget(this._imgTag1, FollowerGridCompEnum.ImgTag);
    //     }
    //     return this._imgTag1;
    // }

    public get introComp() {
        if (!this.completed) return null;
        if (!this._introComp) {
            this._introComp = new FollowerGridComp_Intro();
            this._introComp.left = -6;
            this._introComp.top = 16;
        }
        this.addToWidget(this._introComp, FollowerGridCompEnum.Intro);
        return this._introComp;
    }

    public get prgHp() {
        if (!this.completed) return null;
        if (!this._prgHp) {
            this._prgHp = new eui.ProgressBar();
            this._prgHp.skinName = "resource/eui_skins/ProgressBarSkin_PPHp.exml";
            this._prgHp.horizontalCenter = 0;
            this._prgHp.y = 136;
        }
        this.addToWidget(this._prgHp, FollowerGridCompEnum.Hp);
        return this._prgHp;
    }

    public get btnTick() {
        if (!this.completed) return null;
        if (!this._btnTick) {
            this._btnTick = new eui.Button();
            this._btnTick.skinName = uiSkinPath("PPGridCompSkin_Tick.exml");
            this._btnTick.top = this._btnTick.left = this._btnTick.bottom = this._btnTick.right = 0;
        }
        this.addToWidget(this._btnTick, FollowerGridCompEnum.BtnTick);
        return this._btnTick;
    }

    public get imgZhan() {
        if (!this.completed) return null;
        if (!this._imgZhan) {
            this._imgZhan = new eui.Image();
            this._imgZhan.source = 'com_grid_tag_battle_png'
            this._imgZhan.top = this._imgZhan.left = this._imgZhan.top = 0;
        }
        this.addToWidget(this._imgZhan, FollowerGridCompEnum.imgZhan);
        return this._imgZhan;
    }

    public get teamDisComp() {
        if (!this.completed) return null;
        if (!this._teamDisComp) {
            this._teamDisComp = new PPGridCompSkin_TeamPre_Dis();
            this._teamDisComp.verticalCenter = this._teamDisComp.top = 0;
        }
        this.addToWidget(this._teamDisComp, FollowerGridCompEnum.TeamDis);
        return this._teamDisComp;
    }

    public get teamLockComp() {
        if (!this.completed) return null;
        if (!this._teamLockComp) {
            this._teamLockComp = new PPGridCompSkin_TeamPre_Lock();
            this._teamLockComp.verticalCenter = this._teamLockComp.top = 0;
        }
        this.addToWidget(this._teamLockComp, FollowerGridCompEnum.TeamLock);
        return this._teamLockComp;
    }

    public get fightRecordComp() {
        if (!this.completed) return null;
        if (!this._fightRecordComp) {
            this._fightRecordComp = new PPGridCompSkinMaskFightRecord();
            this._fightRecordComp.verticalCenter = 0;
            this._fightRecordComp.horizontalCenter = 0;
        }
        this.addToWidget(this._fightRecordComp, FollowerGridCompEnum.Intro);
        return this._fightRecordComp;
    }

    /**魂器标记 */
    public get hqComp(): FollowerGridComp_HunQi {
        if (!this.completed) return null;
        if (!this._hqComp) {
            this._hqComp = new FollowerGridComp_HunQi();
            this._hqComp.top = this._hqComp.right = 6;
        }
        this.addToWidget(this._hqComp, FollowerGridCompEnum.HunQi);
        return this._hqComp;
    }

    public setEmptyCompVisible(visible: boolean) {
        if (visible) {
            this.emptyComp.visible = true;
        } else {
            this._emptyComp && (this._emptyComp.visible = false);
        }
    }

    @SafeCallFunction()
    public setAddCompVisible(visible: boolean) {
        if (visible) {
            this.addComp.visible = true;
        } else {
            this._addComp && (this._addComp.visible = false);
        }
    }

    public setLockCompVisible(visible: boolean) {
        if (visible) {
            this.lockComp.visible = true;
        } else {
            this._lockComp && (this._lockComp.visible = false);
        }
    }

    public setAttrCompVisible(visible: boolean) {
        if (visible) {
            this.attrComp.visible = true;
        } else {
            this._attrComp && (this._attrComp.visible = false);
        }
    }

    public setMaskCompVisible(visible: boolean) {
        if (visible) {
            this.maskComp.visible = true;
        } else {
            this._maskComp && (this._maskComp.visible = false);
        }
    }

    public setMaskComp2Visible(visible: boolean) {
        if (visible) {
            this.maskComp2.visible = true;
        } else {
            this._maskComp2 && (this._maskComp2.visible = false);
        }
    }

    public setLblNameVisible(visible: boolean) {
        if (visible) {
            this.lblName.visible = true;
        } else {
            this._lblName && (this._lblName.visible = false);
        }
    }

    public seHunQiCompVisible(visible: boolean) {
        if (visible) {
            this.hqComp.visible = true;
        } else {
            this._hqComp && (this._hqComp.visible = false);
        }
    }

    @SafeCallFunction()
    public setLblNameY(y: number) {
        this.lblName.y = y;
    }

    /*****************************************************************************
     * 组件相关结束
     *****************************************************************************/

}

export class FollowerIconItem extends IconItemBase {
    protected onSkinLoadCompleted() {
        this.updateCustoms();//
        super.onSkinLoadCompleted();
        this.initMaskComp();//需要放onSkinLoadCompleted后面
    }

    protected get showEffect() {
        return false;
    }

    protected updateCustoms() {
        this.noSelect = true;//无选中框
        //custom
        let custom: EgretExEntry.PPIconItemCustomData = {
            //可选
            showEffect: this.showEffect,//默认不显示动效
        }
        this.setCustom(custom, false);//只设置不刷新，后续datachange会刷新

    };

    dataChanged() {
        super.dataChanged()
        this.noSelect = true;//不要选中框
    }

    private initMaskComp() {
        this.maskComp.setImage("pet_switch_lock_png");
        safeInvokeFunc(this.maskComp, () => {
            ui_utils_constraint.setItemIconConstraints(this.maskComp.imgIcon, ConstraintEnum.LeftTop);
        })
    }

    protected setGrpLockVisible(isVisible: boolean) {
        //用 grpMask 替换 grpLock，因为目前 grpLock 有两张图片，比较麻烦
        this.maskComp && (this.maskComp.visible = isVisible);
    }

}

export type FollowerResetIconCustom = {
    showLevel: boolean,
    showName: boolean,
    noSelect: boolean,
}

class FollowerResetIconBase extends IconItemBase {
    protected onSkinLoadCompleted() {
        this.updateCustoms();//
        super.onSkinLoadCompleted();
    }

    protected updateCustoms() { };

    // 共同：不显示(角标、红点、星星)
    protected get basicCustom(): EgretExEntry.PPIconItemCustomData {
        let commonCustom: EgretExEntry.PPIconItemCustomData = {
            //共同
            hideTag: true,//不显示角标
            checkReddot: false,//不显示红点
            showStar: false,//不显示星级
            showEffect: false,
        }
        return commonCustom
    }
}

//伙伴、守护重置选中图标
export class FollowerResetTableIcon extends FollowerResetIconBase {
    //无选中框、不显示 等级、名称、五行
    protected updateCustoms() {
        this.noSelect = true;//无选中框
        let custom: EgretExEntry.PPIconItemCustomData = {
            ...this.basicCustom,
            ...{
                //可选
                showLevel: false,//不显示等级
                showName: false,//不显示名称
                showWuxing: false,//不显示五行
                hideZhan: true,
            }
        }
        this.setCustom(custom, false);//只设置不刷新，后续datachange会刷新
    }
}

//伙伴、守护重置列表
export class FollowerResetListIcon extends FollowerResetIconBase {
    protected updateCustoms() {
        this.noSelect = false;//有选中框
        let custom: EgretExEntry.PPIconItemCustomData = {
            ...this.basicCustom,
            ...{
                //可选
                showLevel: true,//显示等级
                showName: true,//显示名称
                showWuxing: true,//显示五行
                hideZhan: true
            }
        }
        this.setCustom(custom, false);//只设置不刷新，后续datachange会刷新
    }

    protected dataChanged() {
        super.dataChanged();
        let data = this.data as TYPE_PP_ICON_DETAIL;
        if (data.intro) {
            this.introComp.visible = true;
            // this.imgTag1.source = `petsheet_json.pet_tag_${data.intro}`
            // this.introComp.setBg();
            this.introComp.setIntro(`${data.intro}`);
        }
    }
}

//升星预览
export class StarPrevFollowerIconItem extends IconItemBase {
    protected dataChanged() {
        super.dataChanged();
    }

    public updateRedPoint() { }// 不显示红点
}

//伙伴展示组件，可弹出伙伴碎片提示
export class PartnerShowIconItem extends FollowerIconItem {
    protected onTouchTapItem() {
        let data: TYPE_PP_ICON_DETAIL = this.data;
        if (!data.fragmentId) {
            return;
        }
        let itemInfo = ItemInfo.create({ sid: data.fragmentId, effect_type: data.effect_type });
        let cls = getItemTipsCls(itemInfo.id);
        UIManager.open(cls).then((inst: TipsUI) => {
            inst.setData(itemInfo);
            BagCNet.C_GET_ITEM_EXTRA_INFO(itemInfo);
        });
    }
}

export class MonsterIconItem extends eui.ItemRenderer {
    grpFloor: eui.Group;
    imgIcon: eui.Image;
    rectIconMask: eui.Rect;
    grpInfo: eui.Group;
    grpName: eui.Group;
    lblName: eui.Label;
    grpBoss: eui.Group;
    grpReddot: eui.Group;

    public isBoss = false;

    public destroy() {
        this.$onRemoveFromStage();
    }

    public constructor() {
        super();
        this.skinName = "resource/eui_skins/ItemGridSkin_Monster.exml";
    }

    protected onSkinLoadCompleted() {
        super.onSkinLoadCompleted();
        if (this.data) {
            this.$updateCustom();
        }
    }

    protected defaultInit() {
        /** 没用到的全部隐藏，渲染不然会造成渲染浪费*/
        this.grpInfo.visible = true;
        this.grpFloor.visible = false;
        this.grpName.visible = false;
        this.grpReddot.visible = false;
        this.grpBoss.visible = false;
    }

    protected haveDataInit() {
        this.grpInfo.visible = true;
        this.grpFloor.visible = true;
        this.grpName.visible = true;
    }

    protected haveData() { return true; }

    protected dataChanged() {
        super.dataChanged();
        this.defaultInit();
        let hasData: boolean = this.haveData();
        if (!hasData) return;
        let data = this.data as TrialMonsterItemEntry;
        this.haveDataInit();
        let icon = s2_model_cfg.ModelInfo[data.avatar_model.body][s2_model_cfg.iResource]
        this.imgIcon.source = res_utils.getNpcIconSmall(icon, false);
        this.lblName.text = `${this.getNameColor()}${data.name}`;
    }

    protected getNameColor() {
        return getTextColorString(SpecialTextColor.White);
    }

    public showBossFrame(isBoss) {
        this.isBoss = isBoss;
        this.$updateCustom();
    }

    protected $updateCustom() {
        if (!this.completed) return;
        if (this.grpBoss) {
            this.grpBoss.visible = this.isBoss;
        }
    }
}

export class PPGridCompSkin_TeamPre_Dis extends eui.Component {

    public constructor() {
        super();
        this.skinName = uiSkinPath('PPGridCompSkin_TeamPre_Dis.exml');
    }
}

export class PPGridCompSkin_TeamPre_Lock extends eui.Component {

    lblTeam: eui.Label;

    public constructor() {
        super();
        this.skinName = uiSkinPath('PPGridCompSkin_TeamPre_Lock.exml');
    }

    @SafeCallFunction()
    public setTeamId(id: number) {
        this.lblTeam.text = this.lblTeam.originText.replace(/\d+/g, id + "")
    }
}


