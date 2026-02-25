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
            Ring: [
                'ring', 'band', 'loop', 'signet', 'circlet', 'seal', 'annulus', 'wedding ring', 'engagement ring', 'eternity ring', 'promise ring', 'mood ring', 'class ring', 'championship ring', 'cocktail ring', 'birthstone ring', 'halo ring', 'solitaire ring', 'stacking ring', 'thumb ring', 'toe ring', 'spinner ring', 'poison ring', 'puzzle ring', 'claddagh', 'fede', 'gimmel', 'signet', 'insignia', 'crest', 'badge', 'token'
            ],
            Bracelet: [
                'bracelet', 'bangle', 'cuff', 'chain', 'wristband', 'armlet', 'anklet', 'friendship bracelet', 'tennis bracelet', 'link bracelet', 'beaded bracelet', 'slap bracelet', 'leather bracelet', 'cord bracelet', 'shamballa', 'macrame', 'wrap bracelet', 'power bracelet', 'paracord', 'wristlet', 'manacle', 'fetters', 'shackle', 'bracer', 'brace', 'wrist', 'bracelet cuff', 'bracelet band', 'bracelet loop'
            ],
            Necklace: [
                'necklace', 'amulet', 'pendant', 'locket', 'torc', 'torque', 'choker', 'chain', 'collar', 'medallion', 'talisman', 'gorget', 'necklet', 'string', 'strand', 'beads', 'rosary', 'paten', 'riviere', 'sautoir', 'lavaliere', 'festoon', 'bib necklace', 'dog tag', 'id tag', 'badge', 'crest', 'insignia', 'medal', 'medallion', 'order', 'decoration', 'ribbon', 'neckpiece', 'neckband', 'neckwear', 'neck ornament', 'neck jewel', 'necklace jewel', 'necklace chain', 'necklace pendant', 'necklace locket', 'necklace amulet', 'necklace talisman', 'necklace medallion', 'necklace badge', 'necklace insignia', 'necklace crest', 'necklace medal', 'necklace order', 'necklace decoration', 'necklace ribbon'
            ],
            Trinket: [
                'trinket', 'charm', 'bauble', 'token', 'keepsake', 'souvenir', 'curio', 'fob', 'tchotchke', 'ornament', 'novelty', 'gadget', 'gizmo', 'amulet', 'talisman', 'fetish', 'mojo', 'gris-gris', 'lucky charm', 'good luck charm', 'protective charm', 'ward', 'totem', 'idol', 'icon', 'relic', 'reliquary', 'pendant', 'miniature', 'figure', 'figurine', 'statue', 'statuette', 'doll', 'puppet', 'mascot', 'badge', 'pin', 'brooch', 'button', 'patch', 'tag', 'clip', 'fastener', 'hook', 'hanger', 'hanger-on', 'hanger charm', 'hanger trinket', 'hanger bauble', 'hanger token', 'hanger keepsake', 'hanger souvenir', 'hanger curio', 'hanger fob', 'hanger tchotchke', 'hanger ornament', 'hanger novelty', 'hanger gadget', 'hanger gizmo', 'hanger amulet', 'hanger talisman', 'hanger fetish', 'hanger mojo', 'hanger gris-gris', 'hanger lucky charm', 'hanger good luck charm', 'hanger protective charm', 'hanger ward', 'hanger totem', 'hanger idol', 'hanger icon', 'hanger relic', 'hanger reliquary', 'hanger pendant', 'hanger miniature', 'hanger figure', 'hanger figurine', 'hanger statue', 'hanger statuette', 'hanger doll', 'hanger puppet', 'hanger mascot', 'hanger badge', 'hanger pin', 'hanger brooch', 'hanger button', 'hanger patch', 'hanger tag', 'hanger clip', 'hanger fastener', 'hanger hook'
            ],
            Earring: [
                'earring', 'stud', 'hoop', 'drop', 'dangle', 'chandelier', 'clip-on', 'sleeper', 'ear cuff', 'ear pin', 'ear jacket', 'ear climber', 'ear thread', 'ear spike', 'ear wrap', 'ear shield', 'ear plug', 'ear tunnel', 'ear stretcher', 'ear weight', 'ear hanger', 'ear charm', 'ear trinket', 'ear bauble', 'ear token', 'ear keepsake', 'ear souvenir', 'ear curio', 'ear fob', 'ear tchotchke', 'ear ornament', 'ear novelty', 'ear gadget', 'ear gizmo', 'ear amulet', 'ear talisman', 'ear fetish', 'ear mojo', 'ear gris-gris', 'ear lucky charm', 'ear good luck charm', 'ear protective charm', 'ear ward', 'ear totem', 'ear idol', 'ear icon', 'ear relic', 'ear reliquary', 'ear pendant', 'ear miniature', 'ear figure', 'ear figurine', 'ear statue', 'ear statuette', 'ear doll', 'ear puppet', 'ear mascot', 'ear badge', 'ear pin', 'ear brooch', 'ear button', 'ear patch', 'ear tag', 'ear clip', 'ear fastener', 'ear hook'
            ]
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
    const accessoryType = normalize(item.accessoryType || item.accessory_type || item.accessory || '')
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
    // Accessories: prefer explicit accessoryType when available
    if (type.includes('accessory') || accessoryType) {
        const accessoryKeys = Object.keys(MAPS.Accessories.subgroup)
        let sub = null
        if (accessoryType) {
            const cand = cap(accessoryType)
            if (accessoryKeys.includes(cand)) sub = cand
        }
        if (!sub) {
            for (const [subKey, keywords] of Object.entries(MAPS.Accessories.subgroup)) {
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
        return { category: 'Accessories', subcategory: sub || 'UNKNOWN' }
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

function statCounts(items) {
    const IGNORE = [
        'internalName','type','identified','requirements','craftable','icon','tier','name','category','subcategory','description','lore','id','displayName','internal','n','weaponType','armorType','accessoryType','slot'
    ]
    const IGNORE_LOWER = new Set(IGNORE.map(s => s.toLowerCase()))
    const counts = {}
    // For each item, walk its object tree and count unique property names per-item
    for (const it of items) {
        const seen = new Set()
        function walk(obj) {
            if (!obj || typeof obj !== 'object') return
            if (Array.isArray(obj)) return
            for (const [k, v] of Object.entries(obj)) {
                if (IGNORE_LOWER.has(k.toLowerCase())) continue
                if (v === null || v === undefined) continue
                const key = k.toLowerCase()
                if (!seen.has(key)) {
                    counts[key] = (counts[key] || 0) + 1
                    seen.add(key)
                }
                walk(v)
            }
        }
        walk(it)
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

function rarityCounts(items) {
    const order = ['normal', 'unique', 'rare', 'set', 'legendary', 'fabled', 'mythic']
    const counts = {}
    for (const it of items) {
        const r = normalizeRarity(it.rarity || it.tier)
        counts[r] = (counts[r] || 0) + 1
    }
    for (const k of order) counts[k] ??= 0
    counts['non-rarity'] ??= 0
    counts.special ??= 0
    return counts
}

function normalizeRarity(raw) {
    let r = raw
    if (typeof r === 'object') r = '' + (r.name || '')
    r = ('' + (r || '')).toLowerCase()
    if (r === 'common' || r === 'white') return 'normal'
    if (r === 'epic') return 'legendary'
    if (r.includes('legend')) return 'legendary'
    if (r.includes('myth')) return 'mythic'
    if (r.includes('fabled')) return 'fabled'
    if (r.includes('set')) return 'set'
    if (r.includes('rare')) return 'rare'
    if (r.includes('unique')) return 'unique'
    if (r === '' || r === 'non-rarity' || r === 'unknown') return 'non-rarity'
    return 'special'
}

function rarityByCategory(items) {
    const map = {}
    for (const it of items) {
        const cat = it.category || 'UNKNOWN'
        const r = normalizeRarity(it.rarity || it.tier)
        map[cat] ??= {}
        map[cat][r] = (map[cat][r] || 0) + 1
    }
    return map
}

async function run() {
    const args = process.argv.slice(2)
    const listOnly = args.includes('--list') || args.includes('-l')
    const listUnknown = args.includes('--list-unknown')
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
            const finalCat = (it.category && it.category !== 'UNKNOWN') ? it.category : cat.category
            const finalSub = (it.subcategory && it.subcategory !== 'UNKNOWN') ? it.subcategory : cat.subcategory
            // restore a `categories` array (useful for consumers that expect multiple category tags)
            const cats = []
            if (finalCat && finalCat !== 'UNKNOWN') cats.push(finalCat)
            if (finalSub && finalSub !== 'UNKNOWN') cats.push(finalSub)
            return { ...it, category: finalCat, subcategory: finalSub, categories: cats }
        })
        const counts = tally(categorized)
        const statcounts = statCounts(categorized)
        const statArgIndex = args.indexOf('--stat')
        if (statArgIndex !== -1) {
            const statName = args[statArgIndex + 1]
            if (!statName) {
                console.error('Usage: --stat <statName>')
                process.exit(2)
            }
            // case-insensitive stat lookup (stat keys stored lowercased)
            const n = statcounts[statName.toLowerCase()] || 0
            // output JSON for easy PowerShell parsing
            console.log(JSON.stringify({ stat: statName, count: n }))
            return
        }
        const statItemsIndex = args.indexOf('--stat-items')
        if (statItemsIndex !== -1) {
            const statName = args[statItemsIndex + 1]
            if (!statName) {
                console.error('Usage: --stat-items <statName>')
                process.exit(2)
            }
            const statLower = statName.toLowerCase()
            function itemHasStat(item) {
                let found = false
                function walk(obj) {
                    if (!obj || typeof obj !== 'object') return
                    if (Array.isArray(obj)) {
                        for (const el of obj) {
                            if (found) break
                            walk(el)
                        }
                        return
                    }
                    for (const [k, v] of Object.entries(obj)) {
                        if (k.toLowerCase() === statLower) {
                            found = true
                            return
                        }
                        if (found) return
                        walk(v)
                        if (found) return
                    }
                }
                walk(item)
                return found
            }
            const matches = categorized.filter(it => itemHasStat(it))
            // print simple list: name and id/internalName
            const out = matches.map(it => ({ name: it.name || it.displayName || it.id || '[no name]', id: it.id || it.internalName || null }))
            console.log(JSON.stringify({ stat: statName, count: out.length, items: out }, null, 2))
            return
        }
        if (args.includes('--stat-list')) {
            console.log(JSON.stringify(statcounts, null, 2))
            return
        }
        if (args.includes('--rarity-list')) {
            console.log(JSON.stringify(rarityCounts(categorized), null, 2))
            return
        }
        if (args.includes('--rarity-by-category')) {
            console.log(JSON.stringify(rarityByCategory(categorized), null, 2))
            return
        }
        if (listOnly) {
            printCounts(counts)
            return
        }
        if (listUnknown) {
            const unknowns = categorized.filter(it => it.category === 'UNKNOWN')
            if (unknowns.length === 0) {
                console.log('No UNKNOWN items found.')
            } else {
                console.log(`UNKNOWN items (${unknowns.length}):`)
                for (const item of unknowns) {
                    console.log(`- ${item.name || item.id || '[no name]'} | id: ${item.id || '[no id]'} | desc: ${(item.description || item.lore || item.desc || '').slice(0, 80)}`)
                }
            }
            return
        }
        // write categorized file
        const outPath = path.join(process.cwd(), 'data', 'items.categorized.json')
        await fs.writeFile(outPath, JSON.stringify(categorized, null, 2), 'utf8')
        console.log('Wrote', outPath)
        printCounts(counts)
        // print rarity breakdown
        const rarities = rarityCounts(categorized)
        console.log('Rarities:')
        for (const [r, n] of Object.entries(rarities)) {
            console.log(`  ${r}: ${n}`)
        }
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
