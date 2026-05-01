import { createInterface } from "node:readline/promises"
import { stdin as input, stdout as output } from "node:process"

import { defenceReductionFromPoints, agilityDodgeFromPoints } from "../formula.js"

/*
 * Effective Hit Pool (EHP) calculator.
 *
 * Defence provides damage reduction — every hit deals less damage.
 * Agility provides dodge chance — some hits are avoided entirely.
 *
 * EHP formulas:
 *   DEF only:  HP / (1 − DR%)
 *   AGI only:  HP / (1 − DC%)
 *   Both:      HP / ((1 − DR%) × (1 − DC%))
 *
 * Because the two stats multiply, the same raw % from DEF and AGI is NOT
 * equivalent when combined — their interaction is always supra-additive.
 *
 * Class base HP per level (least → most tanky):
 *   Shaman 60 → Archer 70 → Mage 80 → Assassin / Warrior 100
 */

const MAX_SKILL_POINTS = 150

const CLASSES = [
	{ label: "Shaman",   baseHp: 60  },
	{ label: "Archer",   baseHp: 70  },
	{ label: "Mage",     baseHp: 80  },
	{ label: "Assassin", baseHp: 100 },
	{ label: "Warrior",  baseHp: 100 },
]

/*
 * Given base HP and target EHP, calculates the minimum skill point investment to
 * reach the target under various scenarios (DEF only, AGI only, balanced split, optimal combination).
 */ 
function drAt(pts)  { return defenceReductionFromPoints(pts) / 100 }
function dcAt(pts)  { return agilityDodgeFromPoints(pts)     / 100 }

function ehpDefOnly(hp, defPts) {
	return hp / (1 - drAt(defPts))
}

function ehpAgiOnly(hp, agiPts) {
	return hp / (1 - dcAt(agiPts))
}

function ehpBoth(hp, defPts, agiPts) {
	return hp / ((1 - drAt(defPts)) * (1 - dcAt(agiPts)))
}

/*
 * Binary search: minimum skill points [0, MAX] so that statFn(hp, pts) >= targetEhp.
 * Returns null when even MAX_SKILL_POINTS is not enough.
 */
function solvePoints(hp, targetEhp, statFn) {
	if (statFn(hp, MAX_SKILL_POINTS) < targetEhp) return null
	if (statFn(hp, 0) >= targetEhp) return 0

	let lo = 0, hi = MAX_SKILL_POINTS
	while (lo < hi) {
		const mid = (lo + hi) >> 1
		statFn(hp, mid) >= targetEhp ? (hi = mid) : (lo = mid + 1)
	}
	return lo
}

/*
 * Binary search: minimum N such that DEF = AGI = N achieves the target EHP.
 * This is the "balanced" split — each stat gets equal investment.
 * Costs more total points than the pure efficiency path, but uses both stats.
 * Returns null when even DEF=150 + AGI=150 cannot reach the target.
 */
function solveEqualSplit(hp, targetEhp) {
	if (ehpBoth(hp, MAX_SKILL_POINTS, MAX_SKILL_POINTS) < targetEhp) return null
	if (ehpBoth(hp, 0, 0) >= targetEhp) return 0

	let lo = 0, hi = MAX_SKILL_POINTS
	while (lo < hi) {
		const mid = (lo + hi) >> 1
		ehpBoth(hp, mid, mid) >= targetEhp ? (hi = mid) : (lo = mid + 1)
	}
	return lo
}

/*
 * Iterates over all DEF allocations and binary-searches the minimum AGI for
 * each, returning the combination with the lowest TOTAL skill points.
 * AGI is more point-efficient so this result will typically favor AGI heavily.
 * Returns null when even 150 DEF + 150 AGI cannot reach the target.
 */
function solveOptimalCombination(hp, targetEhp) {
	if (ehpBoth(hp, MAX_SKILL_POINTS, MAX_SKILL_POINTS) < targetEhp) return null

	let bestTotal = Infinity
	let bestDef   = null
	let bestAgi   = null

	for (let defPts = 0; defPts <= MAX_SKILL_POINTS; defPts++) {
		// If max AGI still can't bridge the gap at this DEF level, skip.
		if (ehpBoth(hp, defPts, MAX_SKILL_POINTS) < targetEhp) continue

		// Binary search: minimum AGI given fixed defPts.
		let lo = 0, hi = MAX_SKILL_POINTS
		while (lo < hi) {
			const mid = (lo + hi) >> 1
			ehpBoth(hp, defPts, mid) >= targetEhp ? (hi = mid) : (lo = mid + 1)
		}

		const total = defPts + lo
		if (total < bestTotal) {
			bestTotal = total
			bestDef   = defPts
			bestAgi   = lo
		}
	}

	return bestDef !== null
		? { defPoints: bestDef, agiPoints: bestAgi, totalPoints: bestTotal }
		: null
}

async function ask(prompt) {
	const rl = createInterface({ input, output })
	try {
		return await rl.question(prompt)
	} finally {
		rl.close()
	}
}

async function askClass() {
	console.log("Select class:")
	for (const [i, cls] of CLASSES.entries()) {
		console.log(`  ${i + 1}. ${cls.label}`)
	}
	const answer = await ask("Class number: ")
	const index  = Number(answer.trim()) - 1
	if (!CLASSES[index]) throw new Error(`Invalid class number: ${answer.trim()}`)
	return CLASSES[index]
}

async function askPositiveNumber(promptText, label) {
	const answer = await ask(promptText)
	const val    = Number(answer.trim())
	if (!Number.isFinite(val) || val <= 0) {
		throw new Error(`${label} must be a positive number. Got: ${answer.trim()}`)
	}
	return val
}

async function waitForEnterToClear() {
	const rl = createInterface({ input, output })
	try {
		await rl.question("Press Enter to clear the terminal...")
		console.clear()
	} finally {
		rl.close()
	}
}

const fmt  = n => n.toFixed(1)
const fmtP = n => n.toFixed(2) + "%"
const fmtM = n => n.toFixed(3) + "x"

function printResults(hp, targetEhp, selectedClass) {
	const mult = targetEhp / hp

	const efficient = solveOptimalCombination(hp, targetEhp)
	const balanced  = solveEqualSplit(hp, targetEhp)
	const defOnly   = solvePoints(hp, targetEhp, ehpDefOnly)
	const agiOnly   = solvePoints(hp, targetEhp, ehpAgiOnly)

	console.log(`\n=== EFFECTIVE HIT POOL: ${selectedClass.label.toUpperCase()} ===\n`)
	console.log(`  HP:             ${hp}`)
	console.log(`  Target EHP:     ${fmt(targetEhp)}`)
	console.log(`  EHP multiplier: ${fmtM(mult)}  (${fmt((mult - 1) * 100)}% more effective HP)`)

	const notAchievable = !efficient
	if (notAchievable) {
		const maxEhp = ehpBoth(hp, MAX_SKILL_POINTS, MAX_SKILL_POINTS)
		const maxDr  = defenceReductionFromPoints(MAX_SKILL_POINTS)
		const maxDc  = agilityDodgeFromPoints(MAX_SKILL_POINTS)
		console.log(`\n  ✗ Target EHP is not achievable even at 150 DEF + 150 AGI`)
		console.log(`    Max combined EHP: ${fmt(maxEhp)}  (${fmtM(maxEhp / hp)})`)
		console.log(`    Max DEF (150): ${fmtP(maxDr)} damage reduction`)
		console.log(`    Max AGI (150): ${fmtP(maxDc)} dodge chance`)
		console.log("")
		return
	}
    /*
     * 1. Most point-effeicient.
     * AGI yields more EHP per point than DEF, so this will heavily favor AGI.
     */
	console.log("\n─── 1) MOST POINT-EFFICIENT (favors AGI) ──────────────────────────")
	{
		const dr        = defenceReductionFromPoints(efficient.defPoints)
		const dc        = agilityDodgeFromPoints(efficient.agiPoints)
		const actualEhp = ehpBoth(hp, efficient.defPoints, efficient.agiPoints)
		console.log(`  DEF points: ${efficient.defPoints}  →  ${fmtP(dr)} damage reduction`)
		console.log(`  AGI points: ${efficient.agiPoints}  →  ${fmtP(dc)} dodge chance`)
		console.log(`  Total skill points: ${efficient.totalPoints}`)
		console.log(`  Achieved EHP: ${fmt(actualEhp)}  (${fmtM(actualEhp / hp)})`)
	}
    /*
     * 2. Balanced equal split.
     * Invests equal points into both DEF and AGI. 
     * This costs more total points than Option 1, but meaningfully uses both stats. 
     */
	console.log("\n─── 2) BALANCED (equal DEF = AGI) ─────────────────────────────────")
	if (balanced === null || balanced > MAX_SKILL_POINTS) {
		const maxEqualEhp = ehpBoth(hp, MAX_SKILL_POINTS, MAX_SKILL_POINTS)
		console.log(`  ✗ Not achievable with equal split (DEF=AGI=150 gives ${fmt(maxEqualEhp)} EHP)`)
	} else {
		const dr        = defenceReductionFromPoints(balanced)
		const dc        = agilityDodgeFromPoints(balanced)
		const actualEhp = ehpBoth(hp, balanced, balanced)
		const extraCost = balanced * 2 - efficient.totalPoints
		console.log(`  DEF points: ${balanced}  →  ${fmtP(dr)} damage reduction`)
		console.log(`  AGI points: ${balanced}  →  ${fmtP(dc)} dodge chance`)
		console.log(`  Total skill points: ${balanced * 2}  (+${extraCost} vs option 1)`)
		console.log(`  Achieved EHP: ${fmt(actualEhp)}  (${fmtM(actualEhp / hp)})`)
	}

	/*
     * DEF Only
     */ 
	console.log("\n─── 3) DEF ONLY ───────────────────────────────────────────────────")
	if (defOnly === null) {
		const maxDr  = defenceReductionFromPoints(MAX_SKILL_POINTS)
		const maxEhp = ehpDefOnly(hp, MAX_SKILL_POINTS)
		console.log(`  ✗ Not achievable with DEF alone`)
		console.log(`    Max DEF (150): ${fmtP(maxDr)} damage reduction  →  ${fmt(maxEhp)} EHP  (${fmtM(maxEhp / hp)})`)
	} else {
		const dr        = defenceReductionFromPoints(defOnly)
		const actualEhp = ehpDefOnly(hp, defOnly)
		console.log(`  DEF points: ${defOnly}  →  ${fmtP(dr)} damage reduction`)
		console.log(`  Achieved EHP: ${fmt(actualEhp)}  (${fmtM(actualEhp / hp)})`)
	}

	/* 
     * AGI Only
     */ 
	console.log("\n─── 4) AGI ONLY ───────────────────────────────────────────────────")
	if (agiOnly === null) {
		const maxDc  = agilityDodgeFromPoints(MAX_SKILL_POINTS)
		const maxEhp = ehpAgiOnly(hp, MAX_SKILL_POINTS)
		console.log(`  ✗ Not achievable with AGI alone`)
		console.log(`    Max AGI (150): ${fmtP(maxDc)} dodge chance  →  ${fmt(maxEhp)} EHP  (${fmtM(maxEhp / hp)})`)
	} else {
		const dc        = agilityDodgeFromPoints(agiOnly)
		const actualEhp = ehpAgiOnly(hp, agiOnly)
		console.log(`  AGI points: ${agiOnly}  →  ${fmtP(dc)} dodge chance`)
		console.log(`  Achieved EHP: ${fmt(actualEhp)}  (${fmtM(actualEhp / hp)})`)
	}

	console.log("")
}

export async function runEhpCommand() {
	console.clear()
	console.log("=== EFFECTIVE HIT POOL CALCULATOR ===\n")

	const selectedClass = await askClass()
	const hp            = await askPositiveNumber("\nYour HP: ", "HP")
	const targetEhp     = await askPositiveNumber("Target EHP: ", "Target EHP")

	if (targetEhp <= hp) {
		console.log(`\nTarget EHP (${fmt(targetEhp)}) is at or below your HP (${hp}). No skill points needed.`)
		await waitForEnterToClear()
		return
	}

	console.clear()
	printResults(hp, targetEhp, selectedClass)
	await waitForEnterToClear()
}
