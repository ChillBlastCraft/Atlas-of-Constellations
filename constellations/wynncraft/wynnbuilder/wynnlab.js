(function() {
    // ==================== DOM Elements ====================
    const mainContent = document.getElementById('main-content');
    const builderContent = document.getElementById('builder-content');
    const calcContent = document.getElementById('calc-content');
    const atlasContent = document.getElementById('atlas-content');
    const crafterContent = document.getElementById('crafter-content');

    const navButtons = [
        { id: 'btn-builder', content: builderContent },
        { id: 'btn-calc', content: calcContent },
        { id: 'btn-atlas', content: atlasContent },
        { id: 'btn-crafter', content: crafterContent }
    ];

    // ==================== Data (to be filled by user) ====================
    const categories = [];          // e.g. ['Weapons', 'Armour', 'Accessories']
    const rarities = [];            // e.g. ['Common', 'Unique', 'Rare', 'Set', 'Legendary']
    const subcategories = {};       // e.g. { Weapons: ['Bow', 'Dagger', ...], Armour: ['Helmet', 'Chestplate', ...] }
    const subcatSynonyms = {};      // e.g. { 'daggers': 'dagger', 'chest': 'chestplate' }
    const subcatLookup = {};        // e.g. { 'dagger': 'Weapons', 'chestplate': 'Armour' }

    // ==================== Stats List ====================
    const stats = [
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
    ];

    // ==================== Dropdown References ====================
    const categoryDropdown = document.getElementById('category-dropdown');
    const rarityDropdown = document.getElementById('rarity-dropdown');
    const statGroupDropdown = document.getElementById('stat-group-dropdown');
    const statFiltersList = document.getElementById('stat-filters-list');
    const searchBtn = document.querySelector('.atlas-search-btn');
    const searchInput = document.querySelector('.atlas-search-input');
    const resultsContainer = document.getElementById('atlas-results');
    const suggestionsContainer = document.getElementById('atlas-suggestions');

    let itemsCache = null;

    // ==================== Utility Functions ====================
    function normalizeKeyName(s) {
        return ('' + s).toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    function valueMatches(v, min, max) {
        if (min == null && max == null) return true;
        const n = (typeof v === 'number') ? v :
                  (v && typeof v.raw === 'number' ? v.raw :
                  (v && typeof v.max === 'number' ? v.max : null));
        if (n == null) return false;
        if (min != null && n < min) return false;
        if (max != null && n > max) return false;
        return true;
    }

    function getStatValue(item, statName) {
        const t = normalizeKeyName(statName);
        const get = (paths) => {
            for (const p of paths) {
                const parts = p.split('.');
                let cur = item;
                let ok = true;
                for (const part of parts) {
                    if (!cur) { ok = false; break; }
                    cur = cur[part];
                }
                if (!ok || cur === undefined || cur === null) continue;
                if (typeof cur === 'number') return cur;
                if (typeof cur === 'object') {
                    if (typeof cur.raw === 'number') return cur.raw;
                    if (typeof cur.max === 'number') return cur.max;
                }
            }
            return null;
        };

        // Base DPS
        if (t === 'basedps') {
            const dmg = get([
                'base.baseDamage.raw', 'base.baseDamage',
                'rawMainAttackDamage', 'rawMainAttackDamage.raw',
                'rawDamage', 'rawDamage.raw',
                'base.baseDamage.max', 'base.baseDamage.min',
                'identifications.rawMainAttackDamage', 'identifications.mainAttackDamage', 'identifications.rawDamage'
            ]);
            const asp = get(['rawAttackSpeed', 'attackSpeed', 'base.attackSpeed', 'identifications.rawAttackSpeed', 'identifications.attackSpeed']);
            if (dmg == null) return null;
            const a = (asp == null) ? 1 : asp;
            return dmg * a;
        }

        // elemental / neutral / raw damage
        if (t.endsWith('damage') || t.startsWith('raw')) {
            const compact = statName.replace(/\s+/g, '');
            const direct = get([
                `base.${compact}.raw`,
                `raw${compact}`,
                compact,
                `identifications.${compact}`,
                `identifications.raw${compact}`
            ]);
            if (direct != null) return direct;
        }

        // attack speed
        if (t === 'attackspeed' || t === 'attackspeedbonus') {
            return get(['rawAttackSpeed', 'attackSpeed', 'base.attackSpeed']);
        }

        // other simple mappings
        if (t === 'manaregen') return get(['manaRegen', 'rawMaxMana']);
        if (t === 'healthregen' || t === 'healthpercentregen' || t === 'health%regen') return get(['healthRegen', 'healthRegenRaw', 'rawHealth']);
        if (t === 'hp' || t === 'basehp' || t === 'basehealth') return get(['base.baseHealth', 'rawHealth']);
        if (t === 'powderslots') return get(['powderSlots']);
        if (t === 'reflection') return get(['reflection']);
        if (t === 'lootbonus') return get(['lootBonus', 'leveledLootBonus', 'base.leveledLootBonus']);
        if (t === 'stealing') return get(['stealing', 'manaSteal', 'lifeSteal']);

        return null;
    }

    function inferSubcategory(item) {
        if (!item) return '';
        if (item.subcategory && item.subcategory !== 'UNKNOWN') return item.subcategory;
        if (item.armourType) return item.armourType[0] ? item.armourType[0].toUpperCase() + item.armourType.slice(1) : item.armourType;
        if (item.toolType) return item.toolType[0] ? item.toolType[0].toUpperCase() + item.toolType.slice(1) : item.toolType;
        if (item.weaponType) return item.weaponType[0] ? item.weaponType[0].toUpperCase() + item.weaponType.slice(1) : item.weaponType;
        if (item.type) return item.type[0] ? item.type[0].toUpperCase() + item.type.slice(1) : item.type;
        return '';
    }

    function getAttackSpeedCategory(item) {
        if (!item) return '';
        if (item.attackSpeedCategory) return item.attackSpeedCategory;
        if (item.attackSpeedLabel) return item.attackSpeedLabel;
        const asp = getStatValue(item, 'Attack Speed');
        if (asp == null) {
            const sub = (inferSubcategory(item) || '').toString().toLowerCase();
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
            };
            if (sub && weaponDefaultSpeed[sub]) return weaponDefaultSpeed[sub];
            return '';
        }
        if (asp <= 0.5) return 'super_slow';
        if (asp <= 0.75) return 'very_slow';
        if (asp <= 0.95) return 'slow';
        if (asp <= 1.15) return 'normal';
        if (asp <= 1.4) return 'fast';
        if (asp <= 1.8) return 'very_fast';
        return 'super_fast';
    }

    function itemHasStatFilter(item, statName, op, min, max) {
        const derived = getStatValue(item, statName);
        if (derived !== null && derived !== undefined) {
            if (op === 'NOT') return !(derived !== null);
            if (op === 'HAS') return valueMatches(derived, min, max);
            if (op === 'COUNT') return !!derived;
        }

        const target = normalizeKeyName(statName);
        let found = false;

        function walk(obj) {
            if (!obj || typeof obj !== 'object') return;
            if (Array.isArray(obj)) {
                for (const el of obj) walk(el);
                return;
            }
            for (const [k, v] of Object.entries(obj)) {
                const kNorm = normalizeKeyName(k);
                if (kNorm === target) {
                    if (op === 'NOT') { found = true; return; }
                    if (op === 'HAS') {
                        if (valueMatches(v, min, max)) { found = true; return; }
                    }
                    if (op === 'COUNT') { if (v) { found = true; return; } }
                }
                if (!found) walk(v);
                if (found) return;
            }
        }
        walk(item);
        if (op === 'NOT') return !found;
        return found;
    }

    // ==================== Dropdown Population ====================
    function populateDropdown(dropdown, items, includeAny = true) {
        if (!dropdown) return;
        while (dropdown.options.length > 1) dropdown.remove(1);
        for (const it of items) {
            const o = document.createElement('option');
            o.value = it;
            o.textContent = it[0] ? it[0].toUpperCase() + it.slice(1) : it;
            dropdown.appendChild(o);
        }
    }

    if (categoryDropdown) {
        populateDropdown(categoryDropdown, categories);
        // Append category:subcategory entries
        for (const cat of Object.keys(subcategories)) {
            const list = subcategories[cat] || [];
            for (const sub of list) {
                const o = document.createElement('option');
                o.value = `${cat}|${sub}`;
                o.textContent = `${cat}: ${sub}`;
                categoryDropdown.appendChild(o);
            }
        }
    }

    if (rarityDropdown) {
        populateDropdown(rarityDropdown, rarities);
    }

    if (statGroupDropdown) {
        while (statGroupDropdown.options.length > 1) statGroupDropdown.remove(1);
        for (const s of stats) {
            const o = document.createElement('option');
            o.value = s;
            o.textContent = s;
            statGroupDropdown.appendChild(o);
        }
    }

    // ==================== Pretty Formatting Helpers ====================
    function prettyIdentKey(k) {
        if (!k) return '';
        const m = k.toString();
        const map = {
            'manaRegen': 'Mana Regen',
            'manaSteal': 'Mana Steal',
            'spellDamage': 'Spell Damage %',
            '1stSpellCost': '1st Spell Cost %',
            '2ndSpellCost': '2nd Spell Cost %',
            '3rdSpellCost': '3rd Spell Cost %',
            '4thSpellCost': '4th Spell Cost %',
            'rawIntelligence': 'Intelligence',
            'rawStrength': 'Strength',
            'rawDexterity': 'Dexterity',
            'rawAgility': 'Agility'
        };
        if (map[m]) return map[m];
        const cleaned = m.replace(/^raw/i, '').replace(/([A-Z])/g, ' $1').replace(/[_]/g, ' ').trim();
        return cleaned.replace(/(^|\s)\S/g, s => s.toUpperCase());
    }

    function prettyIdentVal(k, v) {
        if (v == null) return '';
        if (typeof v === 'object') {
            if (v.min !== undefined && v.max !== undefined) {
                // Format range as: "<min><unit> <Label> <max><unit>" when used standalone.
                const isPercent = /spellcost|spelldamage/i.test(k);
                const isPer5 = /manaRegen|healthRegen/i.test(k);
                const minDisplay = isPercent ? `${v.min}%` : (isPer5 ? `${v.min}/5s` : String(v.min));
                const maxDisplay = isPercent ? `${v.max}%` : (isPer5 ? `${v.max}/5s` : String(v.max));
                // Return a compact range text (label may be prepended where needed)
                return `${minDisplay} – ${maxDisplay}`;
            }
            if (v.raw !== undefined) {
                if (/spellcost|spelldamage/i.test(k)) return `${v.raw}%`;
                if (/manaRegen|healthRegen/i.test(k)) return `${v.raw}/5s`;
                return String(v.raw);
            }
            return JSON.stringify(v);
        }
        return String(v);
    }

    // Helper to format a single numeric ident value with appropriate unit
    function formatIdentNumber(key, num) {
        if (num == null) return '';
        if (/spellcost|spelldamage/i.test(key)) return `${num}%`;
        if (/manaRegen|healthRegen/i.test(key)) return `${num}/5s`;
        return String(num);
    }

    function prettyEnum(s) {
        if (!s) return '';
        return s.toString().replace(/([A-Z])/g, '_$1').replace(/[- ]/g, '_').toUpperCase();
    }

    // ==================== Search Implementation ====================
    async function ensureItemsLoaded() {
        if (itemsCache) return itemsCache;
        try {
            const res = await fetch('wapi/data/items.categorized.json');
            if (!res.ok) throw new Error('Failed to fetch items data');
            itemsCache = await res.json();
            return itemsCache;
        } catch (err) {
            console.warn('Could not load items:', err);
            itemsCache = [];
            return itemsCache;
        }
    }

    async function runSearch() {
        if (!resultsContainer) return;
        resultsContainer.innerHTML = 'Searching...';

        const items = await ensureItemsLoaded();
        if (!items.length) {
            resultsContainer.textContent = 'No items loaded.';
            return;
        }

        try {
            // Parse input
            let rawInput = (searchInput && searchInput.value || '').trim();
            rawInput = rawInput.replace(/\+/g, ',');

            let inlineCategory = null;
            let inlineSubcategory = null;
            const inlineStats = [];

            const leadCat = rawInput.match(/^\s*(weapon|weapons|armour|armor|accessory|accessories)\b[:\s-]*(.*)$/i);
            if (leadCat) {
                const k = leadCat[1].toLowerCase();
                const rest = (leadCat[2] || '').trim();
                if (k === 'weapon' || k === 'weapons') { rawInput = rest; inlineCategory = 'Weapons'; }
                else if (k === 'armour' || k === 'armor') { rawInput = rest; inlineCategory = 'Armour'; }
                else if (k === 'accessory' || k === 'accessories') { rawInput = rest; inlineCategory = 'Accessories'; }
            }

            const parts = rawInput.split(/[;,]/).map(p => p.trim()).filter(p => p.length > 0);
            let freeText = '';

            for (const part of parts) {
                const kv = part.match(/^(\w[\w ]*?)\s*[:=]\s*(.+)$/i);
                if (kv) {
                    const key = kv[1].toLowerCase().trim();
                    const val = kv[2].toLowerCase().trim();
                    if (key === 'weapon' || key === 'weapons' || (key === 'category' && val === 'weapons')) {
                        inlineCategory = 'Weapons';
                        inlineSubcategory = val[0] ? val[0].toUpperCase() + val.slice(1) : val;
                        continue;
                    }
                    if (key === 'armour' || key === 'armor' || key === 'armours' || (key === 'category' && val === 'armour')) {
                        inlineCategory = 'Armour';
                        inlineSubcategory = val[0] ? val[0].toUpperCase() + val.slice(1) : val;
                        continue;
                    }
                    if (key === 'accessory' || key === 'accessories' || (key === 'category' && val === 'accessories')) {
                        inlineCategory = 'Accessories';
                        inlineSubcategory = val[0] ? val[0].toUpperCase() + val.slice(1) : val;
                        continue;
                    }
                }

                const quickMatch = part.match(/^(.+?)\s*(>=|<=|>|<|=)?\s*(\d+(?:\.\d+)?)$/i);
                if (quickMatch) {
                    const statName = quickMatch[1].trim();
                    const opToken = quickMatch[2] || '>=';
                    const val = Number(quickMatch[3]);
                    let min = null, max = null;
                    switch (opToken) {
                        case '>': min = Number(val) + Number.EPSILON; break;
                        case '>=': min = Number(val); break;
                        case '<': max = Number(val) - Number.EPSILON; break;
                        case '<=': max = Number(val); break;
                        case '=': min = max = Number(val); break;
                    }
                    inlineStats.push({ stat: statName, min, max });
                    continue;
                }

                const numFirst = part.match(/^(\d+(?:\.\d+)?)(?:\s*(min|max))?\s+(.+)$/i);
                if (numFirst) {
                    const val = Number(numFirst[1]);
                    const kind = (numFirst[2] || '').toLowerCase();
                    const statName = numFirst[3].trim();
                    let min = null, max = null;
                    if (kind === 'max') max = val;
                    else min = val;
                    inlineStats.push({ stat: statName, min, max });
                    continue;
                }

                freeText = freeText ? (freeText + ' ' + part) : part;
            }

            if (!inlineCategory && inlineStats.length === 0 && freeText) {
                const tok = freeText.toLowerCase().trim();
                let mapped = subcatSynonyms[tok] || tok;
                if (mapped && subcatLookup[mapped]) {
                    inlineCategory = subcatLookup[mapped];
                    inlineSubcategory = mapped[0] ? mapped[0].toUpperCase() + mapped.slice(1) : mapped;
                    freeText = '';
                }
            }

            const q = freeText.toLowerCase().trim();
            const catVal = inlineCategory ? (inlineSubcategory ? `${inlineCategory}|${inlineSubcategory}` : inlineCategory) : (categoryDropdown ? categoryDropdown.value : '');
            const rarityVal = rarityDropdown ? (rarityDropdown.value || '').toLowerCase() : '';

            const filters = [];
            if (statFiltersList) {
                for (const g of statFiltersList.children) {
                    try {
                        const op = g.querySelector('.atlas-stat-op').value;
                        const stat = g.querySelector('.atlas-stat-select').value;
                        const min = g.querySelector('.atlas-weapon-min').value;
                        const max = g.querySelector('.atlas-weapon-max').value;
                        filters.push({ op, stat, min: min ? Number(min) : null, max: max ? Number(max) : null });
                    } catch (e) { }
                }
            }

            const weaponFilterItems = document.querySelectorAll('.atlas-weapon-filter-item');
            for (const wf of weaponFilterItems) {
                try {
                    const label = (wf.querySelector('p') || {}).textContent || '';
                    const minEl = wf.querySelector('.atlas-weapon-min');
                    const maxEl = wf.querySelector('.atlas-weapon-max');
                    const speedSelect = wf.querySelector('.atlas-weapon-speed-dropdown');
                    if (speedSelect && speedSelect.value) {
                        filters.push({ cat: 'attackSpeed', value: speedSelect.value });
                        continue;
                    }
                    if (!minEl && !maxEl) continue;
                    const min = minEl && minEl.value ? Number(minEl.value) : null;
                    const max = maxEl && maxEl.value ? Number(maxEl.value) : null;
                    if (min == null && max == null) continue;
                    filters.push({ op: 'HAS', stat: label, min, max });
                } catch (e) { }
            }

            function matches(item) {
                if (inlineStats && inlineStats.length > 0) {
                    for (const st of inlineStats) {
                        if (!itemHasStatFilter(item, st.stat, 'HAS', st.min, st.max)) return false;
                    }
                } else if (q) {
                    const name = (item.name || item.displayName || item.internalName || '').toLowerCase();
                    const desc = (item.description || item.lore || '').toLowerCase();
                    if (!name.includes(q) && !desc.includes(q)) return false;
                }

                if (catVal) {
                    if (catVal.includes('|')) {
                        const [cat, sub] = catVal.split('|');
                        if ((item.category || '') !== cat) return false;
                        const itemSub = (inferSubcategory(item) || '').toString();
                        if (itemSub !== sub) return false;
                    } else {
                        if (catVal && (item.category || '') !== catVal) return false;
                    }
                }

                if (rarityVal) {
                    const r = (item.rarity || item.tier || '').toString().toLowerCase();
                    if (!r.includes(rarityVal)) return false;
                }

                for (const f of filters) {
                    if (f.cat === 'attackSpeed') {
                        const cat = getAttackSpeedCategory(item);
                        if (!cat || cat !== f.value) return false;
                        continue;
                    }
                    if (!itemHasStatFilter(item, f.stat, f.op, f.min, f.max)) return false;
                }
                return true;
            }

            const matchesList = items.filter(matches);
            resultsContainer.innerHTML = '';

            if (matchesList.length === 0) {
                resultsContainer.textContent = 'No items found.';
                return;
            }

            // Render grid
            const grid = document.createElement('div');
            grid.className = 'search-grid';

            for (const it of matchesList) {
                const box = document.createElement('div');
                box.className = 'search-item';

                // Name
                const nameSection = document.createElement('div');
                nameSection.className = 'section-name';
                const title = document.createElement('h3');
                title.textContent = it.name || it.displayName || it.id || '[item]';
                nameSection.appendChild(title);
                box.appendChild(nameSection);

                // Damage section
                const dmgSection = document.createElement('div');
                dmgSection.className = 'section-damage';

                const dpsVal = it.averageDps || it.baseDps || getStatValue(it, 'basedps') || '';
                const dpsEl = document.createElement('div');
                dpsEl.className = 'field-dps';
                dpsEl.textContent = 'DPS: ' + dpsVal;
                dmgSection.appendChild(dpsEl);

                const asVal = it.attackSpeed || getStatValue(it, 'Attack Speed') || '';
                const asEl = document.createElement('div');
                asEl.className = 'field-aspd';
                asEl.textContent = 'Attack Speed: ' + (typeof asVal === 'string' ? prettyEnum(asVal) : asVal);
                dmgSection.appendChild(asEl);

                // Elemental damages
                if (it.base) {
                    const order = [['baseEarthDamage','Earth'], ['baseThunderDamage','Thunder'], ['baseWaterDamage','Water'], ['baseFireDamage','Fire'], ['baseAirDamage','Air']];
                    for (const [k,label] of order) {
                        if (it.base[k]) {
                            const b = it.base[k];
                            const val = (b.min !== undefined || b.max !== undefined) ? `${b.min||''}–${b.max||''}` : prettyIdentVal(k, b);
                            const row = document.createElement('div');
                            row.className = 'field-element';
                            row.textContent = `${label} Damage: ${val}`;
                            dmgSection.appendChild(row);
                        }
                    }
                } else if (it.identifications) {
                    for (const [k,v] of Object.entries(it.identifications)) {
                        if (/earth|thunder|water|fire|air/i.test(k)) {
                            const row = document.createElement('div');
                            row.className = 'field-element';
                            row.textContent = `${prettyIdentKey(k)}: ${prettyIdentVal(k, v)}`;
                            dmgSection.appendChild(row);
                        }
                    }
                }
                box.appendChild(dmgSection);

                // Requirements
                const reqs = [];
                const classReq = (it.requirements && (it.requirements.classRequirement || it.requirements['class'] || it.requirements.class)) || '';
                if (classReq) reqs.push('Class: ' + classReq);
                const levelReq = (it.requirements && (it.requirements.level || it.requirements.levelRequirement)) || '';
                if (levelReq) reqs.push('Level: ' + levelReq);
                if (it.requirements) {
                    for (const k of ['strength','dexterity','intelligence','agility','defence']) {
                        if (it.requirements[k] !== undefined) reqs.push(`${k.charAt(0).toUpperCase()+k.slice(1)}: ${it.requirements[k]}`);
                    }
                }
                if (reqs.length) {
                    const reqWrap = document.createElement('div');
                    reqWrap.className = 'search-item-reqs section-reqs';
                    const reqTitle = document.createElement('strong');
                    reqTitle.textContent = 'Requirements:';
                    reqWrap.appendChild(reqTitle);
                    for (const r of reqs) {
                        const rline = document.createElement('div');
                        rline.textContent = r;
                        reqWrap.appendChild(rline);
                    }
                    box.appendChild(reqWrap);
                }

                // Identifications
                if (it.identifications && typeof it.identifications === 'object') {
                    const idWrap = document.createElement('div');
                    idWrap.className = 'search-item-identifications section-ident';
                    const idTitle = document.createElement('strong');
                    idTitle.textContent = 'Identifications:';
                    idWrap.appendChild(idTitle);
                    const ul = document.createElement('ul');

                    const prefer = ['rawStrength','rawDexterity','rawAgility','rawIntelligence','manaRegen','manaSteal','spellDamage','1stSpellCost','2ndSpellCost','3rdSpellCost','4thSpellCost'];
                    const seen = new Set();
                    // Helper to append a range as: "<min> <Label> <max>"
                    function appendRangeListItem(key, v) {
                        const li = document.createElement('li');
                        li.className = 'ident-range-item';

                        const left = document.createElement('div');
                        left.className = 'ident-range-left';
                        left.textContent = formatIdentNumber(key, v.min);

                        const mid = document.createElement('div');
                        mid.className = 'ident-range-label';
                        mid.textContent = prettyIdentKey(key);

                        const right = document.createElement('div');
                        right.className = 'ident-range-right';
                        right.textContent = formatIdentNumber(key, v.max);

                        li.appendChild(left);
                        li.appendChild(mid);
                        li.appendChild(right);
                        ul.appendChild(li);
                    }

                    for (const k of prefer) {
                        if (it.identifications[k] !== undefined) {
                            const v = it.identifications[k];
                            if (v && typeof v === 'object' && v.min !== undefined && v.max !== undefined) {
                                appendRangeListItem(k, v);
                            } else {
                                const li = document.createElement('li');
                                const lab = document.createElement('span');
                                lab.className = 'ident-label';
                                lab.textContent = prettyIdentKey(k) + ':'; // add colon
                                const val = document.createElement('span');
                                val.className = 'ident-value';
                                val.textContent = prettyIdentVal(k, v);
                                li.appendChild(lab);
                                li.appendChild(val);
                                ul.appendChild(li);
                            }
                            seen.add(k);
                        }
                    }
                    const rem = Object.keys(it.identifications).filter(k => !seen.has(k)).sort();
                    for (const k of rem) {
                        const v = it.identifications[k];
                        if (v && typeof v === 'object' && v.min !== undefined && v.max !== undefined) {
                            appendRangeListItem(k, v);
                            continue;
                        }
                        const li = document.createElement('li');
                        const lab = document.createElement('span');
                        lab.className = 'ident-label';
                        lab.textContent = prettyIdentKey(k) + ':'; // add colon
                        const val = document.createElement('span');
                        val.className = 'ident-value';
                        val.textContent = prettyIdentVal(k, v);
                        li.appendChild(lab);
                        li.appendChild(val);
                        ul.appendChild(li);
                    }
                    idWrap.appendChild(ul);
                    box.appendChild(idWrap);
                }

                // Lore
                if (it.lore) {
                    const loreSection = document.createElement('div');
                    loreSection.className = 'section-lore';
                    const loreEl = document.createElement('div');
                    loreEl.className = 'search-item-lore';
                    loreEl.textContent = it.lore;
                    loreSection.appendChild(loreEl);
                    box.appendChild(loreSection);
                }

                // Footer (powder slots + rarity)
                const footer = document.createElement('div');
                footer.className = 'search-item-footer';
                const pSlots = (it.powderSlots !== undefined) ? it.powderSlots : (it.identifications && (it.identifications.powderSlots || it.identifications['Powder Slots']));
                const left = document.createElement('div');
                left.className = 'footer-left';
                left.textContent = 'Powder Slots: ' + (pSlots != null ? String(pSlots) : '');
                footer.appendChild(left);
                const right = document.createElement('div');
                right.className = 'footer-right';
                right.textContent = (it.rarity || it.tier || '');
                footer.appendChild(right);
                box.appendChild(footer);

                grid.appendChild(box);
            }

            resultsContainer.appendChild(grid);
        } catch (err) {
            resultsContainer.textContent = 'Search failed: ' + (err.message || err);
        }
    }

    // ==================== Item Detail View ====================
    function renderItemDetail(item) {
        if (!resultsContainer) return;
        resultsContainer.innerHTML = '';

        const wrap = document.createElement('div');
        wrap.className = 'atlas-item-detail';

        // Header with icon
        const header = document.createElement('div');
        header.className = 'item-header';

        const icon = document.createElement('div');
        icon.className = 'item-icon';
        (function attachIcon() {
            function getGradientForIconName(name) {
                const n = (name || '').toLowerCase();
                if (n.includes('fire')) return 'radial-gradient(circle at 30% 25%, #ffb46b, #7b2b1a)';
                if (n.includes('water')) return 'radial-gradient(circle at 30% 25%, #8fe3ff, #1b4f6b)';
                if (n.includes('earth')) return 'radial-gradient(circle at 30% 25%, #9be78c, #23421a)';
                if (n.includes('thunder')) return 'radial-gradient(circle at 30% 25%, #ffe58a, #6b4b00)';
                if (n.includes('air')) return 'radial-gradient(circle at 30% 25%, #cfe6ff, #2b2f3a)';
                if (n.includes('multi')) return 'radial-gradient(circle at 30% 25%, #e6b8ff, #2b1632)';
                if (n.includes('basicgold') || n.includes('gold')) return 'radial-gradient(circle at 30% 25%, #ffd27a, #8b5f12)';
                if (n.includes('basicwood') || n.includes('wood')) return 'radial-gradient(circle at 30% 25%, #d6b88f, #3b2b12)';
                return 'radial-gradient(circle at 30% 25%, #6b2f8f, #2b1632)';
            }

            const ico = item.icon && item.icon.value;
            let tryName = null;
            if (ico && typeof ico === 'object' && ico.name) tryName = ico.name.replace(/[^a-zA-Z0-9._-]/g, '');
            if (tryName) {
                const attempt = new Image();
                attempt.crossOrigin = 'anonymous';
                attempt.src = 'assets/icons/' + tryName + '.png';
                attempt.onload = function () {
                    icon.style.backgroundImage = `url(${attempt.src})`;
                    icon.classList.add('has-image');
                };
                attempt.onerror = function () {
                    icon.style.backgroundImage = getGradientForIconName(tryName);
                    icon.textContent = (item.name || '').charAt(0) || '?';
                };
                return;
            }
            icon.style.backgroundImage = getGradientForIconName(item.subcategory || item.category || '');
            icon.textContent = (item.name || '').charAt(0) || '?';
        })();
        header.appendChild(icon);

        const titleWrap = document.createElement('div');
        titleWrap.className = 'item-title-wrap';
        const title = document.createElement('h2');
        title.className = 'item-title';
        title.textContent = item.name || item.displayName || '[no name]';
        titleWrap.appendChild(title);

        const subBadges = document.createElement('div');
        subBadges.className = 'item-badges';
        const cat = document.createElement('span');
        cat.className = 'badge badge-category';
        cat.textContent = item.category || '';
        subBadges.appendChild(cat);
        if (item.subcategory) {
            const sub = document.createElement('span');
            sub.className = 'badge badge-subcat';
            sub.textContent = item.subcategory;
            subBadges.appendChild(sub);
        }
        if (item.rarity || item.tier) {
            const r = document.createElement('span');
            r.className = 'badge badge-rarity';
            r.textContent = item.rarity || item.tier;
            subBadges.appendChild(r);
        }
        titleWrap.appendChild(subBadges);
        header.appendChild(titleWrap);
        wrap.appendChild(header);

        // Stats block
        const statsDiv = document.createElement('div');
        statsDiv.className = 'item-stats';

        if (item.attackSpeed) {
            const as = document.createElement('div');
            as.className = 'item-stat-line stat-attackspeed';
            const left = document.createElement('div');
            left.className = 'stat-left';
            left.innerHTML = `<strong>Attack Speed:</strong> ${prettyEnum(item.attackSpeed)}`;
            const right = document.createElement('div');
            right.className = 'stat-right';
            as.appendChild(left);
            as.appendChild(right);
            statsDiv.appendChild(as);
        }

        if (item.base) {
            const order = [
                ['baseEarthDamage','Earth','\u2692'],
                ['baseThunderDamage','Thunder','\u26A1'],
                ['baseWaterDamage','Water','\u2744'],
                ['baseFireDamage','Fire','\u2737'],
                ['baseAirDamage','Air','\u2733']
            ];
            for (const [k,label,iconSym] of order) {
                if (item.base[k]) {
                    const b = item.base[k];
                    const line = document.createElement('div');
                    line.className = 'item-stat-line damage-line stat-' + label.toLowerCase();
                    const left = document.createElement('div');
                    left.className = 'stat-left';
                    left.innerHTML = `${iconSym} ${label} Damage:`;
                    const right = document.createElement('div');
                    right.className = 'stat-right';
                    right.textContent = `${b.min || ''}-${b.max || ''}`;
                    line.appendChild(left);
                    line.appendChild(right);
                    statsDiv.appendChild(line);
                }
            }
        }

        if (item.requirements) {
            const req = document.createElement('div');
            req.className = 'item-reqs';
            if (item.requirements.classRequirement) {
                const c = document.createElement('div');
                c.innerHTML = '<strong>Class Req:</strong> ' + item.requirements.classRequirement;
                req.appendChild(c);
            }
            if (item.requirements.level) {
                const lvl = document.createElement('div');
                lvl.innerHTML = '<strong>Combat Level Min:</strong> ' + item.requirements.level;
                req.appendChild(lvl);
            }
            const mins = ['strength','dexterity','intelligence','agility','defence'];
            for (const m of mins) {
                if (item.requirements[m] !== undefined) {
                    const el = document.createElement('div');
                    el.textContent = `${m.charAt(0).toUpperCase()+m.slice(1)} Min: ${item.requirements[m]}`;
                    req.appendChild(el);
                }
            }
            statsDiv.appendChild(req);
        }

        // Quick identifications
        (function renderQuickIdents() {
            function pickIdent(keys) {
                if (!item.identifications) return null;
                for (const k of keys) {
                    if (item.identifications[k] !== undefined) return item.identifications[k];
                }
                return null;
            }

            function valText(v, key) {
                if (!v) return null;
                if (typeof v === 'object') {
                    if (v.min !== undefined && v.max !== undefined) {
                        if (/SpellCost|spellCost|1stSpellCost|2ndSpellCost|3rdSpellCost|4thSpellCost/i.test(key)) return `${v.min}%–${v.max}%`;
                        if (/manaRegen|healthRegen/i.test(key)) return `${v.min}/5s–${v.max}/5s`;
                        return `${v.min}–${v.max}`;
                    }
                    if (v.raw !== undefined) {
                        if (/SpellCost|spellCost|1stSpellCost|2ndSpellCost|3rdSpellCost|4thSpellCost/i.test(key)) return `${v.raw}%`;
                        if (/manaRegen|healthRegen/i.test(key)) return `${v.raw}/5s`;
                        return String(v.raw);
                    }
                }
                return String(v);
            }

            const intel = pickIdent(['rawIntelligence','intelligence','rawInt']);
            if (intel) {
                const v = (intel.raw !== undefined) ? intel.raw : (intel.min !== undefined ? intel.min : intel);
                const p = document.createElement('div');
                p.className = 'item-primary-attr';
                p.innerHTML = `<span class="primary-key">Intelligence:</span> <span class="primary-val ${Number(v) >= 0 ? 'val-pos' : 'val-neg'}">${v}</span>`;
                statsDiv.appendChild(p);
            }

            const quick = [
                { keyDisplay: 'Mana Regen', keys: ['manaRegen','ManaRegen'] },
                { keyDisplay: 'Mana Steal', keys: ['manaSteal','ManaSteal'] },
                { keyDisplay: '1st Spell Cost%', keys: ['1stSpellCost','1st Spell Cost','1stSpellCost%'] },
                { keyDisplay: '2nd Spell Cost%', keys: ['2ndSpellCost','2nd Spell Cost','2ndSpellCost%'] },
                { keyDisplay: '3rd Spell Cost%', keys: ['3rdSpellCost','3rd Spell Cost','3rdSpellCost%'] },
                { keyDisplay: '4th Spell Cost%', keys: ['4thSpellCost','4th Spell Cost','4thSpellCost%'] }
            ];
            for (const q of quick) {
                const v = pickIdent(q.keys);
                const txt = valText(v, q.keys[0]);
                if (txt) {
                    let cls = 'item-stat-line';
                    if (/Mana Regen/i.test(q.keyDisplay)) cls += ' stat-mana';
                    else if (/Mana Steal/i.test(q.keyDisplay)) cls += ' stat-mana-steal';
                    else if (/Spell Cost/i.test(q.keyDisplay)) cls += ' stat-spell-cost';
                    const line = document.createElement('div');
                    line.className = cls;
                    const left = document.createElement('div');
                    left.className = 'stat-left';
                    left.textContent = q.keyDisplay + ':';
                    const right = document.createElement('div');
                    right.className = 'stat-right';
                    right.innerHTML = `<span class="${(typeof v === 'object' && (v.raw||v.min) < 0) ? 'val-neg' : 'val-pos'}">${txt}</span>`;
                    line.appendChild(left);
                    line.appendChild(right);
                    statsDiv.appendChild(line);
                }
            }

            const pslots = (item.powderSlots !== undefined) ? item.powderSlots : (item.identifications && (item.identifications.powderSlots || item.identifications['Powder Slots']));
            if (pslots !== undefined && pslots !== null) {
                const ps = document.createElement('div');
                ps.className = 'item-stat-line';
                const left = document.createElement('div');
                left.className = 'stat-left';
                left.textContent = 'Powder Slots:';
                const right = document.createElement('div');
                right.className = 'stat-right';
                right.textContent = pslots;
                ps.appendChild(left);
                ps.appendChild(right);
                statsDiv.appendChild(ps);
            }
        })();

        wrap.appendChild(statsDiv);

        // Identifications full list
        if (item.identifications) {
            const idWrap = document.createElement('div');
            idWrap.className = 'item-identifications';

            const primaryAttrs = ['rawStrength','rawDexterity','rawAgility','rawDefence'];
            for (const attr of primaryAttrs) {
                const info = item.identifications[attr];
                if (info && info.raw !== undefined) {
                    const label = attr.replace(/^raw/, '');
                    const p = document.createElement('div');
                    p.className = 'item-primary-attr';
                    p.innerHTML = `<span class="primary-key">${label.charAt(0).toUpperCase()+label.slice(1)}:</span> <span class="primary-val val-pos">${info.raw}</span>`;
                    idWrap.appendChild(p);
                }
            }

            function fmtVal(k, v) {
                if (v && v.raw !== undefined) {
                    if (/spellDamage|SpellDamage/i.test(k)) return `${v.raw}%`;
                    if (/SpellCost|spellCost|1stSpellCost|2ndSpellCost|3rdSpellCost|4thSpellCost/i.test(k)) return `${v.raw}%`;
                    if (/manaRegen|healthRegen/i.test(k)) return `${v.raw}/5s`;
                    return String(v.raw);
                }
                if (v && v.min !== undefined && v.max === undefined) return String(v.min);
                return '';
            }

            const prefer = ['manaRegen','manaSteal','spellDamage','1stSpellCost','2ndSpellCost','3rdSpellCost','4thSpellCost'];
            const seen = new Set();

            // If Intelligence exists as a single non-range ident, render it like the Requirements block
            (function renderIntelligenceAsReq() {
                const intelKeys = ['rawIntelligence','intelligence','rawInt'];
                for (const k of intelKeys) {
                    const v = item.identifications[k];
                    if (v === undefined) continue;
                    // skip ranged idents
                    if (v && typeof v === 'object' && v.min !== undefined && v.max !== undefined) continue;
                    const val = (v && v.raw !== undefined) ? v.raw : (v && v.min !== undefined ? v.min : v);
                    const intelBlock = document.createElement('div');
                    intelBlock.className = 'item-reqs';
                    const line = document.createElement('div');
                    line.textContent = 'Intelligence: ' + val;
                    intelBlock.appendChild(line);
                    idWrap.appendChild(intelBlock);
                    seen.add(k);
                    break;
                }
            })();

            function appendSingleIdent(k) {
                const v = item.identifications[k];
                if (!v) return;
                seen.add(k);
                const line = document.createElement('div');
                line.className = 'ident-line ident-single-line';
                const valText = fmtVal(k, v);
                const numeric = Number((v.raw !== undefined) ? v.raw : (v.min !== undefined ? v.min : 0));
                const colorClass = (numeric > 0) ? 'val-pos' : (numeric < 0) ? 'val-neg' : 'val-neu';
                const label = document.createElement('span');
                label.className = 'ident-key';
                label.textContent = prettyIdentKey(k) + ': ';
                const valSpan = document.createElement('span');
                valSpan.className = `ident-val ${colorClass}`;
                valSpan.textContent = valText;
                line.appendChild(label);
                line.appendChild(valSpan);
                idWrap.appendChild(line);
            }

            function appendRangeIdent(k) {
                const v = item.identifications[k];
                if (!v || v.min === undefined || v.max === undefined) return;
                seen.add(k);
                const line = document.createElement('div');
                line.className = 'ident-line ident-range-line';
                const left = document.createElement('div');
                left.className = 'ident-range-left';
                left.textContent = formatIdentNumber(k, v.min);
                const mid = document.createElement('div');
                mid.className = 'ident-range-label';
                mid.textContent = prettyIdentKey(k);
                const right = document.createElement('div');
                right.className = 'ident-range-right';
                right.textContent = formatIdentNumber(k, v.max);
                line.appendChild(left);
                line.appendChild(mid);
                line.appendChild(right);
                idWrap.appendChild(line);
            }

            // Order: preferred non-range idents first, then preferred ranges, then remaining non-ranges, then remaining ranges
            const prefNonRange = [];
            const prefRanges = [];
            for (const k of prefer) {
                const v = item.identifications[k];
                if (v === undefined) continue;
                if (v && typeof v === 'object' && v.min !== undefined && v.max !== undefined) prefRanges.push(k);
                else prefNonRange.push(k);
            }
            for (const k of prefNonRange) appendSingleIdent(k);
            for (const k of prefRanges) appendRangeIdent(k);

            const remaining = Object.keys(item.identifications).filter(k => !seen.has(k)).sort();
            const remNon = [];
            const remRanges = [];
            for (const k of remaining) {
                const v = item.identifications[k];
                if (v && typeof v === 'object' && v.min !== undefined && v.max !== undefined) remRanges.push(k);
                else remNon.push(k);
            }
            for (const k of remNon) appendSingleIdent(k);
            for (const k of remRanges) appendRangeIdent(k);

            wrap.appendChild(idWrap);
        }

        if (item.lore) {
            const lore = document.createElement('div');
            lore.className = 'item-lore';
            lore.textContent = item.lore;
            wrap.appendChild(lore);
        }

        if (item.averageDps || item.baseDps) {
            const base = document.createElement('div');
            base.className = 'item-base-dps';
            base.innerHTML = '<strong>Base DPS:</strong> ' + (item.averageDps || item.baseDps);
            wrap.appendChild(base);
        }

        const backRow = document.createElement('div');
        backRow.className = 'item-back-row';
        const backBtn = document.createElement('button');
        backBtn.className = 'atlas-search-btn';
        backBtn.textContent = 'Back to results';
        backBtn.addEventListener('click', function() { runSearch(); });
        backRow.appendChild(backBtn);
        wrap.appendChild(backRow);

        resultsContainer.appendChild(wrap);
    }

    // ==================== Autocomplete ====================
    function renderSuggestions(list, q) {
        if (!suggestionsContainer) return;
        suggestionsContainer.innerHTML = '';
        if (!list || list.length === 0) {
            suggestionsContainer.style.display = 'none';
            suggestionsContainer.setAttribute('aria-hidden', 'true');
            return;
        }
        const ul = document.createElement('ul');
        ul.className = 'atlas-suggestions-list';
        for (const name of list.slice(0, 10)) {
            const li = document.createElement('li');
            li.className = 'atlas-suggestion-item';
            li.textContent = name;
            li.addEventListener('mousedown', function(ev) {
                ev.preventDefault();
                if (searchInput) searchInput.value = name;
                suggestionsContainer.style.display = 'none';
                runSearch();
            });
            ul.appendChild(li);
        }
        suggestionsContainer.appendChild(ul);
        suggestionsContainer.style.display = 'block';
        suggestionsContainer.setAttribute('aria-hidden', 'false');
    }

    if (searchInput) {
        searchInput.addEventListener('input', async function() {
            const q = (this.value || '').toLowerCase().trim();
            if (q.length < 1) {
                renderSuggestions([], q);
                return;
            }
            const items = await ensureItemsLoaded();
            const seen = new Set();
            const starts = [];
            const contains = [];
            for (const it of items) {
                const name = (it.name || it.displayName || it.internalName || '').toString();
                if (!name) continue;
                const nLower = name.toLowerCase();
                if (seen.has(name)) continue;
                if (nLower.startsWith(q)) {
                    starts.push(name);
                    seen.add(name);
                } else if (nLower.includes(q)) {
                    contains.push(name);
                    seen.add(name);
                }
            }
            renderSuggestions(starts.concat(contains), q);
        });

        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                runSearch();
            }
        });
    }

    // Hide suggestions when clicking outside
    document.addEventListener('click', function(e) {
        if (!suggestionsContainer) return;
        if (e.target === searchInput) return;
        if (!suggestionsContainer.contains(e.target)) {
            suggestionsContainer.style.display = 'none';
            suggestionsContainer.setAttribute('aria-hidden', 'true');
        }
    });

    // ==================== Stat Group Management ====================
    function createStatGroup(statName) {
        if (!statFiltersList) return;
        const groupDiv = document.createElement('div');
        groupDiv.className = 'atlas-stat-group';

        // Operator select (HAS / NOT)
        const opSelect = document.createElement('select');
        opSelect.className = 'atlas-dropdown atlas-stat-op';
        const hasOpt = document.createElement('option');
        hasOpt.value = 'HAS';
        hasOpt.textContent = 'HAS';
        const notOpt = document.createElement('option');
        notOpt.value = 'NOT';
        notOpt.textContent = 'NOT';
        opSelect.appendChild(hasOpt);
        opSelect.appendChild(notOpt);
        groupDiv.appendChild(opSelect);

        // Row grid: [-] [name select] [+]
        const rowGrid = document.createElement('div');
        rowGrid.className = 'atlas-stat-row-grid';

        const removeBtn = document.createElement('button');
        removeBtn.className = 'atlas-stat-group-remove';
        removeBtn.textContent = '−';
        removeBtn.title = 'Remove filter';
        removeBtn.addEventListener('click', function() {
            groupDiv.remove();
        });
        rowGrid.appendChild(removeBtn);

        const statSelect = document.createElement('select');
        statSelect.className = 'atlas-dropdown atlas-stat-select';
        for (const s of stats) {
            const o = document.createElement('option');
            o.value = s;
            o.textContent = s;
            if (s === statName) o.selected = true;
            statSelect.appendChild(o);
        }
        rowGrid.appendChild(statSelect);

        const addBtn = document.createElement('button');
        addBtn.className = 'atlas-stat-group-add';
        addBtn.textContent = '+';
        addBtn.title = 'Duplicate filter';
        addBtn.addEventListener('click', function() {
            createStatGroup(statSelect.value);
        });
        rowGrid.appendChild(addBtn);

        groupDiv.appendChild(rowGrid);

        // Min/max inputs placed below the row
        const minMaxWrapper = document.createElement('div');
        minMaxWrapper.className = 'atlas-weapon-minmax-group';

        const minInput = document.createElement('input');
        minInput.type = 'number';
        minInput.className = 'atlas-weapon-min';
        minInput.placeholder = 'Min';
        minInput.min = 0;
        const maxInput = document.createElement('input');
        maxInput.type = 'number';
        maxInput.className = 'atlas-weapon-max';
        maxInput.placeholder = 'Max';
        maxInput.min = 0;
        minMaxWrapper.appendChild(minInput);
        minMaxWrapper.appendChild(maxInput);
        groupDiv.appendChild(minMaxWrapper);

        opSelect.addEventListener('change', function() {
            minMaxWrapper.style.display = (this.value === 'HAS') ? 'flex' : 'none';
        });

        opSelect.value = 'HAS';
        minMaxWrapper.style.display = 'flex';

        statFiltersList.appendChild(groupDiv);
    }

    if (statGroupDropdown && statFiltersList) {
        statGroupDropdown.addEventListener('change', function() {
            const value = this.value;
            if (!value) return;
            createStatGroup(value);
            this.selectedIndex = 0;
        });
    }

    // ==================== Initialize ====================
    if (searchBtn) searchBtn.addEventListener('click', runSearch);
    // Navigation buttons: show/hide corresponding content panes using the `hidden` class
    function showContentPane(activeId) {
        for (const nb of navButtons) {
            try {
                const el = nb.content;
                if (el && el.classList) {
                    if (nb.id === activeId) el.classList.remove('hidden');
                    else el.classList.add('hidden');
                }
                const btn = document.getElementById(nb.id);
                if (btn && btn.classList) btn.classList.toggle('active', nb.id === activeId);
            } catch (e) { /* ignore */ }
        }
    }

    for (const nb of navButtons) {
        const btn = document.getElementById(nb.id);
        if (!btn) continue;
        btn.addEventListener('click', function (ev) {
            ev.preventDefault();
            showContentPane(nb.id);
        });
    }

    // Ensure a default active pane (builder)
    (function ensureDefaultPane() {
        const defaultId = 'btn-builder';
        let anyVisible = false;
        for (const nb of navButtons) {
            if (nb.content && nb.content.classList && !nb.content.classList.contains('hidden')) { anyVisible = true; break; }
        }
        if (!anyVisible) showContentPane(defaultId);
    })();
})();