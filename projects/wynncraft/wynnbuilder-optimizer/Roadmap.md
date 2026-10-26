# Wynncraft Data Project Roadmap

## Project Goal

Build a TypeScript project that retrieves Wynncraft game data from its API and organizes it into useful lists and summaries.

## Current Focus

- [x] Set up Node.js and TypeScript.
- [x] Create and run `src/index.ts`.
- [x] Connect to the Wynncraft API.
- [x] Work on **API → Items**.
- [x] Work on **API → Classes**.

# API

## Items — Complete

### Item Database

**Goal:** Request the item database and inspect the returned data before deciding how to count and categorize it.

- Endpoint: `GET /v3/item/database?fullResult`

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
  3. View a single tome and show by searching `internalName` or `displayName`:
     - name / internal name
     - `type` and `subType`
     - tier
     - list of identifications and their `min` / `raw` / `max` values
     - any family restriction or cap that applies

  #### What to Display for Each Tome

  For each tome entry, the tool should ideally show:

  - Tome `displayName` and `internalName`
  - Tome family (`armour_tome`, `weapon_tome`, etc.)
  - Tier / rarity
  - A readable summary of the identifications it contains
  - The `min` / `raw` / `max` values for each identifying stat
  - The player cap / restriction for that tome family

---

## Classes — Complete (api identity + archetype metadata)

**Goal:** Request the class database and inspect the returned data before deciding how to categorize and articulate it. This should not be mixed into the item API flow: the class data is a separate concept from item data, and the ability tree is a class-specific system rather than an item.

### Endpoints and findings

- Primary class identity endpoint: `GET /v3/classes`
- Archetype endpoint: `GET /v3/ability/tree/[class]`

### Class Database

- [x] Request the class list and inspect the response to confirm which fields represent the class identity and display name.
- [x] Verify that the API returns all five playable classes (`archer`, `warrior`, `assassin`, `mage`, `shaman`) and note any class-specific metadata that is available.
- [x] Decide how to model a class in code without conflating it with items, item data caches, or the item fetch workflow.
- [x] Create a dedicated TypeScript entry for class work so the class pipeline remains isolated from the item pipeline.
- [x] Confirm the public class API is minimal: it exposes only the class key, display name, and `overallDifficulty`.
- [x] Confirm the archetype list is available separately from `/v3/ability/tree/[class]`, including names and descriptions.

**Observed report:**

  - Archer (Hunter) (archer)
  - Warrior (Knight) (warrior)
  - Assassin (Ninja) (assassin)
  - Mage (Dark Wizard) (mage)
  - Shaman (Skyseer) (shaman)


### Class Characteristics — Project metadata model

- [x] Distinguish the five classes from each other using the class data itself rather than by assuming the same structure as items.
- [x] Confirm that archetypes are not part of `/v3/classes`; they are available via `/v3/ability/tree/[class]`.
- [x] Confirm that weapon type and class base resistance are not exposed by the public class API and must be kept as project-defined metadata.
- [x] Decide which traits should become normalized class fields in the project:
  - display name
  - class key
  - weapon type
  - class base resistance percentage
  - archetypes
  - notes

**Project-defined class metadata**

```ts
{
  key: string,
  name: string,
  weaponType: "bow" | "spear" | "dagger" | "wand" | "relic",
  baseResistance: 70 | 100 | 80 | 60,
  archetypes: string[],
  notes: string
}
```

**Current class defaults (project metadata):**

- Archer: weaponType = `bow`, baseResistance = `70%`
- Warrior: weaponType = `spear`, baseResistance = `100%`
- Assassin: weaponType = `dagger`, baseResistance = `100%`
- Mage: weaponType = `wand`, baseResistance = `80%`
- Shaman: weaponType = `relic`, baseResistance = `60%`

This is the current model used by the project: API fields for identity/archetypes, and manual metadata for class gameplay data that the official API does not expose.

---

## AT — In Progress

### Tree — In Progress

**Goal:** Request each class's ability tree, normalize the nodes, and expose the most useful relationships inside the project.

- [ ] Request `GET /v3/ability/tree/[class]` for all playable classes and confirm the response shape.
- [ ] Flatten each tree into a node list keyed by node ID so we can search, categorize, and inspect individual nodes.
- [ ] Categorize nodes using either the node's implicit type or the archetype requirement/association, or both.
- [ ] Add search and detail views for a specific node, including its description, AP cost and requirement chain.
- [ ] Show relevance for a node by listing other nodes that share its concept, archetype, or dependency path.
- [ ] Implement an optimal-path search that minimizes required AP to reach a target node and prints the route and total AP spent. This will require study for certain sorting algorithms.

#### Example expected workflow

1. Select a class tree, for example Shaman.
2. Choose a node such as Totem.
3. View a summary that includes the node's description and its relevance, through node requirement.
4. Search for a target node such as Invigorating Wave.
5. Compute the cheapest path to that node in AP terms, then display the route and total AP cost.
6. Optionally continue exploring each path node and record what it improves or unlocks in the build.

This is the foundation for future build optimization work because small "traveling" nodes can reduce mana cost and improve sustain, which increases the value of raw stats such as damage.

### Aspects — Not Planned