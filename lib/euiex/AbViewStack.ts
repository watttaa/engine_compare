import { GlobalEventSource, SendEvent } from "GlobalEvent";
import { AbViewStackEvent } from "lib/EgretExUtils_AbViewStackEvent";

export type AbVSLinkByIdxExt = {
    auto?        : boolean; 
    diyKey?      : string;
    adapteParent?: boolean;
}

export class AbViewStack extends AbViewStackBase {
    public _isEuiex = true;

    // hashcode -> group obj
    private $groupMap: dataStructure.Map;
    // controller hashcode -> group hashcode
    private $linkMap: dataStructure.Map;
    // controller hashcode -> controller
    private $controllerMap: dataStructure.Map;
    // controller hashcode list
    private $controllerLst: { [key: number]: number };
    // diyKey -> group hashcode
    private $diyKeyMap: dataStructure.Map;
    // group controller hashcode -> diyKey
    private $ctrlHash2diyKey: dataStructure.Map;

    // curr idx
    private $currIdx: string | number;
    //private $controllerLstCnt: number; 

    constructor(controllerLstCnt?: number) {
        super();
        this.$groupMap = new dataStructure.Map();
        this.$linkMap = new dataStructure.Map();
        this.$controllerMap = new dataStructure.Map();
        this.$controllerLst = {};
        this.$diyKeyMap = new dataStructure.Map();
        this.$ctrlHash2diyKey = new dataStructure.Map();
        this.$currIdx = null;
        // if (controllerLstCnt) {
        //     this.controllerLstCnt = controllerLstCnt;
        // }
    }

    /**
     * 选择页签
     * 此处有坑，对于page页签，会重新调用onOpen,需要上层对选中逻辑进行过滤
     * @param key 页签数据索引 
     */
    private chooseGroupbyKey(key: number) {
        if (this.$groupMap.has(key)) {
            let target = this.$groupMap.get(key);
            this.$groupMap.forEach((v, k) => {
                v.visible = v === target;
            });
        }
        else {
            Logger.log("trying choose group not in $linkMap");
        }
    }

    private onTouchController(event: egret.TouchEvent) {
        this.chooseGroupbyController(event.target, true);
    }

    public get groupNum() {
        return this.$groupMap.size;
    }

    public get currIdx() {
        return this.$currIdx;
    }

    // private set controllerLstCnt(cnt: number) {
    //     this.$controllerLstCnt = cnt;
    //     // this.$controllerLst = new Array<number>();
    //     // for (let i = 0; i < cnt; ++i) {
    //     //     this.$controllerLst.push(null);
    //     // }
    // }

    public linkByIdx(controller: eui.UIComponent, group: egret.DisplayObject | BaseWidget, idx: number, ext:AbVSLinkByIdxExt=undefined) {
        if (this.$linkMap.has(controller.hashCode)) {
            Logger.log("trying link existed linked component");
            return;
        }
        let bAdapteParent = (ext && ext.adapteParent == false) ? false : true;//默认适配
        if (bAdapteParent && group instanceof BaseWidget) {
            group.top = group.bottom = group.left = group.right = 0;
        }
        this.$groupMap.set(group.hashCode, group);
        this.$controllerMap.set(controller.hashCode, controller);
        this.$linkMap.set(controller.hashCode, group.hashCode);
        this.$controllerLst[idx] = controller.hashCode;
        if (ext && ext.diyKey) {
            this.$diyKeyMap.set(ext.diyKey, [controller.hashCode, group.hashCode]);
            this.$ctrlHash2diyKey.set(controller.hashCode, ext.diyKey);
        }
        // let auto = (ext && ext.auto == false) ? false : true;//默认不监听
        if (ext?.auto) {
            controller.addEventListener(egret.TouchEvent.TOUCH_TAP, this.onTouchController, this);
        }
    }

    public link(controller: eui.UIComponent, group: egret.DisplayObject | BaseWidget, diyKey: string, ext: AbVSLinkByIdxExt=undefined) {
        if (this.$linkMap.has(controller.hashCode)) {
            Logger.log("trying link existed linked component");
            return;
        }
        if (group instanceof BaseWidget) {
            group.top = group.bottom = group.left = group.right = 0;
        }
        this.$groupMap.set(group.hashCode, group);
        this.$controllerMap.set(controller.hashCode, controller);
        this.$linkMap.set(controller.hashCode, group.hashCode);
        this.$controllerLst[diyKey] = controller.hashCode;
        if (diyKey) {
            this.$diyKeyMap.set(diyKey, [controller.hashCode, group.hashCode]);
            this.$ctrlHash2diyKey.set(controller.hashCode, diyKey);
        }
        // let auto = (ext && ext.auto == false) ? false : true;//默认不监听
        if (ext?.auto) {
            controller.addEventListener(egret.TouchEvent.TOUCH_TAP, this.onTouchController, this);
        }
    }

    public resetCurIdx(){
        this.$currIdx = null;
    }

    public reset() {
        this.$linkMap.clear();
        this.$groupMap.clear();
        this.$diyKeyMap.clear();
        this.$ctrlHash2diyKey.clear();
        if (this.$controllerMap) {
            this.$controllerMap.forEach((v, k) => {
                v.removeEventListener(egret.TouchEvent.TOUCH_TAP, this.onTouchController, this);
            }, this);
        }
        this.$controllerMap.clear();
        this.$controllerLst = new Array<number>();
        this.resetCurIdx();
    }

    public destroy() {
        for (let key in this.$controllerLst) {
            let widget = this.getGroupbyIdx(key);
            if (widget instanceof BaseWidget) {
                if (widget.baseInst) {
                    safeInvokeFunc(widget, () => {
                        widget.destroy();
                    })
                }
            }
        }
        this.reset();
    }

    public close() {
        for (let key in this.$controllerLst) {
            let widget = this.getGroupbyIdx(key);
            if (widget instanceof BaseWidget) {
                if (widget.baseInst) {
                    safeInvokeFunc(widget, ()=>{
                        widget.visible=false;// widget.onClose();
                    })
                }
            }
        }
    }

    public refreshControllerState() {
        for (let key in this.$controllerLst) {
            let widget = this.getGroupbyIdx(key);
            let ctrl = this.$controllerMap.get(this.$controllerLst[key]);
            if (egret.is(ctrl, "eui.RadioButton")) {
                (ctrl as eui.RadioButton).selected = key === this.$currIdx;
            }
        }
    }


    public getGroupByDiykey(diyKey: string) {
        let group = null;
        if (this.$diyKeyMap.has(diyKey)) {
            let group_hashCode = this.$diyKeyMap.get(diyKey)[1];
            group = this.$groupMap.get(group_hashCode);
        }
        return group;
    }

    public chooseGroupbyController(obj: eui.UIComponent, bUpdate: boolean = true) {
        let crl_hash = obj.hashCode;
        if (this.$linkMap.has(crl_hash)) {
            let idx = this.$linkMap.get(crl_hash);
            this.chooseGroupbyKey(idx);
            // dispatchEvent
            for (let key in this.$controllerLst) {
                let widget = this.getGroupbyIdx(key);
                if (this.$controllerLst[key] === crl_hash) {
                    this.$currIdx = key;
                    let event = new AbViewStackEvent(AbViewStackEvent.GROUP_CHANGE, this.$currIdx);
                    this.dispatchEvent(event);
                    let diyKey = this.$ctrlHash2diyKey.get(crl_hash);
                    if (diyKey) {
                        SendEvent(GlobalEventSource.GROUP_CHANGE_FROM_KEY, diyKey);
                    }
                    break;
                }
            }
            if (bUpdate) {
                this.updateControllerState();
            }
        }
    }

    public chooseGroupByDiykey(diyKey: string, bUpdate: boolean = true) {
        if (this.$diyKeyMap.has(diyKey)) {
            let controller_hashCode = this.$diyKeyMap.get(diyKey)[0];
            let group_hashCode = this.$diyKeyMap.get(diyKey)[1];
            this.chooseGroupbyKey(group_hashCode);
            // dispatchEvent
            for (let key in this.$controllerLst) {
                if (this.$controllerLst[key] === controller_hashCode) {
                    this.$currIdx = key;
                    let event = new AbViewStackEvent(AbViewStackEvent.GROUP_CHANGE, this.$currIdx);
                    this.dispatchEvent(event);
                    SendEvent(GlobalEventSource.GROUP_CHANGE_FROM_KEY, diyKey);
                    break;
                }
            }
            if (bUpdate) {
                this.updateControllerState();
            }
        }
    }

    public updateControllerState() {
        for (let key in this.$controllerLst) {
            let btnKeyCode = this.$controllerLst[key];
            if (btnKeyCode != null) {
                let curBtnKeyCode = this.$controllerLst[this.$currIdx];
                let btn: eui.RadioButton = this.$controllerMap.get(btnKeyCode);
                btn.selected = curBtnKeyCode == btnKeyCode;
            }
        }
    }

    // idx from 0
    public chooseGroupbyIdx(key: number | string) {
        if (!this.$controllerLst[key]) {
            Logger.log("trying get not existed group idx");
            return;
        }
        let controller = this.$controllerMap.get(this.$controllerLst[key]);
        this.chooseGroupbyController(controller);
    }
    // idx from 0
    public getGroupbyIdx(key: number | string) {
        if ( !this.$controllerLst[key]) {
            Logger.log("trying get not existed group idx");
            return;
        }
        let cHash = this.$controllerLst[key];
        let gHash = this.$linkMap.get(cHash);
        if (gHash) {
            return this.$groupMap.get(gHash);
        }
    }
    // idx from 0
    public getControllerbyIdx(key: number | string) {
        if (!this.$controllerLst[key]) {
            Logger.log("trying get not existed group idx");
            return;
        }
        let cHash = this.$controllerLst[key];
        if (cHash) {
            return this.$controllerMap.get(cHash);
        }
    }

    public getGroupbyController(controller: eui.UIComponent) {
        let hash = controller.hashCode;
        return this.getGroupbyHash(hash);
    }

    public getGroupbyHash(hash: number) {
        if (this.$groupMap.has(hash)) {
            return this.$groupMap.get(hash);
        }
        return null;
    }

}