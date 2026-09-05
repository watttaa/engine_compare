import { SoundUIType } from "base/Enum";
import { GlobalEventSource, ListenEvent, UnListenEvent } from "GlobalEvent";
import { uiPath2 } from "GlobalValue";
import { BaseAutoCloseWidget } from "lib/BaseAutoCloseWidget";
import { ComponentEx } from "lib/euiex/ComponentEx";

/**自动关闭的BaseWidget */
export abstract class ResultBaseUIWidgetEx extends BaseAutoCloseWidget {

    protected anim_top: ResultBaseComponent
    protected anim_bottom: ResultBaseComponent
    protected grpBottom: eui.Group;
    protected grpTop: eui.Group;
    private $anim_in: ResultBaseEffCtrl;
    private $anim_loop: ResultBaseEffCtrl;
    private $anim_stop: ResultBaseEffCtrl;
    private $anim_failure: ResultBaseEffCtrl;
    public grpInfo: eui.Group;
    public cpnDataReview: eui.Component
    protected abstract get anim_topSkin(): string;
    protected abstract get anim_bottomSkin(): string;
    protected openSound: SoundUIType;


    public setAnimComponet(status: "nor" | "big" | "middle" | "platinum" | "middle2" | "long" = "nor"): void {
        if (this.anim_top) {
            this.anim_top.currentState = status;
        }
        if (this.anim_bottom) {
            this.anim_bottom.currentState = status;
        }
    }

    public set anim_in(val: ResultBaseEffCtrl) {
        this.$anim_in = val
    }

    public get anim_in(): ResultBaseEffCtrl {
        return this.$anim_in && this.$anim_in.ani_arr.length > 0 ? this.$anim_in : null;
    }

    public set anim_loop(val: ResultBaseEffCtrl) {
        this.$anim_loop = val
    }

    public get anim_loop(): ResultBaseEffCtrl {
        return this.$anim_stop && this.$anim_loop.ani_arr.length > 0 ? this.$anim_loop : null;
    }

    public set anim_stop(val: ResultBaseEffCtrl) {
        this.$anim_stop = val
    }

    public get anim_stop(): ResultBaseEffCtrl {
        return this.$anim_stop && this.$anim_stop.ani_arr.length > 0 ? this.$anim_stop : null;
    }

    public set anim_failure(val: ResultBaseEffCtrl) {
        this.$anim_failure = val
    }

    public get anim_failure(): ResultBaseEffCtrl {
        return this.$anim_failure && this.$anim_failure.ani_arr.length > 0 ? this.$anim_failure : null;
    }

    protected $loadSkinsTab: { [key: string]: boolean };

    protected setAnimStopNull(): void {
        this.anim_stop = null;
    }

    /**等待加载 baseInst anim_top 和anim_bottom*/
    protected onComplete(evt: egret.Event): void {
        if (evt && evt.target) {
            this.$loadSkinsTab[(this as any).UI_FILE] = true;
            this.baseInst.visible = false;
        }
        for (let key in this.$loadSkinsTab) {
            if (!this.$loadSkinsTab[key]) return;
        }
        this.baseInst.visible = true;
        super.onComplete();
    }

    public multipleSkinInit(): void {
        super.multipleSkinInit();
        let preLoadSkins: string[] = [];
        this.$loadSkinsTab = {};
        this.$loadSkinsTab[(this as any).UI_FILE] = false;
        if (this.anim_topSkin) {
            preLoadSkins.push(this.anim_topSkin);
            this.$loadSkinsTab[this.anim_topSkin] = false;
        }
        if (this.anim_bottomSkin) {
            preLoadSkins.push(this.anim_bottomSkin);
            this.$loadSkinsTab[this.anim_bottomSkin] = false;
        }
        EXML.$loadAll(preLoadSkins, (clazz: any[], urlArr: string[]) => {
            for (let url of urlArr) {
                this.$loadSkinsTab[url] = true;
            }
            this.onComplete(null);
        }, this)
    }

    public addCompleteEvent(): void {
        if (this.anim_topSkin) {
            this.anim_top = new ResultBaseComponent;
            this.anim_top.skinName = this.anim_topSkin;
        }
        if (this.anim_bottomSkin) {
            this.anim_bottom = new ResultBaseComponent;
            this.anim_bottom.skinName = this.anim_bottomSkin;
        }
        super.addCompleteEvent();
    }

    protected initVContent(): void {
        if (this.grpBottom) {
            if (this.anim_bottom) {
                this.grpBottom.addChild(this.anim_bottom);
            }
        }
        if (this.grpTop) {
            if (this.anim_top) {
                this.grpTop.addChild(this.anim_top);
            }
        }
        this.anim_in = new ResultBaseEffCtrl("in", this.anim_bottom, this.anim_top);
        this.anim_loop = new ResultBaseEffCtrl("loop", this.anim_bottom, this.anim_top);
        this.anim_stop = new ResultBaseEffCtrl("anim_stop", this.anim_bottom, this.anim_top);
        this.anim_failure = new ResultBaseEffCtrl("failure", this.anim_bottom, this.anim_top);
        this.setAnimComponet();
    }

    public get imgTitle0(): eui.Image {
        return this.anim_bottom && this.anim_bottom.imgTitle0;
    }

    public get image38(): eui.Image {
        return this.anim_bottom && this.anim_bottom.image38;
    }

    public get imgTitle(): eui.Image {
        return this.anim_bottom && this.anim_bottom.imgTitle;
    }

    public get $$id_image(): eui.Image { // 命名特殊些，避免与工程的id相同
        return this.anim_bottom && this.anim_bottom["id_image"];
    }

    public get $$imgWord(): eui.Image { // 命名特殊些，避免与工程的id相同
        return this.anim_bottom && this.anim_bottom["imgWord"];
    }

    public setTitleImg(val: string) {
        if (this.imgTitle0) {
            this.imgTitle0.source = val;
        }
        if (this.image38) {
            this.image38.source = val;
        }
        if (this.imgTitle) {
            this.imgTitle.source = val;
        }
        if (this.$$id_image) {
            this.$$id_image.source = val;
        }
        if (this.$$imgWord) {
            this.$$imgWord.source = val;
        }
    }


    public init() {
        super.init();
        this.setTitleImg("result_word_get_nor_png");//恭喜获得
        this.initVContent();
        this.cpnDataReview && this.cpnDataReview.addEventListener(egret.TouchEvent.TOUCH_TAP, this.onTouchTapcpnDataReview, this);

    }

    public onOpen(): void {
        super.onOpen();
        this.playIn();
        this.playLoop();
        ListenEvent(GlobalEventSource.STOP_AUTO_CLOSE, this.stopAutoClose, this);
    }

    private clearAnis() {
        this.anim_in && this.anim_in.clear();
        this.anim_loop && this.anim_loop.clear();
        this.anim_stop && this.anim_stop.clear();
        this.anim_failure && this.anim_failure.clear();
        this.anim_in = null;
        this.anim_loop = null;
        this.anim_stop = null;
        this.anim_failure = null;
        this.anim_bottom?.parent?.removeChild(this.anim_bottom);
        this.anim_top && this.anim_top.parent?.removeChild(this.anim_top);
        this.anim_bottom = null;
        this.anim_top = null;
    }

    public destroy(): void {
        this.cpnDataReview && this.cpnDataReview.removeEventListener(egret.TouchEvent.TOUCH_TAP, this.onTouchTapcpnDataReview, this);
        this.doRest();
        this.clearAnis();
        super.destroy();
    }

    protected playIn(): void {
        this.anim_in && this.anim_in.play();
    }

    protected playLoop(): void {
        this.anim_loop && this.anim_loop.play();
    }

    /**动画后 */
    public updataDelayAni(): void {
        this.grpInfo && (this.grpInfo.visible = true)
        super.updataDelayAni();
    }

    /**动画前 */
    public beforeDelayAni(): void {
        this.grpInfo && (this.grpInfo.visible = false)
        super.beforeDelayAni();
    }

    public onClose() {
        this.doRest();
        super.onClose();
    }

    protected doRest(): void {
        this.anim_in && this.anim_in.stop();
        this.anim_loop && this.anim_loop.stop();
        if (this.anim_stop) {
            this.anim_stop.stop();
        }
        UnListenEvent(GlobalEventSource.STOP_AUTO_CLOSE, this.stopAutoClose, this);
    }

    protected onTouchTapcpnDataReview(): void {
        // O3(preload_utils_reflect.getClassByNameSync("FightDataReviewUI"), (inst: FightDataReviewUI) => {
        //     inst.setData(this.stats, this.win);
        // }, null)
        // SendEvent(STOP_AUTO_CLOSE);
    }

    private stopAutoClose() {
        this.stopAutoCloseTimer();
    }

    //战报数据统计
    private stats: any
    private win: boolean;
    @SafeCallFunction()
    protected updataStats(data: any): void {
        safeInvokeFunc(this.cpnDataReview, () => {
            this.stats = data.stats;
            this.win = data.win;

            this.cpnDataReview.visible = !!data.stats;
            this.cpnDataReview.currentState = this.win ? WarDataReview_EntranceStateEnum.STATE_WIN : WarDataReview_EntranceStateEnum.STATE_LOSE;
            this.cpnDataReview["lblAward"].text = data.stats ? data.stats.tips : "";
            this.cpnDataReview["bubbleAward"].visible = Boolean(data.stats && data.stats.tips);
        });
    }
}


export enum WarDataReview_EntranceStateEnum {
    STATE_WIN = "win",
    STATE_LOSE = "lose",
}


class ResultBaseEffCtrl {
    private $ani_name: string;
    private $ani_arr: egret.tween.TweenGroup[];
    constructor(ani_name: string, ...ani: ResultBaseComponent[]) {
        this.$ani_name = ani_name;
        this.$ani_arr = [];
        for (let element of ani) {
            if (element && element[ani_name]) {
                this.$ani_arr.push(element[this.$ani_name]);
            }
        }
    }

    public play(time: number = 0): void {
        for (let element of this.$ani_arr) {
            element.play(time);
        }
    }

    public stop(): void {
        for (let element of this.$ani_arr) {
            element.stop();
        }
    }

    public get ani_arr(): egret.tween.TweenGroup[] {
        return this.$ani_arr || [];
    }

    public clear() {
        this.stop();
        this.$ani_arr = [];
    }

}

class ResultBaseComponent extends ComponentEx {
    in: egret.tween.TweenGroup;
    loop: egret.tween.TweenGroup;
    anim_stop: egret.tween.TweenGroup;

    // ResultUI_Base0_Back
    image4?: eui.Image
    image38?: eui.Image
    imgTitle?: eui.Image
    imgTitle0?: eui.Image

    $onRemoveFromStage(): void {
        this.destroy();
        super.$onRemoveFromStage();
    }

    destroy() {
        this.in && this.in.stop();
        this.loop && this.loop.stop();
        this.anim_stop && this.anim_stop.stop();
    }
}


/**#成功 */
export class ResultBaseUIWidgetType5Ex extends ResultBaseUIWidgetEx {

    protected initData(): void {
        super.initData();
        if (!this.lblTimeDown && this.anim_bottom["lblTimeDown"]) {
            this.lblTimeDown = this.anim_bottom["lblTimeDown"];
        }
        this.openSound = SoundUIType.VICTORY;
    }

    protected get anim_topSkin(): string {
        return ""
    }
    protected get anim_bottomSkin(): string {
        return uiPath2("result/Result_Bottom4.exml");
    }
}

/**通用胜利 有点不一样... */
export class ResultBaseUIWidgetType7Ex extends ResultBaseUIWidgetEx {

    protected initData(): void {
        super.initData();
        this.openSound = SoundUIType.VICTORY;
    }


    protected get anim_topSkin(): string {
        return ""
    }
    protected get anim_bottomSkin(): string {
        return "resource/eui/ResultUI_Base6_Back.exml";
    }
}



/**激活成功拓展... */
export class ResultBaseUIWidgetType8Ex extends ResultBaseUIWidgetEx {

    private $status;
    protected initData(): void {
        super.initData();
        this.openSound = SoundUIType.VICTORY;
    }

    protected anim_in_end: ResultBaseEffCtrl;//结束
    protected anim_new_record: ResultBaseEffCtrl;//新纪录
    public get grpName(): eui.Group {
        return this.anim_bottom["grpName"]
    }
    public get lblName(): eui.Label {
        return this.anim_bottom["lblName"]
    }

    protected get anim_topSkin(): string {
        return ""
    }
    protected get anim_bottomSkin(): string {
        return "resource/eui/ResultUI_Base9_Back.exml";
    }

    public setCurrentState(status: "win" | "lose" | "ad_win" | "ad_lose", includeBaseInst: boolean = true): void {
        this.$status = status;
        if (this.anim_top) {
            this.anim_top.currentState = status;
        }
        if (this.anim_bottom) {
            this.anim_bottom.currentState = status;
        }
        if (this.baseInst && includeBaseInst) {
            this.baseInst.currentState = status;
        }

    }

    protected playIn(): void {
        let isWin = this.$status == "win" || this.$status == "ad_win";
        if (!this.$status || isWin) {
            super.playIn();
        } else {
            this.anim_failure && this.anim_failure.play();
        }
    }


    protected setLblTimeDownLab(remainSecond: number): void {
        if (!remainSecond || remainSecond < 0) {
            remainSecond = 0;
        }
        let lblTimeDown = this.anim_bottom["lblTimeDown"]
        if (lblTimeDown) {
            lblTimeDown.text = lblTimeDown.originText.replace(/\d+/g, "" + remainSecond);
        }
        super.setLblTimeDownLab(remainSecond);
    }
}


/**#成功 */
export class ResultBaseUIWidgetTypeWin extends ResultBaseUIWidgetEx {

    protected initData(): void {
        super.initData();
        this.openSound = SoundUIType.VICTORY;
    }

    protected get anim_topSkin(): string {
        return ""
    }
    protected get anim_bottomSkin(): string {
        return uiPath2("result/Result_Bottom_FightWin.exml");
    }
}

/**#失败 */
export class ResultBaseUIWidgetTypeLose extends ResultBaseUIWidgetEx {

    public init(): void {
        super.init();
        this.setTitleImg("popup_lose_title_png");
    }

    protected get anim_topSkin(): string {
        return ""
    }
    protected get anim_bottomSkin(): string {
        return uiPath2("result/Result_Bottom_FightLose.exml");
    }
}

/**#平局 */
export class ResultBaseUIWidgetTypeTie extends ResultBaseUIWidgetEx {

    protected initData(): void {
        super.initData();
        this.setTitleImg("result_gangs_wordDrawn_img_png");
    }

    protected get anim_topSkin(): string {
        return ""
    }
    protected get anim_bottomSkin(): string {
        return uiPath2("result/Result_Bottom_FightWin.exml");
    }
}