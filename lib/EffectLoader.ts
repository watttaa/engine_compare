
export class EffectLoader extends egret.MovieClip {

	private $actionPath: string;
	private $path: Array<string>;
	private $playTime: number;
	private $curMcPath: string;
	private $frame: string|number;

	protected $outSideCallBack: Function = undefined;//外部传进来回调函数
	protected $outSidePlayEndCallBack: Function = undefined;
	protected $outSideThisObject: any = undefined;

	public constructor() {
		super();
		this.touchEnabled = false;

		//this.addEventListener(egret.Event.REMOVED_FROM_STAGE, this.onRemovedFromStage, this);

		//动画播放完成。
		this.addEventListener(egret.Event.COMPLETE, this.playEnd, this);
	}
	/*
		private onRemovedFromStage(): void {
			this.removeEventListener(egret.Event.REMOVED_FROM_STAGE, this.onRemovedFromStage, this);
	
			//从舞台移除时，进行销毁操作
			this.dispose();
		}
	*/
	private load() {
		getMCData(this.$path[0], this.loadCompleted, this, this.loadFailed);
	}

	public clear() {
		//先停止播放
		this.stop();

		if (this.$path && this.$path.length >= 2) {
			this.$path.length = 0;
		}
		this.$curMcPath = undefined;
		this.$actionPath = undefined;
	}

	public playActionByPath(path: string, frame: string|number, playTime: number = -1, thisObject: any = null, playEndCallBack: Function = null, loadEndCallBack: Function = null) {
		this.clear();

		if (!this.$path) {
			this.$path = [];
		} else {
			this.$path.length = 0;
		}

		if (!path) {
			return;
		}

		this.$actionPath = path;

		let JsonUrl = path + ".json";
		let PngUrl = path + ".png";

		this.$path.push(JsonUrl);
		this.$path.push(PngUrl);
		this.$frame = frame;
		this.$playTime = playTime;
		this.$outSideThisObject = thisObject;
		this.$outSideCallBack = loadEndCallBack;
		this.$outSidePlayEndCallBack = playEndCallBack;

		this.load();
	}

	public playAction(prePath: string, mcName: string, frame: string|number, playTime: number = -1, thisObject: any = null,  playEndCallBack: Function = null, loadEndCallBack: Function = null) {

		// 如果此资源已存在，则直接播放
		if (this.$curMcPath == (prePath + mcName + ".json") && this.movieClipData && this.movieClipData.mcData) {
			this.$frame = frame;
			this.$playTime = playTime;
			this.$outSideThisObject = thisObject;
			this.$outSideCallBack = loadEndCallBack;
			this.$outSidePlayEndCallBack = playEndCallBack;
			this.doPlay();

			if (this.$outSideThisObject && this.$outSideCallBack) {
				this.$outSideCallBack.apply(this.$outSideThisObject);
			}
			return;
		}

		this.clear();
		if (!this.$path) {
			this.$path = [];
		} else {
			this.$path.length = 0;
		}

		if (!prePath && !mcName) {
			return;
		}

		this.playActionByPath(prePath + mcName, frame, playTime, thisObject, playEndCallBack, loadEndCallBack);
	}

	public getActionPath(): string {
		return this.$actionPath;
	}

	private doPlay() {

		// 如果正在播放中，则接着播放，否则就跳到第一帧播放
		// 如果正在播放中，但要播放的动作和当前动作不一致，则切换播放
		if (!this.isPlaying || (this.currentFrameLabel != this.$frame)) {
			let frame = this.$frame;
			this.gotoAndPlay(frame, this.$playTime);
		}
	}

	private loadCompleted(mcData) {
		this.movieClipData = egret.MovieClipDataFactory.getInstance().generateMovieClipData(mcData.mcData, mcData.mcTexture);

		if (!this.movieClipData || !this.movieClipData.mcData) {
			Logger.warn("空MC：" + this.$path[0]);
		}

		// 资源加载成功，做标记
		this.$curMcPath = this.$path[0];

		this.doPlay();

		if (this.$outSideThisObject && this.$outSideCallBack) {
			this.$outSideCallBack.apply(this.$outSideThisObject);
		}

	}

	private loadFailed(data: {filename: string}) {
		Logger.warn('特效加载失败：' + data.filename);
	}

	public move(x: number, y: number) {
		this.x = x;
		this.y = y;
	}

	private playEnd() {
		if (this.$outSideThisObject && this.$outSidePlayEndCallBack) {
			this.$outSidePlayEndCallBack.apply(this.$outSideThisObject);
		}
	}

	public destroy(): void {

		this.clear();
		this.movieClipData = undefined;
		this.$path = undefined;
		this.$curMcPath = undefined;

		this.$outSideCallBack = undefined;
		this.$outSidePlayEndCallBack = undefined;
		this.$outSideThisObject = undefined;
	}

	public reset(): void {
		this.clear();
		this.x = this.y = this.anchorOffsetX = this.anchorOffsetY = 0;
		this.scaleX = this.scaleY = 1;
		this.rotation = 0;
		this.alpha = 1;
		this.visible = true;
		this.touchEnabled = false;
		this.blendMode = egret.BlendMode.NORMAL;
		if (this.parent) {
			this.parent.removeChild(this);
		}
	}

	/** 获取动画高度 */
	public getHeight(fromGround: boolean): number {
		//遍历指定路径已成功加载剪辑的最大高度。
		let height: number = 0;
		let clip = this;
		if (clip && clip.movieClipData) {
			let frameHeight: number = 0;
			//如果获取从地面起的高度，则考虑帧数据中的y坐标偏移值
			if (fromGround) {
				let framesCount: number = clip.movieClipData.numFrames;
				if (framesCount > 0) {
					let frameData: any = clip.movieClipData.getKeyFrameData(1);
					if (frameData) {
						frameHeight = Math.abs(frameData.y) || 0;
					}
				}
			}

			//如果无法获取帧高度则使用剪辑的高度
			frameHeight = frameHeight || clip.height;
			height = Math.max(frameHeight, height);
		}

		return height;
	}

	$hitTest(stageX: number, stageY: number): egret.DisplayObject {
		//如果自身不能点击，则点击测试返回null
		if (!this.touchEnabled) {
			return null;
		}

		return super.$hitTest(stageX, stageY);
	}
}