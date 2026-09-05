import { CMapLayer } from "lib/map/CMapLayer";
import { map_define } from "lib/map/mapdefine";
import { Camera } from "world/scene/Camera";
import { CSceneNode } from "world/scene/element/CSceneNode";

export interface IScene {

    get sceneWidth(): number;
    get sceneHeight(): number;

    get sceneRow(): number;
    get sceneCol(): number;

    get x(): number;
    get y(): number;

    get scaleX(): number;
    get scaleY(): number;

    get sceneId(): number;

    get mapId(): number;

    getMapLayer(layer: map_define.SMapLayer): CMapLayer;
    /**添加tile到舞台 */
    addMapTile(tile: eui.Image): void;
    /**从舞台移除tile */
    removeMapTile(tile: eui.Image): void;
    /**添加node到舞台 */
    addNode(sceneNode: CSceneNode): void;
    /**从舞台移除node */
    removeNode(sceneNode: CSceneNode): void;


    convertWorldPosToGridCell(x: number, y: number): Point;
    convertCellPosToWorld(cellX: number, cellY: number): Point;

    getNearestCell(x: number, y: number, _mapGridSide: map_define.MapGridSide, islandCheck?: boolean): Point;
    reachableCell(cellX: number, cellY: number, _mapGridSide?: map_define.MapGridSide): boolean;

    /**是否开启FixArea */
    enableFixArea?: boolean;
}