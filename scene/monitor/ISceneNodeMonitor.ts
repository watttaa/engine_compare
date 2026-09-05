

export interface ISceneNodeMonitor {

    /**显示优先级 
     * 0：表示一定显示；
     * 值越小优先级越大*/
    get renderPriority(): number;
}