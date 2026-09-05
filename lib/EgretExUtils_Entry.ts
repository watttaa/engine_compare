import { FollowerType, RewardState } from "GlobalValue";
import { ItemInfo } from "s2/bag/ItemInfo";
import { ArenaHighestFinalOrderEnum, ArenaHighestFinalPageEnum, ArenaTopFinalOrderEnum, ArenaTopFinalPageEnum, ConstraintEnum, ItemMcTypeEnum, QualityEnum } from "base/Enum";
import { CostEntry, FashionEntry, RoleHeadEntry } from "base/ServerEntry";
import { filter_utils } from "lib/FilterUtils";

export type SkillCardData = {
    icon: string,
    intro: string,
    tagBg: string,
    quality: number
}
export namespace EgretExEntry {

    export type PPIconItemCustomData = {
        checkReddot?: boolean,//是否检测红点
        showLevel?: boolean,//是否显示等级
        showName?: boolean,//是否显示名称
        showStar?: boolean,//是否显示星级
        showWuxing?: boolean,//是否显示五行
        hideTag?: boolean,//是否隐藏角标
        hideZhan?: boolean,//是否隐藏出战标识
        showEffect?: boolean,//是否显示动效
        touchFunc?: Function,
        touchThis?: any,
    }

    export type RichLabelTouchInfo = {
        touchInfo: any,
        touchLocalPos?: Point,
        touchGlobalPos?: Point,
        textLocalPos?: Point,
        textGlobalPos: Point,
        textHeight: number,
        textWidth: number,
    }

    export interface RichLabelAtomProp {
        type: number; // 0:newline 1:text 2:emote 3:picture
        text?: string;
        color?: number;
        underline?: boolean;
        bold?: boolean;
        italic?: boolean;
        mcdata?: MCData;
        touchinfo?: string;
        autoPlay?: boolean;
        mcReverse?: boolean;
        voiceAtomTouchinfo?: string;
        voiceAtomMcReverse?: boolean;
        /**表情id */
        emote?: string;

        texture?: egret.Texture;
        /**图片大小 */
        imageSize?: number[];
        /**图片资源路径 */
        imageUrl?: string;
        size?: number
    }

    export type ConsumeItemData = {
        itemInfo?: ItemInfo;
        afford?: boolean;
        info?: string;
        have?: number;
        use?: number;
        showHave?: boolean;
        noHaveFormat?: number;
        noUseFormat?: number;
        haveNotShow?: number;
        useNotShow?: number;
        touchInfo?: any; // 点击处理信息（包括原界面回调，新界面关闭回调）
        touchAddCB?: Function; // 【+】号点击
        isAffordable?: boolean;//自定义是否满足条件
        lockSize?: number;
        showSource?: boolean; // 是否自动打开获取途径弹窗
        // 第二种货币支持
        itemInfo2?: ItemInfo; // 第二种货币的物品信息
        info2?: string; // 第二种货币的数量文本
    }

    export type ItemGridCustomData = {
        /**物品描述 */
        des?: string;
        desSize?: number;
        desColor?: number;
        desTop?: number;
        gem?: { [pos: number]: RoleEqmGemEntry }; // 宝石
        /**是否显示加号标记 */
        // plus?: boolean;
        /**是否只显示加号标记（不显示加号下的黑遮罩） */
        // onlyPlus?: boolean;
        onlyQualityBg?: QualityEnum;
        /**是否显示锁标记 */
        lock?: boolean;
        /**红点 1-显示红点图片 2-显示箭头动画 */
        reddot?: number;
        wear?: boolean;
        sketchBg?: string;//武器剪影边框
        sketch?: string;//武器剪影
        /** 显示物品当前状态 */
        showMask?: { icon?: string, iconPos?: ConstraintEnum, maskVisible?: boolean, maskAlpha?: number };
        /** 显示进度条 */
        showBar?: { value: number, max_value: number };
        /** 星级显示 */
        showStar?: { value: number, max_value?: number };
        /** 是否显示碎片 */
        fragment?: boolean;
        tags?: number[];// 12号表的角标id 支持多个 
        noTag?: boolean;// 是否显示无角标
        extraDes?: string;//右上角额外描述
        /**是否显示右下角数字 */
        showNum?: { isShow: boolean, num?: number };
        /**强化等级 */
        strengUpLevel?: number
        /**显示特效 */
        showEffect?: boolean
        /** 自定义 */
        custom?: {
            canotUse?: boolean,
            inChat?: boolean,
            showZhuanxiang?: boolean,
            // max_use_cnt?: number,
        };
        /**是否显示空状态 */
        isEmpty?: boolean;
        /**是否置灰 */
        gray?: filter_utils.FilterType;
        /**定制的置灰滤镜 */
        grayFilter?: egret.Filter[];
        /**右上角角标 */
        tagRightTop?: string;//source
        /**技能书ID */
        skill_id?: number;
        /**是否显示弹窗 */
        showTips?: boolean;
        /** 停止点击传递 */
        stopImmediatePropagation?: boolean;
        getState?: RewardState;//奖励领取状态
        tempBag?: boolean;//临时背包
    } & EqmRefineData;

    /**装备神炼满级标记 */
    export type EqmRefineData = {
        /**炼器等阶，用来覆盖原有装备等阶显示 */
        refineLevel?: number;
        /**服务端特殊字段refining_full */
        refineMax?: boolean;
    }

    export type CanGetItemGridCustomData = ItemGridCustomData & {
        getState: RewardState;//奖励领取状态
    }

    export type FightPowerDataType = {
        power: number | string; // 战力值
        fun?: Function;        // 点击详情回调
    }

    /**过滤参数 */
    export type SelectorBaseFilterData = {
        elem: number; // 五行 
        quality: number; // 品质
        hurt: number; // 伤害
        type?: number; // 守护类型
        talent?: number; // 伙伴特性
    }

    export const enum FollowerSelEntry {
        elem = "elem",       //金木土水火1~5，全部0
        //quality = "quality",    //品质 1~6，全部0
        type = "type",       //战辅控医 1~4，全部0
        talent = "talent",     //高攻、高血、高敏、负敏 1~4, 全部0
        hurt = "hurt",       //伤害类型 1~2，全部0
        iFightNum = "iFightNum",
    }

    export type SelectorCustom = {
        lstSelector?: boolean;
    }

    export interface SelectorBaseData {
        dataFunc: () => any[];
        execFunc: (isClick: boolean, data: any) => void;
        FiltKey1?: FollowerSelEntry;
        FiltKey2?: FollowerSelEntry;
        FiltKey3?: FollowerSelEntry;
        FiltKey4?: FollowerSelEntry;
        extraFunc?: Function;
        followeType: FollowerType;
        custom?: SelectorCustom;
    }

    export type DownListSelectorData = {
        itemRenderer: typeof eui.ItemRenderer;//列表项ItemRenderer
        listData: any[];//列表数据
        noRequireSelection?: boolean; //是否不需要选中，默认不选中
        defaultIdx?: number;//默认选中项，不过要先监听 DownListEvent.ON_CHOOSED_ITEM 再初始化 initDownList 
        expendMethod?: Function;
        expendStateEx?: Function;
        expendCaller?: any;
    }

    export type SkillGridCostomData = {
        slotData?: any[]; // /**技能孔位定制数据，用于技能升级 */
        showData?: SkillGridData; // 仅仅用于技能展示
    }

    export interface SkillRoleTipsEntry extends RoleSkillShowEntry {
        tyc_effect: string,//天演册效果
        xmxl: string,//神魔修炼效果
        reborn: number,
    }

    /**技能展示信息 */
    export interface RoleSkillShowEntry {
        icon: string; // 技能图标
        feature: string; // 技能定位
        name?: string; // 技能名称
        desc?: string; // 技能描述
        type: number; // 1主动技能 / 0被动技能
        level?: number; // 技能熟练度
        intro?: string,//技能简介
        career?: number, // 技能职业
    }

    /**
 * 玄冥觉醒数据
 * [觉醒成功技能id,技能信息,觉醒道具id,觉醒前伤害，觉醒后伤害]
 */
    export type SkillXuanMingActiveEntry = [
        number,
        RoleSkillShowEntry,
        number,
        number,
        number
    ]


    export type SkillGridData = {
        icon: number | string;    // 技能图标
        reborn?: number,    // 转生要求，0初始，1-3表示1-3转

        feature?: string;    // 技能定位
        id?: number;    // 技能id
        intro?: string;    // 技能简介（加攻 | 燃烧 | 控制 | 连击 | 反击等）
        skill_id?: number;    // 技能id(跟id一样)
        index?: number;    // 技能索引
        name?: string;    // 技能名称
        desc?: string;    // 技能描述
        rebornLev?: string;    // 转生描述
        state?: number;    // 玄冥觉醒状态
        type?: number;    // 1主动技能 / 0被动技能
        openIds?: number[];  // openID
        quality?: number     // 品质
        hasGodSkill?: boolean    // 神兽技能
        tagBg?: string,    // 标签背景
        career?: number,    // 职业
        level?: number,    // 等级

        pid?: number;    // 技能对应的伙伴/守护ID
        star?: number;    // 星级
        max_star?: number;    // 最大星级

        red?: boolean;   // 群雄逐鹿/全民PK使用
        lv?: number;    // 技能突破等级
        reset_cd?: number;    // 技能等级重置cd
        resolve?: string;     //技能解析
        red_frame?: boolean;   //新技能机制显示红色框
        plate_color?: number;
        plate_fx?: number;
        target_num?: number;

    }

    export type SkillGridShowData = {
        grpZhuan?: boolean;
        imgSelected?: boolean;
        imgSignReddot?: boolean;
        imgXuan?: boolean;
        imgIcon?: boolean;
        grpTag?: boolean;
        bgName?: string;
        grpFeature?: boolean;
        showName?: boolean;
    }

    export type SkillSlotData = {
        skill: SkillGridData;//技能信息
        pbrData: { max: number, value: number };//熟练度
        unlock: boolean;
    }

    export type ChangeRoleUIEntry = {
        roles: SkillGridData[];
        costs: CostEntry;
    }

    // export type RoleHeadData = {
    //     icon?: string;
    //     frame?: string;
    //     uid?: number;
    //     name?: string;
    //     isEmpty?: boolean;
    // }

    export type RoleHeadType = {
        rolehead?: RoleHeadEntry,
        carrer?: number;
        uid?: number
        name?: string
        empty?: boolean
        clickabled?: boolean
    }

    export type ArenaTopRoleHeadData = {
        role?: RoleHeadType;
        name?: string;
        server?: string;
        touched?: () => void;
        isWin?: boolean;
        /**是否显示名字 */
        isShowName?: boolean;
        isShowGuessTag?: boolean;
        rate?: number;

    } & ArenaTopRoleHeadEmptyData;

    export type ArenaTopRoleHeadEmptyData = {
        //预览数据
        previewType?: ArenaTopFinalPageEnum;
        order?: ArenaTopFinalOrderEnum;
        /**第几组晋级者 直接按照顺序传值*/
        groupNum?: number;
    }



    export type ArenaHighestRoleHeadEmptyData = {
        //预览数据
        previewType?: ArenaHighestFinalPageEnum;
        order?: ArenaHighestFinalOrderEnum;
        /**第几组晋级者 直接按照顺序传值*/
        groupNum?: number;
        rankIdx?: number;
        /**荣耀排行榜中的特效显示 */
        rankConfig?: ArenaHighestRankConfig;
        season?: number;
    }

    export type ArenaHighestRankConfig = {
        begin: number;
        frame: number;
        title: number;
    }


    export type ArenaHighestRoleHeadData = {
        role?: RoleHeadType;
        name?: string;
        server?: string;
        hotTag?: number;
        touched?: () => void;
        isWin?: boolean;
        /**是否显示名字 */
        isShowName?: boolean;
        isShowGuessTag?: boolean;
        rate?: number;

    } & ArenaHighestRoleHeadEmptyData;

    export type MonsterLevelData = {
        elem?: number; // 五行
        level: number;
        isShowLevel: boolean;
    }

    export type PartnerHeadGridData = {
        partnerType: number; // 1 伙伴 2宠物
        id: number; // 伙伴/宠物id

        //过滤参数
        elem?: number; // 五行 
        quality?: number; // 品质
        hurt?: number; // 伤害
        type?: number; // 守护类型
        talent?: number; // 伙伴特性
        name?: string;//名字
        //同步 GloblFun.addClinetConf 
        iFightNum?: number; //秒x

        //自定义参数
        pid?: number;
        plus?: boolean;//是否显示加号
        icon?: number;
        /**区别与icon，直接显示ICON资源 */
        iconSource?: string;
        isLock?: number,
        star?: number,
        selected?: boolean,
        level?: number,
        item?: number, // 激活道具

        effect_type?: ItemMcTypeEnum; //定制品质框
    }

    export type WishPartnerHeadGridData = {
        sid: number,
        rid: string,
        curState: number,
    } & PartnerHeadGridData

    export enum GodSkillState {
        Empty = 0, //没有神兽技能
        CanLearn = 1, //有神兽技能，未激活
        Learned = 2, //已激活神兽技能
    }

    //详情界面的神兽技能格子状态
    export const enum GodSkillEquipState {
        UnEquip = 0,  //0: 未装备
        Equip = 1,  //1: 已装备
    }

    // 神兽技能替换(PetGodSkillReplaceUI) 和 技能打书(PetSkillListUI) 格子
    export const enum GodSkillReplaceEquipState {
        UnEquip = 0,  //0: 未装备
        Equip = 1,  //1: 已装备
        EquipCurrent = 2,  //2: 已装备,当前技能
    }

    //详情界面技能打书(PetJinengUI) 格子状态
    export const enum SkillGridState {
        LOCK_NO_SKILL = 0,    // 0: 未解锁，没技能
        UNLOCK_NOT = 1,    // 1: 已解锁，没技能
        UNLOCK_HAD = 2,    // 2: 已解锁，有技能
        LOCK_HAS_SKILL = 3,     //3: 未解锁，有技能(但是里面有技能，比如本来有技能，但是召唤兽重置之后等级不够技能格子锁了)
    }

    export type SkillGridStateSet = GodSkillReplaceEquipState | SkillGridState | GodSkillEquipState;

    export type FightResultFormationData = {
        win: boolean;
        role: RoleHeadType;
        formation: FormationEntry;

    }

    export type EliteWarItemEntry = [
        number, //uid
        RoleHeadEntry,//头像
        string, //名字
        number, //战力
        number  //# 0: 平, 1: 胜, 2: 负
    ]

    export type SevenBrotherTalentData = {
        id: number;
        icon: number;
        lv: number;
        active: boolean;
        red: boolean;
        unlock: number; //解锁等级
    }

    export type DragonItemIconEntry = {
        // icon:number|string;
        pid: number;
        level?: number;
        limit?: number;
        mask?: boolean;
        notiy?: boolean;
    } & FashionEntry;

    //阵型信息
    export type FormationEntry = {
        pets: { [pos: number]: FormationPPEntry },
        partners: { [pos: number]: FormationPPEntry },
        skills: ForamtionSkillEntry[];
        skill_card: SkillCardData;
        /**openID,用来跟踪从哪些系统打开的，例如比武场或者巅峰竞技场*/
        openID?: number;
        uid?: number;
    }

    export type ForamtionSkillEntry = {
        feature: string;
        icon: number;
        name: string;
        type: number;
    }



    /////////////////////////(结算)
    export type FormationPPEntry = {
        id?: number;   // 宠物id
        level?: number;   // 等级
        star?: number;   // 星级
        isDead?: boolean;  // 是否死亡
        icon?: number;
        color?: number;
        locked?: boolean;
        intro?: string;
        lock?: number
        xian?: number
    } & FormationTraceEntry & FashionEntry;

    export type FormationTraceEntry = {
        /**openID,用来跟踪从哪些系统打开的，例如比武场或者巅峰竞技场*/
        openID?: number;
        uid?: number;
    }

    export type RoleEqmGemEntry = {
        id: number; //当前宝石id
        nextId: number;
        lev: number; //当前宝石等级
        prop: { [key: string]: number }; //当前宝石属性
        power: number;// 当前宝石战力
        cost: CostEntry; //当前宝石升级消耗
        nextLev: number;//下级宝石等级,用来判断是否最大
        nextProp: { [key: string]: number };//下级属性
        nextPower: number;//下级战力
        showStyle: number;// 展示的样式
        progress_info: {
            needProgress: number,
            curProgress: number
        }
    }

}



