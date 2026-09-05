import { s2_chat_config_cfg } from "auto/chat_config";
import { ItemMcTypeEnum } from "base/Enum";
import { RoleHeadEntry } from "base/ServerEntry";
import { setChatAni } from "chat/ChatUtils";
import { EgretExEntry } from "lib/EgretExUtils_Entry";
import { GoodsGrid, GridCompCustom } from "lib/euiex/BaseGrid";
import { DEFAULT_HEAD_FRAME_ID, RoleHead } from "lib/euiex/RoleHead";
import { getProfileBubblePath } from "playerinfo/PlayerProfileUtils";
import { AppearanceConf } from "s2/appearance/conf/AppearanceConf";
import { appearance_define } from "s2/appearance/vo/AppearanceVo";
import { ItemInfo } from "s2/bag/ItemInfo";
import { ItemUtils } from "s2/bag/ItemUtils";
import { BagCNet } from "s2/bag/net/BagCNet";
import { safeCallComFunc } from "utils/UIUtils_safecall";

export enum GoodsGridExtendState {
    STATE_NOR = "nor",
    STATE_HEAD = "head",
    STATE_BUBBLE = "bubble",
}

export interface GoodsGridExtend {
    goodsGrid: GoodsGrid;
    head: RoleHead;
    imgBubble: eui.Image;
    grpBubbleAni: eui.Group;
}

export class GoodsGridExtend extends eui.ItemRenderer {
    protected $itemInfo: ItemInfo;
    protected $custom: GridCompCustom;

    @SafeCallFunction()
    public setData(itemInfo: ItemInfo, custom?: GridCompCustom) {
        this.$itemInfo = itemInfo;
        this.$custom = custom;
        this.updateGrid();
    }

    public getData() {
        return this.$itemInfo;
    }

    @SafeCallFunction()
    public setCustom(data: EgretExEntry.ItemGridCustomData) {
        safeCallComFunc(this, this.goodsGrid, () => {
            // 转发到内部 goodsGrid.setCustom：其内部 merge custom 到已就绪的 goodsGrid.data 并 refresh，
            // 支撑 BagGrid 门票 201/202 登记角标（custom.tags）等自定义数据渲染。
            this.goodsGrid.setCustom(data as any);
        })
    }

    /** 更新单个属性的值 */
    @SafeCallFunction()
    public oneCustom<K extends keyof EgretExEntry.ItemGridCustomData>(key: K, value: EgretExEntry.ItemGridCustomData[K]) {
        safeCallComFunc(this, this.goodsGrid, () => {
            //this.itemGrid.oneCustom(key, value);
        })
    }

    /**更新多个定制属性 */
    @SafeCallFunction()
    public updateSomeCustom(data: EgretExEntry.ItemGridCustomData) {
        safeCallComFunc(this, this.goodsGrid, () => {
            //this.itemGrid.updateSomeCustom(data);
        })
    }

    // 红点
    @SafeCallFunction()
    public setRedPoint(b: number) {
        safeCallComFunc(this, this.goodsGrid, () => {
            //this.itemGrid.setRedPoint(b);
        })
    }

    @SafeCallFunction()
    public setTouchFunc(func: Function, thisObj?: any, args?: any) {
        safeCallComFunc(this, this.goodsGrid, () => {
            //this.itemGrid.setTouchFunc(func, thisObj, args);
        })
    }

    @SafeCallFunction()
    public clearTouchFunc() {
        safeCallComFunc(this, this.goodsGrid, () => {
            //this.itemGrid.clearTouchFunc();
        })
    }

    /**
    * 打开物品提示
    * @returns 
    */
    @SafeCallFunction()
    public openTips() {
        safeCallComFunc(this, this.goodsGrid, () => {
            //this.itemGrid.openTips();

            if (!this.data)
                return
            if (!this.$itemInfo || !this.$itemInfo.id) {
                return;
            }
            if (!this.$custom || this.$custom.showtips != false) {
                if (this.$itemInfo.rid && ItemUtils.needExtraInfo(this.$itemInfo.type)) {
                    BagCNet.C_GET_ITEM_EXTRA_INFO(this.$itemInfo, { need_compare: false, show_equip_btn: false })
                }
                else {
                    BagCNet.C_GET_ITEM_EXTRA_INFO(this.$itemInfo)
                }
            }
        })
    }

    @SafeCallFunction()
    public setShowTips(show: boolean, showExtraInfo: boolean = true) {
        safeCallComFunc(this, this.goodsGrid, () => {
            //this.itemGrid.showTips = show;
            //this.itemGrid.showTips_ExtraInfo = showExtraInfo;
        })
    }

    @SafeCallFunction()
    public setNeedSelect(value: boolean) {
        safeCallComFunc(this, this.goodsGrid, () => {
            //this.itemGrid.needSelect = value;
        })
    }

    @SafeCallFunction()
    public resetQualityAni(quality: number, frameCon: number = 0, num: number = 1, showAniType: ItemMcTypeEnum, frame: number) {
        safeCallComFunc(this, this.goodsGrid, () => {
            //this.itemGrid.resetQualityAni(quality, frameCon, num, showAniType, frame);
        })
    }

    protected dataChanged() {
        super.dataChanged();
        this.$itemInfo = this.data.iteminfo;
        this.$custom = this.data.custom;
        this.updateGrid();
    }

    private updateGrid() {
        let appearance = this.$itemInfo?.entry?.appearance;
        if (appearance) {
            if (appearance.type == AppearanceConf.AppearanceType.bubble) {
                this.setBubble(appearance);
            } else if (appearance.type == AppearanceConf.AppearanceType.headPhoto || appearance.type == AppearanceConf.AppearanceType.headFrame) {
                this.setHead(appearance);
            } else {
                this.setNormal();
            }
        } else {
            this.setNormal();
        }
    }

    private setNormal() {
        this.currentState = GoodsGridExtendState.STATE_NOR;
        this.validateNow();
        safeCallComFunc(this, this.goodsGrid, () => {
            this.goodsGrid.data = this.data || { iteminfo: this.$itemInfo, custom: this.$custom };
            this.goodsGrid.setTouchFunc(this.openTips, this);
        });
    }

    private setBubble(appearance: appearance_define.AppearanceShowVo) {
        this.currentState = GoodsGridExtendState.STATE_BUBBLE;
        this.imgBubble.visible = true;
        let bubble = s2_chat_config_cfg.Chat_configInfo[appearance.icon];
        if (bubble && bubble[s2_chat_config_cfg.cEffect]) {
            setChatAni(true, this.grpBubbleAni, bubble[s2_chat_config_cfg.cEffect], false);
            const bubbleWidthExtra = 45;//气泡显示会超出组件的宽度
            const bubbleItemCpm = this.grpBubbleAni.getChildByName("chatAni") as eui.Component;
            bubbleItemCpm.right = bubbleWidthExtra;
            this.imgBubble.visible = false;
        }
        else {
            setChatAni(false, this.grpBubbleAni, "");
            this.imgBubble.visible = true;
            if (this.imgBubble) {
                if (appearance.icon) {
                    this.imgBubble.source = getProfileBubblePath(appearance.icon);
                }
                else {
                    this.imgBubble.source = getProfileBubblePath(1);
                }
            }
        }
    }
    
    private setHead(appearance: appearance_define.AppearanceShowVo) {
        let rolehead: RoleHeadEntry = {};
        this.currentState = GoodsGridExtendState.STATE_HEAD;
        if (appearance.frame_type) {
            rolehead.frame_type = appearance.frame_type;
            rolehead.frame = appearance.icon;
        } else {
            rolehead.icon = appearance.icon;
            rolehead.frame = DEFAULT_HEAD_FRAME_ID;
        }
        let showtips: boolean = true;
        if (this.$custom.showtips === false) {
            showtips = false;
        }
        this.head.setData({
            rolehead: rolehead,
            clickabled: showtips,
            clickFun: this.onTouchRoleHead,
            clickObj: this,
        });
    }
    private onTouchRoleHead() {
        BagCNet.C_GET_ITEM_EXTRA_INFO(this.$itemInfo)
    }
}