// TypeScript file

import { s2_text_utils } from "auto/text";
import { CommonEvent } from "event/CommonEventDefines";
import { CommonEventManager } from "lib/CommonEventMgr";
import { WebVoicePlayer } from "lib/WebVoicePlayer";

export class VoiceEvent extends egret.Event {
    public static readonly VoiceStart: string = "VoiceStart";
    public static readonly VoiceEnd: string = "VoiceEnd";

    public constructor(type: string, data?: any) {
        super(type, false, false, data);
    }
}


export class VoiceManager extends SingletonClassEx {

    constructor(){
        super()
        CommonEventManager.getInstance().addEventListener(CommonEvent.WebVoicePlayerDoPlay, this.doPlay, this);
    }

    destroy(){
        CommonEventManager.hasInstance() && CommonEventManager.getInstance().removeEventListener(CommonEvent.WebVoicePlayerDoPlay, this.doPlay, this);
    }

    private doPlay(evt: CommonEvent){
        Logger.log("VoiceManager doPlay");
        let key = evt.data.key;
        VoiceManager.getInstance().muteBackgroundMusic();
        VoiceManager.getInstance().playState = "on";
        VoiceManager.getInstance().playKey = key;
        VoiceManager.getInstance().dispatchEvent(new VoiceEvent(VoiceEvent.VoiceStart, {key}));
    }

    public set laba(mc: egret.MovieClip) {
        this.$laba = mc;
    }

    public $callBack: any;
    public $caller: any;

    private $laba: egret.MovieClip;
    private $lastRecordStartTime: number = 0;
    private $recordStartCD = 1000; //ms

    public recordStart() {
        let time = Date.now();
        if (time - this.$lastRecordStartTime < this.$recordStartCD) {
            MessageBox(s2_text_utils.T(2019058)); // 2019058: `#cd8e9ff休息一下，不要点这么快嘛`,
            return false
        }
        this.$lastBGMVolume = SoundUtils.getMgrInstance().volume;
        SoundUtils.getMgrInstance().volume = 0;// BGM静音

        NativeCNet.sendRecordCmd('start')
        this.$lastRecordStartTime = time;
        return true
    }

    public recordEnd(callback: any, thisObj: any) {
        this.$callBack = callback;
        this.$caller = thisObj;
        NativeCNet.sendRecordCmd("end");
    }

    public recordCancel() {
        SoundUtils.getMgrInstance().volume = this.$lastBGMVolume ? this.$lastBGMVolume : 0;
        NativeCNet.sendRecordCmd('cancel')
    }

    public onRecordEnd() {
        SoundUtils.getMgrInstance().volume = this.$lastBGMVolume ? this.$lastBGMVolume : 0;

    }

    /**
     * args= {key, text, duration}
     */
    public sendVoice(args: any) {
        if (args.duration <= 0.5) {
            MessageBox(s2_text_utils.T(2019057)); // 2019057: `#cFFDE27说话时间太短`,
            return;
        }
        if (!this.$callBack) {
            return;
        }
        if(args.text && args.text.length > 0){
            this.$callBack.call(this.$caller, args.text, args.key, Math.floor(args.duration * 10) / 10);
        }
        else {
            this.$callBack.call(this.$caller, s2_text_utils.T(22275), null, null); // 22275: `悟空又调皮了`,
        }
        // this.$callBack.call(this.$caller, "#t(" + JSON.stringify({isVo:true, key:args.key, duration:args.duration}) + ")#v" 
        // + (args.duration as Number).toFixed(1) + "' " + args.text + "#t");
    }

    public refreshRecordState(state: "in" | "out") {
        Logger.log("refreshRecordState:", state);
    }

    private $playState: "on" | "off" = "off";
    private $playKey: string;

    private $lastBGMVolume: any;

    public get playKey() {
        return this.$playKey;
    }

    public set playKey(value: string) {
        this.$playKey = value;
    }

    public get playState() {
        return this.$playState;
    }

    public set playState(value) {
        this.$playState = value;
    }

    public muteBackgroundMusic() {
        if (this.$playState === "on") return;
        this.$lastBGMVolume = SoundUtils.getMgrInstance().volume;
        SoundUtils.getMgrInstance().volume = 0;// BGM静音
    }

    public playStart(key: string): boolean {
        Logger.log("playStart:", key ? key : "no shit", "; cur playState:", this.$playState);
        if (this.$playState === "on") {
            this.$playState = "off";
            this.playEnd();
            // 不 return，继续执行播放新 key 的逻辑
        }
        if (LoginValue.isLoginChannelMobileSDK()) {
            NativeCNet.sendVoiceCmd('play', key)
            this.muteBackgroundMusic();
            this.$playKey = key;
            this.$playState = "on";
            this.dispatchEvent(new VoiceEvent(VoiceEvent.VoiceStart, { key }));
        }
        // else if (WebVoicePlayer.avaliable) {
        //     WebVoicePlayer.getInst().addEventListener(egret.Event.SOUND_COMPLETE, this.onPlayEnd, this);
        //     WebVoicePlayer.getInst().play(key);
        // }
        else {
            MessageBox(s2_text_utils.T(2019059)); // 2019059: `#cFFDE27暂不支持语音播放`,
            return false;
        }
        // this.$lastBGMVolume = SoundUtils.getMgrInstance().volume;
        // SoundUtils.getMgrInstance().volume = 0;// BGM静音
        // this.$playKey = key;
        // this.$playState = "on";
        // this.$laba && this.$laba.play(-1);
        // let evt = new VoiceEvent(VoiceEvent.VoiceStart, {key});
        // this.dispatchEvent(evt);
        return true;
    }

    public playEnd() {
        if (LoginValue.isLoginChannelMobileSDK()) {
            NativeCNet.sendVoiceCmd('stop')
        }
        else if (WebVoicePlayer.avaliable) {
            WebVoicePlayer.getInst().stop();
            WebVoicePlayer.getInst().removeEventListener(egret.Event.SOUND_COMPLETE, this.onPlayEnd, this);
            this.onPlayEnd();
        }
    }

    public onPlayEnd() {
        let key = this.$playKey;
        // 没有正在播放的语音（如 switchChannel 触发的误调用），直接忽略，避免误触发 VoiceEnd 连续播放
        if (!key) return;
        SoundUtils.getMgrInstance().volume = this.$lastBGMVolume ? this.$lastBGMVolume : 0;
        this.$playKey = null;
        this.$playState = "off";
        // this.$laba && this.$laba.gotoAndStop(20);
        let evt = new VoiceEvent(VoiceEvent.VoiceEnd, { key });
        this.dispatchEvent(evt);
        this.peekQueue();
    }

    private $queue: string[] = [];

    public playQueue(key?: string) {
        if (this.$playState !== "on") {
            this.playStart(key);
        }
        else if (LoginValue.isLoginChannelMobileSDK() || WebVoicePlayer.avaliable) {
            this.pushQueue(key);
        }
    }

    private pushQueue(key?: string) {
        if (this.$queue === undefined)
            this.$queue = [];
        this.$queue.push(key);
    }

    private peekQueue() {
        if (!this.$queue || this.$queue.length <= 0)
            return;
        this.playStart(this.$queue.shift());
    }

    public clearQueue() {
        this.$queue = [];
    }

}