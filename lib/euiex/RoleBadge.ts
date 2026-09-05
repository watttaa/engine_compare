import { ComponentEx } from "lib/euiex/ComponentEx";
import { getProfileBadgePath } from "playerinfo/PlayerProfileUtils";


export type RoleBadgeData = {
    icon: string|number;
    level?: number;
}

export class RoleBadge extends ComponentEx{
    imgBadge: eui.Image;
    grplvl: eui.Group;
    lblLvl: eui.Label;    

    @SafeCallFunction()
    setData(data: RoleBadgeData){
        this.imgBadge.source = getProfileBadgePath(data.icon);
    }

}