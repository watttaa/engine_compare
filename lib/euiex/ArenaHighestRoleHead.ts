import { s2_text_utils } from "auto/text";
import { ArenaHighestFinalOrderEnum, ArenaHighestFinalPageEnum, HeadFrameType } from "base/Enum";
import { RoleHeadEntry } from "base/ServerEntry";
import { EgretExEntry } from "lib/EgretExUtils_Entry";
import { RoleHead } from "lib/euiex/RoleHead";
import { TagArenaHighestHotSkin } from "lib/euiex/TagArenaHighestHotSkin";
import { safeCallComFunc } from "utils/UIUtils_safecall";

import { filter_utils } from "lib/FilterUtils";


export interface ArenaHighestRoleHead {


    grpVx: eui.Group;
    head: RoleHead;
    imgQuestion: eui.Image;
    lblLocation: eui.Label;
    lblLocationSilver: eui.BitmapLabel;
    imgLocationGold: eui.Image;
    imgUp: eui.Image;
    grpLike: eui.Group;
    compLike: eui.Component;
    grpTag: eui.Group;
    grpLose: eui.Group;
    grpPlayerinfo: eui.Group;
    lblPlayerName: eui.Label;
    grpDet: eui.Group;
    lblAreaCode: eui.Label;
    grpUp: eui.Group;
    touchArea: eui.Rect;
    btnReplay: eui.Button;
    
    
}


//resource/eui_skins/RoleHead_ArenaTop_Final.exml
export class ArenaHighestRoleHead extends eui.ItemRenderer {
    public _isEuiex = true;

    private hotTagSkin: TagArenaHighestHotSkin;

    protected onSkinLoadCompleted() {
        super.onSkinLoadCompleted();
        this.touchArea && this.touchArea.addEventListener(egret.TouchEvent.TOUCH_TAP, this.$onTouchedHeadRole, this);
        this.btnReplay && this.btnReplay.addEventListener(egret.TouchEvent.TOUCH_TAP, this.$onTouchedbtnReplay, this);
        if (this.completed && this.data) {
            this.grpUp && (this.grpUp.visible = false);
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
        let data = this.data as EgretExEntry.ArenaHighestRoleHeadData;

        /**是否为冠军赛 */
        let isChampion = data.previewType == ArenaHighestFinalPageEnum.FINAL_8;
        let customFrame = this.getCustomFrameCfg(data.previewType, data.order);
        if (data && data.role) {
            let roleHead: RoleHeadEntry = data.role.rolehead;
            this.setPlayerInfoVisible(data.isShowName);
            this.lblAreaCode.text = s2_text_utils.T(26505, { num: data.server });
            this.lblPlayerName.text = data.name + "";
            if (data.isShowName && data.hotTag) {
                if (!this.hotTagSkin) {
                    this.hotTagSkin = new TagArenaHighestHotSkin();
                    this.hotTagSkin.scaleX = this.hotTagSkin.scaleY = (this.scaleX > 1) ? Number((1 / this.scaleX).toFixed(2)) : 1;
                    this.grpTag.addChild(this.hotTagSkin);
                }
                this.hotTagSkin.visible = true;
                this.hotTagSkin.setData(data.hotTag);
            }
            // this.imgIcon.visible = true;
            // this.imgIcon.source = res_utils.getNpcIconSmall(roleHead.icon);
            // arena_star = roleHead.star;
            this.btnReplay && (this.btnReplay.visible = !!data.touched);
            this.grpLose.visible = data.isWin === false;
            this.grpDet.visible = !!data.isShowGuessTag;
            // this.lblAreaCode.textColor = data.isWin === false ? 0x76CEFF : 0xFFFFFF;
            this.head.setData({
                bottomImgSrc: "arena_highest_honour_head_bg_png",
                rolehead: {
                    frame: customFrame || roleHead.frame,
                    icon: roleHead.icon,
                    star: roleHead.star,
                }
            });

            if (data.rate !== undefined) {
                this.compLike.visible = true;
                this.compLike.currentState = data.rate >= 50 ? "_1" : "_2";
                safeCallComFunc(this, this.compLike, () => {
                    this.compLike["lblStarNum"].text = data.rate + "%";
                })
            }

        }
        else if (data && (data.order != undefined)) {
            this.head.setData({
                bottomImgSrc: "arena_highest_honour_head_bg_png",
                rolehead: {
                    frame: customFrame || 1,
                    icon: undefined,

                }
            });
            switch (data.order) {
                case ArenaHighestFinalOrderEnum.QUARTER_FINALIST:
                    this.lblLocation.visible = true;
                    this.lblLocation.text = isChampion ? s2_text_utils.T(26518, { num: preload_utils_text.numToCN(data.groupNum) }) : s2_text_utils.T(26520);
                    break;
                case ArenaHighestFinalOrderEnum.SEMI_FINALIST:
                    this.lblLocationSilver.visible = true;
                    this.lblLocationSilver.text = isChampion ? `4` : `32`;
                    break;
                case ArenaHighestFinalOrderEnum.FINALIST:
                    this.lblLocationSilver.visible = true;
                    this.lblLocationSilver.text = isChampion ? `2` : `16`;
                    break;
                case ArenaHighestFinalOrderEnum.FINALIST_WINNERS:
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
        if (!(isChampion || (data.order == ArenaHighestFinalOrderEnum.FINALIST_WINNERS))) {
            // this.showStar(arena_star);
        }

        //遮罩
        this.showFilter();

    }

    private getCustomFrameCfg(previewType:ArenaHighestFinalPageEnum,order:ArenaHighestFinalOrderEnum){
        if(previewType == ArenaHighestFinalPageEnum.FINAL_8){ //8强全部显示自定义
            if(order == ArenaHighestFinalOrderEnum.FINALIST_WINNERS){
                return HeadFrameType.ArenaHighest1;
            }else if(order == ArenaHighestFinalOrderEnum.QUARTER_FINALIST){
                return HeadFrameType.ArenaHighest3;
            }else{
                return  HeadFrameType.ArenaHighest2;
            }
        }else{//64强只有8强显示自定义
            if(order == ArenaHighestFinalOrderEnum.FINALIST_WINNERS){
                return HeadFrameType.ArenaHighest3;
            }else{
                return undefined; 
            }
        }
    }

    private showFilter(){
        let data = this.data as EgretExEntry.ArenaHighestRoleHeadData;
        let filterType = (data && data.isWin === false) ? filter_utils.FilterType.GREY_DARK : filter_utils.FilterType.NONE;
        filter_utils.addFilterAdvance(this.grpPlayerinfo,filterType);
        if (this.grpVx) {
            filter_utils.addFilterAdvance(this.grpVx,filterType);
        }
    }

    
    private resetComs() {
        // this.imgIcon.visible = false;
        this.grpPlayerinfo.visible = false;
        this.imgQuestion.visible = false;
        this.lblLocation.visible = false;
        this.lblLocationSilver.visible = false;
        this.imgLocationGold.visible = false;
        this.grpLose.visible = false;
        this.btnReplay.visible = false;
        this.grpDet.visible = false;
        this.compLike.visible = false;
        // this.imgFrame.source = getProfileHeadFramePath(1);
        this.hotTagSkin && (this.hotTagSkin.visible = false);
    }

    @SafeCallFunction()
    public setData(data: EgretExEntry.ArenaHighestRoleHeadData) {
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
        // let uid = this.data && this.data.role && this.data.role.uid;
        // uid && ArenaHighestCNet.C_ON_HIGHEST_USER_INFO(uid);
    }

}