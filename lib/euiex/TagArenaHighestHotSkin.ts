
export interface TagArenaHighestHotSkin{

    grpHot: eui.Group;
    imgHotTag: eui.Image;
    grpLabel: eui.Group;
    lblHot: eui.BitmapLabel;
    
}

/**
 * 天下第一比武场人气榜
 */
export class TagArenaHighestHotSkin extends eui.Component {
    public _isEuiex = true;

    public constructor() {
        super();
        this.skinName = 'resource/eui/ArenaHighestHotRankItem_HotTag.exml'
    }


    @SafeCallFunction()
    public setData(rank:number) {
        let isTop3 = rank && rank <= 3;
        this.grpLabel.visible = !isTop3;
        if(isTop3){
            this.imgHotTag.source = `arena_highest_hot_rank_${rank}_png`;
        }else{            
            this.imgHotTag.source = `arena_highest_hot_rank_other_png`;
            this.lblHot.text = `${rank}`;
        }
    }
}