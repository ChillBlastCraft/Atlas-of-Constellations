export function scoreBuild(stats, weights) {
    return (
        stats.dps * weights.damage +
        stats.hp * weights.ehp +
        stats.manaRegen * weights.mana
    )
}
