import { AvatarFactory } from "avatar/AvatarFactory";
import { client_repo_ex_ } from "clientsdk/ClientRepoEx";
import { serverentity_define } from "clientsdk/serverentity_define";
import { pool } from "common/pool";
import { map_define } from "lib/map/mapdefine";
import { AreaMgr } from "world/area/AreaMgr";
import { CSceneRole } from "world/scene/element/CSceneRole";
import { scene_define } from "world/scene/scenedefine";

type TypeSceneOtherRoleData = [AreaMgr, serverentity_define.IServerPlayerProps, map_define.SMapLayer];
export class CSceneOtherRole extends CSceneRole<TypeSceneOtherRoleData> implements pool.IPoolInstance {
    // ===pool

    static __pool__ = "CSceneOtherRole";
    static create(args: TypeSceneOtherRoleData): CSceneOtherRole {
        let element: CSceneOtherRole = pool.create(CSceneOtherRole, args) as CSceneOtherRole;
        return element;
    }
    onCreate() {
        super.onCreate();
    }

    static remove(inst: CSceneOtherRole) {
        pool.remove(inst);
    }
    onRemove() {
        super.onRemove();
    }

    onDispose() {
    }

    _new(args: TypeSceneOtherRoleData) {
        this.m_objArgs = args;
    }

    // ====
    avatarType: scene_define.SAvatarType = scene_define.SAvatarType.OTHER_ROLE;

    constructor(args: TypeSceneOtherRoleData) {
        super(args);
    }


    // ======== override =========
    get renderPriority(): number {
        // 如果和主角同一队伍，一定显示
        let soul = client_repo_ex_.OwnSoul_;
        if (this.serverEntityData?.teamId && this.serverEntityData.teamId == soul.teamId) {
            return 0;
        }

        return 1;
    }
}