import { NpcTypeEnum } from "auto/npc_type_enum";
import { client_repo_ex_ } from "clientsdk/ClientRepoEx";
import { serverentity_define } from "clientsdk/serverentity_define";
import { roletitle_define } from "s2/title/roletitle_define";
import { npcNameColor } from "GlobalValue";
import { scene_priority_define } from "world/scene/buffer/scene_priority_define";
import { scene_define } from "world/scene/scenedefine";

/**
 * 私有npc
 */
export class ClientPrivateNpc implements serverentity_define.IServerNpcProps {

    private $data: scene_define.SPrivateNpcInfo;

    constructor(data: scene_define.SPrivateNpcInfo) {
        this.$data = data;

        this.space_no = data.world_no;
        this.space_type = scene_define.SSceneType.WORLD;
        this.npcNo = data.npc_no;
    }

    is_private: boolean = true;

    space_no: number;
    space_type: scene_define.SSceneType;

    npcNo: number;

    get uid() {
        return this.$data.npc_no;
    }

    get uuid() {
        return this.$data.uuid;
    }

    get entityName() {
        return this.$data.name;
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
        const rawTitle = this.$data.title;
        const title = rawTitle?.id ? {
            id: rawTitle.id,
            name: rawTitle.name,
            show_type: rawTitle.show_type ?? roletitle_define.TitleShowType.TEXT,
            style: rawTitle.style ?? 1,
        } : undefined;

        return {
            uid: this.uid,

            name: this.$data.name,
            nameColor: npcNameColor,
            extraName: this.$data.extra_name,

            body: this.$data.body,
            head: this.$data.head,
            weapon: this.$data.weapon,

            direction: this.direction,

            title,
        }
    }

    get npcType() {
        return this.$data.npc_type || NpcTypeEnum.NORMAL;
    }

    get ai_comp(): serverentity_define.AIComponentType[] {
        return this.$data.ai_comp || [];
    }

    get noDirectionLimit() {
        return this.$data.no_yaw_limit;
    }

    get createPriority(): number {
        let soul = client_repo_ex_.OwnSoul_;
        if (!soul) {
            return 0;
        }
        let distanceToSoul = soul.distanceTo({ x: this.posX, y: this.posY });
        return scene_priority_define.TierIndex.PRIVATE_NPC * scene_priority_define.TIER_STEP + distanceToSoul;
    }

    get initVisible(): boolean {
        return this.$data.init_visible == 1;
    }
}