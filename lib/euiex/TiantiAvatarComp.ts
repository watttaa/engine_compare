import { s2_rolelevel_cfg } from "auto/RoleLevel";
import { Avatar } from "avatar/Avatar";
import { AvatarData } from "avatar/AvatarDefines";
import { AvatarFactory } from "avatar/AvatarFactory";
import { avatar_utils } from "avatar/AvatarUtils";
import { game_enum } from "game_enum";
import { imgSource } from "GlobalValue";
import { TiantiRankIcon } from "lib/euiex/TiantiRankIcon";
import { GTeamConf } from "s2/team/conf/GTeamConf";
import { utlis_compare } from "utils/utlis_compare";

export interface TiantiAvatarComp {
    grpAvatar: eui.Group;
    btnAdd: eui.Button;
    grpInfo: eui.Group;
    lblName: eui.Label;
    imgCareerIcon: eui.Image;
    lblLv: eui.Label;
    cpnRankIcon: TiantiRankIcon;
    imgReady: eui.Image;
    grpCaptain: eui.Group;
    grpRecuit: eui.Group;
    imgRecruit: eui.Image;
    lblRecuit: eui.Label;

}


export enum Arena_Match_AvatarStateEnum {
    STATE_NOR = "nor",
    STATE_EMPTY = "empty",
    STATE_RECRUIT = "recruit",
    STATE_READY = "ready",
    STATE_NOT_READY = "not_ready",
    STATE_CAPTAIN = "captain",
    STATE_OFFLINE = "offline",
}

export type TiantiAvatarEntry = {
    avatarData?: AvatarData,
    char_name?: string,
    levelId?: number,
    career?: number,
    seg?: [number, number]
    is_leader?: boolean,
    empty?: boolean,
    is_ready?: boolean,
    uid: number,
    show_seg?: boolean,
    state?: game_enum.TeamMemberState
}

export class TiantiAvatarComp extends eui.ItemRenderer {
    public $avarar: Avatar;

    private constructor() {
        super();
        //this.skinName = 'resource/eui/S2/arena/Arena_Match_Avatar.exml';
    }

    public $onRemoveFromStage(): void {
        this.destoryPlayer();
        super.$onRemoveFromStage();
    }

    public dataChanged() {
        super.dataChanged();
        let data = this.data as TiantiAvatarEntry;
        //this.destoryPlayer();
        this.grpCaptain.visible = data.is_leader;
        this.cpnRankIcon.visible = data.show_seg;
        let status = [];
        if(data.state == game_enum.TeamMemberState.AWAY){
            status.push(Arena_Match_AvatarStateEnum.STATE_OFFLINE);
        }
        if (data.empty) {
            status.push(Arena_Match_AvatarStateEnum.STATE_EMPTY);
            this.destoryPlayer();
        } else {
            if (data.is_ready) {
                status.push(Arena_Match_AvatarStateEnum.STATE_READY);
            } else {
                status.push(Arena_Match_AvatarStateEnum.STATE_NOR);
            }
            this.$updateRoleAvarar();
            this.lblName.text = data.char_name;
            this.lblLv.text = s2_rolelevel_cfg.getShowLvEx(data.levelId);
            let iRace = s2_career_cfg.CareerInfo[data.career][s2_career_cfg.iRace];
            this.imgCareerIcon.source = imgSource(`main_role_career_icon_${iRace}`);
            this.cpnRankIcon.data = data.seg;
        }
        this.currentState = status.join(",");

    }


    private $updateRoleAvarar() {
        let data = this.data as TiantiAvatarEntry;
        if (!data) return
        let avatarData: AvatarData = data.avatarData;
        //策划说 不显示坐骑
        avatarData.ride = 0;
        avatarData.mount = 0;
        let old_avatarData = this.$avarar?.avatar_data as AvatarData;
        let new_avatarData = avatarData as AvatarData;
        if (utlis_compare.deepEqual(old_avatarData, new_avatarData)) {
            return;
        }
        if (!this.$avarar) {
            let avatar = AvatarFactory.getInstance().createAvatar(avatarData);
            avatar.stand();
            avatar_utils.scaleWitchInterfaceSize(avatarData.body, avatar)
            this.grpAvatar.addChild(avatar);
            this.$avarar = avatar;
        } else {
            AvatarFactory.getInstance().refreshAvatar(this.$avarar, avatarData);
        }
    }

    private destoryPlayer() {
        if (this.$avarar) {
            AvatarFactory.getInstance().destroyAvatar(this.$avarar);
            this.$avarar = null;
        }
    }

}
