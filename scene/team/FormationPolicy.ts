import { NpcTypeEnum } from "auto/npc_type_enum";
import { AvatarComDefine } from "avatar/AvatarDefines";
import { component_define } from "avatar/comp/componentdefine";
import { SceneFollowleaderComponent } from "avatar/comp/impl/SceneFollowleaderComponent";
import { SceneModel } from "lib/scene/SceneModel";
import { GTeamConf } from "s2/team/conf/GTeamConf";
import { CSceneRole } from "world/scene/element/CSceneRole";
import { ClientPrivateNpc } from "world/scene/element/entity/ClientPrivateNpc";
import { scene_define } from "world/scene/scenedefine";
import { CSceneTeamFormationMgr } from "world/scene/team/CSceneTeamFormationMgr";

export abstract class CSceneTeamFormationPolicy {
    static readonly type: GTeamConf.TeamFormationType = GTeamConf.TeamFormationType.NONE; // 具体类型由子类实现

    // 场景队伍对象创建后,重建跟随关系
    public onCreated(mgr: CSceneTeamFormationMgr) {
        this.updateFollowRelationship(mgr);
    }

    // 场景队伍对象销毁前,释放跟随关系
    public onReleased(mgr: CSceneTeamFormationMgr) {
        this.clearFollowRelationship(mgr);
    }

    // 获得特定偏序关系的成员列表 [队长在前,成员在后]
    public getSortedFollowMembers(mgr: CSceneTeamFormationMgr): CSceneRole[] {
        const members = mgr.teamObj.members;
        const leaderId = mgr.teamObj.leaderId;
        let followMembers: CSceneRole[] = [];
        members.forEach((mem) => {
            if (mem.serverEntityData.uid !== leaderId) {
                followMembers.push(mem);
            }
            else {
                // 队长在前
                followMembers.unshift(mem);
            }
        });
        return followMembers;
    }

    public clearFollowRelationship(mgr: CSceneTeamFormationMgr) {
        const members = mgr.teamObj.members;
        members.forEach((mem) => {
            mem.removeComponent(AvatarComDefine.Followleader);
        });
    }

    // 更新跟随关系
    public abstract updateFollowRelationship(mgr: CSceneTeamFormationMgr);
}

export namespace formation_policy {
    export class DefaultFormationPolicy extends CSceneTeamFormationPolicy {
        public static readonly type: GTeamConf.TeamFormationType = GTeamConf.TeamFormationType.NONE;

        updateFollowRelationship(mgr: CSceneTeamFormationMgr) {
            const leaderId = mgr.teamObj.leaderId;
            if (isVain(leaderId)) {
                this.clearFollowRelationship(mgr);
                return;
            }

            let leader = mgr.teamObj.leader;

            let followMembers = this.getSortedFollowMembers(mgr);
            followMembers.forEach((mem, index) => {
                if (!leader) { // 队长实体不存在
                    mem.removeComponent(AvatarComDefine.Followleader);
                } else if (mem.serverEntityData.uid == leaderId) { // 队长去掉跟随
                    mem.removeComponent(AvatarComDefine.Followleader);
                }
                else {
                    if (index == 0) {
                        // do nothing
                        return;
                    }
                    const args: component_define.SFollowleaderArgs = {
                        followed: followMembers[index - 1],
                    }
                    const followLeaderComponent = mem.getComponent(AvatarComDefine.Followleader) as SceneFollowleaderComponent;
                    if (!followLeaderComponent || followLeaderComponent.followedAvatar != args.followed) {
                        mem.replaceAddComponent(AvatarComDefine.Followleader, args);
                    }
                }
            });
        }

    }


    export class EscortFormationPolicy extends CSceneTeamFormationPolicy {
        public static readonly type: GTeamConf.TeamFormationType = GTeamConf.TeamFormationType.ESCORT;

        private m_escortNpcId: string;
        private m_followIndex: number[]; // 成员挂载索引

        constructor() {
            super();
            this.m_escortNpcId = null;
            this.m_followIndex = [];
        }

        private get escortNpc() {
            let sceneProxy = SceneModel.getInstance().sceneProxy;
            return sceneProxy.getNpc(this.m_escortNpcId);
        }

        public onReleased(mgr: CSceneTeamFormationMgr): void {
            super.onReleased(mgr);
            this.clearEscortNpc();
        }

        public clearFollowRelationship(mgr: CSceneTeamFormationMgr): void {
            super.clearFollowRelationship(mgr);

            // 清理npc跟随关系
            if (this.escortNpc && this.escortNpc.hasComponent(AvatarComDefine.Followleader)) {
                this.escortNpc.removeComponent(AvatarComDefine.Followleader);
            }
        }

        private clearEscortNpc() {
            if (this.escortNpc) {
                SceneModel.getInstance().sceneProxy.delNpc(this.m_escortNpcId);
            }
            this.m_escortNpcId = null;
        }

        updateFollowRelationship(mgr: CSceneTeamFormationMgr) {
            // 队长 -> 护送物 -> 成员
            const leaderId = mgr.teamObj.leaderId;
            if (isVain(leaderId)) {
                this.clearFollowRelationship(mgr);
                return;
            }

            let followMembers = this.getSortedFollowMembers(mgr);
            let newFollowIndex = [];
            followMembers.forEach((mem, index) => {
                // 队长去掉跟随
                if (mem.serverEntityData.uid == leaderId) {
                    mem.removeComponent(AvatarComDefine.Followleader);

                    // 挂个护送物组件
                    if (mgr.teamFormation && mgr.teamFormation.npc_info && !this.escortNpc) {
                        let npcInfo = mgr.teamFormation.npc_info;
                        let sceneProxy = SceneModel.getInstance().sceneProxy;
                        let npc = new ClientPrivateNpc({
                            uuid: npcInfo.uuid,
                            npc_no: npcInfo.npc_no,
                            name: npcInfo.name,
                            posX: mem.x,
                            posY: mem.y,
                            direction: mem.direction,
                            body: npcInfo.body,
                            world_no: sceneProxy.sceneId,
                            npc_type: npcInfo.npc_type || NpcTypeEnum.NORMAL,
                            ai_comp: [],
                            init_visible: 1,
                        });

                        sceneProxy.addNpc(npcInfo.uuid, npc);
                        this.m_escortNpcId = npcInfo.uuid;
                    }

                    if (!this.escortNpc) {
                        Logger.warn("CSceneTeam", "updateFollowEscort : can not find npcInfo");
                    }

                    // 护送物跟随队长
                    this.escortNpc.replaceAddComponent(AvatarComDefine.FollowData);
                    this.escortNpc.replaceAddComponent(AvatarComDefine.Followleader, { followed: mem, distance: 120 });
                }
                else {
                    if (index == 0) {
                        // do nothing
                        return;
                    }
                    newFollowIndex.push(mem.serverEntityData.uid);
                    const args: component_define.SFollowleaderArgs = {
                        followed: this.escortNpc,
                        chaseType: scene_define.SceneChaseType.ESCORT,
                        chaseEscortId: index - 1,
                        distance: 70,
                        stopdistance: 60,
                        coolDown: 10
                    }
                    let followLeaderComponent = mem.getComponent(AvatarComDefine.Followleader) as SceneFollowleaderComponent;
                    if (!followLeaderComponent || followLeaderComponent.followedAvatar != args.followed || followLeaderComponent.chaseEscortId != args.chaseEscortId) {
                        mem.replaceAddComponent(AvatarComDefine.Followleader, args);
                    }
                }
            });
        }
    }

}