
import { ArmatureDisplayPanel } from "lib/ArmatureDisplayPanel";
import { SpinePanel } from "lib/SpinePanel";
import { TweenGroupPanel } from "lib/TweenGroupPanel";

export class UIManagerFactroy {

    public static createPanel(parent: egret.DisplayObjectContainer | BaseWidgetBase, cls: any, x = 0, y = 0, justWarmUp = false, alpha = 1, openArgs?: OpenArgs) {
        // let root = parent instanceof BaseWidgetBase ? parent.baseInst :  parent;
        
        let tag = UIManager.getTag(cls);
        if (ProfileConfig.EXML_LOAD_RECORD) {
            ExmlAnalyze.onPanelClick(tag);
        }
        Logger.log(`TIPS>>> createPanel 打开面板：${tag}`);
        
        let root = parent === null ? null : parent instanceof BaseWidgetBase ? parent.baseInst : (parent["grpRoot"] || parent);
        cls.prototype.UI_LAYER = root;
        cls.prototype.destroyClearUILayer = true;
        cls.prototype.justWarmUp = justWarmUp;
        //先获取是否有preOpen的BaseWidget
        let inst: BaseWidgetBase = UIManager.getPreOpenPanel(tag);
        if(!inst){
            inst = new cls(openArgs);
        }else{
            inst.checkPreOpenUnDo();
        }
        inst.x = x;
        inst.y = y;
        inst.alpha = alpha;
        return inst as BaseWidget;
    }

    /**
     * 提前创建一个面板，并等parent初始化完后自动addChild进去
     * @param parentWidget parent所在的Widget
     * @param parentIndex parent在Widget里的索引，一般来说就是变量名
     * @param lockRes 保存面板的索引，用于异步执行的时候判断有效性，比如连续执行了createFuturePanel两次，
     * 那么第二次会覆盖第一次的lockRes，因此第一次在异步回来后发现与lockRes的值不一致，就丢弃结果
     * @param cls 面板的类
     * @param x 
     * @param y 
     * @returns 
     */
    public static createFuturePanel(parentWidget: BaseWidgetBase, parentIndex: string, lockRes:string, cls: any, x = 0, y = 0){
        if (parentWidget.inited) {
            let panel = UIManagerFactroy.createPanel(parentWidget[parentIndex], cls, x, y);
            parentWidget[lockRes] = panel;
            return panel;
        }
        
        let futurePanel = UIManagerFactroy.createPanel(null, cls, x, y, true);
        parentWidget[lockRes] = futurePanel;
        safeInvokeFunc(parentWidget, () => {
            if(parentWidget[lockRes] === futurePanel) {
                let parent = parentWidget[parentIndex];
                futurePanel.parent = parent;                
            }
        });
        return futurePanel;
    }

    public static createTweenGroupPanel(parent: egret.DisplayObjectContainer | BaseWidgetBase, exml: string, x: number = 0, y: number = 0, isAutoSizeFullScreen: boolean = true) {
        Logger.log(`加载Exml: ${exml}`);
        let inst = new TweenGroupPanel(parent instanceof BaseWidgetBase ? parent.baseInst : parent, exml, isAutoSizeFullScreen);
        inst.x = x;
        inst.y = y;
        return inst;
    }

    public static createArmatureDisplayPanel(parent: egret.DisplayObjectContainer | BaseWidgetBase, skeJson: string, textureJson: string, textureRes: string, aniName: string, x: number = 0, y: number = 0) {
        let inst = new ArmatureDisplayPanel(parent instanceof BaseWidgetBase ? parent.baseInst : parent, skeJson, textureJson, textureRes, aniName);
        inst.x = x;
        inst.y = y;
        return inst;
    }

    public static createSpinePanel(parent: egret.DisplayObjectContainer | BaseWidgetBase, resName: string, targetWidth: number = 0, targetHeight: number = 0, x: number = 0, y: number = 0, bLoadBinary: boolean = true) {
        let inst = new SpinePanel(parent instanceof BaseWidgetBase ? parent.baseInst : parent, resName, x, y, targetWidth, targetHeight, bLoadBinary);
        inst.x = x;
        inst.y = y;
        return inst;
    }
}