# Atlas of Constellations

Atlas of Constellations is a central hub for constellation-themed and universe-adjacent projects.

This repo collects multiple ideas and builds in one place: visual experiments, interactive tools, and shared assets that all connect back to the same broader "universe" concept.

Think of it as a project galaxy:
- one home for related work
- multiple subprojects living side by side
- shared foundations for future expansion

The goal is simple: keep everything connected, organized, and easy to grow over time.

## Wynncraft WAPI — PowerShell stat counts

To count how many items contain a specific stat (e.g. `walkSpeed`) using PowerShell, run the npm helper which outputs and parses JSON:

```powershell
cd constellations/wynncraft/wynnbuilder/wapi
npm run pwsh-stat-walkSpeed
# or for a custom stat name and parse the JSON manually:
node categorizeItems.js --stat walkSpeed | ConvertFrom-Json
```

To list all detected stats with counts as JSON:

```powershell
cd constellations/wynncraft/wynnbuilder/wapi
npm run stat-list
```

---

See `constellations/wynncraft/wynnbuilder/wapi` for scripts and the `categorizeItems.js` tool.
