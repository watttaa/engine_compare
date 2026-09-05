
/**多人场景 */
import { SceneStatus } from "lib/scene/SceneStatus";
import { SceneViewMgrImpl, regSceneViewMgr } from "world/scene/sceneview/SceneViewMgrImpl";

type MutliPlayerSceneViewMgrData = {
    sceneId: number,
}

@regSceneViewMgr("MultiPlayerSceneViewMgr")
export class MultiPlayerSceneViewMgr extends SceneViewMgrImpl {
    protected init() {
        this.$sceneStatus = SceneStatus.MutliPlayerScene;
    }

    protected initArgs() {
        this.$mainRoleWalkArgs = {
            isWalkable: true,
            isTouchWalkable: true,
            isJoystickWalk: true,
            isAutoWalk: false,
        }
    }

    public enterScene(data?: MutliPlayerSceneViewMgrData): void {
        super.enterScene(data);
    }

    public exitScene(): void {
        super.exitScene();
    }
}