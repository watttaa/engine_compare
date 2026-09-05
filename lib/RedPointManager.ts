import { s2_global_value_cfg } from "auto/global_value";
import { s2_notify_cfg } from "auto/notify";
import { BaseWidgetCommonEvent } from 'event/CommonEventDefines';
import { GlobalEvent } from "GlobalEventDefine";
import { RED_SKIN } from "GlobalValue";
import { HeroMainEvent, HeroMainEventBus } from "heroMain/HeroMainEvent";
import { HeroMainModel } from "heroMain/HeroMainModel";
import { BaseGrid } from "lib/euiex/BaseGrid";
import { MutiFrameDataProc } from "lib/MutiFrameExe";
import { NotifyCNet } from "net/NotifyCNet";
import { isOpenIdEnabled } from "openui/OpenUIUtil";
import { NotifyMgr } from "./notify/NotifyMgr";
import { NotifyUIMgr } from "./notify/NotifyUIMgr";
import { NotifyHelper } from "./notify/NotifyHelper";
import { NotifyEntry, NotifyID, NotifyServerEntry, RedPointStyles } from "./notify/Const";
import { NotifyConfMgr } from "./notify/NotifyConfMgr";
export { RedPointStyles, NotifyEntry };
/*
使用首先在prot.xls的notify定义一个协议号，然后在UI中将协议号和对应红点控件注册到redPointManager中, 客户端的红点，如果不实现，
默认在右上角加上红点，如果控件有特殊需求，可以实现pointVisible的set方法或者在控件中实现showNotifications。
*/


/** 红点样式 */
// export const enum RedPointStyles {
//     NONE = 0, // 无
//     RED = 1, // 红点
//     NEW = 2, // 新
//     NUM = 3, // 数字
//     EFFECT = 4, // 动效
//     UP = 5, // ↑
//     AT = 6, // @
// }

// /** 红点通知信息 */
// export type NotifyEntry = {
//     leaf_node: string;  // 叶子结点
//     state?: boolean; // 叶子状态
//     extra?: any[];   // 额外数据
// }

export namespace RedPointTreeHelper {

    export const RedPointFuncName = "pointVisibleFunc";
    export const RedPointFuncValue = "pointVisibleValue";

    export function getUIRef(exml: string, isTouch = false) {
        return NotifyConfMgr.getInstance().getSkinConfs(exml, isTouch)
    }

    /** 添加红点 */
    export function addPointOnWidget(widget: any, visible: boolean, style: RedPointStyles = RedPointStyles.RED) {
        NotifyHelper.addPointOnWidget(widget, visible, style)
    }

    /** 注册红点 */
    export function registerWidgetPoint(tree_node: string, widget: any) {
        NotifyHelper.registerWidgetPoint(tree_node, widget)
    }

    /** 移除注册在widget上的指定红点 */
    export function unRegisterWidgetPoint(tree_node: string, widget: any, hide = true) {
        NotifyHelper.unRegisterWidgetPoint(tree_node, widget, hide)
    }

    /** 绑定动效动画到目标 */
    export function bindEffect(widget: any, effect_show: egret.tween.TweenGroup, effect_hide: egret.tween.TweenGroup) {
        NotifyHelper.bindEffect(widget, effect_show, effect_hide);
    }

    export function unbindEffect(widget: any) {
        NotifyHelper.unbindEffect(widget);
    }

    export function setShowRed(value: boolean) {
        NotifyUIMgr.getInstance().setShowRed(value)
    }
    export function switchRed() {
        NotifyUIMgr.getInstance().switchRed()
    }

    export function alphaRed(widget: egret.DisplayObject, alpha: 0 | 1) {
        NotifyHelper.alphaRed(widget, alpha);
    }

    /** 将数组转成字典型 */
    export function toNotifyEntry(data: NotifyServerEntry[]) {
        return NotifyHelper.toNotifyEntry(data)
    }
}

export function ENTRANCE_ID_EQUALITY(v) { return this.data.entrance_id == parseInt(v); };
export function OPEN_ID_EQUALITY(v) { return this.data.open_id == parseInt(v); };
export function OPEN_UI_EQUALITY(v) { return this.data.open_ui == parseInt(v); };
export function DATA_EQUALITY(v) { return this.data == v; };
export function ID_EQUALITY(v) { return this.data.id == parseInt(v); };

export function RED_POINT_DATA(v) { return this.data.redPointData == v; };

/** 装饰器 */
export function redPointListHandler(func: (v: string) => boolean, isTouch = false) {
    return (target: any,
        methodName: string,
        descriptor: TypedPropertyDescriptor<any>): TypedPropertyDescriptor<any> => {
        if (DEBUG && (!isTouch && methodName != "dataChanged" || isTouch && methodName.indexOf("onTouchTap") != 0)) {
            Logger.error("[redPointListHandler] 只能装饰方法‘dataChanged’或‘onTouchTap***’点击方法！");
            return descriptor;
        }

        const old_value = descriptor.value;
        descriptor.value = function (...args: any[]) {
            !this.$redRunCount && (this.$redRunCount = 0); // 添加一个标识，表示执行次数

            ++this.$redRunCount; // 运行前先自增
            old_value.apply(this, args);
            --this.$redRunCount; // 运行后再自减

            if (DEBUG && !(this instanceof eui.ItemRenderer)) {
                Logger.error("[redPointListHandler] 只能装饰在‘eui.ItemRenderer’或其子类！")
                return;
            }
            if (this.$redRunCount) {
                // 运行中，不执行后续判断
                return;
            }
            delete this.$redRunCount;

            const refs = RedPointTreeHelper.getUIRef(this.skinName, isTouch);
            if (!refs || refs.length == 0) {
                return;
            }
            if (isTouch) {
                for (let conf of refs) {
                    const tree_node = conf.node
                    const _name = conf.bindID
                    if (func.call(this, _name)) {
                        RedPointTreeManager.getInstance().hideRed(tree_node);
                        break;
                    }
                }
            }
            else {
                let reg_list = [];
                // 先取消注册
                for (let conf of refs) {
                    //
                    const _notify = conf.node
                    const _name = conf.bindID
                    let wdg = this
                    for (const p of conf.childPaths) {
                        wdg = wdg[p]
                    }
                    RedPointTreeHelper.addPointOnWidget(wdg, false);
                    if (func.call(this, _name)) {
                        reg_list.push([_notify, wdg]);
                    }
                    else {
                        RedPointTreeHelper.unRegisterWidgetPoint(_notify, wdg);
                    }
                }
                // 再重新注册
                for (let v of reg_list) {
                    safeInvokeFunc(v[1], () => { RedPointTreeHelper.registerWidgetPoint(v[0], v[1]) });
                }
            }
        }
        return descriptor;
    }
}

/** UI的红点通知限定项 */
export function UINotify(value: string = null) {
    return (constructor: Function): void => { constructor.prototype.NOTIFY_RESTRICT = value; };
}

// class ThrottleTimer {
//     private $lastTime: number;

//     constructor(private $interval: number) {
//         this.$lastTime = egret.getTimer();
//     }

//     public get enabled() {
//         let cur = egret.getTimer();
//         if (cur - this.$lastTime > this.$interval) {
//             this.$lastTime = cur;
//             return true;
//         }
//         return false;
//     }
// }

export class RedPointTreeManager extends SingletonClassEx {
    // private static $probability = 1 / 20; // 大概20s一次,概率是其的倒数
    // private static $frameMaxNum = 5; // 帧处理的最大数量
    // private static $instance = null;

    // private $redPointWidgetMap: dataStructure.Map; // 树节点对应的组件
    // private $treeNodeExtraMap: dataStructure.Map; // 树节点对应的数据
    // private $treeNodeCountMap: dataStructure.Map; // 树节点红点激活引用数

    // private $openuiHideArray: string[]; // openui未开启而隐藏的叶子节点

    // private $autoTimer: egret.Timer; // 主动拉取的timer

    /** 隐藏的树节点 */
    // private $skipTreeNodeList: string[];

    // private $processor: MutiFrameDataProc; // 分帧处理器
    // private $notifyData;//红点数据 给插件那边用

    constructor() {
        super();
        // this.$notifyData = notify_cfg.NotifyInfo;
        // this.$redPointWidgetMap = new dataStructure.Map();
        // this.$treeNodeCountMap = new dataStructure.Map();
        // this.$treeNodeExtraMap = new dataStructure.Map();
        // this.$openuiHideArray = [];
        // this.$skipTreeNodeList = [];

        // this.$autoTimer = new egret.Timer(1000, 0);
        // this.$autoTimer.addEventListener(egret.TimerEvent.TIMER, this._requestNotifies, this);

        // this.$processor = new MutiFrameDataProc(this._onProcess, this, null, null, { chunkLen: RedPointTreeManager.$frameMaxNum });

        // BaseWidgetEventBus.addEventListener(BaseWidgetCommonEvent.ON_REGISTE_REDPOINT, this.onBaseWidgetRegisteHandler, this);
        // BaseWidgetEventBus.addEventListener(BaseWidgetCommonEvent.ON_DEL_REDPOINT, this.onBaseWidgetDestroyHandler, this);
    }

    destroy(): void {
        // BaseWidgetEventBus.removeEventListener(BaseWidgetCommonEvent.ON_REGISTE_REDPOINT, this.onBaseWidgetRegisteHandler, this);
        // BaseWidgetEventBus.removeEventListener(BaseWidgetCommonEvent.ON_DEL_REDPOINT, this.onBaseWidgetDestroyHandler, this);
        // this.stopTimer();
    }

    // private onBaseWidgetDestroyHandler(e: BaseWidgetCommonEvent) {
    //     RedPointTreeHelper.delNoStage();
    // }

    // private onBaseWidgetRegisteHandler(e: BaseWidgetCommonEvent) {
    //     let targetBaseWidget: BaseWidgetBase = e.data[0];
    //     let register: boolean = e.data[1];
    //     if (!targetBaseWidget || !targetBaseWidget.baseInst) {
    //         return;
    //     }
    //     let baseInst = targetBaseWidget.baseInst;

    //     let refs = RedPointTreeHelper.getUIRef(baseInst.skinName);
    //     if (refs && refs.length != 0) {
    //         let restrict = (targetBaseWidget as any).NOTIFY_RESTRICT;
    //         for (let [_notify, _widget, _name] of refs) {
    //             if (restrict && _name != restrict) {
    //                 continue;
    //             }
    //             let wdg = _widget ? targetBaseWidget[_widget] : targetBaseWidget;
    //             if (!wdg) {
    //                 Logger.error(`红点配置错误： ${baseInst.skinName}界面上不存在组件${_widget}`);
    //                 debug_helper.showError("RedPointError", "", `红点配置错误： ${baseInst.skinName}界面上不存在组件${_widget}`);
    //                 continue;
    //             }
    //             if (register) {
    //                 safeInvokeFunc(wdg, () => { this.registerWidgetPoint(_notify, wdg) });
    //                 // 创建皮肤时检测
    //                 InnerTest && RedPointTreeHelper.checkWidgetState(baseInst, wdg, _widget);
    //             }
    //             else {
    //                 this.unRegisterWidgetPoint(_notify, wdg, register);
    //             }
    //         }
    //     }
    //     let touches = RedPointTreeHelper.getUIRef(baseInst.skinName, true);
    //     if (touches && touches.length != 0) {
    //         let restrict = (targetBaseWidget as any).NOTIFY_RESTRICT;
    //         for (let [_notify, _widget, _name] of touches) {
    //             if (restrict && _name != restrict) {
    //                 continue;
    //             }
    //             let wdg = _widget ? targetBaseWidget[_widget] : null;
    //             if (!wdg) {
    //                 Logger.error(`红点配置错误： ${baseInst.skinName}界面上不存在组件${_widget}`);
    //                 debug_helper.showError("RedPointError", "", `红点配置错误： ${baseInst.skinName}界面上不存在组件${_widget}`);
    //                 continue;
    //             }
    //             if (register) {
    //                 safeInvokeFunc(wdg, () => { this.registerWidgetTouch(_notify, wdg) });
    //             }
    //             else {
    //                 this.unRegisterWidgetTouch(_notify, wdg);
    //             }
    //         }
    //     }
    // }

    // /** 是否空载 */
    // public isProcessorFree() {
    //     return !this.$processor.hasData();
    // }

    // public startProcessor() {
    //     this.$treeNodeCountMap.clear();
    //     this.$treeNodeExtraMap.clear();
    //     this.$openuiHideArray.length = 0;
    //     this._clearAllRedPoint();
    //     this.$processor.run();
    // }

    /** 更新部分叶节点，刷新数据 */
    public onNotifiesUpdate(notifies: NotifyEntry[]) {
        NotifyMgr.getInstance().updateNotifies(notifies)
        // this.$processor.append(notifies);
        // if (DEBUG) {
        //     RedPointTreeHelper.checkLeafNode(notifies);
        // }
        //RedPointTreeManager.getInstance().dispatchEvent(new egret.Event(RedPointTreeManager.NOTIFY_CHANGE,false,false,notifies))
    }

    /** 保存隐藏红点的设置 */
    public onNotifySettingUpdate(tree_node_list: string[]) {
        // this.$skipTreeNodeList = tree_node_list;
        NotifyMgr.getInstance().onNotifySettingUpdate(tree_node_list)
    }

    // private _getTreeNodeCount(tree_node: string, default_value = 0): number {
    //     return this.$treeNodeCountMap.get(tree_node, default_value);
    // }

    // private _setTreeNodeCount(tree_node: string, count: number): void {
    //     if(tree_node.indexOf(notify_cfg.DXCM)!=-1) {
    //         let test = 1;
    //     }
    //     this.$treeNodeCountMap.set(tree_node, count);
    // }

    /**获取树节点红点激活引用数*/
    public getTreeNodeCount(tree_node: string): number {
        return NotifyMgr.getInstance().isNotifyRed(tree_node) ? 1 : 0
        // return this._getTreeNodeCount(tree_node, 0);
    }

    // private get redPointWidgetMap() { return this.$redPointWidgetMap; }
    // private get treeNodeCountMap() { return this.$treeNodeCountMap; }

    // private _requestNotifies(evt: egret.TimerEvent): void {
    //     // 自动取消注册
    //     let flag = DEBUG;
    //     if (!flag) {
    //         let v = Math.random()
    //         if (v <= RedPointTreeManager.$probability) {
    //             flag = true;
    //         }
    //     }
    //     if (flag) {
    //         this.$redPointWidgetMap.forEach((widgetArr, tree_node) => {
    //             widgetArr.forEach((inst: egret.DisplayObject | BaseWidget) => {
    //                 if (!this._isWidgetInStage(inst)) {
    //                     this.unRegisterWidgetPoint(tree_node, inst);
    //                 }
    //             });
    //         });
    //     }
    // }

    // private _isWidgetInStage(widget: any) {
    //     let inst = BaseWidget.getBaseInst(widget);
    //     if (!inst || inst.stage === null) {
    //         return false;
    //     }
    //     return true;
    // }

    // 设置控件的提醒
    // private _setRedPoint(widget: any, visible: boolean, tree_node: string) {
    //     //
    //     let func = widget[RedPointTreeHelper.RedPointFuncName] as Function;
    //     if (!!func && (typeof func === "function")) {
    //         if (func.call(widget, visible)) {
    //             ;
    //             return;
    //         }
    //     }
    //     if (widget.showNotifications) {
    //         let extra = this.$treeNodeExtraMap.get(tree_node);
    //         widget.showNotifications(visible, tree_node, extra);
    //     }
    //     else {
    //         let style = RedPointStyles.RED;
    //         if (visible) {
    //             let styles = notify_cfg.getStyles(tree_node);
    //             if (styles.length > 1) {
    //                 // 查找叶子节点样式
    //                 let max_priority = -1;
    //                 this.$treeNodeCountMap.forEach((v: number, k: string) => {
    //                     if (v <= 0) return;
    //                     if (notify_cfg.isLeafNode(k) && RedPointTreeHelper.isChild(k, tree_node)) {
    //                         let priority = notify_cfg.getStylePriority(k);
    //                         if (priority > max_priority) {
    //                             max_priority = priority;
    //                             style = notify_cfg.getStyles(k)[0] as RedPointStyles;
    //                         }
    //                     }
    //                 });
    //             }
    //             else {
    //                 // 单独样式
    //                 style = styles[0] as RedPointStyles;
    //             }
    //         }
    //         if (style != RedPointStyles.NONE) {
    //             let extra = this.$treeNodeExtraMap.get(tree_node, {});
    //             RedPointTreeHelper.addRedPointOnWidget(widget, visible, style, { ...extra }, tree_node);
    //         }
    //     }
    // }

    // private _addWidgetPointInMap(tree_node: string, widget: any) {
    //     let widgetArr = this.$redPointWidgetMap.get(tree_node) as any[];
    //     if (!widgetArr) {
    //         widgetArr = [widget];
    //         this.$redPointWidgetMap.set(tree_node, widgetArr);
    //     }
    //     else {
    //         preload_utils_list.addIfNotExist(widgetArr, widget);
    //     }

    //     let count = this._getTreeNodeCount(tree_node);
    //     if (count > 0) {
    //         this._setRedPoint(widget, true, tree_node);
    //     }
    // }

    // private _removeWidgetPointInMap(tree_node: string, widget: any) {
    //     let widgetArr = this.$redPointWidgetMap.get(tree_node) as any[];
    //     if (widgetArr) {
    //         preload_utils_list.delIfExist(widgetArr, widget);
    //     }
    //     RedPointTreeHelper.storeRedPointWidget(widget, false);
    // }

    // private _setWidgetPoint(tree_node: string, visible: boolean) {
    //     let widgetArr = this.$redPointWidgetMap.get(tree_node) as any[];
    //     if (widgetArr) {
    //         widgetArr.forEach((widget) => {
    //             if (this._isWidgetInStage(widget)) {
    //                 this._setRedPoint(widget, visible, tree_node);
    //             }
    //         });
    //     }
    // }

    /** 保存节点对应的额外信息 */
    // private _saveTreeNodeData(tree_node: string, extra: any[]) {
    //     this.$treeNodeExtraMap.set(tree_node, extra);
    // }

    public getTreeNodeData(tree_node: string) {
        return NotifyMgr.getInstance().getNotifyExtra(tree_node)
        // return this.$treeNodeExtraMap.get(tree_node);
    }

    // /** 只在的只显示一次的 */
    // private $lastUpOne: string[] = [];

    // private _addLeafNode(leaf_node: string) {
    //     if (!notify_cfg.isLeafNode(leaf_node)) {
    //         Logger.log(`[RedPointTreeManager._addLeafNode] Cannot add Non-Leaf node(${leaf_node})`);
    //         return;
    //     }
    //     //
    //     let isLastUpOne = this.$lastUpOne.indexOf(leaf_node) != -1; // 上次传一层？
    //     //
    //     let isUpOne = RedPointTreeStorage.getInstance().isUpOne(leaf_node); // 这次传一层？
    //     let enabled = this._getTreeNodeCount(leaf_node) > 0;
    //     if (enabled && (isUpOne == isLastUpOne)) { // 传递次数改变
    //         this._setWidgetPoint(leaf_node, true);
    //         return; // 叶子节点已经被添加，返回,不更新计数
    //     }
    //     let count = (!enabled && isUpOne) ? 1 : notify_cfg.affectCount(leaf_node);
    //     let node_list = RedPointTreeHelper.splitTreeNode(leaf_node, count);
    //     // 如果挂钩了openui，则判断openui是否开启
    //     if (node_list.some(v => !RedPointTreeHelper.isTreeNodeLegal(v))) {
    //         // 未开启，则先存起来，等openui开启后再重新触发
    //         preload_utils_list.addIfNotExist(this.$openuiHideArray, leaf_node);
    //         return;
    //     }
    //     preload_utils_list.delIfExist(this.$openuiHideArray, leaf_node); // openui已经开启了，那将列表的删掉
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
    //                 this._setWidgetPoint(v, true);
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
    //                     this._setWidgetPoint(v, false);
    //                 }
    //                 else {
    //                     let styles = notify_cfg.getStyles(v);
    //                     if (styles.length > 1) {
    //                         this._setWidgetPoint(v, true);
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
    //             this._setWidgetPoint(v, true);
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
    //         Logger.log(`[RedPointTreeManager._delLeafNode] Cannot delete Non-Leaf node(${leaf_node})`);
    //         return;
    //     }
    //     if (preload_utils_list.delIfExist(this.$openuiHideArray, leaf_node)) {
    //         return;
    //     }
    //     let isUpOne = preload_utils_list.delIfExist(this.$lastUpOne, leaf_node);
    //     if (!this._getTreeNodeCount(leaf_node)) {
    //         this._setWidgetPoint(leaf_node, false);
    //         return; // 节点当前计数为0，或者不存在删除
    //     }
    //     let count = isUpOne ? 1 : notify_cfg.affectCount(leaf_node);
    //     let node_list = RedPointTreeHelper.splitTreeNode(leaf_node, count);
    //     let delay = [] as NotifyEntry[];
    //     node_list.forEach((v) => {
    //         let num = this._getTreeNodeCount(v);
    //         num = Math.max(--num, 0);
    //         this._setTreeNodeCount(v, num);
    //         if (num == 0) {
    //             this._setWidgetPoint(v, false);
    //         }
    //         else {
    //             let styles = notify_cfg.getStyles(v);
    //             if (styles.length > 1) {
    //                 this._setWidgetPoint(v, true);
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
    //     if (!this.$redPointWidgetMap) {
    //         return;
    //     }
    //     let keys = this.$redPointWidgetMap.keys;
    //     for (let key of keys) {
    //         this._setWidgetPoint(key, false);
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
    //         RedPointTreeHelper.setHideRed(showGlobalRed);
    //         RedPointTreeHelper.switchRed();
    //     }
    // }

    public getRedState() {
        return NotifyMgr.getInstance().isGlobalShowRed();
    }

    /** 隐藏点击后随便消失的红点 */
    public hideRed(tree_node: string) {
        NotifyCNet.C_ACCESS_NOTIFY(tree_node)
    }

    /** 隐藏点击后随便消失的红点：针对list */
    public hideListRed(tree_node: string, key: string) {
        Logger.warn("没实现呢")
        NotifyCNet.C_ACCESS_LIST_NOTIFY(tree_node, key);
    }

    // /** 特殊的点击隐藏逻辑操作 */
    // private _regForHideLogic(tree_node: string, widget: any): void {
    //     if (widget.once && widget instanceof egret.EventDispatcher) {
    //         let _logicForLoginHide = () => {
    //             this.hideRed(tree_node);
    //         }
    //         widget.addEventListener(egret.TouchEvent.TOUCH_TAP, _logicForLoginHide, this);
    //     }
    // }

    // private _unregForHideLogic(tree_node: string, widget: any): void {
    //     // pass
    // }

    // private _acrossDay(): void {
    //     this._reCheckOpenUIHideList();
    // }

    // private _levelChanged(): void {
    //     this.setRedState();
    //     this._reCheckOpenUIHideList();
    //     RedPointTreeStorage.getInstance().onLevelChanged();
    // }

    // /** 重新检查openui是否开启，对应的红点是否要触发 */
    // private _reCheckOpenUIHideList() {
    //     let temp = this.$openuiHideArray;
    //     if (temp.length == 0) {
    //         return;
    //     }
    //     this.$openuiHideArray = [];
    //     //
    //     while (temp.length > 0) {
    //         this._addLeafNode(temp.shift());
    //     }
    //     temp = null;
    // }

    public startTimer() {
        // this.$autoTimer.start();
        // TimerEventBus.getInstance().addEventListener(ServerTimerEvent.ACROSS_DAY, this._acrossDay, this);
        // HeroMainEventBus.getInstance().addEventListener(HeroMainEvent.HEROINFOUPDATE, this._levelChanged, this);
    }

    // public stopTimer() {
    //     // this.$autoTimer.stop();
    //     // TimerEventBus.getInstance().removeEventListener(ServerTimerEvent.ACROSS_DAY, this._acrossDay, this);
    //     // HeroMainEventBus.getInstance().removeEventListener(HeroMainEvent.HEROINFOUPDATE, this._levelChanged, this);
    // }

    public showAllRedTreeNode() {
        NotifyUIMgr.getInstance().showAllRedTreeNode();
    }

    /** 注册红点 */
    // public registerWidgetPoint(tree_node: string, widget: any) {
    //     return NotifyUIMgr.getInstance().registerWidgetPoint(tree_node, widget)
    // if (!widget) return;
    // // 判断widget是不是eui.list类型
    // let isList: boolean = widget instanceof eui.List;
    // if (isList) {
    //     return;
    // }
    // this._setRedPoint(widget, false, tree_node);
    // this._addWidgetPointInMap(tree_node, widget);
    // }

    /** 移除注册在widget上的指定红点 */
    // public unRegisterWidgetPoint(tree_node: string, widget: any, hide = true) {
    //     return NotifyUIMgr.getInstance().unRegisterWidgetPoint(tree_node, widget, hide)
    // if (!widget) return;
    // hide && this._setRedPoint(widget, false, tree_node);
    // this._removeWidgetPointInMap(tree_node, widget);
    // }

    /** 注册点击功能 */
    // public registerWidgetTouch(tree_node: string, widget: any) {
    //     return NotifyUIMgr.getInstance().registerWidgetTouch(tree_node, widget)
    // }

    // public unRegisterWidgetTouch(tree_node: string, widget: any) {
    //     return NotifyUIMgr.getInstance().unRegisterWidgetPoint(tree_node, widget)
    // if (!widget) return;
    // this._unregForHideLogic(tree_node, widget);
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
    //         DEBUG && Logger.log(`[RedPointTreeManager._updateLeaf] skip notify ${leaf_node}`);
    //         return;
    //     }
    //     let extra = entry.extra;
    //     this._saveTreeNodeData(leaf_node, extra);
    //     //
    //     let state = entry.state;
    //     state ? this._addLeafNode(leaf_node) : this._delLeafNode(leaf_node);
    // }

    // /** 不是当前被禁止的节点的子节点，就可以更新 */
    // public _checkUpdate(leaf_node: string): boolean {
    //     for (let i = 0, len = this.$skipTreeNodeList.length; i < len; i++) {
    //         if (RedPointTreeHelper.isChild(leaf_node, this.$skipTreeNodeList[i])) {
    //             return false;
    //         }
    //     }
    //     return true;
    // }

    /** 是否忽略红点 */
    public isSkipNotify(tree_node: string, notifyIds?: NotifyID[]) {
        return NotifyMgr.getInstance().isNotifyHided(tree_node, notifyIds)
        // return this.$skipTreeNodeList.indexOf(tree_node) !== -1;
    }

    /** 开启隐藏红点 */
    public openSkipNotify(tree_node: string, notifyIds?: NotifyID[]) {
        // if (preload_utils_list.addIfNotExist(this.$skipTreeNodeList, tree_node)) {
        //     NotifyCNet.C_SKIP_NOTIFY_SETTING(tree_node, 1);
        // }
        NotifyMgr.getInstance().setNodeHideState(tree_node, true, notifyIds)
        // // 马上隐藏红点
        // this._cancelSkipNotify(tree_node);
    }

    /** 关闭隐藏红点 */
    public closeSkipNotify(tree_node: string, notifyIds?: NotifyID[]) {
        // if (preload_utils_list.delIfExist(this.$skipTreeNodeList, tree_node)) {
        //     NotifyCNet.C_SKIP_NOTIFY_SETTING(tree_node, 0);
        // }
        NotifyMgr.getInstance().setNodeHideState(tree_node, false, notifyIds)
        // // 需向服务器请求红点
        // this._resumeSkipNotify(tree_node);
    }

    // /** 取消节点隐藏影响的红点 */
    // private _cancelSkipNotify(tree_node: string) {
    //     this.$treeNodeCountMap.forEach((v, k) => {
    //         if (v <= 0) return;
    //         if (notify_cfg.isLeafNode(k) && RedPointTreeHelper.isChild(k, tree_node)) {
    //             this._delLeafNode(k);
    //             RedPointTreeStorage.getInstance().onNotifiesUpdate([{ leaf_node: k, state: false }]);
    //         }
    //     });
    // }

    // /** 恢复节点隐藏影响到的红点 */
    // private _resumeSkipNotify(tree_node: string) {
    //     let list = [];
    //     for (let k in notify_cfg.NotifyInfo) {
    //         if (notify_cfg.isLeafNode(k) && RedPointTreeHelper.isChild(k, tree_node)) {
    //             list.push(k);
    //         }
    //     }
    //     RedPointTreeHelper.updateNotifies(list);
    // }

    /**恢复点击消失的红点为未点击状态 */
    public resumeEachRedPoint(tree_node: string) {
        NotifyMgr.getInstance().updateNotifies([{ leaf_node: tree_node, state: true }]);
        // RedPointTreeStorage.getInstance().onNotifiesUpdate([{ leaf_node: tree_node, state: true }]);
    }
}

// const PRIORITY_FIRST = 1; // 起始优先级
// const PRIORITY_LAST = 5; // 结束优先级
// const PRIORITY_SPEC = 9; // 特殊优先级
// const LIMIT_CNT = 20; // 空位数量（限制数量）
// const EMPTY_CNT = 4; // 剩余空位多于此数量时，触发补充

// const PRIORITY_LIST = [] as number[];
// for (let i = PRIORITY_FIRST; i <= PRIORITY_LAST; ++i) {
//     PRIORITY_LIST.push(i);
// }
// PRIORITY_LIST.push(PRIORITY_SPEC);

/** 红点树优先级 */
export class RedPointTreeStorage extends SingletonClassEx {
    /** 所有红点树 */
    // private $entries: { [priority: number]: NotifyEntry[] } = {};
    // private $isAllReceived: boolean;

    // /** 向上正常传递 */
    // private $upAll: string[];
    // /** 向上不再传递 */
    // private $upOne: string[];

    // /** 上一次的向上正常传递 */
    // private $lastUpAll: string[];
    // /** 上一次的向上不再传递 */
    // private $lastUpOne: string[];

    /** 通过关联节点或者服务端推送的需要更新的树节点 */
    // private $updateList: string[];

    /** 是否开启优先级 */
    // private $enabled: boolean;
    // private $enabled_wait: boolean;

    // private $wait: boolean;

    // private $levelOK: boolean;

    constructor() {
        super();

        // this.$enabled_wait = null;
        // this.$enabled = this.$levelOK = this.isLevelOK();
        // this.$wait = false;

        // this.$upAll = [];
        // this.$upOne = [];
        // this.$lastUpAll = [];
        // this.$lastUpOne = [];

        // this.$entries = {};
        // for (let i of PRIORITY_LIST) {
        //     this.$entries[i] = [];
        // }
        // this.$isAllReceived = false;

        // this.$updateList = []
    }

    public destroy() {
        // this.$enabled = false;
        // this.$wait = false;
        // this.$upAll && (this.$upAll.length = 0);
        // this.$upOne && (this.$upOne.length = 0);
        // this.$lastUpAll && (this.$lastUpAll.length = 0);
        // this.$lastUpOne && (this.$lastUpOne.length = 0);
    }

    /** */
    public get enabled() { return NotifyMgr.getInstance().enabled; }
    public set enabled(value: boolean) {
        Logger.warn("没实现");
        return
        // if (LoginModel.getInstance().loginState != LoginState.GAMING) {
        //     Logger.warn("别急，还没在Gaming状态咧。。。");
        //     return;
        // }
        // if (!this.$isAllReceived) {
        //     this.$enabled_wait = value;
        //     Logger.warn("客户端还没有收到红点数据呀。。。");
        //     return;
        // }
        // if (!this.isLevelOK()) {
        //     Logger.warn(`等级还没够，等级id达到${s2_global_value_cfg.GlobalValueInfo["G_NOVICE_REDPOINT"]}后再来吧。。。`);
        //     return;
        // }
        // if (this.$enabled == value) return;
        // this.$enabled = value;
        // // 通知更新
        // let inst = RedPointTreeManager.getInstance();
        // for (let i of PRIORITY_LIST) {
        //     if (!this.isLimit(i)) {
        //         continue;
        //     }
        //     for (let j = this.$entries[i].length - 1; j >= 0; --j) {
        //         if (this.$upOne.indexOf(this.$entries[i][j].leaf_node) != -1) {
        //             inst.onNotifiesUpdate([this.$entries[i][j]]);
        //         }
        //     }
        // }
    }

    // private isLevelOK() {
    //     // 新手等级期间，不触发红点优先级
    //     let level = HeroMainModel.getInstance().levelId;
    //     let start = s2_global_value_cfg.GlobalValueInfo["G_NOVICE_REDPOINT"];
    //     let end = s2_global_value_cfg.GlobalValueInfo["G_NOVICE_REDPOINT_INVALID"];
    //     return start <= level && level < end;
    // }

    @preload_utils_decorator.throttle(500)
    public switchEnabled() {
        this.enabled = !this.enabled;
    }

    // public clear() {
    //     for (let i of PRIORITY_LIST) {
    //         this.$entries[i].length = 0;
    //     }
    //     this.$isAllReceived = false;
    // }

    // /** 判断叶子节点是否不向上传递 */
    // public isUpOne(leaf_node: string) {
    //     if (this.$enabled) {
    //         return this.$upOne.indexOf(leaf_node) != -1;
    //     }
    //     else {
    //         return false;
    //     }
    // }

    // public enterProcess() {
    //     if (!this.$wait) {
    //         return;
    //     }
    //     this.process();
    // }

    // public onLevelChanged() {
    //     let ok = this.isLevelOK();
    //     if (ok != this.$levelOK) {
    //         this.$levelOK = ok;
    //         this.enabled = ok;
    //     }
    // }

    public onNotifiesReceived(notifies: NotifyEntry[]) {
        NotifyMgr.getInstance().updateNotifies(notifies, true)
        // RedPointTreeManager.getInstance().startProcessor();
        // // 清空
        // this.clear();
        // this.$isAllReceived = true;
        // if (this.$enabled_wait != null) {
        //     this.enabled = this.$enabled_wait;
        //     this.$enabled_wait = null;
        // }
        // //
        // this.saveEntries(notifies, true);
        // this.process();
    }

    public onNotifiesUpdate(notifies: NotifyEntry[]) {
        NotifyMgr.getInstance().updateNotifies(notifies)
        // if (!this.$isAllReceived) {
        //     return;
        // }
        // for (let entry of notifies) {
        //     if (this.$updateList.indexOf(entry.leaf_node) == -1) {
        //         this.$updateList.push(entry.leaf_node)
        //     }
        // }
        // this.saveEntries(notifies, false);
        // this.process();
    }

    // private saveEntries(notifies: NotifyEntry[], isAll: boolean) {
    //     let elem: NotifyEntry;
    //     let found = false;
    //     for (let i = 0; i < notifies.length; ++i) {
    //         elem = notifies[i];
    //         if (!notify_cfg.isLeafNode(elem.leaf_node)) {
    //             continue; // 非叶子节点，忽视
    //         }
    //         if (elem.state && !RedPointTreeManager.getInstance()._checkUpdate(elem.leaf_node)) {
    //             continue; // 要显示已经隐藏的，忽视
    //         }
    //         let priority = notify_cfg.getShowPriority(elem.leaf_node);
    //         if (PRIORITY_LIST.indexOf(priority) == -1) {
    //             Logger.error(`[RedPointTreeStorage.saveEntries] ${elem.leaf_node}'s priority(${priority}) is error`);
    //             debug_helper.showError("RedPointError", "", `${elem.leaf_node}的显示优先级不应该配为${priority}`);
    //             priority = PRIORITY_SPEC;
    //         }
    //         if (isAll) {
    //             // 替换全部
    //             this.$entries[priority].push(elem);
    //         }
    //         else {
    //             // 有相同，则更新
    //             found = false;
    //             for (let j = 0; j < this.$entries[priority].length; ++j) {
    //                 if (this.$entries[priority][j].leaf_node == elem.leaf_node) {
    //                     this.$entries[priority][j] = elem;
    //                     found = true;
    //                     break;
    //                 }
    //             }
    //             // 没有就插入
    //             if (!found) {
    //                 this.$entries[priority].push(elem);
    //             }
    //         }
    //     }
    // }

    // private isLimit(priority: number) {
    //     return priority != PRIORITY_FIRST && priority != PRIORITY_SPEC;
    // }

    // private process() {
    //     let inst = RedPointTreeManager.getInstance();
    //     if (!inst.isProcessorFree()) {
    //         this.$wait = true;
    //         return;
    //     }
    //     this.$wait = false;
    //     let elem: NotifyEntry;
    //     let cnt = LIMIT_CNT; // 剩余限制数量（可负数）
    //     let affect_count: number; // 默认隐藏层数
    //     let node_list: string[]; // 层数拆分
    //     let cur_send_list: NotifyEntry[] = []; // 当前发送列表

    //     // 保存上次，清空本次
    //     this.$lastUpAll = this.$upAll;
    //     this.$lastUpOne = this.$upOne;
    //     this.$upAll = [];
    //     this.$upOne = [];
    //     let tempUpOne = []//补充时获取elem
    //     let lastUp = this.$lastUpAll.concat(this.$lastUpOne);
    //     // 遍历不同的优先级
    //     for (let i of PRIORITY_LIST) {
    //         // 排序规则
    //         this.$entries[i].sort((a, b) => a.leaf_node.localeCompare(b.leaf_node)); // 暂按字母顺序，策划未提供规则
    //         // 遍历同优先级的红点
    //         for (let j = 0; j < this.$entries[i].length; ++j) {
    //             elem = this.$entries[i][j];

    //             if (!elem.state) {
    //                 //这次隐藏上次不隐藏的要更新
    //                 if (lastUp.includes(elem.leaf_node)) {
    //                     cur_send_list.push(elem);
    //                 }
    //                 continue;
    //             }

    //             // 如果挂钩了openui，则判断openui是否开启
    //             affect_count = notify_cfg.affectCount(elem.leaf_node);
    //             node_list = RedPointTreeHelper.splitTreeNode(elem.leaf_node, affect_count);
    //             if (node_list.some(v => !RedPointTreeHelper.isTreeNodeLegal(v)) || i == PRIORITY_SPEC) {
    //                 if (!(this.$lastUpAll.includes(elem.leaf_node)) || this.checkNeedUpdate(elem.leaf_node)) {
    //                     cur_send_list.push(elem);
    //                 }
    //                 this.$upAll.push(elem.leaf_node);
    //                 continue;
    //             }

    //             if (this.isLimit(i) && (cnt <= 0 || this.$lastUpAll.indexOf(elem.leaf_node) == -1)) {
    //                 this.$upOne.push(elem.leaf_node);
    //                 tempUpOne.push(elem);
    //                 if (!(this.$lastUpOne.includes(elem.leaf_node)) || this.checkNeedUpdate(elem.leaf_node)) {
    //                     cur_send_list.push(elem);
    //                 }
    //             }
    //             else {
    //                 this.$upAll.push(elem.leaf_node);
    //                 if (!(this.$lastUpAll.includes(elem.leaf_node)) || this.checkNeedUpdate(elem.leaf_node)) {
    //                     cur_send_list.push(elem);
    //                 }
    //                 cnt--; // 当符合显示，占用一个坑
    //             }
    //         }
    //     }

    //     // 尝试补充进去
    //     if (cnt >= EMPTY_CNT) {
    //         let once_cnt = this.$upOne.length;
    //         if (once_cnt <= cnt) {
    //             this.$upAll = this.$upAll.concat(this.$upOne);
    //             this.$upOne.length = 0;
    //             for (let elem of tempUpOne) {//这里补充的一定不在lastUpAll，所以不用pop，只用判断上次是否在upOne里
    //                 if (this.$lastUpOne.includes(elem.leaf_node)) {
    //                     cur_send_list.push(elem);
    //                 }
    //             }
    //         }
    //         else {
    //             this.$upAll = this.$upAll.concat(this.$upOne.splice(0, cnt));
    //             for (let elem of tempUpOne) {
    //                 if (this.$lastUpOne.includes(elem.leaf_node) && this.$upAll.includes(elem.leaf_node)) {//同上，同时判断下是否在upAll里
    //                     cur_send_list.push(elem);
    //                 }
    //             }
    //         }

    //     }
    //     inst.onNotifiesUpdate(cur_send_list);
    //     // 移除界面内隐藏的叶子节点，避免下次重复发送
    //     for (let i of PRIORITY_LIST) {
    //         for (let j = this.$entries[i].length - 1; j >= 0; --j) {
    //             elem = this.$entries[i][j];
    //             if (!elem.state) {
    //                 this.$entries[i].splice(j, 1);
    //             }
    //         }
    //     }
    // }

    // private checkNeedUpdate(tree_node: string) {
    //     let index = this.$updateList.indexOf(tree_node)
    //     if (index != -1) {
    //         this.$updateList.splice(index, 1)
    //         return true
    //     }
    // }

    public printRpData(tree_node: string) {
        Logger.warn("没实现");

        // let tree_node_data
        // for (let i of PRIORITY_LIST) {
        //     for (let j = this.$entries[i].length - 1; j >= 0; --j) {
        //         let elem = this.$entries[i][j];
        //         if (elem.leaf_node == tree_node) {
        //             tree_node_data = elem
        //         }
        //     }
        // }
        // let isUpOne = this.$upOne.indexOf(tree_node) != -1
        // let count = isUpOne ? 1 : notify_cfg.affectCount(tree_node);
        // let node_list = RedPointTreeHelper.splitTreeNode(tree_node, count)
        // let btn_list = node_list.map(element => notify_cfg.getUIRef(element));

        // if (tree_node_data) {
        //     MessageBox(`树节点 ${tree_node} ===> 是否可见:${tree_node_data.state}  是否不传递:${this.$upOne.indexOf(tree_node) != -1} 传递层数:${count} 上层树节点：${node_list} 影响到的按钮列表：${btn_list}`)
        // }
        // else {
        //     MessageBox(`树节点 ${tree_node} 无客户端数据或不显示`)
        // }

    }
}