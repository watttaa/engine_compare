import { HelpTextCNet } from "net/HelpTextCNet";

export class HelpBtn extends eui.Button {
    public _isEuiex = true;
    public textId: number = 0;

    public constructor() {
        super();
    }

    protected childrenCreated(): void {
        super.childrenCreated();
        this.addEventListener(egret.TouchEvent.TOUCH_TAP, this.onTouch, this);
    }

    private onTouch(): void {
        if (this.textId) {
            HelpTextCNet.C_GET_HELP_TEXT(this.textId);
        }
    }
}