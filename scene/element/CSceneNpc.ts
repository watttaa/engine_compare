
import { serverentity_define } from "clientsdk/serverentity_define";
import { pool } from "common/pool";
import { map_define } from "lib/map/mapdefine";
import { AreaMgr } from "world/area/AreaMgr";
import { CSceneAvatarLegacy } from "world/scene/element/legacy/CSceneAvatarLegacy";
import { scene_define } from "world/scene/scenedefine";

type TypeSceneNpcData = [AreaMgr, serverentity_define.IServerNpcProps, map_define.SMapLayer];
export class CSceneNpc extends CSceneAvatarLegacy<TypeSceneNpcData> implements pool.IPoolInstance {
    // ===pool

    static __pool__ = "CSceneNpc";
    static create(args: TypeSceneNpcData): CSceneNpc {
        let element: CSceneNpc = pool.create(CSceneNpc, args) as CSceneNpc;
        return element;
    }
    onCreate() {
        super.onCreate();
    }

    static remove(inst: CSceneNpc) {
        pool.remove(inst);
    }
    onRemove() {
        super.onRemove();
    }

    onDispose() {
    }

    _new(args: TypeSceneNpcData) {
        this.m_objArgs = args;
    }

    // ====
    avatarType: scene_define.SAvatarType = scene_define.SAvatarType.NPC;

    get areaMgr(): AreaMgr {
        return this.m_objArgs[0];
    }
    get serverEntityData(): serverentity_define.IServerNpcProps {
        return this.m_objArgs[1];
    }

    set mapLayer(layerValue: map_define.SMapLayer) {
        // pass
    }
    get mapLayer(): map_define.SMapLayer {
        return this.m_objArgs[2];
    }

    constructor(args: TypeSceneNpcData) {
        super(args);
    }

    // ======== override =========
    get renderPriority(): number {
        return 0;
    }
}