const MANUAL_SP_LIMIT = 900  // Adjusted for high-tier gear

export function canStillPassConstraints(partialStats, remainingSlotsMax, mins) {
    // Check minimum stat constraints
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
    
    // Check skillpoint constraints  
    if (!satisfiesSkillpointLimits(partialStats, remainingSlotsMax)) {
        return false
    }
    
    return true
}

function satisfiesSkillpointLimits(partialStats, remainingSlotsMax) {
    const skillpoints = ['reqStr', 'reqDex', 'reqInt', 'reqDef', 'reqAgi']
    const bonuses = ['strength', 'dexterity', 'intelligence', 'defence', 'agility']
    
    let minManualPoints = 0
    let maxManualPoints = 0
    
    for (let i = 0; i < skillpoints.length; i++) {
        const reqStat = skillpoints[i]
        const bonusStat = bonuses[i]
        
        // Get current requirements and bonuses
        let currentReq = partialStats[reqStat] || 0
        let currentBonus = partialStats[bonusStat] || 0
        
        // Get remaining possible requirements and bonuses
        let maxRemainingReq = remainingSlotsMax[reqStat] || 0
        let maxRemainingBonus = remainingSlotsMax[bonusStat] || 0
        
        // Calculate manual points needed in best and worst case
        let minRequired = currentReq
        let maxRequired = currentReq + maxRemainingReq
        let maxAvailableBonus = currentBonus + maxRemainingBonus
        
        // Best case: maximum bonus, minimum requirements
        let bestCaseManual = Math.max(0, minRequired - maxAvailableBonus)
        minManualPoints += bestCaseManual
        
        // Worst case: maximum requirements, current bonus only
        let worstCaseManual = Math.max(0, maxRequired - currentBonus)
        maxManualPoints += worstCaseManual
    }
    
    // If even the best case scenario exceeds limits, this build path is impossible
    return minManualPoints <= MANUAL_SP_LIMIT
}