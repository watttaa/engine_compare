import { s2_rolelevel_cfg } from "auto/RoleLevel";
import { AvatarComDefine, AvatarFlyConf } from "avatar/AvatarDefines";
import { BaseComponent } from "avatar/comp/BaseComponent";
import { SceneTeamDataComponent } from "avatar/comp/impl/datacomp/SceneTeamDataComponent";
import { serverentity_define } from "clientsdk/serverentity_define";
import { astar } from "lib/astar";
import { map_define } from "lib/map/mapdefine";
import { MapGroup } from "lib/map/MapGroup";
import { scene_log } from "lib/scene/scene_log";
import { color_utils } from "utils/ColorUtils";
import { AreaMgr } from "world/area/AreaMgr";
import { CSceneAvatarLegacy } from "world/scene/element/legacy/CSceneAvatarLegacy";

export abstract class CSceneRole<T = any> extends CSceneAvatarLegacy<T> {

    onCreate() {
        super.onCreate();

    }

    onRemove() {
        this.m_nLayer = undefined;

        super.onRemove();
    }

    constructor(args: T) {
        super(args);
    }

    protected refreshAvatar(): void {
        super.refreshAvatar();

    }

    /** Role 类型需应用飞行缩放系数 */
    protected get applyFlyingScaleFactor(): boolean {
        return true;
    }

    // ====
    public getAvatarMovePath(ctx: MapGroup, x: number, y: number, isMainRole?: boolean) {
        let _isFlying = this.isFlying;

        if (_isFlying) {
            astar.setJumpBlockCheck(true);
        }

        // scene_log.log(`[CSceneRole] getAvatarMovePath: ${this.serverEntityData.entityName} isFlying: ${_isFlying}`);
        let paths = super.getAvatarMovePath(ctx, x, y, isMainRole);

        if (_isFlying) {
            astar.setJumpBlockCheck(false);
        }

        return paths;
    }

    protected getWalkSpeedScaleReal() {
        let scale = super.getWalkSpeedScaleReal();

        // if (this.isFlying) {
        //     // let base = s2_global_value_cfg.GlobalValueInfo.AVATAR_FLYING_WALK_SPEED_SCALE;
        //     let val = this.serverEntityData.role_model?.fly_data?.speed || 0;
        //     if (this.isFollower) { // 如果是跟随者，拿队长的速度
        //         let leader: CSceneRole;
        //         let sceneTeamData = this.getComponent(AvatarComDefine.SceneTeamData) as SceneTeamDataComponent;
        //         leader = sceneTeamData?.team.leader;
        //         if (leader) {
        //             val = leader.serverEntityData.role_model?.fly_data?.speed || 0;
        //         }
        //     }
        //     val = val / 100;
        //     scale *= val;
        // }

        let walkSpeedScale = this.serverEntityData?.walkSpeedScale;
        if (this.isFollower) {
            let leader: CSceneRole;
            let sceneTeamData = this.getComponent(AvatarComDefine.SceneTeamData) as SceneTeamDataComponent;
            leader = sceneTeamData?.team.leader;
            if (leader) {
                walkSpeedScale = leader.serverEntityData.walkSpeedScale || 0;
            }
        }
        // Logger.log("getWalkSpeedScaleReal walkSpeedScale", this.serverEntityData.walkSpeedScale);
        if (!isNaN(walkSpeedScale) && !isVain(walkSpeedScale)) {
            let val = walkSpeedScale / 100;
            scale *= val;
        }

        return scale;
    }

    protected onFlyAvatarStateChanged(value: AvatarFlyConf.AvatarState, directlySwitch: boolean): void {
        super.onFlyAvatarStateChanged(value, directlySwitch);

        if (value == AvatarFlyConf.AvatarState.FLYUPING || value == AvatarFlyConf.AvatarState.FLYDOWNING) {
            if (this.serverEntityData.role_model?.fly_data?.run_continue) {
                // 默认是False， True的话，就不要打断
                this.tryReloadPathing();
            } else {
                this.stopAndStand();
            }

            this.updateFlying();
        }
    }

    protected tryReloadPathing() {
        // 由于异步问题，需要重新根据飞行状态来重新寻路
    }

    public updateFlying() {
        super.updateFlying();

        if (this.isFlying) {
            // pass
        } else {
            // 降落时，寻找最近的可以行走的位置
            let scene = this.areaMgr.ctx;
            let cell = scene.getNearestCell(this.x, this.y, map_define.MapGridSide.side_default, true);
            if (scene.reachableCell(cell.x, cell.y)) {
                let pos = scene.convertCellPosToWorld(cell.x, cell.y);
                this.x = pos.x;
                this.y = pos.y;
            }
        }

        this.updateScale();

        // 更换层级
        if (this.isFlying) {
            this.mapLayer = map_define.SMapLayer.cloud;
        } else {
            this.mapLayer = map_define.SMapLayer.player;
        }

        // refresh
        this.refreshAllComp(true);
    }

    // ====
    get areaMgr(): AreaMgr {
        return this.m_objArgs[0];
    }
    get serverEntityData(): serverentity_define.IServerPlayerProps {
        return this.m_objArgs[1];
    }

    private m_nLayer: number;
    set mapLayer(layerValue: map_define.SMapLayer) {
        this.m_nLayer = layerValue;

        if (!this.m_objAdapter) {
            return;
        }

        this.m_objArgs[2] = layerValue;

        this.m_objAdapter.layer = layerValue;
    }
    get mapLayer(): map_define.SMapLayer {
        return this.m_nLayer || this.m_objArgs[2];
    }

    /**是否为队伍跟随者 */
    get isFollower() {
        return this.serverEntityData.isFollower;
    }
    get leaderId() {
        return this.serverEntityData.leaderId;
    }
    get isLeader() {
        return this.serverEntityData.isLeader;
    }

}