import { TRACKED_STATS } from '../config/priorities.js'
import { canStillPassConstraints } from './constraintEngine.js'
import { scoreBuild } from './scoringEngine.js'
import { computeRotationDPS } from './damageEngine.js'

const STAT_KEYS = Object.keys(TRACKED_STATS)

function emptyStats() {
    return Object.fromEntries(STAT_KEYS.map(k => [k, 0]))
}

function addStats(a, b) {
    const result = {}
    for (const k of STAT_KEYS) {
        let aVal = 0
        if (a[k] !== undefined && a[k] !== null) {
            aVal = a[k]
        }

        let bVal = 0
        if (b[k] !== undefined && b[k] !== null) {
            bVal = b[k]
        }
        result[k] = aVal + bVal
    }
    return result
}

function maxOfPool(pool) {
    const max = emptyStats()
    for (const item of pool) {
        for (const k of STAT_KEYS) {
            let itemVal = 0
            if (item[k] !== undefined && item[k] !== null) {
                itemVal = item[k]
            }
             
            if (itemVal > max[k]) {
                max[k] = itemVal
            }
        }
    }
    return max
}

export function optimizeBeam(weapons, helmets, chestplates, leggings, boots, rings1, rings2, bracelets, necklaces, mins, weights, beamWidth = 50, dpsConfig = null) {
    let beam = [{ items: [], stats: emptyStats(), score: 0 }]

    const slots = [
        { name: 'weapon',   pool: weapons },
        { name: 'helmet',   pool: helmets },
        { name: 'chest',    pool: chestplates },
        { name: 'leggings', pool: leggings },
        { name: 'boots',    pool: boots },
        { name: 'ring1',    pool: rings1 },
        { name: 'ring2',    pool: rings2 },
        { name: 'bracelet', pool: bracelets },
        { name: 'necklace', pool: necklaces },
    ].map(s => ({ ...s, maxStats: maxOfPool(s.pool) }))

    for (let slotIndex = 0; slotIndex < slots.length; slotIndex++) {
        const slot = slots[slotIndex]
        const newBeam = []

        const remainingMax = slots.slice(slotIndex + 1).reduce(
            (acc, s) => addStats(acc, s.maxStats),
            emptyStats()
        )

        for (const partial of beam) {
            for (const item of slot.pool) {
                const newStats = addStats(partial.stats, item)

                if (!canStillPassConstraints(newStats, remainingMax, mins)) { continue }

                let score
                if (dpsConfig) {
                    const realDPS = computeRotationDPS(
                        newStats,
                        dpsConfig.rotation,
                        dpsConfig.spellDefs,
                        dpsConfig.abilityNodes,
                        dpsConfig.activeNodes
                    )
                    let dpsWeight = 1
                    if (dpsConfig.dpsWeight !== undefined && dpsConfig.dpsWeight !== null) {
                        dpsWeight = dpsConfig.dpsWeight
                    }
                    score = realDPS * dpsWeight + scoreBuild(newStats, weights)
                } else {
                    score = scoreBuild(newStats, weights)
                }

                newBeam.push({
                    items: [...partial.items, item],
                    stats: newStats,
                    score,
                })
            }
        }

        newBeam.sort((a, b) => b.score - a.score)
        beam = newBeam.slice(0, beamWidth)

        if (beam.length === 0) {
            console.error(`[optimizer] Beam empty after slot "${slot.name}" — all candidates pruned by constraints.`)
            return null
        }
    }

    if (beam.length > 0 && beam[0] !== undefined && beam[0] !== null) {
        return beam[0]
    }
    return null
}