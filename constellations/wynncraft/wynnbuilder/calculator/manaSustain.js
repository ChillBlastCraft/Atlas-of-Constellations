import { createInterface } from "node:readline/promises"
import { stdin as input, stdout as output } from "node:process"

import { intCostReductionFromPoints, spellSpamPenalty } from "../formula.js"


/*
 * Base spell mana costs per class.
 * Warrior, Mage, Archer, Assassin costs confirmed from WAPI:
 *   https://api.wynncraft.com/v3/ability/tree/{class}
 */
const CLASSES = {
	warrior: {
		label: "Warrior",
		spells: [
			{ id: 1, name: "Bash",        baseCost: 40 },
			{ id: 2, name: "Charge",      baseCost: 25 },
			{ id: 3, name: "War Scream",  baseCost: 30 },
			{ id: 4, name: "Uppercut",    baseCost: 40 },
		],
	},
	mage: {
		label: "Mage",
		spells: [
			{ id: 1, name: "Meteor",      baseCost: 50 },
			{ id: 2, name: "Teleport",    baseCost: 25 },
			{ id: 3, name: "Heal",        baseCost: 35 },
			{ id: 4, name: "Ice Snake",   baseCost: 30 },
		],
	},
	archer: {
		label: "Archer",
		spells: [
			{ id: 1, name: "Arrow Bomb",  baseCost: 45 },
			{ id: 2, name: "Escape",      baseCost: 20 },
			{ id: 3, name: "Arrow Shield",baseCost: 30 },
			{ id: 4, name: "Arrow Storm", baseCost: 35 },
		],
	},
	assassin: {
		label: "Assassin",
		spells: [
			{ id: 1, name: "Spin Attack", baseCost: 40 },
			{ id: 2, name: "Dash",        baseCost: 20 },
			{ id: 3, name: "Smoke Bomb",  baseCost: 35 },
			{ id: 4, name: "Multihit",    baseCost: 40 },
		],
	},
	shaman: {
		label: "Shaman",
		spells: [
			{ id: 1, name: "Totem",       baseCost: 30 },
			{ id: 2, name: "Haul",        baseCost: 20 },
			{ id: 3, name: "Aura",        baseCost: 40 },
			{ id: 4, name: "Uproot",      baseCost: 30 },
		],
	},
}

const CLASS_OPTIONS = Object.values(CLASSES).map(c => c.label)
const CLASS_KEYS    = Object.keys(CLASSES)

const NATURAL_MANA_REGEN = 1 

/*
 * Analyses a rotation and returns per-cast breakdown and total cost.
 */
function analyzeRotation(rotation, spellsById, flatReduction, intPct, extraPct) {
	let total = 0
	const breakdown = []
	let currentSpellId = null
	let streakCount    = 0

	// Calculate combined percent reduction multiplicatively
	const intMul = 1 - intPct / 100
	const extraMul = 1 - extraPct / 100
	const totalMul = intMul * extraMul

	for (let i = 0; i < rotation.length; i++) {
		const castIndex = i + 1
		const id        = rotation[i]
		const spell     = spellsById[id]

		// Streak continues only for consecutive casts of the same spell.
		if (id === currentSpellId) {
			streakCount++
		} else {
			currentSpellId = id
			streakCount    = 1
		}

		const penalty    = spellSpamPenalty(streakCount)
		const reducedBase = Math.max(1, spell.baseCost - flatReduction)
		const withPenalty = reducedBase + penalty
		const cost        = withPenalty * totalMul

		breakdown.push({ castIndex, spellName: spell.name, baseCost: spell.baseCost, streakCount, penalty, cost, reducedBase, withPenalty })
		total += cost
	}

	return { total, breakdown, totalMul, intMul, extraMul }
}

async function ask(promptText) {
	const rl = createInterface({ input, output })
	try {
		return await rl.question(promptText)
	} finally {
		rl.close()
	}
}

async function askClass() {
	console.log("Select class:")
	for (const [i, label] of CLASS_OPTIONS.entries()) {
		console.log(`  ${i + 1}. ${label}`)
	}
	const answer = await ask("Class number: ")
	const index  = Number(answer.trim()) - 1
	const key    = CLASS_KEYS[index]
	if (!key) throw new Error(`Invalid class number: ${answer.trim()}`)
	return key
}

async function askRotation(spells) {
	console.log("\nSpells for this class:")
	for (const spell of spells) {
		console.log(`  ${spell.id}. ${spell.name.padEnd(12)} (base cost: ${spell.baseCost})`)
	}
	console.log("\nEnter your rotation as spell numbers separated by spaces.")
	console.log("The spam penalty accumulates across all casts in order.")
	console.log("Example: \"1 3 1 3 1 3\"  (alternates spells 1 and 3)")
	const answer = await ask("Rotation: ")
	const ids    = answer.trim().split(/\s+/).map(Number)
	const valid  = new Set(spells.map(s => s.id))
	for (const id of ids) {
		if (!valid.has(id)) {
			throw new Error(`Unknown spell id: ${id}. Valid ids: ${[...valid].join(", ")}`)
		}
	}
	if (ids.length === 0) throw new Error("Rotation cannot be empty.")
	return ids
}

async function askPositiveNumber(promptText, label) {
	const answer = await ask(promptText)
	const val    = Number(answer.trim())
	if (!Number.isFinite(val) || val <= 0) {
		throw new Error(`${label} must be a positive number. Got: ${answer.trim()}`)
	}
	return val
}

async function askNonNegInteger(promptText, label, max = Infinity) {
	const answer = await ask(promptText)
	const val    = Math.floor(Number(answer.trim()))
	if (!Number.isFinite(val) || val < 0 || val > max) {
		throw new Error(`${label} must be between 0 and ${max}. Got: ${answer.trim()}`)
	}
	return val
}

const fmt     = n  => n.toFixed(1)
const fmtPct  = n  => n.toFixed(1) + "%"
const fmtRate = n  => n.toFixed(2)

export async function runManaCommand() {
	console.clear()
	console.log("=== MANA SUSTAINABILITY CALCULATOR ===\n")

	const classKey  = await askClass()
	const classData = CLASSES[classKey]
	const spells    = classData.spells
	const byId      = Object.fromEntries(spells.map(s => [s.id, s]))

	const rotation       = await askRotation(spells)
	const duration       = await askPositiveNumber("\nRotation duration (seconds): ", "Duration")
	const flatReduction  = await askNonNegInteger(
		"Total flat mana cost reduction from ability tree (e.g. 10 for two -5 nodes; 0 if none): ",
		"Flat reduction"
	)
	const extraPct      = await askNonNegInteger(
		"Total percent mana cost reduction from gear/tree (e.g. 20 for -20%; 0 if none): ",
		"Percent reduction",
		100
	)
	const intPoints      = await askNonNegInteger(
		"Intelligence skill points (0–150): ",
		"Intelligence points",
		150
	)
	const emergencyBuffer = await askNonNegInteger(
		"Emergency mana reserve to keep available (extra mana; 0 to skip): ",
		"Emergency buffer"
	)

	const intPct = intCostReductionFromPoints(intPoints)
	const { total: totalSpent, breakdown, totalMul, intMul, extraMul } = analyzeRotation(rotation, byId, flatReduction, intPct, extraPct)

	const naturalTotal  = NATURAL_MANA_REGEN * duration
	const netDeficit    = totalSpent + emergencyBuffer - naturalTotal
	const regenRequired = (totalSpent + emergencyBuffer) / duration
	const regenRequired5s = regenRequired * 5
	const aboveNatural = regenRequired - NATURAL_MANA_REGEN
	const aboveNatural5s = aboveNatural * 5

	// How many times each spell appears in the rotation
	const castCounts = {}
	for (const id of rotation) castCounts[id] = (castCounts[id] ?? 0) + 1

	// Results output
	console.clear()
	console.log(`=== MANA SUSTAINABILITY: ${classData.label.toUpperCase()} ===\n`)

	const rotName = rotation.map(id => byId[id].name).join(" → ")
	console.log(`Rotation (${rotation.length} casts): ${rotName}`)
	console.log(`Duration:               ${duration}s`)
	console.log(`Flat mana reduction:    -${flatReduction}`)
	console.log(`Percent reduction:      -${extraPct}%`)
	console.log(`Intelligence:           ${intPoints} pts  →  ${fmtPct(intPct)} cost reduction`)
	if (emergencyBuffer > 0) console.log(`Emergency buffer:       ${emergencyBuffer} mana`)
	console.log("\nNOTE: All mana regen values are per second (1/s = 5/5s). Standard gear values are shown as X/5s.")

	console.log("\n─── ROTATION BREAKDOWN ───────────────────────────────────────────")
	for (const cast of breakdown) {
		const reducedBase  = cast.reducedBase
		const computedBase = cast.withPenalty

		let costExpr
		if (flatReduction > 0 && cast.penalty > 0) {
			costExpr = `(${cast.baseCost}-${flatReduction}=${reducedBase})+${cast.penalty}=${computedBase}`
		} else if (flatReduction > 0) {
			costExpr = `${cast.baseCost}-${flatReduction}=${reducedBase}`
		} else if (cast.penalty > 0) {
			costExpr = `${cast.baseCost}+${cast.penalty}=${computedBase}`
		} else {
			costExpr = `${cast.baseCost}`
		}

		let pctSuffix = ""
		if (extraPct > 0 && intPct > 0) {
			pctSuffix = ` × ${fmtPct(100 - extraPct)} × ${fmtPct(100 - intPct)} = ${fmt(cast.cost)}`
		} else if (extraPct > 0) {
			pctSuffix = ` × ${fmtPct(100 - extraPct)} = ${fmt(cast.cost)}`
		} else if (intPct > 0) {
			pctSuffix = ` × ${fmtPct(100 - intPct)} = ${fmt(cast.cost)}`
		} else {
			pctSuffix = ` = ${fmt(cast.cost)}`
		}

		const spamNote = cast.penalty > 0 ? `  ← streak ${cast.streakCount} (+${cast.penalty})` : ""
		console.log(`  ${String(cast.castIndex).padStart(2)}. ${cast.spellName.padEnd(12)} ${costExpr}${pctSuffix}${spamNote}`)
	}

	console.log("\n─── TOTALS ────────────────────────────────────────────────────────")
	console.log(`  Mana spent:               ${fmt(totalSpent)}`)
	console.log(`  Natural regen (${NATURAL_MANA_REGEN}/s = 5/5s × ${duration}s):  ${fmt(naturalTotal)}`)
	if (emergencyBuffer > 0) console.log(`  Emergency buffer:         ${emergencyBuffer}`)
	const deficitLabel = netDeficit <= 0 ? `SURPLUS of ${fmt(-netDeficit)}` : `DEFICIT of ${fmt(netDeficit)}`
	console.log(`  Net mana balance:         ${deficitLabel}`)

	console.log("\n─── SUSTAINABILITY ────────────────────────────────────────────────")
	if (netDeficit <= 0) {
		console.log(`  ✓ Sustained by natural regen alone (${fmt(-netDeficit)} mana surplus)`)
	} else {
		console.log(`  Total mana regen needed:   ${fmtRate(regenRequired)}/s   (${fmtRate(regenRequired5s)}/5s)`)
		console.log(`  Natural regen:            -${NATURAL_MANA_REGEN}.0/s   (-5.0/5s)`)
		console.log(`  Extra regen from gear:    +${fmtRate(aboveNatural)}/s   (+${fmtRate(aboveNatural5s)}/5s) required`)
	}

	/*
	 * Equivalence table.
	 *
	 * 1 mana regen/s = `duration` mana saved over the rotation.
	 *
	 * -1 flat cost on spell S = `castCounts[S] × totalMul` mana saved per rotation.
	 * Break-even: 1 mana regen ≡ duration / (castCounts[S] × totalMul) flat cost on S.
	 *
	 * +1% cost reduction saves `sum(withPenalty across all casts) × intMul × 0.01` mana
	 * per rotation, because the marginal 1% is applied before INT scaling.
	 * Break-even: 1 mana regen ≡ duration / (withPenaltySum × intMul × 0.01) percent.
	 */
	console.log("\n─── EQUIVALENCE ───────────────────────────────────────────────────")
	console.log(`  1 mana/s regen = ${fmt(duration)} mana per ${duration}s rotation\n`)

	const sortedIds = Object.keys(castCounts).sort((a, b) => castCounts[b] - castCounts[a])

	console.log("  Flat cost reduction (per spell):")
	for (const id of sortedIds) {
		const spell         = byId[id]
		const count         = castCounts[id]
		const manaPerMinus1 = count * totalMul
		const flatEqOf1Reg  = duration / manaPerMinus1

		console.log(
			`    ${spell.name.padEnd(12)} cast ${String(count).padStart(2)}×` +
			`  →  -1 cost saves ${fmtRate(manaPerMinus1)} mana/rotation` +
			`  ≡  ${fmtRate(1 / flatEqOf1Reg)}/s regen` +
			`  |  1 mana/s regen ≡ -${fmtRate(flatEqOf1Reg)} flat cost`
		)
	}

	const withPenaltySum    = breakdown.reduce((sum, cast) => sum + cast.withPenalty, 0)
	const savingsFrom1Pct   = withPenaltySum * intMul * 0.01
	const regenEquivOf1Pct  = savingsFrom1Pct / duration
	const pctEquivOf1Regen  = 1 / regenEquivOf1Pct

	console.log("\n  Percent cost reduction (all spells combined):")
	console.log(
		`    -1% cost saves ${fmtRate(savingsFrom1Pct)} mana/rotation` +
		`  ≡  ${fmtRate(regenEquivOf1Pct)}/s regen` +
		`  |  1 mana/s regen ≡ -${fmtRate(pctEquivOf1Regen)}% cost reduction`
	)

	console.log("")
}
