import { NotifyID } from "./Const";

/**
 * 保存一个节点的绑定id子节点map
 */
export class NotifyBindChildMap<T> {
    private map = new Map<string, Map<NotifyID, T>>()
    get size() {
        return this.map.size
    }
    public getChild(node: string, bindId: NotifyID) {
        bindId = String(bindId)
        if (!(this.map.has(node))) {
            return
        }
        return this.map.get(node).get(bindId)
    }
    public addChild(node: string, bindId: NotifyID, treeNode: T) {
        bindId = String(bindId)
        if (!(this.map.has(node))) {
            this.map.set(node, new Map<NotifyID, T>())
        }
        const subMap = this.map.get(node)
        subMap.set(bindId, treeNode)
    }
    public delChild(node: string, bindId: NotifyID) {
        bindId = String(bindId)
        if (!(this.map.has(node))) {
            return
        }
        const subMap = this.map.get(node)
        subMap.delete(bindId)
        if (!subMap.size) {
            this.map.delete(node)
        }

    }
    public iterBindChilds(node: string) {
        if (!(this.map.has(node))) {
            return [] as [NotifyID, T][]
        }
        return this.map.get(node).entries()
    }
    public *iterChildWithIds(): Generator<[string, NotifyID, T]> {
        for(const [node, map] of this.map.entries()) {
            for (const [subId, value] of map.entries()) {
                yield [node, subId, value]
            }
        }
    }
    public *iterChilds(): Generator<T> {
        for(const [node, map] of this.map.entries()) {
            for (const value of map.values()) {
                yield value
            }
        }
    }
}