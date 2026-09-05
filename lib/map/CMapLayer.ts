import { ILayerHidePolicyWidget, LayerHidePolicy } from "lib/layerhide/LayerHidePolicy";
import { map_define } from "lib/map/mapdefine";
import { scene_log } from "lib/scene/scene_log";
import { CSceneNode } from "world/scene/element/CSceneNode";

export class CMapLayer extends eui.Group implements ILayerHidePolicyWidget {

    visiblePolicy: LayerHidePolicy;

    private m_nLayerType: map_define.SMapLayer;

    constructor(layerType: map_define.SMapLayer) {
        super();

        this.m_nLayerType = layerType;

        if (layerType == map_define.SMapLayer.player
            || layerType == map_define.SMapLayer.deco
            //|| layerType == map_define.SMapLayer.terrain // mike todo: 可以考虑
        ) {

            this.setFullScreenMode("partialFull");
        }
    }

    public get layerType(): map_define.SMapLayer {
        return this.m_nLayerType;
    }

    public fixMapLayer(x: number, y: number) {

    }

    /**mike tips：只负责调用removeChildren，不负责元素的销毁 */
    public clearLayer() {
        if (this.layerType == map_define.SMapLayer.deco) {
            this.removeChildren();
        }
    }

    // ===
    public addMapTile(map: eui.Image) {
        this.addChild(map);
    }

    public removeMapTile(map: eui.Image) {
        this.removeChild(map);
    }

    public addNode(sceneNode: CSceneNode) {
        this.addChild(sceneNode.fullSp);
    }

    public removeNode(sceneNode: CSceneNode) {
        let fullSp = sceneNode.fullSp;
        if (fullSp.parent) {
            this.removeChild(fullSp);
        }
        // scene_log.log(`[CMapLayer] removeNode sceneNode.fullSp.parent is null`);
    }
}