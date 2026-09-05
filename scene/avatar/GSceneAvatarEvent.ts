

export class GSceneAvatarEvent extends egret.Event {
    // 主角
    public static readonly HERO_COMPLETE: string = "HeroComplete";

    public static readonly HERO_VEHICLE_COMPLETED: string = "HeroVehicleCompleted"; // 主角座驾加载完毕

    public static readonly HERO_RANDOM_WALK_STATE_CHANGE: string = "HERO_RANDOM_WALK_STATE_CHANGE";

    // public static readonly HERO_FOLLOW_STATE_CHANGE: string = "HERO_FOLLOW_STATE_CHANGE";

    public static readonly HERO_MOVE_TO_DEST: string = "HERO_MOVE_TO_DEST";
    public static readonly HERO_MOVE_TO_DEST_COMPLETE: string = "HERO_MOVE_TO_DEST_COMPLETE";

    public static readonly HERO_TOUCH_TAP_MAP: string = "HERO_TOUCH_TAP_MAP";

    public static readonly HERO_UPDATE_PATH: string = "HERO_UPDATE_PATH";

    public static readonly HERO_FLY_STATE_CHANGE: string = "HERO_FLY_STATE_CHANGE";

    public static readonly HERO_RELOAD_PATHING: string = "HERO_RELOAD_PATHING";

    public constructor(type: string, data?: any) {
        super(type, false, false, data);
    }
}

export class GSceneAvatarEventBus extends SingletonClassEx {
    // destroy(): void {}
}