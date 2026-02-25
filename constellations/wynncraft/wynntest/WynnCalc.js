async function main() {
    const response = await fetch("https://api.wynncraft.com/v3/item/database?fullResult")
    const data = await response.json()

    console.log("Top-level keys:", Object.keys(data))

    // print ONE example item so we see structure
    const firstKey = Object.keys(data)[0]
    console.log("First key:", firstKey)
    console.log("First value preview:", data[firstKey])
}

main()