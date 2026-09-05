

export class GSceneTeamEvent extends egret.Event {

    /**队伍创建 */
    public static readonly TEAM_CREATE: string = "TEAM_CREATE";
    /**队伍解散 */
    public static readonly TEAM_DISMISS: string = "TEAM_DISMISS";

    /**队伍成员入队 */
    public static readonly TEAM_JOIN_MEMBER: string = "TEAM_JOIN_MEMBER";
    /**队伍成员离队 */
    public static readonly TEAM_LEAVE_MEMBER: string = "TEAM_LEAVE_MEMBER";

    /**队伍更新 */
    public static readonly TEAM_ID_UPDATE: string = "TEAM_ID_UPDATE";
    /**队长更新 */
    public static readonly TEAM_LEADER_CHANGE: string = "TEAM_LEADER_CHANGE";

    public constructor(type: string, data?: any) {
        super(type, false, false, data);
    }
}

export class GSceneTeamEventBus extends SingletonClassEx {
    // destroy(): void {}
}