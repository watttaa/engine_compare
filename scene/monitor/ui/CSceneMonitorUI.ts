import { uiPath2 } from "GlobalValue";
import { BehaviorBaseWidget } from "behaviorCamp/BehaviorBaseView";
import { CallManyTimes } from "lib/Timer_CallManyTimes";
import { SceneModel } from "lib/scene/SceneModel";

export interface CSceneMonitorUI {
    grpCenterTips: eui.Group;
    lblPerf: eui.Label;
}
@UIDef(uiPath2("main/hangup/MainHangUp_Monitor.exml"), UIManager.DevelopPanel)
export class CSceneMonitorUI extends BehaviorBaseWidget {

    private m_objTimer: CallManyTimes;
    protected $notReopen: boolean = true;

    constructor() {
        super();
    }

    public init() {
        super.init();

        this.lblPerf.text = "";
    }

    public onOpen(visChanged?: boolean, playOpenAni?: boolean): void {
        this.clearTimer();

        this.m_objTimer = new CallManyTimes(Number.MAX_VALUE, 1000, this.onTickFunc, [], this);
        this.m_objTimer.restart();

        super.onOpen(visChanged, playOpenAni);
    }

    public onClose(visChanged?: boolean): void {
        this.clearTimer();

        super.onClose(visChanged);
    }

    private onTickFunc() {
        this.updatePerfmance();
    }

    private clearTimer() {
        if (this.m_objTimer) {
            this.m_objTimer.stop();
        }
        this.m_objTimer = null;
    }

    initBehavior(): void {
    }

    @SafeCallFunction()
    public setData() {

    }

    private updatePerfmance() {
        let perfInfo: egret.sys.PerformanceInfo = egret.sys.getPerformace();
        if (!perfInfo) {
            return;
        }

        let maxFps: number = LoginInst.stage.frameRate;

        let fps = `fps:${perfInfo.fps || 0}/${maxFps}`;
        let dc = `dc:${perfInfo.drawCall || 0}`;

        let sceneMonitor = SceneModel.getInstance().sceneMonitorMgr;

        let showCnt = sceneMonitor.shownCount || "-";
        let npcCnt = sceneMonitor.npcCount;
        let playerCnt = sceneMonitor.playerCount;
        let avaCnt = `ent:${showCnt}/${playerCnt},${npcCnt}`;
        // let renderCanvas = `render_canvas:${perfInfo.renderCanvas}`;
        this.lblPerf.text = `${fps} ${dc} ${avaCnt}`;
    }
}