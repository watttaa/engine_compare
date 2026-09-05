import { GlobalValue } from "GlobalValueDefine";

abstract class MutiFrameExecter {
    protected fun: Function;
    protected thisObj: any;
    protected onFrameCnt: number;

    public constructor(func: Function,thisObj: any) {
        this.onFrameCnt = 0;
        this.fun = func;
        this.thisObj = thisObj;
    }

    protected onFrame() {
        
    }

    public run() {
        this.stop();
        UIManager.stage.addEventListener(egret.Event.ENTER_FRAME, this.onFrame, this);
    }

    public stop() {
        UIManager.stage.removeEventListener(egret.Event.ENTER_FRAME, this.onFrame, this);
    }

    public destroy() {
        this.fun = null;
        this.thisObj = null;
        this.stop();
    }
}

export class MutiFrameDataProc extends MutiFrameExecter {
    private data: any[];
    private cacheData: any[];

    private dataGetter: Function;
    private dataWrapper: Function;
    private parms: {chunkLen?: number, maxTime?: number, frameInterval?: number, timeInterval?: number, startDelayTime?: number};

    private useCache: boolean;
    private curIdx: number;

    private lastExeTime: number;

    private startTime: number;
    private enableStartDelayTime: boolean;

    public constructor(func: Function, thisObj: any, dataGetter: Function, dataWrapper: Function, parms:  {chunkLen?: number, maxTime?: number, frameInterval?: number, timeInterval?: number, startDelayTime?: number}) {
        super(func, thisObj);
        this.dataGetter = dataGetter;
        this.dataWrapper = dataWrapper;
        this.parms = parms;
        this.useCache = !this.dataGetter;
        this.curIdx = 0; 
        this.startTime = 0;
        this.enableStartDelayTime = false;
        this.clearData();
    }

    private swapData() {
        this.data = this.cacheData;
        this.cacheData = [];
    }

    private clearData() {
        this.onFrameCnt = 0;
        this.data = [];
        this.cacheData = [];
    }

    private exeFuncOnce() {
        let processData: any[];
        let cLen = this.parms.chunkLen ? this.parms.chunkLen : 1;
        let idx = this.curIdx;
        if (this.useCache) {
            if (this.data.length < cLen) {
                // this.cacheData = this.cacheData.reverse();
                 // 保持data的数据在cacheData之前，这样数据顺序才能保证
                // this.cacheData = this.cacheData.concat(this.data);
                this.cacheData = this.data.concat(this.cacheData);
                this.swapData();
            }
            processData = [];
            for (let i = 0, len = this.data.length; i < cLen && i < len; i++) {
                processData.push(this.data.shift());
            }
        }
        else {
            processData = this.dataGetter.apply(this.thisObj, [this.curIdx, cLen]);
            if (!processData) {
                this.stop();
            return;
            }
            this.curIdx += cLen;
        }
        
        if (this.dataWrapper) {
            processData = this.dataWrapper.apply(this.thisObj, [processData]);
        }
        if (!!this.fun && !!this.thisObj) {
            // if(processData && processData.length) Logger.log(`进程idx:${idx} - ${JSON.stringify(processData)}`);
            this.fun.apply(this.thisObj, [processData, idx]);
            this.lastExeTime = egret.getTimer();
        }
    }

    protected onFrame() {
        let t = egret.getTimer();
        
        if(this.parms.startDelayTime && this.enableStartDelayTime){
            if((t - this.startTime) < this.parms.startDelayTime){
                return;
            }
        }

        this.onFrameCnt += 1;

        //帧数间隔
        let frameInterval = this.parms.frameInterval ? this.parms.frameInterval : 2;
        if(this.onFrameCnt <= frameInterval) return;

        //时间间隔
        let timeInterval = this.parms.timeInterval ? this.parms.timeInterval : 10;
        let interval = t - this.lastExeTime;
        if(interval <= timeInterval) return;

        let maxRunTime = this.parms.maxTime ? this.parms.maxTime : 0;
        while(true) {
            this.exeFuncOnce();
            if (egret.getTimer() - t >= maxRunTime) {
                break;
            }
        }
    }

    public append(items: any[]) {
        if(!this.cacheData){
            this.clearData();
        }
        this.cacheData.push(...items);
        if (this.data.length === 0) {
            this.swapData();
        }
    }

    public run(enableStartDelay: boolean = false) {
        super.run();
        this.enableStartDelayTime = enableStartDelay;
        this.startTime = egret.getTimer();
    }

    public stop() {
        super.stop();
        this.curIdx = 0;
        this.clearData();
    }

    public gotoFrame(){
        this.onFrame();
    }

    public hasData() {
        return this.data.length != 0 || this.cacheData.length != 0;
    }

    public destroy() {
        this.clearData();
        this.dataGetter = null;
        this.dataWrapper = null;
        super.destroy();
    }
}