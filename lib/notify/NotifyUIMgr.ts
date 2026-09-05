import { NotifyHelper } from "./NotifyHelper";
import { s2_notify_cfg } from "auto/notify";
import { BaseWidgetCommonEvent, CommonEvent } from 'event/CommonEventDefines';
import { EventBus } from "lib/CommonEventMgr";
import { NotifyCNet } from "net/NotifyCNet";
import { NotifyUIType, NotifyIDChangeData, NotifyLogger, RedPointStyles, NotifySkinConf, NotifyID } from "./Const";
import { NotifyMgr } from "./NotifyMgr";
import { NotifyConfMgr } from "./NotifyConfMgr";
import { DeepMap } from "common/DeepMap";
import { NotifyTreeNodeBase } from "./NotifyTreeNode";

/**
 * 管理已经创建的ui实例和红点数据
 */
export class NotifyUIMgr extends SingletonClassEx {
    // private static $frameMaxNum = 5; // 帧处理的最大数量
    // private static $instance = null;

    // private $notifyWidgetMap = new Map<string, Set<NotifyUIType>>(); // 树节点对应的组件
    private $notifyWidgetMap = new DeepMap<NotifyID, Set<NotifyUIType>>(String); // 树节点对应的组件
    /**ui映射到节点 */
    // private uiMap = new WeakMap<NotifyUIType, string>();
    // private $treeNodeExtraMap: dataStructure.Map; // 树节点对应的数据
    // private $treeNodeCountMap: dataStructure.Map; // 树节点红点激活引用数

    // private $openuiHideNodes = new Set<string>; // openui未开启而隐藏的叶子节点

    /**每20秒清理红点的 */
    private $expireTimer: egret.Timer;

    // /** 隐藏的树节点 */
    // private $skipTreeNodeList: string[];

    // private $processor: MutiFrameDataProc; // 分帧处理器
    private hideRed: boolean = true // 默认隐藏，UIMgr那边会开启

    /** 是否启用多链式红点配置（如 A.B.C.D），默认开启，开启后走 safeInvokeFunc 递归遍历 */
    private $enableMultiChain = true;

    constructor() {
        super();
        // this.$treeNodeCountMap = new dataStructure.Map();
        // this.$treeNodeExtraMap = new dataStructure.Map();
        // this.$skipTreeNodeList = [];

        this.$expireTimer = new egret.Timer(20000, 0);
        this.$expireTimer.addEventListener(egret.TimerEvent.TIMER, this.tryExpireUI, this);

        // this.$processor = new MutiFrameDataProc(this._onProcess, this, null, null, { chunkLen: NotifyUIMgr.$frameMaxNum });

        // 指定参数关闭
        if (egret.runEgretOptionsIns.config["disableMultiChain"]) {
            this.$enableMultiChain = false;
        }
    }
    start() {
        BaseWidgetEventManager.getInstance().addEventListener(BaseWidgetCommonEvent.ON_REGISTE_REDPOINT, this.onBaseWidgetRegisteHandler, this);
        BaseWidgetEventManager.getInstance().addEventListener(BaseWidgetCommonEvent.ON_DEL_REDPOINT, this.onBaseWidgetDestroyHandler, this);
        EventBus.addEventListener(CommonEvent.NOTIFY_STATE_CHANGED, this.onNotifyStateChanged, this)
        EventBus.addEventListener(CommonEvent.NOTIFY_ID_CHANGED, this.onNotifyIDChanged, this)
        this.$expireTimer.start();

        if (DEV) {
            leak_sentinel.registerClean("NotifyUIMgr", () => this.tryExpireUI(null));
            leak_sentinel.registerDump("NotifyUIMgr", () => this.dump());
        }
    }

    destroy(): void {
        BaseWidgetEventManager.getInstance().removeEventListener(BaseWidgetCommonEvent.ON_REGISTE_REDPOINT, this.onBaseWidgetRegisteHandler, this);
        BaseWidgetEventManager.getInstance().removeEventListener(BaseWidgetCommonEvent.ON_DEL_REDPOINT, this.onBaseWidgetDestroyHandler, this);
        EventBus.removeEventListener(CommonEvent.NOTIFY_STATE_CHANGED, this.onNotifyStateChanged, this);
        EventBus.removeEventListener(CommonEvent.NOTIFY_ID_CHANGED, this.onNotifyIDChanged, this)
        this.$expireTimer.stop();

        if (DEV) {
            leak_sentinel.unregisterClean("NotifyUIMgr");
            leak_sentinel.unregisterDump("NotifyUIMgr");
        }
    }

    private onBaseWidgetDestroyHandler(e: BaseWidgetCommonEvent) {
        NotifyHelper.delNoStage();
    }
    /**
     * 业务通过this.notifyID 绑定红点id
     * @param e
     */
    private onNotifyIDChanged(e: CommonEvent) {
        let [widget, oldIds, newIds] = e.data as NotifyIDChangeData

        NotifyLogger.debug("onNotifyIDChanged", `old=${oldIds} new=${newIds}`, "widget=", widget)
        const [component, node] = this.findWidgetNode(widget)
        if (!node) {
            // this.findWidgetNode(widget)
            NotifyLogger.debug("onNotifyIDChanged", `node not found parent=`, widget.parent)
            return
        }

        safeInvokeFunc(widget, () => {
            this._removeWidgetPointInMap(node, widget, oldIds)
            this._addWidgetPointInMap(node, widget);
        })
    }
    /**
     * 检查这个widget树路径 是否和对应的表格配置是同一个
     * 因为widget没有保存name(就是widget = parent[name] widget拿不到这个name 外放会被擦除)
     * 所以只能用这种办法来从上往下检查
     * 由于配表数据不会很多所以应该效率还行
     * @param widgets 
     * @param conf 
     * @returns 
     */
    private isWidghtsEqSkinConf(nowWidget: NotifyUIType, leafWidget: NotifyUIType, widgets: Set<NotifyUIType>, conf: NotifySkinConf): boolean {
        const paths = conf.childPaths
        if (conf.bindID || !widgets.size) {
            return false
        }
        if (!paths.length) {
            return true
        }
        for (const prop of paths) {
            nowWidget = nowWidget[prop]
            if (!widgets.has(nowWidget)) {
                return false
            }
        }
        return leafWidget === nowWidget
    }
    /**向上找到一个widget的node */
    private findWidgetNode(widget: NotifyUIType): [eui.Component, string] | undefined {
        let nowWidget = widget
        const widgetSet = new Set<NotifyUIType>()
        while (nowWidget) {
            widgetSet.add(nowWidget)
            if (!(nowWidget instanceof eui.Component)) {
                nowWidget = nowWidget.parent
                continue
            }
            const skinName = nowWidget.skinName
            const confs = NotifyConfMgr.getInstance().getSkinConfs(skinName)
            if (!confs || !confs.length) {
                nowWidget = nowWidget.parent
                continue
            }
            NotifyLogger.debug(`skinName=${skinName}`, "widgets", widgetSet, "confs", confs)
            for (const conf of confs) {
                if (this.isWidghtsEqSkinConf(nowWidget, widget, widgetSet, conf)) {
                    return [nowWidget, conf.node]
                }
            }
            break // 配表应该不会嵌套两个皮肤
        }
        return [undefined, undefined]
    }

    /**
     * 递归安全遍历 childPaths 链式子控件，最终在叶节点上执行 action。
     * 每一层用 safeInvokeFunc 包裹，确保子控件皮肤未加载时不会崩溃。
     * @param widget 当前层控件
     * @param names  剩余路径（含末节点）
     * @param action 叶节点的执行动作
     * @param skinName 用于报错提示
     * @param fullPaths 完整路径列表，仅用于报错提示
     */
    private $resolveChildPaths(
        widget: any,
        names: string[],
        action: (leafWidget: any) => void,
        skinName: string,
        fullPaths: string[],
    ) {
        if (names.length === 0) {
            // 已到达叶节点
            safeInvokeFunc(widget, () => action(widget));
            return;
        }
        const name = names[0];
        const child = widget[name];
        if (!child) {
            NotifyLogger.error(`红点配置错误： ${skinName}界面上不存在组件${fullPaths}`);
            debug_helper.showError("RedPointError", "", `红点配置错误： ${skinName}界面上不存在组件${fullPaths}`);
            return;
        }
        safeInvokeFunc(child, () => {
            this.$resolveChildPaths(child, names.slice(1), action, skinName, fullPaths);
        });
    }

    private onBaseWidgetRegisteHandler(e: BaseWidgetCommonEvent) {
        const targetBaseWidget: BaseWidget = e.data[0];
        // register: 注册还是销毁
        const register: boolean = e.data[1];
        if (!targetBaseWidget || !targetBaseWidget.baseInst) {
            NotifyLogger.debug(`not target or not base inst targetBaseWidget=`, targetBaseWidget, "baseinst=", targetBaseWidget?.baseInst)
            return;
        }
        const baseInst = targetBaseWidget.baseInst;

        const refs = NotifyConfMgr.getInstance().getSkinConfs(baseInst.skinName);
        NotifyLogger.debug("onBaseWidgetRegisteHandler", "skin=", baseInst.skinName, "refs=", refs)
        const restrict = (targetBaseWidget as any).NOTIFY_RESTRICT;
        for (const skinConf of refs) {
            const _notify = skinConf.node
            const childPaths = skinConf.childPaths
            const bindID = skinConf.bindID
            if (restrict && bindID != restrict) {
                continue;
            }
            if (this.$enableMultiChain) {
                // 多链式配置走 safeInvokeFunc 递归
                this.$resolveChildPaths(
                    targetBaseWidget,
                    childPaths,
                    (wdg) => {
                        if (register) {
                            this.registerWidgetPoint(_notify, wdg);
                            // 创建皮肤时检测
                            LoginValue.InnerTest && NotifyHelper.checkWidgetState(baseInst, wdg, childPaths);
                        } else {
                            this.unRegisterWidgetPoint(_notify, [], wdg, register);
                        }
                    },
                    baseInst.skinName,
                    childPaths,
                );
                continue;
            }
            let wdg = targetBaseWidget
            for (const p of childPaths) {
                wdg = wdg[p]
            }
            // const wdg = childPaths ? targetBaseWidget[childPaths] : targetBaseWidget;
            if (!wdg) {
                NotifyLogger.error(`红点配置错误： ${baseInst.skinName}界面上不存在组件${childPaths}`);
                debug_helper.showError("RedPointError", "", `红点配置错误： ${baseInst.skinName}界面上不存在组件${childPaths}`);
                continue;
            }
            if (register) {
                safeInvokeFunc(wdg, () => { this.registerWidgetPoint(_notify, wdg) });
                // 创建皮肤时检测
                LoginValue.InnerTest && NotifyHelper.checkWidgetState(baseInst, wdg, childPaths);
            }
            else {
                this.unRegisterWidgetPoint(_notify, [], wdg, register);
            }
        }
        const touches = NotifyConfMgr.getInstance().getSkinConfs(baseInst.skinName, true);
        for (const skinConf of touches) {
            const _notify = skinConf.node
            const childPaths = skinConf.childPaths
            const bindID = skinConf.bindID
            if (restrict && bindID != restrict) {
                continue;
            }
            if (this.$enableMultiChain) {
                this.$resolveChildPaths(
                    targetBaseWidget,
                    childPaths,
                    (wdg) => {
                        if (register) {
                            this.registerWidgetTouch(_notify, wdg);
                        }
                    },
                    baseInst.skinName,
                    childPaths,
                );
                continue;
            }
            let wdg = targetBaseWidget
            for (const p of childPaths) {
                wdg = wdg[p]
            }
            if (!wdg) {
                NotifyLogger.error(`红点配置错误： ${baseInst.skinName}界面上不存在组件${childPaths}`);
                debug_helper.showError("RedPointError", "", `红点配置错误： ${baseInst.skinName}界面上不存在组件${childPaths}`);
                continue;
            }
            if (register) {
                safeInvokeFunc(wdg, () => { this.registerWidgetTouch(_notify, wdg) });
            }
            else {
                // this.unRegisterWidgetTouch(_notify, wdg);
            }
        }
    }

    // /** 是否空载 */
    // public isProcessorFree() {
    //     return !this.$processor.hasData();
    // }

    // public startProcessor() {
    //     this.$treeNodeCountMap.clear();
    //     // this.$treeNodeExtraMap.clear();
    //     // this.$openuiHideNodes.clear()
    //     this._clearAllRedPoint();
    //     // this.$processor.run();
    // }

    // /** 更新部分叶节点，刷新数据 */
    // public onNotifiesUpdate(notifies: NotifyEntry[]) {
    //     this.$processor.append(notifies);
    //     if (DEBUG) {
    //         NotifyHelper.checkLeafNode(notifies);
    //     }
    //     //NotifyUIMgr.getInstance().dispatchEvent(new egret.Event(NotifyUIMgr.NOTIFY_CHANGE,false,false,notifies))
    // }

    // /** 保存隐藏红点的设置 */
    // public onNotifySettingUpdate(tree_node_list: string[]) {
    //     this.$skipTreeNodeList = tree_node_list;
    // }

    // private _getTreeNodeCount(tree_node: string, default_value = 0): number {
    //     return this.$treeNodeCountMap.get(tree_node, default_value);
    // }

    // private _setTreeNodeCount(tree_node: string, count: number): void {
    //     this.$treeNodeCountMap.set(tree_node, count);
    // }

    // /**获取树节点红点激活引用数*/
    // public getTreeNodeCount(tree_node: string): number {
    //     return this._getTreeNodeCount(tree_node, 0);
    // }

    public get redPointWidgetMap() { return this.$notifyWidgetMap; }
    // public get treeNodeCountMap() { return this.$treeNodeCountMap; }

    private tryExpireUI(evt: egret.TimerEvent): void {
        this.$notifyWidgetMap.forEach((widgetSet, nodeKeys) => {
            widgetSet.forEach((inst: NotifyUIType) => {
                if (!this._isWidgetInStage(inst)) {
                    const bindIds = nodeKeys.slice(1)
                    this.unRegisterWidgetPoint(nodeKeys[0] as string, bindIds, inst);
                }
            });
        });
    }

    /**
     * 调试用：打印 $notifyWidgetMap 中仍持有的显示对象，排查哪些 widget 没有被正确移除（可能泄漏）。
     * 断引用清理由 leak_sentinel.clean() 触发的 tryExpireUI 负责（GC 前），本方法只做纯上报（GC 后）。
     */
    private dump(): void {
        if (DEV) {
            // 泄漏统计白名单：这些类型的常驻组件不计入疑似泄漏统计（类名字符串匹配，避免额外 import）
            const LEAK_WHITE_LIST: string[] = [
                "Button",
                "CheckBox",
                "Group",
                "Component",
                "MainHangUp",
                "CMainBottomBtn",
                "BehvMenuBtnItemRenderer",
                "BehaviorBaseRenderer",
            ];
            const isInWhiteList = (inst: NotifyUIType): boolean => {
                const ctorName = inst && (inst as any).constructor && (inst as any).constructor.name;
                return !!ctorName && LEAK_WHITE_LIST.indexOf(ctorName) !== -1;
            };

            let leaks: { node: string, bindIds: NotifyID[], inst: NotifyUIType }[] = [];
            this.$notifyWidgetMap.forEach((widgetSet, nodeKeys) => {
                widgetSet.forEach((inst: NotifyUIType) => {
                    if (isInWhiteList(inst)) {
                        return;
                    }
                    leaks.push({ node: nodeKeys[0] as string, bindIds: nodeKeys.slice(1), inst });
                });
            });

            if (leaks.length === 0) {
                Logger.warn(`[LeakSentinel-NotifyUIMgr] 无泄漏 ✅（若刚拍过快照/GC 才准，否则可能只是尚未回收）`);
            } else {
                // (window as any).__notifyLeaks = leaks.map(l => l.inst);
                Logger.error(`[LeakSentinel-NotifyUIMgr] 疑似泄漏 ${leaks.length} 个，详情：`, leaks);
            }
        }
    }

    private _isWidgetInStage(widget: any) {
        let inst = BaseWidget.getBaseInst(widget);
        if (!inst || inst.stage === null) {
            return false;
        }
        return true;
    }

    private _safeSetUINotifyState(widget: any, bindIds: NotifyID[], visible: boolean, node: string) {
        safeInvokeFunc(widget, () => {
            this._setUINotifyState(widget, bindIds, visible, node);
        })
    }

    // 设置控件的提醒
    private _setUINotifyState(widget: any, bindIds: NotifyID[], visible: boolean, node: string) {
        // NotifyLogger.debug(`_setUINotifyState set node=${node} bindIds=`, bindIds, `red=${visible} widget=`, widget)
        let func = widget[NotifyHelper.RedPointFuncName] as Function;
        if (!!func && (typeof func === "function")) {
            if (func.call(widget, visible)) {
                // 应该是说这个函数里自行处理开关红点效果
                return;
            }
        }
        let extra
        if (widget.showNotifications) {
            extra = NotifyMgr.getInstance().getNotifyExtra(node);
            widget.showNotifications(visible, node, extra);
            return
        }
        let style = RedPointStyles.RED;
        if (visible) {
            [style, extra] = NotifyMgr.getInstance().getNotifyStyleExtra(node, bindIds)
        }
        if (style != RedPointStyles.NONE) {
            NotifyHelper.addRedPointOnWidget(widget, visible, style, { ...extra }, node);
        } else {
            NotifyLogger.debug(`notify style is None ${node} widget=`, widget)
        }
    }

    private _addWidgetPointInMap(node: string, widget: NotifyUIType) {
        const keys: NotifyID[] = [node]
        const bindIds = NotifyHelper.getUINotifyIds(widget)
        if (bindIds) {
            keys.push(...bindIds)
        }
        this.$notifyWidgetMap.get(keys, () => new Set<NotifyUIType>()).add(widget)

        const isRed = NotifyMgr.getInstance().isUIRed(node, widget)
        NotifyLogger.debug(`_addWidgetPointInMap node=${node} red=${isRed} notifyid=${(widget as any).notifyIds}`)
        this._safeSetUINotifyState(widget, bindIds, isRed, node);
    }

    private _removeWidgetPointInMap(tree_node: string, widget: any, binIds: NotifyID[]) {
        const keys: NotifyID[] = binIds ? [tree_node, ...binIds] : [tree_node];
        const widgets = this.$notifyWidgetMap.get(keys);
        if (widgets) {
            widgets.delete(widget)
        }
        NotifyHelper.storeRedPointWidget(widget, false);
    }

    onNotifyStateChanged(e: CommonEvent) {
        let [node, isRed] = e.data as [NotifyTreeNodeBase, boolean]
        const nodes: NotifyID[] = node.bindIds ? [node.node, ...node.bindIds] : [node.node]

        const widgets = this.$notifyWidgetMap.get(nodes);
        NotifyLogger.debug(`UIMgr onNotifyStateChanged ${node.node} ${isRed} nodes=`, nodes, `widgets=`, widgets)
        if (widgets) {
            widgets.forEach((widget) => {
                if (this._isWidgetInStage(widget)) {
                    this._safeSetUINotifyState(widget, node.bindIds, isRed, node.node);
                } else {
                    NotifyLogger.debug(`widget not in stage, widget=`, widget)
                }
            });
        }
    }

    // /** 保存节点对应的额外信息 */
    // private _saveTreeNodeData(tree_node: string, extra: any[]) {
    //     this.$treeNodeExtraMap.set(tree_node, extra);
    // }

    // public getTreeNodeData(tree_node: string) {
    //     return this.$treeNodeExtraMap.get(tree_node);
    // }

    /** 只在的只显示一次的 */
    // private $lastUpOne: string[] = [];

    // private _addLeafNode(leaf_node: string) {
    //     if (!notify_cfg.isLeafNode(leaf_node)) {
    //         NotifyLogger.log(`[NotifyUIMgr._addLeafNode] Cannot add Non-Leaf node(${leaf_node})`);
    //         return;
    //     }
    //     //
    //     let isLastUpOne = this.$lastUpOne.indexOf(leaf_node) != -1; // 上次传一层？
    //     //
    //     let isUpOne = RedPointTreeStorage.getInstance().isUpOne(leaf_node); // 这次传一层？
    //     let enabled = this._getTreeNodeCount(leaf_node) > 0;
    //     if (enabled && (isUpOne == isLastUpOne)) { // 传递次数改变
    //         this._setNotifyState(leaf_node, true);
    //         return; // 叶子节点已经被添加，返回,不更新计数
    //     }
    //     let count = (!enabled && isUpOne) ? 1 : notify_cfg.affectCount(leaf_node);
    //     let node_list = NotifyHelper.splitTreeNode(leaf_node, count);
    //     // 如果挂钩了openui，则判断openui是否开启
    //     if (node_list.some(v => !NotifyHelper.isTreeNodeLegal(v))) {
    //         // 未开启，则先存起来，等openui开启后再重新触发
    //         preload_utils_list.addIfNotExist(this.$openuiHideNodes, leaf_node);
    //         return;
    //     }
    //     preload_utils_list.delIfExist(this.$openuiHideNodes, leaf_node); // openui已经开启了，那将列表的删掉
    //     //
    //     if (isUpOne) {
    //         preload_utils_list.addIfNotExist(this.$lastUpOne, leaf_node);
    //     }
    //     else {
    //         preload_utils_list.delIfExist(this.$lastUpOne, leaf_node);
    //     }
    //     //
    //     let delay = [] as NotifyEntry[];
    //     let add = !isUpOne && isLastUpOne;
    //     node_list.forEach((v, i) => {
    //         if (enabled) {
    //             if (i == 0) {
    //                 return;
    //             }
    //             let num = this._getTreeNodeCount(v);
    //             if (add) {
    //                 this._setTreeNodeCount(v, num + 1);
    //                 this._setNotifyState(v, true);
    //                 // 触发关联红点
    //                 let relation_node = notify_cfg.getRelationNode(v);
    //                 if (relation_node) {
    //                     delay.push({ leaf_node: relation_node, state: true });
    //                 }
    //             }
    //             else {
    //                 num = Math.max(--num, 0);
    //                 this._setTreeNodeCount(v, num);
    //                 if (num == 0) {
    //                     this._setNotifyState(v, false);
    //                 }
    //                 else {
    //                     let styles = notify_cfg.getStyles(v);
    //                     if (styles.length > 1) {
    //                         this._setNotifyState(v, true);
    //                     }
    //                 }
    //                 // if (num == 0) {
    //                 // 删除关联红点
    //                 let relation_node = notify_cfg.getRelationNode(v);
    //                 if (relation_node) {
    //                     delay.push({ leaf_node: relation_node, state: false, extra: [] });
    //                 }
    //                 // }
    //             }
    //         }
    //         else {
    //             let num = this._getTreeNodeCount(v);
    //             this._setTreeNodeCount(v, num + 1);
    //             this._setNotifyState(v, true);
    //             // 触发关联红点
    //             let relation_node = notify_cfg.getRelationNode(v);
    //             if (relation_node) {
    //                 delay.push({ leaf_node: relation_node, state: true });
    //             }
    //         }
    //     });
    //     delay.length && egret.callLater(() => RedPointTreeStorage.getInstance().onNotifiesUpdate(delay), null);
    // }

    // private _delLeafNode(leaf_node: string) {
    //     if (!notify_cfg.isLeafNode(leaf_node)) {
    //         NotifyLogger.log(`[NotifyUIMgr._delLeafNode] Cannot delete Non-Leaf node(${leaf_node})`);
    //         return;
    //     }
    //     // if (preload_utils_list.delIfExist(this.$openuiHideNodes, leaf_node)) {
    //     //     return;
    //     // }
    //     let isUpOne = preload_utils_list.delIfExist(this.$lastUpOne, leaf_node);
    //     if (!this._getTreeNodeCount(leaf_node)) {
    //         this._setNotifyState(leaf_node, false);
    //         return; // 节点当前计数为0，或者不存在删除
    //     }
    //     let count = isUpOne ? 1 : notify_cfg.affectCount(leaf_node);
    //     let node_list = NotifyHelper.splitTreeNode(leaf_node, count);
    //     let delay = [] as NotifyEntry[];
    //     node_list.forEach((v) => {
    //         let num = this._getTreeNodeCount(v);
    //         num = Math.max(--num, 0);
    //         this._setTreeNodeCount(v, num);
    //         if (num == 0) {
    //             this._setNotifyState(v, false);
    //         }
    //         else {
    //             let styles = notify_cfg.getStyles(v);
    //             if (styles.length > 1) {
    //                 this._setNotifyState(v, true);
    //             }
    //         }

    //         if (num == 0) {
    //             // 删除关联红点
    //             let relation_node = notify_cfg.getRelationNode(v);
    //             if (relation_node) {
    //                 delay.push({ leaf_node: relation_node, state: false, extra: [] });
    //             }
    //         }
    //     });
    //     delay.length && egret.callLater(() => RedPointTreeStorage.getInstance().onNotifiesUpdate(delay), null);
    // }

    // private _clearAllRedPoint() {
    //     if (!this.$notifyWidgetMap) {
    //         return;
    //     }
    //     for (let key of this.$notifyWidgetMap.keys()) {
    //         this._setNotifyState(key, false);
    //     }
    // }



    /**
     * #12102 【客户端】新手红点规则
     * 设定参数：G_NOVICE_REDPOINT，控制在特定等级前，所有红点不显示
     * 新手红点特殊处理（参考梦幻H5处理）
        当在新手指引流程中，指引的步骤找到了对应的UI控件
        该UI控件有红点逻辑触发，则显示红点
        当步骤继续推进，则UI控件红点继续隐藏
    */
    // private _redState: boolean;
    // public setRedState() {
    //     let showGlobalRed = HeroMainModel.getInstance().levelId >= s2_global_value_cfg.GlobalValueInfo["GUIDE_SHOW_RED"];
    //     if (this._redState != showGlobalRed) {
    //         this._redState = showGlobalRed;
    //         NotifyHelper.setHideRed(showGlobalRed);
    //         NotifyHelper.switchRed();
    //     }
    // }

    // public getRedState() {
    //     return this._redState;
    // }
    public setShowRed(isShow: boolean) {
        const hide = !isShow
        if (hide == this.hideRed) {
            return
        }
        this.switchRed()
    }
    public switchRed() {
        this.hideRed = !this.hideRed;
        const hideRed = this.hideRed;
        for (const widgets of this.$notifyWidgetMap.values()) {
            widgets.forEach(widget => {
                if (widget instanceof egret.DisplayObject) {
                    NotifyHelper.alphaRed(widget, hideRed ? 0 : 1)
                }
            });
        }
    }
    public storeRedPointWidget(widget: egret.DisplayObject, visible: boolean) {
        if (visible) {
            // preload_utils_list.addIfNotExist($visibleRedArr, widget);
            NotifyHelper.alphaRed(widget, this.hideRed ? 0 : 1);
        } else {
            // preload_utils_list.delIfExist($visibleRedArr, widget);
            NotifyHelper.alphaRed(widget, 1);
        }
    }

    /** 隐藏点击后随便消失的红点 */
    public accessNotify(tree_node: string) {
        NotifyCNet.C_ACCESS_NOTIFY(tree_node)
    }

    /** 隐藏点击后随便消失的红点：针对list */
    public hideListRed(tree_node: string, key: string) {
        NotifyCNet.C_ACCESS_LIST_NOTIFY(tree_node, key);
    }

    /** 特殊的点击隐藏逻辑操作 */
    private _regForHideLogic(tree_node: string, widget: any): void {
        if (widget.once && widget instanceof egret.EventDispatcher) {
            let _logicForLoginHide = () => {
                this.accessNotify(tree_node);
            }
            widget.addEventListener(egret.TouchEvent.TOUCH_TAP, _logicForLoginHide, this);
        }
    }

    // private _unregForHideLogic(tree_node: string, widget: any): void {
    //     // pass
    // }

    // private _acrossDay(): void {
    //     // this._reCheckOpenUIHideList();
    // }

    // private _levelChanged(): void {
    //     this.setRedState();
    //     // this._reCheckOpenUIHideList();
    //     // todo 新手红点逻辑
    //     // RedPointTreeStorage.getInstance().onLevelChanged();
    // }

    // /** 重新检查openui是否开启，对应的红点是否要触发 */
    // private _reCheckOpenUIHideList() {
    //     let temp = this.$openuiHideNodes;
    //     if (temp.length == 0) {
    //         return;
    //     }
    //     this.$openuiHideNodes = [];
    //     //
    //     while (temp.length > 0) {
    //         this._addLeafNode(temp.shift());
    //     }
    //     temp = null;
    // }

    // public startTimer() {
    //     this.$expireTimer.start();
    //     // TimerEventBus.getInstance().addEventListener(ServerTimerEvent.ACROSS_DAY, this._acrossDay, this);
    //     // HeroMainEventBus.getInstance().addEventListener(HeroMainEvent.HEROINFOUPDATE, this._levelChanged, this);
    // }

    // public stopTimer() {
    //     this.$expireTimer.stop();
    //     // TimerEventBus.getInstance().removeEventListener(ServerTimerEvent.ACROSS_DAY, this._acrossDay, this);
    //     // HeroMainEventBus.getInstance().removeEventListener(HeroMainEvent.HEROINFOUPDATE, this._levelChanged, this);
    // }

    /** 注册红点 */
    public registerWidgetPoint(node: string, widget: NotifyUIType) {
        // NotifyLogger.debug(`registerWidgetPoint node=${node} widget`, widget)
        if (!widget) return;
        // this.uiMap.set(widget, node)
        // 判断widget是不是eui.list类型
        if (widget instanceof eui.List) {
            // this.registerListWidgetPoint(node, widget)
            return;
        }
        this._addWidgetPointInMap(node, widget);
    }
    // private registerListWidgetPoint(node: string, widget: eui.List) {
    //     if(!notify_cfg.isLeafNode(node)){
    //         NotifyLogger.debug(`registerListWidgetPoint node=${node} not leaf`)
    //         return
    //     }
    //     // 对于list 一级子节点会绑定id，先存起来 绑定id的时候再注册子节点
    //     for(const child of widget.$children) {
    //         NotifyLogger.debug(`registerListWidgetPoint node=${node} widget=`, child)
    //         this.uiMap.set(child, node)
    //     }
    // }

    /** 移除注册在widget上的指定红点 */
    public unRegisterWidgetPoint(tree_node: string, bindIds: NotifyID[], widget: NotifyUIType, hide = true) {
        if (!widget) return;
        // let isList: boolean = widget instanceof eui.List;
        // if (isList) {
        //     this.unRegisterListWidgetPoint(tree_node, widget)
        // }
        // this.uiMap.delete(widget)
        hide && this._safeSetUINotifyState(widget, bindIds, false, tree_node);
        this._removeWidgetPointInMap(tree_node, widget, bindIds);
    }

    // private unRegisterListWidgetPoint(node: string, widget: eui.List) {
    //     if(!notify_cfg.isLeafNode(node)){
    //         NotifyLogger.debug(`registerWidgetPoint node=${node} not leaf`)
    //         return
    //     }
    //     for(const child of widget.$children) {
    //         this.uiMap.delete(child)
    //     }
    // }

    /** 注册点击功能 */
    public registerWidgetTouch(tree_node: string, widget: any) {
        if (!widget) return;
        this._regForHideLogic(tree_node, widget);
    }

    // public unRegisterWidgetTouch(tree_node: string, widget: any) {
    //     if (!widget) return;
    //     this._unregForHideLogic(tree_node, widget);
    // }

    // private _onProcess(entry_list: NotifyEntry[]) {
    //     if (!entry_list || entry_list.length <= 0) {
    //         // 通知RedPointTreeStorage发消息
    //         RedPointTreeStorage.getInstance().enterProcess();
    //         return;
    //     }
    //     for (let i = 0, len = entry_list.length; i < len; i++) {
    //         this._updateLeaf(entry_list[i]);
    //     }
    // }

    // private _updateLeaf(entry: NotifyEntry) {
    //     let leaf_node = entry.leaf_node;
    //     if (!this._checkUpdate(leaf_node)) {
    //         DEBUG && NotifyLogger.log(`[NotifyUIMgr._updateLeaf] skip notify ${leaf_node}`);
    //         return;
    //     }
    //     // let extra = entry.extra;
    //     // this._saveTreeNodeData(leaf_node, extra);
    //     //
    //     let state = entry.state;
    //     state ? this._addLeafNode(leaf_node) : this._delLeafNode(leaf_node);
    // }

    // /** 不是当前被禁止的节点的子节点，就可以更新 */
    // public _checkUpdate(leaf_node: string): boolean {
    //     for (let i = 0, len = this.$skipTreeNodeList.length; i < len; i++) {
    //         if (NotifyHelper.isChild(leaf_node, this.$skipTreeNodeList[i])) {
    //             return false;
    //         }
    //     }
    //     return true;
    // }

    // /** 是否忽略红点 */
    // public isSkipNotify(tree_node: string) {
    //     return this.$skipTreeNodeList.indexOf(tree_node) !== -1;
    // }

    // /** 开启隐藏红点 */
    // public openSkipNotify(tree_node: string) {
    //     if (preload_utils_list.addIfNotExist(this.$skipTreeNodeList, tree_node)) {
    //         NotifyCNet.C_SKIP_NOTIFY_SETTING(tree_node, 1);
    //     }
    //     // 马上隐藏红点
    //     this._cancelSkipNotify(tree_node);
    // }

    // /** 关闭隐藏红点 */
    // public closeSkipNotify(tree_node: string) {
    //     if (preload_utils_list.delIfExist(this.$skipTreeNodeList, tree_node)) {
    //         NotifyCNet.C_SKIP_NOTIFY_SETTING(tree_node, 0);
    //     }
    //     // 需向服务器请求红点
    //     this._resumeSkipNotify(tree_node);
    // }

    // /** 取消节点隐藏影响的红点 */
    // private _cancelSkipNotify(tree_node: string) {
    //     // this.$treeNodeCountMap.forEach((v, k) => {
    //     //     if (v <= 0) return;
    //     //     if (notify_cfg.isLeafNode(k) && NotifyHelper.isChild(k, tree_node)) {
    //     //         this._delLeafNode(k);
    //     //         RedPointTreeStorage.getInstance().onNotifiesUpdate([{ leaf_node: k, state: false }]);
    //     //     }
    //     // });
    // }

    // /** 恢复节点隐藏影响到的红点 */
    // private _resumeSkipNotify(tree_node: string) {
    //     let list = [];
    //     for (let k in notify_cfg.NotifyInfo) {
    //         if (notify_cfg.isLeafNode(k) && NotifyHelper.isChild(k, tree_node)) {
    //             list.push(k);
    //         }
    //     }
    //     NotifyHelper.updateNotifies(list);
    // }

    /**恢复点击消失的红点为未点击状态 */
    public resumeEachRedPoint(tree_node: string) {
        // RedPointTreeStorage.getInstance().onNotifiesUpdate([{ leaf_node: tree_node, state: true }]);
        NotifyMgr.getInstance().updateNotifies([{ leaf_node: tree_node, state: true }]);
    }
    public showAllRedTreeNode() {
        NotifyHelper.closeAllRedTreeNode();
        const mgr = NotifyMgr.getInstance()
        for (const [nodes, widgets] of this.$notifyWidgetMap.entries()) {
            const trees = mgr.getRedLeaves(nodes[0] as string, (n) => n.node)
            for (const widget of widgets) {
                if (!mgr.isUIRed(nodes[0] as string, widget)) {
                    continue
                }
                if (!(widget instanceof egret.DisplayObject)) {
                    continue
                }
                let pos = widget.localToGlobal(widget.width / 2, 0);
                NotifyHelper.showDbgTips(trees, pos.x, pos.y);
            }
        }
    }
}