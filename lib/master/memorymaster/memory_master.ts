import { memory_log } from "lib/master/memorymaster/memory_log";
import { CallManyTimes } from "lib/Timer_CallManyTimes";

export namespace memory_master {

    // 阈值
    const THRESHOLD_MAX_MB = 200;
    const THRESHOLD_ADD_MB = 100;
    const BYTES_PER_MB = 1024 * 1024;

    // 提示cd
    const MAX_COOLDOWN: number = 10 * 60 * 1000; // 最大冷却间隔（10分钟）
    let lastAlertTimestamp: number = 0; // 上次弹窗时间戳
    let curCooldown: number = 1000; // 当前冷却间隔（毫秒），初始1秒

    interface MemoryInfo {
        totalJSHeapSize?: number;
        usedJSHeapSize?: number;
        jsHeapSizeLimit?: number;
    }

    export function enable() {
        return DEV && isWeb();
    }

    let objTimer: CallManyTimes;

    let minJsHeapBytes: number = 0;

    export function start() {
        if (!enable()) {
            return;
        }

        checkMinJsHeapSizeValid();

        if (!objTimer) {
            objTimer = new CallManyTimes(Number.MAX_VALUE, 1000, onTickFunc, [], memory_master);
        }
        objTimer.restart();
    }

    export function stop() {
        if (objTimer) {
            objTimer.stop();
        }
    }

    function onTickFunc() {
        let isValid = checkMinJsHeapSizeValid();
        if (!isValid) {
            return;
        }

        const curBytes = getUsedJSHeapBytes();

        const offsetBytes = curBytes - minJsHeapBytes;

        // 判断是否超过阈值
        const isOverThreshold = (curBytes > BYTES_PER_MB * THRESHOLD_MAX_MB) && (offsetBytes > BYTES_PER_MB * THRESHOLD_ADD_MB);

        if (isOverThreshold) {
            const now = egret.getTimer();

            // 检查是否在冷却时间外
            if (now >= lastAlertTimestamp + curCooldown) {
                const str = `jsHeap warning：cur=${bytesToMbStr(curBytes)}}`;
                memory_log.warn(str);
                // MessageBox(str);

                // 更新冷却时间（指数级增长，不超过最大值）
                lastAlertTimestamp = now;
                curCooldown = Math.min(curCooldown * 2, MAX_COOLDOWN);
            }

            // mike todo: hubble report
        }
    }

    /**检查最小jsHeap是否有效 */
    function checkMinJsHeapSizeValid() {
        const curBytes = getUsedJSHeapBytes();
        if (minJsHeapBytes < BYTES_PER_MB * THRESHOLD_ADD_MB || curBytes < minJsHeapBytes) {
            minJsHeapBytes = curBytes;

            // memory_log.log(`update miniJsHeapSize = ${bytesToMbStr(minJsHeapBytes)}`);

            return false;
        }

        return true;
    }

    function getUsedJSHeapBytes(): number {
        const memory: MemoryInfo | undefined = (performance as any)?.memory;
        const jsHeapSize = Math.floor(memory?.usedJSHeapSize ?? 0);
        return jsHeapSize;
    }


    // ====
    function bytesToMbStr(bytes: number, fixed: number = 0): string {
        let str = `${(bytes / BYTES_PER_MB).toFixed(fixed)} MB`;

        return str;
    }

    function isWeb(): boolean {
        return preload_utils_platform.isWeb();
    }
}