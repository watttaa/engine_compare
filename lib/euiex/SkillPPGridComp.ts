/**
 * 伙伴/守护的技能格子组件
 */

import { uiSkinPath } from "GlobalValue";

export enum SkillPPGridCompEnum {
    NONE,//占位
    SelectedComp,
    FeatureComp,
    IntroComp,
    Mc,
}

export type SkillPPCompTreeCfgType = {
    parent: string,
    order: SkillPPGridCompEnum,
}

export const SkillPPCompTreeCfgs = {
    [SkillPPGridCompEnum.SelectedComp]: {
        parent: "grpSelected",
        order: SkillPPGridCompEnum.SelectedComp,
    },
    [SkillPPGridCompEnum.FeatureComp]: {
        parent: "grpInfo",
        order: SkillPPGridCompEnum.FeatureComp,
    },
    [SkillPPGridCompEnum.IntroComp]: {
        parent: "grpInfo",
        order: SkillPPGridCompEnum.IntroComp,
    },
    [SkillPPGridCompEnum.Mc]: {
        parent: "grpMc",
        order: SkillPPGridCompEnum.Mc,
    },
}

export class SkillPPGridComp_Feature extends eui.Component {
    lblFeature: eui.Label;
    
    public constructor() {
        super();
        this.skinName = uiSkinPath("SkillGrid_PPComp_Feature.exml");
    }

    @SafeCallFunction()
    public setText(text: string) {
        this.lblFeature.text = text;
    }
}

export class SkillPPGridComp_Intro extends eui.Component {
    imgBg: eui.Image;
    lblIntro: eui.Label;
   
    public constructor() {
        super();
        this.skinName = uiSkinPath("SkillGrid_PPComp_Intro.exml");
    }

    @SafeCallFunction()
    public setBg(source: string) {
        this.imgBg.source = source;
    }

    @SafeCallFunction()
    public setText(text: string) {
        this.lblIntro.text = text;
    }
}

export class SkillPPGridComp_Selected extends eui.Component {
    public constructor() {
        super();
        this.skinName = uiSkinPath("SkillGrid_PPComp_Selected.exml");
    }
}