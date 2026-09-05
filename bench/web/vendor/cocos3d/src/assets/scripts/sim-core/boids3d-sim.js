(function(root){var exports=undefined,module=undefined,require=undefined;var define=undefined;var self=root,window=root,global=root,globalThis=root;(function(){/**
 * Boids3DSim — 3D 鱼群仿真核心（引擎无关）
 *
 * 严格迁移 Khronos webglsamples Aquarium 的 3D 鱼群运动模型：
 *   - 5 鱼种（g_fishTable 参数逐项对齐）
 *   - Lissajous 椭圆轨迹：x=sin(xClock)*xRadius, y=sin(yClock)*yRadius+height, z=cos(zClock)*zRadius
 *   - 朝向 = 切线方向（next 相位 -0.04），绕 Y 轴角度
 *   - 尾巴弯曲 time 也由仿真输出（渲染层用），保证三引擎尾巴动画一致
 *
 * 输出每鱼字段：
 *   species, x, y, z, angleY(弧度,绕Y), tailTime(弧度)
 *
 * 时钟单位：秒（适配器用 performance.now() 推进，与 sim-core 帧时同源）
 */(function(global){'use strict';// 原版 g_fishTable（aquarium.js L135-219）
var FISH_TABLE=[{speed:1,speedRange:1.5,radius:30,radiusRange:25,tailSpeed:10,heightOffset:0,heightRange:16},{speed:1,speedRange:2,radius:10,radiusRange:20,tailSpeed:1,heightOffset:0,heightRange:16},{speed:0.5,speedRange:4,radius:10,radiusRange:20,tailSpeed:3,heightOffset:-8,heightRange:5},{speed:0.5,speedRange:0.5,radius:50,radiusRange:3,tailSpeed:1.5,heightOffset:0,heightRange:16},{speed:0.5,speedRange:0.5,radius:45,radiusRange:3,tailSpeed:1,heightOffset:0,heightRange:16}];// 尾巴弯曲常数（g_fishTable constUniforms）
var FISH_LENGTH=10;var FISH_WAVE_LENGTH=[1,-2,-2,-1,-0.7];var FISH_BEND_AMOUNT=[2,2,2,0.5,0.3];// 原版 g.fish 全局参数（aquarium.js L115-122）
var G={fishSpeed:0.124,fishOffset:0.52,fishHeight:25,fishHeightRange:1,fishXClock:1,fishYClock:0.556,fishZClock:1,fishTailSpeed:1};function Boids3DSim(){this.list=[];this.clock=0;// 全局时钟（秒）
}Boids3DSim.FISH_TABLE=FISH_TABLE;Boids3DSim.prototype.add=function(n){for(var i=0;i<n;i++){var species=this.list.length%5;this.list.push(this._spawn(species));}};Boids3DSim.prototype.remove=function(n){this.list.length=Math.max(0,this.list.length-n);};Boids3DSim.prototype._spawn=function(species){var t=FISH_TABLE[species];var r=Math.random;return{species:species,speed:t.speed+r()*t.speedRange,xRadius:t.radius+r()*t.radiusRange,yRadius:2.0+r()*t.heightRange*G.fishHeightRange,zRadius:t.radius+r()*t.radiusRange,height:G.fishHeight+t.heightOffset,scale:1.0+r(),// 原版 scale = (1+random)*fishScale, fishScale=1
tailSpeed:t.tailSpeed*G.fishTailSpeed,// 输出字段
x:0,y:0,z:0,angleY:0,tailTime:0};};/**
   * 每帧推进。clock 累计（秒），phaseIdx 用 list 下标（原版 ii * fishOffset）。
   */Boids3DSim.prototype.update=function(dtSec){this.clock+=dtSec;var clock=this.clock;var list=this.list;for(var i=0;i<list.length;i++){var f=list[i];var fishBaseClock=clock*G.fishSpeed;var fishClock=fishBaseClock+i*G.fishOffset;var fishSpeedClock=fishClock*f.speed;var xClock=fishSpeedClock*G.fishXClock;var yClock=fishSpeedClock*G.fishYClock;var zClock=fishSpeedClock*G.fishZClock;var x=Math.sin(xClock)*f.xRadius;var y=Math.sin(yClock)*f.yRadius+f.height;var z=Math.cos(zClock)*f.zRadius;var nx=Math.sin(xClock-0.04)*f.xRadius;var nz=Math.cos(zClock-0.04)*f.zRadius;f.x=x;f.y=y;f.z=z;// 朝向：绕 Y 轴，atan2(dx, dz)（x/z 平面切线）
f.angleY=Math.atan2(nx-x,nz-z);// 尾巴时间：原版 time = ((clock + ii) * tailSpeed * speed) % 2π
f.tailTime=(clock+i)*f.tailSpeed*f.speed%(Math.PI*2);}};// 尾巴弯曲顶点偏移（渲染层调用，引擎无关）：offset = mult^2 * sin(time + mult*wave) * bend
Boids3DSim.bendOffset=function(localZ,species,tailTime){var len=FISH_LENGTH;var wave=FISH_WAVE_LENGTH[species%5];var bend=FISH_BEND_AMOUNT[species%5];var mult=localZ>0?localZ/len:-localZ/len*2;return mult*mult*Math.sin(tailTime+mult*wave)*bend;};global.Boids3DSim=Boids3DSim;})(typeof window!=='undefined'?window:globalThis);}).call(root);})(// The environment-specific global.
function(){if(typeof globalThis!=='undefined')return globalThis;if(typeof self!=='undefined')return self;if(typeof window!=='undefined')return window;if(typeof global!=='undefined')return global;if(typeof this!=='undefined')return this;return{};}.call(this));