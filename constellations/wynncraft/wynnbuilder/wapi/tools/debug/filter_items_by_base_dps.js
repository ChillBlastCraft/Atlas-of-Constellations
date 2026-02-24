import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataPath = path.join(__dirname, '..', '..', 'data', 'items.categorized.json')
console.log('Loading', dataPath)
const items = JSON.parse(fs.readFileSync(dataPath, 'utf8'))

function normalizeKeyName(s){ return (''+s).toLowerCase().replace(/[^a-z0-9]/g,'') }

function getBaseDPS(item) {
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
    const dmg = get(['base.baseDamage.raw','base.baseDamage','rawMainAttackDamage','rawDamage','base.baseDamage.max','base.baseDamage.min'])
    const asp = get(['rawAttackSpeed','attackSpeed','base.attackSpeed'])
    if (dmg == null) return null
    const a = (asp == null) ? 1 : asp
    return dmg * a
}

const minVal = 9999
const matches = []
for (const it of items) {
    if (getBaseDPS(it) !== null && getBaseDPS(it) >= minVal) matches.push(it)
}
console.log('Matches for Base DPS >=', minVal, '->', matches.length)
for (let i=0;i<Math.min(20,matches.length);i++){
    const it = matches[i]
    const d = getBaseDPS(it)
    console.log(i+1, '-', it.name, '—', it.category, '/', it.subcategory, '—', it.rarity || it.tier, '-> baseDPS=', d)
}

// count mythic items overall and in matches
const mythics = items.filter(it=>((it.rarity||it.tier||'').toString().toLowerCase().includes('mythic')))
console.log('Total mythics:', mythics.length)
console.log('Mythics in matches:', matches.filter(it=>((it.rarity||it.tier||'').toString().toLowerCase().includes('mythic'))).length)
