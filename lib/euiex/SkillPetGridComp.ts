/**
 * 伙伴/守护的icom组件
 */

import { uiSkinPath } from "GlobalValue";
import { PPStarComp } from "lib/euiex/PPStarComp";
import { SkillGridAniComp } from "lib/euiex/SkillGridAniComp";
import { SkillPPGridComp_Feature, SkillPPGridComp_Intro } from "lib/euiex/SkillPPGridComp";

export enum SkillPetGridCompEnum {
    NONE,//占位
    Lock,
    State,
    Selected,
    Name,
    RedPoint,
    CbLearn,
    Star,
    Mc,
    FeatureComp,
    IntroComp,
    TextinfoComp,
}

export type SkillPetGridCompTreeCfgType = {
    parent: string,
    order: SkillPetGridCompEnum,
    clz: any,
    props: { [key: string]: any }
}

export enum SkillPetGridCompSkin_StateEnum {
    STATE_ADD = "add",
    STATE_ADD_GOLD = "add_gold",
	STATE_DIS = "dis",
    STATE_LOCK = "lock",
    STATE_LOCK_GOLD = "lock_gold",
}
export class SkillPetGridComp_State extends eui.Component {

    private unlock:egret.tween.TweenGroup;
    private imgLock:eui.Image;
    private callback:Function;
    private thisObject:any;
    
    public constructor() {
        super();
        this.skinName = uiSkinPath("SkillPetGridCompSkin_State.exml");
    }

    protected onSkinLoadCompleted(): void {
        this.unlock.addEventListener(egret.Event.COMPLETE, this.onAnimCompleted, this);
        super.onSkinLoadCompleted()
    }

    protected onAnimCompleted(evt: egret.Event) {
        if(this.callback) {
            this.callback.call(this.thisObject, evt)
        }
    }


    $onRemoveFromStage(): void {
        this.callback = null;
        this.thisObject = null;
        super.$onRemoveFromStage()
    }

    @SafeCallFunction()
    public setState(state: string) {
        this.currentState = state;
        this.imgLock.visible = true;
    }

    @SafeCallFunction()
    public playUnlockAni(isPlay:boolean, callback?: Function, thisObject?: any) {
        this.callback = callback;
        this.thisObject = thisObject;
        if(isPlay){
            this.unlock.play(0);
        }
        else{
            this.unlock.stop();
        }
    }

    @SafeCallFunction()
    public setImgLockVisible(value:boolean){
        this.imgLock.visible = value;
    }
}


export enum SkillPetGridCompSkin_NameStateEnum {
	STATE_DES = "des",
	STATE_NAME = "name",
}

export class SkillPetGridComp_TextInfo extends eui.Component {
    lblText: eui.Label;

    public constructor() {
        super();
        this.skinName = uiSkinPath("SkillPetGridCompSkin_TextInfo.exml");
    }

    @SafeCallFunction()
    public setText(text: string) {
        this.lblText.text = text;
    }
}


export class SkillPetGridComp_Name extends eui.Component {
    lblText: eui.Label;
    imgBg: eui.Image;

    public constructor() {
        super();
        this.skinName = uiSkinPath("SkillPetGridCompSkin_Name.exml");
    }

    @SafeCallFunction()
    public setText(text: string) {
        this.lblText.text = text;
    }

    @SafeCallFunction()
    public setImage(source: string) {
        this.imgBg.source = source;
    }

    @SafeCallFunction()
    public setState(state: string) {
        this.currentState = state;
        this.validateNow();
    }
}

export class SkillPetGridComp_Selected extends eui.Component {
    public constructor() {
        super();
        this.skinName = uiSkinPath("SkillPetGridCompSkin_Selected.exml");
    }
}

export class SkillPetGridComp_Cb extends eui.CheckBox {
    public constructor() {
        super();
        this.skinName = uiSkinPath("CheckBoxSkin_Border.exml");
    }
}

export class SkillPetGridComp_Star extends eui.Component {
    
    imgBg: eui.Image;
    lstStar: eui.List;

    public constructor() {
        super();
        this.skinName = uiSkinPath("SkillPetGridCompSkin_Star.exml");
    }

    @SafeCallFunction()
    public setData(star: number, maxStar: number = 5) {
        let lstData = [];
        for (let i=1; i<=maxStar; i++ ) {
            lstData.push(i <= star);
        }
        this.lstStar.itemRenderer = SkillPetGridComp_Star_Item;
        (this.lstStar.dataProvider as eui.ArrayCollection).source = lstData;
    }

    @SafeCallFunction()
    public setBgVisible(visible: boolean) {
        this.imgBg.visible = visible;
    }

}

class SkillPetGridComp_Star_Item extends eui.ItemRenderer {

    imgPoint: eui.Image;

    protected dataChanged(): void {
        super.dataChanged();
        this.imgPoint.source = this.data ? 'pet_skill_final_point_1_png' : 'pet_skill_final_point_0_png';
    }
}


export const SkillPetGridCompTreeCfgs = {
    [SkillPetGridCompEnum.RedPoint]: {
        parent: "grpIcon",
        order: SkillPetGridCompEnum.RedPoint,
    },
    [SkillPetGridCompEnum.Selected]: {
        parent: "grpSelected",
        order: SkillPetGridCompEnum.Selected,
        clz: SkillPetGridComp_Selected
    },
    [SkillPetGridCompEnum.State]: {
        parent: "grpState",
        order: SkillPetGridCompEnum.State,
        clz: SkillPetGridComp_State,
    },
    [SkillPetGridCompEnum.Name]: {
        parent: "grpName",
        order: SkillPetGridCompEnum.Name,
        clz: SkillPetGridComp_Name,
    },
    [SkillPetGridCompEnum.CbLearn]: {
        parent: "grpTop",
        order: SkillPetGridCompEnum.CbLearn,
        clz: SkillPetGridComp_Cb,
    },
    [SkillPetGridCompEnum.Mc]: {
        parent: "grpMc",
        order: SkillPetGridCompEnum.Mc,
        clz: SkillGridAniComp,
    },
    [SkillPetGridCompEnum.FeatureComp]: {
        parent: "grpFeature",
        order: SkillPetGridCompEnum.FeatureComp,
        clz: SkillPPGridComp_Feature,
    },
    [SkillPetGridCompEnum.IntroComp]: {
        parent: "grpState",
        order: SkillPetGridCompEnum.IntroComp,
        clz: SkillPPGridComp_Intro,
    },
    [SkillPetGridCompEnum.TextinfoComp]: {
        parent: "grpInfo",
        order: SkillPetGridCompEnum.TextinfoComp,
        clz: SkillPetGridComp_TextInfo,
    },
    [SkillPetGridCompEnum.Star]: {
        parent: "grpStar",
        order: SkillPetGridCompEnum.Star,
        clz: SkillPetGridComp_Star,
    },
}

export class SkillPetGridCompUtil {

    public static createComp(compTag: SkillPetGridCompEnum, parent: eui.Component) {
        let compCfg = SkillPetGridCompTreeCfgs[compTag];
        let inst = new compCfg.clz();
        compCfg.skinName && (inst.skinName = compCfg.skinName);
        if (isObjectNotVain(compCfg.props)) {
            for (let k in compCfg.props) {
                inst[k] = compCfg.props[k];
            }
        }
        inst["order"] = compCfg.order;
        this.addChildByOrder(compCfg, inst, parent);
        return inst;
    }

    public static addChildByOrder(comCfg: SkillPetGridCompTreeCfgType, widget: egret.DisplayObject, parent: eui.Component) {
        let comParent = parent[comCfg.parent];
        if (!comParent) {
            egret.log("no such parent object:", comCfg.parent, comCfg, parent.skinName)
            return;
        }
        let index = comParent.numChildren + 1;
        for (let i = 0, l = comParent.numChildren; i < l; i++) {
            let comp = comParent.getChildAt(i);
            if ((comp["order"] || 0) > comCfg.order) {
                index = i;
                break;
            }
        }
        comParent.addChildAt(widget, index);
    }
}
