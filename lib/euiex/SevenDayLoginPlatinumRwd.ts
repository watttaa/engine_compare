import { ActivitySevenDayLoginExRewardEntry } from "base/ServerEntry";
import { AniActivityRewardLight } from "lib/euiex/AniActivityRewardLight";
import { ComponentEx } from "lib/euiex/ComponentEx";
import { ItemGrid } from "lib/euiex/ItemGrid";
import { ItemGridCompEnum } from "lib/euiex/ItemGridCompConst";
import { ItemInfo } from "s2/bag/ItemInfo";
import { ActivitySevenDayLoginCNet } from "s2/sevenDayLogin/net/ActivitySevenDayLoginCNet";
import { SpecialTextColor } from "TextColorUtils";
import { safeCallComFunc } from "utils/UIUtils_safecall";

export interface SevenDayLoginPlatinumRwd {
    itemMain: ItemGrid;
    lblDay: eui.Label;
    lblMoney: eui.Label;
};

enum PlatinumRwdState {
    Lock = 1,
    Available = 2,
    Received = 3,
}

// 七天登录-铂金奖励组件皮肤
export class SevenDayLoginPlatinumRwd extends ComponentEx {
    $data: ActivitySevenDayLoginExRewardEntry;
    $canReceiveAniComp: AniActivityRewardLight;

    constructor() {
        super();
        this.$data = null;
        this.$canReceiveAniComp = null;
    }

    protected onSkinLoadCompleted(): void {
        super.onSkinLoadCompleted();
        this.updateShowInfo();
    }

    onClose(): void {
        this.removeAvailableAni();
    }

    @SafeCallFunction()
    setData(data: ActivitySevenDayLoginExRewardEntry) {
        this.$data = data;
        this.updateShowInfo();
    }

    updateShowInfo() {
        if (!this.inited || !this.$data) {
            return;
        }
        this.itemMain.setData(ItemInfo.create({ sid: this.$data.reward_item }, null, { showMask: this.$data.state == PlatinumRwdState.Received && { icon: "sevendaylogin_tag_got_png" } }));
        // fmt: 已登录天数/达标天数
        this.updateLabelTextAndColor(this.lblDay, `${this.currentLoginDays}/${this.$data.reward_days}`, SpecialTextColor.LowGreen);
        // fmt: 已充值金额/达标金额
        this.updateLabelTextAndColor(this.lblMoney, `${this.currentRecharge}/${this.$data.req_recharge}`, SpecialTextColor.LowGreen);
        this.setAvailableAni(this.$data.state == PlatinumRwdState.Available);
        this.setItemTouchFunc(this.$data.state == PlatinumRwdState.Available);
    }

    get currentLoginDays() {
        // 登录天数,不超过reward_days
        return this.$data ? Math.min(this.$data.reward_days, this.$data.login_days) : 0;
    }

    get currentRecharge() {
        // 充值金额,不超过req_recharge
        return this.$data ? Math.min(this.$data.req_recharge, this.$data.acc_recharge) : 0;
    }

    updateLabelTextAndColor(lbl: eui.Label, text: string, textColor: number) {
        lbl.text = text;
        lbl.textColor = textColor;
    }

    initAvailableAni() {
        this.$canReceiveAniComp = new AniActivityRewardLight();
        this.$canReceiveAniComp.setAni("Yellow");
        this.$canReceiveAniComp.touchEnabled = false;
    }

    removeAvailableAni() {
        if (this.$canReceiveAniComp) {
            this.$canReceiveAniComp.stop();
            this.$canReceiveAniComp.visible = false;
            this.$canReceiveAniComp = null;
        }
    }

    setAvailableAni(needShowAni: boolean) {
        if (needShowAni) {
            if (!this.$canReceiveAniComp) {
                // 创建并绑定动效到itemGrid
                safeCallComFunc(this, this.itemMain, () => {
                    this.initAvailableAni();
                    safeInvokeFunc(this.itemMain, () => {
                        if (!this.$canReceiveAniComp) return;
                        this.itemMain.addToWidget(this.$canReceiveAniComp, ItemGridCompEnum.Mc);
                        this.$canReceiveAniComp.visible = true;
                        this.$canReceiveAniComp.play();
                    });
                });
            }
        }
        else {
            if (this.$canReceiveAniComp) {
                this.$canReceiveAniComp.stop();
                this.$canReceiveAniComp.visible = false;
            }
        }
    }

    setItemTouchFunc(canReceive: boolean) {
        this.itemMain.clearTouchFunc();
        if (canReceive) {
            this.itemMain.setTouchFunc(() => {
                ActivitySevenDayLoginCNet.C_ON_SVLOGIN_EX_REWARD_RECEIVE();
            }, this);
        }
    }
}