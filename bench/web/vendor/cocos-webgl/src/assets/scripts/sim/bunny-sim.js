(function(root){var exports=undefined,module=undefined,require=undefined;var define=undefined;var self=root,window=root,global=root,globalThis=root;(function(){/**
 * BunnySim — 从 pixijs/bunny-mark 的 Bunny.js 逐参数移植的仿真核心
 *
 * 与原版保持一致的物理参数（三引擎公平性依据）：
 *  - gravity = 0.75
 *  - speedX = random*10, speedY = random*10-5
 *  - 左右边界：反弹 speedX *= -1，位置钳位
 *  - 底部：speedY *= -0.85，50% 概率额外 speedY -= random*6
 *  - 顶部：speedY = 0
 *
 * 纯数据对象（SoA/结构体数组均可，这里用对象数组保可读性），
 * 引擎适配器只负责把 (x, y) 写进各自的显示节点。
 */(function(global){'use strict';function BunnySim(bounds){this.bounds=bounds||{left:0,top:0,right:800,bottom:600};this.list=[];}/** 添加 n 只兔子。initX 复刻原版：(count % 2) * 800 */BunnySim.prototype.add=function(n){var b=this.bounds;for(var i=0;i<n;i++){var count=this.list.length;this.list.push({x:count%2*800,y:0,speedX:Math.random()*10,speedY:Math.random()*10-5});}};BunnySim.prototype.remove=function(n){this.list.length=Math.max(0,this.list.length-n);};/** 每帧推进一次（原版按帧推进，不用 dt，保持一致） */BunnySim.prototype.update=function(){var b=this.bounds,list=this.list,g=0.75;for(var i=0,len=list.length;i<len;i++){var bny=list[i];bny.x+=bny.speedX;bny.y+=bny.speedY;bny.speedY+=g;if(bny.x>b.right){bny.speedX*=-1;bny.x=b.right;}else if(bny.x<b.left){bny.speedX*=-1;bny.x=b.left;}if(bny.y>b.bottom){bny.speedY*=-0.85;bny.y=b.bottom;if(Math.random()>0.5)bny.speedY-=Math.random()*6;}else if(bny.y<b.top){bny.speedY=0;bny.y=b.top;}}};global.BunnySim=BunnySim;})(typeof window!=='undefined'?window:globalThis);}).call(root);})(// The environment-specific global.
function(){if(typeof globalThis!=='undefined')return globalThis;if(typeof self!=='undefined')return self;if(typeof window!=='undefined')return window;if(typeof global!=='undefined')return global;if(typeof this!=='undefined')return this;return{};}.call(this));