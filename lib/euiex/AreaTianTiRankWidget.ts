export interface AreaTianTiRankWidget {

    iconDisplay: eui.Image;
    lblRank: eui.Label;
    grpStar: eui.Group;
    labelDisplay: eui.Label;
    grpStar2: eui.Group;

}

export enum Arena_RankIconStateEnum {
    STATE_PEAK = "peak",
    STATE_STAR3 = "star3",
    STATE_STAR4 = "star4",
    STATE_STAR5 = "star5",
}

export class AreaTianTiRankWidget extends eui.ItemRenderer {
    protected dataChanged(): void {
        super.dataChanged();
    }
}   