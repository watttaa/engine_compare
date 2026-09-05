
import { CallManyTimes } from "lib/Timer_CallManyTimes";
import { date_utils } from "utils/DateUtils";
import { s2_text_utils } from "auto/text";

export class Countdown {
    private $timer: CallManyTimes;
    private $leftTime: number;
    private $passTime: number;
    // private $format: string;
    private $countdownType:date_utils.CountdownEnum;
    /**文本模板，id:文本表Id,key:文本关键字 */
    private $textPattern:{id:number,key:string};
    private $autoHideTimeLabel: boolean = false;

    public get passTime(): number {
        return this.$passTime;
    }

    public set autoHideTimeLabel(value: boolean){
        this.$autoHideTimeLabel = value;
    }

    /**
     * 
     * @param label 
     * @param $callback 
     * @param $args {type： 倒计时格式，textId： 文本表ID}
     * @param $thisObject 
     */
    public constructor(private label: eui.Label | RichLabel, private $callback?: Function, private $args?: {type?:date_utils.CountdownEnum,textPattern?:{id:number,key:string}}, private $thisObject?: any) {
        this.$passTime = 0;
        this.$countdownType = this.$args && this.$args.type || date_utils.CountdownEnum.Normal;
        this.$textPattern = this.$args && this.$args.textPattern ;
    }

    private setTextTime(time:number) {
        let countdownDes = date_utils.formationCountdown(time,this.$countdownType);
        if(this.$textPattern){
            let textId = this.$textPattern.id;
            let key = this.$textPattern.key;
            countdownDes = s2_text_utils.T(textId,{[key]:countdownDes});
        }
        this.label.text = countdownDes;
    }

    public start(time: number) {
        this.$leftTime = time;
        this.setTextTime(time);
        this.$timer && this.$timer.stop();
        if (time <= 0) {
            if(this.$autoHideTimeLabel){
                this.label.visible = false;
            }
            return;
        }
        this.$timer = new CallManyTimes(this.$leftTime, 1000, this.countdown, [], this);
        this.$timer.start();
    }

    public stop() {
        this.$timer && this.$timer.stop();
        this.$passTime = 0;
    }

    private countdown() {
        if (!this.$timer) return;
        if (this.$leftTime <= 1) {
            this.$callback && this.$callback.apply(this.$thisObject, this.$args);
            this.stop();
            return;
        }
        this.$leftTime--;
        this.$passTime++;
        this.setTextTime(this.$leftTime);
    }

}
