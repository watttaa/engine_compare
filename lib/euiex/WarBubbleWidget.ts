
// export type RoleHeadData = {
//     icon?: string;
//     frame?: string;
//     uid?: number;
//     name?: string;
//     isEmpty?: boolean;
// }


export interface WarBubbleWidget {
    grpBubble: eui.Group;
    grpBubbleContent: eui.Group;
    lblBubble: RichLabel;
    imgBubbleArrow: eui.Image;
}

export class WarBubbleWidget extends eui.Component {

    private text: string;

    public constructor() {
        super();
        this.skinName = 'resource/eui_skins/WarBubbleSkin.exml';
    }

    protected onSkinLoadCompleted() {
        super.onSkinLoadCompleted();
        this.updateData();
    }

    public setText(text: string) {
        this.text = text;
        this.updateData();
    }

    public updateData() {
        if (!this.completed || !this.text) {
            return;
        }
        this.lblBubble.text = this.text;

        let result = new egret.Point();
        this.localToGlobal(0, 0, result);

        let padding = 12; //屏幕边缘与气泡框的间距
        let bubbleHalfW = this.grpBubbleContent.width >> 1; //气泡框一半的宽度
        let exLeft = bubbleHalfW + padding - result.x; //气泡框距离屏幕左侧是否小于预设值
        let exRight = (result.x + bubbleHalfW + padding) - UIManager.stageW; //气泡框距离屏幕右侧是否小于预设值


        let bubbleHorizontalCenter = 0;
        if (exLeft > 0) {
            bubbleHorizontalCenter = exLeft;
        } else if (exRight > 0) {
            bubbleHorizontalCenter = -exRight;
        }
        this.grpBubbleContent.horizontalCenter = bubbleHorizontalCenter;

    }

    public destroy() {
        if (this.parent) {
            egret.Tween.removeTweens(this);
            this.visible = false;
            this.parent.removeChild(this);
        }
    }
}
