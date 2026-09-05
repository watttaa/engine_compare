import { TYPE_PP_ICON_DETAIL } from "base/ServerEntry";
import { safeCallComFunc } from "utils/UIUtils_safecall";
import { ComponentEx } from "./ComponentEx";
import { ElemSelectorSkinMenuItem } from "./ElemSelectorSkinMenuItem";
import { sortZhTxt } from "GlobalText";
import { GlobalEvent } from "GlobalEventDefine";
import { GlobalEventSource } from "GlobalEvent";

export class ListSelectorControl extends ComponentEx {
    public _isEuiex = true;
    public static LIST_SELECTOR_CONTROL_UPDATA = "LIST_SELECTOR_CONTROL_UPDATA";
    //grpExpend: eui.Group;
    btnExpend: eui.Button;
    lstItem: eui.List;
    grpExpandLst: eui.Group;

    private $lstSelectorDirection: "up" | "down" = "up";
    public set lstSelectorDirection(value: "up" | "down") {
        this.$lstSelectorDirection = value;
        this.refresh();
    }
    public get lstSelectorDirection() {
        return this.$lstSelectorDirection;
    }
    // grpBg:eui.Group;
    // protected $bgRect: eui.Rect;
    constructor() {
        super();
        //this.skinName = "resource/eui_skins/TeamListSelectorItem.exml";
    }

    onSkinLoadCompleted() {
        super.onSkinLoadCompleted();
        this.initList();
    }

    protected initList(): void {
        this.lstItem.dataProvider = new eui.ArrayCollection();
        this.lstItem.itemRenderer = ElemSelectorSkinMenuItem;

        this.lstItem.addEventListener(eui.ItemTapEvent.ITEM_TAP, this.onTouchItem, this);
        this.lstItem.touchEnabled = true;
        this.lstItem.requireSelection = true;

        this.btnExpend.addEventListener(egret.TouchEvent.TOUCH_TAP, this.onTouchTapbtnExpend, this);
        this.setlistStatus();
    }

    // ["prop.MAXHP", "prop.ATK", "prop.spd", "level"]
    public listStatus: { value: keyof TYPE_PP_ICON_DETAIL | string, isUp: boolean };
    @SafeCallFunction()
    public setlistStatus(value: keyof TYPE_PP_ICON_DETAIL | string = "default", isUp: boolean = false) {
        this.grpExpandLst.visible = isUp;
        let arr = [];
        (this.lstItem.dataProvider as eui.ArrayCollection).source = arr;
        this.lstItem.selectedIndex = arr.indexOf(value);
        let data: any = {};
        safeCallComFunc(this, this.lstItem, () => {
            let dir = 6;
            if (this.lstSelectorDirection === "up") {
                this.grpExpandLst.y = this.btnExpend.y - this.grpExpandLst.height - dir;
            } else {
                this.grpExpandLst.y = this.btnExpend.y + this.btnExpend.height + dir;
            }
        });


        safeCallComFunc(this, this.btnExpend, () => {
            let btnExpend = this.btnExpend as any;
            (btnExpend.labelDisplay as eui.Label).text = sortZhTxt;//isUp ? sortZhTxt : data.name;
            (btnExpend.imgIcon as eui.Image).source = data.icon;
            (btnExpend.grpArrow as eui.Group).visible = true;
            if (this.lstSelectorDirection === "up") {
                (btnExpend.imgUp as eui.Image).visible = !isUp;
                (btnExpend.imgDown as eui.Image).visible = isUp;
            } else {
                (btnExpend.imgUp as eui.Image).visible = isUp;
                (btnExpend.imgDown as eui.Image).visible = !isUp;
            }

            this.listStatus = { value: value, isUp: isUp }
        });
        GlobalEvent.SendEvent(GlobalEventSource.TEAM_LIST_CHANGE, { isUp: isUp });
        if (!isUp) {
            let event = new egret.Event(ListSelectorControl.LIST_SELECTOR_CONTROL_UPDATA);
            event.data = { value: value }
            this.dispatchEvent(event);
        } else {
            UIManager.stage.once(egret.TouchEvent.TOUCH_BEGIN, this.onTouchBeginStage, this)

        }


    }

    private onTouchBeginStage(evt: egret.TouchEvent): void {
        let width = this.grpExpandLst.width;
        let height = this.grpExpandLst.height;
        let point: egret.Point = this.grpExpandLst.localToGlobal();
        if (evt.stageX > point.x && evt.stageX < point.x + width && evt.stageY > point.y && evt.stageY < point.y + height) {
            return;
        }

        width = this.btnExpend.width
        height = this.btnExpend.height;
        point = this.btnExpend.localToGlobal();
        if (evt.stageX > point.x && evt.stageX < point.x + width && evt.stageY > point.y && evt.stageY < point.y + height) {
            return;
        }
        this.setlistStatus(this.listStatus.value);
    }

    public refresh(): void {
        this.setlistStatus();
    }

    protected onTouchTapbtnExpend(): void {
        if (!this.listStatus) return;
        this.setlistStatus(this.listStatus.value, !this.listStatus.isUp);
    }
    protected onTouchItem(): void {
        let arr = []
        this.setlistStatus(arr[this.lstItem.selectedIndex] as keyof TYPE_PP_ICON_DETAIL, false);
    }

    $onRemoveFromStage(): void {
        super.$onRemoveFromStage();
        UIManager.stage.removeEventListener(egret.TouchEvent.TOUCH_BEGIN, this.onTouchBeginStage, this)
    }
}
