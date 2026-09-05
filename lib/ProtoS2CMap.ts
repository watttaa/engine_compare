// import "net/MsgSNet"

export let ProtS2CMap_ = {}
G123.set("ProtS2CMap_", ProtS2CMap_);

export function regProto(protoObj) {
    for (const key of Object.keys(protoObj)) {
        if (DEV && ProtS2CMap_[key] !== undefined) {
            debug_helper.showError("", "", "[regProto]重复注册协议: " + key);
        }
    }
    Object.assign(ProtS2CMap_, protoObj)
}

export function regProtos(loader: (func_name?: string, ...params: any[]) => Promise<any>, prots: string[]) {
    loader = curry(loader);
    prots.forEach(n => {
        if (DEV && ProtS2CMap_[n] !== undefined) {
            debug_helper.showError("", "", "[regProtos]重复注册协议: " + n);
        }
        ProtS2CMap_[n] = function (evt: ProtEvent) {
            loader(n, evt);
        }
    });
}