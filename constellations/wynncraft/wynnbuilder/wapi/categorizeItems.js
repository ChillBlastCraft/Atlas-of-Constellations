import fs from 'fs/promises'
import path from 'path'

const dataPath = path.join(process.cwd(), 'data', 'items.json')

function normalize(s) {
    return (s || '').toString().toLowerCase()
}

const MAPS = {
        Tome: {
            subgroup: {
                Tome: ['tome'],
                Aspect: ['aspect']
            }
        },
    Weapons: {
        subgroup: {
            Sword: ['sword'],
            Wand: ['wand'],
            Reik: ['reik'],
            Relik: ['relik', 'relic', 'relics', 'reliks', 'reiks', 'reik'],
            Bow: ['bow'],
            Dagger: ['dagger', 'knife'],
            Axe: ['axe'],
            Staff: ['staff', 'rod', 'scythe', 'scepter'],
            Spear: ['spear'],
            Mace: ['mace']
        }
    },
    Armour: {
        subgroup: {
            Helmet: ['helmet', 'helm', 'hood', 'cap', 'mask', 'head'],
            Chestplate: ['chestplate', 'chestplates', 'chestpiece', 'vest', 'robe', 'tunic', 'coat', 'mail', 'suit'],
            Leggings: ['leggings', 'pants', 'leggins', 'greaves', 'legs', 'leg'],
            Boots: ['boots', 'shoe', 'shoes', 'foot', 'feet', 'greaves', 'sabatons'],
            Shield: ['shield', 'buckler']
        }
    },
    Accessories: {
        subgroup: {
            Ring: ['ring'],
            Bracelet: ['bracelet'],
            Necklace: ['necklace', 'amulet', 'pendant'],
            Trinket: ['trinket', 'charm']
        }
    },
    Ingredients: {
        subgroup: {
            Ingredient: ['ingredient', 'material', 'essence', 'shard'],
            Crafting: ['component', 'component', 'ingot']
        }
    },
    Consumable: {
        subgroup: {
            Potion: ['potion'],
            Food: ['food'],
            Scroll: ['scroll', 'consumable', 'recipe']
        }
    }
}

function findMatch(text) {
    for (const [group, def] of Object.entries(MAPS)) {
        for (const [sub, keywords] of Object.entries(def.subgroup)) {
            for (const kw of keywords) {
                if (!kw) continue
                if (text.includes(kw)) return { group, sub }
            }
        }
    }
    return null
}

async function loadItems() {
    try {
        const raw = await fs.readFile(dataPath, 'utf8')
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) return parsed
        if (parsed.items) return parsed.items
        if (parsed.data) return parsed.data
        // else try values
        if (typeof parsed === 'object') return parsed
        return []
    } catch (err) {
        throw new Error('Could not read items.json: ' + err.message)
    }
}

function categorizeItem(item) {
    const name = normalize(item.name || item.displayName || item.title || item.n || item.id)
    const internal = normalize(item.internalName || item.internal_name || item.internal || '')
    const desc = normalize(item.description || item.lore || item.desc || '')
    const type = normalize(item.type || item.itemType || item.category || '')
    const weaponType = normalize(item.weaponType || item.weapon_type || '')
    const armorType = normalize(item.armorType || item.armor_type || item.armor || '')
    const slot = normalize(item.slot || item.equipmentSlot || '')
    const craftable = Array.isArray(item.craftable) ? item.craftable.join(' ') : normalize(item.craftable || '')
    const full = [name, internal, desc, type, weaponType, armorType, slot, craftable].join(' ')
    // prefer explicit type fields when available
    const cap = s => s ? (s[0].toUpperCase() + s.slice(1)) : s
    const weaponKeys = Object.keys(MAPS.Weapons.subgroup)
    if (type.includes('weapon') || weaponType) {
        let sub = null
        if (weaponType) {
            const cand = cap(weaponType)
            if (weaponKeys.includes(cand)) sub = cand
        }
        if (!sub) {
            for (const [subKey, keywords] of Object.entries(MAPS.Weapons.subgroup)) {
                for (const kw of keywords) {
                    if (!kw) continue
                    if (full.includes(kw)) {
                        sub = subKey
                        break
                    }
                }
                if (sub) break
            }
        }
        return { category: 'Weapons', subcategory: sub || 'UNKNOWN' }
    }
    const armourKeys = Object.keys(MAPS.Armour.subgroup)
    // match 'armor'/'armour' explicitly to avoid matching words like 'charm'
    if (type.includes('armor') || type.includes('armour') || armorType) {
        let sub = null
        if (armorType) {
            const cand = cap(armorType)
            if (armourKeys.includes(cand)) sub = cand
        }
        if (!sub) {
            for (const [subKey, keywords] of Object.entries(MAPS.Armour.subgroup)) {
                for (const kw of keywords) {
                    if (!kw) continue
                    if (full.includes(kw)) {
                        sub = subKey
                        break
                    }
                }
                if (sub) break
            }
        }
        // fallback: try to infer from equipment slot or common terms when keywords miss
        if (!sub) {
            if (slot.includes('head') || full.includes(' head') || full.includes('helm')) sub = 'Helmet'
            else if (slot.includes('chest') || slot.includes('torso') || full.includes('torso') || full.includes('body') || full.includes('chest')) sub = 'Chestplate'
            else if (slot.includes('leg') || slot.includes('legs') || full.includes('leggings') || full.includes('legs')) sub = 'Leggings'
            else if (slot.includes('feet') || slot.includes('foot') || full.includes('boots') || full.includes('shoe')) sub = 'Boots'
            else if (slot.includes('offhand') || full.includes('shield')) sub = 'Shield'
        }
        return { category: 'Armour', subcategory: sub || 'UNKNOWN' }
    }
    const m = findMatch(full)
    if (m) return { category: m.group, subcategory: m.sub }
    return { category: 'UNKNOWN', subcategory: 'UNKNOWN' }
}

function tally(items) {
    const counts = {}
    for (const it of items) {
        const c = it.category || 'UNKNOWN'
        let s = it.subcategory || 'UNKNOWN'
        // Rename Armour UNKNOWN to Quest/Other Armour
        if (c === 'Armour' && s === 'UNKNOWN') s = 'Quest/Other Armour'
        counts[c] ??= { total: 0, subs: {} }
        counts[c].total += 1
        counts[c].subs[s] = (counts[c].subs[s] || 0) + 1
    }
    return counts
}

function printCounts(counts) {
    for (const [cat, info] of Object.entries(counts)) {
        console.log(`${cat}: ${info.total}`)
        for (const [sub, n] of Object.entries(info.subs)) {
            console.log(`  ${sub}: ${n}`)
        }
    }
}

async function run() {
    const args = process.argv.slice(2)
    const listOnly = args.includes('--list') || args.includes('-l')
    const writeBack = args.includes('--write') || args.includes('-w')
    try {
        const items = await loadItems()
        // accept object maps too; if items is an object, preserve the key as `name`
        let arr
        if (Array.isArray(items)) {
            arr = items
        } else if (items && typeof items === 'object') {
            arr = Object.entries(items).map(([k, v]) => ({ ...v, name: v.name || k }))
        } else {
            arr = []
        }
        const categorized = arr.map(it => {
            const cat = categorizeItem(it)
            return { ...it, category: it.category || cat.category, subcategory: it.subcategory || cat.subcategory }
        })
        const counts = tally(categorized)
        if (listOnly) {
            printCounts(counts)
            return
        }
        // write categorized file
        const outPath = path.join(process.cwd(), 'data', 'items.categorized.json')
        await fs.writeFile(outPath, JSON.stringify(categorized, null, 2), 'utf8')
        console.log('Wrote', outPath)
        printCounts(counts)
        if (writeBack) {
            await fs.writeFile(path.join(process.cwd(), 'data', 'items.json'), JSON.stringify(categorized, null, 2), 'utf8')
            console.log('Overwrote data/items.json with categorized items')
        }
    } catch (err) {
        console.error(err.message)
        process.exit(1)
    }
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith('categorizeItems.js')) run()
