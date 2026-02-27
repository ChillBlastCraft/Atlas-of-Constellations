import { weapons, helmets, chestplates } from './data/mockData.js'
import { optimize } from './engine/optimizer.js'

const constraints = {
    minMana: 20,
    minEHP: 8000
}

const weights = {
    damage: 1,
    mana: 5,
    ehp: 0.1
}

const results = optimize(weapons, helmets, chestplates, constraints, weights)
console.log(results)