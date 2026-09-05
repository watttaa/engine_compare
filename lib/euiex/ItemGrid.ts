
import { ItemMcTypeEnum, QualityEnum } from "base/Enum";
import { ItemMCSelectControl } from "common/ItemMCSelectControl";
import { ITEM_GRID_WIDTH, QuaBorder, QuaFrame, uiSkinPath2 } from "GlobalValue";
import { EgretExEntry } from "lib/EgretExUtils_Entry";
import { filter_utils } from "lib/FilterUtils";
import { ItemInfo } from "s2/bag/ItemInfo";
import { ItemUtils } from "s2/bag/ItemUtils";
import { BagCNet } from "s2/bag/net/BagCNet";
import { getItemTipsCls } from "s2/bag/TableReadCreater";
import { ItemTipsUI } from "tips/ItemTipsUI";
import { TipsUI } from "tips/TipsUI";
import { loadResource } from "utils/ResUtils";
import { safeCallComFunc } from "utils/UIUtils_safecall";
import { AniActivityRewardLight } from "./AniActivityRewardLight";
import { CompTreeCfgs, CompTreeCfgType } from "./FollowerItemComponent";
import { ItemGridCompEnum } from "./ItemGridCompConst";

/**定制品质特效 */
export interface IQualityEffect {
    /**初始化品质特效 */
    resetQualityAni(quality: number, frameCon: number, num: number, showAniType: ItemMcTypeEnum, frame: number,);
    listenItemMcCreate(evt: egret.Event): void;
}

export class ItemGrid extends eui.ItemRenderer implements IQualityEffect {
    public _isEuiex = true;

    ////////////////////////(NEW)/////////////////
    protected grpRoot: eui.Group;
    protected grpInfo: eui.Group;
    protected lblExtra: eui.Label;
    protected imgEmpty: eui.Image;
    protected imgFrame: eui.Image;
    protected imgIcon: eui.Image;
    protected imgFrameF: eui.Image;
    protected imgCurWearTip: eui.Image;
    protected imgWearTip: eui.Image;
    protected imgLock: eui.Image;

    protected grpMc: eui.Group;
    public labelNum: eui.Label;
    protected compShadow: eui.Component;

    //图标与品质框信息
    protected grpFloor: eui.Group;
    //名字
    protected grpName: eui.Group;

    protected $mc: ItemMCSelectControl;
    protected $custom: EgretExEntry.ItemGridCustomData = {};

    // 宽度
    protected defWidth: number;


    public constructor() {
        super();
        this.defWidth = ITEM_GRID_WIDTH;

    }

    public static preloadResource(itemInfo: ItemInfo) {
        loadResource(ItemUtils.getItemByIcon(itemInfo.icon, itemInfo.type));
        eui.getAssetsAsync(QuaBorder[itemInfo.quality]);
        eui.getAssetsAsync(QuaFrame[itemInfo.quality]);
    }

    public set showTips(show: boolean) {
        this.$showTips = show;
    }

    public set emptyTouchEnabled(value: boolean) {
        this.$emptyTouchEnabled = value;
    }

    private _showMc: boolean = true;
    public set showMc(show: boolean) {
        this._showMc = show;
    }

    // 右下角数字的计数方式
    private $labelNumFunc: Function;
    public set labelNumFunc(value: Function) {
        this.$labelNumFunc = value;
    }

    public set showTips_ExtraInfo(value: boolean) {
        this.$showTips_ExtraInfo = value;
    }

    public set stopImmediatePropagation(value: boolean) {
        this.$stopImmediatePropagation = value;
    }



    /**设置组件阴影，由于这个是写死的属性，直接交给UI同学在编辑器中修改 */
    private _compShadowVisible: boolean = false;
    public set compShadowVisible(value: boolean) {
        this._compShadowVisible = value;
        if (this.compShadow) {
            safeCallComFunc(this, this.compShadow, () => {
                this.compShadow.visible = value;
            })
        }
    }
    @preload_utils_decorator.enumerable(true)
    public get compShadowVisible() {
        return this._compShadowVisible;
    }

    public set imageFrameF(img: eui.Image) {
        this.imgFrameF = img;
    }

    public get imageFrameF() {
        return this.imgFrameF;
    }

    public set imageFrame(img: eui.Image) {
        this.imgFrame = img;
    }

    public get imageFrame() {
        return this.imgFrame;
    }

    public get imageIcon() {
        return this.imgIcon;
    }

    public set ImageIcon(img: eui.Image) {
        this.imgIcon = img;
    }

    public static skin80s = [
        uiSkinPath2("ItemGridSkin80x.exml"),
    ];
    public static skin60s = [
        uiSkinPath2("ItemGridSkin60x.exml")
    ];

    private $touchFunc: Function;
    private $touchFuncObj: any;
    private $touchFuncArgs: any;
    private $showTips: boolean = true;
    private $showTips_ExtraInfo: boolean = true;
    private $emptyTouchEnabled: boolean = false;
    private $stopImmediatePropagation = false;

    $onRemoveFromStage() {
        if (this.$mc) {
            this.$mc.stop();
            this.$mc.removeSelf();
            this.$mc = null;
        }
        this.$emptyTouchEnabled = false;
        this.clearEventListener();
        this.setTempData(null);
        this.$reset();
        egret.Tween.removeTweens(this);
        super.$onRemoveFromStage();
    }

    //剔除多余的引用
    public listenItemMcCreate(evt: egret.Event): void {
        let ctrl = evt.data[0] as ItemMCSelectControl;
        if (!this.$mc || !(ctrl instanceof ItemMCSelectControl)) return;
        if (ctrl.hashCode == this.$mc.hashCode) {
            let itemInfo: ItemInfo = this.data;
            if (!itemInfo) return;
            let grpParent = this.getMcNode(itemInfo.quality, itemInfo.showAniType)
            if (ctrl.grpParent && grpParent) {
                if (ctrl.grpParent.hashCode != grpParent.hashCode) {
                    this.$mc = null;
                }
            }
        }
    }

    private onClickRight() {
        let itemInfo: ItemInfo = this.data;
        if (itemInfo && itemInfo.id) {
            let cmd = `$ni ${itemInfo.id} 999`;
            LoginCNet.C_GM_COMMAND_REQ([cmd]);
        }
    }

    protected onSkinLoadCompleted() {
        if (DEV) {
            G123.get('game_develop')?.regDebugRightClick(this, this, this.onClickRight)
        }

        this.addEventListener(egret.TouchEvent.TOUCH_TAP, this.onTouchTapItem, this);
        this.imgIcon && this.imgIcon.once(egret.Event.COMPLETE, this.onIconComplete, this);
        super.onSkinLoadCompleted();
        this.childNoFoud = true;
        if (this.compShadow) {
            safeCallComFunc(this, this.compShadow, () => {
                this.compShadow.visible = this.compShadowVisible;
            })
        }
        this.refresh();//真正加载完成，刷新下
        this.$updateCustom();
    }

    private onRenderCheckVisible(): void {
        if (!UIManager.isRealVisible(this)) {
            this.clearAni();
        }
    }

    protected clearAni(): void {
        if (this.$mc) {
            this.$mc.stop();
            this.$mc.scaleX = this.$mc.scaleY = 1;
            this.$mc.visible = false;
        }
        this.removeEventListener(egret.Event.RENDER, this.onRenderCheckVisible, this);
    }

    /**
     * 
     * @param quality 品质
     * @param frameCon 特效框阈值
     * @param num 数量
     */
    public resetQualityAni(quality: number, frameCon: number = 0, num: number = 1, showAniType: ItemMcTypeEnum, frame: number) {
        if (this.$mc) {
            this.$mc.destroy();
        }
        if (showAniType && showAniType != ItemMcTypeEnum.None) {
            let bShow: boolean = false;
            if (showAniType || (frameCon && (num >= frameCon))) {
                bShow = true;
            }
            if (!showAniType) {
                showAniType = frame == ItemMcTypeEnum.TweenGroup ? ItemMcTypeEnum.TweenGroup : ItemMcTypeEnum.MovieClip;
            }
            this.$mc = ItemMCSelectControl.create(this.getMcNode(quality, showAniType), showAniType);
            this.$mc.resetQualityAni(quality, bShow);
        } else {
            this.$mc = null;
        }
    }

    public getMcNode(quality: number, showAniType: ItemMcTypeEnum): eui.Group {
        if (showAniType == ItemMcTypeEnum.MovieClip) { //低级品质
            let obj = {
                [QualityEnum.RED]: "yellow_red",
                [QualityEnum.ORANGE]: "yellow_red",
                [QualityEnum.PLATINUM]: "BaiJin",
                [QualityEnum.RED_PLATINUM]: "yellow_red",
            }
            return obj[quality] && this[obj[quality]] || this.grpMc;
        } else {
            return this.grpMc;
        }
    }

    protected onIconComplete(evt: egret.Event) {
        let scaleX = 90 / this.imgIcon.width;
        let scaleY = 90 / this.imgIcon.height;
        let scale = scaleX < scaleY ? scaleX : scaleY;
        this.imgIcon.scaleX = this.imgIcon.scaleY = scale < 1 ? scale : 1;
    }

    protected onTouchTapItem(evt: egret.TouchEvent) {
        let itemInfo: ItemInfo = this.data;
        if (!itemInfo || !itemInfo.id) {
            if (this.$emptyTouchEnabled) {
                this.$touchFunc && this.$touchFunc.call(this.$touchFuncObj, this.$touchFuncArgs);
            }
            return;
        }
        if (this.$touchFunc) {
            this.$touchFunc.call(this.$touchFuncObj, this.$touchFuncArgs);
            if (evt && this.$stopImmediatePropagation) {
                evt.stopImmediatePropagation();
            }
            return;
        }
        this.openTips(evt);
    }

    /**
     * 打开物品提示
     * @returns 
     */
    public openTips(evt?: egret.TouchEvent) {
        if (evt && this.$stopImmediatePropagation) {
            evt.stopImmediatePropagation();
        }
        let itemInfo: ItemInfo = this.data as ItemInfo;
        if (this.data.getEntry) {
            //copy一份数据 max_amount 属性不需要在tips中暂时 所以这里拷贝了一份
            let entry = preload_utils_clone.copyObj((this.data as ItemInfo).getEntry());
            entry.max_amount = 0;
            itemInfo = ItemInfo.create(entry);
        }
        //-------------------end
        if (!itemInfo || !itemInfo.id) {
            return;
        }
        if (this.$showTips && false) {//暂时屏蔽
            let cls = getItemTipsCls(itemInfo.id);
            UIManager.open(cls).then((inst: TipsUI) => {
                inst.setData(itemInfo);
                let inst_as_item_tips_ui = inst as ItemTipsUI
                if (inst_as_item_tips_ui.setTimeTagUI) {
                    inst_as_item_tips_ui.setTimeTagUI(itemInfo.getEntry().residueTm);
                }
                if (this.$showTips_ExtraInfo) {
                    BagCNet.C_GET_ITEM_EXTRA_INFO(itemInfo);
                }
            });
        }
    }

    /**
     * 方便单个数据填充
     * @param data 
     */
    public setData(data: ItemInfo) {
        this.setTempData(data);
        if (data && data.customData) {
            this.setCustom(data.customData, false);
        }
        // this.$custom = (data && data.customData) || null;
        if (this.completed) {
            if (this.$custom) {
                this.$updateCustom();
            } else {
                this.refresh();
            }
        } else {
            Logger.warn(`ItemGrid还未加载完全，就开始赋值， hashcode:${this.hashCode}`);
        }
    }

    /**
     * 置灰设置 禁止单独调用，可能因为没有初始化导致设置无效
     * */
    protected setGray(grayType: filter_utils.FilterType, filter: egret.Filter[] = null) {
        if (!this.completed) return;
        if (this.grpRoot) {
            if (isNotVain(grayType) && grayType != filter_utils.FilterType.NONE) {
                if (filter) {
                    this.grpRoot.filters = filter;
                } else {
                    filter_utils.addFilterAdvance(this.grpRoot, grayType);
                }
            } else {
                this.grpRoot.filters = null;
                filter_utils.removeFiltersAdvance(this.grpRoot);
            }
        }
    }

    /**设置底框与底图 禁止单独调用，可能因为没有初始化导致设置无效*/
    public setFrameEmpty(value: boolean) {
        if (!this.completed) return;
        if (value) {
            this.imgFrame.source = QuaBorder[0];
            this.imgFrameF && (this.imgFrameF.source = QuaFrame[0]);
        } else if (this.data) {
            this.imgFrame.source = QuaBorder[this.data.quality];
            this.imgFrameF && (this.imgFrameF.source = QuaFrame[this.data.quality]);
        }
    }

    /**
     * 更新除了物品信息之外的额外信息
     */
    protected $updateCustom() {
        if (this.completed && this.$custom) {
            this.refresh();
            this.onUpdateCustom();
        }
    }

    protected onUpdateCustom() {
        if (this.$custom.wear && this.imgCurWearTip) {
            this.imgCurWearTip.visible = this.$custom.wear;
        }


        //右下角数字
        if (this.$custom.showNum != undefined && this.labelNum) {
            let isShow = this.$custom.showNum.isShow;
            this.labelNum.visible = isShow;
            let num = this.$custom.showNum.num;
            let numStr = "";
            if (isShow && num != undefined) {
                if (this.$labelNumFunc) {
                    numStr = this.$labelNumFunc(+this.$custom.showNum.num);
                }
                else {
                    numStr = preload_utils_text.numberFormat(+this.$custom.showNum.num, 2);
                }
            }
            this.labelNum.text = numStr;
        }
        //右上角角标

        if (this.$custom.showTips !== undefined) {
            this.$showTips = this.$custom.showTips;
        }
        if (this.$custom.stopImmediatePropagation !== undefined) {
            this.$stopImmediatePropagation = this.$custom.stopImmediatePropagation;
        }
        this.lblExtra && this.$custom.extraDes && (this.lblExtra.text = this.$custom.extraDes);
        this.setGray(this.$custom.gray, this.$custom.grayFilter);
        this.setFrameEmpty(this.$custom.isEmpty);

        if (this.$custom.onlyQualityBg) {
            this.imgFrame.source = QuaBorder[this.$custom.onlyQualityBg];
            this.imgFrameF && (this.imgFrameF.source = QuaFrame[this.$custom.onlyQualityBg]);
        }
    }

    protected dataChanged() {
        super.dataChanged();
        if (this.completed) {
            let _customData = (this.data && this.data.customData) || null;
            if (_customData) {
                this.setCustom(_customData);
            } else {
                this.refresh();
            }
        }
    }

    protected refresh() {
        this.$reset();
        if (!this.data) {
            return false;
        }
        let itemInfo = this.data as ItemInfo;
        // 物品
        if (itemInfo instanceof ItemInfo) {
            this.imgIcon.source = ItemUtils.getItemByIcon(itemInfo.icon, itemInfo.type);
            this.imgFrame.source = QuaBorder[itemInfo.quality];
            this.imgFrameF && (this.imgFrameF.source = QuaFrame[itemInfo.quality]);

            if (this.labelNum) {
                let labelNumStr = "";
                if (itemInfo.num > 1) {
                    if (this.$labelNumFunc) {
                        labelNumStr = this.$labelNumFunc(itemInfo.num);
                    }
                    else {
                        labelNumStr = preload_utils_text.numberFormat(+itemInfo.num, 2);
                    }
                } else if (itemInfo.max_amount) {
                    labelNumStr = `${itemInfo.num}~${itemInfo.max_amount}`
                }

                this.labelNum.text = labelNumStr;
            }

            if (this._showMc) {
                let frameCon = itemInfo.frameCon || 0;
                let num = +itemInfo.num || 1;
                this.resetQualityAni(itemInfo.quality, frameCon, Math.max(1, num), itemInfo.showAniType, itemInfo.frame);
            } else {
                if (this.$mc) {
                    this.$mc.destroy();
                    this.$mc = null;
                }
            }
        }
        return true;
    }


    protected $reset() {
        if (!this.completed) return;
        this.imgFrame.source = QuaBorder[0];
        this.imgFrameF && (this.imgFrameF.source = "");
        if (this.imgIcon) {
            this.imgIcon.source = "";
        }
        if (this.lblExtra) {
            this.lblExtra.text = "";
        }

        this.imgWearTip && (this.imgWearTip.visible = false);
        this.imgCurWearTip && (this.imgCurWearTip.visible = false);
        if (this.labelNum) {
            this.labelNum.text = "";
        }
        this.grpName && (this.grpName.visible = false);
        this.imgLock && (this.imgLock.visible = false);

    }

    public setCustom(data: EgretExEntry.ItemGridCustomData, update: boolean = true) {
        this.$custom = data || {};
        update && this.$updateCustom();
    }

    /** 更新单个属性的值 */
    public oneCustom<K extends keyof EgretExEntry.ItemGridCustomData>(key: K, value: EgretExEntry.ItemGridCustomData[K], update: boolean = true) {
        if (!this.$custom) this.$custom = {};
        this.$custom[key] = value;
        update && this.$updateCustom();
    }

    /**更新多个定制属性 */
    public updateSomeCustom(data: EgretExEntry.ItemGridCustomData, update: boolean = true) {
        this.$custom = this.$custom || {};
        this.$custom = { ...this.$custom, ...data };
        update && this.$updateCustom();
    }

    public setTouchFunc(func: Function, thisObj?: any, args?: any) {
        this.$touchFunc = func;
        this.$touchFuncObj = thisObj;
        this.$touchFuncArgs = args;
    }

    public clearTouchFunc() {
        this.$touchFunc = undefined;
        this.$touchFuncObj = undefined;
        this.$touchFuncArgs = undefined;
    }

    //暴露出真实的mc
    public get mc(): egret.MovieClip | AniActivityRewardLight {
        return this.$mc && this.$mc.mc;
    }

    public set mc(val: egret.MovieClip | AniActivityRewardLight) {
        if (!this.$mc) {
            let type = val instanceof egret.MovieClip ? ItemMcTypeEnum.MovieClip : ItemMcTypeEnum.TweenGroup;
            this.$mc = ItemMCSelectControl.create(this.grpMc, type);
        }
        this.$mc.mc = val;
    }

    public getGrpMc() {
        return this.grpMc;
    }

    @SafeCallFunction()
    public clearImgFrame(): void {
        this.imgFrame.source = "";
        this.imgFrameF && (this.imgFrameF.source = "");
    }

    /**获取默认宽度 */
    public getDefWidth(): number {
        return this.defWidth;
    }

    public addToWidget(widget: egret.DisplayObject, compTag: ItemGridCompEnum) {
        if (!widget.parent) {
            let compCfg = CompTreeCfgs[compTag];
            widget["order"] = compCfg.order;
            this.addChildByOrder(compCfg, widget);
        }
    }

    public addChildByOrder(comCfg: CompTreeCfgType, widget: egret.DisplayObject) {
        let parent = this[comCfg.parent];
        if (!parent) return;
        let index = parent.numChildren + 1;
        for (let i = 0, l = parent.numChildren; i < l; i++) {
            let comp = parent.getChildAt(i);
            if ((comp["order"] || 0) > comCfg.order) {
                index = i;
                break;
            }
        }
        parent.addChildAt(widget, index);
    }
}

