const readline = require('readline')

async function fetchJson(url) {
    const response = await fetch(url)
    return response.json()
}

function findClassByName(data, input) {
    if (!input || !data) return null
    const lowerArg = input.toLowerCase()
    return Object.values(data).find(cls => {
        const fullName = cls.name.toLowerCase()
        return fullName.includes(lowerArg) || lowerArg.includes(fullName)
    })
}

async function skillpointPlanner(className) {
    const classKey = className.toLowerCase()
    let treeData
    try {
        treeData = await fetchJson(`https://api.wynncraft.com/v3/ability/tree/${classKey}`)
    } catch (e) {
        console.log('Failed to load ability tree:', e.message)
        return
    }

    const abilities = {}
    for (const page of Object.values(treeData.pages)) {
        for (const [id, ability] of Object.entries(page)) {
            abilities[id] = ability
        }
    }

    const assigned = {}
    let points = 0

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

    const bold = s => `\x1b[1m${s}\x1b[22m`
    const green = s => `\x1b[32m${s}\x1b[0m`
    const yellow = s => `\x1b[33m${s}\x1b[0m`
    const magenta = s => `\x1b[35m${s}\x1b[0m`
    const cyan = s => `\x1b[36m${s}\x1b[0m`
    const white = s => `\x1b[37m${s}\x1b[0m`
    const red = s => `\x1b[31m${s}\x1b[0m`

    function colorName(name) {
        if (/Totem|Haul|Aura|Uproot|Nature|Overseer|Rain|Shocking|Flaming|Puppet|Mask|Hymn|Sacrificial|Stagnation|Blood|Chant|Vengeful|Double|Storm|Regeneration|Twisted|Crimson|Eldritch|Maddening|Seeking|Fluid|Commander|Friendly|Depersonalization|Deeper|Bloodletting|Hummingbird|Shepherd|Awakened|Rite|Triple|Invigorating|Frog|Sanguine|Soaring|Sorrow/.test(name)) return magenta(bold(name))
        if (/Earth|Air|Thunder|Fire|Water/.test(name)) return cyan(bold(name))
        if (/Cheaper|More|Larger|Imbued|Bullwhip|Shatter|Reach|Bloodier/.test(name)) return white(bold(name))
        if (/Relik|Proficiency/.test(name)) return white(bold(name))
        if (/Smash|Grasp|Shove|Connection|Exploding|Fanatic|Heretic/.test(name)) return yellow(bold(name))
        return green(bold(name))
    }

    function formatDescription(desc) {
        if (/Click Combo:/i.test(desc)) {
            desc = desc.replace(/Click Combo:/i, yellow('Click Combo:'))
            desc = desc.replace(/([A-Z\-]+)/g, m => magenta(bold(m)))
        }
        return desc
    }

    function canAssign(id) {
        const ab = abilities[id]
        if (!ab || assigned[id]) return false
        const req = ab.requirements || {}
        if (req.ABILITY_POINTS && points < req.ABILITY_POINTS) return false
        if (req.NODE && !assigned[req.NODE]) return false
        return true
    }

    function isEdge(id) {
        if (!assigned[id]) return false
        for (const otherId in abilities) {
            const other = abilities[otherId]
            if (other.requirements && other.requirements.NODE === id && assigned[otherId]) {
                return false
            }
        }
        return true
    }

    function printAbilities(mode = 'view') {
        console.log()
        if (mode === 'view') {
            console.log('Assigned abilities:')
            for (const [id, ab] of Object.entries(abilities)) {
                if (assigned[id]) {
                    const desc = formatDescription(ab.description ? ab.description[0] : '')
                    console.log(`[X] ${colorName(ab.name)} (${id}) - ${desc}`)
                }
            }
            console.log(`\nTotal points assigned: ${bold(points)}`)
        } else if (mode === 'assign') {
            console.log('Assignable abilities:')
            for (const [id, ab] of Object.entries(abilities)) {
                if (canAssign(id)) {
                    const desc = formatDescription(ab.description ? ab.description[0] : '')
                    console.log(`[ ] ${colorName(ab.name)} (${id}) - ${desc} ${green('(assignable)')}`)
                }
            }
        } else if (mode === 'unassign') {
            console.log('Unassignable abilities (leaf nodes):')
            for (const [id, ab] of Object.entries(abilities)) {
                if (assigned[id] && isEdge(id)) {
                    const desc = formatDescription(ab.description ? ab.description[0] : '')
                    console.log(`[X] ${colorName(ab.name)} (${id}) - ${desc} ${red('(unassignable)')}`)
                }
            }
        }
    }

    function prompt() {
        rl.question('\nEnter command (assign, unassign, view, exit): ', cmd => {
            cmd = cmd.trim().toLowerCase()
            if (cmd === 'exit') {
                rl.close()
                return
            }
            if (cmd === 'view') {
                printAbilities('view')
                prompt()
            } else if (cmd === 'assign') {
                printAbilities('assign')
                rl.question('Enter ability ID to assign: ', id => {
                    id = id.trim()
                    if (abilities[id] && canAssign(id)) {
                        assigned[id] = true
                        points++
                        console.log(`Assigned ${abilities[id].name}`)
                    } else {
                        console.log('Cannot assign this ability now.')
                    }
                    printAbilities('view')
                    prompt()
                })
            } else if (cmd === 'unassign') {
                printAbilities('unassign')
                rl.question('Enter ability ID to unassign: ', id => {
                    id = id.trim()
                    if (abilities[id] && isEdge(id)) {
                        delete assigned[id]
                        points--
                        console.log(`Unassigned ${abilities[id].name}`)
                    } else {
                        console.log('Cannot unassign this ability now.')
                    }
                    printAbilities('view')
                    prompt()
                })
            } else {
                console.log('Invalid command. Use "assign", "unassign", "view", or "exit".')
                prompt()
            }
        })
    }

    console.log(`\nSkillpoint planner for ${className}`)
    printAbilities('view')
    prompt()
}

async function showClasses() {
    try {
        const data = await fetchJson('https://api.wynncraft.com/v3/classes')
        console.log('Wynncraft classes:')
        for (const key of Object.keys(data)) {
            const cls = data[key]
            let archetypes = 'None'
            try {
                const classData = await fetchJson(`https://api.wynncraft.com/v3/classes/${key}`)
                if (classData.archetypes && typeof classData.archetypes === 'object') {
                    let archetypeNames = ''
                    const values = Object.values(classData.archetypes)
                    for (let i = 0; i < values.length; i++) {
                        let name = values[i].name.replace(/&[0-9a-fklmor]/gi, '')
                        archetypeNames += name
                        if (i < values.length - 1) {
                            archetypeNames += ', '
                        }
                    }
                    if (archetypeNames.length > 0) {
                        archetypes = archetypeNames
                    }
                }
            } catch (e) {}
            console.log(`- ${cls.name} | Archetypes: ${archetypes}`)
        }
    } catch (e) {
        console.log('Failed to fetch classes from API:', e.message)
    }
}

async function chooseClass() {
    const args = process.argv.slice(2)
    const classArg = args[args.indexOf('chooseClass') + 1]
    let chosen = null
    let data = null
    try {
        data = await fetchJson('https://api.wynncraft.com/v3/classes')
        if (classArg) {
            chosen = findClassByName(data, classArg)
        }
    } catch (e) {
        console.log('Failed to fetch classes from API:', e.message)
    }
    if (classArg) {
        if (chosen) {
            console.log(`You chose: ${chosen.name}`)
            try {
                const classKey = chosen.name.toLowerCase().split(/\s|\(/)[0]
                const response = await fetch(`https://api.wynncraft.com/v3/ability/tree/${classKey}`)
                if (!response.ok) {
                    console.log('Failed to load ability tree for this class.')
                    return
                }
                const data = await response.json()
                if (data && Object.keys(data).length > 0) {
                    console.log('Ability tree loaded!')
                } else {
                    console.log('Ability tree not found or empty for this class.')
                }
            } catch (e) {
                console.log('Error loading ability tree:', e.message)
            }
        } else {
            console.log('Invalid class name. Run `node api.js showClasses` to see available classes.')
        }
    } else {
        console.log('Please choose a class by running:')
        console.log('node api.js chooseClass <class>')
        await showClasses()
    }
}

async function showAllItems() {
    const data = await fetchJson('https://api.wynncraft.com/v3/item/database?fullResult')
    console.log(Object.keys(data))
}

async function itemCategories() {
    const data = await fetchJson('https://api.wynncraft.com/v3/item/database?fullResult')
    const categoryMap = {}
    const subcategoryProps = {
        weapon: 'weaponType',
        armour: 'armourType',
        accessory: 'accessoryType',
        tome: 'tomeType',
        tool: 'toolType',
        charm: 'charmType',
        material: 'materialType',
        ingredient: 'ingredientType',
    }
    
    for (const item of Object.values(data)) {
        if (item.type) {
            if (!categoryMap[item.type]) {
                categoryMap[item.type] = new Set()
            }
            const subcatProp = subcategoryProps[item.type]
            if (subcatProp && item[subcatProp]) {
                categoryMap[item.type].add(item[subcatProp])
            } else if (item.subtype) {
                categoryMap[item.type].add(item.subtype)
            } else {
                categoryMap[item.type].add('none')
            }
        }
    }
    console.log('Item categories and subcategories:')
    for (const [category, subcats] of Object.entries(categoryMap)) {
        console.log(`- ${category}: [${Array.from(subcats).join(', ')}]`)
    }
}

async function searchItem(itemName) {
    const data = await fetchJson(`https://api.wynncraft.com/v3/item/search/${itemName}`)
    console.log(data)
}

async function countID(statID) {
    const data = await fetchJson('https://api.wynncraft.com/v3/item/database?fullResult')
    let count = 0
    const itemsWithStat = []
    for (const [itemName, item] of Object.entries(data)) {
        if (item.identifications && item.identifications[statID] !== undefined) {
            count++
            itemsWithStat.push(itemName)
        }
    }
    console.log(`Number of items with ID '${statID}': ${count}`)
}

async function countAttackSpeeds() {
    const data = await fetchJson('https://api.wynncraft.com/v3/item/database?fullResult')
    const speedCounts = {}
    for (const item of Object.values(data)) {
        if (item.type === 'weapon' && item.attackSpeed) {
            const speed = item.attackSpeed
            speedCounts[speed] = (speedCounts[speed] || 0) + 1
        }
    }
    const speedOrder = [
        'superSlow',
        'verySlow',
        'slow',
        'normal',
        'fast',
        'veryFast',
        'superFast'
    ]
    console.log('Weapon attack speed counts (ordered):')
    for (const speed of speedOrder) {
        if (speedCounts[speed]) {
            console.log(`${speed}: ${speedCounts[speed]}`)
        }
    }
}

async function commands() {
    console.log('Commands:')
    console.log('showAllItems - Shows all items in the Wynncraft item database')
    console.log('itemCategories - Lists all item categories')   
    console.log('searchItem <itemName> - Searches for an item by name')
    console.log('countID <statID> - Counts items with a specific stat/ID')
    console.log('countAttackSpeeds - Counts weapons by attack speed')
    console.log('showClasses - Lists all Wynncraft classes (with archetypes)')
    console.log('chooseClass <class> - Choose a class by name')
    console.log('skillpointPlanner <class> - Interactive skillpoint planner for a class')
}

const args = process.argv.slice(2)
if (args.includes('showAllItems')) {
    showAllItems()
} else if (args.includes('itemCategories')) {
    itemCategories()
} else if (args.includes('searchItem')) {
    const itemName = args[args.indexOf('searchItem') + 1]
    searchItem(itemName)
} else if (args.includes('countID')) {
    const statID = args[args.indexOf('countID') + 1]
    countID(statID)
} else if (args.includes('countAttackSpeeds')) {
    countAttackSpeeds()
} else if (args.includes('showClasses')) {
    showClasses()
} else if (args.includes('chooseClass')) {
    chooseClass()
} else if (args.includes('skillpointPlanner')) {
    const classArg = args[args.indexOf('skillpointPlanner') + 1]
    if (classArg) {
        skillpointPlanner(classArg)
    } else {
        console.log('Usage: node api.js skillpointPlanner <class>')
    }
} else {
    commands()
}