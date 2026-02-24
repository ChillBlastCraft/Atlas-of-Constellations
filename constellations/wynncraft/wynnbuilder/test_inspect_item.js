const fs = require('fs')
const path = require('path')

const dataPath = path.join(__dirname, 'wapi', 'data', 'items.categorized.json')
if (!fs.existsSync(dataPath)) {
  console.error('Data file not found:', dataPath)
  process.exit(2)
}

const items = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
const query = process.argv[2] || 'Fantasia'
const q = query.toLowerCase()

function findItem(q) {
  return items.find(it => {
    const name = (it.name || it.displayName || it.internalName || it.id || '').toString().toLowerCase()
    return name === q || name.includes(q)
  })
}

function normalizeKeyName(s) { return (''+s).toLowerCase().replace(/[^a-z0-9]/g,'') }

function get(obj, paths) {
  for (const p of paths) {
    const parts = p.split('.')
    let cur = obj
    let ok = true
    for (const part of parts) {
      if (!cur) { ok = false; break }
      cur = cur[part]
    }
    if (!ok || cur === undefined || cur === null) continue
    if (typeof cur === 'number') return cur
    if (typeof cur === 'object') {
      if (typeof cur.raw === 'number') return cur.raw
      if (typeof cur.max === 'number') return cur.max
    }
  }
  return null
}

function getStatValue(item, statName) {
  const t = normalizeKeyName(statName)
  if (t === 'basedps') {
    const dmg = get(item, [
      'base.baseDamage.raw','base.baseDamage',
      'rawMainAttackDamage','rawMainAttackDamage.raw',
      'rawDamage','rawDamage.raw',
      'base.baseDamage.max','base.baseDamage.min',
      'identifications.rawMainAttackDamage','identifications.mainAttackDamage','identifications.rawDamage'
    ])
    const asp = get(item, ['rawAttackSpeed','attackSpeed','base.attackSpeed','identifications.rawAttackSpeed','identifications.attackSpeed'])
    if (dmg == null) return null
    const a = (asp == null) ? 1 : asp
    return dmg * a
  }
  if (t === 'attackspeed' || t === 'attackspeedbonus') return get(item, ['rawAttackSpeed','attackSpeed','base.attackSpeed'])
  if (t === 'manaregen') return get(item, ['manaRegen','rawMaxMana','identifications.manaRegen'])
  if (t === 'manasteal') return get(item, ['manaSteal','identifications.manaSteal'])
  if (t === 'powderslots') return get(item, ['powderSlots','identifications.powderSlots','identifications.PowderSlots'])
  return null
}

function getAttackSpeedCategory(item) {
  if (!item) return ''
  if (item.attackSpeedCategory) return item.attackSpeedCategory
  if (item.attackSpeedLabel) return item.attackSpeedLabel
  const asp = getStatValue(item, 'Attack Speed')
  if (asp == null) return ''
  if (asp <= 0.5) return 'super_slow'
  if (asp <= 0.75) return 'very_slow'
  if (asp <= 0.95) return 'slow'
  if (asp <= 1.15) return 'normal'
  if (asp <= 1.4) return 'fast'
  if (asp <= 1.8) return 'very_fast'
  return 'super_fast'
}

const item = findItem(q)
if (!item) {
  console.error('Item not found for query:', query)
  process.exit(1)
}

function inspect(item) {
  const out = {
    name: item.name || item.displayName || item.id,
    category: item.category,
    subcategory: item.subcategory || item.weaponType || item.toolType || item.armourType,
    rarity: item.rarity || item.tier,
    attackSpeed: item.attackSpeed || item.rawAttackSpeed || getStatValue(item, 'Attack Speed'),
    attackSpeedCategory: getAttackSpeedCategory(item),
    base: item.base || item.baseStats || null,
    averageDps: item.averageDps || item.baseDps || getStatValue(item, 'BaseDPS'),
    identifications: item.identifications || null,
    powderSlots: item.powderSlots || (item.identifications && (item.identifications.powderSlots || item.identifications['Powder Slots'])) || null,
    requirements: item.requirements || null,
    lore: item.lore || item.description || null
  }

  // collect expected idents
  const expect = ['rawIntelligence','manaRegen','manaSteal','1stSpellCost','2ndSpellCost','3rdSpellCost','4thSpellCost']
  const missing = []
  for (const k of expect) {
    const found = (item.identifications && (item.identifications[k] !== undefined || item.identifications[k.toLowerCase()] !== undefined)) || (item[k] !== undefined)
    if (!found) missing.push(k)
  }
  out.missingExpectedIdents = missing
  return out
}

console.log('Inspecting item:', item.name || item.displayName || item.id)
console.log(JSON.stringify(inspect(item), null, 2))

// helpful raw dump of identifications for manual inspection
console.log('\n=== Raw identifications (if any) ===')
console.log(JSON.stringify(item.identifications || {}, null, 2))

// print simple list of keys present at top-level that might contain the stats
console.log('\n=== Top-level keys of item ===')
console.log(Object.keys(item).join(', '))

// exit
process.exit(0)
