import { s2_open_ui_cfg } from "auto/open_ui";
import { game_load_later } from "GameLoadLater";
import { SceneStatus } from "lib/scene/SceneStatus";
import { hgs_define } from "s2/activity/module/hgs/HgsDefine";
import { MainUIEvent, MainUIManager } from "s2/mainui/MainUIEvent";
import { DungeonWidget } from "s2/play/DungeonWidget";
import { CMainPlayPopupUI } from "s2/play/main/CMainPlayPopupUI";
import { SceneViewMgrImpl, regSceneViewMgr } from "world/scene/sceneview/SceneViewMgrImpl";

let playcaller = curry(game_load_later.loadGameDelay_MainPlay);
let playcallerZoo = curry(game_load_later.loadGameDelay_Zoo);
let activityCaller = curry(game_load_later.loadGameDelay_Activity);

/**
 * 天梯比武
 */
type DungeonSceneViewMgrData = {
    sceneId: number,
}

@regSceneViewMgr("DungeonSceneViewMgr")
export class DungeonSceneViewMgr extends SceneViewMgrImpl {
    protected init() {
        this.$sceneStatus = SceneStatus.DungeonScene;
    }

    protected initArgs() {
        this.$mainRoleWalkArgs = {
            isWalkable: true,
            isTouchWalkable: true,
            isJoystickWalk: true,
            isAutoWalk: false,
        }
    }

    public enterScene(data?: DungeonSceneViewMgrData): void {
        super.enterScene(data);
        MainUIManager.getInstance().addEventListener(MainUIEvent.SHOW_PLAY_SCENE, this.openPopupUI, this);
    }

    public exitScene(): void {
        super.exitScene();
        UIManager.destroy(DungeonWidget);
        activityCaller("closePlaySceneUI");
        UIManager.closeByName('JieyuanDadianOperatingUI');
        MainUIManager.getInstance().removeEventListener(MainUIEvent.SHOW_PLAY_SCENE, this.openPopupUI, this);
    }

    private openPopupUI(evt: MainUIEvent): void {
        let [open_or_close, data] = evt.data as [boolean, hgs_define.SPopupInfo];
        if (data.open_id == s2_open_ui_cfg.ACT_KF2025_HGS || data.open_id == s2_open_ui_cfg.ACT_DHZY2026_BOSS) {
            open_or_close ? activityCaller("openPopupUI", data) : activityCaller("closePopupUI");
        }else if (data.open_id == s2_open_ui_cfg.WSY) {
            let [open_or_close, data] = evt.data as [boolean, hgs_define.SPopupInfo];
            open_or_close ? playcallerZoo("openPopupUI", data) : playcallerZoo("closePopupUI");
        } else if ((data.open_id == s2_open_ui_cfg.ACT_DHXY202601_BOSS || data.open_id == s2_open_ui_cfg.ACT_DHXY202602_BOSS) && data.popup) {
            open_or_close ? activityCaller("openBossPopupUI", data) : activityCaller("closeBossPopupUI");
        }
       
    }

    protected enterSceneComplete(createHero: boolean = true) {
        super.enterSceneComplete(createHero);
        let inst = UIManager.getInst(CMainPlayPopupUI) as CMainPlayPopupUI;
        if (uiLiveAndVisible(inst)) {
            UIManager.close(CMainPlayPopupUI);
        }
    }
}