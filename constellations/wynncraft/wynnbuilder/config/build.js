/**
 * ─── Your Personal Build Configuration ────────────────────────────────────────
 *
 * Edit this file to match your actual in-game setup:
 *   1. Set ACTIVE_ABILITY_NODES to the nodes you have unlocked in the skill tree.
 *   2. Set ROTATION to reflect the spells you cycle through while playing.
 *
 * The DPS engine reads this file when scoring builds, so the optimizer will
 * automatically prefer gear that boosts whichever spells you actually cast.
 */

import { SHAMAN_SPELLS, SHAMAN_ABILITY_NODES, SHAMAN_ARCHETYPES, WEAPON_TYPE } from './abilities/shaman.js'

// ─── Class ────────────────────────────────────────────────────────────────────

export const CLASS = 'shaman'

// Shaman equips Reliks only.
export { WEAPON_TYPE }

// Spell definitions, ability nodes, and archetype data for this class.
// Swap these imports if support for other classes is added later.
export const SPELL_DEFINITIONS = SHAMAN_SPELLS
export const ABILITY_NODES     = SHAMAN_ABILITY_NODES
export const ARCHETYPES        = SHAMAN_ARCHETYPES

// ─── Active Ability Nodes ─────────────────────────────────────────────────────
//
// List every ability node you have unlocked.
// Keys must match entries in SHAMAN_ABILITY_NODES (config/abilities/shaman.js).
//
// Example starter set (edit to match your actual build):

export const ACTIVE_ABILITY_NODES = [
    'totemCost1',       // Cheaper Totem       – Totem mana cost −10
    'auraCost1',        // Cheaper Aura        – Aura mana cost  − 5
    'shockingAura',     // Shocking Aura       – Aura +20 % Thunder damage
]

// ─── Spell Rotation ───────────────────────────────────────────────────────────
//
// Describe your typical rotation as relative cast weights.
// castWeight: how many times you cast this spell per "rotation cycle".
//
// The DPS engine divides total cycle damage by the mana cost of the cycle,
// giving the damage-per-mana which scales with your mana-regen stat.
//
// Example below: keep Totem up, cast Aura twice, one Uproot per rotation.

export const ROTATION = {
    totem:  { castWeight: 1 },   // 1 Totem cast — re-cast when it expires
    aura:   { castWeight: 2 },   // 2 Aura casts per rotation cycle
    uproot: { castWeight: 1 },   // 1 Uproot per rotation cycle
}
