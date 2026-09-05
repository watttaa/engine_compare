import { ItemInfo } from "s2/bag/ItemInfo";
import { HeroMainModel } from "heroMain/HeroMainModel";
import { ComponentEx } from "lib/euiex/ComponentEx";
import { BaseGrid } from "lib/euiex/BaseGrid";
import { RoleHead } from "lib/euiex/RoleHead";
import { ItemEntry, RoleHeadEntry } from "base/ServerEntry";

export type WeekRankItemEntry = {
    uid: number,
    power: number,         //战力
    rank: number,         //排名
    career: RoleHeadEntry,  //头像
    name: string,         //名称
    reward: ItemEntry[],    //排名奖励
    desc: number | string,  //关卡数|积分
}
export interface SelfRankItem {

    lblRank: eui.Label;
    head: RoleHead;
    grpPower: eui.Group;
    bLblPower: eui.BitmapLabel;
    lblName: eui.Label;
    lblDes: eui.Label;
    lstRwd: eui.List;



}

export class SelfRankItem extends ComponentEx {
    public _isEuiex = true;

    private $data: WeekRankItemEntry;

    protected onSkinLoadCompleted() {
        super.onSkinLoadCompleted();
        this.lstRwd.itemRenderer = BaseGrid;
        this.lstRwd.dataProvider = new eui.ArrayCollection();
    }

    public $onRemoveFromStage() {
        this.lstRwd && (this.lstRwd.dataProvider as eui.ArrayCollection).removeAll()
        super.$onRemoveFromStage();
    }

    @SafeCallFunction()
    public setData(data: WeekRankItemEntry) {
        this.$data = data;
        this._updateState(data.rank);
        this.head.setRoleHead(HeroMainModel.getInstance().getHead());
        this.bLblPower.text = `${data.power}`
        this.grpPower.visible = !!data.power;
        this.lblDes.text = `${data.desc}`;
        this.lblName.text = HeroMainModel.getInstance().nickname;
        let dataProvider = this.lstRwd.dataProvider as eui.ArrayCollection;
        dataProvider.source = data.reward.map(v => ItemInfo.create(v));
    }


    private _updateState(rank: number) {
        let state: string;
        if (rank <= 0) {
            state = "norank";
        } else if (rank > 0 && rank <= 3) {
            state = `_${rank}`;
        } else {
            state = `_4`;
            this.lblRank.text = `${rank}`;
        }
        this.currentState = state;
    }

}