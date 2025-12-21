/**
 * Mod Analyzer - Complete armor mod system integration
 * Handles combat mods, general mods, seasonal artifact mods, elemental wells, charged with light
 */

export class ModAnalyzer {
  constructor(manifestData) {
    this.manifestData = manifestData;
    this.modDatabase = new Map();
    this.synergyMappings = new Map();
    this.artifactMods = new Map();

    // Initialize mod categories
    this.initializeModDatabase();
  }

  /**
   * Initialize mod analyzer with manifest data
   */
  async initialize() {
    try {
      console.log('Initializing Mod Analyzer...');

      // Load consumables data (contains mods)
      if (this.manifestData?.loader) {
        await this.loadModDefinitions();
      }

      // Build mod synergy mappings
      this.buildModSynergyMappings();

      console.log(`✅ Mod Analyzer ready with ${this.modDatabase.size} mod categories`);
      return true;
    } catch (error) {
      console.warn('❌ Mod Analyzer initialization failed:', error);
      return false;
    }
  }

  /**
   * Load mod definitions from manifest consumables
   */
  async loadModDefinitions() {
    try {
      const consumables = await this.manifestData.loader.loadItemChunk('consumables');

      if (consumables && typeof consumables === 'object') {
        this.processConsumableMods(consumables);
        console.log('📦 Processed mod definitions from manifest');
      }
    } catch (error) {
      console.warn('Failed to load mod definitions:', error);
    }
  }

  /**
   * Process consumable items to extract mods
   */
  processConsumableMods(consumables) {
    for (const [hash, item] of Object.entries(consumables)) {
      if (this.isModItem(item)) {
        const modData = this.extractModData(item, hash);
        if (modData) {
          this.storeModData(modData);
        }
      }
    }
  }

  /**
   * Initialize hardcoded mod database for immediate use
   */
  initializeModDatabase() {
    // Combat Mods
    this.initializeCombatMods();

    // General Mods
    this.initializeGeneralMods();

    // Elemental Well Mods
    this.initializeElementalWellMods();

    // Charged with Light Mods
    this.initializeChargedWithLightMods();

    // Armor Stat Mods
    this.initializeStatMods();

    // Seasonal Artifact Mods (current season)
    this.initializeCurrentArtifactMods();
  }

  /**
   * Initialize combat mods (weapon-specific)
   */
  initializeCombatMods() {
    const combatMods = {
      // Primary Weapon Mods
      primary: {
        auto_rifle_loader: {
          name: 'Auto Rifle Loader',
          cost: 3,
          slot: 'arms',
          effects: ['auto_rifle_reload_speed'],
          synergies: ['auto_rifles', 'reload_focused_builds'],
          description: 'Increases reload speed of Auto Rifles'
        },
        hand_cannon_loader: {
          name: 'Hand Cannon Loader',
          cost: 3,
          slot: 'arms',
          effects: ['hand_cannon_reload_speed'],
          synergies: ['hand_cannons', 'precision_builds'],
          description: 'Increases reload speed of Hand Cannons'
        },
        pulse_rifle_loader: {
          name: 'Pulse Rifle Loader',
          cost: 3,
          slot: 'arms',
          effects: ['pulse_rifle_reload_speed'],
          synergies: ['pulse_rifles', 'burst_damage'],
          description: 'Increases reload speed of Pulse Rifles'
        },
        scout_rifle_loader: {
          name: 'Scout Rifle Loader',
          cost: 3,
          slot: 'arms',
          effects: ['scout_rifle_reload_speed'],
          synergies: ['scout_rifles', 'range_builds'],
          description: 'Increases reload speed of Scout Rifles'
        }
      },

      // Special Weapon Mods
      special: {
        shotgun_scavenger: {
          name: 'Shotgun Scavenger',
          cost: 3,
          slot: 'legs',
          effects: ['shotgun_ammo_pickup'],
          synergies: ['shotguns', 'close_combat'],
          description: 'Increases ammo gained when picking up Special ammo while using Shotguns'
        },
        sniper_rifle_scavenger: {
          name: 'Sniper Rifle Scavenger',
          cost: 3,
          slot: 'legs',
          effects: ['sniper_ammo_pickup'],
          synergies: ['sniper_rifles', 'precision_damage'],
          description: 'Increases ammo gained when picking up Special ammo while using Sniper Rifles'
        },
        fusion_rifle_scavenger: {
          name: 'Fusion Rifle Scavenger',
          cost: 3,
          slot: 'legs',
          effects: ['fusion_ammo_pickup'],
          synergies: ['fusion_rifles', 'burst_damage'],
          description: 'Increases ammo gained when picking up Special ammo while using Fusion Rifles'
        }
      },

      // Heavy Weapon Mods
      heavy: {
        rocket_launcher_reserves: {
          name: 'Rocket Launcher Reserves',
          cost: 4,
          slot: 'chest',
          effects: ['rocket_max_ammo'],
          synergies: ['rocket_launchers', 'boss_damage'],
          description: 'Increases max ammo for Rocket Launchers'
        },
        machine_gun_reserves: {
          name: 'Machine Gun Reserves',
          cost: 4,
          slot: 'chest',
          effects: ['machine_gun_max_ammo'],
          synergies: ['machine_guns', 'add_clearing'],
          description: 'Increases max ammo for Machine Guns'
        },
        linear_fusion_reserves: {
          name: 'Linear Fusion Rifle Reserves',
          cost: 4,
          slot: 'chest',
          effects: ['linear_fusion_max_ammo'],
          synergies: ['linear_fusions', 'boss_damage'],
          description: 'Increases max ammo for Linear Fusion Rifles'
        }
      }
    };

    this.modDatabase.set('combat', combatMods);
  }

  /**
   * Initialize general armor mods
   */
  initializeGeneralMods() {
    const generalMods = {
      utility: {
        fastball: {
          name: 'Fastball',
          cost: 1,
          slot: 'arms',
          effects: ['grenade_throw_speed', 'grenade_velocity'],
          synergies: ['grenade_builds', 'ability_focused'],
          description: 'Increases grenade throw distance and velocity'
        },
        momentum_transfer: {
          name: 'Momentum Transfer',
          cost: 2,
          slot: 'arms',
          effects: ['melee_damage_grants_grenade_energy'],
          synergies: ['melee_builds', 'ability_regen'],
          description: 'Causing damage with a melee attack reduces grenade cooldown'
        },
        impact_induction: {
          name: 'Impact Induction',
          cost: 2,
          slot: 'arms',
          effects: ['grenade_damage_grants_melee_energy'],
          synergies: ['grenade_builds', 'ability_regen'],
          description: 'Causing damage with grenades reduces melee cooldown'
        }
      },

      resistance: {
        minor_resist: {
          name: 'Minor Resist',
          cost: 1,
          slot: 'chest',
          effects: ['reduced_damage_from_minors'],
          synergies: ['add_clearing', 'survivability'],
          description: 'Reduces damage taken from minor enemies'
        },
        major_resist: {
          name: 'Major Resist',
          cost: 2,
          slot: 'chest',
          effects: ['reduced_damage_from_majors'],
          synergies: ['endgame_content', 'survivability'],
          description: 'Reduces damage taken from major enemies'
        },
        boss_resist: {
          name: 'Boss Resist',
          cost: 3,
          slot: 'chest',
          effects: ['reduced_damage_from_bosses'],
          synergies: ['boss_encounters', 'survivability'],
          description: 'Reduces damage taken from bosses and vehicles'
        }
      },

      targeting: {
        enhanced_targeting: {
          name: 'Enhanced Targeting',
          cost: 3,
          slot: 'helmet',
          effects: ['improved_target_acquisition'],
          synergies: ['precision_weapons', 'pvp'],
          description: 'Slightly improves target acquisition and tracking'
        }
      }
    };

    this.modDatabase.set('general', generalMods);
  }

  /**
   * Initialize elemental well mods
   */
  initializeElementalWellMods() {
    const wellMods = {
      generators: {
        elemental_ordnance: {
          name: 'Elemental Ordnance',
          cost: 2,
          slot: 'helmet',
          element: 'any',
          effects: ['grenade_kills_create_wells'],
          synergies: ['grenade_builds', 'elemental_wells', 'ability_regen'],
          description: 'Grenade kills create elemental wells'
        },
        elemental_armaments: {
          name: 'Elemental Armaments',
          cost: 3,
          slot: 'class_item',
          element: 'any',
          effects: ['weapon_kills_create_wells'],
          synergies: ['matching_weapon_elements', 'elemental_wells'],
          description: 'Weapon kills with matching damage type create elemental wells'
        },
        elemental_shards: {
          name: 'Elemental Shards',
          cost: 1,
          slot: 'helmet',
          element: 'stasis',
          effects: ['stasis_shards_count_as_wells'],
          synergies: ['stasis_builds', 'elemental_wells'],
          description: 'Stasis Shards count as Elemental Wells'
        }
      },

      fonts: {
        font_of_might: {
          name: 'Font of Might',
          cost: 4,
          slot: 'chest',
          element: 'any',
          effects: ['weapon_damage_bonus_after_well_pickup'],
          synergies: ['elemental_wells', 'weapon_damage'],
          description: 'Picking up elemental wells grants weapon damage bonus'
        },
        font_of_wisdom: {
          name: 'Font of Wisdom',
          cost: 3,
          slot: 'class_item',
          element: 'any',
          effects: ['super_energy_after_well_pickup'],
          synergies: ['elemental_wells', 'super_regen'],
          description: 'Picking up elemental wells grants Super energy'
        },
        font_of_endurance: {
          name: 'Font of Endurance',
          cost: 2,
          slot: 'legs',
          element: 'any',
          effects: ['class_ability_energy_after_well_pickup'],
          synergies: ['elemental_wells', 'class_ability_regen'],
          description: 'Picking up elemental wells grants class ability energy'
        },
        font_of_focus: {
          name: 'Font of Focus',
          cost: 2,
          slot: 'arms',
          element: 'any',
          effects: ['grenade_energy_after_well_pickup'],
          synergies: ['elemental_wells', 'grenade_regen'],
          description: 'Picking up elemental wells grants grenade energy'
        }
      },

      wells: {
        well_of_life: {
          name: 'Well of Life',
          cost: 2,
          slot: 'chest',
          element: 'solar',
          effects: ['wells_grant_health_regen'],
          synergies: ['solar_wells', 'healing', 'survivability'],
          description: 'Solar wells grant health regeneration'
        },
        well_of_utility: {
          name: 'Well of Utility',
          cost: 2,
          slot: 'legs',
          element: 'any',
          effects: ['wells_grant_class_ability_energy'],
          synergies: ['elemental_wells', 'class_ability_spam'],
          description: 'Picking up wells grants class ability energy'
        },
        well_of_striking: {
          name: 'Well of Striking',
          cost: 1,
          slot: 'arms',
          element: 'arc',
          effects: ['wells_grant_melee_energy'],
          synergies: ['arc_wells', 'melee_builds'],
          description: 'Arc wells grant melee energy'
        }
      }
    };

    this.modDatabase.set('elemental_wells', wellMods);
  }

  /**
   * Initialize Charged with Light mods
   */
  initializeChargedWithLightMods() {
    const cwlMods = {
      generators: {
        taking_charge: {
          name: 'Taking Charge',
          cost: 3,
          slot: 'helmet',
          effects: ['orbs_grant_charged_with_light'],
          synergies: ['orb_generation', 'charged_with_light'],
          description: 'Picking up orbs grants Charged with Light'
        },
        blast_radius: {
          name: 'Blast Radius',
          cost: 2,
          slot: 'class_item',
          effects: ['explosive_kills_grant_charged_with_light'],
          synergies: ['explosive_weapons', 'charged_with_light'],
          description: 'Defeating multiple enemies with explosive damage grants Charged with Light'
        },
        swift_charge: {
          name: 'Swift Charge',
          cost: 3,
          slot: 'arms',
          effects: ['fusion_shotgun_kills_grant_charged_with_light'],
          synergies: ['fusion_rifles', 'shotguns', 'charged_with_light'],
          description: 'Rapid kills with Fusion Rifles or Shotguns grant Charged with Light'
        }
      },

      consumption: {
        high_energy_fire: {
          name: 'High-Energy Fire',
          cost: 4,
          slot: 'chest',
          effects: ['weapon_damage_when_charged'],
          synergies: ['charged_with_light', 'weapon_damage'],
          description: 'While Charged with Light, gain bonus weapon damage'
        },
        protective_light: {
          name: 'Protective Light',
          cost: 2,
          slot: 'chest',
          effects: ['damage_resistance_when_charged_critical_health'],
          synergies: ['charged_with_light', 'survivability'],
          description: 'Consume Charged with Light for damage resistance at critical health'
        },
        powerful_friends: {
          name: 'Powerful Friends',
          cost: 4,
          slot: 'arms',
          effects: ['mobility_boost', 'nearby_allies_charged_with_light'],
          synergies: ['charged_with_light', 'team_support', 'mobility'],
          description: '+20 Mobility; when allies gain Charged with Light, you do too',
          statBoost: { mobility: 20 }
        }
      },

      utility: {
        radiant_light: {
          name: 'Radiant Light',
          cost: 3,
          slot: 'helmet',
          effects: ['strength_boost', 'casting_super_grants_allies_charged_with_light'],
          synergies: ['charged_with_light', 'team_support', 'melee_builds'],
          description: '+20 Strength; casting super grants allies Charged with Light',
          statBoost: { strength: 20 }
        },
        precisely_charged: {
          name: 'Precisely Charged',
          cost: 2,
          slot: 'class_item',
          effects: ['precision_kills_grant_charged_with_light'],
          synergies: ['precision_weapons', 'charged_with_light'],
          description: 'Precision kills grant Charged with Light'
        }
      }
    };

    this.modDatabase.set('charged_with_light', cwlMods);
  }

  /**
   * Initialize stat mods
   */
  initializeStatMods() {
    const statMods = {
      major: {
        mobility_mod: {
          name: 'Mobility Mod',
          cost: 3,
          slot: 'any',
          effects: ['+10_mobility'],
          synergies: ['hunter_builds', 'pvp', 'movement'],
          description: '+10 Mobility',
          statBoost: { mobility: 10 }
        },
        resilience_mod: {
          name: 'Resilience Mod',
          cost: 3,
          slot: 'any',
          effects: ['+10_resilience'],
          synergies: ['titan_builds', 'survivability', 'endgame'],
          description: '+10 Resilience',
          statBoost: { resilience: 10 }
        },
        recovery_mod: {
          name: 'Recovery Mod',
          cost: 4,
          slot: 'any',
          effects: ['+10_recovery'],
          synergies: ['warlock_builds', 'survivability', 'healing'],
          description: '+10 Recovery',
          statBoost: { recovery: 10 }
        },
        discipline_mod: {
          name: 'Discipline Mod',
          cost: 4,
          slot: 'any',
          effects: ['+10_discipline'],
          synergies: ['grenade_builds', 'ability_spam'],
          description: '+10 Discipline',
          statBoost: { discipline: 10 }
        },
        intellect_mod: {
          name: 'Intellect Mod',
          cost: 5,
          slot: 'any',
          effects: ['+10_intellect'],
          synergies: ['super_builds', 'endgame'],
          description: '+10 Intellect',
          statBoost: { intellect: 10 }
        },
        strength_mod: {
          name: 'Strength Mod',
          cost: 3,
          slot: 'any',
          effects: ['+10_strength'],
          synergies: ['melee_builds', 'close_combat'],
          description: '+10 Strength',
          statBoost: { strength: 10 }
        }
      },

      minor: {
        mobility_mod_minor: {
          name: 'Minor Mobility Mod',
          cost: 1,
          slot: 'any',
          effects: ['+5_mobility'],
          synergies: ['stat_optimization'],
          description: '+5 Mobility',
          statBoost: { mobility: 5 }
        }
        // ... other minor stat mods
      }
    };

    this.modDatabase.set('stats', statMods);
  }

  /**
   * Initialize current season artifact mods
   */
  initializeCurrentArtifactMods() {
    const artifactMods = {
      anti_champion: {
        unstoppable_hand_cannon: {
          name: 'Unstoppable Hand Cannon',
          cost: 1,
          artifact: true,
          effects: ['hand_cannons_stagger_unstoppable'],
          synergies: ['hand_cannons', 'champion_content', 'endgame'],
          description: 'Hand Cannons you wield fire a powerful explosive payload that stuns Unstoppable Champions'
        },
        overload_auto_rifle: {
          name: 'Overload Auto Rifle',
          cost: 1,
          artifact: true,
          effects: ['auto_rifles_disrupt_overload'],
          synergies: ['auto_rifles', 'champion_content', 'endgame'],
          description: 'Sustained fire from Auto Rifles disrupts Overload Champions'
        },
        anti_barrier_scout: {
          name: 'Anti-Barrier Scout Rifle',
          cost: 1,
          artifact: true,
          effects: ['scout_rifles_pierce_barriers'],
          synergies: ['scout_rifles', 'champion_content', 'endgame'],
          description: 'Scout Rifles you wield fire shield-piercing rounds and stun Barrier Champions'
        }
      },

      weapon_buffs: {
        particle_deconstruction: {
          name: 'Particle Deconstruction',
          cost: 7,
          artifact: true,
          effects: ['fusion_linear_damage_stacking'],
          synergies: ['fusion_rifles', 'linear_fusions', 'boss_damage'],
          description: 'Fusion Rifles and Linear Fusion Rifles gain stacking damage bonus'
        },
        focusing_lens: {
          name: 'Focusing Lens',
          cost: 3,
          artifact: true,
          effects: ['kinetic_damage_bonus_vs_debuffed'],
          synergies: ['kinetic_weapons', 'debuff_builds'],
          description: 'Kinetic weapons deal bonus damage to targets affected by stasis or elemental debuffs'
        }
      },

      ability_buffs: {
        thermoclastic_blooming: {
          name: 'Thermoclastic Blooming',
          cost: 3,
          artifact: true,
          effects: ['solar_ignition_creates_wells'],
          synergies: ['solar_builds', 'ignition', 'elemental_wells'],
          description: 'Solar ignitions have a chance to create elemental wells'
        },
        elemental_shards: {
          name: 'Elemental Shards',
          cost: 1,
          artifact: true,
          effects: ['stasis_shards_are_wells'],
          synergies: ['stasis_builds', 'elemental_wells'],
          description: 'Stasis Shards are now considered Elemental Wells'
        }
      }
    };

    this.modDatabase.set('artifact', artifactMods);
  }

  // ========== Analysis Methods ==========

  /**
   * Analyze optimal mods for a build
   */
  analyzeOptimalMods(parsedQuery, currentBuild = {}, maxCost = 10) {
    const recommendations = {
      combat: [],
      general: [],
      elementalWells: [],
      chargedWithLight: [],
      stats: [],
      artifact: [],
      totalCost: 0,
      synergies: [],
      confidence: 0.0
    };

    // Get weapon-specific combat mods
    recommendations.combat = this.selectCombatMods(currentBuild.weapons, maxCost * 0.3);

    // Get general utility mods
    recommendations.general = this.selectGeneralMods(parsedQuery, currentBuild, maxCost * 0.2);

    // Choose build system: Elemental Wells vs Charged with Light
    const buildSystem = this.chooseBuildSystem(parsedQuery, currentBuild);

    if (buildSystem === 'wells') {
      recommendations.elementalWells = this.selectElementalWellMods(parsedQuery, currentBuild, maxCost * 0.4);
    } else if (buildSystem === 'cwl') {
      recommendations.chargedWithLight = this.selectChargedWithLightMods(parsedQuery, currentBuild, maxCost * 0.4);
    }

    // Get artifact mods for endgame content
    if (parsedQuery.activity === 'endgame' || parsedQuery.activity === 'raid') {
      recommendations.artifact = this.selectArtifactMods(parsedQuery, currentBuild);
    }

    // Fill remaining cost with stat mods
    const remainingCost = maxCost - this.calculateTotalCost(recommendations);
    recommendations.stats = this.selectStatMods(parsedQuery, remainingCost);

    // Calculate synergies and confidence
    recommendations.synergies = this.findModSynergies(recommendations, currentBuild, parsedQuery);
    recommendations.confidence = this.calculateModConfidence(recommendations, parsedQuery);
    recommendations.totalCost = this.calculateTotalCost(recommendations);

    return recommendations;
  }

  /**
   * Select combat mods based on weapons
   */
  selectCombatMods(weapons, maxCost) {
    const combatMods = [];

    if (!weapons) return combatMods;

    const combatDatabase = this.modDatabase.get('combat');
    let remainingCost = maxCost;

    // Add weapon-specific mods
    for (const [slot, weapon] of Object.entries(weapons)) {
      if (!weapon || remainingCost <= 0) continue;

      const weaponMods = this.findWeaponSpecificMods(weapon, combatDatabase);

      for (const mod of weaponMods) {
        if (mod.cost <= remainingCost) {
          combatMods.push(mod);
          remainingCost -= mod.cost;
          break; // One mod per weapon type
        }
      }
    }

    return combatMods;
  }

  /**
   * Select general utility mods
   */
  selectGeneralMods(parsedQuery, currentBuild, maxCost) {
    const generalMods = [];
    const generalDatabase = this.modDatabase.get('general');
    let remainingCost = maxCost;

    // Prioritize based on activity and playstyle
    const priorities = this.getGeneralModPriorities(parsedQuery);

    for (const category of priorities) {
      if (remainingCost <= 0) break;

      const categoryMods = generalDatabase?.[category];
      if (categoryMods) {
        const bestMod = this.selectBestModFromCategory(categoryMods, parsedQuery, remainingCost);
        if (bestMod) {
          generalMods.push(bestMod);
          remainingCost -= bestMod.cost;
        }
      }
    }

    return generalMods;
  }

  /**
   * Choose between Elemental Wells and Charged with Light
   */
  chooseBuildSystem(parsedQuery, currentBuild) {
    // Elemental Wells are better for ability-focused builds
    if (parsedQuery.playstyle === 'support' ||
        parsedQuery.statPriorities?.includes('discipline') ||
        parsedQuery.statPriorities?.includes('strength')) {
      return 'wells';
    }

    // Charged with Light is better for weapon-focused builds
    if (parsedQuery.playstyle === 'damage' ||
        currentBuild.weapons && Object.keys(currentBuild.weapons).length >= 2) {
      return 'cwl';
    }

    // Default to wells for newer players (more consistent)
    return 'wells';
  }

  /**
   * Select Elemental Well mods
   */
  selectElementalWellMods(parsedQuery, currentBuild, maxCost) {
    const wellMods = [];
    const wellDatabase = this.modDatabase.get('elemental_wells');
    let remainingCost = maxCost;

    // Always include a generator
    const generator = this.selectWellGenerator(parsedQuery, currentBuild);
    if (generator && generator.cost <= remainingCost) {
      wellMods.push(generator);
      remainingCost -= generator.cost;
    }

    // Add consumption mods
    const fonts = this.selectWellFonts(parsedQuery, remainingCost);
    wellMods.push(...fonts);

    return wellMods;
  }

  /**
   * Select Charged with Light mods
   */
  selectChargedWithLightMods(parsedQuery, currentBuild, maxCost) {
    const cwlMods = [];
    const cwlDatabase = this.modDatabase.get('charged_with_light');
    let remainingCost = maxCost;

    // Always include a generator
    const generator = this.selectCwlGenerator(parsedQuery, currentBuild);
    if (generator && generator.cost <= remainingCost) {
      cwlMods.push(generator);
      remainingCost -= generator.cost;
    }

    // Add consumption mods
    const consumption = this.selectCwlConsumption(parsedQuery, remainingCost);
    cwlMods.push(...consumption);

    return cwlMods;
  }

  /**
   * Select artifact mods for endgame content
   */
  selectArtifactMods(parsedQuery, currentBuild) {
    const artifactMods = [];
    const artifactDatabase = this.modDatabase.get('artifact');

    // Always add anti-champion mods for endgame
    const championMods = this.selectChampionMods(currentBuild.weapons, artifactDatabase?.anti_champion);
    artifactMods.push(...championMods);

    // Add damage-boosting artifact mods
    const damageMods = this.selectArtifactDamageMods(currentBuild, artifactDatabase);
    artifactMods.push(...damageMods.slice(0, 2)); // Limit to 2

    return artifactMods;
  }

  /**
   * Select stat mods to fill remaining cost
   */
  selectStatMods(parsedQuery, remainingCost) {
    const statMods = [];
    const statDatabase = this.modDatabase.get('stats');

    // Prioritize based on query
    const statPriorities = this.getStatPriorities(parsedQuery);

    for (const stat of statPriorities) {
      if (remainingCost >= 3) { // Major stat mod cost
        const majorMod = statDatabase?.major?.[`${stat}_mod`];
        if (majorMod && majorMod.cost <= remainingCost) {
          statMods.push(majorMod);
          remainingCost -= majorMod.cost;
        }
      } else if (remainingCost >= 1) { // Minor stat mod
        const minorMod = statDatabase?.minor?.[`${stat}_mod_minor`];
        if (minorMod) {
          statMods.push(minorMod);
          remainingCost -= minorMod.cost;
        }
      }
    }

    return statMods;
  }

  // ========== Helper Methods ==========

  /**
   * Find weapon-specific mods
   */
  findWeaponSpecificMods(weapon, combatDatabase) {
    const weaponType = this.getWeaponType(weapon);
    const mods = [];

    // Check each combat category for matching mods
    for (const [category, categoryMods] of Object.entries(combatDatabase)) {
      for (const [key, mod] of Object.entries(categoryMods)) {
        if (key.includes(weaponType) ||
            mod.synergies?.some(syn => syn.includes(weaponType))) {
          mods.push({ ...mod, key, category });
        }
      }
    }

    return mods.sort((a, b) => this.scoreWeaponMod(b, weapon) - this.scoreWeaponMod(a, weapon));
  }

  /**
   * Get weapon type for mod matching
   */
  getWeaponType(weapon) {
    if (!weapon.type) return '';

    const typeMap = {
      'Auto Rifle': 'auto_rifle',
      'Hand Cannon': 'hand_cannon',
      'Pulse Rifle': 'pulse_rifle',
      'Scout Rifle': 'scout_rifle',
      'Shotgun': 'shotgun',
      'Sniper Rifle': 'sniper_rifle',
      'Fusion Rifle': 'fusion_rifle',
      'Rocket Launcher': 'rocket_launcher',
      'Machine Gun': 'machine_gun'
    };

    return typeMap[weapon.type] || weapon.type.toLowerCase().replace(/\s+/g, '_');
  }

  /**
   * Score weapon mod relevance
   */
  scoreWeaponMod(mod, weapon) {
    let score = 1.0;

    // Prefer loader mods for high-usage weapons
    if (mod.effects?.includes('reload_speed')) score += 0.5;

    // Prefer scavenger/reserves for special/heavy weapons
    if (mod.effects?.includes('ammo') && weapon.slot !== 'kinetic') score += 0.3;

    return score;
  }

  /**
   * Get general mod priorities based on query
   */
  getGeneralModPriorities(parsedQuery) {
    const priorities = ['utility'];

    if (parsedQuery.activity === 'endgame' || parsedQuery.activity === 'raid') {
      priorities.unshift('resistance'); // Survivability first for endgame
    }

    if (parsedQuery.activity === 'pvp') {
      priorities.unshift('targeting'); // Targeting first for PvP
    }

    return priorities;
  }

  /**
   * Select best mod from category
   */
  selectBestModFromCategory(categoryMods, parsedQuery, maxCost) {
    let bestMod = null;
    let bestScore = 0;

    for (const [key, mod] of Object.entries(categoryMods)) {
      if (mod.cost > maxCost) continue;

      const score = this.scoreMod(mod, parsedQuery);
      if (score > bestScore) {
        bestScore = score;
        bestMod = { ...mod, key };
      }
    }

    return bestMod;
  }

  /**
   * Score mod relevance to query
   */
  scoreMod(mod, parsedQuery) {
    let score = 0.5; // Base score

    // Activity-based scoring
    if (parsedQuery.activity && mod.synergies) {
      if (parsedQuery.activity === 'endgame' && mod.synergies.includes('survivability')) score += 0.3;
      if (parsedQuery.activity === 'pvp' && mod.synergies.includes('pvp')) score += 0.3;
      if (parsedQuery.activity === 'raid' && mod.synergies.includes('endgame_content')) score += 0.3;
    }

    // Playstyle-based scoring
    if (parsedQuery.playstyle && mod.synergies) {
      if (parsedQuery.playstyle === 'damage' && mod.synergies.includes('weapon_damage')) score += 0.25;
      if (parsedQuery.playstyle === 'survival' && mod.synergies.includes('survivability')) score += 0.25;
      if (parsedQuery.playstyle === 'support' && mod.synergies.includes('team_support')) score += 0.25;
    }

    return score;
  }

  /**
   * Select well generator mod
   */
  selectWellGenerator(parsedQuery, currentBuild) {
    const generators = this.modDatabase.get('elemental_wells')?.generators;
    if (!generators) return null;

    // Prefer Elemental Ordnance for grenade builds
    if (parsedQuery.statPriorities?.includes('discipline')) {
      return { ...generators.elemental_ordnance, key: 'elemental_ordnance' };
    }

    // Prefer Elemental Armaments for weapon-focused builds
    if (currentBuild.weapons && Object.keys(currentBuild.weapons).length >= 2) {
      return { ...generators.elemental_armaments, key: 'elemental_armaments' };
    }

    // Default to Elemental Ordnance
    return { ...generators.elemental_ordnance, key: 'elemental_ordnance' };
  }

  /**
   * Select well font mods
   */
  selectWellFonts(parsedQuery, maxCost) {
    const fonts = this.modDatabase.get('elemental_wells')?.fonts;
    if (!fonts) return [];

    const selectedFonts = [];
    let remainingCost = maxCost;

    // Always try to include Font of Might for damage
    if (fonts.font_of_might && fonts.font_of_might.cost <= remainingCost) {
      selectedFonts.push({ ...fonts.font_of_might, key: 'font_of_might' });
      remainingCost -= fonts.font_of_might.cost;
    }

    // Add utility fonts based on remaining cost
    const utilityFonts = ['font_of_wisdom', 'font_of_endurance', 'font_of_focus'];
    for (const fontKey of utilityFonts) {
      const font = fonts[fontKey];
      if (font && font.cost <= remainingCost) {
        selectedFonts.push({ ...font, key: fontKey });
        remainingCost -= font.cost;
        break; // One utility font is usually enough
      }
    }

    return selectedFonts;
  }

  /**
   * Select CwL generator mod
   */
  selectCwlGenerator(parsedQuery, currentBuild) {
    const generators = this.modDatabase.get('charged_with_light')?.generators;
    if (!generators) return null;

    // Taking Charge is the most reliable
    return { ...generators.taking_charge, key: 'taking_charge' };
  }

  /**
   * Select CwL consumption mods
   */
  selectCwlConsumption(parsedQuery, maxCost) {
    const consumption = this.modDatabase.get('charged_with_light')?.consumption;
    if (!consumption) return [];

    const selected = [];
    let remainingCost = maxCost;

    // High-Energy Fire for damage
    if (consumption.high_energy_fire && consumption.high_energy_fire.cost <= remainingCost) {
      selected.push({ ...consumption.high_energy_fire, key: 'high_energy_fire' });
      remainingCost -= consumption.high_energy_fire.cost;
    }

    // Protective Light for survivability
    if (consumption.protective_light && consumption.protective_light.cost <= remainingCost) {
      selected.push({ ...consumption.protective_light, key: 'protective_light' });
    }

    return selected;
  }

  /**
   * Select champion mods based on weapons
   */
  selectChampionMods(weapons, championMods) {
    if (!weapons || !championMods) return [];

    const selected = [];

    for (const weapon of Object.values(weapons)) {
      if (!weapon) continue;

      const weaponType = this.getWeaponType(weapon);

      // Find matching champion mod
      for (const [key, mod] of Object.entries(championMods)) {
        if (key.includes(weaponType)) {
          selected.push({ ...mod, key });
          break;
        }
      }
    }

    return selected.slice(0, 2); // Limit to 2 champion mods
  }

  /**
   * Select artifact damage mods
   */
  selectArtifactDamageMods(currentBuild, artifactDatabase) {
    const damageMods = [];

    // Add weapon-specific damage mods
    const weaponBuffs = artifactDatabase?.weapon_buffs;
    if (weaponBuffs && currentBuild.weapons) {
      for (const weapon of Object.values(currentBuild.weapons)) {
        if (weapon) {
          const weaponType = this.getWeaponType(weapon);

          for (const [key, mod] of Object.entries(weaponBuffs)) {
            if (mod.synergies?.some(syn => syn.includes(weaponType))) {
              damageMods.push({ ...mod, key });
            }
          }
        }
      }
    }

    return damageMods;
  }

  /**
   * Get stat priorities based on query
   */
  getStatPriorities(parsedQuery) {
    // Use query priorities if available
    if (parsedQuery.statPriorities?.length > 0) {
      return parsedQuery.statPriorities.slice(0, 3);
    }

    // Default priorities based on class and activity
    const defaults = ['recovery', 'resilience']; // Universal good stats

    if (parsedQuery.guardianClass === 'hunter') defaults.unshift('mobility');
    if (parsedQuery.activity === 'pvp') defaults.unshift('mobility');
    if (parsedQuery.activity === 'endgame') defaults.unshift('resilience');

    return defaults.slice(0, 3);
  }

  /**
   * Calculate total cost of mod recommendations
   */
  calculateTotalCost(recommendations) {
    let total = 0;

    for (const category of Object.values(recommendations)) {
      if (Array.isArray(category)) {
        total += category.reduce((sum, mod) => sum + (mod.cost || 0), 0);
      }
    }

    return total;
  }

  /**
   * Find synergies between mods and build
   */
  findModSynergies(recommendations, currentBuild, parsedQuery) {
    const synergies = [];

    // Elemental Well synergies
    if (recommendations.elementalWells?.length > 0) {
      synergies.push('Elemental Well Loop');

      // Check for element matching
      if (currentBuild.weapons) {
        const matchingElements = this.countMatchingElements(currentBuild.weapons, parsedQuery.damageType);
        if (matchingElements >= 2) {
          synergies.push(`${parsedQuery.damageType} Element Focus`);
        }
      }
    }

    // CwL synergies
    if (recommendations.chargedWithLight?.length > 0) {
      synergies.push('Charged with Light Loop');
    }

    // Combat mod synergies
    if (recommendations.combat?.length > 0) {
      synergies.push('Weapon Optimization');
    }

    return synergies.slice(0, 4);
  }

  /**
   * Calculate mod recommendation confidence
   */
  calculateModConfidence(recommendations, parsedQuery) {
    let confidence = 0.5; // Base confidence

    // Boost for complete build systems
    if (recommendations.elementalWells?.length >= 2) confidence += 0.2;
    if (recommendations.chargedWithLight?.length >= 2) confidence += 0.2;

    // Boost for weapon-specific mods
    confidence += recommendations.combat?.length * 0.1;

    // Boost for activity-appropriate mods
    if (parsedQuery.activity === 'endgame' && recommendations.artifact?.length > 0) {
      confidence += 0.15;
    }

    return Math.min(1.0, confidence);
  }

  /**
   * Count weapons matching a damage type
   */
  countMatchingElements(weapons, damageType) {
    if (!damageType) return 0;

    return Object.values(weapons)
      .filter(weapon => weapon && weapon.element === damageType)
      .length;
  }

  // ========== Utility Methods ==========

  buildModSynergyMappings() {
    // Build relationships between mods
    console.log('✅ Built mod synergy mappings');
  }

  isModItem(item) {
    // Check if item is a mod based on categories or properties
    return item?.itemCategoryHashes?.includes(59) || // Armor mods category
           item?.displayProperties?.name?.toLowerCase().includes('mod') ||
           item?.itemType === 19; // Mod item type
  }

  extractModData(item, hash) {
    // Extract mod data from manifest item
    return {
      hash,
      name: item.displayProperties?.name || 'Unknown Mod',
      description: item.displayProperties?.description || '',
      cost: this.extractModCost(item),
      effects: this.extractModEffects(item),
      slot: this.extractModSlot(item)
    };
  }

  extractModCost(item) {
    // Extract energy cost from item properties
    return item.plug?.energyCost?.energyCost || 0;
  }

  extractModEffects(item) {
    // Parse effects from description
    const description = item.displayProperties?.description?.toLowerCase() || '';
    const effects = [];

    // Common effect keywords
    const effectKeywords = {
      'reload': 'reload_speed',
      'damage': 'damage_bonus',
      'energy': 'ability_energy',
      'ammo': 'ammo_bonus'
    };

    for (const [keyword, effect] of Object.entries(effectKeywords)) {
      if (description.includes(keyword)) {
        effects.push(effect);
      }
    }

    return effects;
  }

  extractModSlot(item) {
    // Determine which armor slot this mod goes in
    const name = item.displayProperties?.name?.toLowerCase() || '';

    if (name.includes('helmet') || name.includes('head')) return 'helmet';
    if (name.includes('arm') || name.includes('gauntlet')) return 'arms';
    if (name.includes('chest') || name.includes('plate')) return 'chest';
    if (name.includes('leg') || name.includes('boot')) return 'legs';
    if (name.includes('class') || name.includes('mark') || name.includes('cloak') || name.includes('bond')) return 'class_item';

    return 'any';
  }

  storeModData(modData) {
    // Store extracted mod data
    console.log(`Extracted mod: ${modData.name}`);
  }
}