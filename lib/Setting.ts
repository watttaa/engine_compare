import { GlobalEventSource, SendEvent } from "GlobalEvent";
import { SettingCNet } from "net/SettingCNet";
import { SettingAutoCmdVo, SettingPetInfoVo, SettingRoleInfoVo } from "setting/norSettings/vo/SettingMainAutoVo";

///////////////////////////////////////////////////////////////////////////// 游戏基本配置
//本地音量设置
export let DefaultHalo = 30001;
export let DefaultNoWeapon = 0; //角色默认造型自身包含武器
export let DefaultWeapon = 10001;
//顺序：人/魔/仙
export let DefaultMale = [1, 5, 3, 7];
export let DefaultFemale = [2, 6, 4, 8];
export let DefaultMale_Ride = [20041, 20045, 20043, 20043];
export let DefaultFemale_Ride = [20042, 20046, 20044, 20044];
export let DefaultRide = 40001;
export let DefaultRide2 = 60001;
export let DefaultPartnerHalo = 30001;

export let VoiceWorldChannelEnable: boolean = false;
export let VoiceFactionChannelEnable: boolean = false; //帮派
export let VoiceCrossChannelEnable: boolean = false; //跨服
export let VoiceSceneChannelEnable: boolean = false; //区域

export let DisplayHaloEnable: boolean = true;
export let DisplayWeaponEnable: boolean = true;
export let DisplayClothesEnable: boolean = true;
export let DisplayRideEnable: boolean = true;
export let DisplayPartnerHaloEnable: boolean = true;
export let DisplayPetEnable: boolean = true;
export let DisplayWarSpeedClick: boolean = false;   //是不是点击过speed相关的按钮

///////////////////////////////////////////////////////////////////////////// 游戏设置配置

export const ONE_TIME_SPEED = 1;
export const TWO_TIME_SPEED = 2;

// 服务器数据，key值以服务器为准
export interface ServerDataType {
    [key: number]: number;
}

export enum ServerDataEnum {
    ONLINE_REMINDER = 1,
    CHAT = 2,
    STRANGER_CHAT = 3,
    AUTO_LOCK_SCREEN = 4,
    CLICK_EFFECT = 9,
    SHOW_REDPACK = 8,
    HUAIJIU_PERFORM = 9, // 怀旧法术选项
    BULL_FACTION = 10, // 帮派弹幕
    BULL_FACTION_WAR = 11, // 帮派战弹幕
    SHOW_MAP = 12, // 显示地图
    FORCE_MSG_TIP = 13, // 收到新消息是否强提醒
    TEAM_SPEED_PRIVACY = 14, // 队伍速度信息展示权限
    BULL_SPECTATE = 15, // 通用观战弹幕（与 BULL_FACTION_WAR 帮派战弹幕完全解耦，走独立 WarDanmakuLayer 体系）
    BULL_REDPACK = 16, // 鸡驴红包谢意弹幕屏蔽开关（1=显示，0=屏蔽）
    BULL_JIEYUAN = 17,
    HUAIJIU_SOUND = 18, //怀旧音效开关
}

// // 存储在服务器的默认数据(必定与角色绑定相关的)
let serverData: ServerDataType = {
    [ServerDataEnum.ONLINE_REMINDER]: 1,//默认提醒
    [ServerDataEnum.CHAT]: 0,
    [ServerDataEnum.STRANGER_CHAT]: 0,
    [ServerDataEnum.AUTO_LOCK_SCREEN]: 0,
    [ServerDataEnum.SHOW_REDPACK]: 1,
    [ServerDataEnum.CLICK_EFFECT]: 0,   // 怀旧法术选项
    [ServerDataEnum.BULL_FACTION]: 1, //帮派弹幕
    [ServerDataEnum.BULL_FACTION_WAR]: 1, //帮派战弹幕
    [ServerDataEnum.SHOW_MAP]: 1, //显示地图
    [ServerDataEnum.FORCE_MSG_TIP]: 1, // 收到新消息是否强提醒
    [ServerDataEnum.TEAM_SPEED_PRIVACY]: 0, // 队伍速度信息展示权限，默认仅自己
    [ServerDataEnum.BULL_SPECTATE]: 1, // 通用观战弹幕，默认开启（与 BULL_FACTION / BULL_FACTION_WAR 一致）
    [ServerDataEnum.BULL_REDPACK]: 1, // 鸡驴红包弹幕默认显示
    [ServerDataEnum.BULL_JIEYUAN]: 1, // 结缘大典弹幕默认显示
    [ServerDataEnum.HUAIJIU_SOUND]: 1, // 战斗音效风格，默认怀旧音效(1)
    // "click_effect": 1, // 默认显示
    // "fri_a_o_s_f": 0, // 好友-只接受同帮派玩家申请 // 默认关闭
    // "fri_a_l_n_l": 0, // 好友-不接受比自己等级低20级以上的玩家 // 默认关闭
    // "danmu": 1, // 弹幕，默认不禁止
    // "fl_report": 0,//默认屏蔽
    // //【设置界面】 上线提示

    // "title_view_by_type": 0,
    // craft_auto_stop: 0, //打造橙装自动停止,默认不勾选
    // "wechat_gzh": 0,
}

export function isShowOnlineReminder() { return serverData[ServerDataEnum.ONLINE_REMINDER] == 1; }

export function isClickEffect() { return serverData[ServerDataEnum.CLICK_EFFECT] === 1; }
export function isAllChatNoDisturbing() { return serverData[ServerDataEnum.CHAT] === 1; }
export function isStrangerChatNoDisturbing() { return serverData[ServerDataEnum.STRANGER_CHAT] === 1; }
export function getShowRedpack() { return serverData[ServerDataEnum.SHOW_REDPACK] === 1; }
export function getHuaijiuPerform() { return serverData[ServerDataEnum.HUAIJIU_PERFORM] === 1; }
export function getBullFaction() { return serverData[ServerDataEnum.BULL_FACTION] === 1; }
export function getBullFactionWar() { return serverData[ServerDataEnum.BULL_FACTION_WAR] === 1; }
export function getBullRedpack() { return serverData[ServerDataEnum.BULL_REDPACK] === 1; }

export function getBullJieyuan() { return serverData[ServerDataEnum.BULL_JIEYUAN] === 1; }
export function getShowMap() { return serverData[ServerDataEnum.SHOW_MAP] === 1; }
export function getForceMsgTip() { return serverData[ServerDataEnum.FORCE_MSG_TIP] === 1; }
export function getTeamSpeedPrivacy() { return serverData[ServerDataEnum.TEAM_SPEED_PRIVACY]; }
export function getBullSpectate(): boolean { return serverData[ServerDataEnum.BULL_SPECTATE] === 1; }
export function getHuaijiuSound() { return serverData[ServerDataEnum.HUAIJIU_SOUND] === 1; }

// export function isFriendApplyOnlySameGang() { return serverData.fri_a_o_s_f == 1; }
// export function isFriendApplyLevelNotLower() { return serverData.fri_a_l_n_l == 1; }
export function isBanDanmu() { return false }// serverData.danmu == 0; 
// export function isShowFLReport() { return serverData.fl_report == 1; }

export function getTitleViewByType() { return 0 }//serverData.title_view_by_type;
// export function isShowGongZhongHao() { return serverData.wechat_gzh == 1; }
/**
 * 是否打造出橙色装备，自动停止
 */
export function isForgeSeniorEquipAutoStop() {
    return false//serverData.craft_auto_stop == 1;
}

export function getAutoLockScreen() { return serverData[ServerDataEnum.AUTO_LOCK_SCREEN] === 1 }

/** 更新所有远端数据 */
export function loadData(data: ServerDataType) {
    for (const key in serverData) {
        if (Object.prototype.hasOwnProperty.call(data, +key)) {
            updateServerData(+key, +data[key]);
        }
    }
}

/** 保存单个远端数据 */
export function saveServerData(key: ServerDataEnum, value: number) {
    handleData(key, value, true);
}

/** 更新单个远端数据 */
export function updateServerData(key: ServerDataEnum, value: number) {
    handleData(key, value, false);
}

export function handleData(key: number, value: number, save: boolean) {
    const data = serverData;
    if (!Object.prototype.hasOwnProperty.call(data, key)) {
        Logger.error("[Setting.handleData] 不存在的key值");
        return;
    }
    // 服务器的字典中，都是以字符串保存，所以要转成对应的类型
    const old_value = data[key];
    let changed = old_value != +value;
    data[key] = +value;
    if (changed) {
        // 同步服务器
        if (save) {
            SettingCNet.C_SETTING_MODIFY("" + key, value);
        }
        // 本地消息 WarWidget.ts中处理事件
        SendEvent(GlobalEventSource.GAME_SETTING_CHANGE, key);
    }
}

export type SettingData = {
    mobile: PhoneSettingData// 手机绑定信息
    open_ui: boolean, // 是否打开界面
    setting: ServerDataType,
    wechat: {
        business?: boolean // 企业微信
        official?: boolean // 公众号
    }
    is_login: boolean, // 是否登录

    // ↓↓↓ 自动设置区(grpAuto)相关字段,缺失时不影响其他设置项初始化(详见 SettingMainAutoVo) ↓↓↓
    auto_cmd?: SettingAutoCmdVo,
    role_info?: SettingRoleInfoVo,
    pet_info?: SettingPetInfoVo,
}

export enum PhoneSettingState {
    BIND = 1,  //关联手机
    UPDATE = 2,  // 更换手机
    REWARD = 3,  //绑定有礼
}

export type PhoneSettingData = {
    is_phone_user: boolean;
    mobile_num: string;
    show_type: PhoneSettingState;
}