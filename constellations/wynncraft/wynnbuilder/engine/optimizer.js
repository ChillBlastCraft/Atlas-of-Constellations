import { aggregateStats } from './statsEngine.js'
import { passesConstraints } from './constraintEngine.js'
import { scoreBuild } from './scoringEngine.js'

export function optimize(weapons, helmets, chestplates, constraints, weights) {
    let bestBuild = null
    let bestScore = -Infinity

    for (const weapon of weapons) {
        for (const helmet of helmets) {
            for (const chest of chestplates) {
                const stats = aggregateStats(weapon, helmet, chest)

                if (!passesConstraints(stats, constraints)) {
                    continue
                }

                const score = scoreBuild(stats, weights)

                if (score > bestScore) {
                    bestScore = score
                    bestBuild = { weapon, helmet, chest, stats, score }
                }
            }
        }
    }
    return bestBuild
}