# Atlas-of-Constellations

## Wynnbuilder+ WAPI

`constellations/wynncraft/wynnbuilder/WynnBuilderPlus.html` now includes a minimal Wynncraft API integration layer.

Styling for this page is now externalized in:

- `constellations/wynncraft/wynnbuilder/WynnBuilderPlus.css`

Implemented files:

- `constellations/wynncraft/wynnbuilder/api/wapi-client.js`
	- `getItemMetadata()` -> `GET /v3/item/metadata`
	- `getItemDatabasePage(page)` -> `GET /v3/item/database?page=<n>`
	- `getItemDatabaseFullResult()` -> `GET /v3/item/database?fullResult`
	- `searchItems(filters)` -> `POST /v3/item/search`
	- `quickSearchItems(query)` -> `GET /v3/item/search/<query>`
- `constellations/wynncraft/wynnbuilder/wapi-app.js`
	- Adds test buttons to fetch metadata, first database page, or full item database.
	- Prints summarized results to the page for quick validation.
- `constellations/wynncraft/wynnbuilder/api/wapi_proxy.ps1`
	- Local PowerShell proxy for browser CORS fallback.
- `constellations/wynncraft/wynnbuilder/api/wapi_proxy.py`
	- Local Python proxy alternative.

This is the baseline to start:

- Building stat categories (for weighted search)
- Creating custom scoring functions
- Running automatic build optimization over filtered candidate items