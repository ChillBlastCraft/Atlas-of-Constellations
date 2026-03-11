import { fetchAllItems, filterRelevantItems } from './api/wapi.js';
import { MINS, WEIGHTS } from './config/priorities.js';
import { ROTATION, setupClassConfiguration, getActiveNodes } from './config/build-conservative.js';
import { computeRotationDPS } from './engine/damageEngine.js';
import { scoreBuild } from './engine/scoringEngine.js';

// Simulate a basic stat combination to score items
function scoreItem(item, slot) {
    // Create a base build with moderate stats
    const baseStats = {
        baseMeanDmg: slot === 'weapon' ? item.baseMeanDmg || 0 : 200,
        spellDmg: 1000,
        spellDmgPct: 800,
        manaRegen: 50,
        manaSteal: 50,
        // Requirements
        reqStr: 0, reqDex: 0, reqInt: 0, reqDef: 0, reqAgi: 0,
        // Bonuses  
        strength: 0, dexterity: 0, intelligence: 0, defence: 0, agility: 0
    };
    
    // Add this item's stats
    for (const [key, value] of Object.entries(item)) {
        if (key in baseStats) {
            baseStats[key] += value;
        }
    }
    
    const classConfig = setupClassConfiguration();
    const activeNodes = getActiveNodes();
    
    const dps = computeRotationDPS(
        baseStats,
        ROTATION,
        classConfig.spellDefinitions,
        classConfig.abilityNodes,
        activeNodes
    );
    
    const utilityScore = scoreBuild(baseStats, WEIGHTS);
    return dps + utilityScore;
}

async function analyzeAlternatives() {
    console.log('=== Alternative Item Analysis ===\n');
    
    const allItems = await fetchAllItems();
    const classConfig = setupClassConfiguration();
    const { weapons, helmets, chests, leggings, boots, rings, bracelets, necklaces } = 
        filterRelevantItems(allItems, classConfig.weaponType);
    
    const slots = {
        'Weapons': weapons,
        'Helmets': helmets, 
        'Chestplates': chests,
        'Leggings': leggings,
        'Boots': boots,
        'Rings': rings,
        'Bracelets': bracelets,
        'Necklaces': necklaces
    };
    
    for (const [slotName, items] of Object.entries(slots)) {
        console.log(`\n=== TOP ${slotName.toUpperCase()} ===`);
        
        // Score all items and get top 10
        const scoredItems = items.map(item => ({
            ...item,
            score: scoreItem(item, slotName.toLowerCase())
        })).sort((a, b) => b.score - a.score).slice(0, 10);
        
        scoredItems.forEach((item, index) => {
            const reqStr = item.reqStr || 0;
            const reqDex = item.reqDex || 0; 
            const reqInt = item.reqInt || 0;
            const reqDef = item.reqDef || 0;
            const reqAgi = item.reqAgi || 0;
            const totalReq = reqStr + reqDex + reqInt + reqDef + reqAgi;
            
            // Highlight key stats
            const keyStats = [];
            if (item.baseMeanDmg > 0) keyStats.push(`${item.baseMeanDmg} base dmg`);
            if (item.spellDmg !== 0) keyStats.push(`${item.spellDmg > 0 ? '+' : ''}${item.spellDmg} spell dmg`);
            if (item.spellDmgPct !== 0) keyStats.push(`${item.spellDmgPct > 0 ? '+' : ''}${item.spellDmgPct}% spell dmg`);
            if (item.manaRegen > 0) keyStats.push(`+${item.manaRegen} mana regen`);
            if (item.manaSteal > 0) keyStats.push(`+${item.manaSteal} mana steal`);
            
            console.log(`${(index + 1).toString().padStart(2)}. ${item.name.padEnd(22)} (${totalReq.toString().padStart(3)} SP) - ${keyStats.join(', ')}`);
        });
    }
    
    // Special analysis: Low skillpoint alternatives
    console.log('\n\n=== LOW SKILLPOINT ALTERNATIVES ===');
    console.log('Items with total requirements ≤ 300 skillpoints:\n');
    
    for (const [slotName, items] of Object.entries(slots)) {
        const lowSpItems = items.filter(item => {
            const totalReq = (item.reqStr || 0) + (item.reqDex || 0) + (item.reqInt || 0) + 
                           (item.reqDef || 0) + (item.reqAgi || 0);
            return totalReq <= 300;
        }).map(item => ({
            ...item,
            score: scoreItem(item, slotName.toLowerCase())
        })).sort((a, b) => b.score - a.score).slice(0, 5);
        
        if (lowSpItems.length > 0) {
            console.log(`${slotName}:`);
            lowSpItems.forEach((item, index) => {
                const totalReq = (item.reqStr || 0) + (item.reqDex || 0) + (item.reqInt || 0) + 
                               (item.reqDef || 0) + (item.reqAgi || 0);
                console.log(`  ${item.name.padEnd(20)} (${totalReq.toString().padStart(3)} SP)`);
            });
            console.log('');
        }
    }
    
    // Look for items that might be confused with Paradox (similar stats/names)
    console.log('\n=== PARADOX-LIKE ITEMS ===');
    console.log('Items with similar names or high-level requirements:\n');
    
    const allArmor = [...helmets, ...chests, ...leggings, ...boots];
    const paradoxLike = allArmor.filter(item => {
        const name = item.name.toLowerCase();
        const req = item.reqStr + item.reqDex + item.reqInt + item.reqDef + item.reqAgi;
        return name.includes('para') || name.includes('dox') || 
               (req >= 200 && req <= 250); // Similar requirement range to Paradox
    }).sort((a, b) => b.score - a.score);
    
    paradoxLike.forEach(item => {
        const totalReq = (item.reqStr || 0) + (item.reqDex || 0) + (item.reqInt || 0) + 
                       (item.reqDef || 0) + (item.reqAgi || 0);
        const type = allItems[Object.keys(allItems).find(key => 
            allItems[key].name === item.name)]?.armourType || 'unknown';
        console.log(`${item.name.padEnd(20)} ${type.padEnd(10)} (${totalReq.toString().padStart(3)} SP)`);
    });
}

analyzeAlternatives().catch(console.error);