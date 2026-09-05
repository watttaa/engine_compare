
    ///添加了移除动画的list
    export class ListEx extends eui.List {
    public _isEuiex = true;
        public playEffRemoveAt(index: number, callBack?: Function, thisObj?: any) {
            let child = this.getElementAt(index);
            if (child) {
                egret.Tween.get(child).to({ alpha: 0 }, 150)
                let height = child.height;
                egret.Tween.get(child).to({ height: 0 }, 200).call(() => {
                    child.height = height;
                    child.alpha = 1;
                    (this.dataProvider as eui.ArrayCollection).removeItemAt(index);
                    if (callBack && thisObj) {
                        callBack.apply(thisObj);
                    }
                }, this);
            } else {
                Logger.error("ListEx组件 : 该元素不存在");
            }
        }

        // protected itemRemoved(item: any, index: number) {
        //     super.itemRemoved(item, index);
        // }

        // public getElementAt(index: number): egret.DisplayObject {
        //     let element = super.getElementAt(index);
        //     return element;
        // }
    }
