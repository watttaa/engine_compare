
import { s2_open_ui_cfg } from "auto/open_ui";
import { client_repo_ex_ } from "clientsdk/ClientRepoEx";
import { serverentity_define } from "clientsdk/serverentity_define";
import { game_define } from "game_define";
import { SceneManager } from "lib/scene/SceneManager";
import { SceneModel } from "lib/scene/SceneModel";
import { scene_log } from "lib/scene/scene_log";
import { searchParams_utils } from "login/SearchParamsUtils";
import { VehicleUtil } from "s2/drive/vehicle/util/VehicleUtil";
import { ISceneSubMgr } from "world/ISceneSubMgr";
import { World } from "world/World";
import { GSceneServerEvent, GSceneServerEventBus } from "world/scene/GSceneServerEvent";
import { GSceneValue } from "world/scene/GSceneValue";
import { GScenePrivateEntityCacheMgr } from "world/scene/buffer/GScenePrivateEntityCacheMgr";
import { scene_define } from "world/scene/scenedefine";

/**
 * - 作为服务器数据协议与客户端创建实体的hub
 * - 处理大世界场景的切换
 * - 处理全局entitys和私有entitys的创建销毁
 */
export class CSceneServerHub extends egret.HashObject implements ISceneSubMgr {

    private ctx: World;

    constructor(world: World) {
        super();

        this.ctx = world;

        this.init();
    }

    clear(): void {
    }
    dispose() {
        this.ctx = null;
    }

    init() {
        GSceneServerEventBus.getInstance().addEventListener(GSceneServerEvent.SERVER_ZONE_CREATE, this.onZoneCreate, this);

        GSceneServerEventBus.getInstance().addEventListener(GSceneServerEvent.SERVER_SOUL_CREATE, this.onSoulCreate, this);
        GSceneServerEventBus.getInstance().addEventListener(GSceneServerEvent.SERVER_SOUL_DESTORY, this.onSoulDestroy, this);

        GSceneServerEventBus.getInstance().addEventListener(GSceneServerEvent.SERVER_PUPPET_CREATE, this.onPuppetCreate, this);
        GSceneServerEventBus.getInstance().addEventListener(GSceneServerEvent.SERVER_PUPPET_DESTORY, this.onPuppetDestroy, this);
        GSceneServerEventBus.getInstance().addEventListener(GSceneServerEvent.SERVER_PUPPET_PROP_CHANGE, this.onPuppetPropchange, this);

        GSceneServerEventBus.getInstance().addEventListener(GSceneServerEvent.SERVER_NPC_CREATE, this.onNpcCreate, this);
        GSceneServerEventBus.getInstance().addEventListener(GSceneServerEvent.SERVER_NPC_DESTORY, this.onNpcDestroy, this);
        GSceneServerEventBus.getInstance().addEventListener(GSceneServerEvent.SERVER_NPC_PROP_CHANGE, this.onNpcPropchange, this);

        GSceneServerEventBus.getInstance().addEventListener(GSceneServerEvent.SERVER_PRIVATE_PLAYER_CREATE, this.onPrivatePlayerCreate, this);
        GSceneServerEventBus.getInstance().addEventListener(GSceneServerEvent.SERVER_PRIVATE_PLAYER_DESTORY, this.onPrivatePlayerDestroy, this);

        GSceneServerEventBus.getInstance().addEventListener(GSceneServerEvent.SERVER_PRIVATE_NPC_CREATE, this.onPrivateNpcCreate, this);
        GSceneServerEventBus.getInstance().addEventListener(GSceneServerEvent.SERVER_PRIVATE_NPC_DESTORY, this.onPrivateNpcDestroy, this);
    }

    // ====================
    private onZoneCreate(e: GSceneServerEvent) {
        if (!client_repo_ex_.OwnSoul_) {
            scene_log.warn("[#CSceneServerHub] onZoneCreate, but no soul");
            return;
        }
        this.tryZoneEnter();
    }

    private onSoulCreate(e: GSceneServerEvent) {
        if (!client_repo_ex_.OwnZone_) {
            scene_log.warn("[#CSceneServerHub] onSoulCreate, but no zone");
            return;
        }
        this.tryZoneEnter();
    }

    public tryZoneEnter(force: boolean = false) {
        if (force) {
            // pass
        } else {
            // if (GSceneValue.getSceneType() == scene_define.SSceneType.AFK) {
            //     let soul = client_repo_ex_.OwnSoul_;
            //     soul.isGhost = true;
            //     return;
            // }
            if (GSceneValue.getSceneType() == scene_define.SSceneType.PLOT) {
                let soul = client_repo_ex_.OwnSoul_;
                soul.isGhost = true;
                return;
            }
        }

        // 1. 进入场景
        this.enterWorld();

        // 2. 创建entitys
        this.createEntitys();
    }
    private enterWorld() {
        let soul = client_repo_ex_.OwnSoul_;
        soul.isGhost = false;

        let sceneId = soul.space_no;
        let sceneType = soul.space_type;

        GSceneValue.setSceneType(sceneType);

        scene_log.log(`[$CSceneServerHub] enterWorld sceneId:${sceneId} sceneType:${sceneType}`);
        scene_log.logSceneStep(scene_log.SceneStep.ENTER_WORLD, sceneId, sceneType);

        // 进入世界
        let sceneMgr = SceneManager.getInstance();
        if (LoginValue.InnerTest && searchParams_utils.isDebugScene()) {
            let debugSceneId = searchParams_utils.getSceneId();
            sceneId = debugSceneId || sceneId;
            sceneMgr.changeScene(sceneId, false, (changed: boolean) => {
                sceneMgr.doDebugScene(true, sceneId);
            });
        }
        else if (sceneType == scene_define.SSceneType.WORLD) {
            sceneMgr.changeScene(sceneId, false, (changed: boolean) => {
                sceneMgr.doMutliPlayerWorld(true, sceneId);
            });
        }
        // // 进入挂机场景
        // else if (sceneType == scene_define.SSceneType.AFK) { //（discarded） @see SceneSNet.S_GOTO_SCENE
        //     sceneMgr.changeScene(sceneId, false, (changed: boolean) => {
        //         sceneMgr.doAfkWorld(true, sceneId);
        //     })
        // }
        else if (sceneType == scene_define.SSceneType.DUNGEON) {
            let zone = client_repo_ex_.OwnZone_;
            if (zone?.open_id && zone?.open_id == s2_open_ui_cfg.FACTION_WAR) {
                sceneMgr.changeScene(sceneId, false, (changed: boolean) => {
                    sceneMgr.doFactionWar(true, sceneId);
                });
                return;
            }
            if (zone?.open_id && zone?.open_id == s2_open_ui_cfg.FACTION) {
                sceneMgr.changeScene(sceneId, false, (changed: boolean) => {
                    sceneMgr.doFaction(true, sceneId);
                });
                return;
            }
            sceneMgr.changeScene(sceneId, false, (changed: boolean) => {
                sceneMgr.doDungeon(true, sceneId);
            });
        }
        else {
            scene_log.warn(`on_zone_enter sceneType:${sceneType}`);
        }
    }
    private createEntitys() {
        // 全局
        for (let pid in client_repo_ex_.ClientPuppets_) {
            this.doPuppetCreate(pid);
        }
        for (let nid in client_repo_ex_.ClientNpcs_) {
            this.doNpcCreate(nid);
        }

        // 私有
        for (let pid in this.privateEntityCacheMgr.dictPlayer) {
            this.doPrivatePlayerCreate(pid);
        }
        for (let nid in this.privateEntityCacheMgr.dictNpc) {
            this.doPrivateNpcCreate(nid);
        }
    }

    // ====================
    // onSoulCreate(e: GSceneServerEvent) {
    //     this.ctx.createHero();
    // }
    private onSoulDestroy(e: GSceneServerEvent) {
        // Logger.log(`on_soul_destroy`);
        // mike tips: 这里不销毁hero，保持hero一直存在，然后由ctx.createHero进行重建
    }

    // ====================
    // player创建
    // ====================
    // ==大世界player
    /**大世界player真实创建 */
    private doPuppetCreate(pid: string) {
        let puppet = client_repo_ex_.ClientPuppets_[pid];
        if (!puppet) {
            return;
        }

        this.ctx.sceneBufferMgr.addCreateEntityBuffer({ uuid: pid, data: puppet, type: scene_define.SAvatarType.OTHER_ROLE });
        // this.ctx.addPlayer(uid, puppet);
    }
    /**大世界player创建 */
    private onPuppetCreate(e: GSceneServerEvent) {
        let pid = e.data;
        let puppet = client_repo_ex_.ClientPuppets_[pid];
        if (!this.checkEntityCanCreate(puppet, "public_puppet")) {
            return;
        }

        this.doPuppetCreate(pid);
    }
    /**大世界player销毁 */
    private onPuppetDestroy(e: GSceneServerEvent) {
        let pid = e.data;

        this.ctx.sceneBufferMgr.removeCreateEntityBuffer(pid);
        this.ctx.delPlayer(pid);
    }
    /**大世界player(&soul)数据改变 */
    private onPuppetPropchange(e: GSceneServerEvent) {
        let _data = e.data as serverentity_define.SPuppetPropChange;

        let pid = _data.uuid;

        if (!client_repo_ex_.OwnSoul_) {
            scene_log.warn("[#CSceneServerHub] onPuppetPropchange, but no soul");
            return;
        }

        let puppet = pid == client_repo_ex_.OwnSoul_.uuid ? client_repo_ex_.OwnSoul_ : client_repo_ex_.ClientPuppets_[pid];
        if (!puppet) {
            return;
        }

        if (_data.name == serverentity_define.SPropType.position) {
            this.ctx.movePlayer(pid, puppet.posX, puppet.posY, undefined, puppet.posSet);
        } else if (_data.name == serverentity_define.SPropType.team_id) {
            // let newTeamId = puppet.teamId;
            let oldTeamId = _data.old_value;

            this.ctx.sceneTeamMgr.playerChangeTeamId(puppet, oldTeamId);
        } else if (_data.name == serverentity_define.SPropType.team_state) {
            let oldTeamId = puppet.team_id;
            this.ctx.sceneTeamMgr.playerChangeTeamId(puppet, oldTeamId);
        } else if (_data.name == serverentity_define.SPropType.leader_id) {
            // let newLeaderId = puppet.leaderId;
            let oldLeaderId = _data.old_value;

            this.ctx.sceneTeamMgr.playerChangeLeaderId(puppet, oldLeaderId);
        } /* else if (_data.name == serverplayer_define.SPropType.team_members) {
            this.ctx.sceneAvatarManager.playerChangeTeamMembers(puppet);
        } */
        else if (_data.name == serverentity_define.SPropType.team_formation) {
            // let oldTeamFormation = _data.old_value;
            this.ctx.sceneTeamMgr.playerChangeTeamFormation(puppet);
        }
        else if (_data.name == serverentity_define.SPropType.state) {
            // if (puppet.state == serverentity_define.SPropState.freeze || _data.old_value == serverentity_define.SPropState.freeze) {
            //     this.ctx.frozenPlayer(pid, puppet.state == serverentity_define.SPropState.freeze);
            // }

            // if (puppet.state == serverentity_define.SPropState.fighting || _data.old_value == serverentity_define.SPropState.fighting)
            //     this.ctx.fightingPlayer(pid, puppet.state == serverentity_define.SPropState.fighting);
            this.ctx.fightingPlayer(pid, puppet.state == serverentity_define.SPropState.fighting);
            this.ctx.frozenPlayer(pid, puppet.state == serverentity_define.SPropState.freeze);
        }
        else if (_data.name == serverentity_define.SPropType.extra) {
            this.ctx.refreshPlayer(pid, puppet);
        }
        else if (_data.name == serverentity_define.SPropType.title) {
            this.ctx.refreshPlayer(pid, puppet);
        } else if (_data.name == serverentity_define.SPropType.foot_title) {
            // 脚底称号变化：复用 title 的全量刷新通道，避免其他玩家 foot_title 不更新
            this.ctx.refreshPlayer(pid, puppet);
        } else if (_data.name == serverentity_define.SPropType.role_model) {
            this.ctx.refreshPlayer(pid, puppet);
        } else if (_data.name == serverentity_define.SPropType.crime_level) {
            this.ctx.refreshPlayer(pid, puppet);
        } else if (_data.name == serverentity_define.SPropType.online_status) {
            const isFighting = !!(puppet.online_status & game_define.OnlineStatus.BATTLE);
            this.ctx.fightingPlayer(pid, isFighting);
            const isWatching = !!(puppet.online_status & game_define.OnlineStatus.WATCHING);
            this.ctx.watchingPlayer(pid, isWatching);
        } else if (_data.name == serverentity_define.SPropType.vehicle_action_cd) {
            // 座驾动作播放：cd 为新一次播放结束时间戳（秒），与 old_value 不同 → 触发对应玩家场景 avatar 播 attack_a
            // 业务逻辑封装在座驾系统（VehicleUtil）内部；此处仅负责定位 avatar
            const avatar = pid == client_repo_ex_?.OwnSoul_?.uuid ? this.ctx.getHero() : this.ctx.getPlayer(pid);
            VehicleUtil.playVehicleActionOnCdChange(avatar, puppet.vehicle_action_cd, _data.old_value);
        } else {
            scene_log.log("[#CSceneServerHub] onPuppetPropchange unhandled prop", "name=", _data.name, "old=", _data.old_value, "new=", puppet[_data.name]);
        }
    }

    // ==私有player
    private doPrivatePlayerCreate(pid: string) {
        let player = this.privateEntityCacheMgr.dictPlayer[pid];
        if (!player) {
            return;
        }

        this.ctx.sceneBufferMgr.addCreateEntityBuffer({ uuid: pid, data: player, type: scene_define.SAvatarType.OTHER_ROLE });
    }
    /**私有player创建*/
    private onPrivatePlayerCreate(e: GSceneServerEvent) {
        let pid = e.data[0];
        let player = this.privateEntityCacheMgr.dictPlayer[pid];
        if (!this.checkEntityCanCreate(player, "private_player")) {
            return;
        }

        this.doPrivatePlayerCreate(pid);
    }
    /**私有player销毁 */
    private onPrivatePlayerDestroy(e: GSceneServerEvent) {
        let pid = e.data[0];

        this.ctx.sceneBufferMgr.removeCreateEntityBuffer(pid);
        this.ctx.delPlayer(pid);
    }


    // ====================
    // npc创建
    // ====================
    // ==大世界npc
    /**大世界npc真实创建 */
    private doNpcCreate(nid: string) {
        let npc = client_repo_ex_.ClientNpcs_[nid];
        if (!this.checkEntityCanCreate(npc,"public_npc")) { // 非当前场景npc，不处理
            return;
        }

        this.ctx.sceneBufferMgr.addCreateEntityBuffer({ uuid: nid, data: npc, type: scene_define.SAvatarType.NPC });

        if (npc.state == serverentity_define.SPropState.fighting) {
            this.ctx.updateNpcFighting(nid, true);
        }
        // this.ctx.addNpc(nid, npc);
    }
    /**大世界npc创建 */
    private onNpcCreate(e: GSceneServerEvent) {
        let nid = e.data;
        this.doNpcCreate(nid);
    }
    /**大世界npc销毁 */
    private onNpcDestroy(e: GSceneServerEvent) {
        let nid = e.data;

        this.ctx.delNpc(nid);
    }
    /**大世界npc数据改变 */
    private onNpcPropchange(e: GSceneServerEvent) {
        let _data = e.data as serverentity_define.SNpcPropChange;

        let nid = _data.uuid;

        let npc = client_repo_ex_.ClientNpcs_[nid];

        if (!npc) {
            return;
        }

        if (_data.name == serverentity_define.SPropType.position) {
            this.ctx.moveNpc(nid, npc.posX, npc.posY);
        }

        if (_data.name == serverentity_define.SPropType.hp) {
            this.ctx.updateNpcHp(nid, npc.hp);
        }

        if (_data.name == serverentity_define.SPropType.state) {
            this.ctx.updateNpcFighting(nid, npc.state == serverentity_define.SPropState.fighting);
        }

        if (_data.name == serverentity_define.SPropType.online_status) {
            const isFighting = !!(npc.online_status & game_define.OnlineStatus.BATTLE);
            this.ctx.updateNpcFighting(nid, isFighting);
        }

        if (_data.name == serverentity_define.SPropType.npc_name) {
            this.ctx.updateNpcName(nid, npc.npc_name);
        }

    }

    // ==私有npc
    /**私有npc创建*/
    private doPrivateNpcCreate(nid: string) {
        let npc = this.privateEntityCacheMgr.dictNpc[nid];
        if (!npc) {
            return;
        }

        this.ctx.sceneBufferMgr.addCreateEntityBuffer({ uuid: nid, data: npc, type: scene_define.SAvatarType.NPC });
    }
    private onPrivateNpcCreate(e: GSceneServerEvent) {
        let nid = e.data[0];
        let npc = this.privateEntityCacheMgr.dictNpc[nid];
        if (!this.checkEntityCanCreate(npc, "private_npc")) {
            return;
        }

        this.doPrivateNpcCreate(nid);
    }
    /**私有npc销毁 */
    private onPrivateNpcDestroy(e: GSceneServerEvent) {
        let [npcNo, sceneId, nid] = e.data[0] as [number, number, string];

        this.ctx.delNpcByNo(npcNo);
    }

    //=========
    // api
    //=========
    private checkEntityCanCreate(entity: serverentity_define.IServerEntityProps, type: serverentity_define.EntityType): boolean {
        if (!entity) {
            return false;
        }

        let curSceneId = SceneModel.getInstance().sceneId;
        if (entity.space_no != curSceneId) {
            scene_log.warn(`[#CSceneServerHub] checkEntityCanCreate: entity.space_no:${entity.space_no} != curSceneId:${curSceneId} name=${entity.entityName} type=${type}`);
            return false;
        }

        return true;
    }

    private get privateEntityCacheMgr(): GScenePrivateEntityCacheMgr {
        return GScenePrivateEntityCacheMgr.getInstance();
    }
}