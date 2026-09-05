import { GlobalEventSource, UnListenEvent } from "GlobalEvent";
import { s2_head_token_utils } from "auto/head_token";
import { s2_object_cfg } from "auto/object";
import { ObjectIdEnum } from "auto/object_id_enum";
import { s2_text_utils } from "auto/text";
import { CommonEvent } from "event/CommonEventDefines";
import { HeroMainEvent, HeroMainEventBus } from "heroMain/HeroMainEvent";
import { EventBus } from "lib/CommonEventMgr";
import { OpenUICNet } from "net/OpenUICNet";
import { ActivityCNet } from "s2/act/net/ActivityCNet";
import { ItemInfo } from "s2/bag/ItemInfo";
import { ItemUtils } from "s2/bag/ItemUtils";
import { BagCNet } from "s2/bag/net/BagCNet";
import { HeadTokenMgr } from "s2/headtoken/HeadTokenMgr";
import { MultiTokenData } from "s2/mainui/currency/MainCurrencyUI";
import { UnifiedCurrencyBubbleUI, MultiTokenBubbleVo } from "s2/mainui/currency/UnifiedCurrencyBubbleUI";
import { UIReturn } from "s2/uireturn/UIReturnable";


export enum MainTopBar_ItemStateEnum {
	STATE_NOR = "nor",
	STATE_MINIGAME = "minigame",
	STATE_LOCK = "lock",
	STATE_NO_ADD = "no_add",
}



export type HeadTokenData = {
    tokenIndex: number;
    /** 是否隐藏btnAdd按钮，默认false */
    hideAdd?: boolean;
}

export interface HeadTokenItem {

    imgToken: eui.Image;
    labelToken: eui.Label;
    btnAdd: eui.Button;
    imgLock: eui.Image;

}

export class HeadTokenItem extends eui.Component {

    private $data: HeadTokenData;
    private $isTokenMultiIndex: boolean;

    private constructor() {
        super();
    }


    public onSkinLoadCompleted() {
        super.onSkinLoadCompleted();

        // this.btnTokenAdd.visible = false;
        // this.btnTokenPay.visible = false;

        this.btnAdd.addEventListener(egret.TouchEvent.TOUCH_TAP, this.onTouchedBtnTokenAdd, this);
        // this.btnTokenPay.addEventListener(egret.TouchEvent.TOUCH_TAP, this.onTouchedBtnTokenPay, this);
        this.imgToken.addEventListener(egret.TouchEvent.TOUCH_TAP, this.onTouchTapImgToken, this);
        this.labelToken.addEventListener(egret.TouchEvent.TOUCH_TAP, this.onTouchTapLblToken, this);
        // this.in && this.in.addEventListener(egret.Event.COMPLETE, this.playZuanShiAniCompleted, this);
    }

    @SafeCallFunction()
    public setData(data: HeadTokenData) {
        this.$isTokenMultiIndex = false;
        this.$data = data;
        if (!data) {
            Logger.error(`This data is ${data}!!!`);
            return;
        }

        this.$isTokenMultiIndex = s2_head_token_utils.isTokenMultiIndex(data.tokenIndex);
        let itemIds: number[] = s2_head_token_utils.getTokenItemIdsByIndex(data.tokenIndex);
        if (this.$isTokenMultiIndex) {
            this.imgToken.source = s2_head_token_utils.getTokenMultiIcon(data.tokenIndex);
        } else {
            let itemId = itemIds[0];
            this.imgToken.source = ItemUtils.getTokenIcon(itemId);
        }

        //
        let inst = HeadTokenMgr.getInstance();
        let tokenData: ReturnType<typeof HeadTokenMgr.prototype.getTokenCnt>;
        for (let v of itemIds) {
            let oneTokenData = inst.getTokenCnt(v);
            if (!tokenData) {
                tokenData = preload_utils_clone.copyObj(oneTokenData); // 必须克隆，不污染原来的数据
            }
            else {
                tokenData.cnt += oneTokenData.cnt;
            }
        }
        let isBig = itemIds.includes(ObjectIdEnum.YINLIANG) || itemIds.includes(ObjectIdEnum.SHIGONG);
        if (preload_utils_platform.isMiniGame()) {
            //小游戏顶部栏长度不够，都用格式化显示
            isBig = true;
        }
        let des = isBig ? preload_utils_text.numberFormatMoney(tokenData.cnt, 2) : tokenData.cnt;
        if (tokenData.max) {
            let desEx = isBig ? preload_utils_text.numberFormatMoney(tokenData.max, 2) : tokenData.max;
            des = `${des}/${desEx}`;
        }
        this.labelToken.text = des + "";
        if (data.hideAdd || s2_head_token_utils.isHideAdd(data.tokenIndex)) {
            this.currentState = MainTopBar_ItemStateEnum.STATE_NO_ADD;
        } else {
            this.currentState = MainTopBar_ItemStateEnum.STATE_NOR;
        }
        

        if (itemIds[0] == ObjectIdEnum.PAY_DIAMOND && tokenData.cnt < 0) {
            this.currentState = MainTopBar_ItemStateEnum.STATE_LOCK;
            this.imgLock.addEventListener(egret.TouchEvent.TOUCH_TAP, this.showLockTokenBubble, this);
        }
        // let redirectId = head_token_utils.getRedirect(data.tokenIndex);
        // let purchaseId = head_token_utils.getAutoPurchase(data.tokenIndex);
        // let isZuanshi = itemIds.length == 1 && itemIds[0] == ObjectIdEnum.PAY_DIAMOND;
        // let isBangZuan = itemIds.length == 1 && itemIds[0] == ObjectIdEnum.FREE_DIAMOND;
        // this.btnTokenPay.visible = !!(redirectId && isZuanshi);
        // this.btnTokenAdd.visible = !!((redirectId && (!isZuanshi)) || purchaseId || isBangZuan);

        // if (isWxAuditServer) {
        //     //微信审核服需要屏蔽
        //     this.btnTokenPay.visible = false;
        //     this.btnTokenAdd.visible = false;
        // }

        // if (isZuanshi) {
        //     this.currentState = "charge"
        // }
        // else if (isBangZuan) {
        // }
        // else {
        //     this.currentState = "nor"
        // }
        // UnListenEvent(ZUAN_SHI_GET_ANI, this.playZuanShiAni, this);
        // UnListenEvent(BANG_ZUAN_GET_ANI, this.playZuanShiAni, this);
        // if (this.in) {
        //     if (isZuanshi) {
        //         ListenEvent(ZUAN_SHI_GET_ANI, this.playZuanShiAni, this);
        //     }
        //     else if (isBangZuan) {
        //     }
        //     if (!this.in.isPlaying) {
        //         this.grpEff && (this.grpEff.visible = false);
        //     }
        // }
    }

    public $setVisible(visible) {
        if (!visible) {
            if (this.imgToken) {
                this.imgToken.source = "";
            }
        }
        super.$setVisible(visible);
    }

    public $onRemoveFromStage() {
        UnListenEvent(GlobalEventSource.ZUAN_SHI_GET_ANI, this.playZuanShiAni, this);
        UnListenEvent(GlobalEventSource.BANG_ZUAN_GET_ANI, this.playZuanShiAni, this);
        this.btnAdd && this.btnAdd.removeEventListener(egret.TouchEvent.TOUCH_TAP, this.onTouchedBtnTokenAdd, this);
        // this.btnTokenPay && this.btnTokenPay.removeEventListener(egret.TouchEvent.TOUCH_TAP, this.onTouchedBtnTokenPay, this);
        this.imgToken && this.imgToken.removeEventListener(egret.TouchEvent.TOUCH_TAP, this.onTouchTapImgToken, this);
        this.labelToken && this.labelToken.removeEventListener(egret.TouchEvent.TOUCH_TAP, this.onTouchTapLblToken, this);
        // this.in && this.in.removeEventListener(egret.Event.COMPLETE, this.playZuanShiAniCompleted, this);

        this.imgToken && this.imgLock.removeEventListener(egret.TouchEvent.TOUCH_TAP, this.showLockTokenBubble, this);
        super.$onRemoveFromStage();
    }

    /** 跳转或者获得按钮打开逻辑 */
    @UIReturn
    private openAction() {
        let inst = HeadTokenMgr.getInstance();
        let redirectId = inst.getRedirect(this.$data.tokenIndex);
        let purchaseId = inst.getAutoPurchase(this.$data.tokenIndex);
        if (redirectId) {
            OpenUICNet.C_OPEN_UI(redirectId);
            EventBus.dispatchEvent(new CommonEvent(CommonEvent.TAB_TOKEN_BTN));
        } else if(purchaseId) {
            BagCNet.C_QUERY_BUY_ITEM(purchaseId);
        }
    }

    private playZuanShiAni() {
        // this.grpEff && (this.grpEff.visible = true);
        // this.in && this.in.play(0);
    }

    private playZuanShiAniCompleted() {
        // this.grpEff && (this.grpEff.visible = false);
        // this.in && this.in.setPosition(0, true);
    }

    private showMultiTokenBubble() {
        let itemIds: number[] = [];
        let tokenIndexes = s2_head_token_utils.getTokenMultiIndex(this.$data.tokenIndex);
        
        // 如果没有多币种索引，使用当前token的itemId
        if (!tokenIndexes || tokenIndexes.length === 0) {
            let itemId = s2_head_token_utils.getTokenItemId(this.$data.tokenIndex);
            itemIds.push(itemId);
        } else {
            for (let v of tokenIndexes) {
                let itemId = s2_head_token_utils.getTokenItemId(v);
                itemIds.push(itemId);
            }
        }

        // 检查是否包含仙玉或彩玉
        let hasPayDiamond = itemIds.includes(ObjectIdEnum.PAY_DIAMOND);
        let hasFreeDiamond = itemIds.includes(ObjectIdEnum.FREE_DIAMOND);
        
        // 只有包含仙玉或彩玉时才显示多币种气泡
        if (hasPayDiamond || hasFreeDiamond) {
            let pos = egret.Point.create(this.imgToken.width >> 1, this.imgToken.height);
            this.imgToken.localToGlobal(pos.x, pos.y, pos);
            let event = new HeroMainEvent(HeroMainEvent.SHOW_MULTI_TOKEN_BUBBLE, { items: itemIds, pos } as MultiTokenData);
            HeroMainEventBus.getInstance().dispatchEvent(event);
            egret.Point.release(pos);
        }
    }

    private onTouchTapImgToken() {
        if (!this.$data) return Logger.warn(`Token No Data`);
        
        // 检查是否为叠加物品且包含仙玉或彩玉
        let itemIds: number[] = [];
        let tokenIndexes = s2_head_token_utils.getTokenMultiIndex(this.$data.tokenIndex);
        
        if (!tokenIndexes || tokenIndexes.length === 0) {
            // 单个物品，直接显示物品详情
            let inst = HeadTokenMgr.getInstance();
            let itemId = inst.getTokenItemId(this.$data.tokenIndex);
            let itemInfo = ItemInfo.create({ sid: itemId });
            BagCNet.C_GET_ITEM_EXTRA_INFO(itemInfo);
        } else {
            // 叠加物品，收集所有itemId
            for (let v of tokenIndexes) {
                let itemId = s2_head_token_utils.getTokenItemId(v);
                itemIds.push(itemId);
            }
            
            // 检查是否包含仙玉或彩玉
            let hasPayDiamond = itemIds.includes(ObjectIdEnum.PAY_DIAMOND);
            let hasFreeDiamond = itemIds.includes(ObjectIdEnum.FREE_DIAMOND);
            
            if (hasPayDiamond || hasFreeDiamond) {
                // 包含钻石类货币，显示多币种气泡弹框
                this.showMultiTokenBubble();
            } else {
                // 不包含钻石类货币，显示第一个物品的详情
                let inst = HeadTokenMgr.getInstance();
                let itemId = inst.getTokenItemId(this.$data.tokenIndex);
                let itemInfo = ItemInfo.create({ sid: itemId });
                BagCNet.C_GET_ITEM_EXTRA_INFO(itemInfo);
            }
        }
    }

    private onTouchedBtnTokenAdd() {
        if (!this.$data) {
            return;
        }
        let itemId = s2_head_token_utils.getTokenItemId(this.$data.tokenIndex);
        if (itemId == ObjectIdEnum.SHIGONG) { // 策划说师贡要特殊处理
            BagCNet.C_OPEN_ITEM_SOURCE(itemId);
            return;
        }
        const isActivityBuyTicket = s2_head_token_utils.isActivityBuyTicket(this.$data.tokenIndex);
        if (isActivityBuyTicket) {
            const open_id = s2_head_token_utils.getRedirect(this.$data.tokenIndex);
            ActivityCNet.C_CALL_ACTIVITY(open_id, "on_lottery_show_buy_ticket", []);
            return;
        }
        this.openAction();
    }

    /**钻石专用点击效果 */
    private onTouchedBtnTokenPay() {
        this.openAction();
    }

    private onTouchTapLblToken() {
        // 点击标签时抛出事件打开多币种气泡弹框
        this.showMultiTokenBubble();
    }

    // 代码复制自本体
    private showLockTokenBubble(evt: egret.TouchEvent) {
        let pos = this.localToGlobal(this.width >> 1, this.height);
        if (pos) {
            UIManager.TopPanel.globalToLocal(pos.x, pos.y, pos);
            let x = Math.max(pos.x - 30, 0), // 左边要在屏幕内
                y = pos.y + 10; // 转到x、y，因为pos马上会被release掉

            let data = {
                icon1: ItemUtils.getItemById(ObjectIdEnum.PAY_DIAMOND, true),
                name1: s2_object_cfg.ObjectInfo[ObjectIdEnum.PAY_DIAMOND][s2_object_cfg.cName],
                desc1: s2_text_utils.T(2010179),
            } as MultiTokenBubbleVo;
            // 创建单一彩玉数据（不显示仙玉）
            const bubbleData = UnifiedCurrencyBubbleUI.createMultiTokenData(false, s2_text_utils.T(2010179));
            O3(UnifiedCurrencyBubbleUI, inst => {
                inst.setData(bubbleData);
                inst.x = Math.min(x, UIManager.TopPanel.width - inst.width); // 右边也要在屏幕内
                inst.y = y;
            }, this, true, true);
            UIManager.stage.once(egret.TouchEvent.TOUCH_BEGIN, this.hideLockTokenBubble, this);
        }
    }

    private hideLockTokenBubble() {
        UIManager.close(UnifiedCurrencyBubbleUI);
    }
}

