/**
 * InstancedMCRenderer — MC 场景 WebGPU 实例化通道
 *
 * 职责：把 sim 角色（body/head/weapon 三层）直接喂进 WebGPU SpriteChannel，
 * 绕开 egret 显示树遍历。背景仍走通用路径（先画）。
 *
 * 数据流（每帧）：
 *   sim.update(dt) → 移动角色写矩阵 6 floats（脏实例）
 *                  → 转向/换动画写 animId/texId（一次 16 floats）
 *   SpriteChannel.submit(pass, proj) → 1 次 draw(6, N)
 *
 * 实例布局：每角色 3 实例（body/head/weapon，顺序保证遮挡）。
 */
(function (global) {
  'use strict';

  function InstancedMCRenderer(adapter, sim) {
    this.adapter = adapter;
    this.sim = sim;
    this.r = null;            // WebGPURenderer（boot 后注入）
    this.channel = null;      // SpriteChannel
    this.clips = null;        // charId → { walk0, walk2, stand0, stand2 } → animId
    this.texByRes = null;     // 资源 key → { texObj, texId }
    this.roleBase = new Map(); // sim idx → 实例基索引
    this._lastTime = 0;
    this.active = false;
  }

  /** 由外部在 WebGPU boot 成功后调用。resources: MC 资源描述数组。 */
  InstancedMCRenderer.prototype.init = function (r, resourceProvider) {
    this.r = r;
    var mod = global.__spriteChannelMod;
    if (!mod) throw new Error('sprite-channel 模块未加载');
    this.channel = new mod.SpriteChannel(r);
    this.resourceProvider = resourceProvider;
  };

  return global.InstancedMCRenderer = InstancedMCRenderer;
})(typeof window !== 'undefined' ? window : globalThis);
