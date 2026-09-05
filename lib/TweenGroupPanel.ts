
export class TweenGroupPanel extends PanelBase {

    public get inited() {
        return this.$inited;
    }

    public get baseInst() {
        return this.$baseInst;
    }

    public get instTweenGroup() {
        return this.$instTweenGroup;
    }

    public get x() {
        return this.$baseInst.x;
    }

    public set x(value: number) {
        this.$baseInst.x = value;
    }

    public get y() {
        return this.$baseInst.y;
    }

    public set y(value: number) {
        this.$baseInst.y = value;
    }

    public get z() {
        return this.$baseInst.z;
    }

    public set z(value: number) {
        this.$baseInst.z = value;
    }

    public get visible() {
        return this.$baseInst.visible;
    }

    public set visible(value: boolean) {
        this.$baseInst.visible = value;
    }

    public get playing() {
        return this.$playing;
    }

    public get width() {
        return this.$baseInst.width;
    }

    public get height() {
        return this.$baseInst.height;
    }

    public set startTime(time: number) {
        this.$startTime = time;
    }

    public get startTime() {
        return this.$startTime;
    }

    protected $inited: boolean;
    protected $parent: egret.DisplayObjectContainer;
    protected $baseInst: eui.Component;
    protected $instTweenGroup: egret.tween.TweenGroup;
    protected $completeCallback: Function;
    protected $completeObj: any;
    protected $completeArg: any;
    protected $times: number;
    protected $startTime: number; //播放起始帧
    protected $playing: boolean;
    protected $initedCb: any[] = [];
    protected $autoSizeFullScreen:boolean;

    public constructor(parent: egret.DisplayObjectContainer, skin: string, isAutoSizeFullScreen?:boolean) {
        super();
        this.$inited = false;
        this.$times = 1;
        this.$startTime = 0;
        this.$playing = false;
        this.$autoSizeFullScreen = isAutoSizeFullScreen;
        this.$baseInst = new eui.Component();
        this.setTouchEnabled(false);
        this.$baseInst.once(eui.UIEvent.COMPLETE, this.onComplete, this);
        this.$baseInst.skinName = skin;
        this.$parent = parent;
        this.$initedCb = [];
        this.$parent.addChild(this.$baseInst);
    }

    public setTouchEnabled(enabled:boolean){
        this.$baseInst.touchEnabled = enabled;
        this.$baseInst.touchChildren = enabled;
    }

    public reset() {
        this.$times = 1;
        this.$startTime = 0;
        this.$playing = false;
        this.$initedCb = [];
        if (this.$instTweenGroup) {
            this.$instTweenGroup.stop();
        }
    }

    protected onComplete() {
        if(!this.$baseInst.skin){
            Logger.error(`皮肤未加载完成 - ${this.$baseInst.skinName}`);
        }else{
            for (let i = 0; i < this.$baseInst.skin.skinParts.length; i++) {
                let ID: string = this.$baseInst.skin.skinParts[i];
                let child: any = this.$baseInst[ID];
                if (child) {
                    if (child instanceof egret.tween.TweenGroup) {
                        this.$instTweenGroup = child;
                    }
                    this[ID] = child;
                }
            }
        }
        if (this.$instTweenGroup) {
            this.$instTweenGroup.addEventListener("complete", this.onTweenGroupComplete, this);
            if (this.$playing) {
                this.$instTweenGroup.play(this.$startTime);
            } else {
                this.$instTweenGroup.stop();
            }
        }
        this.$inited = true;
        this.baseInst.dispatchEventWith(BaseWidgetEvent.ONCOMPLETE);

        if(this.$autoSizeFullScreen){
            this.$baseInst.height = UIManager.stage.stageHeight + 100;
            this.$baseInst.width = UIManager.stage.stageWidth;
        }

        this.exeInitedCbs();
    }

    protected exeInitedCbs() {
        for (let cbInfo of this.$initedCb) {
            let cb = cbInfo[0];
            let thisObj = cbInfo[1];
            let args = cbInfo[2];
            cb.call(thisObj, args);
        }
        this.$initedCb = [];
    }

    public addInitedCb(cb: Function, thisObj?: any, args?: any[]) {
        this.$initedCb.push([cb, thisObj, args]);
        if (this.$inited) {
            this.exeInitedCbs();
        }
    }

    protected onTweenGroupComplete(): void {
        if (this.$times < 0) {
            if (UIManager.isInStage(this.$baseInst)) {
                this.$instTweenGroup.play(this.$startTime);
            }
            return;
        }
        this.$times--;
        if (this.$times === 0) {
            this.stop();
            if (this.$completeCallback) {
                this.$completeCallback.call(this.$completeObj, this.$completeArg);
            }
            return;
        }
        if (UIManager.isInStage(this.$baseInst)) {
            this.$instTweenGroup.play(this.$startTime);
        }
    }

    @SafeCallFunction()
    public play(times: number = 1, callback?: Function, thisObject?: any, arg?: any) {
        this.$completeCallback = callback;
        this.$completeObj = thisObject;
        this.$completeArg = arg;
        this.$times = times;
        this.$playing = true;
        if (this.$instTweenGroup) {
            this.$instTweenGroup.play(this.$startTime);
        }
    }

    @SafeCallFunction()
    public playTweenGroup(name: string, times: number = 1, callback?: Function, thisObject?: any, arg?: any) {
        if (!this[name]) {
            return;
        }
        this.$instTweenGroup.stop();
        this.$instTweenGroup.removeEventListener("complete", this.onTweenGroupComplete, this);
        this.$instTweenGroup = this[name];
        this.$instTweenGroup.addEventListener("complete", this.onTweenGroupComplete, this);
        this.play(times, callback, thisObject, arg);
    }

    public stop() {
        this.$playing = false;
        if (this.$instTweenGroup) {
            this.$instTweenGroup.stop();
            this.$instTweenGroup.setPosition(0);
        }
    }

    public adapter(){
        this.$baseInst.left = this.$baseInst.top = this.$baseInst.bottom = this.$baseInst.right = 0;
    }

    public destroy() {
        this.stop();
        if (this.$initedCb) {
            this.$initedCb.length = 0;
        }
        if (this.$instTweenGroup) {
            this.$instTweenGroup.removeEventListener("complete", this.onTweenGroupComplete, this);
        }
        if (this.$parent.getChildIndex(this.$baseInst) !== -1) {
            this.$parent.removeChild(this.$baseInst);
        }
    }

    // start：起始时间（ms）
    @SafeCallFunction()
    public loop(times: number, start: number) {
        this.$times = times;
        this.$startTime = start;
        this.$instTweenGroup.play(this.$startTime);
    }
}