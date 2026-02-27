import fetch from 'node-fetch'

const DAMAGE_ID = "2"
const HP_ID = "6"
const MANAREGEN_ID = "8"

export async function fetchAllItems() {
    try {
        const response = await fetch('https://api.wynncraft.com/v3/item/database?fullResult')

        if (!response.ok) {
            throw new Error(`Failed to fetch items: Status ${response.status}`)
        }

        const data = await response.json()

        const items = data.items || data

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

export function filterRelevantItems(allItems) {
    const weapons = []
    const helmets = []
    const chests = []

    for (const item of Object.values(allItems)) {  
        if (!item) { continue }
        if (item.crafted) { continue }

        const idents = item.identifications || {}

        if (item.type === 'weapon') {
            weapons.push({
                name: item.name,
                dps: Number(idents[DAMAGE_ID] || 0),
                hp: Number(idents[HP_ID] || 0),
                manaRegen: Number(idents[MANAREGEN_ID] || 0)
            })
        }

        if (item.type === 'armour') {
            if (item.armourType === 'helmet') {
                helmets.push({
                    name: item.name,
                    dps: Number(idents[DAMAGE_ID] || 0),
                    hp: Number(idents[HP_ID] || 0),
                    manaRegen: Number(idents[MANAREGEN_ID] || 0)
                })
            }
            
            if (item.armourType === 'chestplate') {
                chests.push({
                    name: item.name,
                    dps: Number(idents[DAMAGE_ID] || 0),
                    hp: Number(idents[HP_ID] || 0),
                    manaRegen: Number(idents[MANAREGEN_ID] || 0)
                })
            }
        }
    }

    return { weapons, helmets, chests }
}