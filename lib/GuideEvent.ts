
export class GuideEvent extends egret.Event{

    public static readonly CONDITION_FINISH = "ConditionFinish";
    public static readonly PLAY_NEXT: string = "PlayNext";

    public constructor(type: string, data?: any) {
        super(type, false, false, data);
    }
}

export class GuideEventBus extends SingletonClassEx {
}