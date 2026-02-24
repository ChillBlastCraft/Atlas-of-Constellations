# Wynncraft WAPI helper

Quick helper to call the Wynncraft public API (WAPI). Files added:

- `package.json` — project metadata (ESM, node>=24)
- `wapi-client.js` — exported helpers: `getPlayerStats`, `getGuild`
- `getPlayer.js` — CLI sample to fetch a player's stats

Requirements
- Node.js 24.x LTS installed (you already have v24.13.1)

Usage

Run the sample script to fetch player stats:

```powershell
node constellations/wynncraft/wynnbuilder/wapi/getPlayer.js <username>
```

Example:

```powershell
node constellations/wynncraft/wynnbuilder/wapi/getPlayer.js somePlayer
```

Notes
- This uses the built-in `fetch` available in Node 18+.
- For more endpoints add functions to `wapi-client.js`.
