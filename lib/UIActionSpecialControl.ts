
const append = (arr: any[], val: any) => val && arr.push(val);

//打开主角界面
export function MainRoleUIAction() {
    let noCloseUI = [];
    // append(noCloseUI, UIManager.getInstByName('MainLianGong'));
    append(noCloseUI, UIManager.getInstByName('DungeonWidget'));
    // append(noCloseUI, UIManager.getInstByName('RoleEquipSuitMainPanel'));
    // append(noCloseUI, UIManager.getInstByName('RoleT2EquipPanel'));
    // append(noCloseUI, UIManager.getInstByName('RoleT3EquipPanel'));
    // append(noCloseUI, UIManager.getInstByName('RebornUI'));
    // append(noCloseUI, UIManager.getInstByName('RoleTitleUI'));
    // append(noCloseUI, UIManager.getInstByName('WuXingXiuLianUI'));
    // append(noCloseUI, UIManager.getInstByName('WuXingXiuLianUpgradeUI'));
    // append(noCloseUI, UIManager.getInstByName('SevenBrotherMain'));
    // append(noCloseUI, UIManager.getInstByName('FeiShengUpGradeUI'));
    return noCloseUI;
}
RegisterUISpecialAction("CMainRoleUI", MainRoleUIAction)
RegisterUISpecialAction("PetMainUI", MainRoleUIAction)

// // 打开作坊界面
// export function WorkshopMainPanelAction() {
//     let noCloseUI = [];
//     return noCloseUI;
// }
// RegisterUISpecialAction("WorkshopMainPanel", WorkshopMainPanelAction)

// // 打开伙伴界面
// export function PartnerFrameworkUIAction() {
//     let noCloseUI = [];
//     append(noCloseUI, UIManager.getInstByName('FaBaoRecommendUI'));
//     return noCloseUI;
// }
// RegisterUISpecialAction("PartnerDetailFramework", PartnerFrameworkUIAction)

// // 打开召唤兽界面
// export function PetFrameworkUIAction() {
//     let noCloseUI = [];
//     return noCloseUI;
// }
// RegisterUISpecialAction("PetDetailFramework", PetFrameworkUIAction)