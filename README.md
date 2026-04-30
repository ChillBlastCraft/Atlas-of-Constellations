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
- Includes an **ability point distribution** mode that shows before/after scaling for Wynncraft skills (Strength, Dexterity, Intelligence, Defence, Agility), including absolute and relative changes.

**Usage:**
```
node main.js spells   # interactive spell % → flat equivalence
node main.js melee    # interactive melee % → flat equivalence (with attack speed selection)
node main.js compare  # compare two builds by effective DPS
node main.js ability  # compare before/after skill-point investment effects
node main.js mana     # mana sustain, regen vs flat vs percent cost reduction
node main.js help     # show mode descriptions
```

**Formulas:**
- Spell: `flatEquivalent = baseDps * (percent / 100)`
- Melee: `flatEquivalent = (baseDps * (percent / 100)) / hitsPerSecond`
- Effective DPS (spell): `effectiveDps = baseDps * (1 + percent/100) + flat`
- Effective DPS (melee): `effectiveDps = baseDps * (1 + percent/100) + flat * hitsPerSecond`

**Compare mode:**
Prompts for damage type (spell or melee), then collects base DPS, percent damage, flat damage, and (for melee) attack speed for two builds. Outputs the effective DPS of each and indicates which build deals more damage and by how much.

**Ability mode:**
Prompts for a skill and two point values (**before** and **after**), then prints:
- The resulting effect values at the **after** point total.
- The change from **before** to **after** as:
	- Absolute difference (percentage points)
	- Relative difference (% more/less effective)

This mode uses Wynncraft skill scaling to help evaluate whether a point investment is worth it for your build.

**Mana sustain mode:**
Prompts for class, spell rotation, duration, flat and percent mana cost reduction, intelligence, and emergency buffer.
Outputs:
- Per-cast and total mana cost breakdown (with all reductions and penalties)
- Net mana balance and regen required
- **Equivalence table**:
  - How much 1 mana/s regen, -1 flat cost, and -1% cost reduction each save per rotation
  - Shows break-even values between regen, flat, and percent cost reduction
This helps you compare the value of different mana sustain options for your build and rotation.