/**
 * ─── Your Personal Build Configuration ────────────────────────────────────────
 *
 * Edit this file to match your actual in-game setup:
 *   1. Set SELECTED_CLASS to choose which class to use
 *   2. Set ability nodes to ON/OFF in the ABILITY_NODE_STATUS section
 *   3. Set ROTATION to reflect the spells you cycle through while playing.
 *
 * The DPS engine reads this file when scoring builds, so the optimizer will
 * automatically prefer gear that boosts whichever spells you actually cast.
 */

import { SHAMAN_SPELLS, SHAMAN_ABILITY_NODES, SHAMAN_ARCHETYPES, WEAPON_TYPE } from './abilities/shaman.js'

// ─── Available Classes ────────────────────────────────────────────────────────
// List of all supported classes (more to be added later)
export const AVAILABLE_CLASSES = ['shaman']

// ─── Selected Class ───────────────────────────────────────────────────────────
// Change this to switch between classes
export const SELECTED_CLASS = 'shaman'

// ─── Class Configuration ──────────────────────────────────────────────────────
// This will be set dynamically based on SELECTED_CLASS in main.js
export let CLASS_CONFIG = {
    name: null,
    weaponType: null,
    spellDefinitions: null,
    abilityNodes: null,
    archetypes: null
}

// ─── Ability Node Status ──────────────────────────────────────────────────────
// Set each node to true (ON) or false (OFF)
// Only nodes set to true will be considered active in your build

export const ABILITY_NODE_STATUS = {
    // ═══ ROW 1 (4 nodes) ═══
    totem:             true,    // Unlock the Totem spell
    relikProficiency:  true,   // Doubles Main Attack beam speed; +5% damage
    totemCost1:        false,    // Reduce Totem mana cost by 10
    totemicsmash:      true,   // Totem deals 150% damage where it lands
    
    // ═══ ROW 2 (7 nodes) ═══
    relikSpread:       false,   // Reduces Main Attack spread (conflicts with relikBeams)
    haul:              true,    // Unlock the Haul spell
    relikBeams:        false,   // Main Attack fires +2 extra beams (conflicts with relikSpread)
    uproot:            true,    // Unlock the Uproot spell
    haulCost1:         true,   // Reduce Haul mana cost by 5
    aura:              true,    // Unlock the Aura spell
    totemShove:        false,   // Casting Totem while looking shoves existing Totem forward
    
    // ═══ ROW 3 (10 nodes) ═══
    shamanEarthPath:   false,   // +2–4 base Earth damage; +20% Earth damage bonus
    shamanAirPath:     true,   // +3–4 base Air damage; +15% Air damage bonus
    shamanThunderPath: true,   // +1–8 base Thunder damage; +10% Thunder damage bonus
    shamanFirePath:    false,   // +3–5 base Fire damage; +15% Fire damage bonus
    shamanWaterPath:   false,   // +2–4 base Water damage; +15% Water damage bonus
    naturejolt:        false,   // Landing after Haul deals 150% damage
    overseer:          true,   // Increases Uproot range by +6 blocks
    danceOfTheRain:    false,   // Totem leaves rain streak while mid-air
    shockingAura:      true,    // Aura travels faster and deals +20% Thunder damage
    flamingTongue:     false,   // Uproot becomes Flaming Tongue: hits 3 times
    
    // ═══ ROW 4 (12 nodes) ═══
    stagnation:        false,   // Enemies hit by Nature's Jolt are slowed
    puppetMaster:      true,   // Totem summons up to 3 Puppets
    maskOfTheLunatic:  false,   // Mask: Aura costs 30% less mana, +35% damage, -20% resistance
    bloodPool:         false,   // Sacrificial Shrine - siphons HP into Blood Pool
    auraCost1:         true,    // Reduce Aura mana cost by 5
    uprootCost1:       true,   // Reduce Uproot mana cost by 5
    morePuppets:       true,   // Increases maximum Puppets by +1
    hauntingMemory:    false,   // Switching Masks throws previous Mask as projectile
    totemRange:        false,   // Increase Totem area of effect by +4 blocks
    hymnOfHate:        false,   // While wearing Lunatic Mask, killing with Aura casts mini-Aura
    rebound:           true,   // Aura bounces back, dealing damage second time
    bloodConnection:   true,   // Haul teleports if outside Totem range
    
    // ═══ ROW 5 (16 nodes) ═══
    explodingPuppet:   true,   // Puppets charge and explode with 3s left
    maskOfTheFanatic:  false,   // Mask: Totem costs 65% less, +35% resistance, -35% walk speed
    moreBloodPool:     false,   // Increase maximum Blood Pool by +30
    summonFocus:       true,   // Uproot inflicts Whipped; summons +20% damage to Whipped
    totemicShatter:    false,   // While wearing Fanatic Mask, Totem shatters on landing
    maskRotation:      false,   // Switching Masks twice grants 30 mana
    lashingLance:      false,   // Flaming Tongue gains +1 hit and inflicts Bleeding
    morePuppets2:      false,   // Increases maximum Puppets by +2
    chantOfTheLunatic: false,   // Switching to Lunatic Mask reduces enemy resistance
    vengefulspirit:    false,   // Totem grants +20% damage bonus to all players in range
    doubleTotem:       true,   // Increase max Totems by +1
    totemCost2:        true,   // Reduce Totem mana cost by 5
    auraPull:          false,   // Aura pulls enemies to Totem, +30% Air damage
    haulCost2:         false,   // Reduce Haul mana cost by 5
    regeneration:      true,   // Totem heals all players for 1% max HP
    tether:            false,   // Twisted Tether - bleeding enemies take damage when you lose HP
    
    // ═══ ROW 6 (15 nodes) ═══
    jungleSlayer:      true,   // Each Totem summons an Effigy
    maskOfTheCoward:   false,   // Mask: Haul costs 50% less, +80% walk speed, -10% damage
    eldritchCall:      false,   // Shift+Totem summons 4 tentacles
    maddeningRoots:    false,   // Uproot slows enemies by 40%
    seekingTotem:      false,   // Totem moves toward you while wearing Heretic Mask
    chantOfTheFanatic: false,   // Switching to Fanatic Mask grants +70% resistance
    auraCost2:         true,   // Reduce Aura mana cost by 5
    auraDamage1:       false,   // Increase Totem damage by +4%
    sharpHealing:      false,   // Aura healing increased by Water Damage Bonus
    moreBloodPool2:    false,   // Increase max Blood Pool by +30; max Bleeding +1.5s
    commander:         true,   // Shift+Aura rallies Puppets at +25% attack speed
    helpingHand2:      false,   // Hitting Puppets costs 2s duration but grants +10% damage
    betterMasquerade:  false,   // Masquerade triggers after 1 fewer Mask switch
    deeperWounds:      false,   // Increase Bleeding damage by +20%
    strongerTether:    false,   // Increase Twisted Tether damage by +25%
    
    // ═══ ROW 7 (13 nodes) ═══
    hummingbirds:      true,   // Summon 2 Hummingbird Carvings
    chantOfTheCoward:  false,   // Switching to Heretic Mask grants +60% walk speed
    tankBloodPool:     false,   // When players take damage, 35% added to Blood Pool
    tripleTotem:       true,   // Increase max Totems by +1 (total 3)
    invigoratingWave:  true,   // Aura grants Summons +30% attack speed
    hymnOfFreedom:     false,   // Haul bounces 3 times while wearing Heretic Mask
    sanguineStrike:    false,   // Main Attack spread reduced, beams inflict Bleeding
    moreBloodPool3:    false,   // Increase max Blood Pool by +30; max Bleeding +1.5s
    hummingbirds2:     true,   // Improves Hummingbirds: +20% walk speed, +2 jump height
    bloodLament:       false,   // Shift+Uproot fires beam that chains through entities
    shepherd:          true,   // Killing enemies grants +1 max Puppets for 15s
    uprootCost2:       false,   // Reduce Uproot mana cost by 5
    maskOfTheAwakened: false,   // After saving 150 mana, gain all Mask bonuses
}

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

// ─── Helper Functions ─────────────────────────────────────────────────────────
// These functions help configure the class based on SELECTED_CLASS

export function getActiveNodes() {
    const activeNodes = []
    for (const [nodeId, isActive] of Object.entries(ABILITY_NODE_STATUS)) {
        if (isActive) {
            activeNodes.push(nodeId)
        }
    }
    return activeNodes
}

export function setupClassConfiguration() {
    switch (SELECTED_CLASS) {
        case 'shaman':
            CLASS_CONFIG.name = 'shaman'
            CLASS_CONFIG.weaponType = WEAPON_TYPE
            CLASS_CONFIG.spellDefinitions = SHAMAN_SPELLS
            CLASS_CONFIG.abilityNodes = SHAMAN_ABILITY_NODES
            CLASS_CONFIG.archetypes = SHAMAN_ARCHETYPES
            break
        // Add more classes here later
        default:
            throw new Error(`Unsupported class: ${SELECTED_CLASS}`)
    }
    
    // Validate that selected class is in available classes list
    if (!AVAILABLE_CLASSES.includes(SELECTED_CLASS)) {
        throw new Error(`Class '${SELECTED_CLASS}' is not in AVAILABLE_CLASSES. Available: ${AVAILABLE_CLASSES.join(', ')}`)
    }
    
    console.log(`✓ Configured for class: ${SELECTED_CLASS.toUpperCase()}`)
    console.log(`✓ Weapon type: ${CLASS_CONFIG.weaponType}`)
    console.log(`✓ Active nodes: ${getActiveNodes().length}/${Object.keys(ABILITY_NODE_STATUS).length}`)
    
    return CLASS_CONFIG
}
