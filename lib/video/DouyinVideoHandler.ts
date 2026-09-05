import { WxVideoHandler } from "./WxVideoHandler";

/**
 * 抖音小游戏视频播放策略（预留，本次不接入）。
 *
 * 抖音视频核心 API 与微信一致（`wx.createVideo` 由 `MiniGamePlatform` 提供），
 * 故继承 `WxVideoHandler` 复用兜底逻辑。差异点集中 override，避免复制粘贴。
 *
 * 本次 `VideoPlayerContainer.setData` 不分发到此类，抖音端仍走 `WebVideoHandler`
 * （与现状一致，无回归）。待抖音真机验证后再启用。
 *
 * TODO 待定差异点：
 *  - 文案：`showModal` content 用抖音专属文案（待产品/真机确认）。
 *  - 阈值：卡死心跳/总时长阈值是否随抖音真机表现调整。
 *  - `tt.*` API：若抖音 `wx.showModal` 行为差异，override 改用 `tt.showModal`；
 *    侧边栏 / feed 上报等抖音专属能力也在此扩展。
 */
export class DouyinVideoHandler extends WxVideoHandler {
    // TODO 抖音专属文案 / 阈值 / tt.* API override，待真机验证后实现
}
