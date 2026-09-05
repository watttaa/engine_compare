import { ComponentEx } from "./ComponentEx";

export class OptionBtn extends ComponentEx {
    public _isEuiex = true;
    ////////////////////////(皮肤定义)
    grpNor: eui.Group;
    grpRight: eui.Group;
    grpError: eui.Group;
    grpHint: eui.Group;
    labelDisplay: eui.Label;

    private m_objData: any;

    constructor() {
        super();
    }

    public setData(data: any) {
        this.m_objData = data;
        if (this.completed) {
            this.dataChanged();
        }
    }

    protected onSkinLoadCompleted() {
        super.onSkinLoadCompleted();
        if (this.m_objData) {
            this.dataChanged();
        }
    }

    protected dataChanged() {
        this.labelDisplay.text = this.m_objData.str;
        this.currentState = this.m_objData.state;
    }
}
