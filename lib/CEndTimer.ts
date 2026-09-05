import { s2_text_utils } from "auto/text";
import { kit } from "common/kit";
import { date_utils } from "utils/DateUtils";

export class CEndTimer {
    private m_objTimer: egret.Timer;
    private m_objLblTime: eui.Label;
    private m_nEndTime: number;
    private m_nTextId: number;
    private m_hTimerOver: kit.Handler;

    public startTimerByEndTime(lblTime: eui.Label, endTime: number, textId: number = 2010100, timerOver?: kit.Handler) {
        this.m_objLblTime = lblTime;
        this.m_nEndTime = endTime;
        this.m_nTextId = textId;

        this.stopTimer();
        this.startTimer(timerOver);
    }
    private startTimer(timerOver?: kit.Handler) {
        this.m_hTimerOver = timerOver;
        if (!this.m_objTimer) {
            this.m_objTimer = new egret.Timer(1000);
            this.m_objTimer.addEventListener(egret.TimerEvent.TIMER, this.onTimer, this);
        }
        this.m_objTimer.start();

        this.onTimer();
    }
    public stopTimer() {
        if (this.m_objTimer) {
            this.m_objTimer.stop();
            this.m_objTimer.removeEventListener(egret.TimerEvent.TIMER, this.onTimer, this);
            this.m_objTimer = null;
        }
        if (this.m_hTimerOver) {
            this.m_hTimerOver.recover();
            this.m_hTimerOver = null;
        }
    }
    private onTimer() {
        let remaining: number = this.m_nEndTime - ServerTimer.second();
        if (remaining <= 0) {
            if (this.m_hTimerOver) {
                this.m_hTimerOver.run();
            }
            this.stopTimer();
            return;
        }
        this.updateLblTime(remaining);
    }
    private updateLblTime(remaining: number) {
        let params =
        {
            time: date_utils.formationCountdown(remaining, date_utils.CountdownEnum.Custom1),
            color: "#c8FE076"
        };
        if (this.m_nTextId) {
            this.m_objLblTime.text = s2_text_utils.T(this.m_nTextId, params);
        }
        else {
            this.m_objLblTime.text = params.time;
        }
    }
}