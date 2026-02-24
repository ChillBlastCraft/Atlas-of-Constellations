const fs = require('fs')
const path = require('path')

const file = path.join(__dirname, 'stats-keys.json')
if (!fs.existsSync(file)) {
  console.error('Missing stats-keys.json — run extract_stats.js first')
  process.exit(1)
}
const { keys = [], paths = [] } = JSON.parse(fs.readFileSync(file, 'utf8'))

function pretty(s) {
    // convert camelCase or snake_case to Title Case
    return s
        .replace(/([A-Z])/g, ' $1')
        .replace(/[_\.]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .split(' ')
        .map(w => w[0] ? w[0].toUpperCase() + w.slice(1) : w)
        .join(' ')
}

const mapped = new Set()

for (const k of keys) {
    const key = k.toString()
    if (/powderSlots/i.test(key)) mapped.add('Powder Slots')
    else if (/^raw(.+)$/i.test(key)) mapped.add('Raw ' + pretty(key.replace(/^raw/i, '')))
    else if (/^base(.+)$/i.test(key)) mapped.add('Base ' + pretty(key.replace(/^base/i, '')))
    else if (/defence|defense/i.test(key) && /raw/i.test(key)) mapped.add('Raw Defense')
    else if (/defence|defense/i.test(key)) mapped.add('Defense')
    else if (/healthRegen/i.test(key)) mapped.add('Health Regen')
    else if (/health/i.test(key) && /raw/i.test(key)) mapped.add('Raw Health')
    else if (/^health$|^hp$/i.test(key)) mapped.add('HP')
    else if (/manaRegen/i.test(key)) mapped.add('Mana Regen')
    else if (/manaSteal/i.test(key)) mapped.add('Mana Steal')
    else if (/mana|maxMana|rawMaxMana/i.test(key)) mapped.add('Mana')
    else if (/lifeSteal/i.test(key)) mapped.add('Life Steal')
    else if (/powderSlots/i.test(key)) mapped.add('Powder Slots')
    else if (/lootBonus|leveledLootBonus/i.test(key)) mapped.add('Loot Bonus')
    else if (/steal|stealing/i.test(key)) mapped.add('Stealing')
    else if (/reflection/i.test(key)) mapped.add('Reflection')
    else if (/walkSpeed|sprint/i.test(key)) mapped.add('Walk Speed')
    else if (/attackSpeed/i.test(key)) mapped.add('Attack Speed')
    else if (/averageDps|baseDamage|damage|dps/i.test(key)) mapped.add('Base DPS')
    else if (/mainAttackDamage|mainAttackRange/i.test(key)) mapped.add('Main Attack Damage')
    else if (/spellDamage|spellDamage/i.test(key)) mapped.add('Spell Damage')
    else if (/elementalDamage/i.test(key)) mapped.add('Elemental Damage')
    else if (/airDamage|earthDamage|fireDamage|waterDamage|thunderDamage|neutralDamage/i.test(key)) mapped.add(pretty(key.replace(/([a-z])([A-Z])/g, '$1 $2')))
    else if (/strength|dexterity|intelligence|agility/i.test(key)) mapped.add(pretty(key))
    else if (/requirements|level|classRequirement|strengthRequirement|dexterityRequirement|intelligenceRequirement/i.test(key)) mapped.add('Attribute Requirements')
    else if (/attributes|identifications/i.test(key)) mapped.add('Attributes')
    else if (/rarity|tier|category|subcategory|type/i.test(key)) mapped.add(pretty(key))
}

// Also scan some useful paths for 'base' prefixed properties
for (const p of paths) {
    if (/base\.baseHealth/i.test(p)) mapped.add('Base HP')
    if (/base\.base.*Defen/i.test(p)) mapped.add('Base Defense')
    if (/base\.leveledLootBonus/i.test(p)) mapped.add('Base Loot Bonus')
}

const out = Array.from(mapped).sort((a,b)=>a.localeCompare(b))
console.log('Cleaned stats list:')
for (const s of out) console.log('- ' + s)

fs.writeFileSync(path.join(__dirname, 'data', 'cleaned-stats.json'), JSON.stringify(out, null, 2))
console.log('\nWrote tools/data/cleaned-stats.json')
