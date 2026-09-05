/**
 * SDF 文本运行时的接入点。
 *
 * 副作用导入 module_sdf（libs/sdf/sdf.js）同步注册三个全局类：
 *   egret.SDFTextField  底层渲染体（egret.Sprite 子类，不参与 eui 布局）
 *   egret.SDFEUILabel   eui.Component 子类，实现 measure/updateDisplayList，参与 eui 布局
 *   egret.SDFEUIButton  eui.Component 子类，背景 + SDF 文本 + 点击
 *
 * eui 组件（label/button）依赖 eui.Component，之前拆成 fetch+eval 是因为裸 `eui`
 * 引用会被 webpack 静态分析成模块依赖、破坏模块链。现在 sdf.js 内已全部改成
 * window.eui，故可随 sdf.js 同步注册，业务代码 extend egret.SDFEUILabel 不再有
 * undefined 风险。
 *
 * 字体加载是异步的，且早于加载建立的实例会被 onFontReady 广播唤醒重新测量，
 * 因此这里只需触发一次加载，调用方不必等待。
 */
import "module_sdf";
// 动态烘焙运行时（零侵入：包住 FontData.getGlyph，缺字时懒烘）
// 顺序敏感：core → baker → atlas → dynamic-font（各自 IIFE 挂 window）
// 用相对路径而非 module_* alias：避开 TsconfigPathsPlugin/hard-source 的解析缓存问题
import "../../../libs/sdf/sdf-analytic-core.js";
import "../../../libs/sdf/sdf-dynamic-baker-v3.js";
import "../../../libs/sdf/sdf-dynamic-atlas.js";
import "../../../libs/sdf/sdf-dynamic-font.js";
import * as opentype from "../../../libs/opentype/opentype.min.js";
import { SDFBakedLabel } from "lib/sdf/SDFBakedLabel";

/**
 * 已烘焙的 SDF 字体族。
 *
 * 每套字体一张独立图集，按族名注册，实例用 fontFamily 选取。
 * 第一个加载成功的成为默认族 —— 所以 s2 正字体必须排在最前。
 *
 * 族名对齐业务代码的写法：GlobalValue.Font === "font_default"，
 * 而 resource/assets/core/font/info.json 里 s2 实际用的是 font_default_s2.ttf
 * （Source Han Sans CN）。两个名字都注册，省得去猜预编译 login 模块里的别名映射。
 * 未注册的族名 getFont() 会回退默认族，不会空白。
 */
const FONTS: { dir: string; family: string; alias?: string[] }[] = [
    // s2 正字体 Source Han Sans CN —— 默认族。
    // 该 ttf 被子集化过，缺 8 个全角标点（：，（）！？…″），烘焙时已回退到 DFPYuanW7 补齐。
    { dir: "resource/sdf/font_default_s2", family: "font_default", alias: ["font_default_s2"] },
    // 登录界面标题专用 HYXiaoLiShuJ（汉仪小隶书），只有 120 字
    { dir: "resource/sdf/font_login", family: "font_login" },
    // s1 的 DFPYuanW7-GB（华康圆体）。s2 不用，留着做 A/B 对照
    { dir: "resource/sdf", family: "font_default_s1" },
];

export class SDFBoot {
    private static $loading: Promise<void> = null;

    /** 三个类是否已注册。未注册时调用方应回退原生。 */
    public static get available(): boolean {
        return !!(egret as any).SDFEUILabel;
    }

    public static get loaded(): boolean {
        return !!(egret as any).SDFTextField && egret.SDFTextField.isFontLoaded();
    }

    public static load(): Promise<void> {
        if (!SDFBoot.$loading) {
            if (!(egret as any).SDFTextField) {
                console.error("[SDF] egret.SDFTextField 未注册，检查 libs/sdf/sdf.js 是否进包");
                SDFBoot.$loading = Promise.resolve();
            } else {
                // SDFEUILabel/SDFEUIButton 已随 module_sdf（libs/sdf/sdf.js）同步注册，
                // 无需再运行时 fetch/注入。字体加载是唯一的异步步骤。
                let chain = Promise.resolve();
                for (const f of FONTS) {
                    chain = chain.then(function () {
                        return egret.SDFTextField.loadFont(f.dir + "/font.json", f.dir, f.family)
                            .then(function () {
                                for (const a of (f.alias || [])) {
                                    egret.SDFTextField.registerFontAlias(a, f.family);
                                }
                            })
                            .catch(function (e) {
                                console.error("[SDF] 字体族 " + f.family + " 加载失败: ", e);
                            });
                    });
                }
                // 兜底：任何未预期的抛出都收敛成 resolve，绝不让启动流程收到未处理拒绝。
                SDFBoot.$loading = chain.catch(function (e) {
                    console.error("[SDF] 初始化链异常，已回退原生: ", e);
                });
                // 字体族加载完成后，后台建立动态烘焙（不阻塞字体就绪广播）
                SDFBoot.$loading = SDFBoot.$loading
                    .then(function () { return SDFBoot.installDynamicBaking(); })
                    .catch(function (e) {
                        console.error("[SDF] 动态烘焙安装失败，缺字将回落原生: ", e);
                    });
            }
        }
        return SDFBoot.$loading;
    }

    /**
     * 在线烘焙安装（A+C 方案）：
     *   A. Defold 式懒烘：缺字首次出现时记 pending → 分帧队列烘 → 标脏重排。
     *   C. 预种子：ttf 就绪后 preBake 已知缺字列表，运行时基本无感。
     * 烘焙源用项目现有 font_default_s2.ttf（子集 7654 字，含当前已知缺字）。
     */
    private static installDynamicBaking(): Promise<void> {
        const SDFT: any = (egret as any).SDFTextField;
        const dyn: any = (window as any).SDFDynamicFont;
        const op: any = (opentype as any);
        if (!SDFT || !dyn || !op) {
            console.warn("[SDF] 动态烘焙依赖未就绪，跳过（缺字回落原生）");
            return Promise.resolve();
        }
        // 只给默认族装动态烘焙（地图/昵称都用默认族）
        const font = SDFT.getFont("font_default");
        const fontData = font && font.fontData;
        if (!fontData) {
            console.warn("[SDF] 默认族未加载，跳过动态烘焙");
            return Promise.resolve();
        }
        return fetch("resource/assets/core/font/font_default_s2.ttf")
            .then(function (r) { return r.arrayBuffer(); })
            .then(function (buf) {
                const parsed = op.parse(buf);
                const dynTextures: any[] = [];
                const ctrl = dyn.install({
                    fontData: fontData,
                    font: parsed,
                    atlasSize: 1024,
                    maxAtlas: 2,
                    maxPerFrame: 4,
                    onCreateAtlas: function (canvas: any, idx: number) {
                        const bmd = new egret.BitmapData(canvas as any);
                        (bmd as any)['isSDF'] = true;
                        (bmd as any)['sdfUniforms'] = SDFBoot._dynUniforms(fontData);
                        const tex = new egret.Texture();
                        tex._setBitmapData(bmd);
                        // 追加到 FontData.atlases（度量按 atlas 下标取宽高）
                        fontData.atlases[idx] = {
                            file: "__dyn_" + idx + "__", width: canvas.width, height: canvas.height
                        };
                        // 追加到 font.textures（引擎 _rebuild 按 atlas 下标取 egret.Texture）
                        font.textures[idx] = tex;
                        dynTextures[idx] = tex;
                        console.log("[SDF] 动态 atlas " + idx + " 已创建 " + canvas.width + "x" + canvas.height);
                    },
                    onUploadCell: function (idx: number, x: number, y: number, imageData: any) {
                        const tex = dynTextures[idx];
                        if (!tex) return;
                        const bmd = tex._bitmapData || tex.bitmapData;
                        if (!bmd) return;
                        const glNS: any = (egret as any).web || egret;
                        try {
                            const gl = glNS.WebGLRenderContext.getInstance().context;
                            if (!bmd.webGLTexture) {
                                // 纹理还没进 GPU：canvas 已被 atlas 更新，标脏让引擎全量上传
                                if (bmd.$invalidate) bmd.$invalidate();
                                return;
                            }
                            gl.bindTexture(gl.TEXTURE_2D, bmd.webGLTexture);
                            gl.texSubImage2D(gl.TEXTURE_2D, 0, x, y,
                                imageData.width, imageData.height,
                                gl.RGBA, gl.UNSIGNED_BYTE, imageData.data);
                        } catch (e) {
                            // 增量失败不致命：下次全量重建即可
                        }
                    },
                    onGlyphAdded: function () {
                        // 标脏重排：让缺字标签下帧走 SDF 渲染（两类标签都刷）
                        SDFBakedLabel.refreshAll();
                        const SDFEUI: any = (egret as any).SDFEUILabel;
                        if (SDFEUI && SDFEUI.refreshAll) SDFEUI.refreshAll();
                    }
                });
                (window as any).__sdfDynamicCtrl = ctrl;
                console.log("[SDF] 动态烘焙已安装，预烘已知缺字");
                const added = ctrl.preBake("乞丐萱姐庄芦洲涧院渺銮寝枕");
                console.log("[SDF] 预烘完成，新增 " + added + " 字");
            });
    }

    /** 构造动态 atlas 的 uniforms（与离线图集一致） */
    private static _dynUniforms(fontData: any): any {
        const SDFT: any = (egret as any).SDFTextField;
        return {
            isMSDF: fontData.type === 'msdf' ? 1 : 0,
            pxRange: fontData.type === 'msdf' ? (fontData.range || 8) : (2 * (fontData.spread || 4)),
            texSize: { x: 1024, y: 1024 },
            boldness: 0,
            outlineWidth: 0,
            outlineColor: { x: 0, y: 0, z: 0, w: 1 },
            gammaInv: SDFT.textGamma > 0 ? 1 / SDFT.textGamma : 1,
            strokeOffset: 0,
            aaFactor: SDFT.aaFactor || 1.5
        };
    }
}

/**
 * 自检：在舞台上挂一组受 eui 布局驱动的 SDF 组件，验证
 * 「进包 → 注册 → 字体加载 → 参与 eui 测量/布局 → 上屏」整条链路。
 * 控制台执行 __sdfCheck() 显示，__sdfCheck(false) 移除。不被任何业务代码调用。
 */
(window as any).__sdfCheck = function (show: boolean = true) {
    const stage = egret.MainContext.instance.stage;
    const OLD = "__sdf_check_panel__";
    const exist = stage.getChildByName(OLD);
    if (exist) {
        stage.removeChild(exist);
    }
    if (!show) {
        return "removed";
    }
    if (!SDFBoot.available) {
        return "SDFEUILabel 未注册";
    }

    const panel = new eui.Group();
    panel.name = OLD;
    panel.x = 40;
    panel.y = 120;
    panel.layout = new eui.VerticalLayout();
    (panel.layout as eui.VerticalLayout).gap = 12;

    const bg = new eui.Rect();
    bg.fillColor = 0x000000;
    bg.fillAlpha = 0.6;
    bg.percentWidth = 100;
    bg.percentHeight = 100;

    const sizes = [16, 24, 48];
    for (const s of sizes) {
        const lbl = new (egret as any).SDFEUILabel();
        lbl.size = s;
        lbl.textColor = 0xffffff;
        lbl.stroke = 0.12;
        lbl.strokeColor = 0x000000;
        lbl.text = `SDF ${s}px 大话西游 12345`;
        panel.addChild(lbl);
    }

    const btn = new (egret as any).SDFEUIButton();
    btn.label = "点我";
    btn.size = 28;
    btn.addEventListener(egret.TouchEvent.TOUCH_TAP, function () {
        console.log("[SDF] 按钮点击生效");
    }, null);
    panel.addChild(btn);

    stage.addChild(panel);
    // eui 的测量/布局是延迟到下一次 validation 才做的，addChild 后同步读 measuredWidth
    // 必然是 0。validateNow() 强制立即走完一遍，读数才有意义。
    panel.validateNow();
    const first = panel.getChildAt(0) as eui.Component;
    return {
        fontLoaded: SDFBoot.loaded,
        children: panel.numChildren,
        panel: `${panel.width} x ${panel.height}`,
        firstLabel: `${first.measuredWidth} x ${first.measuredHeight}`,
        childY: (() => {
            const ys: number[] = [];
            for (let i = 0; i < panel.numChildren; i++) {
                ys.push(panel.getChildAt(i).y);
            }
            return ys;
        })(),
    };
};

/**
 * 压力测试：在 stage 上放 count 个 SDFTextField 和 count 个普通 egret.Bitmap（用 atlas 纹理）交错混排，
 * 复现「大量 SDF + 普通图片同屏」的场景，验证 SDF 渲染是否污染普通图片。
 * mode: 'field' 用裸 SDFTextField（默认），'eui' 用 SDFEUILabel（NameComponent 实际要用的）。
 * 控制台执行 __sdfStress(100) 或 __sdfStress(100,'eui') 显示，__sdfStress(0) 移除。
 */
(window as any).__sdfStress = function (count: number = 60, mode: string = "field") {
    const stage = egret.MainContext.instance.stage;
    const OLD = "__sdf_stress_panel__";
    const exist = stage.getChildByName(OLD);
    if (exist) {
        stage.removeChild(exist);
    }
    if (!count) {
        return "removed";
    }
    const font = (egret.SDFTextField as any).getFont("font_default");
    const atlasTex = font && font.textures && font.textures[0];
    const layer = new egret.Sprite();
    layer.name = OLD;
    for (let i = 0; i < count; i++) {
        // 普通图片：用 SDF atlas 纹理做 egret.Bitmap，若被污染会显示异常
        if (atlasTex) {
            const bmp = new egret.Bitmap(atlasTex);
            bmp.width = 40;
            bmp.height = 40;
            bmp.x = (i % 20) * 48 + 20;
            bmp.y = Math.floor(i / 20) * 90 + 200;
            layer.addChild(bmp);
        }
        // SDF 文字，紧挨着普通图片
        const x = (i % 20) * 48 + 20;
        const y = Math.floor(i / 20) * 90 + 245;
        if (mode === "eui") {
            const lbl = new (egret as any).SDFEUILabel("玩家" + i);
            lbl.size = 16;
            lbl.textColor = 0x75FD8F;
            lbl.fontFamily = "font_default";
            lbl.stroke = 1;
            lbl.strokeColor = 0x000000;
            lbl.x = x;
            lbl.y = y;
            layer.addChild(lbl);
            (lbl as any).validateNow && (lbl as any).validateNow();
        } else {
            const t = new egret.SDFTextField();
            t.size = 16;
            t.textColor = 0x75FD8F;
            t.fontFamily = "font_default";
            t.stroke = 1;
            t.strokeColor = 0x000000;
            t.text = "玩家" + i;
            t.x = x;
            t.y = y;
            t.flushLayout();
            layer.addChild(t);
        }
    }
    stage.addChild(layer);
    return { count, mode, hasAtlas: !!atlasTex, children: layer.numChildren };
};


/**
 * 把登录界面的原生文本换成 SDF。
 *
 * 登录界面不走 eui：它是预编译模块 libs/core/login.js 里的一套私有轻量运行时，
 * 节点类 ExmlLabel 直接继承 egret.TextField，皮肤是硬编码在该文件里的 JSON 树
 * （resource/eui/core/manual/Login.exml 只是源文件，运行时不读）。
 * 所以既不能改 exml，也用不了 SDFEUILabel，只能用底层的 egret.SDFTextField 顶替。
 *
 * 又因为 login.js 之后还会往这些实例上写 text/textColor/visible，不能把原节点删掉，
 * 否则它写到一个已脱离显示列表的对象上，SDF 永远不更新。
 * 做法：原节点留在原位并透明化，再把这几个属性的写入转发到并排的 SDF 上。
 *
 * 控制台执行 __sdfLogin() 替换，__sdfLogin(false) 还原。不被任何业务代码调用。
 */
const SDF_PROXY = "__sdf_proxy__";
// 实例上没有 id（exml2ts 生成的 uiView 里有，但 ExmlLabel 没把它写到实例），
// 故用「锚点文本」定位所在的父容器，再替换该容器下的全部 ExmlLabel。
const SDF_ANCHORS = ["等级：", "昵称：", "服务器"];

/** 图集按族分别烘焙，缺字要对该标签实际用的族查，不能一律查默认族。 */
function missingGlyphs(text: string, family?: string): string[] {
    const font = (egret.SDFTextField as any).getFont(family);
    const fontData = font && font.fontData;
    // 运行时 FontData.glyphs 是 Map，不能用 hasOwnProperty；用它自带的 hasGlyph。
    if (!fontData || typeof fontData.hasGlyph !== "function") {
        return ["<字体未加载>"];
    }
    const miss: string[] = [];
    for (const ch of text) {
        if (ch === " " || ch === "\n") {
            continue;
        }
        if (!fontData.hasGlyph(ch) && miss.indexOf(ch) < 0) {
            miss.push(ch);
        }
    }
    return miss;
}


function collectExmlLabels(root: egret.DisplayObject, out: any[]): void {
    const anyRoot = root as any;
    if (anyRoot && anyRoot.constructor && anyRoot.constructor.name === "ExmlLabel") {
        out.push(anyRoot);
    }
    const container = root as egret.DisplayObjectContainer;
    if (container && container.numChildren) {
        for (let i = 0; i < container.numChildren; i++) {
            collectExmlLabels(container.getChildAt(i), out);
        }
    }
}

/**
 * 解析标签最终送进 canvas 的字体族。
 *
 * 引擎被定制过：egret.js:27537-27541 会先取 default_fontFamily 兜底，
 * 再过一遍 TextField.fontFamily_map。登录模块 setDefaultFont/switchServer 建立的链是
 *   (未写 fontFamily) → default_fontFamily "font_default" → map → "font_default_s2"
 * 所以原生用的就是 s2 正字体，不是 Arial 的系统回退。
 */
function resolveNativeFamily(label: any): string {
    const TF = egret.TextField as any;
    const family = label.fontFamily || TF.default_fontFamily || "Arial";
    const map = TF.fontFamily_map;
    return (map && map[family]) || family;
}

/**
 * 原生 egret.TextField 的基线相对自身 y 的偏移。
 *
 * 三段叠加：
 *  1. egret.js:27635 的 WebGL 分支，单行时 drawY = h/2（h = lineSpacing + size），
 *     绘制 y = drawY + h - size/2 + 2 = size + 2。
 *     该分支成立的前提是 textAtlasRenderEnable 为假 —— egret.web.js:12279 定义为 false，
 *     全项目无处置真，故恒走这条。
 *  2. egret.web.js:11419-11421 的定制逻辑 buffer.$offsetY += node.fontFamilyOffsetY，
 *     取自 TextField.fontFamily_offset[族]。登录模块设的是 [0, -2]，即整体上移 2px。
 *  3. egret.js:21804 把 textBaseline 设为 'bottom'，锚在字体包围盒下沿，
 *     故还要减去 fontBoundingBoxDescent。
 */
function nativeBaselineY(label: any): number {
    const TF = egret.TextField as any;
    const size = label.size || 24;
    const family = resolveNativeFamily(label);

    let fontOffsetY = 0;
    const offsetTable = TF.fontFamily_offset;
    if (offsetTable) {
        // 引擎先按映射后的族查，查不到再用 map_reverse 回查原名（egret.js:27545）
        let target = family;
        if (!offsetTable[family] && TF.fontFamily_map_reverse && TF.fontFamily_map_reverse[family]) {
            target = TF.fontFamily_map_reverse[family];
        }
        if (offsetTable[target]) {
            fontOffsetY = offsetTable[target][1] || 0;
        }
    }
    if (TF.defaultFontOffset) {
        fontOffsetY += TF.defaultFontOffset[1] || 0;
    }

    let descent = size * 0.14;
    try {
        const ctx = document.createElement("canvas").getContext("2d");
        ctx.font = (label.bold ? "bold " : "") + size + "px '" + family + "'";
        const m: any = ctx.measureText("字");
        if (typeof m.fontBoundingBoxDescent === "number") {
            descent = m.fontBoundingBoxDescent;
        }
    } catch (e) {
        // 老浏览器没有 fontBoundingBoxDescent，用字库的 descender 比例兜底
    }
    return size + 2 + fontOffsetY - descent;
}

/** SDFTextField 的基线相对自身 y 的偏移 = ascender * 缩放。各族度量不同，必须按族取。 */
function sdfBaselineY(size: number, family?: string): number {
    const font = (egret.SDFTextField as any).getFont(family);
    const fontData = font && font.fontData;
    if (!fontData) {
        return size;
    }
    return fontData.ascender * (size / fontData.baseSize);
}

function proxyToSDF(label: any): string {
    if (label[SDF_PROXY]) {
        return "已替换";
    }
    const parent = label.parent as egret.DisplayObjectContainer;
    if (!parent) {
        return "不在显示列表";
    }

    const sdf = new egret.SDFTextField();
    sdf.size = label.size || 24;
    // exml 的状态属性会把 fontFamily/bold 写到实例上（如「服务器」在 s2 状态下
    // 是 font_login + bold）。不透传就会用错字体、丢掉字重，看着比原生细。
    // 族名没烘过时 getFont() 回退默认族，不会空白。
    sdf.fontFamily = label.fontFamily || null;
    sdf.bold = !!label.bold;
    sdf.textColor = label.textColor;
    // egret.TextField.stroke 是像素宽度；SDF 内部按 stroke/(2*spread) 归一化，
    // 数值语义一致（都是 baseSize 下的像素），直接透传。
    sdf.stroke = label.stroke || 0;
    sdf.strokeColor = label.strokeColor;
    // 盒模型：width/height 是 textAlign/verticalAlign 的对齐参考容器。
    // 只在标签**显式设过** width/height 时透传 —— egret 的 width getter 会用
    // measuredWidth 兜底，没显式设的也返回正数，塞给 SDF 的 _maxWidth 会让
    // textAlign:center 的居中公式 (maxWidth-lineWidth)/2 偏移 1~2px（等级标签错位）。
    // 判据用 $explicitWidth：NaN 表示没显式设，此时让 SDF 用自己的 measuredWidth。
    const ew = (label as any).$explicitWidth;
    if (!isNaN(ew) && ew > 0) { sdf.width = ew; }
    const eh = (label as any).$explicitHeight;
    if (!isNaN(eh) && eh > 0) { sdf.height = eh; }
    sdf.textAlign = label.textAlign || "left";
    sdf.verticalAlign = label.verticalAlign || "top";
    sdf.x = label.x;
    // 按基线对齐，不是按左上角对齐 —— 两者的 y 语义不同：
    // TextField.y 是行盒顶（基线在其下 nativeBaselineY 处），
    // SDFTextField.y 也是行盒顶（基线在其下 ascender*scale 处），但两个基线位置不等。
    sdf.y = label.y + nativeBaselineY(label) - sdfBaselineY(label.size || 24, label.fontFamily);
    sdf.text = label.text || "";
    sdf.flushLayout();
    parent.addChildAt(sdf, parent.getChildIndex(label) + 1);

    label.alpha = 0;
    label[SDF_PROXY] = sdf;

    // 逐属性把写入转发到 SDF。取基类 descriptor 而非直接赋值，
    // 否则 setter 内再写 this.text 会无限递归。
    const forward = [
        { prop: "text", apply: (v: any) => { sdf.text = v == null ? "" : String(v); sdf.flushLayout(); } },
        { prop: "textColor", apply: (v: any) => { sdf.textColor = v; } },
        { prop: "size", apply: (v: any) => { sdf.size = v; } },
        { prop: "bold", apply: (v: any) => { sdf.bold = !!v; } },
        { prop: "fontFamily", apply: (v: any) => { sdf.fontFamily = v || null; sdf.flushLayout(); } },
        { prop: "stroke", apply: (v: any) => { sdf.stroke = v || 0; } },
        { prop: "strokeColor", apply: (v: any) => { sdf.strokeColor = v; } },
        // width/height 只在显式设过时透传（理由同初始化处注释），
        // forward 触发时 label.$explicitWidth 已是新值，直接判 isNaN 即可。
        { prop: "width", apply: (v: any) => { if (!isNaN(v) && v > 0) { sdf.width = v; } } },
        { prop: "height", apply: (v: any) => { if (!isNaN(v) && v > 0) { sdf.height = v; } } },
        { prop: "textAlign", apply: (v: any) => { sdf.textAlign = v || "left"; } },
        { prop: "verticalAlign", apply: (v: any) => { sdf.verticalAlign = v || "top"; } },
        { prop: "visible", apply: (v: any) => { sdf.visible = v; } },
    ];
    for (const f of forward) {
        const base = Object.getOwnPropertyDescriptor(egret.TextField.prototype, f.prop)
            || Object.getOwnPropertyDescriptor(egret.DisplayObject.prototype, f.prop);
        if (!base || !base.get || !base.set) {
            continue;
        }
        Object.defineProperty(label, f.prop, {
            get: function () { return base.get.call(this); },
            set: function (v: any) { base.set.call(this, v); f.apply(v); },
            enumerable: true,
            configurable: true,
        });
    }
    return "ok";
}

function restoreLabel(label: any): void {
    const sdf = label[SDF_PROXY];
    if (!sdf) {
        return;
    }
    for (const prop of ["text", "textColor", "size", "bold", "fontFamily", "stroke", "strokeColor", "width", "height", "textAlign", "verticalAlign", "visible"]) {
        delete label[prop];
    }
    if (sdf.parent) {
        sdf.parent.removeChild(sdf);
    }
    label.alpha = 1;
    label[SDF_PROXY] = null;
}

(window as any).__sdfLogin = function (on: boolean = true) {
    const labels: any[] = [];
    collectExmlLabels(egret.MainContext.instance.stage, labels);
    if (labels.length === 0) {
        return "没找到 ExmlLabel，登录界面可能已关闭";
    }

    // 锚点所在的父容器即目标区域
    const parents: any[] = [];
    for (const label of labels) {
        if (SDF_ANCHORS.indexOf(label.text) >= 0 && label.parent && parents.indexOf(label.parent) < 0) {
            parents.push(label.parent);
        }
    }
    const targets = labels.filter(function (l) { return parents.indexOf(l.parent) >= 0; });
    if (targets.length === 0) {
        console.table(labels.map(function (l, i) {
            return { i: i, text: l.text, x: l.x, y: l.y, size: l.size };
        }));
        return "锚点没命中，见上表";
    }

    const result: any[] = [];
    for (const label of targets) {
        if (!on) {
            restoreLabel(label);
            result.push({ text: label.text, r: "restored" });
            continue;
        }
        const miss = missingGlyphs(label.text || "", label.fontFamily);
        if (miss.length > 0) {
            result.push({ text: label.text, 族: label.fontFamily || "(默认)", r: "跳过·缺字 " + miss.join("") });
            continue;
        }
        result.push({
            text: label.text,
            size: label.size,
            族: label.fontFamily || "(默认)",
            bold: !!label.bold,
            stroke: label.stroke || 0,
            r: proxyToSDF(label),
        });
    }
    console.table(result);
    return { 扫到ExmlLabel: labels.length, 目标区域内: targets.length };
};

/**
 * 把已替换的 SDF 切到另一套字体族，当场对比字形差异。
 * __sdfFont("font_default_s1") 切华康圆体，__sdfFont("font_default") 切回思源黑体。
 * 不传参数则列出所有已注册的族。
 */
(window as any).__sdfFont = function (family?: string) {
    const all = (egret.SDFTextField as any).getFontFamilies();
    if (!family) {
        return { 已注册: all, 默认: (egret.SDFTextField as any)._defaultFamily };
    }
    if (all.indexOf(family) < 0) {
        return "没有这个族，已注册的是 " + all.join(" / ");
    }
    const labels: any[] = [];
    collectExmlLabels(egret.MainContext.instance.stage, labels);
    let n = 0;
    for (const label of labels) {
        const sdf = label[SDF_PROXY];
        if (sdf) {
            sdf.fontFamily = family;
            sdf.flushLayout();
            n++;
        }
    }
    return { 切到: family, 生效: n };
};

/**
 * 微调所有已替换 SDF 的垂直/水平偏移，用于当场量出理论值与实际的残差。
 * __sdfNudge(dy) 或 __sdfNudge(dy, dx)，累加生效。
 */
(window as any).__sdfNudge = function (dy: number = 0, dx: number = 0) {
    const labels: any[] = [];
    collectExmlLabels(egret.MainContext.instance.stage, labels);
    let n = 0;
    for (const label of labels) {
        const sdf = label[SDF_PROXY];
        if (sdf) {
            sdf.y += dy;
            sdf.x += dx;
            n++;
        }
    }
    return { 调整了: n, dy: dy, dx: dx };
};

/**
 * 字重差异探针。回答「为什么原生看着比 SDF 粗」，用测量不用目测。
 *
 * 三件事：
 *  1. 原生标签到底带了什么属性（bold/stroke/fontFamily）—— 决定它是否被加粗过
 *  2. 浏览器实际解析到哪个字体 —— 没加载到 webfont 会静默退回系统字体（微软雅黑比思源黑体重）
 *  3. 同一串字，原生排版宽度 vs SDF 排版宽度 —— 字面宽度是字形的指纹，差得多就说明根本不是同一套字
 */
(window as any).__sdfProbe = function () {
    const ctx = document.createElement("canvas").getContext("2d");

    /** 该族名是否真被浏览器解析到。
     *  对比两个肯定不同的兜底族（serif vs sans-serif）量同一字，建立基准；
     *  再量目标族，若和两个兜底都不同才算真解析到。
     *  之前用 monospace 单基准，若目标族恰好和 monospace 同宽会误判 false。 */
    function resolved(family: string, size: number, text: string): boolean {
        ctx.font = size + "px serif";
        const wSerif = ctx.measureText(text).width;
        ctx.font = size + "px sans-serif";
        const wSans = ctx.measureText(text).width;
        ctx.font = size + "px '" + family + "', sans-serif";
        const w = ctx.measureText(text).width;
        // 目标族量出来和两个兜底都不同 → 真加载了
        return Math.abs(w - wSerif) > 0.5 && Math.abs(w - wSans) > 0.5;
    }

    const TF = egret.TextField as any;
    console.log("default_fontFamily =", TF.default_fontFamily);
    console.log("fontFamily_map =", TF.fontFamily_map);
    console.log("fontFamily_offset =", TF.fontFamily_offset);
    console.log("textAtlasRenderEnable =", (egret as any).textAtlasRenderEnable);
    console.log("canvasScale =", (egret as any).sys.DisplayList.$canvasScaleX, (egret as any).sys.DisplayList.$canvasScaleY);
    console.log("SDF 已注册族:", (egret.SDFTextField as any).getFontFamilies());

    const defFamily = TF.default_fontFamily;
    const families = ["font_default", "font_default_s1", "font_default_s2", "font_login", defFamily];
    const fontCheck: any[] = [];
    const seen: string[] = [];
    for (const f of families) {
        if (!f || seen.indexOf(f) >= 0) { continue; }
        seen.push(f);
        const mapped = (TF.fontFamily_map && TF.fontFamily_map[f]) || f;
        fontCheck.push({ 族: f, 映射到: mapped, 浏览器已解析: resolved(mapped, 24, "永国字") });
    }
    console.table(fontCheck);

    const labels: any[] = [];
    collectExmlLabels(egret.MainContext.instance.stage, labels);
    const rows: any[] = [];
    for (const label of labels) {
        const sdf = label[SDF_PROXY];
        if (!sdf) { continue; }
        const size = label.size || 24;
        const family = resolveNativeFamily(label);
        ctx.font = (label.bold ? "bold " : "") + size + "px '" + family + "'";
        rows.push({
            text: label.text,
            size: size,
            bold: !!label.bold,
            stroke: label.stroke || 0,
            原生族: family,
            SDF族: sdf.fontFamily || "(默认)",
            原生宽: +ctx.measureText(label.text || "").width.toFixed(1),
            SDF宽: +sdf.measuredWidth.toFixed(1),
            基线偏移: +nativeBaselineY(label).toFixed(2),
        });
    }
    console.table(rows);
    return "原生族与 SDF族 一致、宽度差 <2% → 字形同源，粗细差异只可能来自光栅化 gamma";
};

/**
 * 浏览器内实测浏览器的文本光栅器 gamma。
 *
 * ⚠️ **局限**：浏览器 fillText 走 hinting（轮廓 snap 到像素网格），fill(path) 不 hinting，
 * 逐像素配对比较的是不同位置的像素，反解出的 gamma 拟合了 hinting 噪声，不是真值。
 * 实测 Edge SS=8→2.86、SS=16→3.05、SS=32→3.05（SS 翻倍不收敛 → 代理被污染），
 * 曲线在几何α=0.275 处原生α<几何α（gamma>1 时不可能），证明配对失效。
 * 故本函数量出的 gamma **不可直接当 textGamma 用**。
 *
 * 真值来自离线 napi-canvas（无 hinting）= 2.23 ≈ 2.2，textGamma 取 1.8 是 Red Blob Games
 * 经验值追 hinted 原生观感。详见 SDF-CENTERING-GUIDE.md 差异一。
 *
 * 保留本函数用于：观察曲线形状、确认族名是否被浏览器解析、调试光栅化差异。
 */
(window as any).__sdfGamma = function (size: number = 24, text: string = "等是中在的", SS: number = 8) {
    const TF = egret.TextField as any;
    const family = (TF.fontFamily_map && TF.fontFamily_map[TF.default_fontFamily]) || TF.default_fontFamily || "sans-serif";

    // 画布：字号 5 倍见方，基线居中。penX 留 1.5 倍字号防负 bearing 被裁。
    const W = Math.ceil(size * 5), H = Math.ceil(size * 5);
    const penX = Math.round(size * 1.5);
    const baseY = Math.round(H / 2);

    // 原生侧：目标字号 fillText
    const nc = document.createElement("canvas");
    nc.width = W; nc.height = H;
    const nctx = nc.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D;
    nctx.font = size + "px '" + family + "'";
    nctx.textBaseline = "alphabetic";
    nctx.fillStyle = "#fff";
    nctx.fillText(text, penX, baseY);
    const nd = nctx.getImageData(0, 0, W, H).data;
    const nA = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) nA[i] = nd[i * 4 + 3] / 255;

    // 超采样侧：8 倍字号 fillText，再 box 降采样回 W×H 当几何代理
    const sc = document.createElement("canvas");
    sc.width = W * SS; sc.height = H * SS;
    const sctx = sc.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D;
    sctx.font = (size * SS) + "px '" + family + "'";
    sctx.textBaseline = "alphabetic";
    sctx.fillStyle = "#fff";
    sctx.fillText(text, penX * SS, baseY * SS);
    const sd = sctx.getImageData(0, 0, W * SS, H * SS).data;
    const ssA = new Float32Array(W * H);
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            let acc = 0;
            for (let dy = 0; dy < SS; dy++) {
                const row = ((y * SS + dy) * W * SS + x * SS) * 4 + 3;
                for (let dx = 0; dx < SS; dx++) acc += sd[row + dx * 4];
            }
            ssA[y * W + x] = acc / (255 * SS * SS);
        }
    }

    // 逐像素配对 (几何α, 原生α)，分箱统计 + 最小二乘拟合 幂指数
    const BINS = 20;
    const sum = new Float64Array(BINS);
    const cnt = new Float64Array(BINS);
    let num = 0, den = 0;
    for (let i = 0; i < W * H; i++) {
        const ga = ssA[i], na = nA[i];
        if (ga > 0.02 && ga < 0.98) {
            const b = Math.min(BINS - 1, Math.floor(ga * BINS));
            sum[b] += na; cnt[b]++;
            if (na > 0.001 && na < 0.999) {
                num += Math.log(ga) * Math.log(na);
                den += Math.log(ga) * Math.log(ga);
            }
        }
    }
    const invG = den > 0 ? num / den : 1;
    const gamma = 1 / invG;

    const curve: any[] = [];
    for (let b = 0; b < BINS; b++) {
        if (cnt[b] < 5) continue;
        const ga = (b + 0.5) / BINS;
        const na = sum[b] / cnt[b];
        curve.push({ 几何α: +ga.toFixed(3), 原生α: +na.toFixed(3), 提升: +(na - ga).toFixed(3), 样本: cnt[b] });
    }

    const cur = (egret.SDFTextField as any).textGamma;
    console.log(`[__sdfGamma] 族=${family} 字号=${size} 字="${text}" SS=${SS}`);
    console.log(`  Edge 实测 gamma = ${gamma.toFixed(3)}  (inv = ${invG.toFixed(4)})`);
    console.log(`  SDF 当前 textGamma = ${cur}`);
    console.table(curve);
    const ratio = cur > 0 ? (gamma / cur) : 0;
    console.log(`  ${ratio > 1.05 ? "Edge 更粗 → SDF 偏瘦，调大 textGamma"
        : ratio < 0.95 ? "Edge 更细 → SDF 偏粗，调小 textGamma"
        : "一致，当前 textGamma 正确"}`);
    console.log(`  ⚠️ 超采样代理自检：跑 __sdfGamma(${size}, "${text}", 16) 对比，SS 翻倍 gamma 若显著下降说明代理被污染`);
    return { gamma, invGamma: invG, curve, currentTextGamma: cur };
};

/**
 * 验证「业务同学 exml 里把 <e:Label> 换成 SDFEUILabel」是否真能直接用。
 *
 * 在舞台摆一个 SDFEUILabel 和一个同属性的 eui.Label 并排，
 * 目测对齐、粗细、字体族。这才是后续同学的真实接入体验。
 *
 * __sdfLabel()           →  默认参数（昵称样式）
 * __sdfLabel("等级")     →  指定文本
 * __sdfLabel(false)      →  移除对比面板
 */
(window as any).__sdfLabel = function (arg?: any) {
    const stage = egret.MainContext.instance.stage;
    const OLD = "__sdf_label_panel__";
    const old = stage.getChildByName(OLD);
    if (old) { stage.removeChild(old); }
    if (arg === false) { return "已移除"; }

    const text = typeof arg === "string" ? arg : "失心狂乱";
    const size = 32;
    const color = 0xFFEE95;
    const family = "font_default";

    // 半透明面板：用 eui.Rect 当背景，放两行：上原生 eui.Label，下 SDFEUILabel
    const panel = new eui.Group();
    panel.name = OLD;
    panel.touchEnabled = true;
    panel.x = 20;
    panel.y = 20;

    const bg = new eui.Rect();
    bg.width = 400; bg.height = 160;
    bg.fillColor = 0x000000;
    bg.fillAlpha = 0.7;
    panel.addChild(bg);

    // 标题
    const title = new eui.Label();
    title.text = "上=原生 eui.Label  下=SDFEUILabel";
    title.size = 14;
    title.textColor = 0xCCCCCC;
    title.x = 10; title.y = 4;
    panel.addChild(title);

    // 原生
    const native = new eui.Label();
    native.text = text;
    native.size = size;
    native.textColor = color;
    (native as any).fontFamily = family;
    native.x = 20; native.y = 40;
    panel.addChild(native);

    // SDF
    const sdf = new egret.SDFEUILabel() as any;
    sdf.text = text;
    sdf.size = size;
    sdf.textColor = color;
    sdf.fontFamily = family;
    sdf.x = 20; sdf.y = 90;
    panel.addChild(sdf);

    stage.addChild(panel);
    console.log(`[__sdfLabel] 已摆对比面板：原生(上) vs SDFEUILabel(下)`);
    console.log(`  text="${text}" size=${size} family=${family}`);
    console.log(`  SDF 已注册族: ${(egret.SDFTextField as any).getFontFamilies().join(", ")}`);
    console.log(`  textGamma=${(egret.SDFTextField as any).textGamma}`);
    return { panel, native, sdf };
};

/**
 * 复刻 NewRoleS2.exml 的 lblName（角色昵称标签），验证 SDFEUILabel 能否直接顶替。
 *
 * NewRoleS2 的 lblName 属性组合：
 *   size=32, text="失心狂乱", richmode=true, fontFamily="font_special", textColor=0xFFEE95
 *
 * 关键测试点：
 *  1. fontFamily="font_special" —— 没烘焙，getFont 应回退默认族，不空白
 *  2. richmode=true —— SDFEUILabel 没这个属性，exml 设了会不会报错/静默
 *  3. 字形差异 —— font_special 回退到 font_default（思源黑体）后，看着比原生细一点
 *     是预期的（不同字体），但要确认不报错、不空白、不乱码
 *
 * __sdfNickName()       →  默认昵称
 * __sdfNickName("玩家名")  →  指定昵称
 * __sdfNickName(false)  →  移除
 */
(window as any).__sdfNickName = function (arg?: any) {
    const stage = egret.MainContext.instance.stage;
    const OLD = "__sdf_nickname_panel__";
    const old = stage.getChildByName(OLD);
    if (old) { stage.removeChild(old); }
    if (arg === false) { return "已移除"; }

    const text = typeof arg === "string" ? arg : "失心狂乱";
    // 严格按 NewRoleS2.exml:234 的属性复刻
    const size = 32;
    const color = 0xFFEE95;
    const family = "font_special";  // 故意用没烘过的族，测回退

    const panel = new eui.Group();
    panel.name = OLD;
    panel.touchEnabled = true;
    panel.x = 20;
    panel.y = 20;

    const bg = new eui.Rect();
    bg.width = 460; bg.height = 200;
    bg.fillColor = 0x000000;
    bg.fillAlpha = 0.8;
    panel.addChild(bg);

    const title = new eui.Label();
    title.text = "复刻 NewRoleS2 lblName | 上=原生(含richmode) 下=SDFEUILabel";
    title.size = 13;
    title.textColor = 0xCCCCCC;
    title.x = 10; title.y = 4;
    panel.addChild(title);

    // 原生：完整复刻 exml 属性，包括 richmode=true
    const native = new eui.Label() as any;
    native.text = text;
    native.size = size;
    native.textColor = color;
    native.fontFamily = family;
    native.richmode = true;   // ← 关键：exml 里有这个
    native.x = 20; native.y = 50;
    panel.addChild(native);

    // SDF：SDFEUILabel 没 richmode 属性，模拟 exml 设属性时的行为
    const sdf = new egret.SDFEUILabel() as any;
    sdf.text = text;
    sdf.size = size;
    sdf.textColor = color;
    sdf.fontFamily = family;
    // 模拟 exml 设 richmode —— SDFEUILabel 没这个属性，看会不会抛错
    try { sdf.richmode = true; } catch (e) { console.log("[__sdfNickName] SDFEUILabel.richmode 抛错:", e); }
    sdf.x = 20; sdf.y = 120;
    panel.addChild(sdf);

    stage.addChild(panel);

    const nativeResolved = (egret.TextField as any).fontFamily_map
        ? (egret.TextField as any).fontFamily_map[family] || family : family;
    const sdfResolved = (egret.SDFTextField as any).getFont(family)
        ? family + "→回退" + (egret.SDFTextField as any)._defaultFamily : "未注册";

    console.log(`[__sdfNickName] 复刻 NewRoleS2 lblName`);
    console.log(`  text="${text}" size=${size} family=${family} richmode=true`);
    console.log(`  原生族映射: ${family} → ${nativeResolved}`);
    console.log(`  SDF 族处理: ${sdfResolved}`);
    console.log(`  ⚠️ font_special 没烘焙，SDF 回退默认族（思源黑体），字形会比原生细一点 —— 这是预期的`);
    console.log(`  ⚠️ richmode=true SDFEUILabel 没这个属性，若没报错说明 eui 容忍未知属性`);
    return { panel, native, sdf };
};

/**
 * 像素级确定性验证：SDF 渲染正确性 + 无兄弟 UI 污染。
 *
 * 这是引擎层改造的「反馈环」（diagnose Phase 1）。做法：
 *  1. 建一张 256x128 的 RenderTexture；
 *  2. 在 RT 里放：【绿色探针 Bitmap】+【SDF 红字】（探针与文字紧邻，模拟地图地名夹在图标旁）；
 *  3. 用 getPixels 读回 RGBA，程序化断言：
 *     - 文字区存在红色像素         → SDF 文字正确渲染；
 *     - 探针区全部仍为绿色         → SDF 未污染兄弟 UI；
 *     - 探针区之外无关像素不变脏    → 无越界写入。
 *
 * __sdfVerify() 返回 { pass, probes, samples }。任何一项 false 即失败，不靠肉眼判断。
 */
(window as any).__sdfVerify = function () {
    const SDFT: any = (egret as any).SDFTextField;
    if (!SDFT || !SDFT.isFontLoaded || !SDFT.isFontLoaded()) {
        return { pass: false, reason: "SDF 未就绪" };
    }
    const W = 256, H = 128;
    const rt = new egret.RenderTexture();

    // 探针：纯绿纹理 Bitmap（TEXTURE 命令，模拟地图按钮图标，SDF 污染的直接受害者）
    const probeTex = new egret.RenderTexture();
    const greenRect = new egret.Sprite();
    greenRect.graphics.beginFill(0x00ff00, 1);
    greenRect.graphics.drawRect(0, 0, 32, 32);
    greenRect.graphics.endFill();
    probeTex.drawToTexture(greenRect, null, 1);    const probe = new egret.Bitmap(probeTex);
    probe.x = 8;
    probe.y = 8;

    // SDF 红字
    const sdf = new SDFT();
    sdf.text = "大话西游";
    sdf.size = 24;
    sdf.textColor = 0xff0000;
    sdf.bold = false;
    sdf.stroke = 0;
    sdf.x = 48;
    sdf.y = 30;
    sdf.flushLayout();

    const root = new egret.Sprite();
    root.addChild(sdf);      // SDF 先画
    root.addChild(probe);    // 探针后画 → 暴露 SDF 之后的污染

    // 一次 drawToTexture 把 SDF + 探针全部渲进 RT（走 egret 正规矩阵路径）
    const ok = rt.drawToTexture(root, new egret.Rectangle(0, 0, W, H), 1);
    if (!ok) {
        rt.dispose();
        probeTex.dispose();
        return { pass: false, reason: "drawToTexture 失败" };
    }

    const px = rt.getPixels(0, 0, W, H); // RGBA 数组

    // —— 探针区（8,8 ~ 40,40）应全绿 ——
    let probeGreen = 0, probeTotal = 0, probeBad = 0;
    for (let y = 8; y < 40; y++) {
        for (let x = 8; x < 40; x++) {
            const i = (y * W + x) * 4;
            const r = px[i], g = px[i + 1], b = px[i + 2];
            probeTotal++;
            if (g > 200 && r < 30 && b < 30) { probeGreen++; }
            else if (r > 100 || b > 100) { probeBad++; }
        }
    }

    // —— 文字区（48..200, 30..70）应存在红色像素 ——
    let textRed = 0;
    for (let y = 30; y < 70; y++) {
        for (let x = 48; x < 200; x++) {
            const i = (y * W + x) * 4;
            if (px[i] > 150 && px[i + 1] < 80 && px[i + 2] < 80) {
                textRed++;
            }
        }
    }

    const probes = {
        probe全绿: (probeGreen === probeTotal),
        probe绿占比: +(probeGreen / probeTotal).toFixed(3),
        probe异常像素: probeBad,
        文字红色像素: textRed,
    };
    const pass = probes.probe全绿 && textRed > 20 && probeBad === 0;

    rt.dispose();
    probeTex.dispose();
    console.log(`[__sdfVerify] ${pass ? "PASS" : "FAIL"}`, probes);
    return { pass, probes, samples: { W, H } };
};

/**
 * 引擎层 sdf_text program 验证：手动构造带 isSDF 标志的纹理包装 + 单片字形 quad，
 * 走原生 drawImage 到 RT，读像素断言「字形轮廓有色」。用于 PoC 第 4 步前验证引擎 shader 分支工作。
 */
(window as any).__sdfEngineProbe = function (char: string = "永") {
    const SDFT: any = (egret as any).SDFTextField;
    if (!SDFT) { return { pass: false, reason: "SDFTextField 不存在" }; }
    const font = SDFT.getFont && SDFT.getFont();
    if (!font) { return { pass: false, reason: "字体未加载" }; }
    const fd = font.fontData;
    const glyph = fd.glyphs.get(char);
    if (!glyph) { return { pass: false, reason: "无字形 " + char } };
    const baseTex: any = font.textures[glyph.atlas];
    if (!baseTex) { return { pass: false, reason: "atlas " + glyph.atlas + " 纹理未就绪" } };

    const atlasBmd: any = baseTex._bitmapData || baseTex.bitmapData;
    const src = (atlasBmd as any).source;
    const diag: any = {
        glyph: glyph,
        atlas: glyph.atlas,
        atlasBmd有source: !!src,
        source类型: src ? (src.tagName || src.constructor.name) : null,
        atlasBmd尺寸: (atlasBmd.width || 0) + "x" + (atlasBmd.height || 0),
    };

    // 检查 sdf_text program 是否编译进缓存
    try {
        const webNS: any = (egret as any).web;
        diag.sdfShaderLib存在 = !!(webNS.EgretShaderLib && webNS.EgretShaderLib.sdf_text_frag);
        const libKeys = webNS.EgretShaderLib ? Object.keys(webNS.EgretShaderLib).slice(0, 12) : [];
        diag.EgretShaderLib前12键 = libKeys;
        const gl = webNS.WebGLRenderContext.getInstance().context;
        const key = webNS.EgretWebGLProgram.glProgramKey(gl, "sdf_text");
        const cache = webNS.EgretWebGLProgram.programCache;
        diag.sdfProgram已缓存 = !!(cache && cache[key]);
        diag.programCache键数 = cache ? Object.keys(cache).length : -1;
    } catch (e) {
        diag.sdfProgram检查异常 = String(e);
    }

    function renderAndCount(bmd: any, isSDF: boolean, useSubRect: boolean): any {
        const W = 64, H = 64;
        const rt = new egret.RenderTexture();
        const t = new egret.Texture();
        t._setBitmapData(bmd);
        if (useSubRect) {
            // 关键：bitmapX/Y/W/H 是字形在图集的像素区；sourceWidth/Height 必须是整张 atlas 尺寸
            // 看 egret Texture.$initData / BitmapNode 的 drawImage：imageSourceWidth 用 $sourceWidth 算 UV 分母
            (t as any).$initData(glyph.x, glyph.y, glyph.w, glyph.h, 0, 0, glyph.w, glyph.h, bmd.width, bmd.height);
        } else {
            // 整张 atlas 画（验证纹理本身有内容）
            (t as any).$initData(0, 0, bmd.width, bmd.height, 0, 0, bmd.width, bmd.height, bmd.width, bmd.height);
        }
        if (isSDF) {
            (bmd as any)["isSDF"] = true;
            (bmd as any)["sdfUniforms"] = {
                isMSDF: fd.type === "msdf" ? 1 : 0,
                pxRange: fd.type === "msdf" ? (fd.range || 8) : (2 * (fd.spread || 4)),
                texSize: { x: (fd.atlases[glyph.atlas] || { width: 2048, height: 2048 }).width, y: (fd.atlases[glyph.atlas] || { width: 2048, height: 2048 }).height },
                boldness: 0,
                outlineWidth: 0,
                outlineColor: { x: 0, y: 0, z: 0, w: 1 },
            };
        }
        const sp = new egret.Sprite();
        const bmp = new egret.Bitmap(t as egret.Texture);
        bmp.width = W; bmp.height = H;
        sp.addChild(bmp);
        const ok = rt.drawToTexture(sp, new egret.Rectangle(0, 0, W, H), 1);
        if (!ok) { rt.dispose(); t.dispose(); return { ok: false }; }
        const px = rt.getPixels(0, 0, W, H);
        let opaque = 0, colored = 0;
        for (let i = 0; i < W * H; i++) {
            const r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2], a = px[i * 4 + 3];
            if (a > 30) { opaque++; if (r > 60 || g > 60 || b > 60) colored++; }
        }
        rt.dispose(); t.dispose();
        return { ok, opaque, colored };
    }

    // 直接复用 atlas 原 bmd（source 已删，新建必空）。临时设标志验证，测完清掉。
    diag.整张atlas = renderAndCount(atlasBmd, false, false);
    diag.子矩形普通 = renderAndCount(atlasBmd, false, true);
    diag.子矩形SDF = renderAndCount(atlasBmd, true, true);
    // 清理临时标志，避免污染 atlas 后续普通用途
    delete (atlasBmd as any)["isSDF"];
    delete (atlasBmd as any)["sdfUniforms"];

    const pass = diag.整张atlas.opaque > 50 && diag.子矩形普通.opaque > 20 && diag.子矩形SDF.opaque > 20;
    console.log(`[__sdfEngineProbe] ${pass ? "PASS" : "FAIL"} ` + JSON.stringify({
        atlas: diag.atlas,
        整张atlas: diag.整张atlas && diag.整张atlas.opaque,
        子矩形普通: diag.子矩形普通 && diag.子矩形普通.opaque,
        子矩形普通colored: diag.子矩形普通 && diag.子矩形普通.colored,
        子矩形SDF: diag.子矩形SDF && diag.子矩形SDF.opaque,
        子矩形SDFcolored: diag.子矩形SDF && diag.子矩形SDF.colored,
        sdfProgram已缓存: diag.sdfProgram已缓存,
        sdfShaderLib存在: diag.sdfShaderLib存在,
        programCache键数: diag.programCache键数,
        检查异常: diag.sdfProgram检查异常 || null,
    }));
    return { pass, diag };
};

/**
 * 引擎层 SDF TextField 端到端验证（PoC 第 4 步）。
 * 打开 SDFTextField.enginePath，用真实 SDFTextField 画红字 + 绿探针到 RT，
 * 断言：字形有红色像素（sdf_text 分支工作）、探针全绿（无污染）、
 * 且 atlas bmd 被打上 isSDF 标志。测完恢复标志。
 */
(window as any).__sdfEngineTextField = function () {
    const SDFT: any = (egret as any).SDFTextField;
    if (!SDFT || !SDFT.isFontLoaded || !SDFT.isFontLoaded()) {
        return { pass: false, reason: "SDF 未就绪" };
    }
    const font = SDFT.getFont && SDFT.getFont();
    const fd = font && font.fontData;
    const texs: any[] = (font && font.textures) || [];
    const firstTex = texs[0];
    const atlasBmd = firstTex && (firstTex._bitmapData || firstTex.bitmapData);
    // 字形实际所在 atlas 的 bmd（可能不是 0 号）
    const glyph = fd && fd.glyphs && fd.glyphs.get ? fd.glyphs.get("永") : null;
    const gAi = glyph ? (glyph.atlas || glyph.atlasIdx || 0) : 0;
    const gTex = texs[gAi];
    const gBmd = gTex && (gTex._bitmapData || gTex.bitmapData);
    const prev = SDFT.enginePath;
    SDFT.enginePath = true;
    try {
        const W = 256, H = 128;
        const rt = new egret.RenderTexture();

        const probeTex = new egret.RenderTexture();
        const greenRect = new egret.Sprite();
        greenRect.graphics.beginFill(0x00ff00, 1);
        greenRect.graphics.drawRect(0, 0, 32, 32);
        greenRect.graphics.endFill();
        probeTex.drawToTexture(greenRect, null, 1);
        const probe = new egret.Bitmap(probeTex);
        probe.x = 8; probe.y = 8;

        const sdf = new SDFT();
        sdf.text = "永";
        sdf.size = 32;
        sdf.textColor = 0xff0000;
        sdf.bold = false;
        sdf.x = 48; sdf.y = 30;
        sdf.flushLayout();

        // 描边样本：红字蓝描边（引擎 frag uOutlineWidth/uOutlineColor 生效应出现蓝色轮廓像素）
        const sdfStroke = new SDFT();
        sdfStroke.text = "永";
        sdfStroke.size = 32;
        sdfStroke.textColor = 0xff0000;
        sdfStroke.stroke = 2;
        sdfStroke.strokeColor = 0x0000ff;
        sdfStroke.x = 180; sdfStroke.y = 30;
        sdfStroke.flushLayout();

        const root = new egret.Sprite();
        root.addChild(sdf);
        root.addChild(sdfStroke);
        root.addChild(probe);

        const ok = rt.drawToTexture(root, new egret.Rectangle(0, 0, W, H), 1);
        if (!ok) { rt.dispose(); probeTex.dispose(); return { pass: false, reason: "drawToTexture 失败" }; }

        const px = rt.getPixels(0, 0, W, H);

        let probeGreen = 0, probeTotal = 0, probeBad = 0;
        for (let y = 8; y < 40; y++) {
            for (let x = 8; x < 40; x++) {
                const i = (y * W + x) * 4;
                probeTotal++;
                if (px[i + 1] > 200 && px[i] < 30 && px[i + 2] < 30) probeGreen++;
                else if (px[i] > 100 || px[i + 2] > 100) probeBad++;
            }
        }
        let textRed = 0;
        for (let y = 30; y < 78; y++) {
            for (let x = 48; x < 140; x++) {
                const i = (y * W + x) * 4;
                if (px[i] > 150 && px[i + 1] < 80 && px[i + 2] < 80) textRed++;
            }
        }
        // 描边样本区（x 180..240）：应有红色字芯 + 蓝色轮廓像素
        let strokeBlue = 0, strokeRed = 0;
        for (let y = 30; y < 78; y++) {
            for (let x = 180; x < 245; x++) {
                const i = (y * W + x) * 4;
                if (px[i + 2] > 150 && px[i] < 80 && px[i + 1] < 80) strokeBlue++;
                else if (px[i] > 150 && px[i + 1] < 80 && px[i + 2] < 80) strokeRed++;
            }
        }

        const nodeCount = sdf._atlasNodes ? Object.keys(sdf._atlasNodes).length : -1;
        const diag: any = {
            探针全绿: probeGreen === probeTotal,
            探针绿占比: +(probeGreen / probeTotal).toFixed(3),
            探针异常像素: probeBad,
            文字红色像素: textRed,
            描边蓝色像素: strokeBlue,
            描边红芯像素: strokeRed,
            字形atlasIdx: gAi,
            atlas总数: texs.length,
            字形atlas已打isSDF: !!(gBmd && gBmd["isSDF"]),
            字形atlas有sdfUniforms: !!(gBmd && gBmd["sdfUniforms"]),
            atlas0已打isSDF: !!(atlasBmd && atlasBmd["isSDF"]),
            引擎节点数: nodeCount,
        };
        const pass = diag.探针全绿 && textRed > 10 && probeBad === 0
            && diag.字形atlas已打isSDF && nodeCount >= 1 && strokeBlue > 20;
        rt.dispose(); probeTex.dispose();

        // 复检：atlas bmd 在重建后仍带标志（证明 _rebuild 每次重打标）
        console.log(`[__sdfEngineTextField] ${pass ? "PASS" : "FAIL"} ` + JSON.stringify(diag));
        return { pass, diag };
    } finally {
        // 清理引擎层标志（下次重建会走普通或重打标；这里先摘掉避免残留）
        for (const tt of texs) {
            const tb = tt && (tt._bitmapData || tt.bitmapData);
            if (tb) { delete tb["isSDF"]; delete tb["sdfUniforms"]; }
        }
        SDFT.enginePath = prev;
    }
};

/**
 * 地图地名引擎层 SDF 总开关。
 * 烘焙路线已删除，SDFBakedLabel 唯一走引擎路径；此函数仅强制 SDFTextField.enginePath 并返回状态。
 * 用法：__sdfMapEngine(true) 开启 / __sdfMapEngine(false) 关闭（关闭会回退原生 TextField）。
 */
(window as any).__sdfMapEngine = function (on?: boolean) {
    const SDFT: any = (egret as any).SDFTextField;
    const next = on === undefined ? true : !!on;
    if (SDFT) SDFT.enginePath = next;
    console.log(`[__sdfMapEngine] enginePath=${SDFT ? SDFT.enginePath : "?"}`);
    return { enginePath: SDFT ? SDFT.enginePath : next };
};

/**
 * A/B 对比开关：true = 地图地名走原生 egret.TextField（SDF 之前的效果），false = 引擎层 SDF。
 * 改后重进地图生效。无需两个页面，同一页面刷新切换。
 * 用法：__sdfUseNative(true) 看原生 / __sdfUseNative(false) 看 SDF。
 */
(window as any).__sdfUseNative = function (on?: boolean) {
    const next = on === undefined ? true : !!on;
    SDFBakedLabel.useNativeFallback = next;
    const SDFEUI: any = (egret as any).SDFEUILabel;
    if (SDFEUI) {
        SDFEUI.useNativeFallback = next;
        // 已在屏的 SDFEUILabel 立即切换（不用重进地图）
        SDFEUI.refreshAll && SDFEUI.refreshAll();
    }
    console.log(`[__sdfUseNative] useNativeFallback=${next}（SDFBakedLabel/SDFEUILabel 同步，改后重进生效）`);
    return { useNativeFallback: next };
};

/**
 * 单独控制引擎层 SDF 的 bold 补偿，用于验证「bold 外扩→描边侵占字芯」是否是黑边根因。
 * __sdfBold(false) 关闭 bold（字芯不再外扩，描边也不跟着外扩）；__sdfBold(true) 恢复 0.06。
 */
(window as any).__sdfBold = function (on?: boolean) {
    const SDFT: any = (egret as any).SDFTextField;
    const next = on === undefined ? false : !!on;
    (SDFT as any).engineBoldness = next ? 0.06 : 0;
    console.log(`[__sdfBold] engineBoldness=${next ? 0.06 : 0}（改后重进地图生效）`);
    return { engineBoldness: next ? 0.06 : 0 };
};

/**
 * 引擎层描边起点外移（距离场单位）。0=现状，正数把描边整体外移离字芯更远。
 * __sdfStrokeOffset(0.08) 试 —— 村/武/恭 黑边应减轻且字不变细。
 */
(window as any).__sdfStrokeOffset = function (v?: number) {
    const SDFT: any = (egret as any).SDFTextField;
    const next = v === undefined ? 0.08 : v;
    (SDFT as any).strokeOffset = next;
    console.log(`[__sdfStrokeOffset] strokeOffset=${next}（改后重进地图生效）`);
    return { strokeOffset: next };
};

/**
 * 在舞台顶层直接渲染几个字对比（引擎层 SDF，同地图标签同参数）。
 * 用法：__sdfShowChars() 默认渲染 村 渔 盟 御；__sdfShowChars("村","渔") 自定义。
 * 再次调用清除。
 */
(window as any).__sdfShowChars = function (...chars: string[]) {
    const stage = egret.MainContext.instance.stage as egret.Stage;
    const KEY = "__sdfShowCharsLayer";
    const exist = (stage as any)[KEY];
    if (exist) {
        stage.removeChild(exist);
        (stage as any)[KEY] = null;
        console.log("[__sdfShowChars] 已清除");
        return { visible: false };
    }
    const list = chars.length ? chars : ["村", "渔", "盟", "御", "侍", "庙"];
    const SDFT: any = (egret as any).SDFTextField;
    const layer = new egret.Sprite();
    (stage as any)[KEY] = layer;
    const bg = new egret.Shape();
    bg.graphics.beginFill(0x1e1e22, 0.95);
    bg.graphics.drawRect(0, 0, 720, 180);
    bg.graphics.endFill();
    layer.addChild(bg);
    layer.x = 0; layer.y = 40;
    layer.touchEnabled = false; layer.touchChildren = false;

    const title = new egret.TextField();
    title.text = "引擎层 SDF 逐字对比（bold + stroke=2 + 0x2e2500）";
    title.size = 16; title.textColor = 0xffffff; title.x = 20; title.y = 10;
    layer.addChild(title);

    SDFT.enginePath = true;
    list.forEach((ch, i) => {
        const sdf = new SDFT();
        sdf.text = ch;
        sdf.size = 56;
        sdf.textColor = 0x00ff00;
        sdf.bold = true;
        sdf.stroke = 2;
        sdf.strokeColor = 0x2e2500;
        sdf.x = 20 + i * 110;
        sdf.y = 60;
        sdf.flushLayout();
        layer.addChild(sdf);

        const lbl = new egret.TextField();
        lbl.text = ch + "\n" + (sdf.fontFamily || "默认族");
        lbl.size = 13; lbl.textColor = 0x9aa0a6; lbl.x = 20 + i * 110; lbl.y = 135;
        layer.addChild(lbl);
    });

    stage.addChild(layer);
    console.log("[__sdfShowChars] 已渲染", list.join(""), "。再次调用清除。");
    return { visible: true, chars: list };
};

/**
 * 引擎层 AA 带宽系数。1.0=标准 fwidth，1.5=现状，越小越锐利描边越窄。
 * __sdfAA(0.8) 试 —— 描边环收窄、黑边减轻。
 */
(window as any).__sdfAA = function (v?: number) {
    const SDFT: any = (egret as any).SDFTextField;
    const next = v === undefined ? 0.8 : v;
    (SDFT as any).aaFactor = next;
    console.log(`[__sdfAA] aaFactor=${next}（改后重进地图生效）`);
    return { aaFactor: next };
};

/**
 * 采样 atlas 距离场：读"永"字形心/边缘的 R 通道值，判断距离场编码是否 [0,1]±spread 标准。
 * 用于定位 SDF 字细/虚的根因（边缘 dist 应≈0.5，字心 dist 应≈0.8+，外边 dist 应≈0.2-）。
 */
(window as any).__sdfSampleDist = function (char: string = "永") {
    const SDFT: any = (egret as any).SDFTextField;
    const font = SDFT.getFont && SDFT.getFont();
    if (!font) return Promise.resolve({ pass: false, reason: "字体未加载" });
    const fd = font.fontData;
    const g = fd.glyphs.get(char);
    if (!g) return Promise.resolve({ pass: false, reason: "无字形 " + char });
    const atlas = fd.atlases[g.atlas];
    const url = "resource/sdf/font_default_s2/" + atlas.file + "?v=" + Date.now();
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = g.w; canvas.height = g.h;
            const c: any = canvas.getContext("2d");
            c.drawImage(img, g.x, g.y, g.w, g.h, 0, 0, g.w, g.h);
            const data = c.getImageData(0, 0, g.w, g.h).data;
            const cx = (g.w / 2) | 0;
            const midY = Math.min(g.h - 1, Math.max(0, (g.inkTop + g.inkHeight / 2) | 0));
            function at(x: number, y: number) {
                const i = (y * g.w + x) * 4;
                return { r: data[i] / 255, g: data[i + 1] / 255, b: data[i + 2] / 255, a: data[i + 3] / 255 };
            }
            let minR = 1, maxR = 0, sumR = 0, cnt = 0;
            let edgeIn = -1, edgeOut = -1;
            for (let x = 0; x < g.w; x++) {
                const p = at(x, midY);
                if (p.r < minR) minR = p.r;
                if (p.r > maxR) maxR = p.r;
                sumR += p.r; cnt++;
                if (p.a > 0.5 && edgeIn < 0) edgeIn = x;
                if (p.a > 0.5) edgeOut = x;
            }
            const center = at(cx, midY);
            let s2 = 0, c2 = 0;
            for (let x = Math.max(edgeIn, 0); x <= edgeOut && x < g.w; x++) {
                const p = at(x, midY);
                if (p.a > 0.5) { s2 += p.r; c2++; }
            }
            const diag: any = {
                glyph: g, 中线Y: midY, atlas: atlas.file,
                字心R: +center.r.toFixed(3), 字心A: +center.a.toFixed(3),
                中线R范围: [+minR.toFixed(3), +maxR.toFixed(3)],
                中线R均值: +(sumR / cnt).toFixed(3),
                墨迹X范围: [edgeIn, edgeOut],
            };
            diag["alpha>0.5的R均值"] = c2 ? +(s2 / c2).toFixed(3) : 0;
            console.log("[__sdfSampleDist] " + JSON.stringify(diag, null, 1));
            resolve(diag);
        };
        img.onerror = () => resolve({ pass: false, reason: "atlas 加载失败 " + url });
        img.src = url;
    });
};

/**
 * 字形级 SDF 场对比：量化「描边带物理宽度」与「轮廓边缘梯度」，
 * 回答「为什么某个字的描边看起来更重」是字形结构还是 SDF 场异常。
 * 用法：__sdfGlyphCmp("村", "侍") 对比两个字；不传第二参默认和"渔"比。
 */
(window as any).__sdfGlyphCmp = function (a: string = "村", b: string = "渔") {
    const SDFT: any = (egret as any).SDFTextField;
    const font = SDFT.getFont && SDFT.getFont();
    if (!font) return Promise.resolve({ pass: false, reason: "字体未加载" });
    const fd = font.fontData;
    const ga = fd.glyphs.get(a), gb = fd.glyphs.get(b);
    if (!ga || !gb) return Promise.resolve({ pass: false, reason: "缺字形 " + (!ga ? a : b) });

    function analyze(g: any): Promise<any> {
        const atlas = fd.atlases[g.atlas];
        const url = "resource/sdf/font_default_s2/" + atlas.file + "?v=" + Date.now();
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = g.w; canvas.height = g.h;
                const c: any = canvas.getContext("2d");
                c.drawImage(img, g.x, g.y, g.w, g.h, 0, 0, g.w, g.h);
                const d = c.getImageData(0, 0, g.w, g.h).data;
                const R = (x: number, y: number) => x >= 0 && x < g.w && y >= 0 && y < g.h ? d[(y * g.w + x) * 4] / 255 : 0;
                // 描边带宽度：沿每条水平线，找 R 从 >0.5 跌到 <0.3 的外缘距离（= 描边带物理宽度）
                // 以及 R 在 [0.3,0.5] 的像素数（描边带面积）
                let strokePx = 0, fillPx = 0, transSum = 0, transN = 0;
                const bandWidths: number[] = [];
                for (let y = 0; y < g.h; y++) {
                    let prev = R(0, y);
                    let x50 = -1, x30 = -1;
                    for (let x = 1; x < g.w; x++) {
                        const v = R(x, y);
                        if (v >= 0.3 && v < 0.5) strokePx++;
                        else if (v >= 0.5) fillPx++;
                        // 记录 0.5→0.3 的外缘过渡（离开填充进入描边再出去）
                        if (prev >= 0.5 && v < 0.5) x50 = x;
                        if (x50 >= 0 && prev >= 0.3 && v < 0.3) {
                            if (x - x50 >= 1 && x - x50 <= 24) bandWidths.push(x - x50);
                            x50 = -1;
                        }
                        // 梯度采样：0.5 附近 |ΔR/Δx|
                        if (prev < 0.5 && v >= 0.5) { transSum += Math.abs(v - prev); transN++; }
                        else if (prev >= 0.5 && v < 0.5) { transSum += Math.abs(v - prev); transN++; }
                        prev = v;
                    }
                }
                const avgBand = bandWidths.length ? +(bandWidths.reduce((s, x) => s + x, 0) / bandWidths.length).toFixed(2) : 0;
                const maxBand = bandWidths.length ? Math.max(...bandWidths) : 0;
                resolve({
                    char: g === ga ? a : b,
                    atlas: atlas.file,
                    strokePx, fillPx,
                    stroke比: fillPx ? +(strokePx / fillPx).toFixed(4) : 0,
                    平均描边带宽px: avgBand,
                    最大描边带宽px: maxBand,
                    边缘平均梯度: transN ? +(transSum / transN).toFixed(4) : 0,
                });
            };
            img.onerror = () => resolve({ pass: false, reason: "atlas 加载失败 " + url });
            img.src = url;
        });
    }

    return Promise.all([analyze(ga), analyze(gb)]).then(([ra, rb]) => {
        const diag = { 对比: [ra, rb], 结论: {} as any };
        if (ra && rb && !ra.reason && !rb.reason) {
            diag.结论 = {
                描边面积比差: +(rb.stroke比 - ra.stroke比).toFixed(4),
                平均带宽差px: +(rb.平均描边带宽px - ra.平均描边带宽px).toFixed(2),
                最大带宽差px: rb.最大描边带宽px - ra.最大描边带宽px,
                梯度比: +(ra.边缘平均梯度 / rb.边缘平均梯度).toFixed(3),
            };
        }
        console.log("[__sdfGlyphCmp] " + JSON.stringify(diag, null, 1));
        return diag;
    });
};

/**
 * 原生 eui.Label vs 引擎层 SDFTextField 的逐像素对比。
 * 同文本/字号/颜色/描边，分别渲染进 RT，量化包围盒(ink 像素 bbox)与半透明像素占比，
 * 定位「和原生不一样」的具体维度（更大/更小/更粗/更细/描边差异）。
 */
(window as any).__sdfDiffNative = function (text: string = "渔村村长", size: number = 20, bold: boolean = false) {
    const SDFT: any = (egret as any).SDFTextField;
    const W = 256, H = 128;
    function render(cb: (c: egret.Sprite) => void) {
        const rt = new egret.RenderTexture();
        const root = new egret.Sprite();
        cb(root);
        rt.drawToTexture(root, new egret.Rectangle(0, 0, W, H), 1);
        const px = rt.getPixels(0, 0, W, H);
        rt.dispose();
        return px;
    }
    // 原生
    const natPx = render((root) => {
        const lbl = new eui.Label();
        lbl.text = text;
        lbl.size = size;
        lbl.textColor = 0x00ff00;
        lbl.stroke = 2;
        lbl.strokeColor = 0x2e2500;
        lbl.bold = bold;
        lbl.x = 8; lbl.y = 8;
        root.addChild(lbl);
    });
    // 引擎层 SDF
    SDFT.enginePath = true;
    const sdfPx = render((root) => {
        const sdf = new SDFT();
        sdf.text = text;
        sdf.size = size;
        sdf.textColor = 0x00ff00;
        sdf.stroke = 2;
        sdf.strokeColor = 0x2e2500;
        sdf.bold = bold;
        sdf.x = 8; sdf.y = 8;
        sdf.flushLayout();
        root.addChild(sdf);
    });
    // 描边色像素统计（0x2e2500 深棕）：r≈46,g≈37,b≈0
    function strokeStats(px: any) {
        let n = 0;
        for (let i = 0; i < px.length; i += 4) {
            const r = px[i], g = px[i + 1], b = px[i + 2], a = px[i + 3];
            if (a > 100 && r < 120 && g < 120 && b < 90) n++;
        }
        return n;
    }
    function inkStats(px: any) {
        let minX = 1e9, minY = 1e9, maxX = -1, maxY = -1, solid = 0, translucent = 0, total = 0;
        // 字芯颜色采样：alpha>240 的像素平均 RGB
        let sr = 0, sg = 0, sb = 0, sc = 0;
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
            const i = (y * W + x) * 4;
            const a = px[i + 3];
            if (a < 8) continue;
            total++;
            if (x < minX) minX = x; if (x > maxX) maxX = x;
            if (y < minY) minY = y; if (y > maxY) maxY = y;
            if (a > 240) {
                solid++;
                sr += px[i]; sg += px[i + 1]; sb += px[i + 2]; sc++;
            } else translucent++;
        }
        return {
            total, solid, translucent,
            bbox: total ? { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 } : null,
            fillRatio: total ? +(solid / total).toFixed(3) : 0,
            strokePx: strokeStats(px),
            字芯平均RGB: sc ? [Math.round(sr / sc), Math.round(sg / sc), Math.round(sb / sc)] : null,
        };
    }
    const nat = inkStats(natPx);
    const sdf = inkStats(sdfPx);
    const diag = {
        text, size, bold,
        原生: nat, SDF: sdf,
        差异提示: {
            宽度: nat.bbox && sdf.bbox ? (sdf.bbox.w - nat.bbox.w) : null,
            高度: nat.bbox && sdf.bbox ? (sdf.bbox.h - nat.bbox.h) : null,
            像素数比: (sdf.total / Math.max(nat.total, 1)).toFixed(3),
            实心占比原生: nat.fillRatio,
            实心占比SDF: sdf.fillRatio,
            描边像素原生: nat.strokePx,
            描边像素SDF: sdf.strokePx,
        },
    };
    console.log("[__sdfDiffNative] " + JSON.stringify(diag, null, 1));
    return diag;
};






