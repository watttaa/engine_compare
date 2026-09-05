import { SceneEventBus } from "lib/scene/SceneEvent";
import { SceneModel } from "lib/scene/SceneModel";
import { World } from "world/World";
import { SceneStatus } from "./SceneStatus";
import { scene_log } from "lib/scene/scene_log";
import { SceneViewMgrImpl } from "world/scene/sceneview/SceneViewMgrImpl";

export class SceneViewMgrBase extends SingletonClassEx {
    protected $sceneStatus: SceneStatus;
    protected $ctx: World;

    public constructor() {
        super();
        this.$ctx = SceneModel.getInstance().sceneStatusProxy.ctx;
    }

    public enterScene(data?: any) {
        scene_log.log(`[SceneViewMgrBase] enterScene complete`);

        Logger.debug("[enterScene] >>>>> " + this.getName());
        // SceneEventBus.getInstance().addEventListener(SceneStatusEvent.STATUSCHANGE, this.onSceneStatusChange, this);
        if (!this.$sceneStatus) {
            Logger.error("[SceneViewMgrBase.enterScene]")
        }
        SceneEventBus.getInstance().dispatchStatusSetEvent(this.$sceneStatus);
    }

    /**重新进入 */
    public reEnterScene(data?: any) {
        scene_log.log(`[SceneViewMgrBase] reEnterScene complete`);

        Logger.debug("[reEnterScene] >>>>> " + this.getName());
        if (!this.$sceneStatus) {
            Logger.error("[SceneViewMgrBase.enterScene]")
        }
        SceneEventBus.getInstance().dispatchStatusSetEvent(this.$sceneStatus);
    }

    public exitScene() {
        Logger.debug("[exitScene] <<<<< " + this.getName());
        // SceneEventBus.getInstance().removeEventListener(SceneStatusEvent.STATUSCHANGE, this.onSceneStatusChange, this);

        SceneEventBus.getInstance().dispatchStatusExitEvent(this.$sceneStatus);
    }

    private getName() {
        return egret.getQualifiedClassName(this);
    }

    destroy(): void {
        // mike todo check
    }
}


export class TestAvatarPoint {

    private static $instance: TestAvatarPoint;

    public static getInst(): TestAvatarPoint {
        if (!this.$instance) {
            this.$instance = new TestAvatarPoint;
        }
        return this.$instance;
    }

    public setTestStart(direction: number) {
        let mgr = SceneModel.getInstance().sceneStatusProxy.mgrInstance as SceneViewMgrImpl;
        if (mgr && mgr instanceof SceneViewMgrImpl) { // 可能已经出去了，不在帮战场景
            mgr.setDirectionByPointStart(direction);
        }
    }

    private getTestPoint() {
        let mgr = SceneModel.getInstance().sceneStatusProxy.mgrInstance as SceneViewMgrImpl;
        if (mgr && mgr instanceof SceneViewMgrImpl) { // 可能已经出去了，不在帮战场景
            mgr.getDirectionByPoint();
        }
    }
    // egret.getDefinitionByName("TestAvatarPoint").getInst().getTestPoint()
}