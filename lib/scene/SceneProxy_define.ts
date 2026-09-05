
import { SceneStatusManager } from "lib/scene/SceneStatusManager";
import { RaceModel } from "s2/activity/module/race/mgr/RaceModel";
import { ForcePKModel } from "s2/forcePK/mgr/ForcePKModel";
import { World } from "world/World";

export interface SceneProxy {
    "status": string
    "scene": string
}

export interface SceneProxyExt extends SceneProxy {
    "prison": string;
    "race": string;
}


export type SProxyClsDef = {
    "prison": ForcePKModel;
    "race": RaceModel
    "status": SceneStatusManager
    "scene": World,


}

