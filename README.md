# Atlas of Constellations

> A central hub for constellation-themed and universe-adjacent projects.

---

## Overview

Atlas of Constellations is a monorepo for visual experiments, interactive tools, and shared assets that all connect back to the same broader "universe" concept. It is organized as a collection of subprojects, each with its own focus, but sharing a common foundation for future expansion.

- **One home for related work**
- **Multiple subprojects side by side**
- **Shared foundations for future growth**

## Subprojects

- **wynncalc / wynnbuilder**: A build optimizer for Wynncraft, featuring a beam search algorithm to find optimal gear combinations based on user-defined constraints and weights. See [constellations/wynncraft/wynnbuilder/main.js](constellations/wynncraft/wynnbuilder/main.js) for the entry point.

## WynnBuilder Optimizer

The WynnBuilder optimizer is a tool for finding the best combination of weapon, helmet, and chestplate items in Wynncraft, using a beam search algorithm. It fetches item data from the Wynncraft API, filters relevant items, and scores builds based on customizable weights for damage, effective HP, and mana regeneration.

- **Entry point:** [main.js](constellations/wynncraft/wynnbuilder/main.js)
- **API fetch & filter:** [wapi.js](constellations/wynncraft/wynnbuilder/api/wapi.js)
- **Beam search optimizer:** [optimizer.js](constellations/wynncraft/wynnbuilder/engine/optimizer.js)
- **Stat aggregation:** [statsEngine.js](constellations/wynncraft/wynnbuilder/engine/statsEngine.js)
- **Constraint checking:** [constraintEngine.js](constellations/wynncraft/wynnbuilder/engine/constraintEngine.js)
- **Scoring:** [scoringEngine.js](constellations/wynncraft/wynnbuilder/engine/scoringEngine.js)

## Getting Started

1. Clone the repository.
2. Install dependencies (see relevant subproject folders for package.json).
3. Run the optimizer from the `constellations/wynncraft/wynnbuilder` directory:

	```bash
	node main.js
	```

4. The optimizer will fetch items, filter them, and print the best build found.

---

This repository is designed to keep everything connected, organized, and easy to grow over time.
