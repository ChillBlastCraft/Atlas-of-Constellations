
async function showAllItems() {
    const response = await fetch("https://api.wynncraft.com/v3/item/database?fullResult")
    const data = await response.json()
    console.log(Object.keys(data))
}

async function itemCategories() {
    const response = await fetch("https://api.wynncraft.com/v3/item/database?fullResult")
    const data = await response.json()

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

    console.log("Item categories and subcategories:")
    for (const [category, subcats] of Object.entries(categoryMap)) {
        console.log(`- ${category}: [${Array.from(subcats).join(', ')}]`)
    }
}

async function searchItem(itemName) {
    const response = await fetch(`https://api.wynncraft.com/v3/item/search/${itemName}`)
    const data = await response.json()
    console.log(data)
}

async function countID(statID) {
    const response = await fetch("https://api.wynncraft.com/v3/item/database?fullResult")
    const data = await response.json()
    
    let count = 0
    let itemsWithStat = []
    // The API returns an object with item names as keys and item data as values
    for (const [itemName, item] of Object.entries(data)) {
        if (item.identifications && item.identifications[statID] !== undefined) {
            count++
            itemsWithStat.push(itemName)
        }
    }
    console.log(`Number of items with ID '${statID}': ${count}`)
}

async function countAttackSpeeds() {
    const response = await fetch("https://api.wynncraft.com/v3/item/database?fullResult")
    const data = await response.json()

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
    console.log("Weapon attack speed counts (ordered):")
    for (const speed of speedOrder) {
        if (speedCounts[speed]) {
            console.log(`${speed}: ${speedCounts[speed]}`)
        }
    }
}

async function viewAllClasses() {
    const response = await fetch("https://api.wynncraft.com/v3/classes")
    const data = await response.json()

    console.log("Wynncraft classes:")
    for (const key of Object.keys(data)) {
        const cls = data[key]

        let archetypes = 'None'
        try {
            const classResponse = await fetch(`https://api.wynncraft.com/v3/classes/${key}`)
            const classData = await classResponse.json()

            if (classData.archetypes && typeof classData.archetypes === 'object') {
                let archetypeNames = ''
                const values = Object.values(classData.archetypes)

                for (let i = 0; i < values.length; i++) {

                    // remove mc color codes from the name
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
}

async function commands() {
    console.log("Commands:")
    console.log("showAllItems - Shows all items in the Wynncraft item database")
    console.log("itemCategories - Lists all item categories")   
    console.log("searchItem <itemName> - Searches for an item by name")
    console.log("countID <statID> - Counts items with a specific stat/ID")
    console.log("countAttackSpeeds - Counts weapons by attack speed")
    console.log("viewAllClasses - Lists all Wynncraft classes")
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
} else if (args.includes('viewAllClasses')) {
    viewAllClasses()
} else {
    commands()
}