# Wynncraft Data Project Roadmap

## Project Goal

Build a TypeScript project that retrieves Wynncraft game data from its API and organizes it into useful lists and summaries.

## Current Focus

- [x] Set up Node.js and TypeScript.
- [x] Create and run `src/index.ts`.
- [ ] Connect to the Wynncraft API.
- [ ] Work on **API → Items** first.

# API

## Items — In Progress

### Item Database

**Goal:** Request the item database and inspect the returned data before deciding how to count it.

- Endpoint: `GET /v3/item/database?fullResult`
- First inspect the response and one example item.
- Confirm which fields represent the item ID, name, rarity, and category.
- Use the API’s actual field names and values; don’t assume them in advance.

### Item Counts

- [ ] Request the item data and check for request errors.
- [ ] Determine the total number of returned items.
- [ ] Count items by rarity.
- [ ] Count items by category.
- [ ] Count rarities within each category.
- [ ] Check how items with missing or unfamiliar values should be counted.

**Example report:**

- All items: 200
  - Normal: 15
  - Unique: 20
  - Rare: 35
- Chestplates: 75
  - Normal: 5
  - Unique: 10
  - Rare: 2

### Major IDs — Planned

- Find where Major ID data is available.
- Explore how Major IDs relate to items.
- Plan a way to list or summarize Major IDs.

### Tomes — Planned

- Find and inspect tome data.
- Decide what information should be listed or counted.

### Ingredients — Planned

- Find and inspect ingredient data.
- Decide what information should be listed or counted.

### Recipes — Planned

- Find and inspect recipe data.
- Explore how recipes relate to ingredients.

## AT — Planned

*Keep this label from the project sketch for now; define its exact scope later.*

### Aspects — Planned

### Mappings — Planned

### Classes — Planned
