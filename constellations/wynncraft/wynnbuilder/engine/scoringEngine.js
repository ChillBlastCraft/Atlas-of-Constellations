export function scoreBuild(stats, weights) {
    let score = 0
    for (const [stat, weight] of Object.entries(weights)) {
        if (weight) {
            let statVal = 0
            if (stats[stat] !== undefined && stats[stat] !== null) {
                statVal = stats[stat]
            }
            score += statVal * weight
        }
    }
    return score
}
