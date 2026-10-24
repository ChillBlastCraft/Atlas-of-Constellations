# Wynncraft Data Project Roadmap

## Project Goal

Build a TypeScript project that retrieves Wynncraft game data from its API and organizes it into useful lists and summaries.

## Current Focus

- [x] Set up Node.js and TypeScript.
- [x] Create and run `src/index.ts`.
- [x] Connect to the Wynncraft API.
- [x] Work on **API → Items** first.

# API

## Items — Complete

### Item Database

**Goal:** Request the item database and inspect the returned data before deciding how to count it.

- Endpoint: `GET /v3/item/database?fullResult`
- First inspect the response and one example item.
- Confirm which fields represent the item ID, name, rarity, and category.
- Use the API’s actual field names and values; don’t assume them in advance.

### Item Counts

- [x] Request the item data and check for request errors.
- [x] Determine the total number of returned items.
- [x] Count items by rarity.
- [x] Count items by category.
- [x] Count rarities within each category.
- [x] Check how items with missing or unfamiliar values should be counted.

**Example report:**

- All items: 200
  - Normal: 15
  - Unique: 20
  - Rare: 35
- Chestplates: 75
  - Normal: 5
  - Unique: 10
  - Rare: 2

---

### Major IDs — In Progress

**Goal:** Request `ITEM_DATABASE_URL` and return data about Major IDs. 

- Endpoint: `GET /v3/item/database?fullResult`

### Major ID Menu

- [x] Add a new top-level menu item: `3. View Major IDs Data`.
- [x] Request the count of all unique Major IDs and the number of items that have a Major ID.
- [x] Request data about a Major ID without including its flavour text markup.
- [x] Request a list of all items with a Major ID.
- [x] Request all items with a specific Major ID.

**Example sub-menu:**

1. Count unique Major IDs and items with a Major ID.
2. Request data about a Major ID.
3. Request a list of all items with a Major ID.
4. Request all items that have a specific Major ID.

---

### Tomes — Planned

**Goal:** Build a Tome explorer that can request tome data from the Wynncraft API and present it in a useful, readable way.

- Inspect the actual item database entries for tomes and determine which fields identify a tome, its type, and its effect.
- Decide how to group and count tomes reliably instead of guessing based only on item names.
- Add a Tome menu alongside the existing item/major-ID tools.

  #### Confirmed Tome API Findings

  From the API data so far:

  - Tomes are normal items with `type: "tome"`.
  - The `subType` varies by tome family, including examples such as `armour_tome`, `weapon_tome`, `marathon_tome`, `expertise_tome`, `mysticism_tome`, `lootrunning_tome`, and `guild_tome`.
  - The tome's "effect" is not a single descriptive text field. Instead, the useful data is stored under `identifications`.
  - Each identification is a nested object, not a flat string list. For example:

  ```json
  "identifications": {
    "rawHealth": {
      "min": 90,
      "raw": 300,
      "max": 390
    },
    "earthDefence": {
      "min": 3,
      "raw": 9,
      "max": 12
    }
  }
  ```

  This means the tome's actual meaning is best understood as a package of identification values, each with a minimum, current/raw value, and maximum.

  #### Tome Families and Caps

  The current data suggests that tome families are constrained by how many of each family a player can have at a time:

  - 4 armour tomes
  - 2 weapon tomes
  - 2 marathon tomes
  - 2 expertise tomes
  - 2 mysticism tomes
  - 1 lootrunning tome
  - 1 guild tome

  These are likely the important "family" or "restriction" categories for the data model and should be treated as a core part of the tome summary.

  #### Proposed Tome Menu

  1. Count all tome entries and group them by `subType` / tome family.
  2. List all tome families and their display names.
  3. View a single tome and show:
     - name / internal name
     - `type` and `subType`
     - tier
     - list of identifications and their `min` / `raw` / `max` values
     - any family restriction or cap that applies
  4. Search tomes by name, internal name, or identification label.
  5. Compare multiple tome families side-by-side.

  #### What to Display for Each Tome

  For each tome entry, the tool should ideally show:

  - Tome name and internal name
  - Tome family (`armour_tome`, `weapon_tome`, etc.)
  - Tier / rarity
  - A readable summary of the identifications it contains
  - The `min` / `raw` / `max` values for each identifying stat
  - The player cap / restriction for that tome family

---

## AT — Planned

*Keep this label from the project sketch for now; define its exact scope later.*

### Aspects — Planned

### Mappings — Planned

### Classes — Planned
