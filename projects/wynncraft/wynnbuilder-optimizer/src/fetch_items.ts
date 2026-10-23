/*
 * 
 *  Wynncraft Item Explorer
 * 
 *  1. Downloads the full list of items from the Wynncraft API
 *  2. Shows a small menu:
 *      1 = counts of items by type, subType, and tier
 *      2 = look up one item and print its JSON
 *      3 = quit
 * 
 *  Run it with:  npx tsx wynncraft-item-explorer.ts
 */
const readline = require("node:readline/promises")
const process = require("node:process")

const ITEM_DATABASE_URL = "https://api.wynncraft.com/v3/item/database?fullResult"
const REQUEST_TIMEOUT_MS = 10_000 // cancel the request after 10 seconds

const COUNT_FIELDS = ["type", "subType", "tier"]
const SEARCHABLE_FIELDS = ["internalName", "displayName"]

function normalizeQuery(input: string): string {
    return input.trim().toLowerCase()
}

function getItemIds(item: Item): string[] {
    const ids = new Set<string>()

    const addValue = (value: unknown): void => {
        if (value === null || value === undefined) {
            return
        }

        if (typeof value === "string" || typeof value === "number") {
            ids.add(String(value))
            return
        }

        if (Array.isArray(value)) {
            for (const child of value) {
                addValue(child)
            }
            return
        }

        if (isObject(value)) {
            for (const child of Object.values(value)) {
                addValue(child)
            }
        }
    }

    const objectLikeFields = [item.icon, item.id, item.internalName, item.displayName]
    for (const field of objectLikeFields) {
        addValue(field)
    }

    if (isObject(item.icon)) {
        const iconValue = item.icon.value
        if (isObject(iconValue)) {
            const customModelData = iconValue.customModelData
            if (isObject(customModelData)) {
                addValue(customModelData.rangeDispatch)
            }
        }
    }

    return [...ids]
}

/* 
 *
 * Types
 * 
 */

/* 
 * An object whose contents we haven't verified. 
 * We read it with "helpers functions"—like getText()— 
 * that check each value before using it 
 */
type Item = Record<string, unknown>

type QuestionInterface = {
    question: (prompt: string) => Promise<string> | string
    close: () => void
}

/* 
 * 
 * Basic helpers
 * 
 */

/*
 * Is this value a plain object? (Not null nor array)
 * "value is Item" is a type guard—when this returns true, TS
 * treats the value as an Item afterwards.
 */ 
function isObject(value: unknown): value is Item {
    return (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
    )
}

/* 
 * Reads one field from an item, but only if it's a string—
 * Otherwise returns undefined. 
 * This is safer than clamining in a type that 
 * "internalName is a string" and hoping the API agrees.
 */ 
function getText(item: Record<string, any>, field: string): string | undefined {
    const value = item[field]

    if (value === null || value === undefined) { return undefined }
    return String(value); // Converts numbers/booleans to strings (e.g., 42 -> "42")
}


/* 
 * Requests URL and returns as JSON. 
 * Result is "unknown" because we haven't checked its shape yet. 
 * Shape = structure of JSON object, e.g., { results: [ { ...item }, { ...item } ] }
 */
async function fetchJson(url: string): Promise<unknown> {
    const response = await fetch(url, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: {
            "User-Agent": "Mozilla/5.0",
            Accept: "application/json",
        },
    })

    // if API returns an error, throw an exception so we can catch it in main()
    if (!response.ok) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`)
    }

    return response.json()
}

/* 
 * Turning the API response into a list of items 
 * 
 * We accept two shapes: 
 *   [ { ...item }, { ...item } ]
 *   { results: [ { ...item }, { ...item } ] }
 */
function extractItems(payload: unknown): Item[] {
    // Shape 1: the payload is the array of items
    if (Array.isArray(payload)) {
        return payload.filter(isObject)
    }

    // Anything else must be an object, otherwise we can't use it
    if (!isObject(payload)) {
        throw new Error("Invalid payload: expected a JSON object or an array")
    }

    // Shape 2: the items are inside a "results" array
    if (Array.isArray(payload.results)) {
        return payload.results.filter(isObject)
    }

    throw new Error('No items found: expected an array or a "results" array.')
}


/*
 * Option 1: counts by type, subType, and tier
 */
function describeValue(value: unknown): string {
    if (value === null || value === undefined) {
        return "missing"
    }
    if (typeof value === "string") {
        return value
    }
    if (typeof value === "number") {
        return String(value)
    }
    return "unknown"
}
/* 
 * Counts how many items have each value of one field—
 * example result for "type": { weapon: 120, armour: 300, ... }
 */ 
function countByField(items: Item[], field: string): Record<string, number> {
    const counts: Record<string, number> = {}

    for (const item of items) {
        const label = describeValue(item[field])
        if (counts[label]) {
            counts[label]++
        } else {
            counts[label] = 1
        }
    }

    return counts
}
/* 
 * Prints the count for one field, sorted alphabetically. 
 * Numbers sort naturally, so "2" comes before "10". 
 */ 
function printFieldCounts(items: Item[], field: string): void {
    console.log(`\n${field}:`)

    const counts = countByField(items, field)

    // Loop through the object entries and print them
    for (const [label, total] of Object.entries(counts)) {
        console.log(`  ${label}: ${total}`)
    }
}

function printCounts(items: Item[]): void {
    console.log(`Items received: ${items.length}`)

    for (const field of COUNT_FIELDS) {
        printFieldCounts(items, field)
    }
}

/* 
 * 
 * Options 2: look up one item by name 
 * 
 */ 

/* 
 * Finds the first item whose searchable fields match the text
 * Returns undefined if nothing matches. 
 * "Not found" is a normal outcome here, so we return undefined instead of 
 * throwing an error message. 
 */ 
function findItems(items: Item[], query: string): Item[] {
    const wanted = normalizeQuery(query)

    const nameMatches = items.filter((item) =>
        SEARCHABLE_FIELDS.some((field) => {
            const value = getText(item, field)
            if (value === undefined) {
                return false
            }

            const normalized = value.toLowerCase()
            return normalized === wanted || normalized.includes(wanted)
        })
    )

    if (nameMatches.length > 0) {
        return nameMatches
    }

    return items.filter((item) =>
        getItemIds(item).some((value) => {
            const normalized = value.toLowerCase()
            return normalized === wanted || normalized.includes(wanted)
        })
    )
}

function printItems(items: Item[]): void {
    console.log(JSON.stringify(items, null, 2))
}
/* 
 * Asks user what item to look for 
 * If no item was found, throw error
 */
async function lookUpItem(rl: QuestionInterface, items: Item[]): Promise<void> {
    const query = (await rl.question("Enter an item ID or name: ")).trim()

    if (query === "") {
        console.log("Nothing entered.")
        return
    }

    const matches = findItems(items, query)

    if (matches.length === 0) {
        console.log(`No item found for "${query}".`)
        return
    }

    if (matches.length === 1) {
        printItems(matches)
        return
    }

    console.log(`Multiple items matched "${query}":`)
    printItems(matches)
}


/* 
 * 
 * Menu loop / Backend UI
 * 
 */ 
function clearScreen(): void {
    // `console.clear()` and a single `\u001b[2J` are not always enough in
    // readline-driven terminal UIs because VS Code keeps scrollback history.
    // Clear the visible screen, move the cursor home, and wipe the scrollback.
    if (process.stdout.isTTY) {
        process.stdout.write("\u001b[H\u001b[2J\u001b[3J")
    } else {
        process.stdout.write("\n".repeat(60))
    }
}

function printMenu(): void {
    console.log("\nChoose an option:")
    console.log("1. Show item counts by type, subType, and tier")
    console.log("2. Look up an item by ID or name")
    console.log("3. Quit")
}

async function returnToMenu(rl: QuestionInterface): Promise<void> {
    console.log("\nPress Enter to return to the start menu...")
    await rl.question("")
    clearScreen()
}

async function runMenu(items: Item[]): Promise<void> {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

    try {
        let isRunning = true


        while (isRunning) {
            clearScreen()
            printMenu()
            const choice = (await rl.question("Select an option: ")).trim()

            switch (choice) {
                case "1":
                    printCounts(items)
                    await returnToMenu(rl)
                    break
                case "2":
                    await lookUpItem(rl, items)
                    await returnToMenu(rl)
                    break
                case "3":
                    isRunning = false
                    break
                default:
                    console.log("Please enter 1, 2, or 3.")
            }
        }
    } finally {
        rl.close()
    }
}


/* 
 * 
 * Main program 
 * 
 */
async function main(): Promise<void> {
    const payload = await fetchJson(ITEM_DATABASE_URL)
    const items = extractItems(payload)

    if (items.length === 0) {
        console.log("No items found in the request.")
        return
    }

    await runMenu(items)
}

main().catch((error: unknown) => {
    console.error("Could not fetch items:", error)
    process.exitCode = 1
})