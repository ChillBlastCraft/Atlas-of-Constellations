const fs = require('fs')
const path = require('path')
const dataPath = path.join(__dirname, '..', 'constellations', 'wynncraft', 'wynnbuilder', 'wapi', 'data', 'items.categorized.json')
console.log('Loading', dataPath)
const items = JSON.parse(fs.readFileSync(dataPath, 'utf8'))

function normalizeKeyName(s){ return (''+s).toLowerCase().replace(/[^a-z0-9]/g,'') }

function getStatValue(item, statName) {
    const t = normalizeKeyName(statName)
    const get = (paths) => {
        for (const p of paths) {
            const parts = p.split('.')
            let cur = item
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

    if (t === 'basedps') {
        const dmg = get(['base.baseDamage.raw','base.baseDamage','rawMainAttackDamage','rawDamage','base.baseDamage.max','base.baseDamage.min'])
        const asp = get(['rawAttackSpeed','attackSpeed','base.attackSpeed'])
        if (dmg == null) return null
        const a = (asp == null) ? 1 : asp
        return dmg * a
    }

    if (t.endsWith('damage') || t.startsWith('raw')) {
        const direct = get([
            `base.${statName.replace(/\s+/g,'')}.raw`,
            `raw${statName.replace(/\s+/g,'')}`,
            statName.replace(/\s+/g,'')
        ])
        if (direct != null) return direct
    }

    if (t === 'attackspeed' || t === 'attackspeedbonus') {
        return get(['rawAttackSpeed','attackSpeed','base.attackSpeed'])
    }

    if (t === 'manaregen') return get(['manaRegen','rawMaxMana'])
    if (t === 'healthregen' || t === 'healthpercentregen' || t === 'health%regen') return get(['healthRegen','healthRegenRaw','rawHealth'])
    if (t === 'hp' || t === 'basehp' || t === 'basehealth') return get(['base.baseHealth','rawHealth'])
    if (t === 'powderslots') return get(['powderSlots'])
    if (t === 'reflection') return get(['reflection'])
    if (t === 'lootbonus') return get(['lootBonus','leveledLootBonus','base.leveledLootBonus'])
    if (t === 'stealing') return get(['stealing','manaSteal','lifeSteal'])

    return null
}

function valueMatches(v, min, max) {
    if (min == null && max == null) return true
    const n = (typeof v === 'number') ? v : (v && typeof v.raw === 'number' ? v.raw : (v && typeof v.max === 'number' ? v.max : null))
    if (n == null) return false
    if (min != null && n < min) return false
    if (max != null && n > max) return false
    return true
}

function itemHasStatFilter(item, statName, op, min, max) {
    const derived = getStatValue(item, statName)
    if (derived !== null && derived !== undefined) {
        if (op === 'NOT') return !(derived !== null)
        if (op === 'HAS') return valueMatches(derived, min, max)
        if (op === 'COUNT') return !!derived
    }

    const target = normalizeKeyName(statName)
    let found = false
    function walk(obj) {
        if (!obj || typeof obj !== 'object') return
        if (Array.isArray(obj)) { for (const el of obj) walk(el); return }
        for (const [k, v] of Object.entries(obj)) {
            const kNorm = normalizeKeyName(k)
            if (kNorm === target) {
                if (op === 'NOT') { found = true; return }
                if (op === 'HAS') { if (valueMatches(v, min, max)) { found = true; return } }
                if (op === 'COUNT') { if (v) { found = true; return } }
            }
            if (!found) walk(v)
            if (found) return
        }
    }
    walk(item)
    if (op === 'NOT') return !found
    return found
}

const minVal = 9999
const matches = []
for (const it of items) {
    if (itemHasStatFilter(it, 'Base DPS', 'HAS', minVal, null)) matches.push(it)
}
console.log('Matches for Base DPS >=', minVal, '->', matches.length)
for (let i=0;i<Math.min(20,matches.length);i++){
    const it = matches[i]
    const d = getStatValue(it, 'Base DPS')
    console.log(i+1, '-', it.name, '—', it.category, '/', it.subcategory, '—', it.rarity || it.tier, '-> baseDPS=', d)
}

// count mythic items overall and in matches
const mythics = items.filter(it=>((it.rarity||it.tier||'').toString().toLowerCase().includes('mythic')))
console.log('Total mythics:', mythics.length)
console.log('Mythics in matches:', matches.filter(it=>((it.rarity||it.tier||'').toString().toLowerCase().includes('mythic'))).length)
