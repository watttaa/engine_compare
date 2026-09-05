// TypeScript file

import { s2_global_value_cfg } from "auto/global_value";
import { s2_GUIDE_ID, s2_guide_cfg } from "auto/guide";
import { s2_guide_condition } from "auto/guide_condition";
import { s2_guide_register_cfg } from "auto/guide_register";
import { GuideAniEnum } from "base/Enum";
import { CommonEvent } from "event/CommonEventDefines";
import { GlobalData } from "GlobalData";
import { GlobalEventSource, SendEvent } from "GlobalEvent";
import { GlobalValue } from "GlobalValueDefine";
import { HeroMainModel } from "heroMain/HeroMainModel";
import { EventBus } from "lib/CommonEventMgr";
import { gameplay_ui_culling } from "lib/GamePlayUICulling";
import { GuideEvent, GuideEventBus } from "lib/GuideEvent";
import { GuideModel } from "lib/GuideModel";
import { RedPointTreeHelper, RedPointTreeManager } from "lib/RedPointManager";
import { TweenGroupPanel } from "lib/TweenGroupPanel";
import { UIManagerFactroy } from "lib/UIManagerFactory";
import { searchParams_utils } from "login/SearchParamsUtils";
import { GuideSkillsExtEntry } from "net/ViewSNet";
import { GuideCNet } from "s2/guide/net/GuideCNet";
import { clearPlotMode } from "s2/plot/PlotMode";
import { GuideFingerUI } from "view/GuideFingerUI";
import { GuideRegister } from "view/GuideRegister";
import { GuideFinger } from "./GuideFingerVfx";

export type GuideExtEntry = {
    skills: { [key: number]: GuideSkillsExtEntry }
}

class GuideStep {

    private $guide: Guide;
    private $gid: number;
    private $step: number;
    private $order: number;
    private $fingerTrace: eui.Group;
    private $fingerAni: egret.DisplayObject;
    private $fingerStartAni: egret.MovieClip;
    private $traceObj: egret.DisplayObject;
    private $finishCondition: number;
    private $specFinishCondition: any[];
    private $retryCnt: number;
    /**新手指引延迟索引 */
    private startTimeout: number;
    private m_isStop: boolean;

    public constructor(guide: Guide) {
        this.$guide = guide;
        this.$gid = 0;
        this.$step = 0;
        this.$finishCondition = -1;
        this.$retryCnt = 0;
        this.$specFinishCondition = [];
        this.m_isStop = false;
    }

    public getGuide() {
        return this.$guide;
    }

    public set traceObj(obj: egret.DisplayObject) {
        this.$traceObj = obj;
    }

    public get traceObj() {
        return this.$traceObj;
    }

    public set finishCondition(condition) {
        this.$finishCondition = condition;
    }

    public get finishCondition() {
        return this.$finishCondition;
    }

    public get specFinishCondition() {
        return this.$specFinishCondition;
    }

    public get gid() {
        return this.$gid;
    }

    public set gid(gid) {
        this.$gid = gid;
    }

    public get step() {
        return this.$step;
    }

    public set step(step) {
        this.$step = step;
    }

    public set order(order) {
        this.$order = order;
    }

    public get order() {
        return this.$order;
    }

    public get fingerAni() {
        return this.$fingerAni;
    }

    public set fingerTrace(obj: eui.Group | null) {
        this.$fingerTrace = obj;
    }

    public get fingerTrace() {
        return this.$fingerTrace;
    }

    public set fingerAni(fingerAni: egret.DisplayObject) {
        this.$fingerAni = fingerAni;
    }

    public get fingerStartAni() {
        return this.$fingerStartAni;
    }

    public set fingerStartAni(fingerStartAni: egret.MovieClip) {
        this.$fingerStartAni = fingerStartAni;
    }

    public set isStop(condition) {
        this.m_isStop = condition;
    }

    public get isStop() {
        return this.m_isStop;
    }

    public start() {
        if (this.startTimeout) {
            preload_utils_calldelay.clearCallLater(this.startTimeout);
            this.startTimeout = null;
        }
        if (this.m_isStop) {
            this.m_isStop = false;
            return;
        }

        Logger.log(`Start guide!! GID${this.$gid}, STEP${this.$step}, retryCnt${this.$retryCnt}`);
        let suc = GuideEngine.getInst().startGuideStep(this);
        if (!suc) {
            if (this.$retryCnt < 10) {
                Logger.log(`次数小于10次，延迟500ms重新查找，GID${this.$gid}, STEP${this.$step}, retryCnt${this.$retryCnt}`);
                this.startTimeout = preload_utils_calldelay.callLater(500, this.start, null, this);
                this.$retryCnt += 1;
            } else {
                Logger.log(`重试次数达到上限，GID: ${this.$gid}, STEP: ${this.$step}`);
                Logger.log(`[#GuideEngine]: on guide fail KEY---${this.gid}`);
                EventBus.dispatchEvent(new CommonEvent(CommonEvent.GUIDE_FAIL, { gid: this.gid }));

                this.$retryCnt = 0;
            }
        } else {
            this.$retryCnt = 0;
        }
    }

    public stop() {
        Logger.log(`Stop guide!! GID${this.$gid}, STEP${this.$step}`);
        if (this.startTimeout) {
            preload_utils_calldelay.clearCallLater(this.startTimeout);
            this.startTimeout = null;
        }
        return GuideEngine.getInst().stopGuideStep(this);
    }

    public clientStop() {
        Logger.log(`clientStop guide!! GID${this.$gid}, STEP${this.$step}`);
        this.m_isStop = true;
        this.stop();
    }


    public getStepStr() {
        return `GUIDE: ${this.gid}-${this.step} `;
    }

}


class Guide {

    private $steps: GuideStep[];
    private $idx: number;
    private $gid: number;

    public constructor() {
        this.$steps = new Array<GuideStep>();
        this.$idx = 0;
        this.$gid = 0;
    }

    public get gid() {
        return this.$gid;
    }

    public set gid(gid) {
        this.$gid = gid;
    }

    public get steps() {
        return this.$steps;
    }

    public get playingIdx() {
        return this.$idx;
    }

    public pushStep(step: GuideStep) {
        this.$steps.push(step);
    }

    public start() {
        this.$idx = 0;
        this.$steps[this.$idx].start();
    }


    public restart() {
        this.$steps[this.$idx].stop();
        this.$steps[this.$idx].start();
    }

    public gotoStep(step: number) {
        // reset $timer
        this.$steps[this.$idx].stop();
        if (step < this.$steps.length) {
            this.$idx = step;
            this.startStep();
        }
        else {
            GuideEngine.getInst().onGuideFinish(this.$gid);
        }
    }

    public nextStep() {
        Logger.log(`Guide: ************************nextStep****************************************`);
        // reset $timer
        this.$steps[this.$idx].stop();
        if (this.$idx < this.$steps.length - 1) {
            this.$idx += 1;
            this.startStep();
        }
        else {
            GuideEngine.getInst().onGuideFinish(this.$gid);
        }
    }

    public startStep() {
        // let gid = this.$steps[this.$idx].gid;
        // let sid = this.$idx;
        this.p2LogRecordStart();
        this.$steps[this.$idx].start();
        // GuideEngine.getInst().setCurrGuide(this);


    }

    /**记录指引开始时间 */
    public p2LogRecordStart() {
        //P2日志，开始指引
        let curStep = this.$steps[this.$idx];
        let guideCfg = s2_guide_cfg.GuideInfo[curStep.gid + "|" + curStep.step];
        client_log_utils.guideP2LogData = {
            guide_begintime: ServerTimer.now(),
            plot_id: -1,
            teach_id: curStep.gid,
            teach_name: guideCfg[s2_guide_cfg.cName],
            teach_step_id: curStep.step,
            teach_step_index: -1,
            endtime: undefined,
            guide_order: curStep.order
        }

        //客户端报错日志结束
        if (client_log_utils.guideP2LogErrorData && client_log_utils.guideP2LogErrorData.reason) {
            client_log_utils.guideP2LogErrorData.endtime = ServerTimer.now();
            client_log_utils.guideP2LogErrorData.reason = "Start";
            client_log_utils.handleGuideP2ErrorLog();
        }
        //客户端报错日志记录开始
        client_log_utils.guideP2LogErrorData = {
            guide_order: curStep.order,
            guide_begintime: ServerTimer.now(),
            teach_id: curStep.gid,
            teach_name: guideCfg[s2_guide_cfg.cName],
            teach_step_id: curStep.step,
            teach_step_index: -1,
            endtime: undefined,
        }
    }

    //发送P2完成日志
    public p2LogRecordCompleted(step: GuideStep) {
        if (client_log_utils.guideP2LogData
            && !client_log_utils.guideP2LogData.endtime
            && (client_log_utils.guideP2LogData.teach_id == step.gid)
            && (client_log_utils.guideP2LogData.teach_step_id == step.step)
        ) {
            client_log_utils.guideP2LogData.endtime = ServerTimer.now();
            client_log_utils.handleGuideP2Log();
            client_log_utils.guideP2LogData = undefined;
            Logger.log(`send p2 log,endtime ${ServerTimer.now()}`);
        }
        //重置客户端报错日志
        client_log_utils.guideP2LogErrorData = undefined;
    }

    public stop() {
        this.$steps[this.$idx].stop();
        this.$idx = 0;
    }

    public clientStop() {
        this.$steps[this.$idx].clientStop();
        this.$idx = 0;
    }

    public getCurrStep() {
        return this.$steps[this.$idx];
    }
}


export class GuideEngine {
    // private $curRunningGuides:Map<number,Guide>;
    // 不考虑多个guide存在的情况先

    public get guide() {
        return this.$curGuide;
    }

    private static $instance: GuideEngine;

    public static getInst(): GuideEngine {
        if (!this.$instance) {
            this.$instance = new GuideEngine;
        }
        return this.$instance;
    }

    private $isFinished: boolean;
    /**本次进入游戏是否拥有指引 */
    private isGuideTarget: boolean;
    private $traceObjs: Object;
    private $curGuide: Guide;

    private $guideExtInfo: GuideExtEntry;

    // private $uiObj: any;
    // private $uiParent: any;

    public init() {
        this.$traceObjs = {};
        GuideEventBus.getInstance().addEventListener(GuideEvent.CONDITION_FINISH, this.onGuideAction, this);
        this.isGuideTarget = false;
    }

    public reset() {
        this.stopGuide();
        this.isGuideTarget = false;
        GuideEventBus.getInstance().removeEventListener(GuideEvent.CONDITION_FINISH, this.onGuideAction, this);

        if (gameplay_ui_culling.getOngoingCulling() == gameplay_ui_culling.ECulling.Plot) {
            clearPlotMode();
        }
        this.nextPlayGuideTime = 0;
    }

    public setFinished(isFinished: boolean) {
        this.$isFinished = isFinished;
        GuideEngine.getInst().stopGuide();
        this.$curGuide = null;

        // s2这边直接屏蔽掉这个设定
        //隐藏红点两步走，如果等级满足，则显示红点，先设置HideRed，再switch。hideRed为true时，代表显示红点
        let showRed = HeroMainModel.getInstance().levelId >= s2_global_value_cfg.GlobalValueInfo["GUIDE_SHOW_RED"];
        RedPointTreeHelper.setShowRed(showRed);

        let guideFinishKey = `${HeroMainModel.getInstance().userId}openFinishTag`;
        let openFinishTag = egret.localStorage.getItem(guideFinishKey);
        let isOpenFinishTag = openFinishTag == "1";
        if (this.isGuideTarget && !isOpenFinishTag) {
            GuideEngine.getInst().startGuide(s2_GUIDE_ID.FAKE_GUIDE_MACRO); //100为固定结束指引
            this.setOpenFinishTag(true);

        }
    }
    /**新手是否完成 */
    public isFinished() {
        return this.$isFinished;
    }

    /**新手任务结束指引 */
    public isOpenFinishTag() {
        let guideFinishKey = `${HeroMainModel.getInstance().userId}openFinishTag`;
        let openFinishTag = egret.localStorage.getItem(guideFinishKey);
        let isOpenFinishTag = openFinishTag == "1";
        return this.isFinished() && this.isGuideTarget && !isOpenFinishTag;
    }

    public setOpenFinishTag(isOpen: boolean) {
        let guideFinishKey = `${HeroMainModel.getInstance().userId}openFinishTag`;
        egret.localStorage.setItem(guideFinishKey, isOpen ? "1" : "0");
    }

    public pause() {
        if (this.$curGuide) {
            O3(GuideFingerUI, (inst: GuideFingerUI) => {
                inst.hideFinger();
            }, this, false);
        }
    }

    public registUITraceObject(name: string, parent: BaseWidget, obj: BaseWidget | eui.Component) {
        if (obj instanceof BaseWidget) {
            obj.baseInst.renderVisible = true;
        } else if (obj instanceof eui.Component) {
            obj.renderVisible = true;
        }

        this.$traceObjs[name] = { parent, trace: obj };
        // if (HeroMainModel.getInstance().getRedState() == false) {
        //     if (obj instanceof egret.DisplayObject) {
        //         RedPointTreeHelper.alphaRed(obj, 1);
        //     }
        // }
        //什么时候移除？
        if ((obj as any).name == "grpGuide") {
            // 玩法入口那边用一个很猥琐的方式，只能在这边处理了
            obj.parent && obj.parent.addEventListener(egret.TouchEvent.TOUCH_TAP, this.onTouchTraceObj, this, false, GlobalValue.GuideFingerIndex);
        }
        else {
            obj.addEventListener(egret.TouchEvent.TOUCH_TAP, this.onTouchTraceObj, this, false, GlobalValue.GuideFingerIndex);
        }
    }

    public unregistUITraceObject(baseWidget: BaseWidget[]) {
        Logger.log(`unregistUITraceObject ${baseWidget}`);
        if (baseWidget) {
            for (let name in this.$traceObjs) {
                if (baseWidget instanceof Array) {
                    let deleteInstHashCode = baseWidget[0] && baseWidget[0].hashCode;
                    let parentHashCode = this.$traceObjs[name].parent && (this.$traceObjs[name].parent as egret.HashObject).hashCode;
                    if (parentHashCode == deleteInstHashCode) {
                        delete this.$traceObjs[name];
                        break;
                    }
                }
            }
        }
    }

    public createGuide(gid: number, order: number): Guide {
        let step_keys = []; // get guideData
        // 遍历guide.json why?
        // key like `${gid}|${step}`, 
        // step_keys 保留format gid|step
        for (let key of Object.keys(s2_guide_cfg.GuideInfo)) {
            let kv = key.split("|");
            if (kv[0] === String(gid)) {
                step_keys.push(key);
            }
        }
        if (step_keys.length === 0) {
            Logger.log(`ERROR: Guide data not found, GID:${gid}`);
            return null;
        }
        step_keys.sort((a: string, b: string) => {
            let step_a = Number(a.split("|")[1]);
            let step_b = Number(b.split("|")[1]);
            return step_a - step_b;
        }); // 按step排序

        // 初始化GuideStep列表
        let g = new Guide();
        g.gid = gid;
        // step从1开始
        for (let i = 1, len = step_keys.length; i <= len; i++) {
            let step = new GuideStep(g);
            step.gid = gid;
            step.step = i;
            step.order = order;
            g.pushStep(step);
        }

        Logger.log(`guide len: ${g.steps.length}`);
        return g;
    }

    //TODO order 先给个0
    public startGuide(gid: number, order: number = 0) {
        if (!searchParams_utils.isGuideOpen()) {
            return;
        }
        this.onGuideStartHandler(gid);
        let guide = this.createGuide(gid, order);
        this.isGuideTarget = true;
        if (guide) {
            this.setCurrGuide(guide);
            this.$curGuide.start();
        }
        // //关闭主线boss闯关手指指引
        // let mainUI = GlobalData.MainUIInst;
        // let inst = mainUI.hungupUI;
        // safeInvokeFunc(inst, () => {
        //     inst.mainAutoFight.stopHandClickAni();
        // });
    }

    /**由于列表更新，或者列表拖动导致指引中断，重新开始 */
    public restartGuide() {
        if (this.$curGuide) {
            this.$curGuide.restart();
        }
    }

    public setCurrGuide(guide: Guide) {
        // if(this.$curGuide === guide){
        //     this.$curGuide = null;
        // }
        if (this.$curGuide) {
            this.stopSingleGuide(this.$curGuide.gid);
        }
        this.$curGuide = guide;
        GuideModel.getInst().setGuide(guide.gid, guide.getCurrStep().step);
    }

    public getCurGuide() {
        return this.$curGuide;
    }

    public saveGuideExt(ext: GuideExtEntry) {
        this.$guideExtInfo = ext;
    }

    /**中断之后，点击任务恢复指引 */
    public resumeGuide(gid: number, step: number) {
        //目前第一步都是任务，直接+1指引下一步
        GuideEngine.getInst().gotoStep(gid, step);
    }

    public onTouchTraceObj(evt: egret.TouchEvent) {
        client_log_utils.guideData.finish_screens++;
        if (!this.$curGuide) {
            return;
        }
        let step = this.$curGuide.getCurrStep();
        if (step.traceObj === evt.currentTarget || step.traceObj === evt.target.parent || (step.traceObj.name == "grpGuide" && (step.traceObj.parent === evt.currentTarget || step.traceObj.parent === evt.target.parent))) {
            Logger.log(`Guide: 点击追踪对象 finishCondition : ${step.finishCondition}`);
            this.$curGuide.p2LogRecordCompleted(this.$curGuide.getCurrStep());
            // check whether finish
            if (step.finishCondition === 0) {
                this.$curGuide.nextStep();
            }
            else if (step.finishCondition === 1) {
                this.$curGuide.getCurrStep().stop();
            } else {

                Logger.log(`Guide: ************************onTouchTraceObj****************************************`);
                //-1 等待服务器返回信息或者是等待事件返回
                let guideUI = UIManager.getInst(GuideFingerUI) as GuideFingerUI;
                if (guideUI) {
                    safeInvokeFunc(guideUI, () => {
                        guideUI && guideUI.hideFinger();
                        Logger.log(`Guide: 点击追踪对象之后，等待服务器返回，没有结束当前指引`);
                    });
                }
            }
        } else {
            Logger.error(`点击对象不是追踪目标对象`);
        }
        client_log_utils.guideData.total_screens++;
    }

    public playSkillTeachEffect() {
        this.playAnimate("resource/eui/Guide_Eff_StudySkill.exml", () => {
            //播放完毕
        });
    }

    protected $animate: TweenGroupPanel;
    private playAnimate(effectPath: string, playCompleted: Function) {
        // 播放特效
        this.$animate = UIManagerFactroy.createTweenGroupPanel(UIManager.PlotPanel, effectPath);
        this.$animate.adapter();
        this.$animate.setTouchEnabled(true);
        this.$animate.play(1, () => {
            this.clearAnimate();
            playCompleted();
        }, this);
    }

    private clearAnimate() {
        if (this.$animate) {
            this.$animate.visible = false;
            this.$animate.destroy();
            this.$animate = null;
        }
    }

    public createGuideAnimation(obj: GuideStep, animationType: number, animationArg: string, parent: BaseWidget, traceObj: egret.DisplayObject, traceArg: string, offset: egret.Point) {
        if (!this.$curGuide || this.$curGuide.getCurrStep() !== obj) {
            return; //过期的操作
        }
        let isWeakGuide = [GuideAniEnum.NONE_ANI, GuideAniEnum.ANI_ONLY, GuideAniEnum.BUBBLE_WEAK].indexOf(animationType) >= 0;
        if (isWeakGuide) { //弱指引
            UIManager.close(GuideFingerUI);
            this.clearFingerAni(obj);

            //开始弱指引
            Logger.log(`开始弱指引`);
            if (animationType == GuideAniEnum.NONE_ANI) {
                this.showRedPoint(traceObj);
                Logger.log(`执行弱指引 指引类型 ${animationType} 不显示手指`);
            } else {
                if (GuideFinger.checkMcData()) {
                    // 已读取动画
                    this.showRedPoint(traceObj);
                    Logger.log(`执行弱指引`);
                    // let uiobj = GuideFinger.getFingerObj();
                    let uiParent: egret.DisplayObjectContainer;
                    if (traceObj instanceof egret.DisplayObjectContainer) {
                        uiParent = traceObj;
                    } else if (traceObj.parent) {
                        uiParent = traceObj.parent;
                    } else {
                        uiParent = parent.baseInst;
                    }
                    let coordinate = traceObj.localToGlobal(traceObj.width * offset.x, traceObj.height * offset.y);
                    let localPoint = uiParent.globalToLocal(coordinate.x, coordinate.y);
                    this.createFingerAni(obj, uiParent, traceObj, localPoint, offset);
                    let fingerTrace = obj.fingerTrace;
                    if (animationType == GuideAniEnum.BUBBLE_WEAK) {
                        GuideFinger.setBubbleTip(uiParent, localPoint.x, parent);
                    }
                    if (GuideModel.getInst().isAuto()) {
                        Logger.log(`Guide: 自动点击开启，${GlobalValue.AUTO_GUIDE_INTERVAL / 1000}s之后自动点击`);
                        egret.setTimeout(() => {
                            if (GuideModel.getInst().isAuto()) {
                                Logger.log(`Guide: 自动点击开启，自动点击`);
                                fingerTrace?.dispatchEvent(egret.Event.create(egret.TouchEvent, egret.TouchEvent.TOUCH_TAP, true, true));
                            }
                        }, this, GlobalValue.AUTO_GUIDE_INTERVAL);
                    }
                }
                else {
                    egret.log("ERROR! 手指动画未加载！等0.5s");
                    egret.setTimeout(this.createGuideAnimation, this, 500, obj, animationType, animationArg, parent, traceObj, traceArg, offset);
                }
            }
        } else { //强指引
            Logger.log(`开始强指引`);
            O2(GuideFingerUI, (inst: GuideFingerUI) => {
                Logger.log(`执行强指引`);
                if (!obj.traceObj) {
                    Logger.error(`Guide 新手追踪对象丢失`);
                    if (obj.getGuide().getCurrStep().traceObj) {
                        obj.traceObj = obj.getGuide().getCurrStep().traceObj;
                    } else {
                        Logger.error(`Guide 查找失败，重新查找指引对象`);
                        return GuideEngine.getInst().restartGuide();
                    }
                }
                Logger.log(`打开 GuideFingerUI ，执行 GID ${obj.gid} STEPID ${obj.step}`);
                inst.setData(obj.traceObj, animationType);
                this.showRedPoint(obj.traceObj);
            }, this);

        }
    }

    public showRedPoint(traceObj: egret.DisplayObject) {
        if (RedPointTreeManager.getInstance().getRedState() == false) {
            if (traceObj instanceof egret.DisplayObject) {
                egret.setTimeout(() => {
                    RedPointTreeHelper.alphaRed(traceObj, 1);
                }, this, 130);
            }
        }
    }

    public startGuideStep(step: GuideStep): boolean {
        // s2这边直接屏蔽掉这个设定
        let showRed = HeroMainModel.getInstance().levelId >= s2_global_value_cfg.GlobalValueInfo["GUIDE_SHOW_RED"];
        if (RedPointTreeManager.getInstance().getRedState() == false && !showRed) {
            RedPointTreeHelper.setShowRed(false);
            RedPointTreeHelper.switchRed();
        }
        let info = s2_guide_cfg.GuideInfo[step.gid + "|" + step.step];
        GuideModel.getInst().setGuide(step.gid, step.step);
        let traceName = info[s2_guide_cfg.cTrace];
        let arg = info[s2_guide_cfg.cTraceArg];
        let offset = info[s2_guide_cfg.cOffSet].split(",");
        let conditions = info[s2_guide_cfg.cFinishCondition].split("|");
        if (step["$retryCnt"] === 0) {
            client_log_utils.guideData.gid = step.gid;
            client_log_utils.guideData.begin_time = ServerTimer.now();
            client_log_utils.guideData.name = info[s2_guide_cfg.cName];
            client_log_utils.handleGuideP1Log(GuideDataStatus.Begin, ServerTimer.now());
        }

        for (let val of conditions) {
            // add condition
            if (val === "0" || val === "1") {
                step.finishCondition = Number(val);
            }
            else if (val in s2_guide_condition) {
                Logger.log(s2_guide_condition[val]);
                if (step.specFinishCondition.indexOf(s2_guide_condition[val]) === -1) {
                    step.specFinishCondition.push(s2_guide_condition[val]);
                }
                // step.specFinishCondition.add(guide_condition[val]);
            }
            else if (val === "-1") { }
            else {
                Logger.log(`ERROR! GUIDE完成条件${val}没有注册！`);
                return false;
            }
        }
        // 尝试调用注册函数
        let registFuncName: string;
        if (traceName in s2_guide_register_cfg.GuideRegisterInfo) {
            registFuncName = s2_guide_register_cfg.GuideRegisterInfo[traceName][s2_guide_register_cfg.cRegister];
        }
        else {
            Logger.log(`ERROR! GUIDE追踪对象${traceName}没有注册函数!`);
            return false;
        }
        // call registfunc
        if (registFuncName in GuideRegister) {
            if (!GuideRegister[registFuncName](traceName, arg)) {
                Logger.log(`ERROR! 追踪对象对应注册函数${registFuncName} 返回值为false`);
                // 执行出错
                return false;
            }
        }
        else {
            Logger.log(`ERROR! 追踪对象对应注册函数${registFuncName}不存在`);
            return false;
        }
        // registfunc中已经缓存traceobj的信息
        let data = this.$traceObjs[traceName];
        if (!data) {
            Logger.log(`ERORR! traceObjs不存在！`);
            return false;
        }
        // create animation
        step.traceObj = data["trace"];
        this.createGuideAnimation(step, info[s2_guide_cfg.iAnimation], info[s2_guide_cfg.cAnimationArg], data["parent"], data["trace"], arg, new egret.Point(Number(offset[0]), Number(offset[1])));
        return true;
    }

    public stopGuideStep(step: GuideStep) {
        if (!step) return;
        UIManager.close(GuideFingerUI);
        this.clearFingerAni(step);
        // this.timeout && egret.clearTimeout(this.timeout);

        if (step.traceObj) {
            if (step.traceObj.name == "grpGuide") {
                step.traceObj.parent && step.traceObj.parent.removeEventListener(egret.TouchEvent.TOUCH_TAP, this.onTouchTraceObj, this);
            }
            else {
                step.traceObj.removeEventListener(egret.TouchEvent.TOUCH_TAP, this.onTouchTraceObj, this);
            }
            step.traceObj = null;
            //log(`Guide: 停止索引，step.traceObj置空`);
            client_log_utils.handleGuideP1Log(GuideDataStatus.Complete, ServerTimer.now());
        } else {
            client_log_utils.handleGuideP1Log(GuideDataStatus.Fail, ServerTimer.now());
        }

        let showRed = HeroMainModel.getInstance().levelId >= s2_global_value_cfg.GlobalValueInfo["GUIDE_SHOW_RED"];
        if (RedPointTreeManager.getInstance().getRedState() == false && !showRed) {
            RedPointTreeHelper.setShowRed(false);
        }
    }

    public stopSingleGuide(gid: number) {
        if (this.$curGuide && this.$curGuide.gid === gid) {
            this.$curGuide.stop();
            this.$curGuide = null;
        }
        UIManager.close(GuideFingerUI);
        this.clearAnimate();
    }

    public stopClientSingleGuide(gid: number) {
        if (this.$curGuide && this.$curGuide.gid === gid) {
            this.$curGuide.clientStop();
            this.$curGuide = null;
        }
        UIManager.close(GuideFingerUI);
        this.clearAnimate();
    }

    // 尝试停止某个引导，如果和当前引导id不一致，则不产生影响
    public tryStopSingleGuide(gid: number) {
        if (this.$curGuide && this.$curGuide.gid === gid) {
            this.$curGuide.stop();
            this.$curGuide = null;
            UIManager.close(GuideFingerUI);
            this.clearAnimate();
        }
    }

    public stopGuide() {
        if (this.$curGuide) {
            this.stopSingleGuide(this.$curGuide.gid);
        }
    }

    /**
     * 跳转步骤，只能向前跳
     * @param gid iTeachID
     * @param step step 从0开始，表中的iTeachStep - 1 
     */
    public gotoStep(gid: number, step: number) {
        if (this.$curGuide && gid === this.$curGuide.gid) {
            this.$curGuide.gotoStep(step);
        }
    }

    public nextStep() {
        if (this.$curGuide) {
            this.$curGuide.nextStep();
        }
    }

    public onGuideFinish(gid: number) {
        Logger.log(`Guide finish!! GID:${gid}`);
        if (this.$curGuide) {
            this.stopSingleGuide(this.$curGuide.gid);
        }
        this.onGuideFinishHandler(gid);
    }

    public onGuideAction(evt: GuideEvent) {
        Logger.log(`Guide: on guide action KEY---${evt.data}`);
        let condition = evt.data;
        if (this.$curGuide) {
            // if (this.$curGuide.getCurrStep().specFinishCondition.has(evt.data)) {
            if (this.$curGuide.getCurrStep().specFinishCondition.indexOf(condition) > -1) {
                Logger.log(`Guide: ************************onGuideAction****************************************`);
                this.$curGuide.p2LogRecordCompleted(this.$curGuide.getCurrStep());
                Logger.log("Guide 点击完成，执行下一步走")
                this.$curGuide.nextStep();
            } else {
                let popupUIConditions = [
                    s2_guide_condition.FAKE_CONDITION_MACRO,
                    s2_guide_condition.FAKE_CONDITION_MACRO,
                    s2_guide_condition.FAKE_CONDITION_MACRO,
                    s2_guide_condition.FAKE_CONDITION_MACRO,
                    s2_guide_condition.FAKE_CONDITION_MACRO,
                    s2_guide_condition.FAKE_CONDITION_MACRO,
                ];
                if (popupUIConditions.indexOf(condition) > -1) {
                    this.restartGuide();
                    Logger.log(`Guide: ************************onGuideAction restartGuide****************************************`);
                }
            }
        }
    }

    public onGuideFinishHandler(gid: number) {
        GuideCNet.C_FINISH_GUIDE(gid);

        Logger.log(`[#GuideEngine]: on guide finish KEY---${gid}`);
        EventBus.dispatchEvent(new CommonEvent(CommonEvent.GUIDE_FINISH, { gid }));

        let showRed = HeroMainModel.getInstance().levelId >= s2_global_value_cfg.GlobalValueInfo["GUIDE_SHOW_RED"];
        RedPointTreeHelper.setShowRed(showRed);
    }

    public onGuideStartHandler(gid: number) {
        switch (gid) {
            case s2_GUIDE_ID.FAKE_GUIDE_MACRO: // 渡劫指引id
                // 关闭所有窗口，避免挡住强指引
                closeUIPanelAndNpcChat();
                UIManager.closeAll(UIManager.PlotPanel);
                SendEvent(GlobalEventSource.MAIN_CHAT_HIDE); // 关闭聊天
                // // 打开主城
                // SceneEventBus.getInstance().dispatchStatusSetEvent(SceneStatus.MainCity);
                break;
        }

        Logger.log(`[#GuideEngine]: on guide start KEY---${gid}`);
        EventBus.dispatchEvent(new CommonEvent(CommonEvent.GUIDE_START, { gid }));
    }

    // =================== 新版手指指引 ===================
    private clearFingerAni(step: GuideStep) {
        if (step.fingerTrace) {
            if (step.fingerAni) {
                if (step.fingerAni.parent !== null) {
                    step.fingerAni.parent.removeChild(step.fingerAni);
                }
                step.fingerAni = null;
            }
            if (step.fingerTrace.parent !== null) {
                step.fingerTrace.parent.removeChild(step.fingerTrace);
            }
            step.fingerTrace = null;
        }
        GuideFinger.removeBubble();
    }

    private createFingerAni(step: GuideStep, uiParent: egret.DisplayObjectContainer, traceObj: egret.DisplayObject, localPoint: egret.Point, offset: egret.Point) {
        let uiobj = GuideFinger.getFingerObj();
        if (uiobj) {
            // 创建trace组件
            let traceGroup = new eui.Group();
            step.fingerTrace = traceGroup;

            let targetPoint = new egret.Point(localPoint.x - traceObj.width * offset.x, localPoint.y - traceObj.height * offset.y);

            traceGroup.x = targetPoint.x;
            traceGroup.y = targetPoint.y;
            traceGroup.width = traceObj.width;
            traceGroup.height = traceObj.height;
            traceGroup.name = "traceGroup";
            uiParent.addChild(traceGroup);
            traceGroup["step"] = step; // hack一下step数据,方便EnterFrame使用
            traceGroup["offset"] = offset;
            // 每帧更新finger位置
            traceGroup.addEventListener(egret.Event.ENTER_FRAME, this.traceGroupEnterFrame, this);
            traceGroup.addEventListener(egret.Event.REMOVED_FROM_STAGE, this.onTraceGroupRemoved, this);

            // 设置手指动画位置
            UIManager.PlotPanel.addChild(uiobj);
            this.updateFingerAniPosition(uiobj, traceGroup);
            step.fingerAni = uiobj;
            uiobj.skipTouch = true;

            // 先特殊处理,后续新增手指动画样式
            if (step?.getGuide()?.gid == this.PLAY_GUIDE_NO) {
                //     ui_utils_hide.hideOnTouchTapOutsideWithEvt_(traceGroup, this.onTouchPlayGuideOutside, this);
                UIManager.UIPanel.addEventListener(UIMgrEvent.OPEN_UI, this.onOpenUIPlayGuide, this);
            }
        }
        return uiobj;
    }

    private fingerHideTime: number;
    private updateFingerAniPosition(finger: egret.DisplayObject, traceGroup: eui.Group) {
        if (!finger || !traceGroup || !traceGroup.parent) {
            return;
        }

        // 查询是否存在不可见的父级
        let obj: any = traceGroup;
        while (obj.parent && !(obj.parent instanceof egret.Stage)) {
            if (!obj.parent["visible"] || !obj.parent["renderVisible"]) {
                Logger.debug(`Guide: finger parent is not visible, parent: ${obj.parent}`);
                // 如果父级不可见,隐藏finger
                finger.visible = false;
                if (!this.fingerHideTime) {
                    this.fingerHideTime = ServerTimer.second();
                }
                if (ServerTimer.second() - this.fingerHideTime > 10) {
                    this.onTouchTraceGroup(traceGroup);
                }
                return;
            }
            obj = obj.parent;
        }

        // 如果父级可见,显示finger
        finger.visible = true;

        // 更新手指位置
        let offset = traceGroup["offset"] || new egret.Point(0, 0);
        let gPos = traceGroup.parent.localToGlobal(traceGroup.x + traceGroup.width * offset.x, traceGroup.y + traceGroup.height * offset.y);
        let lPos = UIManager.PlotPanel.globalToLocal(gPos.x, gPos.y);
        finger.x = lPos.x;
        finger.y = lPos.y;
    }

    private onTraceGroupRemoved(evt: egret.Event) {
        // 清理traceGroup
        let traceGroup = evt.currentTarget as eui.Group;
        this.onTouchTraceGroup(traceGroup);
    }

    private onTouchTraceGroup(traceGroup: eui.Group) {
        if (traceGroup) {
            if (traceGroup["step"]) {
                delete traceGroup["step"];
            }
            if (traceGroup["offset"]) {
                delete traceGroup["offset"];
            }
            traceGroup.removeEventListener(egret.Event.ENTER_FRAME, this.traceGroupEnterFrame, this);
            traceGroup.removeEventListener(egret.Event.REMOVED_FROM_STAGE, this.onTraceGroupRemoved, this);
            DEV && Logger.log(`Guide: traceGroup removed from stage, clear traceGroup`);
            this.fingerHideTime = 0;
        }
    }

    private traceGroupEnterFrame(evt: egret.Event) {
        // 追踪traceObj的全局位置
        let traceGroup = evt.currentTarget as eui.Group;
        if (!traceGroup || !traceGroup.parent) {
            return;
        }

        let finger = (traceGroup["step"] as GuideStep)?.fingerAni;
        if (!finger) {
            return;
        }
        this.updateFingerAniPosition(finger, traceGroup);
    }


    // =================== 玩法弱指引 ===================
    private m_nextPlayGuideTime: number;
    private m_nextCheckTime: number;
    private readonly PLAY_GUIDE_NO = 40;
    public set nextPlayGuideTime(value: number) {
        this.m_nextPlayGuideTime = value;
        if (this.m_nextPlayGuideTime) {
            this.m_nextCheckTime = ServerTimer.second() + 2;
        }
        else {
            this.m_nextCheckTime = 0;
        }

        if (this.m_nextPlayGuideTime) {
            this.startPlayGuideTimer();
        }
        else {
            this.stopPlayGuideTimer();
        }
    }

    private startPlayGuideTimer() {
        this.stopPlayGuideTimer();
        let hangupUI = GlobalData.MainUIInst?.hungupUI;
        hangupUI?.baseInst?.stage?.addEventListener(egret.Event.ENTER_FRAME, this.onPlayGuideCheck, this);
    }

    private stopPlayGuideTimer() {
        let hangupUI = GlobalData.MainUIInst?.hungupUI;
        hangupUI?.baseInst?.stage?.removeEventListener(egret.Event.ENTER_FRAME, this.onPlayGuideCheck, this);
        if (this.$curGuide && this.$curGuide.gid == this.PLAY_GUIDE_NO && !this.m_nextPlayGuideTime) {
            this.stopGuide();
        }
    }

    private onPlayGuideCheck(evt: egret.Event) {
        if (!this.m_nextPlayGuideTime) {
            this.stopPlayGuideTimer();
            return;
        }

        if (ServerTimer.second() < this.m_nextCheckTime) {
            return;
        }

        this.m_nextCheckTime = ServerTimer.second() + 2;
        if (!this.canTriggerNextPlayGuide()) {
            return;
        }

        if (UIManager.UIPanel.numChildren > 0 && (UIManager.UIPanel.$children as egret.DisplayObject[]).find((v) => v.visible)) {
            return;
        }

        if (this.$curGuide) {
            if (this.$curGuide.gid == this.PLAY_GUIDE_NO) {
                // 本地自增时间
                GuideCNet.C_TRIGGER_PLAY_GUIDE();
            }
            return;
        }

        this.stopPlayGuideTimer();
        this.startGuide(this.PLAY_GUIDE_NO);
        if (this.$curGuide && this.$curGuide.gid == this.PLAY_GUIDE_NO) {
            GuideCNet.C_TRIGGER_PLAY_GUIDE();
        }
    }

    private onOpenUIPlayGuide(evt: UIMgrEvent) {
        this.stopPlayGuide();
    }

    private stopPlayGuide() {
        // 停止指引
        if (this.$curGuide && this.$curGuide.gid == this.PLAY_GUIDE_NO) {
            let traceGroup = this.$curGuide.getCurrStep()?.fingerTrace;
            // let traceObj = this.$curGuide.getCurrStep()?.traceObj;
            traceGroup?.removeEventListener(egret.TouchEvent.TOUCH_TAP_OUTSIDE, this.onTouchPlayGuideOutside, this);
            UIManager.UIPanel.removeEventListener(UIMgrEvent.OPEN_UI, this.onOpenUIPlayGuide, this);
            this.stopGuide();
        }
    }

    private onTouchPlayGuideOutside(evt: egret.TouchEvent) {
        this.stopPlayGuide();
    }


    private canTriggerNextPlayGuide(): boolean {
        if (!LoginInst.HeroMainModel_inst?.getHead()) {
            // client_log_utils.handleGuideP1Log会报错
            return false;
        }

        if (!this.m_nextPlayGuideTime) {
            return false;
        }

        if (ServerTimer.second() < this.m_nextPlayGuideTime) {
            return false;
        }

        // if (this.$curGuide && this.$curGuide.gid != this.PLAY_GUIDE_NO) {
        //     return false;
        // }

        return true;
    }
}
