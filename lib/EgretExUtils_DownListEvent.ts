// 下拉列表信号器
export class DownListEvent extends egret.Event {
    public static readonly ON_CHOOSED_ITEM: string = "OnChoosedItem";
    public static readonly ON_SWITCH_EXPAND: string = "ON_ITEM_TAP_EXPAND";

    public constructor(type: string, data?: any) {
        super(type, false, false, data);
    }
}