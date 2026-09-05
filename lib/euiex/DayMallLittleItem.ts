import { QualityEnum } from "base/Enum";
import { ItemGrid60x } from "./ItemGrid60x";
import { GoodsGrid } from "lib/euiex/BaseGrid";

export class DayMallLittleItem extends GoodsGrid {
    public _isEuiex = true;

    onSkinLoadCompleted() {
        // let scale = 0.8;
        // this.scaleX = this.scaleY = scale;
        // this.lblQuantity.stroke = this.lblQuantity.stroke / scale;
        // this.lblQuantity.size = 18 / scale;
        super.onSkinLoadCompleted();
    }

    protected dataChanged() {
        super.dataChanged();
        if (!this.data) {
        }
    }
}
