import { ElemSelector } from "./ElemSelector";

    export class PetSelector extends ElemSelector {
    public _isEuiex = true;

        public constructor() {
            super();
            //this.EXPAND_DIR = "up";
            this.SHRINK_HEIGHT = 72;
            //this.skinName = "resource/eui_skins/ElemSelectorSkin_PP_Down.exml";
        }

        // protected loadFiltKeys(data: EgretExEntry.SelectorBaseData) {
        //     let FiltKey1 = !!data['FiltKey1'] ? data['FiltKey1'] : EgretExEntry.FollowerSelEntry.elem;
        //     let FiltKey2 = !!data['FiltKey2'] ? data['FiltKey2'] : EgretExEntry.FollowerSelEntry.iFightNum;
        //     let FiltKey3 = !!data['FiltKey3'] ? data['FiltKey3'] : EgretExEntry.FollowerSelEntry.talent;
        //     let FiltKey4 = !!data['FiltKey4'] ? data['FiltKey4'] : EgretExEntry.FollowerSelEntry.hurt;
        //     this.$FiltKeys = [FiltKey1, FiltKey2, FiltKey3, FiltKey4];
        // }

        // public getFilterData() {
        //     let data = super.getFilterData()
        //     //特性Talent
        //     let filtKey = EgretExEntry.FollowerSelEntry.talent;
        //     let rowIdx = this.$FiltKeys2Idx[filtKey]
        //     let curRowIdx = this[`$curRowIdx${rowIdx + 1}`];
        //     data = utils.filterDatas(data, filtKey, curRowIdx, (target, talent_data) => {
        //         if (target === 0) {
        //             return true;
        //         } else if (talent_data.indexOf(target) > -1) {
        //             return true;
        //         }
        //         return false;
        //     });
        //     return data;
        // }
    }