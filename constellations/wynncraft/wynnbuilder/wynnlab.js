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
			// Auto-open the first matching item for quick preview
			renderItemDetail(matchesList[0])
			return
			// NOTE: if you prefer to show the full list and still open the first item,
			// we could render the list and the detail side-by-side. Currently we
			// replace the results with the item's detail; the detail has a Back
			// button that calls runSearch() to return to the list view.
			const ul = document.createElement('ul')
			ul.className = 'atlas-results-list'
			for (const it of matchesList.slice(0, 200)) {
				const li = document.createElement('li')
				li.className = 'atlas-result-item'
				const itemSub = inferSubcategory(it) || it.subcategory || '?'

				const nameDiv = document.createElement('div')
				nameDiv.className = 'item-name'
				nameDiv.textContent = it.name || it.displayName || it.id || '[no name]'
				li.appendChild(nameDiv)

				const metaDiv = document.createElement('div')
				metaDiv.className = 'item-meta'

				const catSpan = document.createElement('span')
				catSpan.className = 'badge badge-category'
				catSpan.textContent = it.category || '?'
				metaDiv.appendChild(catSpan)

				const subSpan = document.createElement('span')
				subSpan.className = 'badge badge-subcat'
				subSpan.textContent = itemSub
				metaDiv.appendChild(subSpan)

				if (it.rarity || it.tier) {
					const rarSpan = document.createElement('span')
					rarSpan.className = 'badge badge-rarity'
					rarSpan.textContent = (it.rarity || it.tier)
					metaDiv.appendChild(rarSpan)
				}

				li.appendChild(metaDiv)

				// compact summary for list view (attack speed + elemental ranges)
				const summary = document.createElement('div')
				summary.className = 'item-summary'
				if (it.attackSpeed) {
					const as = document.createElement('span')
					as.className = 'summary-as'
					const dpsNum = it.averageDps || it.baseDps || it.averageDps
					as.innerHTML = prettyEnum(it.attackSpeed) + (dpsNum ? ` <span class="summary-dps">⚔ ${dpsNum}</span>` : '')
					summary.appendChild(as)
				}
				if (it.base) {
					const order = [
						['baseEarthDamage','Earth','\u2692'],
						['baseThunderDamage','Thunder','\u26A1'],
						['baseWaterDamage','Water','\u2744'],
						['baseFireDamage','Fire','\u2737'],
						['baseAirDamage','Air','\u2733']
					]
					for (const [k,label,iconSym] of order) {
						if (it.base[k]) {
							const b = it.base[k]
							const span = document.createElement('span')
							span.className = 'summary-damage'
							span.innerHTML = `${iconSym} ${b.min || ''}-${b.max || ''}`
							summary.appendChild(span)
						}
					}
				}
				li.appendChild(summary)

				// Make the result clickable to show details
				li.tabIndex = 0
				li.addEventListener('click', function () { renderItemDetail(it) })
				li.addEventListener('keydown', function (e) { if (e.key === 'Enter') renderItemDetail(it) })

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

	function prettyEnum(s) {
		if (!s) return ''
		return s.toString().replace(/([A-Z])/g, '_$1').replace(/[- ]/g, '_').toUpperCase()
	}

	function renderItemDetail(item) {
			resultsContainer.innerHTML = ''
			// DEBUG: dump item key fields to console to help diagnose missing UI values
			try { console.groupCollapsed && console.groupCollapsed('renderItemDetail - ' + (item.name || item.displayName || 'item')) } catch(e){}
			console.debug('item.identifications ->', item.identifications)
			console.debug('item.powderSlots ->', item.powderSlots)
			console.debug('item.lore ->', item.lore)
		const wrap = document.createElement('div')
		wrap.className = 'atlas-item-detail'

		const header = document.createElement('div')
		header.className = 'item-header'

		const icon = document.createElement('div')
		icon.className = 'item-icon'
		// try to render a real icon image if available, otherwise fallback to gradient + letter
		try {
			(function attachIcon() {
				function getGradientForIconName(name) {
					const n = (name || '').toLowerCase()
					if (n.includes('fire')) return 'radial-gradient(circle at 30% 25%, #ffb46b, #7b2b1a)'
					if (n.includes('water')) return 'radial-gradient(circle at 30% 25%, #8fe3ff, #1b4f6b)'
					if (n.includes('earth')) return 'radial-gradient(circle at 30% 25%, #9be78c, #23421a)'
					if (n.includes('thunder')) return 'radial-gradient(circle at 30% 25%, #ffe58a, #6b4b00)'
					if (n.includes('air')) return 'radial-gradient(circle at 30% 25%, #cfe6ff, #2b2f3a)'
					if (n.includes('multi')) return 'radial-gradient(circle at 30% 25%, #e6b8ff, #2b1632)'
					if (n.includes('basicgold') || n.includes('gold')) return 'radial-gradient(circle at 30% 25%, #ffd27a, #8b5f12)'
					if (n.includes('basicwood') || n.includes('wood')) return 'radial-gradient(circle at 30% 25%, #d6b88f, #3b2b12)'
					return 'radial-gradient(circle at 30% 25%, #6b2f8f, #2b1632)'
				}

				const ico = item.icon && item.icon.value
				// prefer a named asset like "relik.fire3"
				let tryName = null
				if (ico && typeof ico === 'object' && ico.name) tryName = ico.name.replace(/[^a-zA-Z0-9._-]/g, '')
				if (tryName) {
					const attempt = new Image()
					attempt.crossOrigin = 'anonymous'
					attempt.src = 'assets/icons/' + tryName + '.png'
					attempt.onload = function () {
						icon.style.backgroundImage = `url(${attempt.src})`
						icon.classList.add('has-image')
					}
					attempt.onerror = function () {
						// fallback gradient based on name
						icon.style.backgroundImage = getGradientForIconName(tryName)
						icon.textContent = (item.name || '').charAt(0) || '?'
					}
					return
				}
				// other formats (legacy id) or no image
				icon.style.backgroundImage = getGradientForIconName(item.subcategory || item.category || '')
				icon.textContent = (item.name || '').charAt(0) || '?'
			})()
		} catch (err) {
			console.warn('attachIcon failed', err)
		}
		try { console.groupEnd && console.groupEnd() } catch(e){}
		header.appendChild(icon)

		const titleWrap = document.createElement('div')
		titleWrap.className = 'item-title-wrap'
		const title = document.createElement('h2')
		title.className = 'item-title'
		title.textContent = item.name || item.displayName || '[no name]'
		titleWrap.appendChild(title)

		const subBadges = document.createElement('div')
		subBadges.className = 'item-badges'
		const cat = document.createElement('span')
		cat.className = 'badge badge-category'
		cat.textContent = item.category || ''
		subBadges.appendChild(cat)
		if (item.subcategory) {
			const sub = document.createElement('span')
			sub.className = 'badge badge-subcat'
			sub.textContent = item.subcategory
			subBadges.appendChild(sub)
		}
		if (item.rarity || item.tier) {
			const r = document.createElement('span')
			r.className = 'badge badge-rarity'
			r.textContent = item.rarity || item.tier
			subBadges.appendChild(r)
		}
		titleWrap.appendChild(subBadges)
		header.appendChild(titleWrap)

		wrap.appendChild(header)

		// Quick stats block
		const stats = document.createElement('div')
		stats.className = 'item-stats'

		if (item.attackSpeed) {
			const as = document.createElement('div')
			as.className = 'item-stat-line stat-attackspeed'
			const left = document.createElement('div')
			left.className = 'stat-left'
			left.innerHTML = `<strong>Attack Speed:</strong> ${prettyEnum(item.attackSpeed)}`
			const right = document.createElement('div')
			right.className = 'stat-right'
			as.appendChild(left)
			as.appendChild(right)
			stats.appendChild(as)
		}

		// base damage values (earth, thunder, water, fire, air)
		if (item.base) {
			const order = [
				['baseEarthDamage','Earth','\u2692'],
				['baseThunderDamage','Thunder','\u26A1'],
				['baseWaterDamage','Water','\u2744'],
				['baseFireDamage','Fire','\u2737'],
				['baseAirDamage','Air','\u2733']
			]
			for (const [k,label,iconSym] of order) {
				if (item.base[k]) {
					const b = item.base[k]
					const line = document.createElement('div')
					line.className = 'item-stat-line damage-line stat-' + label.toLowerCase()
					const left = document.createElement('div')
					left.className = 'stat-left'
					left.innerHTML = `${iconSym} ${label} Damage:`
					const right = document.createElement('div')
					right.className = 'stat-right'
					right.textContent = `${b.min || ''}-${b.max || ''}`
					line.appendChild(left)
					line.appendChild(right)
					stats.appendChild(line)
				}
			}
		}

		// requirements
		if (item.requirements) {
			const req = document.createElement('div')
			req.className = 'item-reqs'
			if (item.requirements.classRequirement) {
				const c = document.createElement('div')
				c.innerHTML = '<strong>Class Req:</strong> ' + item.requirements.classRequirement
				req.appendChild(c)
			}
			if (item.requirements.level) {
				const lvl = document.createElement('div')
				lvl.innerHTML = '<strong>Combat Level Min:</strong> ' + item.requirements.level
				req.appendChild(lvl)
			}
			// show numeric stat minimums if present
			const mins = ['strength','dexterity','intelligence','agility','defence']
			for (const m of mins) {
				if (item.requirements[m] !== undefined) {
					const el = document.createElement('div')
					el.textContent = `${m.charAt(0).toUpperCase()+m.slice(1)} Min: ${item.requirements[m]}`
					req.appendChild(el)
				}
			}
			stats.appendChild(req)
		}

		// Highlight primary attribute and a few important idents (Intelligence, Mana Regen/Steal, Spell Costs, Powder Slots)
		(function renderQuickIdents() {
			// helper to lookup identification entries with several common keys
			function pickIdent(keys) {
				if (!item.identifications) return null
				for (const k of keys) {
					if (item.identifications[k] !== undefined) return item.identifications[k]
				}
				return null
			}

			function valText(v, key) {
				if (!v) return null
				if (typeof v === 'object') {
					if (v.min !== undefined && v.max !== undefined) {
						if (/SpellCost|spellCost|1stSpellCost|2ndSpellCost|3rdSpellCost|4thSpellCost/i.test(key)) return `${v.min}%–${v.max}%`
						if (/manaRegen|healthRegen/i.test(key)) return `${v.min}/5s–${v.max}/5s`
						return `${v.min}–${v.max}`
					}
					if (v.raw !== undefined) {
						if (/SpellCost|spellCost|1stSpellCost|2ndSpellCost|3rdSpellCost|4thSpellCost/i.test(key)) return `${v.raw}%`
						if (/manaRegen|healthRegen/i.test(key)) return `${v.raw}/5s`
						return String(v.raw)
					}
				}
				return String(v)
			}

			// Intelligence (show prominently if present)
			const intel = pickIdent(['rawIntelligence','intelligence','rawInt'])
			if (intel) {
				const v = (intel.raw !== undefined) ? intel.raw : (intel.min !== undefined ? intel.min : intel)
				const p = document.createElement('div')
				p.className = 'item-primary-attr'
				p.innerHTML = `<span class="primary-key">Intelligence</span> <span class="primary-val ${Number(v) >= 0 ? 'val-pos' : 'val-neg'}">${v}</span>`
				stats.appendChild(p)
			}

			// other quick idents to show
			const quick = [
				{ keyDisplay: 'Mana Regen', keys: ['manaRegen','ManaRegen'] },
				{ keyDisplay: 'Mana Steal', keys: ['manaSteal','ManaSteal'] },
				{ keyDisplay: '1st Spell Cost%', keys: ['1stSpellCost','1st Spell Cost','1stSpellCost%'] },
				{ keyDisplay: '2nd Spell Cost%', keys: ['2ndSpellCost','2nd Spell Cost','2ndSpellCost%'] },
				{ keyDisplay: '3rd Spell Cost%', keys: ['3rdSpellCost','3rd Spell Cost','3rdSpellCost%'] },
				{ keyDisplay: '4th Spell Cost%', keys: ['4thSpellCost','4th Spell Cost','4thSpellCost%'] }
			]
			for (const q of quick) {
				const v = pickIdent(q.keys)
				const txt = valText(v, q.keys[0])
				if (txt) {
					let cls = 'item-stat-line'
					if (/Mana Regen/i.test(q.keyDisplay)) cls += ' stat-mana'
					else if (/Mana Steal/i.test(q.keyDisplay)) cls += ' stat-mana-steal'
					else if (/Spell Cost/i.test(q.keyDisplay)) cls += ' stat-spell-cost'
					const line = document.createElement('div')
					line.className = cls
					const left = document.createElement('div')
					left.className = 'stat-left'
					left.textContent = q.keyDisplay + ':'
					const right = document.createElement('div')
					right.className = 'stat-right'
					right.innerHTML = `<span class="${(typeof v === 'object' && (v.raw||v.min) < 0) ? 'val-neg' : 'val-pos'}">${txt}</span>`
					line.appendChild(left)
					line.appendChild(right)
					stats.appendChild(line)
				}
			}

			// Powder Slots
			const pslots = (item.powderSlots !== undefined) ? item.powderSlots : (item.identifications && (item.identifications.powderSlots || item.identifications['Powder Slots']))
			if (pslots !== undefined && pslots !== null) {
				const ps = document.createElement('div')
				ps.className = 'item-stat-line stat-powder'
				const left = document.createElement('div')
				left.className = 'stat-left'
				left.textContent = 'Powder Slots:'
				const right = document.createElement('div')
				right.className = 'stat-right'
				right.textContent = String(pslots)
				ps.appendChild(left)
				ps.appendChild(right)
				stats.appendChild(ps)
			}
		})()

		wrap.appendChild(stats)

		// Identifications / stats list (primary attributes and formatted idents)
		if (item.identifications) {
			const idWrap = document.createElement('div')
			idWrap.className = 'item-identifications'

			// Primary attribute bonuses (rawIntelligence/rawStrength etc.) — render prominently
			const primaryAttrs = ['rawStrength','rawDexterity','rawAgility','rawDefence']
			for (const attr of primaryAttrs) {
				const info = item.identifications[attr]
				if (info && info.raw !== undefined) {
					const label = attr.replace(/^raw/,'')
					const p = document.createElement('div')
					p.className = 'item-primary-attr'
					p.innerHTML = `<span class="primary-key">${label.charAt(0).toUpperCase()+label.slice(1)}</span> <span class="primary-val val-pos">${info.raw}</span>`
					idWrap.appendChild(p)
				}
			}

			// Helper to format identification values
			function fmtVal(k, v) {
				// prefer explicit ranges when both min and max exist
				if (v && v.min !== undefined && v.max !== undefined) {
					// percent-style stats
					if (/spellDamage|SpellDamage|SpellCost|spellCost|1stSpellCost|2ndSpellCost|3rdSpellCost|4thSpellCost/i.test(k)) {
						return `${v.min}%–${v.max}%`
					}
					if (/manaRegen|healthRegen/i.test(k)) {
						return `${v.min}/5s–${v.max}/5s`
					}
					return `${v.min}–${v.max}`
				}
				// fallback to raw when available
				if (v && v.raw !== undefined) {
					// apply units for certain keys
					if (/spellDamage|SpellDamage/i.test(k)) return `${v.raw}%`
					if (/SpellCost|spellCost|1stSpellCost|2ndSpellCost|3rdSpellCost|4thSpellCost/i.test(k)) return `${v.raw}%`
					if (/manaRegen|healthRegen/i.test(k) && v.raw !== undefined) return `${v.raw}/5s`
					return String(v.raw)
				}
				if (v && v.min !== undefined) return String(v.min)
				return ''
			}

			// Preferred display order for idents
			const prefer = ['rawIntelligence','manaRegen','manaSteal','spellDamage','1stSpellCost','2ndSpellCost','3rdSpellCost','4thSpellCost']
			const seen = new Set()
			function appendIdent(k) {
				const v = item.identifications[k]
				if (!v) return
				seen.add(k)
				const line = document.createElement('div')
				line.className = 'ident-line'
				const valText = fmtVal(k, v)
				const numeric = Number((v.raw !== undefined) ? v.raw : (v.min !== undefined ? v.min : 0))
				const colorClass = (numeric > 0) ? 'val-pos' : (numeric < 0) ? 'val-neg' : 'val-neu'
				const left = document.createElement('span')
				left.className = `ident-val ${colorClass}`
				left.textContent = valText
				const right = document.createElement('span')
				right.className = 'ident-key'
				// pretty key label
				const pretty = k.replace(/([A-Z])/g, ' $1').replace(/^raw /i,'').replace(/_/g,' ')
				right.textContent = pretty
				line.appendChild(left)
				line.appendChild(right)
				idWrap.appendChild(line)
			}

			for (const k of prefer) appendIdent(k)
			for (const k of Object.keys(item.identifications)) {
				if (!seen.has(k)) appendIdent(k)
			}

			wrap.appendChild(idWrap)
		}

		// lore
		if (item.lore) {
			const lore = document.createElement('div')
			lore.className = 'item-lore'
			lore.textContent = item.lore
			wrap.appendChild(lore)
		}

		// average/base DPS
		if (item.averageDps || item.baseDps) {
			const base = document.createElement('div')
			base.className = 'item-base-dps'
			base.innerHTML = '<strong>Base DPS:</strong> ' + (item.averageDps || item.baseDps)
			wrap.appendChild(base)
		}

		// back button
		const backRow = document.createElement('div')
		backRow.className = 'item-back-row'
		const backBtn = document.createElement('button')
		backBtn.className = 'atlas-search-btn'
		backBtn.textContent = 'Back to results'
		backBtn.addEventListener('click', function () { runSearch() })
		backRow.appendChild(backBtn)
		wrap.appendChild(backRow)

		resultsContainer.appendChild(wrap)
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


