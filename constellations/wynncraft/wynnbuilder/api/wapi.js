import fetch from 'node-fetch'
import { TRACKED_STATS } from '../config/priorities.js'
import { weaponMeanDamage } from '../engine/damageEngine.js'

export async function fetchAllItems() {
    try {
        const response = await fetch('https://api.wynncraft.com/v3/item/database?fullResult')

        if (!response.ok) {
            throw new Error(`Failed to fetch items: Status ${response.status}`)
        }

        const data = await response.json()
        let items
        if (typeof data.items !== 'undefined') {
            items = data.items
        } else {
            items = data
        }

        if (!items || Object.keys(items).length === 0) {
            console.warn('Warning: No items found in WAPI response.')
            return {}
        }

        return items
    } catch (err) {
        console.error('Failed to fetch items from WAPI:', err.message)
        return {}
    }
}

function getRaw(idents, apiId) {
    const entry = idents[apiId]
    if (!entry) {
        return 0
    }
    if (typeof entry.max !== 'undefined') {
        return Number(entry.max)
    }
    if (typeof entry.raw !== 'undefined') {
        return Number(entry.raw)
    }
    return 0
}

function buildItemStats(item) {
    let idents
    if (item.identifications) {
        idents = item.identifications
    } else {
        idents = {}
    }
    let stats
    if (item.internalName !== undefined) {
        stats = { name: item.internalName }
    } else {
        stats = { name: item.name }
    }
    for (const [statKey, apiId] of Object.entries(TRACKED_STATS)) {
        if (apiId) {
            stats[statKey] = getRaw(idents, apiId)
        } else {
            stats[statKey] = 0
        }
    }

    if (item.type === 'weapon') {
        let baseObj
        if (item.base) {
            baseObj = item.base
        } else {
            baseObj = {}
        }
        stats.baseMeanDmg = weaponMeanDamage(baseObj)
    }

    const reqs = item.requirements || {}
    stats.reqStr = reqs.strength    || 0
    stats.reqDex = reqs.dexterity   || 0
    stats.reqInt = reqs.intelligence || 0
    stats.reqDef = reqs.defence     || 0
    stats.reqAgi = reqs.agility     || 0

    // Validate item stats to filter out broken items
    if (!isValidItem(stats, item)) {
        return null
    }

    return stats
}

function isValidItem(stats, item) {
    // Filter out items with impossible negative spell damage values
    // These appear to be data corruption or API bugs
    if (stats.spellDmg < -10000 || stats.spellDmgPct < -10000) {
        console.warn(`Filtering out item "${stats.name}" due to extreme negative spell damage: raw=${stats.spellDmg}, %=${stats.spellDmgPct}`)
        return false
    }
    
    // Filter out items with impossible skillpoint requirements
    const totalReqs = stats.reqStr + stats.reqDex + stats.reqInt + stats.reqDef + stats.reqAgi
    if (totalReqs > 1000) {
        console.warn(`Filtering out item "${stats.name}" due to extreme skillpoint requirements: ${totalReqs}`)
        return false
    }
    
    // For weapons, ensure base damage makes sense
    if (item.type === 'weapon' && stats.baseMeanDmg <= 0) {
        console.warn(`Filtering out weapon "${stats.name}" due to zero or negative base damage: ${stats.baseMeanDmg}`)
        return false
    }
    
    return true
}

export function filterRelevantItems(allItems, weaponType) {
    const weapons = [], helmets = [], chests = [], leggings = [], boots = []
    const necklaces = [], bracelets = [], rings = []
    let filteredCount = 0

    for (const item of Object.values(allItems)) {
        if (!item || item.crafted) continue

        const stats = buildItemStats(item)
        
        // Skip items that failed validation
        if (!stats) {
            filteredCount++
            continue
        }

        if (item.type === 'weapon' && item.weaponType === weaponType) {
            weapons.push(stats)
        } else if (item.type === 'armour') {
            if (item.armourType === 'helmet') { helmets.push(stats) }
            else if (item.armourType === 'chestplate') { chests.push(stats) }
            else if (item.armourType === 'leggings') { leggings.push(stats) }
            else if (item.armourType === 'boots') { boots.push(stats) }
        } else if (item.type === 'accessory') {
            if (item.accessoryType === 'necklace') { necklaces.push(stats) }
            else if (item.accessoryType === 'bracelet') { bracelets.push(stats) }
            else if (item.accessoryType === 'ring') { rings.push(stats) }
        }
    }
    
    if (filteredCount > 0) {
        console.log(`Filtered out ${filteredCount} invalid items.`)
    }

    return { weapons, helmets, chests, leggings, boots, necklaces, bracelets, rings }
}