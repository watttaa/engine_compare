import { getResByPath_ } from "utils/ResUtils";
import { GShaderConf } from "./GShaderConf";

export class GShaderUtil
{
    public static addFilters(target:egret.DisplayObject, customFilter:egret.Filter|egret.CustomFilter)
    {
        if (!target)
        {
            return;
        }
        if (target.filters && target.filters.length)
        {
            target.filters = target.filters.concat([customFilter]);
        }
        else
        {
            target.filters = [customFilter]
        }
    }
    public static removeFilters(target:egret.DisplayObject, customFilter:egret.Filter|egret.CustomFilter)
    {
        if (target.filters && target.filters.length)
        {
            let index = target.filters.indexOf(customFilter);
            if (index != -1) 
            {
                if (customFilter instanceof egret.CustomFilter)
                {
                    customFilter.disposeTexture();
                }
                target.filters.splice(index, 1);
            }
            if (!target.filters.length)
            {
                target.filters = [];
            }
        }
    }
    public static removeAllFilters(target:egret.DisplayObject)
    {
        if (!target.filters)
        {
            return;
        }
        let len:number = target.filters.length;
        for (let i:number = 0; i < len; i++)
        {
            let filter = target.filters[i];
            this.removeFilters(target, filter);
        }
    }

    public static getRandomSwing(directionFactor:number,
        windInterval:{min:number, max:number},
        differenceScale:{min:number, max:number},
        minStrengthScale:{min:number, max:number},
        maxStrengthScale:{min:number, max:number},
        onceTimeFactor:{min:number, max:number},
        onceWaveFactor:{min:number, max:number}):GShaderConf.SSwing
    {
        let swing:GShaderConf.SSwing = new GShaderConf.SSwing();
        swing.windInterval= preload_utils_math.random(windInterval.min, windInterval.max);
        swing.directionFactor = Math.random() < 0.5 ? -directionFactor : directionFactor;
        swing.differenceScale = preload_utils_math.random(differenceScale.min, differenceScale.max);
        swing.minStrengthScale = preload_utils_math.random(minStrengthScale.min, minStrengthScale.max);
        swing.maxStrengthScale = preload_utils_math.random(maxStrengthScale.min, maxStrengthScale.max);
        swing.onceTimeFactor = preload_utils_math.random(onceTimeFactor.min, onceTimeFactor.max);
        swing.onceWaveFactor = preload_utils_math.random(onceWaveFactor.min, onceWaveFactor.max);
        return swing;
    }

    public static async getTexture(url:string)
    {
        let texture:egret.Texture = new egret.Texture();
        texture.bitmapData = await getResByPath_(url, (bitmapData:any) => 
        {
            return bitmapData;
        }, this);
        return texture;
    }

    public static createTexture($texture:egret.Texture, bitmapX:number, bitmapY:number, bitmapWidth:number, bitmapHeight:number, offsetX:number = 0, offsetY:number = 0, textureWidth?:number, textureHeight?:number):egret.Texture {
        // let _bitmapX = $texture.$bitmapX - $texture.$offsetX;
        // let _bitmapY = $texture.$bitmapY - $texture.$offsetY;
        let _bitmapX = 0;
        let _bitmapY = 0;
        let scaleFactor = 1;
        
        if (textureWidth === void 0) {
            textureWidth = offsetX + bitmapWidth;
        }
        if (textureHeight === void 0) {
            textureHeight = offsetY + bitmapHeight;
        }
        let texture:egret.Texture = new egret.Texture();
        texture.disposeBitmapData = false;
        texture.$bitmapData = $texture.$bitmapData;
        texture.$initData(
            (_bitmapX + bitmapX) * scaleFactor, 
            (_bitmapY + bitmapY) * scaleFactor, 
            bitmapWidth * scaleFactor, 
            bitmapHeight * scaleFactor, 
            offsetX * scaleFactor, 
            offsetY * scaleFactor, 
            textureWidth * scaleFactor,
            textureHeight * scaleFactor, 
            $texture.$sourceWidth, $texture.$sourceHeight
        );
        texture.$compressAutoScaleFactor = scaleFactor;

        return texture;
    }
}