import { SkillGrid60x } from "./SkillGrid60x";

export class SkillGridNoSelected60x extends SkillGrid60x {
    public _isEuiex = true;

    protected onSkinLoadCompleted() {
        this.setShowTag(false);
        super.onSkinLoadCompleted();
    }

    $setSelected() {
        this.selected = false;
    }
}
