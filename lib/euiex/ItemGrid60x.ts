import { ITEM_GRID_WIDTH_60X, uiSkinPath } from "GlobalValue";
import { BaseGrid } from "./BaseGrid";

/**
  * 0.8倍物品格子
  * 存在意义：皮肤中图片缩放，字体不放放
  */
export class ItemGrid60x extends BaseGrid {
    public _isEuiex = true;
    constructor() {
        super();
        if (!this.skinName) {
            this.skinName = uiSkinPath("ItemGridSkin60x.exml");
        }
    }
}