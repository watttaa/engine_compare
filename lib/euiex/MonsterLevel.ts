import { s2_rolelevel_cfg } from "auto/RoleLevel";
import { FiveElemIcon } from "GlobalValue";
import { EgretExEntry } from "lib/EgretExUtils_Entry";
import { ComponentEx } from "./ComponentEx";
import { color_utils } from "utils/ColorUtils";

export class MonsterLevel extends ComponentEx {
    public _isEuiex = true;
    ////////////////////////(皮肤定义)
    public imgElem: eui.Image;
    public lbMonLevel: eui.Label;

    ////////////////////////(自定义)
    private $data: EgretExEntry.MonsterLevelData;

    constructor() {
        super();
        // this.skinName = "resource/eui_skins/MonsterLevelSkin.exml";
    }

    public setData(data: EgretExEntry.MonsterLevelData) {
        this.$data = data;
        if (this.completed) {
            this.dataChanged();
        }
    }

    protected onSkinLoadCompleted() {
        super.onSkinLoadCompleted();
        if (this.$data) {
            this.dataChanged();
        }
    }

    protected dataChanged() {
        // 状态
        if (!this.$data.elem) {
            this.currentState = "notElem";
        } else if (this.$data.isShowLevel) {
            this.currentState = "nor";
        } else {
            this.currentState = "notNum";
        }
        // this.currentState = this.$data.elem ? "nor" : "notElem";
        this.validateNow();
        // 五行
        this.imgElem.source = this.$data.elem ? FiveElemIcon[this.$data.elem] : "";
        // 转身+等级
        this.lbMonLevel.text = s2_rolelevel_cfg.getShowLvEx(this.$data.level);
        let reborn_lv = s2_rolelevel_cfg.getRebornLevel(this.$data.level);
        let nameColor = color_utils.getRebornLevelColorNum(reborn_lv);
        this.lbMonLevel.textColor = nameColor;
    }
}
