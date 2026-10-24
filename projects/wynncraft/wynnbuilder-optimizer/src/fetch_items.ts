/*
 * Wynncraft Item Explorer
 *
 * 1. Requests the full list of items from the Wynncraft API
 * 2. Shows a menu:
 *      1 = counts of items by type, subType, and tier
 *      2 = look up items by name or ID and print their JSON
 *      3 = Major ID tools (submenu)
 *      4 = Tome tools (submenu)
 *      5 = quit
 *
 * Run it with:  npx tsx fetch_items.ts
 *
 * File layout (each section only depends on the ones above it,
 * except for the menu, which ties everything together):
 *   1. Constants
 *   2. Types
 *   3. Basic helpers          - type checks, text cleaning, matching
 *   4. Terminal helpers       - clearing the screen, "press Enter" prompt
 *   5. Data loading           - fetch + validate the API response
 *   6. Option 1: Counts       - group items by type / subType / tier
 *   7. Option 2: Item lookup  - search items by name or ID
 *   8. Option 3: Major IDs    - special item effects and their descriptions
 *   9. Option 4: Tome Data    - 
 *  10. Menu                   - main menu loop
 *  11. Main program
 */
const readline = require("node:readline/promises")

/* ========================================================================
 * 1. CONSTANTS
 * ======================================================================== */

const ITEM_DATABASE_URL = "https://api.wynncraft.com/v3/item/database?fullResult"
const REQUEST_TIMEOUT_MS = 10_000 // Wynncraft's full item database can take longer than 10s

// Fields that option 1 groups and counts items by
const COUNT_FIELDS = ["type", "subType", "tier"]

// Fields that option 2 searches first (by name)
const SEARCHABLE_FIELDS = ["internalName", "displayName"]

// Fields that are copied into the short summaries shown for Major ID results
const SUMMARY_FIELDS = ["internalName", "displayName", "type", "subType", "tier"]

// Keys that getPlainText checks first when looking for readable text inside an object
const PREFERRED_KEYS = ["name", "displayName", "value", "text", "title", "label", "id"]

// Tome families and their player cap / restriction, from the current API data.
const TOME_FAMILY_CAPS: Record<string, number> = {
    armour_tome: 4,
    weapon_tome: 2,
    marathon_tome: 2,
    expertise_tome: 2,
    mysticism_tome: 2,
    lootrunning_tome: 1,
    lootrun_tome: 1,
    guild_tome: 1,
}

const TOME_FAMILY_LABELS: Record<string, string> = {
    armour_tome: "Armour Tome",
    weapon_tome: "Weapon Tome",
    marathon_tome: "Marathon Tome",
    expertise_tome: "Expertise Tome",
    mysticism_tome: "Mysticism Tome",
    lootrunning_tome: "Lootrunning Tome",
    lootrun_tome: "Lootrunning Tome",
    guild_tome: "Guild Tome",
}

/* ========================================================================
 * 2. TYPES
 * ======================================================================== */

/*
 * An object whose contents we haven't verified.
 * We read it with helper functions (getText, getPlainText, ...)
 * that check each value before using it.
 */
type Item = Record<string, unknown>

/*
 * The small part of a readline interface that we actually use.
 * Keeping it narrow makes the menu functions easy to test or swap out.
 */
type QuestionInterface = {
    question: (prompt: string) => Promise<string> | string
    close: () => void
}

/* ========================================================================
 * 3. BASIC HELPERS
 * Small, general-purpose functions used by every other section.
 * ======================================================================== */

/*
 * Is this value a plain object? (Not null, not an array.)
 * "value is Item" is a type guard: when this returns true,
 * TypeScript treats the value as an Item from then on.
 */
function isObject(value: unknown): value is Item {
    return (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
    )
}

/*
 * Reads one field from an item, but only if it is a string or a number
 * (numbers are converted, e.g. 42 -> "42"). Anything else returns undefined.
 * This is safer than assuming "internalName is a string" and hoping the API agrees.
 */
function getText(item: Item, field: string): string | undefined {
    const value = item[field]

    if (typeof value === "string") {
        return value
    }
    if (typeof value === "number") {
        return String(value)
    }
    return undefined
}

/*
 * Removes HTML-like tags and entities (e.g. "<b>Hi</b>&nbsp;there") and
 * collapses extra whitespace, leaving plain text ("Hi there").
 */
function stripMarkup(value: string): string {
    return value
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&[a-zA-Z]+;/g, " ")
        .replace(/\s+/g, " ")
        .trim()
}

/*
 * Returns the first non-empty plain text found in a list of values,
 * or undefined if none of them contain any. getPlainText uses this
 * to try several candidates in order.
 */
function getFirstPlainText(values: unknown[]): string | undefined {
    for (const value of values) {
        const text = getPlainText(value)
        if (text) {
            return text
        }
    }
    return undefined
}

/*
 * Digs through a value of unknown shape (string, array, or object) and returns
 * the first non-empty piece of text it finds, with markup removed.
 * For objects it tries likely keys first (PREFERRED_KEYS),
 * then falls back to looking at every child.
 */
function getPlainText(value: unknown): string | undefined {
    if (value === null || value === undefined) {
        return undefined
    }

    if (typeof value === "string") {
        const text = stripMarkup(value)
        return text === "" ? undefined : text
    }

    if (Array.isArray(value)) {
        return getFirstPlainText(value)
    }

    if (isObject(value)) {
        const record = value // a const keeps the narrowed type inside the callbacks below

        const preferredValues = PREFERRED_KEYS
            .filter((key) => key in record)
            .map((key) => record[key])

        return getFirstPlainText(preferredValues) ?? getFirstPlainText(Object.values(record))
    }

    return undefined
}

/*
 * Prepares a search string for comparison:
 * removes leading/trailing spaces and lowercases it,
 * so "  Dagger " matches "dagger".
 */
function normalizeQuery(input: string): string {
    return input.trim().toLowerCase()
}

/*
 * The one place that decides whether a value matches a search.
 * `wanted` must already be normalized (see normalizeQuery);
 * we normalize `value` here so both sides are compared the same way.
 * "Contains" also covers exact matches, so no separate equality check is needed.
 */
function matchesQuery(value: string, wanted: string): boolean {
    return normalizeQuery(value).includes(wanted)
}

/* ========================================================================
 * 4. TERMINAL HELPERS
 * Shared by the menu and by every option that pauses before returning.
 * ======================================================================== */

/*
 * Clears the visible screen, moves the cursor home, and wipes the scrollback.
 * `console.clear()` alone isn't always enough because editors like VS Code
 * keep scrollback history. When output isn't a terminal (e.g. piped to a file),
 * we print blank lines instead of using escape codes.
 */
function clearScreen(): void {
    if (process.stdout.isTTY) {
        process.stdout.write("\u001b[H\u001b[2J\u001b[3J")
    } else {
        process.stdout.write("\n".repeat(60))
    }
}

/*
 * Waits for the user to press Enter, then clears the screen.
 * Gives the user time to read the output before the menu redraws.
 */
async function returnToMenu(rl: QuestionInterface): Promise<void> {
    console.log("\nPress Enter to return to the start menu...")
    await rl.question("")
    clearScreen()
}

/* ========================================================================
 * 5. DATA LOADING
 * Download the item list and turn it into a clean Item[].
 * ======================================================================== */

/*
 * Requests a URL and returns the parsed JSON.
 * The result is "unknown" because we haven't checked its shape yet.
 * Throws if the request times out or the server returns an error status;
 * main() catches it.
 */
async function fetchJson(url: string): Promise<unknown> {
    const response = await fetch(url, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: {
            "User-Agent": "Mozilla/5.0",
            Accept: "application/json",
        },
    })

    if (!response.ok) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`)
    }

    return response.json()
}

/*
 * Turns the API response into a list of items.
 * "Shape" means the structure of the JSON. We accept two shapes:
 *   [ { ...item }, { ...item } ]
 *   { results: [ { ...item }, { ...item } ] }
 * Anything else throws, since we can't use it.
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

/* ========================================================================
 * 6. OPTION 1: COUNTS
 * Shows how many items exist for each type, subType, and tier.
 * ======================================================================== */

/*
 * Converts a field value into a label for counting.
 * Missing values become "missing"; values that aren't a string or number
 * (objects, arrays, booleans) become "unknown".
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
 * Counts how many items have each value of one field.
 * Example result for "type": { weapon: 120, armour: 300, ... }
 */
function countByField(items: Item[], field: string): Record<string, number> {
    const counts: Record<string, number> = {}

    for (const item of items) {
        const label = describeValue(item[field])
        counts[label] = (counts[label] ?? 0) + 1
    }

    return counts
}

/*
 * Prints the counts for one field, sorted alphabetically.
 * The `numeric` option makes numbers sort naturally ("2" before "10").
 */
function printFieldCounts(items: Item[], field: string): void {
    console.log(`\n${field}:`)

    const counts = countByField(items, field)
    const sorted = Object.entries(counts).sort(([a], [b]) =>
        a.localeCompare(b, undefined, { numeric: true })
    )

    for (const [label, total] of sorted) {
        console.log(`  ${label}: ${total}`)
    }
}

/* Prints the total item count, then the counts for every field in COUNT_FIELDS. */
function printCounts(items: Item[]): void {
    clearScreen()
    console.log(`Items received: ${items.length}`)

    for (const field of COUNT_FIELDS) {
        printFieldCounts(items, field)
    }
}

/* ========================================================================
 * 7. OPTION 2: ITEM LOOKUP
 * Search items by name first, then fall back to searching by ID.
 * ======================================================================== */

/*
 * Collects every ID-like value of an item as a list of strings.
 * IDs can be nested (e.g. inside `icon`), so we walk through strings, numbers,
 * arrays, and objects recursively and gather every string/number we find.
 * A Set removes duplicates.
 */
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

    for (const field of [item.icon, item.id, item.internalName, item.displayName]) {
        addValue(field)
    }

    return [...ids]
}

/*
 * Finds all items matching the search text.
 * Step 1: match against names (SEARCHABLE_FIELDS). If anything matches, return those.
 * Step 2: otherwise match against the item's IDs.
 * Returns an empty array when nothing matches. "Not found" is a normal
 * outcome here, so we don't throw an error.
 */
function findItems(items: Item[], query: string): Item[] {
    const wanted = normalizeQuery(query)

    const nameMatches = items.filter((item) =>
        SEARCHABLE_FIELDS.some((field) => {
            const value = getText(item, field)
            return value !== undefined && matchesQuery(value, wanted)
        })
    )

    if (nameMatches.length > 0) {
        return nameMatches
    }

    return items.filter((item) =>
        getItemIds(item).some((id) => matchesQuery(id, wanted))
    )
}

/* Prints items as formatted JSON. */
function printItems(items: Item[]): void {
    console.log(JSON.stringify(items, null, 2))
}

/*
 * Asks the user what item to look for, then prints every match.
 * Prints a message instead if nothing was entered or nothing matched.
 */
async function lookUpItem(rl: QuestionInterface, items: Item[]): Promise<void> {
    const query = (await rl.question("\nEnter an item ID or name: ")).trim()

    if (query === "") {
        console.log("Nothing entered.")
        return
    }

    const matches = findItems(items, query)

    if (matches.length === 0) {
        console.log(`No item found for "${query}".`)
        return
    }

    clearScreen()
    if (matches.length > 1) {
        console.log(`Multiple items matched "${query}":`)
    }
    printItems(matches)
}

/* ========================================================================
 * 8. OPTION 3: MAJOR IDS
 * A "Major ID" is a special effect an item can have (with a tooltip that
 * describes it). The API doesn't guarantee one fixed key for these, so we
 * treat any key containing "major" as a Major ID container.
 * ======================================================================== */

/*
 * Builds a map of { majorId: description } for one item.
 * For each key containing "major":
 *   - if its value is an object, each entry is treated as (id -> tooltip)
 *   - otherwise we extract any plain text and use it as both id and description
 * All text is stripped of markup.
 */
function getMajorIdMap(item: Item): Record<string, string> {
    const majorIds: Record<string, string> = {}

    for (const [key, value] of Object.entries(item)) {
        if (!/major/i.test(key)) {
            continue
        }

        if (isObject(value)) {
            for (const [majorId, tooltip] of Object.entries(value)) {
                const cleanedId = stripMarkup(majorId)
                if (cleanedId === "") {
                    continue
                }

                if (typeof tooltip === "string") {
                    majorIds[cleanedId] = stripMarkup(tooltip)
                } else if (tooltip === null || tooltip === undefined) {
                    majorIds[cleanedId] = ""
                } else {
                    majorIds[cleanedId] = String(tooltip)
                }
            }

            continue
        }

        const plainText = getPlainText(value)
        if (plainText) {
            majorIds[plainText] = plainText
        }
    }

    return majorIds
}

/* Returns the item's Major ID names, sorted alphabetically. */
function extractMajorIds(item: Item): string[] {
    return Object.keys(getMajorIdMap(item)).sort()
}

/* Returns only the items that have at least one Major ID. */
function getItemsWithMajorIds(items: Item[]): Item[] {
    return items.filter((item) => extractMajorIds(item).length > 0)
}

/*
 * Returns every item that has a Major ID matching the search text
 * (case-insensitive, partial matches allowed).
 */
function findItemsByMajorId(items: Item[], query: string): Item[] {
    const wanted = normalizeQuery(stripMarkup(query))

    return items.filter((item) =>
        extractMajorIds(item).some((majorId) => matchesQuery(majorId, wanted))
    )
}

/*
 * Looks up what a Major ID does, using one item that has it.
 * Returns the first matching description, or undefined if none matches.
 */
function findMajorIdDescription(item: Item, query: string): string | undefined {
    const wanted = normalizeQuery(stripMarkup(query))

    for (const [majorId, description] of Object.entries(getMajorIdMap(item))) {
        if (matchesQuery(majorId, wanted)) {
            return description
        }
    }

    return undefined
}

/*
 * Counts Major IDs two ways:
 *   uniqueMajorIds    - how many different Major IDs exist across all items
 *   itemsWithMajorIds - how many items have at least one Major ID
 */
function countMajorIds(items: Item[]): { uniqueMajorIds: number; itemsWithMajorIds: number } {
    const uniqueMajorIds = new Set<string>()
    let itemsWithMajorIds = 0

    for (const item of items) {
        const majorIds = extractMajorIds(item)

        if (majorIds.length === 0) {
            continue
        }

        itemsWithMajorIds++

        for (const majorId of majorIds) {
            uniqueMajorIds.add(majorId)
        }
    }

    return {
        uniqueMajorIds: uniqueMajorIds.size,
        itemsWithMajorIds,
    }
}

/*
 * Builds a short version of an item for list output:
 * just the fields in SUMMARY_FIELDS plus its Major IDs joined into one string.
 */
function summarizeItem(item: Item): Item {
    const summary: Item = {}

    for (const field of SUMMARY_FIELDS) {
        const value = getText(item, field)
        if (value !== undefined) {
            summary[field] = value
        }
    }

    const majorIds = extractMajorIds(item)
    if (majorIds.length > 0) {
        summary.majorId = majorIds.join(", ")
    }

    return summary
}

/* Submenu option 1: prints the unique and non-unique Major ID counts. */
function printMajorIdSummary(items: Item[]): void {
    const summary = countMajorIds(items)

    clearScreen()
    console.log("Major ID summary:")
    console.log(`  Unique Major IDs: ${summary.uniqueMajorIds}`)
    console.log(`  Items with a Major ID: ${summary.itemsWithMajorIds}`)
}

/* Submenu option 3: prints a summary of every item that has a Major ID. */
function printItemsWithMajorIds(items: Item[]): void {
    const itemsWithIds = getItemsWithMajorIds(items)

    if (itemsWithIds.length === 0) {
        console.log("No items have a Major ID.")
        return
    }

    clearScreen()
    console.log("Items with a Major ID:")
    console.log(JSON.stringify(itemsWithIds.map(summarizeItem), null, 2))
}

/*
 * Submenu option 2: prints what a Major ID does.
 * Several items can share a Major ID, so we collect their descriptions
 * and remove duplicates (Set) before printing.
 */
function printMajorIdDetails(items: Item[], query: string): void {
    const matches = findItemsByMajorId(items, query)

    if (matches.length === 0) {
        console.log(`No items found for Major ID "${query}".`)
        return
    }

    const descriptions = Array.from(
        new Set(
            matches
                .map((item) => findMajorIdDescription(item, query))
                .filter((value): value is string => value !== undefined)
        )
    )

    clearScreen()
    console.log(`Major ID: "${query}"`)
    if (descriptions.length > 0) {
        console.log(`\nWhat it does: ${descriptions.join(" | ")}`)
    }
}

/* Submenu option 4: prints a summary of every item with the given Major ID. */
function printItemsByMajorId(items: Item[], query: string): void {
    const matches = findItemsByMajorId(items, query)

    if (matches.length === 0) {
        console.log(`\nNo items found for Major ID "${query}".`)
        return
    }

    clearScreen()
    console.log(`Items matching Major ID "${query}":`)
    console.log(JSON.stringify(matches.map(summarizeItem), null, 2))
}

/*
 * Runs the Major ID submenu: shows the options, reads a choice, and runs it.
 * Choosing "5" goes straight back to the main menu; every other choice
 * waits for Enter first so the output can be read.
 */
async function viewMajorIds(rl: QuestionInterface, items: Item[]): Promise<void> {
    console.log("\nChoose an option:")
    console.log("1. Count Non-Unique & Unique Major IDs")
    console.log("2. Request what a Major ID does")
    console.log("3. Request a list of all items with a Major ID")
    console.log("4. Request all items with a specific Major ID")
    console.log("5. Return to the main menu")

    const choice = (await rl.question("Select a Major ID option: ")).trim()

    switch (choice) {
        case "1":
            printMajorIdSummary(items)
            break
        case "2": {
            const query = (await rl.question("\nEnter a Major ID to inspect: ")).trim()
            if (query === "") {
                console.log("No Major ID entered.")
                break
            }
            printMajorIdDetails(items, query)
            break
        }
        case "3":
            printItemsWithMajorIds(items)
            break
        case "4": {
            const query = (await rl.question("\nEnter the specific Major ID to filter by: ")).trim()
            if (query === "") {
                console.log("No Major ID entered.")
                break
            }
            printItemsByMajorId(items, query)
            break
        }
        case "5":
            return
        default:
            console.log("Please enter a valid option from 1 to 5.")
    }

    await returnToMenu(rl)
}

/* ========================================================================
 * 9. OPTION 4: TOMES
 * A tome is a normal item whose `type` is "tome". The useful data is stored
 * under `identifications`, and each family (`armour_tome`, etc.) has a cap.
 * ======================================================================== */

/* Returns only the tome entries from the database. */
function getTomes(items: Item[]): Item[] {
    return items.filter((item) => getText(item, "type") === "tome")
}

/* Returns the tome family (subType) for one item, or "unknown" when absent. */
function getTomeFamily(item: Item): string {
    return getText(item, "subType") ?? "unknown"
}

/* Human-readable label for each tome family. */
function getTomeFamilyLabel(family: string): string {
    return TOME_FAMILY_LABELS[family] ?? family
}

/* The player cap / restriction for a tome family, if known. */
function getTomeCap(family: string): number | undefined {
    return TOME_FAMILY_CAPS[family]
}

/* Extracts the identifications object for a tome and presents each entry as
 * { name, min, raw, max } when the nested value looks like a valid stat block.
 */
function getTomeIdentifications(item: Item): Array<{
    name: string
    min: string | undefined
    raw: string | undefined
    max: string | undefined
}> {
    const identifications = item.identifications
    if (!isObject(identifications)) {
        return []
    }

    const results: Array<{ name: string; min: string | undefined; raw: string | undefined; max: string | undefined }> = []

    for (const [name, value] of Object.entries(identifications)) {
        if (!isObject(value)) {
            continue
        }

        const min = getText(value, "min")
        const raw = getText(value, "raw")
        const max = getText(value, "max")

        if (min === undefined && raw === undefined && max === undefined) {
            continue
        }

        results.push({ name, min, raw, max })
    }

    return results
}

/* Counts all tomes by tome family (subType). */
function countTomesByFamily(items: Item[]): Record<string, number> {
    const counts: Record<string, number> = {}

    for (const item of getTomes(items)) {
        const family = getTomeFamily(item)
        counts[family] = (counts[family] ?? 0) + 1
    }

    return counts
}

/* Finds tome items matching a search query by name, then by IDs as a fallback. */
function findTomes(items: Item[], query: string): Item[] {
    return findItems(getTomes(items), query)
}

/* Prints a readable summary of one tome. */
function printTomeDetails(item: Item): void {
    const displayName = getText(item, "displayName") ?? "Unknown tome"
    const internalName = getText(item, "internalName") ?? "Unknown"
    const type = getText(item, "type") ?? "unknown"
    const subType = getText(item, "subType") ?? "unknown"
    const tier = getText(item, "tier") ?? "unknown"
    const family = getTomeFamily(item)
    const cap = getTomeCap(family)

    console.log(`  displayName: ${displayName}`)
    console.log(`  internalName: ${internalName}`)
    console.log(`  type: ${type}`)
    console.log(`  subType: ${subType}`)
    console.log(`  tier: ${tier}`)
    console.log(`  family: ${getTomeFamilyLabel(family)}`)
    if (cap !== undefined) {
        console.log(`  family cap: ${cap}`)
    }

    const identifications = getTomeIdentifications(item)
    if (identifications.length === 0) {
        console.log("  identifications: none")
        return
    }

    console.log("  identifications:")
    for (const { name, min, raw, max } of identifications) {
        console.log(`    - ${name}: min=${min ?? "?"}, raw=${raw ?? "?"}, max=${max ?? "?"}`)
    }
}

/* Submenu option 1: count all tome entries by family. */
function printTomeSummary(items: Item[]): void {
    const tomes = getTomes(items)
    const counts = countTomesByFamily(items)

    clearScreen()
    console.log(`Tomes received: ${tomes.length}`)

    const sorted = Object.entries(counts).sort(([left], [right]) =>
        left.localeCompare(right, undefined, { numeric: true })
    )

    for (const [family, total] of sorted) {
        const cap = getTomeCap(family)
        const label = getTomeFamilyLabel(family)
        const capText = cap !== undefined ? ` (cap: ${cap})` : ""
        console.log(`  ${label} (${family})${capText}: ${total}`)
    }
}

/* Submenu option 2: list every individual tome under its family, so the user
 * can scan names before drilling into a specific item in option 3.
 */
function printTomeCatalog(items: Item[]): void {
    const tomes = getTomes(items)

    clearScreen()
    console.log("Tome catalog:")

    if (tomes.length === 0) {
        console.log("  No tomes found.")
        return
    }

    const byFamily: Record<string, Item[]> = {}
    for (const tome of tomes) {
        const family = getTomeFamily(tome)
        if (!byFamily[family]) {
            byFamily[family] = []
        }
        byFamily[family].push(tome)
    }

    const families = Object.keys(byFamily).sort((left, right) =>
        left.localeCompare(right, undefined, { numeric: true })
    )

    for (const family of families) {
        const label = getTomeFamilyLabel(family)
        const cap = getTomeCap(family)
        console.log(`\n  ${label} (${family})${cap !== undefined ? ` [cap ${cap}]` : ""}`)

        const sortedTomes = [...(byFamily[family] ?? [])].sort((left, right) => {
            const leftName = (getText(left, "displayName") ?? getText(left, "internalName") ?? "").toLowerCase()
            const rightName = (getText(right, "displayName") ?? getText(right, "internalName") ?? "").toLowerCase()
            return leftName.localeCompare(rightName)
        })

        for (const tome of sortedTomes) {
            const displayName = getText(tome, "displayName") ?? "Unknown tome"
            const internalName = getText(tome, "internalName") ?? "unknown"
            const tier = getText(tome, "tier") ?? "unknown"
            console.log(`    - ${displayName} (${internalName}) [tier ${tier}]`)
        }
    }
}

/* Submenu option 3: search for a tome by `internalName` or `displayName`. */
function printTomeLookup(items: Item[], query: string): void {
    const matches = findTomes(items, query)

    if (matches.length === 0) {
        console.log(`No tome found for "${query}".`)
        return
    }

    clearScreen()
    if (matches.length > 1) {
        console.log(`Multiple tomes matched "${query}":\n`)
    }

    for (const tome of matches) {
        printTomeDetails(tome)
        console.log()
    }
}

/* Runs the Tome submenu: counts, lists families, and looks up one tome. */
async function viewTomes(rl: QuestionInterface, items: Item[]): Promise<void> {
    console.log("\nChoose an option:")
    console.log("1. Count all tome entries and group them by family")
    console.log("2. List every individual tome by family")
    console.log("3. View a single tome by internalName or displayName")
    console.log("4. Return to the main menu")

    const choice = (await rl.question("Select a Tome option: ")).trim()

    switch (choice) {
        case "1":
            printTomeSummary(items)
            break
        case "2":
            printTomeCatalog(items)
            break
        case "3": {
            const query = (await rl.question("\nEnter a tome name or internalName: ")).trim()
            if (query === "") {
                console.log("No tome entered.")
                break
            }
            printTomeLookup(items, query)
            break
        }
        case "4":
            return
        default:
            console.log("Please enter a valid option from 1 to 4.")
    }

    await returnToMenu(rl)
}

/* ========================================================================
 * 10. MENU
 * The main loop that ties all the options together.
 * ======================================================================== */

/* Prints the main menu options. */
function printMenu(): void {
    console.log("Choose an option:")
    console.log("1. Show item counts by type, subType, and tier")
    console.log("2. Look up an item by ID or name")
    console.log("3. View Major IDs Data")
    console.log("4. View Tome Data")
    console.log("5. Quit")
}

/*
 * Runs the main menu until the user quits.
 * The readline interface is always closed afterwards (try/finally),
 * even if something throws, so the program can exit cleanly.
 */
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
                    await viewMajorIds(rl, items)
                    break
                case "4":
                    await viewTomes(rl, items)
                    break
                case "5":
                    isRunning = false
                    break
                default:
                    // Pause so the message isn't wiped by clearScreen() on the next loop
                    console.log("Please enter 1, 2, 3, 4, or 5.")
                    await returnToMenu(rl)
            }
        }
    } finally {
        rl.close()
    }
}

/* ========================================================================
 * 11. MAIN PROGRAM
 * ======================================================================== */

/* Downloads the items, makes sure there are some, then starts the menu. */
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