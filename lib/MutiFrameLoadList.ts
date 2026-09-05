import { MutiFrameDataProc } from "lib/MutiFrameExe"
import { ui_utils_list } from "utils/UIUtils_list";

/**
 * 主要用于异步加载list的
 */
export class SyncLoadList {
    public static LOW_TIME_INTERVAL: number = 100;
    public static MIDDLE_TIME_INTERVAL: number = 50;

    protected $mutiFrameProc: MutiFrameDataProc;

    protected tarLst: eui.List;
    protected chunkLen: number;
    protected frameInterval: number;
    protected timeInterval: number;
    protected startDelayTime: number;
    protected tableData: any[];
    protected call;
    protected callFunc: Function;//分帧加载完的回调
    protected loadType: string;

    public constructor(lst: eui.List, chunkLen: number, param: {frameInterval?: number, timeInterval?: number, startDelayTime?: number} = {}) {
        this.tarLst = lst;
        this.chunkLen = chunkLen;
        this.frameInterval = param.frameInterval;
        this.timeInterval = param.timeInterval;
        this.startDelayTime = param.startDelayTime;
    }

    public loadList(tableData: any[], loadType: "source" | "replace" | "sync" | "syncStartDelay", callFunc?: Function, call?: any) {
        if (!this.tarLst) {
            egret.log('还没有注册列表信息')
            return;
        }
        this.loadType = loadType;
        this.call = call;
        this.callFunc = callFunc;
        this.tableData = tableData;
        //设置数据
        this.$mutiFrameProc && this.$mutiFrameProc.stop();
        let dataProvider = (this.tarLst.dataProvider) as eui.ArrayCollection;
        // let loadType:"source"|"replace"|"sync" = this.changeLoadType(type);
        if (loadType == "sync" || loadType == "syncStartDelay") {
            this.syncUpdateTable();
            // this.tarLst.scrollV = 0;
        } else if (loadType == "replace") {
            dataProvider.replaceAll(this.tableData);
        } else {
            dataProvider.source = this.tableData;
        }
    }

    // private changeLoadType(type:"source"|"replace"|"sync"|"auto") :"source"|"replace"|"sync"{
    //     if(type != "auto") return type;
    //     let loadType:"source"|"replace"|"sync";
    //     let dataProvider = (this.tarLst.dataProvider) as eui.ArrayCollection;
    //     if(dataProvider.source.length<=0){//第一次的时候
    //         loadType = "sync";
    //     }else{
    //         loadType = "source";
    //     }
    //     return loadType;
    // }

    public onClose() {
        this.$mutiFrameProc && this.$mutiFrameProc.stop();
        if (this.tarLst) {
            let dataProviderLeft = this.tarLst.dataProvider as eui.ArrayCollection
            dataProviderLeft.removeAll();
        }
    }

    public destroy() {
        this.$mutiFrameProc && this.$mutiFrameProc.stop();
        this.$mutiFrameProc = null;
        if (this.tarLst) {
            let dataProviderLeft = this.tarLst.dataProvider as eui.ArrayCollection
            dataProviderLeft.removeAll();
        }
        this.tarLst = null;
    }

    private getTableData(start: number, num: number) {
        let items = this.tableData;
        let length = items.length;
        if (start >= length) {
            return null;
        }
        let ret = [];
        for (let i = start; i < length && i < start + num; i++) {
            ret.push(items[i]);
        }
        return ret;
    }

    private syncUpdateTable() {
        let dataProvider = (this.tarLst.dataProvider) as eui.ArrayCollection;
        dataProvider.removeAll();
        if (!this.$mutiFrameProc) {
            this.$mutiFrameProc = new MutiFrameDataProc((data: any[], idx: number) => {
                let dataProvider = (this.tarLst.dataProvider) as eui.ArrayCollection;
                for (let i = 0; i < this.chunkLen; i++) {
                    let cIdx = idx + i;
                    let itemInfo = data[i];
                    if (itemInfo != undefined) { //最后几个少于 this.chunkLen 
                        ui_utils_list.updateArrCollection(dataProvider, itemInfo, cIdx);
                    }
                }
                if (idx + this.chunkLen >= this.tableData.length) {
                    if (this.call && this.callFunc) {
                        this.callFunc.apply(this.call);
                    }
                }
                // dataProvider.addItem(data[0]);
            }, this, this.getTableData, null, { chunkLen: this.chunkLen, frameInterval: this.frameInterval, timeInterval: this.timeInterval , startDelayTime: this.startDelayTime});
        }
        this.$mutiFrameProc.run(this.loadType === "syncStartDelay");
    }
}

export class SyncLoadListAuto extends SyncLoadList {

    /**
     * 只stop，不清空list
     */
    public onClose(){
        this.$mutiFrameProc && this.$mutiFrameProc.stop();
    }
}