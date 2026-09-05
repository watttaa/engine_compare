
export type FenghuoRankItemEntry = {
    rank: number, // 0表示未上榜
    badge: number,
    name: string,
    faction_id: number,
    server_name: string,
    host: number,
    build_score: number,
    score: number

    isSelf: boolean
}

export interface FenghuoMapRankItem {

    grpContent: eui.Group;
    imgBg: eui.Image;
    imgRank: eui.Image;
    lblRank: eui.Label;
    imgIcon: eui.Image;
    lblName: eui.Label;
    lbServer: eui.Label;
    lblBuiid: eui.Label;
    lblScore: eui.Label;

}

export class FenghuoMapRankItem extends BaseWidgetItemRender {

    protected dataChanged(): void {
        super.dataChanged();
        let data: FenghuoRankItemEntry = this.data;
        this.updateState();
        this.imgIcon.source = ""//getGangBadgePath(data.badge);
        this.lblName.text = data.name;
        this.lbServer.text = data.server_name;
        this.lblBuiid.text = data.build_score + "";
        this.lblScore.text = data.score + "";
    }

    private updateState() {
        let data: FenghuoRankItemEntry = this.data;
        let rank = data.rank;
        let state: string;
        if (rank <= 0) {
            state = "norank";
        } else if (rank > 0 && rank <= 3) {
            state = `_${rank}`;
        } else {
            state = `_4`;
            this.lblRank.text = `${rank}`;
        }
        if (data.isSelf) {
            state += ",self";
        }
        this.currentState = state;
        this.validateNow();
    }
}