import { uiPath0 } from "GlobalValue";
import { BehaviorBaseWidget } from "behaviorCamp/BehaviorBaseView";

export interface CSceneDevUI {
    grpCenterTips: eui.Group;
    lblPerf: eui.Label;
}
@UIDef(uiPath0("dev/Dev_Scene_.exml"), UIManager.DevelopPanel)
export class CSceneDevUI extends BehaviorBaseWidget {

    public init() {
        super.init();
    }

    public onOpen(visChanged?: boolean, playOpenAni?: boolean): void {
        super.onOpen(visChanged, playOpenAni);
    }

    public onClose(visChanged?: boolean): void {
        super.onClose(visChanged);
    }


    initBehavior(): void {
    }

    @SafeCallFunction()
    public setData() {

    }
}