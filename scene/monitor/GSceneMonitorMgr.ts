import { s2_global_value_cfg } from "auto/global_value";
import { Avatar } from "avatar/Avatar";
import { DisplayComponent } from "avatar/comp/BaseComponent";
import { client_repo_ex_ } from "clientsdk/ClientRepoEx";
import { CallManyTimes } from "lib/Timer_CallManyTimes";
import { SceneModel } from "lib/scene/SceneModel";
import { searchParams_utils } from "login/SearchParamsUtils";
import { MiscCNet } from "net/MiscCNet";
import { ISceneSubMgr } from "world/ISceneSubMgr";
import { World } from "world/World";
import { GSceneEvent, GSceneEventBus } from "world/scene/GSceneEvent";
import { GSceneMonitorEvent, GSceneMonitorEventBus } from "world/scene/monitor/GSceneMonitorEvent";
import { scenemonitor_define } from "world/scene/monitor/scenemonitordefine";
import { CSceneMonitorUI } from "world/scene/monitor/ui/CSceneMonitorUI";
import { scene_define } from "world/scene/scenedefine";
import { sceneview_utils } from "world/scene/sceneview/sceneview_utils";

export class GSceneMonitorMgr extends egret.HashObject implements ISceneSubMgr {
    private ctx: World;

    private m_objTimer: CallManyTimes;

    constructor(ctx: World) {
        super();

        this.ctx = ctx;

        G123.set("sceneMonitor", this);

        this.initAvatarFigureVisible();

        DisplayComponent.regVisibleBindFunc(this, this.getSceneAvatarFigureVisibleValue);
    }

    public enter() {
        this.start();
    }

    clear(): void {
    }
    public dispose() {
        this.stop();
        this.ctx = null;

        G123.clear("sceneMonitor");
        DisplayComponent.unregVisibleBindFunc();
    }

    private start() {
        PerformanceMgr.getInstance().addEventListener(PerformanceEvent.LEVEL_CHANGED, this.onPerformanceLevelChange, this);
        this.onPerformanceLevelChange();

        LoginEventBus.getInstance().addEventListener(LoginEvent.LOCAL_SETTING_CHANGED, this.onLocalSettingChanged, this);

        GSceneEventBus.getInstance().addEventListener(GSceneEvent.SCENE_IMMERSIVE_CHANGE, this.onSceneImmersiveChange, this);

        this.updateMaxRenderNodeCount();

        if (DEV || searchParams_utils.isPerformDebug()) {
            this.openMonitor();
        }

        // 开始监控性能 -> 然后事件派发出去
        if (!this.m_objTimer) {
            this.m_objTimer = new CallManyTimes(Number.MAX_VALUE, 1000, this.onTickFunc, [], this);
            this.m_objTimer.restart();
        }
    }

    private stop() {
        PerformanceMgr.getInstance().removeEventListener(PerformanceEvent.LEVEL_CHANGED, this.onPerformanceLevelChange, this);

        LoginEventBus.getInstance().removeEventListener(LoginEvent.LOCAL_SETTING_CHANGED, this.onLocalSettingChanged, this);

        GSceneEventBus.getInstance().removeEventListener(GSceneEvent.SCENE_IMMERSIVE_CHANGE, this.onSceneImmersiveChange, this);

        // 停止监控性能
        if (this.m_objTimer) {
            this.m_objTimer.stop();
        }
        this.m_objTimer = null;
    }


    private m_bIsOpenMonitor: boolean = false;
    private openMonitor() {
        this.m_bIsOpenMonitor = true;

        O3(CSceneMonitorUI, (inst: CSceneMonitorUI) => {
            inst.setData();
        })
    }
    private closeMonitor() {
        this.m_bIsOpenMonitor = false;

        UIManager.close(CSceneMonitorUI);
    }


    // ===============================
    private onSceneImmersiveChange(evt: GSceneEvent) {
        let data = evt.data as scenemonitor_define.TSceneAvatarFigureVisibleSet;

        this.setSceneAvatarsFigureVisible(data);
    }

    private onPerformanceLevelChange() {
        // PerformanceMgr.getInstance().deviceLevel;

        let aoi_level = PerformanceMgr.getInstance().aoiLevel;
        if (Launch.state == 's2') {
            MiscCNet.C_SYNC_AOI_LEVEL(aoi_level);
        } else {
            const levelError = new Error("aoi_level_error");
            uploadDump_("", levelError.stack, "aoi_level_error", "SCRIPT_ERROR");
            Logger.error("aoi_level_error", levelError.stack);
        }
        this.updateMaxRenderNodeCount();
    }

    /** 玩家手动修改 AOI 设置时实时发包，统一在此处理 */
    private onLocalSettingChanged(e: LoginEvent) {
        const key = e.data[0] as LocalSetting.LocalDataEnum;
        if (key === LocalSetting.LocalDataEnum.PERF_AOI_LEVEL) {
            this.onPerformanceLevelChange();
        }
    }

    /**更新最大渲染Node个数 */
    private updateMaxRenderNodeCount() {
        this.maxRenderNodeCount = this.defaultRenderNodeCountValue;
    }

    /**是否启用客户端渲染数量限制（已经接入服务器aoi_level，默认关闭） */
    private m_bClientRenderCntLimit: boolean = false;
    public get clientRenderCntLimit() {
        return this.m_bClientRenderCntLimit;
    }
    public set clientRenderCntLimit(value: boolean) {
        this.m_bClientRenderCntLimit = value;
    }

    private get minRenderNodeCountValue() {
        return s2_global_value_cfg.GlobalValueInfo.SCENE_NODE_RENDER_CNT_LIMIT[0];
    }
    private get maxRenderNodeCountValue() {
        return s2_global_value_cfg.GlobalValueInfo.SCENE_NODE_RENDER_CNT_LIMIT[1];
    }
    private get defaultRenderNodeCountValue() {
        let isHighLevel = PerformanceMgr.getInstance().isHighLevel;

        if (isHighLevel) {
            return this.maxRenderNodeCountValue;
        }

        return this.minRenderNodeCountValue;
    }

    /**场景最大渲染Node个数 */
    private m_nMaxRenderNodeCount: number;
    public get maxRenderNodeCount() {
        return this.m_nMaxRenderNodeCount || this.defaultRenderNodeCountValue;
    }
    public set maxRenderNodeCount(value: number) {
        value = value || this.defaultRenderNodeCountValue;
        this.m_nMaxRenderNodeCount = value;
    }

    private onTickFunc() {
        if (sceneview_utils.getSceneViewEnterStatus() != "end") {
            return;
        }

        let areaMgr = this.ctx.areaMgr;
        if (!areaMgr) {
            return;
        }

        if (this.clientRenderCntLimit) {
            this.shownCount = areaMgr.updateShowArea(this.maxRenderNodeCount) || 0;
        } else {
            // 完全服务器控制
            this.shownCount = undefined;

            if (this.m_bIsOpenMonitor) {
                // 显示下当前渲染数量
                this.shownCount = areaMgr.updateShowArea(100);
            }
        }
    }

    // ==== 事件分发统一由这里分发 ====
    // 默认情况下，主角都不受到控制
    /**avatar显示设置值 */
    private sceneAvatarsVisibleValue: scenemonitor_define.TSceneAvatarVisibleSetValue = {};
    public getSceneAvatarsVisibleValue(avatarType: scene_define.SAvatarType) {
        return this.sceneAvatarsVisibleValue[avatarType] || true;
    }

    private initAvatarFigureVisible() {
        // scene_define.SAvatarType.OTHER_ROLE
        let otherFigureInfo = {};
        this.sceneAvatarsFigureVisibleValue[scene_define.SAvatarType.OTHER_ROLE] = otherFigureInfo;

        let allFigureTypes = scenemonitor_define.SceneAvatarFigureTypeDefines;
        for (let key in allFigureTypes) {
            let figureType = allFigureTypes[key];
            otherFigureInfo[figureType] = true;
        }
    }

    /**avatar身形显示设置值 */
    private sceneAvatarsFigureVisibleValue: scenemonitor_define.TSceneAvatarFigureVisibleSetValue = {};
    public getSceneAvatarTypeFigureInfo(avatarType: scene_define.SAvatarType) {
        return this.sceneAvatarsFigureVisibleValue[avatarType] || {};
    }
    public getSceneAvatarFigureVisibleValue(avatar: Avatar, displayComp: DisplayComponent) {
        if (!avatar.getIfCheckFigureVisible()) {
            return true;
        }

        if (avatar.avatarType) {
            let avatarType: scene_define.SAvatarType = avatar.avatarType;

            let figureInfo = this.getSceneAvatarTypeFigureInfo(avatarType);
            if (!figureInfo) {
                return true;
            }

            let figureType: scenemonitor_define.TSceneAvatarFigureType = displayComp.componentName as scenemonitor_define.TSceneAvatarFigureType;
            let _visible = (figureType in figureInfo) ? figureInfo[figureType] : true;// 默认显示

            return _visible;
        }

        return true;
    }

    // ==== 事件分发统一由这里分发 ====
    /**整体avatar是否显示 */
    public setSceneAvatarsVisilbe(_data: scenemonitor_define.TSceneAvatarsVisibleSet) {
        // set value
        _data.avatarTypes = _data.avatarTypes;
        for (let _avatarType of _data.avatarTypes) {
            this.sceneAvatarsVisibleValue[_avatarType] = _data.visible;
        }

        // dispatch event
        GSceneMonitorEventBus.getInstance().dispatchEvent(new GSceneMonitorEvent(GSceneMonitorEvent.SCENE_AVATARS_VISIBLE_UPDATE, _data));
    }

    /**精细化各个部件是否显示 */
    public setSceneAvatarsFigureVisible(_data: scenemonitor_define.TSceneAvatarFigureVisibleSet) {
        // set value
        for (let _avatarType of _data.avatarTypes) {
            let oldFigureInfo = this.sceneAvatarsFigureVisibleValue[_avatarType] || {};

            let newFigureInfo = _data.figureInfo;

            if (_data.ohtersArgs) {
                let dict = scenemonitor_define.SceneAvatarFigureTypeDefines;
                let bol = _data.ohtersArgs.bol;
                for (let key in dict) {
                    let figureType = dict[key];
                    oldFigureInfo[figureType] = bol;
                }
            }

            for (let _figureType in newFigureInfo) {
                oldFigureInfo[_figureType] = newFigureInfo[_figureType];
            }

            this.sceneAvatarsFigureVisibleValue[_avatarType] = oldFigureInfo;
        }

        // dispatch event
        GSceneMonitorEventBus.getInstance().dispatchEvent(new GSceneMonitorEvent(GSceneMonitorEvent.SCENE_AVATARS_FIGURE_VISIBLE_UPDATE, _data));
    }

    // =========
    private m_nPlayerCount: number = 0;
    public set playerCount(value: number) {
        this.m_nPlayerCount = value;
    }
    public get playerCount() {
        return this.m_nPlayerCount;
    }
    public changePlayerCount(value: number) {
        this.m_nPlayerCount += value;
    }

    private m_nNpcCount: number = 0;
    public set npcCount(value: number) {
        this.m_nNpcCount = value;
    }
    public get npcCount() {
        return this.m_nNpcCount;
    }
    public changeNpcCount(value: number) {
        this.m_nNpcCount += value;
    }

    private m_nShownCount: number = 0;
    public get shownCount() {
        return this.m_nShownCount;
    }
    public set shownCount(value: number) {
        this.m_nShownCount = value;
    }

    // ====
    public getSceneEleCnt() {
        // let showCnt = this.shownCount || "-";
        let npcCnt = this.npcCount;
        let playerCnt = this.playerCount;
        let eleCnt = `${playerCnt},${npcCnt}`;

        return eleCnt;
    }



    // ==== dump
    /**
     * Todo
     * 要对比三个维度：
     * 服务器原始数据：client_repo_ex_
     * 缓存待创建数据：GSceneBufferMgr
     * 已创建对象：GSceneAvatarMgr
     * 
     */
    // ==== dump

    /**
     * 服务器下发了 ClientPuppet（client_repo_ex_.ClientPuppets_），
     * 但客户端场景没有创建对应 avatar（sceneAvatarProxy.m_dictPlayer 缺失）的对象。
     * 重点打印 space_no 是否 != 当前 sceneId（跨场景是最常见原因）。
     * 用法：控制台 GSceneInspectMgr.instance.dumpMissingPuppets()
     */
    public dumpMissingPuppets() {
        let curSceneId = SceneModel.getInstance().sceneId;
        let avatarProxy = SceneModel.getInstance().sceneAvatarProxy;
        let puppets = client_repo_ex_.ClientPuppets_;

        let total = 0;
        let missing = 0;
        let missDiffScene = 0;
        let missSameScene = 0;

        console.warn(`[MissPuppet] ===== dump start curSceneId=${curSceneId} =====`);

        for (let uuid in puppets) {
            let puppet = puppets[uuid];
            if (!puppet) {
                continue;
            }
            total++;

            let created = !!avatarProxy.getPlayer(uuid);
            if (created) {
                continue;
            }

            missing++;
            let diffScene = puppet.space_no != curSceneId;
            if (diffScene) {
                missDiffScene++;
            } else {
                missSameScene++;
            }

            console.warn(`[MissPuppet] MISS uuid=${uuid} name=${puppet.char_name} uid=${puppet.uid} space_no=${puppet.space_no} curSceneId=${curSceneId} diffScene=${diffScene} isInTeam=${puppet.isInTeam} teamId=${puppet.teamId} leaderId=${puppet.leaderId} createPriority=${puppet.createPriority} pos=[${puppet.posX},${puppet.posY}]`);
        }

        console.warn(`[MissPuppet] ===== dump end total=${total} created=${total - missing} missing=${missing} (diffScene=${missDiffScene} sameScene=${missSameScene}) =====`);
    }

    public dumpTeamState() {
        let curSceneId = SceneModel.getInstance().sceneId;
        let avatarProxy = SceneModel.getInstance().sceneAvatarProxy;
        let hero = avatarProxy.hero;
        let puppets = client_repo_ex_.ClientPuppets_;
        let ownSoul = client_repo_ex_.OwnSoul_;

        console.warn("[TeamDebug] ===== dumpTeamState start =====");
        console.warn(
            `[TeamDebug] hero uuid=${hero?.serverEntityData?.uuid} name=${hero?.serverEntityData?.entityName}` +
            ` heroPos=[${hero?.x},${hero?.y}]` +
            ` isFollower=${hero?.isFollower} isInTeam=${hero?.serverEntityData?.isInTeam}` +
            ` space_no=${hero?.serverEntityData?.space_no} curScene=${curSceneId}` +
            ` leaderId=${hero?.serverEntityData?.leaderId} teamId=${hero?.serverEntityData?.teamId}`
        );
        console.warn(
            `[TeamDebug] ownSoul uid=${ownSoul?.uid} name=${ownSoul?.char_name}` +
            ` puppetPos=[${ownSoul?.posX},${ownSoul?.posY}]` +
            ` isFollower=${ownSoul?.isFollower} isInTeam=${ownSoul?.isInTeam}` +
            ` space_no=${ownSoul?.space_no} curScene=${curSceneId}` +
            ` leaderId=${ownSoul?.leaderId} teamId=${ownSoul?.teamId}`
        );

        for (let uuid in puppets) {
            let p = puppets[uuid];
            if (!p?.isInTeam) {
                continue;
            }

            let av = avatarProxy.getPlayer(uuid);
            console.warn(
                `[TeamDebug] puppet uuid=${uuid} name=${p.char_name}` +
                ` puppetPos=[${p.posX},${p.posY}]` +
                ` isFollower=${p?.isFollower} isInTeam=${p?.isInTeam}` +
                ` space_no=${p?.space_no} curScene=${curSceneId}` +
                ` leaderId=${p.leaderId} teamId=${p.teamId}`
            );
        }

        console.warn("[TeamDebug] ===== dumpTeamState end =====");
    }
}