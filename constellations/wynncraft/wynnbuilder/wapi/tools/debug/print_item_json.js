import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const name = process.argv[2] || 'Warchief'
const dataPath = path.join(__dirname, '..', '..', 'data', 'items.categorized.json')
const items = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
const it = items.find(i=>i.name && i.name.toLowerCase()===name.toLowerCase())
if (!it) { console.error('Not found:', name); process.exit(1)}
console.log(JSON.stringify(it, null, 2))
