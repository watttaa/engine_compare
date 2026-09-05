import { s2_text_utils } from "auto/text";
import { AvatarComDefine } from "avatar/AvatarDefines";
import { component_define } from "avatar/comp/componentdefine";
import { SceneMainPlayerComponent } from "avatar/comp/impl/datacomp/SceneMainPlayerComponent";
import { SceneTeamDataComponent } from "avatar/comp/impl/datacomp/SceneTeamDataComponent";
import { serverentity_define } from "clientsdk/serverentity_define";
import { HeroMainModel } from "heroMain/HeroMainModel";
import { SceneStatusManager } from "lib/scene/SceneStatusManager";
import { ISceneSubMgr } from "world/ISceneSubMgr";
import { World } from "world/World";
import { CSceneAvatarLegacy } from "world/scene/element/legacy/CSceneAvatarLegacy";
import { scene_define } from "world/scene/scenedefine";
import { CSceneTeam } from "world/scene/team/CSceneTeam";
import { GSceneTeamEvent, GSceneTeamEventBus } from "world/scene/team/GSceneTeamEvent";

/**
 * 场景队伍管理(只负责管理关系，不处理avatar的创建与销毁)
 * 
 */
export class GSceneTeamMgr extends egret.HashObject implements ISceneSubMgr {

    private ctx: World;

    private m_dictTeam: { [k: string]: CSceneTeam } = {};

    public constructor(context: World) {
        super();
        this.ctx = context;
    }

    clear(): void {
        this.clearTeams();
    }

    dispose() {
        this.ctx = null;
    }

    public getTeam(tid: string): CSceneTeam {
        return this.m_dictTeam[tid];
    }

    private isSelfTeam(playInfos: serverentity_define.IServerPlayerProps[]) {
        for (let info of playInfos) {
            if (SceneStatusManager.isSelf(info[0])) {
                return true;
            }
        }
        return false;
    }

    private get selfId() {
        return HeroMainModel.getInstance().userId;
    }

    private get selfUuid() {
        return HeroMainModel.getInstance().uuid;
    }

    /**获取场景avatar(= mainRole + otherRole) */
    private getAvatar(pid: string) {
        let avatar: CSceneAvatarLegacy = null;

        if (pid == this.selfUuid) {
            return this.ctx.getHero();
        }

        avatar = this.ctx.getPlayer(pid);

        return avatar;
    }

    private updateScreenMainPlayer() {
        // 主角 change_team & change_leaderid 都要检查更新
        let hero = this.ctx.getHero();
        if (!hero) {
            return;
        }

        let sceneTeamData = hero.getComponent(AvatarComDefine.SceneTeamData) as SceneTeamDataComponent;
        if (!sceneTeamData) { // 主角无队伍，屏幕跟随为主角
            this.setScreenMainPlayer();
            return;
        }

        let team = sceneTeamData.team;
        if (team?.leaderId) { // 跟随我所在队伍的队长
            this.setScreenMainPlayer(team.leaderId);
        }
    }

    /**
     * 设置屏幕对象
     * @param pid
     */
    private setScreenMainPlayer(pid?: number) {
        // pid = pid || this.selfId;
        // let avatar = this.getAvatar(pid) || this.ctx.getHero(); // 因为队长关系在，但是不在场景中，因此最终默认为主角 (del.)
        // if (!avatar) {
        //     return;
        // }

        let avatar = this.ctx.getHero(); // 屏幕对象默认为主角

        SceneMainPlayerComponent.setSceneScreenMainPlayer(avatar, { ctx: this.ctx });
    }

    /**清除所有队伍关系，但不销毁avatar */
    private clearTeams() {
        for (let key in this.m_dictTeam) {
            let team: CSceneTeam = this.m_dictTeam[key];

            if (team) {
                team.dismiss();
            }
        }

        this.m_dictTeam = {};
    }

    // ================================================
    // ================================================
    /**创建一支队伍(只处理成员关系) */
    private onCreateTeam(tid: string): CSceneTeam {
        if (this.m_dictTeam[tid]) { // 队伍已存在
            return this.m_dictTeam[tid];
        }

        let team = CSceneTeam.create({ tid });
        this.m_dictTeam[tid] = team;

        GSceneTeamEventBus.getInstance().dispatchEvent(new GSceneTeamEvent(GSceneTeamEvent.TEAM_CREATE));

        return team;
    }

    /**解散一支队伍(只处理成员关系) */
    private onDismissTeam(tid: string) {
        let team = this.m_dictTeam[tid];
        if (!team) {
            return;
        }

        team.dismiss();

        this.m_dictTeam[tid] = null;
        delete this.m_dictTeam[tid];

        GSceneTeamEventBus.getInstance().dispatchEvent(new GSceneTeamEvent(GSceneTeamEvent.TEAM_DISMISS));
    }

    public playerChangeTeamId(info: serverentity_define.IServerPlayerProps, oldTeamId: string) {
        let newTeamId = info.teamId;
        if (oldTeamId) {
            this.playLeaveTeam(info.uuid, oldTeamId); // 离开原来的队伍
        }

        if (newTeamId && info.isInTeam) {
            this.playerJoinTeam(info.uuid, newTeamId, info); // 加入新的队伍
        }

        let _data: scene_define.SSceneTeamEventCommonData = { uid: info.uid, uuid: info.uuid };
        GSceneTeamEventBus.getInstance().dispatchEvent(new GSceneTeamEvent(GSceneTeamEvent.TEAM_ID_UPDATE, _data));
    }

    public playerChangeLeaderId(info: serverentity_define.IServerPlayerProps, oldLeaderId: number) {
        // 1. 更新队长
        let player = this.getAvatar(info.uuid);
        if (!player) {
            return;
        }

        let sceneTeamData = player.getComponent(AvatarComDefine.SceneTeamData) as SceneTeamDataComponent;

        if (sceneTeamData) {
            sceneTeamData.updateLeader();
        }

        // 2.屏幕跟随
        if (player.isMainRole) {
            this.updateScreenMainPlayer();
        }

        let _data: scene_define.SSceneTeamEventCommonData = { uid: info.uid, uuid: info.uuid };
        GSceneTeamEventBus.getInstance().dispatchEvent(new GSceneTeamEvent(GSceneTeamEvent.TEAM_LEADER_CHANGE, _data));
    }

    /**成员入队(只处理成员关系) */
    public playerJoinTeam(pid: string, tid: string, info: serverentity_define.IServerPlayerProps): CSceneTeam {
        // 1. 获取队伍,更新队伍信息
        let team = this.onCreateTeam(tid);

        // 2. 获取player
        let player = this.getAvatar(pid);
        if (!player) {
            return;
        }

        // 3. 入队 & 添加队伍数据组件
        let _teamData: component_define.SSceneTeamDataArgs = {
            team,
            formation: info.teamFormation
        }
        player.addComponent(AvatarComDefine.SceneTeamData, _teamData);

        // 4. 屏幕跟随
        if (player.isMainRole) {
            this.updateScreenMainPlayer();
        }

        // 5. dispatch event
        let _data: scene_define.SSceneTeamEventCommonData = { uid: player.avatar_data.uid, uuid: pid };
        GSceneTeamEventBus.getInstance().dispatchEvent(new GSceneTeamEvent(GSceneTeamEvent.TEAM_JOIN_MEMBER, _data));

        return team;
    }

    /**成员离队(只处理成员关系) */
    public playLeaveTeam(pid: string, tid: string) {
        // 1. 空判断
        if (!this.m_dictTeam[tid]) {
            return;
        }

        // 2. 离队
        let player = this.getAvatar(pid);
        if (!player) {
            return;
        }
        player.removeComponent(AvatarComDefine.SceneTeamData);

        // 3. 屏幕跟随
        if (player.isMainRole) {
            this.updateScreenMainPlayer();
        }

        // 4. dispatch event
        let _data: scene_define.SSceneTeamEventCommonData = { uid: player.avatar_data.uid, uuid: pid };
        GSceneTeamEventBus.getInstance().dispatchEvent(new GSceneTeamEvent(GSceneTeamEvent.TEAM_LEAVE_MEMBER, _data));

        // 5. 是否解散队伍
        let team = this.m_dictTeam[tid];
        if (team.isEmpty) {
            this.onDismissTeam(tid);
        }
    }

    public playerChangeTeamFormation(info: serverentity_define.IServerPlayerProps) {
        let player = this.getAvatar(info.uuid);
        if (!player) {
            return;
        }

        let sceneTeamData = player.getComponent(AvatarComDefine.SceneTeamData) as SceneTeamDataComponent;
        // 更新队形信息
        sceneTeamData?.updateFormation(info.teamFormation);
    }

    // ===
    public showFollowerTips() {
        MessageBox(s2_text_utils.T(2010007));
    }
}
