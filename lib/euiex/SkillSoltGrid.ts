import { EgretExEntry } from "lib/EgretExUtils_Entry";
import { TweenGroupPanel } from "lib/TweenGroupPanel";
import { UIManagerFactroy } from "lib/UIManagerFactory";
import { SkillRoleGrid } from "./SkillRoleGrid";
import { filter_utils } from "lib/FilterUtils";

export interface SkillSoltGrid {

    skillGrid: SkillRoleGrid;
    lblName: eui.Label;
    prbValue: eui.ProgressBar;
    lblRebornDes: eui.Label;
    grpMC: eui.Group;

}

export class SkillSoltGrid extends eui.ItemRenderer {
    public _isEuiex = true;
    ////////////////////////(皮肤定义)
    skillGrid: SkillRoleGrid;
    lblName: eui.Label;
    prbValue: eui.ProgressBar;
    lblRebornDes: eui.Label;
    grpMC: eui.Group;
    imgLock:eui.Image

    ////////////////////////(自定义)
    protected $custom: EgretExEntry.SkillSlotData;
    private upgradeTweenInst: TweenGroupPanel; //升级动画
    private $selected: boolean = false;

    protected partAdded(partName: string, instance: any) {
        if (partName == "groupMC") {
            Logger.log(`---${this.hashCode}---groupMc: ${this.grpMC.hashCode}`);
            if (this.playMc) {
                this.playMc = false;
                this.playUpgrade();
            }
        }
    }

    public onSkinLoadCompleted() {
        super.onSkinLoadCompleted();
        this.$reset();
        Logger.log(`SkillSoltGrid:${this.hashCode}`);
        this.prbValue.labelFunction = (v: number, max: number) => { return `${v.toFixed()}/${max.toFixed()}`};
        this.$updateCustomData();
    }

    public $onRemoveFromStage() {
        this.onClose();
        this.destroy();
        super.$onRemoveFromStage();
    }

    protected dataChanged() {
        super.dataChanged();
        this.$updateCustomData();
    }

    public setSoltData(data: EgretExEntry.SkillSlotData) {
        this.data = data;
        this.$custom = data;
        this.$updateCustomData();
    }

    protected $updateCustomData() {
        if (this.completed) {
            safeInvokeFunc(this.skillGrid, () => {
                if (!this.skillGrid.completed) return;
                if (this.$custom) {
                    this.skillGrid.setShowData(this.$custom.skill);
                    this.lblName.text = this.$custom.skill.name;
                    let rebornSkill = !this.$custom.pbrData.max; //是否转生技能
                    // this.lblRebornDes.visible = rebornSkill;
                    // this.prbValue.visible = !rebornSkill
                    this.currentState = rebornSkill ? "reborn" : "base";
                    if (!rebornSkill) {
                        this.prbValue.maximum = this.$custom.pbrData.max;
                        this.prbValue.value = (this.$custom as EgretExEntry.SkillSlotData).pbrData.value;
                    } else {
                        this.lblRebornDes.richmode = true;
                        this.lblRebornDes.text = this.$custom.skill.rebornLev;
                    }
                    let unlock = this.$custom.unlock;
                    this.skillGrid.lockComp.visible = !unlock
                    this.skillGrid.filters = unlock ? null : filter_utils.getGreyFilter();
                    this.prbValue.filters = unlock ? null : filter_utils.getGreyFilter();
                    // this.imgLock.filters = unlock ? null : filter_utils.getGreyFilter();
                    // if(!unlock){
                    //     this.currentState = "gray";
                    // }
                }
                this.skillGrid && (this.skillGrid.selected = this.$selected);
            })
        }
    }

    private $reset() {
        // this.prbValue && (this.prbValue.visible = false);
    }

    protected $setSelected(value: boolean) {
        super.$setSelected(value);
        this.$selected = value;
        this.skillGrid && (this.skillGrid.selected = value);
    }

    public onClose() {
        this.selected = false;
        this.$selected = false;
        this.skillGrid && (this.skillGrid.selected = false);
        if (this.upgradeTweenInst) {
            this.upgradeTweenInst.visible = false;
            this.upgradeTweenInst.stop();
        }
    }

    public destroy() {
        if (this.upgradeTweenInst) {
            this.upgradeTweenInst.destroy();
            this.upgradeTweenInst = null;
        }
    }

    /**播放特效缓存 */
    private playMc: boolean = false;
    public playUpgrade() {
        if (!this.grpMC) {
            this.playMc = true;
            return;
        }
        if (!this.upgradeTweenInst) {
            this.upgradeTweenInst = UIManagerFactroy.createTweenGroupPanel(this.grpMC, "resource/eui_skins/AniCommonCycleLight.exml", 0, 0, false)
        }
        this.upgradeTweenInst.play();
    }
}
