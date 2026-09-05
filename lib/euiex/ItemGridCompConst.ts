export enum ItemGridCompEnum {
    Star,
    Bar,
    LowStar,
    TagLow,
    Tag,
    TagEx,
    RightTag,
    EquipLv,
    BottomLb,
    RightTopLb,
    Mask,
    CenterImg,
    TopRightImg,
    Selected,
    RedPoint,
    NameLb,
    Mc,
    getStateComp,
}

export const CompTreeCfgs = {
    [ItemGridCompEnum.Star]: {
        parent: "grpInfo",
        order: ItemGridCompEnum.Star,
    },
    [ItemGridCompEnum.Bar]: {
        parent: "grpInfo",
        order: ItemGridCompEnum.Bar,
    },
    [ItemGridCompEnum.LowStar]: {
        parent: "grpInfo",
        order: ItemGridCompEnum.LowStar,
    },
    [ItemGridCompEnum.TagLow]: {
        parent: "grpInfo",
        order: ItemGridCompEnum.TagLow,
    },
    [ItemGridCompEnum.Tag]: {
        parent: "grpFrameInfo",		//边框上层
        order: ItemGridCompEnum.Tag,
    },
    [ItemGridCompEnum.TagEx]: {
        parent: "grpFrameInfo",
        order: ItemGridCompEnum.TagEx,
    },
    [ItemGridCompEnum.RightTag]: {
        parent: "grpFrameInfo",
        order: ItemGridCompEnum.RightTag,
    },
    [ItemGridCompEnum.EquipLv]: {
        parent: "grpInfo",
        order: ItemGridCompEnum.EquipLv,
    },
    [ItemGridCompEnum.BottomLb]: {
        parent: "grpInfo",
        order: ItemGridCompEnum.BottomLb,
    },
    [ItemGridCompEnum.RightTopLb]: {
        parent: "grpInfo",
        order: ItemGridCompEnum.RightTopLb,
    },
    [ItemGridCompEnum.NameLb]: {
        parent: "grpName",
        order: ItemGridCompEnum.NameLb,
    },
    [ItemGridCompEnum.Selected]: {
        parent: "grpTopInfo",
        order: ItemGridCompEnum.Selected,
    },
    [ItemGridCompEnum.RedPoint]: {
        parent: "grpTop",	//最上层，根节点下，不受滤镜影响
        order: ItemGridCompEnum.RedPoint,
    },
    [ItemGridCompEnum.Mask]: {
        parent: "grpMask",
        order: ItemGridCompEnum.Mask,
    },
    [ItemGridCompEnum.CenterImg]: {
        parent: "grpTopInfo",
        order: ItemGridCompEnum.CenterImg,
    },
    [ItemGridCompEnum.TopRightImg]: {
        parent: "grpFrameInfo",
        order: ItemGridCompEnum.TopRightImg,
    },
    [ItemGridCompEnum.Mc]: {
        parent: "grpMc",
        order: ItemGridCompEnum.Mc,
    },
    [ItemGridCompEnum.getStateComp]: {
        parent: "grpTop",
        order: ItemGridCompEnum.getStateComp,
    }
}
