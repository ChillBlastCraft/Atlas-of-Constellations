import fetch from 'node-fetch'

const DAMAGE_ID = "rawDamage"
const HP_ID = "rawHealth"
const MANAREGEN_ID = "manaRegen"

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

export function filterRelevantItems(allItems) {
    const weapons = []
    const helmets = []
    const chests = []

    for (const item of Object.values(allItems)) {
        if (!item) {
            continue
        }
        if (item.crafted) {
            continue
        }

        let idents
        if (item.identifications) {
            idents = item.identifications
        } else {
            idents = {}
        }

        function getRaw(id) {
            if (idents[id] && typeof idents[id].raw !== 'undefined') {
                return Number(idents[id].raw)
            } else {
                return 0
            }
        }

        let name
        if (typeof item.internalName !== 'undefined') {
            name = item.internalName
        } else {
            name = item.name
        }

        if (item.type === 'weapon') {
            weapons.push({
                name: name,
                dps: getRaw(DAMAGE_ID),
                hp: getRaw(HP_ID),
                manaRegen: getRaw(MANAREGEN_ID)
            })
        }

        if (item.type === 'armour') {
            if (item.armourType === 'helmet') {
                helmets.push({
                    name: name,
                    dps: getRaw(DAMAGE_ID),
                    hp: getRaw(HP_ID),
                    manaRegen: getRaw(MANAREGEN_ID)
                })
            }

            if (item.armourType === 'chestplate') {
                chests.push({
                    name: name,
                    dps: getRaw(DAMAGE_ID),
                    hp: getRaw(HP_ID),
                    manaRegen: getRaw(MANAREGEN_ID)
                })
            }
        }
    }

    return { weapons, helmets, chests }
}