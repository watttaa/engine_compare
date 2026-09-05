import { DisplayCom, ModelCom } from "avatar/AvatarDefines";
import { scene_define } from "world/scene/scenedefine";


export namespace scenemonitor_define {

    /**监测的场景avatar类型 */
    export type TSceneAvatarType = scene_define.SAvatarType.OTHER_ROLE | scene_define.SAvatarType.NPC;

    /**Avatar显示设置更新 */
    export type TSceneAvatarsVisibleSet = {
        visible: boolean;
        /**当前设置avatars类型*/
        avatarTypes: TSceneAvatarType[];
    }
    /**当前Avatar显示设置值 */
    export type TSceneAvatarVisibleSetValue = { [key in TSceneAvatarType]?: boolean };

    /**监测的场景avatar的身形组件类型 */
    export type TSceneAvatarFigureType = DisplayCom | ModelCom;
    export const SceneAvatarFigureTypeDefines = {
        ...DisplayCom,
        ...ModelCom,
    }
    export type TSceneAvatarFigureInfo = { [key in TSceneAvatarFigureType]?: boolean };
    /**Avatar的身形部件显示设置更新 */
    export type TSceneAvatarFigureVisibleSet = {
        /**当前设置avatars类型 */
        avatarTypes: TSceneAvatarType[];

        /**当前设置的avatar显示部件类型*/
        figureInfo: TSceneAvatarFigureInfo;

        /**其他部件显示设置 (没有，其他部件维持原样) */
        ohtersArgs?: { bol: boolean };
    };
    /**当前Avatar的身形部件显示设置值 */
    export type TSceneAvatarFigureVisibleSetValue = { [key in TSceneAvatarType]?: TSceneAvatarFigureInfo };
}