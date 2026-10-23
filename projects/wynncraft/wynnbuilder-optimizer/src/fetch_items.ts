const ITEM_DATABASE_URL = "https://api.wynncraft.com/v3/item/database?fullResult"
const REQUEST_TIMEOUT_MS = 10_000 // Cancel the request after 10 seconds

type UnknownObject = Record<string, unknown>
type ItemMap = Record<string, unknown>

function isObject(value: unknown): value is UnknownObject {
    return ( 
        typeof value === "object" && 
        value !== null &&
        !Array.isArray(value) 
    )
}

async function fetchJson(url: string): Promise<unknown> {
    const response = await fetch(url, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })

    if (!response.ok) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`)
    }

    return response.json()
}

function getItemKey(item: unknown, index: number): string {
    const fallBackKey = `item_${index}`
    
    if (!isObject(item)) {
        return fallBackKey
    }
    if (typeof item.internalName === "string") { 
        return item.internalName
    }
    if (typeof item.displayName === "string") {
        return item.displayName
    }

    return fallBackKey
}

function arrayToItemMap(items: unknown[]): ItemMap {
    const itemMap: ItemMap = {}

    items.forEach((item, index) => {
        const key = getItemKey(item, index)
        itemMap[key] = item
    })

    return itemMap
}

function extractItems(payload: unknown): ItemMap {
    if (Array.isArray(payload)) {
        return arrayToItemMap(payload)
    }

    if (!isObject(payload)) {
        throw new Error("Invalid payload: expected a JSON object or an array")
    }
 
    if (isObject(payload.results)) {
        return payload.results
    }

    return payload
}

function printSummary(items: ItemMap): void {
    const itemNames = Object.keys(items)
    console.log("Items received:", itemNames.length)

    const [firstName] = itemNames

    if (firstName === undefined) {
        console.log("No items found.")
        return
    }

    console.log(`1st Item: ${firstName}`)
    console.dir(items[firstName], { depth: null }) // null = show all
}

async function fetchItems(): Promise<void> {
    const payload = await fetchJson(ITEM_DATABASE_URL)
    const items = extractItems(payload)
    printSummary(items)
}

fetchItems().catch((error: unknown) => {
    console.error("Could not fecth items:", error)
    process.exit(1)
})