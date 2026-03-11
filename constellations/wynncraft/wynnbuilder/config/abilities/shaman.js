/**
 * Shaman Spell & Ability Tree Definitions
 *
 * Source: Wynncraft v3 API – https://api.wynncraft.com/v3/ability/tree/shaman
 *
 * ─── Weapon ────────────────────────────────────────────────────────────────────
 * Shaman can only equip Reliks.
 *
 * ─── Three archetypes ──────────────────────────────────────────────────────────
 *   Summoner  – totems and summons            (API key: 'summoner',  color: #f0c435)
 *   Ritualist – masks and hymns               (API key: 'ritualist', color: #87dd47)
 *   Acolyte   – blood magic / self-sacrifice  (API key: 'bloodmagik',color: #ffa057)
 *
 * ─── Node cost tiers ───────────────────────────────────────────────────────────
 *   White  = 1 AP, basic upgrade
 *   Yellow = 1 AP, unique function
 *   Purple = 2 AP, optional archetype addition
 *   Blue   = 2 AP, major archetype identity
 *   Red    = 2 AP, integral archetype identity
 *
 * ─── Node constraints ──────────────────────────────────────────────────────────
 *   requires             – must own this node first (string id or null)
 *   requiresArchetypeMin – { archetype, amount } : need ≥ N nodes in that archetype
 *   locks                – array of node ids that cannot coexist with this node
 *
 * ─── DPS effect fields (only present on nodes that change spell numbers) ───────
 *   spell           – which base spell is affected
 *   type            – 'multiplier' | 'manaCost' | 'hits' | 'hitsPerSecond' | 'duration'
 *   multiplierBonus – additive bonus to spell.multiplierPerHit
 *   manaCostChange  – added to spell.manaCost (negative = cheaper)
 *   extraHits       – added to spell.hits
 *   hpsBonus        – added to spell.hitsPerSecond
 *   durationBonus   – added to spell.duration
 *
 * Nodes without DPS effect fields (complex passives: summons, masks, CC, buffs, etc.)
 * are carried as metadata only and are silently ignored by the DPS engine.
 */

// ─── Weapon ───────────────────────────────────────────────────────────────────

export const WEAPON_TYPE = 'relik'

// ─── Archetypes ───────────────────────────────────────────────────────────────

export const SHAMAN_ARCHETYPES = {
    summoner: {
        name:             'Summoner',
        color:            '#f0c435',
        shortDescription: 'Create and order minions',
        description:      'Summoners use totems and summons to overwhelm enemies. (Summons, Damage)',
    },
    ritualist: {
        name:             'Ritualist',
        color:            '#87dd47',
        shortDescription: 'Versatile masked dancer',
        description:      'Ritualists create miracles through hymns and dances, and can change state on the fly with masks. (Buffs, Versatility)',
    },
    acolyte: {
        name:             'Acolyte',
        internalKey:      'bloodmagik',   // API archetype key
        color:            '#ffa057',
        shortDescription: 'Sacrifice blood for power and heals',
        description:      'Acolytes use their own health to support others and deal damage. (Support, Damage)',
    },
}

// ─── Base Spells ──────────────────────────────────────────────────────────────
//
// Damage multipliers are fractions of mean weapon damage per hit.
// 0.12 = 12 % of weapon mean damage per hit/tick.
//
// Spell types:
//   channeled – hitsPerSecond + duration  (Totem – ticks while active)
//   instant   – hits                      (Aura, Uproot – burst on cast)
//   mobility  – hits: 0                   (Haul – no direct damage)

export const SHAMAN_SPELLS = {
    totem: {
        name:             'Totem',
        clickCombo:       'RIGHT-LEFT-RIGHT',
        manaCost:         30,
        hitsPerSecond:    2.5,   // ticks every 0.4 s
        duration:         30,    // base duration in seconds
        multiplierPerHit: 0.12,  // 12 % of weapon mean damage per tick (6 % Neutral + 6 % Air)
    },
    haul: {
        name:             'Haul',
        clickCombo:       'RIGHT-RIGHT-RIGHT',
        manaCost:         15,
        hits:             0,
        multiplierPerHit: 0,     // mobility spell – no direct damage
    },
    aura: {
        name:             'Aura',
        clickCombo:       'RIGHT-LEFT-LEFT',
        manaCost:         40,
        hits:             1,
        multiplierPerHit: 1.80,  // 180 % of weapon mean damage (150 % Neutral + 30 % Water)
    },
    uproot: {
        name:             'Uproot',
        clickCombo:       'RIGHT-RIGHT-LEFT',
        manaCost:         30,
        hits:             1,
        multiplierPerHit: 1.30,  // 130 % of weapon mean damage (80 % Neutral + 30 % Earth + 20 % Thunder)
    },
}

// ─── Ability Tree Nodes ───────────────────────────────────────────────────────
//
// All 77 nodes in the Shaman ability tree, organised by row (page 1–7).
// Row counts: 4 + 7 + 10 + 12 + 16 + 15 + 13 = 77 nodes.
// Maximum AP budget: 45 points.

export const SHAMAN_ABILITY_NODES = {

    // ══════════════════════════════════════════════════════════════════════════
    // ROW 1  –  4 nodes
    // ══════════════════════════════════════════════════════════════════════════

    totem: {
        name:                'Totem',
        cost:                1,
        row:                 1,
        archetype:           null,
        requires:            null,
        requiresArchetypeMin: null,
        locks:               null,
        description:         'Unlock the Totem spell. Summons a Totem that damages enemies around it every 0.4 s for 30 s.',
    },

    relikProficiency: {
        name:                'Relik Proficiency I',
        cost:                1,
        row:                 1,
        archetype:           null,
        requires:            null,
        requiresArchetypeMin: null,
        locks:               null,
        description:         'Doubles Main Attack beam speed; +5 % Main Attack damage.',
    },

    totemCost1: {
        name:                'Cheaper Totem',
        cost:                1,
        row:                 1,
        archetype:           null,
        requires:            'totem',
        requiresArchetypeMin: null,
        locks:               null,
        description:         'Reduce Totem mana cost by 10.',
        spell:               'totem',
        type:                'manaCost',
        manaCostChange:      -10,
    },

    totemicsmash: {
        name:                'Totemic Smash',
        cost:                1,
        row:                 1,
        archetype:           null,
        requires:            null,
        requiresArchetypeMin: null,
        locks:               null,
        description:         'Totem deals 150 % damage (120 % Neutral + 30 % Fire) in a 3.5-block circle where it lands.',
    },

    // ══════════════════════════════════════════════════════════════════════════
    // ROW 2  –  7 nodes
    // ══════════════════════════════════════════════════════════════════════════

    relikSpread: {
        name:                'Distant Grasp',
        cost:                1,
        row:                 2,
        archetype:           'summoner',
        requires:            null,
        requiresArchetypeMin: null,
        locks:               ['relikBeams'],
        description:         'Reduces Main Attack spread; increases beam speed by +33 %. Mutually exclusive with Hand of the Shaman.',
    },

    haul: {
        name:                'Haul',
        cost:                1,
        row:                 2,
        archetype:           null,
        requires:            null,
        requiresArchetypeMin: null,
        locks:               null,
        description:         'Unlock the Haul spell. Leap towards your Totem (mana cost 15).',
    },

    relikBeams: {
        name:                'Hand of the Shaman',
        cost:                1,
        row:                 2,
        archetype:           'acolyte',
        requires:            null,
        requiresArchetypeMin: null,
        locks:               ['relikSpread'],
        description:         'Main Attack fires +2 extra beams, increasing overall damage by ~65 %. Mutually exclusive with Distant Grasp.',
    },

    uproot: {
        name:                'Uproot',
        cost:                1,
        row:                 2,
        archetype:           null,
        requires:            null,
        requiresArchetypeMin: null,
        locks:               null,
        description:         'Unlock the Uproot spell. Fires a projectile that explodes and knocks enemies away (hold shift to pull).',
    },

    haulCost1: {
        name:                'Cheaper Haul',
        cost:                1,
        row:                 2,
        archetype:           null,
        requires:            'haul',
        requiresArchetypeMin: null,
        locks:               null,
        description:         'Reduce Haul mana cost by 5.',
        spell:               'haul',
        type:                'manaCost',
        manaCostChange:      -5,
    },

    aura: {
        name:                'Aura',
        cost:                1,
        row:                 2,
        archetype:           null,
        requires:            null,
        requiresArchetypeMin: null,
        locks:               null,
        description:         'Unlock the Aura spell. Radiates a 180 % damage wave from your Totem, pulling enemies in.',
    },

    totemShove: {
        name:                'Totem Shove',
        cost:                1,
        row:                 2,
        archetype:           null,
        requires:            null,
        requiresArchetypeMin: null,
        locks:               null,
        description:         'Casting Totem while looking at an existing Totem shoves it forward, dealing 120 % damage on impact.',
    },

    // ══════════════════════════════════════════════════════════════════════════
    // ROW 3  –  10 nodes
    // ══════════════════════════════════════════════════════════════════════════

    shamanEarthPath: {
        name:                'Earth Mastery',
        cost:                1,
        row:                 3,
        archetype:           'summoner',
        requires:            null,
        requiresArchetypeMin: null,
        locks:               null,
        description:         '+2–4 base Earth damage; +20 % Earth damage bonus.',
    },

    shamanAirPath: {
        name:                'Air Mastery',
        cost:                1,
        row:                 3,
        archetype:           'summoner',
        requires:            null,
        requiresArchetypeMin: null,
        locks:               null,
        description:         '+3–4 base Air damage; +15 % Air damage bonus.',
    },

    shamanThunderPath: {
        name:                'Thunder Mastery',
        cost:                1,
        row:                 3,
        archetype:           'acolyte',
        requires:            null,
        requiresArchetypeMin: null,
        locks:               null,
        description:         '+1–8 base Thunder damage; +10 % Thunder damage bonus.',
    },

    shamanFirePath: {
        name:                'Fire Mastery',
        cost:                1,
        row:                 3,
        archetype:           'acolyte',
        requires:            null,
        requiresArchetypeMin: null,
        locks:               null,
        description:         '+3–5 base Fire damage; +15 % Fire damage bonus.',
    },

    shamanWaterPath: {
        name:                'Water Mastery',
        cost:                1,
        row:                 3,
        archetype:           'ritualist',
        requires:            null,
        requiresArchetypeMin: null,
        locks:               null,
        description:         '+2–4 base Water damage; +15 % Water damage bonus.',
    },

    naturejolt: {
        name:                "Nature's Jolt",
        cost:                2,
        row:                 3,
        archetype:           null,
        requires:            'haul',
        requiresArchetypeMin: null,
        locks:               null,
        description:         'Landing after Haul deals 150 % damage (110 % Neutral + 40 % Earth) in a 4.5-block circle.',
    },

    overseer: {
        name:                'Overseer',
        cost:                2,
        row:                 3,
        archetype:           'summoner',
        requires:            'uproot',
        requiresArchetypeMin: null,
        locks:               null,
        description:         'Increases Uproot and Haunting Memory range by +6 blocks. Hitting the Totem with either resets its duration.',
    },

    danceOfTheRain: {
        name:                'Rain Dance',
        cost:                2,
        row:                 3,
        archetype:           'ritualist',
        requires:            null,
        requiresArchetypeMin: null,
        locks:               null,
        description:         'While mid-air, Totem leaves a streak of rain dealing 60 % damage per tick for 6 s (30 % Neutral + 30 % Water).',
    },

    shockingAura: {
        name:                'Shocking Aura',
        cost:                2,
        row:                 3,
        archetype:           'acolyte',
        requires:            'aura',
        requiresArchetypeMin: null,
        locks:               null,
        description:         'Aura travels much faster and deals +20 % Thunder damage.',
        spell:               'aura',
        type:                'multiplier',
        multiplierBonus:     0.20,
    },

    flamingTongue: {
        name:                'Flaming Tongue',
        cost:                2,
        row:                 3,
        archetype:           'acolyte',
        requires:            'uproot',
        requiresArchetypeMin: null,
        locks:               null,
        description:         'Uproot becomes Flaming Tongue: hits 3 times (no explosion/knockback). Damage shifts to Fire. Required for Lashing Lance / Eldritch Call.',
    },

    // ══════════════════════════════════════════════════════════════════════════
    // ROW 4  –  12 nodes
    // ══════════════════════════════════════════════════════════════════════════

    stagnation: {
        name:                'Stagnation',
        cost:                1,
        row:                 4,
        archetype:           null,
        requires:            'naturejolt',
        requiresArchetypeMin: null,
        locks:               null,
        description:         "Enemies hit by Nature's Jolt are slowed by 40 % for 3 s.",
    },

    puppetMaster: {
        name:                'Puppet Master',
        cost:                2,
        row:                 4,
        archetype:           'summoner',
        requires:            'totem',
        requiresArchetypeMin: { archetype: 'summoner', amount: 3 },
        locks:               null,
        description:         'Totem summons up to 3 Puppets every 3 s. Each Puppet throws knives every 0.5 s for 20 % damage.',
    },

    maskOfTheLunatic: {
        name:                'Mask of the Lunatic',
        cost:                2,
        row:                 4,
        archetype:           'ritualist',
        requires:            'uproot',
        requiresArchetypeMin: { archetype: 'ritualist', amount: 2 },
        locks:               null,
        description:         'Casting Uproot equips the Mask of the Lunatic. While worn: Aura costs 30 % less mana, +35 % damage bonus, −20 % resistance.',
    },

    bloodPool: {
        name:                'Sacrificial Shrine',
        cost:                2,
        row:                 4,
        archetype:           'acolyte',
        requires:            'totem',
        requiresArchetypeMin: { archetype: 'acolyte', amount: 3 },
        locks:               ['regeneration'],
        description:         'Totem siphons 2 % of your HP every 0.4 s into a Blood Pool. Aura spends 15 Blood Pool for +35 % damage and heals all allies. Mutually exclusive with Regeneration.',
    },

    auraCost1: {
        name:                'Cheaper Aura',
        cost:                1,
        row:                 4,
        archetype:           null,
        requires:            'aura',
        requiresArchetypeMin: null,
        locks:               null,
        description:         'Reduce Aura mana cost by 5.',
        spell:               'aura',
        type:                'manaCost',
        manaCostChange:      -5,
    },

    uprootCost1: {
        name:                'Cheaper Uproot',
        cost:                1,
        row:                 4,
        archetype:           null,
        requires:            'uproot',
        requiresArchetypeMin: null,
        locks:               null,
        description:         'Reduce Uproot mana cost by 5.',
        spell:               'uproot',
        type:                'manaCost',
        manaCostChange:      -5,
    },

    morePuppets: {
        name:                'More Puppets',
        cost:                1,
        row:                 4,
        archetype:           'summoner',
        requires:            'puppetMaster',
        requiresArchetypeMin: null,
        locks:               null,
        description:         'Increases your maximum Puppets by +1.',
    },

    hauntingMemory: {
        name:                'Haunting Memory',
        cost:                2,
        row:                 4,
        archetype:           'ritualist',
        requires:            null,
        requiresArchetypeMin: { archetype: 'ritualist', amount: 4 },
        locks:               null,
        description:         'Switching Masks throws your previous Mask as a projectile. If it attaches to an enemy it deals 240 % damage and debuffs them for 4 s.',
    },

    totemRange: {
        name:                'Totemic Reach',
        cost:                1,
        row:                 4,
        archetype:           null,
        requires:            'totem',
        requiresArchetypeMin: null,
        locks:               null,
        description:         'Increase Totem area of effect by +4 blocks.',
    },

    hymnOfHate: {
        name:                'Hymn of Hate',
        cost:                1,
        row:                 4,
        archetype:           'ritualist',
        requires:            'maskOfTheLunatic',
        requiresArchetypeMin: null,
        locks:               null,
        description:         'While wearing the Mask of the Lunatic, killing an enemy with Aura casts a mini-Aura at its location for −50 % damage.',
    },

    rebound: {
        name:                'Rebound',
        cost:                2,
        row:                 4,
        archetype:           null,
        requires:            'aura',
        requiresArchetypeMin: null,
        locks:               null,
        description:         'Aura bounces back from its max range, dealing its damage a second time. Sacrificial Shrine heals 35 % less.',
        spell:               'aura',
        type:                'hits',
        extraHits:           1,   // second pass = effectively 2 total hits
    },

    bloodConnection: {
        name:                'Blood Connection',
        cost:                1,
        row:                 4,
        archetype:           'acolyte',
        requires:            'haul',
        requiresArchetypeMin: null,
        locks:               null,
        description:         'If outside Totem range, Haul teleports you directly to the Totem instead of leaping.',
    },

    // ══════════════════════════════════════════════════════════════════════════
    // ROW 5  –  16 nodes
    // ══════════════════════════════════════════════════════════════════════════

    explodingPuppet: {
        name:                'Exploding Puppets',
        cost:                2,
        row:                 5,
        archetype:           'summoner',
        requires:            'puppetMaster',
        requiresArchetypeMin: null,
        locks:               null,
        description:         'With 3 s left, Puppets charge enemies and explode for 200 % damage (150 % Neutral + 50 % Fire) in a 3-block circle.',
    },

    maskOfTheFanatic: {
        name:                'Mask of the Fanatic',
        cost:                2,
        row:                 5,
        archetype:           'ritualist',
        requires:            null,
        requiresArchetypeMin: { archetype: 'ritualist', amount: 2 },
        locks:               null,
        description:         'Casting Uproot equips the Mask of the Fanatic. While worn: Totem costs 65 % less mana, +35 % resistance, −35 % walk speed.',
    },

    moreBloodPool: {
        name:                'Larger Blood Pool',
        cost:                1,
        row:                 5,
        archetype:           'acolyte',
        requires:            'bloodPool',
        requiresArchetypeMin: null,
        locks:               null,
        description:         'Increase maximum Blood Pool by +30 points.',
    },

    summonFocus: {
        name:                'Bullwhip',
        cost:                2,
        row:                 5,
        archetype:           'summoner',
        requires:            'uproot',
        requiresArchetypeMin: null,
        locks:               null,
        description:         'Uproot and Haunting Memory inflict Whipped on enemies. Summons deal +20 % damage to Whipped enemies for 10 s.',
    },

    totemicShatter: {
        name:                'Totemic Shatter',
        cost:                2,
        row:                 5,
        archetype:           'ritualist',
        requires:            'maskOfTheFanatic',
        requiresArchetypeMin: null,
        locks:               null,
        description:         'While wearing the Mask of the Fanatic, Totem shatters on landing and instantly deals 8 s of its effects. Regeneration heals 50 % less.',
    },

    maskRotation: {
        name:                'Masquerade',
        cost:                1,
        row:                 5,
        archetype:           'ritualist',
        requires:            null,
        requiresArchetypeMin: { archetype: 'ritualist', amount: 4 },
        locks:               null,
        description:         'Switching between Masks twice grants 30 mana.',
    },

    lashingLance: {
        name:                'Lashing Lance',
        cost:                2,
        row:                 5,
        archetype:           'acolyte',
        requires:            'flamingTongue',
        requiresArchetypeMin: { archetype: 'acolyte', amount: 4 },
        locks:               null,
        description:         'Flaming Tongue gains +1 hit and inflicts Bleeding for +1.5 s per hit (max 6 s). Bleeding ticks every 0.5 s; each tick in Totem range adds 0.8 Blood Pool.',
    },

    morePuppets2: {
        name:                'More Puppets II',
        cost:                1,
        row:                 5,
        archetype:           'summoner',
        requires:            'morePuppets',
        requiresArchetypeMin: null,
        locks:               null,
        description:         'Increases maximum Puppets by +2.',
    },

    chantOfTheLunatic: {
        name:                'Chant of the Lunatic',
        cost:                2,
        row:                 5,
        archetype:           'ritualist',
        requires:            'maskOfTheLunatic',
        requiresArchetypeMin: null,
        locks:               null,
        description:         "Switching to the Mask of the Lunatic reduces nearby enemies' resistance by −15 % for 3 s (8-block AoE, 8 s cooldown).",
    },

    vengefulspirit: {
        name:                'Vengeful Spirit',
        cost:                2,
        row:                 5,
        archetype:           'acolyte',
        requires:            null,
        requiresArchetypeMin: null,
        locks:               null,
        description:         'Totem grants all players within its range +20 % damage bonus.',
    },

    doubleTotem: {
        name:                'Double Totem',
        cost:                2,
        row:                 5,
        archetype:           'summoner',
        requires:            'aura',
        requiresArchetypeMin: { archetype: 'summoner', amount: 2 },
        locks:               null,
        description:         'Increase max Totems by +1. Totem and Aura deal 40 % less damage; Regeneration and Sacrificial Shrine heal 40 % less.',
    },

    totemCost2: {
        name:                'Cheaper Totem II',
        cost:                1,
        row:                 5,
        archetype:           null,
        requires:            'totem',
        requiresArchetypeMin: null,
        locks:               null,
        description:         'Reduce Totem mana cost by 5.',
        spell:               'totem',
        type:                'manaCost',
        manaCostChange:      -5,
    },

    auraPull: {
        name:                'Storm Dance',
        cost:                2,
        row:                 5,
        archetype:           'ritualist',
        requires:            'aura',
        requiresArchetypeMin: null,
        locks:               null,
        description:         'Enemies hit by Aura are pulled towards the Totem. Aura deals +30 % Air damage.',
        spell:               'aura',
        type:                'multiplier',
        multiplierBonus:     0.30,
    },

    haulCost2: {
        name:                'Cheaper Haul II',
        cost:                1,
        row:                 5,
        archetype:           null,
        requires:            'haul',
        requiresArchetypeMin: null,
        locks:               null,
        description:         'Reduce Haul mana cost by 5.',
        spell:               'haul',
        type:                'manaCost',
        manaCostChange:      -5,
    },

    regeneration: {
        name:                'Regeneration',
        cost:                2,
        row:                 5,
        archetype:           null,
        requires:            null,
        requiresArchetypeMin: null,
        locks:               ['bloodPool'],
        description:         'Totem heals all players in range for 1 % of max HP every 0.4 s. Mutually exclusive with Sacrificial Shrine.',
    },

    tether: {
        name:                'Twisted Tether',
        cost:                2,
        row:                 5,
        archetype:           'acolyte',
        requires:            'lashingLance',
        requiresArchetypeMin: { archetype: 'acolyte', amount: 7 },
        locks:               null,
        description:         'Bleeding enemies within 20 blocks take 65 % damage for every 2 % HP you lose. Max 10 activations at once.',
    },

    // ══════════════════════════════════════════════════════════════════════════
    // ROW 6  –  15 nodes
    // ══════════════════════════════════════════════════════════════════════════

    jungleSlayer: {
        name:                'Crimson Effigy',
        cost:                2,
        row:                 6,
        archetype:           'summoner',
        requires:            'overseer',
        requiresArchetypeMin: { archetype: 'summoner', amount: 6 },
        locks:               null,
        description:         'Each Totem summons an Effigy that attacks enemies every 0.5 s for 100 % damage (75 % Neutral + 25 % Fire). Damage multiplied by 0.8× per additional Effigy.',
    },

    maskOfTheCoward: {
        name:                'Mask of the Heretic',
        cost:                2,
        row:                 6,
        archetype:           'ritualist',
        requires:            null,
        requiresArchetypeMin: { archetype: 'ritualist', amount: 2 },
        locks:               null,
        description:         'Casting Uproot equips the Mask of the Heretic. While worn: Haul costs 50 % less mana, +80 % walk speed, −10 % damage bonus.',
    },

    eldritchCall: {
        name:                'Eldritch Call',
        cost:                2,
        row:                 6,
        archetype:           'acolyte',
        requires:            'lashingLance',
        requiresArchetypeMin: { archetype: 'acolyte', amount: 7 },
        locks:               null,
        description:         'Shift+Totem spends 30 Blood Pool per Totem to summon 4 tentacles for 10 s. Tentacles debuff bleeding enemies and strike for 840 % damage (Thunder + Fire) every 2 s.',
    },

    maddeningRoots: {
        name:                'Maddening Roots',
        cost:                2,
        row:                 6,
        archetype:           'summoner',
        requires:            'uproot',
        requiresArchetypeMin: null,
        locks:               null,
        description:         'Uproot slows enemies by 40 % for 3 s.',
    },

    seekingTotem: {
        name:                'Seeking Totem',
        cost:                1,
        row:                 6,
        archetype:           'ritualist',
        requires:            'maskOfTheCoward',
        requiresArchetypeMin: null,
        locks:               null,
        description:         'While wearing the Mask of the Heretic, your Totem moves toward you if you are outside its range.',
    },

    chantOfTheFanatic: {
        name:                'Chant of the Fanatic',
        cost:                2,
        row:                 6,
        archetype:           'ritualist',
        requires:            'maskOfTheFanatic',
        requiresArchetypeMin: null,
        locks:               null,
        description:         'Switching to the Mask of the Fanatic grants you and nearby allies +70 % resistance for 2 s (8 s cooldown).',
    },

    auraCost2: {
        name:                'Cheaper Aura II',
        cost:                1,
        row:                 6,
        archetype:           null,
        requires:            'aura',
        requiresArchetypeMin: null,
        locks:               null,
        description:         'Reduce Aura mana cost by 5.',
        spell:               'aura',
        type:                'manaCost',
        manaCostChange:      -5,
    },

    auraDamage1: {
        name:                'Imbued Totem',
        cost:                1,
        row:                 6,
        archetype:           null,
        requires:            'totem',
        requiresArchetypeMin: null,
        locks:               null,
        description:         'Increase Totem damage by +4 %.',
        spell:               'totem',
        type:                'multiplier',
        multiplierBonus:     0.04,
    },

    sharpHealing: {
        name:                'Fluid Healing',
        cost:                2,
        row:                 6,
        archetype:           null,
        requires:            'bloodPool',
        requiresArchetypeMin: null,
        locks:               null,
        description:         "Aura healing is increased by +0.3 % for every 1 % Water Damage Bonus from items (max +75 %).",
    },

    moreBloodPool2: {
        name:                'Bloodier',
        cost:                1,
        row:                 6,
        archetype:           'acolyte',
        requires:            'bloodPool',
        requiresArchetypeMin: null,
        locks:               null,
        description:         'Increase max Blood Pool by +30 points; increase max Bleeding duration by +1.5 s.',
    },

    commander: {
        name:                'Commander',
        cost:                2,
        row:                 6,
        archetype:           'summoner',
        requires:            'puppetMaster',
        requiresArchetypeMin: { archetype: 'summoner', amount: 4 },
        locks:               null,
        description:         'Shift+Aura rallies Puppets to your side at +25 % attack speed. Main Attack deals +3 % damage per rallied Puppet.',
    },

    helpingHand2: {
        name:                'Friendly Fire',
        cost:                1,
        row:                 6,
        archetype:           'summoner',
        requires:            'puppetMaster',
        requiresArchetypeMin: null,
        locks:               null,
        description:         'Hitting your Puppets with Main Attack costs them 2 s duration but grants +10 % damage bonus for 2 s.',
    },

    betterMasquerade: {
        name:                'Depersonalization',
        cost:                1,
        row:                 6,
        archetype:           'ritualist',
        requires:            'maskRotation',
        requiresArchetypeMin: { archetype: 'ritualist', amount: 7 },
        locks:               null,
        description:         'Masquerade triggers after 1 fewer Mask switch; reduces mana bonus by 10.',
    },

    deeperWounds: {
        name:                'Deeper Wounds',
        cost:                1,
        row:                 6,
        archetype:           'acolyte',
        requires:            'lashingLance',
        requiresArchetypeMin: null,
        locks:               null,
        description:         'Increase Bleeding damage by +20 %.',
    },

    strongerTether: {
        name:                'Bloodletting',
        cost:                1,
        row:                 6,
        archetype:           null,
        requires:            'tether',
        requiresArchetypeMin: null,
        locks:               null,
        description:         'Increase Twisted Tether damage by +25 %.',
    },

    // ══════════════════════════════════════════════════════════════════════════
    // ROW 7  –  13 nodes
    // ══════════════════════════════════════════════════════════════════════════

    hummingbirds: {
        name:                "Hummingbird's Song",
        cost:                2,
        row:                 7,
        archetype:           'summoner',
        requires:            'haul',
        requiresArchetypeMin: { archetype: 'summoner', amount: 10 },
        locks:               null,
        description:         'Summon 2 Hummingbird Carvings that passively grant +40 % walk speed. Shift+Haul sends them to attack enemies every 0.25 s for 10 s.',
    },

    chantOfTheCoward: {
        name:                'Chant of the Heretic',
        cost:                2,
        row:                 7,
        archetype:           'ritualist',
        requires:            'maskOfTheCoward',
        requiresArchetypeMin: null,
        locks:               null,
        description:         'Switching to the Mask of the Heretic grants +60 % walk speed to you and nearby allies (decays 15 %/s; 8 s cooldown).',
    },

    tankBloodPool: {
        name:                'Blood Rite',
        cost:                2,
        row:                 7,
        archetype:           'acolyte',
        requires:            'bloodPool',
        requiresArchetypeMin: { archetype: 'acolyte', amount: 9 },
        locks:               null,
        description:         'When any player in Totem range takes damage, 35 % of it (proportional to your max HP) is added to your Blood Pool. Max 10 points per hit.',
    },

    tripleTotem: {
        name:                'Triple Totem',
        cost:                2,
        row:                 7,
        archetype:           'summoner',
        requires:            'doubleTotem',
        requiresArchetypeMin: { archetype: 'summoner', amount: 8 },
        locks:               null,
        description:         'Increase max Totems by +1 (total 3). Totem and Aura deal 50 % less damage; Regeneration and Sacrificial Shrine heal 50 % less.',
    },

    invigoratingWave: {
        name:                'Invigorating Wave',
        cost:                2,
        row:                 7,
        archetype:           'summoner',
        requires:            'aura',
        requiresArchetypeMin: { archetype: 'summoner', amount: 3 },
        locks:               null,
        description:         'Aura temporarily grants Summons +30 % attack speed for 2.5 s. Players hit by Aura each gain +2 mana.',
    },

    hymnOfFreedom: {
        name:                'Frog Dance',
        cost:                2,
        row:                 7,
        archetype:           'ritualist',
        requires:            'maskOfTheCoward',
        requiresArchetypeMin: null,
        locks:               null,
        description:         'While wearing the Mask of the Heretic, Haul bounces you 3 times and deals 200 % damage per bounce. Does not require a Totem.',
    },

    sanguineStrike: {
        name:                'Sanguine Strike',
        cost:                1,
        row:                 7,
        archetype:           null,
        requires:            null,
        requiresArchetypeMin: null,
        locks:               null,
        description:         'Greatly reduces Main Attack spread. Each beam inflicts Bleeding for +0.25 s. Bleeding ticks add 0.8 Blood Pool per hit in Totem range.',
    },

    moreBloodPool3: {
        name:                'Bloodier II',
        cost:                1,
        row:                 7,
        archetype:           'acolyte',
        requires:            'bloodPool',
        requiresArchetypeMin: null,
        locks:               null,
        description:         'Increase max Blood Pool by +30 points; increase max Bleeding duration by +1.5 s.',
    },

    hummingbirds2: {
        name:                'Soaring Wingbeats',
        cost:                1,
        row:                 7,
        archetype:           'summoner',
        requires:            'hummingbirds',
        requiresArchetypeMin: null,
        locks:               null,
        description:         "Improves Hummingbirds' passive effects: +20 % walk speed and +2 jump height.",
    },

    bloodLament: {
        name:                'Blood Sorrow',
        cost:                2,
        row:                 7,
        archetype:           'acolyte',
        requires:            'uproot',
        requiresArchetypeMin: { archetype: 'acolyte', amount: 12 },
        locks:               null,
        description:         'Shift+Uproot spends 70 Blood Pool to fire a beam that chains through entities every 0.2 s for 5 s, dealing 120 % damage. Allies hit gain +2 % Overhealth per hit.',
    },

    shepherd: {
        name:                'Shepherd',
        cost:                2,
        row:                 7,
        archetype:           'summoner',
        requires:            'puppetMaster',
        requiresArchetypeMin: null,
        locks:               null,
        description:         'When you or your Summons kill an enemy, gain +1 max Puppets for 15 s (max +8).',
    },

    uprootCost2: {
        name:                'Cheaper Uproot II',
        cost:                1,
        row:                 7,
        archetype:           null,
        requires:            'uproot',
        requiresArchetypeMin: null,
        locks:               null,
        description:         'Reduce Uproot mana cost by 5.',
        spell:               'uproot',
        type:                'manaCost',
        manaCostChange:      -5,
    },

    maskOfTheAwakened: {
        name:                'Awakened',
        cost:                2,
        row:                 7,
        archetype:           null,
        requires:            'uproot',
        requiresArchetypeMin: { archetype: 'ritualist', amount: 11 },
        locks:               null,
        description:         'After saving 150 mana from Mask reductions, switching Masks makes you Awakened for 25 s — gaining all Mask bonuses with no downsides.',
    },
}
