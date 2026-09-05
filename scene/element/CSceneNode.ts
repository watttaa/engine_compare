import { serverentity_define } from "clientsdk/serverentity_define";
import { ds } from "common/ds";
import { map_define } from "lib/map/mapdefine";
import { AreaMgr } from "world/area/AreaMgr";
import { area_define } from "world/area/area_define";
import { ISceneNodeMonitor } from "world/scene/monitor/ISceneNodeMonitor";


export abstract class CSceneNode implements ds.ILinkNode, ISceneNodeMonitor {

    onRemove() {
        this.m_bVisible1 = true;
        this.m_bVisible2 = true;
        if (this.fullSp) {
            this.fullSp.visible = true;
        }

        this.renderVisible = true;
    }

    // =======
    abstract get renderPriority(): number;

    // =======
    // 实现ILinkNode接口
    // =======
    private m_objLink: ds.Link = null;
    private m_objPrevLinkNode: ds.ILinkNode = null;
    private m_objNextLinkNode: ds.ILinkNode = null;

    /**所在链表(CSceneNode所在的链表为AreaLink)*/
    public get link(): ds.Link {
        return this.m_objLink;
    }

    /**所在链表(SceneNode所在的链表为AreaLink)*/
    public set link(l: ds.Link) {
        this.m_objLink = l;
    }

    /**后继节点(CSceneNode)*/
    public get next(): ds.ILinkNode {
        return this.m_objNextLinkNode;
    }

    /**后继节点(CSceneNode)*/
    public set next(iln: ds.ILinkNode) {
        this.m_objNextLinkNode = iln;
    }

    /**前驱节点(CSceneNode)*/
    public get prev(): ds.ILinkNode {
        return this.m_objPrevLinkNode;
    }

    /**前驱节点(CSceneNode)*/
    public set prev(ilp: ds.ILinkNode) {
        this.m_objPrevLinkNode = ilp;
    }

    /**是否link管理 */
    public get bLinkMgr(): boolean {
        return true;
    }

    // =======
    private m_bVisible1: boolean = true;
    show() {
        this.m_bVisible1 = true;
        this.updateVisible();
    }
    hidden() {
        this.m_bVisible1 = false;
        this.updateVisible();
    }

    private m_bVisible2: boolean = true;
    setVisible2(value: boolean) {
        this.m_bVisible2 = value;

        this.updateVisible();
    }

    getVisible2(): boolean {
        return this.m_bVisible2;
    }

    private m_bRenderVisible: boolean = true;
    /**
     * @see: #42982 【自主】【优化】engine 添加渲染剔除属性
     * 搭配引擎renderVisible使用，就不需要同visible混淆了:
     * 因为有些逻辑会根据visible来进行特殊处理。而renderVisible则不会，它只是纯跳过渲染。
     * renderVisible不会涉及到，根据visible = false，屏蔽位移等逻辑运算。
     * 
     */
    set renderVisible(value: boolean) {
        this.m_bRenderVisible = value;

        if (!this.fullSp) {
            return;
        }

        this.fullSp.renderVisible = value;
    }
    get renderVisible(): boolean {
        return this.m_bRenderVisible;
    }

    protected updateVisible() {
        if (!this.fullSp) {
            return;
        }

        let _visual = this.isVisual;

        // if (area_define.debugArea) {
        //     if (_visual) {
        //         this.fullSp.tint = null;
        //     } else {
        //         this.fullSp.tint = 0x808080;
        //     }

        //     return;
        // }

        this.fullSp.visible = _visual;
        this.onNodeVisualChanged(_visual);
    }

    /** 节点可见性变化时通知组件层，子类可覆写 */
    protected onNodeVisualChanged(_visual: boolean) {
    }

    public get isVisual() {
        return this.m_bVisible1 && this.m_bVisible2;
    }

    updatePos() {
        this.areaMgr?.fixNodeAfterChangePos(this);
    }


    abstract get areaMgr(): AreaMgr;
    abstract get fullSp(): egret.DisplayObjectContainer;
    abstract get type(): map_define.SNodeType;
    abstract get layer(): map_define.SMapLayer;

    set x(value: number) {
        this.setX(value);
    }
    protected setX(value: number) {
        this.fullSp.x = value;
    }
    get x(): number {
        return this.fullSp.x;
    }

    set y(value: number) {
        this.setY(value);
    }
    protected setY(value: number) {
        this.fullSp.y = value;
    }
    get y(): number {
        return this.fullSp.y;
    }

    get pos() {
        return { x: this.x, y: this.y };
    }

    get parent() {
        return this.fullSp?.parent;
    }

    get name(): string {
        let nodeName = "unnamed";

        let serverEntityData = this.fullSp["serverEntityData"] as serverentity_define.IServerEntityProps;
        if (serverEntityData) {
            nodeName = serverEntityData.avatarStyle.name;
        }

        return nodeName;
    }

    get hashCode(): number {
        return this.fullSp.hashCode;
    }
}