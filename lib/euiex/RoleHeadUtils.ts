import { getFrameEffect } from "auto/frame";
import { HeadFrameType } from "base/Enum";
import { RoleHead } from "lib/euiex/RoleHead";


// 带动画的头像配置
export const RoleHeadAniCfg: { [frame: number]: { file: string, scale: number } } = {
    //#22363 【VX】【头像框系统】暂时屏蔽“云游三界”头像框的特效
    /**真实id是301 */
    // [HeadFrameType.SanJie]: {
    //     file: "AniHeadFrame001.exml",
    //     aniName: "loop"
    // },
    [HeadFrameType.ArenaTop1]: {
        file: "AniArenaTop_FrameJin.exml",
        scale: 0.75,
    },
    [HeadFrameType.ArenaTop2]: {
        file: "AniArenaTop_FrameYin.exml",
        scale: 0.75,
    },
    [HeadFrameType.ArenaTop3]: {
        file: "AniArenaTop_FrameTong.exml",
        scale: 0.75,
    },
    // "": "AniArenaTop_Frame001.exml"
}

export enum RoleHeadExComType {
    EMPTY_TTBW = "empty_ttbw",
    SELECTED = "selected",
}
export const RoleHeadExComCfg: { [comType: string]: { file: string, scale: number, defaultState: string } } = {
    [RoleHeadExComType.EMPTY_TTBW]: {
        file: "resource/eui/S2/common/role_head/RoleHead_Comp_Empty2.exml",
        scale: 1,
        defaultState: "empty",
    },
    [RoleHeadExComType.SELECTED]: {
        file: "resource/eui/S2/common/goods_grid/GoodsGrid_Comp_Get.exml",
        scale: 1,
        defaultState: "",
    }
}

export namespace RoleHeadUtils {
    export function setRoleHeadAni(visible: boolean, root: eui.Group, frame: number, scale: number = 1) {
        let aniCfg: string = getFrameEffect(frame);
        safeInvokeFunc(root, () => {
            let headAni = root.getChildByName("roleHeadAni") as eui.Component;
            if (aniCfg && visible) {
                let path = `resource/eui_skins/${aniCfg}.exml`;
                if (!headAni) {
                    headAni = new eui.Component();
                    headAni.skinName = path;
                    headAni.name = "roleHeadAni"
                    // headAni.x = headAni.y = -15 * scale;
                    root.addChild(headAni);
                }
                else if (path != headAni.skinName) {
                    headAni.skinName = path;
                }

                safeInvokeFunc(headAni, () => {
                    let ani = headAni['loop'] as egret.tween.TweenGroup;
                    if (ani) ani.play(0);
                })
                let scale = RoleHeadAniCfg[frame]?.scale ?? 1;
                headAni.scaleX = headAni.scaleY = scale;
                headAni.visible = true;
            }
            else {
                if (headAni) {
                    safeInvokeFunc(headAni, () => {
                        let ani = headAni['loop'] as egret.tween.TweenGroup;
                        if (ani) ani.stop();
                    })
                    headAni.visible = false;
                }
            }
        })


    }

    export function addHeadExComponent(head: RoleHead, type: RoleHeadExComType, rootName: string = "grpTop") {
        safeInvokeFunc(head, () => {
            let grpRoot = head[rootName] as eui.Group;
            if (!grpRoot) {
                return;
            }
            if (!head[type]) {
                head[type] = new eui.Component();
                head[type].skinName = RoleHeadExComCfg[type]?.file;
                head[type].scaleX = head[type].scaleY = RoleHeadExComCfg[type]?.scale ?? 1;
                head[type].cur = type;
            }
            grpRoot.addChild(head[type]);
        })

    }

    export function removeHeadExComponent(head: RoleHead, type: RoleHeadExComType, rootName: string = "grpTop") {
        if (!head) return;
        let grpRoot = head[rootName] as eui.Group;
        if (!grpRoot) {
            return;
        }
        if (head[type]  && head[type].parent) {
            head[type].parent.removeChild(head[type]);
        }
        delete head[type];
    }

}


