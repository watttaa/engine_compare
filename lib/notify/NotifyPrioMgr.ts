import { s2_notify_cfg } from "auto/notify";
import { NotifyHelper } from "./NotifyHelper";
import { PRIORITY_FIRST, NotifyEntry, PRIO_LIMIT_CNT, PRIORITY_SPEC, NotifyEntryMap, NotifyLogger  } from "./Const";
import { OrderedMap } from "lib/js-sdsl";
/**
 * 优先级管理器
 * 优先级需求：
 *  * 优先级1和9一定显示
 *  * 除优先级1节点外，按优先级排序只显示20个红点（数量包含优先级1）
 *  * 已经激活的节点不会因为优先级问题导致灭掉，而只会限制新产生的红点
 *  * 优先级不会限制叶子节点的显示，本质上是限制向上传递层数，变为不传
 *  * 如果高优先级红点消失，低优先级红点会触发传递
 * 实现逻辑转换：
 *  优先级理解为动态改变向上传递层数，仅在红点从灭到亮的情况下，动态读取向上传递层数
 */

export class NotifyPrioMgr {
    /**按优先级顺序保存的节点 只包含亮着的 */
    private prioOrderNodes = new OrderedMap<string, NotifyEntry>([], (x, y) => {
        const p1 = NotifyHelper.getValidShowPrio(x)
        const p2 = NotifyHelper.getValidShowPrio(y)
        if(p1 != p2) {
            return p1 - p2
        }
        if (x < y) {
            return -1
        } else if (x > y) {
            return 1
        }
        return 0
    })
    /**当前满足优先级展示的节点 只包含亮着的 可以认为是上一次结算的结果 prioOrderNodes的子集*/
    private highPrioNodes = new Map<string, NotifyEntry>()
    // /** highPrioNodes.size - 特殊优先级个数*/
    // private highPrioCnt = 0

    destroy() {
        this.prioOrderNodes.clear()
        this.highPrioNodes.clear()
    }
    /**更新数据 */
    private updateNodes(notifies: NotifyEntry[]) {
        for (const notify of notifies) {
            const node = notify.leaf_node
            if (!NotifyHelper.isRed(notify)) {
                NotifyLogger.debug(`prio delete ${node}`)
                this.highPrioNodes.delete(node)
                this.prioOrderNodes.eraseElementByKey(node)
                continue
            }
            NotifyLogger.debug(`prio set ${node}`)
            this.prioOrderNodes.setElement(node, notify)
        }
    }
    /** 
     * 重新计算高优先级节点
     * @param updateNotifyMap 此次更新的map 会被塞入需要更新的旧节点
     */
    private recalcHighPrioNodes(updateNotifyMap: NotifyEntryMap){
        // 直接全量计算，20多个
        const oldNodes = this.highPrioNodes
        let highPrioCnt = 0 // 排除特殊优先级
        const upPrioNodes = new Map<string, NotifyEntry>()
        this.highPrioNodes = upPrioNodes
        for (const [node, entry] of this.prioOrderNodes) {
            const prio = NotifyHelper.getValidShowPrio(node)
            if (prio == PRIORITY_FIRST || prio == PRIORITY_SPEC) {
                // 一定显示
                this.highPrioNodes.set(node, entry)
                if (prio != PRIORITY_SPEC) {
                    highPrioCnt += 1
                }
            } else if (highPrioCnt < PRIO_LIMIT_CNT) {
                // 有剩余数量就显示
                highPrioCnt += 1
                this.highPrioNodes.set(node, entry)
            } else {
                break
            }
        }
        // 计算优先级改变节点
        // 只处理优先级提高的，降低的不管
        for (const [node, upEntry] of upPrioNodes) {
            if (!oldNodes.get(node)) {
                // 优先级提高
                let updateEntry = updateNotifyMap.get(node)
                if (updateEntry) {
                } else {
                    // newEntry是之前就有的节点，只是优先级被提高
                    // 这里插入进去，一起做更新
                    updateNotifyMap.set(node, upEntry)
                }
                // updateEntry = newEntry
                // oldEntry.affectCount = 0
                // changeNotifies.push(oldEntry)
            }
        }
        // // 遍历所有红点，哪些需要向上传递的，设置上count
        for (const notify of updateNotifyMap.values()) {
            // 这里服务器可能会指定向上传递层数，就不用设置
            if(!notify.effectCount) {
                notify.effectCount = this.getEffectCount(notify.leaf_node)
            }
        }
    }
    /**更新来自服务器的节点数据 */
    update(notifies: NotifyEntry[], isAll: boolean): NotifyEntryMap {
        // todo isall处理? 理论上 如果整个管理器会被destroy 其实不需要管isall
        const notifyMap = notifies.reduce((m, n) => {
            m.set(n.leaf_node, n)
            return m
        }, new Map<string, NotifyEntry>())
        this.updateNodes(notifies)
        this.recalcHighPrioNodes(notifyMap)
        // const activeNotifies = notifies.reduce((arr, notify) => {
        //     if (this.showNodes.has(notify.leaf_node)) {
        //         arr.push(notify)
        //     }
        //     return arr
        // }, [] as typeof notifies)
        return notifyMap
    }
    /**是否处于优先级显示中 */
    isShow(node: string) {
        return this.highPrioNodes.has(node)
    }
    /**
     * 动态获取向上传递层数
     * 1 是只影响自己
     */
    getEffectCount(node: string) {
        if (this.isShow(node)) {
            return s2_notify_cfg.affectCount(node) || 999
        }
        return 1
    }
    dbgNewObj(){
        return new OrderedMap<string, string>()
    }
}
