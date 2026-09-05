import { DeepMap } from "common/DeepMap";
import { NotifyID } from "./Const";
import { NotifyHelper } from "./NotifyHelper";

/** 
 * 管理玩家手动隐藏红点的逻辑
 * 暂不支持的情况：被隐藏节点路径重叠，比如
 *      隐藏a.b(中间节点)
 *      接着隐藏a.b.c
 */
export class NotifyHideMgr {
    /**
     * 玩家隐藏的节点(只包含直接隐藏的中间节点)
     * 比如说，玩家隐藏了a.b，但是a.b其实是中间节点，存在a.b.c, a.b.d两个子节点
     * 那其实这里只保存a.b
     */
    private hidedNodes = new DeepMap<NotifyID, boolean>(String);
    /**
     * 玩家隐藏的节点（只包括叶子节点）
     * 比如说，玩家隐藏了a.b，但是a.b其实是中间节点，存在a.b.c, a.b.d两个子节点
     * 那其实这里只保存a.bc, a.b.d, 不保存a.b
     */
    // private hidedLeafNodes = new Set<string>()

    clear(){
        // this.hidedLeafNodes.clear()
        this.hidedNodes.clear()
    }

    /**玩家改变节点的隐藏状态 */
    public setNodeHideState(node: string, isHide: boolean, bindIds?: NotifyID[]) {

        isHide = Boolean(isHide)
        if(this.isNotifyHided(node, bindIds) === isHide){
            return false
        }
        const nodes = NotifyHelper.nodeToIds(node, bindIds)
        if (isHide) {
            this.hidedNodes.set(nodes, isHide)
            // this.hidedNodes.add(node)
        } else {
            this.hidedNodes.delete(nodes)
            // this.hidedNodes.delete(node)
        }
        return true
        // const leafNodes = NotifyConfMgr.getInstance().getLeafNodes(node)
        // const sameStateNodes = leafNodes.reduce((arr, n) => {
        //     if(this.isNotifyHided(n) === isHide) {
        //         arr.push(n)
        //     }
        //     return arr
        // }, [] as string[])
        // if (sameStateNodes.length) {
        //     if (isHide) {
        //         NotifyLogger.error(`隐藏节点${node}失败 其子节点 ${sameStateNodes} 不能处于隐藏状态`)
        //     } else {
        //         NotifyLogger.error(`解除隐藏节点${node}失败 其子节点 ${sameStateNodes} 不能处于未隐藏状态`)
        //     }
        //     return
        // }
        // if (isHide) {
        //     leafNodes.forEach(x => this.hidedNodes.set(NotifyHelper.nodeToIds(x, bindIds), IS_HIDE))
        //     // this.hidedNodes.add(node)
        // } else {
        //     leafNodes.forEach(x => this.hidedNodes.delete(NotifyHelper.nodeToIds(x, bindIds)))
        //     // this.hidedNodes.delete(node)
        // }
    }
    /**是否被玩家隐藏 */
    public isNotifyHided(node: string, notifyIds?: NotifyID[]): boolean{
        const nodes = NotifyHelper.nodeToIds(node, notifyIds)
        return this.hidedNodes.get(nodes) ?? false
    }
}