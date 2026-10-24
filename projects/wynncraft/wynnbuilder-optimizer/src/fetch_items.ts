/*
 * Wynncraft Item Explorer
 *
 * 1. Loads the full list of items (from a local cache if it is fresh,
 *    otherwise from the Wynncraft API)
 * 2. Shows a menu:
 *      1 = counts of items by type, subType, and tier
 *      2 = look up items by name or ID
 *      3 = Major ID tools (submenu)
 *      4 = Tome tools (submenu)
 *      5 = quit
 *
 * Run it with:            npx tsx fetch_items.ts
 * Force a fresh download: npx tsx fetch_items.ts --refresh
 *
 * File layout (sections are ordered for readability; function declarations
 * are hoisted, so a section may call a function defined further down):
 *   1. Constants
 *   2. Types
 *   3. Basic helpers          - type checks, text cleaning, matching
 *   4. Terminal helpers       - clearing the screen, "press Enter" prompt
 *   5. Data loading           - cache + fetch + validate the API response
 *   6. Option 1: Counts       - group items by type / subType / tier
 *   7. Option 2: Item lookup  - search items by name or ID
 *   8. Option 3: Major IDs    - special item effects and their descriptions
 *   9. Option 4: Tomes        - tome families, caps and identifications
 *  10. Menu                   - main menu loop
 *  11. Main program
 */
/*
 * NOTE: `import x = require(...)` is the import style TypeScript accepts in a
 * CommonJS project (package.json "type": "commonjs") when verbatimModuleSyntax is on.
 * If you ever switch the project to ES modules ("type": "module"), change these
 * four lines to the modern form, e.g.:  import * as fs from "node:fs/promises"
 */
import fs = require("node:fs/promises")
import os = require("node:os")
import path = require("node:path")
import readline = require("node:readline/promises")

/* ========================================================================
 * 1. CONSTANTS
 * ======================================================================== */

const ITEM_DATABASE_URL = "https://api.wynncraft.com/v3/item/database?fullResult"

/* The full item database is large, so a short timeout fails on slow connections. */
const REQUEST_TIMEOUT_MS = 30_000

/* Downloaded data is saved here so that repeat runs don't re-download it. */
const CACHE_FILE = path.join(os.tmpdir(), "wynncraft-item-cache.json")

/* How long saved data is trusted. Pass --refresh to ignore this and re-download. */
const CACHE_MAX_AGE_MS = 6 * 60 * 60 * 1000 // 6 hours

/* Fields that option 1 groups and counts items by */
const COUNT_FIELDS = ["type", "subType", "tier"]

/* Fields that option 2 searches first (by name) */
const SEARCHABLE_FIELDS = ["internalName", "displayName"]

/* Fields that are copied into the short summaries shown for Major ID results */
const SUMMARY_FIELDS = ["internalName", "displayName", "type", "subType", "tier"]

/* Keys that getPlainText checks first when looking for readable text inside an object */
const PREFERRED_KEYS = ["name", "displayName", "value", "text", "title", "label", "id"]

/* Keys skipped when collecting ID-like values (they describe format, not identity) */
const ID_SKIP_KEYS = new Set(["format"])

/* If a lookup matches more items than this, print short summaries instead of full JSON */
const MAX_FULL_RESULTS = 5

/*
 * Tome families and their player cap / restriction.
 * NOTE: hard-coded; re-check against the API if Wynncraft changes tomes.
 */
const TOME_FAMILY_CAPS = new Map<string, number>([
    ["armour_tome", 4],
    ["weapon_tome", 2],
    ["marathon_tome", 2],
    ["expertise_tome", 2],
    ["mysticism_tome", 2],
    ["lootrunning_tome", 1],
    ["lootrun_tome", 1],
    ["guild_tome", 1],
])

const TOME_FAMILY_LABELS = new Map<string, string>([
    ["armour_tome", "Armour Tome"],
    ["weapon_tome", "Weapon Tome"],
    ["marathon_tome", "Marathon Tome"],
    ["expertise_tome", "Expertise Tome"],
    ["mysticism_tome", "Mysticism Tome"],
    ["lootrunning_tome", "Lootrunning Tome"],
    ["lootrun_tome", "Lootrunning Tome"],
    ["guild_tome", "Guild Tome"],
])

/* Named HTML entities we know how to decode (see decodeEntity). */
const HTML_ENTITIES = new Map<string, string>([
    ["nbsp", " "],
    ["amp", "&"],
    ["lt", "<"],
    ["gt", ">"],
    ["quot", '"'],
    ["apos", "'"],
])

/* ========================================================================
 * 2. TYPES
 * ======================================================================== */

/* An object whose contents we haven't verified. */
type Item = Record<string, unknown>

/* The small part of a readline interface that we actually use. */
type QuestionInterface = {
    question: (prompt: string) => Promise<string> | string
    close: () => void
}

type TomeIdentification = {
    name: string
    min: string | undefined
    raw: string | undefined
    max: string | undefined
}

/* ========================================================================
 * 3. BASIC HELPERS
 * ======================================================================== */

/* Is this value a plain object? (Not null, not an array.) */
function isObject(value: unknown): value is Item {
    return (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
    )
}

/* Reads one field from an item if it is a string or number; otherwise undefined. */
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
 * Turns the inside of an HTML entity into its character:
 * "amp" -> "&", "#39" -> "'". Unknown entities become a space.
 */
function decodeEntity(entity: string): string {
    if (entity.startsWith("#")) {
        const code = Number(entity.slice(1))
        // String.fromCodePoint throws on values above 0x10ffff, so guard it
        return code <= 0x10ffff ? String.fromCodePoint(code) : " "
    }
    return HTML_ENTITIES.get(entity.toLowerCase()) ?? " "
}

/*
 * Removes HTML-like tags, decodes entities ("&amp;" -> "&"),
 * and collapses extra whitespace.
 */
function stripMarkup(value: string): string {
    return value
        .replace(/<[^>]+>/g, " ")
        .replace(/&(#\d+|[a-zA-Z]+);/g, (_match, entity: string) => decodeEntity(entity))
        .replace(/\s+/g, " ")
        .trim()
}

/* Returns the first non-empty plain text found in a list of values. */
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
 * Digs through a value of unknown shape (string, number, array, or object) and
 * returns the first non-empty piece of text it finds, with markup removed.
 */
function getPlainText(value: unknown): string | undefined {
    if (value === null || value === undefined) {
        return undefined
    }

    if (typeof value === "string") {
        const text = stripMarkup(value)
        return text === "" ? undefined : text
    }

    if (typeof value === "number") {
        return String(value)
    }

    if (Array.isArray(value)) {
        return getFirstPlainText(value)
    }

    if (isObject(value)) {
        const record = value

        const preferredValues = PREFERRED_KEYS
            .filter((key) => key in record)
            .map((key) => record[key])

        return getFirstPlainText(preferredValues) ?? getFirstPlainText(Object.values(record))
    }

    return undefined
}

/* Trims and lowercases a search string so "  Dagger " matches "dagger". */
function normalizeQuery(input: string): string {
    return input.trim().toLowerCase()
}

/*
 * Does `value` contain `wanted`? `wanted` must already be normalized.
 * An empty `wanted` matches nothing (otherwise "" would match everything).
 */
function matchesQuery(value: string, wanted: string): boolean {
    if (wanted === "") {
        return false
    }
    return normalizeQuery(value).includes(wanted)
}

/* Does `value` equal `wanted` exactly (after normalizing `value`)? */
function equalsQuery(value: string, wanted: string): boolean {
    return wanted !== "" && normalizeQuery(value) === wanted
}

/* Sort helper: alphabetical with natural number ordering ("2" before "10"). */
function compareNatural(a: string, b: string): number {
    return a.localeCompare(b, undefined, { numeric: true })
}

/* ========================================================================
 * 4. TERMINAL HELPERS
 * ======================================================================== */

/* Clears the screen and scrollback; prints blank lines when not a TTY. */
function clearScreen(): void {
    if (process.stdout.isTTY) {
        process.stdout.write("\u001b[H\u001b[2J\u001b[3J")
    } else {
        process.stdout.write("\n".repeat(60))
    }
}

/* Waits for the user to press Enter, then clears the screen. */
async function returnToMenu(rl: QuestionInterface): Promise<void> {
    console.log("\nPress Enter to return to the start menu...")
    await rl.question("")
    clearScreen()
}

/* ========================================================================
 * 5. DATA LOADING
 * Get the item list (cache first, API second) and turn it into a clean Item[].
 * ======================================================================== */

/* Requests a URL and returns the response body as text. Throws on timeout or HTTP error. */
async function fetchText(url: string): Promise<string> {
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

    return response.text()
}

/* Parses JSON text. Returns undefined if the text isn't valid JSON (JSON itself can never be undefined). */
function tryParseJson(text: string): unknown {
    try {
        return JSON.parse(text)
    } catch {
        return undefined
    }
}

/*
 * Reads the saved copy of the API response, or undefined if there is none.
 * Unless `ignoreAge` is true, a copy older than CACHE_MAX_AGE_MS counts as missing.
 */
async function readCache(ignoreAge: boolean): Promise<unknown> {
    try {
        const stats = await fs.stat(CACHE_FILE)
        if (!ignoreAge && Date.now() - stats.mtimeMs > CACHE_MAX_AGE_MS) {
            return undefined
        }
        return tryParseJson(await fs.readFile(CACHE_FILE, "utf8"))
    } catch {
        return undefined // no cache file yet, or it couldn't be read
    }
}

/* Saves the raw API response. A failure here is not fatal: the program works without a cache. */
async function writeCache(text: string): Promise<void> {
    try {
        await fs.writeFile(CACHE_FILE, text)
    } catch (error) {
        console.log(`(Could not save the cache: ${error instanceof Error ? error.message : String(error)})`)
    }
}

/*
 * Loads the API response:
 *   1. Use the saved copy if it is fresh (skipped with --refresh).
 *   2. Otherwise download it and save a copy.
 *   3. If the download fails but an older copy exists, use that instead.
 */
async function loadPayload(forceRefresh: boolean): Promise<unknown> {
    if (!forceRefresh) {
        const cached = await readCache(false)
        if (cached !== undefined) {
            console.log("Using saved item data (run with --refresh to download it again).")
            return cached
        }
    }

    console.log("Requesting item database (this can take a while)...")

    try {
        const text = await fetchText(ITEM_DATABASE_URL)
        const payload: unknown = JSON.parse(text) // validate before saving
        await writeCache(text)
        return payload
    } catch (error) {
        const older = await readCache(true)
        if (older === undefined) {
            throw error
        }
        console.log(`Download failed (${error instanceof Error ? error.message : String(error)}); using older saved data.`)
        return older
    }
}

/*
 * Turns the API response into a list of items. Accepted shapes:
 *   [ { ...item }, ... ]
 *   { results: [ { ...item }, ... ] }
 *   { "Item Name": { ...item }, ... }   (a map keyed by item name; the key is
 *                                         used as internalName if it is missing)
 */
function extractItems(payload: unknown): Item[] {
    if (Array.isArray(payload)) {
        return payload.filter(isObject)
    }

    if (!isObject(payload)) {
        throw new Error("Invalid payload: expected a JSON object or an array")
    }

    if (Array.isArray(payload.results)) {
        return payload.results.filter(isObject)
    }

    const entries = Object.entries(payload)
    if (entries.length > 0 && entries.every(([, value]) => isObject(value))) {
        return entries.map(([key, value]) => {
            const item = value as Item
            return item.internalName === undefined ? { internalName: key, ...item } : item
        })
    }

    throw new Error('No items found: expected an array, a "results" array, or a map of items.')
}

/* ========================================================================
 * 6. OPTION 1: COUNTS
 * ======================================================================== */

/* Converts a field value into a label for counting. */
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

/* Counts how many items have each value of one field. */
function countByField(items: Item[], field: string): Map<string, number> {
    const counts = new Map<string, number>()

    for (const item of items) {
        const label = describeValue(item[field])
        counts.set(label, (counts.get(label) ?? 0) + 1)
    }

    return counts
}

/* Prints the counts for one field, sorted alphabetically. */
function printFieldCounts(items: Item[], field: string): void {
    console.log(`\n${field}:`)

    const sorted = [...countByField(items, field).entries()].sort(([a], [b]) => compareNatural(a, b))

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
 * Search items by name first (partial match), then by ID (exact match).
 * ======================================================================== */

/*
 * Collects the ID-like values of an item: `id` and `icon` (which can be nested).
 * Names are not included here; they are searched separately.
 * Keys in ID_SKIP_KEYS (e.g. icon.format) are ignored so that descriptive
 * values don't count as IDs.
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
            for (const [key, child] of Object.entries(value)) {
                if (!ID_SKIP_KEYS.has(key)) {
                    addValue(child)
                }
            }
        }
    }

    addValue(item.id)
    addValue(item.icon)

    return [...ids]
}

/*
 * Finds all items matching the search text.
 * Step 1: partial match against names (SEARCHABLE_FIELDS).
 * Step 2: if no name matched, EXACT match against the item's IDs
 *         (partial ID matching returns noise: "1" would match half the database).
 */
function findItems(items: Item[], query: string): Item[] {
    const wanted = normalizeQuery(query)
    if (wanted === "") {
        return []
    }

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
        getItemIds(item).some((id) => equalsQuery(id, wanted))
    )
}

/* Prints items as formatted JSON. */
function printItems(items: Item[]): void {
    console.log(JSON.stringify(items, null, 2))
}

/* Asks the user what item to look for, then prints the matches. */
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

    if (matches.length > MAX_FULL_RESULTS) {
        console.log(`${matches.length} items matched "${query}". Showing short summaries;`)
        console.log("refine your search (or use the exact name) to see one item's full JSON.\n")
        console.log(JSON.stringify(matches.map(summarizeItem), null, 2))
        return
    }

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

// Major ID maps are used many times per search, so compute each item's map once.
const majorIdCache = new WeakMap<Item, Record<string, string>>()

/*
 * Builds a map of { majorId: description } for one item.
 * For each key containing "major":
 *   - object: each entry is (id -> tooltip)
 *   - array:  each element's text is used as both id and description
 *   - other:  any plain text is used as both id and description
 */
function getMajorIdMap(item: Item): Record<string, string> {
    const cached = majorIdCache.get(item)
    if (cached) {
        return cached
    }

    const majorIds: Record<string, string> = Object.create(null)

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
                majorIds[cleanedId] = getPlainText(tooltip) ?? ""
            }
            continue
        }

        if (Array.isArray(value)) {
            for (const entry of value) {
                const text = getPlainText(entry)
                if (text) {
                    majorIds[text] = text
                }
            }
            continue
        }

        const plainText = getPlainText(value)
        if (plainText) {
            majorIds[plainText] = plainText
        }
    }

    majorIdCache.set(item, majorIds)
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

/* Cleans a Major ID query the same way Major ID names are cleaned. */
function normalizeMajorIdQuery(query: string): string {
    return normalizeQuery(stripMarkup(query))
}

/*
 * Returns every item with a Major ID matching the search text.
 * An exact name match wins over partial matches, so "Cavern Cleaver"
 * doesn't also return items whose Major ID merely contains those words.
 */
function findItemsByMajorId(items: Item[], query: string): Item[] {
    const wanted = normalizeMajorIdQuery(query)
    if (wanted === "") {
        return []
    }

    const exact = items.filter((item) =>
        extractMajorIds(item).some((majorId) => equalsQuery(majorId, wanted))
    )
    if (exact.length > 0) {
        return exact
    }

    return items.filter((item) =>
        extractMajorIds(item).some((majorId) => matchesQuery(majorId, wanted))
    )
}

/*
 * Looks up what matching Major IDs do. Returns { majorId -> description },
 * keeping each Major ID separate so different effects aren't blended together.
 * An exact name match wins over partial matches.
 */
function findMajorIdDescriptions(items: Item[], query: string): Map<string, string> {
    const wanted = normalizeMajorIdQuery(query)
    const found = new Map<string, string>()
    if (wanted === "") {
        return found
    }

    for (const item of items) {
        for (const [majorId, description] of Object.entries(getMajorIdMap(item))) {
            if (!matchesQuery(majorId, wanted)) {
                continue
            }
            if (!found.has(majorId) || found.get(majorId) === "") {
                found.set(majorId, description)
            }
        }
    }

    const exact = new Map([...found].filter(([majorId]) => equalsQuery(majorId, wanted)))
    return exact.size > 0 ? exact : found
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

/* Short version of an item: SUMMARY_FIELDS plus its Major IDs joined into one string. */
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

/* Submenu option 1: prints the unique Major ID count and the item count. */
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
    console.log(`Items with a Major ID (${itemsWithIds.length}):`)
    console.log(JSON.stringify(itemsWithIds.map(summarizeItem), null, 2))
}

/* Submenu option 2: prints what each matching Major ID does. */
function printMajorIdDetails(items: Item[], query: string): void {
    const descriptions = findMajorIdDescriptions(items, query)

    if (descriptions.size === 0) {
        console.log(`No items found for Major ID "${query}".`)
        return
    }

    clearScreen()
    for (const [majorId, description] of [...descriptions].sort(([a], [b]) => compareNatural(a, b))) {
        console.log(`Major ID: "${majorId}"`)
        console.log(`  What it does: ${description === "" ? "(no description available)" : description}\n`)
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
    console.log(`Items matching Major ID "${query}" (${matches.length}):`)
    console.log(JSON.stringify(matches.map(summarizeItem), null, 2))
}

/* Runs the Major ID submenu. Choosing "5" returns without a pause. */
async function viewMajorIds(rl: QuestionInterface, items: Item[]): Promise<void> {
    console.log("\nChoose an option:")
    console.log("1. Count unique Major IDs and items that have one")
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
            if (normalizeMajorIdQuery(query) === "") {
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
            if (normalizeMajorIdQuery(query) === "") {
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
    return items.filter((item) => normalizeQuery(getText(item, "type") ?? "") === "tome")
}

/* Returns the tome family (subType) for one item, or "unknown" when absent. */
function getTomeFamily(item: Item): string {
    return getText(item, "subType") ?? "unknown"
}

/* Human-readable label for each tome family. */
function getTomeFamilyLabel(family: string): string {
    return TOME_FAMILY_LABELS.get(family) ?? family
}

/* The player cap / restriction for a tome family, if known. */
function getTomeCap(family: string): number | undefined {
    return TOME_FAMILY_CAPS.get(family)
}

/*
 * Extracts the identifications of a tome. Each entry is either a stat block
 * ({ min, raw, max }) or a plain number (a fixed value, shown as raw).
 * Anything else is skipped.
 */
function getTomeIdentifications(item: Item): TomeIdentification[] {
    const identifications = item.identifications
    if (!isObject(identifications)) {
        return []
    }

    const results: TomeIdentification[] = []

    for (const [name, value] of Object.entries(identifications)) {
        if (typeof value === "number") {
            results.push({ name, min: undefined, raw: String(value), max: undefined })
            continue
        }

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
function countTomesByFamily(tomes: Item[]): Map<string, number> {
    const counts = new Map<string, number>()

    for (const item of tomes) {
        const family = getTomeFamily(item)
        counts.set(family, (counts.get(family) ?? 0) + 1)
    }

    return counts
}

/* Finds tome items matching a search query (by name, then exact ID). */
function findTomes(items: Item[], query: string): Item[] {
    return findItems(getTomes(items), query)
}

/* Prints a readable summary of one tome. */
function printTomeDetails(item: Item): void {
    const family = getTomeFamily(item)
    const cap = getTomeCap(family)

    console.log(`  displayName: ${getText(item, "displayName") ?? "Unknown tome"}`)
    console.log(`  internalName: ${getText(item, "internalName") ?? "Unknown"}`)
    console.log(`  type: ${getText(item, "type") ?? "unknown"}`)
    console.log(`  subType: ${getText(item, "subType") ?? "unknown"}`)
    console.log(`  tier: ${getText(item, "tier") ?? "unknown"}`)
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
    const counts = countTomesByFamily(tomes)

    clearScreen()
    console.log(`Tomes received: ${tomes.length}`)

    const sorted = [...counts.entries()].sort(([left], [right]) => compareNatural(left, right))

    for (const [family, total] of sorted) {
        const cap = getTomeCap(family)
        const capText = cap !== undefined ? ` (cap: ${cap})` : ""
        console.log(`  ${getTomeFamilyLabel(family)} (${family})${capText}: ${total}`)
    }
}

/* Submenu option 2: list every individual tome under its family. */
function printTomeCatalog(items: Item[]): void {
    const tomes = getTomes(items)

    clearScreen()
    console.log("Tome catalog:")

    if (tomes.length === 0) {
        console.log("  No tomes found.")
        return
    }

    const byFamily = new Map<string, Item[]>()
    for (const tome of tomes) {
        const family = getTomeFamily(tome)
        const list = byFamily.get(family) ?? []
        list.push(tome)
        byFamily.set(family, list)
    }

    const sortKey = (tome: Item): string =>
        (getText(tome, "displayName") ?? getText(tome, "internalName") ?? "").toLowerCase()

    for (const family of [...byFamily.keys()].sort(compareNatural)) {
        const cap = getTomeCap(family)
        console.log(`\n  ${getTomeFamilyLabel(family)} (${family})${cap !== undefined ? ` [cap ${cap}]` : ""}`)

        const sortedTomes = [...(byFamily.get(family) ?? [])].sort((left, right) =>
            sortKey(left).localeCompare(sortKey(right))
        )

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

/* Runs the main menu until the user quits; always closes readline afterwards. */
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

/* Loads the items, makes sure there are some, then starts the menu. */
async function main(): Promise<void> {
    const forceRefresh = process.argv.includes("--refresh")
    const payload = await loadPayload(forceRefresh)
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