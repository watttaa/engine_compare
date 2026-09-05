import { pool } from "common/pool";
import { memory_master } from "lib/master/memorymaster/memory_master";

export namespace master_help {

    export function start() {
        if (DEV) {
            memory_master.start();

            leak_sentinel.start();
        }
    }

    export function stop() {
        pool.clearAll();

        if (DEV) {
            memory_master.stop();

            leak_sentinel.stop();
        }
    }
}