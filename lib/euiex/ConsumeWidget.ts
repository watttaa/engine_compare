import { ItemInfo } from "s2/bag/ItemInfo";
import { ItemUtils } from "s2/bag/ItemUtils";
import { CostEntry, CostEntry1 } from "base/ServerEntry";;
import { EgretExEntry } from "lib/EgretExUtils_Entry";
import { res_utils } from "utils/ResUtils";
import { BaseGrid } from "./BaseGrid";
import { ObjectTypeEnum } from "auto/object_type_enum";
import { BagCNet } from "s2/bag/net/BagCNet";

/**
 * 消费物品组件
 */
export class ConsumeWidget extends eui.Component {
    public _isEuiex = true;

    ////////////////////////(皮肤定义)
    private item: BaseGrid;  // 显示装备
    private imgIcon?: eui.Image; // 显示除了装备以外的道具
    private lblItemNum: eui.Label;
    private lblName: eui.Label;
    private btnAdd: eui.Button;//部分皮肤才有
    private imgIconFrame: eui.Image;
    // 第二套货币组件
    private imgIcon2?: eui.Image; // 第二种货币图标
    private lblItemNum2?: eui.Label; // 第二种货币数量
    ////////////////////////(自定义)
    protected $data: EgretExEntry.ConsumeItemData;
    private $showTips: boolean = true;//默认弹tips

    private isStopPropagation: boolean = false;//点击事件是否停止冒泡
    private m_nSize: number;

    public get data() {
        return this.$data;
    }

    public set data(value: EgretExEntry.ConsumeItemData) {
        this.$data = value;
        if (this.completed) {
            if (this.item) {
                safeInvokeFunc(this.item, () => {
                    this.dataChanged();
                });
            } else {
                this.dataChanged();
            }
        }
    }

    /** 通过CostEntry来设置消耗控件数据 */
    public setDataByCostEntry1(entry: CostEntry1) {
        let item_info = ItemInfo.create({ sid: entry.sid });
        this.data = { itemInfo: item_info, have: entry.has, use: entry.need };
    }

    public setDataByCostEntry(entry: CostEntry) {
        let item_info = ItemInfo.create({ sid: entry.costId });
        this.data = { itemInfo: item_info, have: entry.own, use: entry.costNum };
    }

    private m_bAutoAdjustFontSize: boolean;
    protected onSkinLoadCompleted() {
        super.onSkinLoadCompleted();
        this.m_nSize = this.lblItemNum.size;
        this.m_bAutoAdjustFontSize = this.lblItemNum.autoAdjustFontSize;
        this.btnAdd && (this.btnAdd.addEventListener(egret.TouchEvent.TOUCH_TAP, this.onTouchAddBtn, this));
        this.imgIcon && (this.imgIcon.visible = false);
        this.item && (this.item.visible = false);
        if (this.$data) {
            if (this.item) {
                safeInvokeFunc(this.item, () => {
                    this.dataChanged();
                });
            } else {
                this.dataChanged();
            }
        }

        this.updateTouch();
    }

    private updateTouch() {
        if (!this.completed) return;
        if (this.item && this.item.visible) {
            safeInvokeFunc(this.item, () => {
            });
        } else {
            //如果代码设置，以代码设置为准
            if (this.$showTips != undefined) {
                this.touchEnabled = this.$showTips;
                this.touchChildren = this.$showTips;
            }
            this.addEventListener(egret.TouchEvent.TOUCH_TAP, this.$onTouchedTapItem, this);

            if (DEV) {
                G123.get('game_develop')?.regDebugRightClick(this, this, this.onClickRight)
            }
        }
    }
    private onClickRight() {
        try {
            let cmd = `$ni ${this.data.itemInfo['$entry'].sid} 999`;
            LoginCNet.C_GM_COMMAND_REQ([cmd])
        } catch (error) {

        }
    }

    protected getImgIconSource(icon, type, useSmallIcon: boolean = true) {
        // ConsumeWidget默认用icon小图标
        return ItemUtils.getItemByIcon(icon, type, useSmallIcon);
    }

    protected dataChanged() {
        if (this.data.lockSize && this.data.lockSize > 0) {
            this.lblItemNum.size = this.data.lockSize;
            this.lblItemNum.autoAdjustFontSize = false;
        }
        else {
            this.lblItemNum.size = this.m_nSize;
            this.lblItemNum.autoAdjustFontSize = this.m_bAutoAdjustFontSize;
        }
        this.btnAdd && (this.btnAdd.visible = !!this.data.touchAddCB);
        if (this.data.itemInfo) {
            let itemInfo = this.data.itemInfo;
            this.item && this.item.setData({ iteminfo: itemInfo });
            if (this.lblName) {
                this.lblName.text = itemInfo.name;
            }

            if (this.imgIcon) {
                let isEquip = itemInfo.type == ObjectTypeEnum.EQUIPMENT_GAOZHUANG

                this.imgIcon.visible = !isEquip;
                this.imgIcon.source = this.getImgIconSource(itemInfo.icon, itemInfo.type, !!this.item);
                this.item && (this.item.visible = isEquip);
                Logger.log(`消耗物品 ${itemInfo.name} ID:${itemInfo.id} 是否显示icon:${isEquip}`);
            } else {
                this.item && (this.item.visible = true);
            }

        }

        if (this.imgIconFrame && this.data.itemInfo) {
            let itemInfo = this.data.itemInfo;
            this.imgIconFrame.source = res_utils.getConsumeWidgetQualityIcon(itemInfo.quality)
        }

        // 先处理文本内容
        if (this.data.info) {
            this.lblItemNum.text = this.data.info;
        }
        if (isNotVain(this.data.have) || isNotVain(this.data.use)) {
            if (this.data.use !== undefined && this.data.have !== undefined) {
                let haveStr = this.data.noHaveFormat ? this.data.have.toString() : preload_utils_text.numberFormat(this.data.have);
                let useStr = this.data.noUseFormat ? this.data.use.toString() : preload_utils_text.numberFormat(this.data.use);
                this.lblItemNum.text = `${haveStr}/${useStr}`;
            } else if (this.data.use !== undefined) {
                if (this.data.noUseFormat) {
                    this.lblItemNum.text = `${preload_utils_text.formatIntegerWithCommas(this.data.use)}`;
                }
                else {
                    this.lblItemNum.text = `${preload_utils_text.numberFormat(this.data.use)}`;
                }
            } else if (this.data.have !== undefined) {
                if (this.data.noHaveFormat) {
                    this.lblItemNum.text = `${this.data.have}`;
                } else {
                    this.lblItemNum.text = `${preload_utils_text.numberFormat(this.data.have)}`;
                }
            }
        }
        
        // 统一处理状态：先处理双货币状态，再处理资源充足状态
        this.updateStates();
    }
    
    /**
     * 统一更新组件状态
     */
    private updateStates() {
        // 先处理双货币显示状态
        this.updateSecondCurrency();
        
        // 再处理资源充足状态（如果皮肤支持的话）
        this.updateAffordabilityState();
    }
    
    /**
     * 更新第二种货币的显示和状态
     */
    private updateSecondCurrency() {
        if (!this.imgIcon2 || !this.lblItemNum2) {
            return; // 皮肤不支持第二种货币
        }
        
        const hasSecondCurrency = Boolean(this.data.itemInfo2 && this.data.info2);
        
        // 根据是否有第二种货币切换状态
        if (hasSecondCurrency) {
            // 状态 _2: 双货币显示
            this.currentState = "_2";
            
            // 设置第二种货币图标
            this.imgIcon2.source = this.getImgIconSource(this.data.itemInfo2.icon, this.data.itemInfo2.type, true);
            // 设置第二种货币数量文本
            this.lblItemNum2.text = this.data.info2;
        } else {
            // 状态 _1: 单货币显示
            this.currentState = "_1";
        }
    }
    
    /**
     * 更新资源充足状态
     */
    private updateAffordabilityState() {
        // 只有在皮肤不支持双货币状态时才使用 affordable/unaffordable 状态
        if (this.imgIcon2 && this.lblItemNum2) {
            return; // 双货币皮肤不使用 affordable/unaffordable 状态
        }
        
        // 传统的资源充足状态处理
        if (this.data.info) {
            this.currentState = this.data.afford ? "affordable" : "unaffordable";
        }
        if (isNotVain(this.data.have) || isNotVain(this.data.use)) {
            this.currentState = "affordable";
            if (this.data.use !== undefined && this.data.have !== undefined) {
                this.currentState = this.data.have >= this.data.use ? "affordable" : "unaffordable";
            } else if (this.data.use !== undefined) {
                this.currentState = (this.data.haveNotShow === void (0) ? 999999999 : this.data.haveNotShow) >= this.data.use ? "affordable" : "unaffordable";
            } else if (this.data.have !== undefined) {
                this.currentState = this.data.have >= (this.data.useNotShow || 0) ? "affordable" : "unaffordable";
            }
            if (isNotVain(this.data.isAffordable)) {
                this.currentState = this.data.isAffordable ? 'affordable' : 'unaffordable';
            }
        }
    }

    private onTouchAddBtn(e: egret.TouchEvent) {
        if (!this.data || !this.data.touchAddCB) return;
        let touchAddCB = this.data.touchAddCB;
        if (touchAddCB) {
            touchAddCB.call(null);
        }
    }

    private $onTouchedTapItem(e: egret.TouchEvent) {
        this.showItemTips();
        if (this.isStopPropagation) {
            e.stopPropagation();
        }
        // e.stopPropagation
    }

    public showItemTips() {
        if (this.data?.itemInfo) {
            let itemInfo = this.data.itemInfo;
            let touchInfo = this.data.touchInfo;
            let showSource = Boolean(this.data.showSource);
            BagCNet.C_GET_ITEM_EXTRA_INFO(itemInfo, {}, showSource);
            if (touchInfo) {
                touchInfo.callback && touchInfo.callback.call(touchInfo.caller);
            }
        }
    }

    /**设置是否显示物品弹框 */
    public showTips(showTips: boolean, isStopPropagation: boolean = false) {
        this.$showTips = showTips;
        this.isStopPropagation = isStopPropagation;
        this.updateTouch();
    }
}