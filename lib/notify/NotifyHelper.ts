import { s2_notify_cfg } from "auto/notify";
import { GlobalEvent } from "GlobalEventDefine";
import { RED_SKIN } from "GlobalValue";
import { BaseGrid } from "lib/euiex/BaseGrid";
import { NotifyCNet } from "net/NotifyCNet";
import { isOpenIdEnabled } from "openui/OpenUIUtil";
import { HIDE_NOTIFY_SPLITER, NotifyBindDict, NotifyBindValue, NotifyBindWithExtra, NotifyEntry, NotifyID, NotifyLogger, NotifyServerEntry, NotifyUIType, PRIORITY_FIRST, PRIORITY_SPEC, RedPointStyles, ServerNotifyBindDict } from "./Const";
import { NotifyUIMgr } from "./NotifyUIMgr";

type SkinState = "default" | "new" | "up" | "num" | "at" | "bubble"
export namespace NotifyHelper {
    /**
     * 拆分树节点 从上往下
     * @param tree_node 比如a.b.c
     * @returns 返回 a, a.b, a.b.c
     */
    export function splitNodePath(tree_node: string): string[] {
        const ret: string[] = [];
        let parent = "";
        for (const part of tree_node.split(".")) {
            parent += parent ? "." + part : part
            ret.push(parent)
        }
        return ret
    }
    /**
     * 构造子节点的字典
     * @param tree_node 比如a.b.c
     * @returns 返回 {a: a.b, "a.b": "a.b.c", "a.b.c": "a.b.c"}
     */
    export function genPathMap(tree_node: string): Map<string, string> {
        const ret = new Map<string, string>();
        const paths = splitNodePath(tree_node)
        if (paths.length > 0) {
            ret.set("", paths[0])
        }
        for (let i = 0; i < paths.length - 1; ++i) {
            const nextI = i + 1
            ret.set(paths[i], paths[nextI])
        }
        return ret
    }

    /**兼容没配优先级的情况 */
    export function getValidShowPrio(node: string) {
        const prio = s2_notify_cfg.getShowPriority(node);
        if (prio < PRIORITY_FIRST) {
            return PRIORITY_SPEC
        }
        return prio
    }

    // export function isBindAnyRed(obj: NotifyBindDict): boolean {
    //     return Object.values(obj).some((value) => {
    //         // 情况 1: 值是布尔类型
    //         if (typeof value === 'boolean') {
    //             return value === true;
    //         }

    //         // 情况 2: 值是对象类型（且不为 null），进行递归检查
    //         if (typeof value === 'object' && value !== null) {
    //             return isBindAnyRed(value);
    //         }

    //         return false;
    //     });
    // }

    export function isRed(notify: NotifyEntry): boolean {
        if (notify.bindIds) {
            // 默认亮吧，叶子会单独处理亮灭的
            return true
        }
        return notify.state || false
    }
    export function isEntryChanged(notify: NotifyEntry, afterNotify: NotifyEntry): boolean {
        if (notify.state != afterNotify.state) {
            return true
        }
        if (notify.extra != afterNotify.extra) {
            return true
        }
        return false
    }
    export function isBindDict(old: NotifyBindDict | NotifyBindWithExtra, depth: number): old is NotifyBindDict {
        if (typeof old === "object") {
            return depth > 0
        }
        return false
    }
    function _updateBindObj(old: NotifyBindDict, newBind: NotifyBindDict, depth: number) {
        for (const [key, newValue] of Object.entries(newBind)) {
            const oldValue = old[key]
            if (NotifyHelper.isBindDict(oldValue, depth) && NotifyHelper.isBindDict(newValue, depth)) {
                _updateBindObj(oldValue, newValue, depth - 1)
            } else {
                old[key] = newValue
            }
        }
    }
    export function updateBindObj(node: string, old: NotifyBindDict, newBind: NotifyBindDict) {
        return _updateBindObj(old, newBind, s2_notify_cfg.getBindLevel(node))
    }
    /**
     * 将指定key更新到obj里
     * @param obj 
     * @param notifyIds 
     * @param isRed 更新后的值
     * @returns 
     */
    export function updateBindIds(obj: NotifyBindDict, notifyIds: NotifyID[], value: NotifyBindWithExtra) {
        if (!obj || !notifyIds || notifyIds.length === 0) {
            return obj;
        }

        let current = obj;

        for (let i = 0; i < notifyIds.length - 1; i++) {
            const key = String(notifyIds[i]);

            const value = current[key];

            if (typeof value !== "object" || value === null) {
                const newObj: NotifyBindDict = {};
                current[key] = newObj;
                current = newObj;

            } else {
                current = value as NotifyBindDict;
            }
        }

        const lastKey = String(notifyIds[notifyIds.length - 1]);
        current[lastKey] = value;
        return obj
    }
    export function getUINotifyIds(ui: NotifyUIType) {
        let bindIds = undefined
        if (ui instanceof egret.DisplayObject) {
            bindIds = ui.notifyIds
        }
        return bindIds
    }
}

export namespace NotifyHelper {

    /** 红点类型控件名 */
    const RedPointNodeName = ["point", "effect"]; // 皮肤里最好做到互斥，代码不好检验
    const RedPoint_Point = 0;
    const RedPoint_Effect = 1;

    export const RedPointFuncName = "pointVisibleFunc";
    export const RedPointFuncValue = "pointVisibleValue"

    interface RedPointNodeType { name: string, state?: SkinState }
    /** 红点样式对应的控件与状态 */
    const RedPointNodeStyle: { [key: number]: RedPointNodeType } = {};
    RedPointNodeStyle[RedPointStyles.RED] = { name: RedPointNodeName[RedPoint_Point], state: "default" };
    RedPointNodeStyle[RedPointStyles.NUM] = { name: RedPointNodeName[RedPoint_Point], state: "num" };
    RedPointNodeStyle[RedPointStyles.EFFECT] = { name: RedPointNodeName[RedPoint_Effect] };
    RedPointNodeStyle[RedPointStyles.NEW] = { name: RedPointNodeName[RedPoint_Point], state: "new" };
    RedPointNodeStyle[RedPointStyles.UP] = { name: RedPointNodeName[RedPoint_Point], state: "up" };
    RedPointNodeStyle[RedPointStyles.AT] = { name: RedPointNodeName[RedPoint_Point], state: "at" };
    RedPointNodeStyle[RedPointStyles.XIANYU] = { name: RedPointNodeName[RedPoint_Point], state: "bubble" };

    /** 若UI没有皮肤里添加红点控件，则主动添加一张不可被隐藏的红点图片（与通用红点颜色不相同） */
    const WRONG_RED_SKIN = "com_reddot_wrong_png";
    const WRONG_RED_Z = 10000;

    /**
     * 拆分树节点
     * 假如，节点的格式为main.more.bag.capicity，拆分结果如下：
     *               main.more.bag.capicity
     *               main.more.bag
     *               main.more
     *               main
     * 共4层，从最长到最短排序
     * @param limit 获取的层数，表示节点的影响范围
     */
    export function splitTreeNode(tree_node: string, limit = 0): string[] {
        const ret: string[] = [];
        let parent = tree_node;
        while (parent != "" && parent != undefined) {
            ret.push(parent);
            if (limit > 0 && ret.length == limit) {
                break;
            }
            let index = parent.lastIndexOf(".");
            if (index === -1) {
                break;
            }
            parent = parent.slice(0, index);
        }
        return ret;
    }

    /**
     * 判断是否存在子孙关系，自己也算
     * @param child 
     * @param parent 
     */
    export function isChild(child: string, parent: string) {
        if (child === parent) return true;
        if (child.indexOf(parent) == 0 && child[parent.length] == ".") return true;
        return false;
    }

    /** 绑定动效动画到目标 */
    export function bindEffect(widget: any, effect_show: egret.tween.TweenGroup, effect_hide: egret.tween.TweenGroup) {
        const style = RedPointStyles.EFFECT;
        const name = RedPointNodeStyle[style].name;
        widget[name] = [effect_show, effect_hide];
    }

    export function unbindEffect(widget: any) {
        const style = RedPointStyles.EFFECT;
        const name = RedPointNodeStyle[style].name;
        delete widget[name];
    }

    function handleEffect(widget: any, visible: boolean) {
        const style = RedPointStyles.EFFECT;
        const name = RedPointNodeStyle[style].name;
        let effect_show = widget[name][0] as egret.tween.TweenGroup;
        let effect_hide = widget[name][1] as egret.tween.TweenGroup;
        // 先停后播
        visible ? effect_hide.stop() : effect_show.stop();
        visible ? effect_show.play(0) : effect_hide.play(0);
    }

    /** 添加红点 */
    export function addPointOnWidget(widget: any, visible: boolean, style: RedPointStyles = RedPointStyles.RED) {
        // NotifyLogger.debug("addPointOnWidget", widget, visible, style, dbg_node)
        safeInvokeFunc(widget, () => {
            // NotifyLogger.debug("addPointOnWidget invoked", widget, visible, style)
            addRedPointOnWidget(widget, visible, style);
        });
    }

    function getRedComp(widget: egret.DisplayObject, name: string) {
        if (widget instanceof egret.DisplayObjectContainer) {
            if (widget["isDynamicRedPoint"]) {
                return widget["redComp"]; // ItemGrid的红点是动态创建的，特殊处理下
            }
            return widget.getChildByName(name);
        }
    }

    function checkRedPoint(widget: egret.DisplayObject, tree_node: string) {
        if (!LoginValue.InnerTest) return;
        let cnt = 0;
        for (let v of RedPointNodeName) {
            let _w = widget[v];
            if (!_w && widget instanceof egret.DisplayObjectContainer) {
                _w = getRedComp(widget, v);
                _w && (widget[v] = _w);
            }
            if (_w) {
                cnt++;
            }
        }
        // 判断widget是不是eui.list类型
        let isList: boolean = widget instanceof eui.List;
        if (cnt == 0 && !isList) {
            // 没有任何红点组件，则手动添加一个红点
            NotifyLogger.error(`自动创建了一个红点控件，需要UI添加，红点会异常显示(${tree_node})`);
            debug_helper.showError("RedPointError", "", `自动创建了一个红点控件，需要UI添加，红点会异常显示(${tree_node})`);

            let img = insertWrongRedPoint(widget instanceof egret.DisplayObjectContainer ? widget : widget.parent);
            widget[RedPointNodeName[RedPoint_Point]] = img;
        }
        else if (cnt == 1) {
            // 正常，有且应该只有一个红点组件
        }
        else {
            // 红点组件过多，客户端不好控制
        }
        // 运行时检测
        // checkWidgetState(baseInst, _widget);
    }

    /** 给显示对象窗口添加 */
    function insertWrongRedPoint(widget: egret.DisplayObjectContainer) {
        let img = new eui.Image(WRONG_RED_SKIN);
        widget.addChild(img);
        img.z = WRONG_RED_Z;
        // 自动创建的，无法被隐藏，方便QA测试
        if (LoginValue.InnerTest) {
            img.$setVisible = function (value: boolean) {
                egret.DisplayObject.prototype.$setVisible(true);
            }
        }
        return img;
    }

    export function checkWidgetState(baseInst: eui.Component, widget: BaseWidget, childPaths: string[]) {
        if (!LoginValue.InnerTest) return;
        if (!childPaths) {
            return
        }
        // 老司机说 有多层的情况下，只判断最后一层
        for (const childName of childPaths.slice(0, -1)) {
            baseInst = baseInst[childName]
        }

        let show_err = false;
        // 如果红点所在控件会切皮肤，那么它的红点就会有显示问题，这里做个运行时检测
        if (baseInst.skin && baseInst.skin.states) {
            for (let state of baseInst.skin.states) {
                if (state.overrides) {
                    for (let override of state.overrides) {
                        if (override instanceof eui.SetProperty &&
                            override.target == childPaths[-1] && override.name == "skinName") {
                            show_err = true;
                            break;
                        }
                    }
                }
                if (show_err) {
                    break;
                }
            }
        }
        if (show_err) {
            debug_helper.showError("RedPointError", "", `${baseInst.skinName}界面的红点组件${childPaths}可能会切状态，导致红点异常`);
        }
        show_err = false;
        if (widget instanceof BaseGrid) {
            show_err = true;
        }
        if (show_err) {
            debug_helper.showError("RedPointError", "", `不应该将红点绑定在ItemGrid上 - ${baseInst.skinName}.${childPaths}`);
        }
    }

    export function addRedPointOnWidget(widget: any, visible: boolean, style = RedPointStyles.RED, extra: any = null, tree_node = "") {
        // NotifyLogger.debug("addRedPointOnWidget", widget, visible, style, "extra", extra, "tree_node", tree_node)
        LoginValue.InnerTest && checkRedPoint(widget, tree_node);
        if (!visible || style == RedPointStyles.NONE) {
            // 不显示红点
            for (let v of RedPointNodeName) {
                let _w = widget[v];
                if (!_w && widget instanceof egret.DisplayObjectContainer) {
                    _w = getRedComp(widget, v);
                    if (_w) widget[v] = _w;
                }
                if (!_w) {
                    continue;
                }
                if (_w instanceof egret.DisplayObject) {
                    // 单个显示对象
                    _w.visible = false;
                }
                else if (_w instanceof Array) {
                    // 数组对象，肯定是动效
                    handleEffect(widget, false);
                }
                storeRedPointWidget(widget, false);
                break;
            }
            return;
        }
        let params = RedPointNodeStyle[style];
        let _w: egret.DisplayObject = widget[params.name];
        if (!_w && style == RedPointStyles.EFFECT) {
            NotifyLogger.error(`控件未绑定动效，需要脚本添加，当前会使用红点显示(${tree_node})`);
            debug_helper.showError("RedPointError", "", `控件未绑定动效，需要脚本添加，当前会使用红点显示(${tree_node})`);
            // 改成用红点, 重新设置
            style = RedPointStyles.RED;
            params = RedPointNodeStyle[style];
            _w = widget[params.name];
        }
        /**
         * 注释原因，切皮肤更好需要主动发起，不好写
         * 改成拼接同学来处理：
         * 方法1：红点不要放在需要切换皮肤的控件上
         * 方法2：控件不做整个皮肤切换，只对内部控件单独切换
         * 
         * 同时以下代码，只要跑进来就会执行，效率不行，强烈不建议
         * 
        // 按钮的皮肤更换了，需要重新获取新的红点对象
        if (_w && style != RedPointStyles.EFFECT) {
            let __w = getRedComp(widget, params.name) as egret.DisplayObject;
            if (__w && __w != _w) {
                widget[params.name] = _w = __w;
            }
        }
        */
        if (!_w || (!_w.parent && style == RedPointStyles.RED)) {
            if (widget instanceof egret.DisplayObjectContainer) {
                _w = getRedComp(widget, params.name) as egret.DisplayObject;
                !_w && (_w = insertWrongRedPoint(widget));
                _w && (widget[params.name] = _w);
            }
        }
        if (style == RedPointStyles.EFFECT && _w) {
            // 动效
            handleEffect(widget, true);
            storeRedPointWidget(widget, true);
        }
        else if (_w) {
            //
            _w.visible = true;
            if (_w instanceof eui.Component) _w.skinName = RED_SKIN;
            storeRedPointWidget(widget, true);
            // 红点忽略点击
            _w.skipTouch = true;
            // 状态切换
            if (_w instanceof eui.Component || _w instanceof eui.Group) {
                if (params.state) {
                    _w.currentState = params.state;
                }
                if (style == RedPointStyles.NUM) {
                    if (extra && extra.num) {
                        safeInvokeFunc(_w, (node: eui.Component & { lblNum: eui.Label }, num: number) => {
                            let func = () => {
                                let text = num < 100 ? "" + num : "99+";
                                node.lblNum.text = text;
                            }
                            if (node.lblNum) {
                                func();
                            }
                            else {
                                node.once(egret.Event.COMPLETE, func, this);
                            }
                        }, [_w, extra.num]);
                    } else {
                        _w.currentState = "default";
                    }
                }

            }
        }
        else {
            NotifyLogger.error(`要显示红点，但没有添加point的控件(${tree_node})`);
            debug_helper.showError("RedPointError", "", `要显示红点，但没有添加point的控件(${tree_node})`);
        }
    }

    export function alphaRed(widget: egret.DisplayObject, alpha: 0 | 1) {
        for (let v of RedPointNodeName) {
            let _w = widget[v];
            if (!_w) {
                continue;
            }
            if (_w instanceof eui.Component) {
                _w.alpha = alpha;
                // _w.skinName = alpha == 1 ? RED_SKIN : null; // 影响到背包的分解按钮，先注释
            }
            else if (_w instanceof Array) {
            }
            break;
        }
    }

    // let $visibleRedArr: egret.DisplayObject[] = [];
    export function storeRedPointWidget(widget: egret.DisplayObject, visible: boolean) {
        NotifyUIMgr.getInstance().storeRedPointWidget(widget, visible)
    }

    /** 将不显示的移除队列 */
    export function delNoStage() {
        // let newArr: egret.DisplayObject[] = [];
        // for (let i = 0; i < $visibleRedArr.length; ++i) {
        //     if ($visibleRedArr[i].stage) {
        //         newArr.push($visibleRedArr[i]);
        //     }
        // }
        // $visibleRedArr.length = 0;
        // $visibleRedArr = newArr;
    }

    export function closeAllRedTreeNode() {
        $allTips.forEach(v => {
            if (!v) return;
            egret.Tween.removeTweens(v);
            UIManager.stage.removeChild(v);
        })
        $allTips.length = 0;
    }

    const $allTips: eui.Group[] = [];
    export function showDbgTips(trees: string[], x: number, y: number) {
        let tip = createTip(x, y);
        if (!tip) return;
        let { group, rlbl } = tip;
        rlbl.text = trees.join("#r");
        $allTips.push(group);
        //
        let removeFunc = () => {
            let tw = egret.Tween.get(group);
            tw.wait(5000).call(() => {
                preload_utils_list.delIfExist($allTips, group);
                UIManager.stage.removeChild(group);
            }, this);
            UIManager.stage.removeEventListener(egret.TouchEvent.TOUCH_CANCEL, removeFunc, this);
            UIManager.stage.removeEventListener(egret.TouchEvent.TOUCH_END, removeFunc, this);
        };
        removeFunc();
        //
        let start_x: number, start_y: number;
        group.addEventListener(egret.TouchEvent.TOUCH_BEGIN, (evt: egret.TouchEvent) => {
            egret.Tween.removeTweens(group);
            //
            start_x = evt.stageX;
            start_y = evt.stageY;
            UIManager.stage.addEventListener(egret.TouchEvent.TOUCH_CANCEL, removeFunc, this);
            UIManager.stage.addEventListener(egret.TouchEvent.TOUCH_END, removeFunc, this);
        }, this);
        group.addEventListener(egret.TouchEvent.TOUCH_MOVE, (evt: egret.TouchEvent) => {
            group.x += evt.stageX - start_x;
            group.y += evt.stageY - start_y;
            start_x = evt.stageX;
            start_y = evt.stageY;
        }, this);
    }

    function createTip(x: number, y: number) {
        let group = new eui.Group();
        group.touchEnabled = true;
        group.touchChildren = false;
        UIManager.stage.addChild(group);
        //
        let bg = new eui.Image("bg_tishi_png");
        bg.fillMode = "scale";
        bg.left = bg.right = bg.top = bg.bottom = 0;
        bg.scale9Grid = new egret.Rectangle(10, 10, 40, 30);
        group.addChild(bg);
        //
        let rlbl_grp = new eui.Group();
        rlbl_grp.left = rlbl_grp.right = rlbl_grp.top = rlbl_grp.bottom = 5;
        group.addChild(rlbl_grp);
        //
        let rlbl = new RichLabel(99999);
        rlbl.addEventListener(GlobalEvent.RichLabelEvent.RBL_LAYOUT_CHANGED, () => {
            rlbl_grp.width = rlbl.width;
            rlbl_grp.height = rlbl.height;
            group.x = x - rlbl.width / 2 - 5;
            group.y = y - rlbl.height;
        }, this);
        rlbl.size = 16;
        rlbl.lineSpacing = 0;
        rlbl.x = rlbl.y = 0;
        rlbl_grp.addChild(rlbl);
        return { group, rlbl };
    }

    // export function calcBindLevel(d: NotifyBindDict, depth = 0) {
    //     for (const key in d) {
    //         const value = d[key]
    //         if (typeof value === "object") {
    //             return calcBindLevel(value, depth + 1)
    //         }
    //         return depth + 1
    //     }
    //     return depth
    // }
    export function isExtraEmpty(extra: any) {
        if (extra === undefined) {
            return true
        }
        if (typeof extra === 'object') {
            return Object.keys(extra).length === 0
        }
        if (Array.isArray(extra)) {
            return extra.length === 0
        }
        return true
    }
    /**
     * 将服务器数据转换成统一接口
     * @param bind 服务器数据
     */
    function _notifyBindToClientImp(node: string, bind: boolean | NotifyBindWithExtra | ServerNotifyBindDict, depth: number, origin_bind: ServerNotifyBindDict): NotifyBindDict | NotifyBindWithExtra {
        if (depth < 0) {
            depth = s2_notify_cfg.getBindLevel(node)
        }
        if (typeof bind === "boolean") {
            if (depth === 0) {
                return {
                    red: bind
                }
            } else {
                NotifyLogger.error(`[NotifyHelper.notifyBindToClient] 绑定层级错误 node=${node} bind=${bind} origin_bind=`, origin_bind)
                return {}
            }
        } else if (depth === 0) {
            return bind as NotifyBindWithExtra
        }
        const ret: NotifyBindDict = {}
        for (const key in bind) {
            const value = bind[key]
            ret[key] = _notifyBindToClientImp(node, value, depth - 1, origin_bind)
        }
        return ret
    }
    /**
     * 将服务器数据转换成统一接口
     * @param bind 服务器数据
     */
    function notifyBindToClient(node: string, bind: ServerNotifyBindDict): NotifyBindDict {
        return _notifyBindToClientImp(node, bind, s2_notify_cfg.getBindLevel(node), bind) as NotifyBindDict
    }
    function toNotifyEntryOne(v: NotifyServerEntry): NotifyEntry {
        const [node, data] = v
        const bindIds = notifyBindToClient(node, data.bind)
        let isRed = data.red || false
        return { leaf_node: node, state: isRed || false, extra: data.extra || [], bindIds: bindIds, isAll: data.is_all || false, effectCount: data.up_cnt || 0 }
    }
    /** 将数组转成字典型 */
    export function toNotifyEntry(data: NotifyServerEntry[]) {
        return data.map(toNotifyEntryOne);
    }

    /** 检查树节点是否为叶节点 */
    export function checkLeafNode(entry_list: NotifyEntry[]) {
        for (let v of entry_list) {
            for (let k in s2_notify_cfg.NotifyInfo) {
                if (v.leaf_node.length < k.length && k.indexOf(v.leaf_node) == 0 && k[v.leaf_node.length] == ".") {
                    NotifyLogger.warn(`[RedPointTreeHelper.checkLeafNode] 非叶节点的红点定义: ${v.leaf_node} ${k}`);
                    break
                }
            }
        }
    }

    /**
     * input:
     *     "A.B | C.D:E | F:G | H"
     * return:
     *     [
     *         ["A", "B", ""],
     *         ["C", "D", "E"],
     *         ["F", "", "G"],
     *         ["H", "", ""]
     *     ]
     * @returns [皮肤名，子控件名，绑定id][]
     */
    export function splitUI(text: string) {
        let ret: [string, string, string][] = [];
        // A.B | C.D:E | F:G | H
        // A.B：表示A.exml的控件B
        // C.D:E：表示C.exml的控件D，同时满足E条件
        // F:G：表示F.exml的根节点控件，同时满足G条件
        // H：表示H.exml的根节点
        // 注意：不允许填写X.Y.Z这种三层结构甚至大于三层结构，因为不存在Y.Z的关系（容错处理，直接一头一尾X.Z作为节点使用）
        // let sym = ['|', ":", "."];
        const bindSpliter = "|" // 填表支持一个红点绑定多个ui
        const idSpliter = ":" // 比如open_id之类的
        const childSpliter = "." // exml的子控件
        text.split(bindSpliter).forEach(oneNotifyUIRaw => { // |
            //
            let [oneNotifyUI, bindID] = oneNotifyUIRaw.split(idSpliter); // :
            let z = oneNotifyUI.split(childSpliter); // .
            //
            const skinName = z[0]
            const childName = z.length == 1 ? "" : z[z.length - 1]
            if (DEV && z.length > 2) {
                NotifyLogger.error(`[RedPointTreeHelper._genUIRefLazy]: cUIRef层数(${text})只能为2层`);
                debug_helper.showError("RedPointError", "", `[RedPointTreeHelper._genUIRefLazy]: cUIRef层数(${text})只能为2层`);
            }
            ret.push([skinName, childName, bindID]);
        });
        return ret;
    }

    /**
     * @param text 配表绑定的ui
     * @returns [皮肤名，子控件名，绑定id][]
     */
    export function splitUI2(text: string) {
        const ret: [string[], string][] = [];
        // A.B | C.D:E | F:G | H
        // A.B：表示A.exml的控件B
        // C.D:E：表示C.exml的控件D，同时满足E条件
        // F:G：表示F.exml的根节点控件，同时满足G条件
        // H：表示H.exml的根节点
        // 允许填写X.Y.Z这种三层结构甚至大于三层结构
        // let sym = ['|', ":", "."];
        const bindSpliter = "|" // 填表支持一个红点绑定多个ui
        const idSpliter = ":" // 比如open_id之类的
        const childSpliter = "." // exml的子控件
        text.split(bindSpliter).forEach(oneNotifyUIRaw => { // |
            //
            const [oneNotifyUI, bindID] = oneNotifyUIRaw.split(idSpliter); // :
            const paths = oneNotifyUI.split(childSpliter); // .
            //
            // const skinName = paths[0]
            // const childName = paths.length == 1 ? "" : paths[paths.length - 1]
            // if (DEV && paths.length > 2) {
            //     NotifyLogger.error(`[RedPointTreeHelper._genUIRefLazy]: cUIRef层数(${text})只能为2层`);
            //     debug_helper.showError("RedPointError", "", `[RedPointTreeHelper._genUIRefLazy]: cUIRef层数(${text})只能为2层`);
            // }
            ret.push([paths, bindID]);
        });
        return ret;
    }

    // let uiRef: null | { [key: string]: [string, string, string][] } = null;
    // let uiTouch: null | { [key: string]: [string, string, string][] } = null;
    // function _genUIRefLazy(): void {
    //     if (uiRef || !notify_cfg.NotifyInfo) {
    //         return;
    //     }

    //     let ref = {}, touch = {};
    //     let ref_used = {}; // 标识ui控件是否已经绑定了红点
    //     for (let nodeKey in notify_cfg.NotifyInfo) {
    //         let ref_nodes = notify_cfg.getUIRef(nodeKey);
    //         if (ref_nodes) {
    //             if (ref_used[ref_nodes]) {
    //                 NotifyLogger.error(`[RedPointTreeHelper._genUIRefLazy]: 一个ui控件（${ref_nodes}）只允许绑定一个红点树节点`);
    //                 debug_helper.showError("RedPointError", "", `一个ui控件（${ref_nodes}）只允许绑定一个红点树节点`);
    //                 continue;
    //             }
    //             ref_used[ref_nodes] = true;
    //             //
    //             ref_nodes = ref_nodes.replace(/\s+/g, ""); // 替换空格
    //             splitUI(ref_nodes).forEach(([skinName, childName, bindID]) => {
    //                 ref[skinName] = ref[skinName] || [];
    //                 ref[skinName].push([nodeKey, childName, bindID]);
    //             });
    //         }
    //         let _type = notify_cfg.getHidePolicy(nodeKey);
    //         let touch_nodes = notify_cfg.getUITouch(nodeKey);
    //         if (_type != notify_cfg.LoginHideType.NONE && touch_nodes) {
    //             //
    //             touch_nodes = touch_nodes.replace(/\s+/g, ""); // 替换空格
    //             splitUI(touch_nodes).forEach(([_A, _B, _C]) => {
    //                 touch[_A] = touch[_A] || [];
    //                 touch[_A].push([nodeKey, _B, _C]);
    //             });
    //         }
    //     }
    //     uiRef = ref;
    //     uiTouch = touch;
    //     ref_used = {};
    // }

    /** 
     * 获取ui对应的红点树节点与控件
     * 为什么多个？ 因为一个皮肤可能多个子控件 绑定了不同的红点
     */
    // export function getUIRef(exml: string, isTouch = false): [string, string, string][] {
    //     _genUIRefLazy();

    //     let basename = RES.path.basename(exml);
    //     basename = basename.substring(0, basename.lastIndexOf("."));

    //     if (isTouch) {
    //         if (uiTouch && uiTouch[basename]) {
    //             return uiTouch[basename];
    //         }
    //     }
    //     else {
    //         if (uiRef && uiRef[basename]) {
    //             return uiRef[basename];
    //         }
    //     }
    //     return [];
    // }

    /** 请示指定红点的更新 */
    export function updateNotifies(list: string[]) {
        NotifyCNet.C_REQUEST_NOTIFIES(list)
    }

    /** 注册红点 */
    export function registerWidgetPoint(tree_node: string, widget: any) {
        safeInvokeFunc(widget, () => {

            NotifyUIMgr.getInstance().registerWidgetPoint(tree_node, widget);
        });
    }

    /** 移除注册在widget上的指定红点 */
    export function unRegisterWidgetPoint(tree_node: string, widget: NotifyUIType, hide = true) {
        safeInvokeFunc(widget as any, () => {
            NotifyUIMgr.getInstance().unRegisterWidgetPoint(tree_node, [], widget, hide);
        });
    }

    /** 判断树结点在openui下是否开放进入（数组中任意一个openid开放即合法） */
    export function isTreeNodeLegal(tree_node: string) {
        let openuiList = s2_notify_cfg.getCheckOpenUI(tree_node);
        if (!openuiList || openuiList.length === 0) {
            return true;
        }
        for (let i = 0; i < openuiList.length; i++) {
            if (isOpenIdEnabled(openuiList[i], false)) {
                return true;
            }
        }
        return false;
    }
    export function notifyIdsEq(nids: NotifyID[], nids2: NotifyID[]) {
        // if(nids && nids.length === 0) {
        //     nids = undefined
        // }
        // if(nids2 && nids2.length === 0) {
        //     nids2 = undefined
        // }
        if (!nids || !nids2) {
            return nids === nids2
        }
        if (nids.length !== nids2.length) {
            return false
        }
        for (let i = 0; i < nids.length; ++i) {
            if (nids[i] != nids2[i]) {
                return false
            }
        }
        return true
    }
    export function nodeToIds(node: string, bindIds: NotifyID[]) {
        if (bindIds && bindIds.length) {
            return [node, ...bindIds]
        }
        return [node]
    }
    export function nodeToHideStr(node: string, notifyIds: NotifyID[]) {
        if (!notifyIds || !notifyIds.length) {
            return node
        }
        return node + HIDE_NOTIFY_SPLITER + notifyIds.map(id => id.toString()).join(HIDE_NOTIFY_SPLITER);
    }
    export function strToHideNode(notifyIds: string): [string, NotifyID[]] {
        const nodes = notifyIds.split(HIDE_NOTIFY_SPLITER)
        return [nodes[0], nodes.slice(1)]
    }
    export function getEntryBindLevel(entry: NotifyEntry): number {
        return s2_notify_cfg.getBindLevel(entry.leaf_node)
    }
}