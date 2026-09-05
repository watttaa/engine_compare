import { s2_global_value_cfg } from "auto/global_value";
import { uiSkinPath } from "GlobalValue";
import { GlobalValue } from "GlobalValueDefine";
import { setUpdateListLayoutCallBack_ } from "utils/UIUtils_safecall";
import { SelectorBase } from "./SelectorBase";
import { SelectorGridItem } from "./SelectorGridItem";
import { EgretExEntry } from "lib/EgretExUtils_Entry";


var FightNumMax = s2_global_value_cfg.GlobalValueInfo["G_LINEUP_FIGHT_NUM"].length -1;

export class SelectorListItem extends eui.ItemRenderer {
    public _isEuiex = true;

    
    state: "";
    itemGird: SelectorGridItem;
    lstItem: eui.List;

    public static curSelType: string;
    public static readonly ELEM_IDX: number = 3;
    private widget: SelectorBase;
    private $SelType: EgretExEntry.FollowerSelEntry;
    private $Type2Num = {
        "elem": 5,//金木土水火1~5，全部0
        "iFightNum": FightNumMax,//秒数 1~3，全部0
        "type": 5,//战辅控医 1~4，全部0
        "talent": 4,//高攻、高血、高敏、负敏 1~4, 全部0
        "hurt": 2,//伤害类型 1~2，全部0
    };
    constructor() {
        super();
        this.skinName = uiSkinPath("ElemSelectorSkin_Row.exml");
        this.widget = null
    }

    $onRemoveFromStage() {
        let dataProviderLeft = this.lstItem.dataProvider as eui.ArrayCollection
        dataProviderLeft.removeAll();
        this.widget = null;
        super.$onRemoveFromStage();
    }

    protected onSkinLoadCompleted() {
        this.widget = null
        this.lstItem.dataProvider = new eui.ArrayCollection();
        this.lstItem.itemRenderer = SelectorGridItem;
        this.lstItem.touchEnabled = true;
        this.lstItem.addEventListener(eui.ItemTapEvent.ITEM_TAP, this.onTouchItem, this);
        this.itemGird.addEventListener(egret.TouchEvent.TOUCH_TAP, this.onTouchItemGird, this);
        this.lstItem.addEventListener(eui.PropertyEvent.PROPERTY_CHANGE, this.onChangHanlder, this);
        this.lstItem.selectedIndex = -1;
      
        super.onSkinLoadCompleted();
    }

    protected selectedRest(): void {
        if (this.$SelType != "elem") return;
        this.lstItem.selectedIndex = 0;
    }
    public dataChanged() {
        super.dataChanged();
        this.$SelType = this.data[0] as EgretExEntry.FollowerSelEntry;
        this.widget = this.data[1] as SelectorBase;
        (this.lstItem.layout as eui.HorizontalLayout).gap = this.data[2] ? 12 : -10;
        this.currentState = this.$SelType == "elem" ? "default" : "more";
        // setUpdateListLayoutCallBack_(this.lstItem, this.loadList, this);
        this.loadList();
    }

    private loadList() {
        let dataProviderLeft = this.lstItem.dataProvider as eui.ArrayCollection
        dataProviderLeft.removeAll();
        let selType = this.data[0] as EgretExEntry.FollowerSelEntry;
        let cnt = this.$Type2Num[this.$SelType]
        for (let value = 1; value <= cnt; value++) {
            dataProviderLeft.addItem([selType, value])
        }
        this.itemGird.data = [selType, 0];
    }   

    private onTouchItemGird(evt: eui.ItemTapEvent) {
        this.onTouchItem(null, 0);
        this.lstItem.selectedIndex = -1;
      
    }

    private onTouchItem(evt: eui.ItemTapEvent,idx:number) {
        //let item_data = evt.item;
        let targetIndex = evt && (evt.itemIndex + 1) || idx;
        if (this.$SelType == EgretExEntry.FollowerSelEntry.iFightNum) {
            targetIndex = s2_global_value_cfg.GlobalValueInfo["G_LINEUP_FIGHT_NUM"][targetIndex]
        }
        if (!SelectorListItem.curSelType) {
            SelectorListItem.curSelType = "elem"
        }
        if (SelectorListItem.curSelType != this.$SelType && this.$SelType === "elem") {
            let widget = this.widget as SelectorBase;
            if (widget) {
                widget.restChooseByIndex(targetIndex);
            }
            SelectorListItem.curSelType = this.$SelType;
            return;
        } else {
            SelectorListItem.curSelType = this.$SelType;
        }
        let itemIndex = this.$SelType === "elem" ? SelectorListItem.ELEM_IDX : this.itemIndex;
        if (this.widget) {
            let widget = this.widget as SelectorBase;
            if (widget.inited && widget.visible) {
                widget.onTouchItem(this.$SelType, itemIndex, targetIndex,this);
            }
        }
    }

    /**
     * @param idx 选中项
     */
    public updateChooseImg(idx: number) {
        if (this.lstItem) {
            setUpdateListLayoutCallBack_(this.lstItem, () => { this.lstItem.selectedIndex = idx  -1; }, this);
        }
     
    }
    private onChangHanlder(evt:eui.PropertyEvent):void{
        safeInvokeFunc(this.itemGird,()=>{
            this.itemGird.grpSelected.visible = this.lstItem.selectedIndex == -1;
        })
    }
}
