import { MAPGROUP_CELL_SIZE } from "GlobalValue";
import { MapGroup } from "lib/map/MapGroup";
import { CSceneDevShape } from "world/scene/dev/devLayer/CSceneDevShape";

export class CSceneDevPathsShape extends CSceneDevShape {

    private $ctx: MapGroup;

    private bShow: boolean = false;

    constructor(world: MapGroup) {
        super();

        this.$ctx = world;

        this.alpha = 0.8;
    }

    public updateShow() {
        this.show = !this.bShow;
    }

    public clear() {
        this.show = false;
        this.clearGraphics();
    }

    public clearGraphics() {
        this.graphics.clear();
    }

    public set show(val: boolean) {
        this.bShow = val;

        this.visible = this.bShow;
    }
    public get show(): boolean {
        return this.bShow;
    }

    public updateDebugPaths(paths: [number, number][], endCell: Point) {
        if (!this.show) {
            return;
        }

        this.graphics.clear();

        const cellSize = MAPGROUP_CELL_SIZE;

        // 绘制路径点
        for (let i = 0; i < paths.length; i++) {
            let cell = paths[i];

            this.graphics.beginFill(0x00ffff); // 青色
            this.graphics.drawRect(cell[0] * cellSize + 1, cell[1] * cellSize + 1, cellSize - 2, cellSize - 2);
            this.graphics.endFill();
        }

        // endCell
        this.graphics.beginFill(0x0000ff); // 蓝色
        this.graphics.drawRect(endCell.x * cellSize + 1, endCell.y * cellSize + 1, cellSize - 2, cellSize - 2);
        this.graphics.endFill();
    }
}