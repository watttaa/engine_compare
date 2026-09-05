import { ComponentEx } from "lib/euiex/ComponentEx";
import { FightPowerWidget } from "lib/euiex/FightPowerWidget";

import { ComXiangqing } from "heroMain/HeroPropAttr";
import { tempName1 } from "GlobalText";
import { AttrEntry } from "base/ServerEntry";
import { s2_text_utils } from "auto/text";
import { filter_utils } from "lib/FilterUtils";

export type FashionActCompEntry = {
    power   : number,//激活战力
    cur_cnt : number,//当前已激活数量
    need_cnt: number,//需要解锁数量才能激活
    prop    : AttrEntry,   //属性
}

export class FashionActiveComp extends ComponentEx {
    public _isEuiex = true;
    lblTitle: eui.Label;
    // power: FightPowerWidget;
    bLblPower: eui.BitmapLabel;
    btnDetail: eui.Button;
    grpInfo: eui.Group;
    
    private serverData:FashionActCompEntry
    constructor() {
        super();
        this.skinName = "resource/eui/RoleJinYi_ActiveItem.exml";
    }

    @SafeCallFunction()
    public setData(data:FashionActCompEntry) {
        this.serverData = data;
        let bActivated:boolean = data.cur_cnt >= data.need_cnt;
        this.currentState = bActivated ? "activated" : "unactivated";
        bActivated ? filter_utils.removeAllFilters(this.grpInfo) : filter_utils.addGreyFilter(this.grpInfo);
        this.lblTitle.text = s2_text_utils.T(23102,{cnt: data.need_cnt});
        this.updatePower(data.power);
    }

    private updatePower(power:number) {
        // let powerData = {
        //     power: power, 
        //     // fun: () => { 
        //     //     UIManager.open(ComXiangqing).then((inst: ComXiangqing) => {
        //     //         inst.setData( this.serverData.prop, tempName1);
        //     //     });
        //     // }
        // };
        // updatePower(this.power, powerData);
        this.bLblPower.text = `+${power}`;
    }

    protected onTouchTapbtnDetail(event: egret.TouchEvent) {
        UIManager.open(ComXiangqing).then((inst: ComXiangqing) => {
            inst.setData( this.serverData.prop, tempName1);
        });
    }
}