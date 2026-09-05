

//////////////////////////////////////////////////////////////
export class CommonEventManager extends SingletonClassEx {
    private _host: string = "";

    public constructor() {
        super();
        EventBus = this;
    }

    public get host() {
        return this._host;
    }

    public set host(value: string) {
        this._host = value;
    }

}

export var EventBus: CommonEventManager;