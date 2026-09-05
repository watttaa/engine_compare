import { s2_global_value_cfg } from "auto/global_value";
import { WuxingTipsUI } from "common/WuxingTips";
import { FollowerType, PPAttckType, PPAttckTypeTab } from "GlobalValue";
import { GlobalValue } from "GlobalValueDefine";
import { RedPointTreeHelper } from "lib/RedPointManager";

import { ComponentEx } from "./ComponentEx";
import { DownListSelector } from "./DownListSelector";
import { ElemSelectorListSkin } from "./ElemSelectorListSkin";
import { ListSelectorControl } from "./ListSelectorControl";
import { SelectorListItem } from "./SelectorListItem";
import { s2_text_utils } from "auto/text";
import { DownListEvent } from "lib/EgretExUtils_DownListEvent";
import { EgretExEntry } from "lib/EgretExUtils_Entry";
import { safeCallComFunc, setUpdateListLayoutCallBack_ } from "utils/UIUtils_safecall";

interface SelectorListDef {
    list: ElemSelectorListSkin
}


export class SelectorBase extends ComponentEx {
    public _isEuiex = true;

    protected SHRINK_HEIGHT: number = 60;
    protected EXPEND_HEIGHT: number = 272;
    protected START_OFFSET = 20;//打开/关闭按钮的起始top/bottom设置
    protected EXPAND_DIR: "up" | "down";

    protected srlClip: eui.Scroller;
    protected btnHelp: eui.Button;
    protected btnOpen: eui.Button;
    protected btnClose: eui.Button;
    protected imgBg: eui.Image;
    protected lstRow: eui.List;
    protected upList: DownListSelector;
    protected lstSelector: ListSelectorControl;

    protected grpRoot: eui.Group;
    // protected srlMore: eui.Scroller;
    // protected lstMore: eui.List;



    public static FilterEase = egret.Ease.cubicOut;
    public static FilterTime = 400;

    protected $dataFunc: Function;
    protected $execFunc: Function;
    protected $extraFunc: Function;

    protected static ROW_COUNT = 4;

    //当前选中idx
    // protected $curRowIdx1: number = 0;  //金木土水火1~5，全部0
    // protected $curRowIdx2: number = 0;  //品质 1~6，全部0
    // protected $curRowIdx3: number = 0;  //战辅控医 1~4，全部0 //伤害 辅控医
    // protected $curRowIdx4: number = 0;  //伤害类型 1~2，全部0
    protected $rowIndexArr: number[];

    protected $thisObj: any;
    private $isPlayingTw: boolean = false;
    private $isExpand = false;
    protected $FiltKeys: EgretExEntry.FollowerSelEntry[] = [];
    protected $FiltKeys2Idx: { FollowerSelEntry?: number } = {}//index 0-3
    protected $followeType: FollowerType
    protected $custom: EgretExEntry.SelectorCustom;

    protected sortFun: Function;

    public get cacheCom(): any {
        if (!this.$cacheCom) {
            this.$cacheCom = null
        }
        return this.$cacheCom;
    }
    private $cacheCom: any;

    constructor() {
        super();
        this.EXPAND_DIR = "down";
        this.$FiltKeys = [];
        this.$FiltKeys2Idx = {};
        this.$custom = {};
        this.$rowIndexArr = [undefined, 0, 0, 0, 0];

    }

    public restChooseByIndex(selectIndex: number): void {
        let arr = [0, 0, 0, 0]
        for (let index = 0; index < this.$FiltKeys.length; index++) {
            if (this.$FiltKeys[index] === EgretExEntry.FollowerSelEntry.elem) {
                arr[index] = selectIndex;
                if (this.$extraFunc) {
                    let new_idx = this.$extraFunc.call(this.$thisObj);
                    if (new_idx > 0 && new_idx != selectIndex) {
                        MessageBox(s2_text_utils.T(26004));
                        arr[index] = new_idx;
                    }
                }
                break;
            }
        }
        this.setChoose(arr[0], arr[1], arr[2], arr[3]);
    }

    public initialFunc(obj: any, data: EgretExEntry.SelectorBaseData) {
        this.$thisObj = obj;
        this.$dataFunc = data.dataFunc;
        this.$execFunc = data.execFunc;
        this.$extraFunc = data.extraFunc;
        this.$followeType = data.followeType;
        this.$custom = data.custom ? data.custom : {};

        this.loadFiltKeys(data);
        this.loadFiltKeys2Idx();
        this.tryLoadList();
        this.updateCustom();
    }

    public setCustom(data: EgretExEntry.SelectorCustom) {
        this.$custom = data || {};
        this.updateCustom();
    }

    protected resetCustom() {
        safeCallComFunc(this, this.lstSelector, () => { this.lstSelector.visible = true; });
    }

    protected updateCustom() {
        if (this.completed && this.$custom) {
            this.resetCustom()
            if (isNotVain(this.$custom.lstSelector)) {
                safeCallComFunc(this, this.lstSelector, () => { this.lstSelector.visible = this.$custom.lstSelector; });
            }
        }
    }

    protected initUpList(): void {
        // // if(!this.upList) return;
        // // export type EgretExEntry.DownListSelectorData = {
        // //     itemRenderer: typeof eui.ItemRenderer;//列表项ItemRenderer
        // //     listData: any[];//列表数据
        // //     defaultIdx?: number;//默认选中项，不过要先监听 DownListEvent.ON_CHOOSED_ITEM 再初始化 initDownList 
        // // }
        // let data: EgretExEntry.DownListSelectorData = {
        //     "itemRenderer": ElemSelectorSkinMenuItem,
        //     "listData": [1, 2, 3, 4, 5],
        //     "defaultIdx": 0,
        // } as EgretExEntry.DownListSelectorData
        // this.upList.initDownList(this, data);
        // this.upList.addEventListener(DownListEvent.ON_CHOOSED_ITEM, this.onChoosedItem, this);
    }

    public onChoosedItem(choosed: DownListEvent) {
        //let selectData:{curIdx:number, curData:number} = choosed.data;
        //ArenaTopCNet.C_ON_ARENA_TOP_HISTORY(selectData.curData);
    }

    protected loadFiltKeys(data: EgretExEntry.SelectorBaseData) { };

    protected loadFiltKeys2Idx() {
        for (let i = 0; i < this.$FiltKeys.length; i++) {
            let FiltKeys: EgretExEntry.FollowerSelEntry = this.$FiltKeys[i];
            this.$FiltKeys2Idx[FiltKeys] = i;
        }
    }

    public getFiltKeys2Idx(FiltKeys: EgretExEntry.FollowerSelEntry) {
        return this.$FiltKeys2Idx[FiltKeys];
    }

    public tryLoadList() {
        if (!this.$FiltKeys || !this.inited) return;
        let dataProviderLeft = this.lstRow.dataProvider as eui.ArrayCollection
        dataProviderLeft.removeAll();


        let datas = [];
        for (let filtKey of this.$FiltKeys) {
            if (filtKey == EgretExEntry.FollowerSelEntry.elem) {
                dataProviderLeft.addItem([filtKey, this, isNotVain(this.$custom.lstSelector)]);
            } else {
                datas.push([filtKey, this, isNotVain(this.$custom.lstSelector)]);
            }
        }
        if (this.inited) {
            this.cacheCom.addCacheInit("list", ElemSelectorListSkin, this.grpRoot, [datas]);
        }
    }

    public get currentChoose() {
        // return [this.$curRowIdx1, this.$curRowIdx2, this.$curRowIdx3, this.$curRowIdx4];
        return [this.$rowIndexArr[1], this.$rowIndexArr[2], this.$rowIndexArr[3], this.$rowIndexArr[4]];
    }

    protected onSkinLoadCompleted() {
        super.onSkinLoadCompleted();
        this.lstRow.dataProvider = new eui.ArrayCollection();
        this.lstRow.itemRenderer = SelectorListItem;
        this.lstRow.touchEnabled = false;
        this.lstRow.requireSelection = true;

        // this.lstMore.dataProvider = new eui.ArrayCollection();
        // this.lstMore.itemRenderer = SelectorListItem;
        // this.lstMore.touchEnabled = false;
        // this.lstMore.requireSelection = true;

        this.tryLoadList();
        this.resetCustom();
        this.updateCustom();
        safeInvokeFunc(this.upList, () => {
            this.initUpList();
        }, [])

        //
        this.btnOpen.addEventListener(egret.TouchEvent.TOUCH_TAP, this.onTouchExpandBtn, this);
        this.btnClose.addEventListener(egret.TouchEvent.TOUCH_TAP, this.onTouchShrinkBtn, this);
        this.btnHelp.addEventListener(egret.TouchEvent.TOUCH_TAP, this.onTouchbtnHelp, this);
        UIManager.stage.addEventListener(egret.TouchEvent.TOUCH_BEGIN, this.onTouchBeginStage, this);
        // this.initRowBtn();
        this["btnClose"].visible = false;
        RedPointTreeHelper.addPointOnWidget(this.btnOpen, false);
        this.reset();
        safeCallComFunc(this, this.lstSelector, () => {
            this.lstSelector.lstSelectorDirection = this.EXPAND_DIR;
            this.lstSelector.addEventListener(ListSelectorControl.LIST_SELECTOR_CONTROL_UPDATA, this.updateListSelectorControl, this);
        });
    }

    public updateListSelectorControl(e: egret.Event): void {
        this.updateChoose(false, this.sortFun);

    }



    public $onRemoveFromStage() {
        // egret.Tween.removeTweens(this.imgBg);
        this.$thisObj = null;
        this.$dataFunc = null;
        this.$execFunc = null;
        this.$extraFunc = null;
        if (this.completed) {
            let dataProvider = this.lstRow.dataProvider as eui.ArrayCollection;
            dataProvider.removeAll();

            let listComp = this.cacheCom.getCompmentByDef("list") as ElemSelectorListSkin;
            if (listComp) {
                listComp.destroy();
            }

            egret.Tween.removeTweens(this.srlClip);
        }
        UIManager.stage.removeEventListener(egret.TouchEvent.TOUCH_BEGIN, this.onTouchBeginStage, this)
        super.$onRemoveFromStage();
    }

    public onPanelOpen(): void {
        safeCallComFunc(this, this.lstSelector, () => {
            this.lstSelector.setlistStatus();
        });
    }

    public setListSelectorShow(visible: boolean) {
        safeCallComFunc(this, this.lstSelector, () => {
            this.lstSelector.visible = visible;
        });
    }

    public reset() {
        if (!this.inited) return;
        this.$isExpand = false;
        // this.btnOpen.visible = false;
        // this.btnClose.visible = false;
        this.srlClip.height = this.SHRINK_HEIGHT;
        if (this.EXPAND_DIR == "down") {
            this.START_OFFSET = this.btnOpen.top //? this.btnOpen.top : 0;
        } else {
            this.START_OFFSET = this.btnOpen.bottom// ? this.btnOpen.bottom : 0;
        }

        this.resetChoose();
    }

    public isDefaultChoose() {
        for (let rowIdx = 1; rowIdx < SelectorBase.ROW_COUNT + 1; rowIdx++) {
            // if (this[`$curRowIdx${rowIdx}`] != 0) {
            if (this.$rowIndexArr[rowIdx] != 0) {
                return false;
            }
        }
        return true;
    }

    private onTouchbtnHelp() {
        UIManager.open(WuxingTipsUI);
    }

    private onTouchExpandBtn() {
        this.switchFilterState(true);
    }

    private onTouchShrinkBtn() {
        this.switchFilterState(false);
    }

    public resetChoose() {
        if (!this.$dataFunc) return;
        let idx = 0;
        if (this.$extraFunc) {
            let new_idx = this.$extraFunc.call(this.$thisObj);
            if (new_idx)
                idx = new_idx;
        }
        let defaultChoose = [0, 0, 0, 0];
        let filterIdx = this.$FiltKeys2Idx[EgretExEntry.FollowerSelEntry.elem];
        defaultChoose[filterIdx] = idx
        // this.setChoose(...defaultChoose);

        this.setChoose.apply(this, [...defaultChoose, true]);
    }

    public setChoose(firstIdx: number, secondIdx: number, thirdIdx: number, fourthIdx: number, isUpdate: boolean = true) {
        // this.$curRowIdx1 = firstIdx;
        // this.$curRowIdx2 = secondIdx;
        // this.$curRowIdx3 = thirdIdx;
        // this.$curRowIdx4 = fourthIdx;
        this.$rowIndexArr[1] = firstIdx;
        this.$rowIndexArr[2] = secondIdx;
        this.$rowIndexArr[3] = thirdIdx;
        this.$rowIndexArr[4] = fourthIdx;

        this.updateChooseImg();
        if (isUpdate) this.updateChoose(false, this.sortFun);
    }

    private updateChooseImg(targetRow?: number) {
        let listComp = this.cacheCom.getCompmentByDef("list") as ElemSelectorListSkin;
        if (listComp) {
            listComp.updateChooseImg(this.$rowIndexArr, targetRow);
        }

        setUpdateListLayoutCallBack_(this.lstRow, () => {
            let dataProvider = this.lstRow.dataProvider as eui.ArrayCollection;
            for (let row = 0; row < dataProvider.length; row++) {
                if (targetRow != undefined && targetRow != row) continue;
                let choosedIdx = this.$rowIndexArr[this.$rowIndexArr.length - 1];
                let listItem = this.lstRow.getElementAt(row) as SelectorListItem;
                if (listItem) {
                    safeCallComFunc(this, listItem, () => {
                        listItem.updateChooseImg(choosedIdx);
                    }, [])
                }
            }
        }, this);

    }



    public onTouchItem(rowType: EgretExEntry.FollowerSelEntry, rowIdx: number, idx: number, item: SelectorListItem) {
        if (!this.$dataFunc) return;
        if (this.$extraFunc && rowType == EgretExEntry.FollowerSelEntry.elem) {
            let new_idx = this.$extraFunc.call(this.$thisObj);
            if (new_idx > 0 && new_idx != idx) {
                item.updateChooseImg(this.$rowIndexArr[rowIdx + 1]);
                MessageBox(s2_text_utils.T(26004));
                return;
            }
        }
        // this[`$curRowIdx${rowIdx + 1}`] = idx;
        this.$rowIndexArr[rowIdx + 1] = idx;
        this.updateChooseImg(idx);
        this.updateChoose(true, this.sortFun);
    }

    public getFilterData() {
        if (!this.$dataFunc) return;
        let data = this.$dataFunc.call(this.$thisObj);
        // this.$cache = data;
        //五行1  秒数2，伤害类型4
        let types = [EgretExEntry.FollowerSelEntry.elem, EgretExEntry.FollowerSelEntry.iFightNum, EgretExEntry.FollowerSelEntry.hurt];
        for (let FiltKey of types) {
            let rowIdx = this.$FiltKeys2Idx[FiltKey]
            // let curRowIdx = this[`$curRowIdx${rowIdx + 1}`];
            let curRowIdx = this.$rowIndexArr[rowIdx + 1];
            // data = follower_utils.filterDatas(data, FiltKey, curRowIdx, (target, type_data, pid) => {
            //     if (FiltKey === EgretExEntry.FollowerSelEntry.iFightNum) {
            //         let arr = s2_global_value_cfg.Global_valueInfo["G_LINEUP_FIGHT_ALL_1_TO_9"]
            //         //观音要特殊处理
            //         if (data && arr.indexOf(pid) >= 0 && target <= type_data) {
            //             return true;
            //         }
            //         let arr2 = s2_global_value_cfg.Global_valueInfo["G_LINEUP_FIGHT_ALL_10"] //辰龙特殊逻辑处理
            //         if (arr2 && arr2[0] === pid && target <= arr2[1]) {
            //             return true;
            //         }
            //     }
            //     if (target === 0 || target === type_data) {
            //         return true;
            //     }
            //     return false;
            // });
        }
        let sortFunction = this.sortFun// || sortByKey;
        if (this.lstSelector && this.lstSelector.listStatus && this.lstSelector.listStatus.value) {
            data = data.sort(sortFunction.bind(this, this.lstSelector.listStatus.value));
        } else {
            data = data.sort(sortFunction.bind(this, "default"));
        }
        return data;
    }

    public updateChoose(isClick: boolean = false, sortFun: Function = null) {
        this.sortFun = sortFun;
        let data = this.getTwiceFilterData();
        // if (!data || data.length <= 0) return;
        if (this.$execFunc && this.$thisObj) {
            this.$execFunc.call(this.$thisObj, isClick, data);
        }
    }

    /**2次筛选 */
    public getTwiceFilterData(): Array<any> {
        let data = this.getFilterData();
        let attckType: PPAttckType = null;
        if (this.lstSelector && this.lstSelector.listStatus && this.lstSelector.listStatus.value) {
            attckType = this.lstSelector.listStatus.value as PPAttckType;
            if (attckType === PPAttckType.physics || attckType === PPAttckType.magic) {
                let newData = [];
                for (let elem of data) {
                    if (PPAttckTypeTab[attckType] === elem.type) {
                        newData.push(elem);
                    }
                }
                data = newData
            }
        }
        return data;
    }

    public refreshRedPoint(rowIdx: number, rpData: any[]) {
    }

    public updateExpandBtnPos() {
        let curDeltaH = 0//(this.srlClip.height - this.SHRINK_HEIGHT)
        if (this.EXPAND_DIR == "down") {
            this.btnOpen.top = this.START_OFFSET + curDeltaH
            this.btnClose.top = this.START_OFFSET + curDeltaH
        } else {
            this.btnOpen.bottom = this.START_OFFSET + curDeltaH
            this.btnClose.bottom = this.START_OFFSET + curDeltaH
        }
    }

    // tween part
    public switchFilterState(open: boolean, bAni = true) {
        bAni = false;
        if (this.$isExpand === open) return;
        if (this.$isPlayingTw) return;
        this.$isExpand = open;
        this.$isPlayingTw = true;
        this.cacheCom.setComVisble("list", open);
        let srlClipH = open ? this.EXPEND_HEIGHT : this.SHRINK_HEIGHT;
        let cb = () => {
            this.$isPlayingTw = false;
            // this.btnClose.visible = open;
            // this.btnOpen.visible = !open;
        };
        if (bAni) {
            //裁剪板
            let funcChange = () => {
                // this.updateExpandBtnPos();
            };
            let srlClip = egret.Tween.get(this.srlClip, { onChange: funcChange, onChangeObj: this.srlClip });
            // let srlClip = egret.Tween.get(this.srlClip);
            srlClip.to({
                height: srlClipH,
            }, SelectorBase.FilterTime, SelectorBase.FilterEase);

            srlClip.call(cb, this);
            this.btnClose.visible = open;
            this.btnOpen.visible = !open;
        } else {
            this.srlClip.height = srlClipH;
            cb.call(this)
            this.btnClose.visible = open;
            this.btnOpen.visible = !open;
            this.updateExpandBtnPos();
        }
    }
    protected onTouchBeginStage(evt: egret.TouchEvent): void {
        if (this.$isExpand) {
            let width = this.srlClip.width;
            let height = this.srlClip.height;
            let point: egret.Point = this.srlClip.localToGlobal();
            if (evt.stageX > point.x && evt.stageX < point.x + width && evt.stageY > point.y && evt.stageY < point.y + height) {
                return;
            }
            this.switchFilterState(false, false);
        }
    }
}