import { s2_rolelevel_cfg } from "auto/RoleLevel";
import { AvatarComDefine, AvatarData } from "avatar/AvatarDefines";
import { AvatarFactory } from "avatar/AvatarFactory";
import { HeadTopUIComponent } from "avatar/comp/impl/addoncomp/HeadTopUIComponent";
import { ActionName } from "base/Enum";
import { serverentity_define } from "clientsdk/serverentity_define";
import { GlobalValue } from "GlobalValueDefine";
import { FactionWarManager } from "s2/factionWar/FactionWarManager";
import { ForcePK_define } from "s2/forcePK/ForcePK_define";
import { color_utils } from "utils/ColorUtils";
import { CSceneAvatarLegacy } from "world/scene/element/legacy/CSceneAvatarLegacy";
import { scene_define } from "world/scene/scenedefine";


export class GSceneAvatarFactory extends SingletonClassEx {

    destroy(): void {
    }


    public createAvatarComponent(avatar: CSceneAvatarLegacy, avatarData: AvatarData): void {
        AvatarFactory.getInstance().createAvatarComponent(avatar, avatarData);

        this.updateHp(avatar, avatarData);

        this.refreshFactionName(avatar, avatarData);
    }

    public refreshAvatar(avatar: CSceneAvatarLegacy, avatarData: AvatarData, isClear: boolean = true) {
        AvatarFactory.getInstance().refreshAvatar(avatar, avatarData, isClear);

        this.refreshFactionName(avatar, avatarData);
    }

    // ==========
    private updateHp(avatar: CSceneAvatarLegacy, avatarData: AvatarData) {
        if (avatarData.hp) {
            if (avatar.avatarType == scene_define.SAvatarType.NPC) {
                (avatar.getComponent(AvatarComDefine.HeadTopUI) as HeadTopUIComponent).recordMPShow(false);

                let head: HeadTopUIComponent = avatar.getComponent(AvatarComDefine.HeadTopUI) as HeadTopUIComponent;
                let hp = (avatar.serverEntityData as serverentity_define.IServerNpcProps).hp;
                let max_hp = (avatar.serverEntityData as serverentity_define.IServerNpcProps).max_hp;

                head.setValue(hp, max_hp, true);
                if (hp == 0) {
                    avatar.play(ActionName.DIE, 1);
                }
            }
        }
    }

    private refreshFactionName(avatar: CSceneAvatarLegacy, data: AvatarData) {
        if (data.name && data.name !== "") {
            let color = data.nameColor;
            //人物名字颜色
            if (avatar.avatarType == scene_define.SAvatarType.NPC) {
                if (data.faction?.side > 1) {
                    color = GlobalValue.Blue;
                    if (FactionWarManager.getInstance().mySide) {
                        color = data.faction.side == FactionWarManager.getInstance().mySide ? GlobalValue.Blue : GlobalValue.Red;
                    }
                }
            } else {
                const lv = avatar.serverEntityData.lv;
                const fakeLv = avatar.serverEntityData.fake_lv;

                let rebornLevel = s2_rolelevel_cfg.getRebornLevel(fakeLv >= 0 ? fakeLv : lv);
                color = color_utils.getRebornLevelColorNum(rebornLevel);
            }

           
            if (avatar.serverEntityData.crime_level) {
                color = ForcePK_define.ForcePkCrimeLevelNameColor[avatar.serverEntityData.crime_level] || color;
            }
            avatar.nicknameColor = color;
        }
        if (data?.faction?.fid_name) {
            let color = GlobalValue.Blue;
            if (FactionWarManager.getInstance().mySide) {
                color = data.faction.side == FactionWarManager.getInstance().mySide ? GlobalValue.Blue : GlobalValue.Red;
            }
            avatar.addComponent(AvatarComDefine.NameExt, { name: data.faction.fid_name, nameColor: color });
        }
    }

}