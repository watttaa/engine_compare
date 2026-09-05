export class PPIconBase extends eui.ItemRenderer {

    state: "";
    grpRoot: eui.Group;
    grpMain: eui.Group;
    grpFloor: eui.Group;
    imgFrame: eui.Image;
    imgIcon: eui.Image;
    grpReal: eui.Group;
    grpInfo: eui.Group;
    grpMask: eui.Group;
    imgFrameF: eui.Image;
    grpFrameInfo: eui.Group;
    grpMc: eui.Group;
    grpTopInfo: eui.Group;
    grpName: eui.Group;
    grpTop: eui.Group;
    labelNum: eui.Label;

    protected defaultInit() {
        /** 没用到的全部隐藏，渲染不然会造成渲染浪费*/
        if (this.grpFloor) this.grpFloor.visible = false;
        if (this.grpInfo) this.grpInfo.visible = true;
        if (this.grpReal) this.grpReal.visible = false;
        //if (this.grpSelected) this.grpSelected.visible = false;
        //if (this.grpReddot) this.grpReddot.visible = false;
        if (this.grpMc) this.grpMc.visible = false;
        if (this.labelNum) this.labelNum.visible = false;
        //if (this.grpLock) this.grpLock.visible = false;
        //if (this.grpEmpty) this.grpEmpty.visible = false;
    }
}