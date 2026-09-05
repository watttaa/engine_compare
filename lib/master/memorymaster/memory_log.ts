import { date_utils } from "utils/DateUtils";

export namespace memory_log {

    export function log(...rest: Array<any>) {
        if (DEV) {
            Logger.log(`#memory_master: ${date_utils.dateFormat(new Date(), "hh:mm:ss.S")}`, ...rest);
        }
    }

    export function warn(...rest: Array<any>) {
        if (DEV) {
            Logger.warn(`#memory_master: ${date_utils.dateFormat(new Date(), "hh:mm:ss.S")}`, ...rest);
        }
    }
}