import { SceneStatus } from "./SceneStatus";

export class SceneEvent extends egret.Event {
    public static readonly ENTER_SCENE: string = "EnterScene";
    public static readonly LEAVE_SCENE: string = "LeaveScene";
    public static readonly BLOCK_COMPLETE: string = "BLOCK_COMPLETE";
    public static readonly MASK_COMPLETE: string = "MASK_COMPLETE";

    public static readonly SCENE_CHANGE_START: string = "SCENE_CHANGE_START";
    public static readonly SCENE_CHANGE_END: string = "SCENE_CHANGE_END";

    public static readonly SCENE_VIEW_ENTER_COMPLETE: string = "SCENE_VIEW_ENTER_COMPLETE";

    public static readonly SCENE_VIEW_UPDATE_JOYSTICK: string = "SCENE_VIEW_UPDATE_JOYSTICK";

    public static readonly SCENE_CLICKED_AVATAR: string = "SCENE_CLICKED_AVATAR";

    public constructor(type: string, data?: any) {
        super(type, false, false, data);
    }
}

export class SceneStatusEvent extends egret.Event {
    public static readonly STATUS_SET: string = "STATUS_SET";
    public static readonly STATUSCHANGE: string = "StatusChange";
    public static readonly STATUS_EXIT: string = "STATUS_EXIT";

    public constructor(type: string, data?: any) {
        super(type, false, false, data);
    }
}

export class SceneEventBus extends SingletonClassEx {
    public dispatchStatusSetEvent(status: SceneStatus): void {
        this.dispatchEvent(new SceneStatusEvent(SceneStatusEvent.STATUS_SET, status));
    }

    public dispatchStatusExitEvent(status: SceneStatus): void {
        this.dispatchEvent(new SceneStatusEvent(SceneStatusEvent.STATUS_EXIT, status));
    }
}