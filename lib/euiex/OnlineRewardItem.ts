import { ItemEntry } from "base/ServerEntry";
import { RewardState } from "GlobalValue";
import { GlobalValue } from "GlobalValueDefine";
import { AniActivityRewardLight } from "lib/euiex/AniActivityRewardLight";
import { ItemGridComp } from "lib/euiex/ItemGridComp";
import { Countdown } from "lib/Timer_Countdown";
import { TweenGroupPanel } from "lib/TweenGroupPanel";
import { UIManagerFactroy } from "lib/UIManagerFactory";
import { ItemInfo } from "s2/bag/ItemInfo";
import { date_utils } from "utils/DateUtils";
import { ItemGridCompEnum } from "./ItemGridCompConst";

export type ONLINE_REWARD_ONE_ITEM_ENTRY = {
    time: number, //可领取时间戳
    itemData: ItemEntry,//基础奖励
    ext_reward?: ItemEntry[],//额外奖励
    state: RewardState,//状态 # 0 不可领取，1可领取，2已领取（RewardState）
    type: number, //显示样式
    name: string, //礼包名字
    serverIdx?: number,
    tableIdx?: number,
}

export class OnlineRewardItem extends eui.ItemRenderer {
    public _isEuiex = true;
    item: ItemGridComp;
    grpMc: eui.Group;
    grpMcGot: eui.Group;
    grpGot: eui.Group;
    lblTime: eui.Label;
    imgGot: eui.Image;

    private $countdown: Countdown; //目前并未实际处理倒计时
    private $callBackInfo: any[];
    private $gotAniCallBack: any[];

    private collectableLight: AniActivityRewardLight;//可领取动效
    public showAni: boolean;
    public lblTest: eui.Label;

    constructor() {
        super();
        this.skinName = "resource/eui/Activity_Online_RewardItem.exml";
        this.$callBackInfo = null;
        this.$gotAniCallBack = null;
        this.showAni = false;
    }

    onSkinLoadCompleted() {
        this.$countdown = new Countdown(this.lblTime, null, { type: date_utils.CountdownEnum.Custom1 });
        super.onSkinLoadCompleted();
    }

    $onRemoveFromStage() {
        this.clearRewardEff();
        this.destroyGotAni();
        this.clearCountDown();
        egret.Tween.removeTweens(this.imgGot);
        this.$callBackInfo = null;
        this.$gotAniCallBack = null;
        super.$onRemoveFromStage()
    }

    private playRewardEff() {
        if (!this.collectableLight) {
            this.collectableLight = new AniActivityRewardLight();
            this.collectableLight.setAni("Collectable");
            this.collectableLight.touchEnabled = false;
            safeInvokeFunc(this.item, () => {
                this.item.addToWidget(this.collectableLight, ItemGridCompEnum.Mc)
            })
        }
        this.collectableLight.play();
        this.collectableLight.visible = true;
    }

    private clearRewardEff() {
        if (this.collectableLight) {
            this.collectableLight.stop();
            this.collectableLight.visible = false;
        }
    }

    private _updateAniShow() {
        this.showAni ? this.playRewardEff() : this.clearRewardEff();
    }

    public setClickCallBack(callback?: Function, thisObject?: any) {
        this.$callBackInfo = [callback, thisObject];
    }

    public clearClickCallBack() {
        this.$callBackInfo = null;
    }

    private _updateTouchCallback() {
        if (this.$callBackInfo) {
            this.addEventListener(egret.TouchEvent.TOUCH_TAP, this.onTouchTapItem, this);
        } else {
            this.removeEventListener(egret.TouchEvent.TOUCH_TAP, this.onTouchTapItem, this);
        }
    }

    private onTouchTapItem(evt: egret.TouchEvent) {
        if (this.$callBackInfo) {
            let func = this.$callBackInfo[0] as Function;
            let thisObj = this.$callBackInfo[1];
            func.apply(thisObj);
            this.$callBackInfo = null;
        }
    }

    private clearCountDown() {
        this.$countdown && this.$countdown.stop();
        this.$countdown = null;
    }

    dataChanged() {
        this.updateItemRender();
    }

    private updateItemRender() {
        if (!this.completed) return;
        if (!this.data) return;
        let data = this.data as ONLINE_REWARD_ONE_ITEM_ENTRY;
        this.updateState();
        this.updateUI();
        this._updateTouchCallback();
        this._updateAniShow();
        this.checkMC();
        this.lblTest.text = `${data.tableIdx}-${data.serverIdx}`
    }

    private updateUI() {
        let data = this.data as ONLINE_REWARD_ONE_ITEM_ENTRY;
        // let itemInfo = ItemInfo.create(data.itemData, null, { getMask: data.state == GlobalValue.RewardState.GOT, getType: 2 });
        let itemInfo = ItemInfo.create(data.itemData, null, { showMask: data.state == GlobalValue.RewardState.GOT && {} });
        this.item.setData(itemInfo);
        //----
        let cur_time = ServerTimer.second();
        this.$countdown.stop();
        if (this.currentState == "nor") {
            let leftTime = data.time - cur_time;
            if (leftTime > 0) {
                this.$countdown.start(leftTime);//剩余时间
            }
        }
    }

    private updateState(force_state?: GlobalValue.RewardState) {
        let data = this.data as ONLINE_REWARD_ONE_ITEM_ENTRY;
        let state = force_state != undefined ? force_state : data.state;
        if (state == GlobalValue.RewardState.CAN_NOT_GET) { this.currentState = "nor" } //不可领取
        else if (state == GlobalValue.RewardState.CAN_GET) { this.currentState = "get" } //可领取
        else if (state == GlobalValue.RewardState.GOT) { this.currentState = "got" } //已领取
        this.validateNow();
    }

    /**
     * 领取动效
     */
    private $gainTween: TweenGroupPanel;//可领取动效
    public _isShowGotMc: boolean;
    private destroyGotAni() {
        if (this.$gainTween) {
            this.$gainTween.visible = false;
            this.$gainTween.destroy();
            this.$gainTween = null;
        }
    }

    private checkMC() {
        if (!this.completed) return;
        if (this._isShowGotMc) {
            if (!this.$gainTween) {
                this.$gainTween = UIManagerFactroy.createTweenGroupPanel(this.grpMcGot, "resource/eui_skins/AniCommonSquareLight.exml", 0, 0, false);
            }
            this.$gainTween.play(1, this.onPlayCompleted, this);
            this.$gainTween.visible = true;
        } else {
            if (this.$gainTween) {
                this.$gainTween.visible = false;
                this.$gainTween.stop();
            }
        }
    }

    private onPlayCompleted() {
        this._isShowGotMc = false;
        this.checkMC();
        this.execGotAniCallBack();
    }

    public showGotAniOnce(callback?: Function, thisObject?: any, ...cbArgs) {
        this._isShowGotMc = true;
        this.$gotAniCallBack = [callback, thisObject, cbArgs];
        this.checkMC();
    }

    private execGotAniCallBack() {
        if (this.$gotAniCallBack) {
            let func = this.$gotAniCallBack[0] as Function;
            let thisObj = this.$gotAniCallBack[1];
            let cbArgs = this.$gotAniCallBack[2];
            if (func) {
                func.apply(thisObj, cbArgs);
            }
            this.$gotAniCallBack = null;
        }
    }

    /**
    * 勾选动效
    */
    public playImgGotAni(callback?: Function, thisObject?: any) {
        this.updateState(GlobalValue.RewardState.GOT);//强行切一波状态
        egret.Tween.removeTweens(this.imgGot);
        let tw = egret.Tween.get(this.imgGot);
        this.imgGot.scaleX = 2.5;
        this.imgGot.scaleY = 2.5;
        this.imgGot.alpha = 0;
        if (callback) {
            tw.call(callback, thisObject);
        }
        tw.to({ "scaleX": 1, "scaleY": 1, "alpha": 1.0 }, 100, egret.Ease.backOut);
    }

}
