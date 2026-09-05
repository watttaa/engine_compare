import { FollowerType } from "GlobalValue";
import { EgretExEntry } from "lib/EgretExUtils_Entry";
import { SelectorBase } from "./SelectorBase";

export class ElemSelector extends SelectorBase {
    public _isEuiex = true;

    public constructor() {
        super();
        //this.EXPAND_DIR = "up";
        this.skinName = "resource/eui_skins/S1/ElemSelectorSkin_Up.exml";
    }

    protected loadFiltKeys(data: EgretExEntry.SelectorBaseData) {
        let default3 = data.followeType === FollowerType.PET ? EgretExEntry.FollowerSelEntry.talent : EgretExEntry.FollowerSelEntry.type

        let FiltKey1 = !!data['FiltKey1'] ? data['FiltKey1'] : EgretExEntry.FollowerSelEntry.elem;
        let FiltKey2 = !!data['FiltKey2'] ? data['FiltKey2'] : EgretExEntry.FollowerSelEntry.iFightNum;
        let FiltKey3 = !!data['FiltKey3'] ? data['FiltKey3'] : default3;
        let FiltKey4 = !!data['FiltKey4'] ? data['FiltKey4'] : EgretExEntry.FollowerSelEntry.hurt;
        this.$FiltKeys = [FiltKey1, FiltKey2, FiltKey3, FiltKey4];

    }

    public getFilterData() {
        let data = super.getFilterData() || [];
        // //类型Type
        // let filtKey = this.$followeType === FollowerType.PET ? EgretExEntry.FollowerSelEntry.talent : EgretExEntry.FollowerSelEntry.type
        // let rowIdx = this.$FiltKeys2Idx[filtKey]
        // // let curRowIdx = this[`$curRowIdx${rowIdx + 1}`];
        // let curRowIdx = this.$rowIndexArr[rowIdx + 1];
        // data = follower_utils.filterDatas(data, filtKey, curRowIdx, (target, type_data) => {
        //     if (target === 0 || target === type_data) {
        //         return true;
        //     }
        //     if (filtKey === EgretExEntry.FollowerSelEntry.talent) {//为啥是个数组
        //         if (target === 0 || target === type_data[0]) {
        //             return true;
        //         }
        //     }
        //     return false;
        // });
        return data;
    }


}