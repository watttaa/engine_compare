import { s2_text_utils } from "auto/text";
import { ArenaTopFinalOrderEnum, ArenaTopFinalPageEnum, HeadFrameType } from "base/Enum";
import { RoleHeadEntry } from "base/ServerEntry";
import { EgretExEntry } from "lib/EgretExUtils_Entry";
import { ArenaStarComp, RoleHead } from "lib/euiex/RoleHead";
import { safeCallComFunc } from "utils/UIUtils_safecall";

import { filter_utils } from "lib/FilterUtils";


export interface ArenaTopRoleHead {
    
    grpVx: eui.Group;
    roleHead: RoleHead;
    imgQuestion: eui.Image;
    lblLocation: eui.Label;
    lblLocationSilver: eui.BitmapLabel;
    imgLocationGold: eui.Image;
    imgUp: eui.Image;
    grpStar: eui.Group;
    grpLike: eui.Group;
    compLike: eui.Component;
    grpLose: eui.Group;
    grpPlayerinfo: eui.Group;
    lblPlayerName: eui.Label;
    lblAreaCode: eui.Label;
    grpMc: eui.Group;
    grpUp: eui.Group;
    grpDet: eui.Group;
    touchArea: eui.Rect;
    btnReplay: eui.Button;    
}


export enum RoleHead_ArenaTop_FinalStateEnum {
	STATE__4 = "_4",
	STATE__3 = "_3",
	STATE__2 = "_2",
	STATE__1 = "_1",
}


//resource/eui_skins/RoleHead_ArenaTop_Final.exml
export class ArenaTopRoleHead extends eui.ItemRenderer {
    public _isEuiex = true;

    private initSkinState:string;

    protected onSkinLoadCompleted() {
        super.onSkinLoadCompleted();
        this.touchArea && this.touchArea.addEventListener(egret.TouchEvent.TOUCH_TAP, this.$onTouchedHeadRole, this);
        this.btnReplay && this.btnReplay.addEventListener(egret.TouchEvent.TOUCH_TAP, this.$onTouchedbtnReplay, this);
        if (this.completed && this.data) {
            this.setData(this.data);
        }
    }

    public $onRemoveFromStage() {
        this.btnReplay && this.btnReplay.removeEventListener(egret.TouchEvent.TOUCH_TAP, this.$onTouchedbtnReplay, this);
        this.touchArea && this.touchArea.removeEventListener(egret.TouchEvent.TOUCH_TAP, this.$onTouchedHeadRole, this);
        //此处不可以设置为空，因为 IncludeIn会移除控件，再次添加时，不会重新设置
        // this.data = null;
        super.$onRemoveFromStage();
    }

    public dataChanged() {
        super.dataChanged();
        this.resetComs();
        let arena_star = 0
        let data = this.data as EgretExEntry.ArenaTopRoleHeadData;
        //遮罩
        this.showFilter();
        /**是否为冠军赛 */
        let isChampion = data.previewType == ArenaTopFinalPageEnum.FINAL_8;
        let customFrame = this.getCustomFrameCfg(data.previewType, data.order);
        if(!isChampion){
            if(!this.initSkinState){
                this.initSkinState = this.currentState;
            }
            this.currentState = this.initSkinState;
        }
      
        if (data && data.role) { //有玩家
            let roleHead:RoleHeadEntry = data.role.rolehead;
            this.setPlayerInfoVisible(data.isShowName);
            this.lblAreaCode.text = s2_text_utils.T(26505, { num: data.server });
            this.lblPlayerName.text = data.name + "";
            arena_star = roleHead.star;
            this.btnReplay && (this.btnReplay.visible = !!data.touched);
            this.grpLose.visible = data.isWin === false;
            this.grpDet.visible = !!data.isShowGuessTag;

            
            // this.lblAreaCode.textColor = data.isWin === false ? 0x76CEFF : 0xFFFFFF;
            this.roleHead.setData({
                rolehead: {
                    frame: customFrame || roleHead.frame,
                    icon: roleHead.icon,
                    star: 0,
                }
            });

            if (data.rate !== undefined) {
                this.compLike.visible = true;
                this.compLike.currentState = data.rate >= 50 ? "_1" : "_2";
                safeCallComFunc(this, this.compLike, ()=>{
                    this.compLike["lblStarNum"].text = data.rate + "%";
                })
            }
            
        }
        else if (data && (data.order != undefined)) { //没有玩家
            this.roleHead.setData({
                rolehead: {
                    frame: customFrame || 1,
                    icon: undefined,

                }
            });
            switch (data.order) {
                case ArenaTopFinalOrderEnum.QUARTER_FINALIST:
                    this.lblLocation.visible = true;
                    this.lblLocation.text = isChampion ? s2_text_utils.T(26518, { num: preload_utils_text.numToCN(data.groupNum) }) : s2_text_utils.T(26520);
                    break;
                case ArenaTopFinalOrderEnum.SEMI_FINALIST:
                    this.lblLocationSilver.visible = true;
                    this.lblLocationSilver.text = isChampion ? `4` : `32`;
                    break;
                case ArenaTopFinalOrderEnum.FINALIST:
                    this.lblLocationSilver.visible = true;
                    this.lblLocationSilver.text = isChampion ? `2` : `16`;
                    break;
                case ArenaTopFinalOrderEnum.FINALIST_WINNERS:
                    this.imgLocationGold.visible = isChampion;
                    this.lblLocation.visible = !isChampion;
                    this.lblLocation.text = s2_text_utils.T(26519);
                    break;
                default:
                    break;
            }
        } else {
            this.imgQuestion.visible = true;
        }
        if(!(isChampion || (data.order == ArenaTopFinalOrderEnum.FINALIST_WINNERS))){
            this.showStar(arena_star);
        }

    }

    private getCustomFrameCfg(previewType:ArenaTopFinalPageEnum,order:ArenaTopFinalOrderEnum){
        if(previewType == ArenaTopFinalPageEnum.FINAL_8){ //8强全部显示自定义
            if(order == ArenaTopFinalOrderEnum.FINALIST_WINNERS){
                return HeadFrameType.ArenaTop1;
            }else if(order == ArenaTopFinalOrderEnum.QUARTER_FINALIST){
                return HeadFrameType.ArenaTop3;
            }else{
                return  HeadFrameType.ArenaTop2;
            }
        }else{//64强只有8强显示自定义
            if(order == ArenaTopFinalOrderEnum.FINALIST_WINNERS){
                return HeadFrameType.ArenaTop3;
            }else{
                return undefined; 
            }
        }
    }

    private showFilter(){
        let data = this.data as EgretExEntry.ArenaTopRoleHeadData;
        let filterType = (data && data.isWin === false) ? filter_utils.FilterType.GREY_DARK : filter_utils.FilterType.NONE;
        filter_utils.addFilterAdvance(this.grpPlayerinfo,filterType);
        if (this.grpVx) {
            filter_utils.addFilterAdvance(this.grpVx,filterType);
        }
        if (this.grpStar) {
            filter_utils.addFilterAdvance(this.grpStar,filterType);
        }
    }

    /**
     * 比武场星级
     */
    private arenaStarComp:ArenaStarComp
    private showStar(star:number) {
        if(star) {
            if(!this.arenaStarComp) {
                this.arenaStarComp = new ArenaStarComp()
                this.grpStar.addChild(this.arenaStarComp);
            }
            this.arenaStarComp.setData(star);
            this.arenaStarComp.visible = true;
        }else{
            this.arenaStarComp && (this.arenaStarComp.visible = false);
        }
    }

    
    private resetComs() {
        this.grpPlayerinfo.visible = false;
        this.imgQuestion.visible = false;
        this.lblLocation.visible = false;
        this.lblLocationSilver.visible = false;
        this.imgLocationGold.visible = false;
        this.grpLose.visible = false;
        this.btnReplay.visible = false;
        this.grpDet.visible = false;
        this.compLike.visible = false;
        this.arenaStarComp && (this.arenaStarComp.visible = false);
    }

    @SafeCallFunction()
    public setData(data: EgretExEntry.ArenaTopRoleHeadData) {
        this.data = data;
    }

    /*state true 代表胜利 false 代表失败*/
    @SafeCallFunction()
    public setState(state: boolean) {
        this.data.isWin = state;
        this.dataChanged();
    }

    @SafeCallFunction()
    public setPlayerInfoVisible(visible: boolean) {
        this.grpPlayerinfo.visible = visible;
    }

    private $onTouchedbtnReplay() {
        this.data && this.data.touched && this.data.touched();
    }

    private $onTouchedHeadRole() {
        let uid = this.data && this.data.role && this.data.role.uid;
        // uid && ArenaTopCNet.C_ON_ARENA_TOP_USER_INFO(ArenaTopModel.getInstance().getCurDiv(), uid);
    }

}