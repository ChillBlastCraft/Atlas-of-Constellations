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

type AbilityNode = {
    id: string
    name: string
    description: string
    page: number
    slot: number
    coordinates: { x: number; y: number }
    requirements: Record<string, unknown>
    links: string[]
    locks: string[]
    archetype: string
    nodeColor: "green" | "white" | "yellow" | "purple" | "blue" | "red" | "ultimate" | "other"
    abilityCost: number
}

type RelevanceNodes = {
    directDependencies: AbilityNode[]
    dependentNodes: AbilityNode[]
    sameCategory: AbilityNode[]
    sameArchetype: AbilityNode[]
}

type AbilityTreeSummary = {
    classKey: string
    nodes: AbilityNode[]
    byId: Map<string, AbilityNode>
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
    const temporaryFile = `${CACHE_FILE}.${process.pid}.tmp`
    try {
        await fs.writeFile(temporaryFile, text)
        await fs.rename(temporaryFile, CACHE_FILE)
    } catch (error) {
        console.log(`(Could not save the class cache: ${error instanceof Error ? error.message : String(error)})`)
        await fs.rm(temporaryFile, { force: true }).catch(() => undefined)
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

                let description
                if (typeof value.description === "string") {
                    description = value.description
                } else {
                    description = ""
                }

                return {
                    key,
                    name: key,
                    description: stripMarkup(description),
                }
            })
            .filter((entry): entry is ArchetypeEntry => entry !== undefined)
    } catch (error) {
        console.warn(
            `Could not load archetypes for "${classKey}": ${error instanceof Error ? error.message : String(error)}`
        )
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
    return Promise.all(classes.map(async (entry) => {
        const archetypes = await loadArchetypes(entry.key)
        return {
            ...entry,
            archetypes: archetypes.map((archetype) => archetype.key),
        }
    }))
}

function extractExplicitArchetype(requirements: Record<string, unknown> | undefined): string | undefined {
    if (!requirements || !Object.prototype.hasOwnProperty.call(requirements, "ARCHETYPE")) {
        return undefined
    }

    const rawValue = requirements.ARCHETYPE
    if (!isObject(rawValue)) {
        return undefined
    }

    const internalKey = typeof rawValue.key === "string" ? rawValue.key.trim() : ""
    if (internalKey !== "") {
        return internalKey
    }

    const name = typeof rawValue.name === "string" ? rawValue.name.trim() : ""
    return name !== "" ? name : undefined
}

function resolveArchetypeFromNodeChain(
    nodeId: string,
    nodeMap: Map<string, AbilityNode>,
    visited = new Set<string>()
): string | undefined {
    if (visited.has(nodeId)) {
        return undefined
    }
    visited.add(nodeId)

    const node = nodeMap.get(nodeId)
    if (!node) {
        return undefined
    }

    const explicit = extractExplicitArchetype(node.requirements)
    if (explicit) {
        return explicit
    }

    const parentIds = Array.isArray(node.requirements.NODE)
        ? node.requirements.NODE.filter((value): value is string => typeof value === "string")
        : []

    for (const parentId of parentIds) {
        const resolved = resolveArchetypeFromNodeChain(parentId, nodeMap, visited)
        if (resolved) {
            return resolved
        }
    }

    return undefined
}

function inferArchetypeNodeGroup(nodeId: string, rawNode: JsonObject, nodeMap: Map<string, AbilityNode>): string {
    const requirements = isObject(rawNode.requirements) ? rawNode.requirements : {}
    const explicit = extractExplicitArchetype(requirements)
    if (explicit) {
        return explicit
    }

    const parentIds = isObject(rawNode.requirements)
        ? (Array.isArray(rawNode.requirements.NODE)
            ? rawNode.requirements.NODE.filter((value): value is string => typeof value === "string")
            : [])
        : []

    for (const parentId of parentIds) {
        const resolved = resolveArchetypeFromNodeChain(parentId, nodeMap)
        if (resolved) {
            return resolved
        }
    }

    return "archetypeless"
}

function extractNodeColor(rawName: string): AbilityNode["nodeColor"] {
    const colorMatch = rawName.match(/color:\s*(#[0-9A-Fa-f]{3,8})/i)
    if (!colorMatch) {
        return "other"
    }

    const color = colorMatch[1]
    if (color === undefined) {
        return "other"
    }

    const hex = color.toLowerCase()
    const green = ["#87dd47", "#7ae77a", "#4caf50"]
    const white = ["#ffffff", "#aaaaaa", "#d9d9d9", "#f0f0f0"]
    const yellow = ["#ffe14d", "#f0c435", "#ffaa00", "#ffd452", "#f3c75a"]
    const purple = ["#f747c2", "#ac22ac", "#c54bff", "#b34cff"]
    const blue = ["#99e9ff", "#5eb3ff", "#2a9dff", "#70d6ff"]
    const red = ["#ff4545", "#ff5555", "#ff6b6b", "#ff7a59"]
    const ultimate = ["#a66fff", "#8a6cff", "#b07cff"]

    if (green.includes(hex)) return "green"
    if (white.includes(hex)) return "white"
    if (yellow.includes(hex)) return "yellow"
    if (purple.includes(hex)) return "purple"
    if (blue.includes(hex)) return "blue"
    if (red.includes(hex)) return "red"
    if (ultimate.includes(hex)) return "ultimate"

    const rgb = hex.replace("#", "")
    const normalized = rgb.length === 3
        ? rgb.split("").map((char) => char + char).join("")
        : rgb

    const r = Number.parseInt(normalized.slice(0, 2), 16)
    const g = Number.parseInt(normalized.slice(2, 4), 16)
    const b = Number.parseInt(normalized.slice(4, 6), 16)
    const brightness = (r + g + b) / 3
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const saturation = max > 0 ? (max - min) / max : 0

    if (brightness > 180 && saturation < 0.2) return "white"
    if (g >= r && g >= b && saturation > 0.12) return "yellow"
    if (r >= g && r >= b && saturation > 0.2) return "red"
    if (b >= r && b >= g && saturation > 0.18) return "blue"
    if (g > r && r > b && saturation > 0.2) return "green"
    if (max > 180 && brightness > 140 && saturation > 0.25) return "purple"

    return "other"
}

function classifyNode(nodeId: string, rawNode: JsonObject, nodeMap: Map<string, AbilityNode>): { archetype: string; nodeColor: AbilityNode["nodeColor"] } {
    const rawName = typeof rawNode.name === "string" ? rawNode.name : nodeId
    return {
        archetype: inferArchetypeNodeGroup(nodeId, rawNode, nodeMap),
        nodeColor: extractNodeColor(rawName),
    }
}

function buildAbilityTreeSummary(classKey: string, payload: unknown): AbilityTreeSummary {
    if (!isObject(payload)) {
        throw new Error(`Invalid ability-tree payload for class "${classKey}".`)
    }

    const pages = payload.pages
    if (!isObject(pages)) {
        throw new Error(`Ability tree for "${classKey}" does not contain a "pages" object.`)
    }

    const nodes: AbilityNode[] = []
    const byId = new Map<string, AbilityNode>()
    const rawNodesById = new Map<string, JsonObject>()

    for (const [pageIndex, rawPage] of Object.entries(pages)) {
        if (!isObject(rawPage)) {
            continue
        }

        for (const [nodeId, rawNode] of Object.entries(rawPage)) {
            if (!isObject(rawNode)) {
                continue
            }

            const rawName = typeof rawNode.name === "string" ? rawNode.name : nodeId
            const provisionalNode: AbilityNode = {
                id: nodeId,
                name: stripMarkup(rawName),
                description: "",
                page: Number(pageIndex),
                slot: typeof rawNode.slot === "number" ? rawNode.slot : 0,
                coordinates: {
                    x: isObject(rawNode.coordinates) && typeof rawNode.coordinates.x === "number" ? rawNode.coordinates.x : 0,
                    y: isObject(rawNode.coordinates) && typeof rawNode.coordinates.y === "number" ? rawNode.coordinates.y : 0,
                },
                requirements: isObject(rawNode.requirements) ? { ...rawNode.requirements } : {},
                links: Array.isArray(rawNode.links)
                    ? rawNode.links.filter((value): value is string => typeof value === "string")
                    : [],
                locks: Array.isArray(rawNode.locks)
                    ? rawNode.locks.filter((value): value is string => typeof value === "string")
                    : [],
                archetype: "archetypeless",
                nodeColor: "other",
                abilityCost: 0,
            }
            byId.set(nodeId, provisionalNode)
            rawNodesById.set(nodeId, rawNode)
            nodes.push(provisionalNode)
        }
    }

    for (const node of nodes) {
        const rawNode = rawNodesById.get(node.id)
        if (!rawNode) {
            continue
        }

        const requirements: Record<string, unknown> = isObject(rawNode.requirements) ? { ...rawNode.requirements } : {}

        let descriptionText = ""
        if (Array.isArray(rawNode.description)) {
            descriptionText = rawNode.description.join(" ")
        } else if (typeof rawNode.description === "string") {
            descriptionText = rawNode.description
        }

        const classification = classifyNode(node.id, rawNode, byId)
        const rawAbilityCost = isObject(rawNode.requirements)
            ? rawNode.requirements.ABILITY_POINTS
            : undefined
        const parsedAbilityCost = typeof rawAbilityCost === "number"
            ? rawAbilityCost
            : typeof rawAbilityCost === "string" && rawAbilityCost.trim() !== ""
                ? Number(rawAbilityCost)
                : 0
        const abilityCost = Number.isFinite(parsedAbilityCost) ? parsedAbilityCost : 0

        node.description = stripMarkup(descriptionText)
        node.requirements = requirements
        node.links = Array.isArray(rawNode.links)
            ? rawNode.links.filter((value): value is string => typeof value === "string")
            : []
        node.locks = Array.isArray(rawNode.locks)
            ? rawNode.locks.filter((value): value is string => typeof value === "string")
            : []
        node.archetype = classification.archetype
        node.nodeColor = classification.nodeColor
        node.abilityCost = abilityCost
    }

    return {
        classKey,
        nodes,
        byId,
    }
}

async function loadAbilityTree(classKey: string, forceRefresh: boolean): Promise<AbilityTreeSummary> {
    const url = `${ABILITY_TREE_URL}/${classKey}`
    const cacheFile = path.join(os.tmpdir(), `wynncraft-ability-tree-${classKey}.json`)
    let stalePayload: unknown

    try {
        const stats = await fs.stat(cacheFile)
        const cached = await fs.readFile(cacheFile, "utf8")
        const parsed = tryParseJson(cached)

        if (parsed !== undefined) {
            stalePayload = parsed
            const isFresh = Date.now() - stats.mtimeMs <= CACHE_MAX_AGE_MS
            if (!forceRefresh && isFresh) {
                return buildAbilityTreeSummary(classKey, parsed)
            }
        }
    } catch {
        // Ignore missing/unreadable cache and fetch live data instead.
    }

    try {
        const text = await fetchText(url)
        const payload = tryParseJson(text)
        if (payload === undefined) {
            throw new Error(`No valid JSON was returned for class tree "${classKey}".`)
        }

        // Write atomically so an interrupted write cannot leave a truncated cache.
        try {
            const temporaryFile = `${cacheFile}.${process.pid}.tmp`
            await fs.writeFile(temporaryFile, text)
            await fs.rename(temporaryFile, cacheFile)
        } catch {
            // Caching is optional; the fetched data can still be used.
        }
        return buildAbilityTreeSummary(classKey, payload)
    } catch (error) {
        if (stalePayload !== undefined) {
            console.warn(
                `Could not refresh ability tree for "${classKey}" (${error instanceof Error ? error.message : String(error)}); using cached data.`
            )
            return buildAbilityTreeSummary(classKey, stalePayload)
        }
        throw error
    }
}

function findAbilityTreeNodes(tree: AbilityTreeSummary, query: string): AbilityNode[] {
    const wanted = normalizeQuery(query)
    if (wanted === "") {
        return []
    }

    const exact = tree.nodes.filter((entry) =>
        normalizeQuery(entry.id) === wanted || normalizeQuery(entry.name) === wanted
    )
    if (exact.length > 0) {
        return exact
    }

    return tree.nodes.filter((entry) =>
        normalizeQuery(entry.id).includes(wanted) || normalizeQuery(entry.name).includes(wanted)
    )
}

function getRelevanceNodes(tree: AbilityTreeSummary, target: AbilityNode): RelevanceNodes {
    const sameCategory = tree.nodes.filter((entry) =>
        entry.id !== target.id && entry.nodeColor === target.nodeColor && entry.nodeColor !== "other"
    )
    const sameArchetype = tree.nodes.filter((entry) =>
        entry.id !== target.id && entry.archetype === target.archetype && entry.archetype !== "archetypeless"
    )
    const directDependencies = target.links
        .map((linkedId) => tree.byId.get(linkedId))
        .filter((entry): entry is AbilityNode => entry !== undefined)
    const dependentNodes = tree.nodes.filter((entry) =>
        entry.id !== target.id && entry.links.includes(target.id)
    )

    return {
        directDependencies,
        dependentNodes,
        sameCategory,
        sameArchetype,
    }
}

function getRequirementChain(tree: AbilityTreeSummary, target: AbilityNode): AbilityNode[] {
    const visited = new Set<string>()
    const queue: string[] = [...target.links]
    const chain: AbilityNode[] = []

    for (let index = 0; index < queue.length; index++) {
        const id = queue[index]
        if (!id || visited.has(id)) {
            continue
        }
        visited.add(id)
        const nextNode = tree.byId.get(id)
        if (!nextNode) {
            continue
        }
        chain.push(nextNode)
        for (const linked of nextNode.links) {
            if (!visited.has(linked)) {
                queue.push(linked)
            }
        }
    }

    return chain
}

function printAbilityTreeNodeDetails(tree: AbilityTreeSummary, node: AbilityNode): void {
    const relevance = getRelevanceNodes(tree, node)
    const requirementChain = getRequirementChain(tree, node)
    console.log(`Ability tree for ${tree.classKey}:`)
    console.log(`Node ID: ${node.id}`)
    console.log(`Name: ${node.name}`)
    console.log(`Node color: ${node.nodeColor}`)
    console.log(`Ability cost: ${node.abilityCost} AP`)
    console.log(`Archetype: ${node.archetype === "archetypeless" ? "archetypeless" : node.archetype}`)
    console.log(`Page: ${node.page}`)
    console.log(`Slot: ${node.slot}`)
    console.log(`Coordinates: x=${node.coordinates.x}, y=${node.coordinates.y}`)
    console.log(`Description: ${node.description || "No description provided."}`)

    if (Object.keys(node.requirements).length > 0) {
        console.log("Requirements:")
        for (const [key, value] of Object.entries(node.requirements)) {
            const renderedValue = value !== null && typeof value === "object"
                ? JSON.stringify(value)
                : String(value)
            console.log(`  - ${key}: ${renderedValue}`)
        }
    } else {
        console.log("Requirements: none")
    }

    if (node.links.length > 0) {
        console.log(`Connected nodes: ${node.links.join(", ")}`)
    } else {
        console.log("Connected nodes: none")
    }

    if (node.locks.length > 0) {
        console.log(`Locks: ${node.locks.join(", ")}`)
    }

    if (requirementChain.length === 0) {
        console.log("Requirement chain: none")
    } else {
        console.log("Requirement chain:")
        for (const entry of requirementChain) {
            console.log(`  - ${entry.name} (${entry.id})`)
        }
    }

    console.log("\nRelevance nodes:")
    if (relevance.directDependencies.length === 0) {
        console.log("  - Direct dependencies: none")
    } else {
        console.log("  - Direct dependencies:")
        for (const entry of relevance.directDependencies) {
            console.log(`      • ${entry.name} (${entry.id})`)
        }
    }

    if (relevance.dependentNodes.length === 0) {
        console.log("  - Dependents: none")
    } else {
        console.log("  - Dependents:")
        for (const entry of relevance.dependentNodes) {
            console.log(`      • ${entry.name} (${entry.id})`)
        }
    }

    if (relevance.sameCategory.length === 0) {
        console.log("  - Same node color: none")
    } else {
        console.log("  - Same node color:")
        for (const entry of relevance.sameCategory.slice(0, 5)) {
            console.log(`      • ${entry.name} (${entry.id})`)
        }
    }

    if (relevance.sameArchetype.length === 0) {
        console.log("  - Same archetype: none")
    } else {
        console.log("  - Same archetype:")
        for (const entry of relevance.sameArchetype.slice(0, 5)) {
            console.log(`      • ${entry.name} (${entry.id})`)
        }
    }
}

function printAbilityTreeCategories(tree: AbilityTreeSummary): void {
    const byColor = new Map<AbilityNode["nodeColor"], Map<string, AbilityNode[]>>()

    for (const node of tree.nodes) {
        const colorMap: Map<string, AbilityNode[]> = byColor.get(node.nodeColor) ?? new Map<string, AbilityNode[]>()
        const archetypeKey = node.archetype === "archetypeless" ? "archetypeless" : node.archetype
        const grouped: AbilityNode[] = colorMap.get(archetypeKey) ?? []
        grouped.push(node)
        colorMap.set(archetypeKey, grouped)
        byColor.set(node.nodeColor, colorMap)
    }

    const sortedColors = Array.from(byColor.keys()).sort((a, b) => a.localeCompare(b))

    console.log("\nTree categories:")
    for (const color of sortedColors) {
        const colorMap = byColor.get(color) ?? new Map<string, AbilityNode[]>()
        console.log(`  - ${color}:`)
        for (const [archetypeKey, nodes] of Array.from(colorMap.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
            const names = nodes.map((entry: AbilityNode) => entry.name).slice(0, 10)
            const suffix = nodes.length > names.length ? " ..." : ""
            console.log(`      • ${archetypeKey}: ${names.join(", ")}${suffix}`)
        }
    }
}

async function inspectClassAbilityTree(rl: QuestionInterface, classes: ClassSummary[], forceRefresh: boolean): Promise<void> {
    const query = (await rl.question("\nEnter a class name or key to inspect its ability tree: ")).trim()
    if (query === "") {
        console.log("No class entered.")
        return
    }

    const matches = findClasses(classes, query)
    if (matches.length === 0) {
        console.log(`No class found for "${query}".`)
        return
    }

    const match = matches[0]
    if (!match) {
        console.log(`No class found for "${query}".`)
        return
    }

    const tree = await loadAbilityTree(match.key, forceRefresh)

    while (true) {
        console.clear()
        console.log(`Ability tree for ${match.name} (${match.key})`)
        console.log(`Total nodes: ${tree.nodes.length}`)
        printAbilityTreeCategories(tree)
        console.log("\nOptions:")
        console.log("  1. Inspect a specific node")
        console.log("  2. Quit to main menu")

        const choice = (await rl.question("Choose an option: ")).trim()
        if (choice === "2") {
            return
        }
        if (choice !== "1") {
            console.log("Please choose 1 or 2.")
            await returnToMenu(rl)
            continue
        }

        const nodeQuery = (await rl.question("Search for a node ID or name: ")).trim()
        if (nodeQuery === "") {
            console.log("No node entered.")
            await returnToMenu(rl)
            continue
        }

        const nodeMatches = findAbilityTreeNodes(tree, nodeQuery)
        if (nodeMatches.length === 0) {
            console.log(`No node found for "${nodeQuery}" in the ${match.key} tree.`)
            await returnToMenu(rl)
            continue
        }

        const selected = nodeMatches[0]
        if (!selected) {
            console.log(`No node found for "${nodeQuery}" in the ${match.key} tree.`)
            await returnToMenu(rl)
            continue
        }

        console.clear()
        printAbilityTreeNodeDetails(tree, selected)
        await returnToMenu(rl)
    }
}

/* Prints the list of all classes. */
function printClassList(classes: ClassSummary[]): void {
    console.clear()
    console.log("Classes:")

    const orderedKeys = new Set<string>()
    for (const key of EXPECTED_CLASS_KEYS) {
        const entry = getClassByKey(classes, key)
        if (entry) {
            console.log(`  - ${entry.name} (${entry.key})`)
            orderedKeys.add(entry.key)
        }
    }

    for (const entry of classes) {
        if (!orderedKeys.has(entry.key)) {
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
    console.log("3. Inspect a Class Ability Tree")
    console.log("4. View Raw JSON")
    console.log("5. Quit")
}

/* Runs the class menu. */
async function runMenu(rl: QuestionInterface, classes: ClassSummary[], forceRefresh: boolean): Promise<void> {
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
                await inspectClassAbilityTree(rl, classes, forceRefresh)
                await returnToMenu(rl)
                break
            case "4":
                printClassJson(classes)
                await returnToMenu(rl)
                break
            case "5":
                isRunning = false
                break
            default:
                console.log("Please enter a valid option from 1 to 5.")
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
        await runMenu(rl, classes, forceRefresh)
    } finally {
        rl.close()
    }
}

main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
})