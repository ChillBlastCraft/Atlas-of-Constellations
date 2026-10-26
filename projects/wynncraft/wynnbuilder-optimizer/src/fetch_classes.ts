/*
 * Wynncraft Class Explorer
 *
 * 1. Loads the class database from a local cache if it is fresh,
 *    otherwise from the Wynncraft API.
 * 2. Shows a menu with options to list all classes, inspect one in detail,
 *    and view the project-defined metadata and API-derived archetypes.
 *
 * Run it with:            npx tsx src/fetch_classes.ts
 * Force a fresh download: npx tsx src/fetch_classes.ts --refresh
 *
 * File layout (sections are ordered for readability; function declarations are
 * hoisted, so a section may call a function defined further down):
 *   1. Constants
 *   2. Types
 *   3. Basic helpers
 *   4. Terminal helpers
 *   5. Data loading
 *   6. Class summary
 *   7. Menu
 *   8. Main program
 */

import fs = require("node:fs/promises")
import os = require("node:os")
import path = require("node:path")
import readline = require("node:readline/promises")

/* ========================================================================
 * 1. CONSTANTS
 * ======================================================================== */

const CLASS_DATABASE_URL = "https://api.wynncraft.com/v3/classes"
const ABILITY_TREE_URL = "https://api.wynncraft.com/v3/ability/tree"

/* The class data is small, so a short timeout is still okay, but keep it consistent. */
const REQUEST_TIMEOUT_MS = 30_000

/* Downloaded data is saved here so that repeat runs do not re-download it. */
const CACHE_FILE = path.join(os.tmpdir(), "wynncraft-class-cache.json")

/* How long saved data is trusted. Pass --refresh to ignore this and re-download. */
const CACHE_MAX_AGE_MS = 6 * 60 * 60 * 1000 // 6 hours

const EXPECTED_CLASS_KEYS = ["archer", "warrior", "assassin", "mage", "shaman"] as const

/* Project-managed metadata not exposed by the official /v3/classes endpoint. */
const CLASS_METADATA: Record<string, {
    weaponType: string
    baseResistance: number
    notes: string
}> = {
    archer: {
        weaponType: "bow",
        baseResistance: 70,
        notes: "Class base resistance is project-defined from the wiki and is not exposed by the public class API.",
    },
    warrior: {
        weaponType: "spear",
        baseResistance: 100,
        notes: "Class base resistance is project-defined from the wiki and is not exposed by the public class API.",
    },
    assassin: {
        weaponType: "dagger",
        baseResistance: 100,
        notes: "Class base resistance is project-defined from the wiki and is not exposed by the public class API.",
    },
    mage: {
        weaponType: "wand",
        baseResistance: 80,
        notes: "Class base resistance is project-defined from the wiki and is not exposed by the public class API.",
    },
    shaman: {
        weaponType: "relik",
        baseResistance: 60,
        notes: "Class base resistance is project-defined from the wiki and is not exposed by the public class API.",
    },
}

/* ========================================================================
 * 2. TYPES
 * ======================================================================== */

type ClassSummary = {
    key: string
    name: string
    weaponType: string
    baseResistance: number
    archetypes: string[]
    notes: string
}

type ArchetypeEntry = {
    key: string
    name: string
    description: string
}

type JsonObject = Record<string, unknown>

type QuestionInterface = {
    question: (prompt: string) => Promise<string> | string
    close: () => void
}

/* ========================================================================
 * 3. BASIC HELPERS
 * ======================================================================== */

/* Is this value a plain object? (Not null, not an array.) */
function isObject(value: unknown): value is JsonObject {
    return typeof value === "object" && value !== null && !Array.isArray(value)
}

/* Removes HTML-like tags and decodes named entities. */
function stripMarkup(value: string): string {
    return value
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/\s+/g, " ")
        .trim()
}

/* Returns an object as a list of pairs, or throws for an invalid payload. */
function extractClassEntries(payload: unknown): [string, JsonObject][] {
    if (!isObject(payload)) {
        throw new Error("Invalid payload: expected a JSON object keyed by class name.")
    }

    const entries = Object.entries(payload)
    if (entries.length === 0) {
        throw new Error("No classes found in the API response.")
    }

    return entries.map(([key, value]) => {
        if (!isObject(value)) {
            throw new Error(`Invalid class entry for "${key}": expected a JSON object.`)
        }
        return [key, value]
    })
}

/* Trims and lowercases a search string so "  Warrior " matches "warrior". */
function normalizeQuery(input: string): string {
    return input.trim().toLowerCase()
}

/* Does `value` contain `wanted`? `wanted` must already be normalized. */
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

/* Parses JSON text. Returns undefined if the text isn't valid JSON. */
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
        return undefined
    }
}

/* Saves the raw API response. A failure here is not fatal: the program works without a cache. */
async function writeCache(text: string): Promise<void> {
    try {
        await fs.writeFile(CACHE_FILE, text)
    } catch (error) {
        console.log(`(Could not save the class cache: ${error instanceof Error ? error.message : String(error)})`)
    }
}

/*
 * Loads the API response:
 *   1. Use the saved copy if it is fresh (skipped with --refresh).
 *   2. Otherwise download it and save a copy.
 *   3. If the download fails but an older copy exists, use that instead.
 */
async function loadClassPayload(forceRefresh: boolean): Promise<unknown> {
    if (!forceRefresh) {
        const cached = await readCache(false)
        if (cached !== undefined) {
            console.log("Using saved class data (run with --refresh to download it again).")
            return cached
        }
    }

    console.log("Requesting class database (this can take a while)...")

    try {
        const text = await fetchText(CLASS_DATABASE_URL)
        const payload = JSON.parse(text)
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

/* Fetches the archetype list for one class from /v3/ability/tree/[class]. */
async function loadArchetypes(classKey: string): Promise<ArchetypeEntry[]> {
    const url = `${ABILITY_TREE_URL}/${classKey}`

    try {
        const text = await fetchText(url)
        const payload = tryParseJson(text)

        if (!isObject(payload)) {
            return []
        }

        const archetypes = payload.archetypes
        if (!isObject(archetypes)) {
            return []
        }

        return Object.entries(archetypes)
            .map(([key, value]) => {
                if (!isObject(value)) {
                    return undefined
                }

                const rawName = typeof value.name === "string" ? value.name : key
                const description = typeof value.description === "string" ? value.description : ""

                return {
                    key,
                    name: stripMarkup(rawName),
                    description: stripMarkup(description),
                }
            })
            .filter((entry): entry is ArchetypeEntry => entry !== undefined)
    } catch {
        return []
    }
}

/* ========================================================================
 * 6. CLASS SUMMARY
 * ======================================================================== */

/* Turns the API payload into a clean list of class summaries. */
function extractClasses(payload: unknown): ClassSummary[] {
    return extractClassEntries(payload).map(([key, value]) => {
        const name = typeof value.name === "string" ? value.name : key
        const metadata = CLASS_METADATA[key] ?? {
            weaponType: "unknown",
            baseResistance: 0,
            notes: "Class base resistance is project-defined, because the public class API does not expose it.",
        }

        return {
            key,
            name,
            weaponType: metadata.weaponType,
            baseResistance: metadata.baseResistance,
            archetypes: [],
            notes: metadata.notes,
        }
    })
}

/* Finds one class by key. */
function getClassByKey(classes: ClassSummary[], key: string): ClassSummary | undefined {
    return classes.find((entry) => entry.key === key)
}

/* Finds classes matching the user's input by key or display name. */
function findClasses(classes: ClassSummary[], query: string): ClassSummary[] {
    const wanted = normalizeQuery(query)
    if (wanted === "") {
        return []
    }

    const exact = classes.filter((entry) =>
        equalsQuery(entry.key, wanted) || equalsQuery(entry.name, wanted)
    )

    if (exact.length > 0) {
        return exact
    }

    return classes.filter((entry) =>
        matchesQuery(entry.key, wanted) || matchesQuery(entry.name, wanted)
    )
}

/* Adds the archetype list and metadata to each class summary. */
async function enrichClasses(classes: ClassSummary[]): Promise<ClassSummary[]> {
    const enriched = [...classes]

    for (const entry of enriched) {
        const archetypes = await loadArchetypes(entry.key)

        entry.archetypes = archetypes.map((archetype) => archetype.name)

        const metadata = CLASS_METADATA[entry.key]
        if (metadata) {
            entry.weaponType = metadata.weaponType
            entry.baseResistance = metadata.baseResistance
            entry.notes = metadata.notes
        }
    }

    return enriched
}

/* Prints the list of all classes. */
function printClassList(classes: ClassSummary[]): void {
    console.clear()
    console.log("Classes:")

    for (const key of EXPECTED_CLASS_KEYS) {
        const entry = getClassByKey(classes, key)
        if (entry) {
            console.log(`  - ${entry.name} (${entry.key})`)
        }
    }
}

/* Prints the details for a specific class. */
function printClassDetails(classEntry: ClassSummary): void {
    console.clear()
    console.log(`Class key: ${classEntry.key}`)
    console.log(`Display name: ${classEntry.name}`)
    console.log(`Weapon type: ${classEntry.weaponType}`)
    console.log(`Class base resistance: ${classEntry.baseResistance}%`)
    console.log("Archetypes:")

    if (classEntry.archetypes.length === 0) {
        console.log("  - no archetypes were returned by the API")
    } else {
        for (const archetype of classEntry.archetypes) {
            console.log(`  - ${archetype}`)
        }
    }

    console.log(`Notes: ${classEntry.notes}`)
}

/* Prints a raw JSON summary of all classes. */
function printClassJson(classes: ClassSummary[]): void {
    console.log(JSON.stringify(classes, null, 2))
}

/* ========================================================================
 * 7. MENU
 * ======================================================================== */

/* Shows the menu options. */
function printMenu(): void {
    console.log("Choose an option:")
    console.log("1. List of Classes")
    console.log("2. Detailed Information About a Specific Class")
    console.log("3. View Raw JSON")
    console.log("4. Quit")
}

/* Runs the class menu. */
async function runMenu(rl: QuestionInterface, classes: ClassSummary[]): Promise<void> {
    let isRunning = true

    while (isRunning) {
        clearScreen()
        printMenu()
        const choice = (await rl.question("Select an option: ")).trim()

        switch (choice) {
            case "1":
                printClassList(classes)
                await returnToMenu(rl)
                break
            case "2": {
                const query = (await rl.question("\nEnter a class name or key: ")).trim()
                if (query === "") {
                    console.log("No class entered.")
                    await returnToMenu(rl)
                    break
                }

                const matches = findClasses(classes, query)
                if (matches.length === 0) {
                    console.log(`No class found for "${query}".`)
                    await returnToMenu(rl)
                    break
                }

                const match = matches[0]
                if (!match) {
                    console.log(`No class found for "${query}".`)
                    await returnToMenu(rl)
                    break
                }

                printClassDetails(match)
                await returnToMenu(rl)
                break
            }
            case "3":
                printClassJson(classes)
                await returnToMenu(rl)
                break
            case "4":
                isRunning = false
                break
            default:
                console.log("Please enter a valid option from 1 to 4.")
                await returnToMenu(rl)
        }
    }
}

/* ========================================================================
 * 8. MAIN PROGRAM
 * ======================================================================== */

/* Loads the classes, makes sure there are some, then starts the menu. */
async function main(): Promise<void> {
    const forceRefresh = process.argv.includes("--refresh")
    const rawJson = process.argv.includes("--json")

    const payload = await loadClassPayload(forceRefresh)
    const classes = await enrichClasses(extractClasses(payload))

    if (classes.length === 0) {
        console.log("No classes found in the request.")
        return
    }

    if (rawJson) {
        printClassJson(classes)
        return
    }

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

    try {
        await runMenu(rl, classes)
    } finally {
        rl.close()
    }
}

main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
})