import { optimizeBeam } from './engine/optimizer.js'
import { fetchAllItems, filterRelevantItems } from './api/wapi.js'

async function run() {
    console.log('Fetching items from WAPI...')
    const allItems = await fetchAllItems()
    console.log('Fetched allItems:', allItems ? Object.keys(allItems).length : allItems)

    if (!allItems || Object.keys(allItems).length === 0) {
        console.error('No items fetched. Aborting optimizer.')
        return
    }

    console.log('Filtering relevant items...')
    const { weapons, helmets, chests } = filterRelevantItems(allItems)

    console.log(`Found ${weapons.length} weapons, ${helmets.length} helmets, ${chests.length} chestplates`)

    if (weapons.length === 0 || helmets.length === 0 || chests.length === 0) {
        console.error('Not enough items to run optimizer. Aborting.')
        return
    }

    console.log('Running beam search optimizer...')
    const bestBuild = optimizeBeam(
        weapons,
        helmets,
        chests,
        { minMana: 1, minEHP: 1 },
        { damage: 1, ehp: 0.001, mana: 5 },
        50 
    )

    console.log('Best Build:')
    console.log(bestBuild)
}

run()