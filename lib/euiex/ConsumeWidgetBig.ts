import { ConsumeWidget } from "lib/euiex/ConsumeWidget";
import { ItemUtils } from "s2/bag/ItemUtils";

/**
 * 消费物品组件(大)
 */
export class ConsumeWidgetBig extends ConsumeWidget {
    public _isEuiex = true;

    protected getImgIconSource(icon, type) {
        // ConsumeWidgetBig默认用item大图标
        return ItemUtils.getItemByIcon(icon, type, false);
    }

}