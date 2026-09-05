import { ElemTipsUI } from "tips/ElemTipsUI";
import { TypeTipsUI } from "tips/TypeTipsUI";

export class TypeItemRender extends eui.ItemRenderer {
    public _isEuiex = true;
    private img: eui.Image;

    private constructor() {
        super();
        this.skinName = "resource/eui_skins/TypeItemSkin.exml";
    }

    protected onSkinLoadCompleted() {
        super.onSkinLoadCompleted();
        this.img.addEventListener(egret.TouchEvent.TOUCH_TAP, this.onTouchImg, this);
    }

    private onTouchImg() {
        let stateName = this.data[0]
        let toGlobal = this.img.localToGlobal();
        let gPos: Point = { x: toGlobal.x + this.img.width / 2, y: toGlobal.y }
        //五行图标
        if (stateName == "Elem") {
            let elem = this.data[1];
            UIManager.open(ElemTipsUI).then((inst: ElemTipsUI) => {
                inst.setData(elem, gPos)
            })
        }
        //战斗类型(type)，特性，伤害类型
        else if (["Type", "Talent", "Hurt"].indexOf(stateName) > -1) {
            let value = this.data[1];
            UIManager.open(TypeTipsUI).then((inst: TypeTipsUI) => {
                inst.setData(value, stateName, gPos)
            })
        }
    }

    public dataChanged() {
        super.dataChanged();
        //stateName："Type", "Talent", "Hurt", "Elem"
        let stateName = this.data[0]
        //index："Type":1-4, "Talent":1-4, "Hurt"：1-2, "Elem"：1-5
        let index = this.data[1];
        this.currentState = `${stateName}${index}`;
        //列表左右翻转的时候子项也左右翻转一下才能保证显示正常
        let flagX = this.parent.scaleX / Math.abs(this.parent.scaleX);
        this.scaleX = flagX * Math.abs(this.scaleX);
    }
}
