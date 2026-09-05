// Cocos 'cc' 模块最小桩（仅用于 tsc 语法/类型门禁，不参与运行）
declare module 'cc' {
    export const _decorator: any;
    export class Component { node: Node; }
    export class Node {
        layer: number;
        name: string;
        constructor(name?: string);
        addChild(child: Node): Node;
        insertChild(child: Node, siblingIndex: number): void;
        getChildByName(name: string): Node | null;
        setPosition(x: number, y: number, z?: number): void;
        setScale(x: number, y: number, z?: number): void;
        addComponent(type: any): any;
        getComponent(type: string | any): any;
        destroy(): boolean;
    }
    export class Sprite extends Component {
        static Type: { SIMPLE: number; SLICED: number; TILED: number; FILLED: number };
        spriteFrame: SpriteFrame | null;
        type: number;
    }
    export class SpriteFrame { texture: any; rect: any; originalSize: any; offset: any; packable: boolean; }
    export class UITransform extends Component { setAnchorPoint(x: number, y: number): void; }
    export class Texture2D extends Component { }
    export class Rect { constructor(x: number, y: number, w: number, h: number); }
    export class Size { constructor(w: number, h: number); }
    export class Vec2 { constructor(x: number, y: number); }
    export const resources: any;
    export const director: any;
    export const view: any;
    export const macro: any;
    export const Director: any;
    export const game: any;
}
