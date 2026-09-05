import { ComponentEx } from "./ComponentEx";

export enum PPStarStep{
    EMPTY = 0,
    YELLOW = 1,
    RED = 2
}

export class PPStarComp extends ComponentEx {
    readonly STAR_SHOW_MAX: number = 5; //最多显示星星数量
    readonly STAR_STEP: number = 5; //5颗星为一个阶段

    lstItem: eui.List;

    protected onSkinLoadCompleted(): void {
        super.onSkinLoadCompleted();

        this.lstItem.itemRenderer = PPStarCompItem;
        this.lstItem.dataProvider = new eui.ArrayCollection();
    }

    @SafeCallFunction()
    public setData(star: number, showEmpty: boolean = false) {
        let showNum: number = 0;
        if (star <= this.STAR_STEP) {
            showNum = showEmpty ? this.STAR_SHOW_MAX : star;
        } else {
            showNum = this.STAR_SHOW_MAX;
        }
        let curStep = Math.ceil(star / this.STAR_STEP);
        let curStepNum = star % this.STAR_STEP || this.STAR_STEP;    //当前阶段的星星数量
        let arr: PPStarCompItemType[] = [];
        for (var i = 0; i < showNum; i++) {
            let step: number;
            if (i + 1 <= curStepNum) {
                step = curStep;
            } else {
                step = curStep - 1;
            }
            arr.push({
                step: step
            })
        }
        (this.lstItem.dataProvider as eui.ArrayCollection).replaceAll(arr);
    }
}

///////////////////////////////////////////////////////////
interface PPStarCompItemType {
    step: number,   // 阶段
}

interface PPStarCompItem {
    imgStar: eui.Image;
    ani: egret.tween.TweenGroup;
    ani_stop: egret.tween.TweenGroup;
}

class PPStarCompItem extends eui.ItemRenderer {

    $onRemoveFromStage() {
        this.ani && this.ani.stop();

        super.$onRemoveFromStage();
    }

    public dataChanged() {
        super.dataChanged();

        let data = this.data as PPStarCompItemType;
        this.imgStar.source = `pet_star_step_${data.step}_png`;
        if (data.step > PPStarStep.YELLOW) {
            // 黄星以上展示动效
            this.ani && this.ani.play(0);
        } else {
            this.ani && this.ani.stop();
            this.ani_stop && this.ani_stop.play();
        }
    }
}
