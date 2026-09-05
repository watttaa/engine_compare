export const enum SceneStatus {
    None = 0,

    AFKScene = 101,

    MutliPlayerScene = 201,
    DungeonScene = 202,
    PlotScene = 203,
    FactionScene = 110,
    FactionWarScene = 2016,


    DebugScene = 9999, // 调试场景
}


export let AFKSceneSet = [SceneStatus.AFKScene];
export let MutilSceneSet = [SceneStatus.MutliPlayerScene, SceneStatus.DungeonScene, SceneStatus.FactionScene, SceneStatus.FactionWarScene];
export let PlotSceneSet = [SceneStatus.PlotScene];

export let SceneStatusSet = AFKSceneSet.concat(MutilSceneSet, PlotSceneSet).concat([SceneStatus.DebugScene]);
export let ForbidTouchNpcSceneStatusSet = [].concat(PlotSceneSet);
export let ForbidShowChatBloackSceneStatusSet = [].concat(PlotSceneSet);