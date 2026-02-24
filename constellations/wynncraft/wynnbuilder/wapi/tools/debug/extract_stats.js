import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const file = path.join(__dirname, '..', '..', 'data', 'items.categorized.json')
const raw = fs.readFileSync(file, 'utf8')
let data
try {
  data = JSON.parse(raw)
} catch (e) {
  console.error('Failed to parse JSON:', e.message)
  process.exit(1)
}

const keys = new Set()
const nested = new Set()

function visit(obj, prefix = '') {
  if (!obj || typeof obj !== 'object') return
  for (const k of Object.keys(obj)) {
    const p = prefix ? `${prefix}.${k}` : k
    keys.add(k)
    nested.add(p)
    visit(obj[k], p)
  }
}

for (const it of data) {
  visit(it)
}

const sortedKeys = Array.from(keys).sort((a,b)=>a.localeCompare(b))
const sortedNested = Array.from(nested).sort((a,b)=>a.localeCompare(b))

console.log('--- Top-level property names (unique) ---')
for (const k of sortedKeys) console.log(k)
console.log('\n--- Nested property paths (sample) ---')
for (const p of sortedNested) console.log(p)

// Also output a JSON file for further manual mapping if needed
fs.writeFileSync(path.join(__dirname, '..', 'stats-keys.json'), JSON.stringify({keys: sortedKeys, paths: sortedNested}, null, 2))
console.log('\nWrote tools/stats-keys.json')
