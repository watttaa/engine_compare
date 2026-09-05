import { Avatar } from "avatar/Avatar";
import { HeroMainModel } from "heroMain/HeroMainModel";
import { SceneEvent, SceneEventBus, SceneStatusEvent } from "lib/scene/SceneEvent";
import { SceneViewMgrBase } from "lib/scene/SceneViewMgrBase";
import { sceneview_utils } from "world/scene/sceneview/sceneview_utils";
import { World } from "world/World";
import { SceneStatus } from "./SceneStatus";

export class SceneStatusManager {

    public get status() {
        return this.$status;
    }

    public get prevStatus() {
        return this.$prev_status;
    }

    public set viewRect(rect: egret.Rectangle) {
        this.$viewRect = rect;
    }

    public get viewRect() {
        return this.$viewRect;
    }

    public get curOpenID(): number {
        return this.$curOpenID;
    }

    public set curOpenID(openID: number) {
        this.$curOpenID = openID;
    }

    public get curAutoFight() {
        return this.$curAutoFight;
    }

    public set curAutoFight(value: boolean) {
        this.$curAutoFight = value;
    }

    private $status: SceneStatus;
    private $prev_status: SceneStatus;

    private $ctx: World;
    private $viewRect: egret.Rectangle = null; // 场景可视区域，在玩法自己的逻辑里面设置，设置以后会定时检查玩家是否在可视区域内，不在会将visible设置为false;
    private $sceneViewMgr: SceneViewMgrBase;
    private $curOpenID: number; // 当前场景的Openid 有些场景的是0
    private $curAutoFight: boolean;// 当前场景是否在自动战斗

    public constructor(context: World) {
        this.$status = SceneStatus.None;
        this.$ctx = context;

        SceneEventBus.getInstance().addEventListener(SceneStatusEvent.STATUS_SET, this.onSetStatus, this);
    }

    private onSetStatus(event: SceneEvent) {
        this.$prev_status = this.status;
        this.$status = event.data;

        Logger.info(`[SceneStatusManager.onChangeStatus] status change from ${this.$prev_status} to ${this.$status}`);

        SceneEventBus.getInstance().dispatchEvent(new SceneStatusEvent(SceneStatusEvent.STATUSCHANGE, this.$status));
    }

    public get ctx() {
        return this.$ctx;
    }

    public get mgrInstance() {
        return this.$sceneViewMgr;
    }

    public get selfAvatar() {
        return this.$ctx.getHero();
    }

    public static isSelf(pid: number) {
        let uid = HeroMainModel.getInstance().userId;
        return uid === pid;
    }

    /** 
     * to-do 现在进入场景的数据里面只有sid, 以后的玩法可以考虑在里面加一些需要提前设置的数据
     * 比如当前玩家的阵营信息（side），跨服帮战通过extradata设置，处理起来很复杂，由于显示依赖于这个所以容易出错
     */
    public enterScene(scene_id: number, data?: any): void;
    public enterScene<T extends keyof sceneview_utils.SceneViewMgrTag>(name: T, data?: any): void;
    public enterScene(arg: any, data?: any) {
        let name: keyof sceneview_utils.SceneViewMgrTag;
        if (typeof arg === "number") {
            name = sceneview_utils.sceneId2Mgr[arg];
            if (!name) {
                Logger.error(`[SceneStatusManager.enterScene] Unregistered this SceneId(${arg})`);
                return;
            }
        }
        else {
            name = arg;
        }

        let Clazz = sceneview_utils.sceneViewMgrs[name];
        if (!Clazz) {
            Logger.error(`[SceneStatusManager.enterScene] Unregistered this class(${name})`);
            return;
        }

        // 如果当前场景和传入的场景一样，则直接进入
        if (this.$sceneViewMgr && this.$sceneViewMgr == Clazz.getInstance()) {
            this.$sceneViewMgr.reEnterScene(data);
            return;
        }

        // 实例化对应玩法的管理器，并进入
        if (this.$sceneViewMgr) {
            this.$sceneViewMgr.exitScene(); // 退出旧的
        }
        this.$sceneViewMgr = Clazz.getInstance(); // 实例化对应玩法的管理器
        this.$sceneViewMgr.enterScene(data); // 进入新的
    }

    // ================
    public dispose() {
        this.$status = SceneStatus.None;
        if (this.$sceneViewMgr) {
            this.$sceneViewMgr.exitScene();
            this.$sceneViewMgr = null;
        }

        this.$viewRect = null;
    }
}
