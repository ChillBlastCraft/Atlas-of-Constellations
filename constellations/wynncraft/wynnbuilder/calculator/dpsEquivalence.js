import { createInterface } from "node:readline/promises"
import { stdin as input, stdout as output } from "node:process"


/*
 * Given an Attack Speed label, returns the corresponding hits per second.
 * Attack Speeds and their hits per second values are based on WynnCraft's mechanics.
 * Source: https://wynncraft.wiki.gg/wiki/Weapons#Attack_Speed
 */
const ATTACK_SPEEDS = [
	{ label: "Super Fast", value: 4.3 },
	{ label: "Very Fast",  value: 3.1 },
	{ label: "Fast",       value: 2.5 },
	{ label: "Normal",     value: 2.05 },
	{ label: "Slow",       value: 1.5 },
	{ label: "Very Slow",  value: 0.83 },
	{ label: "Super Slow", value: 0.51 },
]
const ATTACK_SPEED_OPTIONS = ATTACK_SPEEDS.map(({ label }) => label)

function validateBaseDps(baseDps, label) {
	if (!Number.isFinite(baseDps) || baseDps < 0) {
		throw new Error(`${label} must be a number >= 0. Received: ${baseDps}`)
	}
}

function validateFiniteNumber(value, label) {
	if (!Number.isFinite(value)) {
		throw new Error(`${label} must be a valid number. Received: ${value}`)
	}
}

function getFlatEquivalent(baseDps, percent) {
	return baseDps * (percent / 100)
}

function getHitsPerSecond(attackSpeed) {
	const entry = ATTACK_SPEEDS.find(({ label }) => label === attackSpeed)

	if (!entry) {
		throw new Error(
			`Unknown attack speed: ${attackSpeed}. Use one of: ${ATTACK_SPEED_OPTIONS.join(", ")}`
		)
	}

	return { attackSpeed, hitsPerSecond: entry.value}
}

async function askForBaseDps(promptText) {
	const rl = createInterface({ input, output })

	try {
		const answer = await rl.question(promptText)
		const baseDps = Number(answer.trim())
		validateBaseDps(baseDps, "baseDps")
		return baseDps
	} finally {
		rl.close()
	}
}

async function askForNumber(promptText, label) {
	const rl = createInterface({ input, output })

	try {
		const answer = await rl.question(promptText)
		const value = Number(answer.trim())
		validateFiniteNumber(value, label)
		return value
	} finally {
		rl.close()
	}
}

async function askForAttackSpeed() {
	const rl = createInterface({ input, output })

	try {
		console.log("Choose attack speed:")

		for (const [index, attackSpeed] of ATTACK_SPEED_OPTIONS.entries()) {
			console.log(`  ${index + 1}. ${attackSpeed}`)
		}

		const answer = await rl.question("Attack speed number: ")
		const selectedIndex = Number(answer.trim()) - 1
		const selectedAttackSpeed = ATTACK_SPEED_OPTIONS[selectedIndex]

		if (!selectedAttackSpeed) {
			throw new Error(`Unknown attack speed number: ${answer}`)
		}

		const { attackSpeed } = getHitsPerSecond(selectedAttackSpeed)
		return attackSpeed
	} finally {
		rl.close()
	}
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

function printResult(result) {
	console.log(`${result.type.toUpperCase()} RESULT`)
	console.log(`Base DPS: ${result.baseDps}`)
	console.log(`Percent: ${result.percent}%`)

	if (result.type === "melee") {
		console.log(`Attack speed: ${result.attackSpeed}`)
		console.log(`Hits per second: ${result.hitsPerSecond}`)
		console.log(`DPS gained from percent: ${result.percentDpsGain}`)
	}

	console.log(`Flat equivalent: ${result.flatEquivalent}`)
	console.log(`Formula: ${result.formula}`)
	console.log("")
}

/* 
 * Returns how much raw spell damage would equal `percent` spell damage
 * Assuming `baseSpellDps` is your current spell DPS baseline.
 */ 
export async function spellPercentToFlat(baseSpellDps, percent = 1) {
	validateBaseDps(baseSpellDps, "baseSpellDps")
	validateFiniteNumber(percent, "percent")

	const flatEquivalent = getFlatEquivalent(baseSpellDps, percent)

	return {
		type: "spell",
		baseDps: baseSpellDps,
		percent,
		flatEquivalent,
		formula: "flatEquivalent = baseDps * (percent / 100)",
	}
}

/*
 * Returns how much raw melee damage would equal `percent` melee damage
 * Assuming `baseMeleeDps` is your current melee DPS baseline.
 */
export async function meleePercentToFlat(baseMeleeDps, percent = 1) {
	return meleePercentToFlatByAttackSpeed(baseMeleeDps, "normal", percent)
}

export async function meleePercentToFlatByAttackSpeed(baseMeleeDps, attackSpeed, percent = 1) {
	validateBaseDps(baseMeleeDps, "baseMeleeDps")
	validateFiniteNumber(percent, "percent")

	const { attackSpeed: selectedAttackSpeed, hitsPerSecond } = getHitsPerSecond(attackSpeed)
	const percentDpsGain = getFlatEquivalent(baseMeleeDps, percent)
	const flatEquivalent = percentDpsGain / hitsPerSecond


	return {
		type: "melee",
		baseDps: baseMeleeDps,
		percent,
		attackSpeed: selectedAttackSpeed,
		hitsPerSecond,
		percentDpsGain,
		flatEquivalent,
		formula: "flatEquivalent = (baseDps * (percent / 100)) / hitsPerSecond",
	}
}

/*
 * Calculates the effective DPS of a single build.
 * - Spell: effectiveDps = baseDps * (1 + percent/100) + flat
 * - Melee: effectiveDps = baseDps * (1 + percent/100) + flat * hitsPerSecond
 */
export function calculateEffectiveDps(baseDps, percent, flat, type, attackSpeed = "normal") {
	validateBaseDps(baseDps, "baseDps")
	validateFiniteNumber(percent, "percent")
	validateFiniteNumber(flat, "flat")

	if (type === "spell") {
		const effectiveDps = baseDps * (1 + percent / 100) + flat
		return {
			type,
			baseDps,
			percent,
			flat,
			effectiveDps,
			formula: "effectiveDps = baseDps * (1 + percent/100) + flat",
		}
	}

	if (type === "melee") {
		const { attackSpeed: selectedAttackSpeed, hitsPerSecond } = getHitsPerSecond(attackSpeed)
		const effectiveDps = baseDps * (1 + percent / 100) + flat * hitsPerSecond
		return {
			type,
			baseDps,
			percent,
			flat,
			attackSpeed: selectedAttackSpeed,
			hitsPerSecond,
			effectiveDps,
			formula: "effectiveDps = baseDps * (1 + percent/100) + flat * hitsPerSecond",
		}
	}

	throw new Error(`Unknown type: ${type}. Use "spell" or "melee".`)
}

/*
 * Compares two builds and returns which has higher effective DPS.
 * Each build is { baseDps, percent, flat }.
 */
export function compareBuildDps(build1, build2, type, attackSpeed1 = "normal", attackSpeed2 = "normal") {
	const result1 = calculateEffectiveDps(build1.baseDps, build1.percent, build1.flat, type, attackSpeed1)
	const result2 = calculateEffectiveDps(build2.baseDps, build2.percent, build2.flat, type, attackSpeed2)

	const diff = result1.effectiveDps - result2.effectiveDps
	const winner = diff > 0 ? 1 : diff < 0 ? 2 : null
	const winnerResult = winner === 1 ? result1 : winner === 2 ? result2 : null
	const loserResult = winner === 1 ? result2 : winner === 2 ? result1 : null
	const percentMore = winnerResult && loserResult && loserResult.effectiveDps > 0	? (Math.abs(diff) / loserResult.effectiveDps) * 100	: 0

	return {
		type,
		build1: result1,
		build2: result2,
		winner,
		diff: Math.abs(diff),
		percentMore,
	}
}

async function askForDamageType() {
	const rl = createInterface({ input, output })

	try {
		const answer = await rl.question("Damage type (spell / melee): ")
		const type = answer.trim().toLowerCase()

		if (type !== "spell" && type !== "melee") {
			throw new Error(`Unknown damage type: ${type}. Use "spell" or "melee".`)
		}

		return type
	} finally {
		rl.close()
	}
}

function printCompareResult(comparison) {
	const { build1, build2, winner, diff, percentMore } = comparison

	console.log("--- BUILD 1 ---")
	console.log(`  Base DPS:      ${build1.baseDps}`)
	console.log(`  Percent:       ${build1.percent}%`)
	console.log(`  Flat:          ${build1.flat}`)
	if (build1.type === "melee") {
		console.log(`  Attack speed:  ${build1.attackSpeed}`)
	}
	console.log(`  Effective DPS: ${build1.effectiveDps.toFixed(2)}`)
	console.log("")
	console.log("--- BUILD 2 ---")
	console.log(`  Base DPS:      ${build2.baseDps}`)
	console.log(`  Percent:       ${build2.percent}%`)
	console.log(`  Flat:          ${build2.flat}`)
	if (build2.type === "melee") {
		console.log(`  Attack speed:  ${build2.attackSpeed}`)
	}
	console.log(`  Effective DPS: ${build2.effectiveDps.toFixed(2)}`)
	console.log("")

	if (winner === null) {
		console.log("Both builds are equal in effective DPS.")
	} else {
		console.log(
			`Build ${winner} has more damage by ${diff.toFixed(2)} effective DPS (${percentMore.toFixed(2)}% more).`
		)
	}
}

export async function runCompareCommand() {
	console.clear()
	const type = await askForDamageType()

	console.log("\n--- BUILD 1 ---")
	const baseDps1 = await askForBaseDps("Base DPS: ")
	const percent1 = await askForNumber("Percent damage (%): ", "percent")
	const flat1 = await askForNumber("Flat damage: ", "flat")
	const attackSpeed1 = type === "melee" ? await askForAttackSpeed() : "normal"

	console.log("\n--- BUILD 2 ---")
	const baseDps2 = await askForBaseDps("Base DPS: ")
	const percent2 = await askForNumber("Percent damage (%): ", "percent")
	const flat2 = await askForNumber("Flat damage: ", "flat")
	const attackSpeed2 = type === "melee" ? await askForAttackSpeed() : "normal"

	const comparison = compareBuildDps(
		{ baseDps: baseDps1, percent: percent1, flat: flat1 },
		{ baseDps: baseDps2, percent: percent2, flat: flat2 },
		type,
		attackSpeed1,
		attackSpeed2
	)

	console.log("")
	printCompareResult(comparison)
	await waitForEnterToClear()
	return comparison
}

export async function runSpellCommand() {
    console.clear()
	const baseDps = await askForBaseDps("Choose spell baseDPS: ")
	const result = await spellPercentToFlat(baseDps, 1)
	printResult(result)
	await waitForEnterToClear()
	return result
}

export async function runMeleeCommand() {
    console.clear()
	const baseDps = await askForBaseDps("Choose melee baseDPS: ")
	const attackSpeed = await askForAttackSpeed()
	const result = await meleePercentToFlatByAttackSpeed(baseDps, attackSpeed, 1)
	printResult(result)
	await waitForEnterToClear()
	return result
}
