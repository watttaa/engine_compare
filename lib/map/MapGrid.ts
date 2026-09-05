import { astar } from "lib/astar";
import { map_define } from "lib/map/mapdefine";

export class MapGrid extends egret.HashObject {

    private $blockGrid: astar.Grid;
    private $maskGrid: astar.Grid;

    private static $instance: MapGrid;
    public static get Inst(): MapGrid {
        if (!MapGrid.$instance) {
            MapGrid.$instance = new MapGrid();
        }
        return MapGrid.$instance;
    }

    public get blockGrid() {
        return this.$blockGrid;
    }
    public set blockGrid(grid: astar.Grid) {
        this.$blockGrid = grid;
    }

    public addDynamicBlock(blocks: number[][]) {
        if (!this.blockGrid) {
            return;
        }
        for (let i = 0; i < blocks.length; i++) {
            let [x, y] = blocks[i];
            this.blockGrid.addDynamicBlock(x, y);
        }
    }
    public removeDynamicBlock(blocks: number[][]) {
        if (!this.blockGrid) {
            return;
        }
        for (let i = 0; i < blocks.length; i++) {
            let [x, y] = blocks[i];
            this.blockGrid.removeDynamicBlock(x, y);
        }
    }
    public clearDynamicBlock() {
        this.blockGrid?.clearDynamicBlock();
    }

    public get maskGrid() {
        return this.$maskGrid;
    }
    public set maskGrid(grid: astar.Grid) {
        this.$maskGrid = grid;
    }

    constructor() {
        super();
        this.clear();
    }

    public clear() {
        if (this.$blockGrid) {
            this.$blockGrid.clear();
        }
        this.$blockGrid = null;

        if (this.$maskGrid) {
            this.$maskGrid.clear();
        }
        this.$maskGrid = null;
    }

    public getMapGrid(side: map_define.MapGridSide = map_define.MapGridSide.side_default): astar.Grid {
        if (side == map_define.MapGridSide.side_default) {
            return this.$blockGrid;
        }
    }

}