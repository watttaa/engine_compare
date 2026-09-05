import { layerhide_define } from "lib/layerhide/layerhidedefine";


export interface ILayerHidePolicyWidget {
    visiblePolicy: LayerHidePolicy;
    hideKeys?: layerhide_define.LayerHideKeys[];

    visible: boolean;
}

export abstract class LayerHidePolicy {
    public abstract isSatisfy(): boolean;
}