# Wynncraft — Items API quick checks
# This folder contains `getItems.js` (probe) and `categorizeItems.js` (categorize/list counts).

If you want, I can run any of these commands here and paste the output. 

## Finding Stats

- Count how many items contain a stat (case-insensitive):

```bash
node categorizeItems.js --stat <statName>
# example
node categorizeItems.js --stat manaRegen
```

- List the items that contain a specific stat (searches nested objects and is case-insensitive). Outputs JSON with `name`, `id` and `count`:

```bash
node categorizeItems.js --stat-items <statName>
# example
node categorizeItems.js --stat-items manaRegen
```

- Print a JSON map of all detected stat keys and counts:

```bash
node categorizeItems.js --stat-list
```

Notes:
- The categorizer normalizes stat/property keys to lowercase and searches nested objects (so `identifications.manaRegen` is found by `manaRegen`).
 - Rarity buckets are normalized to: `normal`, `unique`, `rare`, `set`, `legendary`, `fabled`, `mythic`, `non-rarity` (missing/unspecified), and `special` (present but unmapped/nonstandard).

## Rarity by category

- Show normalized rarity counts grouped by item category (JSON):

```bash
node categorizeItems.js --rarity-by-category
```

- Output shape: a JSON object where each top-level key is a `category` (e.g. `Accessories`, `Weapons`) and the value is a map of normalized rarities to counts. Example:

```json
{
	"Accessories": { "unique": 265, "legendary": 148, "rare": 228, "special": 84, ... },
	"Weapons": { "unique": 686, "legendary": 279, "rare": 493, ... }
}
```

Note: use `--rarity-list` for an overall rarity summary, or `node categorizeItems.js` (no flags) to write `data/items.categorized.json` and print counts + rarity breakdown.
# Wynncraft — Items API quick checks
This folder contains `getItems.js` (probe) and `categorizeItems.js` (categorize/list counts).

Below are the concise terminal commands you can use for:

a) Check whether the items API/update works
b) Check how many items are present in `data/items.json`
c) List all categories and counts (uses `categorizeItems.js`)

Endpoint to try:

- https://api.wynncraft.com/v3/item/database?fullResult

a) Check API / update probe

Use the probe script (runs the same checks as the README examples):

```sh
cd constellations/wynncraft/wynnbuilder/wapi
node getItems.js       # runs probe and writes data/items.json on success
# or via npm
npm run items
```

Direct HTTP checks:

curl (Linux/macOS/WSL or Windows with curl):

```sh
curl -sS https://api.wynncraft.com/v3/item/database?fullResult | head -n 20
# status only
curl -sS -o /dev/null -w "%{http_code}\n" https://api.wynncraft.com/v3/item/database?fullResult
```



```sh
wget -qO- https://api.wynncraft.com/v3/item/database?fullResult | head -n 20
```

PowerShell (Windows):

```powershell
# show a small JSON snippet
Invoke-RestMethod 'https://api.wynncraft.com/v3/item/database?fullResult' | ConvertTo-Json -Depth 2 | Select-Object -First 1

# status code
$r = Invoke-WebRequest 'https://api.wynncraft.com/v3/item/database?fullResult' -UseBasicParsing; $r.StatusCode
```

Node quick check (Node 18+):

```sh
node -e "(async()=>{const r=await fetch('https://api.wynncraft.com/v3/item/database?fullResult');console.log('status',r.status);const j=await r.json();console.log('items',Array.isArray(j)?j.length:Object.keys(j||{}).length);})();"
```

b) How many items are in `data/items.json`

From the `wapi` folder:

Using Node (works for array or object shapes):

```sh
cd constellations/wynncraft/wynnbuilder/wapi
node -e "const j=require('./data/items.json');console.log(Array.isArray(j)?j.length:Object.keys(j||{}).length)"
```

Using `jq` (if the file is an array):

```sh
jq 'length' data/items.json
```

If the file is an object (keys are item ids/names):

```sh
jq 'keys | length' data/items.json
```

PowerShell (Windows):

```powershell
cd constellations/wynncraft/wynnbuilder/wapi
$j = Get-Content -Raw data/items.json | ConvertFrom-Json
if ($j -is [System.Collections.IList]) { $j.Count } else { $j.PSObject.Properties.Count }
```

c) All categories + how many items in each

Use the categorizer listing (no files written):

```sh
cd constellations/wynncraft/wynnbuilder/wapi
node categorizeItems.js --list
# or via npm
npm run categories
```

To write full categorized output (creates `data/items.categorized.json`):

```sh
node categorizeItems.js    # writes data/items.categorized.json and prints counts
# overwrite the original items.json with categorized data (use with care):
node categorizeItems.js --write
# or via npm
npm run categorize
```

Notes

- GitHub Actions: this repo runs `.github/workflows/update-items.yml` daily to update `data/items.json` automatically — the action commits only when `items.json` changes.
- If many items are `UNKNOWN` in category counts, run `node categorizeItems.js --write` locally and refine `categorizeItems.js` keyword mappings to reduce UNKNOWNs.

If you want, I can run any of these commands here and paste the output. 