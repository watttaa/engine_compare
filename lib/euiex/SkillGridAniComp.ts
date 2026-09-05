import { ComponentEx } from "./ComponentEx";

/**
* 技能动效组件
* 
*/
export class SkillGridAniComp extends ComponentEx {
    public _isEuiex = true;
    image: eui.Image;
    loop: egret.tween.TweenGroup;
    
    private $skinBaseName: string;

    private $comp_state:string;

    /**
     * 
     * @param skinBaseName 
     * @returns 
     */
    public setAniSkinName(skinBaseName: string, state:string=undefined): void {
        if(!skinBaseName){
            Logger.error("不存在的类型",skinBaseName);
            return;
        }
        this.$comp_state = state
        if(this.$skinBaseName === skinBaseName){
            if(isNotVain(state) && this.$comp_state != this.currentState) {
                this.updateState();
            }else{
                this.play();
            }
        }else{
            this.$skinBaseName = skinBaseName;
            this.skinName = `resource/eui_skins/${skinBaseName}.exml`;
        }
    }

    protected onSkinLoadCompleted() {
        super.onSkinLoadCompleted();
        this.updateState()
        //  this.loop.play(0);
    }
    
    private updateState() {
        if(this.currentState != this.$comp_state) {
            this.currentState = this.$comp_state;
            this.validateNow();
        }
        this.stop();
        this.play();
    }

    public stop(): void {
        if (this.inited && this.loop) {
            this.loop.stop();
        }
    }

    public play(): void {
        if (this.inited && this.loop) {
            this.loop.play(0);
        }
    }

    public gotoAndPlay(): void {
        this.play();
        // if (this.inited && this.loop) {
        //     this.loop.play();
        // }
    }
    
    public $onRemoveFromStage(): void {
        super.$onRemoveFromStage();
        this.stop();
    }
}