import { client_repo_ex_ } from "clientsdk/ClientRepoEx";
import { serverentity_define } from "clientsdk/serverentity_define";
import { ds } from "common/ds";
import { kit } from "common/kit";
import { CallManyTimes } from "lib/Timer_CallManyTimes";
import { SceneEvent, SceneEventBus } from "lib/scene/SceneEvent";
import { SceneModel } from "lib/scene/SceneModel";
import { SceneStatus } from "lib/scene/SceneStatus";
import { scene_log } from "lib/scene/scene_log";
import { scene_priority_define } from "world/scene/buffer/scene_priority_define";
import { GSceneValue } from "world/scene/GSceneValue";
import { ISceneSubMgr } from "world/ISceneSubMgr";
import { World } from "world/World";
import { GScenePrivateEntityCacheMgr } from "world/scene/buffer/GScenePrivateEntityCacheMgr";
import { scene_define } from "world/scene/scenedefine";


/**函数buffer：解决由于客户端相关逻辑未初始完，服务器协议就来了，导致一些函数需要延迟执行 */
export interface SFuncBufferData {
    sceneId?: number;
    handler: kit.Handler;
}

export enum SFuncBufferType {
    MAP_CHANGE = 1,

}


export type SCreateAvatarBufferData = {
    uuid: string;
    type: scene_define.SAvatarType;
    data: serverentity_define.IServerEntityProps;
}

export class GSceneBufferMgr extends egret.HashObject implements ISceneSubMgr {

    private ctx: World;

    private m_bReady: boolean;

    constructor(ctx: World) {
        super();

        this.ctx = ctx;

        this.bReady = false;

        this.onInit();
    }

    clear(): void {
    }
    dispose() {
        this.clearCreateEntityBuffer(true);

        for (let _buff in this.m_dictFuncBuffer) {
            let arr: SFuncBufferData[] = this.m_dictFuncBuffer[_buff];
            for (let _buff of arr) {
                _buff.handler.recover();
                _buff.handler = null;
            }
        }
        this.m_dictFuncBuffer = {};

        this.ctx = null;
    }

    private clearCreateEntityBuffer(dispose: boolean = false) {
        this.orderMap.clear();

        this.stopTimer(dispose);
    }

    private onInit() {
        SceneEventBus.getInstance().addEventListener(SceneEvent.SCENE_VIEW_ENTER_COMPLETE, this.onSceneViewEnterComplete, this);

        SceneEventBus.getInstance().addEventListener(SceneEvent.SCENE_CHANGE_START, this.onSceneChangeStart, this);
        SceneEventBus.getInstance().addEventListener(SceneEvent.SCENE_CHANGE_END, this.onSceneChangeEnd, this);
    }

    private onSceneChangeStart() {
        this.reset();
    }
    private onSceneChangeEnd() {
        this.startTimer();
    }

    private m_objCreateAvatarTimer: CallManyTimes;
    private startTimer() {
        if (!this.m_objCreateAvatarTimer) {
            this.m_objCreateAvatarTimer = new CallManyTimes(Number.MAX_VALUE, 200, this.doCreateAvatarBuffer, undefined, this);
        }

        let _sceneStatus = SceneModel.getInstance().sceneStatusProxy.status;
        if (_sceneStatus == SceneStatus.PlotScene) {
            this.m_objCreateAvatarTimer.delay = 10;
        } else {
            this.m_objCreateAvatarTimer.delay = 200;
        }

        this.m_objCreateAvatarTimer.restart();
    }
    private stopTimer(dispose: boolean = false) {
        if (this.m_objCreateAvatarTimer) {
            this.m_objCreateAvatarTimer.stop();
        }
        if (dispose) {
            this.m_objCreateAvatarTimer = null;
        }
    }

    private onSceneViewEnterComplete() {
        this.bReady = true;

        this.tryCreateHeroLeader();

        kit.timer.callLater(this, this.onDelayRun, [SFuncBufferType.MAP_CHANGE]);
    }

    private onDelayRun(bufferType: SFuncBufferType) {
        this.runBuffer(bufferType);
    }

    /**函数缓存字典 */
    private m_dictFuncBuffer: { [key in SFuncBufferType]?: SFuncBufferData[] } = {};
    public pushFuncBuffer(bufferType: SFuncBufferType, bufferData: SFuncBufferData) {
        let arr = this.m_dictFuncBuffer[bufferType];
        if (!arr) {
            arr = [];
            this.m_dictFuncBuffer[bufferType] = arr;
        }
        arr.push(bufferData);

        // this.runBuffer(bufferType); // mike test
    }

    private runBuffer(_bufferType: SFuncBufferType) {
        let curSceneID = SceneModel.getInstance().sceneId;

        let arr = this.m_dictFuncBuffer[_bufferType] || [];
        for (let _buff of arr) {
            if (_buff.sceneId && _buff.sceneId != curSceneID) {
                continue; // 不属于当前场景
            } else {
                _buff.handler.run();
            }

            _buff.handler.recover();
            _buff.handler = null;
        }

        delete this.m_dictFuncBuffer[_bufferType]; // 清空
    }

    private reset() {
        this.bReady = false;
        this.$idleMissCount = 0;

        this.clearCreateEntityBuffer();
    }

    private set bReady(val: boolean) {
        this.m_bReady = val;
    }
    private get bReady() {
        return this.m_bReady;
    }

    // ========================
    // creat entity buffer
    // ========================
    private orderMap = new ds.OrderMap<string, SCreateAvatarBufferData>(
        (v) => v.uuid,
        (a, b) => a.data.createPriority - b.data.createPriority,
    );

    private getIsHeroLeader(data: SCreateAvatarBufferData) {
        let hero = this.ctx.getHero();
        if (!hero || !hero.isFollower) {
            return false;
        }

        if (data.type != scene_define.SAvatarType.OTHER_ROLE) {
            return false;
        }

        let playerProps = data.data as serverentity_define.IServerPlayerProps;
        if (hero.leaderId != playerProps.leaderId) {
            return false;
        }

        return true;
    }

    private tryCreateHeroLeader(assignBuffer?: SCreateAvatarBufferData) {
        // mike todo: client_repo_ex_.ClientPuppets_是用ClientPuppet.uuid作为key，而leaderId使用的是ClientPuppet.uid。服务器能否加个leaderUuid字段？
        let suc = false;
        if (assignBuffer) {
            if (this.getIsHeroLeader(assignBuffer)) {
                suc = this.onCreateAvatar(assignBuffer.uuid);
            }
        } else {
            for (const item of this.orderMap) {
                if (this.getIsHeroLeader(item)) {
                    suc = this.onCreateAvatar(item.uuid);
                    break;
                }
            }
        }

        return suc;
    }

    private $idleMissCount = 0;

    private doCreateAvatarBuffer() {
        if (!scene_priority_define.screenGateEnabled) {
            this.doCreateAvatarBufferLegacy();
            return;
        }

        // ─── 不变量：循环外一次性计算 createZone rect ───
        let soul = client_repo_ex_.OwnSoul_;
        if (!soul) {
            return;
        }

        let scale = GSceneValue.cameraScale;
        let halfW = (UIManager.stage.stageWidth / scale) * scene_priority_define.CREATE_ZONE_SCALE * 0.5;
        let halfH = (UIManager.stage.stageHeight / scale) * scene_priority_define.CREATE_ZONE_SCALE * 0.5;
        let soulX = soul.posX;
        let soulY = soul.posY;
        let zoneLeft = soulX - halfW;
        let zoneRight = soulX + halfW;
        let zoneTop = soulY - halfH;
        let zoneBottom = soulY + halfH;
        let needFallback = scene_priority_define.idleFallbackThreshold > 0;

        let chunkLen = 1;
        let runCnt = 0;
        let fallback: SCreateAvatarBufferData = null;
        let fallbackDist = Infinity;

        let entries = this.orderMap.entries;
        for (let i = 0, len = entries.length; i < len; i++) {
            let item = entries[i];

            if (!item) {
                continue;
            }

            if (runCnt >= chunkLen) {
                break;
            }

            // Tier 非公用层：无条件创建
            let tier = Math.floor(item.data.createPriority / scene_priority_define.TIER_STEP);
            if (!this.isScreenGatedTier(tier)) {
                if (this.onCreateAvatar(item.uuid)) {
                    runCnt++;
                    i--;
                    len--;
                }
                continue;
            }

            // Tier 5/6 取最新坐标做门控
            let latestData = this.getLatestEntityData(item);
            if (!latestData) {
                continue;
            }

            // 屏幕内：rect 判定（类似 AreaMgr）
            let ex = latestData.posX;
            let ey = latestData.posY;
            if (ex >= zoneLeft && ex <= zoneRight && ey >= zoneTop && ey <= zoneBottom) {
                if (this.onCreateAvatar(item.uuid)) {
                    runCnt++;
                    i--;
                    len--;
                }
                continue;
            }

            // 屏幕外：仅在需要兜底时跟踪最近 entity
            if (needFallback) {
                let dist = Math.abs(ex - soulX) + Math.abs(ey - soulY);
                if (dist < fallbackDist) {
                    fallbackDist = dist;
                    fallback = item;
                }
            }
        }

        // idle 兜底（threshold=0 时永不兜底）
        if (needFallback && runCnt == 0 && fallback) {
            this.$idleMissCount++;
            if (this.$idleMissCount >= scene_priority_define.idleFallbackThreshold) {
                this.onCreateAvatar(fallback.uuid);
                this.$idleMissCount = 0;
            }
        } else {
            this.$idleMissCount = 0;
        }
    }

    private doCreateAvatarBufferLegacy() {
        let chunkLen = 1; // 每次处理的个数

        let runCnt = 0;

        for (const item of this.orderMap) {
            if (runCnt >= chunkLen) {
                break;
            }

            if (!this.onCreateAvatar(item.uuid)) {
                continue;
            }

            runCnt++;
        }
    }

    /** 判断 tier 是否为屏幕门控管辖的公用层（需要位置判定） */
    private isScreenGatedTier(tier: number): boolean {
        return tier === scene_priority_define.TierIndex.PUBLIC_NPC || tier === scene_priority_define.TierIndex.PUBLIC_PUPPET;
    }

    /**获得最新eneity的数据 */
    private getLatestEntityData(item: SCreateAvatarBufferData): { posX: number; posY: number } {
        if (item.type == scene_define.SAvatarType.OTHER_ROLE) {
            if ((item.data as serverentity_define.IServerPlayerProps).is_private) {
                return GScenePrivateEntityCacheMgr.getInstance().getPlayer(item.uuid) || null;
            }
            return client_repo_ex_.ClientPuppets_[item.uuid] || null;
        } else if (item.type == scene_define.SAvatarType.NPC) {
            if ((item.data as serverentity_define.IServerNpcProps).is_private) {
                return GScenePrivateEntityCacheMgr.getInstance().getNpc(item.uuid) || null;
            }
            return client_repo_ex_.ClientNpcs_[item.uuid] || null;
        }

        return null;
    }

    private onCreateAvatar(uuid: string): boolean {
        let _createBuffer = this.orderMap.get(uuid);
        if (!_createBuffer) {
            return false;
        }
        this.orderMap.delete(uuid);

        let _data = _createBuffer.data;
        if (_data.space_no != SceneModel.getInstance().sceneId) {
            return false;
        }



        if (_createBuffer.type == scene_define.SAvatarType.OTHER_ROLE) {
            let _data2 = _data as serverentity_define.IServerPlayerProps;
            if (_data2.is_private) {
                let privatePlayer = GScenePrivateEntityCacheMgr.getInstance().getPlayer(uuid);
                if (!privatePlayer) {
                    return false;
                }
                this.ctx.addPlayer(uuid, _data2);
            } else { // 去拿取最新数据
                let puppet = client_repo_ex_.ClientPuppets_[uuid];
                if (!puppet) {
                    return false;
                }
                this.ctx.addPlayer(uuid, puppet);
            }
        } else if (_createBuffer.type == scene_define.SAvatarType.NPC) {
            let _data2 = _data as serverentity_define.IServerNpcProps;
            if (_data2.is_private) {
                let privateNpc = GScenePrivateEntityCacheMgr.getInstance().getNpc(uuid);
                if (!privateNpc) {
                    return false;
                }
                this.ctx.addNpc(uuid, _data2);
            } else { // 去拿取最新数据
                let npc = client_repo_ex_.ClientNpcs_[uuid];
                if (!npc) {
                    return false;
                }
                this.ctx.addNpc(uuid, npc);
            }
        } else {
            Logger.error(`unknow avatar type: ${_createBuffer.type}`);
            return false;
        }

        if (DEV) {
            let tierIndex = Math.floor(_data.createPriority / scene_priority_define.TIER_STEP);
            scene_log.log(`[GSceneBufferMgr] onCreateAvatar finish: type = ${scene_define.SAvatarType[_createBuffer.type]} name = ${_data.entityName || "unname"} createPriority = ${_data.createPriority} tier = ${tierIndex}`);
        }

        return true;
    }

    public addCreateEntityBuffer(data: SCreateAvatarBufferData) {
        this.orderMap.add(data);

        if (this.bReady) {
            // 创建主角队长
            this.tryCreateHeroLeader(data);
        }
    }
    public removeCreateEntityBuffer(uuid: string) {
        if (this.orderMap.has(uuid)) {
            this.orderMap.delete(uuid);
        }
    }
}