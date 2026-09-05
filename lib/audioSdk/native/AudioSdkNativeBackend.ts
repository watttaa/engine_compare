/**
 * 实时语音SDK - native-sdk backend 适配对象
 * 仅用于已集成 CCMini native SDK 的原生 App（iOS / Android）
 *
 * CCMiniFacade 在 backend='native-sdk' 时，把 StartCCMini / ControlMini / GetJsonData / CloseCCMini
 * 四个调用直接透传给本对象；本对象再经 window.ccminiNativeSdk.postMessage(jsonStr) 同步桥接到 native SDK。
 *
 * 实现严格对齐 SDK 参考实现（native-sdk-h5-integration.md §第三步 createNativeSdkBackend），
 * 以便与 native 端 bridge 联调时行为可预期、差异最小。
 */
import { AudioSdkConf } from "lib/audioSdk/conf/AudioSdkConf";
import { AudioSdkDefine } from "lib/audioSdk/define/AudioSdkDefine";
import { AudioSdkUtil } from "lib/audioSdk/util/AudioSdkUtil";

/** native shell 注入到 WebView 上的同步桥对象签名 */
interface CcminiNativeSdkBridge {
    /** 同步请求 → 同步返回 JSON 字符串 */
    postMessage(jsonStr: string): string;
}

/** native shell 返回的响应结构 */
interface BridgeResponse {
    /** StartCCMini/ControlMini/CloseCCMini：0 成功、负数错误码；GetJsonData：>0 长度、0 无事件、-1 未启动/失败 */
    ret: number;
    /** 仅 GetJsonData 在 ret>0 时有内容，对应一条事件 JSON 字符串 */
    json?: string;
    /** 业务上下文回传 */
    context?: number;
    /** 出错描述，仅用于日志 */
    error?: string;
}

/**
 * 解析 native shell 返回值，兼容字符串 / 对象 / 非法三种情况
 * 严格对齐参考实现 _readBridgeResponse
 */
function readBridgeResponse(raw: unknown): BridgeResponse {
    if (typeof raw === "string") {
        if (!raw) {
            return { ret: -1, json: "", context: 0, error: "empty bridge response" };
        }
        try {
            return JSON.parse(raw) as BridgeResponse;
        } catch (err) {
            return { ret: -1, json: "", context: 0, error: "parse bridge response failed" };
        }
    }
    if (raw && typeof raw === "object") {
        return raw as BridgeResponse;
    }
    return { ret: -1, json: "", context: 0, error: "invalid bridge response" };
}

/**
 * 经 window.ccminiNativeSdk.postMessage 发送一次同步请求
 * 桥不可用 / 异常时返回降级响应，绝不抛出（保证 facade 调用链不中断）
 * @param action StartCCMini | ControlMini | GetJsonData | CloseCCMini
 * @param payload 附加字段（type / params / context 等）
 */
function sendNativeRequest(action: string, payload?: Record<string, unknown>): BridgeResponse {
    const bridge = (window as any)["ccminiNativeSdk"] as CcminiNativeSdkBridge | undefined;
    if (!bridge || typeof bridge.postMessage !== "function") {
        return { ret: -1, json: "", context: 0, error: "ccminiNativeSdk bridge unavailable" };
    }
    try {
        const req = Object.assign({ action }, payload || {});
        return readBridgeResponse(bridge.postMessage(JSON.stringify(req)));
    } catch (err) {
        const msg = err && (err as Error).message ? (err as Error).message : String(err);
        return { ret: -1, json: "", context: 0, error: msg };
    }
}

/**
 * 创建 native-sdk backend 适配对象
 * 4 个方法均同步返回，错误码语义与 native SDK C 接口保持一致
 */
export function createNativeBackend(): AudioSdkDefine.NativeBackend {
    return {
        StartCCMini(): number {
            const resp = sendNativeRequest("StartCCMini");
            if (resp.error) {
                AudioSdkUtil.warn("nativeBackend StartCCMini:", resp.ret, resp.error);
            }
            return typeof resp.ret === "number" ? resp.ret : -1;
        },

        ControlMini(method: string, params: Record<string, unknown>, context?: number): number | Map<number, number> {
            // bridge 协议字段名锁定为 type（非 command），对齐 CHANGELOG 修订
            const resp = sendNativeRequest("ControlMini", {
                type: method,
                params: params || {},
                context: Number.isFinite(context) ? context : 0,
            });
            // get-speaking-list 的说话人数在 resp.ret，具体 eid/energy 列表在 resp.json 里，
            // 必须解析 resp.json 构造 Map<eid, energy>；其余方法只返回数值错误码。
            if (method === AudioSdkConf.SDK_METHOD.GET_SPEAKING_LIST) {
                if (resp.ret >= 0 && resp.json) {
                    try {
                        const data = JSON.parse(resp.json);
                        const map = new Map<number, number>();
                        if (Array.isArray(data.list)) {
                            data.list.forEach((eid: unknown, i: number) => {
                                map.set(Number(eid), data.energy ? Number(data.energy[i]) || 0 : 0);
                            });
                        }
                        return map;
                    } catch (err) {
                        AudioSdkUtil.warn("nativeBackend get-speaking-list parse failed:", resp.json, err);
                    }
                }
                return new Map<number, number>();
            }
            return typeof resp.ret === "number" ? resp.ret : -1;
        },

        ControlMiniFull(method: string, params: Record<string, unknown>, context?: number): AudioSdkDefine.ControlMiniFullResult {
            // 内部仍发 action='ControlMini'（对齐 SDK 文档），但返回完整同步响应而非仅 ret
            const resp = sendNativeRequest("ControlMini", {
                type: method,
                params: params || {},
                context: Number.isFinite(context) ? context : 0,
            });
            return {
                ret: typeof resp.ret === "number" ? resp.ret : -1,
                json: resp.json || "",
                context: resp.context || 0,
                error: resp.error || "",
            };
        },

        GetJsonData(out: AudioSdkDefine.GetJsonDataOut): number {
            const resp = sendNativeRequest("GetJsonData");
            if (out && typeof out === "object") {
                out.json = resp.json || "";
                out.context = resp.context || 0;
                out.error = resp.error || "";
            }
            return typeof resp.ret === "number" ? resp.ret : -1;
        },

        CloseCCMini(): number {
            const resp = sendNativeRequest("CloseCCMini");
            return typeof resp.ret === "number" ? resp.ret : -1;
        },
    };
}
