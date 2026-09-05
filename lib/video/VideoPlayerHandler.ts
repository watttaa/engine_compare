/**
 * 视频播放平台策略接口。
 * 容器 `VideoPlayerContainer` 持有 `VideoPlayerHandler` 实现，按平台选择对应子类，
 * 委托播放与生命周期事件。handler 通过 `setOnEnded` 注入的回调通知容器续流，
 * 不反向依赖容器内部字段。
 */

/** 视频播放参数（由容器 `setData` 透传给 handler） */
export type VideoOptionsType = {
    src: string,
    width?: number,
    height?: number,
    x?: number,
    y?: number,
    inline?: boolean,
    autoplay?: boolean,
    disablePictureInPicture?: boolean,
    controls?: boolean,
    controlsList?: string,
    poster?: string,
    endCB?: Function,
    endCBThis?: any,
    endCBArgs?: any[],
    audio?: string;
    landscape?: boolean, // 是否横屏
}

/**
 * handler 所需的宿主能力：仅暴露 UI 壳的 group、根 `baseInst`（用于 stage 监听）、
 * 以及 iOS 切后台时需要的 `closeVideoPlayer`（不触发 endCB 的关闭路径）。
 * 不暴露容器内部状态，避免 handler 反向耦合。
 */
export interface VideoPlayerHost {
    grpMain: eui.Group;
    baseInst: eui.Component;
    /**
     * 容器侧完整关闭：场景音乐恢复 + handler.close + closeSelf，不触发 endCB。
     * iOS 切后台时由 handler 调用，等价于原 `closeVideoPlayer`。
     */
    closeVideoPlayer(): void;
}

/**
 * 视频播放策略接口。各平台实现 SHALL 通过 `setOnEnded` 注入的回调通知容器续流。
 * `close()` SHALL 幂等（重复调用安全，不重复触发续流）。
 */
export interface VideoPlayerHandler {
    /** 开始播放（含平台创建视频对象、绑事件、启兜底） */
    play(opts: VideoOptionsType): void;
    /** 停止 + 销毁 + 清定时器（收敛，幂等，不触发 onEnded） */
    close(): void;
    /** 切后台 */
    onLifecyclePause(): void;
    /** 回前台（含墙钟补偿） */
    onLifecycleResume(): void;
    /** 注入续流回调（容器统一管 endCB / closeSelf） */
    setOnEnded(cb: () => void): void;
}
