

/** 纯灰色 */
const colorGrey = [
    0.33, 0.33, 0.33, 0, 0,
    0.33, 0.33, 0.33, 0, 0,
    0.33, 0.33, 0.33, 0, 0,
    0, 0, 0, 1, 0
];

/** 亮灰色 */
const colorGreyLight = [
    0.6, 0.6, 0.6, 0, 0,
    0.6, 0.6, 0.6, 0, 0,
    0.6, 0.6, 0.6, 0, 0,
    0, 0, 0, 1, 0
];

/** 暗灰色 */
const colorGreyDark = [
    0.6, 0, 0, 0, 0,
    0, 0.6, 0, 0, 0,
    0, 0, 0.6, 0, 0,
    0, 0, 0, 1, 0
];

export namespace filter_utils {

    export enum FilterType {
        NONE,
        GREY,
        GREY_LIGHT,
        GREY_DARK,
    }

    export function setGray(uiObj: egret.DisplayObject, isGray: boolean, filter: egret.Filter[] = null) {
        if (uiObj) {
            uiObj.filters = isGray ? filter || getFilter(FilterType.GREY) : null;
        }
    }

    export function getFilter(type: FilterType = FilterType.NONE): egret.Filter[] {
        switch (type) {
            case FilterType.NONE:
                return null;
            case FilterType.GREY:
                return [new egret.ColorMatrixFilter(colorGrey)];
            case FilterType.GREY_LIGHT:
                return [new egret.ColorMatrixFilter(colorGreyLight)];
            case FilterType.GREY_DARK:
                return [new egret.ColorMatrixFilter(colorGreyDark)];
            default:
                return null;
        }
    }

    export function getGreyFilter(): egret.Filter[] {
        return getFilter(FilterType.GREY);
    }

    export function addGreyFilter(target: egret.DisplayObject, type: FilterType = FilterType.GREY) {
        if (!target) return;
        let targetFilter = getFilter(type);
        target.filters = targetFilter;
    }

    export function removeAllFilters(target: egret.DisplayObject) {
        if (!target) return;
        let targetFilter = getFilter(FilterType.NONE);
        target.filters = targetFilter;
    }

    /**
     * 递归对叶子叶子对象设置filter
     * @param target 
     * @param type 
     */
    function addFilterRecursion(target: egret.DisplayObject, type: FilterType = FilterType.GREY) {
        if (target instanceof egret.DisplayObjectContainer) {
            let children = target.$children;
            if (children) {
                let lenth = children.length;
                for (let i = 0; i < lenth; i++) {
                    let child = children[i];
                    addFilterRecursion(child, type);
                }
            }
        } else {
            addGreyFilter(target, type);
        }
    }

    /**
     * 递归对叶子显示对象去掉filter
     * @param target 
     */
    function removeFilterRecursion(target: egret.DisplayObject) {
        if (target instanceof egret.DisplayObjectContainer) {
            let children = target.$children;
            if (children) {
                let lenth = children.length;
                for (let i = 0; i < lenth; i++) {
                    let child = children[i];
                    removeFilterRecursion(child);
                }
            }
        } else {
            removeAllFilters(target);
        }
    }

    /**
     * 添加滤镜接口,对于eui.Group类型的会递归所有Image子节点添加filter而不申请RT
     * @param target 
     * @param type 
     */
    export function addFilterAdvance(target: egret.DisplayObject, type: FilterType = FilterType.GREY) {
        if (type == undefined || type == null || (type == FilterType.NONE)) {
            this.removeFiltersAdvance(target);
            return;
        }
        if (target instanceof egret.DisplayObjectContainer) {
            addFilterRecursion(target, type);
        } else {
            addGreyFilter(target, type);
        }
    }

    /**
     * addFilterAdvance接口的对接remove接口，如果使用addFilterAdvance接口需要使用该接口去除滤镜
     * @param target 
     */
    export function removeFiltersAdvance(target: egret.DisplayObject) {
        removeFilterRecursion(target);
    }

}