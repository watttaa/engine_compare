(function(root){var exports=undefined,module=undefined,require=undefined;var define=undefined;var self=root,window=root,global=root,globalThis=root;(function(){/**
 * BoidsSim — 从 webglsamples Aquarium 的鱼群运动模型移植的 2D 仿真核心
 *
 * 忠实还原原版 aquarium.js L1392-1424 的参数化时钟模型：
 *   fishClock = clock * fishSpeed + ii * fishOffset
 *   speed     = fishInfo.speed + rand * fishInfo.speedRange   （每条鱼生成时固定）
 *   x = sin(xClock) * xRadius,  y = sin(yClock) * yRadius + heightOffset
 *   朝向 = atan2(nextPos - pos)，nextPos 用 clock-0.04 超前采样（原版同参）
 *
 * 注意：原版"鱼群"不是真 boids 规则（无邻居力），而是每条鱼独立
 * Lissajous 轨道 —— 保持原样才能和原版对得上画面节奏。
 *
 * 鱼种参数表逐字摘自原版 g_fishTable（aquarium.js L135-219）。
 * 2D 版把 3D 的 x/z 轨道投影到屏幕 x/y，radius 按屏幕尺寸缩放。
 */(function(global){'use strict';var FISH_TABLE=[{name:'SmallFishA',speed:1,speedRange:1.5,radius:30,radiusRange:25,tailSpeed:10,heightOffset:0,heightRange:16},{name:'MediumFishA',speed:1,speedRange:2,radius:10,radiusRange:20,tailSpeed:1,heightOffset:0,heightRange:16},{name:'MediumFishB',speed:0.5,speedRange:4,radius:10,radiusRange:20,tailSpeed:3,heightOffset:-8,heightRange:5},{name:'BigFishA',speed:0.5,speedRange:0.5,radius:50,radiusRange:3,tailSpeed:1.5,heightOffset:0,heightRange:16},{name:'BigFishB',speed:0.5,speedRange:0.5,radius:45,radiusRange:3,tailSpeed:1,heightOffset:0,heightRange:16}];// 原版 g_fish 全局默认值（aquarium.js L110-122）
var DEFAULTS={fishSpeed:1,fishOffset:0.1,fishXClock:1,fishYClock:0.556,fishTailSpeed:1};var NEXT_STEP=0.04;// 原版 nextPosition 时钟超前量
var TAIL_OFFSET_MULT=0.15;// 原版 g_tailOffsetMult
function BoidsSim(width,height){this.width=width||800;this.height=height||600;this.clock=0;this.list=[];// 世界半径 -> 屏幕的缩放：原版最大轨道半径 ~55+25=80 世界单位
this._scale=Math.min(width,height)/160;}/** 添加 n 条鱼，鱼种按原版轮换分配 */BoidsSim.prototype.add=function(n){for(var i=0;i<n;i++){var idx=this.list.length;var info=FISH_TABLE[idx%FISH_TABLE.length];var speed=info.speed+Math.random()*info.speedRange;this.list.push({species:idx%FISH_TABLE.length,clockOffset:idx*DEFAULTS.fishOffset,speed:speed,xRadius:info.radius+Math.random()*info.radiusRange,yRadius:2+Math.random()*info.heightRange,heightOffset:info.heightOffset,tailSpeed:info.tailSpeed,scale:1+Math.random(),x:0,y:0,angle:0,phase:0});}};BoidsSim.prototype.remove=function(n){this.list.length=Math.max(0,this.list.length-n);};/** 每帧推进。dtMs = 帧间隔毫秒（原版 clock += elapsedTime * speed） */BoidsSim.prototype.update=function(dtMs){this.clock+=dtMs/1000*DEFAULTS.fishSpeed;var cx=this.width/2,cy=this.height/2;var k=this._scale;var list=this.list;for(var ii=0;ii<list.length;ii++){var f=list[ii];var fishClock=this.clock*DEFAULTS.fishSpeed+f.clockOffset;var speedClock=fishClock*f.speed;var xClock=speedClock*DEFAULTS.fishXClock;var yClock=speedClock*DEFAULTS.fishYClock;var x=Math.sin(xClock)*f.xRadius;var y=Math.sin(yClock)*f.yRadius+f.heightOffset;var nx=Math.sin(xClock-NEXT_STEP)*f.xRadius;var ny=Math.sin(yClock-0.01)*f.yRadius+f.heightOffset;f.x=cx+x*k;f.y=cy+y*k;f.angle=Math.atan2(ny-y,nx-x);f.phase=(this.clock+ii*TAIL_OFFSET_MULT)*f.tailSpeed*f.speed%(Math.PI*2);}};BoidsSim.FISH_TABLE=FISH_TABLE;global.BoidsSim=BoidsSim;})(typeof window!=='undefined'?window:globalThis);}).call(root);})(// The environment-specific global.
function(){if(typeof globalThis!=='undefined')return globalThis;if(typeof self!=='undefined')return self;if(typeof window!=='undefined')return window;if(typeof global!=='undefined')return global;if(typeof this!=='undefined')return this;return{};}.call(this));