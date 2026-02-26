async function getAllItems() {
    const response = await fetch("https://api.wynncraft.com/v3/item/database?fullResult")

    if (!response.ok) {
        console.log("HTTP Error:", response.status)
        return;
    }

    const data = await response.json()

    console.log("Top-level keys:")
    console.log(Object.keys(data))
}

getAllItems()