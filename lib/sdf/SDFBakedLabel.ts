/**
 * SDFBakedLabel —— 地图地名等静态文字标签（引擎层 SDF，唯一路径）。
 *
 * 历史：曾走过「离屏烘焙 → 原生 Bitmap」的路线 A（SDFBakeCache）。后改为
 * 引擎层 SDF（Godot 式：atlas BitmapData 打 isSDF 标志 → 引擎 sdf_text program → 单节点单批，
 * 缩放无损、零重烤），烘焙路线已删除。本类保留原 API 与类名，避免 MapNavNpc 改动。
 *
 * 实现：
 *   1. 内部挂 live egret.SDFTextField（SDFTextField.enginePath=true，逐字形 drawImage 单批）；
 *   2. 颜色走 tint（=vColor.rgb），描边走引擎 frag uOutlineWidth/uOutlineColor，
 *      gamma 修正与工具层 SDF_FRAGMENT 一致（对齐原生 eui.Label 粗细）；
 *   3. SDF 不可用 / 字体未就绪 → 回退原生 egret.TextField，绝不空白。
 */
import "module_sdf";

interface IBakeStyle {
    text: string;
    size: number;
    textColor: number;
    bold: boolean;
    stroke: number;
    strokeColor: number;
}

export class SDFBakedLabel extends egret.Sprite {

    public static get available(): boolean {
        return !!(egret as any).SDFTextField;
    }

    /**
     * 强制原生回退开关（A/B 对比用）。
     * true 时 _refresh 一律走原生 egret.TextField，与引擎层 SDF 同页面切换对比。
     * 改后需重进地图（池重建）或调用方 flush 生效。
     */
    public static useNativeFallback: boolean = false;

    /** 存活实例列表：动态烘焙补字后遍历刷新 */
    private static _instances: SDFBakedLabel[] = [];

    public static get instanceCount(): number { return SDFBakedLabel._instances.length; }

    /** 动态烘焙补字成功后的全局刷新（由 SDFBoot.onGlyphAdded 调用） */
    public static refreshAll(): void {
        const list = SDFBakedLabel._instances;
        for (let i = 0; i < list.length; i++) {
            const inst = list[i];
            if (!inst._onStage) continue;
            // 强制标脏：缺字烘焙前 _rebuild 已清掉 _meshDirty，不标脏 flushLayout 不会重排
            if (inst._live && inst._live.markDirty) {
                inst._live.markDirty();
            }
            inst._refresh();
        }
    }

    private _style: IBakeStyle = { text: "", size: 24, textColor: 0xffffff, bold: false, stroke: 0, strokeColor: 0 };
    private _live: any = null;              // live egret.SDFTextField（引擎路径）
    private _tf: egret.TextField = null;    // 字体未就绪/SDF 不可用时的原生回退
    private _pctX: number = 0;
    private _pctY: number = 0;
    private _onStage: boolean = false;
    private _fontHooked: boolean = false;

    public constructor(text?: string) {
        super();
        this.touchEnabled = false;
        this.touchChildren = false;
        this.addEventListener(egret.Event.ADDED_TO_STAGE, this._onAdded, this);
        this.addEventListener(egret.Event.REMOVED_FROM_STAGE, this._onRemoved, this);
        if (text != null) {
            this._style.text = String(text);
        }
    }

    // ---------------- eui.Label 兼容 API ----------------
    public get text(): string { return this._style.text; }
    public set text(v: string) { this._set("text", v == null ? "" : String(v)); }
    public get size(): number { return this._style.size; }
    public set size(v: number) { this._set("size", v); }
    public get textColor(): number { return this._style.textColor; }
    public set textColor(v: number) { this._set("textColor", v); }
    public get bold(): boolean { return this._style.bold; }
    public set bold(v: boolean) { this._set("bold", v); }
    public get stroke(): number { return this._style.stroke; }
    public set stroke(v: number) { this._set("stroke", v); }
    public get strokeColor(): number { return this._style.strokeColor; }
    public set strokeColor(v: number) { this._set("strokeColor", v); }

    /** 百分比锚点（MapNavNpc 用 50/50 居中）：存百分比，按内容尺寸换算 anchorOffset。 */
    public set percentAnchorOffsetX(v: number) { this._pctX = v; this._applyAnchor(); }
    public get percentAnchorOffsetX(): number { return this._pctX; }
    public set percentAnchorOffsetY(v: number) { this._pctY = v; this._applyAnchor(); }
    public get percentAnchorOffsetY(): number { return this._pctY; }

    /** 池回收 / 销毁时调用。 */
    public disposeSDF(): void {
        if (this._live) {
            this._live.parent && this._live.parent.removeChild(this._live);
            this._live = null;
        }
    }

    private _set(k: string, v: any): void {
        if ((this._style as any)[k] === v) {
            return;
        }
        (this._style as any)[k] = v;
        if (this._onStage) {
            this._refresh();
        }
    }

    private _onAdded(): void {
        this._onStage = true;
        if (SDFBakedLabel._instances.indexOf(this) < 0) {
            SDFBakedLabel._instances.push(this);
        }
        this._refresh();
    }

    private _onRemoved(): void {
        this._onStage = false;
        const i = SDFBakedLabel._instances.indexOf(this);
        if (i >= 0) {
            SDFBakedLabel._instances.splice(i, 1);
        }
    }

    private _onFontReady(): void {
        if (this._onStage && !this._live) {
            this._refresh();
        }
    }

    private _refresh(): void {
        // A/B 对比：强制原生回退
        if (SDFBakedLabel.useNativeFallback) {
            console.log("[SDF][DEBUG-refresh] 原生分支: '" + this._style.text + "' _live=" + (this._live ? "有" : "无") + " _tf前=" + (this._tf ? "有" : "无"));
            if (this._live) { this._live.visible = false; }
            this._ensureFallback();
            this._applyFallback();
            this._applyAnchor();
            console.log("[SDF][DEBUG-refresh] 原生完成: _tf.text='" + this._tf.text + "' _tf.visible=" + this._tf.visible + " textWidth=" + this._tf.textWidth + " this.x=" + this.x + " this.y=" + this.y);
            return;
        }
        const SDFT: any = (egret as any).SDFTextField;
        if (this._tf) { this._tf.visible = false; }

        if (!SDFT || !SDFT.isFontLoaded || !SDFT.isFontLoaded()) {
            console.log("[SDF][DEBUG-refresh] 字体未就绪，走 fallback: " + this._style.text);
            this._ensureFallback();
            this._applyFallback();
            this._hookFontReadyOnce();
            this._applyAnchor();
            return;
        }
        if (!this._live) {
            SDFT.enginePath = true; // 承诺走引擎 sdf_text program
            this._live = new SDFT();
            this._live.touchEnabled = false;
            this._live.touchChildren = false;
            this.addChild(this._live);
        }
        const s = this._style;
        const f = this._live;
        f.text = s.text;
        f.size = s.size;
        f.textColor = s.textColor;
        f.bold = s.bold;
        f.stroke = s.stroke;
        f.strokeColor = s.strokeColor;
        f.flushLayout();
        this._applyAnchor();
    }

    private _hookFontReadyOnce(): void {
        if (this._fontHooked) {
            return;
        }
        const SDFT: any = (egret as any).SDFTextField;
        if (SDFT && SDFT.onFontReady && SDFT.isFontLoaded && !SDFT.isFontLoaded()) {
            this._fontHooked = true;
            SDFT.onFontReady(() => this._onFontReady());
        }
    }

    private _ensureFallback(): void {
        if (!this._tf) {
            this._tf = new egret.TextField();
            this._tf.touchEnabled = false;
            this.addChild(this._tf);
        }
    }

    private _applyFallback(): void {
        const s = this._style;
        const tf = this._tf;
        tf.text = s.text;
        tf.size = s.size;
        tf.textColor = s.textColor;
        tf.bold = s.bold;
        if (s.stroke > 0) {
            tf.stroke = s.stroke;
            tf.strokeColor = s.strokeColor;
        } else {
            tf.stroke = 0;
        }
        tf.visible = true;
    }

    private _contentSize(): { w: number; h: number } {
        if (this._live && this._live.visible !== false) {
            const w = this._live.width != null ? this._live.width : 0;
            const h = this._live.height != null ? this._live.height : 0;
            return { w, h };
        }
        if (this._tf && this._tf.visible) {
            return { w: this._tf.textWidth, h: this._tf.textHeight };
        }
        return { w: 0, h: 0 };
    }

    private _applyAnchor(): void {
        const c = this._contentSize();
        this.anchorOffsetX = c.w * this._pctX / 100;
        this.anchorOffsetY = c.h * this._pctY / 100;
    }
}
