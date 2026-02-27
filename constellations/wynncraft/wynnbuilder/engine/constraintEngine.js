export function canStillPassConstraints(partialStats, remainingSlotsMax, constraints) {
    return ( 
        partialStats.manaRegen + remainingSlotsMax.manaRegen >= constraints.minMana &&
        partialStats.hp + remainingSlotsMax.hp >= constraints.minEHP
    )
}