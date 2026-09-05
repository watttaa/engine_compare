import { uiPath, uiSkinPath } from "GlobalValue";
import { ComponentEx } from "lib/euiex/ComponentEx";
import { ui_utils_hide } from "utils/UIUtils_hide";

type NumberInputUIData = {
    max: number,
    cur: number
}

export class NumberInputComp extends ComponentEx {
    btnMax: eui.Button;
    lblCalcNum: eui.Label;
    btn1: eui.Button;
    btn2: eui.Button;
    btn3: eui.Button;
    btnBack: eui.Button;
    btn4: eui.Button;
    btn5: eui.Button;
    btn6: eui.Button;
    btn0: eui.Button;
    btn7: eui.Button;
    btn8: eui.Button;
    btn9: eui.Button;
    btnConfirm: eui.Button;

    public _isEuiex: boolean = true;

    public static readonly CHANGE: "change";

    constructor() {
        super();
        this.skinName = this.skinName || uiSkinPath("BtnSkin_CalculatorMini.exml");
    }

    private $curNum = 0;

    private data: NumberInputUIData;

    protected onSkinLoadCompleted(): void {
        super.onSkinLoadCompleted();
        for (let i=0;i<10;i++){
            let btn = this[`btn${i}`];
            if (btn){
                btn.addEventListener(egret.TouchEvent.TOUCH_TAP, () => {
                    this.touchTapBtnNum(i);
                })
            }
        }
        ui_utils_hide.hideOnTouchTapOutside_(this);
    }

    public get curNum() {
        return this.$curNum;
    }

    public set curNum(value: number) {
        if (value !== this.$curNum){
            this.$curNum = value;
        }
    }

    public reset(): void {
        this.$curNum = 0;
        this.update();
    }

    private update() {
        this.lblCalcNum.text = `${this.curNum}`;
    }

    @SafeCallFunction()
    setData(data: NumberInputUIData) {
        this.data = data;
        if (data.cur != undefined){
            this.curNum = data.cur;
            this.update();
        }
    }

    touchTapBtnNum(i: number) {
        this.curNum = this.curNum * 10 + i;
        this.curNum = Math.max(0, Math.min(this.curNum, this.data.max));
        this.update();
    }

    onTouchTapbtnBack() {
        this.curNum = Math.floor(this.curNum / 10);
        this.curNum = Math.max(0, Math.min(this.curNum, this.data.max));
        this.update();
    }

    onTouchTapbtnConfirm() {
        let event = new egret.Event(NumberInputComp.CHANGE);
        event.data = { count: this.$curNum }
        this.dispatchEvent(event);
        this.visible = false;
    }

    onTouchTapbtnMax() {
        this.curNum = this.data.max;
        this.update();
    }

}