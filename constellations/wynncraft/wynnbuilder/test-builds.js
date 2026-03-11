import { fetchAllItems, filterRelevantItems } from './api/wapi.js';
import { MINS, WEIGHTS, DPS_WEIGHT } from './config/priorities.js';
import { ROTATION, setupClassConfiguration, getActiveNodes } from './config/build-conservative.js';
import { computeRotationDPS } from './engine/damageEngine.js';

function createBuildStats(itemNames, allItemsData) {
    const stats = {
        baseMeanDmg: 0,
        spellDmg: 0,
        spellDmgPct: 0,
        manaRegen: 0,
        manaSteal: 0,
        lifeSteal: 0,
        walkSpeed: 0,
        hp: 0,
        reqStr: 0, reqDex: 0, reqInt: 0, reqDef: 0, reqAgi: 0,
        strength: 0, dexterity: 0, intelligence: 0, defence: 0, agility: 0
    };
    
    // Find items by name and add their stats
    for (const itemName of itemNames) {
        const item = allItemsData.find(i => i.name === itemName);
        if (item) {
            for (const [key, value] of Object.entries(item)) {
                if (key in stats && typeof value === 'number') {
                    stats[key] += value;
                }
            }
        } else {
            console.warn(`Item not found: ${itemName}`);
        }
    }
    
    return stats;
}

async function testBuilds() {
    console.log('=== BUILD PERFORMANCE COMPARISON ===\n');
    
    const allItems = await fetchAllItems();
    const classConfig = setupClassConfiguration();
    const { weapons, helmets, chests, leggings, boots, rings, bracelets, necklaces } = 
        filterRelevantItems(allItems, classConfig.weaponType);
    
    // Combine all items for lookup
    const allItemsData = [...weapons, ...helmets, ...chests, ...leggings, ...boots, ...rings, ...bracelets, ...necklaces];
    const activeNodes = getActiveNodes();
    
    // Define test builds
    const builds = {
        'Current Build (Optimized)': [
            'Overdrive', 'Brainwash', 'Tesla', 'Crestfallen', 'Stardew', 
            'Ataraxy', 'Ataraxy', 'Provenance', 'Exhibition'
        ],
        'Previous Build (Paradox)': [
            'Overdrive', 'Brainwash', 'Tesla', 'Crestfallen', 'Paradox', 
            'Ataraxy', 'Ataraxy', 'Provenance', 'Exhibition'
        ],
        'Hadal Weapon Upgrade': [
            'Hadal', 'Brainwash', 'Tesla', 'Crestfallen', 'Stardew',
            'Ataraxy', 'Ataraxy', 'Provenance', 'Exhibition'
        ],
        'Both Weapon + More Boots': [
            'Hadal', 'Brainwash', 'Tesla', 'Crestfallen', 'Stardew',
            'Ataraxy', 'Ataraxy', 'Provenance', 'Exhibition'
        ],
        'Low SP Build': [
            'Hadal', 'Dissociation', 'Soul Signal', 'Aleph Null', 'Virtuoso',
            'Lodestone', 'Yang', 'Synapse', 'Achromatic Gloom'
        ],
        'Budget Build': [
            'Tremorcaller', 'Dissociation', 'Wanderlust', 'Asphyxia', 'Virtuoso',
            'Lodestone', 'Yang', 'Synapse', 'Achromatic Gloom'
        ]
    };
    
    const results = [];
    
    for (const [buildName, items] of Object.entries(builds)) {
        const stats = createBuildStats(items, allItemsData);
        
        const dps = computeRotationDPS(
            stats,
            ROTATION,
            classConfig.spellDefinitions,
            classConfig.abilityNodes,
            activeNodes
        );
        
        const utilityScore = stats.hp * WEIGHTS.hp + stats.manaRegen * WEIGHTS.manaRegen;
        const totalScore = dps * DPS_WEIGHT + utilityScore;
        const totalSP = stats.reqStr + stats.reqDex + stats.reqInt + stats.reqDef + stats.reqAgi;
        
        results.push({
            name: buildName,
            dps: dps,
            score: totalScore,
            skillpoints: totalSP,
            baseDmg: stats.baseMeanDmg,
            spellDmg: stats.spellDmg,
            spellDmgPct: stats.spellDmgPct,
            manaRegen: stats.manaRegen
        });
    }
    
    // Sort by DPS
    results.sort((a, b) => b.dps - a.dps);
    
    // Display results
    console.log('Rank | Build Name           | DPS           | SP   | Base Dmg | Spell Dmg | Spell % | Mana');
    console.log('-'.repeat(95));
    
    results.forEach((result, index) => {
        const rank = (index + 1).toString().padStart(4);
        const name = result.name.padEnd(20);
        const dps = result.dps.toLocaleString().padStart(12);
        const sp = result.skillpoints.toString().padStart(4);
        const baseDmg = result.baseDmg.toString().padStart(8);
        const spellDmg = result.spellDmg >= 0 ? `+${result.spellDmg}` : result.spellDmg.toString();
        const spellDmgStr = spellDmg.padStart(9);
        const spellPct = result.spellDmgPct >= 0 ? `+${result.spellDmgPct}%` : `${result.spellDmgPct}%`;
        const spellPctStr = spellPct.padStart(7);
        const manaRegen = result.manaRegen.toString().padStart(4);
        
        console.log(`${rank} | ${name} | ${dps} | ${sp} | ${baseDmg} | ${spellDmgStr} | ${spellPctStr} | ${manaRegen}`);
    });
    
    // Show improvement percentages
    console.log('\n=== IMPROVEMENT ANALYSIS ===\n');
    
    const currentBuild = results.find(r => r.name === 'Current Build (Optimized)');
    if (currentBuild) {
        results.forEach(result => {
            if (result.name !== 'Current Build (Optimized)') {
                const dpsImprovement = ((result.dps / currentBuild.dps - 1) * 100).toFixed(1);
                const spDifference = result.skillpoints - currentBuild.skillpoints;
                const spChange = spDifference >= 0 ? `+${spDifference}` : spDifference.toString();
                
                console.log(`${result.name}:`);
                console.log(`  DPS:        ${result.dps.toLocaleString().padStart(12)} (${dpsImprovement >= 0 ? '+' : ''}${dpsImprovement}%)`);
                console.log(`  Skillpoints: ${result.skillpoints.toString().padStart(4)} SP (${spChange} vs current)`);
                console.log('');
            }
        });
    }
    
    // Highlight best value picks
    console.log('=== RECOMMENDATIONS ===\n');
    
    const previousBuild = results.find(r => r.name === 'Previous Build (Paradox)');
    const hadal = results.find(r => r.name === 'Hadal Weapon Upgrade');
    const both = results.find(r => r.name === 'Both Weapon + More Boots');
    const lowSP = results.find(r => r.name === 'Low SP Build');
    
    if (previousBuild && currentBuild) {
        const improvement = ((currentBuild.dps / previousBuild.dps - 1) * 100).toFixed(1);
        const spSaved = previousBuild.skillpoints - currentBuild.skillpoints;
        console.log(`✅ IMPLEMENTED: Paradox → Stardew upgrade gives +${improvement}% DPS and saves ${spSaved} SP`);
    }
    
    if (hadal) {
        const improvement = ((hadal.dps / currentBuild.dps - 1) * 100).toFixed(1);
        console.log(`🚀 NEXT UPGRADE: Overdrive → Hadal gives +${improvement}% DPS`);
    }
    
    if (both) {
        const improvement = ((both.dps / currentBuild.dps - 1) * 100).toFixed(1);
        console.log(`🔥 WEAPON UPGRADE NEXT: Hadal weapon gives +${improvement}% DPS total`);
    }
    
    if (lowSP) {
        const improvement = ((lowSP.dps / currentBuild.dps - 1) * 100).toFixed(1);
        const spSaved = currentBuild.skillpoints - lowSP.skillpoints;
        console.log(`💎 BUDGET ALTERNATIVE: Low SP build saves ${spSaved} SP but ${improvement}% DPS`);
    }
}

testBuilds().catch(console.error);