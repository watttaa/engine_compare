import { s2_guide_cfg } from "auto/guide";
import { GlobalValue } from "GlobalValueDefine";

export class GuideModel {

    private static $instance: GuideModel;

    public static getInst(): GuideModel {
        if (!this.$instance) {
            this.$instance = new GuideModel;
        }
        return this.$instance;
    }

    public lockedOpenUI: number[] = []
    /**飞升之后重指引的openIDs */
    public reguideOpenUI: number[] = []
    public unlockedOpenUI: {[id: number]: {id: number, tips: string}} = {};

    /*** 是否自动新手 */
    private $isAuto:boolean;
    public isAuto(){
        return this.$isAuto && (DEBUG || LoginValue.isLoginChannelUrs());
    }

    public setAuto(isAuto:boolean){
        this.$isAuto = isAuto;
    }


    private gId:number;
    private stepId:number;
    public setGuide(gId:number,stepId:number){
        this.gId = gId;
        this.stepId = stepId;
    }

    public getKey(){
        return `${this.gId}|${this.stepId}`;
    }

    public getCfg(){
        return s2_guide_cfg.GuideInfo[this.getKey()];
    }


    public getGuideCfg(gid:number,stepId:number){
        return s2_guide_cfg.GuideInfo[`${gid}|${stepId}`]
    }

}