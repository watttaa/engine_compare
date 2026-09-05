import { AvatarComDefine } from "avatar/AvatarDefines";
import { client_repo_ex_ } from "clientsdk/ClientRepoEx";
import { kit } from "common/kit";
import { scene_log } from "lib/scene/scene_log";
import { SceneEvent, SceneEventBus } from "lib/scene/SceneEvent";
import { SceneManager } from "lib/scene/SceneManager";
import { SceneModel } from "lib/scene/SceneModel";
import { SceneViewMgrBase } from "lib/scene/SceneViewMgrBase";
import { gameplay_ui_culling } from "lib/GamePlayUICulling";
import { JoystickManager } from "s2/mainui/joystick/JoystickManager";
import { GSceneValue } from "world/scene/GSceneValue";
import { SceneCNet } from "world/net/SceneCNet";
import { GSceneAvatarEvent, GSceneAvatarEventBus } from "world/scene/avatar/GSceneAvatarEvent";
import { GSceneMonitorMgr } from "world/scene/monitor/GSceneMonitorMgr";
import { scene_define } from "world/scene/scenedefine";
import { sceneview_utils } from "world/scene/sceneview/sceneview_utils";
import { GSceneTeamEvent, GSceneTeamEventBus } from "world/scene/team/GSceneTeamEvent";

/** 装饰器，用于注册场景界面管理器 */
export function regSceneViewMgr<T extends keyof sceneview_utils.SceneViewMgrTag>(name: T) {
    return function (cls: any) {
        sceneview_utils.sceneViewMgrs[name] = cls;
    }
}

type TypeMainRoleWalk = {
    isWalkable: boolean,
    isTouchWalkable: boolean,
    isJoystickWalk: boolean,
    isAutoWalk: boolean,
}

export abstract class SceneViewMgrImpl extends SceneViewMgrBase {
    protected closeUICls: any[]; // 退出场景后需要关掉的界面

    protected $mainRoleWalkArgs: TypeMainRoleWalk;

    protected $renderNodeMaxCount: number;

    constructor() {
        super();

        this.closeUICls = [];

        this.init();
        this.initArgs();
    }

    protected abstract init(): void;
    protected abstract initArgs(): void;


    protected get sceneMgr() {
        return SceneManager.getInstance();
    }

    protected get sceneModel() {
        return SceneModel.getInstance();
    }

    protected get sceneAvatarMgr() {
        return this.sceneModel.sceneAvatarProxy;
    }

    protected get sceneAvatarUtils() {
        return this.sceneModel.sceneAvatarUtils;
    }

    protected get sceneTeamMgr() {
        return this.sceneModel.sceneTeamMgr;
    }

    public enterScene(data?: any) {
        super.enterScene(data);

        this.$ctx.sceneMonitorMgr.maxRenderNodeCount = this.$renderNodeMaxCount;

        // team
        // GSceneAvatarEventBus.getInstance().addEventListener(GSceneAvatarEvent.HERO_FOLLOW_STATE_CHANGE, this.updateFollowStatus, this);
        GSceneTeamEventBus.getInstance().addEventListener(GSceneTeamEvent.TEAM_ID_UPDATE, this.updateTeamId, this);
        GSceneTeamEventBus.getInstance().addEventListener(GSceneTeamEvent.TEAM_LEADER_CHANGE, this.updateLeaderId, this);

        SceneEventBus.getInstance().addEventListener(SceneEvent.SCENE_VIEW_UPDATE_JOYSTICK, this.updateJoystick, this);

        // // resume一下，因为有可能在其他玩法被pause了
        // this.$sceneAvatarMgr.resume();
        this.registerPauseAndResumeCallback();

        this.enterSceneComplete();
    }

    public reEnterScene(data?: any) {
        super.reEnterScene(data);

        this.enterSceneComplete();
    }

    protected enterSceneComplete(createHero: boolean = true) {
        if (createHero) {
            let hero = this.$ctx.createHero();
            if (!hero) {
                return;
            }
        }

        this.$ctx.enableFixArea = true;

        sceneview_utils.setSceneViewEnterStatus("end");

        this.updateMainRoleWalk();
        // this.updateRobotsWalk();

        scene_log.log(`[SceneViewMgrImp] SCENEVIEW_ENTER_COPLETE`);
        scene_log.logSceneStep(scene_log.SceneStep.SCENE_VIEW_ENTER, this.sceneModel.sceneId, GSceneValue.getSceneType());
        SceneEventBus.getInstance().dispatchEvent(new SceneEvent(SceneEvent.SCENE_VIEW_ENTER_COMPLETE));

        scene_log.logSceneStep(scene_log.SceneStep.NOTICE_SCENE_COMPLETE, this.sceneModel.sceneId, GSceneValue.getSceneType());
        SceneCNet.C_NOTICE_SCENE_COMPLETE(this.sceneModel.sceneId);
    }

    public exitScene() {
        // team
        // GSceneAvatarEventBus.getInstance().removeEventListener(GSceneAvatarEvent.HERO_FOLLOW_STATE_CHANGE, this.updateFollowStatus, this);
        GSceneTeamEventBus.getInstance().removeEventListener(GSceneTeamEvent.TEAM_ID_UPDATE, this.updateTeamId, this);
        GSceneTeamEventBus.getInstance().removeEventListener(GSceneTeamEvent.TEAM_LEADER_CHANGE, this.updateLeaderId, this);

        SceneEventBus.getInstance().removeEventListener(SceneEvent.SCENE_VIEW_UPDATE_JOYSTICK, this.updateJoystick, this);

        this.closeUI();

        this.clearJoystick();

        sceneview_utils.setSceneViewEnterStatus("none");

        super.exitScene();
    }

    protected closeUI() {
        for (let cls of this.closeUICls) {
            if (!!cls) {
                UIManager.close(cls);
            }
        }
    }

    protected registerPauseAndResumeCallback() {
        // this.sceneMgr.registerPauseCallback(() => {
        // });

        // this.sceneMgr.registerResumeCallback(() => {
        // });
    }


    // ====================
    // team
    // ====================
    // protected updateFollowStatus(evt: GSceneAvatarEvent) {
    //     let hero = this.sceneAvatarMgr.hero;
    //     Logger.log(`[#SceneViewMgrImpl] updateFollowStatus Followleader: ${hero.hasComponent(AvatarComDefine.Followleader)} isFollow: ${hero.isFollower}`);
    //     kit.timer.callLater(this, this.updateMainRoleWalk);
    // }

    // protected updateRobotsWalk() {
    //     this.$sceneAvatarMgr.updateRobotsWalk(true, 1000);
    // }

    protected updateTeamId(evt: GSceneTeamEvent) {
        let data = evt.data as scene_define.SSceneTeamEventCommonData;

        this.updateHeroTeamData(data);
    }

    protected updateLeaderId(evt: GSceneTeamEvent) {
        let data = evt.data as scene_define.SSceneTeamEventCommonData;

        this.updateHeroTeamData(data);
    }

    protected updateHeroTeamData(data: scene_define.SSceneTeamEventCommonData) {
        if (data.uuid === client_repo_ex_.OwnSoul_.uuid) {
            kit.timer.callLater(this, this.updateMainRoleWalk);
        }
    }

    // ====================
    // 主角移动控制更新：
    // 比如：当玩家作为队员跟随队长时，不可进行移动
    // ====================
    protected updateMainRoleWalk() {
        let _hero = this.sceneAvatarMgr.hero;
        if (!_hero) {
            return;
        }

        // 更新点击寻路
        this.sceneAvatarUtils.updateAvatarTouchWalk(_hero, this.$mainRoleWalkArgs.isTouchWalkable && this.canControlWalk);

        // 更新摇杆寻路
        this.sceneAvatarUtils.updateAvatarJoystickWalk(_hero, this.$mainRoleWalkArgs.isJoystickWalk && this.canControlWalk);

        // 更新自动寻路
        this.sceneAvatarUtils.updateAvatarAutoWalk(_hero, this.$mainRoleWalkArgs.isAutoWalk && this.canControlWalk);

        // 寻找可行走坐标
        this.sceneAvatarUtils.findAvatarWalkable(_hero, true);

        // 更新摇杆
        this.updateJoystick();
    }

    /**主角是否能控制行走 */
    protected get canControlWalk(): boolean {
        let walkable = true;

        // 组队状态检查
        let hero = this.sceneAvatarMgr.hero;
        if (hero.isFollower) {
            walkable = false;
        }

        // 剧情模式
        if (gameplay_ui_culling.getOngoingCulling() == gameplay_ui_culling.ECulling.Plot) {
            walkable = false;
        }

        //特定场景内 玩家不能移动
        if (SceneModel.getInstance().playerStopMove) {
            walkable = false;
        }
        // 其他检查...

        return walkable;
    }

    // ====================
    // joystick
    // ====================
    private clearJoystick() {
        JoystickManager.getInstance().clear();
    }
    private updateJoystick() {
        let enable = this.$mainRoleWalkArgs.isJoystickWalk;

        if (enable) {
            JoystickManager.getInstance().agent = this.sceneAvatarMgr.hero;
        }

        JoystickManager.getInstance().enable = enable;
    }

    private m_direction: number = 0;
    private m_lastPoint = { x: 0, y: 0 };
    private m_points = [];
    public setDirectionByPointStart(direction: number) {
        this.m_direction = direction;
        let _hero = this.sceneAvatarMgr.hero;
        if (!_hero) return;
        this.m_lastPoint.x = _hero.x;
        this.m_lastPoint.y = _hero.y;
        this.m_points = [];
        UIManager.stage.addEventListener(egret.Event.ENTER_FRAME, this.onFrameTest, this);
    }

    public getDirectionByPoint() {
        UIManager.stage.removeEventListener(egret.Event.ENTER_FRAME, this.onFrameTest, this);
        Logger.log("m_points", this.m_points);
        // 转换成策划复制的格式

        const strFmt = this.m_points.map(p => `${parseInt(p.x)},${parseInt(p.y)}`).join('\n');
        debug_helper.showError("AvatarPoint", "", strFmt)
    }

    private onFrameTest() {
        let _hero = this.sceneAvatarMgr.hero;
        if (!_hero) return;
        let path = this.sceneAvatarMgr.hero.getAvatarNearestCell(this.$ctx, _hero.x, _hero.y);


        // 检测x是否超过[minX, maxX]或y是否超过[minY, maxY]
        const minX = this.m_lastPoint.x - this.m_direction;
        const maxX = this.m_lastPoint.x + this.m_direction;
        const minY = this.m_lastPoint.y - this.m_direction;
        const maxY = this.m_lastPoint.y + this.m_direction;

        if (_hero.x < minX || _hero.x > maxX || _hero.y < minY || _hero.y > maxY) {
            // 记录逻辑
            if (_hero.x != this.m_lastPoint.x && _hero.y != this.m_lastPoint.y) {
                this.m_lastPoint.x = _hero.x;
                this.m_lastPoint.y = _hero.y;
                Logger.log("factionWar.m_firstOverDoor", _hero.x, _hero.y);
                this.m_points.push({ x: _hero.x, y: _hero.y });
            }

        }

    }
}
