import { ElemTipsUI } from "tips/ElemTipsUI";
import { TypeTipsUI } from "tips/TypeTipsUI";

export class TypeItemButton extends eui.Button {
    private img: eui.Image;

    private data: any;
    private constructor() {
        super();
        this.skinName = "resource/eui_skins/BtnSkin_Type.exml";
    }

    @SafeCallFunction()
    public setData(data: any) {
        this.data = data;
        this.img.source = `icon_${data[0]}_${data[1]}_png`
    }

    public $onAddToStage(stage: egret.Stage, nestLevel: number) {
        super.$onAddToStage(stage, nestLevel);
        this.addEventListener(egret.TouchEvent.TOUCH_TAP, this.onTouchImg, this);
    }

    public $onRemoveFromStage() {
        super.$onRemoveFromStage();
        this.removeEventListener(egret.TouchEvent.TOUCH_TAP, this.onTouchImg, this);
    }



    private onTouchImg() {
        if(!this.data) return;
        let stateName = this.data[0]
        let toGlobal = this.img.localToGlobal();
        let gPos: Point = { x: toGlobal.x + this.img.width / 2, y: toGlobal.y }
        //五行图标
        if (stateName == "elem") {
            let elem = this.data[1];
            UIManager.open(ElemTipsUI).then((inst: ElemTipsUI) => {
                inst.setData(elem, gPos)
            })
        }
        //战斗类型(type)，特性，伤害类型
        else if (["type", "trait", "hurt"].indexOf(stateName) > -1) {
            let value = this.data[1];
            UIManager.open(TypeTipsUI).then((inst: TypeTipsUI) => {
                inst.setData(value, stateName, gPos)
            })
        }
    }
}

