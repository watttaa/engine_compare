import { ItemInfo } from "s2/bag/ItemInfo";
import { GoodsGridExtend } from "lib/euiex/GoodsGridExtend";
import { CollectionGrayFilter } from "s2/collection/ui/common/NewCollectionItemBg";

export interface LotteryGodItemGrid {
    imgWish: eui.Image;
    imgNew: eui.Image;
}

export class LotteryGodItemGrid extends GoodsGridExtend {

    public onSkinLoadCompleted() {
        super.onSkinLoadCompleted();
        this.imgNew.visible = this.imgWish.visible = false;
    }

    public dataChanged() {
        super.dataChanged();
        let itemInfo: ItemInfo = this.data;
        if (itemInfo) {
            let entry: any = itemInfo.getEntry();
            this.setWish(!!entry.wish, !!entry.gray);
            this.setNew(!!entry.new);
        }
    }

    @SafeCallFunction()
    public setWish(isWish: boolean, isGray?: boolean) {
        this.imgWish.visible = isWish;
        if (this.imgWish.visible) {
            this.imgWish.filters = isGray ? [CollectionGrayFilter] : null;
        }
    }

    @SafeCallFunction()
    public setNew(isNew: boolean) {
        this.imgNew.visible = isNew;
    }

}