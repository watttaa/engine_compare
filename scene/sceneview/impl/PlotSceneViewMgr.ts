import { SceneEvent, SceneEventBus } from "lib/scene/SceneEvent";
import { SceneStatus } from "lib/scene/SceneStatus";
import { SceneCNet } from "world/net/SceneCNet";
import { sceneview_utils } from "world/scene/sceneview/sceneview_utils";
import { SceneViewMgrImpl, regSceneViewMgr } from "world/scene/sceneview/SceneViewMgrImpl";

type PlotSceneViewMgrData = {
    sceneId: number,
}

@regSceneViewMgr("PlotSceneViewMgr")
export class PlotSceneViewMgr extends SceneViewMgrImpl {
    protected init() {
        this.$sceneStatus = SceneStatus.PlotScene;
    }

    protected initArgs() {
        this.$mainRoleWalkArgs = {
            isWalkable: true,
            isTouchWalkable: false,
            isJoystickWalk: false,
            isAutoWalk: false,
        }
    }

    protected enterSceneComplete(createHero: boolean = true): void {
        super.enterSceneComplete(false);
    }
}