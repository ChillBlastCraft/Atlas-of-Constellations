export function passesConstraints(build, constraints) {
    if (build.manaRegen < constraints.minMana) { return false }
    if (build.hp < constraints.minEHP) { return false }
    return true
}