import { ObjectTypeEnum } from "auto/object_type_enum";
import { TypeEnum } from "base/Enum";
import { PetGodSkill } from "base/ServerEntry";
import { uiAnimationPath } from "GlobalValue";
import { EgretExEntry } from "lib/EgretExUtils_Entry";
import { GodPetSkillGridCompEnum, GodPetSkillGridCompUtil, GodPetSkillGridComp_Lb, GodPetSkillGridComp_Mask, GodPetSkillGridComp_Name, SkillPetGridCompSkin_NameStateEnum } from "lib/euiex/GodPetSkillGridComp";
import { SkillGridAniComp } from "lib/euiex/SkillGridAniComp";
import { RedPointTreeHelper } from "lib/RedPointManager";
import { TweenGroupPanel } from "lib/TweenGroupPanel";
import { UIManagerFactroy } from "lib/UIManagerFactory";
import { ItemUtils } from "s2/bag/ItemUtils";
import { SkillTipsPanel } from "tips/SkillTipsPanel";

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

export type GodPetSkillGridCustom = {
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
    maskImg?: string;
    hasGodSkill?: boolean
}

//神兽技能
export class GodPetSkillGrid extends eui.ItemRenderer {    //SkillGrid
    /* 皮肤定义开始 */
    protected grpSelected: eui.Group;
    protected lblLock: eui.Label;
    protected grpStudy: eui.Group;
    protected lblStudy: eui.Label;
    // protected grpLearned: eui.Group;
    protected grpCurrent: eui.Group;
    protected grpReddot: eui.Group;
    // protected grpNum: eui.Group;
    // protected labelNum: eui.Label;
    protected grpMc: eui.Group;
    // protected btnReplace: eui.Group;
    protected imgIcon: eui.Image;
    // protected grpCond: eui.Group;
    // protected lblCond: eui.Label;
    protected unlock: egret.tween.TweenGroup;
    protected Learn: egret.tween.TweenGroup;
    protected cycle: egret.tween.TweenGroup;
    protected image1: eui.Image;
    protected imgFrame: eui.Image;
    // protected grpName: eui.Group;
    // protected lblName: eui.Label;
    // protected imgName: eui.Image;
    // protected grpDesc: eui.Group;
    // protected lblDesc: eui.Label;
    protected grpFlowMask: eui.Group;
    // protected grpCBLearn: eui.Group;
    // protected cbLearnSel: eui.CheckBox;

    /* 皮肤定义结束 */

    protected $customShow: GodPetSkillGridCustom;
    protected $isSelected: boolean;

    private $touchFunc: Function;
    private $touchFuncObj: any;
    private $touchFuncArgs: any;

    /**组件 */
    private _maskComp: GodPetSkillGridComp_Mask
    private _nameComp: GodPetSkillGridComp_Name
    private _btnReplace: eui.Component;
    private _learnedComp: eui.Component;
    private _numComp: GodPetSkillGridComp_Lb;
    private _cbLearnSel: eui.CheckBox;
    protected _commonAni: SkillGridAniComp;// 通用动效

    public constructor() {
        super();
        // this.skinName = "resource/eui_skins/SkillPetGrid.exml";
        this.$customShow = {};
        this.$isSelected = false;
    }

    private $upgradeTween: TweenGroupPanel;
    public playAni(name: string, call, callFun) {
        if (this.$upgradeTween) {
            this.$upgradeTween.destroy();
        }
        this.$upgradeTween = UIManagerFactroy.createTweenGroupPanel(this.grpMc, `resource/eui_skins/${name}.exml`, 0, 0, false);
        this.$upgradeTween.play(1, callFun, call);
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
        let data = this.data as PetGodSkill;
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
        this.grpSelected.visible = this.$isSelected;
        // this.skillGrid.selected = this.$isSelected;
    }

    public SkillGridData() {
        let data = this.data as PetGodSkill;
        let gridSkillData: EgretExEntry.SkillGridData = AssemblySkillGirdData(data);
        return gridSkillData;
    }

    protected updateSkillGrid() {
        let data = this.data as PetGodSkill;
        if (data && data.icon) {
            //this.skillGrid.setShowData(this.SkillGridData());
            this.imgIcon.visible = true;
            this.imgIcon.source = ItemUtils.getItemByIcon(data.icon, TypeEnum.SKILL);
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

        this.test()
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
        this.setMaskVisible(false);
        this.grpStudy && (this.grpStudy.visible = false);
        this.setLeardCompVisible(false);
        this.grpCurrent && (this.grpCurrent.visible = false);
        this.grpReddot && (this.grpReddot.visible = false);
        this.setNumCompVisible(false)
        this.setCbLeardCompVisible(false);
        this.setBtnReplaceVisible(false)
        // this.imgSelected && (this.imgSelected.visible = false);
        this.imgIcon && (this.imgIcon.visible = false);
        this.ShowAniMc(false);//流光动效
        this.cycle.stop();
        this.image1.visible = false;
    }

    public setCustomShow(showData: GodPetSkillGridCustom) {
        this.$customShow = showData;
        this.$updateCustomShow();
    }

    protected $updateCustomShow() {
        if (!this.$customShow) return;
        if (this.completed) {
            // this.$reset();
            if (this.$customShow.grpLock != undefined) { this.maskComp.visible = this.$customShow.grpLock; };
            //if (this.$customShow.grpLearned != undefined) { this.grpLearned.visible = this.$customShow.grpLearned; };
            if (this.$customShow.grpLearned != undefined) { this.setBtnReplaceVisible(!this.$customShow.grpLearned); };
            if (this.$customShow.grpCurrent != undefined) { this.grpCurrent.visible = this.$customShow.grpCurrent; };
            if (this.$customShow.grpReddot != undefined) {
                this.grpReddot.visible = this.$customShow.grpReddot;
                RedPointTreeHelper.addPointOnWidget(this.grpReddot, this.$customShow.grpReddot);
            };
            if (this.data && this.data.desc && this.$customShow.grpLock) {
                this.setNameVisible(true);
                this.nameComp.currentState = SkillPetGridCompSkin_NameStateEnum.STATE_COND;
                this.nameComp.validateNow();
                this.nameComp.setText(this.data.desc);
            }
            if (this.$customShow.grpStudy != undefined) {
                let value = this.$customShow.grpStudy
                let visible = [1, 2].indexOf(value) > -1 && this.$customShow.grpLearned;
                if (visible) {
                    this.maskComp.visible = true;
                    this.maskComp.setImage("pet_skill_add0_png")
                    this.nameComp.visible = true;
                    this.nameComp.currentState = SkillPetGridCompSkin_NameStateEnum.STATE_STUDY;
                    if (value == 2) {
                        this.cycle.play(0);
                        this.image1.visible = true;
                    }
                }
            };
            if (this.$customShow.grpName != undefined) {
                //技能名字
                let name = this.$customShow.grpName;
                if (name != "") {
                    this.setNameVisible(true)
                    this.nameComp.currentState = SkillPetGridCompSkin_NameStateEnum.STATE_NAME;
                    this.nameComp.validateNow();
                    this.nameComp.setText(name);
                    this.updateNameBg();
                }
            } else {
                this.defaultSetName();
            }
            if (this.$customShow.maskImg != undefined) {
                this.maskComp.visible = this.$customShow.maskImg != "";
                this.maskComp.setImage(this.$customShow.maskImg);
            }
            //
            if (this.$customShow.grpDesc != undefined) {
                let desc = this.$customShow.grpDesc;
                // this.grpDesc.visible = desc != "";
                // this.lblDesc.text = desc;
                if (desc) {
                    this.nameComp.visible = true;
                    this.nameComp.currentState = SkillPetGridCompSkin_NameStateEnum.STATE_DES;
                    this.nameComp.validateNow();
                    this.nameComp.setText(desc)

                }
            }
            //
            if (this.$customShow.grpCBLearn != undefined) {
                this.setCbLeardCompVisible(this.$customShow.grpCBLearn);
            }
            if (this.$customShow.grpNum != undefined) { //数量显示
                let num = this.$customShow.grpNum;
                if (num > 0) {
                    this.setNumCompVisible(true);
                    this.numComp.setText(`${num}`)
                }
            };
            //流光动效
            if (this.$customShow.showAni != undefined) { this.ShowAniMc(this.$customShow.showAni); };
            //技能图标显示
            // let isLockShow = !this.$customShow.grpLock;
            // let isIconShow = !this.grpStudy.visible && isLockShow
            // this.imgIcon.visible = isIconShow;

            if (this.$customShow.hasGodSkill) {
                this.imgIcon.visible = true;
                this.imgIcon.source = 'pet_shengshouskillhead_img_png';
                this.setBtnReplaceVisible(false);
            }
        }
    }

    private defaultSetName() {
        if (this.data && this.data.name) {
            this.setNameVisible(true)
            this.nameComp.currentState = SkillPetGridCompSkin_NameStateEnum.STATE_NAME;
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
                // this.nameComp.setImage(`skill_frame_${this.data.quality}_png`);
                this.nameComp.setImage(`skill_frame_${this.data.quality}_bg_png`);
            } else {
                this.nameComp.setImage(`pet_bg_bottom1_png`);
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
    public createComp(compTag: GodPetSkillGridCompEnum) {
        return GodPetSkillGridCompUtil.createComp(compTag, this);
    }

    public get maskComp() {
        if (!this.completed) return null;
        if (!this._maskComp) {
            this._maskComp = this.createComp(GodPetSkillGridCompEnum.Mask);
        }
        return this._maskComp;
    }

    public setMaskVisible(isVisible: boolean) {
        if (isVisible) {
            this.maskComp.visible = true;
        } else {
            this._maskComp && (this._maskComp.visible = false);
        }
    }

    public get nameComp() {
        if (!this.completed) return null;
        if (!this._nameComp) {
            this._nameComp = this.createComp(GodPetSkillGridCompEnum.Name);
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

    public get btnReplace() {
        if (!this.completed) return null;
        if (!this._btnReplace) {
            this._btnReplace = this.createComp(GodPetSkillGridCompEnum.BtnReplace);
            this._btnReplace.addEventListener(egret.TouchEvent.TOUCH_TAP, this.$onTouchTapbtnReplace, this);
        }
        return this._btnReplace;
    }


    public setBtnReplaceVisible(isVisible: boolean) {
        if (isVisible) {
            this.btnReplace.visible = true;
        } else {
            this._btnReplace && (this._btnReplace.visible = false);
        }
    }

    public get learnedComp() {
        if (!this.completed) return null;
        if (!this._learnedComp) {
            this._learnedComp = this.createComp(GodPetSkillGridCompEnum.Learned);
        }
        return this._learnedComp;
    }

    public setLeardCompVisible(isVisible: boolean) {
        if (isVisible) {
            this.learnedComp.visible = true;
        } else {
            this._learnedComp && (this._learnedComp.visible = false);
        }
    }


    public get cbLearnSel() {
        if (!this.completed) return null;
        if (!this._cbLearnSel) {
            this._cbLearnSel = this.createComp(GodPetSkillGridCompEnum.CbLearn);
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

    public get numComp() {
        if (!this.completed) return null;
        if (!this._numComp) {
            this._numComp = this.createComp(GodPetSkillGridCompEnum.Num);
        }
        return this._numComp;
    }

    public setNumCompVisible(isVisible: boolean) {
        if (isVisible) {
            this.numComp.visible = true;
        } else {
            this._numComp && (this._numComp.visible = false);
        }
    }

    public setCommonAni(baseSkinName: string, state: string = undefined) {
        if (!this.completed) return null;
        if (!this._commonAni) {
            this._commonAni = this.createComp(GodPetSkillGridCompEnum.Mc);
        }
        this._commonAni.setAniSkinName(baseSkinName, state)
        return this._commonAni;
    }

    test() {
        // this.btnReplace.visible = true;
        // this.learnedComp.visible = true;
        // this.cbLearnSel.visible = true;
        // this.numComp.visible = true;
        // this.numComp.setText("12345")
    }
}