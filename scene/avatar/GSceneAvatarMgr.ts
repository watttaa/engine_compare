import { GlobalEventSource, ListenEvent } from "GlobalEvent";
import { MAPGROUP_NPC_MOVE_SPEED, MAPGROUP_PLAYER_MOVE_SPEED, MIN_GLOBAL_FIX_DIS } from "GlobalValue";
import { GlobalValue } from "GlobalValueDefine";
import { AvatarComDefine } from "avatar/AvatarDefines";
import { AvatarEvent } from "avatar/AvatarEvent";
import { component_define } from "avatar/comp/componentdefine";
import { SceneFollowleaderComponent } from "avatar/comp/impl/SceneFollowleaderComponent";
import { SceneRandomWalkComponent } from "avatar/comp/impl/SceneRandomWalkComponent";
import { SceneSyncPosToServerComponent } from "avatar/comp/impl/SceneSyncPosToServerComponent";
import { HeadTopUIComponent } from "avatar/comp/impl/addoncomp/HeadTopUIComponent";
import { SceneMainPlayerComponent } from "avatar/comp/impl/datacomp/SceneMainPlayerComponent";
import { SceneTeamDataComponent } from "avatar/comp/impl/datacomp/SceneTeamDataComponent";
import { ActionName } from "base/Enum";
import { client_repo_ex_ } from "clientsdk/ClientRepoEx";
import { serverentity_define } from "clientsdk/serverentity_define";
import { HeroMainEvent, HeroMainEventBus } from "heroMain/HeroMainEvent";
import { HeroMainModel } from "heroMain/HeroMainModel";
import { map_define } from "lib/map/mapdefine";
import { SceneEvent, SceneEventBus } from "lib/scene/SceneEvent";
import { SceneModel } from "lib/scene/SceneModel";
import { scene_log } from "lib/scene/scene_log";
import { ForcePK_define } from "s2/forcePK/ForcePK_define";
import { ISceneSubMgr } from "world/ISceneSubMgr";
import { World } from "world/World";
import { SceneCNet } from "world/net/SceneCNet";
import { GSceneAvatarEvent, GSceneAvatarEventBus } from "world/scene/avatar/GSceneAvatarEvent";
import { CSceneMainRole } from "world/scene/element/CSceneMainRole";
import { CSceneNpc } from "world/scene/element/CSceneNpc";
import { CSceneOtherRole } from "world/scene/element/CSceneOtherRole";
import { CSceneRole } from "world/scene/element/CSceneRole";
import { CSceneAvatarLegacy } from "world/scene/element/legacy/CSceneAvatarLegacy";
import { GSceneMonitorEvent, GSceneMonitorEventBus } from "world/scene/monitor/GSceneMonitorEvent";
import { GSceneMonitorMgr } from "world/scene/monitor/GSceneMonitorMgr";
import { scenemonitor_define } from "world/scene/monitor/scenemonitordefine";
import { scene_define } from "world/scene/scenedefine";
import { AvatarFactory } from "avatar/AvatarFactory";


/**
 * Tips
 * 该类提供基础api，不要耦合具体业务逻辑
 */
export class GSceneAvatarMgr extends egret.HashObject implements ISceneSubMgr {

    private ctx: World;

    /**主角 */
    private m_objHero: CSceneMainRole = null;

    /**npc */
    private m_dicNpc: dataStructure.GenericMap<CSceneNpc>;
    private m_noDicNpcIds: { [key: number]: string[] } = {};
    /**其他玩家*/
    private m_dictPlayer: dataStructure.GenericMap<CSceneOtherRole>;
    private m_uidDicUuid: { [key: number]: string } = {};


    private sceneMonitor: GSceneMonitorMgr;

    public constructor(worldProxy: World) {
        super();

        this.ctx = worldProxy;

        this.m_dicNpc = new dataStructure.GenericMap();
        this.m_dictPlayer = new dataStructure.GenericMap();

        HeroMainEventBus.getInstance().addEventListener(HeroMainEvent.HEROINFOUPDATE, this.updateHeroInfo, this);

        this.addPerfMonitor();

        SceneEventBus.getInstance().addEventListener(SceneEvent.ENTER_SCENE, this.onEnterScene, this);

        ListenEvent(GlobalEventSource.START_WAR_EVENT, this.onEventStartWar, this);
        ListenEvent(GlobalEventSource.END_WAR_EVENT, this.onEventEndWar, this);

        GSceneAvatarEventBus.getInstance().addEventListener(GSceneAvatarEvent.HERO_FLY_STATE_CHANGE, this.onHeroFlyStateChange, this);
    }

    clear(): void {
        this.pause();

        this.clearPlayers();
        this.clearNpcs();
    }
    dispose() {
        this.clearHero();
        this.ctx = null;
    }

    private onEventStartWar(e: GlobalEventSource) {
        this.pause();
    }

    private onEventEndWar(e: GlobalEventSource) {
        this.resume();
    }

    private onEnterScene() {
    }

    private updateHeroInfo(event: HeroMainEvent): void {
        this.onHeroInfoUpdate();
    }

    private onHeroInfoUpdate() {
        if (this.m_objHero) {
            // this.m_objHero.nickname = HeroMainModel.getInstance().nickname;
            // let nicknameColor = HeroMainModel.getInstance().getNickNameColor(true);
            // if (this.m_objHero.serverEntityData.crime_level) {
            //     nicknameColor = ForcePK_define.ForcePkCrimeLevelNameColor[this.m_objHero.serverEntityData.crime_level] || nicknameColor;
            // }
            // this.m_objHero.nicknameColor = nicknameColor
            if (!this.m_objHero.avatar_data) {
                this.m_objHero.avatar_data = {};
            }
            this.m_objHero.avatar_data.name = HeroMainModel.getInstance().nickname;
            this.m_objHero.avatar_data.nameColor = HeroMainModel.getInstance().getNickNameColor(true);
            AvatarFactory.getInstance().refreshAvatar(this.m_objHero, this.m_objHero.avatar_data);
        }
    }

    /**主角 */
    public get hero() {
        return this.m_objHero;
    }

    private onHeroFlyStateChange() {
        // 遍历所有玩家，更新飞行状态
        this.m_dictPlayer.forEach((player: CSceneOtherRole, key, map) => {
            player.updateFlying();
        }, this);
    }

    // ==== perf monitor
    private addPerfMonitor() {
        this.sceneMonitor = this.ctx.sceneMonitorMgr;

        GSceneMonitorEventBus.getInstance().addEventListener(GSceneMonitorEvent.SCENE_AVATARS_VISIBLE_UPDATE, this.onUpdateAvatarsVisible, this);
        GSceneMonitorEventBus.getInstance().addEventListener(GSceneMonitorEvent.SCENE_AVATARS_FIGURE_VISIBLE_UPDATE, this.onUpdateAvatarsFigureVisible, this);
    }

    private onUpdateAvatarsVisible(evt: GSceneMonitorEvent) {
        let _data = evt.data as scenemonitor_define.TSceneAvatarsVisibleSet;
        let _avatarTypes = _data.avatarTypes;

        for (let avatarType of _avatarTypes) {
            if (avatarType == scene_define.SAvatarType.OTHER_ROLE) {
                this.m_dictPlayer.forEach((player: CSceneOtherRole, key, map) => {
                    this.onUpdateAvatarVisible(player, avatarType);
                }, this);
            }
            else if (avatarType == scene_define.SAvatarType.NPC) {
                this.m_dicNpc.forEach((npc: CSceneNpc, key, map) => {
                    this.onUpdateAvatarVisible(npc, avatarType);
                }, this);
            }
        }
    }
    /**设置指定类型avatar的显示 */
    private onUpdateAvatarVisible(_avatar: CSceneAvatarLegacy, _type: scenemonitor_define.TSceneAvatarType) {
        let _visilbe = this.sceneMonitor.getSceneAvatarsVisibleValue(_type);
        _avatar.setVisible2(_visilbe);
    }

    /**设置avatar身形部件的显示 */
    private onUpdateAvatarsFigureVisible(evt: GSceneMonitorEvent) {
        let _data = evt.data as scenemonitor_define.TSceneAvatarFigureVisibleSet;
        let _avatarTypes = _data.avatarTypes;

        for (let avatarType of _avatarTypes) {
            if (avatarType == scene_define.SAvatarType.OTHER_ROLE) {
                this.m_dictPlayer.forEach((player: CSceneOtherRole, key, map) => {
                    this.onUpdateAvatarFigureVisible(player, avatarType);
                }, this);
            }
            else if (avatarType == scene_define.SAvatarType.NPC) {
                this.m_dicNpc.forEach((npc: CSceneNpc, key, map) => {
                    this.onUpdateAvatarFigureVisible(npc, avatarType);
                }, this);
            }
        }
    }
    private onUpdateAvatarFigureVisible(_avatar: CSceneAvatarLegacy, _avatarType: scenemonitor_define.TSceneAvatarType) {
        _avatar.updateFigureVisible();
    }

    // ========================
    private addHeroEvent() {
        this.m_objHero.addEventListener(AvatarEvent.AVATAR_LOAD_COMPLETE, this.onHeroComplete, this);
        this.m_objHero.addEventListener(AvatarEvent.AVATAR_VEHICLE_LOAD_COMPLETE, this.onHeroVehicleCompleted, this);
        this.m_objHero.addEventListener(AvatarEvent.TOUCH_TAP_MAP, this.onTouchTapMap, this);
    }
    private removeHeroEvent() {
        this.m_objHero.removeEventListener(AvatarEvent.AVATAR_LOAD_COMPLETE, this.onHeroComplete, this);
        this.m_objHero.removeEventListener(AvatarEvent.AVATAR_VEHICLE_LOAD_COMPLETE, this.onHeroVehicleCompleted, this);
        this.m_objHero.removeEventListener(AvatarEvent.TOUCH_TAP_MAP, this.onTouchTapMap, this);
    }
    private onHeroComplete(e: egret.Event) {
        GSceneAvatarEventBus.getInstance().dispatchEvent(new GSceneAvatarEvent(GSceneAvatarEvent.HERO_COMPLETE));
    }
    private onHeroVehicleCompleted(e: egret.Event) {
        GSceneAvatarEventBus.getInstance().dispatchEvent(new GSceneAvatarEvent(GSceneAvatarEvent.HERO_VEHICLE_COMPLETED));
    }
    private onTouchTapMap(e: AvatarEvent) {
        SceneCNet.C_STOP_AUTO_RUN();

        GSceneAvatarEventBus.getInstance().dispatchEvent(new GSceneAvatarEvent(GSceneAvatarEvent.HERO_TOUCH_TAP_MAP));
    }

    /**创建主角 */
    public createHero(): CSceneMainRole {
        this.clearHero();

        let soul = client_repo_ex_.OwnSoul_;
        if (!soul) {
            scene_log.warn("[#CSceneAvatarMgr] createHero, but no soul");
            return null;
        }

        this.m_objHero = CSceneMainRole.create([this.areaMgr, soul, map_define.SMapLayer.player]);
        this.m_objHero.name = scene_define.MAIN_HERO_NAME;
        HeroMainModel.getInstance().uuid = soul.uuid;

        this.onHeroInfoUpdate();

        let randomWalkArgs: component_define.SRandomWalkComponentArgs = { touchMove: true, isHero: true };
        this.m_objHero.addComponent(AvatarComDefine.RandomWalk, randomWalkArgs);

        if (soul.isGhost) {
            this.m_objHero.x = 0;
            this.m_objHero.y = 0;
        } else {
            this.m_objHero.x = soul.posX;
            this.m_objHero.y = soul.posY;

            this.m_objHero.addComponent(AvatarComDefine.SyncPosToServer, { ctx: this.ctx });
        }

        SceneMainPlayerComponent.setSceneScreenMainPlayer(this.m_objHero, {
            ctx: this.ctx,
        });
        let raceProxy = SceneModel.getInstance().getExtProxy("race");
        if (raceProxy) {
            raceProxy.calculatePlayerDirection(this.m_objHero);
        }
        // 队伍创建
        if (soul.isInTeam) {
            this.ctx.sceneTeamMgr.playerJoinTeam(soul.uuid, soul.teamId, soul);
        }

        this.addHeroEvent();

        return this.m_objHero;
    }

    public clearHero() {
        if (this.m_objHero) {
            this.removeHeroEvent();

            let uuid = this.m_objHero.serverEntityData.uuid;

            // this.delFollowers(uid);

            let sceneTeamData = this.m_objHero.getComponent(AvatarComDefine.SceneTeamData) as SceneTeamDataComponent;
            if (sceneTeamData?.teamId) {
                this.ctx.sceneTeamMgr.playLeaveTeam(uuid, sceneTeamData.teamId);
            }

            CSceneMainRole.remove(this.m_objHero);
            this.m_objHero = null;
        }
    }

    // =====================
    public addNpc(nid: string, info: serverentity_define.IServerNpcProps) {
        // let avatarData: AvatarData = avatar_utils.filterAvatarData(info.avatarStyle, "scene", { direction: info.direction, uid: info.npcNo });

        let npc = this.getNpc(nid);
        if (!npc) {
            npc = CSceneNpc.create([this.areaMgr, info, map_define.SMapLayer.player]);
            this.m_dicNpc.set(nid, npc);

            this.ctx.sceneAvatarUtils.setNpcTouchComp(npc, nid, info.npcNo, true);

            this.ctx.sceneAvatarUtils.setNpcAiComp(npc, info);

            npc.addComponent(AvatarComDefine.SceneNpcStatusUIComponent);

            npc.addComponent(AvatarComDefine.MaskCheck);

            if (!this.m_noDicNpcIds[info.npcNo]) {
                this.m_noDicNpcIds[info.npcNo] = [];
            }
            this.m_noDicNpcIds[info.npcNo].push(nid);

            this.sceneMonitor.changeNpcCount(1);
        } else {
            npc.refreshServerData(info);
        }

        npc.x = info.posX;
        npc.y = info.posY;
        // if (!info.initVisible) {
        //     npc.setVisible2(false);
        // }

        if (DEV) {
            if (!this.ctx.reachable(npc.x, npc.y, npc.mapGridSide)) {
                scene_log.warn(`addnpc uuid:${nid} unreachable sceneId:${SceneModel.getInstance().sceneId || undefined} pos:[${npc.x}, ${npc.y}]`);
            }
        }

        this.onUpdateAvatarVisible(npc, scene_define.SAvatarType.NPC);
        if (!info.initVisible && npc.getVisible2()) {
            npc.setVisible2(false);
        }
        this.onUpdateAvatarFigureVisible(npc, scene_define.SAvatarType.NPC);

        if (info.state == serverentity_define.SPropState.fighting)
            npc.replaceAddComponent(AvatarComDefine.Fighting);

        return this.m_dicNpc.get(nid);
    }

    public addPlayer(pid: string, info: serverentity_define.IServerPlayerProps) {
        let player = this.getPlayer(pid);
        let isNew: boolean = false;
        if (!player) {
            player = CSceneOtherRole.create([this.areaMgr, info, map_define.SMapLayer.player]);
            this.m_dictPlayer.set(pid, player);
            this.m_uidDicUuid[info.uid] = pid;

            // player.setAvatarTouch(false);
            this.ctx.sceneAvatarUtils.setPlayerTouchComp(player, pid, true);

            player.addComponent(AvatarComDefine.MaskCheck);

            this.sceneMonitor.changePlayerCount(1);

            isNew = true;
        } else {
            player.refreshServerData(info);
        }

        if (info.is_robot) {
        } else {
            player.x = info.posX;
            player.y = info.posY;

            if (isNotVain(info.direction)) {
                player.direction = info.direction;
            } else {
                let raceProxy = SceneModel.getInstance().getExtProxy("race");
                if (raceProxy) {
                    raceProxy.calculatePlayerDirection(player);
                }

            }

        }

        // 队伍创建
        if (info.isInTeam) {
            this.ctx.sceneTeamMgr.playerJoinTeam(pid, info.teamId, info);

            if (isNew) {
                this.moveToLeader(player);

                this.updateFollowersPos(player);
            }
        }

        this.onUpdateAvatarVisible(player, scene_define.SAvatarType.OTHER_ROLE);
        this.onUpdateAvatarFigureVisible(player, scene_define.SAvatarType.OTHER_ROLE);

        return player;
    }

    public refreshPlayer(pid: string, info: serverentity_define.IServerPlayerProps) {
        if (!this.m_objHero) {
            return;
        }

        // 主角
        if (pid == this.m_objHero.serverEntityData.uuid) {
            this.m_objHero.refreshServerData(info);
            return;
        }

        let player = this.getPlayer(pid);
        if (!player) {
            return;
        }

        player.refreshServerData(info);
    }

    public hasNpc(nid: string): boolean {
        return this.m_dicNpc.has(nid);
    }

    public hasPlayer(pid: string): boolean {
        return this.m_dictPlayer.has(pid);
    }

    public delNpc(nid: string) {
        if (!this.m_dicNpc.has(nid)) {
            return false;
        }

        let npc = this.m_dicNpc.get(nid);

        let npc_no = npc.serverEntityData.uid;
        let npcs = this.m_noDicNpcIds[npc_no];
        if (!npcs) {
            Logger.warn(`[#GSceneAvatarMgr] delNpc npc_no = ${npc_no} 重复删除`);
            return;
        }

        npcs.splice(npcs.indexOf(nid), 1);

        if (npcs.length == 0) {
            delete this.m_noDicNpcIds[npc_no];
        }

        CSceneNpc.remove(npc);

        this.m_dicNpc.delete(nid);

        this.sceneMonitor.changeNpcCount(-1);

        return true;
    }

    public delNpcByNo(npcno: number) {
        if (!this.m_noDicNpcIds[npcno]) {
            return false;
        }

        let npcs = this.m_noDicNpcIds[npcno];

        const npcsCopy = [...npcs];
        for (let npcid of npcsCopy) {
            this.delNpc(npcid);
        }

        this.m_noDicNpcIds[npcno] = []
        delete this.m_noDicNpcIds[npcno];

        return true;
    }

    public delPlayer(pid: string) {
        if (!this.m_dictPlayer.has(pid)) {
            return false;
        }

        // this.delFollowers(pid);

        let player = this.m_dictPlayer.get(pid);
        let sceneTeamData = player.getComponent(AvatarComDefine.SceneTeamData) as SceneTeamDataComponent;
        if (sceneTeamData?.teamId) {
            this.ctx.sceneTeamMgr.playLeaveTeam(pid, sceneTeamData.teamId);
        }

        let uid = player.serverEntityData.uid;
        CSceneOtherRole.remove(player);

        this.m_dictPlayer.delete(pid);
        delete this.m_uidDicUuid[uid];
        this.sceneMonitor.changePlayerCount(-1);

        return true;
    }

    public delPlayersExcept(pids: string[]) {
        let deleteList = [];

        this.m_dictPlayer.forEach((value, key) => {
            if (pids.indexOf(key) === -1) {
                deleteList.push(key);
            }
        });

        for (let pid of deleteList) {
            this.delPlayer(pid);
        }
    }

    public getNpc(nid: string) {
        if (this.m_dicNpc.has(nid)) {
            return this.m_dicNpc.get(nid);
        }
        return null;
    }

    public getNpcByNo(npcno: number) {
        if (this.m_noDicNpcIds[npcno]) {
            let uuid = this.m_noDicNpcIds[npcno][0];
            return this.m_dicNpc.get(uuid);
        }
        return null;
    }


    public getPlayer(pid: string) {
        if (this.m_dictPlayer.has(pid)) {
            return this.m_dictPlayer.get(pid);
        }
        return null;
    }

    public getPlayerByUid(uid: number) {
        let pid = this.m_uidDicUuid[uid];
        if (this.m_dictPlayer.has(pid)) {
            return this.m_dictPlayer.get(pid);
        }
        return null;
    }

    public getAllPlayers() {
        return this.m_dictPlayer;
    }

    public getNpcs() {
        return this.m_dicNpc.values;
    }

    public getPlayerIDs() {
        return this.m_dictPlayer.keys;
    }

    // o(n)的查找，如果有性能问题可以优化
    public getNpcAndPlayerInRange(midPos: Point, r: number) {
        let npcs = [];
        this.m_dicNpc.forEach((v: CSceneAvatarLegacy, k) => {
            if ((v).visible && this.isInRange(midPos, r, v)) {
                npcs.push(k);
            }
        }, this);

        let players = [];
        this.m_dictPlayer.forEach((v: CSceneAvatarLegacy, k) => {
            if ((v).visible && this.isInRange(midPos, r, v)) {
                players.push(k);
            }
        }, this);

        return { npcs, players };
    }

    private isInRange(midPos: Point, r: number, checkPos: Point) {
        return preload_utils_math.distance(midPos, checkPos) <= r;
    }

    public clearNpcs() {
        this.m_dicNpc.forEach((npc: CSceneNpc, key, map) => {
            this.delNpc(key);
        }, this);

        this.m_dicNpc.clear();

        this.sceneMonitor.npcCount = 0;
    }

    public clearPlayers() {
        this.m_dictPlayer.forEach((player: CSceneOtherRole, key, map) => {
            this.delPlayer(player.serverEntityData.uuid);
        }, this);
        this.m_dictPlayer.clear();

        this.sceneMonitor.playerCount = 0;
    }

    private moveToLeader(follower: CSceneRole) {
        let followerLeader = follower.getComponent(AvatarComDefine.Followleader) as SceneFollowleaderComponent;
        if (followerLeader) {
            followerLeader.moveToFollowed();
        }
    }
    private updateFollowersPos(leader: CSceneRole) {
        if (leader.isLeader) {
            let sceneTeamData = leader.getComponent(AvatarComDefine.SceneTeamData) as SceneTeamDataComponent;
            if (sceneTeamData?.teamId) {
                sceneTeamData.team.updateFollowersPos();
            }
        }
    }
    public updateTeamPos(leader: CSceneRole) {
        let syncPosToServer = leader.getComponent(AvatarComDefine.SyncPosToServer) as SceneSyncPosToServerComponent;
        if (syncPosToServer) {
            syncPosToServer.syncPos();
        }

        this.updateFollowersPos(leader);
    }

    // =====================
    /**移动一个角色 */
    public movePlayer(pid: string, netX: number, netY: number, speed: number = MAPGROUP_PLAYER_MOVE_SPEED, forceSet: boolean = false) {
        if (!this.m_objHero) {
            return;
        }

        let targetPos = { x: netX, y: netY }; // this.ctx.convertCellPosToWorld(netX, netY);

        // 主角
        if (pid == this.m_objHero.serverEntityData.uuid) {
            // if (this.m_objHero.isGhost) {
            //     return;
            // }

            // if (forceSet) {
            //     this.moveAvatar(this.m_objHero, targetPos, speed, forceSet);
            //     return;
            // }

            // if (this.m_objHero.isFollower) {
            //     return;
            // }

            // let dis = preload_utils_math.distance(targetPos, this.m_objHero);
            // if (dis > MIN_GLOBAL_FIX_DIS) {
            //     this.moveAvatar(this.m_objHero, targetPos, speed, forceSet);
            //     return;
            // }

            if (DEV) {
                scene_log.logTest(`[s->c pos moveAvatar] [is mainrole return] ${this.m_objHero.serverEntityData.entityName} forceSet:${forceSet} pos: [${targetPos.x}, ${targetPos.y}]`);
            }

            return;
        }

        // 其他玩家
        let player = this.getPlayer(pid);
        if (!player) {
            return;
        }

        if (!forceSet && player.isFollower) {
            return;
        }

        this.moveAvatar(player, targetPos, speed, forceSet);
    }

    /**
     * 移动一个NPC 
     * @param nid 
     * @param netX 
     * @param netY 
     * @param speed 
     * @param forceSet
     * @returns 
     */
    public moveNpc(nid: string, netX: number, netY: number, speed: number = MAPGROUP_NPC_MOVE_SPEED, forceSet: boolean = false) {
        if (!this.m_objHero) {
            return;
        }

        // 其他玩家
        let npc = this.getNpc(nid);
        if (!npc) {
            return;
        }

        let targetPos = { x: netX, y: netY };

        this.moveAvatar(npc, targetPos, speed, forceSet);
    }

    /**
     * 
     * @param _avatar 
     * @param targetPos 
     * @param speed 
     * @param forceSet 是否瞬移
     */
    private moveAvatar(_avatar: CSceneAvatarLegacy, targetPos: Point, speed: number, forceSet: boolean) {
        let checkTeam = false;
        if (forceSet) {
            _avatar.x = targetPos.x;
            _avatar.y = targetPos.y;

            _avatar.stopAndStand();

            checkTeam = true;
        }
        else if (_avatar.visible) {
            let dis = preload_utils_math.distance(targetPos, _avatar);
            if (dis < MIN_GLOBAL_FIX_DIS) {
                _avatar.walkTo(targetPos.x, targetPos.y, speed);
            }
            else {
                let path = _avatar.getAvatarMovePath(this.ctx, targetPos.x, targetPos.y);
                if (path.length > 0) {
                    _avatar.walkAlongPath(path, speed);
                }
                else {
                    _avatar.walkTo(targetPos.x, targetPos.y, speed);
                }
            }
        }
        else {
            _avatar.x = targetPos.x;
            _avatar.y = targetPos.y;

            checkTeam = true;
        }

        if (DEV) {
            scene_log.logTest(`[s->c pos moveAvatar] ${_avatar.serverEntityData.entityName} forceSet:${forceSet} pos: [${targetPos.x}, ${targetPos.y}]`);
        }

        let avatarMgr = SceneModel.getInstance().sceneAvatarProxy;
        if (checkTeam && _avatar instanceof CSceneRole) {
            avatarMgr.updateTeamPos(_avatar);
        }
    }

    // =====================
    public pause() {
        if (this.m_objHero) {
            scene_log.warn(`[GSceneAvatarMgr]: pasue `);
            this.m_objHero.visible = false;
            this.m_objHero.pause();
        }

        this.m_dictPlayer.forEach((player: CSceneOtherRole, key, map) => {
            // player.visible = false;
            player.pause();
        }, this);

        this.m_dicNpc.forEach((npc: CSceneNpc, key, map) => {
            // npc.visible = false;
            npc.pause();
        }, this);
    }

    public resume() {
        if (this.m_objHero) {
            Logger.warn(`[GSceneAvatarMgr]: resume `);
            this.m_objHero.visible = true;
            this.m_objHero.resume();
        }

        this.m_dictPlayer.forEach((player: CSceneOtherRole, key, map) => {
            player.resume();
        }, this);

        this.m_dicNpc.forEach((npc: CSceneNpc, key, map) => {
            npc.resume();
        }, this);
    }

    // =====================
    private get areaMgr() {
        return this.ctx.areaMgr;
    }

    /***npc 血条更新 */
    public updateNpcHp(nid: string, hp: number) {
        if (!this.m_objHero) {
            return;
        }
        let npc = this.getNpc(nid);
        if (!npc) {
            return;
        }
        let head: HeadTopUIComponent = npc.getComponent(AvatarComDefine.HeadTopUI) as HeadTopUIComponent;
        let max_hp = (npc.serverEntityData as serverentity_define.IServerNpcProps).max_hp
        head.setValue(hp, max_hp, true);
        if (hp == 0)
            npc.play(ActionName.DIE, 1);
    }

    /***npc 战斗 */
    public updateNpcFighting(nid: string, b: boolean) {
        if (!this.m_objHero) {
            return;
        }
        let npc = this.getNpc(nid);
        if (!npc) {
            return;
        }
        if (b) {
            npc.replaceAddComponent(AvatarComDefine.Fighting);
        }
        else {
            npc.removeComponent(AvatarComDefine.Fighting);
        }
    }

    /***npc 名字更新 */
    public updateNpcName(nid: string, name: string) {
        if (!this.m_objHero) {
            return;
        }
        let npc = this.getNpc(nid);
        if (!npc) {
            return;
        }
        // npc_name 已在 ClientNPC.on_prop_changed 中被框架更新，这里只需刷新场景avatar的名字显示
        npc.refreshServerData(npc.serverEntityData);
    }

    /***玩家 冷冻 */
    public frozenPlayer(pid: string, isFrozen: boolean) {
        let player = this.getPlayer(pid);

        if (!player && pid == this.m_objHero?.serverEntityData?.uuid) {
            player = this.m_objHero;
        }
        if (!player) {
            return;
        }
        // 主角
        let s_eff_id = "32002";
        let walkComponent = player.getComponent(AvatarComDefine.RandomWalk) as SceneRandomWalkComponent;
        if (player) {
            if (isFrozen) {
                player.stand();
                egret.Tween.removeTweens(player);
                let effCom = player.getComponentSafely(AvatarComDefine.Effect);
                if (effCom) {
                    effCom.addEffectComponent(player, s_eff_id);
                    this.addFrozenPlayerID(pid);

                    if (walkComponent) {
                        walkComponent.enableTouchWalk = false;
                        walkComponent.enableJoystickWalk = false;
                    }
                }
            } else {
                let effCom = player.getComponent(AvatarComDefine.Effect);
                if (effCom) {
                    effCom.deleteEffectComponent(player, s_eff_id);
                    this.delFrozenPlayerID(pid);
                    if (walkComponent) {
                        walkComponent.enableTouchWalk = true;
                        walkComponent.enableJoystickWalk = true;
                    }
                }

            }
        }
    }

    private $frozenPlayer: number[] = [];
    private addFrozenPlayerID(pid) {
        if (this.$frozenPlayer.indexOf(pid) == -1) {
            this.$frozenPlayer.push(pid);

            let avatar = this.getPlayer(pid);
            if (avatar) {
                //停止跟随
                let followerCom = avatar.getComponent(AvatarComDefine.Followleader) as SceneFollowleaderComponent;
                followerCom && followerCom.pauseFollower();
            }
        }
    }
    private delFrozenPlayerID(pid) {
        if (this.$frozenPlayer.indexOf(pid) != -1) {
            this.$frozenPlayer.splice(this.$frozenPlayer.indexOf(pid), 1)
            let avatar = this.getPlayer(pid);
            if (avatar) {
                //恢复跟随
                let followerCom = avatar.getComponent(AvatarComDefine.Followleader) as SceneFollowleaderComponent;
                followerCom && followerCom.resumeFollower();
            }
        }
    }

    /***玩家 战斗 */
    public fightPlayer(pid: string, isFighting: boolean) {

        let player = this.getPlayer(pid);

        if (!player && pid == this.m_objHero?.serverEntityData?.uuid) {
            player = this.m_objHero;
        }
        if (!player) {
            return;
        }

        if (isFighting) {
            player.replaceAddComponent(AvatarComDefine.Fighting);
        }
        else {
            player.removeComponent(AvatarComDefine.Fighting);
        }
    }

    /***玩家 观战 */
    public watchingPlayer(pid: string, isWatching: boolean) {
        let player = this.getPlayer(pid);

        if (!player && pid == this.m_objHero?.serverEntityData?.uuid) {
            player = this.m_objHero;
        }
        if (!player) {
            return;
        }

        if (isWatching) {
            player.replaceAddComponent(AvatarComDefine.SceneWatchingUIComponet);
        } else {
            player.removeComponent(AvatarComDefine.SceneWatchingUIComponet);
        }
    }

}