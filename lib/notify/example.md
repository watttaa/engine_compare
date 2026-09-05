bag.tab.n1 绑定id {tab: item_id: true}
bag.tab.n2 绑定id {tab: item_id: true}

bag -> {
    tab1: {
        item1(n1)
        item2(n2)
    }
    tab2: {
        item3(n1)
    }
}

bag childs -> {
    tab.<tab1> childs -> {
        n1.<item1>
        n2.<item2>
    }
    tab.<tab2> childs -> {
        n1.<item3>
    }
}

pet.pocket.tab.slot
pet childs -> {
    pocket.<pid1> childs -> {
        tab.<pid1> childs -> {
            slot.<pid1, sid1>
            slot.<pid1, sid2>
        }
    }
    pocket.<pid2> childs -> {
        tab.<pid2> childs -> {
            slot.<pid2, sid1>
            slot.<pid2, sid2>
        }
    }
}
pet.pocket.tab.slot = {
    pet_rid: {
        slot1: true
        slo2: true
    }
}