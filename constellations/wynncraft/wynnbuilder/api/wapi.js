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
    return stats
}

export function filterRelevantItems(allItems) {
    const weapons = [], helmets = [], chests = [], leggings = [], boots = []
    const necklaces = [], bracelets = [], rings = []

    for (const item of Object.values(allItems)) {
        if (!item || item.crafted) continue

        const stats = buildItemStats(item)

        if (item.type === 'weapon') {
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

    return { weapons, helmets, chests, leggings, boots, necklaces, bracelets, rings }
}