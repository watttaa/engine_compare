import { s2_seg_conf_cfg } from "auto/seg_conf";
import { s2_text_utils } from "auto/text";
import { imgSource } from "GlobalValue";
import { TianTiModel } from "s2/tianti/mgr/TianTiModel";

export interface TiantiRankIcon {

    iconDisplay: eui.Image;
    grpStar: eui.Group;
    labelDisplay: eui.Label;
    grpStar2: eui.Group;
    star0: eui.Component;
    star1: eui.Component;
    star2: eui.Component;
    star3: eui.Component;
    star4: eui.Component;
    grpEmpty: eui.Group;
    lblEmpty: eui.Label;
    lblRank: eui.Label;
}



export enum Arena_RankIconStateEnum {
	STATE_PEAK = "peak",
	STATE_STAR0 = "star0",
	STATE_STAR1 = "star1",
	STATE_STAR2 = "star2",
	STATE_STAR3 = "star3",
	STATE_STAR4 = "star4",
	STATE_STAR5 = "star5",
	STATE_EMPTY = "empty",
}


export const Arena_RankIconStatus = [
    Arena_RankIconStateEnum.STATE_STAR0,
    Arena_RankIconStateEnum.STATE_STAR1,
    Arena_RankIconStateEnum.STATE_STAR2,
    Arena_RankIconStateEnum.STATE_STAR3,
    // Arena_RankIconStateEnum.STATE_STAR4,
    // Arena_RankIconStateEnum.STATE_STAR5,
]

export class TiantiRankIcon extends eui.ItemRenderer {
    public _isEuiex = true;

    protected constructor() {
        super();
        //this.skinName = 'resource/eui/S2/arena/Arena_RankIcon.exml';
    }




    public dataChanged() {
        super.dataChanged();
        let data = this.data as [number, number,number?]// [ 段位id,  星数,?剩余场数]
        if (!data) {
            this.currentState = Arena_RankIconStateEnum.STATE_EMPTY;
            return;
        }
        let cfg = s2_seg_conf_cfg.SegConfInfo[data[0]];
        if (!cfg) {
            this.currentState = Arena_RankIconStateEnum.STATE_EMPTY;
            if (this.lblEmpty && data.length > 2) {
                 let cnt = (TianTiModel.getInstance().max_placement -  data[2])
                this.lblEmpty.text = s2_text_utils.T(2021336, { cnt: cnt})
            }
            return;
        }

        this.lblRank.text = ["", "Ⅰ", "Ⅱ", "Ⅲ"][cfg[s2_seg_conf_cfg.cSubSeg]];
    
        this.labelDisplay.text = data[1] + "";
        this.iconDisplay.source = imgSource(cfg[s2_seg_conf_cfg.cDivisionIcon]);
        this.lblRank.text = cfg[s2_seg_conf_cfg.cSegName];

        let starNum = data[1];
        let segStarNum = cfg[s2_seg_conf_cfg.iNeedWin];
        this.currentState = Arena_RankIconStatus[segStarNum] || Arena_RankIconStateEnum.STATE_PEAK;
        if (starNum > segStarNum) {
            this.currentState = Arena_RankIconStateEnum.STATE_PEAK;
        }

        let stars = [this.star0, this.star1, this.star2, this.star3, this.star4];
        stars.forEach((star, index) => {
            star.currentState = index <= (starNum - 1) ? "on" : "off";
        })
    }
}
