/**
 * 世界人物名字的 SDF 版标签。
 *
 * 目的：顶替 NameComponent 里的 eui.Label，行为对齐它实际用到的那部分 API，
 * 使 NameComponent 的改动降到最小。
 *
 * 背景：世界层 UIManager.WorldPanel 默认被 Camera 放大 1.3 倍
 * （scene_define.cameraDefaultScale），而名字 size 只有 16，
 * 原生 TextField 按 16px 光栅化后被 GPU 拉伸 → 糊。
 * SDF 是距离场，任意缩放都由 shader 的 fwidth() 保证 1 像素抗锯齿带。
 */

// 副作用导入：注册 window.SDF / egret.SDFTextField。
// 必须在本模块体（class ... extends egret.SDFTextField）求值之前执行，
// import 语句会被提升到 require 顶部，满足这个顺序。
import "module_sdf";
import { SDFBoot } from "lib/sdf/SDFBoot";

export class SDFFont {
    /** A/B 开关：false 时 NameComponent 走原生 eui.Label */
    public static enabled: boolean = true;

    private static loadPromise: Promise<void> = null;

    public static get available(): boolean {
        return !!(egret as any).SDFTextField;
    }

    public static get loaded(): boolean {
        return SDFFont.available && egret.SDFTextField.isFontLoaded();
    }

    public static ensureLoaded(): Promise<void> {
        if (!SDFFont.loadPromise) {
            if (!SDFFont.available) {
                SDFFont.enabled = false;
                console.error("[SDF] egret.SDFTextField 未注册，检查 libs/sdf 是否被打进包");
                SDFFont.loadPromise = Promise.resolve();
            } else {
                // 复用 SDFBoot 已加载的字体族（默认族 = font_default_s2），
                // 不再单独加载 resource/sdf/font.json，避免与 SDFBoot 争抢默认族、名字用错字体。
                SDFFont.loadPromise = SDFBoot.load();
            }
        }
        return SDFFont.loadPromise;
    }
}

/**
 * 与 eui.Label 在 NameComponent 实际用到的 API 上保持一致：
 *   text / size / textColor / stroke / strokeColor / bold / fontFamily / richmode
 *   visible / anchorOffsetX / textAlign / textWidth
 *   shadow / shadowColor / shadowBlur
 *   TextEvent.DRAW_TEXT 事件
 */
export class SDFNameLabel extends egret.SDFTextField {

    private _shadowOn: boolean = false;

    public constructor(text: string = "") {
        super();
        this.size = 16;
        this.textColor = 0xffffff;
        if (text) {
            this.text = text;
        }
        SDFFont.ensureLoaded().then(() => {
            // 字体可能晚于实例就绪：_rebuild 在无字体时会把 _meshDirty 清掉，
            // 这里必须重新置脏，否则永远不再排版
            this.markDirty();
            this.flushLayout();
            this.dispatchEventWith(egret.TextEvent.DRAW_TEXT);
        });
    }

    public markDirty(): this {
        (this as any)._meshDirty = true;
        return this;
    }

    /** NameComponent 用 textWidth/2 做水平居中锚点 */
    public get textWidth(): number {
        this.flushLayout();
        return this.measuredWidth;
    }

    public get textHeight(): number {
        this.flushLayout();
        return this.measuredHeight;
    }

    /** 原生 shadow 走 canvas 重绘；SDF 里是同一 pass 内的二次采样，零额外开销 */
    public set shadow(v: boolean) {
        this._shadowOn = v;
        if (v) {
            this.shadowOffsetX = 1;
            this.shadowOffsetY = 1;
            this.shadowAlpha = 0.6;
        } else {
            this.shadowOffsetX = 0;
            this.shadowOffsetY = 0;
            this.shadowBlur = 0;
        }
    }
    public get shadow(): boolean { return this._shadowOn; }

    /** 名字没开 richmode，吞掉避免调用方报错 */
    public set richmode(_v: boolean) { /* noop */ }
    public get richmode(): boolean { return false; }
}

// text setter 需要在赋值后立即排版并派发 DRAW_TEXT（对齐原生 Label 行为）。
// 用 descriptor 包装而非 `super.text =`：后者在 ES5 target 下 TS 会编译成
// 对基类原型的赋值，是错的。
(function wrapTextAccessor() {
    if (!SDFFont.available) {
        return;
    }
    const base = Object.getOwnPropertyDescriptor(egret.SDFTextField.prototype, "text");
    if (!base || !base.get || !base.set) {
        return;
    }
    Object.defineProperty(SDFNameLabel.prototype, "text", {
        get: function () {
            return base.get.call(this);
        },
        set: function (v: string) {
            const old = base.get.call(this);
            base.set.call(this, v);
            if (old !== v) {
                this.flushLayout();
                this.dispatchEventWith(egret.TextEvent.DRAW_TEXT);
            }
        },
        enumerable: true,
        configurable: true,
    });

    // SDF 字体族由烘焙时决定，吞掉赋值。
    // 用 Object.defineProperty 覆盖，避免 TS2611（基类是属性，子类用 accessor 覆盖）。
    Object.defineProperty(SDFNameLabel.prototype, "fontFamily", {
        get: function () { return ""; },
        set: function (_v: string) { /* noop */ },
        enumerable: true,
        configurable: true,
    });
})();
