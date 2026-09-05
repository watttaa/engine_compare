import { s2_notify_cfg } from "auto/notify";
import { NotifyHelper } from "./NotifyHelper";
import { PRIORITY_FIRST, NotifyEntry, PRIO_LIMIT_CNT, PRIORITY_SPEC, NotifyEntryMap, NotifyLogger, NotifyBindDict, NotifyUIType, NotifyID, NotifyBindValue, RedPointStyles } from "./Const";
import { EventBus } from "lib/CommonEventMgr";
import { CommonEvent } from "event/CommonEventDefines";
import { NotifyMapper, NotifyMgr } from "./NotifyMgr";
import { NotifyBindChildMap } from "./NotifyBindMap";
/**
 * 亮着的红点树节点，树形存储，仅存储当前亮着的红点
 * 为什么要树形保存：
 *  因为样式优先级的需求，中间节点的样式 = 亮着的最大样式优先级的子孙节点的样式
 */

export abstract class NotifyTreeNodeBase {
    protected parent?: NotifyMidNodeBase
    protected $nodeKey: string
    /**上次触发变更事件状态
     * 叶子节点亮就创建灭就销毁
     * 但是中间节点创建后不一定是亮的状态 需要靠传递
     * 所以保存一下上次状态
     */
    protected lastEventData: [any, boolean, RedPointStyles] = [undefined, false, RedPointStyles.RED];
    private $isDisposed = false;

    protected static DisposeLeafQueue = [] as NotifyTreeNodeBase[];
    protected widgetSet = new Set<NotifyUIType>();
    protected isHided = false; // 自己被隐藏 或者某个父节点被隐藏

    constructor(nodeKey: string, parent?: NotifyMidNodeBase) {
        this.$nodeKey = nodeKey;
        this.parent = parent;
    }
    dispose() {
        NotifyLogger.debug(`dispose ${this.node} bindIds=`, this.bindIds)
        this.checkStateChange()
        // if (NotifyTreeNodeBase.NodeMap.get(this.nodeKey) === this) {
        //     NotifyTreeNodeBase.NodeMap.delete(this.nodeKey)
        // }
        this.$isDisposed = true;
        // 延迟dispose，否则有顺序问题
        // 两个子节点发过来，一个灭一个亮，处理到灭的时候
        // 中间节点被删除了（因为叶子dispose后，会级联往上检查dispose)
        // 那等到亮的子节点创建后，父节点没了
        if(this.isLeaf()) {
            NotifyTreeNodeBase.DisposeLeafQueue.push(this)
            preload_utils_calldelay.callLater(10, NotifyMidNodeBase.handleDisposeQueue)
        } else {
            this.disposeToParent()
        }

    }
    private disposeToParent(){
        const parent = this.parent
        this.parent = undefined
        parent?.$checkChildDispose(this)
    }
    private static handleDisposeQueue(){
        const arr = NotifyTreeNodeBase.DisposeLeafQueue
        NotifyTreeNodeBase.DisposeLeafQueue = []
        for (const node of arr) {
            node.disposeToParent()
        }
    }

    get isDisposed() {
        return this.$isDisposed;
    }
    get isRoot() {
        return this.node === "";
    }
    get node() {
        return this.$nodeKey;
    }
    /** 判断是leaf类还是mid类
     * 注意 配表是叶子的话 如果绑定了id，可能是mid也可能是leaf
     */
    public isLeaf(): this is (NotifyLeafNodeBase) {
        return this instanceof NotifyLeafNodeBase;
    }
    public isMid(): this is (NotifyMidNodeBase) {
        return this instanceof NotifyMidNodeBase;
    }
    /**在配表中 是否是叶子 */
    public isConfigLeaf(): this is (NotifyLeafNodeBase) {
        if (this.isRoot) {
            return false
        }
        return s2_notify_cfg.isLeafNode(this.node)
    }
    get stylePriority() {
        return s2_notify_cfg.getStylePriority(this.node);
    }
    get style(): RedPointStyles {
        if (!this.node) {
            return 0
        }
        let styles = s2_notify_cfg.getStyles(this.node);
        return styles[0]
    }
    get uiRef() {
        return s2_notify_cfg.getUIRef(this.node)
    }
    abstract get isRed(): boolean;
    get extra() {
        return undefined;
    }
    public isBind(): this is (NotifyBindLeafNode | NotifyBindMidNode) {
        return false
    }
    get bindIds(): NotifyID[] {
        return undefined
    }
    get logBindIds(): string {
        if (!this.bindIds) {
            return ""
        }
        return this.bindIds.map(x => `'${x}`).join(',');
    }
    public setHided(isHide: boolean) {
        if (isHide == this.isHided) {
            return
        }
        this.isHided = isHide
        this.checkStateChange()
        for (const child of this.iterChilds()) {
            child.setHided(isHide)
        }
    }
    public addWidget(ui: NotifyUIType): void {
        this.widgetSet.add(ui)
    }
    clear() {
        // NotifyTreeNodeBase.NodeMap.clear()
    }
    /**
     * 返回优先级最高的子节点 或者自己
     */
    abstract getMaxStylePriorityChild(): NotifyTreeNodeBase

    public getShowStyleExtra(): [RedPointStyles, any] {
        const node = this.getMaxStylePriorityChild()
        return [node.style, node.extra];
    }
    private hasExtra(){
        const lastExtra = this.lastEventData[0];
        return !NotifyHelper.isExtraEmpty(lastExtra) || !NotifyHelper.isExtraEmpty(this.extra)
    }
    private isStateChanged() {
        if (this.hasExtra()) {
            // 直接更新吧 不检查diff了
            return true
        }
        return this.lastEventData[1] !== this.isRed || this.lastEventData[2] !== this.getMaxStylePriorityChild().style;
    }
    protected checkStateChange(isForce: boolean = false) {
        // 没有uiref的情况下，一定要刷新 让父节点更新显示
        // 练功区奖励宝箱liangong.reward.num红点问题
        if (!isForce && !this.isStateChanged()) {
            return
        }
        const nowState = this.isRed
        this.lastEventData = [this.extra, nowState, this.getMaxStylePriorityChild().style]
        NotifyLogger.debug(`checkStateChange im=${this.node} state=${nowState} bind=${this.logBindIds}`)
        EventBus.dispatchEvent(new CommonEvent(CommonEvent.NOTIFY_STATE_CHANGED, [this, nowState]))
        this.parent?.checkStateChange(isForce || !this.uiRef)
        if (this.isMid()) {
            this.updateRelationNodes()
        }
    }
    /**
     * 更新关联节点
     * 处理中间节点关联到叶子节点的情况
     */
    protected updateRelationNodes() {
        if (!this.isMid()) {
            return
        }
        const nowState = this.isRed
        const entryList: NotifyEntry[] = []
        // NotifyLogger.debug(`[NotifyTreeNodeBase.updateRelationNodes] node=${this.node}`, "relationNodes", s2_notify_cfg.getRelationNode(this.node))
        for (const relatioinNode of s2_notify_cfg.getRelationNode(this.node)) {
            // 处理bind level
            const bindLevel = s2_notify_cfg.getBindLevel(relatioinNode)
            const bindIds = this.bindIds ?? []
            if (bindIds.length < bindLevel) {
                NotifyLogger.warn(`[NotifyTreeNodeBase.checkStateChange] bindIds.length < bindLevel node=${this.node} relatioinNode=${relatioinNode} bindIds=`, bindIds, "relaBindLevel=", bindLevel)
                continue
            }
            const relaBindIds = bindIds.slice(0, bindLevel)
            if (relaBindIds.length) {
                entryList.push({
                    leaf_node: relatioinNode,
                    extra: this.extra,
                    bindIds: NotifyHelper.updateBindIds({}, relaBindIds, {red: nowState, extra: this.extra}),
                })
            } else {
                entryList.push({
                    leaf_node: relatioinNode,
                    extra: this.extra,
                    state: nowState,
                })
            }
        }
        NotifyLogger.debug(`[NotifyTreeNodeBase.updateRelationNodes] node=${this.node} state=${nowState} bind=${this.logBindIds} entryList=`, entryList)
        NotifyMgr.getInstance().updateNotifies(entryList)
    }

    protected getValidNode(node: NotifyTreeNodeBase) {
        if (!this.node) {
            return null;
        }

        if (!this.uiRef && this.parent) {
            return this.parent.getValidNode(this.parent);
        }

        return node;
    }
    public getNodeExtra(node: string) {
        const treeNode = this.getNode(node)
        return treeNode?.extra || []
    }
    public abstract getAllLeaves<T>(): NotifyTreeNodeBase[];
    public abstract getAllLeaves<T>(map?: NotifyMapper<T>): T[];
    public getNode(node: string, bindIds?: NotifyID[]) {
        const pathMap = NotifyHelper.genPathMap(node)
        return this.getNodeImp(node, pathMap, bindIds ?? [])
    }
    public abstract getNodeImp(node: string, pathMap: Map<string, string>, bindIds: NotifyID[]): NotifyTreeNodeBase;

    public abstract iterChilds(): Generator<NotifyTreeNodeBase>;
    /**递归获取当前所有绑定状态 */
    public getBindObj(node: string, setRed?: boolean): NotifyBindDict {
        const result: NotifyBindDict = {}
        const pathMap = NotifyHelper.genPathMap(node)
        this._getBindObjImp(node, pathMap, result, setRed)
        return result
    }
    public _getBindObjImp(node: string, pathMap: Map<string, string>, result: NotifyBindDict, setRed?: boolean) { }
    /**
     * 不区分绑定节点，获取所有指定节点
     * @param node 
     */
    public getNodeList(node: string): NotifyTreeNodeBase[] {
        const result: NotifyTreeNodeBase[] = []
        const pathMap = NotifyHelper.genPathMap(node)
        this._getNodeListImp(node, pathMap, result)
        return result
    }
    public _getNodeListImp(node: string, pathMap: Map<string, string>, result: NotifyTreeNodeBase[]) {
        if (this.isLeaf()) {
            if (this.node === node) {
                result.push(this)
            }
        }
    }
}
export abstract class NotifyLeafNodeBase extends NotifyTreeNodeBase {
    /**记录上次实际影响层数，用于删除和更新 */
    private lastEffectCount = 0
    private effectCount = 0 // 被设置的层数
    private $extra?: any[]
    private state = false;
    /**
     * 样式优先级最高的子节点 key
     */

    constructor(nodeKey: string, parent?: NotifyMidNodeBase) {
        super(nodeKey, parent)
    }
    dispose() {
        NotifyLogger.debug(`dispose ${this.node}`)
        this.state = false
        if (this.lastEffectCount) {
            this.updateEffectCount()
        }
        super.dispose()
    }

    get isRoot() {
        return false
    }
    get stylePriority() {
        return s2_notify_cfg.getStylePriority(this.node)
    }
    get isRed() {
        return this.state && !this.isHided
    }
    get extra() {
        return this.$extra
    }
    public *iterChilds(): Generator<NotifyTreeNodeBase> {
    }
    /**
     * 返回优先级最高的子节点 或者自己
     */
    getMaxStylePriorityChild(): NotifyTreeNodeBase {
        return this
    }
    /**当前正确的影响层数 */
    private getEffectCount() {
        if (!this.isRed) {
            return 0
        }
        return this.effectCount
    }
    /** 
     * 根据向上传递次数向上传递
    */
    updateEffectCount() {
        const count = this.getEffectCount()
        egret.assert(count >= 0, "count必须大于等于0")
        // if (this.lastEffectCount === 0) {
        //     this.lastEffectCount = count
        //     // 向上传递
        //     this.parent?.setEffectCount(count - 1)
        // }

        if (count == this.lastEffectCount) {
            return
        }
        NotifyLogger.debug(`setEffectCount ${this.node} last=${this.lastEffectCount} set=${count}`)
        const oldCount = this.lastEffectCount
        this.lastEffectCount = count
        this.parent?.updateChildEffect(oldCount - 1, count - 1, this)
    }
    /**设置叶子节点数据 */
    setEntry(entry: NotifyEntry, extra?: any) {
        this.effectCount = entry.effectCount!
        this.$extra = extra ?? entry.extra
        // if (!this.bindIds) {
        //     this.bindIds = entry.bindIds || {}
        // } else if (entry.bindIds) {
        //     // 增量更新
        //     NotifyHelper.updateBindIds(this.bindIds, entry.bindIds)
        // }
        if (!entry.state && !entry.bindIds) {
            console.error(entry.state, `创建节点但是state false? entry=`, entry)
        }
        this.state = true
        this.isHided = NotifyMgr.getInstance().isNotifyHided(this.node, this.bindIds)
        this.updateEffectCount()
        this.checkStateChange()
    }
    public getAllLeaves<T>(): NotifyTreeNodeBase[];
    public getAllLeaves<T>(map?: NotifyMapper<T>): T[];
    public getAllLeaves<T>(map?: NotifyMapper<T>) {
        if (map) {
            return [map(this)]
        }
        return [this]
    }
    public setHided(isHide: boolean) {
        if (this.isHided === isHide) {
            return
        }
        this.isHided = isHide
        this.updateEffectCount()
        this.checkStateChange()
    }
}
export class NotifyNormalLeafNode extends NotifyLeafNodeBase {

    public getNodeImp(node: string, pathMap: Map<string, string>, bindIds: NotifyID[]): NotifyTreeNodeBase {
        if (node === this.node && !bindIds.length) {
            return this
        }
    }
}

export class NotifyBindLeafNode extends NotifyLeafNodeBase {
    private $bindIds: NotifyID[] = []
    get bindIds() {
        return this.$bindIds
    }
    public isBind(): this is NotifyBindLeafNode {
        return true
    }
    public bind(entry: NotifyEntry, bindIds: NotifyID[], bindValue: NotifyBindValue) {
        NotifyLogger.debug(`node=${this.node} bindValue=`, bindValue)
        if (!bindValue.red) {
            this.dispose()
            return
        }
        this.$bindIds = bindIds
        this.setEntry(entry, bindValue.extra)
    }
    public getNodeImp(node: string, pathMap: Map<string, string>, bindIds: NotifyID[]): NotifyTreeNodeBase {
        if (node === this.node && NotifyHelper.notifyIdsEq(this.bindIds, bindIds)) {
            return this
        }
    }

    public _getBindObjImp(node: string, pathMap: Map<string, string>, result: NotifyBindDict, setRed?: boolean) {
        if (node === this.node) {
            NotifyHelper.updateBindIds(result, this.bindIds, {red: setRed ?? this.isRed, extra: this.extra})
            // NotifyLogger.debug("_getBindObjImp", this.node, "bindIds=", this.bindIds, "result=", result)
        }
    }
}

/**中间节点 */
export abstract class NotifyMidNodeBase extends NotifyTreeNodeBase {
    protected childMap = new Map<string, NotifyTreeNodeBase>()

    /**子节点传上来的，如果处于影响范围内，就会+1 */
    private redCount = 0

    /**
     * 样式优先级最高的子节点 key
     */
    protected maxStylePriorityChild: string = ""
    protected maxStylePriorityChildBindIds: NotifyID[] = []

    constructor(nodeKey: string, parent?: NotifyMidNodeBase) {
        super(nodeKey, parent)
    }

    get isRoot() {
        return this.node === ""
    }
    get stylePriority() {
        return s2_notify_cfg.getStylePriority(this.node)
    }
    get isRed() {
        return this.redCount > 0 && !NotifyMgr.getInstance().isNotifyHided(this.$nodeKey, this.bindIds)
    }
    get bindLevel() {
        if (this.isRoot) {
            return 0
        }
        return s2_notify_cfg.getBindLevel(this.node)
    }

    clear() {
        for (const node of this.childMap.values()) {
            node.dispose()
        }
        this.childMap.clear()
    }
    public *iterChilds(): Generator<NotifyTreeNodeBase> {
        for (const node of this.childMap.values()) {
            yield node
        }
    }
    /**
     * 返回优先级最高的子节点 或者自己
     */
    getMaxStylePriorityChild(): NotifyTreeNodeBase {
        if (this.maxStylePriorityChild) {
            if (this.maxStylePriorityChild === this.node && NotifyHelper.notifyIdsEq(this.maxStylePriorityChildBindIds, this.bindIds)) {
                return this
            }
            // 缓存
            const childNode = this.getNode(this.maxStylePriorityChild, this.maxStylePriorityChildBindIds)
            if(childNode){
                // 不知道什么异步情况，这里可能拿不到
                return this.getNode(this.maxStylePriorityChild, this.maxStylePriorityChildBindIds)
            } else {
                this.maxStylePriorityChild = ""
            }
        }
        return this.recalcMaxStylePriorityChild()
    }
    private recalcMaxStylePriorityChild(): NotifyTreeNodeBase {
        let maxStyle = this.stylePriority
        let maxChild: NotifyTreeNodeBase = this
        for (const child of this.iterChilds()) {
            if (!child.isRed) {
                continue
            }
            const childMax = child.getMaxStylePriorityChild()
            if (childMax.stylePriority > maxStyle) {
                maxStyle = childMax.stylePriority
                maxChild = childMax
            }
        }
        this.maxStylePriorityChild = maxChild.node
        this.maxStylePriorityChildBindIds = maxChild.bindIds
        // NotifyLogger.debug(`recalcMaxStylePriorityChild ${this.node} max=${maxChild.node} bindIds=`, maxChild.bindIds)
        return maxChild
    }
    protected createNode(node: string, parent: NotifyMidNodeBase, isBind: boolean) {
        const isLeaf = s2_notify_cfg.isLeafNode(node)
        if (s2_notify_cfg.getBindLevel(node) > 0) {
            if (isLeaf) {
                return new NotifyBindLeafNode(node, parent)
            }
            return new NotifyBindMidNode(node, parent)
        }
        if (isLeaf) {
            return new NotifyNormalLeafNode(node, parent)
        }
        return new NotifyBindMidNode(node, parent)
    }
    /**
     * 
     * @param entry 要添加的
     * @param paths node路径
     * @param index 当前要添加的paths下标
     * @returns 叶子节点
     */
    protected _updateChild(entry: NotifyEntry): void {
        this.maxStylePriorityChild = ""
        const paths = entry.pathMap
        const childKey = paths.get(this.node)
        if (childKey === undefined) {
            NotifyLogger.warn("no child node?", paths, "entry=", entry, "mynode=", this.node)
            return
        }
        const entryBindLevel = NotifyHelper.getEntryBindLevel(entry)
        let child = this.childMap.get(childKey)
        if (child === undefined) {
            // child = new NotifyTreeNodeBase(childKey, this)
            child = this.createNode(childKey, this, entryBindLevel > 0)
            NotifyLogger.debug(`add child ${childKey} im=${this.node}`)
            this.childMap.set(childKey, child)
        }
        //  else if (child.nodeKey === entry.leaf_node) {
        //     NotifyLogger.debug("_addChild no need to create child=", child, "entry=", entry)
        // }
        if (child.isLeaf()) {
            child.setEntry(entry)
            return
        }
        (child as NotifyMidNodeBase)._updateChild(entry)
        // this.checkChildDispose(child)
    }
    /**
     * 注意 对于绑定id节点，删除也走这里
     */
    addChildByEntry(entry: NotifyEntry) {
        egret.assert(this.isRoot, "只支持根节点")
        egret.assert(entry.leaf_node != "", "空节点？")
        if (!entry.pathMap) {
            entry.pathMap = NotifyHelper.genPathMap(entry.leaf_node)
        }
        this._updateChild(entry)
    }
    /**
     * 
     * @param node 要删除的节点
     * @param paths node路径
     * @param index 当前要删除的paths下标
     * @returns 
     */
    private _delChild(node: string, pathMap: Map<string, string>): boolean {
        const childKey = pathMap.get(this.node)
        let child = this.childMap.get(childKey)
        if (child === undefined) {
            NotifyLogger.debug(`not exists child im ${this.node} childKey=${childKey}`)
            return false
        }
        if (child instanceof NotifyLeafNodeBase) {
            child.dispose()
            // this.checkChildDispose(child)
            return
        }
        const midChild = child as NotifyMidNodeBase
        const result = midChild._delChild(node, pathMap)
        if (result) {
            this.maxStylePriorityChild = ""
            // 级联删除节点
            // this.checkChildDispose(child)
        }
        return result
    }
    public getChlidCount() {
        return this.childMap.size
    }
    public $checkChildDispose(child: NotifyTreeNodeBase) {
        if (child.isDisposed) {
            NotifyLogger.debug(`checkChildDispose delete child ${child.node} im=${this.node}`)
            this.childMap.delete(child.node)
        }
        if (!this.getChlidCount()) {
            this.dispose()
        }
    }
    delChild(node: string): NotifyTreeNodeBase[] {
        NotifyLogger.debug(`delChild node=${node}`)
        egret.assert(this.isRoot, "只支持根节点")
        egret.assert(s2_notify_cfg.isLeafNode(node), "只支持删除叶子")
        const pathMap = NotifyHelper.genPathMap(node)
        const ret: NotifyTreeNodeBase[] = []
        this._delChild(node, pathMap)
        return ret
    }
    /**
     * 内部方法 
     * 从叶子传上来的影响层数
     * 中间节点没有影响层数概念 只有子类亮了几个的概念 只做传递
     * 根据count的变化修改上层redCount
     */
    public updateChildEffect(oldCount: number, newCount: number, leaf: NotifyTreeNodeBase) {
        // NotifyLogger.debug(`updateChildEffect ${this.node} leave=${leaf.node} oldCount=${oldCount} newCount=${newCount} my count:${this.redCount}`)
        // NotifyLogger.debug(`updateChildEffect2 maxStyle=`, this.maxStylePriorityChild, "bindIds", this.maxStylePriorityChildBindIds)
        egret.assert(!this.isLeaf(), "只能中间节点调用")
        if (oldCount <= 0 && newCount <= 0) {
            return
        }
        if (oldCount <= 0) {
            // 之前没有，现在有了
            this.redCount += 1
        } else if (newCount <= 0) {
            // 之前有现在没有
            this.redCount -= 1
        }
        // else就是保持原样
        this.parent?.updateChildEffect(oldCount - 1, newCount - 1, leaf)
        // XXX 这里一定要更新Count之后 再检查状态更新 不然重算maxChildStyle有问题
        this.checkStateChange()
    }
    update(notifyMap: NotifyEntryMap) {
        for (const entry of notifyMap.values()) {
            if (NotifyHelper.isRed(entry) || NotifyHelper.getEntryBindLevel(entry) > 0) {
                this.addChildByEntry(entry)
            } else {
                this.delChild(entry.leaf_node)
            }
        }
    }
    public getAllLeaves<T>(): NotifyTreeNodeBase[];
    public getAllLeaves<T>(map?: NotifyMapper<T>): T[];
    public getAllLeaves<T>(map?: NotifyMapper<T>) {
        const result = [...this.childMap.values()].reduce((result, node) => {
            result.push(...node.getAllLeaves(map))
            return result
        }, [])
        return result
    }
}

/** 普通中间节点 没有绑定id */
// export class NotifyNormalMidNode extends NotifyMidNodeBase {
// public getNodeImp(node: string, pathMap: Map<string, string>, bindIds: NotifyID[]): NotifyTreeNodeBase {
//     if (node === this.node && !bindIds.length) {
//         return this
//     }
//     const childKey = pathMap.get(this.node)
//     const child = this.childMap.get(childKey)
//     if(!child) {
//         return
//     }
//     return child.getNodeImp(node, pathMap, bindIds)
// }
// }

/** 绑定id的 */
export class NotifyBindMidNode extends NotifyMidNodeBase {
    private bindChildMap = new NotifyBindChildMap<NotifyTreeNodeBase>()
    private $bindIds: NotifyID[] = []
    get bindIds() {
        return this.$bindIds
    }
    public isBind(): this is NotifyBindMidNode {
        return true
    }
    public getChlidCount() {
        return this.childMap.size + this.bindChildMap.size
    }
    public $checkChildDispose(child: NotifyTreeNodeBase) {
        if (child.isDisposed) {
            const childBindIds = child.bindIds
            if (this.bindIds && childBindIds && this.bindIds.length + 1 === childBindIds.length) {
                const subId = childBindIds[childBindIds.length - 1]
                this.bindChildMap.delChild(child.node, subId)
                NotifyLogger.debug(`checkChildDispose delete child ${child.node} subId=${subId} im=${this.node}`)
            }
        }
        super.$checkChildDispose(child)
    }
    public *iterChilds(): Generator<NotifyTreeNodeBase> {
        for (const node of this.bindChildMap.iterChilds()) {
            yield node
        }
        for (const node of this.childMap.values()) {
            yield node
        }
    }
    public bind(entry: NotifyEntry, bindIds: NotifyID[], bindValue: NotifyBindValue) {
        this.$bindIds = bindIds
        this._updateBindChild(entry, bindIds, bindValue)
    }
    /**
     * 
     * @param entry 要添加的
     * @param paths node路径
     * @param index 当前要添加的paths下标
     * @returns 叶子节点
     */
    protected _updateChild(entry: NotifyEntry) {
        if (!entry.bindIds || entry.bindIds.length) {
            return super._updateChild(entry)
        }
        return this._updateBindChild(entry, this.bindIds, entry.bindIds)
    }
    /**
     * 递归添加绑id节点
     * 比如，节点a.b 绑定层级2, entry.node == a.b.c.d，绑定id {1: {2 : true}}
     *      那么将创建a.b.c 绑定id 1，(value = {2: true})
     *      接着在a.b.c下递归创建a.b.c.d 绑定id 2
     * @param entry 
     * @param paths 
     * @param index 
     * @param bindIds 
     * @param bindValue 
     */
    protected _updateBindChild(entry: NotifyEntry, bindIds: NotifyID[], bindValue: NotifyBindValue) {
        const entryBindLevel = NotifyHelper.getEntryBindLevel(entry)
        if (entryBindLevel < this.bindLevel) {
            NotifyLogger.warn(`notify bind level error, should >= ${this.bindLevel} but ${entryBindLevel} node=${this.node}`)
            return
        }

        this.maxStylePriorityChild = ""
        if (this.bindIds.length && !NotifyHelper.notifyIdsEq(this.bindIds, bindIds)) {
            NotifyLogger.warn(`old id=${this.bindIds} newid=${bindIds} node=${this.node} set=`, entry)
        }
        const childKey = entry.pathMap.get(this.node)
        const childBindLevel = s2_notify_cfg.getBindLevel(childKey)
        const myBindLevel = this.bindLevel
        NotifyLogger.debug(`mynode=${this.node} myBindLevel=${myBindLevel} childBindLevel=${childBindLevel}`, "bindIds=", bindIds, `entry=`, entry)
        // 绑定id层级一定等越来越多的
        // 这里限定 子节点绑定层级只能和当前一样或者加一级
        if (childBindLevel < myBindLevel || childBindLevel > myBindLevel + 1) {
            NotifyLogger.warn(`bind level error mylv=${myBindLevel} mynode=${this.node} childlv=${childBindLevel} set=`, entry)
            return
        }
        if (childBindLevel == myBindLevel + 1) {
            if (typeof bindValue === 'object') {
                this._updateBindChildAddLevel(entry, bindIds, bindValue as NotifyBindDict)
            } else {
                // 前面应该判断过 这里不会出现
                NotifyLogger.warn(`红点绑定层级错误？ node=${this.node} 下一层级 ${childBindLevel} entry=`, entry)
            }
        } else if (childBindLevel == myBindLevel) {
            this._updateBindChildSameLevel(entry, bindIds, bindValue)
        }
    }
    /** 
     * 更新子节点 绑定层级加深
     */
    protected _updateBindChildAddLevel(entry: NotifyEntry, bindIds: NotifyID[], bindObj: NotifyBindDict) {
        const childKey = entry.pathMap.get(this.node)
        const entryBindLevel = NotifyHelper.getEntryBindLevel(entry)
        const childBindLevel = s2_notify_cfg.getBindLevel(childKey)
        for (const subId in bindObj) {
            const subBindObj = bindObj[subId]
            let child = this.bindChildMap.getChild(childKey, subId)
            if (child === undefined) {
                if (!subBindObj || (entryBindLevel === childBindLevel && !subBindObj.red)) {
                    // 服务器首次红点，可能发false，这时候不处理
                    NotifyLogger.debug(`_updateBindChildAddLevel not red skip node=${this.node} bind child ${childKey} id=${[...bindIds, subId]} subObj=`, subBindObj)
                    continue
                }
                child = this.createNode(childKey, this, true)
                this.bindChildMap.addChild(childKey, subId, child)
            }
            if (!child.isBind()) {
                NotifyLogger.warn(`child not bind? node=${childKey} entry=`, entry)
                continue
            }
            NotifyLogger.debug(`_updateBindChildAddLevel node=${this.node} bind child ${childKey} id=${[...bindIds, subId]} subObj=`, subBindObj)
            child.bind(entry, [...bindIds, subId], subBindObj)
            if (child.isDisposed) {
                this.bindChildMap.delChild(childKey, subId)
            }
        }
        if (!this.bindChildMap.size && !this.childMap.size) {
            this.dispose()
        }
    }
    /** 
     * 更新子节点 绑定层级相同
     */
    protected _updateBindChildSameLevel(entry: NotifyEntry, bindIds: NotifyID[], bindValue: NotifyBindValue) {
        this.maxStylePriorityChild = ""
        const paths = entry.pathMap
        const childKey = paths.get(this.node)
        if (childKey === undefined) {
            NotifyLogger.warn("no child node?", paths, "entry=", entry, "mynode=", this.node)
            return
        }
        let child = this.childMap.get(childKey)
        if (child === undefined) {
            // 子节点一定是绑定的
            child = this.createNode(childKey, this, true)
            NotifyLogger.debug(`add child ${childKey} im=${this.node}`)
            this.childMap.set(childKey, child)
        }
        if (!child.isBind()) {
            NotifyLogger.warn(`child not bind? node=${childKey} entry=`, entry)
            return;
        }
        child.bind(entry, this.bindIds, bindValue);
    }
    public getNodeImp(node: string, pathMap: Map<string, string>, bindIds: NotifyID[]): NotifyTreeNodeBase {
        const childKey = pathMap.get(this.node)
        if (this.bindIds.length > bindIds.length) {
            NotifyLogger.warn(`bind id level not expected my=${this.bindIds} arg=${bindIds}`)
            return
        }
        // NotifyLogger.debug(`node=${node} this=${this.node} thisbinds=${this.bindIds} child=${childKey} pathMap=`, pathMap)
        if (this.bindIds.length == bindIds.length) {
            return this.getNodeImpNormal(node, pathMap, bindIds)
        }
        const subId = bindIds[this.bindIds.length]
        // NotifyLogger.debug(`subid=${subId}`, this.bindChildMap)
        const child = this.bindChildMap.getChild(childKey, subId)
        if (child) {
            return child.getNodeImp(node, pathMap, bindIds)
        }
        return this.getNodeImpNormal(node, pathMap, bindIds)
    }
    private getNodeImpNormal(node: string, pathMap: Map<string, string>, bindIds: NotifyID[]): NotifyTreeNodeBase {
        if (node === this.node) {
            if (NotifyHelper.notifyIdsEq(this.bindIds, bindIds)) {
                return this
            }
            return
        }
        const child = this.childMap.get(pathMap.get(this.node))
        if (!child) {
            return
        }
        return child.getNodeImp(node, pathMap, bindIds)
    }

    public _getBindObjImp(node: string, pathMap: Map<string, string>, result: NotifyBindDict, setRed?: boolean) {
        const childNode = pathMap.get(this.node)
        const subNode = this.childMap.get(childNode)
        if (subNode) {
            subNode._getBindObjImp(node, pathMap, result, setRed)
        }
        for (const [_, bindChild] of this.bindChildMap.iterBindChilds(childNode)) {
            bindChild._getBindObjImp(node, pathMap, result, setRed)
        }
    }
    public _getNodeListImp(node: string, pathMap: Map<string, string>, result: NotifyTreeNodeBase[]): void {
        const childNode = pathMap.get(this.node)
        const subNode = this.childMap.get(childNode)
        if (subNode) {
            subNode._getNodeListImp(node, pathMap, result)
        }
        for (const [_, bindChild] of this.bindChildMap.iterBindChilds(childNode)) {
            bindChild._getNodeListImp(node, pathMap, result)
        }
    }
    public getAllLeaves<T>(): NotifyTreeNodeBase[];
    public getAllLeaves<T>(map?: NotifyMapper<T>): T[];
    public getAllLeaves<T>(map?: NotifyMapper<T>) {
        const result = [...this.childMap.values()].reduce((result, node) => {
            result.push(...node.getAllLeaves(map))
            return result
        }, [])
        for (const child of this.bindChildMap.iterChilds()) {
            result.push(...child.getAllLeaves(map))
        }
        return result
    }
}