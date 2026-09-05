import { getFullPath_, getResByPath_ } from "utils/ResUtils";

export interface SpineResConfig {
    sk: string,
    atlas: string,
    image: string,
}

export class SpinePanel extends PanelBase {
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

    public get animation() {
        return this.$animation;
    }

    protected $inited: boolean;
    protected $parent: egret.DisplayObjectContainer;
    protected $baseInst: eui.Group;
    protected $completeCallback: Function;
    protected $completeObj: any;
    protected $completeArg: any;
    protected $times: number;
    protected $playing: boolean;
    protected $resName: string;
    protected $textureData: any;
    protected $textureRes: egret.Texture;
    protected $armatureName: string;
    protected $animation: spine.SkeletonAnimation;
    protected $aniName: string;
    protected $baseSpinePath: string = "resource/assets/spine/";
    protected $spineImgData: egret.Texture;
    protected m_bLoadBinary: boolean;

    public constructor(parent: egret.DisplayObjectContainer, resName: string, x: number = 0, y: number = 0, targetWidth: number = 0, targetHeight: number = 0, bLoadBinary: boolean = true) {
        super();
        this.$inited = false;
        this.$times = 1;
        this.$playing = false;
        this.$baseInst = new eui.Group();
        this.$baseInst.touchEnabled = false;
        this.$baseInst.touchChildren = false;
        this.$baseInst.x = x;
        this.$baseInst.y = y;
        this.$parent = parent;
        this.$parent.addChild(this.$baseInst);
        this.$resName = resName;
        this.m_bLoadBinary = bLoadBinary;
        this.initSpine(targetWidth, targetHeight);
    }

    protected loadImage(url: string): Promise<egret.Texture> {
        return new Promise(resolve => {
            getResByPath_(url, (bitmapdata: egret.BitmapData) => {
                let loadFinish = () => {
                    let texture = new egret.Texture();
                    texture.bitmapData = bitmapdata;
                    bitmapdata.addReference();
                    resolve(texture);
                };
                if (bitmapdata.source) {
                    loadFinish();
                } else {
                    egret.reloadBitmapData(bitmapdata, null, () => {
                        loadFinish();
                    }, this);
                }
            }, this);
        });
    }

    protected loadText(url: string) {
        SpinePanel.updateSpineTxtRef(url, 1);

        return new Promise(resolve => {
            getResByPath_(url, (data) => {
                resolve(data);
            }, this, RES.ResourceItem.TYPE_TEXT);
        });
    }

    protected loadBinary(url: string) {
        SpinePanel.updateSpineTxtRef(url, 1);

        return new Promise<Uint8Array>(resolve => {
            getResByPath_(url, (data) => {
                resolve(new Uint8Array(data));
            }, this, RES.ResourceItem.TYPE_BIN)
        })
    }

    protected async initSpine(targetWidth: number, targetHeight: number) {
        // if(preload_utils_platform.isIOSPlatformDisable()){
        //     return;
        // }

        if (!ProfileConfig.ENABLE_SPINE) return;
        Logger.warn(">>>>>>>>>>> initSpine");

        let atlas = await this.loadText(`${this.$baseSpinePath}${this.$resName}.atlas`);
        let imgData = await this.loadImage(`${this.$baseSpinePath}${this.$resName}.png`);
        //spine的图片可能会由于uv修改等导致合批异常，因此spine对应的图片不参与合图
        imgData.$bitmapData.batchType = egret.BatchType.Disable;
        this.$spineImgData = imgData;
        let texAtlasConfig = {};
        texAtlasConfig[`${this.$resName}.png`] = this.$spineImgData;
        let texAtlas = spine.createTextureAtlas(atlas as string, texAtlasConfig);

        let skelData: spine.SkeletonData;
        if (this.m_bLoadBinary) {
            let binary = await this.loadBinary(`${this.$baseSpinePath}${this.$resName}.skel`);
            let skelreader = new spine.SkeletonBinary(new spine.AtlasAttachmentLoader(texAtlas))
            skelData = skelreader.readSkeletonData(binary)
        } else {
            let json = await this.loadText(`${this.$baseSpinePath}${this.$resName}.json`);
            skelData = spine.createSkeletonData(json, texAtlas);
        }

        this.$animation = new spine.SkeletonAnimation(skelData);
        if (targetWidth === 0 && targetHeight === 0) {
            this.$animation.scaleX = 1;
            this.$animation.scaleY = 1;
        } else if (targetWidth > 0 && targetHeight === 0) {
            this.$animation.scaleX = this.$animation.scaleY = targetWidth / this.$animation.width;
        } else if (targetWidth === 0 && targetHeight > 0) {
            this.$animation.scaleX = this.$animation.scaleY = targetHeight / this.$animation.height;
        } else {
            this.$animation.scaleX = targetWidth / this.$animation.width;
            this.$animation.scaleY = targetHeight / this.$animation.height;
        }
        this.$baseInst.addChild(this.$animation);
        this.$inited = true;
        this.baseInst.dispatchEventWith(BaseWidgetEvent.ONCOMPLETE);
    }

    @SafeCallFunction()
    public play(aniName: string, loop: number = 1, callback?: Function, thisObject?: any, arg?: any) {
        if (!this.$animation) {
            return;
        }
        this.$playing = true;
        this.ignoreFrame = false;
        if (loop < 0) {
            this.$animation.play(aniName);
        } else {
            this.$animation.play(aniName, loop).waitPlayEnd().then(() => {
                this.stop();
                callback && callback();
            });
        }
    }


    public stop(ignoreFrame: boolean = false) {
        this.$playing = false;
        if (!this.$animation) {
            return;
        }
        this.$animation.stopAll(true);

        this.ignoreFrame = ignoreFrame;
    }

    /**忽略spine自身onFrame */
    private set ignoreFrame(value: boolean) {
        if (!this.$animation) {
            return;
        }
        this.$animation.ignoreFrame = value;
    }

    /**上层自主推进animation推进(engine自动忽略spine自身onFrame)*/
    public advance(delta) {
        if (!this.$animation) {
            return;
        }

        this.$animation.advance(delta)
    }

    private m_nTimeScale: number = 1;
    public set timeScale(value: number) {
        this.m_nTimeScale = value;
        if (!this.$animation) {
            return;
        }

        this.$animation.renderer.timeScale = value;
    }
    public get timeScale() {
        return this.m_nTimeScale;
    }

    public destroy() {
        this.stop();

        this.ignoreFrame = false;
        this.timeScale = 1;

        this.$parent && this.$parent.$children.indexOf(this.$baseInst) > -1 && this.$parent.removeChild(this.$baseInst);
        if (this.$animation) {
            this.$animation.clearEventListener();
            this.$animation = null;
        }
        if (this.$spineImgData && this.$spineImgData.bitmapData) {
            this.$spineImgData.bitmapData.removeReference();
            this.$spineImgData.bitmapData.$dispose();
            this.$spineImgData = null;
        }

        let sk: string;
        if (this.m_bLoadBinary) {
            sk = `${this.$baseSpinePath}${this.$resName}.skel`;
        } else {
            sk = `${this.$baseSpinePath}${this.$resName}.json`;
        }
        let atlas = `${this.$baseSpinePath}${this.$resName}.atlas`;
        SpinePanel.updateSpineTxtRef(sk, -1);
        SpinePanel.updateSpineTxtRef(atlas, -1);
    }

    public get isPlaying(): boolean {
        return this.$playing;
    }


    // ========================
    // ========================
    private static spineTxtMap = {};
    private static updateSpineTxtRef(res: string, cnt: number) {
        let oldCnt = SpinePanel.spineTxtMap[res] || 0;
        let newCnt = oldCnt + cnt;
        SpinePanel.spineTxtMap[res] = newCnt;

        if (newCnt <= 0) {
            delete SpinePanel.spineTxtMap[res];

            let _name = getFullPath_(res);
            RES.destroyRes(_name);
        }
    }
    public static tryGcSpineTxt() {
        for (let res of Object.keys(SpinePanel.spineTxtMap)) {
            let cnt = SpinePanel.spineTxtMap[res];
            if (cnt <= 0) {
                delete SpinePanel.spineTxtMap[res];

                let _name = getFullPath_(res);
                RES.destroyRes(_name);
            }
        }
    }

}