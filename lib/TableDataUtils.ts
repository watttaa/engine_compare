import { s2_actionconf_cfg } from "auto/ActionConf";
import { s2_attrconfig_cfg } from "auto/AttrConfig";
import { s2_groupeffectconf_cfg } from "auto/GroupEffectConf";
import { s2_loopeffectconf_cfg } from "auto/LoopEffectConf";
import { s2_rolesoundgroup_cfg } from "auto/RoleSoundGroup";
import { s2_scene_cfg } from "auto/Scene";
import { s2_singleeffectconf_cfg } from "auto/SingleEffectConf";
import { s2_tempattrconfig_cfg } from "auto/TempAttrConfig";
import { s2_warbulleteffect_cfg } from "auto/WarBulletEffect";
import { s2_warlineeffectconf_cfg } from "auto/WarLineEffectConf";
import { s2_warposeffect_cfg } from "auto/WarPosEffect";
import { s2_active_perform_config_cfg } from "auto/active_perform_config";
import { s2_active_perform_config_huaijiu_cfg } from "auto/active_perform_config_huaijiu";
import { s2_equip_desc_cfg } from "auto/equip_desc";
import { s2_entrance } from "auto/fixed_entrance";
import { s2_guide_cfg } from "auto/guide";
import { s2_guide_register_cfg } from "auto/guide_register";
import { s2_model_cfg } from "auto/model";
import { s2_notify_cfg } from "auto/notify";
import { s2_npc_dialog_tag_cfg } from "auto/npc_dialog_tag";
import { s2_object_cfg } from "auto/object";
import { s2_open_ui_cfg } from "auto/open_ui";
import { s2_passive_perform_config_cfg } from "auto/passive_perform_config";
import { s2_passive_perform_config_huaijiu_cfg } from "auto/passive_perform_config_huaijiu";
import { s2_pet_level_cfg } from "auto/pet_level";
import { s2_pets_cfg } from "auto/pets";
import { s2_status_perform_config_cfg } from "auto/status_perform_config";
import { s2_status_perform_config_huaijiu_cfg } from "auto/status_perform_config_huaijiu";
import { s2_team_goal_cfg } from "auto/team_goal";

export function loadTableData(data: { [key: string]: any }) {
    const tableDataConfig: [any, string, string][] = [
        [s2_object_cfg, "ObjectInfo", "object.json"],
        // [s2_perform, "SkillInfo", "Perform.json"],
        // [s2_addon_cfg, "AddonInfo", "Addon.json"],
        [s2_scene_cfg, "SceneInfo", "scene_config.json"],
        [s2_attrconfig_cfg, "AttrconfigInfo", "attr_config.json"],
        [s2_tempattrconfig_cfg, "TempattrconfigInfo", "temp_attr_config.json"],
        [s2_open_ui_cfg, "OpenUiInfo", "open_ui.json"],
        [s2_entrance, "data", "fixed_entrance.json"],
        [s2_guide_cfg, "GuideInfo", "guide.json"],
        [s2_guide_register_cfg, "GuideRegisterInfo", "guide_register.json"],
        [s2_notify_cfg, "NotifyInfo", "notify.json"],
        [s2_team_goal_cfg, "TeamGoalInfo", "team_goal.json"],
        [s2_pets_cfg, "PetsInfo", "pets.json"],
        [s2_pet_level_cfg, "PetLevelInfo", "pet_level.json"],
        [s2_equip_desc_cfg, "EquipDescInfo", "equip_desc.json"],
        // [s2_npc_cfg, "NpcInfo", "npc_config.json"],
        // [s2_notify, "tags", "notify_tags.json"],
        // [s2_activityCalendar, "ActivityCalendarInfo", "ActivityCalendar.json"],
        [s2_npc_dialog_tag_cfg, "NpcDialogTagInfo", "npc_dialog_tag.json"],
        // 以下，能少则少
        [s2_actionconf_cfg, "ActionconfInfo", "ActionConf.json"],
        [s2_groupeffectconf_cfg, "GroupeffectconfInfo", "GroupEffectConf.json"],
        [s2_loopeffectconf_cfg, "LoopeffectconfInfo", "LoopEffectConf.json"],
        [s2_singleeffectconf_cfg, "SingleeffectconfInfo", "SingleEffectConf.json"],
        [s2_warposeffect_cfg, "WarposeffectInfo", "WarPosEffect.json"],
        [s2_warbulleteffect_cfg, "WarbulleteffectInfo", "WarBulletEffect.json"],
        [s2_warlineeffectconf_cfg, "WarlineeffectconfInfo", "WarLineEffectConf.json"],
        [s2_rolesoundgroup_cfg, "RolesoundgroupInfo", "RoleSoundGroup.json"],
        // [s2_partners_cfg, "PartnersInfo", "partners.json"],
        [s2_pets_cfg, "PetsInfo", "pets.json"],
        [s2_model_cfg, "ModelInfo", "model.json"],
        [s2_active_perform_config_cfg, "ActivePerformConfigInfo", "active_perform_config.json"],
        [s2_active_perform_config_huaijiu_cfg, "ActivePerformConfigHuaijiuInfo", "active_perform_config_huaijiu.json"],
        [s2_passive_perform_config_cfg, "PassivePerformConfigInfo", "passive_perform_config.json"],
        [s2_passive_perform_config_huaijiu_cfg, "PassivePerformConfigHuaijiuInfo", "passive_perform_config_huaijiu.json"],
        [s2_status_perform_config_cfg, "StatusPerformConfigInfo", "status_perform_config.json"],
        [s2_status_perform_config_huaijiu_cfg, "StatusPerformConfigHuaijiuInfo", "status_perform_config_huaijiu.json"],
        [s2_rolesoundgroup_cfg, "RolesoundgroupInfo", "RoleSoundGroup.json"],

        // [s2_hunqi_cfg, "HunqiInfo", "hunqi.json"], //伙伴魂器配置 #35967 【客户端】【伙伴魂器】伙伴魂器系统本身

        ////////////////////////(转生)
        // [s2_rolelevel_cfg   , "RoleLevelInfo"   , "role_level.json"]  , 
    ]
    for (let v of tableDataConfig) {
        let [mod, val, filename] = v;
        mod[val] = data[filename];
    }
}

export async function getTableData<T, K extends keyof T>(mod: T, val: K, filename: `${string}.json`) {
    if (!mod[val]) {
        const newname = tabledata_utils.getChannelFileName(filename);
        mod[val] = await tabledata_utils.getTableData(newname);
    }
    return mod[val];
}
