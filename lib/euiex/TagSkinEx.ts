import { s2_itemtag_cfg } from "auto/ItemTag";

/**
* 角标的皮肤
* 
*/
export class TagSkinEx extends eui.Component {
    public _isEuiex = true;
    imgTag: eui.Image;
    imgIcon: eui.Image;

    public constructor() {
        super();
        this.skinName = 'resource/eui_skins/S2/TagSkinEx.exml';
    }

    private initTag() {
        this.imgIcon.visible = false;
        this.imgTag.visible = false;
    }

    @SafeCallFunction()
    public setData(tagId: number) {//表格中的tagId
        this.initTag();
        if (tagId <= 0) return;
        let tagInfo = s2_itemtag_cfg.ItemtagInfo[tagId];
        if (!tagInfo) {
            Logger.error("TagId Error!");
        }
        //带底图的角标
        //底图
        let imgBase:string = tagInfo[s2_itemtag_cfg.cResource].trim();
        let imgIcon:string = tagInfo[s2_itemtag_cfg.cImgResource].trim();
        this.imgTag.visible = true;
        this.imgTag.source = `resource/assets/tag/${imgBase}.png`;
        this.imgIcon.visible = true;
        this.imgIcon.source = `resource/assets/tag/${imgIcon}.png`;
    }
}