import { getFrameEffect, getShowStar } from "auto/frame";
import { s2_pet_level_cfg, s2_petLevel_cfg } from "auto/pet_level";
import { s2_rolelevel_cfg } from "auto/RoleLevel";
import { RoleHeadEntry, RoleHeadFrameType } from "base/ServerEntry";
import { euisheet_enum } from "enums/euisheet_enum";
import { FIGHT_TYPE, imgSource } from "GlobalValue";
import { ComponentEx } from "lib/euiex/ComponentEx";
import { RoleHeadUtils } from "lib/euiex/RoleHeadUtils";
import { MovieClipEx } from "lib/MovieClipEx";
import { PlayerInfoCNet } from "net/PlayerInfoCNet";
import { getProfileHeadFramePath } from "playerinfo/PlayerProfileUtils";
import { res_utils } from "utils/ResUtils";

// export type RoleHeadData = {
//     icon?: string;
//     frame?: string;
//     uid?: number;
//     name?: string;
//     isEmpty?: boolean;
// }
export const DEFAULT_HEAD_FRAME_ID: number = 1;// 默认的头像框id

export enum RoleHeadState {
    STATE_NOR = "nor",
    STATE_NO_FRAME = "no_frame",
}



export type RoleHeadType = {
    rolehead?: RoleHeadEntry;
    bottomImgSrc?: string;
    uid?: number | string;
    name?: string;
    empty?: boolean;
    clickabled?: boolean;
    clickFun?: Function;
    clickObj?: any;
    fillHead?: boolean;// 头像框为默认头像框时，是否填充头像
    // /**所在频道 可不填 */
    // channel?: number;
    // chat_msg?: string;
    // isInChat?: boolean;
    lv?: number;
    hideCareerIcon?: boolean;// 强制隐藏种族图标
}

export class RoleHead extends eui.ItemRenderer {

    ////////////////////////(皮肤定义)
    public imgBottomFrame?: eui.Image;
    public imgBorder: eui.Image;
    public imgIcon: eui.Image;
    public imgFrame: eui.Image;
    public grpDynamicFrame: eui.Group;
    public lblLv: eui.Label;
    public imgCareerIcon?: eui.Image;//种族角标

    state: "";
    gapMain: eui.Group;
    grpLock: eui.Group;
    grpName: eui.Group;
    lblName: eui.Label;
    grpTopLeft: eui.Group;
    grpMc: eui.Group;
    grpStar: eui.Group;
    grpEmpty: eui.Group;
    btnAdd: eui.Button;
    grpRoot: eui.Group;

    public getData(): RoleHeadType {
        return this.data;
    }

    public setData(data: RoleHeadType) {
        this.data = data;
    }

    public setRoleHead(data: RoleHeadEntry) {
        if (this.data) {
            this.data.rolehead = data;
            this.updateData();
        }
        else {
            this.data = { rolehead: data };
        }
    }

    public setLevel(level: number) {
        if (this.data) {
            this.data.lv = level;
            this.updateData();
        }
        else {
            this.data = { lv: level };
        }
    }

    public setClickabled(clickabled: boolean) {
        if (!this.data) {
            return;
        }
        this.data.clickabled = clickabled;
        this.setClickEvent(clickabled);
    }

    public $onRemoveFromStage() {
        this.removeEventListener(egret.TouchEvent.TOUCH_TAP, this.onShowPlayerInfo, this);
        if (this.arenaStarComp && this.arenaStarComp.parent) {
            this.arenaStarComp.parent.removeChild(this.arenaStarComp);
            this.arenaStarComp = null;
        }
        this.hideDynamicFrame();
        super.$onRemoveFromStage();
    }

    public dataChanged() {
        super.dataChanged();
        this.updateData();
    }

    public updateData() {
        if (!this.completed || !this.data) {
            return;
        }
        let data = this.data as RoleHeadType;
        // 头像
        if (isNotVain(data.rolehead && data.rolehead.icon)) {
            this.imgIcon.source = res_utils.getProfileHeadPath(data.rolehead.icon);
        }
        else {
            this.imgIcon.source = "";
        }
        if (this.imgBottomFrame && data.bottomImgSrc) {
            this.imgBottomFrame.source = data.bottomImgSrc;
        }
        // 头像框
        let frame = data?.rolehead?.frame;
        let frame_type = data?.rolehead?.frame_type;
        if (this.imgFrame) {
            this.imgFrame.skipTouch = true;
            if (!!frame) {
                let isEffectFrame = getFrameEffect(frame);
                if (isEffectFrame) {
                    RoleHeadUtils.setRoleHeadAni(true, this.grpMc, frame);
                }
                else {
                    RoleHeadUtils.setRoleHeadAni(false, this.grpMc, frame);
                }
                if (frame_type == RoleHeadFrameType.dynamic) {
                    this.showDynamicFrame();
                    this.imgFrame.visible = false;
                } else {
                    this.imgFrame.source = getProfileHeadFramePath(frame, frame_type);
                    this.imgFrame.visible = true;
                    this.hideDynamicFrame();
                }
            }
            else {
                RoleHeadUtils.setRoleHeadAni(false, this.grpMc, frame);
                this.imgFrame.visible = false;
                this.hideDynamicFrame();
            }
        }

        // 状态
        if (data.fillHead && data.rolehead?.frame == DEFAULT_HEAD_FRAME_ID) {
            this.currentState = RoleHeadState.STATE_NO_FRAME;
        } else {
            this.currentState = RoleHeadState.STATE_NOR;
        }

        if (this.lblLv) {
            if (data.lv) {
                if (data?.rolehead?.fightType == FIGHT_TYPE.PET) {
                    this.lblLv.text = s2_petLevel_cfg.getShowLvEx(this.data.lv, false);
                } else {
                    this.lblLv.text = s2_rolelevel_cfg.getSmallShowLv(+data.lv) //data.lv.toString();
                }

                this.lblLv.visible = true;
            } else {
                this.lblLv.visible = false;
            }
        }

        let showStar = true;
        if (!!frame) {
            let isShowStart = getShowStar(frame);
            if (!isShowStart) {
                showStar = false;
            }
        }

        //巅峰比武场头像星级
        this.showStar(showStar && data.rolehead?.star);
        // 名字
        if (this.grpName) {
            if (!!data.name) {
                this.grpName.visible = true;
                this.lblName.text = data.name;
            }
            else {
                this.grpName.visible = false;
            }
        }
        if (this.grpLock) {
            this.grpLock.visible = !!data.rolehead?.isLock;
        }

        // 空状态
        this.grpEmpty && (this.grpEmpty.visible = !!data.empty);
        this.gapMain && (this.gapMain.visible = !data.empty);
        // 点击功能
        this.setClickEvent(data.clickabled);
        // 种族角标
        if (this.imgCareerIcon) {
            let roleType = data.rolehead?.role_type;
            if (!data.hideCareerIcon && roleType && roleType > 0 && s2_career_cfg.CareerInfo[roleType]) {
                let race = s2_career_cfg.CareerInfo[roleType][s2_career_cfg.iRace];
                this.imgCareerIcon.source = imgSource(`main_role_career_icon_${race}`, euisheet_enum.mainrole0);
                this.imgCareerIcon.visible = true;
            } else {
                this.imgCareerIcon.visible = false;
            }
        }
    }

    private m_objDynamicFrame: MovieClipEx;
    private showDynamicFrame() {
        let data = this.data as RoleHeadType;
        let frame = data.rolehead.frame;
        let frame_type = data.rolehead.frame_type;
        let path = getProfileHeadFramePath(frame, frame_type);

        this.hideDynamicFrame();
        this.m_objDynamicFrame = new MovieClipEx();
        this.m_objDynamicFrame.setRes(path);
        this.grpDynamicFrame.addChild(this.m_objDynamicFrame);
        this.m_objDynamicFrame.play(-1);
    }

    private hideDynamicFrame() {
        if (this.m_objDynamicFrame) {
            this.m_objDynamicFrame.stop();
            this.m_objDynamicFrame.parent && this.m_objDynamicFrame.parent.removeChild(this.m_objDynamicFrame);
            this.m_objDynamicFrame = null;
        }
    }

    private setClickEvent(val: boolean) {
        if (val) {
            this.addEventListener(egret.TouchEvent.TOUCH_TAP, this.onShowPlayerInfo, this);
        }
        else {
            this.removeEventListener(egret.TouchEvent.TOUCH_TAP, this.onShowPlayerInfo, this);
        }
    }

    private onShowPlayerInfo(e: egret.TouchEvent) {
        let data = this.data as RoleHeadType;
        if (data.clickFun) {
            //data.clickFun();
            data.clickFun.apply(data.clickObj || data, [e]);
            return;
        }
        let uid = data.uid;
        uid && PlayerInfoCNet.C_GET_PLAYER_INFO(uid);
    }

    private arenaStarComp: ArenaStarComp
    private showStar(star: number) {
        if (star) {
            if (!this.arenaStarComp) {
                this.arenaStarComp = new ArenaStarComp()
                if (this.grpStar) {
                    this.grpStar.addChild(this.arenaStarComp);
                }
            }
            this.arenaStarComp.setData(star);
            this.arenaStarComp.visible = true;
        } else {
            this.arenaStarComp && (this.arenaStarComp.visible = false);
        }
    }
}

//巅峰比武场星级
//
export class ArenaStarComp extends ComponentEx {
    grpStar: eui.Group;
    imgStar1: eui.Image;
    imgStar2: eui.Image;
    imgStar3: eui.Image;
    imgStar4: eui.Image;
    imgStar5: eui.Image;
    lblStarNum: eui.Label;

    //星星配色 【0：当前颜色 1：底色】
    private static readonly STAR_IMG = [
        ['arena_top_head_star_png', 'arena_top_head_star_png'],
        ['arena_top_head_star_red_png', 'arena_top_head_star_png'],
        ['arena_top_head_star_white_png', 'arena_top_head_star_red_png'],
        ['arena_top_head_star_white_png', 'arena_top_head_star_white_png']
    ]
    //位置要转换一下
    private static readonly STAR_POS = [4, 2, 1, 3, 5]
    private star: number;

    constructor() {
        super();
        this.skinName = this.skinName || 'resource/eui/RoleHead_star.exml';
    }

    protected onSkinLoadCompleted(): void {
        super.onSkinLoadCompleted();
        this._updateStar();
    }

    @SafeCallFunction()
    public setData(star: number) {
        this.star = star;
        this._updateStar();
    }

    private _updateStar() {
        if (!this.completed || !this.star) return
        let star = this.star;
        let SHOW_STAR = 5;
        if (star > SHOW_STAR * (ArenaStarComp.STAR_IMG.length - 1)) {
            this.currentState = '_5';
        } else if (star >= SHOW_STAR) {
            this.currentState = '_6';
        } else {
            this.currentState = `_${star}`;
        }
        this.validateNow()
        this.lblStarNum.visible = star > SHOW_STAR * (ArenaStarComp.STAR_IMG.length - 1);
        this.lblStarNum.text = `${star}`;
        for (let i = 0; i < ArenaStarComp.STAR_POS.length; i++) {
            let index = Math.min(Math.floor(star / SHOW_STAR), ArenaStarComp.STAR_IMG.length - 1);
            let pos = i + 1 > star % SHOW_STAR ? 1 : 0;
            (this[`imgStar${ArenaStarComp.STAR_POS[i]}`] as eui.Image).source = ArenaStarComp.STAR_IMG[index][pos];
        }
    }
}