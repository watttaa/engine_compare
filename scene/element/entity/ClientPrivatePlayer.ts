import { client_repo_ex_ } from "clientsdk/ClientRepoEx";
import { serverentity_define } from "clientsdk/serverentity_define";
import { game_enum } from "game_enum";
import { GTeamConf } from "s2/team/conf/GTeamConf";
import { scene_priority_define } from "world/scene/buffer/scene_priority_define";
import { scene_define } from "world/scene/scenedefine";

/**
 * 私有player
 */
export class ClientPrivatePlayer implements serverentity_define.IServerPlayerProps {

    private $data: scene_define.SPrivatePlayerInfo;

    constructor(data: scene_define.SPrivatePlayerInfo) {
        this.$data = data;

        this.space_no = data.space_no;
        this.space_type = data.space_type;
    }

    is_private: boolean = true;

    space_no: number;
    space_type: scene_define.SSceneType;

    get uid() {
        return this.$data.avatarStyle.uid;
    }

    get uuid() {
        return this.$data.entity_uuid;
    }

    get entityName() {
        return this.$data.entityName;
    }

    get posX() {
        return this.$data.posX || 0;
    }
    get posY() {
        return this.$data.posY || 0;
    }

    get direction(): number {
        return this.$data.direction || AvatarDirEnum.DIR_0;
    }

    get avatarStyle(): serverentity_define.IAvatarStyle {
        return this.$data.avatarStyle;
    }

    get teamId() {
        return this.$data.teamId;
    }

    get leaderId() {
        return this.$data.leaderId;
    }

    get teamState() {
        return this.$data.teamState;
    }

    get teamFormation() {
        return this.$data.team_formation;
    }

    get isLeader() {
        return this.leaderId && this.leaderId == this.uid;
    }

    get isInTeam() {
        return Boolean(this.teamId && this.teamState != game_enum.TeamMemberState.AWAY);
    }

    get isFollower() {
        return this.isInTeam && !this.isLeader;
    }

    get is_robot() {
        return this.$data.is_robot;
    }

    get fake_lv() {
        return this.$data.fake_lv;
    }

    get lv() {
        return this.$data.lv;
    }

    get state() {
        return this.$data.state;
    }

    get createPriority(): number {
        let soul = client_repo_ex_.OwnSoul_;
        if (!soul) {
            return 0;
        }
        let distanceToSoul = soul.distanceTo({ x: this.posX, y: this.posY });
        return scene_priority_define.TierIndex.PRIVATE_PLAYER * scene_priority_define.TIER_STEP + distanceToSoul;
    }
}