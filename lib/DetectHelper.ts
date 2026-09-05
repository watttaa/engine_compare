
import { GlobalValue } from "GlobalValueDefine";


/* //////////////////////////
参考网址
https://detect.nie.netease.com/product/introductions
////////////////////////// */

const PROJECT_ID = "g123";

/** 场景类型 */
export const enum DetectSceneType {
    // Detect必需项 - $符号开关
    $PatchListFailedScene = "2", // 补丁列表下载失败
    $PatchListSucceedScene = "32", // 补丁列表下载成功
    $ServerListFailedScene = "3", // 服务器列表下载失败
    $ServerListSucceedScene = "33", // 服务器列表下载成功
    $PatchFailedScene = "6", // 补丁下载失败
    $PatchSucceedScene = "36", // 补丁下载成功
    $LoginFailedScene = "4", // 游戏登录失败
    $LoginSucceedScene = "34", // 游戏登录成功
    $CollectPingScene = "11", // 定时收集游戏服延时丢包

    // 适配我们的游戏
    ResJsonFailedScene = $PatchListFailedScene, // *.res.json下载失败
    ResJsonSucceedScene = $PatchListSucceedScene, // *.res.json下载成功
    RoleListFailedScene = $ServerListFailedScene, // 角色列表下载失败
    RoleListSucceedScene = $ServerListSucceedScene, // 角色列表下载成功
    GameLoadingFailedScene = $PatchFailedScene, // 加载下载失败
    GameLoadingSucceedScene = $PatchSucceedScene, // 加载下载成功
    LoginFailedScene = $LoginFailedScene, // 游戏登录失败
    LoginSucceedScene = $LoginSucceedScene, // 游戏登录成功
    CollectPingScene = $CollectPingScene, // 定时收集游戏服延时丢包
}

interface DetectDataTypeBase {
    /** 统一设定，无需手动 */ readonly scene: string
    /** 统一设定，无需手动 */ readonly product: string
    /** 统一设定，无需手动 */ readonly time: number
}

interface PatchListSucceedType extends DetectDataTypeBase {
    patchlist_url: string
    dl_speed: string
    time_cost: string
    http_code: string
    file_size?: string
}

interface PatchListFailedType extends DetectDataTypeBase {
    patchlist_url: string
    http_code: string
    error_log: string
}

interface ServerListSucceedType extends DetectDataTypeBase {
    serverlist_url: string
    dl_speed: string
    time_cost: string
    http_code: string
    file_size?: string
}

interface ServerListFailedType extends DetectDataTypeBase {
    serverlist_url: string
    http_code: string
    error_log: string
}

interface PatchSucceedType extends DetectDataTypeBase {
    patch_url: string
    dl_speed: string
    time_cost: string
    download_id: string
    http_code: string
    file_num?: string
    patch_version: string
    file_size: string
    unzip?: string
    file_md5?: string
    file_md5_result?: string
    patch_host?: string // 文档没看到，但系统却需要
}

interface PatchFailedType extends DetectDataTypeBase {
    patch_url: string
    download_id: string
    http_code: string
    error_log: string
    file_num?: string
    patch_version: string
    dl_speed?: string
    time_cost?: string
    file_size?: string
    unzip?: string
    file_md5?: string
    file_md5_result?: string
}

interface LoginSucceedType extends DetectDataTypeBase {
    user_name?: string
    user_id?: string
    account?: string
    server_name: string
    server_ip: string
    server_port: string
    time_cost: string
}

interface LoginFailedType extends DetectDataTypeBase {
    user_name?: string
    user_id?: string
    account?: string
    group_id: string
    server_name: string
    server_ip: string
    server_port: string
    error_log?: string
}

interface CollectPingType extends DetectDataTypeBase {
    user_name?: string
    user_id?: string
    account?: string
    group_id: string
    server_name: string
    server_ip: string
    server_port: string
}

interface AllDetectDataType {
    [DetectSceneType.$PatchListFailedScene]: PatchListFailedType
    [DetectSceneType.$PatchListSucceedScene]: PatchListSucceedType
    [DetectSceneType.$ServerListFailedScene]: ServerListFailedType
    [DetectSceneType.$ServerListSucceedScene]: ServerListSucceedType
    [DetectSceneType.$PatchFailedScene]: PatchFailedType
    [DetectSceneType.$PatchSucceedScene]: PatchSucceedType
    [DetectSceneType.$LoginFailedScene]: LoginFailedType
    [DetectSceneType.$LoginSucceedScene]: LoginSucceedType
    [DetectSceneType.$CollectPingScene]: CollectPingType
}

/** Detect的抽象 */
interface Detect {
    $name: string
    preset(): void;
    upload(data: DetectDataTypeBase): void;
}

/** app版sdk的实现（Android与iOS） */
class AppDetect implements Detect {
    public $name = "AppDetect";

    public preset() {
        //
        JSNativeBridge.getInstance().call("detectPreset", []);
    }

    public upload(data: DetectDataTypeBase) {
        //
        JSNativeBridge.getInstance().call("detectUpload", [data]);
    }
}

/** web版sdk的实现 */
class WebDetect implements Detect {
    public $name = "WebDetect";

    // private readonly $URL = "https://data-detect.nie.netease.com/client/mobile_upload";

    public preset() {
        //
    }

    public upload(data: DetectDataTypeBase) {
        // let temp = {
        //     product: data.product,
        //     data_type: "1",
        //     collect_condition: data.scene,
        //     channel_name: UniSDK.getProp(ConstProp.APP_CHANNEL),
        //     push_time: Math.floor(Date.now() / 1000),
        //     os: preload_utils.getClientOsType_(),
        //     os_version: "",
        //     mobile_type: "iPhone 6 lus",
        //     network_type: navigator["connection"] ? navigator["connection"]["effectiveType"] : "",
        //     device_id: UniSDK.getProp(ConstProp.DEVICE_ID),
        //     mem_total: "0",
        //     mem_idle: "0",
        //     version: clientVersion()
        // };
        // //
        // let xhr = new XMLHttpRequest();
        // xhr.open("POST", this.$URL, true);
        // xhr.send(JSON.stringify({ ...temp, ...data }));
        // xhr.onreadystatechange = function () {
        //     if (xhr.readyState === 4 && xhr.status === 200) {
        //         console.log("!!detect upload success");
        //     }
        // }
    }
}

/** 非sdk版本的实现 */
class UsrDetect implements Detect {
    public $name = "UsrDetect"

    // private readonly $URL = "https://data-detect.nie.netease.com/client/mobile_upload";

    public preset() {
        //
    }

    public upload(data: DetectDataTypeBase) {
        // local test
        // let temp = {
        //     "product": "qa",
        //     "server_port": "0",
        //     "data_type": "1",
        //     "collect_condition": "33",
        //     "server_list_host": "ma88.update.netease.com",
        //     "ip_server_list_host": "103.72.16.24",
        //     "channel_name": "netease",
        //     "start_time": "1576055034",
        //     "finish_time": "1576055034",
        //     "http_code": "200",
        //     "url": "https://ma88.update.netease.com/dev_serverlist",
        //     "push_time": "1576055033",
        //     "dl_speed": "2",
        //     "file_md5": "a2ee4215def0881dd9ecd0d2057a518f",
        //     "file_size": "3041",
        //     "time_cost": "1158.0",
        //     "os": "iOS",
        //     "os_version": "12.4.3",
        //     "mobile_type": "iPhone 6 lus",
        //     "network_type": "wifi",
        //     "device_id": "84BCE702-F78E-4C9D-8B4F-FBFBD320A78E",
        //     "mem_total": "795.11",
        //     "mem_idle": "27.39",
        //     "version": "2.8.2"
        // };
        // data = temp as any;
        // let xhr = new XMLHttpRequest();
        // xhr.open("POST", this.$URL, true);
        // xhr.send(JSON.stringify(data));
        // xhr.onreadystatechange = function () {
        //     if (xhr.readyState === 4 && xhr.status === 200) {
        //         console.log("!!detect upload success");
        //     }
        // }
    }
}

export namespace DetectHelper {
    let inst: Detect;
    let preseted: boolean;

    function getInst() {
        if (!inst) {
            preseted = false;
            if (LoginValue.isLoginChannelMobileSDK()) inst = new AppDetect();
            else if (LoginValue.isLoginChannelWebSDK()) inst = new WebDetect();
            else if (preload_utils_platform.isIOSMobile()) inst = new AppDetect(); // iOS未接SDK，强行也走AppDetect
            else inst = new UsrDetect();
            //
            Logger.log(`[DetectHelper.update] current detect name is ${inst.$name}`);
        }
        return inst;
    }

    /**
     * 创建数据（指定参数类型 -> 指定返回值类型）
     * @param scene 场景类型
     */
    export function createData<U extends DetectSceneType, V extends AllDetectDataType[U]>(scene: U): V;
    export function createData(scene: DetectSceneType): DetectDataTypeBase {
        const product = PROJECT_ID;
        const time = Date.now();
        return { scene, product, time };
    }

    export function enabled() {
        if (G123.get("DetectEnabled")) {
            return true;
        }
         // 内网与非sdk登录不发
        return !(LoginValue.InnerTest || LoginValue.isLoginChannelUrs());
    }

    /**
     * 上传数据
     * @param data 检测数据内容
     */
    export function upload(data: DetectDataTypeBase) {
        if (!enabled()) {
            return;
        }
        if (!preseted) {
            Logger.error("[DetectHelper.upload] 请先执行preset方法再upload！！！");
            return;
        }
        getInst().upload(data);
    }

    /**
     * 预设
     */
    export function preset() {
        if (!enabled()) {
            return;
        }
        getInst().preset();
        preseted = true;
    }

    export function removePrefix(ip: string) {
        if (!ip) return "";
        let idx = ip.indexOf(":");
        if (idx != -1) {
            return ip.slice(idx + 3);
        }
        return ip;
    }
}