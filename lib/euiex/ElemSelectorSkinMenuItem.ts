

export class ElemSelectorSkinMenuItem extends eui.ItemRenderer {
    public _isEuiex = true;
    imgIcon: eui.Image;
    labelDisplay: eui.Label;
    // grpArrow: eui.Group;
    imgUp: eui.Image;
    imgDown: eui.Image;

    public constructor() {
        super();
        this.skinName = "resource/eui_skins/ElemSelectorSkin_MenuItem.exml";
    }

    protected onSkinLoadCompleted() {
        super.onSkinLoadCompleted();
        // this.grpArrow.visible = false;
    }

    protected dataChanged() {
        if (!this.data) return;
        let data = {}
        this.labelDisplay.text = '';
        this.imgIcon.source = '';
    }
}
