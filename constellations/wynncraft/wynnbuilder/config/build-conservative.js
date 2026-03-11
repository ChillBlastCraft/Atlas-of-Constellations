/**
 * ─── Conservative Shaman Build (Skillpoint-Efficient) ─────────────────────────
 * 
 * This build focuses on essential nodes with lower skillpoint requirements.
 * Should be achievable within the 200 manual skillpoint limit.
 */

import { SHAMAN_SPELLS, SHAMAN_ABILITY_NODES, SHAMAN_ARCHETYPES, WEAPON_TYPE } from './abilities/shaman.js'

export const AVAILABLE_CLASSES = ['shaman']
export const SELECTED_CLASS = 'shaman'

export let CLASS_CONFIG = {
    name: null,
    weaponType: null, 
    spellDefinitions: null,
    abilityNodes: null,
    archetypes: null
}

// Conservative build focusing on core DPS without extreme skillpoint requirements
export const ABILITY_NODE_STATUS = {
    // ═══ ROW 1 (4 nodes) ═══
    totem:             true,    // Essential - unlock Totem spell
    relikProficiency:  true,   // Good DPS boost, low requirements
    totemCost1:        false,   // Skip - mana cost reductions are less important
    totemicsmash:      true,   // Good instant damage boost
    
    // ═══ ROW 2 (7 nodes) ═══
    relikSpread:       true,    // Choose this OR relikBeams - improved attack speed
    haul:              true,    // Essential - unlock Haul spell
    relikBeams:        false,   // Skip - conflicts with relikSpread
    uproot:            true,    // Essential - unlock Uproot spell
    haulCost1:         false,   // Skip - mana management less critical early
    aura:              true,    // Essential - unlock Aura spell
    totemShove:        false,   // Skip - utility, not core DPS
    
    // ═══ ROW 3 (10 nodes) ═══
    shamanEarthPath:   false,   // Skip - choose 1-2 masteries max to save points
    shamanAirPath:     true,    // Keep - good damage boost
    shamanThunderPath: false,   // Skip for now
    shamanFirePath:    false,   // Skip for now
    shamanWaterPath:   false,   // Skip for now
    naturejolt:        false,   // Skip - requires haul investment
    overseer:          false,   // Skip - utility over raw DPS
    danceOfTheRain:    false,   // Skip - complex mechanic
    shockingAura:      true,    // Keep - direct Aura damage boost
    flamingTongue:     false,   // Skip - changes uproot fundamentally
    
    // ═══ ROW 4 (12 nodes) ═══
    stagnation:        false,   // Skip all utility nodes for now
    puppetMaster:      false,   // Skip - summons require archetype investment
    maskOfTheLunatic:  false,   // Skip - mask builds require heavy investment
    bloodPool:         false,   // Skip - blood magic requires heavy investment
    auraCost1:         true,    // Keep - cheap and effective
    uprootCost1:       true,    // Keep - cheap and effective  
    morePuppets:       false,   // Skip - no puppet master
    hauntingMemory:    false,   // Skip - mask mechanic
    totemRange:        false,   // Skip - utility over DPS
    hymnOfHate:        false,   // Skip - mask mechanic
    rebound:           true,    // Keep - doubles Aura damage effectively
    bloodConnection:   false,   // Skip - utility
    
    // ═══ ROW 5 (16 nodes) ═══
    explodingPuppet:   false,   // Skip - no puppet master
    maskOfTheFanatic:  false,   // Skip - mask builds
    moreBloodPool:     false,   // Skip - no blood pool
    summonFocus:       false,   // Skip - no summons
    totemicShatter:    false,   // Skip - mask dependent
    maskRotation:      false,   // Skip - mask builds
    lashingLance:      false,   // Skip - blood magic
    morePuppets2:      false,   // Skip - no puppets
    chantOfTheLunatic: false,   // Skip - mask builds
    vengefulspirit:    false,   // Skip for now - team buff
    doubleTotem:       false,   // Skip - reduces individual totem damage
    totemCost2:        false,   // Skip - mana management
    auraPull:          false,   // Skip - CC over pure DPS
    haulCost2:         false,   // Skip - mana management
    regeneration:      false,   // Skip - healing over DPS
    tether:            false,   // Skip - blood magic
    
    // ═══ ROW 6 & 7 ═══
    // Skip all remaining nodes - these require heavy archetype investment
    
    jungleSlayer:      false,
    maskOfTheCoward:   false,
    eldritchCall:      false,
    maddeningRoots:    false,
    seekingTotem:      false,
    chantOfTheFanatic: false,
    auraCost2:         false,
    auraDamage1:       false,
    sharpHealing:      false,
    moreBloodPool2:    false,
    commander:         false,
    helpingHand2:      false,
    betterMasquerade:  false,
    deeperWounds:      false,
    strongerTether:    false,
    hummingbirds:      false,
    chantOfTheCoward:  false,
    tankBloodPool:     false,
    tripleTotem:       false,
    invigoratingWave:  false,
    hymnOfFreedom:     false,
    sanguineStrike:    false,
    moreBloodPool3:    false,
    hummingbirds2:     false,
    bloodLament:       false,
    shepherd:          false,
    uprootCost2:       false,
    maskOfTheAwakened: false,
}

// ─── Rotation with Conservative Build ─────────────────────────────────────────
export const ROTATION = {
    totem:  { castWeight: 1.0 },   // Still core spell
    aura:   { castWeight: 2.0 },   // Enhanced with rebound + shockingAura
    uproot: { castWeight: 1.5 },   // Good damage, enhanced with shocking
    haul:   { castWeight: 0.5 },   // Mobility/positioning
}

// Setup function
export function setupClassConfiguration() {
    if (SELECTED_CLASS === 'shaman') {
        CLASS_CONFIG.name = 'Shaman'
        CLASS_CONFIG.weaponType = WEAPON_TYPE
        CLASS_CONFIG.spellDefinitions = SHAMAN_SPELLS
        CLASS_CONFIG.abilityNodes = SHAMAN_ABILITY_NODES
        CLASS_CONFIG.archetypes = SHAMAN_ARCHETYPES
        
        console.log(`✓ Configured for class: ${CLASS_CONFIG.name.toUpperCase()}`)
        console.log(`✓ Weapon type: ${CLASS_CONFIG.weaponType}`)
        console.log(`✓ Active nodes: ${getActiveNodes().length}/${Object.keys(SHAMAN_ABILITY_NODES).length}`)
        
        return CLASS_CONFIG
    }
    
    throw new Error(`Unsupported class: ${SELECTED_CLASS}`)
}

export function getActiveNodes() {
    return Object.entries(ABILITY_NODE_STATUS)
        .filter(([key, isActive]) => isActive)
        .map(([key]) => key)
}