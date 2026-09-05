
export class ProgressBarStep extends eui.Component {
    public _isEuiex = true;
    private prgBar: eui.ProgressBar;
    private lstDot: eui.List;

    private $total: number;
    private $speed: number;
    private $step: number;
    private $arrCollection: eui.ArrayCollection;

    protected onSkinLoadCompleted(): void {
        super.onSkinLoadCompleted();
        this.$arrCollection = new  eui.ArrayCollection();
        this.lstDot.dataProvider = this.$arrCollection;
    }

    private init(total: number, step: number, speed?: number, dotItemRender?: typeof eui.ItemRenderer) {
        this.$total = total;
        this.$speed = speed || this.prgBar.slideDuration;
        this.$step = step;
        this.lstDot.itemRenderer = dotItemRender || ProgressBarStepDot;
        this.prgBar.maximum = total;
        let lstData = [];
        for (let i=0; i<step; i++) {
            lstData.push({isAct: 0, isUp: false});
        }
        lstData.unshift({isAct: 1, isUp: false});
        this.$arrCollection.source = lstData;
        this.$arrCollection.refresh();
    }

    private updateList(isUp: boolean = false) {
        let curStep = Math.floor((this.prgBar.value / this.prgBar.maximum) * this.$step);
        let lstData = this.$arrCollection.source.map((value, index) => {
            if (index < curStep) {
                return {isAct: 1, isUp: false};
            } else if (index == curStep) {
                return {isAct: 1, isUp: isUp};
            } else {
                return {isAct: 0, isUp: false};
            }
        })
        this.$arrCollection.source = lstData;
        this.$arrCollection.refresh();
    }

    @SafeCallFunction()
    public update(cur: number, total: number, step: number, speed?: number, isUp?: boolean, dotItemRender?: typeof eui.ItemRenderer) {
        if (!this.$total || this.$total !== total || this.$step !== step) {
            this.init(total, step, speed, dotItemRender)
        }
        let durationTime = Math.abs((cur - this.prgBar.value) / this.prgBar.maximum * this.$speed);
        egret.Tween.get(this.prgBar, {
            onChange: this.updateList,
            onChangeObj: this
        }, undefined, true).to({ value: cur }, durationTime).call(this.updateList, this, [isUp]);
    }

}

export class ProgressBarStepDot extends eui.ItemRenderer {
    protected dataChanged(): void {
        if (this.data.isUp) {
            this.onUp();
        } else {
            this.changeCurrentState();
        }
    }

    protected changeCurrentState() {
        this.currentState = this.data.isAct ? "light" : "gray";
    }

    protected onUp() {
        this.changeCurrentState();
    }
}