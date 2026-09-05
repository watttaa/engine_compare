import { BaseGrid } from "./BaseGrid";

export class NotSelectedGrid extends BaseGrid {
    public _isEuiex = true;
    public $setSelected(value: boolean) {
        super.$setSelected(false);
    }
}