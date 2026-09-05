import { SceneStatusManager } from "lib/scene/SceneStatusManager";
import { CSceneServerHub } from "world/scene/hub/CSceneServerHub";
import { GSceneAvatarMgr } from "world/scene/avatar/GSceneAvatarMgr";
import { GSceneAvatarUtils } from "world/scene/avatar/GSceneAvatarUtils";
import { GSceneBufferMgr } from "world/scene/buffer/GSceneBufferMgr";
import { Camera } from "world/scene/Camera";
import { GSceneTeamMgr } from "world/scene/team/GSceneTeamMgr";
import { World } from "world/World";
import { NpcTypeEnum } from "auto/npc_type_enum";
import { GlobalValue } from "GlobalValueDefine";
import { GScenePathingMgr } from "world/scene/pathing/GScenePathingMgr";
import { SceneProxyExt, SProxyClsDef } from "lib/scene/SceneProxy_define";
import { GSceneMonitorMgr } from "world/scene/monitor/GSceneMonitorMgr";
import { s2_scene_cfg } from "auto/Scene";

export class SceneModel extends SingletonClassEx {
    public constructor() {
        super();
    }

    public reset() {
        this.sceneStatusProxy?.dispose();

        this.sceneProxy?.dispose();

        this.sceneId = null;
    }

    public enter() {
        this.sceneMonitorMgr.enter();
    }

    /**场景状态机代理 */
    protected $sceneStatusProxy: SceneStatusManager;

    /**场景代理 */
    protected $sceneProxy: World;

    public get sceneStatusProxy(): SceneStatusManager {
        return this.$sceneStatusProxy;
    }

    public set sceneStatusProxy(value: SceneStatusManager) {
        this.$sceneStatusProxy = value;
    }

    public get sceneProxy(): World {
        return this.$sceneProxy;
    }

    public set sceneProxy(value: World) {
        this.$sceneProxy = value;
    }

    public get camera(): Camera {
        return this.$sceneProxy.camera;
    }

    public get sceneServerHub(): CSceneServerHub {
        return this.$sceneProxy.sceneServerHub;
    }

    public get sceneAvatarProxy(): GSceneAvatarMgr {
        return this.$sceneProxy.sceneAvatarManager;
    }

    public get sceneAvatarUtils(): GSceneAvatarUtils {
        return this.$sceneProxy.sceneAvatarUtils;
    }

    public get sceneTeamMgr(): GSceneTeamMgr {
        return this.$sceneProxy.sceneTeamMgr;
    }

    public get sceneBufferMgr(): GSceneBufferMgr {
        return this.sceneProxy.sceneBufferMgr;
    }

    public get scenePathingMgr(): GScenePathingMgr {
        return this.sceneProxy.scenePathingMgr;
    }

    public get sceneMonitorMgr(): GSceneMonitorMgr {
        return this.sceneProxy.sceneMonitorMgr;
    }

    protected $sceneId: number;

    public get sceneId(): number {
        return this.$sceneId;
    }

    public set sceneId(value: number) {
        this.$sceneId = value;
    }

    /**当前场景的openid */
    public get curSceneOpenId(): number {
        let sceneId = SceneModel.getInstance().sceneId;
        if (!sceneId) {
            return;
        }
        let sceneInfo = s2_scene_cfg.SceneInfo[sceneId];
        return sceneInfo && sceneInfo[s2_scene_cfg.open_id];
    }

    public get playerStopMove(): number {
        let sceneId = SceneModel.getInstance().sceneId;
        if (!sceneId) {
            return;
        }
        let sceneInfo = s2_scene_cfg.SceneInfo[sceneId];
        return sceneInfo && sceneInfo[s2_scene_cfg.playerStopMove];
    }

    private $extProxy: { [key: string]: any } = {};

    public setExtProxy<T extends keyof SceneProxyExt>(key: T, proxy: SProxyClsDef[T]) {
        if (!this.$extProxy) {
            this.$extProxy = {};
        }
        this.$extProxy[key] = proxy;
    }

    public getExtProxy<T extends keyof SceneProxyExt>(key: T): SProxyClsDef[T] {
        return this.$extProxy?.[key]
    }

    // =====
    public isFollower(isTips: boolean = false) {
        let hero = SceneModel.getInstance().sceneAvatarProxy.hero;
        if (hero?.isFollower) {
            if (isTips) {
                this.sceneTeamMgr.showFollowerTips();
            }

            return true;
        }

        return false;
    }

    public getFindNpcDestInfo(npcType?: NpcTypeEnum): { findDistance: number } {
        if (npcType === NpcTypeEnum.TRANSPORT) {
            return { findDistance: 0 };
        }
        return { findDistance: GlobalValue.MIN_GLOBAL_PATH_FIND_DIS };
    }

    /**
     * 
     * 获得寻路目标点
     * @param sPt 起点
     * @param ePt 终点
     * @param noDirectionLimit 不限制方向
     * @param dir 朝向 noDirectionLimit为false才有效
     * @param fDist 最小发现距离
     * @returns null 表示没有寻路目标点，即不用寻路
     */
    public getFindAvatarTp(sPt: Point, ePt: Point, noDirectionLimit: boolean, dir: AvatarDirEnum = -1, fDist: number = GlobalValue.MIN_GLOBAL_PATH_FIND_DIS): Point | null {
        let deltaX = ePt.x - sPt.x;
        let deltaY = ePt.y - sPt.y;
        let len = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        let targetPt: Point = null;
        if (len >= fDist) {
            let targetX = ePt.x;
            let targetY = ePt.y;

            if (!noDirectionLimit) {
                let offsetPos = preload_utils_math.calculateTargetOffsetPosition(dir, fDist);
                targetX = ePt.x + offsetPos.x;
                targetY = ePt.y + offsetPos.y;
            } else {
                targetX = ePt.x - deltaX / len * fDist;
                targetY = ePt.y - deltaY / len * fDist;
            }

            targetPt = { x: targetX, y: targetY };
        }

        return targetPt;
    }

    public getFindNpcTp(sPt: Point, npcPt: Point, npcType: number, npcDir: AvatarDirEnum, noDirectionLimit: boolean): Point | null {
        let npcDestInfo = SceneModel.getInstance().getFindNpcDestInfo(npcType);
        let findDis = npcDestInfo.findDistance;

        let targetPt: Point = this.getFindAvatarTp(sPt, npcPt, noDirectionLimit, npcDir, findDis);

        return targetPt;
    }

}