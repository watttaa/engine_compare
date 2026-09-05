
type uiData = {clz?: any, data: any};

export class OpenUIQueueEvent extends egret.Event {
    public static readonly OPEN_NEXT: string = "OpenNext";

    public constructor(type: string, data?: any) {
        super(type, false, false, data);
    }
}

export class OpenUIQueueMgr extends SingletonClassEx {
    private $uiDatas: uiData[] = [];
    private $listening: boolean = false;
    private $hasUIOpen: boolean = false;
    private $lintenDisplayObj: egret.DisplayObject;

    constructor() {
        super();
        this.$lintenDisplayObj = new egret.DisplayObject();
    }

    /**是否阻塞 */
     private $block: boolean = false;

    public flagBlock(value: boolean) {
        this.$block = value;
    }

    public get uiDatas(): uiData[] {
        return this.$uiDatas;
    }

    /**
     * 
     * @param data 页面数据
     * @param className 页面类或类名
     */
    public pushUI(data:any, className: string | (new ()=> QueueWidgetBase)): void {
        if(this.$uiDatas == null) return;
        if(typeof className == "string") {
            className = preload_utils_reflect.getClassByNameSync(className as string);
        }
        let uiData = {
            data: data,
            clz: className
        }
        if(!this.$listening) {
            OpenUIQueueMgr.getInstance().addEventListener(OpenUIQueueEvent.OPEN_NEXT, this.onPlayNextEff, this);
            this.$listening = true;
        }
        if(this.$hasUIOpen) {
            this.$uiDatas.push(uiData);
        }
        else {
            if(this.$block){
                this.$uiDatas.push(uiData);
                Logger.log("OpenUIQueueMgr pushUI 被标记成了阻塞状态 稍后再打开");
                return;
            }
            this.playEff(uiData);
        }
    }

    private onPlayNextEff(e: OpenUIQueueEvent) {
        if(this.$uiDatas == null) return;
        if(this.$uiDatas[0]) {
            //不等一下的话如果是相同动效界面会导致BaseWidget 的closed = true在打开之后执行第二次打开就不会执行onClose
            this.$lintenDisplayObj.once(egret.Event.ENTER_FRAME, this.onEnterFrame, this)
        }
        else {
            OpenUIQueueMgr.getInstance().removeEventListener(OpenUIQueueEvent.OPEN_NEXT, this.onPlayNextEff, this);
            this.$listening = false;
            this.$hasUIOpen = false;
        }
    }

    private playEff(data: uiData): void {
        let clz = data.clz;
        if (clz) {
            O3(clz, (inst:QueueWidgetBase)=>{
                inst.setData(data.data);
                //inst.playState(data.title, data.text, data.icon);
            });
        }
        this.$hasUIOpen = true;
    }

    public playNext(): void {
        this.flagBlock(false);
        OpenUIQueueMgr.getInstance().dispatchEvent(new OpenUIQueueEvent(OpenUIQueueEvent.OPEN_NEXT));
    }

    public has(clz: (new () => QueueWidgetBase)): boolean {
        return this.hasUIDatas() && this.uiDatas.some(v => v.clz === clz);
    }

    /**是否有弹框正在播放 或者有准备播放的弹框 */
    public hasUIDatas(): boolean {
        return isArrayNotVain(this.$uiDatas)
    }

    private onEnterFrame(): void {
        this.playEff(this.$uiDatas[0]);
        this.$uiDatas.splice(0, 1);
    }

    destroy(): void {
        OpenUIQueueMgr.getInstance().clearEventListener();
        this.$lintenDisplayObj?.removeEventListener(egret.Event.ENTER_FRAME, this.onEnterFrame, this)
        this.$uiDatas = null;
        this.$lintenDisplayObj = null;
    }

    public isQueueUI(inst): boolean {
        return typeof (inst?.openNext) == "function";
    }
}

export interface QueueWidgetBase {
    setData(data: any): void;

    openNext(): void;
}