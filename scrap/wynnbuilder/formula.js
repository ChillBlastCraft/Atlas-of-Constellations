// Shared formula utilities for Wynnbuilder calculators
// Place all common mathematical formulas here.

const BASE_SCALE_AT_150 = 80.8
const INT_COST_REDUCTION_AT_150 = 50
const DEFENCE_REDUCTION_MULTIPLIER = 0.867
const AGILITY_DODGE_MULTIPLIER = 0.951

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

/**
 * Maps baseScale(points) to a target cap where baseScale(150) = 80.8.
 * Useful for skill effects that cap at values different from 80.8.
 */
export function scaleBaseToCap(points, capAt150) {
    return (baseScale(points) * capAt150) / BASE_SCALE_AT_150
}

/**
 * Intelligence spell cost reduction %. Caps at 50% at 150 INT.
 */
export function intCostReductionFromPoints(points) {
    return scaleBaseToCap(points, INT_COST_REDUCTION_AT_150)
}

/**
 * Defence damage reduction % scaling from skill points.
 */
export function defenceReductionFromPoints(points) {
    return baseScale(points) * DEFENCE_REDUCTION_MULTIPLIER
}

/**
 * Agility dodge chance % scaling from skill points.
 */
export function agilityDodgeFromPoints(points) {
    return baseScale(points) * AGILITY_DODGE_MULTIPLIER
}

/**
 * Spell spam penalty from consecutive casts of the same spell.
 * Streak 1-2: +0, streak N>=3: +(N-2)*5.
 */
export function spellSpamPenalty(streakCount) {
    return Math.max(0, (streakCount - 2) * 5)
}
