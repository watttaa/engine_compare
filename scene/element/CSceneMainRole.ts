import { MAPGROUP_PLAYER_MOVE_SPEED } from "GlobalValue";
import { AvatarComDefine } from "avatar/AvatarDefines";
import { SceneRandomWalkComponent } from "avatar/comp/impl/SceneRandomWalkComponent";
import { client_repo_ex_ } from "clientsdk/ClientRepoEx";
import { serverentity_define } from "clientsdk/serverentity_define";
import { pool } from "common/pool";
import { map_define } from "lib/map/mapdefine";
import { searchParams_utils } from "login/SearchParamsUtils";
import { AreaMgr } from "world/area/AreaMgr";
import { GSceneValue } from "world/scene/GSceneValue";
import { CSceneRole } from "world/scene/element/CSceneRole";
import { scene_define } from "world/scene/scenedefine";
import { GSceneAvatarEvent, GSceneAvatarEventBus } from "world/scene/avatar/GSceneAvatarEvent";
import { AvatarEvent } from "avatar/AvatarEvent";
import { FactionWarManager } from "s2/factionWar/FactionWarManager";
import { MapGroup } from "lib/map/MapGroup";
import { CMapLayerCloud } from "lib/map/CMapLayerCloud";
import { SceneManager } from "lib/scene/SceneManager";

type TypeSceneMainRoleData = [AreaMgr, serverentity_define.IServerPlayerProps, map_define.SMapLayer];
export class CSceneMainRole extends CSceneRole<TypeSceneMainRoleData> implements pool.IPoolInstance {
    // ===pool

    static __pool__ = "CSceneMainRole";
    static capacity = 1;
    static create(args: TypeSceneMainRoleData): CSceneMainRole {
        let element = pool.create(CSceneMainRole, args) as CSceneMainRole;
        return element;
    }
    onCreate() {
        super.onCreate();

        this.touchChildren = this.touchEnabled = false;
    }

    static remove(inst: CSceneMainRole) {
        pool.remove(inst);
    }
    onRemove() {
        this.curPath = null;

        super.onRemove();
    }

    onDispose() {
    }

    _new(args: TypeSceneMainRoleData) {
        this.m_objArgs = args;
    }

    // ====
    avatarType: scene_define.SAvatarType = scene_define.SAvatarType.MAIN_ROLE;

    constructor(args: TypeSceneMainRoleData) {
        super(args);
    }

    private m_curPath: scene_define.SMainRoleCurPath;
    public set curPath(path: scene_define.SMainRoleCurPath) {
        this.m_curPath = path;
        GSceneAvatarEventBus.getInstance().dispatchEvent(new GSceneAvatarEvent(GSceneAvatarEvent.HERO_UPDATE_PATH));
    }
    public get curPath() {
        return this.m_curPath;
    }

    public walkByServer(path: any[], speed: number, callback?: Function, thisObject?: any, completeStand: boolean = true) {
        let duration = this.walkAlongPath(path, speed, callback, thisObject, completeStand);

        this.curPath = {
            s: [this.x, this.y], // 由于原先获取path会将当前位置splice掉，这里需要补上
            path: path,
            duration: duration,
        };
    }
    // ======== override =========
    public updateFlying() {
        let _isFlying = this.isFlying;

        GSceneValue.setFlying(_isFlying);

        super.updateFlying();

        if (_isFlying) {
            SceneManager.getInstance().setCameraTweenScale(scene_define.cameraFlyingScale);
        } else {
            SceneManager.getInstance().setCameraTweenScale(scene_define.cameraDefaultScale);
        }

        // 迷雾层显示更新
        let scene = this.areaMgr.ctx;
        let layerCloud = scene.getMapLayer(map_define.SMapLayer.cloud) as CMapLayerCloud;
        layerCloud.show = _isFlying;
    }

    public getAvatarMovePath(ctx: MapGroup, x: number, y: number, isMainRole?: boolean) {
        return super.getAvatarMovePath(ctx, x, y, true);
    }

    protected tryReloadPathing() {
        super.tryReloadPathing();
        GSceneAvatarEventBus.getInstance().dispatchEvent(new GSceneAvatarEvent(GSceneAvatarEvent.HERO_RELOAD_PATHING));
    }

    public walkAlongPath(path: any[], speed: number, callback?: Function, thisObject?: any, completeStand: boolean = true, armSpecSlide: boolean = true): number {
        if (LoginValue.InnerTest && searchParams_utils.sceneRoaming()) {
            speed = 1000;
        }
        if (this?.serverEntityData?.state === serverentity_define.SPropState.freeze)
            return;

        this.tryStopAutoNav();

        return super.walkAlongPath(path, speed, callback, thisObject, completeStand, armSpecSlide);
    }

    public walkTo(x: number, y: number, speed: number = MAPGROUP_PLAYER_MOVE_SPEED, callback?: Function, thisObject?: any, armSpecSlide: boolean = true): void {
        this.tryStopAutoNav();

        super.walkTo(x, y, speed, callback, thisObject, armSpecSlide);
    }

    public stand(): void {
        super.stand();

        this.curPath = null;

        this.tryStopAutoNav(); // mike todo : opt
    }

    private tryStopAutoNav() {
        if (this.isFollower) {
            // pass
        } else {
            this.stopAutoNavState();
        }
    }

    protected updatePos(): void {
        super.updatePos();

        if (FactionWarManager.getInstance().isFight) {
            this.dispatchEvent(new AvatarEvent(AvatarEvent.MAINROLE_MOVE));
        }

        // scene_log.log(`[CSceneMainRole] pos = [${this.x}, ${this.y}]`);
    }

    private stopAutoNavState() {
        GSceneValue.setAutoNav(false);
    }

    // ======= 获得场景主角的状态
    get randomWalkComp() {
        return this.getComponent(AvatarComDefine.RandomWalk) as SceneRandomWalkComponent;
    }

    get isGhost() {
        let soul = client_repo_ex_.OwnSoul_;
        return soul.isGhost;
    }


    // ======== override =========
    get renderPriority(): number {
        return 0;
    }

    // ============debug
    public gotoMapPos(x: number, y: number) {
        if (!DEBUG) {
            return;
        }

        if (!this.randomWalkComp) {
            return true;
        }

        this.randomWalkComp.gotoMapPos({ x: x, y: y });
    }
}