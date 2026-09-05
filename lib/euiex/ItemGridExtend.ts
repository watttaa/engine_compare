import { ItemInfo } from "s2/bag/ItemInfo";
import { ItemMcTypeEnum } from "base/Enum";
import { EgretExEntry } from "lib/EgretExUtils_Entry";
import { safeCallComFunc } from "utils/UIUtils_safecall";
import { GoodsGrid } from "lib/euiex/BaseGrid";

export interface ItemGridExtend {
    itemGrid: GoodsGrid;
}

export class ItemGridExtend extends eui.ItemRenderer {
    protected $itemInfo: ItemInfo;

    @SafeCallFunction()
    public setData(itemInfo: ItemInfo) {
        this.$itemInfo = itemInfo;
        safeCallComFunc(this, this.itemGrid, () => {
            this.itemGrid.setData({ iteminfo: itemInfo });
        })
    }

    public getData() {
        return this.$itemInfo;
    }

    @SafeCallFunction()
    public setCustom(data: EgretExEntry.ItemGridCustomData) {
        safeCallComFunc(this, this.itemGrid, () => {
            //this.itemGrid.setCustom(data)
        })
    }

    /** 更新单个属性的值 */
    @SafeCallFunction()
    public oneCustom<K extends keyof EgretExEntry.ItemGridCustomData>(key: K, value: EgretExEntry.ItemGridCustomData[K]) {
        safeCallComFunc(this, this.itemGrid, () => {
            //this.itemGrid.oneCustom(key, value);
        })
    }

    /**更新多个定制属性 */
    @SafeCallFunction()
    public updateSomeCustom(data: EgretExEntry.ItemGridCustomData) {
        safeCallComFunc(this, this.itemGrid, () => {
            //this.itemGrid.updateSomeCustom(data);
        })
    }

    // 红点
    @SafeCallFunction()
    public setRedPoint(b: number) {
        safeCallComFunc(this, this.itemGrid, () => {
            //this.itemGrid.setRedPoint(b);
        })
    }

    @SafeCallFunction()
    public setTouchFunc(func: Function, thisObj?: any, args?: any) {
        safeCallComFunc(this, this.itemGrid, () => {
            //this.itemGrid.setTouchFunc(func, thisObj, args);
        })
    }

    @SafeCallFunction()
    public clearTouchFunc() {
        safeCallComFunc(this, this.itemGrid, () => {
            //this.itemGrid.clearTouchFunc();
        })
    }

    /**
    * 打开物品提示
    * @returns 
    */
    @SafeCallFunction()
    public openTips() {
        safeCallComFunc(this, this.itemGrid, () => {
            //this.itemGrid.openTips();
        })
    }

    @SafeCallFunction()
    public setShowTips(show: boolean, showExtraInfo: boolean = true) {
        safeCallComFunc(this, this.itemGrid, () => {
            //this.itemGrid.showTips = show;
            //this.itemGrid.showTips_ExtraInfo = showExtraInfo;
        })
    }

    @SafeCallFunction()
    public setNeedSelect(value: boolean) {
        safeCallComFunc(this, this.itemGrid, () => {
            //this.itemGrid.needSelect = value;
        })
    }

    @SafeCallFunction()
    public resetQualityAni(quality: number, frameCon: number = 0, num: number = 1, showAniType: ItemMcTypeEnum, frame: number) {
        safeCallComFunc(this, this.itemGrid, () => {
            //this.itemGrid.resetQualityAni(quality, frameCon, num, showAniType, frame);
        })
    }

    protected dataChanged() {
        super.dataChanged();
        console.log('addActionItemOneByOne 99', this.itemGrid)
        this.itemGrid.data = this.data || { iteminfo: this.$itemInfo };
        safeCallComFunc(this, this.itemGrid, () => {
            this.itemGrid.data = this.data || { iteminfo: this.$itemInfo };
        })
    }
}