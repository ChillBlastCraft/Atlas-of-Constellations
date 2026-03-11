import { optimizeBeam } from './engine/optimizer.js'
import { fetchAllItems, filterRelevantItems } from './api/wapi.js'
import { MINS, WEIGHTS, BEAM_WIDTH, DPS_WEIGHT } from './config/priorities.js'
import { ROTATION, SPELL_DEFINITIONS, ABILITY_NODES, ACTIVE_ABILITY_NODES } from './config/build.js'
import { computeRotationDPS } from './engine/damageEngine.js'

async function run() {
    console.log('Fetching items from WAPI...')
    const allItems = await fetchAllItems()

    if (!allItems || Object.keys(allItems).length === 0) {
        console.error('No items fetched. Aborting optimizer.')
        return
    }
    console.log(`Fetched ${Object.keys(allItems).length} items.`)

    console.log('Filtering relevant items...')
    const { weapons, helmets, chests, leggings, boots, rings, bracelets, necklaces } = filterRelevantItems(allItems)

    const slotMap = { weapons, helmets, chests, leggings, boots, rings, bracelets, necklaces }
    for (const [slot, arr] of Object.entries(slotMap)) {
        if (arr.length === 0) {
            console.error(`No ${slot} found. Aborting.`)
            return
        }
    }
    console.log('Found:', Object.entries(slotMap).map(([k, v]) => `${v.length} ${k}`).join(', '))

    console.log('\nRunning beam search optimizer...')
    console.log('Minimums:', MINS)
    console.log('Weights: ', WEIGHTS)
    console.log('Beam width:', BEAM_WIDTH)
    console.log('Active ability nodes:', ACTIVE_ABILITY_NODES)

    const dpsConfig = {
        rotation:    ROTATION,
        spellDefs:   SPELL_DEFINITIONS,
        abilityNodes: ABILITY_NODES,
        activeNodes: ACTIVE_ABILITY_NODES,
        dpsWeight:   DPS_WEIGHT,
    }

    const bestBuild = optimizeBeam(
        weapons,
        helmets,
        chests,
        leggings,
        boots,
        rings,
        rings,
        bracelets,
        necklaces,
        MINS,
        WEIGHTS,
        BEAM_WIDTH,
        dpsConfig
    )

    if (!bestBuild) {
        console.error('\nNo valid build found meeting the specified constraints.')
        return
    }

    const slotNames = ['weapon', 'helmet', 'chest', 'leggings', 'boots', 'ring1', 'ring2', 'bracelet', 'necklace']
    console.log('\n=== Best Build ===')
    bestBuild.items.forEach((item, i) => {
        console.log(`  ${slotNames[i].padEnd(10)}  ${item.name}`)
    })

    console.log('\nStats:')
    for (const [stat, val] of Object.entries(bestBuild.stats)) {
        if (val !== 0) console.log(`  ${stat.padEnd(14)}  ${val}`)
    }

    const realDPS = computeRotationDPS(
        bestBuild.stats,
        ROTATION,
        SPELL_DEFINITIONS,
        ABILITY_NODES,
        ACTIVE_ABILITY_NODES
    )
    console.log(`\nEstimated rotation DPS: ${realDPS.toLocaleString()}`)
    console.log(`Score: ${bestBuild.score.toFixed(2)}`)
}

run()