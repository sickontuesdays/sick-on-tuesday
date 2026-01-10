/**
 * Build Engine - Dynamic build generation using manifest and API data
 * Pulls subclass, activity, and item data directly from the Destiny 2 API/manifest
 * instead of static databases to ensure up-to-date information
 */

import { manifestLoader, BUCKET_HASHES, DAMAGE_TYPES } from '../api/manifest-loader.js';
import { apiClient } from '../api/bungie-api-client.js';

// Stat hash constants
const STAT_HASHES = {
  MOBILITY: 2996146975,
  RESILIENCE: 392767087,
  RECOVERY: 1943323491,
  DISCIPLINE: 1735777505,
  INTELLECT: 144602215,
  STRENGTH: 4244567218
};

// Stat names for display
const STAT_NAMES = {
  [STAT_HASHES.MOBILITY]: 'mobility',
  [STAT_HASHES.RESILIENCE]: 'resilience',
  [STAT_HASHES.RECOVERY]: 'recovery',
  [STAT_HASHES.DISCIPLINE]: 'discipline',
  [STAT_HASHES.INTELLECT]: 'intellect',
  [STAT_HASHES.STRENGTH]: 'strength'
};

// Damage type to element name mapping
const DAMAGE_TYPE_ELEMENTS = {
  1: 'kinetic',
  2: 'arc',
  3: 'solar',
  4: 'void',
  6: 'stasis',
  7: 'strand'
};

// Element keywords for natural language detection
const ELEMENT_KEYWORDS = {
  solar: ['solar', 'sun', 'fire', 'burn', 'radiant', 'scorch', 'ignition', 'sunspot', 'daybreak', 'hammers', 'golden gun', 'well of radiance'],
  arc: ['arc', 'lightning', 'electric', 'thunder', 'amplified', 'blind', 'jolt', 'ionic', 'thundercrash', 'stormtrance', 'gathering storm'],
  void: ['void', 'purple', 'volatile', 'suppress', 'weaken', 'devour', 'invisibility', 'invis', 'tether', 'nova', 'bubble', 'sentinel'],
  stasis: ['stasis', 'ice', 'freeze', 'crystal', 'shatter', 'slow', 'cold', 'glacier', 'behemoth', 'shadebinder', 'revenant'],
  strand: ['strand', 'green', 'suspend', 'sever', 'tangle', 'unravel', 'woven', 'threadling', 'grapple', 'broodweaver', 'berserker', 'threadrunner'],
  prismatic: ['prismatic', 'transcend', 'transcendence', 'light and dark', 'combo', 'mixed']
};

// Activity type keywords
const ACTIVITY_KEYWORDS = {
  raid: ['raid', 'salvation', 'salvations edge', 'witness', 'crota', 'root of nightmares', 'ron', 'vow', 'votd', 'kings fall', 'kf', 'vault', 'vog', 'dsc', 'deep stone', 'garden', 'gos', 'last wish', 'lw'],
  dungeon: ['dungeon', 'vesper', 'warlords ruin', 'ghosts of the deep', 'gotd', 'spire', 'sotw', 'duality', 'grasp', 'goa', 'prophecy', 'shattered', 'pit', 'poh'],
  gm: ['gm', 'grandmaster', 'nightfall', 'champion', 'master nightfall', 'conqueror'],
  pvp: ['pvp', 'crucible', 'trials', 'competitive', 'iron banner', 'control', 'clash', 'rumble', 'elimination', 'survival'],
  gambit: ['gambit', 'invade', 'motes', 'primeval', 'drifter']
};

// Stat priority templates for different activity types
const STAT_PRIORITIES = {
  raid: ['resilience', 'recovery', 'discipline'],
  dungeon: ['resilience', 'recovery', 'discipline'],
  gm: ['resilience', 'recovery', 'discipline'],
  pvp: ['recovery', 'resilience', 'mobility'],
  gambit: ['resilience', 'recovery', 'intellect'],
  general: ['resilience', 'discipline', 'recovery']
};

// Armor slots
const ARMOR_SLOTS = ['helmet', 'gauntlets', 'chest', 'legs', 'class'];

// Weapon slots
const WEAPON_SLOTS = ['kinetic', 'energy', 'power'];

export class BuildEngine {
  constructor() {
    this.inventory = null;
    this.currentClass = null;
    this.manifestLoader = manifestLoader;
    this.subclassCache = null;
    this.modsCache = null;
    this.initialized = false;
  }

  /**
   * Initialize the build engine by loading required manifest data
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Ensure manifest data is loaded
      await this.manifestLoader.loadAnalysisData();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize BuildEngine:', error);
      throw error;
    }
  }

  /**
   * Set the inventory data to work with
   */
  setInventory(inventory) {
    this.inventory = inventory;
    // Determine current class from first character
    const charId = Object.keys(inventory.characters || {})[0];
    if (charId) {
      this.currentClass = inventory.characters[charId].className?.toLowerCase();
    }
  }

  // ==================== MANIFEST DATA EXTRACTION ====================

  /**
   * Extract subclass data (aspects, fragments) from manifest dynamically
   * This ensures we always have current data even after game updates
   */
  async getSubclassData() {
    if (this.subclassCache) return this.subclassCache;

    await this.initialize();

    const items = this.manifestLoader.getInventoryItems();
    const subclasses = {};
    const aspects = [];
    const fragments = [];
    const supers = [];

    for (const [hash, item] of Object.entries(items)) {
      if (!item.displayProperties?.name) continue;

      const name = item.displayProperties.name;
      const plugCategoryId = item.plug?.plugCategoryIdentifier || '';
      const itemTypeDisplayName = item.itemTypeDisplayName || '';

      // Skip items without proper class type for class-specific items
      // classType: 0=Titan, 1=Hunter, 2=Warlock, 3=All classes
      const classType = item.classType;
      const hasValidClassType = classType !== undefined && classType !== null;

      // Detect subclasses (items in subclass bucket)
      if (item.inventory?.bucketTypeHash === BUCKET_HASHES.SUBCLASS) {
        const element = this.detectElementFromItem(item);
        if (element && hasValidClassType) {
          if (!subclasses[element]) subclasses[element] = {};
          subclasses[element][hash] = {
            hash: parseInt(hash),
            name,
            element,
            classType,
            description: item.displayProperties.description || '',
            icon: item.displayProperties.icon ? `https://www.bungie.net${item.displayProperties.icon}` : null
          };
        }
      }

      // Detect aspects (plug category contains 'aspects')
      if (plugCategoryId.includes('aspects') || itemTypeDisplayName.toLowerCase().includes('aspect')) {
        const element = this.detectElementFromPlugCategory(plugCategoryId) ||
                       this.detectElementFromDescription(item.displayProperties.description);

        // Only add aspects with valid class types (must be class-specific, not undefined)
        if (hasValidClassType && classType !== 3) {
          // Determine fragment slots from the aspect
          // Most aspects provide 2 fragment slots, some provide 1 or 3
          const fragmentSlots = this.getAspectFragmentSlots(name, plugCategoryId);

          aspects.push({
            hash: parseInt(hash),
            name,
            element,
            classType,
            description: item.displayProperties.description || '',
            icon: item.displayProperties.icon ? `https://www.bungie.net${item.displayProperties.icon}` : null,
            fragmentSlots
          });
        }
      }

      // Detect fragments (plug category contains 'fragments')
      // Fragments are NOT class-specific (all classes can use same fragments)
      if (plugCategoryId.includes('fragments') || itemTypeDisplayName.toLowerCase().includes('fragment')) {
        const element = this.detectElementFromPlugCategory(plugCategoryId) ||
                       this.detectElementFromDescription(item.displayProperties.description);

        if (element) {
          // Parse stat bonuses from description or investment stats
          const statBonuses = this.parseStatBonuses(item);

          fragments.push({
            hash: parseInt(hash),
            name,
            element,
            description: item.displayProperties.description || '',
            icon: item.displayProperties.icon ? `https://www.bungie.net${item.displayProperties.icon}` : null,
            statBonuses
          });
        }
      }

      // Detect supers - must have valid class type
      if ((plugCategoryId.includes('supers') || plugCategoryId.includes('super.')) && hasValidClassType && classType !== 3) {
        const element = this.detectElementFromPlugCategory(plugCategoryId);
        if (element) {
          supers.push({
            hash: parseInt(hash),
            name,
            element,
            classType,
            description: item.displayProperties.description || '',
            icon: item.displayProperties.icon ? `https://www.bungie.net${item.displayProperties.icon}` : null
          });
        }
      }
    }

    this.subclassCache = { subclasses, aspects, fragments, supers };
    return this.subclassCache;
  }

  /**
   * Get fragment slots for an aspect based on known values
   * Most aspects give 2 slots, but this varies
   */
  getAspectFragmentSlots(name, plugCategoryId) {
    // Default is 2 fragment slots
    // Some aspects give fewer or more - this would ideally come from manifest data
    // but the manifest structure for this isn't reliable, so we use defaults
    return 2;
  }

  /**
   * Detect element from item's damage type or traits
   */
  detectElementFromItem(item) {
    // Check default damage type
    if (item.defaultDamageType) {
      return DAMAGE_TYPE_ELEMENTS[item.defaultDamageType] || null;
    }

    // Check damage type hash
    if (item.defaultDamageTypeHash) {
      if (item.defaultDamageTypeHash === DAMAGE_TYPES.ARC) return 'arc';
      if (item.defaultDamageTypeHash === DAMAGE_TYPES.SOLAR) return 'solar';
      if (item.defaultDamageTypeHash === DAMAGE_TYPES.VOID) return 'void';
      if (item.defaultDamageTypeHash === DAMAGE_TYPES.STASIS) return 'stasis';
      if (item.defaultDamageTypeHash === DAMAGE_TYPES.STRAND) return 'strand';
    }

    // Try to detect from name/description
    return this.detectElementFromDescription(item.displayProperties?.description || item.displayProperties?.name);
  }

  /**
   * Detect element from plug category identifier
   */
  detectElementFromPlugCategory(plugCategoryId) {
    const id = plugCategoryId.toLowerCase();
    if (id.includes('solar') || id.includes('thermal')) return 'solar';
    if (id.includes('arc') || id.includes('electric')) return 'arc';
    if (id.includes('void') || id.includes('graviton')) return 'void';
    if (id.includes('stasis') || id.includes('cold')) return 'stasis';
    if (id.includes('strand') || id.includes('suspending')) return 'strand';
    if (id.includes('prismatic') || id.includes('transcendence')) return 'prismatic';
    return null;
  }

  /**
   * Detect element from description text
   */
  detectElementFromDescription(text) {
    if (!text) return null;
    const lower = text.toLowerCase();

    for (const [element, keywords] of Object.entries(ELEMENT_KEYWORDS)) {
      for (const keyword of keywords) {
        if (lower.includes(keyword)) return element;
      }
    }
    return null;
  }

  /**
   * Parse stat bonuses from item's investment stats
   */
  parseStatBonuses(item) {
    const bonuses = {};
    const investmentStats = item.investmentStats || [];

    for (const stat of investmentStats) {
      const statHash = stat.statTypeHash;
      const statName = STAT_NAMES[statHash];
      if (statName && stat.value !== 0) {
        bonuses[statName] = stat.value;
      }
    }

    // Also try parsing from description if no investment stats
    if (Object.keys(bonuses).length === 0 && item.displayProperties?.description) {
      const desc = item.displayProperties.description;
      const statPatterns = [
        { stat: 'mobility', pattern: /([+-]\d+)\s*mobility/i },
        { stat: 'resilience', pattern: /([+-]\d+)\s*resilience/i },
        { stat: 'recovery', pattern: /([+-]\d+)\s*recovery/i },
        { stat: 'discipline', pattern: /([+-]\d+)\s*discipline/i },
        { stat: 'intellect', pattern: /([+-]\d+)\s*intellect/i },
        { stat: 'strength', pattern: /([+-]\d+)\s*strength/i }
      ];

      for (const { stat, pattern } of statPatterns) {
        const match = desc.match(pattern);
        if (match) {
          bonuses[stat] = parseInt(match[1]);
        }
      }
    }

    return bonuses;
  }

  /**
   * Get all armor mods from manifest
   */
  async getArmorMods() {
    if (this.modsCache) return this.modsCache;

    await this.initialize();

    const items = this.manifestLoader.getInventoryItems();
    const mods = {
      general: [],
      helmet: [],
      arms: [],
      chest: [],
      legs: [],
      class: [],
      combat: [],
      stat: []
    };

    for (const [hash, item] of Object.entries(items)) {
      if (!item.displayProperties?.name) continue;

      const plugCategoryId = item.plug?.plugCategoryIdentifier || '';

      // Check if it's an armor mod
      if (!plugCategoryId.includes('enhancements') &&
          !plugCategoryId.includes('v400.plugs.armor') &&
          !plugCategoryId.includes('armor_skins_empty')) continue;

      const mod = {
        hash: parseInt(hash),
        name: item.displayProperties.name,
        description: item.displayProperties.description || '',
        icon: item.displayProperties.icon ? `https://www.bungie.net${item.displayProperties.icon}` : null,
        energyCost: item.plug?.energyCost?.energyCost || 0,
        energyType: item.plug?.energyCapacity?.energyType || 0,
        statBonuses: this.parseStatBonuses(item)
      };

      // Categorize by slot
      if (plugCategoryId.includes('helmet') || plugCategoryId.includes('head')) {
        mods.helmet.push(mod);
      } else if (plugCategoryId.includes('arms') || plugCategoryId.includes('gauntlets')) {
        mods.arms.push(mod);
      } else if (plugCategoryId.includes('chest')) {
        mods.chest.push(mod);
      } else if (plugCategoryId.includes('legs') || plugCategoryId.includes('leg_')) {
        mods.legs.push(mod);
      } else if (plugCategoryId.includes('class_item') || plugCategoryId.includes('bond') ||
                 plugCategoryId.includes('mark') || plugCategoryId.includes('cloak')) {
        mods.class.push(mod);
      } else if (plugCategoryId.includes('activity') || plugCategoryId.includes('combat')) {
        mods.combat.push(mod);
      } else if (Object.keys(mod.statBonuses).length > 0) {
        mods.stat.push(mod);
      } else {
        mods.general.push(mod);
      }
    }

    this.modsCache = mods;
    return this.modsCache;
  }

  // ==================== ACTIVITY DATA FROM API ====================

  /**
   * Get current activity information from API
   * Includes modifiers, champions, shields for weekly/daily rotations
   */
  async getCurrentActivities() {
    try {
      const milestones = await apiClient.getMilestones();
      const activities = [];

      if (milestones?.Response) {
        for (const [hash, milestone] of Object.entries(milestones.Response)) {
          if (milestone.activities) {
            for (const activity of milestone.activities) {
              const activityDef = await this.manifestLoader.getActivityDefinition(activity.activityHash);
              if (activityDef) {
                const modifiers = await this.parseActivityModifiers(activity.modifierHashes || []);
                activities.push({
                  hash: activity.activityHash,
                  name: activityDef.displayProperties?.name || 'Unknown Activity',
                  description: activityDef.displayProperties?.description || '',
                  modifiers: modifiers,
                  modifierHashes: activity.modifierHashes || [],
                  challenges: activity.challenges || []
                });
              }
            }
          }
        }
      }

      return activities;
    } catch (error) {
      console.warn('Failed to fetch current activities:', error);
      return [];
    }
  }

  /**
   * Parse activity modifiers to extract requirements
   */
  async parseActivityModifiers(modifierHashes) {
    const requirements = {
      champions: { barrier: false, overload: false, unstoppable: false },
      shields: [],
      surges: [],
      burns: [],
      other: []
    };

    if (!modifierHashes || modifierHashes.length === 0) return requirements;

    await this.initialize();
    const items = this.manifestLoader.getInventoryItems();

    for (const hash of modifierHashes) {
      const modifier = items[hash];
      if (!modifier) continue;

      const name = (modifier.displayProperties?.name || '').toLowerCase();
      const desc = (modifier.displayProperties?.description || '').toLowerCase();

      // Check for champions
      if (name.includes('barrier') || desc.includes('barrier champion')) {
        requirements.champions.barrier = true;
      }
      if (name.includes('overload') || desc.includes('overload champion')) {
        requirements.champions.overload = true;
      }
      if (name.includes('unstoppable') || desc.includes('unstoppable champion')) {
        requirements.champions.unstoppable = true;
      }

      // Check for shields (Match Game)
      if (name.includes('match game') || desc.includes('match game')) {
        requirements.shields = ['arc', 'solar', 'void'];
      }

      // Check for element surges
      if (name.includes('surge') || name.includes('singe')) {
        if (name.includes('arc') || desc.includes('arc')) requirements.surges.push('arc');
        if (name.includes('solar') || desc.includes('solar')) requirements.surges.push('solar');
        if (name.includes('void') || desc.includes('void')) requirements.surges.push('void');
        if (name.includes('stasis') || desc.includes('stasis')) requirements.surges.push('stasis');
        if (name.includes('strand') || desc.includes('strand')) requirements.surges.push('strand');
      }

      // Add to other modifiers list
      if (modifier.displayProperties?.name) {
        requirements.other.push({
          name: modifier.displayProperties.name,
          description: modifier.displayProperties.description || '',
          icon: modifier.displayProperties.icon ? `https://www.bungie.net${modifier.displayProperties.icon}` : null
        });
      }
    }

    return requirements;
  }

  // ==================== BUILD GENERATION ====================

  /**
   * Generate a complete build based on input
   */
  async generateBuild(input, activityId = null, targetClass = null) {
    await this.initialize();

    if (!this.inventory) {
      throw new Error('No inventory data available');
    }

    const buildClass = targetClass || this.currentClass || 'titan';
    const inputLower = input.toLowerCase();

    // Detect subclass element from input
    const element = this.detectElement(inputLower);

    // Get activity requirements
    const activity = this.getActivityRequirements(activityId, inputLower);

    // Get subclass configuration from manifest
    const subclassData = await this.getSubclassData();
    const subclassConfig = this.buildSubclassConfig(subclassData, element, buildClass, activity);

    // Collect all available items
    const availableItems = this.collectAllItems(buildClass);

    // Select weapons
    const weapons = this.selectWeapons(availableItems.weapons, activity, element);

    // Select exotic armor
    const exoticArmor = this.selectExoticArmor(availableItems.armor, subclassConfig, activity);

    // Select remaining armor with stat optimization
    const armorSet = this.selectArmorSet(availableItems.armor, exoticArmor, activity.statPriority);

    // Calculate total stats
    const totalStats = this.calculateTotalStats(armorSet);

    // Get mod recommendations
    const mods = await this.getArmorMods();
    const modsPerPiece = this.selectModsForArmor(armorSet, mods, activity, totalStats);

    // Get artifact recommendations
    const artifactMods = this.getArtifactRecommendations(activity, element);

    // Build the complete result
    return {
      name: this.generateBuildName(element, buildClass, activityId),
      class: this.capitalize(buildClass),
      classType: this.getClassType(buildClass),
      element: this.capitalize(element),

      // Subclass configuration
      subclass: subclassConfig,

      // Weapons
      weapons: {
        kinetic: weapons.kinetic,
        energy: weapons.energy,
        power: weapons.power
      },

      // Armor with mods
      armor: {
        helmet: { item: armorSet.helmet, mods: modsPerPiece.helmet },
        gauntlets: { item: armorSet.gauntlets, mods: modsPerPiece.gauntlets },
        chest: { item: armorSet.chest, mods: modsPerPiece.chest },
        legs: { item: armorSet.legs, mods: modsPerPiece.legs },
        class: { item: armorSet.class, mods: modsPerPiece.class }
      },

      // Total stats (including mods)
      stats: this.calculateFinalStats(armorSet, modsPerPiece),

      // Secondary bonuses (stats over 100)
      secondaryBonuses: this.calculateSecondaryBonuses(this.calculateFinalStats(armorSet, modsPerPiece)),

      // Artifact recommendations
      artifactMods: artifactMods,

      // Activity info
      activity: activity,

      // Build notes
      notes: this.generateBuildNotes(element, buildClass, activity, subclassConfig),

      // Can equip flag
      canEquip: true,

      // Metadata
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Build subclass config from manifest data
   */
  buildSubclassConfig(subclassData, element, buildClass, activity) {
    const classTypeNum = this.getClassType(buildClass);

    // Filter aspects for this element and class - STRICT class matching
    // Only include aspects where classType exactly matches the target class
    const elementAspects = subclassData.aspects.filter(a =>
      a.element === element && a.classType === classTypeNum
    );

    // Filter fragments for this element (fragments are NOT class-specific)
    const elementFragments = subclassData.fragments.filter(f => f.element === element);

    // Select best aspects based on activity (returns up to 2)
    const selectedAspects = this.selectAspects(elementAspects, activity);

    // Calculate total available fragment slots from selected aspects
    const totalFragmentSlots = selectedAspects.reduce((total, aspect) => {
      return total + (aspect.fragmentSlots || 2);
    }, 0);

    // Select best fragments based on activity and stat priorities
    // Limit to the number of available slots from aspects
    const selectedFragments = this.selectFragments(elementFragments, activity, activity.statPriority, totalFragmentSlots);

    // Find supers for this element and class - STRICT class matching
    // Supers MUST match the target class exactly, no fallbacks
    const elementSupers = subclassData.supers.filter(s =>
      s.element === element && s.classType === classTypeNum
    );

    return {
      element: element,
      super: elementSupers[0]?.name || 'Default Super',
      supers: elementSupers.map(s => s.name),
      aspects: selectedAspects.map(a => ({
        name: a.name,
        description: a.description,
        icon: a.icon,
        fragmentSlots: a.fragmentSlots || 2
      })),
      fragments: selectedFragments.map(f => ({
        name: f.name,
        description: f.description,
        icon: f.icon,
        statBonuses: f.statBonuses
      })),
      totalFragmentSlots: totalFragmentSlots,
      availableAspects: elementAspects.length,
      availableFragments: elementFragments.length
    };
  }

  /**
   * Detect subclass element from input
   */
  detectElement(input) {
    for (const [element, keywords] of Object.entries(ELEMENT_KEYWORDS)) {
      for (const keyword of keywords) {
        if (input.includes(keyword)) {
          return element;
        }
      }
    }
    return 'solar'; // Default
  }

  /**
   * Get activity requirements based on input
   */
  getActivityRequirements(activityId, input) {
    // Detect activity type from input
    let activityType = 'general';
    for (const [type, keywords] of Object.entries(ACTIVITY_KEYWORDS)) {
      for (const keyword of keywords) {
        if (input.includes(keyword)) {
          activityType = type;
          break;
        }
      }
      if (activityType !== 'general') break;
    }

    // Build requirements based on activity type
    const baseRequirements = {
      raid: {
        name: 'Raid',
        type: 'raid',
        shields: ['arc', 'solar', 'void'],
        champions: { barrier: false, overload: false, unstoppable: false },
        statPriority: STAT_PRIORITIES.raid,
        notes: 'Prioritize survivability and coordinated DPS'
      },
      dungeon: {
        name: 'Dungeon',
        type: 'dungeon',
        shields: ['arc', 'solar', 'void'],
        champions: { barrier: true, overload: false, unstoppable: true },
        statPriority: STAT_PRIORITIES.dungeon,
        notes: 'Balance survivability with solo capability'
      },
      gm: {
        name: 'Grandmaster Nightfall',
        type: 'gm',
        shields: ['arc', 'solar', 'void'],
        champions: { barrier: true, overload: true, unstoppable: true },
        statPriority: STAT_PRIORITIES.gm,
        notes: 'Champion mods required. Max survivability.',
        requiresChampionMods: true
      },
      pvp: {
        name: 'PvP / Crucible',
        type: 'pvp',
        shields: [],
        champions: { barrier: false, overload: false, unstoppable: false },
        statPriority: STAT_PRIORITIES.pvp,
        notes: 'Focus on neutral game and ability uptime'
      },
      gambit: {
        name: 'Gambit',
        type: 'gambit',
        shields: ['arc', 'solar', 'void'],
        champions: { barrier: false, overload: false, unstoppable: false },
        statPriority: STAT_PRIORITIES.gambit,
        notes: 'Balance add clear, boss DPS, and invasion'
      },
      general: {
        name: 'General PvE',
        type: 'pve',
        shields: ['arc', 'solar', 'void'],
        champions: { barrier: false, overload: false, unstoppable: false },
        statPriority: STAT_PRIORITIES.general,
        notes: 'Versatile build for general gameplay'
      }
    };

    return baseRequirements[activityType] || baseRequirements.general;
  }

  /**
   * Select aspects for activity
   */
  selectAspects(aspects, activity) {
    if (!aspects || aspects.length === 0) return [];

    // Score aspects based on fragment slots and activity type
    const scored = aspects.map(a => {
      let score = 0;
      // More fragment slots = better for PvE
      if (activity.type !== 'pvp') {
        score += (a.fragmentSlots || 2) * 15;
      }
      // Add some randomness to vary builds
      score += Math.random() * 10;
      return { ...a, score };
    });

    // Sort by score and take top 2
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 2);
  }

  /**
   * Select fragments for activity
   * @param {Array} fragments - Available fragments for this element
   * @param {Object} activity - Activity requirements
   * @param {Array} statPriority - Stat priority order
   * @param {number} maxSlots - Maximum number of fragments to select (from aspects)
   */
  selectFragments(fragments, activity, statPriority, maxSlots = 5) {
    if (!fragments || fragments.length === 0) return [];

    // Score fragments based on stat bonuses and activity type
    const scored = fragments.map(f => {
      let score = 0;
      if (f.statBonuses) {
        for (let i = 0; i < statPriority.length; i++) {
          const stat = statPriority[i];
          const bonus = f.statBonuses[stat] || 0;
          // Higher priority stats get higher weight
          const weight = (3 - i) * 5;
          score += bonus * weight;
        }
      }
      // Add base score so fragments without stat info still get selected
      score += 10;
      return { ...f, score };
    });

    // Sort by score and take up to maxSlots (limited by aspect fragment slots)
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, Math.max(0, maxSlots));
  }

  /**
   * Collect all available items for the class
   */
  collectAllItems(buildClass) {
    const items = {
      weapons: { kinetic: [], energy: [], power: [] },
      armor: { helmet: [], gauntlets: [], chest: [], legs: [], class: [] }
    };

    if (!this.inventory) {
      console.warn('BuildEngine: No inventory data available');
      return items;
    }

    const buildClassType = this.getClassType(buildClass);
    console.log(`BuildEngine: Collecting items for class ${buildClass} (type ${buildClassType})`);

    // Collect from all characters
    for (const [charId, charData] of Object.entries(this.inventory.characters || {})) {
      const charClassType = charData.classType;
      console.log(`BuildEngine: Processing character ${charId} (class type ${charClassType})`);

      // Collect EQUIPPED weapons from all characters (weapons are class-agnostic)
      const equippedData = this.inventory.equipped?.[charId];
      if (equippedData?.weapons) {
        if (equippedData.weapons.kinetic) {
          items.weapons.kinetic.push(equippedData.weapons.kinetic);
        }
        if (equippedData.weapons.energy) {
          items.weapons.energy.push(equippedData.weapons.energy);
        }
        if (equippedData.weapons.power) {
          items.weapons.power.push(equippedData.weapons.power);
        }
      }

      // Collect weapons from character INVENTORY (not equipped)
      if (charData.inventory?.weapons && Array.isArray(charData.inventory.weapons)) {
        for (const weapon of charData.inventory.weapons) {
          if (weapon.weaponSlot && items.weapons[weapon.weaponSlot]) {
            items.weapons[weapon.weaponSlot].push(weapon);
          }
        }
      }

      // Collect EQUIPPED armor (only from matching class)
      if (charClassType === buildClassType && equippedData?.armor) {
        if (equippedData.armor.helmet) items.armor.helmet.push(equippedData.armor.helmet);
        if (equippedData.armor.gauntlets) items.armor.gauntlets.push(equippedData.armor.gauntlets);
        if (equippedData.armor.chest) items.armor.chest.push(equippedData.armor.chest);
        if (equippedData.armor.legs) items.armor.legs.push(equippedData.armor.legs);
        if (equippedData.armor.class) items.armor.class.push(equippedData.armor.class);
      }

      // Collect armor from character INVENTORY (only matching class)
      if (charClassType === buildClassType && charData.inventory?.armor && Array.isArray(charData.inventory.armor)) {
        for (const armor of charData.inventory.armor) {
          if (armor.armorSlot && items.armor[armor.armorSlot]) {
            items.armor[armor.armorSlot].push(armor);
          }
        }
      }
    }

    // Collect from vault - use categorized data if available for better performance
    if (this.inventory.vault?.categories) {
      const vaultCats = this.inventory.vault.categories;

      // Vault weapons
      if (vaultCats.weapons) {
        for (const slot of ['kinetic', 'energy', 'power']) {
          if (vaultCats.weapons[slot] && Array.isArray(vaultCats.weapons[slot])) {
            items.weapons[slot].push(...vaultCats.weapons[slot]);
          }
        }
      }

      // Vault armor (filter by class)
      if (vaultCats.armor) {
        for (const slot of ['helmet', 'gauntlets', 'chest', 'legs', 'class']) {
          if (vaultCats.armor[slot] && Array.isArray(vaultCats.armor[slot])) {
            for (const armor of vaultCats.armor[slot]) {
              // classType: 0=Titan, 1=Hunter, 2=Warlock, 3=any
              if (armor.classType === buildClassType || armor.classType === 3) {
                items.armor[slot].push(armor);
              }
            }
          }
        }
      }
    } else if (this.inventory.vault?.items) {
      // Fallback to unorganized vault items
      for (const item of this.inventory.vault.items) {
        if (item.isWeapon && item.weaponSlot) {
          items.weapons[item.weaponSlot]?.push(item);
        } else if (item.isArmor && item.armorSlot) {
          if (item.classType === buildClassType || item.classType === 3) {
            items.armor[item.armorSlot]?.push(item);
          }
        }
      }
    }

    // Log collection summary
    const weaponCounts = Object.entries(items.weapons).map(([slot, arr]) => `${slot}:${arr.length}`).join(', ');
    const armorCounts = Object.entries(items.armor).map(([slot, arr]) => `${slot}:${arr.length}`).join(', ');
    console.log(`BuildEngine: Collected weapons [${weaponCounts}], armor [${armorCounts}]`);

    return items;
  }

  /**
   * Add weapons to collection
   */
  addWeaponsToCollection(collection, equippedWeapons) {
    if (equippedWeapons.kinetic) collection.kinetic.push(equippedWeapons.kinetic);
    if (equippedWeapons.energy) collection.energy.push(equippedWeapons.energy);
    if (equippedWeapons.power) collection.power.push(equippedWeapons.power);
  }

  /**
   * Add weapon to appropriate slot
   */
  addWeaponToSlot(collection, weapon) {
    const slot = weapon.weaponSlot;
    if (slot && collection[slot]) {
      collection[slot].push(weapon);
    }
  }

  /**
   * Add armor to collection
   */
  addArmorToCollection(collection, equippedArmor) {
    if (equippedArmor.helmet) collection.helmet.push(equippedArmor.helmet);
    if (equippedArmor.gauntlets) collection.gauntlets.push(equippedArmor.gauntlets);
    if (equippedArmor.chest) collection.chest.push(equippedArmor.chest);
    if (equippedArmor.legs) collection.legs.push(equippedArmor.legs);
    if (equippedArmor.class) collection.class.push(equippedArmor.class);
  }

  /**
   * Add armor to appropriate slot
   */
  addArmorToSlot(collection, armor) {
    const slot = armor.armorSlot;
    if (slot && collection[slot]) {
      collection[slot].push(armor);
    }
  }

  /**
   * Select weapons for the build
   */
  selectWeapons(weaponCollection, activity, element) {
    const result = {
      kinetic: null,
      energy: null,
      power: null
    };

    // Score and select best weapon for each slot
    for (const slot of WEAPON_SLOTS) {
      const weapons = weaponCollection[slot] || [];
      if (weapons.length === 0) continue;

      let bestWeapon = null;
      let bestScore = -1;

      for (const weapon of weapons) {
        const score = this.scoreWeapon(weapon, activity, element, slot);
        if (score > bestScore) {
          bestScore = score;
          bestWeapon = weapon;
        }
      }

      result[slot] = bestWeapon;
    }

    return result;
  }

  /**
   * Score a weapon based on requirements
   */
  scoreWeapon(weapon, activity, element, slot) {
    let score = 0;

    // Base power level score
    const power = weapon.primaryStat?.value || 0;
    score += power / 100;

    // Element match for shields
    const weaponElement = this.getWeaponElement(weapon);
    if (activity.shields?.includes(weaponElement)) {
      score += 30;
    }

    // Surge bonus
    if (activity.surges?.includes(weaponElement)) {
      score += 25;
    }

    // Element synergy with subclass (Font of Might, etc.)
    if (weaponElement === element) {
      score += 20;
    }

    // Exotic bonus
    if (weapon.isExotic) {
      score += 15;
    }

    // Tier bonus
    if (weapon.tierType === 5) score += 10; // Legendary
    if (weapon.tierType === 6) score += 15; // Exotic

    // Activity-specific weapon type bonuses
    const weaponType = weapon.itemSubType;
    if (activity.type === 'raid' || activity.type === 'dungeon') {
      // DPS weapons
      if ([10, 22, 9].includes(weaponType)) score += 15; // Rocket, Linear, Fusion
      if (weaponType === 18) score += 10; // Sword
    }
    if (activity.type === 'gm') {
      // Long range + special
      if ([12, 8, 28].includes(weaponType)) score += 10; // Sniper, Scout, Bow
    }
    if (activity.type === 'pvp') {
      // Dueling weapons
      if ([9, 6, 7, 11].includes(weaponType)) score += 15; // Hand Cannon, Scout, Shotgun, Sniper
    }

    return score;
  }

  /**
   * Get weapon element
   */
  getWeaponElement(weapon) {
    return DAMAGE_TYPE_ELEMENTS[weapon.damageType] || 'kinetic';
  }

  /**
   * Select exotic armor for the build
   */
  selectExoticArmor(armorCollection, subclassConfig, activity) {
    let bestExotic = null;
    let bestScore = -1;

    // Search all armor slots for exotics
    for (const slot of ARMOR_SLOTS) {
      const armors = armorCollection[slot] || [];
      for (const armor of armors) {
        if (!armor.isExotic) continue;

        let score = 0;

        // Stat quality
        const totalStats = this.getArmorTotalStats(armor);
        score += totalStats / 5;

        // Priority stats bonus
        if (armor.stats) {
          for (let i = 0; i < activity.statPriority.length; i++) {
            const stat = activity.statPriority[i];
            const value = armor.stats[stat] || 0;
            score += value * (3 - i);
          }
        }

        if (score > bestScore) {
          bestScore = score;
          bestExotic = { ...armor, slot };
        }
      }
    }

    return bestExotic;
  }

  /**
   * Select armor set with stat optimization
   */
  selectArmorSet(armorCollection, exoticArmor, statPriority) {
    const result = {};

    for (const slot of ARMOR_SLOTS) {
      // If this slot has the exotic, use it
      if (exoticArmor && exoticArmor.slot === slot) {
        result[slot] = exoticArmor;
        continue;
      }

      // Select best legendary for this slot
      const armors = armorCollection[slot] || [];
      let bestArmor = null;
      let bestScore = -1;

      for (const armor of armors) {
        // Skip exotics (we already selected one)
        if (armor.isExotic) continue;

        const score = this.scoreArmor(armor, statPriority);
        if (score > bestScore) {
          bestScore = score;
          bestArmor = armor;
        }
      }

      result[slot] = bestArmor;
    }

    return result;
  }

  /**
   * Score armor based on stat priority
   */
  scoreArmor(armor, statPriority) {
    if (!armor.stats) return 0;

    let score = 0;
    const stats = armor.stats;

    // Weight stats by priority
    for (let i = 0; i < statPriority.length; i++) {
      const statName = statPriority[i];
      const statValue = stats[statName] || 0;
      const weight = (statPriority.length - i) * 2;
      score += statValue * weight;
    }

    // Bonus for high total stats
    const total = stats.total || this.getArmorTotalStats(armor);
    score += total / 2;

    return score;
  }

  /**
   * Get total stats for armor piece
   */
  getArmorTotalStats(armor) {
    if (!armor.stats) return 0;
    if (armor.stats.total) return armor.stats.total;

    let total = 0;
    for (const stat of Object.keys(STAT_PRIORITIES.general)) {
      total += armor.stats[stat] || 0;
    }
    return total;
  }

  /**
   * Calculate total stats from armor set
   */
  calculateTotalStats(armorSet) {
    const totals = {
      mobility: 0,
      resilience: 0,
      recovery: 0,
      discipline: 0,
      intellect: 0,
      strength: 0
    };

    for (const slot of ARMOR_SLOTS) {
      const armor = armorSet[slot];
      if (!armor?.stats) continue;

      for (const stat of Object.keys(totals)) {
        totals[stat] += armor.stats[stat] || 0;
      }
    }

    return totals;
  }

  /**
   * Select mods for armor pieces
   */
  selectModsForArmor(armorSet, mods, activity, currentStats) {
    const result = {};
    const statPriority = activity.statPriority;

    for (const slot of ARMOR_SLOTS) {
      const slotMods = [];
      const armor = armorSet[slot];
      if (!armor) {
        result[slot] = [];
        continue;
      }

      // Energy budget (usually 10 for masterworked armor)
      let energyBudget = armor.energy?.energyCapacity || 10;

      // Get slot-specific mods
      const slotModsAvailable = mods[slot === 'gauntlets' ? 'arms' : slot] || [];
      const statModsAvailable = mods.stat || [];

      // Add stat mods based on priority
      for (const stat of statPriority) {
        const statModName = `${this.capitalize(stat)} Mod`;
        const statMod = statModsAvailable.find(m => m.name.toLowerCase().includes(stat));
        if (statMod && energyBudget >= (statMod.energyCost || 3)) {
          slotMods.push({
            name: statModName,
            type: 'stat',
            stat: stat,
            value: 10,
            energyCost: statMod.energyCost || 3
          });
          energyBudget -= (statMod.energyCost || 3);
          break; // One stat mod per piece
        }
      }

      result[slot] = slotMods;
    }

    return result;
  }

  /**
   * Calculate final stats including mods
   */
  calculateFinalStats(armorSet, modsPerPiece) {
    const totals = this.calculateTotalStats(armorSet);

    // Add mod bonuses
    for (const slot of ARMOR_SLOTS) {
      const mods = modsPerPiece[slot] || [];
      for (const mod of mods) {
        if (mod.stat && mod.value) {
          totals[mod.stat] = (totals[mod.stat] || 0) + mod.value;
        }
      }
    }

    // Add masterwork bonuses (+2 per stat per piece)
    for (const slot of ARMOR_SLOTS) {
      const armor = armorSet[slot];
      if (armor?.energy?.energyCapacity >= 10) { // Masterworked
        for (const stat of Object.keys(totals)) {
          totals[stat] += 2;
        }
      }
    }

    return totals;
  }

  /**
   * Calculate secondary bonuses for stats over 100 (Armor 3.0)
   */
  calculateSecondaryBonuses(stats) {
    const bonuses = {};

    const bonusDescriptions = {
      mobility: (over) => `+${Math.floor(over / 10)}% weapon handling`,
      resilience: (over) => `+${Math.floor(over / 5)} flinch resistance`,
      recovery: (over) => `+${Math.floor(over / 10)}% ability energy on orb pickup`,
      discipline: (over) => `${Math.floor(over / 20)}% chance double grenade`,
      intellect: (over) => `+${Math.floor(over / 2.2)}% super damage`,
      strength: (over) => `${Math.floor(over / 20)}% chance double melee`
    };

    for (const [stat, value] of Object.entries(stats)) {
      if (value > 100) {
        const overAmount = value - 100;
        bonuses[stat] = {
          overflow: overAmount,
          description: bonusDescriptions[stat] ? bonusDescriptions[stat](overAmount) : `+${overAmount} overflow`
        };
      }
    }

    return Object.keys(bonuses).length > 0 ? bonuses : null;
  }

  /**
   * Get artifact recommendations for the build
   * Returns recommendations for seasonal artifact perks that synergize with the build
   */
  getArtifactRecommendations(activity, element) {
    const recommendations = [];

    // Champion mod recommendations based on activity
    // These are weapon/ability type suggestions for unlocking champion mods
    if (activity.champions?.barrier) {
      recommendations.push({
        name: 'Anti-Barrier Rounds',
        type: 'champion',
        priority: 'required',
        description: 'Required for Barrier Champions - check artifact for available weapon types'
      });
    }
    if (activity.champions?.overload) {
      recommendations.push({
        name: 'Overload Rounds',
        type: 'champion',
        priority: 'required',
        description: 'Required for Overload Champions - check artifact for available weapon types'
      });
    }
    if (activity.champions?.unstoppable) {
      recommendations.push({
        name: 'Unstoppable Rounds',
        type: 'champion',
        priority: 'required',
        description: 'Required for Unstoppable Champions - check artifact for available weapon types'
      });
    }

    // Element-specific artifact perk suggestions
    // These are common seasonal artifact perks that appear each season
    const elementPerks = {
      solar: [
        { name: 'Solar Siphon', description: 'Create orbs with Solar weapons' },
        { name: 'Ember of Empyrean', description: 'Extend Solar buffs with weapon kills' }
      ],
      arc: [
        { name: 'Arc Siphon', description: 'Create orbs with Arc weapons' },
        { name: 'Amplified Surge', description: 'Enhanced abilities while Amplified' }
      ],
      void: [
        { name: 'Void Siphon', description: 'Create orbs with Void weapons' },
        { name: 'Devour Enhancement', description: 'Extended Devour benefits' }
      ],
      stasis: [
        { name: 'Stasis Siphon', description: 'Create orbs with Stasis weapons' },
        { name: 'Shatter Damage', description: 'Increased shatter damage' }
      ],
      strand: [
        { name: 'Strand Siphon', description: 'Create orbs with Strand weapons' },
        { name: 'Threaded Blast', description: 'Enhanced Strand explosions' }
      ],
      prismatic: [
        { name: 'Prismatic Transfer', description: 'Share Light and Dark buffs' },
        { name: 'Transcendence', description: 'Enhanced Transcendence duration' }
      ]
    };

    // Activity-specific artifact recommendations
    if (activity.type === 'gm' || activity.type === 'raid' || activity.type === 'dungeon') {
      recommendations.push({
        name: 'Recuperation',
        type: 'utility',
        priority: 'recommended',
        description: 'Restore health on orb pickup - critical for survivability'
      });
    }

    // Add element-specific perks
    const perks = elementPerks[element] || [];
    for (const perk of perks) {
      recommendations.push({
        name: perk.name,
        type: 'suggested',
        priority: 'optional',
        description: perk.description
      });
    }

    return recommendations;
  }

  /**
   * Generate build name
   */
  generateBuildName(element, buildClass, activityId) {
    const elementName = this.capitalize(element);
    const className = this.capitalize(buildClass);
    const activityName = activityId ? ` (${this.capitalize(activityId)})` : '';
    return `${elementName} ${className}${activityName}`;
  }

  /**
   * Generate build notes
   */
  generateBuildNotes(element, buildClass, activity, subclassConfig) {
    let notes = `This ${element} ${buildClass} build is optimized for ${activity.name || activity.type}. `;

    if (activity.type === 'gm') {
      notes += 'Champion mods are required - check the seasonal artifact for available options. Focus on survivability and team support.';
    } else if (activity.type === 'raid') {
      notes += 'Coordinate with your fireteam for optimal damage phases. Well of Radiance or Ward of Dawn recommended for boss encounters.';
    } else if (activity.type === 'dungeon') {
      notes += 'Balance survivability with add clear capability. Self-sustain is key for solo attempts.';
    } else if (activity.type === 'pvp') {
      notes += 'Prioritize recovery for faster health regeneration between engagements. Mobility helps with strafe speed.';
    } else if (activity.type === 'gambit') {
      notes += 'Balance add clear for mote collection with burst damage for Primeval phases.';
    } else {
      notes += 'Versatile build suitable for most activities.';
    }

    return notes;
  }

  /**
   * Get class type number
   */
  getClassType(className) {
    switch (className?.toLowerCase()) {
      case 'titan': return 0;
      case 'hunter': return 1;
      case 'warlock': return 2;
      default: return 0;
    }
  }

  /**
   * Capitalize first letter
   */
  capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Clear caches (useful when manifest updates)
   */
  clearCache() {
    this.subclassCache = null;
    this.modsCache = null;
    this.initialized = false;
  }
}

// Export singleton
export const buildEngine = new BuildEngine();
export default BuildEngine;
