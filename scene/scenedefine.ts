//=================================数据定义
import { serverentity_define } from "clientsdk/serverentity_define";
import { game_define } from "game_define";
import { game_enum } from "game_enum";
import { STeamFormationVo } from "s2/team/vo/common/STeamViewVo";
import { trade_define } from "s2/trade/trade_define";

export namespace scene_define {

    export let MAIN_HERO_NAME = 'MainHero';

    export const cameraDefaultScale = 1.3;
    export const cameraFlyingScale = 1.1;
    export const avatarFlyingScaleFactor = 1.3;

    // ==============
    export enum SSceneType {
        /**大世界 */
        WORLD = 1,
        // /**练功区 (deprecated) */
        // AFK = 2,
        /**副本 */
        DUNGEON = 3,
        /**剧情 */
        PLOT = 4,
    }

    // ==============
    export enum SAvatarType {
        // AVATAR = 0,

        Role = 1,
        MAIN_ROLE = 2,
        OTHER_ROLE = 3,

        NPC = 4,
    }

    // ==============
    export type SSceneTeam = {
        tid: string,
        formation?: STeamFormationVo,
    }

    export type SSceneTeamEventCommonData = {
        uid: number,
        uuid: string,
    }


    export interface SNpcChatOptionArgsSubmitItem {
        item_no: number,
        has: number,
        item_amount: number,
        trade_info?: trade_define.ProductInfo
    }
    export type SNpcChatOptionType = "option_sub_item";

    export interface SNpcChatOption {
        option_id: number;
        icon?: string;
        text: string;
        handler?: SNpcChatOptionType;
        args?: SNpcChatOptionArgsSubmitItem;

        // cli
        aniDelay?: number;
    }

    export interface SNpcChatDialog {
        text: string;
        speaker: number;
        options: SNpcChatOption[];
        /**默认选项 0表示默认自动关闭 */
        default_option?: number;
        /**采用默认选项的间隔， 默认是5s, 而且只有default_option有的时候才有效*/
        default_intv?: number;
        /**npc:bust资源id，player:是modelId */
        model: number,
        name: string,
        bust_tag?: number,
        bust_alpha?: number,
    }

    export interface SNpcChatInfo {
        npc_no: number;
        npc_id: string;
        dialog_no: number;
        dialog: SNpcChatDialog[];
        gameplay_open_id?: number;
        keep_ui_open?: 0 | 1 | 2;
        background?: string;
        /** 是否隐藏对话遮罩（diban），true 时露出下层 UI/场景 */
        hide_mask?: boolean;
        is_sync?: boolean;
        is_team: number;
    }

    export type SNpcChatSyncIndex = [
        dialog_no: number,
        next_index: number
    ]

    export enum SMoveToDestType {
        /**只过去，无任何行为 */
        NONE = 0,
        /**与npc对话 */
        CHAT_NPC = 1,
        /**使用物品 */
        USE_ITEM = 2,
        /**自言自语 */
        PLAY_DIALOG = 3,
        /**打开UI */
        OPEN_UI = 4,
        /**打开UI并显示气泡 */
        OPEN_UI_BUBBLE = 5
    }
    /**强制更新位置（即瞬移） */
    export type SForceUpdatePos = [number, [number, number, number?]];

    /**服务器向客户端请求最近的场景传送点 */
    export type S_REQUEST_CLOSED_BORN_POS = [
        /**查询句柄id，回复时传入 */
        string,
        /**场景编号 */
        number,
        /**当前场景位置 （有可能是空，只有在本场景内传送时，才不为空） */
        [number, number],
        /**目标场景位置 */
        [number, number]
    ];
    /**客户端回复服务器查询最近的场景传送点 */
    export type C_RESPONSE_CLOSED_BORN_POS = [
        /**查询句柄id，回复时传入 */
        string,
        /**传送点位置 */
        [number, number],
        /**是否传送（同场景内移动时，如果为False则表示从原位置直接走过去，不发生传送） */
        boolean,
    ]


    /**私有npc */
    export type SPrivateNpcInfo = {
        uuid: any;
        npc_no: number;
        name: string;
        posX: number;
        posY: number;
        direction: number;
        body: number;
        head?: number;
        weapon?: number;
        world_no: number;
        npc_type: number;
        ai_comp: serverentity_define.AIComponentType[];
        no_yaw_limit?: boolean;
        init_visible: number;
        title?: game_define.TitleInfoBase;
        extra_name?: string;
    }
    /**私有npc字典 */
    export type SPrivateNpcInfoCreateArr = SPrivateNpcInfo[];
    export type SPrivateNpcInfoDelArr = [number, number, string][];


    /**私有player */
    export type SPrivatePlayerInfo = {
        space_no: number;
        space_type: SSceneType;

        entityName: string;
        entity_uuid: string;

        avatarStyle: serverentity_define.IAvatarStyle;

        leaderId: number;
        teamId: string;
        teamState: game_enum.TeamMemberState;
        team_formation: STeamFormationVo;

        is_robot: boolean;
        posX?: number;
        posY?: number;
        direction?: number;
        fake_lv?: number; // 假等级
        lv?: number; // 真实等级
        state?: number;
    }


    // ===场景npc信息
    // copy s1 src\world\WorldDef.ts WorldDef
    export enum SceneAvatarDef {
        TYPE_PLAYER = 1,
        TYPE_NPC = 2,
    }

    export enum SceneChaseType {
        AVATAR = 1, // 直线追逐
        ESCORT = 2, // 护送,跑到目标背后特定追逐点坐标
    }

    export type S_GUIDE_SHOW_SCENE_VFX = {
        world_pos: [number, number],
        world_no: number,
    }

    export type S_ENTER_PLAY_SCENE = {
        open_id: number,
        extra?: {},
    }


    // /**移动到目标 (deprecated)*/
    // export interface SMoveToDest {
    //     /**场景编号 */
    //     space_no: number,
    //     /**npc编号 */
    //     npc_no: number,
    //     /**npc朝向 */
    //     npc_yaw?: number
    //     /**npc类型 */
    //     npc_type?: NpcTypeEnum,
    //     /**位置二元组 */
    //     position: [number, number],
    //     /**action_id */
    //     action_id: string,
    //     /**action类型 */
    //     action_type: SMoveToDestType,
    //     /** 寻路tip */
    //     text_tip?: string,
    // }
    export enum SMoveType {
        /**客户端移动 */
        DIRECT = 1,
        /**传送点 */
        TELEPORT = 2,
        /**驿站 */
        STATION = 3,
        /**直接跳转 */
        JUMP = 4
    }
    export type SMovePath = {
        idx: number,
        /**移动类型 */
        move_type: SMoveType;
        /**@see: IServerEntityProps.noDirectionLimit */
        no_yaw_limit?: boolean,
        /**目标场景ID */
        target_scene: number;
        /**目标二维坐标 [x, y] */
        target_pos: [number, number];
        /**（可选）目标NPC编号 */
        npc_no?: number;
        /**（可选）目标NPC类型 */
        npc_type?: number;
        /**（可选）目标NPC朝向 */
        npc_yaw?: number;

        jump_check_pos?: [number, number];
    }
    export type S_MOVE_TO_DEST_EX = {
        /**本次寻路的唯一标识 */
        action_id: string,
        /**本次自动寻路的显示文本 */
        text_tip?: string,
        auto_type?: SAutoNavType,
        move_path: SMovePath[],

        close_ui?: number
    }


    export type SMainRoleCurPath = {
        s: PointArray,
        path: PointArray[],
        duration: number,
    };

    export type SAutoNavType = "pathing" | "play";
    export type SAutoNav = {
        tips?: string,
        type?: SAutoNavType,
    }

    export type S_ENTER_WORLD_RESULT = boolean;
}