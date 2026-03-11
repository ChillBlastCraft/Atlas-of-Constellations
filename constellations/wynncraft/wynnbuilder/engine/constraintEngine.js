export function canStillPassConstraints(partialStats, remainingSlotsMax, mins) {
    for (const [stat, minVal] of Object.entries(mins)) {
        if (minVal > 0) {
            let partial = 0
            if (partialStats[stat] !== undefined && partialStats[stat] !== null) {
                partial = partialStats[stat]
            }

            let remaining = 0
            if (remainingSlotsMax[stat] !== undefined && remainingSlotsMax[stat] !== null) {
                remaining = remainingSlotsMax[stat]
            }
            
            if ((partial + remaining) < minVal) {
                return false
            }
        }
    }
    return true
}