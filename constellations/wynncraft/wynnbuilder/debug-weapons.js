import { fetchAllItems, filterRelevantItems } from './api/wapi.js';
import { ROTATION, setupClassConfiguration, getActiveNodes } from './config/build-conservative.js';
import { computeRotationDPS } from './engine/damageEngine.js';

async function debugWeapons() {
    console.log('=== WEAPON DEBUG ANALYSIS ===\n');
    
    const allItems = await fetchAllItems();
    const classConfig = setupClassConfiguration();
    const { weapons } = filterRelevantItems(allItems, classConfig.weaponType);
    const activeNodes = getActiveNodes();
    
    // Test weapons individually
    const testWeapons = ['Overdrive', 'Hadal', 'Tremorcaller'];
    
    for (const weaponName of testWeapons) {
        const weapon = weapons.find(w => w.name === weaponName);
        if (!weapon) {
            console.log(`Weapon ${weaponName} not found\n`);
            continue;
        }
        
        console.log(`=== ${weaponName.toUpperCase()} ===`);
        console.log(`Base damage: ${weapon.baseMeanDmg}`);
        console.log(`Raw spell dmg: ${weapon.spellDmg}`);
        console.log(`% spell dmg: ${weapon.spellDmgPct}%`);
        console.log(`Mana regen: ${weapon.manaRegen}`);
        console.log(`Requirements: ${weapon.reqStr + weapon.reqDex + weapon.reqInt + weapon.reqDef + weapon.reqAgi} SP`);
        
        // Create minimal stats with just this weapon + reasonable gear stats
        const baseStats = {
            baseMeanDmg: weapon.baseMeanDmg,
            spellDmg: weapon.spellDmg + 1500,  // Add some gear spell damage
            spellDmgPct: weapon.spellDmgPct + 800,  // Add some gear spell %
            manaRegen: weapon.manaRegen + 50,
            manaSteal: 50,
            // Zero requirements and bonuses for simplicity
            reqStr: 0, reqDex: 0, reqInt: 0, reqDef: 0, reqAgi: 0,
            strength: 0, dexterity: 0, intelligence: 0, defence: 0, agility: 0
        };
        
        console.log(`\\nTest stats:`);
        console.log(`  Base weapon dmg: ${baseStats.baseMeanDmg}`);
        console.log(`  Total spell dmg: ${baseStats.spellDmg}`);
        console.log(`  Total spell %: ${baseStats.spellDmgPct}%`);
        console.log(`  Mana per sec: ${(baseStats.manaRegen / 4 + baseStats.manaSteal * 2).toFixed(1)}`);
        
        // Test each spell individually
        console.log(`\\nSpell damage breakdown:`);
        for (const [spellKey, spellDef] of Object.entries(classConfig.spellDefinitions)) {
            if (spellKey === 'haul') continue; // Skip mobility spell
            
            const spell = { ...spellDef };
            const totalHits = spell.hitsPerSecond && spell.duration ? 
                             spell.hitsPerSecond * spell.duration : 
                             spell.hits || 1;
            
            const baseDmg = baseStats.baseMeanDmg;
            const spellMult = spell.multiplierPerHit;
            const flatBonus = baseStats.spellDmg;
            const pctMult = 1 + baseStats.spellDmgPct / 100;
            
            const dmgBeforePct = baseDmg * spellMult + flatBonus;
            const dmgPerHit = dmgBeforePct * pctMult;
            const dmgPerCast = totalHits * dmgPerHit;
            
            console.log(`  ${spellKey}:`);
            console.log(`    Formula: (${baseDmg} × ${spellMult} + ${flatBonus}) × ${pctMult.toFixed(2)} × ${totalHits} hits`);
            console.log(`    = ${dmgBeforePct.toFixed(0)} × ${pctMult.toFixed(2)} × ${totalHits}`);
            console.log(`    = ${dmgPerCast.toLocaleString()} damage per cast`);
        }
        
        const totalDPS = computeRotationDPS(
            baseStats,
            ROTATION,
            classConfig.spellDefinitions,
            classConfig.abilityNodes,
            activeNodes
        );
        
        console.log(`\\nTotal DPS: ${totalDPS.toLocaleString()}\\n`);
        console.log('='.repeat(50));
    }
}

debugWeapons().catch(console.error);