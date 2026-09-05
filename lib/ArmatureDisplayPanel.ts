import { getResByPath_ } from "utils/ResUtils";

export class ArmatureDisplayPanel extends PanelBase {
    public get inited() {
        return this.$inited;
    }

    public get baseInst() {
        return this.$baseInst;
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

    public get width() {
        return this.$baseInst.width;
    }

    public get height() {
        return this.$baseInst.height;
    }

    protected $inited: boolean;
    protected $parent: egret.DisplayObjectContainer;
    protected $baseInst: eui.Group;
    protected $completeCallback: Function;
    protected $completeObj: any;
    protected $completeArg: any;
    protected $times: number;
    protected $playing: boolean;
    protected $skeData: any;
    protected $textureData: any;
    protected $textureRes: egret.Texture;
    protected $armatureName: string;
    protected $armature: dragonBones.EgretArmatureDisplay;
    protected $aniName: string;
    protected $baseDragonBonesPath: string = "resource/assets/dragonbones";

    public constructor(parent: egret.DisplayObjectContainer, skeJson: string, textureJson: string, textureRes: string, armatureName: string) {
        super();
        this.$inited = false;
        this.$times = 1;
        this.$playing = false;
        this.$baseInst = new eui.Group();
        this.$baseInst.touchEnabled = false;
        this.$baseInst.touchChildren = false;
        this.$parent = parent;
        this.$parent.addChild(this.$baseInst);
        this.$armatureName = armatureName;
        this.setDragonBonesRes(skeJson, textureJson, textureRes);
    }

    protected setDragonBonesRes(skeJson: string, textureJson: string, textureRes: string) {
        getResByPath_(`${this.$baseDragonBonesPath}/${skeJson}`, (data: any) => {
            this.$skeData = data;
            this.initDragonBonesAni();
        }, this);
        getResByPath_(`${this.$baseDragonBonesPath}/${textureJson}`, (data: any) => {
            this.$textureData = data;
            this.initDragonBonesAni();
        }, this);
        getResByPath_(`${this.$baseDragonBonesPath}/${textureRes}`, (data: any) => {
            let texture = new egret.Texture;
            texture.bitmapData = data;
            this.$textureRes = texture;
            this.initDragonBonesAni();
        }, this);
    }

    protected onPlayComplete() {
         if (this.$times < 0) {
            if (UIManager.isInStage(this.$baseInst)) {
                this.$armature.animation.play(this.$aniName, 1);
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
            this.$armature.animation.play(this.$aniName, 1);
        }
    }

    protected initDragonBonesAni() {
        if(this.$skeData && this.$textureData && this.$textureRes) {
            let egretFactory: dragonBones.EgretFactory = dragonBones.EgretFactory.factory;
            egretFactory.parseDragonBonesData(this.$skeData);  
            let textureAtlasData = egretFactory.parseTextureAtlasData(this.$textureData, this.$textureRes);
            let armatureDisplay: dragonBones.EgretArmatureDisplay = egretFactory.buildArmatureDisplay(this.$armatureName);
            this.$baseInst.addChild(armatureDisplay);
            this.$armature = armatureDisplay;
            this.$armature.addEventListener("complete", this.onPlayComplete, this);
            this.$inited = true;
            this.baseInst.dispatchEventWith(BaseWidgetEvent.ONCOMPLETE);
        }
    }

    @SafeCallFunction()
    public play(aniName: string, times: number = 1, callback?: Function, thisObject?: any, arg?: any) {
        if(!this.$armature) {
            return;
        }
        this.$completeCallback = callback;
        this.$completeObj = thisObject;
        this.$completeArg = arg;
        this.$times = times;
        this.$playing = true;
        this.$aniName = aniName;
        this.$armature.animation.play(this.$aniName, 1)
    }


    public stop() {
        this.$playing = false;
        if(!this.$armature) {
            return;
        }
        this.$armature.animation.stop();
    }

    public destroy() {
        this.stop();
        this.$parent.removeChild(this.$baseInst);
    }
}