import { FightStep } from "base/Enum";
import { EgretExEntry } from "lib/EgretExUtils_Entry";
import { ui_utils_fightstep } from "utils/UIUtils_fightstep";

const FightStepSkinMap = {
    [FightStep.YI]: 'resource/eui_skins/flyup/FightPowerSkin.exml',
    [FightStep.BILLION]: 'resource/eui_skins/FightSkin_Billion.exml',
}

export class FightPowerWidget extends eui.Button {
    public _isEuiex = true;

    ////////////////////////(皮肤定制)
    // public labelDisplay: eui.Label;
    private DetailPowerBtn: eui.Button;
    private grpInfo: eui.Group;
    private grpBg: eui.Group;

    ////////////////////////(战力数据)
    private $data: EgretExEntry.FightPowerDataType;

    ////////////////////////(最大长度)
    protected MAX_WIDTH: number = 424;

    private oldSkinName: string;
    // static flyUpPower: number = GlobalValue.YI;//超过一亿战力换皮肤
    // static billionPower: number = GlobalValue.YI * 10;//超过10亿战力换皮肤
    // private flyUpSkinName: string = 'resource/eui_skins/flyup/FightPowerSkin.exml';
    // private billioSkinName: string = 'resource/eui_skins/FightSkin_Billion.exml';

    public get data() {
        return this.$data;
    }

    public set data(value: EgretExEntry.FightPowerDataType) {
        this.$data = value;
        if (this.completed) {
            this.dataChanged();
        }
    }

    public setData(value: EgretExEntry.FightPowerDataType) {
        safeInvokeFunc(this, () => { this.data = value })
    }

    public constructor() {
        super();
        this.touchEnabled = false;
        this.touchChildren = true;
    }

    private onTouchDetailBtn(e: egret.TouchEvent) {
        if (this.data.fun) {
            this.data.fun();
        }
    }

    protected onSkinLoadCompleted() {
        super.onSkinLoadCompleted();
        if (!this.oldSkinName) this.oldSkinName = this.skinName;
        if (this.$data) {
            this.dataChanged();
        }
        this.DetailPowerBtn.addEventListener(egret.TouchEvent.TOUCH_TAP, this.onTouchDetailBtn, this);
    }

    protected dataChanged() {
        if (isNotVain(this.data.power)) {
            this.label = String(this.data.power);
            // this.grpMask.width = this.grpInfo.width + 80
            // this.width = this.grpBg.width = Math.min(this.grpInfo.width, this.MAX_WIDTH);
        }
        this.DetailPowerBtn.visible = isNotVain(this.data.fun); //没有回调的时候就不显示了

        //解析
        let power = this.data.power;
        // if (typeof (power) === "string") {
        //     let length = power.length - 1;
        //     if (power[length] == GlobalText.WAN) {
        //         power = power.substring(0, length);
        //         power = +power * Math.pow(10, 4);
        //     } else if (power[length] == GlobalText.YI) {
        //         power = power.substring(0, length);
        //         power = +power * Math.pow(10, 8);
        //     }
        // }
        // if(isNaN(+power)) return
        let fightNum = preload_utils_text.BigFightFormatNumber(power);
        let fightStep = ui_utils_fightstep.getFightStep(fightNum);
        if (fightStep == FightStep.NOR) {
            // 小于一亿的皮肤不止一套
            this.skinName = this.oldSkinName;
        } else {
            this.skinName = FightStepSkinMap[fightStep];
        }
    }
}