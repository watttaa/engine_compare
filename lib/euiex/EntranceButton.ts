import { s2_text_utils } from "auto/text";
import { EntranceDataEntry } from "base/ServerEntry";
import { Eff_RefreshBtn } from "lib/euiex/Eff_RefreshBtn";
import { EntranceHelper } from "s2/entrance/EntranceHelper";

import { filter_utils } from "lib/FilterUtils";
import { entrance_c_net } from "net/EntranceCNet";
import { OpenUICNet } from "net/OpenUICNet";
import { date_utils } from "utils/DateUtils";
import { s2_open_ui_cfg } from "auto/open_ui";

export interface EntranceButton {
    grpRoot: eui.Group;
    imgIcon: eui.Image;
    effctBtn: Eff_RefreshBtn;
    grpReddot: eui.Group;
    lblName: eui.Label;
    imgName: eui.Image;
    lblTime: eui.Label;
    touchArea: eui.Rect;
    imgBg: eui.Image;
}

export class EntranceButton extends eui.Button{
    public _isEuiex = true;
    public static readonly HEIGHT = 96;
    private data: EntranceDataEntry;
    private $timer: egret.Timer;
    private $remaining: number;

    constructor() {
        super();
        //this.skinName = this.getSkinName();
    }

    $onRemoveFromStage() {
        this.stopTimer();
        super.$onRemoveFromStage();
    }

    private startTimer() {
        if (!this.$timer) {
            this.$timer = new egret.Timer(1000, 0);
            this.$timer.addEventListener(egret.TimerEvent.TIMER, this.countDown, this);
        }
        this.$timer.start();
    }

    private stopTimer() {
        if (this.$timer) {
            this.$timer.stop();
            this.$timer.removeEventListener(egret.TimerEvent.TIMER, this.countDown, this);
            this.$timer = null;
        }
    }

    @SafeCallFunction()
    public setData(data: EntranceDataEntry){
        this.data = data;
        
        let [iconSource, nameSource] = EntranceHelper.getIconSource(data.icon, data.background);
        // 图标
        this.imgIcon.source = iconSource;
        // 名字
        let nameSource1 = `entrance_icon_atlas_json.icon_${data.name}_name`;
        let nameSource2 = nameSource;
        this.imgName.visible = false;
        this.lblName.visible = false;
        if (RES.hasRes(nameSource1)) {
            this.imgName.source = nameSource1;
            this.imgName.visible = true;
        }
        else if (RES.hasRes(nameSource2)){
            this.imgName.source = nameSource2;
            this.imgName.visible = true;
        }
        else {
            this.lblName.text = data.name;
            this.lblName.visible = true;
        }
        // 特效
        if(this.effctBtn){
            this.effctBtn.showEffect(data.effect);
            this.effctBtn.visible = !!data.effect
        }
     
        // 置灰
        let f = data.type == 2 ? filter_utils.getGreyFilter() : null;
        this.imgIcon.filters = f;

        //this.setImgBg(data.color);
        if (data.color && this.imgBg){
            this.imgBg.source = `com_entrance_base_${data.color}_png`
        }
        this.updateText();
        if (this.data.open_ui){
            this.imgIcon.addEventListener(egret.TouchEvent.TOUCH_TAP, this.jump, this);
        }
        else{
            this.imgIcon.removeEventListener(egret.TouchEvent.TOUCH_TAP, this.jump, this);
        }
    }

    private jump(evt: egret.TouchEvent) {
        let data = this.data as EntranceDataEntry;
        // 由于可能会重定向，则取出重定向前的entranceid
        let eid = EntranceHelper.getOriginalEntrance(data.open_ui);
        if (eid) {
            EntranceHelper.openEntrance(eid, { is_multi: data.is_multi });
        }
        else {
            OpenUICNet.C_OPEN_UI(data.open_ui, data.is_multi);
        }
    }

    private $timestamp: number;
    private $timeFunc: Function;

    /** 更新文字显示 */
    protected updateText() {
        this.stopTimer();
        this.lblTime.text = "";

        let data = this.data as EntranceDataEntry;
        if (data.display) {
            // 纯文本
            this.lblTime.text = data.display;
        }
        else if (data.open_ts && ServerTimer.second() < data.open_ts) {
            // 开始时间倒计时
            this.$timeFunc = this.openFunc;
            this.$timestamp = data.open_ts;
            this.startTimer();
            this.countDown(null);
        }
        else if (data.end_ts) {
            // 结束时间倒计时
            this.$timeFunc = this.endFunc;
            this.$timestamp = data.end_ts;
            this.startTimer();
            this.countDown(null);
        }
    }

    private countDown(evt: egret.TimerEvent) {
        if (ServerTimer.second() >= this.$timestamp) {
            this.stopTimer();
            // EntranceCNet.entrance_c_net.C_DYN_ENTRANCE_REQ()
            entrance_c_net.C_DYN_ENTRANCE_REFRESH(this.data.id);
        }
        this.$timeFunc && this.$timeFunc.call(this);
    }

    private endFunc() {
        let second = this.$timestamp - ServerTimer.second();
        if (second < 0) second = 0;
        let data = this.data as EntranceDataEntry;
        let arr = [
            s2_open_ui_cfg.TEMP /** PETSSTRIKE1 */,
            s2_open_ui_cfg.TEMP /** PETSSTRIKE2 */,
            s2_open_ui_cfg.TEMP /** PETSSTRIKE3 */,
            s2_open_ui_cfg.TEMP /** PETSSTRIKE4 */,
            s2_open_ui_cfg.TEMP /** GRAND_CEREMONY */,
            s2_open_ui_cfg.TEMP /** CONTINUOUS_RECHARGE */
        ];
        let type = arr.indexOf(data.open_ui) >= 0 ? date_utils.CountdownEnum.Custom1 : date_utils.CountdownEnum.Precise;
        this.lblTime.text = date_utils.formationCountdown(second, type);
    }

    private openFunc() {
        let second = this.$timestamp - ServerTimer.second();
        if (second < 0) second = 0;
        let info = date_utils.getTimeInfo(second);
        if (info.D >= 1) {
            this.lblTime.text = s2_text_utils.T(26550, { Day: info.D });
        }
        else if (info.H >= 1) {
            this.lblTime.text = s2_text_utils.T(26551, { Hour: info.H, Minute: preload_utils_text.overlayr(info.M, 2) });
        }
        else {
            this.lblTime.text = s2_text_utils.T(26552, { Minute: info.M, Second: preload_utils_text.overlayr(info.S, 2) });
        }
    }
}