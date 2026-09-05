import { SceneStatus } from "lib/scene/SceneStatus";
import { FactionManager } from "s2/faction/FactionManager";
import { FactionEvent, FactionEventBus } from "s2/faction/util/FactionEventBus";
import { SceneViewMgrImpl, regSceneViewMgr } from "world/scene/sceneview/SceneViewMgrImpl";

/**
 * 帮派
 */
type FactionSceneViewMgrData = {
    sceneId: number,
}

@regSceneViewMgr("FactionSceneViewMgr")
export class FactionSceneViewMgr extends SceneViewMgrImpl {
    protected init() {
        this.$sceneStatus = SceneStatus.FactionScene;
    }

    protected initArgs() {
        this.$mainRoleWalkArgs = {
            isWalkable: true,
            isTouchWalkable: true,
            isJoystickWalk: true,
            isAutoWalk: false,
        }
    }

    public enterScene(data?: FactionSceneViewMgrData): void {
        super.enterScene(data);
    }

    public exitScene(): void {
        super.exitScene();
        FactionManager.getInstance().enterScene = false;
        FactionEventBus.getInstance().dispatchEvent(new FactionEvent(FactionEvent.CLOSE_SECEN_UI));
    }
}