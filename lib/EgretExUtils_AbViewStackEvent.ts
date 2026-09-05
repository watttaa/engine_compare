
export class AbViewStackEvent extends egret.Event {
    // event data = idx:number
    public static readonly GROUP_CHANGE: string = "GroupChange";
    // public static readonly GROUP_CHANGE_FROM_KEY: string = "GroupChangeFromKey";

    public constructor(type: string, data?: any) {
        super(type, false, false, data);
    }
}
