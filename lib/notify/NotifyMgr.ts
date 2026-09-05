import { NotifyEntry, NotifyID, NotifyLogger, NotifyUIType, PRIORITY_FIRST, RedPointStyles } from "./Const";
import { s2_notify_cfg } from "auto/notify";
import { NotifyHelper } from "./NotifyHelper";
import { NotifyPrioMgr } from "./NotifyPrioMgr";
import { HeroMainEvent, HeroMainEventBus } from "heroMain/HeroMainEvent";
import { NotifyHideMgr } from "./NotifyHideMgr";
import { HeroMainModel } from "heroMain/HeroMainModel";
import { s2_global_value_cfg } from "auto/global_value";
import { NotifyCNet } from "net/NotifyCNet";
import { NotifyUIMgr } from "./NotifyUIMgr";
import { NotifyTreeNodeBase, NotifyBindMidNode } from "./NotifyTreeNode";

/** 红点管理器 总入口 */
export class NotifyMgr extends SingletonClassEx {

    /**
     * 某些条件 导致隐藏的红点 比如
     *  openui
     *  新手期间
     *  gm全局开关
     */
    private condHideMap = new Map<string, NotifyEntry>()
    /**用户隐藏逻辑 不包括等级限制等隐藏 */
    private hideMgr = new NotifyHideMgr()
    private prioMgr = new NotifyPrioMgr()
    private tree = new NotifyBindMidNode("")
    private lastEnable = false // 新手全局控制 上一次状态
    start() {
        ServerTimerMgr.getInstance().addEventListener(ServerTimerEvent.ACROSS_DAY, this.tryReleaseCondHide, this);
        HeroMainEventBus.getInstance().addEventListener(HeroMainEvent.HEROINFOUPDATE, this.tryReleaseCondHide, this);
    }
    destroy(): void {
        this.condHideMap.clear()
        this.hideMgr.clear()
        this.prioMgr.destroy()
        this.tree.clear()
        ServerTimerMgr.getInstance().removeEventListener(ServerTimerEvent.ACROSS_DAY, this.tryReleaseCondHide, this);
        HeroMainEventBus.getInstance().removeEventListener(HeroMainEvent.HEROINFOUPDATE, this.tryReleaseCondHide, this);
    }
    /**
     * 更新红点，可能是服务器传来的也可能客户端触发
     */
    updateNotifies(notifies: NotifyEntry[], isAll = false) {
        this.checkEnableChange()
        NotifyLogger.debug("raw notifies", notifies)
        notifies = this.filterAndExtendRelationNodes(notifies)
        NotifyLogger.debug("notifies", notifies)
        const notifyMap = this.prioMgr.update(notifies, isAll)
        NotifyLogger.debug("notifyMap", notifyMap)
        this.tree.update(notifyMap)
    }
    public get enabled() { return this.isGlobalShowRed(); }
    // public set enabled(value: boolean) {
    //     this.$enabled = value
    //     this.tryReleaseCondHide()
    // }
    /**新手等级期间，除引导中外，不显示红点 */
    public isGlobalShowRed() {
        let level = HeroMainModel.getInstance().levelId;
        let start = s2_global_value_cfg.GlobalValueInfo["G_NOVICE_REDPOINT"];
        let end = s2_global_value_cfg.GlobalValueInfo["G_NOVICE_REDPOINT_INVALID"];
        return start <= level && level < end;
    }
    private checkEnableChange(){
        const enable = this.isGlobalShowRed()
        if (enable != this.lastEnable) {
            this.lastEnable = enable
            NotifyUIMgr.getInstance().setShowRed(enable)
        }
    }
    private checkNotifyOpenUI(entry: NotifyEntry, save = true): boolean {
        // 新手限制期间，也会走红点逻辑，只是alpha==0
        // if (!this.isGlobalShowRed()) {
        //     if (save) {
        //         this.condHideMap.set(entry.leaf_node, entry)
        //     }
        //     return false
        // }
        const nodeList = NotifyHelper.splitNodePath(entry.leaf_node);
        // 如果挂钩了openui，则判断openui是否开启
        if (nodeList.some(v => !NotifyHelper.isTreeNodeLegal(v))) {
            // 未开启，则先存起来，等openui开启后再重新触发
            NotifyLogger.debug(`notify not open ${entry.leaf_node}`)
            if (save) {
                this.condHideMap.set(entry.leaf_node, entry)
            }
            return false
        }
        return true
    }
    /**重新检查因为各种条件隐藏的红点，合法的更新出去 */
    private tryReleaseCondHide() {
        if (!this.isGlobalShowRed()) {
            return
        }
        const delList = [] as NotifyEntry[]
        for (const [_, entry] of this.condHideMap) {
            if (this.checkNotifyOpenUI(entry, false)) {
                delList.push(entry)
            }
        }
        for (const entry of delList) {
            this.condHideMap.delete(entry.leaf_node)
        }
        this.updateNotifies(delList)
    }
    /**把服务端发的数据 过滤非法数据 加上关联节点数据 */
    private filterAndExtendRelationNodes(notifies: NotifyEntry[]) {
        const validList: typeof notifies = []
        for (const entry of notifies) {
            if (!s2_notify_cfg.isLeafNode(entry.leaf_node)) {
                NotifyLogger.error(`[NotifyPrioMgr.update] ${entry.leaf_node} is not leaf`);
                continue
            }
            if (!this.checkNotifyOpenUI(entry)) {
                continue
            }
            let priority = s2_notify_cfg.getShowPriority(entry.leaf_node);
            if (priority < PRIORITY_FIRST) {
                NotifyLogger.debug(`[RedPointTreeStorage.saveEntries] ${entry.leaf_node}'s priority(${priority}) is error`);
                debug_helper.showError("RedPointError", "", `${entry.leaf_node}的显示优先级不应该配为${priority}`);
            }
            if (entry.isAll) {
                // 绑定节点 服务器发来全量的，需要把之前的缓存全带上
                const bindObj = this.tree.getBindObj(entry.leaf_node, false)
                // NotifyLogger.debug("isAll", entry.leaf_node, bindObj, entry.bindIds)
                NotifyHelper.updateBindObj(entry.leaf_node, bindObj, entry.bindIds)
                // NotifyLogger.debug("isAll updated", entry.leaf_node, bindObj)
                entry.bindIds = bindObj
            }
            validList.push(entry)

            for (const relatioinNode of s2_notify_cfg.getRelationNode(entry.leaf_node)) {
                validList.push({
                    leaf_node: relatioinNode,
                    state: entry.state,
                    extra: entry.extra,
                })
            }
        }
        return validList
    }
    /** 玩家改变节点的隐藏状态 */
    public setNodeHideState(node: string, isHide: boolean, notifyIds?: NotifyID[], from_server=false) {
        if(!from_server){
            NotifyCNet.C_SKIP_NOTIFY_SETTING(NotifyHelper.nodeToHideStr(node, notifyIds), isHide);
        }
        this.hideMgr.setNodeHideState(node, isHide, notifyIds)
        const treeNode = this.tree.getNode(node, notifyIds)
        NotifyLogger.debug(`[setNodeHideState] ${node} notifyIds=`, notifyIds, "isHide=", isHide)
        if (!treeNode) {
            // 正常情况
            return
        }
        treeNode.setHided(isHide)
        // const ok = this.hideMgr.setNodeHideState(node, isHide, notifyIds)
        // if (!ok) {
        //     return
        // }
        
    }
    /** 是否被玩家隐藏 */
    public isNotifyHided(node: string, notifyIds?: NotifyID[]) {
        return this.hideMgr.isNotifyHided(node, notifyIds)
    }
    public getNotifyExtra(node: string) {
        return this.tree.getNodeExtra(node)
    }
    public getNotifyStyleExtra(node: string, bindIds?: NotifyID[]) {
        return this.tree.getNode(node, bindIds)?.getShowStyleExtra() || [RedPointStyles.NONE, []]
    }
    public isNotifyRed(node: string, bindIds?: NotifyID[]) {
        return this.tree.getNode(node, bindIds ?? [])?.isRed || false
    }
    public isUIRed(node: string, ui: NotifyUIType) {
        let bindIds = undefined
        if (ui instanceof egret.DisplayObject) {
            bindIds = ui.notifyIds
        }
        return this.isNotifyRed(node, bindIds)
    }
    public addWidget(node: string, ui: NotifyUIType) {
        if (!(ui instanceof egret.DisplayObject)) {
            NotifyLogger.warn(`not display object? node=${node} ui=`, ui)
            return
        }
        return this.tree.getNode(node, ui.notifyIds)?.addWidget(ui)
    }
    /**服务器保存了哪些红点需要隐藏 */
    public onNotifySettingUpdate(nodes: string[]) {
        const from_server = true
        for(const notifyIds of nodes) {
            const [node, bindIds] = NotifyHelper.strToHideNode(notifyIds)
            this.setNodeHideState(node, true, bindIds, from_server)
        }
    }
    /**遍历所有节点 */
    public iterAllNodes() {
        return this.tree.iterChilds()
    }
    // 重载签名1：当提供map参数时
    public getRedLeaves<T>(node: string, map: NotifyMapper<T>): T[];

    // 重载签名2：当不提供map参数时
    public getRedLeaves(node: string): NotifyTreeNodeBase[];

    // 实现签名
    public getRedLeaves<T>(node: string, map?: NotifyMapper<T>): T[] | NotifyTreeNodeBase[] {
        // 函数实现
        // 根据是否有map参数，返回相应的数组
        const treeNode = this.tree.getNode(node)
        return treeNode?.getAllLeaves(map) || []
    }
    public showAllRedTreeNode() {
        NotifyUIMgr.getInstance().showAllRedTreeNode();
    }
}
export type NotifyMapper<T> = (n: NotifyTreeNodeBase) => T