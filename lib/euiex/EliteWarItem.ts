import { EgretExEntry } from "lib/EgretExUtils_Entry";

import { updatePower } from "utils/FightPowerUtils";
import { FightPowerWidget } from "./FightPowerWidget";
import { RoleHead } from "./RoleHead";

let RankIconMapping = ["", "arena_rank_1_png", "arena_rank_2_png", "arena_rank_3_png"];
export class EliteWarItem extends eui.ItemRenderer {
    protected head: RoleHead;
    protected imgIndex: eui.Image;
    protected lblPlayerName: eui.Label;
    protected power: FightPowerWidget;

    constructor() {
        super()
        this.skinName = "resource/eui/GangWar_IconItem.exml";
    }

    dataChanged() {
        let data = this.data as EgretExEntry.EliteWarItemEntry;
        let isEmpty = data[0] == 0;//uid
        if (isEmpty) {
            this.currentState = "empty";
            return;
        }
        this.currentState = "player";
        // 排位
        this.imgIndex.source = RankIconMapping[this.itemIndex + 1] || "";
        // 头像
        this.head.setRoleHead(data[1]);
        // 名称
        this.lblPlayerName.text = data[2];
        // 战力
        updatePower(this.power, { power: preload_utils_text.BigNumberFormatFightPVP(data[3])});
    }
}
