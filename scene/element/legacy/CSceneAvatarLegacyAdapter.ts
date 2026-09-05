
// 用于解决无法继承CSceneNode的类，又想要像CSceneNode一样能被同样管理
// @see 设计模型中的适配器

import { pool } from "common/pool";
import { map_define } from "lib/map/mapdefine";
import { AreaMgr } from "world/area/AreaMgr";
import { CSceneNode } from "world/scene/element/CSceneNode";
import { CSceneAvatarLegacy } from "world/scene/element/legacy/CSceneAvatarLegacy";
import { scene_define } from "world/scene/scenedefine";

type TypeSceneAvatarAdapterLegacyData = [AreaMgr, CSceneAvatarLegacy, map_define.SMapLayer];
export class CSceneAvatarLegacyAdapter extends CSceneNode {

    // ===pool
    usePool: boolean;

    static __pool__ = "CSceneAvatarLegacyAdapter";
    static create(args: TypeSceneAvatarAdapterLegacyData): CSceneAvatarLegacyAdapter {
        let element: CSceneAvatarLegacyAdapter = pool.create(CSceneAvatarLegacyAdapter, args);
        return element;
    }
    onCreate() {
        // mike opt
        let fullSp = this.fullSp;
        let entityData = fullSp?.serverEntityData;
        if (entityData) {
            fullSp.x = entityData.posX;
            fullSp.y = entityData.posY;
        }

        this.areaMgr?.joinNode(this);
    }

    static remove(inst: CSceneAvatarLegacyAdapter) {
        pool.remove(inst);
    }
    onRemove() {
        super.onRemove();

        this.areaMgr?.leaveNode(this);

        this.m_objArgs = null;

    }

    protected onNodeVisualChanged(_visual: boolean) {
        this.fullSp?.updateFigureVisible();
    }
    onDispose() {
    }

    _new(args: TypeSceneAvatarAdapterLegacyData) {
        this.m_objArgs = args;
    }

    // ===
    private m_objArgs: TypeSceneAvatarAdapterLegacyData;

    constructor(args: TypeSceneAvatarAdapterLegacyData) {
        super();

        this._new(args);
    }


    // ====
    get areaMgr(): AreaMgr {
        return this.m_objArgs ? this.m_objArgs[0] : null;
    }

    public get fullSp() {
        return this.m_objArgs ? this.m_objArgs[1] : null;
    }

    public get type(): map_define.SNodeType {
        return map_define.SNodeType.avatar_adapter;
    }

    public get layer(): map_define.SMapLayer {
        return this.m_objArgs[2];
    }
    public set layer(layerValue: map_define.SMapLayer) {
        let oldLayerValue = this.m_objArgs[2];
        if (oldLayerValue == layerValue) {
            return;
        }
        this.m_objArgs[2] = layerValue;

        // 更换层级
        let scene = this.areaMgr.ctx;
        let layer = scene.getMapLayer(this.m_objArgs[2]);
        layer.addNode(this);
    }

    protected setX(value: number) {
        // do nothing
    }

    protected setY(value: number) {
        // do nothing
    }

    public get bLinkMgr(): boolean {
        if (this.fullSp.avatarType == scene_define.SAvatarType.MAIN_ROLE) {
            return false;
        }
        return true;
    }

    // ====
    get renderPriority(): number {
        if (this.fullSp) {
            return this.fullSp.renderPriority;
        }

        return 0;
    }
}