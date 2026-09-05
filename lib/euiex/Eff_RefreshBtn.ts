import { ComponentEx } from "./ComponentEx";

export class Eff_RefreshBtn extends ComponentEx {
    public _isEuiex = true;
    public anim_Eff_RefreshBtn_loop: egret.tween.TweenGroup;
    public constructor() {
        super();
        this.skinName = "resource/eui/Eff_RefreshBtn.exml";
        this.touchEnabled = false;
        this.touchChildren = false;
    }

    $onRemoveFromStage() {
        this.anim_Eff_RefreshBtn_loop && this.anim_Eff_RefreshBtn_loop.stop();
        super.$onRemoveFromStage();
    }

    protected onSkinLoadCompleted() {
        super.onSkinLoadCompleted();
        this.showEffect(this.$curEffect || 0);
    }

    $setVisible(value: boolean): void {
        super.$setVisible(value);
        this._updateAni(value);
    }

    private $curEffect: number;
    @SafeCallFunction()
    public showEffect(effect: number) {
        this.$curEffect = effect;
        this.updataSkinName(effect);
        this._updateAni(!!effect);
    }

    private _updateAni(showEffect: boolean) {
        let grp_ani = this.anim_Eff_RefreshBtn_loop;
        if (!grp_ani) {
            return;
        }
        if (showEffect && !grp_ani.isPlaying) {
            grp_ani.play();
        }
        else if (!showEffect && grp_ani.isPlaying) {
            grp_ani.stop();
        }
    }

    public updataSkinName(effect: number): void {
        let skinName:string = "";
        if(effect === 1){
            skinName = "resource/eui/Eff_RefreshBtn.exml"
        }else if(effect === 2){
            skinName = "resource/eui/Eff_RefreshBtn02.exml"
        }else if(effect === 3){
            skinName = "resource/eui/Eff_RefreshBtn03.exml"
        }else if(effect === 4){
            skinName = "resource/eui/Eff_RefreshBtn04.exml"
        }else if(effect === 5){
            skinName = "resource/eui/Eff_RefreshBtn05.exml"
        }
        if(!skinName || skinName === this.skinName) return;
        this.anim_Eff_RefreshBtn_loop && this.anim_Eff_RefreshBtn_loop.stop();
        this.skinName = skinName;

    }
}

