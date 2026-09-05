import { ObjectIdEnum } from "auto/object_id_enum";
import { ConfirmBoxSelectEnum, PayOptionType } from "base/Enum";
import { ItemExtraEntry, CostEntry1 } from "base/ServerEntry";


import { MallCNet } from "mall/net/MallCNet";
import { MiscCNet } from "net/MiscCNet";
import { ViewCNet } from "net/ViewCNet";
import { WuXingCNet } from "net/WuXingCNet";
import { BagCNet } from "s2/bag/net/BagCNet";
import { ui_utils_checktoken } from "utils/UIUtils_checktoken";

export class NetHelper {
    /**
     * ConfirmBox 向服务端的回馈
     * @param selectIdx 0,1 0代表左边的按键 1 表示右边的按键 -1 表示点击关闭界面 -2 表示点外面
     * @param confirmId 
     * @param costSid 
     * @param costNum 
     */
    public static reqConfirm(selectIdx: ConfirmBoxSelectEnum, confirmId: number, costSid?: number, costNum?: number) {
        if (selectIdx == ConfirmBoxSelectEnum.CLOSE || selectIdx == ConfirmBoxSelectEnum.OutSide) return; //关闭不请求协议
        let isEnough = true;
        if (costSid && costNum) {
            isEnough = ui_utils_checktoken.checkTokenIsEnough(costSid, costNum, true, (flag: boolean) => {
                flag && ViewCNet.C_RESPOND_COMMON_CONFIRM_BOX(selectIdx, confirmId, 1);
            });
        }
        if (isEnough) {
            ViewCNet.C_RESPOND_COMMON_CONFIRM_BOX(selectIdx, confirmId);
        }
    }

    public static reqArenaChallengePlayer(uid: number, rank: number, costSid?: number, costNum?: number) {
        // let isEnough = true;
        // if (costSid && costNum) {
        //     isEnough = ui_utils_checktoken.checkTokenIsEnough(costSid, costNum, true, (flag: boolean) => {
        //         flag && ArenaCNet.MiscCNet.C_ARENA_CHALLENGE_PLAYER(uid, rank);
        //     });
        // }
        // if (isEnough) {
        //     ArenaCNet.MiscCNet.C_ARENA_CHALLENGE_PLAYER(uid,rank);
        // }
    }

    public static reqVipPayGift(lev: number, costSid?: number, costNum?: number) {
        // let isEnough = true;
        // if (costSid && costNum) {
        //     isEnough = ui_utils_checktoken.checkTokenIsEnough(costSid, costNum, true, (flag: boolean) => {
        //         flag && VIPCNet.C_ON_VIP_PAY_GIFT(lev, 1);
        //     });
        // }
        // if (isEnough) {
        //     VIPCNet.C_ON_VIP_PAY_GIFT(lev);
        // }
    }

    public static reqSevenBrotherShopBuy(level: number, index: number, times: number, costSid?: number, costNum?: number) {
        // let isEnough = true;
        // if (costSid && costNum) {
        //     isEnough = ui_utils_checktoken.checkTokenIsEnough(costSid, costNum, true, (flag: boolean) => {
        //         flag && ActivitySevenBroCNet.C_SEVEN_BROTHER_SHOP_BUY(level, index, times, 1);
        //     });
        // }
        // if (isEnough) {
        //     ActivitySevenBroCNet.C_SEVEN_BROTHER_SHOP_BUY(level, index, times);
        // }
    }

    public static reqDynamicBuyItem(sid: number, num: number, coinId: number, costNum?: number) {
        let isEnough = true;
        if (coinId && costNum) {
            isEnough = ui_utils_checktoken.checkTokenIsEnough(coinId, costNum, true, (flag: boolean) => {
                flag && BagCNet.C_DYNAMIC_BUY_ITEM(sid, num, coinId, 1);
            });
        }
        if (isEnough) {
            BagCNet.C_DYNAMIC_BUY_ITEM(sid, num, coinId);
        }
    }

    /**
     * 购买五行点(单位：小时)
     * @param duration_hour 购买的小时数
     * @param coinId 
     * @param costNum 
     */
    public static reqDynamicBuyWuXingItem(duration_hour: number, coinId: number, costNum?: number) {
        let isEnough = true;
        if (coinId && costNum) {
            isEnough = ui_utils_checktoken.checkTokenIsEnough(coinId, costNum, true, (flag: boolean) => {
                flag && WuXingCNet.C_CONFIRM_BUY_FIVE_ELEM_MATERIAL(duration_hour, 1);
            });
        }
        if (isEnough) {
            WuXingCNet.C_CONFIRM_BUY_FIVE_ELEM_MATERIAL(duration_hour, 0);
        }
    }

    /**
     * 购买守护技能点(蟠桃园守卫战)
     * @param duration_hour 购买数量
     * @param coinId 
     * @param costNum 
     */
    public static reqDynamicBuyPTYItem(duration_hour: number, coinId: number, costNum?: number) {
        // let isEnough = true;
        // if (coinId && costNum) {
        //     isEnough = ui_utils_checktoken.checkTokenIsEnough(coinId, costNum, true, (flag: boolean) => {
        //         flag && PanTaoCNet.C_BUY_SKILL_MATERIAL(duration_hour, 1);
        //     });
        // }
        // if (isEnough) {
        //     PanTaoCNet.C_BUY_SKILL_MATERIAL(duration_hour,  0);
        // }
    }

    /**
     * 请求创建帮派
     */
    public static reqCreateGang(gangName: string, gangLogoId: number, costSid?: number, costNum?: number) {
        let isEnough = true;
        if (costSid && costNum) {
            isEnough = ui_utils_checktoken.checkTokenIsEnough(costSid, costNum, true, (flag: boolean) => {
                flag //&& GangCNet.C_CREATE_GANG(gangName, gangLogoId);
            });
        }
        if (isEnough) {
            //GangCNet.C_CREATE_GANG(gangName, gangLogoId);
        }
    }

    /**
     * 请求建设帮派
     */
    public static reqBuildGang(costSid?: number, costNum?: number) {
        let isEnough = true;
        if (costSid && costNum) {
            isEnough = ui_utils_checktoken.checkTokenIsEnough(costSid, costNum, true, (flag: boolean) => {
                flag //&& GangCNet.C_GANG_BUILD_OPERATE(1);
            });
        }
        if (isEnough) {
            //GangCNet.C_GANG_BUILD_OPERATE();
        }
    }

    /**
     * 引妖香加速 守护乐园删除了
     */
    // public static reqConserSpeedUp(cencerType: number, costSid?: number, costNum?: number) {
    //     let isEnough = true;
    //     if (costSid && costNum) {
    //         isEnough = ui_utils_checktoken.checkTokenIsEnough(costSid, costNum, true, (flag: boolean) => {
    //             flag && ZooCNet.C_CONSER_SPEED_UP(cencerType, 1);
    //         });
    //     }
    //     if (isEnough) {
    //         ZooCNet.C_CONSER_SPEED_UP(cencerType);
    //     }
    // }

    /**
     * 增加背包格子
     */
    public static reqAddBagGrid(num: number, costSid?: number, costNum?: number) {
        let isEnough = true;
        if (costSid && costNum) {
            isEnough = ui_utils_checktoken.checkTokenIsEnough(costSid, costNum, true, (flag: boolean) => {
                flag && BagCNet.C_ON_ADD_GRID(num, 1);
            });
        }
        if (isEnough) {
            BagCNet.C_ON_ADD_GRID(num);
        }
    }

    /**
     * 请求快速挂机
     */
    public static reqQuickAfk(costSid?: number, costNum?: number) {
        let isEnough = true;
        if (costSid && costNum) {
            isEnough = ui_utils_checktoken.checkTokenIsEnough(costSid, costNum, true, (flag: boolean) => {
                flag && MiscCNet.C_REQUEST_QUICK_AFK(1);
            });
        }
        if (isEnough) {
            MiscCNet.C_REQUEST_QUICK_AFK();
        }
    }

    /**
     * 伙伴提升
     */
    public static reqAddPartnerExp(type: number, auto: number, costInfo: ItemExtraEntry, isContinuous?: boolean, cb?: Function) {
        // let isEnough = true;
        // let costSid = (costInfo && costInfo.auto_buy_sid) || 0;
        // let costNum = (costInfo && costInfo.auto_buy_num) || 0;
        // if (auto && costSid && costNum) {
        //     let tipsStr: string;
        //     isContinuous && (tipsStr = text_utils.T(24818));
        //     isEnough = ui_utils_checktoken.checkTokenIsEnough(costSid, costNum, true, (flag: boolean) => {
        //         flag && PartnerCNet.C_ADD_PARTNER_EXP(type, auto, 1);
        //         flag && cb && cb(1);
        //     }, this, tipsStr);
        // }
        // if (isEnough) {
        //     isContinuous && cb && cb(0);
        //     PartnerCNet.C_ADD_PARTNER_EXP(type, auto);
        // }
    }

    /**
     * 守护提升
     */
    public static reqAddPetExp(type: number, auto: number, costInfo: ItemExtraEntry, isContinuous?: boolean, cb?: Function) {
        // let isEnough = true;
        // let costSid = (costInfo && costInfo.auto_buy_sid) || 0;
        // let costNum = (costInfo && costInfo.auto_buy_num) || 0;
        // if (auto && costSid && costNum) {
        //     let tipsStr: string;
        //     isContinuous && (tipsStr = text_utils.T(24818));
        //     isEnough = ui_utils_checktoken.checkTokenIsEnough(costSid, costNum, true, (flag: boolean) => {
        //         flag && PetCNet.C_ADD_PET_EXP(type, auto, 1);
        //         flag && cb && cb(1);
        //     }, this, tipsStr);
        // }
        // if (isEnough) {
        //     isContinuous && cb && cb(0);
        //     PetCNet.C_ADD_PET_EXP(type, auto);
        // }
    }

    public static reqAddPartnerYuQiExp(type: number, auto: number, costInfo: CostEntry1, isContinuous?: boolean, cb?: Function) {
        // let isEnough = true;
        // let costSid = (costInfo && costInfo.auto_buy_sid) || 0;
        // let costNum = (costInfo && costInfo.auto_buy_num) || 0;
        // if (auto && costSid && costNum) {
        //     let tipsStr: string;
        //     isContinuous && (tipsStr = text_utils.T(24818));
        //     isEnough = ui_utils_checktoken.checkTokenIsEnough(costSid, costNum, true, (flag: boolean) => {
        //         flag && PartnerCNet.C_ADD_PARTNER_FAVOR(type, auto, 1);
        //         flag && cb && cb(1);
        //     }, this, tipsStr);
        // }
        // if (isEnough) {
        //     isContinuous && cb && cb(0);
        //     PartnerCNet.C_ADD_PARTNER_FAVOR(type, auto);
        // }
    }

    /**一键卸下 */
    public static reqTakeOffAllJades(partner_id: number = 0, slotid: number = 0) {
        // let tipsStr = text_utils.T(28303);
        // let tipsAgainStr = text_utils.T(28304);
        // ConfirmBox(tipsStr, (flag: ConfirmBoxSelectEnum) => {
        //     if (flag == ConfirmBoxSelectEnum.RIGHT) {
        //         ConfirmBox(tipsAgainStr, (flag: ConfirmBoxSelectEnum) => {
        //             if (flag == ConfirmBoxSelectEnum.RIGHT) {
        //                 PartnerCNet.C_ON_TAKE_OFF_ALL_PARTNER_JADE(partner_id, slotid);
        //             }
        //         }, this);
        //     }
        // }, this);
    }

    /**
    * 刷新多宝阁
    */
    public static reqConfirmRefreshShop(first: number, second: number, third: number = 0, costSid?: number, costNum?: number) {
        let isEnough = true;
        if (costSid && costNum) {
            isEnough = ui_utils_checktoken.checkTokenIsEnough(costSid, costNum, true, (flag: boolean) => {
                //flag && ShopCNet.C_CONFIRM_REFRESH_SHOP(first, second, third, 1);
            });
        }
        if (isEnough) {
            //ShopCNet.C_CONFIRM_REFRESH_SHOP(first, second, third);
        }
    }

    /**
    * 仙玉购买礼包
    */
    public static reqBuyMallPackByXianyu(packId: number, extra: any = {}, costSid?: number, costNum?: number) {
        let isEnough = true;
        if (costSid && costNum) {
            isEnough = ui_utils_checktoken.checkTokenIsEnough(costSid, costNum, true, (flag: boolean) => {
                flag && MallCNet.C_BUY_MALL_PACK_BY_XIANYU(packId, extra, 1);
            });
        }
        if (isEnough) {
            MallCNet.C_BUY_MALL_PACK_BY_XIANYU(packId, extra);
        }
    }

    /**
    * 彩玉购买礼包
    */
    public static reqBuyMallPackByZuanshi(packId: number, extra: any = {}, costSid?: number, costNum?: number) {
        let isEnough = true;
        if (costSid && costNum) {
            isEnough = ui_utils_checktoken.checkTokenIsEnough(costSid, costNum, true, (flag: boolean) => {
                flag && MallCNet.C_BUY_MALL_PACK_BY_ZUANSHI(packId, extra);
            });
        }
        if (isEnough) {
            MallCNet.C_BUY_MALL_PACK_BY_ZUANSHI(packId, extra);
        }
    }

    /**
    * 活动购买活跃度
    */
    public static reqBuyFestivalBPItem(open_id: number, price: number, cnt: number) {
        let isEnough = ui_utils_checktoken.checkTokenIsEnough(ObjectIdEnum.TEMP /** BANGZUAN */, price, true, (flag: boolean) => {
            //flag && ShopBPCNet.C_ON_BP_BUY_FESTIVAL(open_id, cnt, 1);
        }, this)
        if (isEnough) {
            // ShopBPCNet.C_ON_BP_BUY_FESTIVAL(open_id, cnt, 0);
        }
    }

    /**
    * 重置守护技能书突破等级
    */
    public static reqResetPetSkillLevel(pid: number, skillId: number, costSid?: number, costNum?: number) {
        // let isEnough = true;
        // if (costSid && costNum) {
        //     isEnough = ui_utils_checktoken.checkTokenIsEnough(costSid, costNum, true, (flag: boolean) => {
        //         flag && PetSkillCNet.C_RESET_PET_SKILL_LEVEL(pid, skillId, 1);
        //     });
        // }
        // if (isEnough) {
        //     PetSkillCNet.C_RESET_PET_SKILL_LEVEL(pid, skillId);
        // }
    }

    /**
     * 彩玉替代佩玉的回调
     */
    public static checkTokenCallback(costSid: number, costNum: number, callback: (t: PayOptionType) => void, thisObj: any) {
        let isEnough = ui_utils_checktoken.checkTokenIsEnough(costSid, costNum, true, (flag: boolean) => {
            flag && callback.call(thisObj, PayOptionType.ZUANSHI);
        });
        if (isEnough) {
            callback.call(thisObj, PayOptionType.BANGZUAN);
        }
    }

}