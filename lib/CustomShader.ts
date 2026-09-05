import { getResByPath_ } from "utils/ResUtils";

export class CustomShader {

    public static path: string = "resource/assets/shader/"

    public static async addShader(waterTexture: eui.Image): Promise<void> {

        let vertexSrc = await CustomShader.getRes<string>("vertex_shader/vertex_shader1.glsl", null, RES.ResourceItem.TYPE_TEXT);
        let shaderWater = await CustomShader.getRes<string>("source_shader/waterShader.glsl", null, RES.ResourceItem.TYPE_TEXT);
        let customFilter1 = new egret.CustomFilter(
            vertexSrc,
            shaderWater,
            "vertex_shader/vertex_shader1.glsl" + "source_shader/waterShader.glsl",
            {
                // MainColor: [1.0, 0.99, 0.11, 1.0],      //主ui颜色 (1,0.99,0.11,1)
                Glow: 1.0,        //流光强度 1.0   ---需要控制此参数 详情参考动画展示
                Speed01: 0.2,         //流光速度 0.05
                Speed02: -0.2,
                Scale01: 10.0,
                Scale02: 10.0,
                Alpha: 1.0,         //透明度   1
                Time0: 0.0,         //时间time
            }
        );
        let texture: egret.Texture = new egret.Texture
        texture.bitmapData = await CustomShader.getRes<egret.BitmapData>("anim_shader_river_tex_glow.png");
        customFilter1.textures = {
            "TexGlow": texture
        }
        waterTexture.filters = [customFilter1];
        setInterval(() => {
            customFilter1.uniforms.Time0 += 0.05;
        }, 100);
    }


    public static async addLightsweepShader(img: eui.Image): Promise<void> {
        let vertexSrc = await CustomShader.getRes<string>("vertex_shader/vertex_shader1.glsl", null, RES.ResourceItem.TYPE_TEXT);
        //let vertexSrc = CustomShader.vertexSrc;
        let shader = await CustomShader.getRes<string>("source_shader/lightsweepShader.glsl", null, RES.ResourceItem.TYPE_TEXT);
        let customFilter1 = new egret.CustomFilter(
            vertexSrc,
            shader,
            "vertex_shader/vertex_shader1.glsl" + "source_shader/lightsweepShader.glsl",
            {
                //MainColor;      //主ui颜色 (1,0.99,0.11,1)
                Glow: 0.3,      //流光强度 1.0   ---需要控制此参数 详情参考动画展示
                Speed: 0.04,     //流光速度 0.05
                Scale: 1.24,     //流光密度 1.24
                Alpha: 1,        //透明度   1
                Time0: 0.0,      //时间time    
            });
        let texture: egret.Texture = new egret.Texture
        texture.bitmapData = await CustomShader.getRes<egret.BitmapData>("anim_shader_lightsweep_tex_glow.png");
        customFilter1.textures = {
            "TexGlow": texture
        }
        img.filters = [customFilter1];
        img.visible = true;
        setInterval(() => {
            customFilter1.uniforms.Time0 += 0.5;
        }, 100);
    }


    public static async addFcramShader(node: egret.DisplayObject): Promise<void> {
        return;//暂时关闭
        let vertexSrc = await CustomShader.getRes<string>("vertex_shader/vertex_shader2.glsl", null, RES.ResourceItem.TYPE_TEXT);
        let shader = await CustomShader.getRes<string>("source_shader/framShader.glsl", null, RES.ResourceItem.TYPE_TEXT);

        let customFilter2 = new egret.CustomFilter(
            vertexSrc,
            shader,
            "vertex_shader/vertex_shader2.glsl" + "source_shader/framShader.glsl",
            {
                Glow: 1.0,
                Scale: 0.0,
                ScaleX: 0.89,
                ScaleY: 1.0,
                OffsetX: -0.01,
                OffsetY: -0.03,
                Alpha: 1.0,
            }
        );
        let texture: egret.Texture = new egret.Texture
        texture.bitmapData = await CustomShader.getRes<egret.BitmapData>("anim_shader_ink_tex_mask.png");
        customFilter2.textures = {
            "TexMask": texture
        }

        node.filters = [customFilter2];

        let timer;
        let filterUpdate = () => {
            if (customFilter2.uniforms.Scale < 1) {
                customFilter2.uniforms.Scale += 0.02;
            } else {
                if (timer) {
                    egret.clearInterval(timer);
                }
            }
            if (customFilter2.uniforms.Glow < 1) {
                customFilter2.uniforms.Glow += 0.04;
            }

        }
        timer = egret.setInterval(filterUpdate, this, 10);
    }

    public static async addBlendLighterShader(node: egret.DisplayObject): Promise<void> {
        let vsPath = "vertex_shader/vertex_shader1.glsl";
        let psPath = "source_shader/lightenBlendShader.glsl";
        let vertexSrc = await CustomShader.getRes<string>(vsPath, null, RES.ResourceItem.TYPE_TEXT);
        let shader = await CustomShader.getRes<string>(psPath, null, RES.ResourceItem.TYPE_TEXT);
        let customFilter1 = new egret.CustomFilter(
            vertexSrc,
            shader,
            vsPath + psPath,
            );
        node.filters = [customFilter1];
    }
    
    public static async createBitmapByName(name: string) {
        let result = new egret.Bitmap();
        let texture: egret.Texture = new egret.Texture
        texture.bitmapData = await CustomShader.getRes<egret.BitmapData>(name);
        result.texture = texture;
        return result;
    }

    public static async getRes<T>(name: string, thisObj?: any, type?: string): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            getResByPath_(CustomShader.path + name, (data: T) => {
                resolve(data);
            }, thisObj, type)
        })

    }

}

