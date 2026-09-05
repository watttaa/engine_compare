import { DownListEvent } from "lib/EgretExUtils_DownListEvent";
import { EgretExEntry } from "lib/EgretExUtils_Entry";
import { ui_utils_safecall } from "utils/UIUtils_safecall";
import { ComponentEx } from "./ComponentEx";

export class DownListSelector extends ComponentEx {
    public _isEuiex = true;
    protected SHRINK_HEIGHT: number = 0;
    protected EXPEND_HEIGHT: number = 150;
    protected HEIGHT_MIN: number = 20;
    protected scroll: eui.Scroller;

    public static IMG_BG_VISIBLE = "IMG_BG_VISIBLE";

    public btnExpend: eui.Button;
    public grpSort: eui.Group;
    public imgBg: eui.Image;
    public ItemList: eui.List;

    public static FilterEase = egret.Ease.backInOut;
    public static FilterTime = 200;

    protected $dataFunc: Function;
    protected $execFunc: Function;
    protected $extraFunc: Function;

    protected $thisObj: any;
    protected $isPlayingTw: boolean = false;
    protected $isExpand: boolean = undefined;
    private heightTimeoutIndex: number;
    public SelectorData: EgretExEntry.DownListSelectorData;
    public curChoosedData: { curIdx: number, curData: any };
    protected dir: "up" | "down";
    private $scrollPolicyV: string = "off";
    private $scrollPolicyH: string = "off";
    private scrollHeight: number = 0;
    private $fixedHeight: boolean = false;

    constructor() {
        super();
        // this.skinName = "resource/eui_skins/DownListSelector.exml";
        this.dir = "down";
    }

    protected onSkinLoadCompleted() {
        super.onSkinLoadCompleted();
        this.scroll.visible = false;
        this.btnExpend && this.btnExpend.addEventListener(egret.TouchEvent.TOUCH_TAP, this.onTouchbtnExpend, this);
    }

    public initDownList(obj: any, data: EgretExEntry.DownListSelectorData) {
        this.$thisObj = obj;
        this.SelectorData = data;
        this.initItemLst();
    }

    public setTitle(title: string) {
        ui_utils_safecall.safeCallComFuncEuiEx(this, this.btnExpend, () => {
            this.btnExpend.label = title;
        });
        // this.btnExpend.labelDisplay.text = title;
    }

    protected initItemLst() {
        let data = this.SelectorData;
        let listData = data.listData;
        let defaultIdx = data.defaultIdx;
        this.ItemList.dataProvider = new eui.ArrayCollection();
        this.ItemList.itemRenderer = data.itemRenderer;
        this.ItemList.addEventListener(eui.ItemTapEvent.ITEM_TAP, this.onTouchItem, this);
        this.ItemList.touchEnabled = true;
        this.ItemList.requireSelection = !data.noRequireSelection;
        this.updateItemLst(listData);
        //高度算的不对，先延迟300ms
        if (this.heightTimeoutIndex) {
            egret.clearTimeout(this.heightTimeoutIndex);
            this.heightTimeoutIndex = null;
        }
        this.heightTimeoutIndex = egret.setTimeout(() => {
            this.reset();
        }, this, 300);
        //默认选中
        if (defaultIdx != undefined) {
            this.curChoosedData = { curIdx: defaultIdx, curData: listData[defaultIdx] };
            this.dispatchEvent(new DownListEvent(DownListEvent.ON_CHOOSED_ITEM, this.curChoosedData));
        } else {
            defaultIdx = 0;
            this.curChoosedData = { curIdx: defaultIdx, curData: listData[defaultIdx] };
        }

    }


    public updateItemLst(dataLst: any[]) {
        if(!this.SelectorData) return;
        this.SelectorData.listData = dataLst;
        let dataProvider = (this.ItemList.dataProvider) as eui.ArrayCollection;
        // 添加集合改变事件监听
        // dataProvider.addEventListener(eui.CollectionEvent.COLLECTION_CHANGE, this.onCollectionChange, this);
        dataProvider.source = dataLst;
        if (this.grpSort) {
            if (this.heightTimeoutIndex) {
                egret.clearTimeout(this.heightTimeoutIndex);
                this.heightTimeoutIndex = null;
            }
            this.heightTimeoutIndex = egret.setTimeout(() => {
                this.reset();
            }, this, 300);
        }
    }

    private updateCurChooseData() {
        let chooseData = this.SelectorData.listData[this.ItemList.selectedIndex];
        this.curChoosedData = { curIdx: this.ItemList.selectedIndex, curData: chooseData };
    }

    public setSelectIndex(selectIndex: number) {
        if(!this.ItemList) return;
        this.ItemList.selectedIndex = selectIndex;
        this.updateCurChooseData();
    }

    public setSelectItem(data: any) {
        this.ItemList.selectedItem = data;
        this.updateCurChooseData();
    }

    public onClose() {
        // UIManager.stage.removeEventListener(egret.TouchEvent.TOUCH_END, this.onTouchOutSide, this);
        if(!this.completed) return;
        this.scroll?.removeEventListener(egret.TouchEvent.TOUCH_TAP_OUTSIDE, this.onTouchOutSide, this);
        this.switchFilterState(false, false);
        //this.$isExpand = false;
        // egret.Tween.removeTweens(this.imgBg);
        if (this.heightTimeoutIndex) {
            egret.clearTimeout(this.heightTimeoutIndex);
            this.heightTimeoutIndex = null;
        }
        //this.grpSort && (this.grpSort.visible = false);
    }

    public currentChoose() {
        return this.curChoosedData;
        // let curIdx = this.ItemList.selectedIndex;
        // if(curIdx == -1) return;
        // let dataProvider = (this.ItemList.dataProvider) as eui.ArrayCollection;
        // let curData = dataProvider.getItemAt(curIdx);
        // return {curIdx:curIdx, curData:curData};
    }

    public $onRemoveFromStage() {
        if (this.scroll) {
            egret.Tween.removeTweens(this.scroll);
        }
        if (this.btnExpend) {
            this.btnExpend.removeEventListener(egret.TouchEvent.TOUCH_TAP, this.onTouchbtnExpend, this);
        }
        let dataProvider2 = this.ItemList.dataProvider as eui.ArrayCollection
        dataProvider2.removeAll();
        super.$onRemoveFromStage();
    }

    private onTouchItem(evt: eui.ItemTapEvent) {
        this.switchFilterState(false);
        let item_data = evt.item;
        let targetIndex = evt.itemIndex;
        this.curChoosedData = { curIdx: targetIndex, curData: item_data };
        this.dispatchEvent(new DownListEvent(DownListEvent.ON_CHOOSED_ITEM, this.curChoosedData));
    }

    public reset() {
        if (!this) return;
        if (!this.inited) return;
        if(!this.SelectorData) return;
        if (!this.$fixedHeight || !this.EXPEND_HEIGHT) {
            this.EXPEND_HEIGHT = Math.max(this.scroll.height, this.ItemList.contentHeight);
        }
        this.scroll.height = this.EXPEND_HEIGHT;
        this.grpSort && (this.grpSort.maxHeight = this.EXPEND_HEIGHT);
        this.scroll.height = this.SHRINK_HEIGHT;
        this.scroll.visible = true;
        //关闭滚动
        this.scroll.scrollPolicyV = this.$scrollPolicyV;
        this.scroll.scrollPolicyH = this.$scrollPolicyH;
        // this.imgBg.height = this.SHRINK_HEIGHT;
        this.imgBgVisible(false);
        this.$isExpand = false;
        this.updateBtnExpend();
    }

    public setExpendHeight(height: number, fixed = false) {
        this.scrollHeight = height;
        this.EXPEND_HEIGHT = height;
        this.$fixedHeight = !!fixed;
    }

    public setScrollPolicy(scrollPolicyV: "on" | "off" | "auto", scrollPolicyH: "on" | "off" | "auto") {
        this.$scrollPolicyV = scrollPolicyV;
        this.$scrollPolicyH = scrollPolicyH;
        this.scroll.scrollPolicyV = this.$scrollPolicyV;
        this.scroll.scrollPolicyH = this.$scrollPolicyH;
    }

    // private $scrollModalPriority: boolean = egret.DisplayObject.defaultModalPriority;
    // public setScrollModalPriority(priority: boolean) {
    //     this.$scrollModalPriority = priority;
    //     this.scroll.isModalPriority = priority;
    // }

    public switchExpand() {
        this.switchFilterState(!this.$isExpand);
    }

    private onTouchbtnExpend(evt: egret.TouchEvent) {
        if (this.SelectorData.expendMethod && this.SelectorData.expendMethod.call(this.SelectorData.expendCaller)) {
            return;
        }

        if (!this.scrollHeight)
            this.EXPEND_HEIGHT = Math.max(this.scroll.height, this.ItemList.contentHeight);

        if (this.HEIGHT_MIN > this.EXPEND_HEIGHT)
            return;
        this.switchExpand();
    }

    private onTouchOutSide(evt: egret.TouchEvent) {
        this.switchFilterState(false);
    }

    private updateBtnExpend() {
        let state = this.$isExpand ? "down" : "up";
        if (this.SelectorData?.expendStateEx) {
            let stateEx = this.SelectorData.expendStateEx.call(this.SelectorData.expendCaller);
            state += "," + stateEx;
        }
        this.btnExpend.currentState = state;
    }

    // tween part
    private switchFilterState(open: boolean, tween: boolean = true) {
        if(!this.SelectorData) return;
        if (this.$isExpand == open) return;
        if (this.$isPlayingTw) return;
        this.$isExpand = open;
        this.$isPlayingTw = true;
        open && this.imgBgVisible(true);

        // //底板
        // let imgBg = egret.Tween.get(this.imgBg);
        // imgBg.to({
        //     height: open ? this.EXPEND_HEIGHT : this.SHRINK_HEIGHT - 3,
        // }, DownListSelector.FilterTime, DownListSelector.FilterEase);

        //裁剪板
        open && this.grpSort && (this.grpSort.visible = true);
        let srlClip: egret.Tween;
        if (tween) {
            srlClip = egret.Tween.get(this.scroll);
            srlClip.to({
                height: open ? this.EXPEND_HEIGHT : this.SHRINK_HEIGHT,
            }, DownListSelector.FilterTime);//DownListSelector.FilterEase
        }
        else {
            this.scroll.height = open ? this.EXPEND_HEIGHT : this.SHRINK_HEIGHT;
        }
        let cb = () => {
            this.$isPlayingTw = false;
            this.updateBtnExpend();
            if (this.$isExpand) {
                // UIManager.stage.addEventListener(egret.TouchEvent.TOUCH_END, this.onTouchOutSide, this);
                this.scroll.modal = true;
                // this.scroll.isModalPriority = this.$scrollModalPriority;
                this.scroll.addEventListener(egret.TouchEvent.TOUCH_TAP_OUTSIDE, this.onTouchOutSide, this);
            } else {
                // UIManager.stage.removeEventListener(egret.TouchEvent.TOUCH_END, this.onTouchOutSide, this);
                this.scroll.modal = false;
                this.scroll.removeEventListener(egret.TouchEvent.TOUCH_TAP_OUTSIDE, this.onTouchOutSide, this);
                this.imgBgVisible(false);
                this.grpSort && (this.grpSort.visible = false);
            }
        };
        if (tween) {
            srlClip.call(cb, this);
        }
        else {
            cb();
        }
    }

    private imgBgVisible(value: boolean) {
        this.imgBg && (this.imgBg.visible = value);
        this.dispatchEventWith(DownListSelector.IMG_BG_VISIBLE, false, value);
    }
}
