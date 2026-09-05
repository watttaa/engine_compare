// namespace block_utils {
    export const enum COLOR_BLOCK_TYPE {
        BLOCK_NONE  = 0X0,//0,  无阻挡区
        BLOCK_BLACK = 0X1,//1,  地图原本阻挡区(黑色阻挡区域)
        BLOCK_1     = 0X2,//2,
        BLOCK_2     = 0X3,//3,
        BLOCK_3     = 0X4,//4,
        BLOCK_4     = 0X5,//5,
        BLOCK_5     = 0X6,//6,
        BLOCK_6     = 0X7,//7,
        BLOCK_7     = 0X8,//8,
        BLOCK_8     = 0X9,//9,
        BLOCK_9     = 0Xa,//10,
        BLOCK_10    = 0Xb,//11,
        BLOCK_11    = 0Xc,//12,
        BLOCK_12    = 0Xd,//13,
        BLOCK_13    = 0Xe,//14,
        BLOCK_14    = 0Xf,//15,
    }

    export const COLOR_BLOCK_2_COLOR = {
        [COLOR_BLOCK_TYPE.BLOCK_NONE] : 0xffffff,//无阻挡区颜色
        [COLOR_BLOCK_TYPE.BLOCK_BLACK]: 0x000000,
        [COLOR_BLOCK_TYPE.BLOCK_1]  : 0xff0000,
        [COLOR_BLOCK_TYPE.BLOCK_2]  : 0x00ff00,
        [COLOR_BLOCK_TYPE.BLOCK_3]  : 0x0000ff,
        [COLOR_BLOCK_TYPE.BLOCK_4]  : 0x00ffff,
        [COLOR_BLOCK_TYPE.BLOCK_5]  : 0xff00ff,
        [COLOR_BLOCK_TYPE.BLOCK_6]  : 0xffff00,
        [COLOR_BLOCK_TYPE.BLOCK_7]  : 0x7f0000,
        [COLOR_BLOCK_TYPE.BLOCK_8]  : 0x007f00,
        [COLOR_BLOCK_TYPE.BLOCK_9]  : 0x00007f,
        [COLOR_BLOCK_TYPE.BLOCK_10] : 0x007f7f,
        [COLOR_BLOCK_TYPE.BLOCK_11] : 0x7f007f,
        [COLOR_BLOCK_TYPE.BLOCK_12] : 0x7f7f00,
        [COLOR_BLOCK_TYPE.BLOCK_13] : 0x5f0000,
        [COLOR_BLOCK_TYPE.BLOCK_14] : 0x005f00,
    }
// }