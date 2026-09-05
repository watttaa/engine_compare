
type TabButtonType = eui.RadioButton | eui.ItemRenderer

/**
 * 需求是按钮如果已经被选中就不要刷新
 * 功能一：防止重复点击已经被选中的按钮 会导致重复拉取数据
 * 功能二：等服务器回调再更新界面 先恢复状态 防止功能没有开放然后按钮被选中 
 */

/**
 * 根据周会的要求 把功能 放到radiobutton类里面
 * 属性repeatClick选项是防止重复点击
 * 属性autoSelected是防止点击 设置状态
 */
// export class TabButtonManager{
//     // 监听事件优先级
//     private static readonly Priority = 10;
//     private curIndex:number = 0;
//     private buttons:TabButtonType[];

//     private onTouchRepeat(e:egret.Event){
//         let btn:TabButtonType = e.target;
//         let index = this.buttons.indexOf(btn);
//         let curButton = this.buttons[this.curIndex];
//         if (curButton){// 先恢复之前的选中按钮 当功能没有开放时 没有等服务器回调 但是按钮却选中
//             curButton.selected = true;
//         }
//         if (index === -1){
//             Logger.error("找不到该按钮");
//         }
//         else{
//             if (this.curIndex == index){
//                 e.stopImmediatePropagation();
//             }
//             this.curIndex = index;
//         }
//     }

//     private onTouchStart(e:egret.Event){
//         this.updateCurIndex();
//     }

//     public addButtons(buttons: TabButtonType[]){
//         if (!this.buttons){
//             this.buttons = [];
//         }
//         for (let i=0;i<buttons.length;i++){
//             let btn = buttons[i];
//             if (!btn) continue;
//             btn.removeEventListener(egret.TouchEvent.TOUCH_TAP, this.onTouchRepeat, this, false);
//             btn.addEventListener(egret.TouchEvent.TOUCH_TAP, this.onTouchRepeat, this, false, TabButtonManager.Priority);
//             btn.removeEventListener(egret.TouchEvent.TOUCH_BEGIN, this.onTouchStart, this, false);
//             btn.addEventListener(egret.TouchEvent.TOUCH_BEGIN, this.onTouchStart, this, false, TabButtonManager.Priority);
//             this.buttons.push(btn);
//         }
//         this.updateCurIndex();
//     }    

//     /**
//      * 更新当前的被选中的按钮
//      */
//     private updateCurIndex(){
//         if(this.buttons){
//             for (let i=0;i<this.buttons.length;i++){
//                 if (this.buttons[i]?.selected){
//                     this.curIndex = i;
//                     break;
//                 }
//             }
//         }
//     }

//     public reset(){
//         this.curIndex = 0;
//     }

//     public destroy(){
//         this.curIndex = 0;
//         if (this.buttons && this.buttons.length){
//             for (let btn of this.buttons){
//                 if (!btn) continue;
//                 btn.removeEventListener(egret.TouchEvent.TOUCH_BEGIN, this.onTouchStart, this, false);
//                 btn.removeEventListener(egret.TouchEvent.TOUCH_TAP, this.onTouchRepeat, this, false);
//             }
//         }
//     }
// }