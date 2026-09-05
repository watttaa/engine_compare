import { SkillGrid } from "./SkillGrid";

export class GangBossInfoSkillGrid extends SkillGrid {
    public _isEuiex = true;
    constructor() {
        super();
    }

    onSkinLoadCompleted() {
        super.onSkinLoadCompleted()
        this.setShowTips(true);
    }

    protected $setSelected(value: boolean) {
        //不显示选中
        // super.$setSelected(value);
    }
}
