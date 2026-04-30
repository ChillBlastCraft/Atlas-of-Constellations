import { createInterface } from "node:readline/promises"
import { stdin as input, stdout as output } from "node:process"


/* 
* given attack speed with its label with hits per second value
* this is important for calculating melee DPS equivalence
*     as melee DPS depends on how many hits you can land per second
*/
const ATTACK_SPEEDS = [
	{ label: "super fast", value: 4.3 },
	{ label: "very fast", value: 3.1 },
	{ label: "fast", value: 2.5 },
	{ label: "normal", value: 2.05 },
	{ label: "slow", value: 1.5 },
	{ label: "very slow", value: 0.83 },
	{ label: "super slow", value: 0.51 },
]
const ATTACK_SPEED_OPTIONS = ATTACK_SPEEDS.map(({ label }) => label)

function validateBaseDps(baseDps, label) {
	if (!Number.isFinite(baseDps) || baseDps < 0) {
		throw new Error(`${label} must be a number >= 0. Received: ${baseDps}`)
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

	return {
		attackSpeed,
		hitsPerSecond: entry.value,
	}
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
* returns how much raw spell damage would equal `percent` spell damage
* assuming `baseSpellDps` is your current spell DPS baseline.
*/ 
export async function spellPercentToFlat(baseSpellDps, percent = 1) {
	validateBaseDps(baseSpellDps, "baseSpellDps")
	validateBaseDps(percent, "percent")

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
* assuming `baseMeleeDps` is your current melee DPS baseline.
*/
export async function meleePercentToFlat(baseMeleeDps, percent = 1) {
	return meleePercentToFlatByAttackSpeed(baseMeleeDps, "normal", percent)
}

export async function meleePercentToFlatByAttackSpeed(baseMeleeDps, attackSpeed, percent = 1) {
	validateBaseDps(baseMeleeDps, "baseMeleeDps")
	validateBaseDps(percent, "percent")

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
