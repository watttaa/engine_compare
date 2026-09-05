import { s2_global_value_cfg } from "auto/global_value";
import { s2_text_utils } from "auto/text";
import { AvatarComDefine } from "avatar/AvatarDefines";
import { AvatarEvent } from "avatar/AvatarEvent";
import { SceneTeamDataComponent } from "avatar/comp/impl/datacomp/SceneTeamDataComponent";
import { ActionName } from "base/Enum";
import { client_repo_ex_ } from "clientsdk/ClientRepoEx";
import { kit } from "common/kit";
import { MAPGROUP_CELL_SIZE, MAPGROUP_PLAYER_MOVE_SPEED } from "GlobalValue";
import { SceneEvent, SceneEventBus } from "lib/scene/SceneEvent";
import { SceneModel } from "lib/scene/SceneModel";
import { SceneStatus } from "lib/scene/SceneStatus";
import { FactionWarManager } from "s2/factionWar/FactionWarManager";
import { ContinuousFightState, FWarBuildingSideEnum, FactionWarBuildEnum, FactionWarBuilderConfsEntry, PlayerStateEnum } from "s2/factionWar/FactionWarServerEntry";
import { FactionWarEvent, FactionWarEventBus } from "s2/factionWar/util/FactionWarEventBus";
import { MainUIEvent, MainUIManager } from "s2/mainui/MainUIEvent";
import { CMainPlayPopupUI } from "s2/play/main/CMainPlayPopupUI";
import { GTeamMgr } from "s2/team/mgr/GTeamMgr";
import { SceneCNet } from "world/net/SceneCNet";
import { GSceneServerEvent, GSceneServerEventBus } from "world/scene/GSceneServerEvent";
import { scene_define } from "world/scene/scenedefine";
import { SceneViewMgrImpl, regSceneViewMgr } from "world/scene/sceneview/SceneViewMgrImpl";

type FactionWarSceneViewMgrData = {
    sceneId: number,
}

@regSceneViewMgr("FactionWarSceneViewMgr")
export class FactionWarSceneViewMgr extends SceneViewMgrImpl {
    private m_firstOverDoor: boolean = false;
    private m_targetGoToUid: string;
    private timer: number;

    protected init() {
        this.$sceneStatus = SceneStatus.FactionWarScene;
    }
    protected initArgs() {
        this.$mainRoleWalkArgs = {
            isWalkable: true,
            isTouchWalkable: true,
            isJoystickWalk: true,
            isAutoWalk: false,
        }

        // this.$renderNodeMaxCount = s2_global_value_cfg.GlobalValueInfo.SCENE_NODE_RENDER_CNT_LIMIT[1];
    }

    public enterScene(data?: FactionWarSceneViewMgrData): void {
        super.enterScene(data);
        MainUIManager.getInstance().dispatchEvent(new MainUIEvent(MainUIEvent.SHOW_HANG_UP, false));
        MainUIManager.getInstance().dispatchEvent(new MainUIEvent(MainUIEvent.SHOW_SLIDER, false));
        MainUIManager.getInstance().dispatchEvent(new MainUIEvent(MainUIEvent.SHOW_LIANGGONG, false));
        MainUIManager.getInstance().dispatchEvent(new MainUIEvent(MainUIEvent.SHOW_DRIVE, false));
        FactionWarEventBus.getInstance().dispatchEvent(new FactionWarEvent(FactionWarEvent.OPEN_SECEN_UI));
        FactionWarEventBus.getInstance().addEventListener(FactionWarEvent.START_FIGHT, this.updateStartFight, this);
        FactionWarEventBus.getInstance().addEventListener(FactionWarEvent.GOTO_BUILD, this.goToBuild, this);
        FactionWarEventBus.getInstance().addEventListener(FactionWarEvent.DIE, this.onLeaveDoor, this);
        FactionWarEventBus.getInstance().addEventListener(FactionWarEvent.TEAM_ABNORMAL_BLOCK, this.onTeamAbnormalBlock, this);
        FactionWarEventBus.getInstance().addEventListener(FactionWarEvent.TEAM_ABNORMAL_UNBLOCK, this.onTeamAbnormalUnblock, this);
        GSceneServerEventBus.getInstance().addEventListener(GSceneServerEvent.SERVER_FORCE_UPDATE_POS, this.onForceUpdatePos, this);
        SceneEventBus.getInstance().addEventListener(SceneEvent.SCENE_VIEW_ENTER_COMPLETE, this.onEventSceneViewEnterComplete, this);
        let _hero = this.sceneAvatarMgr.hero;
        if (_hero) {
            _hero.addEventListener(AvatarEvent.MAINROLE_MOVE, this.onRockerMoveStart, this);//点击地图移动
        }
        this.onLeaveDoor();
        // onFrame 常驻启动，在帧循环中统一检测城门跨越和队员异常状态
        UIManager.stage.addEventListener(egret.Event.ENTER_FRAME, this.onFrame, this);

    }



    public exitScene(): void {
        super.exitScene();
        if (this.timer) {
            egret.clearTimeout(this.timer);
        }
        this.m_firstOverDoor = false;
        MainUIManager.getInstance().dispatchEvent(new MainUIEvent(MainUIEvent.SHOW_HANG_UP, true));
        MainUIManager.getInstance().dispatchEvent(new MainUIEvent(MainUIEvent.SHOW_SLIDER, true));
        MainUIManager.getInstance().dispatchEvent(new MainUIEvent(MainUIEvent.SHOW_LIANGGONG, true));
        MainUIManager.getInstance().dispatchEvent(new MainUIEvent(MainUIEvent.SHOW_DRIVE, true));
        FactionWarEventBus.getInstance().dispatchEvent(new FactionWarEvent(FactionWarEvent.CLOSE_SECEN_UI));
        Logger.log("FactionWarSceneViewMgr exitScene");
        UIManager.closeByName('FactionWarSceneUI');
        FactionWarEventBus.getInstance().removeEventListener(FactionWarEvent.START_FIGHT, this.updateStartFight, this);
        FactionWarEventBus.getInstance().removeEventListener(FactionWarEvent.GOTO_BUILD, this.goToBuild, this);
        FactionWarEventBus.getInstance().removeEventListener(FactionWarEvent.DIE, this.onLeaveDoor, this);
        FactionWarEventBus.getInstance().removeEventListener(FactionWarEvent.TEAM_ABNORMAL_BLOCK, this.onTeamAbnormalBlock, this);
        FactionWarEventBus.getInstance().removeEventListener(FactionWarEvent.TEAM_ABNORMAL_UNBLOCK, this.onTeamAbnormalUnblock, this);
        GSceneServerEventBus.getInstance().removeEventListener(GSceneServerEvent.SERVER_FORCE_UPDATE_POS, this.onForceUpdatePos, this);
        SceneEventBus.getInstance().removeEventListener(SceneEvent.SCENE_VIEW_ENTER_COMPLETE, this.onEventSceneViewEnterComplete, this);
        FactionWarManager.getInstance().isDie = PlayerStateEnum.NORMAL;
        FactionWarManager.getInstance().mySide = 0;
        FactionWarManager.getInstance().isFight = ContinuousFightState.Disable;
        FactionWarManager.getInstance().isOverDoor = false;
        FactionWarManager.getInstance().building_confs = null;
        let _hero = this.sceneAvatarMgr.hero;
        if (_hero) {
            _hero.removeEventListener(AvatarEvent.MAINROLE_MOVE, this.onRockerMoveStart, this);//点击地图移动
        }
        this.updateStartFight();
        // 停止常驻 onFrame 监听
        UIManager.stage.removeEventListener(egret.Event.ENTER_FRAME, this.onFrame, this);
    }

    private onFrame() {
        // 检测队伍中是否存在异常成员，驱动城门动态阻挡添加/解除
        FactionWarManager.getInstance().checkAndApplyAbnormalBlock();
        
        let _hero = this.sceneAvatarMgr.hero;
        let path = this.sceneAvatarMgr.hero.getAvatarNearestCell(this.$ctx, _hero.x, _hero.y);
        if (!_hero) return;
        let side = FactionWarManager.getInstance().mySide;
        if (!side || side == FWarBuildingSideEnum.MID) return;
        let Door = side == FWarBuildingSideEnum.SIDE1 ? s2_global_value_cfg.GlobalValueInfo.FACTION_WAR_LEFTGATE_DYNAMIC_BLOCK_AREA : s2_global_value_cfg.GlobalValueInfo.FACTION_WAR_RIGHTGATE_DYNAMIC_BLOCK_AREA;
        let direction = this.judgePosition(Door, path.x, path.y);
        if (!this.m_firstOverDoor) {
            if (_hero.x < (Door[0][0] - 5) * MAPGROUP_CELL_SIZE || _hero.x > (Door[Door.length - 1][0] + 5) * MAPGROUP_CELL_SIZE) {//左边角落格子排除
                return;
            }

            if (side == FWarBuildingSideEnum.SIDE1 && direction == 3) {
                Logger.log("factionWar.m_firstOverDoor", _hero.x, _hero.y, side);
                this.m_firstOverDoor = true;
                let dynamicBlockArrForRightDoor = s2_global_value_cfg.GlobalValueInfo.FACTION_WAR_RIGHTGATE_DYNAMIC_BLOCK_AREA
                this.$ctx.mapGridPool.addDynamicBlock(dynamicBlockArrForRightDoor);
                FactionWarManager.getInstance().isOverDoor = true;
            }

            if (side == FWarBuildingSideEnum.SIDE2 && direction == 2) {
                Logger.log("factionWar.dynamicBlockArrForLeftDoor", _hero.x, _hero.y, side);
                this.m_firstOverDoor = true;
                let dynamicBlockArrForLeftDoor = s2_global_value_cfg.GlobalValueInfo.FACTION_WAR_LEFTGATE_DYNAMIC_BLOCK_AREA_EXT;
                this.$ctx.mapGridPool.addDynamicBlock(dynamicBlockArrForLeftDoor);
                FactionWarManager.getInstance().isOverDoor = true;
            }
        }
    }

    private onForceUpdatePos() {
        Logger.log("factionWar.updateStartFight", FactionWarManager.getInstance().isDie, FactionWarManager.getInstance().isFight);
        if (!FactionWarManager.getInstance().isDie && FactionWarManager.getInstance().isFight == ContinuousFightState.Fighting) {
            this.updateStartFight();
        }
        this.stopAction();
    }

    private onLeaveDoor() {
        Logger.log("factionWar.onLeaveDoor");

        this.onLeaveLeftDoor();
        this.onLeaveRightDoor();
        FactionWarManager.getInstance().isOverDoor = true;
    }

    /**
     * 队长视角下，队伍中存在异常成员时触发，添加左右两侧城门动态阻挡
     */
    private onTeamAbnormalBlock() {
        Logger.log("factionWar.onTeamAbnormalBlock");
        this.onLeaveLeftDoor();
        this.onLeaveRightDoor();
        FactionWarManager.getInstance().isOverDoor = true;
    }

    /**
     * 队长视角下，队伍异常成员恢复后触发，解除城门动态阻挡（DIE 状态时忽略）
     */
    private onTeamAbnormalUnblock() {
        Logger.log("factionWar.onTeamAbnormalUnblock");
        // DIE 阻挡优先，玩家死亡期间不提前解除
        if (FactionWarManager.getInstance().isDie === PlayerStateEnum.DIE) return;
        this.updateStartFight();
    }

    private onLeaveLeftDoor() {
        let dynamicBlockArrForLeftDoor = s2_global_value_cfg.GlobalValueInfo.FACTION_WAR_LEFTGATE_DYNAMIC_BLOCK_AREA;
        this.$ctx.mapGridPool.addDynamicBlock(dynamicBlockArrForLeftDoor);
    }

    private onLeaveRightDoor() {
        let dynamicBlockArrForRightDoor = s2_global_value_cfg.GlobalValueInfo.FACTION_WAR_RIGHTGATE_DYNAMIC_BLOCK_AREA
        this.$ctx.mapGridPool.addDynamicBlock(dynamicBlockArrForRightDoor);
    }

    private onRockerMoveStart() {
        this.stopAction();
    }

    private stopAction() {
        if (GTeamMgr.getInstance().isLeader)
            FactionWarEventBus.getInstance().dispatchEvent(new FactionWarEvent(FactionWarEvent.ACTIVATE_STOP));
    }


    private judgePosition(points: number[][], x: number, y: number) {
        const [x1, y1] = points[0];
        const [x2, y2] = points[points.length - 1];

        const dx = x2 - x1;
        const dy = y2 - y1;

        const value = dx * (y - y1) - dy * (x - x1);

        if (value > 0) return 2;//左边
        if (value < 0) return 3;//右边
        return 0;
    }

    // protected updateMainRoleWalk() {
    //     O3(FactionWarSceneUI, (inst: FactionWarSceneUI) => {
    //         inst.stopAction();
    //     }, this);
    //     super.updateMainRoleWalk();
    // }

    private updateStartFight() {
        Logger.log("factionWar.updateStartFight");
        this.m_firstOverDoor = false;
        this.$ctx.mapGridPool.clearDynamicBlock();
        FactionWarManager.getInstance().isOverDoor = false;
        if (FactionWarManager.getInstance().mySide == FWarBuildingSideEnum.SIDE1) {
            this.onLeaveRightDoor();
        }
        else if (FactionWarManager.getInstance().mySide == FWarBuildingSideEnum.SIDE2) {
            this.onLeaveLeftDoor();
        }
    }

    private goToBuild(evt: FactionWarEvent) {
        let data = evt.data.item as FactionWarBuilderConfsEntry;
        let pos = data.pos;



        let _hero = this.sceneAvatarMgr.hero;
        if (!_hero) {
            return;
        }

        let sceneTeamData = _hero.getComponent(AvatarComDefine.SceneTeamData) as SceneTeamDataComponent;
        if (sceneTeamData) { // 主角无队伍，屏幕跟随为主角
            if (!_hero.isLeader) {
                MessageBox(s2_text_utils.T(2010007));
                return;
            }
        }

        let centerPos = { x: _hero.x, y: _hero.y };
        let ePt: Point;
        if (SceneModel.getInstance().sceneStatusProxy.ctx.scene == 32005) {

            let npcs = SceneModel.getInstance().sceneAvatarUtils.searchNpcsWithRadius(centerPos, 1000);

            for (const npc of npcs) {
                Logger.log(npc.npcNo, FactionWarManager.getInstance().eliteNPC);
                if (npc.npcNo) {
                    this.m_targetGoToUid = npc.uuid;
                    ePt = { x: npc.posX, y: npc.posY };
                }
            }

        } else {
            this.m_targetGoToUid = data.eid;

            ePt = { x: pos[0], y: pos[1] };
        }


        if (!ePt)
            return;
        // 计算新的目标位置
        let tp: Point = SceneModel.getInstance().getFindAvatarTp(centerPos, ePt, true);

        if (tp) {
            let path = _hero.getAvatarMovePath(this.$ctx, tp.x, tp.y);
            if (path.length == 0) {
                return;
            }

            let sceneUtils = this.sceneAvatarUtils;
            let callback = kit.Handler.createOnce(this, this.doClickNpc);
            sceneUtils.moveAvatarTo(_hero, tp.x, tp.y, MAPGROUP_PLAYER_MOVE_SPEED, callback);
        } else {
            this.doClickNpc();
        }
    }

    private doClickNpc() {
        let npc = this.$ctx.getNpc(this.m_targetGoToUid);
        if (npc) {
            SceneCNet.C_CLICK_NPC_IN_SCENE(npc.serverEntityData.npcNo, this.m_targetGoToUid);
        }
        FactionWarEventBus.getInstance().dispatchEvent(new FactionWarEvent(FactionWarEvent.STOP_SELECT));
    }

    /**
   * 龙神大炮攻击城门
   * 流程：（龙神大炮）设置directoion -> （龙神大炮）转向 -> （龙神大炮）攻击 -> （龙神大炮）待机 + 城门受击流程
   * @param dragon_uid 龙神大炮 uid
   * @param door_uid 城门 uid
   * @returns 
   */
    public dragonAttack(dragon_uid: number, door_uid: number) {
        let building: FactionWarBuilderConfsEntry = FactionWarManager.getInstance().getBuildingInfo(dragon_uid);
        let door_npc: FactionWarBuilderConfsEntry = FactionWarManager.getInstance().getBuildingInfo(door_uid);
        if (!building)
            return;

        let dragon_npc = this.$ctx.getNpc(building.eid);
        if (dragon_npc && door_npc) {
            if (door_npc.side == FWarBuildingSideEnum.SIDE1) {
                dragon_npc.direction = 0;//向右转
            } else {
                dragon_npc.direction = 2;//向左转
            }
            dragon_npc.play(ActionName.TURN, 1);
            dragon_npc.once(AvatarEvent.ACTIONCOMPLETE, () => {
                dragon_npc.attack(() => {
                    dragon_npc.stand();//恢复站立
                    this.doorHit(door_uid);
                }, this);
            }, this);
        } else if (door_npc) {
            this.timer = egret.setTimeout(() => { this.doorHit(door_uid); }, this, 2000);
        }
    }


    /**
     * 城门受击
     * 流程：爆炸受击 -> 待机（如果半血以下则是破损状态）
     */
    private doorHit(build_id: number, callback?: Function, thisObject?: any) {
        if (this.timer) {
            egret.clearTimeout(this.timer);
        }
        let buildInfo: FactionWarBuilderConfsEntry = FactionWarManager.getInstance().getBuildingInfo(build_id);
        if (!buildInfo) return;
        let door_npc = this.$ctx.getNpc(buildInfo.eid);
        if (!door_npc) return;
        door_npc.hit(() => {

            let cur_percent = buildInfo.hp / buildInfo.max_hp;
            if (buildInfo.type == FactionWarBuildEnum.CANNON && cur_percent <= 0.5) {
                door_npc.loop_die();//破损状态
            } else {
                door_npc.stand();
            }
            if (callback) {
                callback.call(thisObject, this);
            }
        }, this);
    }

    public refreshPlayer() {
        let pid = this.sceneAvatarMgr.hero.serverEntityData.uuid;
        let puppet = pid == client_repo_ex_.OwnSoul_?.uuid ? client_repo_ex_.OwnSoul_ : client_repo_ex_.ClientPuppets_[pid];
        if (!puppet) {
            return;
        }
        let _hero = this.sceneAvatarMgr.hero;
        if (_hero) {
            _hero.addEventListener(AvatarEvent.MAINROLE_MOVE, this.onRockerMoveStart, this);//点击地图移动
        }
        this.$ctx.refreshPlayer(pid, puppet);
    }

    public refreshNpc(building_confs: { [key: string]: FactionWarBuilderConfsEntry }) {
        for (let i in building_confs) {
            if (FactionWarManager.getInstance().mySide == building_confs[i].side) {
                let eid = building_confs[i].eid;
                if (!eid) continue;
                let npc = this.$ctx.getNpc(eid);
                if (!npc) continue;
                // this.$ctx.delNpc(eid);
                this.$ctx.addNpc(eid, npc.serverEntityData);
            }
        }
    }

    private onEventSceneViewEnterComplete(evt: SceneEvent) {
        Logger.log("onEventSceneViewEnterComplete", evt);
        Logger.log("onEventSceneViewEnterComplete", SceneModel.getInstance().sceneStatusProxy.ctx.scene);
        if (SceneModel.getInstance().sceneStatusProxy.ctx.scene == 32005 || SceneModel.getInstance().sceneStatusProxy.ctx.scene == 32004) {
            this.refreshPlayer();
        }
    }

    protected enterSceneComplete(createHero: boolean = true) {
        super.enterSceneComplete(createHero);
        let inst = UIManager.getInst(CMainPlayPopupUI) as CMainPlayPopupUI;
        if (uiLiveAndVisible(inst)) {
            UIManager.close(CMainPlayPopupUI);
        }
    }

    protected updateHeroTeamData(data: scene_define.SSceneTeamEventCommonData): void {
        super.updateHeroTeamData(data);
        let hero = this.$ctx.getHero();
        if (!hero || hero.avatarData.uid != data.uid) {
            return;
        }
        let sceneTeamData = hero.getComponent(AvatarComDefine.SceneTeamData) as SceneTeamDataComponent;
        if (sceneTeamData) { // 主角无队伍，屏幕跟随为主角
            let team = sceneTeamData.team;
            if (hero.isLeader && team) {
                FactionWarEventBus.getInstance().dispatchEvent(new FactionWarEvent(FactionWarEvent.UPDATE_ACE_GO, true));
            } else {
                FactionWarEventBus.getInstance().dispatchEvent(new FactionWarEvent(FactionWarEvent.UPDATE_ACE_GO, false));
            }
        } else {
            FactionWarEventBus.getInstance().dispatchEvent(new FactionWarEvent(FactionWarEvent.UPDATE_ACE_GO, false));

        }
    }
}