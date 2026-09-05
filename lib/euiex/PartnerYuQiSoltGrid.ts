import { s2_object_cfg } from "auto/object";
import { s2_text_utils } from "auto/text";
import { JadeType, QualityEnum } from "base/Enum";
import { Eff_RefreshBtn } from "lib/euiex/Eff_RefreshBtn";
import { RedPointTreeHelper } from "lib/RedPointManager";
import { TweenGroupPanel } from "lib/TweenGroupPanel";
import { UIManagerFactroy } from "lib/UIManagerFactory";
import { ItemInfo } from "s2/bag/ItemInfo";
import { ItemUtils } from "s2/bag/ItemUtils";
import { getItemTipsCls } from "s2/bag/TableReadCreater";
import { safeCallComFunc } from "utils/UIUtils_safecall";
// import { PartnerYuQiData } from "share/ShareToSocailUI"; // 已删除


export type PartnerYuQiSoltData = {
    pid: number;//伙伴ID
    /**孔位 */
    pos: number;
    /**亲密度等级 */
    favor_break_lv: number; //亲密度等级
    /**解锁等级 */
    unlock: number;
    /**穿戴玉器信息 */
    jade: any; // PartnerYuQiData - 已删除
    /**升级或替换 */
    isUpdate: boolean;
    /**是否来自分享 */
    isShare: boolean;
}


export enum AniYuqiShinningStateEnum {
    STATE_1 = "1",
    STATE_2 = "2",
    STATE_3 = "3",
    STATE_4 = "4",
    STATE_5 = "5",
    STATE_6 = "6",
}


export interface PartnerYuQiSoltGrid {
    cycle: egret.tween.TweenGroup;
    image1: eui.Image;
    grpIcon: eui.Group;
    imgBg: eui.Image;
    vx_slotglow: eui.Image;
    seniorJade: eui.Component & AniYuqiShinningStateEnum;
    imgIcon: eui.Image;
    imgLock: eui.Image;
    grpMc: eui.Group;
    grpCond: eui.Group;
    lblCond: eui.Label;
    grpEffect: eui.Group;
}

export class PartnerYuQiSoltGrid extends eui.ItemRenderer {
    public _isEuiex = true;

    private aniDict: { [name: string]: TweenGroupPanel };

    private ringEffect: Eff_RefreshBtn;

    protected onSkinLoadCompleted() {
        this.addEventListener(egret.TouchEvent.TOUCH_TAP, this.onTouchTapSelf, this);
        //，4个玉器槽下方的托举它们的孔洞，需要有向上飘的仙气，或流光的效果，营造玉器的天庭感：
        let ani = this.addEffect("AniCommonStreamer");
        ani.playTweenGroup("Loop", -1);
        super.onSkinLoadCompleted();
    }

    public $onRemoveFromStage() {
        if (this.aniDict) {
            for (let key in this.aniDict) {
                this.aniDict[key].destroy();
            }
            this.aniDict = null;
        }
        safeCallComFunc(this.$Component, this.seniorJade, () => {
            (this.seniorJade["eff_shinning"] as eui.Image).isPlayingTween = false;
            (this.seniorJade["eff_shinning"] as eui.Image).stopTween();
        });

        if (this.vx_slotglow) {
            this.vx_slotglow.isPlayingTween = false;
            this.vx_slotglow.stopTween();
        }
        if (this.ringEffect) {
            this.ringEffect.parent && this.ringEffect.parent.removeChild(this.ringEffect);
        }
        super.$onRemoveFromStage();
    }


    @SafeCallFunction()
    public setData(data: PartnerYuQiSoltData) {
        this.setTempData(data);
        let locked = data.favor_break_lv < data.unlock;
        let isEmpty = !data.jade || !data.jade.sid; //当没有穿戴并且有可穿戴信物时
        let lv: number;
        let type: JadeType;
        this.imgBg.source = "pet_yuqi_grid_bg_empty_png";
        this.lblCond.strokeColor = 0x22436B;
        if (locked) { //未解锁
            this.currentState = "locked";
            this.lblCond.text = s2_text_utils.T(28317, { level: data.unlock });
        } else if (isEmpty) { //待穿戴
            this.currentState = "empty";
        } else {
            this.currentState = "normal";
            this.imgIcon.source = ItemUtils.getItemById(data.jade.sid);
            lv = data.jade.jade_level;
            type = data.jade.jade_type;
            this.lblCond.text = s2_text_utils.T(20007, { level: data.jade.jade_level });

            let quality: number = s2_object_cfg.ObjectInfo[data.jade.sid] && s2_object_cfg.ObjectInfo[data.jade.sid][s2_object_cfg.iQuality];
            let qualityDict: { [qua: number]: { bg: string, strokeCol: number } } = {
                [QualityEnum.PURPLE]: {
                    bg: "pet_yuqi_grid_0_png",
                    strokeCol: 0x9128B7,
                },
                [QualityEnum.ORANGE]: {
                    bg: "pet_yuqi_grid_1_png",
                    strokeCol: 0xC45C00,
                },
                [QualityEnum.RED]: {
                    bg: "pet_yuqi_grid_2_png",
                    strokeCol: 0xCB3A3A,
                },
                [QualityEnum.PLATINUM]: {
                    bg: "pet_yuqi_grid_3_png",
                    strokeCol: 0x4862E5,
                },
            }
            if (qualityDict[quality]) {
                this.lblCond.strokeColor = qualityDict[quality].strokeCol;
                this.imgBg.source = qualityDict[quality].bg;
            }


            /**策划要求5级及以上有特效 */
        }

        RedPointTreeHelper.addPointOnWidget(this, !!(data.jade && data.jade.can_upgrade));

        ////////////////////////(特效逻辑)
        //5级，及5级以上玉器，需要有隐隐发光的特效
        let isSenior = lv >= 5;
        this.imgIcon.visible = !isSenior;
        this.seniorJade.visible = isSenior;
        if (isSenior) {
            safeCallComFunc(this.$Component, this.seniorJade, () => {
                this.seniorJade.currentState = this.getAniState(type);
                let yuqiIcon = this.seniorJade["yuqi"] as eui.Image;
                // if(!yuqiIcon["isPlaying"]){
                //     yuqiIcon.runEffect();
                // }
                // yuqiIcon["isPlaying"] = true;
                yuqiIcon.visible = true;
                yuqiIcon.source = this.imgIcon.source;
                // preload_utils_calldelay.callDelayFrames(()=>{
                //     if(yuqiIcon && this.imgIcon){
                //         yuqiIcon.source = this.imgIcon.source;
                //     }
                // },this,1);

                // (this.seniorJade["yuqi"] as eui.Image).playTweenGroup();
            });
        }

        if (this.vx_slotglow) {
            this.vx_slotglow.isPlayingTween = true;
            this.vx_slotglow.playTweenGroup();
        }
        //未装备玉器的空插槽，需要有一个环绕的特效
        if (!locked && isEmpty && data.jade && data.jade.can_wear) {
            if (!this.ringEffect) {
                this.ringEffect = new Eff_RefreshBtn();
                this.ringEffect.touchEnabled = false;
                this.ringEffect.touchChildren = false;
                this.grpEffect.addChild(this.ringEffect);
                this.ringEffect.verticalCenter = this.ringEffect.horizontalCenter = 0;
            }
            this.ringEffect.showEffect(1);
            this.ringEffect.visible = true;

        } else {
            if (this.ringEffect) {
                this.ringEffect.visible = false;
            }
        }



        //玉器装备和替换时，需要有装备穿戴的特效
        if (data.isUpdate) {
            let ani = this.addEffect("AniCommonWearLight");
            ani.playTweenGroup("in", 1);

        }
    }

    private getAniState(type: JadeType) {
        return {
            [JadeType.TYPE_1]: AniYuqiShinningStateEnum.STATE_1,
            [JadeType.TYPE_2]: AniYuqiShinningStateEnum.STATE_2,
            [JadeType.TYPE_3]: AniYuqiShinningStateEnum.STATE_3,
            [JadeType.TYPE_4]: AniYuqiShinningStateEnum.STATE_4,
            [JadeType.TYPE_5]: AniYuqiShinningStateEnum.STATE_5,
            [JadeType.TYPE_6]: AniYuqiShinningStateEnum.STATE_6,
        }[type];
    }

    private addEffect(effectName: string) {
        if (!this.aniDict) {
            this.aniDict = {};
        }
        let ani = this.aniDict[effectName]
        if (!ani) {
            ani = UIManagerFactroy.createTweenGroupPanel(this, `resource/eui/${effectName}.exml`, 0, 0, false)
            this.aniDict[effectName] = ani;
        }
        return ani;
    }

    private removeEffect(effectName: string) {
        if (this.aniDict && this.aniDict[effectName]) {
            this.aniDict[effectName].destroy();
            delete this.aniDict[effectName];
        }
    }

    private onTouchTapSelf() {
        let data = this.data as PartnerYuQiSoltData;
        if (this.currentState == "empty") {
            if (!data.isShare) {
                // PartnerCNet.C_ON_OPEN_JADE_SETTING_UI(data.pid, data.pos);
            }
        } else if (this.currentState == "normal") {
            let itemInfo = ItemInfo.create(data.jade);
            let cls = getItemTipsCls(data.jade.sid);
            // UIManager.open(cls).then((inst: PartnerYuQiTreasureTipsPanel) => {
            //     inst.setData(itemInfo, false, data.pid, data.pos, false);
            //     BagCNet.C_GET_ITEM_EXTRA_INFO(itemInfo);
            // });
        }
    }

}
