/**
 * 伙伴/守护的icom组件
 */

import { uiSkinPath } from "GlobalValue";

export enum SkillGridCompEnum {
    NONE,//占位
    MaskComp,
    BgNameComp,
}

export type SkillCompTreeCfgType = {
    parent: string,
    order: SkillGridCompEnum,
}

export const SkillCompTreeCfgs = {
    [SkillGridCompEnum.BgNameComp]: {
        parent: "grpRoot",
        order: SkillGridCompEnum.BgNameComp,
    },
}

export class SkillGridComp_BgName extends eui.Component {
    grpFrool: eui.Group;
    imgFrool: eui.Image;
    lblName: eui.Label;
    
    public constructor() {
        super();
        this.skinName = uiSkinPath('SkillGridCompSkin_Bottom.exml');
        
    }

    @SafeCallFunction()
    public setText(text: string) {
        this.lblName.text = text;
    }

}