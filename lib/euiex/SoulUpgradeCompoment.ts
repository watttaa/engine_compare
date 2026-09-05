import { ui_utils_safecall, safeCallComFunc } from "utils/UIUtils_safecall";
import { SoulUpgradeBtn } from "./SoulUpgradeBtn";
import { StartUpMaxCnt } from "GlobalValue";


export class SoulUpgradeCompoment extends eui.Component {
    rectBg: eui.Rect;
    imgLine_1: eui.Image;
    imgLine_2: eui.Image;
    imgLine_3: eui.Image;
    imgLine_4: eui.Image;
    imgLine_5: eui.Image;
    imgLine_6: eui.Image;
    btnStep0: SoulUpgradeBtn;
    btnStep1: SoulUpgradeBtn;
    btnStep2: SoulUpgradeBtn;
    btnStep3: SoulUpgradeBtn;
    btnStep4: SoulUpgradeBtn;
    btnStep5: SoulUpgradeBtn;
    
    // private $tips    : PopPropTips; //属性Tips

    public _isEuiex = true;


    btnLoadDone: boolean;

    private maxCnt:number;
    private curIdx:number;
    private aniBtnLst:number[];
    private lightCallBackCfg:CallbackConfig;
    private startTimeout: number;

    private constructor() {
        super();
        this.skinName = "resource/eui/StarUpProgress.exml";
        this.btnLoadDone = false;
        this.curIdx = 0;
        this.lightCallBackCfg = null;
        this.aniBtnLst = [];
        this.startTimeout = null;
    }

    protected onSkinLoadCompleted() {
        super.onSkinLoadCompleted();
        this.initBtnConnect();
        // this.createTips();
        // GlobalEvent.ListenEvent(FOLLOWER_EVENT.EVENT_SHOW_PROP_TIPS, this.showPopPropTips, this);
        // this.rectBg.addEventListener(egret.TouchEvent.TOUCH_TAP, this.onTouchRect, this);
    }

    public $onRemoveFromStage() {
        this.resetUI();
        // this.$tips && this.$tips.destroy();
        // UIManager.stage.removeEventListener(egret.TouchEvent.TOUCH_BEGIN, this.hideTips, this);
        super.$onRemoveFromStage();
    }

    public resetUI() {
        // GlobalEvent.UnListenEvent(FOLLOWER_EVENT.EVENT_SHOW_PROP_TIPS, this.showPopPropTips, this);
        this.lightCallBackCfg = null;
        this.aniBtnLst = [];
        this.clearTimeOut();
    }

    protected onTouchRect(event: egret.TouchEvent) {
        for (let idx = 0; idx < StartUpMaxCnt; idx++) {
            let btnCom = this[`btnStep${idx}`] as SoulUpgradeBtn;
            if (!btnCom || !btnCom.visible) continue;
            let func = () => { 
                btnCom.updateState(); 
            }
            ui_utils_safecall.safeCallComFuncEuiEx(this, btnCom, func);
        }
    }

    public initBtnConnect() {
        let func = () => {
            this.btnLoadDone = true;
        }
        ui_utils_safecall.safeCallComFuncEuiEx(this, this.btnStep1, func);
    }

    public initData(curIdx: number, star_prop: any[]) {
        this.curIdx = curIdx;
        this.currentState = `lv${star_prop.length}`;
        this.validateNow();
        let length = star_prop.length;
        this.maxCnt = length-1;
        for (let nIdx=0; nIdx < length; nIdx++) {
            let propDict = star_prop[nIdx];
            let btnCom = this[`btnStep${nIdx}`] as SoulUpgradeBtn;
            let func = () => { btnCom.initData(nIdx, curIdx, propDict, length) }
            safeCallComFunc(this, btnCom, func);
            //线条
            this.showImgLine(nIdx, curIdx);
        }
        // this.imgLine_6.visible = false;//只有升星满了的时候才会显示，就是满星动画那两秒显示一下，其他情况不显示
    }

    public showImgLine(nIdx: number, curIdx: number) {
        //线条
        let imgLine = this[`imgLine_${nIdx}`] as eui.Image;
        if(imgLine) {
            imgLine.visible = nIdx <= curIdx;
        }
    }

    public isPlaying() :boolean{
        let btnCom = this[`btnStep${this.curIdx}`] as SoulUpgradeBtn;
        return btnCom.isPlaying()
    }

    @SafeCallFunction()
    public playCurLightAni(btnIdx:number, callBackCfg:CallbackConfig) {
        this.lightCallBackCfg = callBackCfg;
        // for(let idx=0; idx<lightCnt; idx++) {
        //     let btnIdx = this.curIdx + idx;
        //     this.aniBtnLst.push(btnIdx);
        // }
        // this.aniBtnLst.push(lightCnt)
        // this.stepByStepAni();
        let btnCom = this[`btnStep${btnIdx}`] as SoulUpgradeBtn;
        if(btnCom) {
            // this.showImgLine(btnIdx, lastIdx);
            btnCom.playLightAni();
            // this.startTimeout = preload_utils_calldelay.callLater(50, this.stepByStepAni, null, this);
        }
        this.execCallBack();
    }

    private get uiLive() :boolean{
        return this && this.visible;
    }

    private stepByStepAni() {
        this.clearTimeOut();
        if(!this.uiLive) return;
        if(this.aniBtnLst.length <= 0) {
            this.execCallBack();
            return;
        }
        if(this.curIdx == this.maxCnt) {
            // this.imgLine_6.visible = true;//注灵最后一颗
        }
        let lastIdx = this.aniBtnLst[this.aniBtnLst.length-1];
        let btnIdx = this.aniBtnLst.splice(0, 1)[0];
        let btnCom = this[`btnStep${btnIdx}`] as SoulUpgradeBtn;
        if(btnCom) {
            this.showImgLine(btnIdx, lastIdx);
            btnCom.playLightAni();
            this.startTimeout = preload_utils_calldelay.callLater(50, this.stepByStepAni, null, this);
        }
    }

    private execCallBack() {
        if(!this.uiLive) return;
        if(this.lightCallBackCfg) {
            this.lightCallBackCfg.callbackFunc.call(this.lightCallBackCfg.thisObject, this.lightCallBackCfg.args);
            this.lightCallBackCfg = null;
        }
    }

    private clearTimeOut() {
        if(this.startTimeout){
            preload_utils_calldelay.clearCallLater(this.startTimeout);
            this.startTimeout = null;
        }
    }

    // public createTips() {
    //     this.$tips = UIManagerFactroy.createPanel(this, PopPropTips) as PopPropTips;
    //     this.$tips.visible = false;
    //     // this.$tips.z = GlobalValue.topPannelZConfig.ChatMainUI;
    // }

    // private showPopPropTips(evt:GlobalEventSource) {
    //     let prop     = evt.data[0];
    //     let ref_obj  = evt.data[1];
    //     let tipsType = evt.data[2];
    //     safeInvokeFunc(this.$tips, () => { 
    //         this.showTips();
    //         this.$tips.setData(prop, ref_obj, tipsType); 
            
    //     });
    // }

    // private showTips() {
    //     this.$tips.visible = true;
    //     UIManager.stage.addEventListener(egret.TouchEvent.TOUCH_BEGIN, this.hideTips, this);
    // }

    // private hideTips() {
    //     this.$tips.visible = false
    //     UIManager.stage.removeEventListener(egret.TouchEvent.TOUCH_BEGIN, this.hideTips, this);
    // }
}