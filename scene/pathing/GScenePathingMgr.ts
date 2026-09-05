import { s2_open_ui_cfg } from "auto/open_ui";
import { s2_scene_cfg } from "auto/Scene";
import { s2_text_utils } from "auto/text";
import { utils } from "common/utils";
import { MAPGROUP_PLAYER_MOVE_SPEED } from "GlobalValue";
import { scene_log } from "lib/scene/scene_log";
import { SceneEvent, SceneEventBus } from "lib/scene/SceneEvent";
import { SceneModel } from "lib/scene/SceneModel";
import { FactionWarManager } from "s2/factionWar/FactionWarManager";
import { ContinuousFightState } from "s2/factionWar/FactionWarServerEntry";
import { ISceneSubMgr } from "world/ISceneSubMgr";
import { SceneCNet } from "world/net/SceneCNet";
import { GSceneAvatarEvent, GSceneAvatarEventBus } from "world/scene/avatar/GSceneAvatarEvent";
import { GSceneValue } from "world/scene/GSceneValue";
import { scene_define } from "world/scene/scenedefine";
import { World } from "world/World";

/**(多)场景寻路管理器 */
export class GScenePathingMgr extends egret.HashObject implements ISceneSubMgr {
    private ctx: World;

    constructor(ctx: World) {
        super();

        this.ctx = ctx;

        this.onInit();
    }

    clear(): void {
    }
    dispose() {
        this.ctx = null;

        this.stopMoveToDest();
    }

    private onInit() {
        SceneEventBus.getInstance().addEventListener(SceneEvent.SCENE_VIEW_ENTER_COMPLETE, this.onSceneViewEnterComplete, this);
        GSceneAvatarEventBus.getInstance().addEventListener(GSceneAvatarEvent.HERO_RELOAD_PATHING, this.heroReloadPathing, this);
    }

    private onSceneViewEnterComplete() {
        this.moveNextPath();
    }

    private m_objMoveData: scene_define.S_MOVE_TO_DEST_EX;
    public get objMoveData(): scene_define.S_MOVE_TO_DEST_EX {
        return this.m_objMoveData;
    }
    public set objMoveData(value: scene_define.S_MOVE_TO_DEST_EX) {
        this.nextIdx = 0;

        this.m_objMoveData = value;
    }

    private curPath: scene_define.SMovePath;
    private nextIdx: number = 0;

    public startMoveToDest(data: scene_define.S_MOVE_TO_DEST_EX) {
        this.objMoveData = data;

        if (DEV) {
            scene_log.log(`[#GScenePathingMgr] startMoveToDest paths:${JSON.stringify(data.move_path)}`);
        }

        this.moveNextPath();
    }
    public stopMoveToDest() {
        this.objMoveData = null;

        if (DEV) {
            scene_log.log(`[#GScenePathingMgr] stopMoveToDest`);
        }
    }

    private stopHeroMove() {
        let hero = this.ctx?.getHero();
        if (hero) {
            hero.stopAndStand();
        }
    }

    private moveNextPath() {
        if (!this.objMoveData) {
            return;
        }

        let paths = this.objMoveData.move_path || [];
        if (paths.length <= 0) {
            this.objMoveData = null;
            return;
        }

        let _curPath = paths[0];
        let curSceneId = SceneModel.getInstance().sceneProxy.sceneId;
        if (curSceneId != _curPath.target_scene) {
            // 场景不同，待场景切换完成后，再继续寻路
            scene_log.log(`[#GScenePathingMgr] moveNextPath curSceneId:${curSceneId} target_scene:${_curPath.target_scene} waiting for scene change`);
            this.stopHeroMove();
            return;
        }

        this.curPath = paths.shift();
        this.nextIdx++;

        this.startMovePath();
    }
    private startMovePath() {
        let hero = this.ctx.getHero();
        if (!hero) {
            return;
        }

        if (this.curPath.move_type != scene_define.SMoveType.DIRECT) { // 跳过
            this.moveNextPath();
            return;
        }

        this.tryJumpPos();

        let destInfo = this.curPath;

        let pos = destInfo.target_pos;

        if (DEV) {
            let curSceneId = SceneModel.getInstance().sceneProxy.sceneId;
            scene_log.log(`[#GScenePathingMgr] startMovePath curSceneId:${curSceneId} target_scene:${destInfo.target_scene} target_pos:${destInfo.target_pos}`);
        }

        let sPt: Point = { x: hero.x, y: hero.y };
        let ePt: Point = { x: pos[0], y: pos[1] };

        let callBackFunc = () => {
            if (destInfo.npc_no) {
                let direction = preload_utils_math.calcDirection(hero, { x: ePt.x, y: ePt.y });
                hero.direction = direction;
            }

            GSceneAvatarEventBus.getInstance().dispatchEvent(new GSceneAvatarEvent(GSceneAvatarEvent.HERO_MOVE_TO_DEST_COMPLETE));
            this.movePathFinish();
        };

        GSceneValue.setTargetNpcNo(destInfo.npc_no || 0);

        let findDis = 0;
        let noDirectionLimit = true;
        let dir = 0;
        if (destInfo.npc_no) {
            let npcDestInfo = SceneModel.getInstance().getFindNpcDestInfo(destInfo.npc_type);
            findDis = npcDestInfo.findDistance;

            noDirectionLimit = destInfo.no_yaw_limit;
            dir = destInfo.npc_yaw || 0;
        }

        let tp: Point = SceneModel.getInstance().getFindAvatarTp(sPt, ePt, noDirectionLimit, dir, findDis);

        if (tp) {
            let path = hero.getAvatarMovePath(this.ctx, tp.x, tp.y);
            scene_log.log(`[#GScenePathingMgr] startMovePath path(${path.length}):${path}`);
            if (path.length !== 0) {
                GSceneAvatarEventBus.getInstance().dispatchEvent(new GSceneAvatarEvent(GSceneAvatarEvent.HERO_MOVE_TO_DEST, path));

                hero.walkByServer(path, MAPGROUP_PLAYER_MOVE_SPEED, callBackFunc);

                if (this.objMoveData.auto_type) {
                    GSceneValue.setAutoNav(true, { tips: this.objMoveData.text_tip, type: this.objMoveData.auto_type });
                }
            } else {
                if (DEV) {
                    let startCell = this.ctx.convertWorldPosToGridCell(sPt.x, sPt.y);
                    let endCell = this.ctx.convertWorldPosToGridCell(tp.x, tp.y);
                    if (startCell.x == endCell.x && startCell.y == endCell.y) {
                        // 起终点落在同一格子，无需移动，属正常现象
                        scene_log.log(`[#GScenePathingMgr] startMovePath path empty: same grid cell (${startCell.x},${startCell.y}) sPt(${sPt.x},${sPt.y}) tp(${tp.x},${tp.y})`);
                    } else {
                        // 不同格子但寻路返回空，说明路径被障碍阻断
                        scene_log.warn(`[#GScenePathingMgr] startMovePath path BLOCKED: startCell(${startCell.x},${startCell.y}) endCell(${endCell.x},${endCell.y}) sPt(${sPt.x},${sPt.y}) tp(${tp.x},${tp.y})`);
                    }
                }
                let sceneInfo = s2_scene_cfg.SceneInfo[this.curPath.target_scene];
                if (sceneInfo[s2_scene_cfg.open_id] == s2_open_ui_cfg.FACTION_WAR) {
                    if (FactionWarManager.getInstance().isFight == ContinuousFightState.Fighting) {
                        MessageBox(s2_text_utils.T(2052245));
                    }
                }
                // callBackFunc();
                hero.walkByServer(path, MAPGROUP_PLAYER_MOVE_SPEED, callBackFunc);
            }
        } else {
            scene_log.log(`[#GScenePathingMgr] startMovePath tp undefined`);
            // callBackFunc();
            hero.walkByServer([], MAPGROUP_PLAYER_MOVE_SPEED, callBackFunc);
        }
    }
    private heroReloadPathing() {
        if (this.objMoveData && this.curPath) {
            scene_log.log(`[#GScenePathingMgr] heroReloadPathing`);
            this.startMovePath();
        }
    }

    private tryJumpPos() {
        let hero = this.ctx.getHero();
        if (!hero) {
            return;
        }

        if (!this.curPath.jump_check_pos) {
            return;
        }

        // 比较主角当前位置与jump_check_pos，哪个距离target_pos更近，就跳哪个位置
        let jumpPos = this.findBestJumpPoint([[hero.x, hero.y], this.curPath.jump_check_pos], this.curPath.target_pos);

        let jumpPosSuc = false;
        if (jumpPos[0] != hero.x || jumpPos[1] != hero.y) {
            jumpPosSuc = true;
            if (DEV) {
                scene_log.log(`[#GScenePathingMgr] tryJumpPos success jumpPos:${jumpPos}`);
            }
        }
        hero.x = jumpPos[0];
        hero.y = jumpPos[1];

        // 强刷下一队伍的位置
        if (jumpPosSuc) {
            let avatarMgr = SceneModel.getInstance().sceneAvatarProxy;
            avatarMgr.updateTeamPos(hero);
        }
    }

    private movePathFinish() {
        if (!this.objMoveData || !this.curPath) {
            return;
        }

        if (this.curPath.move_type == scene_define.SMoveType.DIRECT) {
            SceneCNet.C_ARRIVE_AT_DEST_EX(this.objMoveData.action_id, this.curPath.idx);
        }

        let nextPath = this.objMoveData.move_path[this.nextIdx];
        if (nextPath && nextPath.target_scene == this.curPath.target_scene) {
            // 同场景的话，继续下一个路径
            this.moveNextPath();
        } else {
            // pass
            // 待切完场景后继续下一个路径
        }

        this.curPath = null;
    }


    // == utils ==
    private distanceThreshold: number = 1000;
    /**
    * @param transPointList 指定跳转点列表，首位为主角当前位置
    * @param end 终点坐标
    * @returns 
    */
    private findBestJumpPoint(transPointList: [number, number][], end: [number, number]): [number, number] {
        let minDistance: number = Number.MAX_SAFE_INTEGER;

        // 找出距离end最近的行走距离的跳转点
        let bestPointIndex: number = 0;
        let foundSuitablePoint: boolean = false;

        for (let index = 0; index < transPointList.length; index++) {
            const element = transPointList[index];

            if (element[0] == end[0] && element[1] == end[1]) {
                return element;
            }

            let path = this.getMovePath(end, element);
            let distance = utils.Math2.calculatePathDistance(path);

            let validPath = path?.length > 1;

            if (validPath && distance < this.distanceThreshold) {
                return element;
            }

            // 记录距离最短的跳转点
            if (validPath && distance < minDistance) {
                minDistance = distance;
                bestPointIndex = index;
                foundSuitablePoint = true;
            }
        }

        // 找到跳转点
        if (foundSuitablePoint) {
            let pt = transPointList[bestPointIndex];
            return pt;
        }

        // 返回主角当前位置
        return transPointList[0];
    }
    private getMovePath(endPos: [number, number], startPos: [number, number]) {
        let worldProxy = SceneModel.getInstance().sceneProxy;
        const path = worldProxy.getMovePath(endPos[0], endPos[1], startPos[0], startPos[1]);
        path.unshift(startPos);
        return path;
    }

}