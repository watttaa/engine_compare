import { ItemGridComp, ItemGridComp_EquipLv } from "lib/euiex/ItemGridComp";
import { ItemInfo } from "s2/bag/ItemInfo";
import { ui_utils_equip } from "utils/UIUtils_equip";
import { ItemGridCompEnum } from "./ItemGridCompConst";


export class ItemGridEqm extends ItemGridComp {
    public _isEuiex = true;
    private _equipLvComp: ItemGridComp_EquipLv;
    protected imgEquipTag: eui.Image;

    constructor() {
        super();
    }

    public get equipLvComp() {
        if (!this.completed) return null;
        if (!this._equipLvComp) {
            this._equipLvComp = new ItemGridComp_EquipLv();
            this._equipLvComp.bottom = -1;
            // this._equipLvComp.top = -1;
            this._equipLvComp.left = 0;
        }
        this.addToWidget(this._equipLvComp, ItemGridCompEnum.EquipLv);
        return this._equipLvComp;
    }

    public isEquipLvCompExit() {
        return !!this._equipLvComp;
    }

    protected onUpdateCustom(): void {
        super.onUpdateCustom()
    }

    protected refresh(): boolean {
        super.refresh();
        let itemInfo = this.data as ItemInfo;
        if (itemInfo instanceof ItemInfo) {
            if (this._showLeftTag && ui_utils_equip.isShowEquipDegreeTag(itemInfo)) {
                this.equipLvComp.visible = true;
                this.equipLvComp.updateView(itemInfo);
            }
            return true;
        }
    }

    protected $reset(): void {
        super.$reset();
        this._equipLvComp && (this._equipLvComp.visible = false);
        this.imgEquipTag && (this.imgEquipTag.visible = false);
    }

}