
export function setUseChoiceBoxReplaceValue( res: boolean){
    let value = JSON.stringify({day: ServerTimer.getCurDay(), result: res});
    egret_localStorage_setItem_by_uid("USE_CHOICE_BOX_ITEM_REPLACE", value);
}

export function getUseChoiceBoxReplaceValue(){
    // return undefined;
    let str = egret_localStorage_getItem_by_uid("USE_CHOICE_BOX_ITEM_REPLACE");
    if (!str) return undefined;
    let value: {day: number, result: boolean} = JSON.parse(str);
    if (value.day == ServerTimer.getCurDay()) return value.result;
    return undefined;
}

export class UseChoiceBoxReplaceMgr extends SingletonClassEx{
    private $useChoiceBox: number;

    constructor(){
        super();
        this.$useChoiceBox = 0;
    }


    public get useChoiceBox(){
        let localStorageValue = getUseChoiceBoxReplaceValue();
        if (localStorageValue != undefined) return localStorageValue ? 1:0;
        return this.$useChoiceBox;
    }

    public set useChoiceBox(val: number){
        this.$useChoiceBox = val;
    }

    public clearEventListener(): void {
        this.$useChoiceBox = 0;
    }
    destroy(): void {
    }
}

