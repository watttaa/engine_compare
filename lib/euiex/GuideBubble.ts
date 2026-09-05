import { HeroMainModel } from "heroMain/HeroMainModel";
import { safeCallComFunc } from "utils/UIUtils_safecall";
import { ComponentEx } from "./ComponentEx";
import { uiPath2 } from "GlobalValue";


export enum GUIDE_BUBBLE_STATE {
    TOP = "top",
    BOTTOM = "bottom",
    LEFT = "left",
    RIGHTT = "right"
}

export interface GuideBubbleCustomData {
    /**显示箭头 */
    showArrow?: boolean,
    /**气泡框宽度 */
    bubbleWidth?: number;
}

/**
* @des 指引气泡框
* @author HeYiXiang
* @since 2023/02/15
*/
export interface GuideBubble {
    grpBlack: eui.Group;
    rctLeft: eui.Rect;
    rctTop: eui.Rect;
    rctDown: eui.Rect;
    rctRight: eui.Rect;
    grpTouchLight: eui.Group;
    compBubble: eui.Button;
    imgArrow: eui.Image;

}

export class GuideBubble extends ComponentEx {
    private readonly BUBBLE_PADDING = 10;  //气泡框与屏幕边缘的边距
    private readonly ARROW_PADDING = 10;  //箭头与屏幕边缘的边距
    private readonly ARROW_GAP = 10;  //箭头与指引目标的距离
    private readonly TOUCH_LIGHT_PADDING = 4; //指引高亮区域与屏幕边缘的边距

    private $data: Object;

    public constructor() {
        super();

        if (!this.skinName) {
            this.skinName = this.getBubbleSkinName();
        }
    }

    protected onSkinLoadCompleted(): void {
        super.onSkinLoadCompleted();

        if (this.$data) {
            this.updatePos(this.$data["x"], this.$data["y"], this.$data["w"], this.$data["h"]);
        }

        if(preload_utils_platform.isMiniGame()){
            //小游戏环境下不知为啥精度不够，先特殊处理
            this.rctLeft.bAdModeEnable = false;
            this.rctTop.bAdModeEnable = false;
            this.rctDown.bAdModeEnable = false;
            this.rctRight.bAdModeEnable = false;
        }
    }

    $onRemoveFromStage(): void {
        super.$onRemoveFromStage();

        this.$data = undefined;
    }

    /**
     * 更新描述
     * @param desc 
     */
    @SafeCallFunction()
    public updateDesc(desc: string, richlabel = 0, width = 0, height = 0) {
        this.compBubble.label = richlabel === 1 || richlabel === 2 ? "" : desc;
        safeCallComFunc(this, this.compBubble, (btn: { rlblText: RichLabel }) => {
            if (richlabel === 1) {
                btn.rlblText.text = "#b" + desc; // compBubble的文本是粗体，这也就通过#b实现
            }
            else if (richlabel === 2) {
                btn.rlblText.text = desc;
            }
            else {
                btn.rlblText.text = "";
            }
        }, [this.compBubble]);
        this.width = width || 466;
        this.height = height || 240;
    }

    /**
     * 根据包围盒更新位置
     * @param objBound 目标包围盒，包围盒应该跟气泡框同一层级
     * @param boundParent 目标包围盒父节点
     * @param touchLight 是否高亮显示引导区域，默认显示
     */
    @SafeCallFunction()
    public updatePosByBound(objBound: egret.Rectangle, boundParent: egret.DisplayObjectContainer, touchLight: boolean = true) {
        if(boundParent){
            let globalPoint = boundParent.localToGlobal(objBound.x, objBound.y)
            this.updatePos(globalPoint.x, globalPoint.y, objBound.width, objBound.height, touchLight);
        }else{
            Logger.log(`The boundParent is null`);
        }
    }

    /**
     * 更新位置
     * @param objX 目标左上角x（全局）
     * @param objY 目标左上角y（全局）
     * @param objWidth 目标宽度
     * @param objHeight 目标高度
     * @param touchLight 是否高亮显示引导区域，默认显示
     */
    @SafeCallFunction()
    public updatePos(objX: number, objY: number, objWidth: number, objHeight: number, touchLight: boolean = true) {
        this.$data = { "x": objX, "y": objY, "w": objWidth, "h": objHeight }
        let bubbleHalfW = this.width >> 1;
        let objHalfW = objWidth >> 1;
        
        if(!this.parent){
            return;
        }
        let objLocalPoint = this.parent.globalToLocal(objX, objY);
        let localX = objLocalPoint.x;
        let localY = objLocalPoint.y;
        let stageW = UIManager.stageW;
        let stageH = UIManager.stageH;
        let left = localX + objHalfW - bubbleHalfW - this.BUBBLE_PADDING;
        let right = stageW - (localX + objHalfW + bubbleHalfW + this.BUBBLE_PADDING);
        let top = localY - (this.height + this.ARROW_GAP + this.BUBBLE_PADDING);
        // 位置
        this.x = localX + objHalfW - bubbleHalfW;
        this.y = top < 0 ? localY + objHeight + this.ARROW_GAP : localY - this.height - this.ARROW_GAP;
        this.currentState = top < 0 ? GUIDE_BUBBLE_STATE.BOTTOM : GUIDE_BUBBLE_STATE.TOP;
        // 左右状态
        if (left < 0) {
            this.compBubble.left = -left;
            this.compBubble.right = left;
            this.compBubble.currentState = top < 0 ? GUIDE_BUBBLE_STATE.RIGHTT : GUIDE_BUBBLE_STATE.LEFT;
        } else if (right < 0) {
            this.compBubble.left = right;
            this.compBubble.right = -right;
            this.compBubble.currentState = GUIDE_BUBBLE_STATE.LEFT;
        } else {
            this.compBubble.left = 0;
            this.compBubble.right = 0;
            this.compBubble.currentState = GUIDE_BUBBLE_STATE.LEFT;
        }

        // 箭头位置
        let arrowHalfW = this.imgArrow.width >> 1;
        let arrowLeft = localX + objHalfW - arrowHalfW - this.ARROW_PADDING;
        let arrowRight = stageW - localX - objHalfW - arrowHalfW - this.ARROW_PADDING;
        if (arrowLeft < 0) {
            this.imgArrow.horizontalCenter = -arrowLeft;
        } else if (arrowRight < 0) {
            this.imgArrow.horizontalCenter = arrowRight;
        } else {
            this.imgArrow.horizontalCenter = 0;
        }

        // 高亮显示引导区域
        if (touchLight) {
            this.grpBlack.visible = true;
            this.grpBlack.width = stageW;
            this.grpBlack.height = stageH;

            let localOrigin = this.globalToLocal(0, 0);
            this.grpBlack.x = localOrigin.x;
            this.grpBlack.y = localOrigin.y;

            // 指引高亮区域
            // let globalPoint = this.parent.localToGlobal(localX, localY);
            let localPoint = this.grpBlack.globalToLocal(objX, objY);
            let touchLightLeft = Math.floor(Math.max(localPoint.x, this.TOUCH_LIGHT_PADDING)) ;
            let touchLightRight = Math.floor(Math.max(stageW - localPoint.x - objWidth, this.TOUCH_LIGHT_PADDING));
            let touchLightTop = Math.floor(Math.max(localPoint.y, this.TOUCH_LIGHT_PADDING));
            let touchLightBottom = Math.floor(Math.max(stageH - localPoint.y - objHeight, this.TOUCH_LIGHT_PADDING));
            this.grpTouchLight.x = touchLightLeft;
            this.grpTouchLight.y = touchLightTop;
            this.grpTouchLight.width = stageW - touchLightLeft - touchLightRight;
            this.grpTouchLight.height = stageH - touchLightTop - touchLightBottom;

            // 黑底位置宽高
            this.rctLeft.width = touchLightLeft;
            this.rctRight.width = stageW - touchLightLeft - this.grpTouchLight.width;
            this.rctTop.x = touchLightLeft;
            this.rctTop.width = this.grpTouchLight.width;
            this.rctTop.height = touchLightTop;
            this.rctDown.x = touchLightLeft;
            this.rctDown.width = this.grpTouchLight.width;
            this.rctDown.height = stageH - touchLightTop - this.grpTouchLight.height;
        } else {
            this.grpBlack.visible = false;
        }

        this.validateNow();
    }

    protected getBubbleSkinName(): string{
        return uiPath2("guide/GuideBubble.exml");
        // return HeroMainModel.getInstance().isFeisheng ? 'resource/eui/flyup/GuideBubble.exml' : "resource/eui/GuideBubble.exml"
    }

    /**更新皮肤名 */
    public updateSkinName() {
        this.skinName = this.getBubbleSkinName();    //飞升皮肤 "resource/eui/flyup/GuideBubble.exml"
        this.validateNow();
    }

    /**定制 */
    public setCustom(data: GuideBubbleCustomData) {
        if (data.showArrow != undefined) {
            this.imgArrow.visible = data.showArrow;
        }
        if (data.bubbleWidth) {
            this.width = data.bubbleWidth;
        }
    }
}