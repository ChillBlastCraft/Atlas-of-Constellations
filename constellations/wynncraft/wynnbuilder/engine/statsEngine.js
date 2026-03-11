import { TRACKED_STATS } from '../config/priorities.js'

export function aggregateStats(...items) {
    const totals = Object.fromEntries(Object.keys(TRACKED_STATS).map(k => [k, 0]))
    for (const item of items) {
        for (const key of Object.keys(TRACKED_STATS)) {
            let totalsVal = 0
            if (totals[key] !== undefined && totals[key] !== null) {
                totalsVal = totals[key]
            }
            let itemVal = 0
            if (item[key] !== undefined && item[key] !== null) {
                itemVal = item[key]
            }
            totals[key] = totalsVal + itemVal
        }
    }
    return totals
}