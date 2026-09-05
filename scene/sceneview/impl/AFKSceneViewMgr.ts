import { LayerHideMgr } from "lib/layerhide/LayerHideMgr";
import { SceneStatus } from "lib/scene/SceneStatus";
import { afk_define } from "s2/afk/afk_define";
import { AfkMapManager } from "s2/afk/AfkMapManager";
import { AfkTimerMgr } from "s2/afk/AfkTimerMgr";
import { AutoFightManager } from "s2/afk/AutoFightManager";
import { AFK_TYPE } from "s2/turnbasedwar/WarDefines";
import { regSceneViewMgr, SceneViewMgrImpl } from "world/scene/sceneview/SceneViewMgrImpl";

/**单人挂机场景 */

type AFKSceneViewMgrData = {
    sceneId: number,
}

@regSceneViewMgr("AFKSceneViewMgr")
export class AFKSceneViewMgr extends SceneViewMgrImpl {
    protected init() {
        this.$sceneStatus = SceneStatus.AFKScene;
    }

    protected initArgs() {
        this.$mainRoleWalkArgs = {
            isWalkable: true,
            isTouchWalkable: true,
            isJoystickWalk: false,
            isAutoWalk: true,
        }
    }


    public enterScene(data?: AFKSceneViewMgrData): void {
        super.enterScene(data);

        //自动挂机战斗
        if (AfkMapManager.getInstance().getMode() == afk_define.MapStatusEnum.XianGuan) {
            AfkTimerMgr.Inst.startAfkTimer(AFK_TYPE.XianGuang);
        } else {
            AfkTimerMgr.Inst.startAfkTimer(AFK_TYPE.MainLine);
        }

        LayerHideMgr.getInstance().checkHide();
    }

    public exitScene(): void {
        super.exitScene();

        AutoFightManager.getInstance().cancel();
        AfkTimerMgr.Inst.stopAfkTimer();
        LayerHideMgr.getInstance().checkHide();
    }
}