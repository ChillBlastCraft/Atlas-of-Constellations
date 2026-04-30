import { createInterface } from "node:readline/promises"
import { stdin as input, stdout as output } from "node:process"

/*
 * WynnCraft skill point scaling.
 * Source: https://wynncraft.wiki.gg/wiki/Skill_Points
 *
 * The five skills and what they provide:
 *   Strength   → damage bonus %          (0–80.8% at 150)
 *   Dexterity  → crit chance %           (0–80.8% at 150)
 *   Intelligence → spell cost reduction % (0–50% at 150) + mana/water damage % (0–80.8% at 150)
 *   Defence    → damage reduction %      (0–70.0% at 150)
 *   Agility    → dodge chance %          (0–76.8% at 150)
 */

const SKILLS = [
	{ label: "Strength",      element: "Earth",   effects: ["damage bonus", "earth damage bonus"] },
	{ label: "Dexterity",     element: "Thunder", effects: ["crit chance", "thunder damage bonus"] },
	{ label: "Intelligence",  element: "Water",   effects: ["spell cost reduction", "mana / water damage bonus"] },
	{ label: "Defence",       element: "Fire",    effects: ["damage reduction", "fire damage bonus"] },
	{ label: "Agility",       element: "Air",     effects: ["dodge chance", "air damage bonus"] },
]

const SKILL_OPTIONS = SKILLS.map(({ label }) => label)

/*
 * Polynomial formula for the base skill point scaling.
 * Source: https://wynncraft.wiki.gg/wiki/Skill_Points#Notes
 * Note: Whoever made up this formula needs to be killed 
 */
function baseScale(x) {
	if (x <= 0) { return 0 }

	return (
		-0.0000000166 * x ** 4 +
		 0.0000122614 * x ** 3 +
		-0.0044972984 * x ** 2 +
		 0.9931907398 * x +
		 0.0093811967
	)
}

/*
 * Returns an array of { label, value } objects describing
 * the full effect of investing `points` into `skill`.
 */
function getSkillEffects(skill, points) {
	const scaled = baseScale(points)

	if (skill === "Strength") {
		return [
            { label: "Damage bonus", value: scaled },
            { label: "Earth damage bonus", value: scaled }

        ]
	}

	if (skill === "Dexterity") {
		return [
            { label: "Crit chance", value: scaled },
            { label: "Thunder damage bonus", value: scaled }

        ]
	}

	if (skill === "Intelligence") {
		const costReduction = (scaled * 50) / 80.8
		return [
			{ label: "Spell cost reduction", value: costReduction },
			{ label: "Mana / Water damage bonus", value: scaled },
		]
	}

	if (skill === "Defence") {
		return [
			{ label: "Damage reduction", value: scaled * 0.867 },
			{ label: "Fire damage bonus", value: scaled },
		]
	}

	if (skill === "Agility") {
		return [
			{ label: "Dodge chance", value: scaled * 0.951 },
			{ label: "Air damage bonus", value: scaled },
		]
	}

	throw new Error(`Unknown skill: ${skill}`)
}

async function askForSkill() {
	const rl = createInterface({ input, output })
	try {
		console.log("Choose a skill:")
		for (const [i, skill] of SKILLS.entries()) {
			console.log(`  ${i + 1}. ${skill.label} (${skill.element})`)
		}
		const answer = await rl.question("Skill number: ")
		const index = Number(answer.trim()) - 1
		const selected = SKILLS[index]
		if (!selected) {
			throw new Error(`Invalid skill number: ${answer.trim()}`)
		}
		return selected.label
	} finally {
		rl.close()
	}
}

async function askForPoints(promptText) {
	const rl = createInterface({ input, output })
	try {
		const answer = await rl.question(promptText)
		const value = Math.floor(Number(answer.trim()))
		if (!Number.isFinite(value) || value < 0) {
			throw new Error(`Skill points must be a non-negative integer. Received: ${answer.trim()}`)
		}
		return value
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

export async function runAbilityCommand() {
	console.clear()
	const skill = await askForSkill()
	const before = await askForPoints("Before (skill points): ")
	const after  = await askForPoints("After  (skill points): ")

	const beforeEffects = getSkillEffects(skill, before)
	const afterEffects  = getSkillEffects(skill, after)

	console.log(`\n--- ${skill.toUpperCase()} (${before} → ${after} points) ---\n`)

	console.log("a) Effect at AFTER value:")
	for (const effect of afterEffects) {
		console.log(`   ${effect.value.toFixed(1)}% ${effect.label}`)
	}

	console.log("\nb) Change from BEFORE to AFTER:")
	for (let i = 0; i < afterEffects.length; i++) {
		const bef = beforeEffects[i]
		const aft = afterEffects[i]
		const absoluteChange = aft.value - bef.value
		const relativeChange = bef.value > 0 ? (absoluteChange / bef.value) * 100 : null

		console.log(`   ${aft.label}:`)
		console.log(`     Before:   ${bef.value.toFixed(1)}%`)
		console.log(`     After:    ${aft.value.toFixed(1)}%`)
		console.log(`     Change:   ${absoluteChange >= 0 ? "+" : ""}${absoluteChange.toFixed(1)} percentage points`)
		if (relativeChange !== null) {
			console.log(`     Relative: ${relativeChange >= 0 ? "+" : ""}${relativeChange.toFixed(1)}% ${relativeChange >= 0 ? "more" : "less"} effective`)
		} else {
			console.log(`     Relative: N/A (before was 0%)`)
		}
	}

	console.log("")
	await waitForEnterToClear()
}
