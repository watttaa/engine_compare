////////////////////////(七兄弟天赋)

import { EgretExEntry } from "lib/EgretExUtils_Entry";
import { RedPointTreeHelper } from "lib/RedPointManager";
import { s2_text_utils } from "auto/text";
import { res_utils } from "utils/ResUtils";

export interface SevenBorthTalentGrid {
    imgFloor: eui.Image;
    imgIcon: eui.Image;
    grpLock: eui.Group;
    lblLv: eui.Label;
    grpSelected: eui.Group;
    grpReddot: eui.Group;    
}

export class SevenBorthTalentGrid extends eui.ItemRenderer {
    public _isEuiex = true;

    protected onSkinLoadCompleted() {
        super.onSkinLoadCompleted();
        this.grpSelected.visible = false;
    }

    dataChanged() {
        super.dataChanged();
        // if (!this.completed) return;
        let data = this.data as EgretExEntry.SevenBrotherTalentData;
        this.currentState = data.active ? "unlock" : "lock";
        this.validateNow();
        
        this.lblLv.text = data.active ? s2_text_utils.T(22032, { level: data.lv }) : s2_text_utils.T(26658, { level: data.unlock});
        
        RedPointTreeHelper.addPointOnWidget(this.grpReddot, data.red);
        // this.grpReddot.visible = !!data.red;
        this.imgIcon.source = res_utils.getSevenBroSkillIcon(data.icon);
        
    }

    setData(data: EgretExEntry.SevenBrotherTalentData) {
        this.data = data;
    }

    setCustomSelected(value: boolean) {
        safeInvokeFunc(this, () => {
            this.grpSelected.visible = value;
        })
    }

}