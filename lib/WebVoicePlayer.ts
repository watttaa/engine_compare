// TypeScript file

import { CommonEvent } from "event/CommonEventDefines";
import { CommonEventManager } from "lib/CommonEventMgr";

export class WebVoicePlayer extends egret.EventDispatcher{

    public static readonly serverUrl:string = "https://voice-1.nie.netease.com:30690/";
    public static readonly userAgent:string = "g102";
    public static readonly uid:string ="1";
    public static readonly host:number = 89;

    private static _instance:WebVoicePlayer;
    private static voiceCache: dataStructure.Map;

    public static avaliable: boolean;
    private $context: any;
    private $src:any;
    private $autoPlay: string;

    public static getInst(){
        if(!this._instance){
            this._instance = new WebVoicePlayer;
            this.voiceCache = new dataStructure.Map;
            this._instance.init();
        }
        return this._instance;
    }

    public static addVoice(key: string, data:ArrayBuffer){
        this.voiceCache.set(key, data);
    }

    public static getVoice(key: string){
        return this.voiceCache.get(key);
    }

    public static clearCache(){
        this.voiceCache.clear();
    }

    public init(){
        WebVoicePlayer.avaliable = window["AudioContext"] || window["webkitAudioContext"] || window["mozAudioContext"] || window["msAudioContext"];
        if (WebVoicePlayer.avaliable) {
            try {
                //防止某些chrome版本创建异常问题
                this.$context = new (window["AudioContext"] || window["webkitAudioContext"] || window["mozAudioContext"] || window["msAudioContext"])();
            }
            catch (e) {
                Logger.log("[语音]浏览器不支持audioContext");
                WebVoicePlayer.avaliable = false;
            }
        }
        // if(this.$avaliable){
        //     (navigator as any).__defineGetter__('userAgent', function () {
        //         return WebVoicePlayer.userAgent;
        //     });
        // }
    }

    public play(key: string){
        if(WebVoicePlayer.getVoice(key)){
            this.doPlay(key);
        }
        else{
            this.$autoPlay = key;
            this.download(key);
        }
    }

    public stop(){
        if (this.$src) {
            this.$src.stop();
            this.$src.onended = null;
            this.$src = null;
        }
    }

    private download(key:string, callback?: any, thisObj?:any){
        let url = WebVoicePlayer.serverUrl + "getfile?key=" + key + "&host=" + WebVoicePlayer.host + "&usernum="+ WebVoicePlayer.uid;

        let xhr: XMLHttpRequest = new XMLHttpRequest;
        xhr.responseType = "arraybuffer";
        xhr.open(egret.HttpMethod.GET, url);
        // xhr.setRequestHeader("User-Agent", WebVoicePlayer.userAgent);
        xhr.setRequestHeader("Accept", "text/html");
        let onSucess = ()=>{
            // let data = egret.Base64Util.decode(xhr.response);
            let data = xhr.response;
            WebVoicePlayer.addVoice(key, data);
            if(this.$autoPlay === key){
                // if(userAgent !== userAgentDict.Safari) {
                     this.doPlay(key);
                // }
                // else {
                //      MessageBox(`${GlobalValue.Yellow}语音下载完成，再次点击可以播放`);
                // }
                Logger.log("[语音]下载完成");
            }
        }
        xhr.onload = onSucess;
        xhr.send();
        
        // if(GlobalValue.userAgent === GlobalValue.userAgentDict.Safari) {
        //     MessageBox(`${GlobalValue.Yellow}开始下载语音，下载完成后再次点击可以播放`);
        // }
        Logger.log("[语音]开始下载语音");
    }

    private expandAmr(amr: any[], multiple: number = 3) {
        if(Math.floor(multiple) !== multiple) {
            Logger.warn("expandAmr fail!");
            return amr;
        }
        let newAmr = [];
        for(let i=0;i<amr.length - 1;++i) {
            const deltaValue = (amr[i] - amr[i+1])/multiple;
            for(let j=0;j<multiple;++j) {
                newAmr.push(amr[i] + deltaValue * j);
            }
        }
        newAmr.push(amr[amr.length - 1]);
        return new Float32Array(newAmr);
    }

    private doPlay(key:string){
        // VoiceManager.getInst().muteBackgroundMusic();
        // VoiceManager.getInst().playState = "on";
        // VoiceManager.getInst().playKey = key;
        // VoiceManager.getInst().dispatchEvent(new VoiceEvent(VoiceEvent.VoiceStart, {key}));
        // 改成事件来接循环引用
        Logger.log("WebVoice doPlay")
        CommonEventManager.getInstance().dispatchEvent(new CommonEvent(CommonEvent.WebVoicePlayerDoPlay, {key: key}));

        let rawdata:ArrayBuffer = WebVoicePlayer.getVoice(key);
        let data = new Uint8Array(rawdata, 2);
        if(data.length > 0){
            let amr = AMR.decode(new Uint8Array(data));
            if(!amr){
                Logger.log("[语音] amr解码错误");
                return;
            }
            let sampleRate = 8000;
            if(preload_utils_platform.getUserAgent_() === preload_utils_platform.userAgentDict.Safari) {
                sampleRate = 24000;
                amr = this.expandAmr(amr);
            }
            
            let buff = this.$context.createBuffer(1, amr.length, sampleRate);
            this.$src && this.stop();
            this.$src = this.$context.createBufferSource();
            if(buff.copyToChannel){
                buff.copyToChannel(amr, 0, 0);
            }
            else{
                let channelBuffer = buff.getChannelData(0);
                channelBuffer.set(amr);
            }
            this.$src.buffer = buff;
            this.$src.connect(this.$context.destination);
            this.$src.onended = this.onPlayEnd;
            this.$src.start();
        }
    }

    private onPlayEnd(){
        Logger.log("[语音] web voice playend");
        WebVoicePlayer.getInst().stop();
        WebVoicePlayer.getInst().dispatchEventWith(egret.Event.SOUND_COMPLETE);
    }

    private onVoiceDownloaded(){}

}