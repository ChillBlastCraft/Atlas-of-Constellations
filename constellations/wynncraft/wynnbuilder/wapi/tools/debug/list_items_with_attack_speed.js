import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataPath = path.join(__dirname, '..', '..', 'data', 'items.categorized.json')
const items = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
function getAttackSpeed(item) {
  const paths = ['rawAttackSpeed','attackSpeed','identifications.attackSpeed','base.attackSpeed']
  for (const p of paths) {
    const parts = p.split('.')
    let cur = item
    for (const part of parts) {
      if (!cur) { cur = null; break }
      cur = cur[part]
    }
    if (cur === undefined || cur === null) continue
    if (typeof cur === 'number') return cur
    if (typeof cur === 'object') {
      if (typeof cur.raw === 'number') return cur.raw
      if (typeof cur.max === 'number') return cur.max
    }
  }
  return null
}
let count=0
for (const it of items) {
  const asp = getAttackSpeed(it)
  if (asp !== null) {
    count++
  }
}
console.log('Items with attack speed:', count, 'of', items.length)
// print first 20 examples
let printed=0
for (const it of items) {
  const asp = getAttackSpeed(it)
  if (asp !== null) {
    console.log(it.name || it.internalName || '[no name]', '->', asp, 'category=', it.category, 'sub=', it.subcategory)
    printed++
    if (printed>=20) break
  }
}
