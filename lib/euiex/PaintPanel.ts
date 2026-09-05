
    export class PaintPanel extends eui.Group {
    public _isEuiex = true;

        public set lineColor(value: number) {
            this.$lineColor = value;
        }

        public set lineWidth(value: number) {
            this.$lineWidth = value;
        }

        public set lineAlpha(value: number) {
            this.$lineAlpha = value;
        }

        public set state(state: number) {
            this.$state = state;
        }

        public set bgImage(texture: egret.Texture) {
            this.$paintLayerBg.texture = texture;
        }

        // base64 png image
        public get PaintImage(): string {
            let renderTexture = new egret.RenderTexture();
            renderTexture.drawToTexture(this.$paintLayerBg);
            return renderTexture.toDataURL("image/png");
        }

        public static readonly CommonState = 0;
        public static readonly PaintState = 1;
        public static readonly EraseState = 2;

        private $state: number;
        private $touching: boolean;
        private $margin: number;

        private $lineAlpha: number = 1;
        private $lineWidth: number = 5;
        private $lineColor: number = 0x000000;

        private $bgImage: eui.Image;
        private $paintLayer: eui.Group;
        private $paintLayerBg: egret.Bitmap;
        private $pencilSp: egret.Sprite;
        private $eraseSp: egret.Sprite;
        private $bitmapMask: egret.Bitmap;
        private $reverseMask: egret.Sprite;
        private reverseMask: egret.Bitmap;

        public constructor(width: number, height: number, margin: number = 20) {
            super();
            this.$margin = margin;
            this.width = width + margin * 2;
            this.height = height + margin * 2;
            this.touchEnabled = true;
            this.$paintLayer = new eui.Group;
            this.$paintLayer.x = this.$paintLayer.y = margin;
            this.$paintLayer.width = width;
            this.$paintLayer.height = height;
            this.addChild(this.$paintLayer);
            this.$paintLayerBg = new egret.Bitmap;
            this.$paintLayer.addChild(this.$paintLayerBg);
            this.addEventListener(egret.Event.ADDED_TO_STAGE, this.onAddedToStage, this);
            this.addEventListener(egret.TouchEvent.TOUCH_MOVE, this.onTouchMove, this);
            this.addEventListener(egret.TouchEvent.TOUCH_BEGIN, this.onTouchBegin, this);
            this.addEventListener(egret.TouchEvent.TOUCH_END, this.onTouchEnd, this);
            this.addEventListener(egret.TouchEvent.TOUCH_RELEASE_OUTSIDE, this.onTouchEnd, this);
        }

        private onTouchBegin(evt: egret.TouchEvent) {
            if (this.$state === PaintPanel.CommonState) {
                return;
            }
            let pos = this.$state === PaintPanel.PaintState ? this.$pencilSp.globalToLocal(evt.stageX, evt.stageY) : this.$eraseSp.globalToLocal(evt.stageX, evt.stageY);
            pos.x = preload_utils_math.clamp(pos.x, this.$lineWidth / 2, this.$paintLayer.width - this.$lineWidth / 2);
            pos.y = preload_utils_math.clamp(pos.y, this.$lineWidth / 2, this.$paintLayer.height - this.$lineWidth / 2);
            let width = this.$state === PaintPanel.PaintState ? this.$lineWidth : 2 * this.$lineWidth;
            this.drawStart(pos, this.$state === PaintPanel.PaintState ? this.$pencilSp : this.$eraseSp, width);
        }

        private onTouchMove(evt: egret.TouchEvent) {
            // Logger.log("moving");
            let pos = this.$state === PaintPanel.PaintState ? this.$pencilSp.globalToLocal(evt.stageX, evt.stageY) : this.$eraseSp.globalToLocal(evt.stageX, evt.stageY);
            pos.x = preload_utils_math.clamp(pos.x, this.$lineWidth / 2, this.$paintLayer.width - this.$lineWidth / 2);
            pos.y = preload_utils_math.clamp(pos.y, this.$lineWidth / 2, this.$paintLayer.height - this.$lineWidth / 2);
            let width = this.$state === PaintPanel.PaintState ? this.$lineWidth : 2 * this.$lineWidth;
            this.drawLine(pos, this.$state === PaintPanel.PaintState ? this.$pencilSp : this.$eraseSp, width);
        }

        private onTouchEnd() {
            // Logger.log("end");
            if (this.$state === PaintPanel.EraseState || this.$state === PaintPanel.PaintState) {
                this.updatePaintLayer();
            }
        }

        private updatePaintLayer() {
            let render = new egret.RenderTexture;
            render.drawToTexture(this.$paintLayer);
            this.$paintLayerBg.texture = render;
            this.$pencilSp.graphics.clear();
            this.$eraseSp.graphics.clear();
        }

        private drawStart(pos: egret.Point, sp: egret.Sprite, width = this.$lineWidth, color = this.$lineColor) {
            sp.graphics.lineStyle(width, color);
            sp.graphics.moveTo(pos.x, pos.y);
            sp.graphics.lineTo(pos.x, pos.y);
            this.updateMask();
        }

        private drawLine(pos: egret.Point, sp: egret.Sprite, width = this.$lineWidth, color = this.$lineColor) {
            sp.graphics.lineTo(pos.x, pos.y);
            this.updateMask();
        }

        private updateMask() {
            let render = new egret.RenderTexture();
            render.drawToTexture(this.$eraseSp, new egret.Rectangle(0, 0, this.$paintLayer.width, this.$paintLayer.height));
            this.$bitmapMask.texture = render;
            let render2 = new egret.RenderTexture();
            render2.drawToTexture(this.$reverseMask);
            this.reverseMask.texture = render2;
            this.$paintLayerBg.mask = this.reverseMask;
        }

        private onAddedToStage(event: egret.Event) {
            this.$pencilSp = new egret.Sprite;
            this.$paintLayer.addChild(this.$pencilSp);
            this.$eraseSp = new egret.Sprite;
            this.$paintLayer.addChild(this.$eraseSp);
            //去除圆角中的黑边
            this.$eraseSp.visible = false;
            // 遮罩图
            this.$bitmapMask = new egret.Bitmap();
            // 将原来的遮罩图的混合模式设置为擦除
            this.$bitmapMask.blendMode = egret.BlendMode.ERASE;
            //绘制一个黑色的Sprite作为反遮罩
            this.$reverseMask = new egret.Sprite();
            this.$reverseMask.graphics.beginFill(0, 1);
            this.$reverseMask.graphics.drawRect(0, 0, this.width, this.height);
            this.$reverseMask.graphics.endFill();
            // 把上面的遮罩加进黑色的Sprite作为反遮罩
            this.$reverseMask.addChild(this.$bitmapMask);
            this.reverseMask = new egret.Bitmap();
            // 添加反遮罩位图对象
            this.$paintLayer.addChild(this.reverseMask);
        }

        public clearPaintLayer() {
            this.$paintLayerBg.texture = null;
            this.$pencilSp.graphics.clear();
            this.$eraseSp.graphics.clear();
        }

        public clear() {
            this.clearPaintLayer();
        }

        public revert() {
        }
    }
