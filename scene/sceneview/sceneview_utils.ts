import { scene_log } from "lib/scene/scene_log";
import { SceneViewMgrBase } from "lib/scene/SceneViewMgrBase";

export namespace sceneview_utils {

    export interface SceneViewMgrTag {
        AFKSceneViewMgr: typeof SceneViewMgrBase,
        MultiPlayerSceneViewMgr: typeof SceneViewMgrBase,
        DungeonSceneViewMgr: typeof SceneViewMgrBase,
        FactionWarSceneViewMgr: typeof SceneViewMgrBase,
        PlotSceneViewMgr: typeof SceneViewMgrBase,
        FactionSceneViewMgr: typeof SceneViewMgrBase,
        DebugSceneViewMgr: typeof SceneViewMgrBase,
    }
    export let sceneViewMgrs = {} as SceneViewMgrTag;

    // 场景id对应的SceneViewMgr，其中id是场景表Scene.ts的id
    export const sceneId2Mgr = {} as { [key: number]: keyof SceneViewMgrTag };


    // ==============
    type SSceneViewEnterStatus = "none" | "start" | "end";
    let sceneViewEnterStatus: SSceneViewEnterStatus = "none";
    export function setSceneViewEnterStatus(val: SSceneViewEnterStatus) {
        sceneViewEnterStatus = val;
        scene_log.log(`[sceneview_utils] SetSceneViewEnterStatus:${val}`);
    }
    export function getSceneViewEnterStatus(): SSceneViewEnterStatus {
        return sceneViewEnterStatus;
    }
}