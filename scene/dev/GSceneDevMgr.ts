
import { MAPGROUP_CELL_SIZE } from "GlobalValue";
import { component_define } from "avatar/comp/componentdefine";
import { right_click } from "developHelp/rightclick";
import { MapGroup } from "lib/map/MapGroup";
import { map_define } from "lib/map/mapdefine";
import { area_define } from "world/area/area_define";
import { scene_priority_define } from "world/scene/buffer/scene_priority_define";
import { CSceneDevUI } from "world/scene/dev/CSceneDevUI";
import { CSceneDevBlockShape } from "world/scene/dev/devLayer/CSceneDevBlockShape";
import { CSceneDevPathsShape } from "world/scene/dev/devLayer/CSceneDevPathsShape";
import { CSceneDevTourShape } from "world/scene/dev/devLayer/CSceneDevTourShape";

export class GSceneDevMgr extends egret.HashObject {

    /** 当前场景 Dev 管理器实例（DEV 下由业务侧绘制巡游路线等调试信息） */
    public static instance: GSceneDevMgr;

    private ctx: MapGroup;

    private devBlockShape: CSceneDevBlockShape;
    private devPathsShape: CSceneDevPathsShape;
    private devTourShape: CSceneDevTourShape;

    constructor(ctx: MapGroup) {
        super();

        this.ctx = ctx;

        GSceneDevMgr.instance = this;

        this.regRightClick();

        this.initDeveShapes();

        if (DEV) {
            G123.set("GSceneDevMgr", this);
        }
    }
    dispose() {
        if (GSceneDevMgr.instance === this) {
            GSceneDevMgr.instance = null;
        }
        this.ctx = null;
        this.devBlockShape = null;
        this.devPathsShape = null;
        this.devTourShape = null;
    }

    private regRightClick() {
        right_click.regDebugRightClick(this.ctx.parent, this as any, this.onDoRightClick);
    }

    private onDoRightClick() {
        this.show = !this.show;
    }

    private bShow: boolean = false;

    private set show(val: boolean) {
        this.bShow = val;

        this.devBlockShape.show = val;

        this.devPathsShape.show = val;

        this.devTourShape.show = val;

        if (val) {
            O3(CSceneDevUI, (inst: CSceneDevUI) => {
                inst.setData();
            })
        } else {
            UIManager.close(CSceneDevUI);
        }

        if (!val) {
            this.detachEndCellLabel();
        }
    }
    private get show(): boolean {
        return this.bShow;
    }

    private initDeveShapes() {
        let blockLayer = this.ctx.createLayer(map_define.SMapLayer.block);

        if (!this.devBlockShape) {
            this.devBlockShape = new CSceneDevBlockShape(this.ctx);
            blockLayer.addChild(this.devBlockShape);
        }

        if (!this.devPathsShape) {
            this.devPathsShape = new CSceneDevPathsShape(this.ctx);
            blockLayer.addChild(this.devPathsShape);
        }

        if (!this.devTourShape) {
            this.devTourShape = new CSceneDevTourShape(this.ctx);
            blockLayer.addChild(this.devTourShape);
        }
    }

    public fixBlockArea() {
        this.devBlockShape?.fixBlockArea();
    }

    public clear() {
        this.devBlockShape?.clear();
        this.devPathsShape?.clear();
        this.devTourShape?.clear();
    }

    /** 绘制巡游路线：move_path 锚点折线 + 拐点序号 + NPC 起点标记 */
    public updateTourRoute(movePath: [number, number][], npcStarts?: { x: number; y: number; name: string }[]) {
        this.devTourShape?.updateTourRoute(movePath, npcStarts);
    }

    /** 清除巡游路线 */
    public clearTourRoute() {
        this.devTourShape?.clear();
    }

    public updateDebugPaths(paths: [number, number][], endCell: Point) {
        this.devPathsShape?.updateDebugPaths(paths, endCell);

        this.bShow && this.attachEndCellLabel(endCell);
    }

    public clearDebugPaths() {
        this.devPathsShape?.clearGraphics();

        this.detachEndCellLabel();
    }

    // 终点坐标label
    private m_endCellLabel: eui.Label;
    private attachEndCellLabel(endCell: Point) {
        if (!this.bShow) {
            return;
        }

        let blockLayer = this.ctx.createLayer(map_define.SMapLayer.block);
        if (!blockLayer) {
            return;
        }

        if (!this.m_endCellLabel) {
            this.m_endCellLabel = new eui.Label();
            this.m_endCellLabel.size = 14;
            this.m_endCellLabel.textColor = 0xffffff;
            this.m_endCellLabel.stroke = 1;
            this.m_endCellLabel.strokeColor = 0x000000;
        }

        if (!this.m_endCellLabel.parent) {
            blockLayer.addChild(this.m_endCellLabel);
        }

        const cellSize = MAPGROUP_CELL_SIZE;
        const pos = { x: endCell.x * cellSize, y: endCell.y * cellSize };
        this.m_endCellLabel.text = `(${pos.x}, ${pos.y})`;
        this.m_endCellLabel.x = pos.x - this.m_endCellLabel.width / 2;
        this.m_endCellLabel.y = pos.y + this.m_endCellLabel.height + 40;
    }

    private detachEndCellLabel() {
        if (this.m_endCellLabel && this.m_endCellLabel.parent) {
            this.m_endCellLabel.parent.removeChild(this.m_endCellLabel);
        }
    }


    // ===test
    public testLazyLoad(bol: boolean = true) {
        if (DEV) {
            component_define.lazyLoadEnabled = bol;
            area_define.debugArea = true;
            FreeLoadSwitch.enableNewPreload(false);
            RESCacheHelpper.getCacheMgr('model').setMaxSize(0);
        }

    }

    /**测试屏外对象创建延迟 */
    public testOffscreenDefer(bol: boolean = true) {
        if (DEV) {
            scene_priority_define.screenGateEnabled = bol;
             area_define.debugArea = true;
            scene_priority_define.CREATE_ZONE_SCALE = 1;
        }
    }
}