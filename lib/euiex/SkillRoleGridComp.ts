/**
 * 角色技能格子组件
 */

import { uiSkinPath } from "GlobalValue";

export enum SkillRoleGridCompEnum {
    NONE,//占位
    SelectedComp,
    TickComp,
    LockComp,
    CompTeamName,
    IntroComp,
}

export type SkillRoleCompTreeCfgType = {
    parent: string,
    order: SkillRoleGridCompEnum,
}

export const SkillRoleCompTreeCfgs = {
    [SkillRoleGridCompEnum.SelectedComp]: {
        parent: "grpSelected",
        order: SkillRoleGridCompEnum.SelectedComp,
    },
    [SkillRoleGridCompEnum.TickComp]: {
        parent: "grpTick",
        order: SkillRoleGridCompEnum.TickComp,
    },
    [SkillRoleGridCompEnum.LockComp]: {
        parent: "grpMask",
        order: SkillRoleGridCompEnum.LockComp,
    },
    [SkillRoleGridCompEnum.CompTeamName]: {
        parent: "grpInfo",
        order: SkillRoleGridCompEnum.CompTeamName,
    },
    [SkillRoleGridCompEnum.IntroComp]: {
        parent: "grpInfo",
        order: SkillRoleGridCompEnum.IntroComp,
    },
}

export class SkillRoleGridComp_Intro extends eui.Component {
    imgBg: eui.Image;
    lblIntro: eui.Label;
   
    public constructor() {
        super();
        this.skinName = uiSkinPath("SkillRoleGrid_CompSkin_Intro.exml");
    }

    // @SafeCallFunction()
    // public setBg(source: string) {
    //     this.imgBg.source = source;
    // }

    @SafeCallFunction()
    public setState(source: string) {
        this.currentState = source;
    }

    @SafeCallFunction()
    public setText(text: string) {
        this.lblIntro.text = text;
    }
}

export class SkillRoleGridComp_Selected extends eui.Component {
    public constructor() {
        super();
        this.skinName = uiSkinPath("SkillRoleGrid_CompSkin_Selected.exml");
    }
}

export class SkillRoleGridComp_Tick extends eui.Component {
    public constructor() {
        super();
        this.skinName = uiSkinPath("SkillLineupGrid_CompSkin_Tick.exml");
    }

    @SafeCallFunction()
    public setState(state: string) {
        this.currentState = state;
    }
}

export class SkillRoleGridComp_Lock extends eui.Component {
    public constructor() {
        super();
        this.skinName = uiSkinPath("SkillRoleGrid_CompSkin_Lock.exml");
    }
}