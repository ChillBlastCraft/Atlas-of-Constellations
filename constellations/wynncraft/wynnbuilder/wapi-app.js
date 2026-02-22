const api = new window.WapiClient()

const output = document.getElementById('output')
const statusText = document.getElementById('status')
const loadItemsButton = document.getElementById('load-items')
const diagnosticsButton = document.getElementById('run-diagnostics')
const itemSearchInput = document.getElementById('item-search')
const itemCount = document.getElementById('item-count')
const itemList = document.getElementById('item-list')
const itemDetails = document.getElementById('item-details')
const categoryEntries = document.querySelectorAll('.category-entry')
const categoryViews = document.querySelectorAll('.category-view')
const atlasSearchInput = document.getElementById('atlas-search')
const atlasStatus = document.getElementById('atlas-status')
const atlasTypeGrid = document.getElementById('atlas-type-grid')
const atlasStatSearchInput = document.getElementById('atlas-stat-search')
const atlasStatModeSelect = document.getElementById('atlas-stat-mode')
const atlasStatValueInput = document.getElementById('atlas-stat-value')
const atlasAddGroupButton = document.getElementById('atlas-add-group')
const atlasStatGroupsContainer = document.getElementById('atlas-stat-groups')
const atlasRunSearchButton = document.getElementById('atlas-run-search')
const atlasMinLevelInput = document.getElementById('atlas-min-level')
const atlasMaxLevelInput = document.getElementById('atlas-max-level')
const atlasReqStrInput = document.getElementById('atlas-req-str')
const atlasReqDexInput = document.getElementById('atlas-req-dex')
const atlasReqIntInput = document.getElementById('atlas-req-int')
const atlasReqDefInput = document.getElementById('atlas-req-def')
const atlasReqAgiInput = document.getElementById('atlas-req-agi')
const atlasEnableTypeFiltersInput = document.getElementById('atlas-enable-type-filters')
const atlasTypeFilterFields = document.getElementById('atlas-type-filter-fields')
const atlasCategorySelect = document.getElementById('atlas-category-select')
const atlasRaritySelect = document.getElementById('atlas-rarity-select')
const atlasCategoryOptions = document.getElementById('atlas-category-options')
const atlasRarityOptions = document.getElementById('atlas-rarity-options')

let allItems = []
let filteredItems = []
let selectedItemName = null
let atlasLoadedOnce = false
let atlasStatGroups = []

let atlasCategories = ['armour', 'weapon', 'ingredient']
let atlasRarities = []
const atlasComboboxes = new Map()

console.info('[WynnBuilder+] app ready (vanilla JS)', {
    locationHref: window.location.href,
    protocol: window.location.protocol,
    origin: window.location.origin
})

function setOutput(value) {
    output.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
}
function setStatus(message) {
    statusText.textContent = message
}

function setAtlasStatus(message) {
    if (atlasStatus) {
        atlasStatus.textContent = message
    }
}

function setAtlasCards(cards) {
    if (!atlasTypeGrid) {
        return
    }

    atlasTypeGrid.innerHTML = ''
    cards.forEach((card) => {
        const article = document.createElement('article')
        article.className = 'atlas-type-card'

        const title = document.createElement('h3')
        title.textContent = card.label

        const total = document.createElement('p')
        total.textContent = `Total: ${card.total}`

        const matching = document.createElement('p')
        matching.textContent = `Matching: ${card.matching}`

        article.appendChild(title)
        article.appendChild(total)
        article.appendChild(matching)
        atlasTypeGrid.appendChild(article)
    })
}

function toTitleLabel(value) {
    return String(value || '')
        .split(/[-_\s]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
}

function setTypeFiltersEnabledUI(enabled) {
    if (!atlasTypeFilterFields) {
        return
    }

    atlasTypeFilterFields.classList.toggle('disabled', !enabled)
}

function ensureComboboxSelection(combobox, value) {
    const safeValue = value || 'any'
    combobox.selectedValue = safeValue
    combobox.input.dataset.selectedValue = safeValue
    combobox.input.value = safeValue === 'any' ? '' : toTitleLabel(safeValue)
}

function hideComboboxOptions(combobox) {
    combobox.optionsNode.hidden = true
    combobox.activeIndex = -1
}

function renderComboboxOptions(combobox, query = '') {
    const normalizedQuery = String(query || '').trim().toLowerCase()
    const filteredValues = combobox.values.filter((value) => toTitleLabel(value).toLowerCase().includes(normalizedQuery))
    combobox.filteredValues = filteredValues.length ? filteredValues : [...combobox.values]

    combobox.optionsNode.innerHTML = ''
    combobox.filteredValues.forEach((value, index) => {
        const option = document.createElement('div')
        option.className = 'atlas-option'
        option.textContent = toTitleLabel(value)
        option.dataset.value = value
        option.addEventListener('mouseenter', () => {
            combobox.activeIndex = index
            updateComboboxActiveState(combobox)
        })
        option.addEventListener('mousedown', (event) => {
            event.preventDefault()
            selectComboboxValue(combobox, value)
            hideComboboxOptions(combobox)
        })
        combobox.optionsNode.appendChild(option)
    })

    combobox.activeIndex = combobox.filteredValues.findIndex((value) => value === combobox.selectedValue)
    if (combobox.activeIndex < 0) {
        combobox.activeIndex = 0
    }
    updateComboboxActiveState(combobox)
}

function updateComboboxActiveState(combobox) {
    const options = Array.from(combobox.optionsNode.querySelectorAll('.atlas-option'))
    options.forEach((node, index) => {
        node.classList.toggle('active', index === combobox.activeIndex)
    })
}

function showComboboxOptions(combobox, showAll = false) {
    renderComboboxOptions(combobox, showAll ? '' : combobox.input.value)
    combobox.optionsNode.hidden = false
}

function selectComboboxValue(combobox, value) {
    ensureComboboxSelection(combobox, value)
    if (typeof combobox.onSelect === 'function') {
        combobox.onSelect(value)
    }
}

function getComboboxValue(inputNode) {
    return String(inputNode?.dataset?.selectedValue || 'any').toLowerCase()
}

function setupAtlasCombobox(inputNode, optionsNode, onSelect) {
    if (!inputNode || !optionsNode) {
        return
    }

    const combobox = {
        input: inputNode,
        optionsNode,
        values: ['any'],
        filteredValues: ['any'],
        selectedValue: 'any',
        activeIndex: 0,
        onSelect
    }

    ensureComboboxSelection(combobox, 'any')
    atlasComboboxes.set(inputNode.id, combobox)

    inputNode.addEventListener('focus', () => {
        showComboboxOptions(combobox, true)
    })

    inputNode.addEventListener('click', () => {
        showComboboxOptions(combobox, true)
    })

    inputNode.addEventListener('input', () => {
        showComboboxOptions(combobox, false)
    })

    inputNode.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowDown') {
            event.preventDefault()
            showComboboxOptions(combobox)
            combobox.activeIndex = Math.min(combobox.activeIndex + 1, combobox.filteredValues.length - 1)
            updateComboboxActiveState(combobox)
            return
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault()
            showComboboxOptions(combobox)
            combobox.activeIndex = Math.max(combobox.activeIndex - 1, 0)
            updateComboboxActiveState(combobox)
            return
        }

        if (event.key === 'Enter') {
            event.preventDefault()
            showComboboxOptions(combobox)
            const selected = combobox.filteredValues[combobox.activeIndex] || combobox.filteredValues[0] || 'any'
            selectComboboxValue(combobox, selected)
            hideComboboxOptions(combobox)
            inputNode.blur()
            return
        }

        if (event.key === 'Escape') {
            event.preventDefault()
            ensureComboboxSelection(combobox, combobox.selectedValue)
            hideComboboxOptions(combobox)
        }
    })

    inputNode.addEventListener('blur', () => {
        window.setTimeout(() => {
            ensureComboboxSelection(combobox, combobox.selectedValue)
            hideComboboxOptions(combobox)
        }, 80)
    })
}

function setComboboxOptions(inputNode, values) {
    const combobox = atlasComboboxes.get(inputNode?.id)
    if (!combobox) {
        return
    }

    const cleanedValues = Array.from(new Set(['any', ...values.filter(Boolean)]))
    const previousValue = combobox.selectedValue || 'any'
    combobox.values = cleanedValues
    const nextValue = cleanedValues.includes(previousValue) ? previousValue : 'any'
    ensureComboboxSelection(combobox, nextValue)
    renderComboboxOptions(combobox)
}

document.addEventListener('click', (event) => {
    atlasComboboxes.forEach((combobox) => {
        const withinInput = combobox.input.contains(event.target)
        const withinOptions = combobox.optionsNode.contains(event.target)
        if (!withinInput && !withinOptions) {
            hideComboboxOptions(combobox)
            ensureComboboxSelection(combobox, combobox.selectedValue)
        }
    })
})

function rebuildAtlasTaxonomy() {
    const categorySet = new Set()
    const raritySet = new Set()

    allItems.forEach((item) => {
        categorySet.add(normalizeAtlasCategory(item))
        const rarity = rarityNormalized(item)
        if (rarity) {
            raritySet.add(rarity)
        }
    })

    atlasCategories = Array.from(categorySet).sort((a, b) => a.localeCompare(b))
    atlasRarities = Array.from(raritySet).sort((a, b) => a.localeCompare(b))

    setComboboxOptions(atlasCategorySelect, atlasCategories)
    setComboboxOptions(atlasRaritySelect, atlasRarities)
}

function getAtlasCheckedValues(name) {
    return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map((node) => node.value)
}

function parseOptionalNumber(node) {
    if (!node || node.value === '') {
        return null
    }
    const value = Number(node.value)
    return Number.isFinite(value) ? value : null
}

function getAtlasFilters() {
    const typeFiltersEnabled = atlasEnableTypeFiltersInput?.checked !== false
    const selectedCategory = getComboboxValue(atlasCategorySelect)
    const selectedRarity = getComboboxValue(atlasRaritySelect)

    return {
        query: String(atlasSearchInput?.value || '').trim().toLowerCase(),
        statQuery: String(atlasStatSearchInput?.value || '').trim().toLowerCase(),
        typeFiltersEnabled,
        category: selectedCategory,
        rarity: selectedRarity,
        weaponFilters: getAtlasCheckedValues('atlas-weapon'),
        armourFilters: getAtlasCheckedValues('atlas-armour'),
        ingredientFilters: getAtlasCheckedValues('atlas-ingredient'),
        minLevel: parseOptionalNumber(atlasMinLevelInput),
        maxLevel: parseOptionalNumber(atlasMaxLevelInput),
        reqStr: parseOptionalNumber(atlasReqStrInput),
        reqDex: parseOptionalNumber(atlasReqDexInput),
        reqInt: parseOptionalNumber(atlasReqIntInput),
        reqDef: parseOptionalNumber(atlasReqDefInput),
        reqAgi: parseOptionalNumber(atlasReqAgiInput)
    }
}

function itemFieldsLower(item) {
    return [item.name, item.internalName, item.type, item.subType, item.rarity, item.tier]
        .map((field) => String(field || '').toLowerCase())
}

function rarityNormalized(item) {
    return String(item.rarity || '').toLowerCase().trim()
}

function subtypeNormalized(item) {
    return String(item.subType || item.type || '').toLowerCase().trim()
}

function requirementValue(item, key) {
    const req = item.requirements || {}
    return Number(req[key] || 0)
}

function itemPassesRequirementFilters(item, filters) {
    const level = requirementValue(item, 'level')
    if (filters.minLevel !== null && level < filters.minLevel) {
        return false
    }
    if (filters.maxLevel !== null && level > filters.maxLevel) {
        return false
    }

    if (filters.reqStr !== null && requirementValue(item, 'strength') > filters.reqStr) {
        return false
    }
    if (filters.reqDex !== null && requirementValue(item, 'dexterity') > filters.reqDex) {
        return false
    }
    if (filters.reqInt !== null && requirementValue(item, 'intelligence') > filters.reqInt) {
        return false
    }
    if (filters.reqDef !== null && requirementValue(item, 'defence') > filters.reqDef) {
        return false
    }
    if (filters.reqAgi !== null && requirementValue(item, 'agility') > filters.reqAgi) {
        return false
    }

    return true
}

function statEntries(item) {
    return Object.entries(item.identifications || {}).map(([name, details]) => {
        const lowerName = String(name).toLowerCase()
        if (details && typeof details === 'object' && !Array.isArray(details)) {
            const numericCandidates = [details.max, details.min, details.raw]
                .map((value) => Number(value))
                .filter((value) => Number.isFinite(value))
            const magnitude = numericCandidates.length
                ? Math.max(...numericCandidates.map((value) => Math.abs(value)))
                : 0
            return { name: lowerName, magnitude }
        }

        const value = Number(details)
        return { name: lowerName, magnitude: Number.isFinite(value) ? Math.abs(value) : 0 }
    })
}

function itemPassesStatGroups(item) {
    if (!atlasStatGroups.length) {
        return true
    }

    const stats = statEntries(item)
    return atlasStatGroups.every((group) => {
        const matches = stats.filter((entry) => entry.name.includes(group.term))

        if (group.mode === 'and') {
            return matches.length > 0
        }
        if (group.mode === 'not') {
            return matches.length === 0
        }
        if (group.mode === 'count') {
            return matches.length >= group.value
        }
        if (group.mode === 'weighted-sum') {
            const weightedSum = matches.reduce((sum, entry) => sum + entry.magnitude, 0)
            return weightedSum >= group.value
        }

        return true
    })
}

function itemPassesAtlasFilters(item, filters) {
    const fields = itemFieldsLower(item)
    const category = normalizeAtlasCategory(item)
    const rarity = rarityNormalized(item)
    const subtype = subtypeNormalized(item)

    if (filters.query && !fields.some((field) => field.includes(filters.query))) {
        return false
    }

    if (filters.typeFiltersEnabled) {
        if (filters.category !== 'any' && filters.category !== category) {
            return false
        }

        if (filters.rarity !== 'any' && filters.rarity !== rarity) {
            return false
        }
    }

    if (filters.weaponFilters.length && category === 'weapon' && !filters.weaponFilters.includes(subtype)) {
        return false
    }

    if (filters.armourFilters.length && category === 'armour' && !filters.armourFilters.includes(subtype)) {
        return false
    }

    if (filters.ingredientFilters.length && category === 'ingredient') {
        const typeValue = String(item.type || '').toLowerCase()
        const subtypeValue = String(item.subType || '').toLowerCase()
        const matchedIngredientFilter = filters.ingredientFilters.some((value) => typeValue.includes(value) || subtypeValue.includes(value))
        if (!matchedIngredientFilter) {
            return false
        }
    }

    if (!itemPassesRequirementFilters(item, filters)) {
        return false
    }

    if (filters.statQuery) {
        const hasStatTerm = Object.keys(item.identifications || {}).some((idName) => String(idName || '').toLowerCase().includes(filters.statQuery))
        if (!hasStatTerm) {
            return false
        }
    }

    return itemPassesStatGroups(item)
}

function renderAtlasStatGroups() {
    if (!atlasStatGroupsContainer) {
        return
    }

    atlasStatGroupsContainer.innerHTML = ''
    if (!atlasStatGroups.length) {
        const empty = document.createElement('p')
        empty.textContent = 'No stat groups added.'
        atlasStatGroupsContainer.appendChild(empty)
        return
    }

    atlasStatGroups.forEach((group, index) => {
        const entry = document.createElement('div')
        entry.className = 'atlas-stat-entry'
        entry.textContent = `${index + 1}. ${group.mode.toUpperCase()} | ${group.term} | ${group.value}`
        atlasStatGroupsContainer.appendChild(entry)
    })
}

function addAtlasStatGroup() {
    const term = String(atlasStatSearchInput?.value || '').trim().toLowerCase()
    if (!term) {
        setAtlasStatus('Enter a stat term before adding a stat group.')
        return
    }

    const mode = atlasStatModeSelect?.value || 'and'
    const numericValue = Number(atlasStatValueInput?.value || 1)
    const value = Number.isFinite(numericValue) && numericValue > 0 ? numericValue : 1

    atlasStatGroups.push({ term, mode, value })
    renderAtlasStatGroups()
    setAtlasStatus(`Added stat group: ${mode.toUpperCase()} ${term}.`)
}

function normalizeAtlasCategory(item) {
    const weaponTypes = new Set(['bow', 'spear', 'dagger', 'wand', 'relik'])
    const armourTypes = new Set(['helmet', 'chestplate', 'leggings', 'boots'])
    const accessoryTypes = new Set(['ring', 'bracelet', 'necklace'])
    const fields = [item.type, item.subType, item.category]
        .map((field) => String(field || '').toLowerCase())
        .filter(Boolean)

    if (fields.some((value) => value.includes('ingredient'))) {
        return 'ingredient'
    }
    if (fields.some((value) => value.includes('weapon'))) {
        return 'weapon'
    }
    if (fields.some((value) => value.includes('armour') || value.includes('armor'))) {
        return 'armour'
    }
    if (fields.some((value) => weaponTypes.has(value))) {
        return 'weapon'
    }
    if (fields.some((value) => armourTypes.has(value))) {
        return 'armour'
    }

    if (fields.some((value) => accessoryTypes.has(value) || value.includes('accessor'))) {
        return 'accessory'
    }

    if (fields.some((value) => value.includes('consumable') || value.includes('food') || value.includes('potion') || value.includes('scroll'))) {
        return 'consumable'
    }

    if (fields.some((value) => value.includes('material') || value.includes('resource') || value.includes('powder'))) {
        return 'material'
    }

    const fallback = fields.find((value) => value && value !== 'item')
    if (fallback) {
        return fallback.replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '') || 'other'
    }

    return 'other'
}

function logAtlasDiagnostics() {
    const summary = { totalItems: allItems.length }

    allItems.forEach((item) => {
        const category = normalizeAtlasCategory(item)
        summary[category] = (summary[category] || 0) + 1
    })

    console.info('[WynnAtlas] category diagnostics', summary)
}

function renderAtlasSearch() {
    if (!atlasTypeGrid || !atlasSearchInput) {
        return
    }

    const filters = getAtlasFilters()
    const matchingItems = allItems.filter((item) => itemPassesAtlasFilters(item, filters))

    const cards = atlasCategories.map((category) => {
        const inCategory = allItems.filter((item) => normalizeAtlasCategory(item) === category)
        const matching = matchingItems.filter((item) => normalizeAtlasCategory(item) === category).length
        return {
            label: category.charAt(0).toUpperCase() + category.slice(1),
            total: inCategory.length,
            matching
        }
    })

    const totalMatching = matchingItems.length
    const extraCategories = atlasCategories.filter((category) => !['armour', 'weapon', 'ingredient'].includes(category))
    const extraCategoryText = extraCategories.length
        ? ` Extra categories: ${extraCategories.map((value) => toTitleLabel(value)).join(', ')}.`
        : ''
    setAtlasCards(cards)
    setAtlasStatus(`${totalMatching} matching items across all discovered categories.${extraCategoryText}`)
}

async function ensureAtlasLoaded() {
    if (atlasLoadedOnce || allItems.length) {
        atlasLoadedOnce = true
        if (!atlasCategories.length || !atlasRarities.length) {
            rebuildAtlasTaxonomy()
        }
        renderAtlasSearch()
        return
    }

    try {
        setAtlasStatus('Loading all items for WynnAtlas...')
        const itemMap = await fetchAllItemsMap()
        allItems = toItemArray(itemMap)
        atlasLoadedOnce = true
        rebuildAtlasTaxonomy()
        logAtlasDiagnostics()
        renderAtlasSearch()
        setAtlasStatus(`WynnAtlas ready with ${allItems.length} items.`)
    } catch (error) {
        console.error('[WynnBuilder+] WynnAtlas load failed', error)
        setAtlasStatus(`WynnAtlas failed to load items: ${error?.message || 'Unknown error'}`)
    }
}

function showCategory(viewName) {
    categoryEntries.forEach((entry) => {
        const isActive = entry.dataset.view === viewName
        entry.classList.toggle('active', isActive)
    })

    categoryViews.forEach((view) => {
        const isActive = view.dataset.view === viewName
        view.classList.toggle('active', isActive)
    })

    if (viewName === 'wynnatlas') {
        ensureAtlasLoaded()
    }
}

function initCategoryMenu() {
    categoryEntries.forEach((entry) => {
        entry.addEventListener('click', () => showCategory(entry.dataset.view))
    })
}

function initAtlasSearch() {
    if (!atlasRunSearchButton) {
        return
    }

    setupAtlasCombobox(atlasCategorySelect, atlasCategoryOptions, (value) => {
        if (atlasEnableTypeFiltersInput?.checked) {
            setAtlasStatus(`Category filter set to ${toTitleLabel(value)}.`)
        }
    })

    setupAtlasCombobox(atlasRaritySelect, atlasRarityOptions, (value) => {
        if (atlasEnableTypeFiltersInput?.checked) {
            setAtlasStatus(`Rarity filter set to ${toTitleLabel(value)}.`)
        }
    })

    setTypeFiltersEnabledUI(atlasEnableTypeFiltersInput?.checked !== false)
    atlasRunSearchButton.addEventListener('click', renderAtlasSearch)
    atlasAddGroupButton?.addEventListener('click', addAtlasStatGroup)
    atlasEnableTypeFiltersInput?.addEventListener('change', () => {
        const enabled = atlasEnableTypeFiltersInput.checked
        setTypeFiltersEnabledUI(enabled)
    })

    renderAtlasStatGroups()
}

function formatValue(value, fallback = '-') {
    if (value === undefined || value === null || value === '') {
        return fallback
    }
    return String(value)
}

function toItemArray(itemMap) {
    return Object.entries(itemMap || {})
        .map(([name, details]) => ({ name, ...details }))
        .sort((a, b) => a.name.localeCompare(b.name))
}

function updateItemCount() {
    itemCount.textContent = `${filteredItems.length} items`
}

function renderItemList() {
    itemList.innerHTML = ''

    if (!filteredItems.length) {
        const empty = document.createElement('p')
        empty.textContent = 'No items found.'
        itemList.appendChild(empty)
        return
    }

    filteredItems.forEach((item) => {
        const button = document.createElement('button')
        button.type = 'button'
        button.className = 'item-entry'
        if (item.name === selectedItemName) {
            button.classList.add('active')
        }
        button.textContent = item.name
        button.addEventListener('click', () => {
            selectedItemName = item.name
            renderItemList()
            renderItemDetails(item)
        })
        itemList.appendChild(button)
    })
}

function appendKvRow(container, key, value) {
    const keyNode = document.createElement('strong')
    keyNode.textContent = `${key}:`
    const valueNode = document.createElement('span')
    valueNode.textContent = formatValue(value)
    container.appendChild(keyNode)
    container.appendChild(valueNode)
}

function buildIdentificationTable(identifications) {
    const table = document.createElement('table')
    table.className = 'id-table'

    const head = document.createElement('thead')
    head.innerHTML = '<tr><th>Identification</th><th>Min</th><th>Max</th><th>Raw</th></tr>'
    table.appendChild(head)

    const body = document.createElement('tbody')
    const entries = Object.entries(identifications || {}).sort((a, b) => a[0].localeCompare(b[0]))

    entries.forEach(([idName, details]) => {
        const row = document.createElement('tr')

        const idCell = document.createElement('td')
        idCell.textContent = idName

        const minCell = document.createElement('td')
        const maxCell = document.createElement('td')
        const rawCell = document.createElement('td')

        if (details && typeof details === 'object' && !Array.isArray(details)) {
            minCell.textContent = formatValue(details.min)
            maxCell.textContent = formatValue(details.max)
            rawCell.textContent = formatValue(details.raw)
        } else {
            minCell.textContent = '-'
            maxCell.textContent = '-'
            rawCell.textContent = formatValue(details)
        }

        row.appendChild(idCell)
        row.appendChild(minCell)
        row.appendChild(maxCell)
        row.appendChild(rawCell)
        body.appendChild(row)
    })

    table.appendChild(body)
    return table
}

function renderItemDetails(item) {
    itemDetails.innerHTML = ''

    if (!item) {
        itemDetails.textContent = 'Select an item to see details.'
        return
    }

    const title = document.createElement('h3')
    title.textContent = item.name
    itemDetails.appendChild(title)

    const overview = document.createElement('div')
    overview.className = 'kv'
    appendKvRow(overview, 'Type', item.type)
    appendKvRow(overview, 'Subtype', item.subType)
    appendKvRow(overview, 'Rarity', item.rarity)
    appendKvRow(overview, 'Tier', item.tier)
    appendKvRow(overview, 'Attack Speed', item.attackSpeed)
    appendKvRow(overview, 'Average DPS', item.averageDPS)
    appendKvRow(overview, 'Powder Slots', item.powderSlots)
    itemDetails.appendChild(overview)

    const reqHeader = document.createElement('h4')
    reqHeader.textContent = 'Requirements'
    itemDetails.appendChild(reqHeader)

    const req = item.requirements || {}
    const requirements = document.createElement('div')
    requirements.className = 'kv'
    appendKvRow(requirements, 'Level', req.level)
    appendKvRow(requirements, 'Class', req.class_requirement)
    appendKvRow(requirements, 'Strength', req.strength)
    appendKvRow(requirements, 'Dexterity', req.dexterity)
    appendKvRow(requirements, 'Intelligence', req.intelligence)
    appendKvRow(requirements, 'Defence', req.defence)
    appendKvRow(requirements, 'Agility', req.agility)
    itemDetails.appendChild(requirements)

    const baseDamage = item.base?.baseDamage
    if (baseDamage) {
        const baseHeader = document.createElement('h4')
        baseHeader.textContent = 'Base Damage'
        itemDetails.appendChild(baseHeader)

        const baseStats = document.createElement('div')
        baseStats.className = 'kv'
        appendKvRow(baseStats, 'Min', baseDamage.min)
        appendKvRow(baseStats, 'Max', baseDamage.max)
        appendKvRow(baseStats, 'Raw', baseDamage.raw)
        itemDetails.appendChild(baseStats)
    }

    const identificationsHeader = document.createElement('h4')
    identificationsHeader.textContent = 'Identifications (roll ranges)'
    itemDetails.appendChild(identificationsHeader)

    itemDetails.appendChild(buildIdentificationTable(item.identifications || {}))
}

function applySearch() {
    const term = itemSearchInput.value.trim().toLowerCase()

    if (!term) {
        filteredItems = [...allItems]
    } else {
        filteredItems = allItems.filter((item) => {
            const fields = [item.name, item.internalName, item.type, item.subType]
            return fields.some((field) => String(field || '').toLowerCase().includes(term))
        })
    }

    if (!filteredItems.some((item) => item.name === selectedItemName)) {
        selectedItemName = filteredItems[0]?.name || null
    }

    renderItemList()
    renderItemDetails(filteredItems.find((item) => item.name === selectedItemName))
    updateItemCount()
}

async function loadAllItems() {
    try {
        setStatus('Loading all items from WAPI...')
        setOutput('Loading all items...')
        const itemMap = await fetchAllItemsMap()

        allItems = toItemArray(itemMap)
        atlasLoadedOnce = allItems.length > 0
        rebuildAtlasTaxonomy()
        logAtlasDiagnostics()
        filteredItems = [...allItems]
        selectedItemName = filteredItems[0]?.name || null
        renderItemList()
        renderItemDetails(filteredItems[0])
        updateItemCount()
        renderAtlasSearch()
        setStatus(`Loaded ${allItems.length} items.`)
        setOutput(`Loaded ${allItems.length} items.`)
        console.info('[WynnBuilder+] all items loaded', { count: allItems.length })
    } catch (error) {
        console.error('[WynnBuilder+] failed to load items', error)

        const causeMessage = error?.cause?.message ? ` | cause: ${error.cause.message}` : ''
        const contextText = error?.context ? `\nContext: ${JSON.stringify(error.context, null, 2)}` : ''
        const detailsText = error?.details ? `\nDetails: ${JSON.stringify(error.details, null, 2)}` : ''
        const protocolAdvice = window.location.protocol === 'file:'
            ? '\nAdvice: open this page through a local server (http://localhost), not file://'
            : ''

        setStatus('Failed to load items.')
        setOutput(`Error: ${error.message}${causeMessage}${protocolAdvice}${contextText}${detailsText}`)
    }
}

async function fetchAllItemsMap() {
    try {
        const itemMap = await api.getItemDatabaseFullResult()
        console.info('[WynnBuilder+] fullResult load succeeded')
        return itemMap
    } catch (fullResultError) {
        console.warn('[WynnBuilder+] fullResult load failed, switching to paginated fallback', fullResultError)
        setStatus('fullResult failed; using paginated fallback...')
        return loadAllItemsPaginated()
    }
}

async function loadAllItemsPaginated() {
    const combined = {}
    let page = 1

    while (true) {
        const pageData = await api.getItemDatabasePage(page)
        Object.assign(combined, pageData.results || {})

        const current = pageData.controller?.current ?? page
        const pages = pageData.controller?.pages ?? '?'
        setStatus(`Loading page ${current}/${pages}...`)

        if (!pageData.controller?.next) {
            break
        }

        page = pageData.controller.next
    }

    return combined
}

async function runDiagnostics() {
    const checks = []
    setStatus('Running diagnostics...')
    setOutput('Running diagnostics... open console for detailed logs.')

    console.group('[WynnBuilder+] Diagnostics')
    console.info('Environment', {
        href: window.location.href,
        protocol: window.location.protocol,
        origin: window.location.origin,
        userAgent: navigator.userAgent,
        online: navigator.onLine
    })

    const tests = [
        {
            name: 'Metadata',
            run: () => api.getItemMetadata()
        },
        {
            name: 'Database Page 1',
            run: () => api.getItemDatabasePage(1)
        },
        {
            name: 'Database fullResult',
            run: () => api.getItemDatabaseFullResult()
        }
    ]

    for (const test of tests) {
        const startedAt = performance.now()
        try {
            const data = await test.run()
            const durationMs = Math.round(performance.now() - startedAt)
            const sizeHint = typeof data === 'object' && data !== null ? Object.keys(data).length : 0
            console.info(`[Diagnostics] ${test.name}: OK`, { durationMs, sizeHint })
            checks.push({ test: test.name, ok: true, durationMs })
        } catch (error) {
            const durationMs = Math.round(performance.now() - startedAt)
            console.error(`[Diagnostics] ${test.name}: FAIL`, {
                durationMs,
                message: error?.message,
                cause: error?.cause?.message || null,
                context: error?.context || null,
                details: error?.details || null,
                stack: error?.stack || null
            })
            checks.push({
                test: test.name,
                ok: false,
                durationMs,
                message: error?.message || 'Unknown error'
            })
        }
    }

    console.groupEnd()

    const failed = checks.filter((item) => !item.ok)
    if (failed.length) {
        setStatus(`Diagnostics completed: ${failed.length} check(s) failed.`)
    } else {
        setStatus('Diagnostics completed: all checks passed.')
    }

    setOutput({ checks })
}

loadItemsButton.addEventListener('click', loadAllItems)
diagnosticsButton.addEventListener('click', runDiagnostics)
itemSearchInput.addEventListener('input', applySearch)
initCategoryMenu()
initAtlasSearch()

if (window.location.protocol === 'file:') {
    setStatus('Warning: opened via file://; use local server URL to enable API fetch.')
    setOutput('Warning: You are opening this page via file://. Browser fetch may fail due to CORS/security. Use a local server (for example Five Server) and open the http://localhost URL.')
}