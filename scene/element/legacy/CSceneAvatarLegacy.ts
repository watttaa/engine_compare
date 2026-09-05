
// 由于历史原因，不太好改，比如寻路都是直接操作Avatar(extends DisplayObjContainer)的坐标。还有，组件应该绑定在CSceneNode，而现在都绑定在Avatar上。改动大。
// 想让Avatar继承自CSceneNode，但是又需要将Scene-Avatar和其他Avatar分开，同时Scene-Avatar也想做些适配场景相关内容。

import { s2_model_cfg } from "auto/model";
import { Avatar } from "avatar/Avatar";
import { AvatarComDefine, AvatarData } from "avatar/AvatarDefines";
import { BaseComponent, DisplayComponent } from "avatar/comp/BaseComponent";
import { component_define } from "avatar/comp/componentdefine";
import { ActionName } from "base/Enum";
import { serverentity_define } from "clientsdk/serverentity_define";
import { kit } from "common/kit";
import { pool } from "common/pool";
import { utils } from "common/utils";
import { map_define } from "lib/map/mapdefine";
import { AreaMgr } from "world/area/AreaMgr";
import { GSceneValue } from "world/scene/GSceneValue";
import { GSceneAvatarFactory } from "world/scene/element/GSceneAvatarFactory";
import { CSceneAvatarLegacyAdapter } from "world/scene/element/legacy/CSceneAvatarLegacyAdapter";
import { ISceneNodeMonitor } from "world/scene/monitor/ISceneNodeMonitor";
import { scene_define } from "world/scene/scenedefine";


function createAvatarComponent(avatar: CSceneAvatarLegacy, avatarData: AvatarData): void {
    GSceneAvatarFactory.getInstance().createAvatarComponent(avatar, avatarData);
}

function refreshAvatar(avatar: CSceneAvatarLegacy, _data: AvatarData, isClear: boolean = true) {
    GSceneAvatarFactory.getInstance().refreshAvatar(avatar, _data, isClear);
}

// =============================================================================
export abstract class CSceneAvatarLegacy<T = any> extends Avatar implements pool.IPoolInstance, ISceneNodeMonitor {
    private shape: egret.Shape;

    onCreate() {
        if (component_define.lazyLoadPhaseA) {
            // 方案 A：先创建 Adapter + joinNode（确定 isVisual），再创建组件
            if (!this.m_objAdapter) {
                this.m_objAdapter = CSceneAvatarLegacyAdapter.create([this.areaMgr, this, this.mapLayer]);
            }
            createAvatarComponent(this, this.avatarData);
        } else {
            // 原始顺序
            createAvatarComponent(this, this.avatarData);
            if (!this.m_objAdapter) {
                this.m_objAdapter = CSceneAvatarLegacyAdapter.create([this.areaMgr, this, this.mapLayer]);
            }
        }

        let scale = 1;
        if (this.avatarData?.body) {
            scale = s2_model_cfg.ModelInfo[this.avatarData?.body]?.[s2_model_cfg.cFollowSize];
        }else if (this.avatarData?.vehicle_data?.model) {
            scale = s2_model_cfg.ModelInfo[this.avatarData?.vehicle_data?.model]?.[s2_model_cfg.cFollowSize];
        }else if (this.avatarData.ride) {
            scale = s2_model_cfg.ModelInfo[this.avatarData.ride]?.[s2_model_cfg.cFollowSize];
        }
        
        this.scale = scale || 1;

        if (DEBUG) {
            if (!this.shape) {
                this.shape = new egret.Shape();
                this.shape.graphics.beginFill(0xff0000, 1);
                this.shape.graphics.drawCircle(0, 0, 4);
                this.shape.graphics.endFill();
            }

            this.addChild(this.shape);
            this.shape.z = 9999;
        }
    }
    onRemove() {
        if (this.m_objAdapter) {
            CSceneAvatarLegacyAdapter.remove(this.m_objAdapter);
        }

        // this.clearCallLater();

        this.reset();
        this.destroy();

        this.m_nScale = 1;

        this.m_objAdapter = null;
        this.m_objArgs = null;
    }
    onDispose() {
    }

    get objArg() {
        return this.m_objArgs;
    }

    _new(args: T) {
        this.m_objArgs = args;
    }

    abstract avatarType: scene_define.SAvatarType;

    abstract get areaMgr(): AreaMgr;
    abstract get serverEntityData(): serverentity_define.IServerEntityProps;

    abstract get mapLayer(): map_define.SMapLayer;
    abstract set mapLayer(layer: map_define.SMapLayer);

    protected m_objAdapter: CSceneAvatarLegacyAdapter;

    protected m_objArgs: T;

    constructor(args: T) {
        super();

        this.init();

        this._new(args);
    }

    protected init() {
    }

    protected clearCallLater() {
        kit.timer.clearLater(this, this.updatePos);
        kit.timer.clearLater(this, this.updateZorder);
    }

    protected getWalkSpeedScaleReal() {
        let scale = super.getWalkSpeedScaleReal();
        if (DEV) {
            scale *= GSceneValue.debugWalkSpeedScale;
        }
        return scale;
    }

    // protected onFlyAvatarStateChanged(value: AvatarFlyConf.AvatarState, directlySwitch: boolean): void {
    //     super.onFlyAvatarStateChanged(value, directlySwitch);
    // }

    public updateFlying() {
        // pass
    }

    private m_nScale: number = 1;

    protected setScale(value: number): void {
        if (ProfileConfig.NOT_SCALE_MAP_HERO) {
            value = 1.0;
        }

        this.m_nScale = value;

        this.updateScale();
    }

    /** 是否应用飞行缩放系数；NPC/怪物默认 false，Role 类型覆写为 true */
    protected get applyFlyingScaleFactor(): boolean {
        return false;
    }

    protected updateScale() {
        let val = this.m_nScale;
        if (this.applyFlyingScaleFactor && GSceneValue.getFlying()) {
            val *= scene_define.avatarFlyingScaleFactor;
        }
        super.setScale(val);
    }

    public get isMainRole() {
        return this.avatarType == scene_define.SAvatarType.MAIN_ROLE;
    }

    get avatarData() {
        return this.serverEntityData.avatarStyle;
    }


    refreshServerData(_data: serverentity_define.IServerEntityProps) {
        this.m_objArgs[1] = _data;

        this.refreshAvatar();
    }
    protected refreshAvatar() {
        refreshAvatar(this, this.avatarData);
    }

    // ==== adapter for AreaMgr
    $setX(value: number): boolean {
        let suc = super.$setX(value);

        // kit.timer.callLater(this, this.updatePos);
        this.updatePos();

        return suc;
    }

    $setY(value: number): boolean {
        let suc = super.$setY(value);

        // kit.timer.callLater(this, this.updatePos);
        this.updatePos();

        this.z = this.y;

        return suc;
    }

    // ===== override
    protected initShadow(): void {
        // 场景内的avatar不需要阴影
    }

    public play(action: ActionName, times?: number, defAction: ActionName = undefined, force: boolean = false) {
        super.play(action, times, defAction, force);

        // 目前只考虑场景内
        this.updateActionTimeScale();
    }

    /** 宿主（场景节点）对 Avatar 施加的逻辑可见性约束（无 Adapter 时默认 true） */
    public isHostVisible(): boolean {
        return this.m_objAdapter ? this.m_objAdapter.isVisual : true;
    }

    public getIfCheckFigureVisible(): boolean {
        if (this.m_objArgs && this.serverEntityData?.is_private) {
            // mike tips： 由于S_PLOT_PLAYER_INFO，会通过创建私有other_role来代替主角，此时如果开启纯享模式，那么这个假的主角就不显示了。先苟一下。
            return false;
        }

        return true;
    }

    // ===== override setZ
    $setZ(value: number): boolean {
        if (this.$z == value) {
            return false;
        }
        super.$setZ(value); // this.$z = value;

        kit.timer.callLater(this, this.updateZorder);

        return true;
    }

    updateZorder() {
        utils.updateOrder(this.parent?.$children);
    }

    $setAlpha(value: number): void {
        super.$setAlpha(value);
    }

    protected updatePos() {
        this.m_objAdapter?.updatePos();
    }


    // ==========
    updateFigureVisible(): void {
        let _avatar = this;

        // 遍历所有显示DisplayComponent进行设置
        let components = _avatar.compontents;
        components.forEach((comp: BaseComponent, key: AvatarComDefine) => {
            if (comp instanceof DisplayComponent) {
                comp.updateVisible();
            }
        }, this);
    }

    /**
     * 由于avatar可以被多重设置了来控制visible，自身设置 & 场景管理设置。
     * 这里负责自身设置，从而与场景管理设置区别开。然后在CSceneAvatarLegacy.setVisible2进行合并，最终设置avatar的显隐藏
     * 
     * @param bol 
     */
    setVisible2(bol: boolean): void {
        this.m_objAdapter.setVisible2(bol);
    }

    getVisible2(): boolean {
        return this.m_objAdapter.getVisible2();
    }

    // ======== implements ISceneNodeMonitor =========
    get renderPriority(): number {
        return 1;
    }
}