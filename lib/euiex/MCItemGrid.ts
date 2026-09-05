import { ItemMcTypeEnum } from "base/Enum";
import { BaseGrid } from "./BaseGrid";

/**
 * 使用高级动效
 */
export class MCItemGrid extends BaseGrid implements MCItemGrid {

    public resetQualityAni(quality: number, frameCon: number = 0, num: number = 1, showAniType: ItemMcTypeEnum, frame: number) {
        let itemEntry = this.data?.iteminfo?.getEntry();
        if (itemEntry) {
            itemEntry.effect_type = ItemMcTypeEnum.TweenGroup;
        }
    }
}