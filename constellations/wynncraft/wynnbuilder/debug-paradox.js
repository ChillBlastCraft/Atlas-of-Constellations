import { fetchAllItems } from './api/wapi.js';

async function checkParadox() {
    const allItems = await fetchAllItems();
    const paradoxItems = Object.values(allItems).filter(item => 
        (item.name && item.name.toLowerCase().includes('paradox')) || 
        (item.internalName && item.internalName.toLowerCase().includes('paradox'))
    );
    
    console.log('Paradox items found:');
    paradoxItems.forEach(item => {
        console.log('Name:', item.name || item.internalName);
        console.log('Type:', item.type);
        console.log('Subtype:', item.armourType || item.weaponType || item.accessoryType);
        console.log('Requirements:', item.requirements);
        console.log('Base stats:', item.base);
        console.log('---');
    });
    
    // Also check Crestfallen for comparison
    const crestfallenItems = Object.values(allItems).filter(item => 
        (item.name && item.name.toLowerCase().includes('crestfallen')) || 
        (item.internalName && item.internalName.toLowerCase().includes('crestfallen'))
    );
    
    console.log('\nCrestfallen items found:');
    crestfallenItems.forEach(item => {
        console.log('Name:', item.name || item.internalName);
        console.log('Type:', item.type);
        console.log('Subtype:', item.armourType || item.weaponType || item.accessoryType);
        console.log('Requirements:', item.requirements);
        console.log('---');
    });
}

checkParadox().catch(console.error);