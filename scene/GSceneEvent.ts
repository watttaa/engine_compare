
export class GSceneEvent extends egret.Event {

    /**场景纯享模式变更 */
    public static readonly SCENE_IMMERSIVE_CHANGE: string = "SCENE_IMMERSIVE_CHANGE";


    public constructor(type: string, data?: any) {
        super(type, false, false, data);
    }
}

export class GSceneEventBus extends SingletonClassEx {
    // destroy(): void {}
}