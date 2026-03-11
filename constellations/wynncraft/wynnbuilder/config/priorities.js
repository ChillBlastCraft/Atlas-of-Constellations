// ─── Stat Tracking ────────────────────────────────────────────────────────────
// Maps a friendly internal key -> Wynncraft v3 API identification ID.
// null = computed stat (not from API identifications; see wapi.js).
// Add, remove, or rename entries here to change what gets tracked.
export const TRACKED_STATS = {
    // Weapon base stats — computed in wapi.js, not from identifications
    baseMeanDmg:  null,             // Average weapon base damage (all elements)

    // Spell damage bonuses from gear
    spellDmg:     'rawSpellDamage', // Flat raw spell damage bonus
    spellDmgPct:  'spellDamage',    // Percent spell damage bonus (50 = +50 %)

    hp:           'rawHealth',
    hpRegen:      'rawHealthRegen',
    manaRegen:    'manaRegen',
    manaSteal:    'manaSteal',
    lifeSteal:    'lifeSteal',
    walkSpeed:    'walkSpeed',
    thorns:       'thorns',
    exploding:    'exploding',
    lootBonus:    'lootBonus',
    strength:     'rawStrength',
    dexterity:    'rawDexterity',
    intelligence: 'rawIntelligence',
    defence:      'rawDefence',
    agility:      'rawAgility',
}

// ─── Minimums (hard constraints) ──────────────────────────────────────────────
// Builds that cannot possibly reach these values are pruned from the search.
// Set to 0 (or omit) to place no minimum on a stat.
// Note: realDPS is a separate computed value — constrain tracked stats here.
//
// Example: "I need at least 2000 HP and 3 mana regen"
//   hp: 2000, manaRegen: 3
export const MINS = {
    hp:        0,
    manaRegen: 0,
}

// ─── Weights (optimisation targets) ───────────────────────────────────────────
// Among all builds that satisfy MINS, the optimizer maximises:
//   realDPS × DPS_WEIGHT  +  sum(statValue × weight)  for each stat below
//
// realDPS is computed by the DPS engine from your weapon base + gear bonuses
// + the rotation in config/build.js.  It replaces the old flat 'dps' stat.
//
// Tip: keep DPS_WEIGHT = 1 and adjust secondary stat weights relative to it.
export const DPS_WEIGHT = 1

export const WEIGHTS = {
    hp:        0.001,   // e.g. 1000 HP ≈ 1 DPS in score
    manaRegen: 5,       // each +1 raw mana regen ≈ 5 DPS in score
}

// ─── Beam Width ───────────────────────────────────────────────────────────────
// How many candidates to keep at each slot during beam search.
// Higher = more thorough (but slower). 50 is a solid default.
export const BEAM_WIDTH = 50
