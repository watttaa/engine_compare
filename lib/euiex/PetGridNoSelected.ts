import { PetGrid } from "s2/pet/common/PetGrid";

export class PetGridNoSelected extends PetGrid {
    public _isEuiex = true;

    $setSelected() {
        this.selected = false;
    }
}
