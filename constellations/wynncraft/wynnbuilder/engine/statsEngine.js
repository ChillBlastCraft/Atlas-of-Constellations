export function aggregateStats(weapon, helmet, chest) {
    return {
        dps: weapon.dps + helmet.dps + chest.dps,
        manaRegen: weapon.manaRegen + helmet.manaRegen + chest.manaRegen,
        hp: weapon.hp + helmet.hp + chest.hp
    }
}