
import { ItemInfo } from "s2/bag/ItemInfo";
import { getItemTipsCls } from "s2/bag/TableReadCreater";
import { CostEntry1, ItemEntry } from "base/ServerEntry";
import { HeadTokenMgr } from "s2/headtoken/HeadTokenMgr";
import { EgretExEntry } from "lib/EgretExUtils_Entry";

import { BagCNet } from "s2/bag/net/BagCNet";
import { TipsUI } from "tips/TipsUI";


/**
 * 判断消耗物品是否足够
 * @param cost 消耗物品
 * @returns 是否足够
 */
export function isEnoughCost(cost: CostEntry1, useOrigin: boolean = false) {
    if (!useOrigin) {
        cost.has = HeadTokenMgr.getInstance().getTokenCnt(cost.sid).cnt;
    }
    return cost.has >= cost.need;
}

/** 根据CostEntry1 转化为 UI 消耗组件所需要的数据 */
export function getCostData(cost: CostEntry1, useOrigin: boolean = false) {
    let itemId = cost.sid;
    if (!useOrigin) {
        cost.has = HeadTokenMgr.getInstance().getTokenCnt(itemId).cnt;
    }
    let data: EgretExEntry.ConsumeItemData = {
        itemInfo: ItemInfo.create({ sid: itemId }),
        use: cost.need,
        haveNotShow: cost.has,
    }
    return data;
}

export function getNeedCostData(btnInfo: { consume_item: CostEntry1, consume_coin?: CostEntry1 }, useOrigin: boolean = false) {
    let isEnoughItem = isEnoughCost(btnInfo.consume_item, useOrigin);
    if (btnInfo.consume_coin && !isEnoughItem) { //不足时，显示代币
        return getCostData(btnInfo.consume_coin, useOrigin);
    } else {
        return getCostData(btnInfo.consume_item, useOrigin);
    }
}

export function showItemTips(itemInfo: ItemInfo) {
    let cls = getItemTipsCls(itemInfo.id);
    UIManager.open(cls).then((inst: TipsUI) => {
        inst.setData(itemInfo);
        BagCNet.C_GET_ITEM_EXTRA_INFO(itemInfo);
    });
}

/**
 * 把ItemEntry里相同的道具合并
 * @param items ItemEntry[]
 * @returns ItemEntry[]
 */
export function mergeItemNum(items: ItemEntry[]): ItemEntry[] {
    let ret: { [sid: number]: ItemEntry } = {};
    for (let item of items) {
        if (!ret[item.sid]) {
            ret[item.sid] = item;
        } else {
            (ret[item.sid].amount as number) += item.amount as number;
        }
    }
    let resItems = [];
    for (let k in ret) {
        resItems.push(ret[k]);
    }
    return resItems;
}