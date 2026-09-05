import { EgretExEntry } from "lib/EgretExUtils_Entry";
import { RoleHead } from "lib/euiex/RoleHead";

export interface ArenaHighestRoleHeadHonour{

    head: RoleHead;
    grpTag: eui.Group;
    grpEmpty: eui.Group;
    lblEmpty: eui.Label;
    touchArea: eui.Rect;
    
}

export class ArenaHighestRoleHeadHonour extends eui.ItemRenderer {
    public _isEuiex = true;
    

    protected onSkinLoadCompleted() {
        super.onSkinLoadCompleted();
        this.touchArea && this.touchArea.addEventListener(egret.TouchEvent.TOUCH_TAP, this.$onTouchedHeadRole, this);
        //this.grpPlayerinfo && this.grpPlayerinfo.addEventListener(egret.TouchEvent.TOUCH_TAP, this.$onTouchedHeadRole, this);
        this.head.setClickabled(false);
        if (this.completed && this.data) {
            this.setData(this.data);
        }
    }

    public $onRemoveFromStage() {
        this.touchArea && this.removeEventListener(egret.TouchEvent.TOUCH_TAP, this.$onTouchedHeadRole, this);
        //此处不可以设置为空，因为 IncludeIn会移除控件，再次添加时，不会重新设置
        // this.data = null;
        super.$onRemoveFromStage();
    }

    public dataChanged() {
        super.dataChanged();
        this.resetComs();
        let data = this.data as EgretExEntry.ArenaHighestRoleHeadData;
        let isEmpty = !data || !data.role;
        this.grpEmpty.visible = isEmpty;
        if (!isEmpty){
            if (data.role){
                this.head.setData({
                    bottomImgSrc : "arena_highest_honour_head_bg_png",
                    rolehead : {
                        icon : data.role.rolehead.icon,
                        star : data.role.rolehead.star,
                        frame : data.rankConfig && data.rankConfig.frame || data.role.rolehead.frame,
                    }
                });
            }
        }else{
            this.head.setData({
                bottomImgSrc : "arena_highest_honour_head_bg_png",
                rolehead : {
                    icon : undefined,
                    frame : data.rankConfig.frame || 1,
                },
            });
        }
    }

    /**隐藏所有组件 */
    private resetComs(){
        this.grpEmpty.visible      = false;
    }

    @SafeCallFunction()
    public setData(data: EgretExEntry.ArenaHighestRoleHeadData) {
        this.data = data;
    }

    private $onTouchedbtnReplay() {
        this.data && this.data.touched && this.data.touched();
    }

    private $onTouchedHeadRole() {
        // let uid = this.data && this.data.role && this.data.role.uid;
        // uid && ArenaHighestCNet.C_ON_HIGHEST_USER_INFO(uid);
    }
    
}
