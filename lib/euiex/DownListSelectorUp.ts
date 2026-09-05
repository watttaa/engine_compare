import { DownListSelector } from "./DownListSelector";

export class DownListSelectorUp extends DownListSelector {
    public _isEuiex = true;
    constructor() {
        super();
        this.skinName = "resource/eui_skins/DownListSelector.exml";
        this.dir = "up";
    }

}
