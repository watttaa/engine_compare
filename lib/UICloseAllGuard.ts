/**
 * UICloseAllGuard — UIPanel 全关时的"界面豁免"注册表
 *
 * 用途：
 *   某些功能界面（如翻牌小游戏）在触发 UIManager.closeAll(UIPanel) 时不应被关闭。
 *   各模块自行注册一个"是否需要保护"的回调，调用方在执行 closeAll 前统一
 *   查询所有回调，将需要保留的界面实例加入 exclude 列表。
 *
 * 当前接入点：
 *   - TurnBasedWarManager.tryBuildMainWar（进入战斗时）
 *   - NpcDialogSNet.S_NPC_CHAT_INFO（NPC 对话触发时）
 *
 * 接入方式（业务 UI 侧）：
 *   1. 在 UI 的 init() 中调用 UICloseAllGuard.register()，传入 uiName 和判断回调
 *   2. 在 UI 的 dispose() 中调用 UICloseAllGuard.unregister()，防止实例销毁后残留
 *
 * 示例：
 * ```typescript
 * // init()
 * UICloseAllGuard.register("DHXYFlipCardMainUI", () => this.isPlaying);
 * // dispose()
 * UICloseAllGuard.unregister("DHXYFlipCardMainUI");
 * ```
 */
export class UICloseAllGuard {

    // key: uiName；value: 是否需要豁免的回调
    private static $map: Map<string, () => boolean> = new Map();

    /**
     * 注册一个"closeAll 时是否豁免该 UI"的判断回调。
     * 同一 uiName 重复注册时，新回调覆盖旧回调。
     * @param uiName        UIManager.getInstByName 使用的界面名称字符串
     * @param shouldGuard   返回 true 则该界面在 closeAll 时被排除，不被关闭
     */
    public static register(uiName: string, shouldGuard: () => boolean): void {
        UICloseAllGuard.$map.set(uiName, shouldGuard);
    }

    /**
     * 注销指定 uiName 的豁免回调（UI 销毁时调用）。
     */
    public static unregister(uiName: string): void {
        UICloseAllGuard.$map.delete(uiName);
    }

    /**
     * 查询当前所有已注册条目，返回需要在 closeAll 时排除的界面实例列表。
     * 调用方将此列表传入 UIManager.closeAll 的 exclude_lst 参数。
     * @param baseExclude 调用方已有的排除列表（会合并追加），默认为空数组
     */
    public static getExcludeList(baseExclude: egret.DisplayObject[] = []): egret.DisplayObject[] {
        UICloseAllGuard.$map.forEach((shouldGuard, uiName) => {
            // 先判断回调，只有需要豁免时才查实例（避免无效 getInstByName 开销）
            if (shouldGuard()) {
                let inst = UIManager.getInstByName(uiName) as egret.DisplayObject;
                if (inst) {
                    baseExclude.push(inst);
                }
            }
        });
        return baseExclude;
    }
}
