import { AvatarComDefine } from "avatar/AvatarDefines";
import { client_repo_ex_ } from "clientsdk/ClientRepoEx";
import { GAutoNavTipsMgr } from "world/autonav/GAutoNavTipsMgr";
//import { GAutoNavTipsMgr } from "world/autonav/GAutoNavTipsMgr";
import { GSceneAvatarEvent, GSceneAvatarEventBus } from "world/scene/avatar/GSceneAvatarEvent";
import { GSceneEvent, GSceneEventBus } from "world/scene/GSceneEvent";
import { scenemonitor_define } from "world/scene/monitor/scenemonitordefine";
import { scene_define } from "world/scene/scenedefine";

export class GSceneValue {

    public static debugWalkSpeedScale: number = 1;

    // ===
    // /**场景全局avatar移动速度倍数 */
    // public static walkSpeedScale = 1;
    /**当前场景scale */
    public static cameraScale = 1;

    // ===
    /**当前场景类型 */
    private static sceneType: scene_define.SSceneType;
    public static setSceneType(type: scene_define.SSceneType): void {
        GSceneValue.sceneType = type;
    }
    public static getSceneType(): scene_define.SSceneType {
        return GSceneValue.sceneType;
    }

    // ===
    private static bAutoNav: boolean = false;
    public static setAutoNav(bol: boolean, args?: scene_define.SAutoNav): void {
        GSceneValue.bAutoNav = bol;

        GAutoNavTipsMgr.getInstance().updateAutoNav(bol, args);
    }
    public static getAutoNav(): boolean {
        return GSceneValue.bAutoNav;
    }

    // ===
    /**主角是否飞行 */
    private static isFlying: boolean = false;
    public static setFlying(bol: boolean): void {
        GSceneValue.isFlying = bol;

        GSceneAvatarEventBus.getInstance().dispatchEvent(new GSceneAvatarEvent(GSceneAvatarEvent.HERO_FLY_STATE_CHANGE));
    }
    public static getFlying(): boolean {
        return GSceneValue.isFlying;
    }

    // ===
    /**是否纯享模式 */
    private static isImmersive: boolean = false;
    public static setImmersive(bol: boolean): void {
        GSceneValue.isImmersive = bol;

        let _figureInfo: scenemonitor_define.TSceneAvatarFigureInfo = {};
        _figureInfo[AvatarComDefine.Name] = true;

        let data = {
            avatarTypes: [scene_define.SAvatarType.OTHER_ROLE],

            figureInfo: _figureInfo,

            ohtersArgs: {
                bol: !bol,
            }
        };

        GSceneEventBus.getInstance().dispatchEvent(new GSceneEvent(GSceneEvent.SCENE_IMMERSIVE_CHANGE, data));
    }
    public static getImmersive(): boolean {
        return GSceneValue.isImmersive;
    }

    // ===
    public static setTargetNpcNo(npcNo: number): void {
        let soul = client_repo_ex_.OwnSoul_;
        if (soul) {
            soul.targetNpcNo = npcNo;
            // scene_log.log(`[#GSceneValue] setTargetNpcNo npcNo=${npcNo}`);
        }
    }
}