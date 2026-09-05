import { ModelAdaptUtil } from "avatar/ModelAdaptUtil";
import { kit } from "common/kit";
import { GShaderConf } from "./GShaderConf";
import { GShaderFragment } from "./GShaderFragment";
import { GShaderUtil } from "./GShaderUtil";
import { GShaderVertex } from "./GShaderVertex";

export class GShaderMgr extends SingletonClassEx
{
    destroy() {

    }

    /**
     * 清理shader
     * 1.本来本接口命名为clear，但是它与单例SingletonClassEx里的clear相同，会引发问题，所以命名改为clearShader；
     * @param target 对象实例
     */
    public clearShader(target:egret.DisplayObject)
    {
        if (!target)
        {
            return;
        }
        
        GShaderUtil.removeAllFilters(target);
        target.clearListenerByType(egret.Event.ENTER_FRAME);
    }

    /**
     * 树木随风摆动效果
     * @param target 树木实例
     * @param speedValue 控制播放速度的值
     * @param heightScale 风力高度比例：取值范围0-1，值越大则代表受风力影响的高度越高(为了树的底部区域不受风力影响)
     * @param directionFactor 风力方向：-1表示向左，1表示向右
     * @param windInterval 风力改变间隙时间范围：从范围中随机一个值，单位为摆动时间因子({min:-1, max:-1}代表不随时间改变风力)
     * @param difference 树木差异度范围(大力度控制)：值越大则代表树木摆动的个体差异性越大，值越小则多个树木摆动地越整齐(由于是基于裁剪坐标来计算差异因子，所以相邻树木间的差异度不会很大，以保证树林整体很自然）
     * @param differenceScale 树木差异度比例范围(小力度控制)：取值范围0-1，值越大则代表树木摆动的个体差异性越大
     * @param strength 风力强度(大力度控制)：值越大则树林整体摆动幅度越大
     * @param minStrengthScale 风力强度最小值比例范围(小力度控制)：取值范围0-1，值越大则代表摆动最小时的摆动幅度越大
     * @param maxStrengthScale 风力强度最大值比例范围(小力度控制)：取值范围0-1，值越大则代表摆动最大时的摆动幅度越大
     * @param onceTimeFactor 单次摆动时间因子范围：值越大则单次摆动时间越久
     * @param onceWaveFactor 单次摆动波动因子范围：值越大则单次摆动的波动次数越多
     */
    private static CURR_SWING_VALUE:number = 0;//当前摆动时间因子，缓存它是为了保证所有树木随风摆动的一致性
    private static LAST_SWING_VALUE:number = 0;//上一次改变风力时记录的摆动时间因子
    private static SWING_DATA:GShaderConf.SSwing = null;//摆动效果相关随机参数组成的数据结构：directionFactor、windInterval、differenceScale、minStrengthScale、maxStrengthScale、onceTimeFactor、onceWaveFactor
    public swing(target:egret.DisplayObject, speedValue:number = 0.1,
                 heightScale:number = 0.2, directionFactor:number = 1.0,
                 windInterval:{min:number, max:number} = {min:20, max:100},
                 difference:number = 6.0, differenceScale:{min:number, max:number} = {min:0.8, max:1.0},
                 strength:number = 0.01, minStrengthScale:{min:number, max:number} = {min:0.1, max:0.1}, maxStrengthScale:{min:number, max:number} = {min:0.4, max:0.6},
                 onceTimeFactor:{min:number, max:number} = {min:3.0, max:5.0},
                 onceWaveFactor:{min:number, max:number} = {min:1.0, max:2.0})
    {
        if (!GShaderMgr.SWING_DATA)
        {
            GShaderMgr.SWING_DATA = GShaderUtil.getRandomSwing(directionFactor, windInterval, differenceScale, minStrengthScale, maxStrengthScale, onceTimeFactor, onceWaveFactor);
        }
        let uniforms = {value:0.0,
                        heightScale:heightScale, directionFactor:GShaderMgr.SWING_DATA.directionFactor,
                        difference:difference, differenceScale:GShaderMgr.SWING_DATA.differenceScale,
                        strength:strength, minStrengthScale:GShaderMgr.SWING_DATA.minStrengthScale, maxStrengthScale:GShaderMgr.SWING_DATA.maxStrengthScale,
                        onceTimeFactor:GShaderMgr.SWING_DATA.onceTimeFactor,
                        onceWaveFactor:GShaderMgr.SWING_DATA.onceWaveFactor};
        let customFilter = new egret.CustomFilter(GShaderVertex.VERTEX_SWING, GShaderFragment.FRAGMENT, "swing", uniforms);
        this.clearShader(target);
        GShaderUtil.addFilters(target, customFilter);

        target.clearListenerByType(egret.Event.ENTER_FRAME);
        target.addEventListener(egret.Event.ENTER_FRAME, () =>
        {
            if (customFilter.uniforms.value >= GShaderMgr.CURR_SWING_VALUE)
            {
                GShaderMgr.CURR_SWING_VALUE = customFilter.uniforms.value;
            }

            if (GShaderMgr.SWING_DATA.windInterval != -1 && GShaderMgr.CURR_SWING_VALUE >= GShaderMgr.LAST_SWING_VALUE + GShaderMgr.SWING_DATA.windInterval)
            {
                GShaderMgr.SWING_DATA = GShaderUtil.getRandomSwing(directionFactor, windInterval, differenceScale, minStrengthScale, maxStrengthScale, onceTimeFactor, onceWaveFactor);
                customFilter.uniforms.directionFactor = GShaderMgr.SWING_DATA.directionFactor;
                customFilter.uniforms.differenceScale = GShaderMgr.SWING_DATA.differenceScale;
                customFilter.uniforms.minStrengthScale = GShaderMgr.SWING_DATA.minStrengthScale;
                customFilter.uniforms.maxStrengthScale = GShaderMgr.SWING_DATA.maxStrengthScale;
                customFilter.uniforms.onceTimeFactor = GShaderMgr.SWING_DATA.onceTimeFactor;
                customFilter.uniforms.onceWaveFactor = GShaderMgr.SWING_DATA.onceWaveFactor;

                GShaderMgr.LAST_SWING_VALUE = GShaderMgr.CURR_SWING_VALUE;
            }

            customFilter.uniforms.value = GShaderMgr.CURR_SWING_VALUE;
            customFilter.uniforms.value += speedValue;
        }, this);
    }
    public clearSwing(target:egret.DisplayObject)
    {
        this.clearShader(target);
        GShaderMgr.SWING_DATA = null;
        GShaderMgr.CURR_SWING_VALUE = GShaderMgr.LAST_SWING_VALUE = 0;
    }

    public blurY(target:egret.DisplayObject, blurV: number = 1.0, blurY:number = 0.5) {
        let uniforms = {
            blurV:blurV,
            blurY:blurY,
            textureW: target.width,
            textureH: target.height
        };
        let customFilter = new egret.CustomFilter(GShaderVertex.VERTEX, GShaderFragment.FRAGMENT_BLUR, null, uniforms);
        this.clearShader(target);
        GShaderUtil.addFilters(target, customFilter);
    }

    /**
     * 溶解
     * @param target 溶解的对象实例
     * @param noise 噪声贴图资源路径 or 噪声贴图资源的对象实例
     * @param speedValue 控制溶解速度的值
     * @param edgeScale 边缘区域占比范围：取值范围0-1，值越大则边缘区域越大；所谓边缘区域，可以简单形象地理解为：纸在化作灰烬时周围会先变成黑褐色，这个黑褐色区域就是这里的边缘区域
     * @param hander 溶解完成回调
     * @param clear 溶解完成后是否清理
     */
    public async dissolve(target:egret.DisplayObject, noise:string|egret.Texture = GShaderConf.SNoiseUrl.dissolveNoise1,
                          speedValue:number = 0.01, edgeScale:number = 0.1, hander:kit.Handler = null, clear:boolean = true)
    {
        this.clearShader(target);

        let uniforms = {dissolveFactor:0, edgeScale:edgeScale};
        let customFilter = new egret.CustomFilter(GShaderVertex.VERTEX, GShaderFragment.FRAGMENT_DISSOLVE, "dissolve", uniforms);

        let noiseTexture:egret.Texture = (typeof noise === 'string') ? await GShaderUtil.getTexture(noise) : noise;
        customFilter.textures = {uSamplerNoise:noiseTexture};
        GShaderUtil.addFilters(target, customFilter);

        target.clearListenerByType(egret.Event.ENTER_FRAME);
        target.addEventListener(egret.Event.ENTER_FRAME, () =>
        {
            customFilter.uniforms.dissolveFactor += speedValue;
            if (customFilter.uniforms.dissolveFactor >= 1)
            {
                target.clearListenerByType(egret.Event.ENTER_FRAME);
                if (clear)
                {
                    GShaderUtil.removeFilters(target, customFilter);
                }
                if (hander)
                {
                    hander.run();
                }
            }
        }, this);
    }
 
    /**
     * 反向溶解
     * @param target 溶解的对象实例
     * @param noise 噪声贴图资源路径 or 噪声贴图资源的对象实例
     * @param speedValue 控制溶解速度的值
     * @param edgeScale 边缘区域占比范围：取值范围0-1，值越大则边缘区域越大；所谓边缘区域，可以简单形象地理解为：纸在化作灰烬时周围会先变成黑褐色，这个黑褐色区域就是这里的边缘区域
     * @param hander 溶解完成回调
     * @param clear 溶解完成后是否清理
     */
    public async dissolveReverse(target:egret.DisplayObject, noise:string|egret.Texture = GShaderConf.SNoiseUrl.dissolveNoise1,
                                 speedValue:number = 0.01, edgeScale:number = 0.1, hander:kit.Handler = null, clear:boolean = true)
    {
        this.clearShader(target);

        let uniforms = {dissolveFactor:0, edgeScale:edgeScale}
        let customFilter = new egret.CustomFilter(GShaderVertex.VERTEX, GShaderFragment.FRAGMENT_DISSOLVE_REVERSE, "dissolveReverse", uniforms);

        let noiseTexture:egret.Texture = (typeof noise === 'string') ? await GShaderUtil.getTexture(noise) : noise;
        customFilter.textures = {uSamplerNoise:noiseTexture};
        GShaderUtil.addFilters(target, customFilter);

        target.clearListenerByType(egret.Event.ENTER_FRAME);
        target.addEventListener(egret.Event.ENTER_FRAME, () =>
        {
            customFilter.uniforms.dissolveFactor += speedValue;
            if (customFilter.uniforms.dissolveFactor >= 1)
            {
                target.clearListenerByType(egret.Event.ENTER_FRAME);
                if (clear)
                {
                    GShaderUtil.removeFilters(target, customFilter);
                }
                if (hander)
                {
                    hander.run();
                }
            }
        }, this);
    }

    /**
     * 溶解切换
     * @param target1 溶解前的对象实例
     * @param target2 溶解后的对象实例
     * @param noise 噪声贴图资源路径 or 噪声贴图资源的对象实例
     * @param speedValue 控制溶解速度的值
     * @param edgeScale 边缘区域占比范围：取值范围0-1，值越大则边缘区域越大；所谓边缘区域，可以简单形象地理解为：纸在化作灰烬时周围会先变成黑褐色，这个黑褐色区域就是这里的边缘区域
     * @param hander 溶解完成回调
     * @param clear 溶解完成后是否清理
     */
    public async dissolveSwitch(target1:egret.DisplayObject, target2:egret.DisplayObject, noise:string|egret.Texture = GShaderConf.SNoiseUrl.dissolveNoise1,
                                speedValue:number = 0.01, edgeScale:number = 0.1, hander:kit.Handler = null, clear:boolean = true)
    {
        let noiseTexture:egret.Texture = (typeof noise === 'string') ? await GShaderUtil.getTexture(noise) : noise;

        this.dissolve(target1, noiseTexture, speedValue, edgeScale, null, clear);
        this.dissolveReverse(target2, noiseTexture, speedValue, edgeScale, hander, clear);
    }

    /**
     * 动态模糊
     * @param target 被应用动态模糊效果的对象实例
     * @param motionFactor 运动因子：即物体的运动幅度的阈值，如果运动幅度小于该阈值，则不应用动态模糊效果
     * @param occlusionFactor 遮挡因子：即物体运动时与其幻影遮挡幅度的阈值，如果物体与其幻影遮挡幅度小于该阈值，则不应用动态模糊效果
     * @param blurFactor 模糊因子：即物体运动时的模糊程度
     * @param blendFactor 混合因子：即物体动动时其幻影与主身颜色值的混合程度
     * @param intervalFrame 间隔帧数：即间隔多少帧后传递一次上一帧RT给片段着色器
     */
    public motionBlur(target:egret.DisplayObject, motionFactor:number = 0.5, occlusionFactor:number = 0.5, blurFactor:number = 0.1, blendFactor:number = 0.8, intervalFrame:number = 1)
    {
        // 清理动态模糊滤镜
        this.clearShader(target);

        // 初始化动态模糊滤镜
        let uniforms = {usePrevious:false, motionFactor:motionFactor, occlusionFactor:occlusionFactor, blurFactor:blurFactor, blendFactor:blendFactor};
        let customFilter = new egret.CustomFilter(GShaderVertex.VERTEX, GShaderFragment.FRAGMENT_MOTION_BLUR, "motionBlur", uniforms);
        let previousRenderTarget:egret.RenderTexture = null;
        customFilter.textures = {uPreviousSampler:previousRenderTarget};
        target.filters = [customFilter];

        let curFrame:number = 0;
        let tryUpdateRenderTarget = ()=>
        {
            curFrame++;

            if (curFrame == intervalFrame)
            {
                curFrame = 0;

                // 传递上一帧RT
                if (previousRenderTarget)
                {
                    customFilter.uniforms.usePrevious = true;
                    customFilter.textures = {uPreviousSampler:previousRenderTarget};
                    target.filters = [customFilter];
                }
                else
                {
                    customFilter.uniforms.usePrevious = false;
                }
        
                // 销毁上一帧RT
                if (previousRenderTarget)
                {
                    previousRenderTarget.dispose();
                }
                
                // 绘制上一帧RT
                let currentRenderTarget = new egret.RenderTexture();
                currentRenderTarget.drawToTexture(target, target.getBounds());
                previousRenderTarget = currentRenderTarget;
            }
        };
    
        // 每帧调用一次tryUpdateRenderTarget()
        tryUpdateRenderTarget();
        target.addEventListener(egret.Event.ENTER_FRAME, tryUpdateRenderTarget, this);
    }
    
    // if (customFilter.uniforms.texture)
    // {
    //     let bitmapData = new egret.BitmapData();
    //     bitmapData.webGLTexture = customFilter.uniforms.texture;
    //     previousRenderTarget = new egret.Texture();
    //     previousRenderTarget.bitmapData = bitmapData;
    // }

    /**
     * 基于序列帧动画的动态模糊
     * @param movieClip 序列帧动画对象实例
     * @param container 序列帧动画容器：它是用于设置动态模糊滤镜和绘制上一帧RT的对象实例（暂时没找到更好的办法，很忧伤）
     * @param motionFactor 运动因子：即物体的运动幅度的阈值，如果运动幅度小于该阈值，则不应用动态模糊效果
     * @param occlusionFactor 遮挡因子：即物体运动时与其幻影遮挡幅度的阈值，如果物体与其幻影遮挡幅度小于该阈值，则不应用动态模糊效果
     * @param blurFactor 模糊因子：即物体运动时的模糊程度
     * @param blendFactor 混合因子：即物体动动时其幻影与主身颜色值的混合程度
     * @param intervalFrame 间隔帧数：即间隔多少帧后传递一次上一帧RT给片段着色器
     */
    public movieClipMotionBlur(movieClip:egret.MovieClip, container:egret.DisplayObject = null, motionFactor:number = 1.0, occlusionFactor:number = 0.5, blurFactor:number = 0.1, blendFactor:number = 1.0, intervalFrame:number = 1)
    {
        // 不符合动态模糊条件的直接返回
        if (!movieClip?.movieClipData?.mcData?.[ModelAdaptUtil.FRAME_INTERPOLATION] || !movieClip?.parent)
        {
            return;
        }

        /*****以下为变量*****/
        let maxBounds:egret.Rectangle;
        let dictFrameRes:{[res:string]:egret.Texture} = {};
        let preRenderTarget:egret.Texture = null;
        let curTargetFrameLabel:string;
        let curBlendFactor:number;
        let curFrame:number = 0;
        /*****以上为变量*****/

        /*****以下为接口*****/
        /**清理动态模糊*/
        let clear = ()=>
        {
            container && this.clearShader(container);

            movieClip && movieClip.removeEventListener(egret.Event.ENTER_FRAME, updateRenderTarget, this);

            for (let res in dictFrameRes)
            {
                dictFrameRes[res].dispose();
                delete dictFrameRes[res];
            }

            if (preRenderTarget)
            {
                preRenderTarget.dispose();
                preRenderTarget = null;
            }
        };

        /**更新RT*/
        let updateRenderTarget = ()=>
        {
            curFrame++;

            if (curFrame == intervalFrame)
            {
                curFrame = 0;

                // 传递上一帧RT
                if (preRenderTarget)
                {
                    customFilter.uniforms.usePrevious = true;
                    customFilter.uniforms.blendFactor = curBlendFactor;
                    customFilter.textures = {uPreviousSampler:preRenderTarget};
                    container.filters = [customFilter];
                }
                else
                {
                    customFilter.uniforms.usePrevious = false;
                }
        
                // 重置上一帧RT
                resetPreRenderTarget();
            }
        };

        /**重置上一帧RT*/
        let resetPreRenderTarget = ()=>
        {
            // 默认将上一帧RT置为null
            preRenderTarget = null;

            // 容错处理
            let movieClipData:egret.MovieClipData = movieClip?.movieClipData;
            if (!movieClipData || !container)
            {
                return;
            }

            // 获取当前帧RT并缓存
            let curFrameNum:number = movieClip.currentFrame;
            let curFrameInfo = movieClipData.getKeyFrameData(curFrameNum);
            let curFrameRes:string = curFrameInfo.res;
            if (!(curFrameRes in dictFrameRes))
            {
                // getTextureByFrame获取到的是一个SpriteSheet，是一张由多个子位图拼接而成的集合位图，它包含多个Texture对象，而非单帧的Texture，所以，只能弃用getTextureByFrame，改为drawToTexture
                let curRenderTarget = new egret.RenderTexture();
                let containerBounds = container.getBounds();
                console.log("containerBounds:", containerBounds.x, containerBounds.y, containerBounds.width, containerBounds.height);
                console.log("maxBounds:", maxBounds.x, maxBounds.y, maxBounds.width, maxBounds.height);
                curRenderTarget.drawToTexture(container, containerBounds);
                dictFrameRes[curFrameRes] = curRenderTarget;
            }

            // 如果当前帧是在切换动作，则跳过
            if (movieClip.currentFrameLabel != curTargetFrameLabel)
            {
                curTargetFrameLabel = movieClip.currentFrameLabel;
                return;
            }

            // 获取当前帧的上一个资源帧数据
            let lastResFrameRes:string = null;
            let curResFrameCount:number = 0;// 当前帧与上一个资源帧的间隔帧数
            for (let i:number = curFrameNum - 1; i >= 1; i--)
            {
                let frameInfo = movieClipData.getKeyFrameData(i);
                if (!frameInfo)
                {
                    continue;
                }
                let frameRes:string = frameInfo.res;
                curResFrameCount++;
                if (frameRes != curFrameRes)
                {
                    lastResFrameRes = frameRes;
                    break;
                }
            }

            // 获取当前资源帧的总帧数
            let totalResFrameCount:number = 0;
            let len:number = movieClipData.numFrames;
            for (let i:number = 1; i <= len; i++)
            {
                let frameInfo = movieClipData.getKeyFrameData(i);
                let frameRes:string = frameInfo.res;
                if (frameRes == curFrameRes)
                {
                    totalResFrameCount++;
                }
            }

            // 计算curBlendFactor
            if (curResFrameCount == totalResFrameCount)// 当前帧是资源帧的最后一帧，不做动态模糊处理
            {
                return;
            }
            else
            {
                curBlendFactor = blendFactor * (curResFrameCount / totalResFrameCount);
            }

            // 从缓存中获取上一个资源帧对应的RT
            if (dictFrameRes[lastResFrameRes])
            {
                preRenderTarget = dictFrameRes[lastResFrameRes];
            }
        };

        let getMaxBounds = (movieClip:egret.MovieClip)=>
        {
            let movieClipData:egret.MovieClipData = movieClip?.movieClipData;
            if (!movieClipData)
            {
                return null;
            }

            let bounds:egret.Rectangle = movieClip.getBounds();
            let len:number = movieClipData.numFrames;
            for (let i:number = 1; i <= len; i++)
            {
                let frameInfo = movieClipData.getKeyFrameData(i);
                if (frameInfo.x < bounds.x)
                {
                    bounds.x = frameInfo.x;
                }
                if (frameInfo.y < bounds.y)
                {
                    bounds.y = frameInfo.y;
                }

                let frameRes:string = frameInfo.res;
                if (movieClipData.textureData[frameRes].w > bounds.width)
                {
                    bounds.width = movieClipData.textureData[frameRes].w;
                }
                if (movieClipData.textureData[frameRes].h > bounds.height)
                {
                    bounds.height = movieClipData.textureData[frameRes].h;
                }
            }
            return bounds;
        }
        /*****以上为接口*****/

        // 初始化前，先做一下清理工作
        clear();

        // 初始化动态模糊滤镜
        let uniforms = {usePrevious:false, motionFactor:motionFactor, occlusionFactor:occlusionFactor, blurFactor:blurFactor, blendFactor:blendFactor};
        let customFilter = new egret.CustomFilter(GShaderVertex.VERTEX, GShaderFragment.FRAGMENT_MC_MOTION_BLUR, "movieClipMotionBlur", uniforms);
        customFilter.textures = {uPreviousSampler:preRenderTarget};
        container = container ? container : movieClip?.parent?.parent;
        container.filters = [customFilter];
        
        // 初始化bounds
        maxBounds = getMaxBounds(movieClip);
    
        // 每帧调用一次tryUpdateRenderTarget()
        updateRenderTarget();
        movieClip.addEventListener(egret.Event.ENTER_FRAME, updateRenderTarget, this);

        // 销毁序列帧动画时，做一下清理工作
        movieClip.once(egret.Event.REMOVED_FROM_STAGE, ()=>
        {
            clear();
        }, this);
        movieClip.parent.once(egret.Event.REMOVED_FROM_STAGE, ()=>
        {
            clear();
        }, this);
    }
}