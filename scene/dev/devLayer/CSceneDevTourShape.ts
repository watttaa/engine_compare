import { MapGroup } from "lib/map/MapGroup";

/**
 * 巡游路线 Dev 绘制层：绘制 move_path 锚点折线 + 拐点序号 + NPC 起点标记。
 * 坐标为场景像素坐标（与 NPC x/y 同系），直接绘制无需按格换算。
 */
export class CSceneDevTourShape extends egret.Sprite {

    private $ctx: MapGroup;

    private bShow: boolean = false;

    /** 缓存最近一次数据，show 切换时重绘 */
    private $movePath: [number, number][] = null;
    private $npcStarts: { x: number; y: number; name: string }[] = null;

    /** 序号/名字 label 缓存 */
    private $labels: eui.Label[] = [];

    constructor(world: MapGroup) {
        super();

        this.$ctx = world;

        this.touchEnabled = false;
        this.touchChildren = false;
        this.alpha = 0.85;
    }

    public set show(val: boolean) {
        this.bShow = val;
        this.visible = val;

        if (val) {
            this.$redraw();
        } else {
            this.clearGraphics();
        }
    }
    public get show(): boolean {
        return this.bShow;
    }

    /** 更新巡游路线数据（缓存并绘制） */
    public updateTourRoute(movePath: [number, number][], npcStarts?: { x: number; y: number; name: string }[]) {
        this.$movePath = movePath;
        this.$npcStarts = npcStarts || null;
        this.$redraw();
    }

    public clear() {
        this.$movePath = null;
        this.$npcStarts = null;
        this.clearGraphics();
    }

    public clearGraphics() {
        this.graphics.clear();
        this.$detachLabels();
    }

    private $redraw() {
        this.clearGraphics();

        if (!this.bShow || !this.$movePath || this.$movePath.length < 1) {
            return;
        }

        const path = this.$movePath;

        // 锚点折线
        this.graphics.lineStyle(4, 0xff9900, 0.9);
        this.graphics.moveTo(path[0][0], path[0][1]);
        for (let i = 1; i < path.length; i++) {
            this.graphics.lineTo(path[i][0], path[i][1]);
        }

        // 拐点圆点 + 序号
        for (let i = 0; i < path.length; i++) {
            const p = path[i];
            this.graphics.lineStyle(0);
            this.graphics.beginFill(i === 0 ? 0x00ff00 : 0xffff00, 0.95);
            this.graphics.drawCircle(p[0], p[1], 12);
            this.graphics.endFill();
            this.$attachLabel(`${i}`, p[0] + 14, p[1] - 8, 0xffffff);
        }

        // NPC 起点标记
        if (this.$npcStarts) {
            for (const s of this.$npcStarts) {
                this.graphics.lineStyle(2, 0xffffff, 0.9);
                this.graphics.beginFill(0xff3366, 0.9);
                this.graphics.drawCircle(s.x, s.y, 8);
                this.graphics.endFill();
                if (s.name) {
                    this.$attachLabel(s.name, s.x + 10, s.y - 6, 0xffd298);
                }
            }
        }
    }

    private $attachLabel(text: string, x: number, y: number, color: number) {
        const lbl = new eui.Label();
        lbl.size = 16;
        lbl.textColor = color;
        lbl.stroke = 1;
        lbl.strokeColor = 0x000000;
        lbl.text = text;
        lbl.x = x;
        lbl.y = y;
        this.addChild(lbl);
        this.$labels.push(lbl);
    }

    private $detachLabels() {
        for (const lbl of this.$labels) {
            if (lbl.parent) {
                lbl.parent.removeChild(lbl);
            }
        }
        this.$labels.length = 0;
    }
}
