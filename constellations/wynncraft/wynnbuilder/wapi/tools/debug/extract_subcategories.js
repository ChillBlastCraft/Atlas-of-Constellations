import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const file = path.join(__dirname, '..', '..', 'data', 'items.categorized.json')
const raw = fs.readFileSync(file, 'utf8')
const data = JSON.parse(raw)

const map = {}
for (const it of data) {
  const cat = it.category || 'Unknown'
  const sub = it.subcategory || it.subcategory || 'General'
  if (!map[cat]) map[cat] = new Set()
  map[cat].add(sub)
}

const out = {}
for (const k of Object.keys(map)) out[k] = Array.from(map[k]).sort()

fs.writeFileSync(path.join(__dirname, '..', 'subcategories.json'), JSON.stringify(out, null, 2))
console.log('Wrote tools/subcategories.json')
