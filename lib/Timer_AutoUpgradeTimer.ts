import { GlobalValue } from "GlobalValueDefine";

export class AutoUpgradeTimer extends FixedTimer {

    private $base: BaseWidgetBase | eui.Component;
    private $protMark: string; //协议校对字段
    private $c2sFunc: Function; //发送升级协议
    private $onFunc: Function; //开启自动升级调用
    private $offFunc: Function; //关闭时调用
    private $isAuto: boolean = false;

    public constructor(base: BaseWidgetBase | eui.Component, c2sFunc: Function, onFunc?: Function, offFunc?: Function, protMark: any = "", delay: number = GlobalValue.AutoTime) {
        super(delay, 0);
        this.$base = base;
        this.$protMark = String(protMark);
        this.$c2sFunc = c2sFunc;
        this.$onFunc = onFunc;
        this.$offFunc = offFunc;
        this.addEventListener(egret.TimerEvent.TIMER, this.onAutoUp, this);
    }

    public onTouchAutoBtn() {
        this.setAuto(!this.$isAuto);
    }

    public close() {
        this.setAuto(false);
        this.reset();
        //this.$offFunc && this.$offFunc.apply(this.$base);
    }

    private onAutoUp() {
        this.$base && this.$c2sFunc && this.$c2sFunc.apply(this.$base);
    }

    private onFail(evt: ProtEvent) {
        let mark = "";
        if (evt.data[0])
            mark = String(evt.data[0]["type"]);
        if (this.$protMark === "" || this.$protMark === mark)
            this.setAuto(false);
    }

    public stopAutoUp() {
        this.setAuto(false);
    }

    private setAuto(b: boolean) {
        this.$isAuto = b;
        if (b) {
            this.start();
            this.$onFunc && this.$base && this.$onFunc.apply(this.$base);
            this.onAutoUp(); //立即执行一次
            // ProtDispatcher.getInstance().addProtListener_(GlobalValue.AutoFailProtNumber, this.onFail, this);
        }
        else {
            this.reset();
            this.$offFunc && this.$base && this.$offFunc.apply(this.$base);
            // ProtDispatcher.getInstance().removeProtListener_(GlobalValue.AutoFailProtNumber, this.onFail, this);
        }
    }
}
