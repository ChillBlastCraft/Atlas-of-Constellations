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

- [ ] Add a new top-level menu item: `3. View Major IDs Data`.
- [ ] Request the count of all unique Major IDs and the number of items that have a Major ID.
- [ ] Request data about a Major ID without including its flavour text markup.
- [ ] Request a list of all items with a Major ID.
- [ ] Request all items with a specific Major ID.

**Example sub-menu:**

1. Count unique Major IDs and items with a Major ID.
2. Request data about a Major ID.
3. Request a list of all items with a Major ID.
4. Request all items that have a specific Major ID.

---

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
