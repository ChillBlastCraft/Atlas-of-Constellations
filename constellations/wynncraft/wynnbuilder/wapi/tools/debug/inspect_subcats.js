import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const names = ['Warchief','Stardew','Dawnbreak','Moontower','Resurgence','Discoverer']
const dataPath = path.join(__dirname, '..', '..', 'data', 'items.categorized.json')
const items = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
for (const n of names) {
  const matches = items.filter(it => it.name && it.name.toLowerCase().includes(n.toLowerCase()))
  console.log('\n--', n, '->', matches.length, 'match(es)')
  for (const m of matches) {
    console.log(m.name, 'category=', m.category, 'subcategory=', m.subcategory, 'rarity=', m.rarity || m.tier)
  }
}
