import { s2_itemtag_cfg } from "auto/ItemTag";
import { TagPositionEnum } from "base/Enum";
import { uiSkinPath } from "GlobalValue";

/**
 * 角标的皮肤
 * 
 */
export class TagSkin extends eui.Component {
    public _isEuiex = true;
    imgBg: eui.Image;
    imgTag: eui.Image;
    lblTag: eui.Label;
    imgTagLab:eui.Image

    public constructor() {
        super();
        //'resource/eui_skins/S2/TagSkin.exml'
        this.skinName = uiSkinPath("TagSkin.exml");
    }

    private initTag() {
        this.lblTag.visible = false;
        this.imgTag.visible = false;
        this.imgTagLab.visible = false;
        
    }

    @SafeCallFunction()
    public setData(tagId: number, labType: "lab" | "image" = "lab") {//表格中的tagId
        this.initTag();
        if (tagId <= 0) return;
        let tagInfo = s2_itemtag_cfg.ItemtagInfo[tagId];
        if (!tagInfo) {
            Logger.error("TagId Error!");
            return;
        }
        let pos = tagInfo[s2_itemtag_cfg.iPosition];
        let txt = (tagInfo[s2_itemtag_cfg.cTextResource] || "").trim();
        let baseImg = (tagInfo[s2_itemtag_cfg.cResource] || "").trim();
        let img = (tagInfo[s2_itemtag_cfg.cImgResource] || "").trim();
        switch (pos){
            case TagPositionEnum.LeftSkillTag:
                this.currentState = "skill";
                this.validateNow();
                this.imgTag.visible = true;
                // this.imgTag.source = `${img}_png`;
                this.imgTag.source = `resource/assets/tag/${img}.png`;
                break;
            case TagPositionEnum.LeftImgTag:
                this.currentState = "default";
                this.validateNow();
                this.imgTag.visible = true;
                // this.imgTag.source = `${baseImg}_png`;
                this.imgTag.source = `resource/assets/tag/${baseImg}.png`;
                break;
            case TagPositionEnum.LeftImgTxtTag:
            case TagPositionEnum.LeftImgTxtGem:
            case TagPositionEnum.LeftImgTxtTag2:
            case TagPositionEnum.LeftImgFaBaoTag:
            case TagPositionEnum.LeftImgTxtTagLow:
                if (pos == TagPositionEnum.LeftImgTxtGem) {
                    this.currentState = "gem";
                } else if (pos == TagPositionEnum.LeftImgTxtTag2) {
                    this.currentState = "tag2";
                } else if (pos == TagPositionEnum.LeftImgTxtTagLow) {
                    this.currentState = "default2";
                } else {
                    this.currentState = "default";
                }
                this.validateNow();
                this.imgTag.visible = true;
                // this.imgTag.source = `${baseImg}_png`;
                this.imgTag.source = `resource/assets/tag/${baseImg}.png`;
                if(labType == "lab"){
                    let [content, color, strokeColor] = txt.split('#');
                    this.lblTag.strokeColor = strokeColor ? parseInt(strokeColor, 16) : 0x00000;
                    this.lblTag.textColor = color ? parseInt(color, 16) : 0xffffff;
                    this.lblTag.stroke = strokeColor ? 2 : 0;
                    this.lblTag.text = content;
                    this.lblTag.visible = true;
                }else{
                    this.imgTagLab.visible = true;
                    this.imgTagLab.source = `resource/assets/tag/${img}.png`;
                }
                break;
            case TagPositionEnum.LeftImgImgTag:
                this.currentState = "imgImg";
                this.validateNow();
                this.imgTag.visible = true;
                // this.imgBg.source = `${baseImg}_png`;
                // this.imgTag.source = `${img}_png`;
                this.imgBg.source = `resource/assets/tag/${baseImg}.png`;
                this.imgTag.source = `resource/assets/tag/${img}.png`;
                break;
        }
    }

    @SafeCallFunction()
    public setLblTag(text: string) {
        this.lblTag.text = text;
    }
}