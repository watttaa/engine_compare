import { MAPGROUP_CELL_SIZE, MAPGROUP_PLAYER_MOVE_SPEED, uiAnimationPath } from "GlobalValue";
import { s2_global_value_cfg } from "auto/global_value";
import { NpcTypeEnum } from "auto/npc_type_enum";
import { AvatarComDefine } from "avatar/AvatarDefines";
import { component_define } from "avatar/comp/componentdefine";
import { SceneRandomWalkComponent } from "avatar/comp/impl/SceneRandomWalkComponent";
import { ClientPuppet } from "clientsdk/ClientPuppet";
import { client_repo_ex_ } from "clientsdk/ClientRepoEx";
import { serverentity_define } from "clientsdk/serverentity_define";
import { kit } from "common/kit";
import { MovieClipEx } from "lib/MovieClipEx";
import { map_define } from "lib/map/mapdefine";
import { SceneModel } from "lib/scene/SceneModel";
import { ForbidTouchNpcSceneStatusSet } from "lib/scene/SceneStatus";
import { scene_log } from "lib/scene/scene_log";
import { ISceneSubMgr } from "world/ISceneSubMgr";
import { World } from "world/World";
import { SceneCNet } from "world/net/SceneCNet";
import { GScenePrivateEntityCacheMgr } from "world/scene/buffer/GScenePrivateEntityCacheMgr";
import { CSceneNpc } from "world/scene/element/CSceneNpc";
import { CSceneOtherRole } from "world/scene/element/CSceneOtherRole";
import { CSceneAvatarLegacy } from "world/scene/element/legacy/CSceneAvatarLegacy";
import { scene_define } from "world/scene/scenedefine";

export class GSceneAvatarUtils extends egret.HashObject implements ISceneSubMgr {

    private ctx: World;

    public constructor(context: World) {
        super();
        this.ctx = context;
    }

    clear(): void {
    }
    dispose() {
        this.ctx = null;
    }

    private get mainRole() {
        return this.ctx.getHero();
    }

    // === RandomWalkComp
    /**
     * 更新到合理位置 & 尝试自动寻路
     * @param avatar 
     * @param walkable 
     * @param waitTime 
     * @returns 
     */
    public findAvatarWalkable(avatar: CSceneAvatarLegacy, walkable: boolean, waitTime: number = 0) {
        let walkComponent = avatar.getComponent(AvatarComDefine.RandomWalk) as SceneRandomWalkComponent;
        if (walkComponent) {
            if (walkable) {
                walkComponent.findWalkableWalk(waitTime);
            } else {
                walkComponent.findWalkableStop();
            }
        }
    }

    public updateAvatarAutoWalk(avatar: CSceneAvatarLegacy, auto: boolean) {
        let walkComponent = avatar.getComponent(AvatarComDefine.RandomWalk) as SceneRandomWalkComponent;
        if (walkComponent) {
            walkComponent.enableAutoWalk = auto;
        }
    }
    public updateAvatarTouchWalk(avatar: CSceneAvatarLegacy, touchWalk: boolean) {
        let walkComponent = avatar.getComponent(AvatarComDefine.RandomWalk) as SceneRandomWalkComponent;
        if (walkComponent) {
            walkComponent.walkEndMode = component_define.SEnumWalkEndMode.WALK;
            walkComponent.enableTouchWalk = touchWalk;
        }
    }
    public updateAvatarJoystickWalk(avatar: CSceneAvatarLegacy, joystickWalk: boolean) {
        let walkComponent = avatar.getComponent(AvatarComDefine.RandomWalk) as SceneRandomWalkComponent;
        if (walkComponent) {
            walkComponent.enableJoystickWalk = joystickWalk;
        }
    }

    // public updateAvatarRandowmWalkTouchMode(avatar: CSceneAvatarLegacy, walkTouchMode: RandomwWalkTouchMode) {
    //     let walkComponent = avatar.getComponent(AvatarComDefine.RandomWalk) as RandomWalkComponent;
    //     if (walkComponent) {
    //         walkComponent.touchWalkMode = walkTouchMode;
    //     }
    // }

    // public updateAvatarRandomWalkPause(avatar: CSceneAvatarLegacy, pause: boolean) {
    //     let walkComponent = avatar.getComponent(AvatarComDefine.RandomWalk) as RandomWalkComponent;
    //     if (walkComponent) {
    //         if (pause) {
    //             walkComponent.pause();
    //         } else {
    //             walkComponent.resume();
    //         }
    //     }
    // }



    // === avatar touch
    public setNpcTouchComp(npc: CSceneNpc, uuid: string, no: number, value: boolean) {
        npc.removeComponent(AvatarComDefine.ClickedNpc);

        if (npc.serverEntityData?.npcType == NpcTypeEnum.EFFECT) { // #53472 【专服】【孤竹城】玩法开发 1. 处理EFFECT类型NPC，不阻挡鼠标响应
            npc.setAvatarTouch(false);
            return; // mike todo: 临时处理，后续考虑转到CSceneAni
        }

        // add touch comp
        npc.setAvatarTouch(true);
        if (value && ForbidTouchNpcSceneStatusSet.indexOf(SceneModel.getInstance().sceneStatusProxy.status) < 0) {
            let npcServerData = npc.serverEntityData;
            let chase: boolean = npcServerData?.npcType == NpcTypeEnum.PET;

            let hitArea: HitAreaArgs = undefined;
            if (npcServerData?.npcType == NpcTypeEnum.TNSH) {
                const hitAreaCircle: HitAreaCircleArgs = {
                    type: "circle",
                    center: { x: 0, y: 0 },
                    radius: s2_global_value_cfg.GlobalValueInfo.SCENE_AVATAR_CLICK_RADIUS_1,
                };
                hitArea = hitAreaCircle;
            }

            let args: component_define.SNpcClickedArgs = {
                nid: no,
                eid: uuid,
                hitAreaArgs: hitArea,
                sid: SceneModel.getInstance().sceneId,
                player: this.mainRole,
                ctx: this.ctx,
                chase: chase,
            }
            npc.addComponent(AvatarComDefine.ClickedNpc, args);
        }
    }

    public setPlayerTouchComp(player: CSceneOtherRole, pid: string, value: boolean) {
        player.removeComponent(AvatarComDefine.ClickedPlayer);

        if (value) {
            let args: component_define.SPlayerClickedArgs = {
                pid: pid,
                sid: SceneModel.getInstance().sceneId,
                player: this.mainRole,
                ctx: this.ctx
            }
            player.addComponent(AvatarComDefine.ClickedPlayer, args);
        }
    }

    // === avatar ai
    public setNpcAiComp(npc: CSceneNpc, info: serverentity_define.IServerNpcProps) {
        this.setNpcChasePlayerComp(npc, info);
        this.setNpcChatPlayerComp(npc, info);
    }
    private setNpcChasePlayerComp(npc: CSceneNpc, info: serverentity_define.IServerNpcProps) {
        npc.removeComponent(AvatarComDefine.ChasePlayer);

        if (info.ai_comp && info.ai_comp.indexOf("chase_player") >= 0) {
            // fixme 导表
            let args: component_define.SChasePlayerArgs = {
                originPos: { x: info.posX, y: info.posY },
                alertDistance: 160,
                speed: 160,
                chaseMinTime: 200,
                idleMinTime: 200,
                leaderOnly: true
            };
            npc.addComponent(AvatarComDefine.ChasePlayer, args);
        }
    }
    private setNpcChatPlayerComp(npc: CSceneNpc, info: serverentity_define.IServerNpcProps) {
        npc.removeComponent(AvatarComDefine.ChatPlayer);

        if (info.ai_comp && info.ai_comp.indexOf("chat_player") >= 0) {
            let args: component_define.SNpcChatArgs = {
                distance: 30,
                npcNo: info.npcNo,
                npcId: info.uuid,
            }
            npc.addComponent(AvatarComDefine.ChatPlayer, args);
        }
    }

    // === avatar move & pos
    /**
     * 移动avatar到目标位置
     * @param avatar 
     * @param desX 
     * @param desY 
     * @param speed 
     * @param callback 
     */
    public moveAvatarTo(avatar: CSceneAvatarLegacy, desX: number, desY: number, speed: number = MAPGROUP_PLAYER_MOVE_SPEED, callback?: kit.Handler) {
        let path = avatar.getAvatarMovePath(this.ctx, desX, desY);

        let callBack2 = null;
        if (callback) {
            callBack2 = () => {
                if (callback) {
                    callback.run();
                }
            };
        }

        avatar.walkAlongPath(path, speed, callBack2);
    }

    public gotoNpcAndClick(uuid: string) {
        if (!this.heroCanGo()) {
            return;
        }

        let ctx = this.ctx;
        let hero = ctx.getHero();

        let npc = this.findNpcData(uuid);
        if (!npc) {
            return;
        }

        let npcType = npc.npcType;
        let npcNo = npc.npcNo;

        let npcDir = npc.direction;
        let noDirectionLimit = npc.noDirectionLimit;

        let sPt: Point = { x: hero.x, y: hero.y };
        let npcPt: Point = { x: npc.posX, y: npc.posY };
        let npcTp: Point = SceneModel.getInstance().getFindNpcTp(sPt, npcPt, npcType, npcDir, noDirectionLimit);

        if (!npcTp) {
            npcTp = { x: hero.x, y: hero.y };
        }

        this.gotoNpcAndClick2(npcTp, npcPt, npcNo, uuid);
    }

    public gotoNpcAndClick2(tp: Point, pt: Point, no: number, uuid: string = "") {
        if (!this.heroCanGo()) {
            return;
        }

        let ctx = this.ctx;
        let hero = this.ctx.getHero();

        let callBackFunc = () => {
            if (pt && (hero.x != pt.x || hero.y != pt.y)) {
                let direction = preload_utils_math.calcDirection(hero, pt);
                hero.direction = direction;
            }
            SceneCNet.C_CLICK_NPC_IN_SCENE(no, uuid);
        };

        const path = hero.getAvatarMovePath(ctx, tp.x, tp.y);
        hero.walkAlongPath(path, MAPGROUP_PLAYER_MOVE_SPEED, callBackFunc);
    }

    private heroCanGo(): boolean {
        let isFollow = SceneModel.getInstance().isFollower(true);
        if (isFollow) {
            return false;
        }

        let ctx = this.ctx;
        if (!ctx) {
            return false;
        }

        let hero = this.ctx.getHero();
        if (!hero) {
            return false;
        }

        return true;
    }

    private findNpcData(uuid: string): serverentity_define.IServerNpcProps {
        let npc: serverentity_define.IServerNpcProps = client_repo_ex_.ClientNpcs_[uuid];
        if (!npc) {
            npc = GScenePrivateEntityCacheMgr.getInstance().getNpc(uuid);
        }

        return npc;
    }

    /**强制更新位置（即瞬移） */
    public forceUpdateHeroToDest(serverData: scene_define.SForceUpdatePos) {
        let pos = serverData[1];
        let pos2: Point = { x: pos[0], y: pos.length > 2 ? pos[2] : pos[1] };

        let soul = client_repo_ex_.OwnSoul_;
        if (soul) {
            soul.pos = { x: pos2.x, y: pos2.y };
        }

        let sceneProxy = SceneModel.getInstance().sceneProxy;
        let hero = sceneProxy.getHero();
        if (!hero) {
            return;
        }

        if (hero.isFollower) {
            if (DEV) {
                scene_log.logTest(`[s->c pos forceUpdateHeroToDest] ${hero.serverEntityData.entityName} forceSet:true pos:[${pos2.x}, ${pos2.y}] (but isFollower return)`);
            }
            return;
        }

        let reachable = sceneProxy.reachable(pos2.x, pos2.y, hero.mapGridSide);
        if (!reachable) {
            if (DEV) {
                Logger.warn(`S_FORCE_UPDATE_POS = [${pos2.x}, ${pos2.y}], reachable = ${reachable} `);
            }
            let nearestCell = sceneProxy.getNearestCell(pos2.x, pos2.y, hero.mapGridSide);
            pos2 = { x: nearestCell.x * MAPGROUP_CELL_SIZE, y: nearestCell.y * MAPGROUP_CELL_SIZE };
        }

        hero.stopAndStand();
        hero.x = pos2.x;
        hero.y = pos2.y;

        if (DEV) {
            scene_log.logTest(`[s->c pos forceUpdateHeroToDest] ${hero.serverEntityData.entityName} forceSet:true pos:[${pos2.x}, ${pos2.y}]`);
        }

        let avatarMgr = SceneModel.getInstance().sceneAvatarProxy;
        avatarMgr.updateTeamPos(hero);
    }

    /**更新avatar坐标 */
    public setAvatarPos(avatar: CSceneAvatarLegacy, newGrid: { x: number, y: number }) {
        let oldGrid = this.ctx.convertWorldPosToGridCell(avatar.x, avatar.y);
        if (oldGrid.x === newGrid.x && oldGrid.y === newGrid.x) {
            return;
        }

        let newPos = this.ctx.convertCellPosToWorld(newGrid.x, newGrid.y);
        avatar.x = newPos.x;
        avatar.y = newPos.y;
    }


    // === api
    public get mapBlcokComplete() {
        let mapGrid = this.ctx.mapGridPool.getMapGrid();
        return mapGrid ? true : false;
    }

    public hideOtherRole() {
        let sceneMonitor = this.ctx.sceneMonitorMgr;
        sceneMonitor.setSceneAvatarsVisilbe({
            visible: false,
            /**当前设置avatars类型，default = TSceneAvatarType */
            avatarTypes: [scene_define.SAvatarType.OTHER_ROLE]
        });
    }

    public showOtherRole() {
        let sceneMonitor = this.ctx.sceneMonitorMgr;
        sceneMonitor.setSceneAvatarsVisilbe({
            visible: true,
            /**当前设置avatars类型，default = TSceneAvatarType */
            avatarTypes: [scene_define.SAvatarType.OTHER_ROLE]
        });
    }

    // =============================================
    private calculateSquaredDistance(p1: { x: number, y: number }, p2: { x: number, y: number }): number {
        return Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2);
    }

    private searchEntitiesWithRadius<T extends { posX: number, posY: number }>(
        entities: Record<string, T>,
        centerPos: { x: number, y: number },
        radius: number,
    ): T[] {
        const radiusSquared = radius * radius;
        const result: Array<T> = [];

        for (const id in entities) {
            const entity = entities[id];
            const entityPos = { x: entity.posX, y: entity.posY };
            const squaredDist = this.calculateSquaredDistance(centerPos, entityPos);

            if (squaredDist < radiusSquared) {
                result.push(entity);
            }
        }

        return result;
    }

    public searchPuppetsWithRadius(centerPos: { x: number, y: number }, radius: number): ClientPuppet[] {
        return this.searchEntitiesWithRadius(client_repo_ex_.ClientPuppets_, centerPos, radius);
    }

    public searchNpcsWithRadius(centerPos: { x: number, y: number }, radius: number, excludesNpcType: NpcTypeEnum[] = [NpcTypeEnum.TRANSPORT]): serverentity_define.IServerNpcProps[] {
        let dictPrivateNpc = GScenePrivateEntityCacheMgr.getInstance().dictNpc || {};
        let arrPrivateNpcs = this.searchEntitiesWithRadius(dictPrivateNpc, centerPos, radius);

        let dictPublicNpc = client_repo_ex_.ClientNpcs_;
        let arrPublicNpc = this.searchEntitiesWithRadius(dictPublicNpc, centerPos, radius);

        let allNpc = [...arrPrivateNpcs, ...arrPublicNpc];

        // 过滤掉一些npc
        if (excludesNpcType?.length > 0) {
            allNpc = allNpc.filter(npc => !excludesNpcType.includes(npc.npcType));
        }

        // 排序：NpcTypeEnum.TNSH -> NpcTypeEnum.DESTINY_BOX -> 其他
        allNpc.sort((a, b) => {
            const getPriority = (npcType: NpcTypeEnum): number => {
                switch (npcType) {
                    case NpcTypeEnum.TNSH:
                        return 0; // 最高优先级
                    case NpcTypeEnum.DESTINY_BOX:
                        return 1; // 第二优先级
                    default:
                        return 2; // 最低优先级
                }
            };

            const priorityA = getPriority(a.npcType);
            const priorityB = getPriority(b.npcType);

            // // 如果优先级相同，可以按距离排序（可选）
            // if (priorityA === priorityB) {
            //     const distanceA = preload_utils_math.distance({ x: a.posX, y: a.posY }, centerPos);
            //     const distanceB = preload_utils_math.distance({ x: b.posX, y: b.posY }, centerPos);
            //     return distanceA - distanceB;
            // }

            return priorityA - priorityB;
        });

        return allNpc;
    }

    // =============================================
    /**mike tips: 后续可扩展，比如场景ani，则使用CSceneAni */
    public playSceneVFX(data: scene_define.S_GUIDE_SHOW_SCENE_VFX) {
        let mc = new MovieClipEx();
        mc.setRes(uiAnimationPath("activity/vx_com_inlight.json"));

        let layer = this.ctx.getMapLayer(map_define.SMapLayer.deco);
        layer.addChild(mc);

        const [x, y] = data.world_pos;
        mc.x = x;
        mc.y = y;

        mc.play();
    }
}