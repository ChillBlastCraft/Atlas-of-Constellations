# Atlas of Constellations

> A central hub for constellation-themed and universe-adjacent projects.

---

## Overview

Atlas of Constellations is a monorepo for visual experiments, interactive tools, and shared assets that all connect back to the same broader "universe" concept. It is organized as a collection of subprojects, each with its own focus, but sharing a common foundation for future expansion.

- **One home for related work**
- **Multiple subprojects side by side**
- **Shared foundations for future growth**

---

## Subprojects

### Wynnbuilder (`constellations/wynncraft/wynnbuilder`)

An interactive CLI calculator for [Wynncraft](https://wynncraft.com) damage equivalence.

**What it does:**
- Calculates how much flat (raw) damage is equivalent to a given percentage damage bonus, based on your current DPS baseline.
- Supports both **spell damage** and **melee damage** modes.
- Melee equivalence accounts for attack speed, since raw main-attack damage is added per hit — making the value of flat melee damage scale with hits per second.

**Usage:**
```
node main.js spells   # interactive spell % → flat equivalence
node main.js melee    # interactive melee % → flat equivalence (with attack speed selection)
node main.js compare  # compare two builds by effective DPS
node main.js help     # show mode descriptions
```

**Formulas:**
- Spell: `flatEquivalent = baseDps * (percent / 100)`
- Melee: `flatEquivalent = (baseDps * (percent / 100)) / hitsPerSecond`
- Effective DPS (spell): `effectiveDps = baseDps * (1 + percent/100) + flat`
- Effective DPS (melee): `effectiveDps = baseDps * (1 + percent/100) + flat * hitsPerSecond`

**Compare mode:**
Prompts for damage type (spell or melee), then collects base DPS, percent damage, flat damage, and (for melee) attack speed for two builds. Outputs the effective DPS of each and indicates which build deals more damage and by how much.