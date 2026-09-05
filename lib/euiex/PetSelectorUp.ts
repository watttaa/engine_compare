import { uiSkinPath } from "GlobalValue";
import { EgretExEntry } from "lib/EgretExUtils_Entry";
import { ElemSelector } from "./ElemSelector";

export class PetSelectorUp extends ElemSelector {
    public _isEuiex = true;
    public constructor() {
        super();
        //this.EXPAND_DIR = "up";
        this.SHRINK_HEIGHT = 60;
        this.skinName = uiSkinPath("ElemSelectorSkin_Up.exml");
    }

    protected loadFiltKeys(data: EgretExEntry.SelectorBaseData) {
        super.loadFiltKeys(data);
        this.$FiltKeys = this.$FiltKeys.reverse();
    }
}
