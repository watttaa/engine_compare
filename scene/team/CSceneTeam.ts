import { AvatarComDefine } from "avatar/AvatarDefines";
import { SceneFollowleaderComponent } from "avatar/comp/impl/SceneFollowleaderComponent";
import { scene_log } from "lib/scene/scene_log";
import { STeamFormationVo } from "s2/team/vo/common/STeamViewVo";
import { CSceneRole } from "world/scene/element/CSceneRole";
import { scene_define } from "world/scene/scenedefine";
import { CSceneTeamFormationMgr } from "world/scene/team/CSceneTeamFormationMgr";

/**
 * 客户端队伍，处理队伍跟随
 */
export class CSceneTeam {

    // ================================
    private static pool: CSceneTeam[] = [];
    public static create(args: scene_define.SSceneTeam) {
        let team = CSceneTeam.pool.pop();
        if (!team) {
            team = new CSceneTeam();
        }

        team.reset();
        return team.init(args);
    }

    public static release(team: CSceneTeam) {
        if (!team) {
            return;
        }

        team.reset();
        CSceneTeam.pool.push(team);
    }

    // ================================

    private tid: string;

    private m_dictMembers: { [uid: number]: CSceneRole } = {};

    private m_nLeaderId: number;

    /**队伍阵型管理 */
    private m_formationMgr: CSceneTeamFormationMgr;

    constructor() {
    }

    private init(args: scene_define.SSceneTeam) {
        this.tid = args.tid;

        this.m_dictMembers = {};

        this.m_formationMgr = CSceneTeamFormationMgr.create(this, args.formation);

        return this;
    }

    private reset() {
        this.m_formationMgr?.destroy();
        this.m_formationMgr = null;

        this.tid = null;

        this.m_dictMembers = {};

        this.leaderId = null;
        this.leader = null;
    }

    public get teamId() {
        return this.tid;
    }

    public get members() {
        return Object.values(this.m_dictMembers);
    }

    public get isEmpty() {
        let length = Object.keys(this.m_dictMembers).length;
        return length === 0;
    }

    private isInTeam(mem: CSceneRole) {
        let uid = mem.serverEntityData.uid;
        if (this.m_dictMembers[uid]) {
            return true;
        }

        return false;
    }

    public get leaderId() {
        return this.m_nLeaderId;
    }
    private set leaderId(uid: number) {
        this.m_nLeaderId = uid;
    }

    private m_objLeader: CSceneRole;
    /**leader实体是否存在 */
    public get leader() {
        return this.m_objLeader;
    }
    private set leader(mem: CSceneRole) {
        this.m_objLeader = mem;
    }


    public addMember(mem: CSceneRole) {
        if (this.isInTeam(mem)) {
            return;
        }

        if (mem.serverEntityData.isLeader) {
            this.leader = mem;
        }

        let uid = mem.serverEntityData.uid;
        this.m_dictMembers[uid] = mem;
        this.recalLeaderId();

        this.m_formationMgr.onAddMember(mem);
    }

    public delMember(mem: CSceneRole) {
        if (!this.isInTeam(mem)) {
            return;
        }

        if (mem.serverEntityData.isLeader) {
            this.leader = null;
        }

        this.clearComponents(mem);

        let uid = mem.serverEntityData.uid;
        delete this.m_dictMembers[uid];
        this.recalLeaderId();

        this.m_formationMgr.onDelMember(mem);
    }

    public updateLeader() {
        this.recalLeaderId();
        this.m_formationMgr.onUpdateLeader();
    }

    private recalLeaderId() {
        // 找到第一个leaderId
        const oldLeaderId = this.leaderId;
        let leaderId = null;
        for (let key in this.m_dictMembers) {
            let mem = this.m_dictMembers[key];
            const serverPlayerData = mem.serverEntityData;
            if (!serverPlayerData) {
                Logger.warn("CSceneTeam", "recalLeaderId : can not find serverPlayerData");
                continue;
            }

            let uid = serverPlayerData.uid;
            if (isVain(uid)) { // 服务器会使用uid=0，但需视为有效
                continue;
            }

            if (serverPlayerData.leaderId) { // 按理来说，同一个team，leaderId一致了。
                if (DEV) {
                    if (leaderId && leaderId != serverPlayerData.leaderId) {
                        scene_log.warn(`[CSceneTeam] 同一个队伍LeaderId不一致`);
                    }
                }
                leaderId = serverPlayerData.leaderId;
            }

            if (serverPlayerData.isLeader) {
                this.leader = mem;
                mem.replaceAddComponent(AvatarComDefine.Badge, { id: serverPlayerData.avatarStyle?.team_mark }); // 队长标识
            }
            else {
                mem.removeComponent(AvatarComDefine.Badge);
            }
        }
        this.leaderId = leaderId;
    }

    /**解散队伍 */
    public dismiss() {
        for (let key in this.m_dictMembers) {
            let mem = this.m_dictMembers[key];

            this.clearComponents(mem);

            mem.removeComponent(AvatarComDefine.SceneTeamData);
        }

        CSceneTeam.release(this);
    }

    public updateFollowersPos() {
        for (let key in this.m_dictMembers) {
            let mem = this.m_dictMembers[key];

            let followerLeader = mem.getComponent(AvatarComDefine.Followleader) as SceneFollowleaderComponent;
            if (followerLeader) {
                followerLeader.moveToFollowed(true);
            }
        }
    }

    private clearComponents(_avatar: CSceneRole) {
        _avatar.removeComponent(AvatarComDefine.Badge);

    }

    public updateFormation(data: STeamFormationVo) {
        this.m_formationMgr.setFormationData(data);
    }
}