import { canStillPassConstraints } from "./constraintEngine.js"
import { scoreBuild } from "./scoringEngine.js"

export function optimizeBeam(weapons, helmets, chestplates, constraints, weights, beamWidth = 3) {
    const maxWeapon = weapons.reduce((max, w) => ({
        dps: Math.max(max.dps, w.dps),
        hp: Math.max(max.hp, w.hp),
        manaRegen: Math.max(max.manaRegen, w.manaRegen)
    }), { dps: 0, hp: 0, manaRegen: 0 })

    const maxHelmet = helmets.reduce((max, h) => ({
        dps: Math.max(max.dps, h.dps),
        hp: Math.max(max.hp, h.hp),
        manaRegen: Math.max(max.manaRegen, h.manaRegen)
    }), { dps: 0, hp: 0, manaRegen: 0 })

    const maxChest = chestplates.reduce((max, c) => ({
        dps: Math.max(max.dps, c.dps),
        hp: Math.max(max.hp, c.hp),
        manaRegen: Math.max(max.manaRegen, c.manaRegen)
    }), { dps: 0, hp: 0, manaRegen: 0 })

    let beam = [{
        items: [],
        stats: { dps: 0, hp: 0, manaRegen: 0 },
        score: 0
    }]

    const slots = [
        { name: 'weapon', pool: weapons, maxStats: maxWeapon },
        { name: 'helmet', pool: helmets, maxStats: maxHelmet },
        { name: 'chest', pool: chestplates, maxStats: maxChest }
    ]

    for (let slotIndex = 0; slotIndex < slots.length; slotIndex++) {
        const slot = slots[slotIndex]
        const newBeam = []

        for (const partial of beam) {
            for (const item of slot.pool) {
                const newItem = [...partial.items, item]
                const newStats = {
                    dps: partial.stats.dps + item.dps,
                    hp: partial.stats.hp + item.hp,
                    manaRegen: partial.stats.manaRegen + item.manaRegen
                }

                const remainingMax = slots.slice(slotIndex + 1).reduce((acc, s) => ({
                    dps: acc.dps + s.maxStats.dps,
                    hp: acc.hp + s.maxStats.hp,
                    manaRegen: acc.manaRegen + s.maxStats.manaRegen
                }), { dps: 0, hp: 0, manaRegen: 0 })

                if (!canStillPassConstraints(newStats, remainingMax, constraints)) {
                    continue
                }

                const score = scoreBuild(newStats, weights)

                newBeam.push({ items: newItem, stats: newStats, score })
            }
        }
        newBeam.sort((a, b) => b.score - a.score)
        beam = newBeam.slice(0, beamWidth)
    }
    return beam[0]
}