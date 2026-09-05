/**
 * 解决进度条倒退的问题
 * 比如6->4改变为6->0->4
 */
export class ProgressBarForward extends eui.ProgressBar {
    public _isEuiex = true;
    private $defalutSlideDuration: number;

    protected childrenCreated() {
        super.childrenCreated();
        this.$defalutSlideDuration = this.slideDuration;
    }


    public $setValue(newValue: number): boolean {
        newValue = +newValue || 0;
        // 新数值比原来的数值小，先把进度瞬间变为0，再从0增长
        if (this.completed && this.value > newValue) {
            this.slideDuration = 0;
            super.$setValue(0);
            this.slideDuration = this.$defalutSlideDuration;
        }

        return super.$setValue(newValue);
    }
}
