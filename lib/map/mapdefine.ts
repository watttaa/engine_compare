

export namespace map_define {

    export enum MapGridSide {
        side_default = "default",
        side1 = "side1",
        side2 = "side2",
    }

    export enum STileSize {
        width = 512,
        height = 512,
    }

    export enum SNodeType {
        /**为了兼容旧代码 */
        avatar_adapter = "avatar_adapter",

        avatar = 'avatar',

        ani = 'ani',
    }

    export enum SMapLayer {
        terrain = 20,
        block = 21,
        player = 30,
        deco = 40,
        cloud = 50,
        widget = 60,

        grid = 80,

        debug = 100,
    }
}