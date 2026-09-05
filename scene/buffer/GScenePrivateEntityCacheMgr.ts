import { serverentity_define } from "clientsdk/serverentity_define";

/**
 * 私有entity缓存管理器
 */
export class GScenePrivateEntityCacheMgr extends SingletonClassEx {
    private m_dicNpc: { [uid: string]: serverentity_define.IServerNpcProps } = {};
    public addNpc(uid: string, data: serverentity_define.IServerNpcProps) {
        this.m_dicNpc[uid] = data;
    }
    public removeNpc(uid: string) {
        if (this.m_dicNpc[uid]) {
            delete this.m_dicNpc[uid];
        }
    }
    public getNpc(uid: string) {
        if (this.m_dicNpc[uid]) {
            return this.m_dicNpc[uid];
        }
        return null;
    }
    public get dictNpc() {
        return this.m_dicNpc;
    }
    public get arrNpc() {
        return Object.values(this.m_dicNpc);
    }

    // =======================
    private m_dictPlayer: { [uid: string]: serverentity_define.IServerPlayerProps } = {};
    public addPlayer(uid: string, data: serverentity_define.IServerPlayerProps) {
        this.m_dictPlayer[uid] = data;
    }
    public removePlayer(uid: string) {
        if (this.m_dictPlayer[uid]) {
            delete this.m_dictPlayer[uid];
        }
    }
    public getPlayer(uid: string) {
        if (this.m_dictPlayer[uid]) {
            return this.m_dictPlayer[uid];
        }
        return null;
    }
    public get dictPlayer() {
        return this.m_dictPlayer;
    }

    // =======================
    public clearCache() {
        this.m_dicNpc = {};
        this.m_dictPlayer = {};
    }

    destroy(): void {
        this.clearCache();
    }
}