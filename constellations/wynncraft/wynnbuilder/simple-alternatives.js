import { fetchAllItems, filterRelevantItems } from './api/wapi.js';
import { WEAPON_TYPE } from './config/abilities/shaman.js';

async function findAlternatives() {
    console.log('=== Alternative Item Analysis ===\n');
    
    const allItems = await fetchAllItems();
    const { weapons, helmets, chests, leggings, boots, rings, bracelets, necklaces } = 
        filterRelevantItems(allItems, WEAPON_TYPE);
    
    // Current best build items for reference
    const currentBuild = {
        weapon: 'Overdrive',
        helmet: 'Brainwash', 
        chest: 'Tesla',
        leggings: 'Crestfallen',
        boots: 'Stardew',       // Upgraded from Paradox: +5.3% DPS, -40 SP
        ring: 'Ataraxy',
        bracelet: 'Provenance',
        necklace: 'Exhibition'
    };
    
    console.log('CURRENT BUILD:');
    Object.entries(currentBuild).forEach(([slot, item]) => {
        console.log(`  ${slot.padEnd(9)}: ${item}`);
    });
    console.log('\n');
    
    const slots = [
        ['WEAPONS', weapons],
        ['HELMETS', helmets], 
        ['CHESTPLATES', chests],
        ['LEGGINGS', leggings],
        ['BOOTS', boots],
        ['RINGS', rings],
        ['BRACELETS', bracelets],
        ['NECKLACES', necklaces]
    ];
    
    for (const [slotName, items] of slots) {
        console.log(`=== TOP ${slotName} ===`);
        
        // Simple scoring: prioritize spell damage stats
        const scoredItems = items.map(item => {
            let score = 0;
            if (item.baseMeanDmg > 0) score += item.baseMeanDmg * 10; // Base weapon damage
            if (item.spellDmg > 0) score += item.spellDmg * 2;  // Raw spell damage
            if (item.spellDmgPct > 0) score += item.spellDmgPct * 3; // % spell damage
            if (item.manaRegen > 0) score += item.manaRegen * 5; // Mana sustain
            if (item.manaSteal > 0) score += item.manaSteal * 2; // Mana steal
            
            // Penalty for extreme skillpoint requirements 
            const totalReq = (item.reqStr || 0) + (item.reqDex || 0) + (item.reqInt || 0) + 
                           (item.reqDef || 0) + (item.reqAgi || 0);
            if (totalReq > 500) score *= 0.8;
            if (totalReq > 800) score *= 0.5;
            
            return { ...item, score, totalReq };
        }).sort((a, b) => b.score - a.score);
        
        // Show top 8 items
        scoredItems.slice(0, 8).forEach((item, index) => {
            const keyStats = [];
            if (item.baseMeanDmg > 0) keyStats.push(`${item.baseMeanDmg} base`);
            if (item.spellDmg !== 0) keyStats.push(`${item.spellDmg > 0 ? '+' : ''}${item.spellDmg} raw`);
            if (item.spellDmgPct !== 0) keyStats.push(`${item.spellDmgPct > 0 ? '+' : ''}${item.spellDmgPct}%`);
            if (item.manaRegen > 0) keyStats.push(`${item.manaRegen} mr`);
            if (item.manaSteal > 0) keyStats.push(`${item.manaSteal} ms`);
            
            const isCurrent = Object.values(currentBuild).includes(item.name);
            const marker = isCurrent ? ' ★' : '  ';
            
            console.log(`${marker}${(index + 1).toString().padStart(2)}. ${item.name.padEnd(20)} (${item.totalReq.toString().padStart(3)} SP) - ${keyStats.join(', ')}`);
        });
        console.log('');
    }
    
    // Low skillpoint alternatives
    console.log('=== LOW SKILLPOINT ALTERNATIVES (≤ 400 SP) ===\n');
    
    for (const [slotName, items] of slots) {
        const lowSpItems = items.filter(item => {
            const totalReq = (item.reqStr || 0) + (item.reqDex || 0) + (item.reqInt || 0) + 
                           (item.reqDef || 0) + (item.reqAgi || 0);
            return totalReq <= 400;
        }).map(item => {
            let score = 0;
            if (item.spellDmg > 0) score += item.spellDmg * 2;
            if (item.spellDmgPct > 0) score += item.spellDmgPct * 3; 
            if (item.manaRegen > 0) score += item.manaRegen * 5;
            if (item.baseMeanDmg > 0) score += item.baseMeanDmg * 10;
            return { ...item, score };
        }).sort((a, b) => b.score - a.score).slice(0, 3);
        
        if (lowSpItems.length > 0) {
            console.log(`${slotName}:`);
            lowSpItems.forEach(item => {
                const totalReq = (item.reqStr || 0) + (item.reqDex || 0) + (item.reqInt || 0) + 
                               (item.reqDef || 0) + (item.reqAgi || 0);
                const keyStats = [];
                if (item.spellDmg !== 0) keyStats.push(`${item.spellDmg > 0 ? '+' : ''}${item.spellDmg} raw`);
                if (item.spellDmgPct !== 0) keyStats.push(`${item.spellDmgPct > 0 ? '+' : ''}${item.spellDmgPct}%`);
                console.log(`  ${item.name.padEnd(20)} (${totalReq.toString().padStart(3)} SP) - ${keyStats.join(', ')}`);
            });
            console.log('');
        }
    }
    
    // Check for Paradox-like items (high level boots/leggings)
    console.log('=== HIGH-LEVEL BOOTS vs LEGGINGS ===');
    console.log('Comparing items similar to Paradox level range:\n');
    
    const highLevelBoots = boots.filter(item => {
        const totalReq = (item.reqStr || 0) + (item.reqDex || 0) + (item.reqInt || 0) + 
                       (item.reqDef || 0) + (item.reqAgi || 0);
        return totalReq >= 180 && totalReq <= 250;
    }).slice(0, 5);
    
    const highLevelLeggings = leggings.filter(item => {
        const totalReq = (item.reqStr || 0) + (item.reqDex || 0) + (item.reqInt || 0) + 
                       (item.reqDef || 0) + (item.reqAgi || 0);
        return totalReq >= 180 && totalReq <= 250;
    }).slice(0, 5);
    
    console.log('HIGH-LEVEL BOOTS:');
    highLevelBoots.forEach(item => {
        const totalReq = (item.reqStr || 0) + (item.reqDex || 0) + (item.reqInt || 0) + 
                       (item.reqDef || 0) + (item.reqAgi || 0);
        console.log(`  ${item.name.padEnd(20)} (${totalReq} SP)`);
    });
    
    console.log('\\nHIGH-LEVEL LEGGINGS:');
    highLevelLeggings.forEach(item => {
        const totalReq = (item.reqStr || 0) + (item.reqDex || 0) + (item.reqInt || 0) + 
                       (item.reqDef || 0) + (item.reqAgi || 0);
        console.log(`  ${item.name.padEnd(20)} (${totalReq} SP)`);
    });
}

findAlternatives().catch(console.error);