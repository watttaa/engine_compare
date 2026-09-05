export namespace gameplay_ui_culling {
    // 玩法界面剔除,统一设置各个UIGroup的renderVisible
    export enum ECulling {
        // 不剔除
        None,
        // 剧情剔除
        Plot,
        // 录屏剔除
        Video,
    }

    interface CullingConfig {
        // includes和excludes不能同时存在
        includes?: egret.DisplayObject[];    // 不被剔除的界面(白名单)
        excludes?: egret.DisplayObject[];    // 被剔除的界面(黑名单)
    }

    let config: { [ctype: number]: CullingConfig } = {
        [ECulling.Plot]: {
            // 剧情模式只显示场景对象和剧情界面
            includes: [UIManager.WorldPanel, UIManager.PlotPanel, UIManager.SceneUIPanel, UIManager.CurrencyPanel],
        },
        [ECulling.Video]: {
            includes: [UIManager.WorldPanel, UIManager.PlotPanel, UIManager.SceneUIPanel],
        }
    }

    let ongoingCulling: ECulling = ECulling.None;
    export function getOngoingCulling() {
        return ongoingCulling;
    }


    export function enter(ctype: ECulling) {
        let cfg = config[ctype];
        if (cfg) {
            if (!!cfg.includes && !!cfg.excludes) {
                Logger.error(`includes and excludes can't exist at the same time, ctype: ${ctype}`);
                return;
            }

            ongoingCulling = ctype;
            let includes = cfg.includes || [];
            if (includes && includes.length > 0) {
                let parent = UIManager.AdaptedPanel;
                for (let i = 0; i < parent.numChildren; i++) {
                    let child = parent.getChildAt(i);
                    if (includes.indexOf(child) >= 0) {
                        child.renderVisible = true;
                    } else {
                        child.renderVisible = false;
                    }
                }
            }

            let excludes = cfg.excludes || [];
            if (excludes && excludes.length > 0) {
                let parent = UIManager.AdaptedPanel;
                for (let i = 0; i < parent.numChildren; i++) {
                    let child = parent.getChildAt(i);
                    if (excludes.indexOf(child) >= 0) {
                        child.renderVisible = false;
                    } else {
                        child.renderVisible = true;
                    }
                }
            }
        }
    }

    export function leave() {
        let lastCulling = ongoingCulling;
        ongoingCulling = ECulling.None;

        // 全部恢复成true
        let parent = UIManager.AdaptedPanel;
        for (let i = 0; i < parent.numChildren; i++) {
            let child = parent.getChildAt(i);
            child.renderVisible = true;
        }
    }
}