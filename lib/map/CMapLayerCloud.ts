import { CMapLayer } from "lib/map/CMapLayer";
import { map_define } from "lib/map/mapdefine";

/**迷雾层 */
export class CMapLayerCloud extends CMapLayer {

    constructor() {
        super(map_define.SMapLayer.cloud);

        this.touchEnabled = false;

        this.initBg();

        this.show = false;
    }

    private bgShape: eui.RectangleComponent; // mike todo:SdfRect纯白色，fillAlpha无效，后续优化
    private initBg() {
        this.bgShape = new eui.RectangleComponent();
        this.bgShape.width = 2000;
        this.bgShape.height = 2000;

        this.bgShape.fillColor = 0xffffff;
        this.bgShape.fillAlpha = 0.3;

        this.bgShape.touchEnabled = false;

        this.addChildAt(this.bgShape, 0);
    }

    public fixMapLayer(x: number, y: number) {
        super.fixMapLayer(x, y);

        this.bgShape.x = -x - 200;
        this.bgShape.y = -y - 200;
    }

    public clearLayer() {
        this.show = false;
    }

    private m_bShow: boolean = false;
    public get show() {
        return this.m_bShow;
    }
    public set show(value: boolean) {
        this.m_bShow = value;

        this.bgShape.visible = value;
    }
}