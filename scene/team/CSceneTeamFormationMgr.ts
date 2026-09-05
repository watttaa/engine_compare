import { AvatarComDefine } from "avatar/AvatarDefines";
import { GTeamConf } from "s2/team/conf/GTeamConf";
import { STeamFormationVo } from "s2/team/vo/common/STeamViewVo";
import { CSceneRole } from "world/scene/element/CSceneRole";
import { CSceneTeam } from "world/scene/team/CSceneTeam";
import { CSceneTeamFormationPolicy, formation_policy } from "world/scene/team/FormationPolicy";

export class CSceneTeamFormationMgr extends egret.HashObject {
    /** 基于单向跟随关系的场景队伍阵型管理 */

    private m_team: CSceneTeam;
    private m_teamFormation: STeamFormationVo;
    private m_policy: CSceneTeamFormationPolicy;

    public static create(team: CSceneTeam, formation: STeamFormationVo = { type: GTeamConf.TeamFormationType.NONE }): CSceneTeamFormationMgr {
        let mgr = new CSceneTeamFormationMgr(team, formation);
        mgr.init();
        return mgr;
    }

    private constructor(team: CSceneTeam, formation: STeamFormationVo) {
        super();
        this.m_team = team;
        this.m_teamFormation = isNotVain(formation) && isObjectNotVain(formation)? formation : { type: GTeamConf.TeamFormationType.NONE };
    }

    public get teamObj(): CSceneTeam {
        return this.m_team;
    }

    public get teamFormation(): STeamFormationVo {
        return this.m_teamFormation;
    }

    public init() {
        this.replaceAddPolicy();
        this.m_policy?.updateFollowRelationship(this);
    }

    public destroy() {
        this.releasePolicy();
        this.m_team = null;
        this.m_teamFormation = null;
    }

    private replaceAddPolicy() {
        const prevFormationType = this.m_policy ? Object.getPrototypeOf(this.m_policy).constructor.type : null;
        const newFormationType = this.m_teamFormation ? this.m_teamFormation.type : null;
        if (prevFormationType === newFormationType) {
            return;
        }
        this.releasePolicy();
        if (!newFormationType) {
            return;
        }
        this.m_policy = this.createPolicy(newFormationType);
        this.m_policy?.onCreated(this);
    }

    private releasePolicy() {
        if (this.m_policy) {
            Logger.log(`CSceneTeamFormationMgr.releasePolicy: ${Object.getPrototypeOf(this.m_policy).constructor.type}`);
            this.m_policy.onReleased(this);
            this.m_policy = null;

        }
    }

    private createPolicy(type: GTeamConf.TeamFormationType): CSceneTeamFormationPolicy | null {
        let policyclz = formation_policy.DefaultFormationPolicy;
        // clz.type == type 的类
        for (const clz of Object.values(formation_policy)) {
            if (clz.type === type) {
                policyclz = clz;
                break;
            }
        }
        Logger.log(`CSceneTeamFormationMgr.createPolicy: ${type} => ${policyclz.name}`);
        return new policyclz();
    }

    // 队伍成员加入
    onAddMember(mem: CSceneRole) {
        if (this.m_policy) {
            this.m_policy.updateFollowRelationship(this);
        }
    }

    // 队伍成员离开
    onDelMember(mem: CSceneRole) {
        if (this.m_policy) {
            this.m_policy.updateFollowRelationship(this);
        }
        mem.removeComponent(AvatarComDefine.Followleader);
    }

    // 队长变化
    onUpdateLeader() {
        if (this.m_policy) {
            this.m_policy.updateFollowRelationship(this);
        }
    }

    // 队型数据变化
    setFormationData(data: STeamFormationVo = { type: GTeamConf.TeamFormationType.NONE }) {
        this.m_teamFormation = isNotVain(data) && isObjectNotVain(data)? data : { type: GTeamConf.TeamFormationType.NONE };
        this.replaceAddPolicy();
        if (this.m_policy) {
            this.m_policy.updateFollowRelationship(this);
        }
    }
}

