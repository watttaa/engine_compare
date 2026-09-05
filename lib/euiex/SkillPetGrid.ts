import { ObjectTypeEnum } from "auto/object_type_enum";
import { TypeEnum } from "base/Enum";
import { uiAnimationPath } from "GlobalValue";
import { EgretExEntry } from "lib/EgretExUtils_Entry";
import { SkillGridAniComp } from "lib/euiex/SkillGridAniComp";
import { SkillPetGridCompEnum, SkillPetGridCompSkin_NameStateEnum, SkillPetGridCompUtil, SkillPetGridComp_Cb, SkillPetGridComp_Name, SkillPetGridComp_Selected, SkillPetGridComp_Star, SkillPetGridComp_State, SkillPetGridComp_TextInfo } from "lib/euiex/SkillPetGridComp";
import { SkillPPGridComp_Feature, SkillPPGridComp_Intro } from "lib/euiex/SkillPPGridComp";
import { RedPointTreeHelper } from "lib/RedPointManager";
import { TweenGroupPanel } from "lib/TweenGroupPanel";
import { UIManagerFactroy } from "lib/UIManagerFactory";
import { ItemUtils } from "s2/bag/ItemUtils";
import { SkillTipsPanel } from "tips/SkillTipsPanel";
import { loadResource } from "utils/ResUtils";

export function AssemblySkillGirdData(data: any): EgretExEntry.SkillGridData {
    let result: EgretExEntry.SkillGridData;
    result = { icon: data.icon, feature: data.feature };//必须参数
    //可选参数
    if (data.id != undefined) { result["id"] = data.id; };
    if (data.skill_id != undefined) { result["skill_id"] = data.skill_id; };
    if (data.index != undefined) { result["index"] = data.index; };
    if (data.name != undefined) { result["name"] = data.name; };
    if (data.desc != undefined) { result["desc"] = data.desc; };
    if (data.rebornLev != undefined) { result["rebornLev"] = data.rebornLev; };
    if (data.state != undefined) { result["state"] = data.state; };
    if (data.type != undefined) { result["type"] = data.type; };
    if (data.openIds != undefined) { result["openIds"] = data.openIds; };
    return result;
}

export type SkillPetGridCustom = {
    nextPro?: number
    grpLock?: boolean;
    grpStudy?: number;//0不显示【+】，1显示【+】并且不显示特效， 2 显示【+】并显示特效
    grpLearned?: boolean;
    grpCurrent?: boolean;
    grpReddot?: boolean;
    grpCBLearn?: boolean;
    showAni?: boolean;
    grpNum?: number;
    grpName?: string;
    grpDesc?: string;
    grpFeature?: string;
    grpIntro?: string;
    tagBg?: string,    // 标签背景
    maskImg?: string;
    hasGodSkill?: boolean;
    state?: string;
    textinfo?: string;
}

//守护技能
export class SkillPetGrid extends eui.ItemRenderer {    //SkillGrid
    /* 皮肤定义开始 */
    protected grpIcon: eui.Group;
    public imgIcon: eui.Image;
    protected imgFrame: eui.Image;
    protected grpMc: eui.Group;
    protected grpState: eui.Group;
    protected grpSelected: eui.Group;
    protected grpName: eui.Group;
    protected grpInfo: eui.Group;
    protected grpReddot: eui.Group;


    /* 皮肤定义结束 */

    protected $customShow: SkillPetGridCustom;
    protected $isSelected: boolean;

    private $touchFunc: Function;
    private $touchFuncObj: any;
    private $touchFuncArgs: any;

    /**组件 */
    private _nameComp: SkillPetGridComp_Name;
    private _stateComp: SkillPetGridComp_State;
    private _selComp: SkillPetGridComp_Selected;
    private _cbLearnSel: SkillPetGridComp_Cb;
    protected _commonAni: SkillGridAniComp;// 通用动效
    private _featureComp: SkillPPGridComp_Feature; //技能定位
    private _introComp: SkillPPGridComp_Intro; //技能简介
    private _textinfoComp: SkillPetGridComp_TextInfo;
    private _starComp: SkillPetGridComp_Star;

    public constructor() {
        super();
        // this.skinName = "resource/eui_skins/SkillPetGrid.exml";
        this.$customShow = {};
        this.$isSelected = false;
    }

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

    private $upgradeTween: TweenGroupPanel;
    public playAni(name: string, call?, callFun?, tweenGroup?: string, parent: string = 'grpMc') {
        if (this.$upgradeTween) {
            this.$upgradeTween.destroy();
        }
        this.$upgradeTween = UIManagerFactroy.createTweenGroupPanel(this[`${parent}`], `resource/eui_skins/${name}.exml`, 0, 0, false);
        if (tweenGroup) {
            this.$upgradeTween.playTweenGroup(tweenGroup, 1, callFun, call)
        }
        else {
            this.$upgradeTween.play();
        }
    }

    public destoryAni() {
        if (this.$upgradeTween) {
            this.$upgradeTween.stop();
            this.$upgradeTween.destroy();
        }
    }

    protected onSkinLoadCompleted() {
        super.onSkinLoadCompleted();
        this.$updateSelected();
        this.addEventListener(egret.TouchEvent.TOUCH_TAP, this.$onTouchedItem, this);
    }

    public $onRemoveFromStage() {
        super.$onRemoveFromStage();
        this.clearAni();
        this.clearTouchFunc();
        this.removeEventListener(egret.TouchEvent.TOUCH_TAP, this.$onTouchedItem, this);
    }


    //获取途径
    private $onTouchTapbtnReplace(evt: egret.TouchEvent) {
        evt.stopImmediatePropagation();
        let data = this.data as EgretExEntry.SkillGridData;
        // PetCNet.C_OPEN_GODPET_SKILL(data.pid);
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

    public SetSelected(isSelect: boolean) {
        this.$isSelected = isSelect;
        this.$updateSelected();
    }

    protected $updateSelected() {
        if (!this.completed) return;
        this.setSelVisible(this.$isSelected);
    }

    public SkillGridData() {
        let data = this.data as EgretExEntry.SkillGridData;
        let gridSkillData: EgretExEntry.SkillGridData = AssemblySkillGirdData(data);
        return gridSkillData;
    }

    protected updateSkillGrid() {
        let data = this.data as EgretExEntry.SkillGridData;
        if (data && data.icon) {
            //this.skillGrid.setShowData(this.SkillGridData());
            this.imgIcon.visible = true;
            this.setSkillGridIcon("" + data.icon)
        }
        // this.imgFrame.source = ''
        // this.imgFrame.visible = false;
        // if (data && data.quality) {
        //     this.imgFrame.source = `skill_frame_${this.data.quality}_png`;
        //     this.imgFrame.visible = true;
        // }
        //名字底板
        // this.imgName.source = 'pet_bg_bottom1_png'
        // if (data && data.quality) {
        //     this.imgName.source = `pet_skillnamebg_${this.data.quality}_png`;
        // }

    }

    public setSkillGridIcon(icon: string) {
        this.imgIcon.source = ItemUtils.getItemByIcon(icon, TypeEnum.SKILL);
    }

    protected dataChanged() {
        super.dataChanged();
        this.refresh();
    }

    protected refresh() {
        this.$reset();
        //技能图标
        this.updateSkillGrid();
        //选中
        this.$updateSelected();
        //
        this.$updateCustomShow();
        //列表上下翻转的时候子项也翻转一下才能保证显示正常
        let flagY = this.parent.scaleY / Math.abs(this.parent.scaleY);
        this.scaleY = flagY * Math.abs(this.scaleY);
    }

    protected $onTouchedItem(evt: egret.TouchEvent) {
        if (this.$touchFunc) {
            this.$touchFunc.call(this.$touchFuncObj, this.$touchFuncArgs);
        } else {
            UIManager.open(SkillTipsPanel).then((inst: SkillTipsPanel) => {
                inst.setData(this.SkillGridData());
            });
        }
    }

    /**
     * 特殊显示相关
     */
    private $reset() {
        this.setNameVisible(false);
        this.setFeatureVisible(false);
        this.setStateVisible(false);
        this.setCbLeardCompVisible(false);
        this.setTextInfoVisible(false);
        this.setStarVisible(false);
        this.grpIcon && (this.grpIcon.visible = true);
    }

    public setCustomShow(showData: SkillPetGridCustom) {
        this.$customShow = showData;
        this.$updateCustomShow();
    }

    protected $updateCustomShow() {
        if (!this.$customShow) return;
        if (this.completed) {
            this.$reset();
            if (this.$customShow.grpReddot != undefined) {
                this.grpReddot.visible = this.$customShow.grpReddot;
                RedPointTreeHelper.addPointOnWidget(this.grpReddot, this.$customShow.grpReddot);
            };
            this.defaultSetName();
            this.updateFrame();
            if (this.$customShow.state != undefined) {
                this.setStateVisible(true);
                this.grpIcon.visible = false;
                this.stateComp.setState(this.$customShow.state)
            } else {
                this.setStateVisible(false);
                this.grpIcon.visible = true;
            }
            //
            if (this.$customShow.grpCBLearn != undefined) {
                this.setCbLeardCompVisible(this.$customShow.grpCBLearn);
            }
            if (this.$customShow.grpDesc != undefined) {
                let desc = this.$customShow.grpDesc;
                if (desc) {
                    this.setNameVisible(true)
                    this.nameComp.setState(SkillPetGridCompSkin_NameStateEnum.STATE_DES);
                    this.nameComp.validateNow();
                    this.nameComp.setText(desc)
                }
            }
            if (this.$customShow.textinfo != undefined) {
                let desc = this.$customShow.textinfo;
                if (desc) {
                    this.setTextInfoVisible(true)
                    this.textinfoComp.validateNow();
                    this.textinfoComp.setText(desc)
                }
            }
            /**
             * 竖的(intro)：miao1、miao3、miao5
             * 横的(feature)：danti、miaoer、miaowu
             */
            //技能简介 intro
            if (this.$customShow.grpIntro != undefined) {
                let intro = this.$customShow.grpIntro;
                this.introComp.visible = false;
                if (intro) {
                    this.introComp.visible = true;
                    this.introComp.setBg(`com_tag_name_${this.$customShow.tagBg}_png`);
                    this.introComp.setText(intro);
                }
            }
            //技能定位 feature
            if (this.$customShow.grpFeature != undefined) {
                let feature = this.$customShow.grpFeature;
                this.featureComp.visible = false;
                if (feature) {
                    this.featureComp.visible = true;
                    this.featureComp.setText(feature);
                }
            }
            if (this.$customShow.showAni != undefined) { this.ShowAniMc(this.$customShow.showAni); };

            // 突破等级
            if (this.data && this.data.lv > 0) {
                this.setStarVisible(true);
                this.starComp.setData(this.data.lv);
                this.setCommonAniVisible(true);
                this.setCommonAni('AniZjSkillLight', `_${this.data.lv}`);
            } else {
                this.setCommonAniVisible(false);
            }
        }
    }

    private defaultSetName() {
        if (this.data && this.data.name) {
            this.setNameVisible(true)
            this.nameComp.setState(SkillPetGridCompSkin_NameStateEnum.STATE_NAME);
            this.nameComp.validateNow();
            this.nameComp.setText(this.data.name);
            this.updateNameBg();
        }
    }

    /**
     * 技能名底板
     */
    private updateNameBg() {
        if (this._nameComp) {
            if (this.data && this.data.quality) {
                this.nameComp.setImage(`pet_skill_name_${this.data.quality}_png`);
            } else {
                this.nameComp.setImage(`pet_skill_name_0_png`);
            }
        }
    }
    /**
     * 技能外框
     */
    private updateFrame() {
        if (this.imgFrame) {
            if (this.data && this.data.quality) {
                this.imgFrame.source = `pet_skill_frame_${this.data.quality}_png`;
            } else {
                this.imgFrame.source = `pet_skill_frame_0_png`;
            }
        }
    }

    /**
     * 神兽技能动效相关
     */
    protected $aniMc: egret.MovieClip;
    private onRenderCheckVisible(): void {
        if (!UIManager.isRealVisible(this)) {
            this.clearAni();
        }
    }

    protected clearAni(): void {
        if (this.$aniMc) {
            this.$aniMc.stop();
            this.$aniMc.parent.removeChild(this.$aniMc);
            this.$aniMc.visible = false;
        }

        if (this.$upgradeTween) {
            this.$upgradeTween.visible = false;
            this.$upgradeTween.destroy();
            this.$upgradeTween = null;
        }
        this.removeEventListener(egret.Event.RENDER, this.onRenderCheckVisible, this);
    }

    protected onMCDataComplete(mcData: MCData) {
        if (!this.$aniMc) {
            return;
        }
        this.$aniMc.movieClipData = egret.MovieClipDataFactory.getInstance().generateMovieClipData(mcData.mcData, mcData.mcTexture);
        // this.$aniMc.blendMode = egret.BlendMode.ADD;
        this.$aniMc.scaleX = this.$aniMc.scaleY = 1.1;
        this.$aniMc.play(-1);
    }

    protected ShowAniMc(isShowAni: boolean) {
        if (this.$aniMc && this.$aniMc.visible == isShowAni) return;
        if (isShowAni) {
            if (!this.$aniMc) {
                this.grpMc.touchChildren = false;
                this.$aniMc = new egret.MovieClip();
                this.$aniMc.touchEnabled = false;
                this.grpMc.addChild(this.$aniMc);
            }
            this.$aniMc.visible = true;
            // getMCData("resource/assets/animate/huangcijiang.json", this.onMCDataComplete, this);
            getMCData(uiAnimationPath(`activity/vx_pinzhihuan_platinum_NormalS1.json`), this.onMCDataComplete, this);
        } else {
            if (this.$aniMc) {
                this.$aniMc.stop();
                this.$aniMc.visible = false;
            }
        }
    }

    /*****************************************************************************
     * 组件相关开始
     *****************************************************************************/
    public createComp(compTag: SkillPetGridCompEnum) {
        return SkillPetGridCompUtil.createComp(compTag, this);
    }

    public get textinfoComp() {
        if (!this.completed) return null;
        if (!this._textinfoComp) {
            this._textinfoComp = this.createComp(SkillPetGridCompEnum.TextinfoComp);
        }
        return this._textinfoComp;
    }
    public setTextInfoVisible(isVisible: boolean) {
        if (isVisible) {
            this.textinfoComp.visible = true;
        } else {
            this.textinfoComp && (this._textinfoComp.visible = false);
        }
    }

    public get nameComp() {
        if (!this.completed) return null;
        if (!this._nameComp) {
            this._nameComp = this.createComp(SkillPetGridCompEnum.Name);
        }
        return this._nameComp;
    }

    public setNameVisible(isVisible: boolean) {
        if (isVisible) {
            this.nameComp.visible = true;
        } else {
            this._nameComp && (this._nameComp.visible = false);
        }
    }


    public get featureComp(): SkillPPGridComp_Feature {
        if (!this.completed) return null;
        if (!this._featureComp) {
            this._featureComp = this.createComp(SkillPetGridCompEnum.FeatureComp);
            this._featureComp.horizontalCenter = 0;
            this._featureComp.bottom = -10;
        }
        return this._featureComp;
    }

    public get introComp(): SkillPPGridComp_Intro {
        if (!this.completed) return null;
        if (!this._introComp) {
            this._introComp = this.createComp(SkillPetGridCompEnum.IntroComp);
            this._introComp.left = -4;
            this._introComp.top = -1;
        }
        return this._introComp;
    }

    public setFeatureVisible(isVisible: boolean) {
        if (isVisible) {
            this.featureComp.visible = true;
        } else {
            this._featureComp && (this._featureComp.visible = false);
        }
    }

    public get stateComp() {
        if (!this.completed) return null;
        if (!this._stateComp) {
            this._stateComp = this.createComp(SkillPetGridCompEnum.State);
        }
        return this._stateComp;
    }

    public setStateVisible(isVisible: boolean) {
        if (isVisible) {
            this.stateComp.visible = true;
        } else {
            this._stateComp && (this._stateComp.visible = false);
        }
    }

    public setStateLockVisible(isVisible: boolean) {
        this._stateComp && this._stateComp.setImgLockVisible(isVisible);
    }

    public playUnlockAni(isPlay: boolean, callback?: Function, thisObject?: any) {
        this.stateComp && this.stateComp.playUnlockAni(isPlay, callback, thisObject);
    }

    public get selComp() {
        if (!this.completed) return null;
        if (!this._selComp) {
            this._selComp = this.createComp(SkillPetGridCompEnum.Selected);
        }
        return this._selComp;
    }

    public setSelVisible(isVisible: boolean) {
        if (isVisible) {
            this.selComp.visible = true;
        } else {
            this._selComp && (this._selComp.visible = false);
        }
    }

    public get commonAni() {
        if (!this.completed) return null;
        if (!this._commonAni) {
            this._commonAni = this.createComp(SkillPetGridCompEnum.Mc);
        }
        return this._commonAni;
    }

    public setCommonAni(baseSkinName: string, state: string = undefined) {
        if (!this.completed) return null;
        this.commonAni.setAniSkinName(baseSkinName, state)
        return this._commonAni;
    }

    public setCommonAniVisible(isVisible: boolean) {
        if (isVisible) {
            this.commonAni.visible = true;
        } else {
            if (this._commonAni) {
                this._commonAni.visible = false;
                this._commonAni.stop();
            }
        }
    }

    public get cbLearnSel() {
        if (!this.completed) return null;
        if (!this._cbLearnSel) {
            this._cbLearnSel = this.createComp(SkillPetGridCompEnum.CbLearn);
        }
        return this._cbLearnSel;
    }


    public setCbLeardCompVisible(isVisible: boolean) {
        if (isVisible) {
            this.cbLearnSel.visible = true;
        } else {
            this._cbLearnSel && (this._cbLearnSel.visible = false);
        }
    }

    public get starComp() {
        if (!this.completed) return null;
        if (!this._starComp) {
            this._starComp = this.createComp(SkillPetGridCompEnum.Star);
        }
        return this._starComp;
    }

    public setStarVisible(isVisible: boolean) {
        if (isVisible) {
            this.starComp.visible = true;
        } else {
            this._starComp && (this._starComp.visible = false);
        }
    }
}