(function () {
	const mainContent = document.getElementById('main-content')
	const builderContent = document.getElementById('builder-content')
	const calcContent = document.getElementById('calc-content')
	const atlasContent = document.getElementById('atlas-content')
	const crafterContent = document.getElementById('crafter-content')

	const navButtons = [
		{ id: 'btn-builder', content: builderContent },
		{ id: 'btn-calc', content: calcContent },
		{ id: 'btn-atlas', content: atlasContent },
		{ id: 'btn-crafter', content: crafterContent }
	]

	navButtons.forEach(btn => {
		document.getElementById(btn.id).addEventListener('click', function () {
			navButtons.forEach(b => {
				document.getElementById(b.id).classList.remove('active')
				b.content.classList.add('hidden')
			})
			this.classList.add('active')
			btn.content.classList.remove('hidden')
		})
	})

	const statGroupDropdown = document.querySelector('.atlas-stat-group-dropdown')
	const statFiltersList = document.querySelector('.atlas-stat-filters-list')
	const categoryDropdown = document.querySelector('.atlas-category-dropdown')
	const rarityDropdown = document.querySelector('.atlas-rarity-dropdown')

	const categories = ['Weapons','Armour','Accessories','Ingredients','Consumable','Tome']
	const rarities = ['normal','unique','rare','set','legendary','fabled','mythic','non-rarity','special']

	// subcategories per item category (extracted from items data)
	const subcategories = {
		'Weapons': ['Axe','Bow','Dagger','Relik','Spear','Staff','Sword','Wand'],
		'Armour': ['Boots','Chestplate','Helmet','Leggings','Shield','UNKNOWN'],
		'Accessories': ['Bracelet','Necklace','Ring','Trinket']
	}

	// build quick lookup for subcategory -> category
	const subcatLookup = {}
	for (const [cat, list] of Object.entries(subcategories)) {
		for (const s of list) subcatLookup[s.toLowerCase()] = cat
	}
	// common synonyms
	const subcatSynonyms = {
		'helm': 'helmet',
		'boots': 'boots',
		'chest': 'chestplate',
		'chestplate': 'chestplate',
		'leggings': 'leggings',
		'shield': 'shield',
		'bracelet': 'bracelet',
		'necklace': 'necklace',
		'ring': 'ring',
		'trinket': 'trinket',
		'staff': 'staff',
		'wand': 'wand',
		'sword': 'sword',
		'dagger': 'dagger'
	}

	const stats = [
		'1st Spell Cost%',
		'2nd Spell Cost%',
		'3rd Spell Cost%',
		'4th Spell Cost%',
		'Agility',
		'Agility Requirement',
		'Attack Speed',
		'Attack Speed Bonus',
		'Attribute Requirements',
		'Attributes',
		'Base Air Damage',
		'Base Air Defence',
		'Base Damage',
		'Base Defense',
		'Base Earth Damage',
		'Base Earth Defence',
		'Base Fire Damage',
		'Base Fire Defence',
		'Base Health',
		'Base HP',
		'Base Loot Bonus',
		'Base Thunder Damage',
		'Base Thunder Defence',
		'Base Water Damage',
		'Base Water Defence',
		'Bonus HP',
		'Crit Damage Bonus%',
		'Damage%',
		'Defense',
		'Dexterity',
		'Dexterity Requirement',
		'Exploding',
		'Health % Regen',
		'Health Regen',
		'Intelligence',
		'Intelligence Requirement',
		'Jump Height',
		'Life Steal',
		'Level Requirement',
		'Loot Bonus',
		'Main Attack Damage',
		'Mana Regen',
		'Mana Steal',
		'Powder Slots',
		'Rarity',
		'Raw 1st Spell Cost',
		'Raw 2nd Spell Cost',
		'Raw 3rd Spell Cost',
		'Raw 4th Spell Cost',
		'Raw Agility',
		'Raw Air Damage',
		'Raw Air Main Attack Damage',
		'Raw Air Spell Damage',
		'Raw Air Defence',
		'Raw Attack Speed',
		'Raw Damage',
		'Raw Defence',
		'Raw Dexterity',
		'Raw Earth Damage',
		'Raw Earth Main Attack Damage',
		'Raw Earth Spell Damage',
		'Raw Earth Defence',
		'Raw Elemental Damage',
		'Raw Elemental Main Attack Damage',
		'Raw Elemental Spell Damage',
		'Raw Fire Damage',
		'Raw Fire Main Attack Damage',
		'Raw Fire Spell Damage',
		'Raw Fire Defence',
		'Raw Health Regen',
		'Raw Health',
		'Raw Intelligence',
		'Raw Main Attack Damage',
		'Raw Max Mana',
		'Raw Neutral Damage',
		'Raw Neutral Main Attack Damage',
		'Raw Neutral Spell Damage',
		'Raw Spell Damage',
		'Raw Strength',
		'Raw Thunder Damage',
		'Raw Thunder Main Attack Damage',
		'Raw Thunder Spell Damage',
		'Raw Thunder Defence',
		'Raw Water Damage',
		'Raw Water Main Attack Damage',
		'Raw Water Spell Damage',
		'Raw Water Defence',
		'Reflection',
		'Stealing',
		'Strength',
		'Strength Requirement',
		'Melee Damage%',
		'Tome Type',
		'Tool Type',
		'Poison',
		'Walk Speed'
	]

	function populateDropdown(dropdown, items, includeAny = true) {
		if (!dropdown) return
		// leave first option (ANY) if present
		while (dropdown.options.length > 1) dropdown.remove(1)
		for (const it of items) {
			const o = document.createElement('option')
			o.value = it
			o.textContent = it[0] ? it[0].toUpperCase() + it.slice(1) : it
			dropdown.appendChild(o)
		}
	}

	populateDropdown(categoryDropdown, categories)
	populateDropdown(rarityDropdown, rarities)

	// append category:subcategory entries into the main item category dropdown
	if (categoryDropdown) {
		// keep existing top-level category options (ANY + categories)
		for (const cat of Object.keys(subcategories)) {
			const list = subcategories[cat] || []
			for (const sub of list) {
				const o = document.createElement('option')
				// value encodes both category and subcategory for later parsing
				o.value = `${cat}|${sub}`
				o.textContent = `${cat}: ${sub}`
				categoryDropdown.appendChild(o)
			}
		}
	}

	if (statGroupDropdown) {
		// populate stat selector used to add groups
		while (statGroupDropdown.options.length > 1) statGroupDropdown.remove(1)
		for (const s of stats) {
			const o = document.createElement('option')
			o.value = s
			o.textContent = s
			statGroupDropdown.appendChild(o)
		}
	}

	// Search handler
	const searchBtn = document.querySelector('.atlas-search-btn')
	const searchInput = document.querySelector('.atlas-search-input')
	const resultsContainer = document.getElementById('atlas-results')
	const suggestionsContainer = document.getElementById('atlas-suggestions')
	let itemsCache = null

	function normalizeKeyName(s) {
		return ('' + s).toLowerCase().replace(/[^a-z0-9]/g, '')
	}

	function valueMatches(v, min, max) {
		if (min == null && max == null) return true
		const n = (typeof v === 'number') ? v : (v && typeof v.raw === 'number' ? v.raw : (v && typeof v.max === 'number' ? v.max : null))
		if (n == null) return false
		if (min != null && n < min) return false
		if (max != null && n > max) return false
		return true
	}

	function getStatValue(item, statName) {
		const t = normalizeKeyName(statName)
		const get = (paths) => {
			for (const p of paths) {
				const parts = p.split('.')
				let cur = item
				let ok = true
				for (const part of parts) {
					if (!cur) { ok = false; break }
					cur = cur[part]
				}
				if (!ok || cur === undefined || cur === null) continue
				if (typeof cur === 'number') return cur
				if (typeof cur === 'object') {
					if (typeof cur.raw === 'number') return cur.raw
					if (typeof cur.max === 'number') return cur.max
				}
			}
			return null
		}


		// Base DPS
		if (t === 'basedps') {
			const dmg = get([
				'base.baseDamage.raw','base.baseDamage',
				'rawMainAttackDamage','rawMainAttackDamage.raw',
				'rawDamage','rawDamage.raw',
				'base.baseDamage.max','base.baseDamage.min',
				'identifications.rawMainAttackDamage','identifications.mainAttackDamage','identifications.rawDamage'
			])
			const asp = get(['rawAttackSpeed','attackSpeed','base.attackSpeed','identifications.rawAttackSpeed','identifications.attackSpeed'])
			if (dmg == null) return null
			const a = (asp == null) ? 1 : asp
			return dmg * a
		}

		// elemental / neutral / raw damage: try direct paths
		if (t.endsWith('damage') || t.startsWith('raw')) {
			const compact = statName.replace(/\s+/g,'')
			const direct = get([
				`base.${compact}.raw`,
				`raw${compact}`,
				compact,
				`identifications.${compact}`,
				`identifications.raw${compact}`
			])
			if (direct != null) return direct
		}

		// attack speed
		if (t === 'attackspeed' || t === 'attackspeedbonus') {
			return get(['rawAttackSpeed','attackSpeed','base.attackSpeed'])
		}

		// other simple mappings
		if (t === 'manaregen') return get(['manaRegen','rawMaxMana'])
		if (t === 'healthregen' || t === 'healthpercentregen' || t === 'health%regen') return get(['healthRegen','healthRegenRaw','rawHealth'])
		if (t === 'hp' || t === 'basehp' || t === 'basehealth') return get(['base.baseHealth','rawHealth'])
		if (t === 'powderslots') return get(['powderSlots'])
		if (t === 'reflection') return get(['reflection'])
		if (t === 'lootbonus') return get(['lootBonus','leveledLootBonus','base.leveledLootBonus'])
		if (t === 'stealing') return get(['stealing','manaSteal','lifeSteal'])

		return null
	}

	function inferSubcategory(item) {
		if (!item) return ''
		// prefer explicit subcategory if meaningful
		if (item.subcategory && item.subcategory !== 'UNKNOWN') return item.subcategory
		// common fallbacks
		if (item.armourType) return item.armourType[0] ? (item.armourType[0].toUpperCase() + item.armourType.slice(1)) : item.armourType
		if (item.toolType) return item.toolType[0] ? (item.toolType[0].toUpperCase() + item.toolType.slice(1)) : item.toolType
		if (item.weaponType) return item.weaponType[0] ? (item.weaponType[0].toUpperCase() + item.weaponType.slice(1)) : item.weaponType
		if (item.type) return item.type[0] ? (item.type[0].toUpperCase() + item.type.slice(1)) : item.type
		// last resort: empty string
		return ''
	}

	function getAttackSpeedCategory(item) {
		// try to use any existing string label on item
		if (!item) return ''
		if (item.attackSpeedCategory) return item.attackSpeedCategory
		if (item.attackSpeedLabel) return item.attackSpeedLabel
		// fallback: compute numeric attack speed and map to buckets
		const asp = getStatValue(item, 'Attack Speed')
		if (asp == null) {
			// try mapping from weapon subcategory as a last resort
			const sub = (inferSubcategory(item) || '').toString().toLowerCase()
					if (sub && weaponDefaultSpeed[sub]) {
						return weaponDefaultSpeed[sub]
					}
			return ''
		}
		// reasonable buckets around 1.0 as 'normal'
		if (asp <= 0.5) return 'super_slow'
		if (asp <= 0.75) return 'very_slow'
		if (asp <= 0.95) return 'slow'
		if (asp <= 1.15) return 'normal'
		if (asp <= 1.4) return 'fast'
		if (asp <= 1.8) return 'very_fast'
		return 'super_fast'
	}

	// fallback defaults for weapon subcategories when dataset lacks attack-speed info
	const weaponDefaultSpeed = {
		'bow': 'very_slow',
		'relic': 'very_slow',
		'relik': 'very_slow',
		'spear': 'very_slow',
		'dagger': 'very_fast',
		'sword': 'normal',
		'wand': 'fast',
		'axe': 'slow',
		'staff': 'normal'
	}

	function itemHasStatFilter(item, statName, op, min, max) {
		// try derived/computed stats first
		const derived = getStatValue(item, statName)
		if (derived !== null && derived !== undefined) {
			if (op === 'NOT') return !(derived !== null)
			if (op === 'HAS') return valueMatches(derived, min, max)
			if (op === 'COUNT') return !!derived
		}

		// fallback: scan object tree for matching key
		const target = normalizeKeyName(statName)
		let found = false

		function walk(obj) {
			if (!obj || typeof obj !== 'object') return
			if (Array.isArray(obj)) {
				for (const el of obj) walk(el)
				return
			}
			for (const [k, v] of Object.entries(obj)) {
				const kNorm = normalizeKeyName(k)
				if (kNorm === target) {
					if (op === 'NOT') { found = true; return }
					if (op === 'HAS') {
						if (valueMatches(v, min, max)) { found = true; return }
					}
					if (op === 'COUNT') { if (v) { found = true; return } }
				}
				if (!found) walk(v)
				if (found) return
			}
		}
		walk(item)
		if (op === 'NOT') return !found
		return found
	}

	async function runSearch() {
		resultsContainer.innerHTML = 'Searching...'
		// ensure itemsCache is loaded so runSearch can be used standalone
		if (!itemsCache) {
			const r = await fetch('wapi/data/items.categorized.json')
			if (!r.ok) throw new Error('Failed to fetch items data')
			itemsCache = await r.json()
		}
		try {
			const items = itemsCache
			// detect if dataset has any attack speed values; if not, disable/hide the dropdown
			let datasetHasAttackSpeed = false
			try {
				for (const it of items) {
					if (getStatValue(it, 'Attack Speed') != null) { datasetHasAttackSpeed = true; break }
					if (it.attackSpeedCategory || it.attackSpeedLabel) { datasetHasAttackSpeed = true; break }
				}
			} catch (e) { datasetHasAttackSpeed = false }
			const speedSelects = document.querySelectorAll('.atlas-weapon-speed-dropdown')
			let rawInput = (searchInput && searchInput.value || '').trim()
			// allow plus as a separator (users sometimes write "armour + 500 base dps")
			rawInput = rawInput.replace(/\+/g, ',')
			// support combined inline clauses separated by commas, e.g. "weapon: staff, base dps 500"
			// parse category tokens (weapon/armour/accessory) and numeric stat tokens
			let inlineCategory = null
			let inlineSubcategory = null
			const inlineStats = []
			// if user started with a leading category word, extract it (e.g. "armour ...")
			const leadCat = rawInput.match(/^\s*(weapon|weapons|armour|armor|accessory|accessories)\b[:\s-]*(.*)$/i)
			if (leadCat) {
				const k = leadCat[1].toLowerCase()
				const rest = (leadCat[2] || '').trim()
				if (k === 'weapon' || k === 'weapons') { rawInput = rest; inlineCategory = 'Weapons' }
				else if (k === 'armour' || k === 'armor') { rawInput = rest; inlineCategory = 'Armour' }
				else if (k === 'accessory' || k === 'accessories') { rawInput = rest; inlineCategory = 'Accessories' }
			}

			// split by comma or semicolon, but keep fallback full-text if no clauses detected
			const parts = rawInput.split(/[;,]/).map(p => p.trim()).filter(p => p.length > 0)
			let freeText = ''
			for (const part of parts) {
				// category shorthand: "weapon: staff" or "category: weapons"
				const kv = part.match(/^(\w[\w ]*?)\s*[:=]\s*(.+)$/i)
				if (kv) {
					const key = kv[1].toLowerCase().trim()
					const val = kv[2].toLowerCase().trim()
					// map shorthand keys to category/subcategory
					if (key === 'weapon' || key === 'weapons' || key === 'category' && val === 'weapons') {
						// if value is a known subcategory, use it
						inlineCategory = 'Weapons'
						inlineSubcategory = val[0] ? (val[0].toUpperCase() + val.slice(1)) : val
						continue
					}
					if (key === 'armour' || key === 'armor' || key === 'armours' || (key === 'category' && val === 'armour')) {
						inlineCategory = 'Armour'
						inlineSubcategory = val[0] ? (val[0].toUpperCase() + val.slice(1)) : val
						continue
					}
					if (key === 'accessory' || key === 'accessories' || (key === 'category' && val === 'accessories')) {
						inlineCategory = 'Accessories'
						inlineSubcategory = val[0] ? (val[0].toUpperCase() + val.slice(1)) : val
						continue
					}
				}

				// numeric stat clause, e.g. "base dps 1000" or "base dps>=1000" or "500 min base dps"
				const quickMatch = part.match(/^(.+?)\s*(>=|<=|>|<|=)?\s*(\d+(?:\.\d+)?)$/i)
				if (quickMatch) {
					const statName = quickMatch[1].trim()
					const opToken = quickMatch[2] || '>='
					const val = Number(quickMatch[3])
					let min = null, max = null
					switch (opToken) {
						case '>': min = Number(val) + Number.EPSILON; break
						case '>=': min = Number(val); break
						case '<': max = Number(val) - Number.EPSILON; break
						case '<=': max = Number(val); break
						case '=': min = max = Number(val); break
					}
					inlineStats.push({ stat: statName, min, max })
					continue
				}

				// support number-first clauses like "500 min base dps" or "500 base dps"
				const numFirst = part.match(/^(\d+(?:\.\d+)?)(?:\s*(min|max))?\s+(.+)$/i)
				if (numFirst) {
					const val = Number(numFirst[1])
					const kind = (numFirst[2] || '').toLowerCase()
					const statName = numFirst[3].trim()
					let min = null, max = null
					if (kind === 'max') max = val
					else min = val
					inlineStats.push({ stat: statName, min, max })
					continue
				}

				// otherwise treat as free text search term
				freeText = freeText ? (freeText + ' ' + part) : part
			}

				// if freeText is a single word matching a known subcategory or synonym, treat it as a subcategory filter
				if (!inlineCategory && inlineStats.length === 0 && freeText) {
					const tok = freeText.toLowerCase().trim()
					let mapped = tok
					if (subcatSynonyms[tok]) mapped = subcatSynonyms[tok]
					if (mapped && subcatLookup[mapped]) {
						inlineCategory = subcatLookup[mapped]
						inlineSubcategory = mapped[0] ? (mapped[0].toUpperCase() + mapped.slice(1)) : mapped
						freeText = ''
					}
				}

			const q = freeText.toLowerCase().trim()
			const catVal = (inlineCategory ? (inlineSubcategory ? `${inlineCategory}|${inlineSubcategory}` : inlineCategory) : (categoryDropdown ? categoryDropdown.value : ''))
			const rarityVal = rarityDropdown ? (rarityDropdown.value || '').toLowerCase() : ''
			const filters = []
			// stat groups added by user
			if (statFiltersList) {
				for (const g of statFiltersList.children) {
					try {
						const op = g.querySelector('.atlas-stat-op').value
						const stat = g.querySelector('.atlas-stat-select').value
						const min = g.querySelector('.atlas-weapon-min').value
						const max = g.querySelector('.atlas-weapon-max').value
						filters.push({ op, stat, min: min ? Number(min) : null, max: max ? Number(max) : null })
					} catch (e) { }
				}
			}
			// dedicated weapon filter inputs (Base DPS, element damages, attack speed)
			try {
				const weaponFilterItems = document.querySelectorAll('.atlas-weapon-filter-item')
				for (const wf of weaponFilterItems) {
					try {
						const label = (wf.querySelector('p') || {}).textContent || ''
						const minEl = wf.querySelector('.atlas-weapon-min')
						const maxEl = wf.querySelector('.atlas-weapon-max')
						const speedSelect = wf.querySelector('.atlas-weapon-speed-dropdown')
						if (speedSelect) {
							const v = speedSelect.value
							if (v) {
								// always include user's attack-speed selection; getAttackSpeedCategory will
								// use numeric data when available or fall back to subcategory defaults
								filters.push({ cat: 'attackSpeed', value: v })
								continue
							}
						}
						if (!minEl && !maxEl) continue
						const min = minEl && minEl.value ? Number(minEl.value) : null
						const max = maxEl && maxEl.value ? Number(maxEl.value) : null
						// ignore empty filters
						if (min == null && max == null) continue
						filters.push({ op: 'HAS', stat: label, min, max })
					} catch (e) { }
				}
			} catch (e) { }

			// DEBUG: show parsed input for troubleshooting in browser console
			// debug logging removed

			// TEMP DEBUG: print parsed query, filters and sample item stats
			try {
				// debug logging removed
			} catch(e) { console.warn('DEBUG log failed', e) }

			function matches(item) {
				// apply any inline numeric stat clauses
				if (inlineStats && inlineStats.length > 0) {
					for (const st of inlineStats) {
						if (!itemHasStatFilter(item, st.stat, 'HAS', st.min, st.max)) return false
					}
				} else if (q) {
					const name = (item.name || item.displayName || item.internalName || '').toLowerCase()
					const desc = (item.description || item.lore || '').toLowerCase()
					if (!name.includes(q) && !desc.includes(q)) return false
				}
				if (catVal) {
					if (catVal.includes('|')) {
						const [cat, sub] = catVal.split('|')
						if ((item.category || '') !== cat) return false
						const itemSub = (inferSubcategory(item) || '').toString()
						if (itemSub !== sub) return false
					} else {
						if (catVal && (item.category || '') !== catVal) return false
					}
				}
				if (rarityVal) {
					const r = (item.rarity || item.tier || '').toString().toLowerCase()
					if (!r.includes(rarityVal)) return false
				}
				for (const f of filters) {
					if (f && f.cat === 'attackSpeed') {
						const cat = getAttackSpeedCategory(item)
						if (!cat) return false
						if (f.value && cat !== f.value) return false
						continue
					}
					if (!itemHasStatFilter(item, f.stat, f.op, f.min, f.max)) return false
				}
				return true
			}

			const matchesList = items.filter(matches)
			resultsContainer.innerHTML = ''
			if (matchesList.length === 0) {
				resultsContainer.textContent = 'No items found.'
				return
			}
			const ul = document.createElement('ul')
			ul.className = 'atlas-results-list'
			for (const it of matchesList.slice(0, 200)) {
				const li = document.createElement('li')
				const itemSub = inferSubcategory(it) || it.subcategory || '?'
				li.textContent = `${it.name || it.displayName || it.id || '[no name]'} — ${it.category || '?'} / ${itemSub} — ${it.rarity || it.tier || ''}`
				ul.appendChild(li)
			}
			resultsContainer.appendChild(ul)
			if (matchesList.length > 200) {
				const more = document.createElement('div')
				more.textContent = `Showing 200 of ${matchesList.length} results.`
				resultsContainer.appendChild(more)
			}
		} catch (err) {
			resultsContainer.textContent = 'Search failed: ' + (err.message || err)
		}
	}

	if (searchBtn) searchBtn.addEventListener('click', runSearch)

	// Autocomplete suggestions
	async function ensureItemsLoaded() {
		if (itemsCache) return itemsCache
		try {
			const res = await fetch('wapi/data/items.categorized.json')
			if (!res.ok) throw new Error('Failed to fetch items data')
			itemsCache = await res.json()
			return itemsCache
		} catch (err) {
			console.warn('Could not load items for suggestions:', err)
			itemsCache = []
			return itemsCache
		}
	}

	function renderSuggestions(list, q) {
		suggestionsContainer.innerHTML = ''
		if (!list || list.length === 0) { suggestionsContainer.style.display = 'none'; suggestionsContainer.setAttribute('aria-hidden','true'); return }
		const ul = document.createElement('ul')
		ul.className = 'atlas-suggestions-list'
		for (const name of list.slice(0, 10)) {
			const li = document.createElement('li')
			li.className = 'atlas-suggestion-item'
			li.textContent = name
			li.addEventListener('mousedown', function (ev) {
				ev.preventDefault()
				searchInput.value = name
				suggestionsContainer.style.display = 'none'
				runSearch()
			})
			ul.appendChild(li)
		}
		suggestionsContainer.appendChild(ul)
		suggestionsContainer.style.display = 'block'
		suggestionsContainer.setAttribute('aria-hidden','false')
	}

	searchInput.addEventListener('input', async function () {
		const q = (this.value || '').toLowerCase().trim()
		if (q.length < 1) { renderSuggestions([], q); return }
		const items = await ensureItemsLoaded()
		// build unique name list
		const seen = new Set()
		const starts = []
		const contains = []
		for (const it of items) {
			const name = (it.name || it.displayName || it.internalName || '').toString()
			if (!name) continue
			const nLower = name.toLowerCase()
			if (seen.has(name)) continue
			if (nLower.startsWith(q)) { starts.push(name); seen.add(name); continue }
			if (nLower.includes(q)) { contains.push(name); seen.add(name); continue }
		}
		renderSuggestions(starts.concat(contains), q)
	})

	// hide suggestions when clicking outside
	document.addEventListener('click', function (e) {
		if (!suggestionsContainer) return
		if (e.target === searchInput) return
		if (!suggestionsContainer.contains(e.target)) {
			suggestionsContainer.style.display = 'none'
			suggestionsContainer.setAttribute('aria-hidden','true')
		}
	})

	// Enter key triggers search
	searchInput.addEventListener('keydown', function (e) {
		if (e.key === 'Enter') { e.preventDefault(); runSearch() }
	})

	function createStatGroup(statName) {
		const groupDiv = document.createElement('div')
		groupDiv.className = 'atlas-stat-group'

		const opSelect = document.createElement('select')
		opSelect.className = 'atlas-dropdown atlas-stat-op'
		const hasOpt = document.createElement('option')
		hasOpt.value = 'HAS'
		hasOpt.textContent = 'HAS'
		const notOpt = document.createElement('option')
		notOpt.value = 'NOT'
		notOpt.textContent = 'NOT'
		opSelect.appendChild(hasOpt)
		opSelect.appendChild(notOpt)
		groupDiv.appendChild(opSelect)

		const removeBtn = document.createElement('button')
		removeBtn.className = 'atlas-stat-group-remove'
		removeBtn.textContent = 'Remove'
		removeBtn.title = 'Remove filter'
		removeBtn.addEventListener('click', function () {
			groupDiv.remove()
		})
		groupDiv.appendChild(removeBtn)

		const statSelect = document.createElement('select')
		statSelect.className = 'atlas-dropdown atlas-stat-select'
		// (removed empty blank option to avoid empty/unused rows)
		for (const s of stats) {
			const o = document.createElement('option')
			o.value = s
			o.textContent = s
			if (s === statName) o.selected = true
			statSelect.appendChild(o)
		}
		groupDiv.appendChild(statSelect)

		const minMaxWrapper = document.createElement('div')
		minMaxWrapper.className = 'atlas-weapon-minmax-group'

		const minInput = document.createElement('input')
		minInput.type = 'number'
		minInput.className = 'atlas-weapon-min'
		minInput.placeholder = 'Min'
		minInput.min = 0
		const maxInput = document.createElement('input')
		maxInput.type = 'number'
		maxInput.className = 'atlas-weapon-max'
		maxInput.placeholder = 'Max'
		maxInput.min = 0
		minMaxWrapper.appendChild(minInput)
		minMaxWrapper.appendChild(maxInput)
		groupDiv.appendChild(minMaxWrapper)


		// toggle min/max visibility depending on operation
		opSelect.addEventListener('change', function () {
			if (this.value === 'HAS') {
				minMaxWrapper.style.display = 'flex'
			} else {
				minMaxWrapper.style.display = 'none'
			}
		})

		// default: SHOW min/max for HAS
		opSelect.value = 'HAS'
		minMaxWrapper.style.display = 'flex'

		statFiltersList.appendChild(groupDiv)
	}

	if (statGroupDropdown && statFiltersList) {
		statGroupDropdown.addEventListener('change', function () {
			const value = this.value
			if (!value) return
			createStatGroup(value)
			this.selectedIndex = 0
		})
	}
})()


