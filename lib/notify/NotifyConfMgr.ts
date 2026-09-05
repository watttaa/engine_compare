import { NotifyHelper } from "./NotifyHelper";
import { s2_notify_cfg } from "auto/notify";
import { NotifyLogger, NotifySkinConf } from "./Const";
/** skin、child、child... 映射到红点key
 * child可能是[0, n]个
 * 最后一层是[node, bindID]
 */
class NotifySkinMap {
    private map = new Map<string, NotifySkinConf[]>();
    setData(node: string, paths: string[], bindID: string) {
        const skinName = paths[0]
        const restPaths = paths.slice(1)
        if (!this.map.get(skinName)) {
            this.map.set(skinName, [])
        }
        this.map.get(skinName).push({
            node: node,
            childPaths: restPaths,
            bindID: bindID,
        })
        // let map = this
        // let i = 0
        // for (const name of paths) {
        //     if (i == paths.length - 1) {
        //         map[name] = [node, bindID]
        //         break
        //     }
        //     if (!map.get(name)) {
        //         map[name] = new NotifySkinMap()
        //     }
        //     map = map[name]
        //     ++i;
        // }
    }
    initData(refGetter: (s: string) => string, checker?: (n: string) => boolean) {
        this.map.clear()
        const uiSpliter = "|"
        const idSpliter = ":" // 比如open_id之类的
        const childSpliter = "." // exml的子控件
        const refUsed = {}
        if(!s2_notify_cfg.NotifyInfo) {
            return
        }
        for (const nodeKey in s2_notify_cfg.NotifyInfo) {
            const refNodes = refGetter(nodeKey);
            if ((checker && !checker(nodeKey)) || !refNodes) {
                continue
            }
            for (const oneUIRaw of refNodes.split(uiSpliter)) {
                const oneUI = oneUIRaw.replace(/\s+/g, ""); // 替换空格
                if (refUsed[oneUI]) {
                    NotifyLogger.error(`[NotifySkinMap.initData]: 一个ui控件（${oneUI}）只允许绑定一个红点树节点`);
                    debug_helper.showError("RedPointError", "", `一个ui控件（${oneUI}）只允许绑定一个红点树节点`);
                    continue;
                }
                refUsed[oneUI] = true;

                const [oneNotifyUI, bindID] = oneUI.split(idSpliter); // :
                const paths = oneNotifyUI.split(childSpliter); // .
                if (paths.some(path => /^\d+$/.test(path))) {
                    NotifyLogger.error(`[NotifySkinMap.initData]: UI路径配置错误，变量不能为纯数字 疑似“:”配成“.”。Key:${nodeKey}, Path:${oneNotifyUI}`);
                    debug_helper.showError("RedPointError", "", `[NotifySkinMap.initData]: UI路径配置错误，变量不能为纯数字 疑似“:”配成“.”。Key:${nodeKey}, Path:${oneNotifyUI}`);
                    // 如果发现纯数字节点，跳过当前的 setData，进入下一次循环
                    continue; 
                }
                this.setData(nodeKey, paths, bindID)
            }
        }
    }
    get(key: string) {
        return this.map.get(key)
    }
    get size() {
        return this.map.size
    }
}

/**
 * 对配置数据做一些转换用的
 * 比如建立中间节点到子节点的索引
 */
export class NotifyConfMgr extends SingletonClassEx {
    private inited = false;
    private nodeToChilds = new Map<string, Set<string>>()
    private skinMap = new NotifySkinMap()
    private touchSkinMap = new NotifySkinMap()

    public start() {
        this.init()
    }
    /**获取配表中的所有一级子节点*/
    public getChilds(node: string) {
        if (!this.inited) {
            this.init()
        }
        return this._getChilds(node)
    }
    /** 往下找到所有叶子 */
    public getLeafNodes(node: string) {
        this.init()
        const childs = this.getChilds(node) // Set<string>
        if (!childs || !childs.size) {
            return [node]
        }
        const arr: string[] = []
        for (const child of childs) {
            arr.push(...this.getLeafNodes(child))
        }
        return arr
    }
    private _getChilds(node: string, create = false) {
        let childs = this.nodeToChilds.get(node);
        if (childs === undefined) {
            if (!create) {
                return undefined;
            }
            childs = new Set<string>();
            this.nodeToChilds.set(node, childs)
        }
        return childs
    }
    private init() {
        if (this.inited) {
            return
        }
        if(!s2_notify_cfg.NotifyInfo) {
            NotifyLogger.warn(`[NotifySkinMap.initData]: no s2_notify_cfg.NotifyInfo. will delay init`);
            return
        }
        for (const node of Object.keys(s2_notify_cfg.NotifyInfo)) {
            if (!s2_notify_cfg.isLeafNode(node)) {
                continue
            }
            let childNode: string = undefined
            for (const iNode of NotifyHelper.splitNodePath(node).reverse()) {
                if (childNode) {
                    this._getChilds(iNode, true).add(childNode)
                }
                childNode = iNode
            }
        }
        this.initSkinMap()
        this.validateRelation()
        this.inited = true
    }
    private initSkinMap() {
        if (this.skinMap.size || !s2_notify_cfg.NotifyInfo) {
            return;
        }
        this.skinMap.initData(s2_notify_cfg.getUIRef)
        this.touchSkinMap.initData(s2_notify_cfg.getUITouch, (n) => {
            return s2_notify_cfg.getHidePolicy(n) !== s2_notify_cfg.LoginHideType.NONE
        })
    }
    public getSkinConfs(exml: string, isTouch = false) {
        if (!exml) {
            return [];
        }
        this.init()
        const map = isTouch ? this.touchSkinMap : this.skinMap

        let basename = RES.path.basename(exml);
        basename = basename.substring(0, basename.lastIndexOf("."));

        return map.get(basename) || []
    }
    /**
     * 校验关联映射，不能双向
     */
    private validateRelation(){
        const relationNodeToOrigin = new Map<string, string>()
        for (const node of Object.keys(s2_notify_cfg.NotifyInfo)) {
            for (const relationNode of s2_notify_cfg.getRelationNode(node)) {
                if(!s2_notify_cfg.isLeafNode(relationNode)) {
                    NotifyLogger.error(`[NotifyConfMgr.validateRelation] 关联关系错误，关联的目标节点只能是叶子: ${node} -> ${relationNode}`)
                }
                relationNodeToOrigin.set(relationNode, node)
            }
        }
        for (const node of Object.keys(s2_notify_cfg.NotifyInfo)) {
            for (const relationNode of s2_notify_cfg.getRelationNode(node)) {
                if (relationNodeToOrigin.get(node) === relationNode) {
                    NotifyLogger.error(`[NotifyConfMgr.validateRelation] 关联关系错误，双向关联: ${node} -> ${relationNode}`)
                }
            }
        }
    }
}