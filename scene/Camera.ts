import { GlobalEventSource, ListenEvent } from "GlobalEvent";
import { utils } from "common/utils";
import { ISceneSubMgr } from "world/ISceneSubMgr";
import { World } from "world/World";
import { GSceneValue } from "world/scene/GSceneValue";
import { scene_define } from "world/scene/scenedefine";

export class Camera extends egret.HashObject implements ISceneSubMgr {

    private timeObj = new egret.DisplayObject();

    private ctx: World;

    /**
     * 镜头绑定的对象
     * 
     * 具有x和y属性的对象即可
     */
    private m_objBindPoint: { x: number, y: number };
    public set objBindPoint(value: { x: number, y: number }) {
        if (value) {
            this.resume();
        } else {
            this.pause();
        }

        this.m_objBindPoint = value;
    }
    public get objBindPoint() {
        return this.m_objBindPoint;
    }

    private m_bFollower: boolean = true;
    /**用于外部取消镜头跟随 */
    public set bFollower(value: boolean) {
        const changed = this.m_bFollower !== value;
        this.m_bFollower = value;

        if (!this.m_bFollower) {
            // 停止跟随时，清除当前镜头位置
            this.resetPosition();
        }
    }
    public get bFollower() {
        return this.m_bFollower;
    }


    /**
     * 
     */
    private m_FolloweroffSet: Point;
    public set FolloweroffSet(value: Point) {
        if (!value) return;
        if(!isNotVain(value.x)){
            value.x = 0;
        }
        if(!isNotVain(value.y)){
            value.y = 0;
        }
        this.m_FolloweroffSet = value;
    }

    public get FolloweroffSet() {
        return this.m_FolloweroffSet || { x: 0, y: 0 };
    }

    constructor(worldProxy: World) {
        super();

        this.ctx = worldProxy;

        this.timeObj.addEventListener(egret.Event.ENTER_FRAME, this.onEnterFrame, this);

        ListenEvent(GlobalEventSource.START_WAR_EVENT, this.onEventStartWar, this);
        ListenEvent(GlobalEventSource.END_WAR_EVENT, this.onEventEndWar, this);
    }

    dispose() {
        // 退出游戏时重置 WorldPanel 缩放
        UIManager.WorldPanel.scaleX = UIManager.WorldPanel.scaleY = 1;

        this.ctx = null;
        this.timeObj?.removeEventListener(egret.Event.ENTER_FRAME, this.onEnterFrame, this);
    }

    protected onEnterFrame(evt: egret.Event) {
        if (!this.m_bRunning) {
            return;
        }

        if (!this.bFollower) {
            return;
        }

        if (!this.objBindPoint) {
            return;
        }

        // if (!this.objBindPoint.x || !this.objBindPoint.y) { // mike tips: 如果是飞行器，那么就会出现坐标为0的情况
        //     return;
        // }
        const currentTime = egret.getTimer();
        const deltaTime = (currentTime - this.lastFrameTime) / 1000;
        this.lastFrameTime = currentTime;

        this.centerScreenSmoothing(deltaTime);
    }

    private onEventStartWar(e: GlobalEventSource) {
        this.pause();
    }

    private onEventEndWar(e: GlobalEventSource) {
        this.resume();
    }

    private m_bRunning: boolean;

    public pause() {
        this.m_bRunning = false;
    }

    public resume() {
        this.m_bRunning = true;
    }

    // ===========
    private lastFrameTime: number = 0;

    private curPosition: utils.Math2.Vector2;
    private targetPosition: utils.Math2.Vector2;

    private squaredTeleportThreshold: number = 400 * 400;
    private lerpSpeed: number = 10;
    private centerScreenSmoothing(deltaTime: number) {
        let offset = this.FolloweroffSet;
        if (!this.curPosition) {
            this.curPosition = new utils.Math2.Vector2(this.m_objBindPoint.x, this.m_objBindPoint.y);
            this.targetPosition = new utils.Math2.Vector2(this.m_objBindPoint.x, this.m_objBindPoint.y);
            this.ctx.centerScreen(this.curPosition.x + offset.x, this.curPosition.y + offset.y);
            return;
        }

        this.targetPosition.x = this.m_objBindPoint.x;
        this.targetPosition.y = this.m_objBindPoint.y;
        const dx = this.targetPosition.x - this.curPosition.x;
        const dy = this.targetPosition.y - this.curPosition.y;
        if (dx == 0 && dy == 0) {
            return;
        }

        let squaredDx = dx * dx;
        if (squaredDx < 1e-6) {
            this.curPosition.x = this.targetPosition.x;
            squaredDx = 0;
        }
        let squaredDy = dy * dy;
        if (squaredDy < 1e-4) {
            this.curPosition.y = this.targetPosition.y;
            squaredDx = 0;
        }

        // 大于一定阈值，直接移动到目标点
        if (squaredDx > this.squaredTeleportThreshold || squaredDy > this.squaredTeleportThreshold) {
            this.curPosition.set(this.targetPosition.x, this.targetPosition.y);
        } else {
            let _position = utils.Math2.lerpPoint(this.curPosition, this.targetPosition, this.lerpSpeed * deltaTime);
            this.curPosition.set(_position.x, _position.y);
        }
      
        this.ctx.centerScreen(this.curPosition.x + offset.x, this.curPosition.y + offset.y);
        // Logger.log(`[#Camera] ${dx} ${dy}`);
    }

    // ====
    /**
     * 
     * @param x 
     * @param y 
     * @param offset 
     */
    public lookAt(x: number = 0, y: number = 0, duration: number = 1000, offset?: { x: number, y: number }) {
        this.bFollower = false;

        if (offset) {
            x += offset.x;
            y += offset.y;
        }
        let FolloweroffSet = this.FolloweroffSet; 
        x += FolloweroffSet.x;
        y += FolloweroffSet.y;
        this.ctx.centerScreen(x, y, duration, egret.Ease.cubicOut);
    }

    public stopLookAt() {
        this.ctx.stopCenterScreen();
    }

    private resetPosition() {
        this.curPosition = null;
        this.targetPosition = null;
    }

    private clearTweenScale() {
        egret.Tween.removeTweens(this);
    }

    public clear() {
        this.clearTweenScale();

        this.resetScale();

        this.pause();
        this.resetPosition();
    }

    // scale
    public resetScale() {
        if (GSceneValue.getFlying()) {
            this.scale = scene_define.cameraFlyingScale;
        } else {
            this.scale = scene_define.cameraDefaultScale;
        }
    }

    private m_nScale: number = 1;
    public set scale(value: number) {
        this.m_nScale = value;

        GSceneValue.cameraScale = value;

        this.updateScale();
    }
    private updateScale() {
        UIManager.WorldPanel.scaleX = UIManager.WorldPanel.scaleY = this.scale;

        let hero = this.ctx.getHero();
        if (hero) {
            UIManager.AdaptedPanel.validateDisplayList();
            let offset = this.FolloweroffSet;
            this.ctx.centerScreen(hero.x + offset.x, hero.y + offset.y);
        }
    }
    public get scale(): number {
        return this.m_nScale;
    }

    public setTweenScale(val: number, time: number = 500) {
        this.clearTweenScale();

        if (!time) {
            this.scale = val;
            return;
        }

        let tween = egret.Tween.get(this);
        tween.to({ scale: val }, time);
    }
}