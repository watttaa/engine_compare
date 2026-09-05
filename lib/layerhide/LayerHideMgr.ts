import { kit } from "common/kit";
import { getIsInPlot } from "GlobalValue";
import { layerhide_define } from "lib/layerhide/layerhidedefine";
import { ILayerHidePolicyWidget, LayerHidePolicy } from "lib/layerhide/LayerHidePolicy";
import { SceneEventBus, SceneStatusEvent } from "lib/scene/SceneEvent";
import { SceneModel } from "lib/scene/SceneModel";
import { SceneStatusSet } from "lib/scene/SceneStatus";
import { isInWar } from "s2/turnbasedwar/WarUtils";

// export class HideInRealStatus extends LayerHidePolicy {
//     get isSatisfy(): boolean {
//         let uistatus = SceneModel.getInstance().sceneStatusProxy.status;
//         return SceneStatusSet.indexOf(uistatus) > -1;
//     }
// }
export class HideInNotRealScene extends LayerHidePolicy {
    public isSatisfy(): boolean {
        let uistatus = SceneModel.getInstance().sceneStatusProxy.status;
        return SceneStatusSet.indexOf(uistatus) === -1;
    }
}

export class HideInFirstPanelOpen extends LayerHidePolicy {
    public static isUIBigEnougth(ui: BaseWidgetBase) {
        let uiPanel = ui.mainPanel;
        if (!uiPanel || uiPanel.width < 600 || uiPanel.height < 900) {
            return false;
        }
        return true;
    }


    public isSatisfy(): boolean {
        // 剧情模式期间不隐藏 NPC
        if (getIsInPlot()) {
            return false;
        }
        
        let uisopen = UIManager.UIStack;
        for (let i = 0; i < uisopen.length; i++) {
            let ui = uisopen[i];
            if (uiLiveAndVisible(ui) && ui.dlgLevel === 1) {
                return HideInFirstPanelOpen.isUIBigEnougth(ui);
            }
        }
        return false;
    }
}

export class HideInBigPanelOpen extends LayerHidePolicy {


    public isSatisfy(): boolean {
        // 剧情模式期间不隐藏 NPC
        if (getIsInPlot()) {
            return false;
        }
        
        let uisopen = UIManager.UIStack;
        for (let i = 0; i < uisopen.length; i++) {
            let ui = uisopen[i] as BaseWidgetBase;
            if (ui && !!ui.baseInst && ui.visible && ui.isBigUI) {
                return true;
            }
        }
        return false;
    }
}

export class HideInWarOpen extends LayerHidePolicy {
    public isSatisfy(): boolean {
        return isInWar();
    }
}
// export class HideInNotWarScene extends LayerHidePolicy {
//     public isSatisfy() {
//         let warState = GlobalValue.getWarState();
//         if (warState) return false;
//         let uistatus = SceneModel.getInstance().sceneStatusProxy.status;
//         return SceneStatusSet.indexOf(uistatus) === -1;
//     }
// }

// export class HideInNoPlayTeam extends LayerHidePolicy {
//     public isSatisfy() {
//         let team_member = TeamMgr.getInstance().getTeamData(TeamTypeEnum.PLAY_TEAM).DetailVo.members;
//         return !team_member || Object.keys(team_member).length <= 0;
//     }
// }

// export class HideInMainCityOpen extends LayerHidePolicy {
//     public isSatisfy() {
//         let mainUI = GlobalData.MainUIInst;
//         return uiLiveAndVisible(mainUI)/*  && uiLiveAndVisible(mainUI.maincity) */;
//     }
// }

export class HideInMainActMenuOpen extends LayerHidePolicy {
    public isSatisfy(): boolean {
        let actMainInst = UIManager.getInstByName("CMainActMenuUI");
        return uiLiveAndVisible(actMainInst);
    }
}

export class HideInNpcNpcDialogUIOpen extends LayerHidePolicy {
    public isSatisfy(): boolean {
        let actMainInst = UIManager.getInstByName("CNpcDialogUI");
        return uiLiveAndVisible(actMainInst);
    }
}


export class ForeverVisiblePolicy extends LayerHidePolicy {
    private static inst: ForeverVisiblePolicy;

    public static getInst() {
        if (!ForeverVisiblePolicy.inst) {
            ForeverVisiblePolicy.inst = new ForeverVisiblePolicy();
        }
        return ForeverVisiblePolicy.inst;
    }

    public isSatisfy(): boolean {
        return true;
    }
}

// =============================
export class LayerHideMgr extends SingletonClassEx {

    private hidePolicies: dataStructure.Map;

    private hideConMap: dataStructure.Map;
    private widgetsReg: ILayerHidePolicyWidget[];
    private enabled = true;

    constructor() {
        super();
        this.initHidePlilicies();
        this.hideConMap = new dataStructure.Map();
        this.widgetsReg = [];
    }

    public init() {
        this.initMonitorEventListener();
    }

    private initMonitorEventListener() {
        SceneEventBus.getInstance().addEventListener(SceneStatusEvent.STATUSCHANGE, this.onStatusNeedCheck, this);
        UIManager.UIPanel.addEventListener(UIMgrEvent.CHECKHIDEPOLICY, this.onStatusNeedCheck, this);
    }

    public destroy(): void {
        this.enabled = false;
        SceneEventBus.hasInstance() && SceneEventBus.getInstance().removeEventListener(SceneStatusEvent.STATUSCHANGE, this.onStatusNeedCheck, this);
        UIManager.UIPanel.removeEventListener(UIMgrEvent.CHECKHIDEPOLICY, this.onStatusNeedCheck, this);
    }

    private initHidePlilicies() {
        this.hidePolicies = new dataStructure.Map();
        this.hidePolicies.set(layerhide_define.LayerHideKeys.HideInBigPanelOpen, new HideInBigPanelOpen());
        this.hidePolicies.set(layerhide_define.LayerHideKeys.HideInFirstPanelOpen, new HideInFirstPanelOpen());
        this.hidePolicies.set(layerhide_define.LayerHideKeys.HideInNotRealScene, new HideInNotRealScene());
        // this.hidePolicies.set(layerhide_define.LayerHideKeys.HideInRealScene, new HideInRealStatus());
        // this.hidePolicies.set(layerhide_define.LayerHideKeys.HideInNotWarScene, new HideInNotWarScene());
        // this.hidePolicies.set(layerhide_define.LayerHideKeys.HideInMainCityOpen, new HideInMainCityOpen());
        this.hidePolicies.set(layerhide_define.LayerHideKeys.HideInWarOpen, new HideInWarOpen());
        // this.hidePolicies.set(layerhide_define.LayerHideKeys.HideInNoPlayTeam, new HideInNoPlayTeam());
        this.hidePolicies.set(layerhide_define.LayerHideKeys.HideInMainActMenuOpen, new HideInMainActMenuOpen());
        this.hidePolicies.set(layerhide_define.LayerHideKeys.HideInNpcNpcDialogUIOpen, new HideInNpcNpcDialogUIOpen());
    }

    private onStatusNeedCheck() {
        kit.timer.callLater(this, this.doCheckHide);
    }

    public checkHide() {
        kit.timer.callLater(this, this.doCheckHide);
    }
    // @kit.countCalls
    private doCheckHide() {
        if (!this.enabled) return;
        this.hidePolicies.forEach((v: LayerHidePolicy, k) => {
            this.hideConMap.set(k, v.isSatisfy());
        });

        for (let i = 0; i < this.widgetsReg.length; i++) {
            let widget = this.widgetsReg[i];
            if (widget && widget.hideKeys) {
                let isHide = !widget.visiblePolicy.isSatisfy();
                for (let i = 0; i < widget.hideKeys.length; i++) {
                    let key = widget.hideKeys[i];
                    isHide = isHide || this.hideConMap.get(key);  // 一个hide条件满足就hide
                }
                widget.visible = !isHide;
            }
        }
    }

    public regLayHidewidgets(widgets: ILayerHidePolicyWidget[], keys: layerhide_define.LayerHideKeys[]) {
        for (let widget of widgets) {
            this.regLayHidewidget(widget, keys);
        }
    }

    public regLayHidewidget(widget: ILayerHidePolicyWidget, keys: layerhide_define.LayerHideKeys[]) {
        this.unRegLayHide(widget);

        if (!widget.visiblePolicy) {
            widget.visiblePolicy = ForeverVisiblePolicy.getInst();
        }
        widget.hideKeys = keys;
        this.widgetsReg.push(widget);
    }

    public unRegLayHide(widget: ILayerHidePolicyWidget) {
        let index = this.widgetsReg.indexOf(widget);
        if (index > -1) {
            widget.hideKeys = undefined;
            this.widgetsReg.splice(index);
        }
    }

    public set enabledLayerHideOpt(v: boolean) {
        if (this.enabled === v) return;
        this.enabled = v;
        if (!v) {
            for (let i = 0; i < this.widgetsReg.length; i++) {
                let widget = this.widgetsReg[i];
                if (widget) {
                    widget.visible = widget.visiblePolicy.isSatisfy();
                }
            }
        }
    }
}