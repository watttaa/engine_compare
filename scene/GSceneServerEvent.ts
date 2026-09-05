
export class GSceneServerEvent extends egret.Event {

    public static readonly SERVER_ZONE_CREATE: string = "SERVER_ZONE_CREATE";

    public static readonly SERVER_SOUL_CREATE: string = "SERVER_SOUL_CREATE";
    public static readonly SERVER_SOUL_DESTORY: string = "SERVER_SOUL_DESTORY";

    public static readonly SERVER_PUPPET_CREATE: string = "SERVER_PUPPET_CREATE";
    public static readonly SERVER_PUPPET_DESTORY: string = "SERVER_PUPPET_DESTORY";
    public static readonly SERVER_PUPPET_PROP_CHANGE: string = "SERVER_PUPPET_PROP_CHANGE";

    public static readonly SERVER_NPC_CREATE: string = "SERVER_NPC_CREATE";
    public static readonly SERVER_NPC_DESTORY: string = "SERVER_NPC_DESTORY";
    public static readonly SERVER_NPC_PROP_CHANGE: string = "SERVER_NPC_PROP_CHANGE";

    /**私有player创建 */
    public static readonly SERVER_PRIVATE_PLAYER_CREATE: string = "SERVER_PRIVATE_PLAYER_CREATE";
    /**私有player销毁 */
    public static readonly SERVER_PRIVATE_PLAYER_DESTORY: string = "SERVER_PRIVATE_PLAYER_DESTORY";

    /**私有npc创建 */
    public static readonly SERVER_PRIVATE_NPC_CREATE: string = "SERVER_PRIVATE_NPC_CREATE";
    /**私有npc销毁 */
    public static readonly SERVER_PRIVATE_NPC_DESTORY: string = "SERVER_PRIVATE_NPC_DESTORY";
    /***瞬移 */
    public static readonly SERVER_FORCE_UPDATE_POS: string = "SERVER_FORCE_UPDATE_POS";


    public constructor(type: string, data?: any) {
        super(type, false, false, data);
    }
}

export class GSceneServerEventBus extends SingletonClassEx {
    destroy(): void {}
}