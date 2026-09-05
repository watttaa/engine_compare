import { EventDispatcherMgr } from "lib/EventDispatcherMgr";

export class BaseEventDispatcher extends egret.EventDispatcher {
    constructor() {
        super();
        // EventDispatcherMgr.register(this);
    }
}