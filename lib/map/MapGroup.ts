import { kit } from "common/kit";
import { MAPGROUP_CELL_SIZE } from "GlobalValue";
import { CMapLayer } from "lib/map/CMapLayer";
import { map_define } from "lib/map/mapdefine";
import { MapGrid } from "lib/map/MapGrid";
import { scene_log } from "lib/scene/scene_log";
import { getResByPath_ } from "utils/ResUtils";
import { AreaMgr } from "world/area/AreaMgr";
import { GSceneDevMgr } from "world/scene/dev/GSceneDevMgr";
import { CSceneNode } from "world/scene/element/CSceneNode";
import { IScene } from "world/scene/IScene";
import { astar } from "../astar";
import { CMapLayerCloud } from "lib/map/CMapLayerCloud";
import { s2_scene_cfg } from "auto/Scene";

export enum MapGridSide {
    side_default = "default",
    side1 = "side1",
    side2 = "side2",
}

export class MapGroup implements IScene {
    public get parent() {
        return this.$parent;
    }

    public get world() {
        return this.$world;
    }

    public get mapGridPool() {
        return this.$mapGridPool;
    }

    public set visible(visible: boolean) {
        this.$world.visible = visible;
    }

    public get visible() {
        return this.$world.visible;
    }

    public get width() {
        return this.$width;
    }

    public get height() {
        return this.$height;
    }

    public get x() {
        return this.$world.x;
    }

    private $x: number;
    public set x(value: number) {
        if (this.$x == value) {
            return;
        }
        this.$x = value;

        this.setX(value);
    }

    protected setX(value: number) {
        let min = this.$parent.width - this.$width;
        let max = 0;
        this.$world.x = preload_utils_math.clamp(value, min, max);

        if (this.useAreaMgr) {
            kit.timer.callLater(this, this.fixArea);
        }
    }

    public get y() {
        return this.$world.y;
    }

    private $y: number;
    public set y(value: number) {
        if (this.$y == value) {
            return;
        }
        this.$y = value;

        this.setY(value);
    }
    protected setY(value: number) {
        let min = this.$parent.height - this.$height;
        let max = 0;

        if (min > 0) { // 小地图，居中处理
            max = min / 2;
        }

        if (this.$needAdaptPos) {
            min = min + h5screenAdapter.downAdaptDis;
            max = max - h5screenAdapter.upAdaptDis;
        }
        this.$world.y = preload_utils_math.clamp(value, min, max);

        if (this.useAreaMgr) {
            kit.timer.callLater(this, this.fixArea);
        }
    }

    public get map() {
        return this.$map;
    }

    public get scene() {
        return this.$scene;
    }

    public get cellWidth() {
        return Math.ceil(this.$width / MAPGROUP_CELL_SIZE);
    }

    public get cellHeight() {
        return Math.ceil(this.$height / MAPGROUP_CELL_SIZE);
    }

    protected $parent: egret.DisplayObjectContainer;
    protected $width: number;
    protected $height: number;

    protected $world: eui.Group;
    protected $mapPathFinder: astar.AStarFinder;
    protected $shaking: boolean;

    protected $mapGridPool: MapGrid;

    protected $map: number = 0;
    protected $scene: number = 0;
    protected $needAdaptSize: boolean = false;
    protected $needAdaptPos: boolean = true;

    protected $sceneDevMgr: GSceneDevMgr;

    public constructor(parent: egret.DisplayObjectContainer, needAdaptSize: boolean = false, needAdaptPos = true) {
        this.m_dictLayers = {};

        this.$parent = parent;
        this.$shaking = false;
        this.$needAdaptSize = needAdaptSize;
        this.$needAdaptPos = needAdaptPos;
        this.$mapGridPool = new MapGrid();

        PreloadEventBus.getInstance().addEventListener(PreloadEvent.SCREENHWSETTED, this.onScreenSeted, this);

        this.$doInit();
    }

    public getMapGrid(side: MapGridSide = MapGridSide.side_default) {
        return this.mapGridPool.getMapGrid(side);
    }

    public getNearestCell(x: number, y: number, _mapGridSide: map_define.MapGridSide, islandCheck?: boolean): Point {
        let cellX = Math.floor(x / MAPGROUP_CELL_SIZE);
        let cellY = Math.floor(y / MAPGROUP_CELL_SIZE);

        let mapBlockGrid = this.mapGridPool.getMapGrid(_mapGridSide);
        if (!mapBlockGrid) {
            return { x: cellX, y: cellY };
        }

        if (mapBlockGrid.isWalkableAt(cellX, cellY)) {
            if (islandCheck) {
                if (!this.isIsland(mapBlockGrid, cellX, cellY)) {
                    return { x: cellX, y: cellY };
                }
            } else {
                return { x: cellX, y: cellY };
            }
        }

        let radius = 1;
        let width = this.cellWidth;
        let height = this.cellHeight;

        while (true) {
            for (let i = -radius; i <= radius; i = i + radius * 2) {
                let targetX = cellX + i;
                if (targetX < 0 || targetX >= width) {
                    continue;
                }
                for (let j = -radius; j <= radius; j++) {
                    let targetY = cellY + j;
                    if (targetY < 0 || targetY >= height) {
                        continue;
                    }
                    if (mapBlockGrid.isWalkableAt(targetX, targetY)) {
                        if (islandCheck) {
                            if (!this.isIsland(mapBlockGrid, targetX, targetY)) {
                                return { x: targetX, y: targetY };
                            }
                        } else {
                            return { x: targetX, y: targetY };
                        }

                    }
                }
            }

            for (let j = -radius; j <= radius; j = j + radius * 2) {
                let targetY = cellY + j;
                if (targetY < 0 || targetY >= height) {
                    continue;
                }
                for (let i = -radius; i <= radius; i++) {
                    let targetX = cellX + i;
                    if (targetX < 0 || targetX >= width) {
                        continue;
                    }
                    if (mapBlockGrid.isWalkableAt(targetX, targetY)) {
                        if (islandCheck) {
                            if (!this.isIsland(mapBlockGrid, targetX, targetY)) {
                                return { x: targetX, y: targetY };
                            }
                        } else {
                            return { x: targetX, y: targetY };
                        }
                    }
                }
            }

            radius += 1;
            if (radius >= width || radius >= height) {
                break;
            }
        }
        return { x: cellX, y: cellY };
    }
    private isIsland(mapBlockGrid: astar.Grid, cellX: number, cellY: number, threshold: number = 10) {
        let width = this.cellWidth;
        let height = this.cellHeight;

        let queue: Point[] = [{ x: cellX, y: cellY }];


        const visited = new Set<string>();
        visited.add(`${cellX},${cellY}`);

        let size = 1;

        const directions = [
            { dx: -1, dy: 0 },
            { dx: 1, dy: 0 },
            { dx: 0, dy: -1 },
            { dx: 0, dy: 1 }
        ];

        while (queue.length > 0) {
            const current = queue.shift()!;
            for (const dir of directions) {
                const x = current.x + dir.dx;
                const y = current.y + dir.dy;

                if (x < 0 || x >= width || y < 0 || y >= height) {
                    continue;
                }

                const coordKey = `${x},${y}`;

                if (!visited.has(coordKey) && mapBlockGrid.isWalkableAt(x, y)) {
                    visited.add(coordKey);
                    queue.push({ x, y });
                    size++;

                    if (size > threshold) {
                        queue.length = 0;
                        break;
                    }
                }
            }
        }

        return size <= threshold;
    }

    protected onBlockMapComplete(data: ArrayBuffer, _mapId: number) {
        if (!data) {
            return;
        }

        if (_mapId != this.$map) {
            scene_log.log(`[MapGroup] onBlockMapComplete: ${_mapId} != ${this.$map}`);
            return;
        }

        scene_log.log(`[MapGroup] onBlockMapComplete: ${_mapId}`);

        let map: Uint8Array = new Uint8Array(data);

        let width = this.cellWidth;
        let height = this.cellHeight;
        //普通阻挡
        let mapBlockGrid = new astar.Grid(width, height, this.useAstarOpt ? map : undefined);
        if (this.useAstarOpt) {
            // pass
        } else {
            let index = 0;
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    let i = Math.floor(index / 8);
                    let bit = 7 - index % 8;
                    mapBlockGrid.setWalkableAt(x, y, (map[i] & (0x01 << bit)) ? false : true);
                    index++;
                }
            }
        }
        this.mapGridPool.blockGrid = mapBlockGrid;
        this.doBlockMapComplete();
    }

    protected doBlockMapComplete() {
    }

    protected onMaskMapComplete(data: ArrayBuffer, _mapId: number) {
        if (!data) {
            return;
        }

        if (_mapId != this.$map) {
            scene_log.log(`[MapGroup] onMaskMapComplete: ${_mapId} != ${this.$map}`);
            return;
        }

        scene_log.log(`[MapGroup] onMaskMapComplete: ${_mapId}`);

        let map: Uint8Array = new Uint8Array(data);

        let width = this.cellWidth;
        let height = this.cellHeight;
        let mapMaskGrid = new astar.Grid(width, height, this.useAstarOpt ? map : undefined);
        if (this.useAstarOpt) {
            // pass
        } else {
            let index = 0;
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    let i = Math.floor(index / 8);
                    let bit = 7 - index % 8;
                    mapMaskGrid.setWalkableAt(x, y, (map[i] & (0x01 << bit)) ? false : true);
                    index++;
                }
            }
        }
        this.mapGridPool.maskGrid = mapMaskGrid;
        this.doMaskMapComplete();
    }

    protected doMaskMapComplete() {
    }

    // ==========clear
    protected clearLayers() {
        for (let key in this.m_dictLayers) {
            let layer = this.m_dictLayers[key] as CMapLayer;

            layer.clearLayer();
        }
    }

    protected clearTween() {
        egret.Tween.removeTweens(this);
        egret.Tween.removeTweens(this.$world);
    }

    protected clearMap(clearThumbnail: boolean = false) {
        scene_log.log(`[MapGroup] clear Map`);

        let mapCacheMgr = RESCacheHelpper.getCacheMgr("map");
        if (mapCacheMgr) {
            scene_log.log(`[MapGroup] mapCacheLRU gc`);
            mapCacheMgr.gc();
        }

        if (clearThumbnail) {
            this.clearThumbnail();
        }

        this.clearArea();
        PreloadEventBus.getInstance().removeEventListener(PreloadEvent.SCREENHWSETTED, this.onScreenSeted, this);

        this.mapGridPool && this.mapGridPool.clear();

        this.clearLayers();

        this.clearTween();

        this.clearDebugArea();

        this.$scene = null;
        this.$map = null;
    }

    private $prevRow = 0;
    private $prevCol = 0;

    protected replaceMap(sceneInfo: any) {
        if (this.useAreaMgr) {
            return;
        }

        let name: string, source: string;
        const width = map_define.STileSize.width, height = map_define.STileSize.height;
        // 从地图像素尺寸推导行列数，避免依赖配置表手填的 row/col 字段
        let row = Math.ceil(sceneInfo[s2_scene_cfg.height] / map_define.STileSize.height);
        let col = Math.ceil(sceneInfo[s2_scene_cfg.width] / map_define.STileSize.width);
        let max_row = Math.max(row, this.$prevRow);
        let max_col = Math.max(col, this.$prevCol);
        for (let r = 0; r < max_row; r++) {
            for (let c = 0; c < max_col; c++) {
                name = `MapClip_${r}_${c}`;
                let img = this.terrainLayer.getChildByName(name) as eui.Image;
                if (r >= row || c >= col) {
                    img && this.terrainLayer.removeChild(img);
                    continue;
                }
                source = `resource/assets/map/${this.$map}/${r}_${c}.jpg`; // `map_${this.$map}_${r}_${c}_jpg`;
                if (!img) {
                    img = new eui.Image(source);
                    [img.x, img.y] = [c * width, r * height];
                    img.name = name;
                    this.terrainLayer.addChild(img);
                } else {
                    img.source = source;
                }
                img.z = r * col + c;
            }
        }

        this.$prevRow = row;
        this.$prevCol = col;
    }

    protected loadMapTile(sceneInfo) {
        if (this.useAreaMgr) {
            return;
        }

        // 先加载资源，不设置图片，当资源都加载完毕后，再设置图片
        let source: string;
        // 从地图像素尺寸推导行列数，避免依赖配置表手填的 row/col 字段
        const _row = Math.ceil(sceneInfo[s2_scene_cfg.height] / map_define.STileSize.height);
        const _col = Math.ceil(sceneInfo[s2_scene_cfg.width] / map_define.STileSize.width);
        let total = _row * _col, cnt = 0;
        for (let r = 0; r < _row; r++) {
            for (let c = 0; c < _col; c++) {
                source = `resource/assets/map/${this.$map}/${r}_${c}.jpg`;; // `map_${this.$map}_${r}_${c}_jpg`;
                eui.getAssets(source, () => {
                    cnt++;
                    if (total == cnt) { // 目标数量与加载数量相同，则全部加载完毕，替换图片
                        this.replaceMap(sceneInfo);
                    }
                }, this);
            }
        }
    }

    protected $setMap(sceneid: number, needMask: boolean = true, needBlock: boolean = true) {
        let sceneInfo = s2_scene_cfg.SceneInfo[sceneid];
        if (!sceneInfo || sceneInfo[s2_scene_cfg.type] === 0) {
            return null;
        }

        let mapid = sceneInfo[s2_scene_cfg.mapid] ? sceneInfo[s2_scene_cfg.mapid] : sceneid;
        if (this.$map === mapid) { // 触发依赖事件
            this.$scene = sceneid;

            if (needBlock && sceneInfo[s2_scene_cfg.block]) {
                getResByPath_(`resource/assets/map/${mapid}/${mapid}.map`, this.doBlockMapComplete, this);
            } else {
                this.doBlockMapComplete();
            }
            return null;
        }

        this.clearMap();
        this.$map = mapid;
        this.$scene = sceneid;

        // 更新缩略图
        this.updateThumbnail();

        // 先加载资源，不设置图片，当资源都加载完毕后，再设置图片
        this.loadMapTile(sceneInfo);

        // mike tips: 地图的宽高对于寻路有影响，如果地图尺寸与实际尺寸不一致，寻路是不准确的。另外，地图的宽高要为MAPGROUP_CELL_SIZE的整数倍。
        this.$width = Math.ceil(sceneInfo[s2_scene_cfg.width] / MAPGROUP_CELL_SIZE) * MAPGROUP_CELL_SIZE;
        this.$height = Math.ceil(sceneInfo[s2_scene_cfg.height] / MAPGROUP_CELL_SIZE) * MAPGROUP_CELL_SIZE;

        if (needMask && sceneInfo[s2_scene_cfg.mask]) {
            let args = this.$map;
            let maskFunc = (data) => {
                this.onMaskMapComplete(data, args);
            }
            getResByPath_(`resource/assets/map/${this.$map}/${this.$map}.msk`, maskFunc, this);
        }

        if (needBlock && sceneInfo[s2_scene_cfg.block]) {
            let args = this.$map;
            let blockFunc = (data) => {
                this.onBlockMapComplete(data, args);
            }
            getResByPath_(`resource/assets/map/${this.$map}/${this.$map}.map`, blockFunc, this);
        } else {
            this.doBlockMapComplete();
        }

        if (this.$needAdaptSize) {
            this.scaleMap();
        }
        return sceneInfo;
    }

    protected scaleMap() {
        // // 适配mapUI太小的问题
        // let viewH = ScreenDotch.DesignH + h5screenAdapter.expandDis;
        // if (this.$height < viewH) {
        //     this.world.scaleX = this.world.scaleY = viewH / this.$height;
        // }
        // else {
        //     this.world.scaleX = this.world.scaleY = 1.0;
        // }

        this.world.scaleX = this.world.scaleY = 1.0;
    }

    protected onScreenSeted() {
        if (this.$needAdaptSize) {
            this.scaleMap();
        }
        if (this.$needAdaptPos) {
            if (this.$needAdaptSize) {
                this.x = this.world.$x;
                this.y = this.world.$y;
            }
            else {
                this.x = (UIManager.stage.stageWidth - this.width * this.world.scaleX) >> 1;
                this.y = 0;
            }
        }
    }

    protected $doInit() {
        this.$world = new eui.Group();
        this.$world.name = "World";

        this.createThumbnailBg();

        this.createLayer(map_define.SMapLayer.terrain);

        this.doInitDev();

        this.$world.once(egret.Event.ADDED_TO_STAGE, this.onAddToStage, this);

        this.$parent.addChild(this.$world);

        this.$mapPathFinder = new astar.AStarFinder({ allowDiagonal: true, dontCrossCorners: true });
    }

    private m_imgThumbnail: eui.Image;
    private createThumbnailBg() {
        this.m_imgThumbnail = new eui.Image();
        this.$world.addChild(this.m_imgThumbnail);
    }
    private updateThumbnail() {
        this.m_imgThumbnail.source = `map_${this.$map}_thumbnail_jpg`; // `resource/assets/map/${this.$map}/thumbnail.jpg`;
        // this.m_imgThumbnail.source = `resource/assets/map/1/thumbnail.jpg`;
        this.m_imgThumbnail.width = this.sceneWidth;
        this.m_imgThumbnail.height = this.sceneHeight;
    }
    private clearThumbnail() {
        this.m_imgThumbnail.source = "";
    }

    protected onAddToStage(event: egret.Event) {

    }

    public hasBlock() {
        if (this.mapGridPool.blockGrid) return true;
        return false;
    }

    public shake() {
        if (!this.visible || this.$shaking) {
            return;
        }
        this.$shaking = true;
        let points: Point[] = [];
        for (let r = 6; r >= 0; r--) {
            let offx = (Math.random() * 4 - 1) * (r + 5);
            let offy = (Math.random() * 4 - 1) * (r + 5);
            points.push({ x: this.$world.x + offx, y: this.$world.y + offy });
        }
        points.push({ x: this.$world.x, y: this.$world.y });

        let duration = 300 / points.length;
        let tw = egret.Tween.get(this.$world);
        for (let p of points) {
            tw.to({ "x": p.x, "y": p.y }, duration);
        }
        tw.call(() => { this.$shaking = false; }, this);
    }

    public getMovePath(x: number, y: number, avatarX: number, avatarY: number, _mapGridSide: map_define.MapGridSide = map_define.MapGridSide.side_default, isMainRole?: boolean) {
        if (DEV) {
            isMainRole && this.clearDebugPaths();
        }

        if (avatarX == x && avatarY == y) {
            return [];
        }

        let mapBlockGrid = this.mapGridPool.getMapGrid(_mapGridSide);
        if (!mapBlockGrid) {
            return [];
        }

        let startCell = this.getNearestCell(avatarX, avatarY, _mapGridSide);
        // if (startCell.x == avatarX || startCell.y == avatarY) {
        //     return []
        // }
        let endCell = this.getNearestCell(x, y, _mapGridSide);
        // if (endCell.x == x || endCell.y == y) {
        //     return []
        // }

        if (startCell.x == endCell.x && startCell.y == endCell.y) {
            return [[endCell.x * MAPGROUP_CELL_SIZE, endCell.y * MAPGROUP_CELL_SIZE]];
        }

        mapBlockGrid.reset();
        let path = this.$mapPathFinder.findPathOpt(startCell.x, startCell.y, endCell.x, endCell.y, mapBlockGrid);
        if (DEV) {
            isMainRole && this.updateDebugPaths(path, endCell);
        }

        if (path.length == 1) {
            let nextPoint = path[0];
            if (nextPoint[0] == startCell.x && nextPoint[1] == startCell.y) {
                return [];
            }
        }

        let len = path.length;
        if (len > 0) {
            // path = PF.Util.smoothenPath(mapBlockGrid, path);
            path = mapBlockGrid.smoothenPathWithConnerTest(path);
            let ox = avatarX - path[0][0] * MAPGROUP_CELL_SIZE; // mike todo: 是否要修正小数？
            let oy = avatarY - path[0][1] * MAPGROUP_CELL_SIZE;

            for (let i = 0; i < path.length; i++) {
                // 假如是最后一个点，则不做偏移
                if (i == len - 1) {
                    path[i][0] = path[i][0] * MAPGROUP_CELL_SIZE;
                    path[i][1] = path[i][1] * MAPGROUP_CELL_SIZE;
                } else {
                    path[i][0] = path[i][0] * MAPGROUP_CELL_SIZE + ox;
                    path[i][1] = path[i][1] * MAPGROUP_CELL_SIZE + oy;
                }
            }

            path.splice(0, 1);
        }
        return path;
    }

    public getGridPath(ex: number, ey: number, sx: number, sy: number, _mapGridSide: map_define.MapGridSide = map_define.MapGridSide.side_default) {
        let mapBlockGrid = this.mapGridPool.getMapGrid(_mapGridSide);
        if (!mapBlockGrid) {
            return [];
        }

        let startCell = this.getNearestCell(sx, sy, _mapGridSide);
        if (startCell.x == sx || startCell.y == sy) {
            return []
        }
        let endCell = this.getNearestCell(ex, ey, _mapGridSide);
        if (endCell.x == ex || endCell.y == ey) {
            return []
        }

        mapBlockGrid.reset();
        let path = this.$mapPathFinder.findPathOpt(startCell.x, startCell.y, endCell.x, endCell.y, mapBlockGrid);
        if (path.length == 1) {
            let nextPoint = path[0];
            if (nextPoint[0] == startCell.x && nextPoint[1] == startCell.y) {
                return [];
            }
        }

        return path;
    }

    // public isCanGoto(sceneid: number) {
    //     if (this.$scene === sceneid) {
    //         return false;
    //     }
    //     let sceneInfo = scene_cfg.SceneInfo[sceneid];
    //     if (!sceneInfo) {
    //         return false;
    //     }
    //     return true;
    // }

    public gotoScene(sceneid: number, needMask: boolean = true, needBlock: boolean = true, needDynamicMap: boolean = false) {
        // if (!this.isCanGoto(sceneid)) return false;
        this.$world.scaleX = this.$world.scaleY = 1;
        this.$setMap(sceneid, needMask, needBlock);
        this.x = 0;
        this.y = this.$needAdaptPos ? -h5screenAdapter.upAdaptDis : 0;

        let heroPos: Point;
        if (heroPos) {
            this.centerScreen(heroPos.x, heroPos.y);
        }

        this.$shaking = false;
        return true;
    }

    public reachable(x: number, y: number, _mapGridSide: map_define.MapGridSide = map_define.MapGridSide.side_default): boolean {
        let mapBlockGrid = this.mapGridPool.getMapGrid(_mapGridSide);
        if (!mapBlockGrid) {
            return false;
        }
        return mapBlockGrid.isWalkableAt(Math.floor(x / MAPGROUP_CELL_SIZE), Math.floor(y / MAPGROUP_CELL_SIZE));
    }

    public reachableCell(cellX: number, cellY: number, _mapGridSide: map_define.MapGridSide = map_define.MapGridSide.side_default): boolean {
        let mapBlockGrid = this.mapGridPool.getMapGrid(_mapGridSide);
        if (!mapBlockGrid) {
            return false;
        }
        return mapBlockGrid.isWalkableAt(cellX, cellY);
    }

    /**DEV用 */
    public reachableForDev(x: number, y: number, _mapGridSide: map_define.MapGridSide = map_define.MapGridSide.side_default): boolean {
        if (!DEV) {
            return this.reachable(x, y, _mapGridSide);
        }

        let mapBlockGrid = this.mapGridPool.getMapGrid(_mapGridSide);
        if (!mapBlockGrid) {
            return false;
        }
        return mapBlockGrid.isWalkableValue(Math.floor(x / MAPGROUP_CELL_SIZE), Math.floor(y / MAPGROUP_CELL_SIZE));
    }

    public reachableGrid(gx: number, gy: number, _mapGridSide: map_define.MapGridSide = map_define.MapGridSide.side_default): boolean {
        let mapBlockGrid = this.mapGridPool.getMapGrid(_mapGridSide);
        if (!mapBlockGrid) {
            return false;
        }
        return mapBlockGrid.isWalkableAt(gx, gy);
    }

    public checkMask(x: number, y: number): boolean {
        if (!this.mapGridPool.maskGrid) {
            return false;
        }
        return !this.mapGridPool.maskGrid.isWalkableAt(Math.floor(x / MAPGROUP_CELL_SIZE), Math.floor(y / MAPGROUP_CELL_SIZE));
    }

    public convertToWorldPos(x: number, y: number): Point {
        return { x: x - this.$world.x, y: y - this.$world.y };
    }

    public centerScreen(x: number, y: number, tweenTime: number = -1, ease?: Function, callback?: Function, thisObject?: any) {
        if (isNaN(x) || isVain(x)) {
            scene_log.warn(`[MapGroup] centerScreen x is NaN`);
            x = 0;
        }

        if (isNaN(y) || isVain(y)) {
            scene_log.warn(`[MapGroup] centerScreen y is NaN`);
            y = 0;
        }

        let newX = this.$parent.width / 2 - x;
        let newY = this.$parent.height / 2 - y;
        if (tweenTime != -1) {
            this.clearTween();

            let tw = egret.Tween.get(this);
            tw.to({ "x": newX, "y": newY }, tweenTime, ease);
            tw.call(() => {
                if (callback) {
                    callback.call(thisObject, this);
                }
            });
        } else {
            this.x = newX;
            this.y = newY;
            if (callback) {
                callback.call(thisObject, this);
            }
        }
    }

    public stopCenterScreen() {
        this.clearTween();
    }

    public convertWorldPosToGridCell(x: number, y: number): Point {
        return new egret.Point(Math.floor(x / MAPGROUP_CELL_SIZE), Math.floor(y / MAPGROUP_CELL_SIZE));
    }

    public convertCellPosToWorld(cellX: number, cellY: number): Point {
        return new egret.Point(cellX * MAPGROUP_CELL_SIZE, cellY * MAPGROUP_CELL_SIZE);
    }

    public convertStagePosToGridCell(stageX: number, stageY: number) {
        let p = this.parent.globalToLocal(stageX, stageY);
        let pos = this.convertToWorldPos(p.x, p.y);//转化成地图坐标
        let grid = this.convertWorldPosToGridCell(pos.x, pos.y);//转化成格子
        return grid;
    }

    /**
     * 往一个角度寻像素点
     * @param startX 
     * @param startY 
     */
    public findNextPos(startX: number, startY: number, angle: number, radius: number = 50) {
        const angleInRadians = angle * (Math.PI / 180);
        const endX = startX - radius * Math.cos(angleInRadians);
        const endY = startY - radius * Math.sin(angleInRadians);

        return { x: Math.min(endX, this.width), y: Math.min(endY, this.height) };
    }

    protected get sceneInfo() {
        return s2_scene_cfg.SceneInfo[this.$scene];
    }

    protected get useAreaMgr() {
        return false;
    }

    // === layers
    private m_dictLayers: { [_layer in map_define.SMapLayer]?: CMapLayer };

    public get terrainLayer(): CMapLayer {
        return this.getMapLayer(map_define.SMapLayer.terrain);
    }

    public getMapLayer(layer: map_define.SMapLayer = map_define.SMapLayer.terrain): CMapLayer {
        let mapLayer = this.m_dictLayers[layer];

        if (!mapLayer) {
            mapLayer = this.createLayer(layer);
        }

        return mapLayer;
    }

    public createLayer(_layer: map_define.SMapLayer): CMapLayer {
        let mapLayer = this.m_dictLayers[_layer];
        if (mapLayer) {
            return mapLayer;
        }

        if (_layer == map_define.SMapLayer.cloud) {
            mapLayer = new CMapLayerCloud();
        }
        else {
            mapLayer = new CMapLayer(_layer);
        }

        mapLayer.z = _layer;
        mapLayer.name = "maplayer" + _layer;

        this.m_dictLayers[_layer] = mapLayer;

        this.$world.addChild(mapLayer);

        return mapLayer;
    }

    /**tips：只负责调用removeChildren，不负责元素的销毁 */
    protected clearLayerChildren(layer: map_define.SMapLayer) {
        if (layer == map_define.SMapLayer.debug) {
            return;
        }

        let mapLayer = this.m_dictLayers[layer];

        if (mapLayer) {
            mapLayer.removeChildren();
        }
    }

    // ==========destroy
    public dispose() {
        PreloadEventBus.getInstance().removeEventListener(PreloadEvent.SCREENHWSETTED, this.onScreenSeted, this);

        for (let layer in this.m_dictLayers) {
            let mapLayer = this.m_dictLayers[layer] as CMapLayer;
            if (mapLayer?.parent) {
                mapLayer.parent.removeChild(mapLayer);
            }
        }
        this.m_dictLayers = {};

        if (this.world?.parent) {
            this.world.parent.removeChild(this.world);
        }
        this.$world = null;
        this.$parent = null;

        this.$mapGridPool = null;
        this.$mapPathFinder = null;

        this.$areaMgr?.dispose();
    }

    // ===========
    // ==== 实现IScene接口
    // ===========
    public get sceneWidth(): number {
        return this.sceneInfo[s2_scene_cfg.width];
    }
    public get sceneHeight(): number {
        return this.sceneInfo[s2_scene_cfg.height];
    }

    public get sceneRow(): number {
        // 从地图像素高度推导行数，避免依赖配置表手填的 row 字段
        const h = this.sceneInfo[s2_scene_cfg.height];
        const val = Math.ceil(h / map_define.STileSize.height);
        return val;
    }
    public get sceneCol(): number {
        // 从地图像素宽度推导列数，避免依赖配置表手填的 col 字段
        const w = this.sceneInfo[s2_scene_cfg.width];
        const val = Math.ceil(w / map_define.STileSize.width);
        return val;
    }

    public get scaleX(): number {
        return this.world?.scaleX || 1;
    }
    public get scaleY(): number {
        return this.world?.scaleY || 1;
    }

    public get sceneId(): number {
        return this.$scene;
    }

    public get mapId(): number {
        return this.map;
    }

    addMapTile(tile: eui.Image) {
        this.terrainLayer.addMapTile(tile);
    }
    removeMapTile(tile: eui.Image) {
        this.terrainLayer.removeMapTile(tile);
    }

    addNode(sceneNode: CSceneNode) {
        let layer = this.getMapLayer(sceneNode.layer);
        layer.addNode(sceneNode);
    }
    removeNode(sceneNode: CSceneNode) {
        let layer = this.getMapLayer(sceneNode.layer);
        layer.removeNode(sceneNode);
    }

    // === AreaMgr
    protected $areaMgr: AreaMgr;

    public get areaMgr() {
        return this.$areaMgr || null;
    }

    protected clearArea() {
        if (this.$areaMgr) {
            this.$areaMgr.clearArea();
        }
    }

    protected updateArea() {
        if (this.$areaMgr) {
            this.$areaMgr.switchScene(this, map_define.STileSize.width, map_define.STileSize.height);

            this.fixArea();
        }
    }

    protected fixArea() {
        if (!this.map) {
            return;
        }

        if (this.$areaMgr) {
            this.$areaMgr.fixArea();
        }

        this.fixMapLayer();

        this.fixDebugArea();
    }

    protected fixMapLayer() {
        let layers = this.m_dictLayers;
        for (let layer in layers) {
            let mapLayer = layers[layer] as CMapLayer;

            mapLayer.fixMapLayer(this.x, this.y);
        }
    }

    // === astar opt
    protected get useAstarOpt() {
        return astar.getUseAstarOpt();
    }


    // === debug
    private doInitDev() {
        if (DEV) {
            this.$sceneDevMgr = new GSceneDevMgr(this);
        }
    }
    private fixDebugArea() {
        if (DEV) {
            this.$sceneDevMgr?.fixBlockArea();
        }
    }
    private clearDebugArea() {
        if (DEV) {
            this.$sceneDevMgr?.clear();
        }
    }
    private updateDebugPaths(paths: [number, number][], endCell: Point) {
        if (DEV) {
            this.$sceneDevMgr?.updateDebugPaths(paths, endCell);
        }
    }
    private clearDebugPaths() {
        if (DEV) {
            this.$sceneDevMgr?.clearDebugPaths();
        }
    }
}
