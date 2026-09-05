import { s2_guide_cfg } from "auto/guide";
import { uiAnimationPath } from "GlobalValue";
import { GuideBubble } from "./euiex/GuideBubble";
import { GuideModel } from "./GuideModel";

/**
 * 手指动效，如果有多个动效，需要基类
 */
export class GuideFinger {

    private static $mcData: MCData;
    private static $texture: egret.Texture;
    private static $loadPromise: Promise<void> | null = null;
    private static bubbleTip: GuideBubble;
    private static ZIndex = 15;
    private static BorderOffset = 15;

    /**
     * 预加载资源，可重复调用，内部处理重入
     */
    public static getMcData(): void {
        // 已经加载完成，直接返回
        if (this.$mcData) {
            return;
        }
        
        // 已经在加载中，直接返回（等待中的调用方会继续等待）
        if (this.$loadPromise) {
            return;
        }

        // 开始加载
        this.$loadPromise = new Promise((resolve) => {
            getMCData(login_res_utils.getUIAnimationPath("HandClickS1.json"), (mcdata: MCData) => {
                if (mcdata) {
                    let texture = new egret.Texture();
                    texture._setBitmapData(mcdata.mcTexture.bitmapData);
                    this.$texture = texture;
                    this.$mcData = mcdata;
                } else {
                    Logger.error("GuideFinger: Failed to load MC data");
                    // 加载失败，重置 promise 允许重试
                    this.$loadPromise = null;
                }
                resolve();
            }, this);
        });
    }

    /**
     * 检查是否加载完成，如果没有则等待加载完成后再执行回调
     */
    private static ensureLoaded(callback: () => void): void {
        // 已经加载完成
        if (this.$mcData) {
            callback();
            return;
        }

        // 未开始加载，先触发加载
        if (!this.$loadPromise) {
            this.getMcData();
        }

        // 等待加载完成
        this.$loadPromise!.then(() => {
            if (this.$mcData) {
                callback();
            }
        });
    }

    public static checkMcData() {
        return this.$mcData ? true : false;
    }

    public static getFingerObj(): egret.MovieClip {
        if (this.$mcData) {
            let mc = new egret.MovieClip();
            mc.movieClipData = egret.MovieClipDataFactory.getInstance().generateMovieClipData(this.$mcData.mcData, this.$texture);
            mc.gotoAndPlay(mc.movieClipData.labels[0].name, -1);
            mc.name = "GuideFinger";
            return mc;
        }
        return null;
    }

    public static showFingerMc(fingerMc: egret.MovieClip, parent: egret.DisplayObjectContainer) {
        // 防御 parent 为 null
        if (!parent) {
            Logger.warn("GuideFinger.showFingerMc: parent is null");
            return null;
        }

        // 已经加载完成，直接执行
        if (this.$mcData) {
            return this.doShowFingerMc(fingerMc, parent);
        }

        // 未加载完成，等待加载后再执行
        this.ensureLoaded(() => {
            this.doShowFingerMc(fingerMc, parent);
        });
        
        return null;
    }

    private static doShowFingerMc(fingerMc: egret.MovieClip, parent: egret.DisplayObjectContainer): egret.MovieClip {
        if (fingerMc && fingerMc.parent == parent) return fingerMc;

        this.clearFingerMc(fingerMc);
        fingerMc = GuideFinger.getFingerObj();
        
        if (!fingerMc) {
            Logger.warn("GuideFinger.showFingerMc: getFingerObj returned null");
            return null;
        }
        
        fingerMc.x = (parent.width >> 1);
        fingerMc.y = (parent.height >> 1);
        parent.addChild(fingerMc);
        fingerMc.play(-1);
        return fingerMc;
    }

    public static clearFingerMc(fingerMc: egret.MovieClip) {
        if (fingerMc) {
            fingerMc.stop();
            fingerMc.parent && fingerMc.parent.removeChild(fingerMc);
        }
    }

    /**
     * 重置状态，用于断线重连等场景
     */
    public static reset(): void {
        this.$mcData = null;
        this.$texture = null;
        this.$loadPromise = null;
    }

    /**
     * 简易文本提示
     * @param parent 设置文本组件的父级 
     * @param x 设置文本组件的偏移量
     */
    public static setBubbleTip(parent: egret.DisplayObjectContainer, x: number, baseWidget: BaseWidget) {
        if (!parent){
            Logger.log(`setBubbleTip parent: ${parent}`);
            return ;
        }
        if (!this.bubbleTip) {
            this.bubbleTip = new GuideBubble();
            // this.bubbleTip.skinName = 'resource/eui/GuideFingerBubbleUI.exml';
        }
        let baseWidgetInst = baseWidget.baseInst;

        if (UIManager.getTag(baseWidget.clazz) == "MainCityUI") {// 特判一下
            baseWidgetInst = baseWidgetInst.parent as eui.Component;
        }
        if (baseWidgetInst) {
            baseWidgetInst.addChild(this.bubbleTip)
        } else {
            Logger.log(`baseWidgetInst error baseWidget:${baseWidget} clazz : ${baseWidget.clazz}`);
        }
        this.bubbleTip.z = GuideFinger.ZIndex;
        // let parentPos = parent.localToGlobal(x, 0)
        // let baseWidgetPos = baseWidgetInst.localToGlobal();
        // this.bubbleTip.x = parentPos.x - baseWidgetPos.x;
        // this.bubbleTip.y = parentPos.y - baseWidgetPos.y;
        let guideCfg = GuideModel.getInst().getCfg();
        let tipStr = guideCfg[s2_guide_cfg.cDesc];
        this.bubbleTip.updateDesc(tipStr, guideCfg[s2_guide_cfg.iRichLabel], guideCfg[s2_guide_cfg.iWidth], guideCfg[s2_guide_cfg.iHeight]);
        // this.bubbleTip.updatePosByBound(parent.getBounds());
        let scaleX = parent.scaleX;
        let scaleY = parent.scaleY;
        let cur = parent;
        while (cur.parent) {
            scaleX *= cur.parent.scaleX;
            scaleY *= cur.parent.scaleY;
            cur = cur.parent
        }
        // let objX = parentPos.x - baseWidgetPos.x - (parent.width >> 1) * scaleX;
        // let objY = parentPos.y - baseWidgetPos.y;
        // let objTargetBound = new egret.Rectangle();
        // let refObj : egret.DisplayObject = parent;
        // let touchAreaRect : eui.Rect = parent["touchArea"];
        // if(touchAreaRect){
        //     if(touchAreaRect.width && touchAreaRect.height){
        //         refObj = touchAreaRect;
        //     }
        // }
        // objTargetBound = refObj.getTransformedBounds(baseWidgetInst, objTargetBound, true);
        // this.bubbleTip.updatePosByBound(objTargetBound, false);
        //延迟一帧处理，有可能parent还没有布局完成
        preload_utils_calldelay.callDelayFrames(()=>{
            if(parent && this.bubbleTip){
                let globalPoint = parent.localToGlobal();
                this.bubbleTip.updatePos(globalPoint.x, globalPoint.y, parent.width * scaleX, parent.height * scaleY, false);
                this.bubbleTip.validateNow();
            }
        },this,1);
    }


    public static removeBubble() {
        if (this.bubbleTip && this.bubbleTip.parent) {

            this.bubbleTip.parent.removeChild(this.bubbleTip);
            // UIManager.UIPanel.removeChild(this.bubbleTip)
        }
    }
}

export class GuideStartFinger {

    private static $mcData: MCData;
    private static $texture: egret.Texture;
    private static $loadPromise: Promise<void> | null = null;

    /**
     * 预加载资源，可重复调用，内部处理重入
     */
    public static getMcData(): void {
        // 已经加载完成，直接返回
        if (this.$mcData) {
            return;
        }
        
        // 已经在加载中，直接返回（等待中的调用方会继续等待）
        if (this.$loadPromise) {
            return;
        }

        // 开始加载
        this.$loadPromise = new Promise((resolve) => {
            getMCData(login_res_utils.getUIAnimationPath("HandSingleClickS1.json"), (mcdata: MCData) => {
                if (mcdata) {
                    let texture = new egret.Texture();
                    texture._setBitmapData(mcdata.mcTexture.bitmapData);
                    this.$texture = texture;
                    this.$mcData = mcdata;
                } else {
                    Logger.error("GuideStartFinger: Failed to load MC data");
                    // 加载失败，重置 promise 允许重试
                    this.$loadPromise = null;
                }
                resolve();
            }, this);
        });
    }

    /**
     * 检查是否加载完成，如果没有则等待加载完成后再执行回调
     */
    private static ensureLoaded(callback: () => void): void {
        // 已经加载完成
        if (this.$mcData) {
            callback();
            return;
        }

        // 未开始加载，先触发加载
        if (!this.$loadPromise) {
            this.getMcData();
        }

        // 等待加载完成
        this.$loadPromise!.then(() => {
            if (this.$mcData) {
                callback();
            }
        });
    }

    public static checkMcData() {
        return this.$mcData ? true : false;
    }

    public static getFingerObj(): egret.MovieClip {
        if (this.$mcData) {
            let mc = new egret.MovieClip();
            mc.movieClipData = egret.MovieClipDataFactory.getInstance().generateMovieClipData(this.$mcData.mcData, this.$texture);
            mc.gotoAndPlay(mc.movieClipData.labels[0].name, -1);
            mc.name = "GuideScaleFinger";
            return mc;
        }
        return null;
    }

    public static showFingerMc(fingerMc: egret.MovieClip, parent: egret.DisplayObjectContainer) {
        // 防御 parent 为 null
        if (!parent) {
            Logger.warn("GuideStartFinger.showFingerMc: parent is null");
            return null;
        }

        // 已经加载完成，直接执行
        if (this.$mcData) {
            return this.doShowFingerMc(fingerMc, parent);
        }

        // 未加载完成，等待加载后再执行
        this.ensureLoaded(() => {
            this.doShowFingerMc(fingerMc, parent);
        });
        
        return null;
    }

    private static doShowFingerMc(fingerMc: egret.MovieClip, parent: egret.DisplayObjectContainer): egret.MovieClip {
        if (fingerMc && fingerMc.parent == parent) return fingerMc;

        this.clearFingerMc(fingerMc);
        fingerMc = GuideStartFinger.getFingerObj();
        
        if (!fingerMc) {
            Logger.warn("GuideStartFinger.showFingerMc: getFingerObj returned null");
            return null;
        }
        
        fingerMc.x = (parent.width >> 1);
        fingerMc.y = (parent.height >> 1);
        parent.addChild(fingerMc);
        fingerMc.play(-1);
        return fingerMc;
    }

    public static clearFingerMc(fingerMc: egret.MovieClip) {
        if (fingerMc) {
            fingerMc.stop();
            fingerMc.parent && fingerMc.parent.removeChild(fingerMc);
        }
    }

    /**
     * 重置状态，用于断线重连等场景
     */
    public static reset(): void {
        this.$mcData = null;
        this.$texture = null;
        this.$loadPromise = null;
    }
}
