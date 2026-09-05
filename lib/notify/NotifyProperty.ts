import { BaseWidgetCommonEvent, CommonEvent } from "event/CommonEventDefines";
import { EventBus } from "lib/CommonEventMgr";
import { NotifyID, NotifyIDChangeData } from "./Const"
// // 自定义事件类型
// class NotifyEvent extends egret.Event {
//     static readonly ID_CHANGED = "notifyIDChanged";
//     oldValue?: NotifyID;
//     newValue?: NotifyID;

//     constructor(oldValue?: NotifyID, newValue?: NotifyID) {
//         super(NotifyEvent.ID_CHANGED);
//         this.oldValue = oldValue;
//         this.newValue = newValue;
//     }
// }

// // 属性访问器装饰器
// function NotifyProperty() {
//     return (target: any, key: string) => {
//         Object.defineProperty(target, key, {
//             get() {
//                 return notifyIDMap.get(this);
//             },
//             set(value: NotifyID) {
//                 const oldValue = notifyIDMap.get(this);
//                 if (oldValue === value) return;

//                 // 更新存储
//                 if (value === undefined) {
//                     notifyIDMap.delete(this);
//                 } else {
//                     notifyIDMap.set(this, value);
//                 }

//                 // 派发变更事件
//                 this.dispatchEvent(new NotifyEvent(oldValue, value));
//             },
//             enumerable: true,
//             configurable: true
//         });
//     }
// }

// 应用到所有 UI 对象 (在项目初始化时调用)
export function initNotifySystem() {
    Object.defineProperty(egret.DisplayObject.prototype, "notifyIds", {
        get() {
            return this.$__notifyIds
        },
        set(newIds: NotifyID[]) {
            const oldIds = this.$__notifyIds
            if (oldIds === newIds) return;
            this.$__notifyIds = newIds
            const data: NotifyIDChangeData = [this, oldIds, newIds]
            EventBus.dispatchEvent(new CommonEvent(CommonEvent.NOTIFY_ID_CHANGED, data));
        },
        enumerable: true,
        configurable: true
    });
}