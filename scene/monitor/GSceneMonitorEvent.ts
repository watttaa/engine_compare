
export class GSceneMonitorEvent extends egret.Event {

    /**avatars显示更新 */
    public static readonly SCENE_AVATARS_VISIBLE_UPDATE = "SCENE_OTHER_PLAYERS_VISIBLE_UPDATE";
    /**avatars身形显示更新 */
    public static readonly SCENE_AVATARS_FIGURE_VISIBLE_UPDATE = "SCENE_AVATARS_FIGURE_VISIBLE_UPDATE";

    public constructor(type: string, data?: any) {
        super(type, false, false, data);
    }
}


export class GSceneMonitorEventBus extends SingletonClassEx {
    // destroy(): void {}
}