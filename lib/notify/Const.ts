
export const PRIORITY_FIRST = 1; // 起始优先级 必显示
// const PRIORITY_LAST = 5; // 结束优先级
export const PRIORITY_SPEC = -1; // 特殊优先级 必显示 不占用次数
export const PRIO_LIMIT_CNT = 20; // 空位数量（限制数量）
export const PRIO_EMPTY_CNT = 4; // 剩余空位多于此数量时，触发补充
export const HIDE_NOTIFY_SPLITER = "|"; // 绑定id和节点拼接在一起的分隔符
const ENABLE_DEBUG = false // 全局开关
// const PRIORITY_LIST = [] as number[];
// for (let i = PRIORITY_FIRST; i <= PRIORITY_LAST; ++i) {
//     PRIORITY_LIST.push(i);
// }
// PRIORITY_LIST.push(PRIORITY_SPEC);

// export type NotifyBindMap = Map<NotifyID, boolean | NotifyBindMap>

/**
 * 服务器传来的绑定数据的最底层结构的一种(带extra的)
 * 客户端使用同样结构，如果后续有客户端自定义数据需要标明
 */
export type NotifyBindWithExtra = {
    red: boolean,
    extra?: any,
}

/**
 * 服务器传来的绑定数据
 */
export type ServerNotifyBindDict = {
    // 这里可能要注意key是字符串 但可能notifyIDs是number，用==来判断id相等
    [key: string]: boolean | NotifyBindWithExtra | ServerNotifyBindDict
}

/**客户端转换后的数据 统一去掉bool */
export type NotifyBindDict = {
    // 这里可能要注意key是字符串 但可能notifyIDs是number，用==来判断id相等
    [key: string]: NotifyBindWithExtra | NotifyBindDict
}
export type NotifyBindValue = NotifyBindWithExtra | NotifyBindDict
/** 服务器传的红点数据 */
export type NotifyServerData = {
    red: boolean;
    bind: ServerNotifyBindDict;
    extra?: any;
    is_all?: boolean;
    up_cnt?: number;
}
export type NotifyServerEntry = [string, NotifyServerData]
export type NotifyEntry = {
    leaf_node: string;  // 叶子结点
    state?: boolean; // 叶子状态
    extra?: any[];   // 额外数据

    // 客户端生成数据
    effectCount?: number; // 客户端数据，向上传递层数
    pathMap?: Map<string, string>
    bindIds?: NotifyBindDict
    isAll?: boolean
}
export type NotifySkinConf = {
    node: string;
    childPaths: string[];
    bindID: string;
}

/** 红点样式 */
export const enum RedPointStyles {
    NONE = 0, // 无
    RED = 1, // 红点
    NEW = 2, // 新
    NUM = 3, // 数字
    EFFECT = 4, // 动效
    UP = 5, // ↑
    AT = 6, // @
    XIANYU = 7, // 仙玉
}
export type NotifyEntryMap = Map<string, NotifyEntry>

class _NotifyLogger {
    debug(...rest: Array<any>) {
        if (!ENABLE_DEBUG) {
            return
        }
        Logger.info("[Notify]", ...rest)
    }
    warn(...rest: Array<any>) {
        Logger.warn("[Notify]", ...rest)
    }
    error(...rest: Array<any>) {
        Logger.error("[Notify]", ...rest)
    }
}
export const NotifyLogger = new _NotifyLogger()
export type NotifyID = string | number;
export type NotifyUIType = egret.DisplayObject | BaseWidget
export type NotifyIDChangeData = [eui.Component, NotifyID[], NotifyID[]]
