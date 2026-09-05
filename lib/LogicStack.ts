
/**
 * 逻辑栈，依赖逻辑上主动出栈和退栈（仍然是非常依赖客户端主动去removeStack,好像也没有别的更好的办法？...）
 */ 
 interface LogicStackFuncMeta{
    stackName:string
    name:string,
    func:Function,
    args: any[],
    thisObject: any,
    autoNext:boolean,  // 自动切到下一个任务
    barrier:boolean    // 是否是屏障
}

export class LogicStack {
    public constructor(){
    }
    static instance;
    static logicStackData:{
        [key: string]:LogicStackFuncMeta[]
    } = {};

    /**
     * 栈内增加待执行函数
     * @param stackName 
     * @param name 
     * @param func 
     * @param args 
     * @param autoNext 
     */
    public static addStack(stackName:string, name:string, func:Function, thisObj: any, args?:any[], autoNext:boolean=false, barrier:boolean=false, once:boolean=true){
        // func.call(thisObj, args);
        if(once){
            this.addStackOnce(stackName, name, func, thisObj, args, autoNext, barrier);
        }else{
            this.addStackCanHaveMutil(stackName, name, func, thisObj, args, autoNext, barrier);
        }
    }

    public static addStackCanHaveMutil(stackName:string, name:string, func:Function, thisObj: any, args?:any[], autoNext:boolean=false, barrier:boolean=false) {
        if(!(stackName in this.logicStackData)){
            this.logicStackData[stackName] = [];
        }

        Logger.log(`[LogicStack] addStackCanHaveMutil stackName:${stackName} name:${name}`);

        this.logicStackData[stackName].push({stackName:stackName, name:name, func:func, thisObject: thisObj, args:args, autoNext:autoNext, barrier:barrier});
    }

    public static addStackOnce(stackName:string, name:string, func:Function, thisObj: any, args?:any[], autoNext:boolean=false, barrier:boolean=false) {
        if(!(stackName in this.logicStackData)){
            this.logicStackData[stackName] = [];
        }

        Logger.log(`[LogicStack] addStackOnce stackName:${stackName} name:${name}`);

        let stackData = this.logicStackData[stackName];
        if(stackData.length == 0){
            this.addStackCanHaveMutil(stackName, name, func, thisObj, args, autoNext, barrier);
            return;
        }

        for(let i = 0; i < stackData.length; ++i){
            let oneStack = stackData[i];
            if(oneStack.name == name){
                return;
            }
        }
        this.addStackCanHaveMutil(stackName, name, func, thisObj, args, autoNext, barrier);
    }

    private static callStackFunc(funcMeta:LogicStackFuncMeta){
        funcMeta.func.call(funcMeta.thisObject, funcMeta.args);
        if(funcMeta.autoNext){
            this.removeStack(funcMeta.stackName, funcMeta.name);
        }
    }

    public static removeStack(stackName:string, name:string){
        if(!(stackName in this.logicStackData)){
            return;
        }
        let stackData = this.logicStackData[stackName];
        if(stackData.length == 0){
            delete this.logicStackData[stackName];
            return;
        }
        for(let i = 0; i < stackData.length; ++i){
            let oneStack = stackData[i];
            if(oneStack.name == name && oneStack.barrier == true){
                // 栈内第一个元素
                if(i == 0){
                }
                // 否则直接删掉即可
                else{
                    stackData.splice(i, 1);
                    Logger.log("[LogicStack] stack name", oneStack.name, oneStack.barrier);
                    this.callStackFunc(oneStack);
                    return;
                }
                break;
            }
        }

        let first = stackData[0];
        if(first.name == name){
            stackData.shift();
        }
        else{
            Logger.warn(`[LogicStack] stackName ${stackName} name ${name} should not trigger, curName is ${first.name}`);
            return;
        }

        if(stackData.length == 0){
            delete this.logicStackData[stackName];
        }

        if(stackData.length > 0){
            let first = stackData[0];
            Logger.info(`[LogicStack] stackName:${stackName} removeStack: ${name}, call: ${first.name}`);
            this.callStackFunc(first);
        }
    }

    public static removeStackTop(stackName: string){
        if(!(stackName in this.logicStackData)){
            return;
        }
        let stackData = this.logicStackData[stackName];
        if(stackData.length == 0){
            delete this.logicStackData[stackName];
            return;
        }
        let first = stackData[0];
        // Logger.info(`[LogicStack] removeStackTop: ${stackName} ${first.name}`);
        LogicStack.removeStack(stackName, first.name);
    }

    public static triggerStack(stackName:string){
        Logger.info(`[LogicStack] $$$$$ triggerStack:${stackName} $$$$$`);
        let stackData = this.logicStackData[stackName];
        if(stackData && stackData.length > 0){
            let funcMeta = stackData[0];
            Logger.info(`[LogicStack] stackName:${stackName} call: ${funcMeta.name}`);
            this.callStackFunc(funcMeta);
        }
    }

    public static clearStack(stackName:string){
        if(!(stackName in this.logicStackData)){
            return;
        }

        let stackData = this.logicStackData[stackName];
        if(stackData && stackData.length > 0){
            for(let i = 0; i < stackData.length; i++){
                stackData.pop();
            }
            delete this.logicStackData[stackName];
        }
    }

    public static clearAllStack() {
        for(let stackName in this.logicStackData){
            LogicStack.clearStack(stackName);
        }
    }
}

/**
 * 用于管理刚进入游戏的一些业务逻辑顺序,同一个
 */
export class LogicStackName{
    //只是用于开始执行
    public static DEFAULT:string = "DEFAULT";

    //场景初始化TaskQueue
    public static SCENE_START_PREPARE: string = "SCENE_START_PREPARE";

    //MainUI初始化TaskQueue
    public static MAIN_UI_PREPARE: string = "MAIN_UI_PREPARE";

    //MainUI中可以延后初始化的TaskQueue
    public static MAIN_UI_LATE_PREPARE: string = "MAIN_UI_LATE_PREPARE";

    //可以延后执行的TaskQueue
    public static LATE_PREPARE: string = "LATE_PREPARE";
}

export class LogicStackFuncName{
    
    //SCENE_START_PREPARE
    public static DEFAULT_START: string = "DEFAULT_START";

    // public static CREATE_FIRST_SCENE_HERO: string = "CREATE_FIRST_SCENE_HERO";      //创建场景主角
    // public static CREATE_FIRST_SCENE_OTHERS: string = "CREATE_FIRST_SCENE_OTHERS";  //创建场景其他玩家
    // public static START_SCENE_CONTAINER: string = "START_SCENE_CONTAINER";          //开始场景Container

    //MAIN_UI_PREPARE
    // public static INIT_MAIN_CITY_CHANNELGE: string = "INIT_MAIN_CITY_CHANNELGE";                    //初始化主城,挑战
    public static INIT_CLICK_HAND_ANI: string = "INIT_CLICK_HAND_ANI";          //初始化新手引导小手
    public static INIT_LAYER_HIDE_MGR: string = "INIT_LAYER_HIDE_MGR";          //初始化LayerHideMgr
    public static INIT_MAINUI_CHAT: string = "INIT_MAINUI_CHAT";                //初始化MainUI chat
    public static INIT_REDPACK: string = "INIT_REDPACK";                        //初始化红包层

    // public static INIT_MAINBOTTOM_ANI: string = "INIT_MAINBOTTOM_MC";            //初始化MainBottom 动画
    public static INIT_MAINREWARD_ANI: string = "INIT_MAINREWARD_ANI";          //初始化挂机奖励
    public static INIT_GUAJI_ANI: string = "INIT_GUAJI_ANI";                    //初始化挂机相关界面动画

    public static START_GUIDE_PLOT: string = "START_GUIDE_PLOT";                //开始剧情
    
    //MAIN_UI_LATE_PREPARE
    public static PREPARE_END: string = "PREPARE_END";          //初始化结束

    //LATE_PREPARE
    public static SHOW_GUAJI_FIRE_EFFECT: string = "SHOW_GUAJI_FIRE_EFFECT";    //显示挂机火焰效果

    //触发式礼包
    public static SHOW_TRIGGER_GIFT: string = "SHOW_TRIGGER_GIFT";

    // public static START_FREE_LOAD: string = "START_FREE_LOAD";      //开启静默加载
}