import { date_utils } from "utils/DateUtils";

export namespace scene_log {

    /**场景切换关键步骤编号，用于 drpf 日志埋点 */
    export const enum SceneStep {
        /** 服务端 Soul+Zone 就绪，开始驱动场景切换 */
        ENTER_WORLD = 100,
        /** 发起 gotoScene() 调用，开始加载地图资源 */
        CHANGE_SCENE_START = 200,
        /** 地图阻挡图加载完成（BLOCK_COMPLETE 事件） */
        BLOCK_COMPLETE = 300,
        /** 场景 ViewMgr 进入完成，Hero 已就位（SCENE_VIEW_ENTER_COMPLETE 派发前） */
        SCENE_VIEW_ENTER = 400,
        /** 即将通知服务端场景就绪（C_NOTICE_SCENE_COMPLETE 发送前） */
        NOTICE_SCENE_COMPLETE = 500,
    }

    /**
     * 上报场景切换关键步骤的 drpf 日志
     * @param step      步骤编号（SceneStep 枚举）
     * @param sceneId   目标场景 ID
     * @param sceneType 场景类型枚举值
     * @param other     可选扩展字段
     */
    export function logSceneStep(step: SceneStep, sceneId: number, sceneType: number, other?: any) {
        client_log_utils.handleSceneP2Log({ step, scene_id: sceneId, scene_type: sceneType, other });
    }

    /**用于复杂测试，需要log很多时候，开启用 */
    let testLog: boolean = false;

    export function log(...rest: Array<any>) {
        if (DEV) {
            Logger.log(`#scene: ${date_utils.dateFormat(new Date(), "hh:mm:ss.S")} frame:${egret.sys.FRAME_START_TIME}`, ...rest);
        }
    }

    export function warn(...rest: Array<any>) {
        if (DEV) {
            Logger.warn(`#scene:${date_utils.dateFormat(new Date(), "hh:mm:ss.S")} frame:${egret.sys.FRAME_START_TIME}`, ...rest);
        }
    }

    export function logTest(...rest: Array<any>) {
        if (testLog) {
            scene_log.log(...rest);
        }
    }


}