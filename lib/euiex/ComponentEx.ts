export class ComponentEx extends eui.Component {
    public _isEuiex = true;
    private $inited: boolean = false;

    public get inited() {
        return this.$inited;
    }

    protected onSkinLoadCompleted() {
        super.onSkinLoadCompleted();
        this.$inited = true;
    }
}