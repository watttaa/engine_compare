import { BaseEventDispatcher } from "lib/BaseEventDispatcher";

export class EventDispatcherMgr {
    private static $dispatcherArr: BaseEventDispatcher[] = [];

    public static register(dispatcher: BaseEventDispatcher) {
        if (this.$dispatcherArr.indexOf(dispatcher) === -1) {
            this.$dispatcherArr.push(dispatcher);
        }
    }

    public static clear() {
        this.$dispatcherArr.forEach(dispatcher => {
            dispatcher.clearEventListener();
        })
    }
}