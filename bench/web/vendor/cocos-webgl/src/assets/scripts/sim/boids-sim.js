(function(root){var exports=undefined,module=undefined,require=undefined;var define=undefined;var self=root,window=root,global=root,globalThis=root;(function(){/**
 * BoidsSim — 2D 鱼群仿真核心（严格迁移 CppFishingCode 捕鱼游戏游动逻辑）
 *
 * 迁移自 fish.cpp / fishConfig.cpp：
 *   - 出生：6 个方位点（左右边缘 × 上/中/下）
 *   - 速度：round(3 + random()*3) px/帧
 *   - 角度：15 种 angleType，每条鱼在 [minAngle, maxAngle] 区间往返摆动
 *     （每帧 angle 单调 ++ 或 --，angleAdd 控制方向）
 *   - 前进：x += cos(angle)*speed, y += sin(angle)*speed
 *   - 出界：大包围盒检测 → 移除重生
 *
 * 角度单位：cpp 用【度】，这里内部转【弧度】供三角函数。
 * 渲染用的倾斜角 = 当前角度相对水平的小偏转（鱼贴图朝左）。
 */(function(global){'use strict';var FISH_SPECIES=5;var DEG=Math.PI/180;// 鱼种视觉缩放补偿（fish_1 长鱼 / fish_2 鲨鱼 / fish_3 小鱼，species = idx % 5）
var SPECIES_SCALE=[0.45,0.55,1.0,0.45,0.55];function BoidsSim(width,height){this.width=width||800;this.height=height||600;this.list=[];}BoidsSim.prototype.add=function(n){for(var i=0;i<n;i++){this.list.push(this._spawn(this.list.length%FISH_SPECIES));}};BoidsSim.prototype.remove=function(n){this.list.length=Math.max(0,this.list.length-n);};/** 迁移 cpp setType 的角度区间，但收窄为"从右往左"：
   *  鱼从右边缘出生，朝左游（角度在 90°~270° 之间的左向区间），
   *  保留 cpp 的每帧角度单调摆动 + 往返的游动手感。 */function angleTypeOf(angType){var r=Math.random;switch(angType){case 0:return[160+r()*20,200+r()*20];// 左
case 1:return[170+r()*10,190+r()*10];// 近水平向左
case 2:return[150+r()*15,210+r()*15];// 左 + 上下摆动
case 3:return[135+r()*10,170+r()*10];// 左上
case 4:return[190+r()*10,225+r()*10];// 左下
case 5:return[160+r()*30,200+r()*30];// 左 + 大摆动
default:return[170,190];// 近水平向左
}}BoidsSim.prototype._spawn=function(species){var w=this.width,h=this.height;// 从右往左：出生点固定右边缘，随机高度
var x=w+50+Math.random()*100;var y=Math.random()*h;var angType=Math.floor(Math.random()*6);var range=angleTypeOf(angType);var minA=range[0],maxA=range[1];var initAngle=(minA+maxA)/2;return{species:species,x:x,y:y,angle:initAngle*DEG,// 当前角度（弧度）
minAngle:minA*DEG,maxAngle:maxA*DEG,angleAdd:Math.random()<0.5,// cpp 的 angleAdd：true 则角度 ++，false 则 --
speed:2+Math.random()*2,// 2~4 px/帧
scale:(0.6+Math.random()*0.8)*SPECIES_SCALE[species%FISH_SPECIES]};};/** 每帧推进：迁移 cpp frameFun/moveForword */BoidsSim.prototype.update=function(dtMs){var step=(dtMs||16.7)/16.7;var w=this.width,h=this.height;var list=this.list;var margin=120;for(var i=0;i<list.length;i++){var f=list[i];// cpp frameFun：角度在 [min,max] 间每帧单调增减
if(f.angleAdd)f.angle+=0.5*DEG*step;else f.angle-=0.5*DEG*step;if(f.angle>f.maxAngle){f.angle=f.maxAngle;f.angleAdd=false;}else if(f.angle<f.minAngle){f.angle=f.minAngle;f.angleAdd=true;}// cpp moveForword：沿角度直线前进
f.x+=Math.cos(f.angle)*f.speed*step;f.y+=Math.sin(f.angle)*f.speed*step;// cpp inScreen：出大包围盒 → 重生
if(f.x<-margin||f.x>w+margin||f.y<-margin||f.y>h+margin){list[i]=this._spawn(f.species);}}};BoidsSim.FISH_SPECIES=FISH_SPECIES;global.BoidsSim=BoidsSim;})(typeof window!=='undefined'?window:globalThis);}).call(root);})(// The environment-specific global.
function(){if(typeof globalThis!=='undefined')return globalThis;if(typeof self!=='undefined')return self;if(typeof window!=='undefined')return window;if(typeof global!=='undefined')return global;if(typeof this!=='undefined')return this;return{};}.call(this));