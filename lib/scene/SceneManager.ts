import { SceneEvent, SceneEventBus } from "lib/scene/SceneEvent";
import { SceneModel } from "lib/scene/SceneModel";
import { SceneStatusManager } from "lib/scene/SceneStatusManager";

import { GlobalEventSource, ListenEvent, UnListenEvent } from "GlobalEvent";
import { scene_log } from "lib/scene/scene_log";
import { GScenePrivateEntityCacheMgr } from "world/scene/buffer/GScenePrivateEntityCacheMgr";
import { GSceneValue } from "world/scene/GSceneValue";
import { scene_define } from "world/scene/scenedefine";
import { sceneview_utils } from "world/scene/sceneview/sceneview_utils";
import { World } from "world/World";
import { SceneProxyExt, SProxyClsDef } from "lib/scene/SceneProxy_define";
import { s2_scene_cfg } from "auto/Scene";

export class SceneManager extends SingletonClassEx {

    /**切换场景加载完毕 */
    private $isWorldCompleted: boolean = true;
    private $worldCompleteFunc: Function;

    private $pauseFunc: Function;
    private $resumeFunc: Function;

    public get isWorldCompleted() {
        return this.$isWorldCompleted;
    }

    clear(): void {
        // this.reset();
        // this.dataSource.sceneStatusProxy = null;
        // this.dataSource.sceneProxy = null;
        // super.clear();
    }

    public registerProxy<T extends keyof SceneProxyExt>(name: T, proxy: SProxyClsDef[T]): void {
        switch (name) {
            case "status":
                this.dataSource.sceneStatusProxy = proxy as SProxyClsDef['status'];
                break;
            case "scene":
                this.dataSource.sceneProxy = proxy as SProxyClsDef['scene'];
                break;
            default:
                this.dataSource.setExtProxy(name, proxy);
                break;
        }
    }

    public constructor() {
        super();
        this.initBlackRect();

        this.registerProxy("scene", new World(UIManager.WorldPanel));
        this.registerProxy("status", new SceneStatusManager(this.dataSource.sceneProxy));

        this.cameraScale = scene_define.cameraDefaultScale;

        // UIManager.WorldPanel.addEventListener(SceneEvent.ENTER_SCENE, this.onEventEnterScene, this);
        // UIManager.WorldPanel.addEventListener(SceneEvent.LEAVE_SCENE, this.onEventLeaveScene, this);
        SceneEventBus.getInstance().addEventListener(SceneEvent.BLOCK_COMPLETE, this.onEventSceneBlockComplete, this);

        SceneEventBus.getInstance().addEventListener(SceneEvent.SCENE_VIEW_ENTER_COMPLETE, this.onEventSceneViewEnterComplete, this);
       

        // UIManager.WorldPanel.addEventListener(SceneEvent.MASK_COMPLETE, this.onEventSceneMaskComplete, this);
        ListenEvent(GlobalEventSource.START_WAR_EVENT, this.onEventStartWar, this);
        ListenEvent(GlobalEventSource.END_WAR_EVENT, this.onEventEndWar, this);

        // ListenEvent(GlobalEventSource.SET_CAMERA_FOLLOW, this.onSetCameraFollow, this);
    }

    private static blackRect: eui.SdfRect = new eui.SdfRect(0, 0, 0x000000);
    private initBlackRect() {
        SceneManager.blackRect.width = UIManager.stageW || 2000;
        SceneManager.blackRect.height = UIManager.stageH || 2000;
        SceneManager.blackRect.touchEnabled = false;
        SceneManager.blackRect.visible = false;
        UIManager.WorldPanel.addChildAt(SceneManager.blackRect, 0);
    }

    /**
     * 重置场景
     */
    public reset(): void {
        this.dataSource?.reset();

        this.$isWorldCompleted = false;
        this.$worldCompleteFunc = null;

        UIManager.WorldPanel.visible = false;
    }

    public enter() {
        this.dataSource?.enter();

        UnListenEvent(GlobalEventSource.SET_CAMERA_FOLLOW, this.onSetCameraFollow, this);
        ListenEvent(GlobalEventSource.SET_CAMERA_FOLLOW, this.onSetCameraFollow, this);

        UIManager.WorldPanel.visible = true;
    }

    private clearScene() {
        GScenePrivateEntityCacheMgr.getInstance().clearCache();

        this.dataSource?.sceneProxy?.clearScene();
    }

    public resume() {
        this.$resumeFunc && this.$resumeFunc.call(this);
    }

    public pause() {
        this.$pauseFunc && this.$pauseFunc.call(this);
    }

    public registerResumeCallback(callback: Function) {
        this.$resumeFunc = callback;
    }

    public registerPauseCallback(callback: Function) {
        this.$pauseFunc = callback;
    }

    private m_bIsChanging: boolean = false;
    public set isChanging(value: boolean) {
        this.m_bIsChanging = value;
        if (value) {
            scene_log.log(`[SceneManager] SCENE_CHANGE_START`);
            SceneEventBus.getInstance().dispatchEvent(new SceneEvent(SceneEvent.SCENE_CHANGE_START));
        } else {
            scene_log.log(`[SceneManager] SCENE_CHANGE_END`);
            SceneEventBus.getInstance().dispatchEvent(new SceneEvent(SceneEvent.SCENE_CHANGE_END));
        }
    }
    public get isChanging() {
        return this.m_bIsChanging;
    }

    /**
     * 切换场景背景
     */
    public changeScene(sceneId: number, closeAll?: boolean, completeFunc?: Function, pos?: [number, number, number]): void {
        this.$isWorldCompleted = false;
        this.$worldCompleteFunc = completeFunc;

        scene_log.log(`[SceneManager] call changeScene and set sceneId = ${sceneId} complete`);

        this.isChanging = true;

        sceneview_utils.setSceneViewEnterStatus("start");

        let lastSceneId = this.dataSource.sceneId;

        if (this.dataSource.sceneId == sceneId) { // 已在目标场景
            this.onEventSceneBlockComplete(null);
            Logger.warn(">>>>>>>>>>> changeScene: no need");
        }
        else {
            let sceneInfo = s2_scene_cfg.SceneInfo[sceneId];
            if (!sceneInfo) {
                scene_log.warn(`[SceneManager] changeScene sceneid: not exist`);
                return;
            }

            if (lastSceneId) {
                this.clearScene();
            }

            GSceneValue.setAutoNav(false);

            this.dataSource.sceneId = sceneId;
            scene_log.logSceneStep(scene_log.SceneStep.CHANGE_SCENE_START, sceneId, GSceneValue.getSceneType());
            let result = this.dataSource.sceneProxy.gotoScene(sceneId, closeAll);
            if (pos) {
                this.dataSource.sceneProxy.centerScreen(pos[0], pos[2]);
            }
            if (!result) {
                // this.onEventSceneBlockComplete(null);// 可能ID相同失败返回，而不会调用complete
                scene_log.warn(`[SceneManager] changeScene sceneid: ${sceneId} goto fail`);
                return;
            }

            Logger.warn(">>>>>>>>>>> changeScene: " + sceneId, result);
        }
    }


    // ====================
    public set cameraScale(scale: number) {
        let sceneProxy = this.dataSource.sceneProxy;
        sceneProxy.camera.scale = scale;
    }
    public get cameraScale(): number {
        let sceneProxy = this.dataSource.sceneProxy;
        return sceneProxy.camera.scale;
    }

    public setCameraTweenScale(scale: number, time: number = 500) {
        let sceneProxy = this.dataSource.sceneProxy;
        sceneProxy.camera.setTweenScale(scale, time);
    }

    // ====================
    /**
     * 
     * @param x 
     * @param y 
     * @param speed 0：则表示瞬间移动
     * @param offset 
     */
    public lookAt(x: number, y: number, speed: number = 8, offset?: { x: number, y: number }) {
        if (offset) {
            x += offset.x;
            y += offset.y;
        }

        let sceneProxy = this.dataSource.sceneProxy;
        if (!sceneProxy) {
            return 0;
        }

        let duration: number = -1;
        if (speed > 0) {
            let distance = preload_utils_math.distance({ x: sceneProxy.x, y: sceneProxy.y }, { x: x, y: y });
            duration = distance / speed;
            scene_log.log(`[SceneManager] lookAt distance = ${distance} duration = ${duration}`);
        }

        let camera = sceneProxy.camera;
        if (camera) {
            camera.lookAt(x, y, duration);
        }
        return duration;
    }

    public stopLookAt() {
        let sceneProxy = this.dataSource.sceneProxy;
        if (sceneProxy && sceneProxy.camera) {
            sceneProxy.camera.stopLookAt();
        }
    }

    // ====================
    public doAfkWorld(closeWorldMap = true, sceneId: number): void {
        // this.tryCloseMapNav(closeWorldMap);
        this.dataSource.sceneStatusProxy.enterScene("AFKSceneViewMgr", { sceneId });
    }

    public doMutliPlayerWorld(closeWorldMap = true, sceneId: number): void {
        // this.tryCloseMapNav(closeWorldMap);
        this.dataSource.sceneStatusProxy.enterScene("MultiPlayerSceneViewMgr", { sceneId });
    }

    public doDungeon(closeWorldMap = true, sceneId: number): void {
        // this.tryCloseMapNav(closeWorldMap);
        this.dataSource.sceneStatusProxy.enterScene("DungeonSceneViewMgr", { sceneId });
    }

    public doPlotWorld(closeWorldMap = true, sceneId: number): void {
        // this.tryCloseMapNav(closeWorldMap);
        this.dataSource.sceneStatusProxy.enterScene("PlotSceneViewMgr", { sceneId });
    }

    public doFaction(closeWorldMap = true, sceneId: number): void {
        // this.tryCloseMapNav(closeWorldMap);
        this.dataSource.sceneStatusProxy.enterScene("FactionSceneViewMgr", { sceneId });
    }

    public doFactionWar(closeWorldMap = true, sceneId: number): void {
        // this.tryCloseMapNav(closeWorldMap);
        this.dataSource.sceneStatusProxy.enterScene("FactionWarSceneViewMgr", { sceneId });
    }

    public doDebugScene(closeWorldMap = true, sceneId: number): void {
        // this.tryCloseMapNav(closeWorldMap);
        this.dataSource.sceneStatusProxy.enterScene("DebugSceneViewMgr", { sceneId });
    }

    // private tryCloseMapNav(bol: boolean = false) {
    //     if (bol) {
    //         UIManager.close(MapNavMainUI);
    //     }
    // }

    private onEventSceneBlockComplete(e: SceneEvent) {
        scene_log.logSceneStep(scene_log.SceneStep.BLOCK_COMPLETE, this.dataSource.sceneId, GSceneValue.getSceneType());
        SceneManager.blackRect.visible = true;

        this.$worldCompleteFunc && this.$worldCompleteFunc.call(this, !!e); // e为null，表示无需重新加载，返回false
        this.$isWorldCompleted = true;

        this.isChanging = false;
    }

    private onEventSceneViewEnterComplete(e: SceneEvent) {
    }

    // ====
    public get dataSource(): SceneModel {
        return SceneModel.getInstance();
    }

    private onEventStartWar(e: GlobalEventSource) {
        this.pause();
    }

    private onEventEndWar(e: GlobalEventSource) {
        this.resume();
    }

    private onSetCameraFollow(e: GlobalEventSource) {
        let val = !!e.data[0];
        this.cameraFollow = val;
    }

    public set cameraFollow(value: boolean) {
        let sceneProxy = this.dataSource.sceneProxy;
        scene_log.log(`[SceneManager] onSetCameraFollow ${value} ${sceneProxy?.camera}`);
        if (sceneProxy && sceneProxy.camera) {
            sceneProxy.camera.bFollower = value;
        }
    }


}

// export var NewSceneMgr = SceneManager.getInstance();
