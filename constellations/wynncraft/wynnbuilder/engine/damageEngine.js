/**
 * Damage Engine
 *
 * Computes real spell DPS from:
 *   - Weapon base damage range (all elements summed, averaged min–max)
 *   - Gear bonuses: rawSpellDamage (flat) and spellDamage (percent)
 *   - Active ability-tree nodes (upgrade spell multipliers, hit counts, etc.)
 *   - Your rotation from config/build.js
 *
 * ─── Wynncraft spell damage formula ──────────────────────────────────────────
 *
 *   dmgPerHit = 
 *      ( baseMeanDmg × spellMultiplier + flatSpellBonus )
 *      × ( 1 + spellDmgPct / 100 )
 *
 *   baseMeanDmg  = average of weapon damage range, summed across all elements
 *   spellMultiplier = ability multiplier after tree upgrades applied
 *   flatSpellBonus  = sum of rawSpellDamage identifications on gear
 *   spellDmgPct     = sum of spellDamage (%) identifications on gear
 *
 *   Note: attack speed affects melee auto-attacks only, NOT spell damage.
 *
 * ─── Rotation model ───────────────────────────────────────────────────────────
 *
 *   The cycle duration is set by the mana economy:
 *     cycleDuration (s) = totalManaInCycle / manaPerSec
 *
 *   manaPerSec ≈ manaRegen / 4  +  manaSteal × 2
 *     (manaRegen stat ticks roughly every 4 s in Wynncraft;
 *      manaSteal is approximated as 2 procs/s on average)
 *
 *   rotationDPS = totalDmgInCycle / cycleDuration
 */

// ─────────────────────────────────────────────────────────────────────────────

const DAMAGE_ELEMENTS = [
    'baseDamage', 'baseEarthDamage', 'baseThunderDamage', 'baseWaterDamage', 'baseFireDamage', 'baseAirDamage',
]

/**
 * Average damage per weapon swing, summed across all elements.
 * `weaponBase` is the `base` object on the raw item from the Wynncraft API:
 *   e.g. { damage: { min: 10, max: 20 }, earthDamage: { min: 0, max: 5 } }
 */
export function weaponMeanDamage(weaponBase) {
    let total = 0
    for (let i = 0; i < DAMAGE_ELEMENTS.length; i++) {
        const elementKey = DAMAGE_ELEMENTS[i]

        let range
        if (weaponBase && weaponBase[elementKey] !== undefined && weaponBase[elementKey] !== null) {
            range = weaponBase[elementKey]
        } else { range = null }
        if (!range) { continue }
        
        let min = 0
        let max = 0
        if (range.min !== undefined && range.min !== null) {
            min = range.min
        }
        if (range.max !== undefined && range.max !== null) {
            max = range.max
        }
        total += (min + max) / 2
    }
    return total
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Apply active ability-tree nodes to a spell, returning the effective spell config.
 * Only nodes whose `spell` key matches `spellKey` are applied.
 */
function resolveSpell(spellKey, spellDefs, abilityNodes, activeNodes) {
    const spell = { ...spellDefs[spellKey] }

    for (const nodeKey of activeNodes) {
        const node = abilityNodes[nodeKey]
        if (!node || node.spell !== spellKey) { continue }
        
        switch (node.type) {
            case 'multiplier': {
                let base = 0
                if (spell.multiplierPerHit !== undefined && spell.multiplierPerHit !== null) {
                    base = spell.multiplierPerHit
                }

                spell.multiplierPerHit = base + node.multiplierBonus
                break
            }
            case 'hits': {
                let base = 0
                if (spell.hits !== undefined && spell.hits !== null) {
                    base = spell.hits
                }
                spell.hits = base + node.extraHits
                break
            }
            case 'hitsPerSecond': {
                let base = 0
                if (spell.hitsPerSecond !== undefined && spell.hitsPerSecond !== null) {
                    base = spell.hitsPerSecond
                }
                spell.hitsPerSecond = base + node.hpsBonus
                break
            }
            case 'duration': {
                let base = 0
                if (spell.duration !== undefined && spell.duration !== null) {
                    base = spell.duration
                }
                spell.duration = base + node.durationBonus
                break
            }
            case 'manaCost': {
                let base = 0
                if (spell.manaCost !== undefined && spell.manaCost !== null) {
                    base = spell.manaCost
                }
                spell.manaCost = base + node.manaCostChange
                break
            }
        }
    }
    return spell
}

/**
 * Total hits delivered by one cast of a spell.
 *   Channeled (Totem): hitsPerSecond × duration
 *   Instant   (Aura, Uproot): hits
 */
function hitsPerCast(spell) {
    if (spell.hitsPerSecond !== undefined && spell.hitsPerSecond !== null && spell.duration !== undefined && spell.duration !== null) {
        return spell.hitsPerSecond * spell.duration
    }
    if (spell.hits !== undefined && spell.hits !== null) {
        return spell.hits
    }
    return 1
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute rotation DPS given a full build's aggregated stats + the player's config.
 *
 * @param {object}   stats        Aggregated build stats (baseMeanDmg, spellDmg, spellDmgPct,
 *                                manaRegen, manaSteal — all from the optimizer's stat system)
 * @param {object}   rotation     { spellKey: { castWeight } }   from config/build.js
 * @param {object}   spellDefs    Class spell definitions          from config/abilities/*.js
 * @param {object}   abilityNodes All ability-tree nodes           from config/abilities/*.js
 * @param {string[]} activeNodes  Unlocked node keys              from config/build.js
 * @returns {number}              Estimated DPS (integer, 0 if no weapon found yet)
 */

export function computeRotationDPS(stats, rotation, spellDefs, abilityNodes, activeNodes) {
    let baseMeanDmg = 0
    if (stats.baseMeanDmg !== undefined && stats.baseMeanDmg !== null) {
        baseMeanDmg = stats.baseMeanDmg
    }

    if (baseMeanDmg === 0) { return 0 } 

    let flatBonus = 0
    if (stats.spellDmg !== undefined && stats.spellDmg !== null) {
        flatBonus = stats.spellDmg
    }

    let spellDmgPct = 0
    if (stats.spellDmgPct !== undefined && stats.spellDmgPct !== null) {
        spellDmgPct = stats.spellDmgPct
    }
    const pctMultiplier = 1 + spellDmgPct / 100

    let manaRegen = 0
    if (stats.manaRegen !== undefined && stats.manaRegen !== null) {
        manaRegen = stats.manaRegen
    }

    let manaSteal = 0
    if (stats.manaSteal !== undefined && stats.manaSteal !== null) {
        manaSteal = stats.manaSteal
    }

    // ms ticks every ~4s; steal procs ~2×/s
    const manaPerSec = Math.max(
        (manaRegen / 4) + (manaSteal * 2),
        0.1
    )

    let totalMana = 0
    let totalDmg  = 0

    for (const [spellKey, rotEntry] of Object.entries(rotation)) {
        if (!spellDefs[spellKey]) { continue }

        const spell      = resolveSpell(spellKey, spellDefs, abilityNodes, activeNodes)
        const totalHits  = hitsPerCast(spell)

        let multiplierPerHit = 1
        if (spell.multiplierPerHit !== undefined && spell.multiplierPerHit !== null) {
            multiplierPerHit = spell.multiplierPerHit
        }
        
        // Clamp extreme values to prevent calculation errors
        const clampedFlatBonus = Math.max(-10000, Math.min(10000, flatBonus))
        const clampedPctMultiplier = Math.max(-10, Math.min(50, pctMultiplier))
        
        // If percentage would make damage calculation meaningless, treat as zero DPS contribution
        if (clampedPctMultiplier <= 0) {
            console.warn(`Skipping spell ${spellKey} due to negative damage multiplier: ${clampedPctMultiplier}`)
            continue
        }
        
        const dmgPerHit = Math.max(0, (baseMeanDmg * multiplierPerHit + clampedFlatBonus) * clampedPctMultiplier)
        const dmgPerCast = totalHits * dmgPerHit
        const casts      = rotEntry.castWeight

        let manaCost = 1
        if (spell.manaCost !== undefined && spell.manaCost !== null) {
            manaCost = spell.manaCost
        }
        totalMana += Math.max(manaCost, 1) * casts
        totalDmg  += dmgPerCast * casts
    }

    const cycleDuration = totalMana / manaPerSec
    return Math.round(totalDmg / cycleDuration)
}
