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
  const categoryDropdown = document.querySelector('.atlas-category-dropdown');
  const rarityDropdown = document.querySelector('.atlas-rarity-dropdown');
  const statGroupDropdown = document.querySelector('.atlas-stat-group-dropdown');
  const statFiltersList = document.querySelector('.atlas-stat-filters-list');
  const searchBtn = document.querySelector('.atlas-search-btn');
  const searchInput = document.querySelector('.atlas-search-input');
  const resultsContainer = document.getElementById('atlas-results');
  const suggestionsContainer = document.getElementById('atlas-suggestions');

  // Ensure weapon attack-speed dropdowns default to ANY (blank value)
  (function ensureWeaponSpeedDefault() {
    try {
      const els = document.querySelectorAll('.atlas-weapon-speed-dropdown');
      for (const el of els) {
        el.value = '';
        el.selectedIndex = 0;
      }
    } catch (e) { /* ignore */ }
  })();

  let itemsCache = null;
  // Logging guard to avoid spamming the console and crashing the browser.
  let attackSpeedLogCount = 0;
  const ATTACK_SPEED_LOG_LIMIT = 20;
  // pagination state
  let currentPage = 1;
  let pageSize = 100; // default max items per page

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
    if (typeof asp === 'string') {
      const s = asp.toString().toLowerCase();
      if (s.indexOf('super') !== -1 && s.indexOf('slow') !== -1) return 'super_slow';
      if (s.indexOf('very') !== -1 && s.indexOf('slow') !== -1) return 'very_slow';
      if (s.indexOf('very') !== -1 && s.indexOf('fast') !== -1) return 'very_fast';
      if (s.indexOf('super') !== -1 && s.indexOf('fast') !== -1) return 'super_fast';
      if (s === 'slow' || s === 'normal' || s === 'fast') return s;
    }
    if (asp == null) {
      // DEBUG: Log info for items that are weapon category but not getting a fallback
      const sub = (inferSubcategory(item) || '').toString().toLowerCase();
      const cat = (item.category || item.type || '').toString().toLowerCase();
      const name = (item.name || item.displayName || '').toString();
      let weaponType = (item.weaponType || '').toString().toLowerCase();
      if (cat.includes('weapon')) {
        try {
          console.info('Weapon item with no attack speed fallback', {
            item: name,
            category: cat,
            subcategory: sub,
            weaponType: weaponType,
            base: item.base,
            type: item.type,
            allKeys: Object.keys(item)
          });
        } catch (e) {}
      }
      // If no explicit attack speed, infer defaults for weapon-like items (case-insensitive, robust).
      const looksLikeGatherTool = /gather/i.test(name) || /gathering/i.test(name) || !!item.toolType;
      const weaponTypes = ['bow','relic','relik','spear','dagger','sword','wand','axe','staff'];
      const isWeaponLike = (
        (cat.includes('weapon') || weaponTypes.some(t => sub === t || sub === t + 's' || sub === t + 'es')) &&
        !looksLikeGatherTool
      );
      if (!isWeaponLike) return '';
      const weaponDefaultSpeed = {
        'bow': 'very_slow',
        'bows': 'very_slow',
        'relic': 'very_slow',
        'relik': 'very_slow',
        'reliks': 'very_slow',
        'relics': 'very_slow',
        'spear': 'very_slow',
        'spears': 'very_slow',
        'dagger': 'very_fast',
        'daggers': 'very_fast',
        'sword': 'normal',
        'swords': 'normal',
        'wand': 'fast',
        'wands': 'fast',
        'axe': 'slow',
        'axes': 'slow',
        'staff': 'normal',
        'staffs': 'normal',
        'staves': 'normal'
      };
      if (sub && weaponDefaultSpeed[sub]) {
        try {
          console.info('Fallback attack speed assigned', {
            item: item.name || item.displayName || item.id,
            subcategory: sub,
            assigned: weaponDefaultSpeed[sub]
          });
        } catch (e) {}
        return weaponDefaultSpeed[sub];
      }
            // Try weaponType property if present
            if (weaponType && weaponDefaultSpeed[weaponType]) {
        try {
          console.info('Fallback attack speed assigned (weaponType)', {
            item: item.name || item.displayName || item.id,
            weaponType: weaponType,
            assigned: weaponDefaultSpeed[weaponType]
          });
        } catch (e) {}
        return weaponDefaultSpeed[weaponType];
      }
      try {
        console.info('No fallback attack speed assigned', {
          item: item.name || item.displayName || item.id,
          subcategory: sub,
          weaponType: weaponType
        });
      } catch (e) {}
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
    // If includeAny is true, preserve the first placeholder option (index 0)
    // otherwise clear all options so caller can insert grouped optgroups.
    if (includeAny) {
      while (dropdown.options.length > 1) dropdown.remove(1);
    } else {
      // preserve first existing placeholder option if present, otherwise create 'ANY'
      const first = (dropdown.options && dropdown.options[0]) ? dropdown.options[0].cloneNode(true) : null;
      while (dropdown.options.length > 0) dropdown.remove(0);
      if (first) dropdown.appendChild(first);
      else {
        const anyOpt = document.createElement('option');
        anyOpt.value = '';
        anyOpt.textContent = 'ANY';
        dropdown.appendChild(anyOpt);
      }
    }
    if (!includeAny) return;
    for (const it of items) {
      const o = document.createElement('option');
      o.value = it;
      o.textContent = it[0] ? it[0].toUpperCase() + it.slice(1) : it;
      dropdown.appendChild(o);
    }
  }

  if (categoryDropdown) {
    // Populate dropdown without top-level flat category entries; we'll add grouped optgroups below
    populateDropdown(categoryDropdown, categories, false);
    // Append category:subcategory entries as grouped optgroups
    for (const cat of Object.keys(subcategories).sort()) {
      const list = subcategories[cat] || [];
      if (!list.length) continue;
      const group = document.createElement('optgroup');
      group.label = cat;
      // Optional: provide an "All <Category>" entry to select whole category
      const allOpt = document.createElement('option');
      allOpt.value = cat;
      allOpt.textContent = `All ${cat}`;
      group.appendChild(allOpt);
      for (const sub of list) {
        const o = document.createElement('option');
        o.value = `${cat}|${sub}`;
        o.textContent = sub;
        group.appendChild(o);
      }
      categoryDropdown.appendChild(group);
    }
    // Do not auto-run search on dropdown change; searches should run only when user presses SEARCH
  }

  if (rarityDropdown) {
    populateDropdown(rarityDropdown, rarities);
    // (no auto-run) rarity change will not trigger search
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

  // Human-friendly label (e.g., "very_slow" -> "Very Slow")
  function prettyLabel(s) {
    if (!s) return '';
    // Normalize concatenated tokens like 'Veryslow' or 'veryslow' into 'Very Slow'
    let str = s.toString();
    str = str.replace(/(super|very)(slow|fast)/ig, '$1 $2');
    return str.toString().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/(^|\s)\S/g, c => c.toUpperCase());
  }

  // Identification helpers
  function isSpellCostKey(k) {
    if (!k) return false;
    return /spellcost|1stSpellCost|2ndSpellCost|3rdSpellCost|4thSpellCost/i.test(k);
  }

  function identNumericValue(k, v) {
    if (v == null) return null;
    if (typeof v === 'number') return v;
    if (typeof v === 'object') {
      if (typeof v.raw === 'number') return v.raw;
      if (typeof v.min === 'number' && typeof v.max !== 'number') return v.min;
      if (typeof v.min === 'number') return v.min;
    }
    const n = Number(String(v).replace(/[^0-9.-]/g, ''));
    return isNaN(n) ? null : n;
  }

  function identColorForKeyValue(k, v) {
    const key = (k || '').toString().toLowerCase();
    // debug logs removed for production

    // Do not color level or class requirement values
    if (/^level$/.test(key) || /^class$/.test(key) || /classrequirement/.test(key)) {
      // skipping color for level/class
      return '';
    }

    // numeric value helper
    const n = identNumericValue(k, v);
    let col = '';

    // Primary attributes: color by sign (positive green, negative strong red)
    if (/^(strength|rawstrength|str)$/.test(key) || /\bstrength\b/.test(key)) {
      if (n != null) col = (n > 0) ? '#33cc66' : (n < 0 ? '#cc0000' : '');
      // strength color determined
      return col;
    }
    if (/^(dexterity|rawdexterity|dex)$/.test(key) || /\bdexter|dexterity\b/.test(key)) {
      if (n != null) col = (n > 0) ? '#ffd454' : (n < 0 ? '#cc0000' : '');
      // dexterity color determined
      return col;
    }
    if (/^(intelligence|rawintelligence|int|rawint)$/.test(key) || /\bintelligence\b/.test(key)) {
      if (n != null) col = (n > 0) ? '#33cc66' : (n < 0 ? '#cc0000' : '');
      // intelligence color determined
      return col;
    }
    if (/^(defence|defense|def|rawdefence)$/.test(key) || /\bdefence\b/.test(key)) {
      if (n != null) col = (n > 0) ? '#ff4d4d' : (n < 0 ? '#cc0000' : '');
      // defence color determined
      return col;
    }
    if (/^(agility|rawagility|agi)$/.test(key) || /\bagil|agility\b/.test(key)) {
      if (n != null) col = (n > 0) ? '#ffffff' : (n < 0 ? '#cc0000' : '');
      // agility color determined
      return col;
    }

    // If this is a spell cost key, invert the sign coloring (negative -> green)
    if (isSpellCostKey(k)) {
      if (n != null) col = (n < 0) ? '#33cc66' : (n > 0 ? '#cc0000' : '');
      // spell cost color determined
      return col;
    }

    // Elemental / damage keys: explicit color mapping
    if (/earth|baseearth|earthdamage|earth_damage/i.test(key)) { col = '#33cc66'; return col; }
    if (/thunder|lightning|thunderdamage|thunder_damage/i.test(key)) { col = '#ffd454'; return col; }
    if (/water|basedwater|waterdamage|water_damage/i.test(key)) { col = '#4da6ff'; return col; }
    if (/fire|basefire|firedamage|fire_damage/i.test(key)) { col = '#ff4d4d'; return col; }
    if (/air|baseair|airdamage|air_damage/i.test(key)) { col = '#ffffff'; return col; }

    // Fallback: numeric sign coloring for other numeric idents
    if (n == null) { return ''; }
    col = (n > 0) ? '#33cc66' : (n < 0 ? '#cc0000' : '');
    return col;
  }

  // Rarity color mapping
  function getRarityColor(r) {
    const t = (r || '').toString().toLowerCase();
    const map = {
      'normal': '#ffffff',
      'unique': '#ffd700',
      'rare': '#9b59b6',
      'legendary': '#87cefa',
      'fabled': '#ff4500',
      'mythic': '#4b0082'
    };
    return map[t] || '';
  }

  // Choose readable text color (black/white) for a background hex color
  function readableTextColor(bg) {
    if (!bg) return '#000';
    // strip # if present
    const hex = bg.replace('#','');
    if (hex.length !== 6) return '#000';
    const r = parseInt(hex.substr(0,2),16);
    const g = parseInt(hex.substr(2,2),16);
    const b = parseInt(hex.substr(4,2),16);
    // luminance
    const lum = 0.2126*r + 0.7152*g + 0.0722*b;
    return lum > 150 ? '#000' : '#fff';
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

  // Populate category/rarity/subcategory lists from the loaded items so dropdowns have values
  async function populateCategoriesFromData() {
    const items = await ensureItemsLoaded();
    console.log('populateCategoriesFromData: loading items..');
    if (!items || !items.length) { console.log('populateCategoriesFromData: no items found'); return; }

    console.log('populateCategoriesFromData: items count=', items.length, 'sample=', items[0] && (items[0].name || items[0].internalName || items[0].id));

    const catSet = new Set();
    const rarSet = new Set();
    const subMap = {};

    function normalizeRarity(raw) {
      let r = raw;
      if (typeof r === 'object') r = '' + (r.name || '');
      r = ('' + (r || '')).toLowerCase();
      if (r === 'common' || r === 'white') return 'normal';
      if (r === 'epic') return 'legendary';
      if (r.includes('legend')) return 'legendary';
      if (r.includes('myth')) return 'mythic';
      if (r.includes('fabled')) return 'fabled';
      if (r.includes('set')) return 'set';
      if (r.includes('rare')) return 'rare';
      if (r.includes('unique')) return 'unique';
      if (r === '' || r === 'non-rarity' || r === 'unknown') return 'non-rarity';
      return 'special';
    }

    for (const it of items) {
      const c = (it.category || 'UNKNOWN');
      const s = (it.subcategory || inferSubcategory(it) || 'General');
      const rawR = (it.rarity || it.tier || '');
      const r = normalizeRarity(rawR);
      if (c && c !== 'UNKNOWN') catSet.add(c);
      if (r) rarSet.add(r);
      subMap[c] ??= new Set();
      if (s && s !== 'UNKNOWN') subMap[c].add(s);
      // map subcategory lookup for quick free-text mapping
      if (it.categories && Array.isArray(it.categories)) {
        for (const cc of it.categories) {
          try { subcatLookup[cc.toLowerCase()] = c; } catch (e) { }
        }
      }
    }

    // fill arrays/objects used elsewhere
    const catsArr = Array.from(catSet).sort();
    // sort rarities by preferred order rather than raw values
    const preferred = ['non-rarity','normal','unique','rare','set','legendary','fabled','mythic','special'];
    const rarArr = Array.from(rarSet);
    rarArr.sort((a,b) => {
      const ai = preferred.indexOf(a) === -1 ? preferred.length : preferred.indexOf(a);
      const bi = preferred.indexOf(b) === -1 ? preferred.length : preferred.indexOf(b);
      if (ai !== bi) return ai - bi;
      return a.localeCompare(b);
    });
    console.log('populateCategoriesFromData: discovered categories=', catsArr);
    console.log('populateCategoriesFromData: discovered rarities(normalized)=', rarArr.slice(0,50));

    categories.splice(0, categories.length, ...catsArr);
    rarities.splice(0, rarities.length, ...rarArr);
    for (const [k, setv] of Object.entries(subMap)) {
      subcategories[k] = Array.from(setv).sort();
    }

    // re-populate dropdowns now that we have data
    if (categoryDropdown) {
      // Populate dropdown without top-level flat category entries; we'll add grouped optgroups below
      populateDropdown(categoryDropdown, categories, false);
      // append fresh category:subcategory options as grouped optgroups
      for (const cat of Object.keys(subcategories).sort()) {
        const list = subcategories[cat] || [];
        if (!list.length) continue;
        const group = document.createElement('optgroup');
        group.label = cat;
        const allOpt = document.createElement('option');
        allOpt.value = cat;
        allOpt.textContent = `All ${cat}`;
        group.appendChild(allOpt);
        for (const sub of list) {
          const o = document.createElement('option');
          o.value = `${cat}|${sub}`;
          o.textContent = sub;
          group.appendChild(o);
        }
        categoryDropdown.appendChild(group);
      }
      console.log('populateCategoriesFromData: populated categoryDropdown, options=', categoryDropdown.options.length);
    }
    if (rarityDropdown) {
      populateDropdown(rarityDropdown, rarities);
      console.log('populateCategoriesFromData: populated rarityDropdown, options=', rarityDropdown.options.length);
    }
  }

  // run population in background; dropdowns will update when items are available
  populateCategoriesFromData().catch(err => console.warn('populateCategoriesFromData failed', err));

  async function runSearch() {
    if (!resultsContainer) return;
    resultsContainer.innerHTML = 'Searching...';
    // reset per-search log counter to avoid excessive logging
    attackSpeedLogCount = 0;

    const items = await ensureItemsLoaded();
    if (!items.length) {
      resultsContainer.textContent = 'No items loaded.';
      return;
    }

    try {
      // Parse input
      let rawInput = (searchInput && searchInput.value || '').trim();
      const originalRawInput = rawInput; // keep original for fallback heuristics
      rawInput = rawInput.replace(/\+/g, ',');

      let inlineCategory = null;
      let inlineSubcategory = null;
      const inlineStats = [];

      // Allow users to prefix with "all" (e.g. "all weapons") when specifying category
      const leadCat = rawInput.match(/^\s*(?:all\s+)?(weapon|weapons|armour|armor|accessory|accessories)\b[:\s-]*(.*)$/i);
      // Fallback: if parsing didn't set inlineCategory later, treat any mention of 'weapon' in the input as Weapons
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

      // Fallback: if still no inlineCategory, but the original input mentioned "weapon(s)",
      // assume the user meant the Weapons category (helps when they typed "all weapons").
      if (!inlineCategory) {
        try {
          if (/\bweapons?\b/i.test(originalRawInput) || /\bweapons?\b/i.test(freeText || '')) {
            inlineCategory = 'Weapons';
          }
        } catch (e) { /* ignore */ }
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

      // Throttled debug: show selected category/rarity/filters once per search to aid debugging
      try {
        if (attackSpeedLogCount < 1) {
          console.info('Search debug', { categorySelected: catVal, raritySelected: rarityVal, filters });
          attackSpeedLogCount = 1; // mark we've logged this search
        }
      } catch (e) { }

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
          // compare normalized rarities (dropdown values are normalized)
          const itemR = (item.rarity || item.tier || '');
          const itemRNorm = (typeof itemR === 'string' || typeof itemR === 'number') ? (function(raw){
            let rr = raw;
            if (typeof rr === 'object') rr = '' + (rr.name || '');
            rr = ('' + (rr || '')).toLowerCase();
            if (rr === 'common' || rr === 'white') return 'normal';
            if (rr === 'epic') return 'legendary';
            if (rr.includes('legend')) return 'legendary';
            if (rr.includes('myth')) return 'mythic';
            if (rr.includes('fabled')) return 'fabled';
            if (rr.includes('set')) return 'set';
            if (rr.includes('rare')) return 'rare';
            if (rr.includes('unique')) return 'unique';
            if (rr === '' || rr === 'non-rarity' || rr === 'unknown') return 'non-rarity';
            return 'special';
          })(itemR) : '';
          if (itemRNorm !== rarityVal) return false;
        }

        for (const f of filters) {
          if (f.cat === 'attackSpeed') {
            // Treat empty filter values as ANY (no filter)
            if (!f.value) continue;
            // Only apply attack-speed filtering to items in the Weapons category
            const itemCat = (item.category || item.type || '').toString().toLowerCase();
            if (!itemCat.includes('weapon')) {
              try {
                if (attackSpeedLogCount < ATTACK_SPEED_LOG_LIMIT) {
                  console.info('attackSpeed filter excluded non-weapon item', {
                    item: item.name || item.displayName || item.id,
                    itemCategory: item.category || '',
                    itemSubcategory: inferSubcategory(item) || '',
                    filterValue: f.value
                  });
                  attackSpeedLogCount++;
                  if (attackSpeedLogCount === ATTACK_SPEED_LOG_LIMIT) console.warn('attackSpeed log limit reached; further logs suppressed');
                }
              } catch (e) { }
              return false;
            }
            const cat = getAttackSpeedCategory(item);
            const norm = s => ('' + (s || '')).toLowerCase().replace(/[^a-z0-9]/g, '');
            const ncat = norm(cat);
            const nval = norm(f.value);
            // Match only exact speed ranks (require exact match)
            const speedRank = {
              'superslow': 0,
              'veryslow': 1,
              'slow': 2,
              'normal': 3,
              'fast': 4,
              'veryfast': 5,
              'superfast': 6
            };
            const rcat = (ncat in speedRank) ? speedRank[ncat] : null;
            const rval = (nval in speedRank) ? speedRank[nval] : null;
            let matched = false;
            if (ncat && nval && rcat !== null && rval !== null) {
              // require exact rank match
              matched = (rcat === rval);
            } else {
              matched = (ncat === nval);
            }
            if (!cat || !matched) {
              try {
                // Throttle logs to avoid crashing the browser
                if (attackSpeedLogCount < ATTACK_SPEED_LOG_LIMIT) {
                  if (!cat) {
                    console.info('attackSpeed filter skipped item (no attack speed)', {
                      item: item.name || item.displayName || item.id,
                      itemCategory: item.category || '',
                      itemSubcategory: inferSubcategory(item) || '',
                      filterValue: f.value
                    });
                  } else {
                    console.warn('attackSpeed filter mismatch', {
                      item: item.name || item.displayName || item.id,
                      itemCategory: item.category || '',
                      itemSubcategory: inferSubcategory(item) || '',
                      computedAttackSpeed: cat,
                      filterValue: f.value,
                      normComputed: ncat,
                      normFilter: nval
                    });
                  }
                  attackSpeedLogCount++;
                  if (attackSpeedLogCount === ATTACK_SPEED_LOG_LIMIT) {
                    console.warn('attackSpeed log limit reached; further logs suppressed');
                  }
                }
              } catch (e) { /* ignore logging failures */ }
              return false;
            }
            continue;
          }
          if (!itemHasStatFilter(item, f.stat, f.op, f.min, f.max)) return false;
        }
        return true;
      }

      const matchesList = items.filter(matches);
      try { console.info('Search result count after filtering:', matchesList.length); } catch (e) { }
      resultsContainer.innerHTML = '';

      if (matchesList.length === 0) {
        resultsContainer.textContent = 'No items found.';
        return;
      }

      // reset to first page for a new search
      currentPage = 1;

      function renderPage() {
        resultsContainer.innerHTML = '';
        const total = matchesList.length;
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        if (currentPage > totalPages) currentPage = totalPages;
        const start = (currentPage - 1) * pageSize;
        const end = Math.min(start + pageSize, total);

        // Controls: build a control block and render it above and below results
        function buildControls() {
          const ctrl = document.createElement('div');
          ctrl.className = 'search-controls';
          const summary = document.createElement('div');
          summary.className = 'search-summary';
          summary.textContent = `Showing ${start + 1}–${end} of ${total}`;
          ctrl.appendChild(summary);

          const sizeSelect = document.createElement('select');
          sizeSelect.className = 'search-page-size';
          for (const s of [20, 50, 100, 200]) {
            const o = document.createElement('option'); o.value = s; o.textContent = `${s} / page`;
            if (s === pageSize) o.selected = true;
            sizeSelect.appendChild(o);
          }
          sizeSelect.addEventListener('change', () => {
            pageSize = Number(sizeSelect.value) || 100;
            currentPage = 1;
            renderPage();
          });
          ctrl.appendChild(sizeSelect);

          const prev = document.createElement('button'); prev.textContent = 'Prev'; prev.disabled = currentPage <= 1;
          const next = document.createElement('button'); next.textContent = 'Next'; next.disabled = currentPage >= totalPages;
          const pageInfo = document.createElement('span'); pageInfo.className = 'page-info';
          pageInfo.textContent = ` Page ${currentPage} / ${totalPages} `;
          prev.addEventListener('click', () => { if (currentPage > 1) { currentPage--; renderPage(); } });
          next.addEventListener('click', () => { if (currentPage < totalPages) { currentPage++; renderPage(); } });
          ctrl.appendChild(prev); ctrl.appendChild(pageInfo); ctrl.appendChild(next);

          return ctrl;
        }

        // top controls
        const topCtrl = buildControls();
        resultsContainer.appendChild(topCtrl);

        // Render grid
        const grid = document.createElement('div');
        grid.className = 'search-grid';

        const pageItems = matchesList.slice(start, end);
        for (const it of pageItems) {
          const box = document.createElement('div');
          box.className = 'search-item';

          // Name
          const nameSection = document.createElement('div');
          nameSection.className = 'section-name';
          const title = document.createElement('h3');
          title.textContent = it.name || it.displayName || it.id || '[item]';
          nameSection.appendChild(title);
          box.appendChild(nameSection);

          // Damage section (only add if we have DPS / attack speed / elemental info)
          const dmgFrag = document.createDocumentFragment();
          const dpsVal = it.averageDps || it.baseDps || getStatValue(it, 'basedps');
          if (dpsVal !== undefined && dpsVal !== null && dpsVal !== '') {
            const dpsEl = document.createElement('div');
            dpsEl.className = 'field-dps';
            const dpsLabel = document.createElement('span');
            dpsLabel.className = 'field-label';
            dpsLabel.textContent = 'DPS:';
            const dpsValSpan = document.createElement('span');
            dpsValSpan.className = 'dps-val';
            dpsValSpan.textContent = ' ' + dpsVal;
            dpsEl.appendChild(dpsLabel);
            dpsEl.appendChild(dpsValSpan);
            dmgFrag.appendChild(dpsEl);
          }

          const asValRaw = it.attackSpeed || getStatValue(it, 'Attack Speed');
          const asVal = (asValRaw === undefined || asValRaw === null || asValRaw === '') ? null : asValRaw;
          if (asVal !== null) {
            const asEl = document.createElement('div');
            asEl.className = 'field-aspd';
            asEl.textContent = 'Attack Speed: ' + (typeof asVal === 'string' ? prettyLabel(asVal) : asVal);
            dmgFrag.appendChild(asEl);
            try {
              if (attackSpeedLogCount < ATTACK_SPEED_LOG_LIMIT) {
                console.info('computed attackSpeed for', it.name || it.id, '->', getAttackSpeedCategory(it));
                attackSpeedLogCount++;
                if (attackSpeedLogCount === ATTACK_SPEED_LOG_LIMIT) console.warn('attackSpeed log limit reached; further logs suppressed');
              }
            } catch (e) { }
          }

          // Elemental damages
          if (it.base) {
            const order = [['baseEarthDamage', 'Earth'], ['baseThunderDamage', 'Thunder'], ['baseWaterDamage', 'Water'], ['baseFireDamage', 'Fire'], ['baseAirDamage', 'Air']];
            for (const [k, label] of order) {
              if (it.base[k]) {
                const b = it.base[k];
                const val = (b.min !== undefined || b.max !== undefined) ? `${b.min || ''}–${b.max || ''}` : prettyIdentVal(k, b);
                const row = document.createElement('div');
                row.className = 'field-element';
                row.textContent = `${label} Damage: ${val}`;
                // elemental color overrides
                const col = identColorForKeyValue(k, b);
                if (col) row.style.color = col;
                dmgFrag.appendChild(row);
              }
            }
          } else if (it.identifications) {
            for (const [k, v] of Object.entries(it.identifications)) {
              if (/earth|thunder|water|fire|air/i.test(k)) {
                const row = document.createElement('div');
                row.className = 'field-element';
                row.textContent = `${prettyIdentKey(k)}: ${prettyIdentVal(k, v)}`;
                const col = identColorForKeyValue(k, v);
                if (col) row.style.color = col;
                dmgFrag.appendChild(row);
              }
            }
          }
          if (dmgFrag.childNodes && dmgFrag.childNodes.length) {
            const dmgSection = document.createElement('div');
            dmgSection.className = 'section-damage';
            dmgSection.appendChild(dmgFrag);
            box.appendChild(dmgSection);
          }

          // Requirements
          const reqEntries = [];
          let classReq = (it.requirements && (it.requirements.classRequirement || it.requirements['class'] || it.requirements.class)) || '';
          if (classReq) {
            classReq = String(classReq);
            classReq = classReq.charAt(0).toUpperCase() + classReq.slice(1);
            reqEntries.push({ label: 'Class', key: 'class', value: classReq });
          }
          const levelReq = (it.requirements && (it.requirements.level || it.requirements.levelRequirement)) || '';
          if (levelReq) reqEntries.push({ label: 'Level', key: 'level', value: levelReq });
          if (it.requirements) {
            for (const k of ['strength', 'dexterity', 'intelligence', 'defence', 'agility']) {
              if (it.requirements[k] !== undefined) {
                reqEntries.push({ label: k.charAt(0).toUpperCase() + k.slice(1), key: k, value: it.requirements[k] });
              }
            }
          }
          if (reqEntries.length) {
            const reqWrap = document.createElement('div');
            reqWrap.className = 'search-item-reqs section-reqs';
            const reqTitle = document.createElement('strong');
            reqTitle.textContent = 'Requirements:';
            reqWrap.appendChild(reqTitle);
            for (const e of reqEntries) {
              const rline = document.createElement('div');
              const label = document.createElement('span');
              label.textContent = e.label + ': ';
              const val = document.createElement('span');
              val.textContent = e.value;
              // Requirement values shown plain (no color)
              rline.appendChild(label);
              rline.appendChild(val);
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

            // Render simple non-range attribute idents above the rollable idents, without styling
            const attrKeys = ['rawStrength', 'rawDexterity', 'rawAgility', 'rawIntelligence', 'rawDefence', 'strength', 'dexterity', 'agility', 'intelligence', 'defence'];
            const prefer = ['rawStrength', 'rawDexterity', 'rawAgility', 'rawIntelligence', 'manaRegen', 'manaSteal', 'spellDamage', '1stSpellCost', '2ndSpellCost', '3rdSpellCost', '4thSpellCost'];
            const seen = new Set();

            const attrsDiv = document.createElement('div');
            for (const k of attrKeys) {
              const v = it.identifications[k];
              // only single-value (non-range) idents should be shown here
              if (v !== undefined && !(v && typeof v === 'object' && v.min !== undefined && v.max !== undefined)) {
                const line = document.createElement('div');
                const lab = document.createElement('span');
                lab.className = 'ident-label';
                lab.textContent = prettyIdentKey(k) + ':';
                const val = document.createElement('span');
                val.className = 'ident-value';
                val.textContent = ' ' + prettyIdentVal(k, v);
                // color based on key/value when applicable
                try {
                  const col = identColorForKeyValue(k, v);
                  if (col) val.style.color = col;
                } catch (e) { /* ignore color failures */ }
                line.appendChild(lab);
                line.appendChild(val);
                attrsDiv.appendChild(line);
                seen.add(k);
              }
            }
            // Only append attributes block if it contains something
            if (attrsDiv.children.length) idWrap.appendChild(attrsDiv);

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

              // Apply coloring to range numeric parts when applicable
              try {
                const col = identColorForKeyValue(key, v);
                if (col) {
                  left.style.color = col;
                  right.style.color = col;
                }
              } catch (e) { console.warn('Color apply failed for range ident', key, e); }

              li.appendChild(left);
              li.appendChild(mid);
              li.appendChild(right);
              ul.appendChild(li);
            }

            for (const k of prefer) {
              if (seen.has(k)) continue;
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
              const display = prettyIdentVal(k, v);
              val.textContent = display;
              // color based on key/value (skip spell cost)
              const col = identColorForKeyValue(k, v);
              if (col) val.style.color = col;
              li.appendChild(lab);
              li.appendChild(val);
              ul.appendChild(li);
            }
            idWrap.appendChild(ul);
            // Debug logging removed to avoid large console output
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
          const rarityText = it.rarity || it.tier || '';
          if (rarityText) {
            const color = getRarityColor(rarityText);
            const badge = document.createElement('span');
            badge.className = 'badge badge-rarity';
            badge.textContent = rarityText;
            if (color) {
              badge.style.color = color;
            }
            // give mythic a dedicated class so CSS can style it more visibly
            try {
              if ((rarityText || '').toString().toLowerCase() === 'mythic') {
                badge.classList.add('mythic');
              }
            } catch (e) { /* ignore */ }
            right.appendChild(badge);
          }
          footer.appendChild(right);
          box.appendChild(footer);

          grid.appendChild(box);
        }

        resultsContainer.appendChild(grid);
        // bottom controls for easier navigation after scrolling through items
        try {
          const bottomCtrl = buildControls();
          resultsContainer.appendChild(bottomCtrl);
        } catch (e) { /* buildControls may be out of scope in some edge cases */ }
      }

      // ** FIX: Actually render the first page **
      renderPage();

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
      const rarityText = item.rarity || item.tier;
      const r = document.createElement('span');
      r.className = 'badge badge-rarity';
      r.textContent = rarityText;
      const color = getRarityColor(rarityText);
      if (color) {
        r.style.color = color;
      }
      // give mythic a dedicated class for stronger styling
      try {
        if ((rarityText || '').toString().toLowerCase() === 'mythic') {
          r.classList.add('mythic');
        }
      } catch (e) { /* ignore */ }
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
      left.innerHTML = `<strong>Attack Speed:</strong> ${prettyLabel(item.attackSpeed)}`;
      const right = document.createElement('div');
      right.className = 'stat-right';
      as.appendChild(left);
      as.appendChild(right);
      statsDiv.appendChild(as);
    }

    if (item.base) {
      const order = [
        ['baseEarthDamage', 'Earth', '\u2692'],
        ['baseThunderDamage', 'Thunder', '\u26A1'],
        ['baseWaterDamage', 'Water', '\u2744'],
        ['baseFireDamage', 'Fire', '\u2737'],
        ['baseAirDamage', 'Air', '\u2733']
      ];
      for (const [k, label, iconSym] of order) {
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
          const col = identColorForKeyValue(k, b);
          if (col) line.style.color = col;
          statsDiv.appendChild(line);
        }
      }
    }

    if (item.requirements) {
      const req = document.createElement('div');
      req.className = 'item-reqs';
      if (item.requirements.classRequirement) {
        const c = document.createElement('div');
        const cr = String(item.requirements.classRequirement);
        const cap = cr.charAt(0).toUpperCase() + cr.slice(1);
        const lab = document.createElement('strong');
        lab.textContent = 'Class Req:';
        const val = document.createElement('span');
        val.textContent = ' ' + cap;
        c.appendChild(lab);
        c.appendChild(val);
        req.appendChild(c);
      }
      if (item.requirements.level) {
        const lvl = document.createElement('div');
        lvl.innerHTML = '<strong>Combat Level Min:</strong> ' + item.requirements.level;
        req.appendChild(lvl);
      }
      const mins = ['strength', 'dexterity', 'intelligence', 'defence', 'agility'];
      for (const m of mins) {
        if (item.requirements[m] !== undefined) {
          const el = document.createElement('div');
          const keyLab = document.createElement('span');
          keyLab.textContent = `${m.charAt(0).toUpperCase() + m.slice(1)} Min: `;
          const val = document.createElement('span');
          val.textContent = item.requirements[m];
          el.appendChild(keyLab);
          el.appendChild(val);
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

      const intel = pickIdent(['rawIntelligence', 'intelligence', 'rawInt']);
      if (intel) {
        // Force intelligence display to 50 and color green (use important to override CSS)
        const v = 50;
        const p = document.createElement('div');
        p.className = 'item-primary-attr';
        const left = document.createElement('span');
        left.className = 'primary-key';
        left.textContent = 'Intelligence:';
        const right = document.createElement('span');
        right.className = 'primary-val';
        right.textContent = v;
        try {
          right.style.setProperty('color', '#33cc66', 'important');
        } catch (e) {
          right.style.color = '#33cc66';
        }
        p.appendChild(left);
        p.appendChild(document.createTextNode(' '));
        p.appendChild(right);
        statsDiv.appendChild(p);
      }

      const quick = [
        { keyDisplay: 'Mana Regen', keys: ['manaRegen', 'ManaRegen'] },
        { keyDisplay: 'Mana Steal', keys: ['manaSteal', 'ManaSteal'] },
        { keyDisplay: '1st Spell Cost%', keys: ['1stSpellCost', '1st Spell Cost', '1stSpellCost%'] },
        { keyDisplay: '2nd Spell Cost%', keys: ['2ndSpellCost', '2nd Spell Cost', '2ndSpellCost%'] },
        { keyDisplay: '3rd Spell Cost%', keys: ['3rdSpellCost', '3rd Spell Cost', '3rdSpellCost%'] },
        { keyDisplay: '4th Spell Cost%', keys: ['4thSpellCost', '4th Spell Cost', '4thSpellCost%'] }
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
          const span = document.createElement('span');
          span.textContent = txt;
          const col = identColorForKeyValue(q.keys[0], v);
          if (col) span.style.color = col;
          right.appendChild(span);
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

    // Only append stats block if it contains content
    if (statsDiv.childNodes && statsDiv.childNodes.length) {
      wrap.appendChild(statsDiv);
    }

    // Identifications full list
    if (item.identifications) {
      const idWrap = document.createElement('div');
      idWrap.className = 'item-identifications';

      // primary attributes will be rendered unstyled below (after seen set is created)

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

      const prefer = ['manaRegen', 'manaSteal', 'spellDamage', '1stSpellCost', '2ndSpellCost', '3rdSpellCost', '4thSpellCost'];
      const seen = new Set();

      // If Intelligence exists as a single non-range ident, render it like the Requirements block
      (function renderIntelligenceAsReq() {
        const intelKeys = ['rawIntelligence', 'intelligence', 'rawInt'];
        for (const k of intelKeys) {
          const v = item.identifications[k];
          if (v === undefined) continue;
          // skip ranged idents
          if (v && typeof v === 'object' && v.min !== undefined && v.max !== undefined) continue;
          // Force displayed intelligence to 50 and color it green per user preference
          const displayVal = 50;
          const intelBlock = document.createElement('div');
          const keySpan = document.createElement('span');
          keySpan.textContent = 'Intelligence: ';
          const valSpan = document.createElement('span');
          valSpan.textContent = String(displayVal);
          // ensure the green is applied even if CSS tries to override
          try {
            valSpan.style.setProperty('color', '#33cc66', 'important');
          } catch (e) {
            valSpan.style.color = '#33cc66';
          }
          // removed debug log
          intelBlock.appendChild(keySpan);
          intelBlock.appendChild(valSpan);
          idWrap.appendChild(intelBlock);
          seen.add(k);
          break;
        }
      })();

      // Render other primary attributes (unstyled) above rollable idents
      const attrKeys = ['rawStrength', 'rawDexterity', 'rawAgility', 'rawIntelligence', 'rawDefence', 'strength', 'dexterity', 'agility', 'intelligence', 'defence'];
      for (const k of attrKeys) {
        if (seen.has(k)) continue;
        const v = item.identifications[k];
        if (v === undefined) continue;
        // skip ranges here
        if (v && typeof v === 'object' && v.min !== undefined && v.max !== undefined) continue;
        const line = document.createElement('div');
        const keySpan = document.createElement('span');
        keySpan.textContent = prettyIdentKey(k) + ': ';
        const valSpan = document.createElement('span');
        const display = fmtVal(k, v);
        valSpan.textContent = display;
        const col = identColorForKeyValue(k, v);
        if (col) valSpan.style.color = col;
        line.appendChild(keySpan);
        line.appendChild(valSpan);
        idWrap.appendChild(line);
        seen.add(k);
      }

      function appendSingleIdent(k) {
        const v = item.identifications[k];
        if (!v) return;
        seen.add(k);
        const line = document.createElement('div');
        line.className = 'ident-line ident-single-line';
        const valText = fmtVal(k, v);
        const label = document.createElement('span');
        label.className = 'ident-key';
        label.textContent = prettyIdentKey(k) + ': ';
        const valSpan = document.createElement('span');
        valSpan.className = 'ident-val';
        valSpan.textContent = valText;
        const col = identColorForKeyValue(k, v);
        if (col) valSpan.style.color = col;
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
        // Apply coloring to the numeric sides of the range
        try {
          const col = identColorForKeyValue(k, v);
          if (col) {
            left.style.color = col;
            right.style.color = col;
          }
        } catch (e) { console.warn('Color apply failed for detail range ident', k, e); }

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
      const strong = document.createElement('strong');
      strong.textContent = 'Base DPS:';
      const val = document.createElement('span');
      val.className = 'dps-val';
      val.textContent = ' ' + (item.averageDps || item.baseDps);
      base.appendChild(strong);
      base.appendChild(val);
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
    btn.addEventListener('click', function(ev) {
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