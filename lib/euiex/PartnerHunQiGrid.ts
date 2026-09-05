import { JadeType } from "base/Enum";

import { AniYuqiShinningStateEnum } from "lib/euiex/PartnerYuQiSoltGrid";
export type HunQiEquipEntry = {
    locked: boolean;
    can_unlock: boolean;
    desc: string; //开放等级
    attr_desc: string;
    // hunqi_basic?: HunQiBasicEntry;
}

export interface PartnerHunQiGrid {
    imgBg: eui.Image;
    imgFrame: eui.Image;
    imgIcon: eui.Image;
}

export class PartnerHunQiGrid extends eui.ItemRenderer {
    public _isEuiex = true;

    protected onSkinLoadCompleted() {
        super.onSkinLoadCompleted();
        this.addEventListener(egret.TouchEvent.TOUCH_TAP, this.onTouchTapSelf, this);
    }

    @SafeCallFunction()
    public dataChanged() {
        super.dataChanged();
        // let data = this.data as HunQiBasicEntry;
        // if (data.id) {
        //     let hunqiCfg = hunqi_cfg.HunqiInfo[data.id];
        //     let pid = hunqiCfg[hunqi_cfg.iPartnerID];
        //     let partnerInfo = partners_cfg.PartnersInfo?.[pid];
        //     if(partnerInfo){
        //         this.imgIcon.source = res_utils.getNpcIconSmall(partnerInfo[partners_cfg.iIcon], true);
        //     }
        //     let quality = hunqiCfg[hunqi_cfg.iColour];
        //     this.imgFrame.source = GlobalValue.HunQiQuaFrame[quality];
        //     let bgType = hunqiCfg[hunqi_cfg.iType];
        //     this.imgBg.source = GlobalValue.HunQiBg[bgType];
        // }
    }

    private getAniState(type: JadeType) {
        return {
            [JadeType.TYPE_1]: AniYuqiShinningStateEnum.STATE_1,
            [JadeType.TYPE_2]: AniYuqiShinningStateEnum.STATE_2,
            [JadeType.TYPE_3]: AniYuqiShinningStateEnum.STATE_3,
            [JadeType.TYPE_4]: AniYuqiShinningStateEnum.STATE_4,
            [JadeType.TYPE_5]: AniYuqiShinningStateEnum.STATE_5,
            [JadeType.TYPE_6]: AniYuqiShinningStateEnum.STATE_6,
        }[type];
    }

    private onTouchTapSelf() {
        let data = this.data as HunQiEquipEntry;
    }

}
