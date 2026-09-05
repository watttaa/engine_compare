import { SpecialTextColor } from "TextColorUtils";

export class PBarSkillCmp extends eui.ProgressBar {
    public _isEuiex = true;
    ////////////////////////(皮肤定义)
    // thumb:eui.Image;
    // labelDisplay:eui.Label;
    light: eui.Image;
    imgFull: eui.Image;

    protected updateSkinDisplayList(): void {
        super.updateSkinDisplayList();

        if (this.value >= this.maximum) {
            this.imgFull && (this.imgFull.visible = true);
            this.light && (this.light.visible = false);
            // 特殊颜色 淡黄色
            this.labelDisplay && (this.labelDisplay.textColor = SpecialTextColor.LowYellow);
        }
        else {
            this.imgFull && (this.imgFull.visible = false);
            if (this.light && this.thumb) {
                this.light.visible = true;
                var rect = this.thumb.$scrollRect;
                this.light.x = rect.width;
            }
            // 特殊颜色 灰白色
            // this.labelDisplay && (this.labelDisplay.textColor = 0xe5ebef);
            this.labelDisplay && (this.labelDisplay.textColor = SpecialTextColor.GrayWhite);
        }
    }

}
