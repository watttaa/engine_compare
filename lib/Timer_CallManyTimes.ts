
export let TIME_CNT_INTERVAL_1_S = 1000;

export class CallManyTimes {
    public get status() {
        return this.$status;
    }

    private $cur: FixedTimer;
    private $status: "start" | "stop";
    private $startTime: number;
    // private $pauseTime1: number;
    // private $pauseTime: number;
    public count: number;
    private isCompleted:boolean;

    constructor(public maxCount: number, private interval: number, private func: Function, private args?: any[], 
            private thisObject?: any, private endFunc?: Function, private endFuncArgs?: any[], private timerArgs?: any) {
        this.$cur = new FixedTimer(interval, maxCount, timerArgs);
        this.count = this.maxCount;
        this.$status = "stop";
        this.isCompleted = false;
    }

    public get delay(): number {
        return this.$cur.delay;
    }

    public set delay(value: number) {
        this.$cur.delay = value;
    }

    public getMax(){
        return this.maxCount;
    }

    private countDown(evt: egret.TimerEvent) {
        if (this.$pasuse) {
            return;
        }
        if (this.count <= 0) {
            return;
        }
        this.count = this.count - 1;
        let funcArgs = [];
        this.args && this.args.forEach(
            (value) => {
                funcArgs.push(value);
            }
        );
        let deltaTime = Date.now() - this.$startTime /*- this.$pauseTime*/
        let restCount = preload_utils_time.getRestCount(this.maxCount, deltaTime, this.interval);
        funcArgs.push(restCount);
        funcArgs.push(deltaTime);

        this.func && this.func.apply(this.thisObject, funcArgs);
        if (restCount <= 0) {
            this.count = 0;
            if(!this.isCompleted){
                this.isCompleted = true;
                this.stop();
                this.doEndAction();
            }
            return;
        }
    }

    private doEndAction(){
        this.endFunc && this.endFunc.apply(this.thisObject, this.endFuncArgs);
    }
    
    private onCountDownComplete(evt: egret.TimerEvent) {
        this.doEndAction();
        this.isCompleted = true;
    }

    private $pasuse: boolean;
    public set pause(pause: boolean) {
        // this.$cur.pause = pause;
        // if (this.$pasuse == false && pause) {
        //     this.$pauseTime1 = Date.now();
        // }

        // if (this.$pasuse && !pause) {
        //     this.$pauseTime += Date.now() - this.$pauseTime1;
        // }
        this.$pasuse = pause;
    }


    public start() {
        this.$cur.addEventListener(egret.TimerEvent.TIMER, this.countDown, this);
        this.$cur.addEventListener(egret.TimerEvent.TIMER_COMPLETE, this.onCountDownComplete, this);
        this.$startTime = Date.now();
        // this.$pauseTime1 = Date.now();
        // this.$pauseTime = 0;
        this.$cur.start();
        this.$status = "start";
        this.isCompleted = false;
    }

    public reset() {
        this.count = this.maxCount;
        this.$cur.reset();
        this.$status = "stop";
        this.isCompleted = false;
    }

    public setMaxCountAndRestart(maxCount: number){
        this.stop();
        this.maxCount = maxCount;
        this.restart();
    }

    public stop() {
        this.$cur.removeEventListener(egret.TimerEvent.TIMER, this.countDown, this);
        this.$cur.removeEventListener(egret.TimerEvent.TIMER_COMPLETE, this.onCountDownComplete, this);
        this.$cur.stop();
        this.$status = "stop";
    }

    public cancel() {
        this.$cur && this.$cur.stop();
        this.$status = "stop";
    }

    public restart() {
        this.reset();
        this.start();
    }
}
