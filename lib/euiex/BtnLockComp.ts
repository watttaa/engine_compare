import { safeCallComFunc } from "utils/UIUtils_safecall";

import { s2_open_ui_cfg } from "auto/open_ui";
import { uiSkinPath2 } from "GlobalValue";
import { entrance_c_net } from "net/EntranceCNet";
import { OpenUICNet } from "net/OpenUICNet";
import { isOpenIdEnabled } from "openui/OpenUIUtil";
import { UnlockOpenUITips } from "view/UnlockOpenUITips";


export enum BtnSkin_Tab1_LockVXStateEnum {
	STATE_NOR = "lock_Tab_1_2",
	STATE_CIRCLE = "circle",
	STATE_SPECIAL = "special",
}

/**
* @des 按钮锁定组件
* @author LiuYonggen
* @since 2023/01/16
*/
export class BtnLockComp extends eui.Component {
    loop: egret.tween.TweenGroup;
    ani_unlock: egret.tween.TweenGroup;
    private $openId: number;
    private $tips: string;
    private $specialOpenId: number[];
    private $specialHandler: {[openId: number]: Function};
    private $uiParent: egret.DisplayObject;

    public constructor() {
        super();
        this.name = "_lock_comp";
        this.skinName = uiSkinPath2("button/BtnSkin_LockVX.exml");
        this.addEventListener(egret.TouchEvent.TOUCH_TAP, this.onTapLock, this);
        this.$specialOpenId = [s2_open_ui_cfg.TEMP /** SUIT */, s2_open_ui_cfg.TEMP /** ROLE_FEISHENGSKILL */, s2_open_ui_cfg.TEMP /** ROLE_XMXL */]
        this.$specialHandler = {}
    }

    private onTapLock(e: egret.TouchEvent) {
        if (this.$openId && isOpenIdEnabled(this.$openId, false)) {
            entrance_c_net.C_UNLOCK_OPEN_UI(this.$openId);
            e.stopImmediatePropagation();
        } 
        // if (this.$specialOpenId.indexOf(this.$openId) !== -1) {
        // }
        // EventBus.dispatchEvent(new CommonEvent(CommonEvent.UNLOCK_OPEN_UI, {unlockId: this.$openId, tips: "12345678941231564"}));
    }

    public setData(openId: number, parent: eui.Component) {
        this.$openId = openId;
        safeCallComFunc(this, parent, ()=>{
            parent.addChildAt(this, parent.numChildren - 1);
            let state = this.getLockSkinState(openId, parent);
            this.currentState = state;
        })
        this.$uiParent = parent;
    }

    private getLockSkinState(openId: number, widget: eui.Component) {
        let btnSkinName = widget.skinName;
        let state = "";
        if (this.$specialOpenId.indexOf(openId) !== -1) {
            state = BtnSkin_Tab1_LockVXStateEnum.STATE_SPECIAL;
        }
        else if (btnSkinName) {
            //if (btnSkinName == "resource/eui_skins/S1/BtnSkin_Tab1.exml") {
            //    state = BtnSkin_Tab1_LockVXStateEnum.STATE_LOCK_TAB_1;
            //} else if (btnSkinName == "resource/eui_skins/S1/BtnSkin_Tab1_2.exml") {
            //    state = BtnSkin_Tab1_LockVXStateEnum.STATE_LOCK_TAB_1_2;
            //} else if (btnSkinName == "resource/eui_skins/BtnTabSkin_Cpjd.exml") {
            //    state = BtnSkin_Tab1_LockVXStateEnum.STATE_LOCK_LuckCollection;
            //}
            this.width = widget.width;
            this.height = widget.height;
            state = BtnSkin_Tab1_LockVXStateEnum.STATE_NOR;
        }
        return state;
    }

    public unlock(data: {id: number, tips: string}) {
        this.$openId = data.id;
        this.$tips = data.tips;
        this.playAni(true);
    }

    @SafeCallFunction()
    public playAni(isUnlock: boolean) {
        if (isUnlock) {
            this.loop && this.loop.stop();
            if (this.ani_unlock) {
                this.ani_unlock.play(0);
                if (!this.$specialHandler[this.$openId]) {
                    UIManager.open(UnlockOpenUITips)
                }
                preload_utils_calldelay.callLater(1500, this.onAniUnlockPlayEnd, [], this);
                // 有时候不会派发egret.Event.COMPLETE 事件
                // this.ani_unlock.once(egret.Event.COMPLETE, this.onAniUnlockPlayEnd, this);
            }
            // this.onAniUnlockPlayEnd();
        } else {
            this.ani_unlock && this.ani_unlock.stop();
            this.loop && this.loop.play();
        }
    }

    @SafeCallFunction()
    public stopAni() {
        this.loop && this.loop.stop();
    }

    private onAniUnlockPlayEnd() {
        if (this.parent) {
            let pos = this.parent.localToGlobal();
            let width = this.width
            let height = this.height
            if (this.$specialOpenId.indexOf(this.$openId) !== -1) {
                width *= 0.9;
                height *= 0.9;
            }
            let handler = this.$specialHandler[this.$openId]
            if (handler) {
                handler();
            }
            else if (this.$tips) {
                UIManager.open(UnlockOpenUITips).then((inst: UnlockOpenUITips) =>{
                    inst.setData(this.$tips, width, height, pos, undefined, this.$openId, false, this.$uiParent);
                })
            } else if (this.$openId) {
                OpenUICNet.C_OPEN_UI(this.$openId, false);
                UIManager.close(UnlockOpenUITips);
            }
            // if (this.$specialOpenId.indexOf(this.$openId) === -1) {
            //     // this.parent.dispatchEvent(new egret.TouchEvent(egret.TouchEvent.TOUCH_TAP)); // 触发点击事件
            //     OpenUICNet.C_OPEN_UI(this.$openId, false);
            // }
            this.parent.removeChild(this);
        }

    }

    $onRemoveFromStage(): void {
        super.$onRemoveFromStage();
        this.loop && this.loop.stop();
        this.ani_unlock && this.ani_unlock.stop();
    }
}