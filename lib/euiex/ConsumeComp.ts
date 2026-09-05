import { ItemInfo } from "s2/bag/ItemInfo";
import { getItemTipsCls } from "s2/bag/TableReadCreater";
import { BagCNet } from "s2/bag/net/BagCNet";
import { TipsUI } from "tips/TipsUI";
import { ItemUtils } from "s2/bag/ItemUtils";

export type ConsumeCompEntry = {
    item_info: ItemInfo,
    callback?: Function,
    thisObject?: any,
}

/**
 * 消费物品组件
 */
export class ConsumeComp extends eui.Component {
    public _isEuiex = true;

    ////////////////////////(皮肤定义)
    imgIcon: eui.Image;
    lblCost: eui.Label;
    btnAdd: eui.Button;

    protected $data: ConsumeCompEntry;

    public get data() {
        return this.$data;
    }

    protected onSkinLoadCompleted() {
        super.onSkinLoadCompleted();
        this.imgIcon.addEventListener(egret.TouchEvent.TOUCH_TAP, this.showItemTips, this);
        this.btnAdd.addEventListener(egret.TouchEvent.TOUCH_TAP, this.onTouchbtnAdd, this);
    }

    @SafeCallFunction()
    public setData(data: ConsumeCompEntry) {
        this.$data = data;
        let item_info = data.item_info;
        this.lblCost.text = `${item_info.num}`;
        this.imgIcon.source = ItemUtils.getItemByIcon(item_info.icon, item_info.type);
        this.btnAdd.visible = isNotVain(this.data.callback); //没有回调的时候就不显示了
    }

    private onTouchbtnAdd() {
        if (!this.completed) return;
        if (this.data.callback) {
            this.data.callback.call(this.data.thisObject);
        }
    }

    public showItemTips() {
        if (!this.completed) return;
        if (this.data) {
            let itemInfo = this.data.item_info;
            let cls = getItemTipsCls(itemInfo.id);
            UIManager.open(cls).then((inst: TipsUI) => {
                inst.setData(itemInfo);
                BagCNet.C_GET_ITEM_EXTRA_INFO(itemInfo);
            });
        }
    }

}