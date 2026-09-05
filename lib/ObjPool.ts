export class ObjectPool {
    private static _content: any = {};
    private _objs: Array<any>;

    /**
     * 构造函数
     */
    public constructor() {
        this._objs = new Array<any>();
    }

    public get size(): number {
        return this._objs.length;
    }

    /**
     * 放回一个对象
     * @param obj
     */
    public pushObj(obj: any): void {
        this._objs.push(obj);
    }

    /**
     * 取出一个对象
     * @returns {*}
     */
    public popObj(): any {
        if (this._objs.length > 0) {
            return this._objs.pop();
        } else {
            return null;
        }
    }

    /**
     * 对象池类是否还有对象
     */
    public IsHaveObj(): boolean {
        if (this._objs.length > 0) {
            return true;
        }
        else {
            return false;
        }
    }

    /**
     * 清除所有缓存对象
     */
    public clear(): void {
        while (this._objs.length > 0) {
            this._objs.pop();
        }
    }

    /**
     * 取出一个对象
     * @param classZ Class
     * @return Object
     *
     */
    public static popByClass(classZ: any, ...args: any[]): any {
        let refKey: string = egret.getQualifiedClassName(classZ);

        if (!ObjectPool._content[refKey]) {
            ObjectPool._content[refKey] = [];
        }

        var list: Array<any> = ObjectPool._content[refKey];
        if (list.length) {
            return list.pop();
        } else {
            var argsLen: number = args.length;
            var obj: any;
            if (argsLen == 0) {
                obj = new classZ();
            } else if (argsLen == 1) {
                obj = new classZ(args[0]);
            } else if (argsLen == 2) {
                obj = new classZ(args[0], args[1]);
            } else if (argsLen == 3) {
                obj = new classZ(args[0], args[1], args[2]);
            } else if (argsLen == 4) {
                obj = new classZ(args[0], args[1], args[2], args[3]);
            } else if (argsLen == 5) {
                obj = new classZ(args[0], args[1], args[2], args[3], args[4]);
            }
            obj.ObjectPoolKey = refKey;
            return obj;
        }
    }

    /**
     * 放入一个对象
     * @param obj
     *
     */
    public static push(obj: any): boolean {
        if (obj == null) {
            return false;
        }

        var refKey: any = obj.ObjectPoolKey;
        //保证只有pop出来的对象可以放进来，或者是已经清除的无法放入
        if (!ObjectPool._content[refKey]) {
            return false;
        }

        if (obj['reset']) {
            obj['reset']();
        }

        ObjectPool._content[refKey].push(obj);
        return true;
    }

    /**
     * 清除所有对象
     */
    public static clear(): void {
        ObjectPool._content = {};
    }

    /**
     * 清除某一类对象
     * @param classZ Class
     * @param clearFuncName 清除对象需要执行的函数
     */
    public static clearClass(classZ: any, clearFuncName: string = null): void {
        let refKey: string = egret.getQualifiedClassName(classZ);

        var list: Array<any> = ObjectPool._content[refKey];
        while (list && list.length) {
            var obj: any = list.pop();
            if (clearFuncName) {
                obj[clearFuncName]();
            }
            obj = null;
        }
        ObjectPool._content[refKey] = null;
        delete ObjectPool._content[refKey];
    }

    /**
     * 缓存中对象统一执行一个函数
     * @param classZ Class
     * @param dealFuncName 要执行的函数名称
     */
    public static dealFunc(classZ: any, dealFuncName: string): void {
        let refKey: string = egret.getQualifiedClassName(classZ);

        var list: Array<any> = ObjectPool._content[refKey];
        if (list == null) {
            return;
        }

        var i: number = 0;
        var len: number = list.length;
        for (i; i < len; i++) {
            list[i][dealFuncName]();
        }
    }
}