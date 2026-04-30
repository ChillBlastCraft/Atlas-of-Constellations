// Shared formula utilities for Wynnbuilder calculators
// Place all common mathematical formulas here.

/**
 * Wynncraft skill point base scaling formula.
 * Source: https://wynncraft.wiki.gg/wiki/Skill_Points#Notes
 */
export function baseScale(x) {
    if (x <= 0) return 0
    return (
        -0.0000000166 * x ** 4 +
         0.0000122614 * x ** 3 +
        -0.0044972984 * x ** 2 +
         0.9931907398 * x +
         0.0093811967
    )
}
