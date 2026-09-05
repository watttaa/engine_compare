import { uiSkinPath } from "GlobalValue";
import { GlobalValue } from "GlobalValueDefine";
import { s2_pets_cfg } from "auto/pets";
import { ItemMcTypeEnum, PartnerTypeEnum, QualityEnum } from "base/Enum";
import { EgretExEntry } from "lib/EgretExUtils_Entry";
import { IconItemBase } from "lib/euiex/PPIconItem";
import { safeCallComFunc } from "utils/UIUtils_safecall";

export interface PartnerHeadGrid {
    itemGridPP: IconItemBase;
    grpMcParent: eui.Group;
    grpUnActivated: eui.Group;

}

export class PartnerHeadGrid extends eui.ItemRenderer {
    public _isEuiex = true;
    public isSelectItem: boolean;
    private $showName: boolean = true;

    public constructor() {
        super();
        this.skinName = uiSkinPath("PPGridSkin_Head.exml");
    }

    protected onSkinLoadCompleted(): void {
        super.onSkinLoadCompleted();
        this.addEventListener(egret.TouchEvent.TOUCH_BEGIN, this.onTouchBeginItem, this);
        this.addEventListener(egret.TouchEvent.TOUCH_END, this.onTouchEndItem, this);
        this.addEventListener(egret.TouchEvent.TOUCH_MOVE, this.onTouchMoveItem, this);
    }

    protected dataChanged() {
        super.dataChanged();
        if (this.completed) {
            safeCallComFunc(this, this.itemGridPP, () => {
                this.$setData(this.data);
            })
        }
    }

    public $setData(data: EgretExEntry.PartnerHeadGridData) {
        ////////////////////////(皮肤需显示属性)
        if (data && data.id) {
            data.pid = data.id;
            if (data.partnerType == PartnerTypeEnum.PET) {
                let petInfo = s2_pets_cfg.PetsInfo[data.id];
                if (petInfo) {
                    // data.quality = petInfo[pets_cfg.iColour];
                    // data.icon = petInfo[pets_cfg.iIcon];

                } else {
                    Logger.error(`不存在守护 ${data.id}`);
                }
            } else if (data.partnerType == PartnerTypeEnum.PARTNER) {
                // let partnerInfo = partners_cfg.PartnersInfo[data.id];
                // if (partnerInfo) {
                //     data.quality = partnerInfo[partners_cfg.iColour];
                //     data.icon = partnerInfo[partners_cfg.iIcon];
                // } else {
                    Logger.error(`不存在伙伴 ${data.id}`);
                // }
            }             
            this.itemGridPP.data = data;
            this.itemGridPP.setCustom({ showStar: !data.selected })
            this.itemGridPP.setLblNameY(102);
            this.itemGridPP.setLblNameVisible(this.$showName);
        } else {
            this.itemGridPP.clearQualityMc();
            this.itemGridPP.setName(data && data.name);
            this.itemGridPP.setQualityFrame(data && data.quality || QualityEnum.BLUE);
            this.itemGridPP.setIconSource(data && data.iconSource || "");
            this.itemGridPP.setCustom({ showStar: false });
        }

        let empty = data && data.plus
        this.itemGridPP.setAddCompVisible(empty);
        this.itemGridPP.setImgFrameF(!empty);
        this.grpUnActivated.visible = !!(data && data.isLock && !data.selected);
        this.setChoose(data && data.selected && !this.isSelectItem);

        // 把特效提高到顶层->把未激活放入到子节点grpInfo中，这样不会导致选中框在特效下方
        // this.grpMcParent.addChild(this.itemGridPP.getGrpMc());
        this.itemGridPP.getGrpInfo()?.addChild(this.grpUnActivated);
        if (data) {
            if (empty) {
                // 空格子也显示白金特效
                this.itemGridPP.resetQualityAni(QualityEnum.PLATINUM, ItemMcTypeEnum.TweenGroup);
            } else {
                this.itemGridPP.resetQualityAni(data.quality, data.effect_type);
            }
        }
    }

    protected setChoose(value: boolean) {
        if (this.itemGridPP && this.itemGridPP.completed) {
            this.itemGridPP.setMaskCompVisible(value);
            if (value) {
                this.itemGridPP.maskComp.setImage("lucky_sszp_checkOn_icon_png")
            }
        }
    }

    //长按点击
    private isTouch = false;
    private touchIndex = -1;
    private onTouchBeginItem(evt: egret.TouchEvent): void {
        this.isTouch = true;
        egret.clearTimeout(this.touchIndex);
        this.touchIndex = egret.setTimeout(() => {
            if (this.isTouch) {
                this.lookSkill();
            }
        }, this, GlobalValue.LOOK_SKILL_TIMEOUT);
    }

    private onTouchEndItem(evt: egret.TouchEvent): void {
        this.isTouch = false;
        if(this.touchIndex){
            egret.clearTimeout(this.touchIndex);
        }else{
            evt.stopPropagation();
        }
    }

    private onTouchMoveItem() {
        this.isTouch = false;
    }

    private lookSkill() {
        egret.clearTimeout(this.touchIndex);
        let data = this.data as EgretExEntry.PartnerHeadGridData
        if (!data || !data.id) {
            return;
        }
        if (data && data.id) {
            //固定显示黄五星
            // SkillCNet.C_ON_OPEN_FOLLOWER_SKILL(data.partnerType as any, data.id, 0, UN_REBORN_MAX_STAR);
        }
    }

    public setNameVisible(visible: boolean) {
        this.$showName = visible;
        if (this.completed) {
            this.itemGridPP.setLblNameVisible(visible)
        }
    }

    public $onRemoveFromStage(): void {
        super.$onRemoveFromStage();
        this.touchIndex && egret.clearTimeout(this.touchIndex);
    }

    // public $setSelected(value: boolean) {
    //     super.$setSelected(value);
    //     this.setChoose(value);
    // }
}