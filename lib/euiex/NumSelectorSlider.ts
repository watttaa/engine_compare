import { safeCallComFunc } from "utils/UIUtils_safecall";

import { ComponentEx } from "./ComponentEx";

export class NumSelectorSlider extends ComponentEx {
    public _isEuiex = true;

    public static readonly CHANGE: "change";

    private lblNum: eui.Label;
    private btnMinus: eui.Button;
    private numHSlider: eui.HSlider & { imgTrackGrey: eui.Image };
    private btnPlus: eui.Button;
    private btnSub100: eui.Button;
    private btnAdd100: eui.Button;
    private btnMax: eui.Button
    private $textFormat: string;
    private $maxCount: number;
    private $count: number;
    private $isShow: boolean;
    private $limit: number;

    private $minCount: number = 1;
    private $MAXIMUM: number = 1000000;//最大购买量，双重保险

    private _labelFunction: (count: number) => string = null;
    /**
     * 进度条文本格式化回调函数。示例：
     * <code>labelFunction(count:Number,maximum:Number):String;</code>
     */
    public get labelFunction(): (count: number) => string {
        return this._labelFunction;
    }

    public set labelFunction(value: (count: number) => string) {
        if (this._labelFunction == value)
            return;
        this._labelFunction = value;
    }

    private $textMaxNotice: string = "";
    public set textMaxNotice(value: string) {
        this.$textMaxNotice = value;
    }


    public getCount() {
        return this.$count;
    }

    private $addNum: number = 1;
    public setAddNum(value: number) {
        this.$addNum = value;
    }
    public setMinCount(value: number) {
        this.$minCount = value;
    }

    /** 滑块视觉下限是否跟随 minCount（默认 false：minimum=0，兼容旧行为） */
    private $sliderMinFloor: boolean = false;
    /**
     * 开启后滑块 minimum = minCount，使滑动范围 [minCount, maxCount] 满量程，
     * 避免 minCount 较大时手柄停在中部、[0, minCount] 成死区。
     * 需在 setData 之前调用；默认关闭以保持其余使用方行为不变。
     */
    public setSliderMinFloor(enable: boolean = true) {
        this.$sliderMinFloor = enable;
    }

    /** 开启滑块实时拖动更新（仅客户端本地计算场景使用，无协议压力）；默认关闭仅松手时派发 */
    public setLiveDragging(enable: boolean = true) {
        if (this.numHSlider) {
            this.numHSlider.liveDragging = enable;
        }
    }

    protected onSkinLoadCompleted() {
        super.onSkinLoadCompleted();
        this.btnMinus.addEventListener(egret.TouchEvent.TOUCH_TAP, this.$onTouchedBtnMinus, this);
        this.btnPlus.addEventListener(egret.TouchEvent.TOUCH_TAP, this.$onTouchedBtnPlus, this);
        this.btnAdd100 && this.btnAdd100.addEventListener(egret.TouchEvent.TOUCH_TAP, this.$onTouchedBtnAdd100, this);
        this.btnSub100 && this.btnSub100.addEventListener(egret.TouchEvent.TOUCH_TAP, this.$onTouchedBtnSub100, this);
        this.btnMax && this.btnMax.addEventListener(egret.TouchEvent.TOUCH_TAP, this.$onTouchedBtnmax, this);
        this.numHSlider.addEventListener(eui.UIEvent.CHANGE, this.$changeHandler, this);
        this.numHSlider.liveDragging = false;//防止短时间过多协议，s2与123不一样，暂时弄成结束时更新数据
        this.numHSlider.minimum = 0;
        this.numHSlider.snapInterval = 1;
        this.$minCount = 1;
        this.$addNum = 1;
    }

    public $onRemoveFromStage() {
        this.btnMinus && this.btnMinus.removeEventListener(egret.TouchEvent.TOUCH_TAP, this.$onTouchedBtnMinus, this);
        this.btnPlus && this.btnPlus.removeEventListener(egret.TouchEvent.TOUCH_TAP, this.$onTouchedBtnPlus, this);
        this.btnAdd100 && this.btnAdd100.removeEventListener(egret.TouchEvent.TOUCH_TAP, this.$onTouchedBtnAdd100, this);
        this.btnSub100 && this.btnSub100.removeEventListener(egret.TouchEvent.TOUCH_TAP, this.$onTouchedBtnSub100, this);
        this.numHSlider && this.numHSlider.removeEventListener(eui.UIEvent.CHANGE, this.$changeHandler, this);
        this.btnMax && this.btnMax.removeEventListener(egret.TouchEvent.TOUCH_TAP, this.$onTouchedBtnmax, this);
        this.lblNum && (this.lblNum.text = "");
        super.$onRemoveFromStage();
    }

    /**
     * 
     * @param count 当前的购买量
     * @param maxCount 当前能购买最大次数
     * @param textFormat 
     * @param isShow 是否展示文本
     * @param maxLimit 总的能购买的最大次数
     */
    @SafeCallFunction()
    public setData(count: number, maxCount: number, textFormat?: string, isShow: boolean = true, limit?: number) {
        this.$count = count;
        this.$isShow = isShow;
        this.lblNum && (this.lblNum.visible = isShow);
        this.$minCount = Math.min(this.$minCount, count); //如果小于1，则最小值显示为count的值
        this.$minCount = this.$minCount || 1;
        this.numHSlider.touchEnabled = maxCount != 1;
        this.numHSlider.touchChildren = maxCount != 1;
        this.$maxCount = maxCount;
        this.$limit = limit || this.$maxCount;
        safeCallComFunc(this, this.numHSlider, () => {
            // 积分商店的灰度条
            if (this.numHSlider.imgTrackGrey) {
                if (this.$limit > this.$maxCount) {
                    this.numHSlider.imgTrackGrey.visible = true;
                    this.numHSlider.imgTrackGrey.scaleX = (this.$limit - this.$maxCount) / this.$limit;
                }
                else {
                    this.numHSlider.imgTrackGrey.visible = false;
                }
            }
        })

        this.$textFormat = textFormat || "{count}";
        this.numHSlider.maximum = this.$limit;
        // 开关开启时滑块下限跟随 minCount，使 [minCount, maxCount] 满量程（默认 0，兼容旧行为）
        this.numHSlider.minimum = this.$sliderMinFloor ? this.$minCount : 0;
        if (this.btnAdd100 && this.btnSub100) {
            this.btnAdd100.visible = this.btnSub100.visible = this.$maxCount >= 100;
        }
        this.$update();
    }

    public set value(value: number) {
        this.$count = value;
        this.$update();
    }

    private $update() {
        if (this.numHSlider) {
            this.numHSlider.value = this.$count;
            this.$updateText();
            this.updateButtonState();
            let event = new egret.Event(NumSelectorSlider.CHANGE);
            // fromDrag=false：由 +/-/max/setValue 等非拖动路径触发
            event.data = { count: this.$count, fromDrag: false }
            this.dispatchEvent(event);
        }
    }

    private updateButtonState() {
        this.btnMinus.enabled = this.$count > this.$minCount;
        this.btnPlus.enabled = this.$count < this.$maxCount;
        this.btnAdd100 && (this.btnAdd100.enabled = this.btnPlus.enabled);
        this.btnSub100 && (this.btnSub100.enabled = this.btnMinus.enabled);
    }

    private $updateText() {
        let count = this.$count;
        if (this.lblNum && this.$textFormat && this.$isShow) {
            if (this.labelFunction != null) {
                this.lblNum.text = this._labelFunction(count);
            } else {
                this.lblNum.text = dataStructure.StringFormater.Format(this.$textFormat, { count });
            }

        }
    }

    private $onTouchedBtnMinus() {
        this.$count-= this.$addNum;
        this.$count = Math.max(this.$minCount, this.$count);
        this.$update();
    }

    private $onTouchedBtnPlus() {
        if (this.$count >= this.$maxCount) return;
        this.$count+= this.$addNum;
        this.$update();
    }

    private $onTouchedBtnSub100() {
        this.$count -= 100;
        this.$count = Math.max(this.$minCount, this.$count);
        this.$update();
    }

    private $onTouchedBtnAdd100() {
        if (this.$count >= this.$maxCount) return;
        this.$count += 100;
        this.$count = Math.min(this.$maxCount, this.$count);
        this.$update();
    }

    private $changeHandler(evt: eui.UIEvent): void {
        this.$count = Math.max(this.$minCount, Math.min(Math.round(evt.target.value), this.$maxCount));
        this.$updateText();
        this.updateButtonState();
        this.numHSlider.value = this.$count;
        let event = new egret.Event(NumSelectorSlider.CHANGE);
        // fromDrag=true：滑块拖动结束触发（liveDragging=false，松手时才派发）
        event.data = { count: this.$count, fromDrag: true }
        this.dispatchEvent(event);
    }

    private $onTouchedBtnmax(evt: eui.UIEvent): void {
        if (this.$count >= this.$maxCount) {
            if(this.$textMaxNotice){
                MessageBox(this.$textMaxNotice);
            }
            return;
        }
        this.$count = this.$maxCount;
        this.$update();
    }
}
