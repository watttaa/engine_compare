import { SendEvent, GlobalEventSource } from "GlobalEvent";
import { uiPath } from "GlobalValue";

import { ComponentEx } from "./ComponentEx";

export enum SXProgressStyle {
    NORMAL = 0,  // 未转
    FLY_UP = 1,  // 飞升
}

export interface PetPageShengxingProgressBar {

    state: "";
    line0: eui.Component;
    line1: eui.Component;
    line2: eui.Component;
    line3: eui.Component;
    node0: eui.Component;
    node1: eui.Component;
    node2: eui.Component;
    node3: eui.Component;
    node4: eui.Component;
    lineRed0:eui.Component;
}

export class PetPageShengxingProgressBar extends ComponentEx {
    public _isEuiex = true;
    private $max: number;
    private $cur: number;
    private $pid: number|string;
    private $style: SXProgressStyle;
    private $isPlaying: boolean;
    public static readonly CHANGE_PROTETY = "CHANGE_PROTETY";
    public static readonly CHANGE_STATUS = "CHANGE_STATUS";
    private antTab: { [key: string]: PetPageShengxingProgressNode }
    public constructor() {
        super();
        // if (!this.skinName) {
        //     this.skinName = uiPath("PetPageShengxing_Progress_Bar.exml");
            this.$max = 5;
        // }
        this.antTab = {};

    }

    // public onSkinLoadCompleted(): void {
    //     super.onSkinLoadCompleted();
    // }
    
    public $onRemoveFromStage(): void {
        if (this.antTab) {
            for (let key in this.antTab) {
                let node = this[key] as eui.Group;
                if (node) {
                    node.removeChildren();
                }
            }
            this.antTab = {};
        }
        super.$onRemoveFromStage();
    }

    @SafeCallFunction()
    public setData(pid: number|string, cur: number, max: number = 5, style?: SXProgressStyle, is_fabao = false): void {
        let max_changed = this.$max != max;
        this.$max = max;
        this.$style = style;
        if (cur == max) {
            this.$isPlaying = false;
        }
        if (pid !== this.$pid || max_changed || this.$cur > cur) {
            this.currentState = this.$style === SXProgressStyle.FLY_UP && !is_fabao ? "red_2" : ("_" + max)
            this.validateNow();
            this.$cur = cur;
            this.$pid = pid;
            //this.$max = max;
            for (let idx = 0; idx <= this.max; idx++) {
                this.showSingNode(idx + SXProgressStyle.NORMAL, true);
            }
            this.$isPlaying = false;
            preload_utils_calldelay.callDelayFrames(() => {
                this.dispatchEvent(new egret.Event(PetPageShengxingProgressBar.CHANGE_STATUS));
            }, this, 3)
        } else if (this.$cur < cur) {
            this.$cur = cur;
            this.$pid = pid;
            this.playCurLightNode(this.$cur - 1, () => {
                this.validateNow();
                this.showSingNode(cur);
            });
        }
        this.lineRed0.currentState = this.$style === SXProgressStyle.FLY_UP && max == cur ?'nor':'lock' 
        this.dispatchEvent(new egret.Event(PetPageShengxingProgressBar.CHANGE_PROTETY));
    }

    public showAllNode(): void {
        for (let idx = 0; idx <= this.max; idx++) {
            this.showSingNode(idx);
        }
    }

    public isPlaying(): boolean {
        return this.$isPlaying;
    }

    public showSingNode(idx: number, isRest?: boolean): void {
        let key = "node" + idx 
        let node = this[key] as eui.Group;
        let cur = this.$cur;
        let line = this["line" + idx] as eui.Component;
        let imgThumb = line && line["imgThumb"] as eui.Image;
        let state: NodeStatus = NodeStatus.None;
        imgThumb && (imgThumb.alpha = 0);
        if (idx < cur - 1) {
            imgThumb && (imgThumb.alpha = 1);
        }
        if (idx === cur) {
            state = NodeStatus.canLight;
        } else if (idx < cur) {
            state = NodeStatus.light;
        } else {
            state = NodeStatus.Lock;
        }
        if (!node) {
            return;
        }
        if (!isRest) {
            if (this.antTab[key] && this.antTab[key].nodeStatu == NodeStatus.canLightToLight && this.antTab[key].isPlaying()) return;
        }

     
        if (!this.antTab[key] || this.antTab[key].nodeStatu != state || this.antTab[key].style != this.$style ) {
            node.removeChildren();
            this.antTab[key] = new PetPageShengxingProgressNode(state, idx, this, this.$style);
            node.addChild(this.antTab[key]);
        }
        this.antTab[key].play();
    }

    public get max(): number {
        return this.$max;
    }


    public playCurLightNode(start: number, callBack?: Function): void {
        this.setIsPlaying(true);
        let key = "node" + start
        let node = this[key]
        let state = NodeStatus.canLightToLight;
        let line = this["line" + (start - 1)] as eui.Component;
        if (!node) {
            callBack && callBack();
            this.setIsPlaying(false);
            return
        }
        if (this.antTab[key] && this.antTab[key].nodeStatu == NodeStatus.canLightToLight && this.antTab[key].isPlaying()) return;
        if (!this.antTab[key] || this.antTab[key].nodeStatu != state || this.antTab[key].style != this.$style) {
            node.removeChildren();
            this.antTab[key] = new PetPageShengxingProgressNode(state, start, this, this.$style);
            node.addChild(this.antTab[key]);
        }
        let line_in = line && line["in"] as egret.tween.TweenGroup;
        this.lineRed0.currentState = this.$style === SXProgressStyle.FLY_UP && start == 0 ?'nor':'lock' 

        if (line_in && this.$style ===  SXProgressStyle.NORMAL) {
            line_in.play(0);
            line_in.once(egret.Event.COMPLETE, () => {
                this.antTab[key].play(0, () => {
                    callBack && callBack();
                    this.setIsPlaying(false);
                })
            }, this)
        } else {
            this.antTab[key].play(0, () => {
                callBack && callBack();
                this.setIsPlaying(false);
            });
        }

    }

    public setIsPlaying(val: boolean): void {
        if (this.$cur != this.max) return;
        this.$isPlaying = val;
        this.dispatchEvent(new egret.Event(PetPageShengxingProgressBar.CHANGE_PROTETY));
    }
}



const enum NodeStatus {
    None = 0,
    /**待激活 */
    canLight = 1,
    /*激活 */
    light = 2,
    /*不可激活 */
    Lock = 3,

    canLightToLight = 4
}

class PetPageShengxingProgressNode extends ComponentEx {
    in: egret.tween.TweenGroup;
    Stop: egret.tween.TweenGroup;
    public nodeStatu: NodeStatus
    public style: SXProgressStyle
    public idx: number;
    public touchRect: eui.Rect;
    public pro: PetPageShengxingProgressBar
    constructor(type: NodeStatus, idx: number, pro: PetPageShengxingProgressBar, style:SXProgressStyle ) {

        super();
        this.style = style;
        let stypeStr: "" | "Flyup" = this.style == SXProgressStyle.NORMAL ? "" : "Flyup"
        if (type != NodeStatus.None) {
            this.skinName = uiPath(`PetPageShengxing_Progress_${stypeStr}Node${type}.exml`);

        } else {
            Logger.error("NodeStatus.None???????");
        }
        this.idx = idx;
        this.nodeStatu = type;
        this.pro = pro;

    }

    public onSkinLoadCompleted(): void {
        super.onSkinLoadCompleted();
        this.touchRect.top = this.touchRect.bottom = this.touchRect.left = this.touchRect.right = 0;
        this.touchRect.addEventListener(egret.TouchEvent.TOUCH_TAP, this.onTouchTap, this)
    }

    $onRemoveFromStage(): void {
        this.in && this.in.stop()
        this.Stop && this.Stop.stop()
        super.$onRemoveFromStage();
    }

    @SafeCallFunction()
    public play(timer: number = 0, onceCallBack?: Function): void {
        if (this.in) {
            this.in.play(timer);
            this.in.once(egret.Event.COMPLETE, () => {
                onceCallBack && onceCallBack();
                this.pro.showSingNode(this.idx);
            }, this);
        } else {
            onceCallBack && onceCallBack();
        }

    }

    @SafeCallFunction()
    public stop(): void {
        this.in.stop()
        this.Stop.play(0)
    }

    private onTouchTap(evt: egret.TouchEvent): void {
        SendEvent(GlobalEventSource.TOUCH_PRO_INDEX, this.idx);
        evt.stopPropagation();
    }

    public isPlaying(): boolean {
        return this.in && this.in.isPlaying;
    }
}


