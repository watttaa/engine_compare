/**
 * 伙伴/守护的icom组件
 */

import { uiSkinPath } from "GlobalValue";
import { FightStatus } from "base/Enum";
import { filter_utils } from "lib/FilterUtils";
import { PPStarComp } from "./PPStarComp";

export enum FollowerGridCompEnum {
    NONE,//占位
    Star,
    BottomLb,
    RightTopLb,
    Tag,
    TagEx,
    RightTag,
    imgZhan,
    HunQi,
    TeamDis,
    TeamLock,
    FloorComp,
    BtnTick,
    Dead,
    Lock,
    Mask,
    Mask2,
    Empty,
    Add,
    // ImgTag,
    Selected,
    Intro,
    Attr,
    RedPoint,
    Hp,
    Name,
}

export type CompTreeCfgType = {
    parent: string,
    order: FollowerGridCompEnum,
}

export const CompTreeCfgs = {
    [FollowerGridCompEnum.FloorComp]: {
        parent: "grpMain",
        order: FollowerGridCompEnum.FloorComp,
    },
    [FollowerGridCompEnum.BottomLb]: {
        parent: "grpReal",
        order: FollowerGridCompEnum.BottomLb,
    },
    [FollowerGridCompEnum.RightTopLb]: {
        parent: "grpReal",
        order: FollowerGridCompEnum.RightTopLb,
    },
    [FollowerGridCompEnum.Star]: {
        parent: "grpInfo",
        order: FollowerGridCompEnum.Star,
    },
    [FollowerGridCompEnum.Tag]: {
        parent: "grpFrameInfo",
        order: FollowerGridCompEnum.Tag,
    },
    [FollowerGridCompEnum.TagEx]: {
        parent: "grpFrameInfo",
        order: FollowerGridCompEnum.TagEx,
    },
    [FollowerGridCompEnum.RightTag]: {
        parent: "grpFrameInfo",
        order: FollowerGridCompEnum.RightTag,
    },
    [FollowerGridCompEnum.imgZhan]: {
        parent: "grpInfo",
        order: FollowerGridCompEnum.imgZhan,
    },
    [FollowerGridCompEnum.BtnTick]: {
        parent: "grpInfo",
        order: FollowerGridCompEnum.BtnTick,
    },
    [FollowerGridCompEnum.Lock]: {
        parent: "grpTopInfo",
        order: FollowerGridCompEnum.Lock,
    },
    [FollowerGridCompEnum.Dead]: {
        parent: "grpTopInfo",
        order: FollowerGridCompEnum.Dead,
    },
    [FollowerGridCompEnum.Mask]: {
        parent: "grpMask",
        order: FollowerGridCompEnum.Mask,
    },
    [FollowerGridCompEnum.Mask2]: {
        parent: "grpMask2",
        order: FollowerGridCompEnum.Mask2,
    },
    [FollowerGridCompEnum.Selected]: {
        parent: "grpSelected",
        order: FollowerGridCompEnum.Selected,
    },
    [FollowerGridCompEnum.RedPoint]: {
        parent: "grpTopInfo",
        order: FollowerGridCompEnum.RedPoint,
    },
    [FollowerGridCompEnum.Empty]: {
        parent: "grpTopInfo",
        order: FollowerGridCompEnum.Empty,
    },
    [FollowerGridCompEnum.Add]: {
        parent: "grpTopInfo",
        order: FollowerGridCompEnum.Add,
    },
    [FollowerGridCompEnum.HunQi]: {
        parent: "grpTopInfo",
        order: FollowerGridCompEnum.HunQi,
    },
    [FollowerGridCompEnum.Attr]: {
        parent: "grpTopInfo",
        order: FollowerGridCompEnum.Attr,
    },
    // [FollowerGridCompEnum.ImgTag]: {
    //     parent: "grpTopInfo",
    //     order: FollowerGridCompEnum.ImgTag,
    // },
    [FollowerGridCompEnum.Intro]: {
        parent: "grpTopInfo",
        order: FollowerGridCompEnum.Intro,
    },
    [FollowerGridCompEnum.Name]: {
        parent: "grpRoot",
        order: FollowerGridCompEnum.Name,
    },
    [FollowerGridCompEnum.Hp]: {
        parent: "grpRoot",
        order: FollowerGridCompEnum.Hp,
    },
    [FollowerGridCompEnum.TeamDis]: {
        parent: "grpInfo",
        order: FollowerGridCompEnum.TeamDis,
    },
    [FollowerGridCompEnum.TeamLock]: {
        parent: "grpInfo",
        order: FollowerGridCompEnum.TeamLock,
    },
}

export class FollowerGridComp_Floor extends eui.Component {
    imgIcon: eui.Image;
    imgLock: eui.Image;

    public constructor() {
        super();
        this.skinName = uiSkinPath('ItemGridCompSkin_floor.exml');
    }

    @SafeCallFunction()
    public setImage(text: string) {
        this.imgIcon.source = text;
    }

    @SafeCallFunction()
    public setLock(v: boolean) {
        this.imgLock.visible = v;
    }

}

export class FollowerGridComp_Lb extends eui.Component {
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

export class FollowerGridComp_Star extends eui.Component {
    // lblStar: eui.BitmapLabel;
    star: PPStarComp;

    public constructor() {
        super();
        this.skinName = uiSkinPath("PPGridCompSkin_Star.exml");
    }

    @SafeCallFunction()
    public updateView(star: number) {
        // this.lblStar.text = preload_utils_text.getFollowerStarBblTxt(star);
        this.star.setData(star);
    }

}

export class FollowerGridComp_Lock extends eui.Component {

    public constructor() {
        super();
        this.skinName = uiSkinPath("PPGridCompSkin_Lock.exml");
    }
}

export class FollowerGridComp_Mask extends eui.Component {
    imgIcon: eui.Image;

    public constructor() {
        super();
        this.skinName = 'resource/eui_skins/PPGridCompSkin_Mask.exml';
    }

    @SafeCallFunction()
    public setImage(source: string) {
        this.imgIcon.visible = !!source;
        this.imgIcon.source = source;
    }

    @SafeCallFunction()
    public setImageVisible(isVisible: boolean) {
        this.imgIcon.visible = isVisible;
    }

}

export class FollowerGridComp_Empty extends eui.Component {
    imgIcon: eui.Image;

    public constructor() {
        super();
        // this.skinName = uiSkinPath("PPGridCompSkin_Empty.exml");
        this.changeSkin(false);
    }

    @SafeCallFunction()
    public setImage(source: string) {
        this.imgIcon.visible = !!source;
        this.imgIcon.source = source;
    }

    @SafeCallFunction()
    public setImageVisible(isVisible: boolean) {
        //this.imgIcon.visible = isVisible;
    }

    public changeSkin(red: boolean) {
        if (red) {
            this.skinName = uiSkinPath("PPGridCompSkin_Empty_Red.exml");
        }
        else {
            this.skinName = uiSkinPath("PPGridCompSkin_Empty.exml");
        }
    }

}

export class FollowerGridComp_Add extends eui.Component {
    imgIcon: eui.Image;

    public constructor() {
        super();
        this.skinName = uiSkinPath("PPGridCompSkin_Add.exml");
    }

    @SafeCallFunction()
    public setImage(source: string) {
        this.imgIcon.visible = !!source;
        this.imgIcon.source = source;
    }

    @SafeCallFunction()
    public setImageVisible(isVisible: boolean) {
        this.imgIcon.visible = isVisible;
    }

}

export class FollowerGridComp_Attr extends eui.Component {
    grpFighting: eui.Group;
    imgAttrIcon: eui.Image;

    public constructor() {
        super();
        this.skinName = uiSkinPath('PPGridCompSkin_Attr.exml');
    }

    // @SafeCallFunction()
    // public setImgFighting(source: string) {
    //     this.imgFighting.visible = !!source;
    //     this.imgFighting.source = source;
    // }

    // @SafeCallFunction()
    // public setImgFightingVisible(isVisible: boolean) {
    //     this.imgFighting.visible = isVisible;
    // }

    @SafeCallFunction()
    public setState(state: FightStatus) {
        this.currentState = "normal";
        // if (state == FightStatus.Normal) {
        //     this.currentState = "normal";
        // }
        // else if (state === FightStatus.Fight) {
        //     this.currentState = "fighting";
        // } else if (state === FightStatus.Ready) {
        //     this.currentState = "ready";
        // }
    }

    @SafeCallFunction()
    public setImgAttrIcon(source: string) {
        this.imgAttrIcon.visible = !!source;
        this.imgAttrIcon.source = source;
    }

    @SafeCallFunction()
    public setImgAttrIconVisible(isVisible: boolean) {
        this.imgAttrIcon.visible = isVisible;
    }

}

export class FollowerGridComp_Intro extends eui.Component {
    imgBg: eui.Image;
    lblIntro: eui.Label;
    lblNum: eui.Label;

    public constructor() {
        super();
        this.skinName = uiSkinPath('PPGridCompSkin_Intro.exml');
    }

    @SafeCallFunction()
    public setBg(source: string) {
        this.imgBg.visible = !!source;
        this.imgBg.source = source;
    }

    @SafeCallFunction()
    public setIntro(intro: string) {
        //this.lblIntro.text = String(intro.match(/.*(?=[\d+])/));
        //this.lblNum.text = String(intro.match(/[0-9]+/));
        this.lblIntro.text = intro.toString();
        this.lblNum.text = "";
    }
    
}



export class PPGridCompSkinMaskFightRecord extends eui.Component {
   
    public constructor() {
        super();
        this.skinName = 'resource/eui_skins/PPGridCompSkin_Mask_FightRecord.exml';
    }

}

export class FollowerGridComp_HunQi extends eui.Component {

    imgIcon: eui.Label;

    public constructor() {
        super();
        this.skinName = uiSkinPath('PPGridCompSkin_RT_HunQi.exml');
    }

    @SafeCallFunction()
    public setState(isGot: boolean) {
        let filterType = !isGot ? filter_utils.FilterType.GREY_DARK : filter_utils.FilterType.NONE;
        filter_utils.addFilterAdvance(this.imgIcon, filterType);
    }
}
