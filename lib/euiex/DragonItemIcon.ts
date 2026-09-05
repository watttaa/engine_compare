import { Quality_Golden, Quality_Platinum, Quality_Purple, Quality_Red, uiSkinPath } from "GlobalValue";
import { GlobalValue } from "GlobalValueDefine";
import { EgretExEntry } from "lib/EgretExUtils_Entry";
import { RedPointTreeHelper } from "lib/RedPointManager";
import { loadResource } from "utils/ResUtils";

export class DragonItemIcon extends eui.Component {
    public _isEuiex = true;
    grpFloor: eui.Group;
    imgFrame: eui.Image;
    imgFrameF: eui.Image;
    imgIcon: eui.Image;
    grpNum: eui.Group;
    imgEquipTag: eui.Image;
    labelNum: eui.Label;
    grpLock: eui.Group;
    imgLock: eui.Image;
    compShadow: eui.Component;
    grpReddot: eui.Group;
    

    private data: EgretExEntry.DragonItemIconEntry;
    constructor() {
        super();
        this.skinName = uiSkinPath("DragonItem.exml");
    }

    onSkinLoadCompleted() {
        super.onSkinLoadCompleted();
        this._update();
    }

    public static preloadResource(data: EgretExEntry.DragonItemIconEntry) {
        // let icon = follower_utils.getFolllowConf({pid:data.pid,skin:data.skin}, "iDragonIcon");
        // icon && loadResource(`resource/assets/dragon_icon/${icon}.png`);

        let quality = DragonItemIcon.getQuality(data.level, data.limit);
        eui.getAssetsAsync(GlobalValue.QuaBorder[quality]);
        eui.getAssetsAsync(GlobalValue.QuaFrame[quality]);
    }

    public setData(data: EgretExEntry.DragonItemIconEntry) {
        this.data = data;
        this._update();
    }

    private _update() {
        if (!this.data || !this.completed) return;
        let data = this.data as EgretExEntry.DragonItemIconEntry;
        // let icon = follower_utils.getFolllowConf({pid:data.pid,skin:data.skin}, "iDragonIcon");
        // this.imgIcon.source = icon ? `resource/assets/dragon_icon/${icon}.png` : "";
        this.labelNum.text = `+${data.level}`;
        this.grpNum.visible = data.level > 0;//大于0才显示
        let quality = DragonItemIcon.getQuality(this.data.level, this.data.limit);
        this.imgFrame.source = GlobalValue.QuaBorder[quality];
        this.imgFrameF.source = GlobalValue.QuaFrame[quality];
        this.grpLock.visible = data.mask;
        // this.grpReddot.visible = !!data.notiy;
        RedPointTreeHelper.addPointOnWidget(this.grpReddot,!!data.notiy);
    }

    public static getQuality(level:number, limit:number) {
        //1-9 紫
        //10-19橙
        //20-29红
        //30-50白金
        if (level < 10 || limit === 10) {
            return Quality_Purple;
        }
        else if (level >= 10 && level < 20 || limit === 20) {
            return Quality_Golden;
        }
        else if (level >= 20 && level < 30 || limit === 30) {
            return Quality_Red;
        }
        else {
            return Quality_Platinum;
        }
    }
}
