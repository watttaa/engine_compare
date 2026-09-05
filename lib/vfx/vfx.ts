import { CMovieClip } from "./CMovieClip";

export namespace vfx {

    class GTestConst {
        static aniName: string = "attack"; //"attack" "stand"

        static hostFilename = "resource/assets/model/34005/34005_0/animate0.json";
        static interpolationFilename = "resource/assets/model/34005/34005_1/animate0.json";
    }

    export class CTestVFX {
        private static curStamp: number;

        /**没有补帧*/
        private m_objMovieClip: CMovieClip;

        /**有补帧*/
        private m_objMovieClipInterpolation: CMovieClip;

        constructor() {
            if (!DEBUG) {
                throw new Error("debug env cannot instantiate CTestVFX.");
            }
        }

        private get movieClip() {
            if (!this.m_objMovieClip) {
                this.m_objMovieClip = new CMovieClip();
                this.m_objMovieClip.x = 200;
                this.m_objMovieClip.y = 500;
                UIManager.TopPanel.addChild(this.m_objMovieClip);
            }

            return this.m_objMovieClip;
        }

        private get movieClipInterpolation() {
            if (!this.m_objMovieClipInterpolation) {
                this.m_objMovieClipInterpolation = new CMovieClip();
                this.m_objMovieClipInterpolation.x = 500;
                this.m_objMovieClipInterpolation.y = 500;
                UIManager.TopPanel.addChild(this.m_objMovieClipInterpolation);
            }

            return this.m_objMovieClipInterpolation;
        }

        /**播放左右mc主帧 */
        public run() {
            getMCData(GTestConst.hostFilename, this.onMCDataComplete, this);
        }

        private onMCDataComplete(mcData: MCData) {
            this.movieClip.movieClipData = egret.MovieClipDataFactory.getInstance().generateMovieClipData(mcData.mcData, mcData.mcTexture);
            this.movieClip.gotoAndPlay(GTestConst.aniName, -1);

            this.movieClipInterpolation.addEventListener(egret.Event.LOOP_COMPLETE, () => {
                let curStamp = egret.getTimer();
                let cost = curStamp - (CTestVFX.curStamp || 0);
                // if (CMovieClip.isDebug) {
                //     console.log(`CMovieClip complete cost: ${cost}`);
                // }
                CTestVFX.curStamp = curStamp;
            }, this);

            this.movieClipInterpolation.movieClipData = egret.MovieClipDataFactory.getInstance().generateMovieClipData(mcData.mcData, mcData.mcTexture);
            this.movieClipInterpolation.gotoAndPlay(GTestConst.aniName, -1);
        }

        /**对右mc进行补帧 */
        public runInterpolation() {
            getMCData(GTestConst.interpolationFilename, this.onInterpolationMCDataComplete, this);
        }
        private onInterpolationMCDataComplete(mcData: MCData) {
            let movieClipData = egret.MovieClipDataFactory.getInstance().generateMovieClipData(mcData.mcData, mcData.mcTexture);
            this.movieClipInterpolation.interpolation(movieClipData);
        }


        // =====验证2个分割mc
        // private m1: CMovieClip;
        // private m2: CMovieClip;
        // private m1Data: MCData;
        // private m2Data: MCData;
        // public play2MC() {
        //     getMCData(GTestConst.hostFilename, this.onMC1Complte, this);
        // }
        // private onMC1Complte(mcData: MCData) {
        //     this.m1Data = mcData;
        //     getMCData(GTestConst.interpolationFilename, this.onMC2Complte, this);

        // }
        // private onMC2Complte(mcData: MCData) {
        //     this.m2Data = mcData

        //     this.m1 = new CMovieClip();
        //     this.m1.x = 200;
        //     this.m1.y = 500;
        //     UIManager.TopPanel.addChild(this.m1);
        //     this.m1.movieClipData = egret.MovieClipDataFactory.getInstance().generateMovieClipData(this.m1Data.mcData, this.m1Data.mcTexture);
        //     this.m1.gotoAndPlay("attack", -1);


        //     this.m2 = new CMovieClip();
        //     this.m2.x = 400;
        //     this.m2.y = 500;
        //     UIManager.TopPanel.addChild(this.m2);
        //     this.m2.movieClipData = egret.MovieClipDataFactory.getInstance().generateMovieClipData(this.m2Data.mcData, this.m2Data.mcTexture);
        //     this.m2.gotoAndPlay("attack", -1);
        // }
    }

}