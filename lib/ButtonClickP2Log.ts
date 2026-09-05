import { MainBottomUIDef } from "s2/mainui/MainUIDef";

export class ButtonClickP2Log extends SingletonClassEx {

    timer: egret.Timer;

    constructor() {
        super();
        this.reset();
        this.timer = new egret.Timer(1000 * 60 * 5, 0); // 5分钟一次
        this.timer.addEventListener(egret.TimerEvent.TIMER, this.send, this);
        this.timer.start();
    }

    public send() {
        //this.sendLog(); 
        this.sendActMainLog();
        this.reset();
    }
    

    //弃用
    public sendLog() {
        let clicked = false;
        for (let btnName in this.entranceIconCount) {
            if (this.entranceIconCount[btnName]) {
                clicked = true;
                break;
            }
        }
        if (!clicked) {
            for (let btnName in this.bottomBtnCount) {
                if (this.bottomBtnCount[btnName]) {
                    clicked = true;
                    break;
                }
            }
        }
        if (clicked) {
            client_log_utils.handleBtnClickLog({
                bottom_click: this.bottomBtnCount,
                bottom_stay_click: this.bottomBtnCountNotChange,
                entrance_click: this.entranceIconCount,
                entrance_click_inwar: this.entranceIconCountInWar
            } as BtnClickLogData);
        }
    }

    public sendActMainLog() {
        if (!this.actMainCount) return;
        let clicked = Object.values(this.actMainCount).length > 0;
        if (clicked) {
            client_log_utils.handleBtnClickActMainLog(this.actMainCount);
        }
    }

    public reset(){
        this.bottomBtnCount = {};
        this.bottomBtnCountNotChange = {};
        this.entranceIconCount = {};
        this.entranceIconCountInWar = {};
        this.actMainCount = {};
    }

    // 底部按钮
    bottomBtnCount: {[btnName:string]: number};

    public addBottomBtn(btn: MainBottomUIDef, time: number = 1){
        this.bottomBtnCount[btn] = this.bottomBtnCount[btn] || 0;
        this.bottomBtnCount[btn] += time;
    }

    bottomBtnCountNotChange: {[btnName:string]: number};

    public addBottomBtnNotChange(btn: MainBottomUIDef, time: number = 1){
        this.bottomBtnCountNotChange[btn] = this.bottomBtnCountNotChange[btn] || 0;
        this.bottomBtnCountNotChange[btn] += time;
    }
    // 日常 和 背包
    entranceIconCount: {[btnName:string]: number};
    entranceIconCountInWar: {[btnName:string]: number};

    actMainCount: {[openId:number]: BtnClickActMainLogData};

    public addEntranceIcon(btnName: string, time: number = 1) {
        this.entranceIconCount[btnName] = this.entranceIconCount[btnName] || 0;
        this.entranceIconCount[btnName] += time;
    }

    public addEntranceIconInWar(btnName: string, time: number = 1) {
        this.entranceIconCountInWar[btnName] = this.entranceIconCountInWar[btnName] || 0;
        this.entranceIconCountInWar[btnName] += time;
    }

    public addActivtyMainclick(main_open_id: number, sub_open_id: number, systemName: string, btnName: string, time: number = 1) {
        if (!this.actMainCount[main_open_id]) {
            this.actMainCount[main_open_id] = {
                system: main_open_id, // 系统id
                gameplay_name: systemName, // 玩法名字
                btn_name: {},
            } as BtnClickActMainLogData;
        }
        if (!this.actMainCount[main_open_id].btn_name) {
            this.actMainCount[main_open_id].btn_name = {};
        }
        if (!this.actMainCount[main_open_id].btn_name[sub_open_id]) {
            this.actMainCount[main_open_id].btn_name[sub_open_id] = {
                clickCnt: 0, // 点击次数
                name: btnName, // 按钮名字
            }
        }
        this.actMainCount[main_open_id].btn_name[sub_open_id].clickCnt += time;

    }

    public destroy() {
        this.send();
        if (this.timer){
            this.timer.stop();
            this.timer = null;
        }
    }
}