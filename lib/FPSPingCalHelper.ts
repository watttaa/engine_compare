
const FPS_TICK = 1; // 1秒记录一次
const RTT_TICK = 60; // 60秒记录一次
const PING_TICK = 60; // 60秒记录一次
const UPLOAD_TICK = 300; // 5分钟上报一次
const RTT_LEN = Math.ceil(UPLOAD_TICK / RTT_TICK); // 最终的数据长度
const PING_LEN = Math.ceil(UPLOAD_TICK / PING_TICK); // 最终的数据长度

export class FPSPingCalHelper extends SingletonClassEx {
    private $running: boolean;
    private $timer: FixedTimer;
    private $times: number;

    // fps
    private $fpsData: FPSData = new FPSData();
    // rtt
    private $rttValue: number[];
    private $lastRTT: number; // 最新的rtt
    // ping
    private $pingValue: number[];

    clear(): void {
        super.clear()
        this.stop();
    }

    public start() {
        if (this.$running) {
            return;
        }
        this.resetData();
        this.$timer = new FixedTimer(1e3, 0);
        this.$timer.addEventListener(egret.TimerEvent.TIMER, this.onTick, this);
        this.$timer.start();
        ServerTimerMgr.getInstance().addEventListener(ServerTimerEvent.SERVER_TIME_RESPONSE, this.onRttValue, this);
        ClientSDKMgr.getInstance().addEventListener(ClientSDKEvent.PING_MSG, this.onPingValue, this);
        this.$running = true;
    }

    public stop() {
        if (!this.$running) {
            return;
        }
        this.$timer?.stop();
        this.$timer?.removeEventListener(egret.TimerEvent.TIMER, this.onTick, this);
        ServerTimerMgr.getInstance().removeEventListener(ServerTimerEvent.SERVER_TIME_RESPONSE, this.onRttValue, this)
        ClientSDKMgr.getInstance().removeEventListener(ClientSDKEvent.PING_MSG, this.onPingValue, this);
        this.$running = false;
    }

    private resetData() {
        this.$times = 0;
        this.$rttValue = [];
        this.$lastRTT = -1;
        this.$pingValue = [];
    }

    private onTick() {
        if (!this.$running) {
            return;
        }
        this.$times++;
        this.fpsHandler(this.$times);
        this.rttHandler(this.$times);
        this.pingHandler(this.$times);
        this.uploadHandler(this.$times);
    }

    private fpsHandler(times: number) {
        if (times % FPS_TICK != 0) {
            return;
        }
        this.$fpsData.stat();
    }

    private rttHandler(times: number) {
        if (times % RTT_TICK != 0) {
            return;
        }
        this.$rttValue.push(this.$lastRTT);
        if (this.$rttValue.length > RTT_LEN) {
            this.$rttValue.shift();
        }
        this.$lastRTT = -1; //用完就重置
    }

    private pingHandler(times: number) {
        if (times % PING_TICK != 0) {
            return;
        }
        GateClient.getInstance().send_ping_gate();
    }

    private uploadHandler(times: number) {
        if (times < UPLOAD_TICK) {
            // 至少时长
            return;
        }
        if (this.$rttValue.length < RTT_LEN || this.$pingValue.length < PING_LEN) {
            // 数量不够
            return;
        }
        client_log_utils.handleFPS(this.$fpsData.getLimit(), this.$fpsData.getValue(), this.$rttValue, this.$pingValue);
        this.resetData()
    }

    private onRttValue(evt: ServerTimerEvent): void {
        const data = evt.data as { rtt: number };
        this.$lastRTT = data?.rtt ?? -1;
    }

    private onPingValue(evt: ClientSDKEvent) {
        const data = evt.data as { ping: number };
        this.$pingValue.push(data?.ping ?? -1);
        if (this.$pingValue.length > PING_LEN) {
            this.$pingValue.shift();
        }
    }

    // public print() {
    //     console.log(this.$rttValue);
    //     console.log(this.$pingValue);
    // }
}

class FPSData {
    private $limit: number; // 帧速率（应该是30帧或者60帧）
    private $value: FPS30DictType & FPS60DictType;
    private $totalNum: number; // 总帧数和
    private $totalCnt: number; // 总帧数计数

    public getLimit() {
        return this.$limit;
    }

    public getValue() {
        // 计算平均帧率
        this.$value.avg_fps = this.$totalCnt ? Math.floor(this.$totalNum / this.$totalCnt) : 0;
        if (this.$limit == 30) {
            // 删掉60帧的字段
            delete this.$value.fps28_40;
            delete this.$value.fps40_55;
            delete this.$value.fps55_;
            return this.$value as FPS30DictType;
        }
        else {
            // 删掉30帧的字段
            delete this.$value.fps28_;
            return this.$value as FPS60DictType;
        }
    }

    public reset(limit?: number) {
        this.$limit = limit || LoginInst.MainInst.stage.frameRate;
        this.$value = {
            avg_fps: 0,     // 30帧与60帧共用
            fps_18: 0,      // 30帧与60帧共用
            fps18_25: 0,    // 30帧与60帧共用
            fps25_28: 0,    // 30帧与60帧共用
            fps28_: 0,      // 30帧单独使用
            fps28_40: 0,    // 60帧单独使用
            fps40_55: 0,    // 60帧单独使用
            fps55_: 0,      // 60帧单独使用
        };
        this.$totalNum = 0;
        this.$totalCnt = 0;
    }

    public stat() {
        const limit = LoginInst.MainInst.stage.frameRate;
        if (limit != 30 && limit != 60) { // 只关注30帧与60帧
            return;
        }
        const perf = egret.sys.getPerformace();
        const fps = perf?.fps || 0;
        if (!fps) {
            return;
        }
        if (this.$limit != limit) { // 中途发生变化，重置
            this.reset(limit);
        }
        // 累计
        this.$totalNum += fps;
        this.$totalCnt += 1;
        // 分区帧数自增
        if (fps >= 55) {
            this.$value.fps55_ += 1;
            this.$value.fps28_ += 1;
        }
        else if (fps >= 40) {
            this.$value.fps40_55 += 1;
            this.$value.fps28_ += 1;
        }
        else if (fps >= 28) {
            this.$value.fps28_40 += 1;
            this.$value.fps28_ += 1;
        }
        else if (fps >= 25) {
            this.$value.fps25_28 += 1;
        }
        else if (fps >= 18) {
            this.$value.fps18_25 += 1;
        }
        else {
            this.$value.fps_18 += 1;
        }
    }
}