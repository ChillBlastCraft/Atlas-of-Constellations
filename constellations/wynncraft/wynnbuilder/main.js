import { runMeleeCommand, runSpellCommand, runCompareCommand } from "./calculator/dpsEquivalence.js"
import { runAbilityCommand } from "./calculator/abilityPointDistribution.js"
import { runManaCommand } from "./calculator/manaSustain.js"
import { runEhpCommand } from "./calculator/effectiveEHP.js"

function printUsage() {
	console.log("Usage:")
    console.log("  node main.js help")
	console.log("  node main.js spells")
	console.log("  node main.js melee")
	console.log("  node main.js compare")	
    console.log("  node main.js ability")
    console.log("  node main.js mana")
    console.log("  node main.js ehp")
}

async function main() {
	const [, , mode] = process.argv

	if (!mode) {
		printUsage()
		return
	}

    if (mode == "help" || mode == "information") {
        console.clear()
        console.log("-spells = Finds relation between % spell damage, and flat spell damage based on your current baseDPS.")
        console.log("-melee = Finds relation between % melee damage, and flat melee damage based on your current baseDPS and attack speed.")
        console.log("-compare = Compares two builds by effective DPS given baseDPS, % damage, and flat damage each.")
        console.log("-ability = Shows the effect of a skill point investment (before/after) for any of the 5 core skills.")
        console.log("-mana = Calculates mana sustainability for a spell rotation and shows regen vs cost-reduction equivalence.")
        console.log("-ehp = Calculates effective hit pool from DEF and AGI skill points, and finds the minimum investment to reach a target EHP.")
		return
    }

	if (mode === "spells" || mode === "spell") {
		await runSpellCommand()
		return
	}

	if (mode === "melee") {
		await runMeleeCommand()
		return
	}

	if (mode === "compare") {
		await runCompareCommand()
		return
	}

	if (mode === "ability" || mode === "abilities") {
		await runAbilityCommand()
		return
	}

	if (mode === "mana") {
		await runManaCommand()
		return
	}

	if (mode === "ehp") {
		await runEhpCommand()
		return
	}

	console.error(`Unknown mode: ${mode}`)
	printUsage()
}

try { 
    await main()
} catch (error) {
    console.error("An error occurred:", error)
    process.exitCode = 1
}
