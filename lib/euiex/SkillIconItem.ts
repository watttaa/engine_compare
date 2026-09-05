import { uiSkinPath } from "GlobalValue";
import { safeCallComFunc } from "utils/UIUtils_safecall";
import { SkillRoleGrid } from "lib/euiex/SkillRoleGrid";

export class SkillIconItem extends eui.ItemRenderer {
    public _isEuiex = true;
    public bLblIndex: eui.BitmapLabel;
    public imgFrameF: eui.Image;
    public skillGrid: SkillRoleGrid;
    public grpSelected: eui.Group;
    public grpName: eui.Group;
    public lblName: eui.Label;


    public constructor() {
        super();
        this.skinName = uiSkinPath("SkillLineupGrid.exml");
    }

    protected onSkinLoadCompleted() {
        super.onSkinLoadCompleted();
        this.grpSelected.visible = false;
        this.updateCustomData();
    }

    protected dataChanged() {
        super.dataChanged();
        this.updateCustomData();
    }

    protected updateCustomData() {
        if (!this.completed) return;
        if (!this.data) return;
        this.bLblIndex.visible = false;
        safeCallComFunc(this, this.skillGrid, () => {
            this.skillGrid.setShowData(this.data);
        })
        //列表上下翻转的时候子项也翻转一下才能保证显示正常
        let flagY = this.parent.scaleY / Math.abs(this.parent.scaleY);
        this.scaleY = flagY * Math.abs(this.scaleY);
    }
}
