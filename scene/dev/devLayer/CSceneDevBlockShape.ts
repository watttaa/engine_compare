import { right_click } from "developHelp/rightclick";
import { MAPGROUP_CELL_SIZE } from "GlobalValue";
import { MapGroup } from "lib/map/MapGroup";
import { area_define } from "world/area/area_define";
import { CSceneDevShape } from "world/scene/dev/devLayer/CSceneDevShape";
import { GSceneValue } from "world/scene/GSceneValue";

export class CSceneDevBlockShape extends CSceneDevShape {

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
        this.graphics.clear();
    }

    public set show(val: boolean) {
        this.bShow = val;

        this.visible = this.bShow;

        if (val) {
            this.fixBlockArea();
        }
    }
    public get show(): boolean {
        return this.bShow;
    }

    public fixBlockArea() {
        if (!this.show) {
            return;
        }

        this.graphics.clear();

        let scale = GSceneValue.cameraScale;

        const left: number = -this.$ctx.x;
        const right: number = left + (UIManager.stage.stageWidth / scale);
        const top: number = -this.$ctx.y;
        const bottom: number = top + (UIManager.stage.stageHeight / scale);

        const blockDatas = this.mapBlockDatas;
        const maskDatas = this.mapMaskDatas;
        if (blockDatas && maskDatas) {
            const cellSize = MAPGROUP_CELL_SIZE;
            const _gridWidth = this.$ctx.cellWidth;
            const _gridHeight = this.$ctx.cellHeight;

            // 计算可见区域的格子范围
            const startX = Math.max(0, Math.floor(left / cellSize));
            const endX = Math.min(_gridWidth - 1, Math.ceil(right / cellSize) - 1);
            const startY = Math.max(0, Math.floor(top / cellSize));
            const endY = Math.min(_gridHeight - 1, Math.ceil(bottom / cellSize) - 1);

            // 遍历可见区域内的格子
            for (let y = startY; y <= endY; y++) {
                for (let x = startX; x <= endX; x++) {
                    const index = y * _gridWidth + x;
                    const i = Math.floor(index / 8);
                    const bit = 7 - index % 8;

                    const walkable = !(blockDatas[i] & (0x01 << bit));
                    const maskable = (maskDatas[i] & (0x01 << bit));

                    if (walkable) {
                        // 是否存在动态阻挡
                        if (this.$ctx.mapGridPool.blockGrid?.getIsDynamicBlock(x, y)) {
                            this.graphics.beginFill(0xffff00);
                        } else {
                            this.graphics.beginFill(0xa0e57c);
                        }
                        this.graphics.drawRect(x * cellSize + 1, y * cellSize + 1, cellSize - 2, cellSize - 2);
                        this.graphics.endFill();
                    }

                    if (maskable) {
                        this.graphics.beginFill(0xff0000);
                        this.graphics.drawCircle(x * cellSize + cellSize / 2, y * cellSize + cellSize / 2, 5);
                        this.graphics.endFill();
                    }
                }
            }
        }
    }

    // ==== 
    private get mapBlockDatas(): Uint8Array {
        return this.$ctx.mapGridPool.blockGrid?.mapDatas;
    }

    private get mapMaskDatas(): Uint8Array {
        return this.$ctx.mapGridPool.maskGrid?.mapDatas;
    }
}