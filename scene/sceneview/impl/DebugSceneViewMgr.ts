import { AvatarComDefine } from "avatar/AvatarDefines";
import { LayerHideMgr } from "lib/layerhide/LayerHideMgr";
import { SceneModel } from "lib/scene/SceneModel";
import { SceneStatus } from "lib/scene/SceneStatus";
import { regSceneViewMgr, SceneViewMgrImpl } from "../SceneViewMgrImpl";
import { s2_scene_cfg } from "auto/Scene";

@regSceneViewMgr("DebugSceneViewMgr")
export class DebugSceneViewMgr extends SceneViewMgrImpl {

    protected init(): void {
        this.$sceneStatus = SceneStatus.DebugScene;
    }

    protected initArgs() {
        this.$mainRoleWalkArgs = {
            isWalkable: true,
            isTouchWalkable: true,
            isJoystickWalk: false,
            isAutoWalk: false,
        }
    }

    protected enterSceneComplete(createHero?: boolean): void {
        super.enterSceneComplete(createHero);
        
        // if (createHero) {
        //     this.$ctx.createHero();
        // }

        // this.$ctx.enableFixArea = false;

        // sceneview_utils.setSceneViewEnterStatus("end");

        // this.updateMainRoleWalk();
        // // this.updateRobotsWalk();

        // scene_log.log(`[SceneViewMgrImp] SCENEVIEW_ENTER_COPLETE`);
        // SceneEventBus.getInstance().dispatchEvent(new SceneEvent(SceneEvent.SCENE_VIEW_ENTER_COMPLETE));

        // SceneCNet.C_NOTICE_SCENE_COMPLETE(this.sceneModel.sceneId);

        let hero = this.sceneAvatarMgr.hero;
        if (hero) {
            // 移除同步位置组件
            hero.removeComponent(AvatarComDefine.SyncPosToServer);

            let pointLst: { x: number; y: number; }[] = [];
            
            // if (!this.isHero) return pointLst;
            let curSceneId = SceneModel.getInstance().sceneId;
            if (curSceneId) {
                let walkablePointLst: [number, number][] = s2_scene_cfg.SceneInfo[curSceneId][s2_scene_cfg.born_pos];
                if (walkablePointLst) {
                    for (let arrPoint of walkablePointLst) {
                        let pointData = arrPoint;
                        pointLst.push({ x: +pointData[0], y: +pointData[1] });
                    }
                }
            }

            if (pointLst.length > 0) {
                hero.x = pointLst[0].x;
                hero.y = pointLst[0].y;
            }
            else {
                hero.x = 0;
                hero.y = 0;
            }

            LayerHideMgr.getInstance().checkHide();
        }
    }
}