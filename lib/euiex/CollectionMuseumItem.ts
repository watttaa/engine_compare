// import { ItemInfo } from "bag/ItemInfo";
// import { getItemByIcon } from "bag/ItemUtils";
// import { CollectionMuseumCNet, CollectionMuseumPosSatus } from "net/CollectionMuseumCNet";
// import { notify_cfg } from "auto/notify";
// import { CollectionMuseumPosInfo } from "net/CollectionMuseumSNet";

//     // 藏品Item
//     export class CollectionMuseumItem extends eui.Button {
//     public _isEuiex = true;
//         ////////////////////////(皮肤定义)
//         grpBase: eui.Group;
//         imgEff: eui.Image;
//         imgIcon: eui.Image;
//         grpStar: eui.Group;
//         lblStar: eui.BitmapLabel;

//         grpLock: eui.Group;
//         grpAdd: eui.Group;

//         grpReddot: eui.Group;

//         ////////////////////////(自定义)
//         private m_objData: CollectionMuseumPosInfo;

//         constructor() {
//             super();
//             this.skinName = "resource/eui/Collection_Show_Item.exml";
//         }

//         public setData(data: CollectionMuseumPosInfo) {
//             this.m_objData = data;

//             if (this.completed) {
//                 this.dataChanged();
//             }
//         }

//         protected onSkinLoadCompleted() {
//             super.onSkinLoadCompleted();
//             if (this.m_objData) {
//                 this.dataChanged();
//             }
//         }




//         protected dataChanged() {
//             this.addEventListener(egret.TouchEvent.TOUCH_TAP, this.onTapSelf, this);

//             if (!this.m_objData.is_me && !this.m_objData.sid) {
//                 this.visible = false;
//                 return;
//             }

//             this.visible = true;

//             this.grpReddot.visible = this.m_objData.notify;

//             this.grpBase.visible = this.grpAdd.visible = this.grpLock.visible = false;

//             switch (this.m_objData.status) {
//                 case CollectionMuseumPosSatus.ST_CANNT_UNLOCK:// 不可以解锁
//                     this.grpLock.visible = true;

//                     break;
//                 case CollectionMuseumPosSatus.ST_CAN_UNLOCK:// 可以解锁
//                     this.grpLock.visible = true;

//                     break;
//                 case CollectionMuseumPosSatus.ST_EMPTY: // 已解锁 & 无展品
//                     this.grpAdd.visible = true;

//                     break;
//                 case CollectionMuseumPosSatus.ST_FULL: // 已解锁 & 有展品
//                     this.grpBase.visible = true;

//                     let itemInfo: ItemInfo = ItemInfo.create({ sid: this.m_objData.sid });

//                     this.imgIcon.source = getItemByIcon(itemInfo.icon, itemInfo.type);

//                     const QualityBgSkin = {
//                         3: "collection_show_frame_1_png",
//                         4: "collection_show_frame_2_png",
//                         5: "collection_show_frame_3_png",
//                         6: "collection_show_frame_4_png",
//                     }
//                     this.imgEff.source = QualityBgSkin[itemInfo.quality];

//                     let starCnt = this.m_objData.star;
//                     let starStr = "";
//                     while (starCnt > 0) {
//                         starStr += "*";
//                         starCnt--;
//                     }
//                     this.lblStar.text = starStr;
//                     this.grpStar.visible = this.m_objData.star > 0;

//                     break;
//                 default:
//                     break;
//             }
//         }

//         private onTapSelf(evt: any) {
//             if (!this.m_objData) {
//                 return;
//             }

//             if (!this.m_objData.is_me) {
//                 return;
//             }

//             switch (this.m_objData.status) {
//                 case CollectionMuseumPosSatus.ST_CANNT_UNLOCK:// 不可以解锁
//                     CollectionMuseumCNet.C_COLLECTION_MUSEUM_UNLOCK_ICON();

//                     break;
//                 case CollectionMuseumPosSatus.ST_CAN_UNLOCK:// 可以解锁
//                     CollectionMuseumCNet.C_COLLECTION_MUSEUM_UNLOCK_ICON();

//                     break;
//                 case CollectionMuseumPosSatus.ST_EMPTY: // 已解锁 & 无展品
//                     CollectionMuseumCNet.C_COLLECTION_MUSEUM_CLICK_FREE_POS(this.m_objData.pos);

//                     break;
//                 case CollectionMuseumPosSatus.ST_FULL: // 已解锁 & 有展品
//                     CollectionMuseumCNet.C_COLLECTION_MUSEUM_SCAN(this.m_objData.pos);

//                     break;
//                 default:
//                     break;
//             }

//         }

//         public $onRemoveFromStage() {
//             this.removeEventListener(egret.TouchEvent.TOUCH_TAP, this.onTapSelf, this);

//             this.m_objData = null;

//             super.$onRemoveFromStage();
//         }
//     }
