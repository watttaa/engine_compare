import { uiPath0, uiPath2, uiSkinPath2 } from "GlobalValue";
import { ItemGrid } from "lib/euiex/ItemGrid";
import { ComponentEx } from "./ComponentEx";

/**
* 奖励动效组件
* 
*/
export class AniActivityRewardLight extends ComponentEx {
    public _isEuiex = true;
    image: eui.Image;
    rewardLight: egret.tween.TweenGroup;
    protected $type: string;
    private $skinBaseName: string;

    constructor() {
        super();
        // this.skinName = "resource/eui_skins/AniActivityRewardLightBlue.exml";
    }

    public setAni(type: string): void {
        if (!type) {
            Logger.error("不存在的类型", type);
            return;
        }
        if (this.$type === type) {
            this.play();
        }
        this.$type = type;
        if (type.substring(type.length - 2) === "S1") {
            type = type.substring(0, type.length - 2);
        }
        this.skinName = uiPath2(`ani/goods_grid/AniActivityRewardLight${this.$type}.exml`);
    }

    /**
     * 于setAni区别，setAni 名字限制太死了，动效经常给的名字又没前缀
     * @param skinBaseName 
     * @returns 
     */
    public setAniSkinName(skinBaseName: string): void {
        if (!skinBaseName) {
            Logger.error("不存在的类型", skinBaseName);
            return;
        }
        if (this.$skinBaseName === skinBaseName) {
            this.play();
        }
        this.$skinBaseName = skinBaseName;
        this.skinName = uiSkinPath2(`${skinBaseName}.exml`);
    }

    protected onSkinLoadCompleted() {
        super.onSkinLoadCompleted();

        this.rewardLight.play(0);
    }

    public stop(): void {
        if (this.inited && this.rewardLight) {
            this.rewardLight.stop();
        }
    }

    public play(): void {
        if (this.inited && this.rewardLight) {
            this.rewardLight.play(0);
        }
    }

    public gotoAndPlay(): void {
        this.play();
        // if (this.inited && this.rewardLight) {
        //     this.rewardLight.play();
        // }
    }

    public static playRewardEff(collectableLight: AniActivityRewardLight, container: ItemGrid | eui.Group, animType = "CollectableS1"): AniActivityRewardLight {
        if (!collectableLight) {
            collectableLight = new AniActivityRewardLight();
            collectableLight.setAni(animType);
            collectableLight.touchEnabled = false;
            container.addChild(collectableLight);
        }
        collectableLight.play();
        collectableLight.visible = true;
        return collectableLight;
    }

    public static clearRewardEff(collectableLight: AniActivityRewardLight): void {
        if (collectableLight) {
            collectableLight.stop();
            collectableLight.visible = false;
        }
    }
}


/**
* 通用动效组件
* 
*/
export class CommonAniComp extends ComponentEx {
    public _isEuiex = true;
    image: eui.Image;
    loop: egret.tween.TweenGroup;

    private $skinBaseName: string;

    private $comp_state: string;

    /**
     * 
     * @param skinBaseName 
     * @returns 
     */
    public setAniSkinName(skinBaseName: string, state: string = undefined): void {
        if (!skinBaseName) {
            Logger.error("不存在的类型", skinBaseName);
            return;
        }
        this.$comp_state = state
        if (this.$skinBaseName === skinBaseName) {
            if (isNotVain(state) && this.$comp_state != this.currentState) {
                this.updateState();
            } else {
                this.play();
            }
        } else {
            this.$skinBaseName = skinBaseName;
            this.skinName = `resource/eui_skins/${skinBaseName}.exml`;
        }
    }

    protected onSkinLoadCompleted() {
        super.onSkinLoadCompleted();
        this.updateState()
        //  this.loop.play(0);
    }

    private updateState() {
        if (this.currentState != this.$comp_state) {
            this.currentState = this.$comp_state;
            this.validateNow();
        }
        this.stop();
        this.play();
    }

    public stop(): void {
        if (this.inited && this.loop) {
            this.loop.stop();
        }
    }

    public play(): void {
        if (this.inited && this.loop) {
            this.loop.play(0);
        }
    }

    public gotoAndPlay(): void {
        this.play();
        // if (this.inited && this.loop) {
        //     this.loop.play();
        // }
    }
}

/**
* 动效组件
* 
*/

export enum CommonAniComp2Enum {
    BAODIAN = 1,
    BAODIAN1 = 3,
    BAODIAN2 = 4,
    BAODIAN3 = 5,
    BAODIAN4 = 6,
    CANREWARD1 = 10,
    CANREWARD2 = 11,
    STAR1 = 20,
}

export class CommonAniComp2 extends ComponentEx {
    public _isEuiex = true;

    private m_nType: CommonAniComp2Enum;
    private m_objTeeen: egret.tween.TweenGroup;

    vx_baodian: eui.Group;
    in: egret.tween.TweenGroup;
    rewardLight: egret.tween.TweenGroup;
    ani: egret.tween.TweenGroup;

    constructor(type: CommonAniComp2Enum) {
        super();

        this.m_nType = type;
        var path = "";
        switch (this.m_nType) {
            case CommonAniComp2Enum.BAODIAN:
                path = uiPath2("common/ani/ComAni_BaoDian_.exml");
                break;
            case CommonAniComp2Enum.BAODIAN1:
                path = uiPath2("common/ani/ComAni_BaoDian_1.exml");
                break;
            case CommonAniComp2Enum.BAODIAN2:
                path = uiPath2("common/ani/ComAni_BaoDian_2.exml");
                break;
            case CommonAniComp2Enum.BAODIAN3:
                path = uiPath2("common/ani/ComAni_BaoDian_3.exml");
                break;
            case CommonAniComp2Enum.BAODIAN4:
                path = uiPath2("common/ani/ComAni_BaoDian_4.exml");
                break;
            case CommonAniComp2Enum.CANREWARD1:
                path = uiPath2("common/ani/ComAni_Grid_HightLight1.exml");
                //path = uiPath2(`ani/goods_grid/AniActivityRewardLightCollectable.exml`);
                break;
            case CommonAniComp2Enum.CANREWARD2:
                // path = uiPath2("common/ani/ComAni_Grid_HightLight1.exml");
                path = uiPath2(`ani/goods_grid/AniActivityRewardLightDiamond.exml`);
                break;
            case CommonAniComp2Enum.STAR1:
                path = uiPath0(`aniStarAppear.exml`);
                break;
        }
        this.skinName = path;
    }

    protected onSkinLoadCompleted() {
        super.onSkinLoadCompleted();

        switch (this.m_nType) {
            case CommonAniComp2Enum.BAODIAN:
            case CommonAniComp2Enum.BAODIAN1:
            case CommonAniComp2Enum.BAODIAN2:
            case CommonAniComp2Enum.BAODIAN3:
            case CommonAniComp2Enum.BAODIAN4:
            case CommonAniComp2Enum.CANREWARD1:
                this.m_objTeeen = this.in;
                break;
            case CommonAniComp2Enum.CANREWARD2:
                this.m_objTeeen = this.rewardLight;
                break;
            case CommonAniComp2Enum.STAR1:
                this.m_objTeeen = this.ani;
                break;
        }
        this.play();
    }

    public stop(): void {
        if (this.inited && this.m_objTeeen) {
            this.m_objTeeen.setPosition(0, true);
            //this.m_objTeeen = null;
        }
    }

    public play(): void {
        if (this.inited && this.m_objTeeen) {
            this.m_objTeeen.play(0);
        }
    }
}