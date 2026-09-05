import { ArenaTopFinalOrderEnum, HeadFrameType } from "base/Enum";
import { EgretExEntry } from "lib/EgretExUtils_Entry";
import { RoleHead } from "lib/euiex/RoleHead";
import { s2_text_utils } from "auto/text";

export interface ArenaTopRoleHeadHonour{

    roleHead: RoleHead;
    imgQuestion: eui.Image;
    grpDead: eui.Group;
    grpEmpty: eui.Group;
    lblEmpty: eui.Label;
    grpLock: eui.Group;
    grpUp: eui.Group;
    grpStar: eui.Group;
    grpPlayerinfo: eui.Group;
    lblPlayerName: eui.Label;
    lblAreaCode: eui.Label;
    grpMc: eui.Group;
    touchArea: eui.Rect;
    
}

export class ArenaTopRoleHeadHonour extends eui.ItemRenderer {
    public _isEuiex = true;

    protected onSkinLoadCompleted() {
        super.onSkinLoadCompleted();
        this.touchArea && this.touchArea.addEventListener(egret.TouchEvent.TOUCH_TAP, this.$onTouchedHeadRole, this);
        //this.grpPlayerinfo && this.grpPlayerinfo.addEventListener(egret.TouchEvent.TOUCH_TAP, this.$onTouchedHeadRole, this);
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
        let data = this.data as EgretExEntry.ArenaTopRoleHeadData;
        let isEmpy = !(data && data.role);
        this.grpEmpty.visible = isEmpy;
        this.grpPlayerinfo.visible = !isEmpy;
        let frame = this.getFrame(data.order);
        if (!isEmpy){
            this.roleHead.setData({
                rolehead : {
                    icon : data.role.rolehead.icon,
                    star : data.role.rolehead.star,
                    frame : frame || data.role.rolehead.frame,
                }
            });
            if (data.server){
                this.lblAreaCode.visible = true;
                this.lblAreaCode.text = s2_text_utils.T(26505, { num: data.server });
            }
            if (data.name){
                this.lblPlayerName.text = data.name + "";
            }
        }else{
            this.roleHead.setData({
                rolehead : {
                    icon : undefined,
                    frame : frame || 1,
                },
            });
        }
    }

    /**隐藏所有组件 */
    private resetComs(){
        this.imgQuestion.visible   = false;
        this.grpDead.visible       = false;
        this.grpEmpty.visible      = false;
        this.grpLock.visible       = false;
        this.grpUp.visible         = false;
        this.grpPlayerinfo.visible = false;
    }
    
    private getFrame(order: ArenaTopFinalOrderEnum){
        if(order == undefined){
            return undefined;
        }
        if (order == ArenaTopFinalOrderEnum.FINALIST_WINNERS) return HeadFrameType.ArenaTop1;
        if (order == ArenaTopFinalOrderEnum.QUARTER_FINALIST)  return HeadFrameType.ArenaTop3;
        return HeadFrameType.ArenaTop2;
    }

    @SafeCallFunction()
    public setData(data: EgretExEntry.ArenaTopRoleHeadData) {
        this.data = data;
    }

    @SafeCallFunction()
    public setPlayerInfoVisible(visible: boolean){
        this.grpPlayerinfo.visible = visible;
    }

    private $onTouchedbtnReplay() {
        this.data && this.data.touched && this.data.touched();
    }

    private $onTouchedHeadRole() {
        // let uid = this.data && this.data.role && this.data.role.uid;
        // uid && ArenaTopCNet.C_ON_ARENA_TOP_USER_INFO(ArenaTopModel.getInstance().getCurDiv(), uid);
    }
    
}
