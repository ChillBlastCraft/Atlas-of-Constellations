import { optimizeBeam } from './engine/optimizer.js'
import { fetchAllItems, filterRelevantItems } from './api/wapi.js'
import { MINS, WEIGHTS, BEAM_WIDTH, DPS_WEIGHT } from './config/priorities.js'
// Switch between build configurations here:
import { ROTATION, SELECTED_CLASS, AVAILABLE_CLASSES, setupClassConfiguration, getActiveNodes } from './config/build-conservative.js'  // Conservative build
// import { ROTATION, SELECTED_CLASS, AVAILABLE_CLASSES, setupClassConfiguration, getActiveNodes } from './config/build.js'  // Original ambitious build
import { computeRotationDPS } from './engine/damageEngine.js'

async function run() {
    console.log('=== Wynncraft Build Optimizer ===')
    console.log(`Available classes: ${AVAILABLE_CLASSES.join(', ')}`)
    console.log(`Selected class: ${SELECTED_CLASS}`)
    console.log()
    
    console.log('Setting up class configuration...')
    const classConfig = setupClassConfiguration()
    const activeNodes = getActiveNodes()
    console.log()
    
    console.log('Fetching items from WAPI...')
    const allItems = await fetchAllItems()

    if (!allItems || Object.keys(allItems).length === 0) {
        console.error('No items fetched. Aborting optimizer.')
        return
    }
    console.log(`Fetched ${Object.keys(allItems).length} items.`)

    console.log('Filtering relevant items...')
    const { weapons, helmets, chests, leggings, boots, rings, bracelets, necklaces } = filterRelevantItems(allItems, classConfig.weaponType)

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
    console.log('Active ability nodes:', activeNodes)

    const dpsConfig = {
        rotation:     ROTATION,
        spellDefs:    classConfig.spellDefinitions,
        abilityNodes: classConfig.abilityNodes,
        activeNodes:  activeNodes,
        dpsWeight:    DPS_WEIGHT,
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

    // Fix slot assignment: bestBuild.items order must match slotNames
    // If optimizeBeam returns [weapon, helmet, chest, leggings, boots, ring1, ring2, bracelet, necklace], this is correct.
    // If not, fix here:
    const slotNames = ['weapon', 'helmet', 'chest', 'leggings', 'boots', 'ring1', 'ring2', 'bracelet', 'necklace']
    console.log('\n=== Best Build ===')
    for (let i = 0; i < slotNames.length; i++) {
        const item = bestBuild.items[i];
        if (item) {
            console.log(`  ${slotNames[i].padEnd(10)}  ${item.name}`);
        }
    }

    console.log('\nStats:')
    for (const [stat, val] of Object.entries(bestBuild.stats)) {
        if (val !== 0) console.log(`  ${stat.padEnd(14)}  ${val}`)
    }

    const realDPS = computeRotationDPS(
        bestBuild.stats,
        ROTATION,
        classConfig.spellDefinitions,
        classConfig.abilityNodes,
        activeNodes
    )
    console.log(`\nEstimated rotation DPS: ${realDPS.toLocaleString()}`)
    console.log(`Score: ${bestBuild.score.toFixed(2)}`)

    const BASE_SKILLPOINTS = 200; // Level 101+ base skillpoints
    const s = bestBuild.stats;
    // Calculate total available skillpoints: base + gear bonuses
    const totalGearBonus =
        (s.strength || 0) +
        (s.dexterity || 0) +
        (s.intelligence || 0) +
        (s.defence || 0) +
        (s.agility || 0);
    // For level 101+, only 200 skillpoints are assignable manually
    const TOTAL_SP_LIMIT = BASE_SKILLPOINTS;
    const spBreakdown = [
        { stat: 'Strength',     req: s.reqStr, bonus: s.strength    },
        { stat: 'Dexterity',    req: s.reqDex, bonus: s.dexterity   },
        { stat: 'Intelligence', req: s.reqInt, bonus: s.intelligence },
        { stat: 'Defence',      req: s.reqDef, bonus: s.defence      },
        { stat: 'Agility',      req: s.reqAgi, bonus: s.agility      },
    ];
    let totalManual = 0;
    console.log('\nSkillpoints:');
    for (const { stat, req, bonus } of spBreakdown) {
        const manual = Math.max(0, req - bonus);
        totalManual += manual;
        if (req > 0 || bonus !== 0) {
            console.log(`  ${stat.padEnd(14)}  req ${req}  gear ${bonus >= 0 ? '+' : ''}${bonus}  → ${manual} manual`);
        }
    }
    console.log(`  Total manual: ${totalManual} / ${TOTAL_SP_LIMIT}`);
    if (totalManual > TOTAL_SP_LIMIT) {
        console.warn(`  WARNING: Too many skillpoints need to be assigned!`);
    } else {
        console.log(`  ✓ Feasible (${TOTAL_SP_LIMIT - totalManual} points to spare)`);
    }
    // Stricter check: warn if any stat requires more than 200 manual points
    for (const { stat, req, bonus } of spBreakdown) {
        const manual = Math.max(0, req - bonus);
        if (manual > BASE_SKILLPOINTS) {
            console.warn(`  Cannot assign ${manual} skillpoints in ${stat} manually.`);
        }
    }
}

run()