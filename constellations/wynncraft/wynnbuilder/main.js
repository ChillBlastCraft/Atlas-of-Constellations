import { runMeleeCommand, runSpellCommand } from "./calculator/dpsEquivalence.js"

function printUsage() {
	console.log("Usage:")
    console.log("  node main.js help")
    console.log(" ")
	console.log("  node main.js spells")
	console.log("  node main.js melee")
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

	console.error(`Unknown mode: ${mode}`)
	printUsage()
}

try { 
    await main()
} catch (error) {
    console.error("An error occurred:", error)
    process.exitCode = 1
}
