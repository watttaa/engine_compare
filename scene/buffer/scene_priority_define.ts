/**
 * 场景对象创建优先级 Tier 分层定义
 * 公式：createPriority = TierIndex * TIER_STEP + distanceToSoul
 */
export namespace scene_priority_define {

    /**
     * Tier 间距精度
     * 当前值 10000，远大于 AOI 最大距离 1414，保证各 Tier 值域不交叉
     * 后续若需在某 Tier 内细分子类型，可改为 100000
     */
    export const TIER_STEP = 10000;

    /** 值越小越优先创建 */
    export const enum TierIndex {
        /** 目标 NPC（玩家正在寻路/交互的 NPC） */
        TARGET_NPC = 0,
        /** 队长 Puppet（bypass 预留，实际由 tryCreateHeroLeader 直接创建） */
        LEADER = 1,
        /** 队友 Puppet */
        TEAMMATE = 2,
        /** 私有 NPC（副本/剧情） */
        PRIVATE_NPC = 3,
        /** 私有 Player（非队友） */
        PRIVATE_PLAYER = 4,
        /** 公用 NPC（所有类型统一） */
        PUBLIC_NPC = 5,
        /** 公用 Puppet */
        PUBLIC_PUPPET = 6,
    }

    // ========================
    // 屏幕外实体延迟创建（Screen Gate）
    // ========================

    /** 总开关：false 时走原消费逻辑（无门控） */
    export let screenGateEnabled: boolean = true;

    /** createZone 相对屏幕可视区域的缩放倍数（1.2 = 屏幕 × 1.2） */
    export let CREATE_ZONE_SCALE = 1.2;

    /** 连续多少次 idle tick 后触发一次兜底创建（0=永不兜底）；5 tick × 200ms = 每 1s 兜底 1 个 */
    export let idleFallbackThreshold = 0;
}
