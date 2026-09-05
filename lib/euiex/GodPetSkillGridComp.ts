/**
 * 伙伴/守护的icom组件
 */

import { uiSkinPath } from "GlobalValue";
import { SkillGridAniComp } from "lib/euiex/SkillGridAniComp";

export enum GodPetSkillGridCompEnum {
    NONE,//占位
    Lock,
    Mask,
    Selected,
    Num,
    Name,
    RedPoint,
    Learned,
    BtnReplace,
    CbLearn,
    Mc,
}

export type GodPetSkillGridCompTreeCfgType = {
    parent: string,
    order: GodPetSkillGridCompEnum,
    clz: any,
    props: { [key: string]: any }
}

export class GodPetSkillGridComp_Lb extends eui.Component {
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

export class GodPetSkillGridComp_Mask extends eui.Component {
    imgIcon: eui.Image;

    public constructor() {
        super();
        this.skinName = uiSkinPath("SkillGodPetGridCompSkin_Mask.exml");
    }

    @SafeCallFunction()
    public setImage(source: string) {
        // this.imgIcon.visible = !!source; //没啥用，先注释
        // this.imgIcon.source = source;
    }

    @SafeCallFunction()
    public setImageVisible(isVisible: boolean) {
        // this.imgIcon.visible = isVisible;
    }

}


export enum SkillPetGridCompSkin_NameStateEnum {
	STATE_COND = "_cond",
	STATE_NAME = "_name",
	STATE_STUDY = "_study",
	STATE_DES = "_des",
}

export class GodPetSkillGridComp_Name extends eui.Component {
    lblText: eui.Label;
    imgBg: eui.Image;

    public constructor() {
        super();
        this.skinName = uiSkinPath("SkillGodPetGridCompSkin_Name.exml");
    }

    public onSkinLoadCompleted(){
        super.onSkinLoadCompleted();
        this.lblText.addEventListener(egret.TextEvent.DRAW_TEXT, this.updateNameBgSize, this);
    }

    @SafeCallFunction()
    public setText(text: string) {
        this.lblText.text = text;
    }

    @SafeCallFunction()
    public setImage(source: string) {
        // this.imgBg.source = source;
    }

    private updateNameBgSize() {
        // if (this.currentState == SkillPetGridCompSkin_NameStateEnum.STATE_NAME) {
        //     if (this.lblText.text.length <= 4) {
        //         this.imgBg.width = 136
        //     } else {
        //         this.imgBg.width = 166
        //     }
        // }
    }

}


export const GodPetSkillGridCompTreeCfgs = {
    [GodPetSkillGridCompEnum.Mask]: {
        parent: "grpMask",
        order: GodPetSkillGridCompEnum.Mask,
        clz: GodPetSkillGridComp_Mask,
        props: {
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
        }
    },
    [GodPetSkillGridCompEnum.Num]: {
        parent: "grpInfo",
        order: GodPetSkillGridCompEnum.Num,
        clz: GodPetSkillGridComp_Lb,
        skinName: 'resource/eui_skins/SkillGodPetGridCompSkin_Num.exml',
        props: {
            horizontalCenter: 0,
            bottom: -2,
        }
    },
    [GodPetSkillGridCompEnum.Selected]: {
        parent: "grpInfo",
        order: GodPetSkillGridCompEnum.Selected,
    },
    [GodPetSkillGridCompEnum.RedPoint]: {
        parent: "grpTopInfo",
        order: GodPetSkillGridCompEnum.RedPoint,
    },
    [GodPetSkillGridCompEnum.Name]: {
        parent: "grpName",
        order: GodPetSkillGridCompEnum.Name,
        clz: GodPetSkillGridComp_Name,
    },
    [GodPetSkillGridCompEnum.BtnReplace]: {
        parent: "grpTopInfo",
        order: GodPetSkillGridCompEnum.BtnReplace,
        clz: eui.Component,
        skinName: uiSkinPath('SkillGodPetGridCompSkin_BtnReplace.exml'),
        props: {
            bottom: 12,
            right: -6,
        }
    },
    [GodPetSkillGridCompEnum.Learned]: {
        parent: "grpTopInfo",
        order: GodPetSkillGridCompEnum.Learned,
        clz: eui.Component,
        skinName: 'resource/eui_skins/SkillGodPetGridCompSkin_Learded.exml',
    },
    [GodPetSkillGridCompEnum.CbLearn]: {
        parent: "grpTopInfo",
        order: GodPetSkillGridCompEnum.CbLearn,
        clz: eui.CheckBox,
    },
    [GodPetSkillGridCompEnum.Mc]: {
        parent: "grpMc",
        order: GodPetSkillGridCompEnum.Mc,
        clz: SkillGridAniComp,
    },
}

export class GodPetSkillGridCompUtil {

    public static createComp(compTag: GodPetSkillGridCompEnum, parent: eui.Component) {
        let compCfg = GodPetSkillGridCompTreeCfgs[compTag];
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

    public static addChildByOrder(comCfg: GodPetSkillGridCompTreeCfgType, widget: egret.DisplayObject, parent: eui.Component) {
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
