import { pool } from "common/pool";
import { map_define } from "lib/map/mapdefine";
import { AreaMgr } from "world/area/AreaMgr";
import { CSceneNode } from "world/scene/element/CSceneNode";

// mike todo: 先占个坑，暂时未完成
type TypeSceneAniData = [AreaMgr, map_define.SMapLayer];
export class CSceneAni extends CSceneNode {

    // ===pool
    usePool: boolean;

    static __pool__ = "CSceneAni";
    static create(args: TypeSceneAniData): CSceneAni {
        let element: CSceneAni = pool.create(CSceneAni, args);
        return element;
    }
    onCreate() {
        this.areaMgr?.joinNode(this);
    }

    static remove(inst: CSceneAni) {
        pool.remove(inst);
    }
    onRemove() {
        super.onRemove();

        this.areaMgr?.leaveNode(this);

        this.m_objArgs = null;

    }
    onDispose() {
    }

    _new(args: TypeSceneAniData) {
        this.m_objArgs = args;
    }

    // ===
    private m_objArgs: TypeSceneAniData;

    private root: egret.DisplayObjectContainer;

    constructor(args: TypeSceneAniData) {
        super();

        this.root = new egret.DisplayObjectContainer();

        this._new(args);
    }


    // ====
    get areaMgr(): AreaMgr {
        return this.m_objArgs ? this.m_objArgs[0] : null;
    }

    public get fullSp() {
        return this.root || null;
    }

    public get type(): map_define.SNodeType {
        return map_define.SNodeType.ani;
    }

    public get layer(): map_define.SMapLayer {
        return this.m_objArgs[1];
    }

    public get bLinkMgr(): boolean {
        return true;
    }

    // ====
    get renderPriority(): number {
        return 1;
    }
}