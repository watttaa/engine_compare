import { ItemGrid80x } from "./ItemGrid80x";

export class NotSelectedGrid80x extends ItemGrid80x {
    public _isEuiex = true;
    public $setSelected(value: boolean) {
        super.$setSelected(false);
    }
}