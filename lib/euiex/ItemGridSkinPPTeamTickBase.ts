import { ComponentEx } from "./ComponentEx";

export class ItemGridSkinPPTeamTickBase extends ComponentEx {
    public _isEuiex = true;
    rectBg: eui.Rect;
    imgWord: eui.Image;
    imgFirst: eui.Image;
    public constructor(status?: string) {
        super();
        this.skinName = "resource/eui_skins/ItemGridSkin_PP_TeamTick.exml";
    }

    protected onSkinLoadCompleted() {
        super.onSkinLoadCompleted();
        this.rectBg.visible = false;
        this.imgWord.visible = false;
    }

}