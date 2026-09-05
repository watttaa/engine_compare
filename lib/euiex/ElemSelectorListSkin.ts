
import { EgretExEntry } from "lib/EgretExUtils_Entry";
import { safeCallComFunc, setUpdateListLayoutCallBack_ } from "utils/UIUtils_safecall";
import { ComponentEx } from "./ComponentEx";
import { SelectorListItem } from "./SelectorListItem";


export class ElemSelectorListSkin extends ComponentEx {
    public _isEuiex = true;

    public constructor() {
        super();
        this.skinName = "resource/eui_skins/S1/ElemSelectorListSkin.exml";
    }

    private $parms: [EgretExEntry.FollowerSelEntry, Comment, boolean][];
    state: "";
    grpMore: eui.Group;
    imgBg: eui.Image;
    srlMore: eui.Scroller;
    lstMore: eui.List;

    public initData(parms: [EgretExEntry.FollowerSelEntry, Comment, boolean][]): void {
        this.$parms = parms;
        if(this.inited){
            this.initList();
        }
    }

    protected onSkinLoadCompleted() {
        super.onSkinLoadCompleted();
        this.initList();
    }

    public initList(): void {
        this.lstMore.dataProvider = new eui.ArrayCollection();
        this.lstMore.itemRenderer = SelectorListItem;
        this.lstMore.touchEnabled = false;
        this.lstMore.requireSelection = true;
        this.tryLoadList();
    }

    public tryLoadList() {
        if (!this.$parms || !this.inited) return;
        let dataProvider = this.lstMore.dataProvider as eui.ArrayCollection;
        dataProvider.removeAll();
        for (let data of this.$parms) {
            dataProvider.addItem(data);
        }
    }

    public $onRemoveFromStage() {
        let dataProvider = this.lstMore.dataProvider as eui.ArrayCollection;
        dataProvider.removeAll();
        super.$onRemoveFromStage();
    }

    @SafeCallFunction()
    public updateChooseImg(rowIndexArr: number[], targetRow?: number) {
        if(this.lstMore){
            setUpdateListLayoutCallBack_(this.lstMore, () => {
                let dataProvider = this.lstMore.dataProvider as eui.ArrayCollection;
                for (let row = 0; row < dataProvider.length; row++) {
                    if (targetRow != undefined && targetRow != row) continue;
                    let choosedIdx = rowIndexArr[row + 1];
                    let listItem = this.lstMore.getElementAt(row) as SelectorListItem;
                    if (listItem) {
                        safeCallComFunc(this, listItem, () => {
                            listItem.updateChooseImg(choosedIdx);
                        }, [])
                    }
                }
            }, this);
        }
    }

    public destroy() {
        let dataProvider = this.lstMore.dataProvider as eui.ArrayCollection;
        dataProvider.removeAll();
    }
}