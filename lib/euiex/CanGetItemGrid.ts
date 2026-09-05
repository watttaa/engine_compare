import { AniActivityRewardLight } from "lib/euiex/AniActivityRewardLight";
import { ItemInfo } from "s2/bag/ItemInfo";
import { ItemGridComp } from "./ItemGridComp";
import { ItemGridCompEnum } from "./ItemGridCompConst";

export class CanGetItemGrid extends ItemGridComp {
    public _isEuiex = true;

    protected collectableLight: AniActivityRewardLight;// 可以领取的光效
    private $canGetFunc: Function;
    private $canGetFuncObj: any;
    private $canGetFuncArgs: any;

    public constructor() {
        super();
        // this.skinName = "resource/eui/Task_NormalBox.exml";
    }

    protected onSkinLoadCompleted() {
        super.onSkinLoadCompleted();
    }

    public $onRemoveFromStage() {
        super.$onRemoveFromStage();
        this.clearRewardEff();
        this.clearCanGetFunc();
    }

    private playRewardEff() {
        if (!this.collectableLight) {
            this.collectableLight = new AniActivityRewardLight();
            this.collectableLight.setAniSkinName("AniReceiveLight");
            this.collectableLight.touchEnabled = false;
        }
        this.addToWidget(this.collectableLight, ItemGridCompEnum.Mc);
        this.collectableLight.play();
        this.collectableLight.visible = true;
    }

    private clearRewardEff() {
        if (this.collectableLight) {
            this.collectableLight.stop();
            this.collectableLight.visible = false;
        }
    }

    protected get canGet() {
        //let custom = this.$custom as EgretExEntry.CanGetItemGridCustomData;
        //return custom.getState == RewardState.CAN_GET;
        return false
    }

    protected onUpdateCustom() {
        this._filterCustom();//设置红点和mask
        this._updateCanGetAni();//可领取动效
        super.onUpdateCustom();

    }

    private _filterCustom() {
        //let custom = this.$custom as EgretExEntry.CanGetItemGridCustomData;
        //let bGot = custom.getState == RewardState.GOT;
        //let data: EgretExEntry.ItemGridCustomData = {
        //    reddot: this.canGet ? 1 : custom.reddot,
        //    showMask: bGot ? { icon: ItemGridMaskIconEnum.Got_Com } : custom.showMask,//已经领取的遮罩
        //};
        //this.updateSomeCustom(data, false)
    }

    private _updateCanGetAni() {
        //可领取动效
        if (this.canGet) {
            this.playRewardEff();
        } else {
            this.clearRewardEff();
        }
    }

    protected onTouchTapItem(evt: egret.TouchEvent) {
        let itemInfo: ItemInfo = this.data?.iteminfo;
        if (!itemInfo || !itemInfo.id) {
            return;
        }
        if (this.canGet) {
            //领取（不同玩法的道具领取奖励不一样，子类继承或者外部设置）
            if (this.$canGetFunc) {
                this.$canGetFunc.call(this.$canGetFuncObj, this.$canGetFuncArgs);
                //if (evt && this.stopImmediatePropagation) {
                //    evt.stopImmediatePropagation();
                //}
                return;
            }
        }
        //super.onTouchTapItem(evt);
    }

    public setCanGetFunc(func: Function, thisObj?: any, args?: any) {
        this.$canGetFunc = func;
        this.$canGetFuncObj = thisObj;
        this.$canGetFuncArgs = args;
    }

    public clearCanGetFunc() {
        this.$canGetFunc = undefined;
        this.$canGetFuncObj = undefined;
        this.$canGetFuncArgs = undefined;
    }

}