import { ITEM_GRID_WIDTH_80X, uiSkinPath } from "GlobalValue";
import { ItemGridComp } from "lib/euiex/ItemGridComp";

/**
 * 0.8倍物品格子
 * 存在意义：皮肤中图片缩放，字体不放放
 */
export class ItemGrid80x extends ItemGridComp {
    public _isEuiex = true;
    constructor() {
        super();
        if (!this.skinName) {
            this.skinName = uiSkinPath("ItemGridSkin80x.exml");
        }
    }
}