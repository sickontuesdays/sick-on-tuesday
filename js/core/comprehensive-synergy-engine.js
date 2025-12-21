/**
 * Comprehensive Synergy Engine - Multi-system synergy analysis
 * Integrates weapons, armor, abilities, mods, and exotics for complex build synergies
 */

export class ComprehensiveSynergyEngine {
  constructor(manifestData) {
    this.manifestData = manifestData;

    // Import analyzer modules
    this.abilitiesAnalyzer = null;
    this.modAnalyzer = null;
    this.exoticAnalyzer = null;

    // Synergy networks
    this.synergyNetwork = new Map();
    this.crossSystemRules = new Map();

    // Initialize synergy databases
    this.initializeSynergyRules();
  }

  /**
   * Initialize comprehensive synergy engine
   */
  async initialize() {
    try {
      console.log('Initializing Comprehensive Synergy Engine...');

      // Load and initialize analyzer modules
      await this.loadAnalyzerModules();

      // Build comprehensive synergy network
      this.buildSynergyNetwork();

      console.log('✅ Comprehensive Synergy Engine ready');
      return true;
    } catch (error) {
      console.warn('❌ Comprehensive Synergy Engine initialization failed:', error);
      return false;
    }
  }

  /**
   * Load analyzer modules
   */
  async loadAnalyzerModules() {
    try {
      // Dynamically import analyzer modules
      const [abilitiesModule, modModule, exoticModule] = await Promise.all([
        import('../analyzers/abilities-analyzer.js'),
        import('../analyzers/mod-analyzer.js'),
        import('../analyzers/exotic-analyzer.js')
      ]);

      // Initialize analyzers
      this.abilitiesAnalyzer = new abilitiesModule.AbilitiesAnalyzer(this.manifestData);
      this.modAnalyzer = new modModule.ModAnalyzer(this.manifestData);
      this.exoticAnalyzer = new exoticModule.ExoticAnalyzer(this.manifestData);

      // Initialize each analyzer
      await Promise.all([
        this.abilitiesAnalyzer.initialize(),
        this.modAnalyzer.initialize(),
        this.exoticAnalyzer.initialize()
      ]);

      console.log('🔗 Analyzer modules loaded and initialized');
    } catch (error) {
      console.warn('Failed to load analyzer modules:', error);
      // Continue with reduced functionality
    }
  }

  /**
   * Initialize core synergy rules
   */
  initializeSynergyRules() {
    // Element-based synergies
    this.initializeElementalSynergies();

    // Activity-based synergies
    this.initializeActivitySynergies();

    // Cross-system synergies
    this.initializeCrossSystemSynergies();

    // Trigger-based synergies
    this.initializeTriggerSynergies();
  }

  /**
   * Initialize elemental synergies
   */
  initializeElementalSynergies() {
    const elementalSynergies = {
      void: {
        keywords: ['void', 'devour', 'weaken', 'suppression', 'volatile', 'tether'],
        effects: ['weaken', 'devour', 'invisibility', 'suppression', 'volatile_explosions'],
        weaponSynergies: ['void_weapons_trigger_effects', 'void_kills_enhance_abilities'],
        modSynergies: ['echo_of_expulsion', 'elemental_ordnance', 'font_of_might'],
        abilityLinks: ['shadowshot_devour', 'void_soul_weaken', 'controlled_demolition'],
        exoticSynergies: ['nezarecs_sin', 'graviton_lance', 'void_exotics']
      },

      solar: {
        keywords: ['solar', 'scorch', 'ignition', 'radiant', 'restoration', 'burn'],
        effects: ['scorch', 'ignition', 'healing', 'damage_buff', 'area_denial'],
        weaponSynergies: ['solar_weapons_apply_scorch', 'ignitions_chain'],
        modSynergies: ['ember_of_ashes', 'well_of_life', 'font_of_might'],
        abilityLinks: ['solar_grenades_scorch', 'healing_abilities', 'sunspots'],
        exoticSynergies: ['celestial_nighthawk', 'phoenix_protocol', 'solar_exotics']
      },

      arc: {
        keywords: ['arc', 'jolt', 'blind', 'amplified', 'ionic_trace'],
        effects: ['chain_lightning', 'jolt', 'blind', 'speed_boost', 'ability_regen'],
        weaponSynergies: ['arc_weapons_jolt', 'chain_lightning_spread'],
        modSynergies: ['spark_of_magnitude', 'arc_well_mods', 'font_of_might'],
        abilityLinks: ['arc_abilities_amplify', 'ionic_traces', 'lightning_surge'],
        exoticSynergies: ['riskrunner', 'crown_of_tempests', 'arc_exotics']
      },

      stasis: {
        keywords: ['stasis', 'freeze', 'slow', 'shatter', 'crystal'],
        effects: ['freeze', 'slow', 'shatter_damage', 'crystal_creation', 'area_control'],
        weaponSynergies: ['stasis_weapons_freeze', 'shattering_crystals'],
        modSynergies: ['whisper_of_rime', 'elemental_shards', 'font_of_might'],
        abilityLinks: ['stasis_abilities_freeze', 'crystal_creation', 'shatterdive'],
        exoticSynergies: ['salvation_grip', 'agers_scepter', 'stasis_exotics']
      },

      strand: {
        keywords: ['strand', 'sever', 'unraveling', 'tangle', 'threadling'],
        effects: ['sever', 'unraveling', 'tangle_creation', 'threadling_spawn'],
        weaponSynergies: ['strand_weapons_sever', 'unraveling_spread'],
        modSynergies: ['strand_fragments', 'elemental_wells', 'font_of_might'],
        abilityLinks: ['strand_abilities', 'tangle_interaction', 'threadling_army'],
        exoticSynergies: ['osteo_striga', 'strand_exotics']
      }
    };

    this.synergyNetwork.set('elemental', elementalSynergies);
  }

  /**
   * Initialize activity-based synergies
   */
  initializeActivitySynergies() {
    const activitySynergies = {
      raid: {
        priorities: ['boss_damage', 'team_support', 'survivability', 'consistent_damage'],
        weaponTypes: ['linear_fusion', 'rocket_launcher', 'sniper_rifle'],
        modSystems: ['charged_with_light', 'elemental_wells'],
        statPriorities: ['resilience', 'recovery', 'intellect'],
        exoticRecommendations: ['divinity', 'gjallarhorn', 'well_of_radiance_exotics'],
        synergies: [
          'team_damage_buffs',
          'consistent_dps',
          'survivability_mods',
          'champion_handling'
        ]
      },

      dungeon: {
        priorities: ['survivability', 'versatility', 'self_sufficiency'],
        weaponTypes: ['hand_cannon', 'shotgun', 'machine_gun'],
        modSystems: ['charged_with_light', 'general_mods'],
        statPriorities: ['resilience', 'recovery', 'mobility'],
        exoticRecommendations: ['risk_runner', 'trinity_ghoul', 'healing_exotics'],
        synergies: [
          'self_healing',
          'add_clear_capability',
          'damage_resistance',
          'ability_spam'
        ]
      },

      grandmaster: {
        priorities: ['survivability', 'champion_handling', 'long_range_safety'],
        weaponTypes: ['scout_rifle', 'sniper_rifle', 'linear_fusion'],
        modSystems: ['artifact_mods', 'resistance_mods'],
        statPriorities: ['resilience', 'recovery', 'discipline'],
        exoticRecommendations: ['arbalest', 'erianas_vow', 'protective_exotics'],
        synergies: [
          'anti_champion',
          'damage_resistance',
          'range_safety',
          'team_coordination'
        ]
      },

      pvp: {
        priorities: ['ttk_optimization', 'mobility', 'ability_usage', 'map_control'],
        weaponTypes: ['hand_cannon', 'pulse_rifle', 'shotgun', 'sniper_rifle'],
        modSystems: ['charged_with_light', 'stat_mods'],
        statPriorities: ['mobility', 'recovery', 'intellect'],
        exoticRecommendations: ['ace_of_spades', 'last_word', 'mobility_exotics'],
        synergies: [
          'quick_ttk',
          'movement_abilities',
          'radar_control',
          'ability_chains'
        ]
      },

      gambit: {
        priorities: ['versatility', 'add_clear', 'invader_defense', 'boss_damage'],
        weaponTypes: ['auto_rifle', 'linear_fusion', 'machine_gun'],
        modSystems: ['elemental_wells', 'general_mods'],
        statPriorities: ['resilience', 'discipline', 'strength'],
        exoticRecommendations: ['xenophage', 'leviathans_breath', 'versatile_exotics'],
        synergies: [
          'add_clear_boss_damage',
          'invader_shutdown',
          'mote_collection_safety',
          'range_versatility'
        ]
      }
    };

    this.synergyNetwork.set('activities', activitySynergies);
  }

  /**
   * Initialize cross-system synergies
   */
  initializeCrossSystemSynergies() {
    const crossSystemRules = [
      // Void Hunter Example
      {
        name: 'Void Hunter Invisibility Loop',
        conditions: {
          guardianClass: 'hunter',
          damageType: 'void',
          abilities: ['vanishing_step', 'trapper'],
          weapons: ['void_weapons'],
          mods: ['echo_of_starvation', 'elemental_ordnance']
        },
        synergies: [
          'Invisibility on demand',
          'Void wells from grenades',
          'Extended invisibility from devour',
          'Void weapon synergy'
        ],
        confidence: 0.95,
        description: 'Perfect invisibility uptime with void weapon synergy'
      },

      // Solar Warlock Well Build
      {
        name: 'Solar Warlock Well Support',
        conditions: {
          guardianClass: 'warlock',
          damageType: 'solar',
          abilities: ['well_of_radiance', 'healing_rift'],
          exotics: ['phoenix_protocol', 'boots_of_assembler'],
          mods: ['elemental_ordnance', 'font_of_wisdom', 'well_of_life']
        },
        synergies: [
          'Team healing and damage buff',
          'Rapid super regeneration',
          'Solar wells from grenades',
          'Enhanced rift effectiveness'
        ],
        confidence: 0.9,
        description: 'Ultimate team support with healing and damage buffs'
      },

      // Charged with Light DPS
      {
        name: 'High-Energy Fire DPS Loop',
        conditions: {
          mods: ['taking_charge', 'high_energy_fire', 'powerful_friends'],
          weapons: ['high_dps_weapons'],
          activity: 'raid'
        },
        synergies: [
          '20% weapon damage buff',
          'Orb generation loop',
          'Team charged with light sharing',
          'Consistent DPS increase'
        ],
        confidence: 0.85,
        description: 'Sustained weapon damage boost for DPS phases'
      },

      // Elemental Wells Build
      {
        name: 'Elemental Well Ability Spam',
        conditions: {
          mods: ['elemental_ordnance', 'font_of_might', 'font_of_focus'],
          damageType: 'any_matching',
          playstyle: 'ability_spam'
        },
        synergies: [
          'Grenades create wells',
          'Wells grant weapon damage',
          'Wells grant grenade energy',
          'Self-sustaining ability loop'
        ],
        confidence: 0.8,
        description: 'Self-sustaining ability spam with weapon damage boost'
      },

      // Stasis Crystal Build
      {
        name: 'Stasis Crystal Shatter Build',
        conditions: {
          damageType: 'stasis',
          abilities: ['glacier_grenade', 'shatterdive', 'howl_of_the_storm'],
          mods: ['whisper_of_fractures', 'elemental_shards'],
          weapons: ['kinetic_weapons']
        },
        synergies: [
          'Crystal creation abilities',
          'Shatter damage enhancement',
          'Stasis shards as wells',
          'Kinetic weapon buff focus'
        ],
        confidence: 0.85,
        description: 'Area control and crowd clear through crystal manipulation'
      }
    ];

    this.synergyNetwork.set('cross_system', crossSystemRules);
  }

  /**
   * Initialize trigger-based synergies
   */
  initializeTriggerSynergies() {
    const triggerSynergies = {
      on_kill: {
        triggers: ['final_blow', 'kill', 'defeat'],
        effects: ['ability_energy', 'weapon_reload', 'damage_buff', 'healing'],
        synergies: [
          'kill_chains',
          'ability_regeneration',
          'momentum_building',
          'add_clear_efficiency'
        ]
      },

      on_precision: {
        triggers: ['precision_hit', 'critical_hit', 'headshot'],
        effects: ['damage_bonus', 'ability_energy', 'special_effects'],
        synergies: [
          'precision_weapon_builds',
          'crit_focused_exotics',
          'skill_rewarded_gameplay',
          'boss_damage_optimization'
        ]
      },

      on_ability_use: {
        triggers: ['grenade_throw', 'melee_hit', 'class_ability_cast'],
        effects: ['weapon_buffs', 'energy_return', 'status_effects'],
        synergies: [
          'ability_weapon_synergy',
          'build_tempo_maintenance',
          'elemental_effects',
          'combat_flow'
        ]
      },

      on_damage_taken: {
        triggers: ['taking_damage', 'shield_break', 'critical_health'],
        effects: ['damage_resistance', 'healing', 'ability_energy'],
        synergies: [
          'defensive_builds',
          'tank_focused_gameplay',
          'survival_mechanics',
          'reactive_abilities'
        ]
      }
    };

    this.synergyNetwork.set('triggers', triggerSynergies);
  }

  // ========== Analysis Methods ==========

  /**
   * Analyze comprehensive build synergies
   */
  async analyzeComprehensiveBuild(buildData, parsedQuery) {
    const analysis = {
      elemental: [],
      crossSystem: [],
      trigger: [],
      activity: [],
      confidence: 0.0,
      recommendations: [],
      warnings: []
    };

    try {
      // Analyze elemental synergies
      analysis.elemental = this.analyzeElementalSynergies(buildData, parsedQuery);

      // Analyze cross-system synergies
      analysis.crossSystem = this.analyzeCrossSystemSynergies(buildData, parsedQuery);

      // Analyze trigger-based synergies
      analysis.trigger = this.analyzeTriggerSynergies(buildData, parsedQuery);

      // Analyze activity-specific synergies
      analysis.activity = this.analyzeActivitySynergies(buildData, parsedQuery);

      // Generate recommendations
      analysis.recommendations = this.generateSynergyRecommendations(analysis, buildData, parsedQuery);

      // Identify potential issues
      analysis.warnings = this.identifyBuildWarnings(buildData, parsedQuery);

      // Calculate overall synergy confidence
      analysis.confidence = this.calculateOverallConfidence(analysis);

      console.log(`🎯 Comprehensive synergy analysis complete (${Math.round(analysis.confidence * 100)}% confidence)`);

    } catch (error) {
      console.error('Comprehensive synergy analysis failed:', error);
    }

    return analysis;
  }

  /**
   * Analyze elemental synergies
   */
  analyzeElementalSynergies(buildData, parsedQuery) {
    const synergies = [];

    if (!parsedQuery.damageType) return synergies;

    const elementalData = this.synergyNetwork.get('elemental')?.[parsedQuery.damageType];
    if (!elementalData) return synergies;

    // Check weapon-element matching
    if (buildData.weapons) {
      const matchingWeapons = Object.values(buildData.weapons)
        .filter(weapon => weapon?.element === parsedQuery.damageType);

      if (matchingWeapons.length >= 2) {
        synergies.push({
          name: `${parsedQuery.damageType.charAt(0).toUpperCase() + parsedQuery.damageType.slice(1)} Focus`,
          description: `${matchingWeapons.length} ${parsedQuery.damageType} weapons enhance elemental effects`,
          strength: 'high',
          confidence: 0.9
        });
      }
    }

    // Check ability-element synergies
    if (buildData.abilities) {
      const elementalAbilities = this.countElementalAbilities(buildData.abilities, parsedQuery.damageType);
      if (elementalAbilities > 0) {
        synergies.push({
          name: 'Ability Element Synergy',
          description: `${elementalAbilities} abilities match ${parsedQuery.damageType} element`,
          strength: 'medium',
          confidence: 0.8
        });
      }
    }

    // Check mod-element synergies
    if (buildData.mods) {
      const elementalMods = this.findElementalMods(buildData.mods, parsedQuery.damageType);
      if (elementalMods.length > 0) {
        synergies.push({
          name: 'Elemental Mod Synergy',
          description: `${elementalMods.length} mods enhance ${parsedQuery.damageType} effects`,
          strength: 'medium',
          confidence: 0.75
        });
      }
    }

    return synergies;
  }

  /**
   * Analyze cross-system synergies
   */
  analyzeCrossSystemSynergies(buildData, parsedQuery) {
    const synergies = [];
    const crossSystemRules = this.synergyNetwork.get('cross_system') || [];

    for (const rule of crossSystemRules) {
      const matchScore = this.evaluateCrossSystemRule(rule, buildData, parsedQuery);

      if (matchScore > 0.6) {
        synergies.push({
          name: rule.name,
          description: rule.description,
          strength: matchScore > 0.8 ? 'high' : 'medium',
          confidence: rule.confidence * matchScore,
          synergies: rule.synergies,
          matchScore
        });
      }
    }

    // Sort by match score
    return synergies.sort((a, b) => b.matchScore - a.matchScore);
  }

  /**
   * Analyze trigger-based synergies
   */
  analyzeTriggerSynergies(buildData, parsedQuery) {
    const synergies = [];
    const triggerData = this.synergyNetwork.get('triggers');

    if (!triggerData) return synergies;

    // Analyze common trigger patterns in the build
    const buildTriggers = this.extractBuildTriggers(buildData);

    for (const [triggerType, data] of Object.entries(triggerData)) {
      const triggerCount = buildTriggers[triggerType] || 0;

      if (triggerCount >= 2) {
        synergies.push({
          name: `${this.formatTriggerName(triggerType)} Chain`,
          description: `${triggerCount} effects trigger on ${triggerType.replace('on_', '')}`,
          strength: triggerCount >= 3 ? 'high' : 'medium',
          confidence: Math.min(0.9, 0.5 + (triggerCount * 0.15)),
          synergies: data.synergies
        });
      }
    }

    return synergies;
  }

  /**
   * Analyze activity-specific synergies
   */
  analyzeActivitySynergies(buildData, parsedQuery) {
    const synergies = [];

    if (!parsedQuery.activity) return synergies;

    const activityData = this.synergyNetwork.get('activities')?.[parsedQuery.activity];
    if (!activityData) return synergies;

    // Check if build aligns with activity priorities
    const alignmentScore = this.calculateActivityAlignment(buildData, activityData);

    if (alignmentScore > 0.5) {
      synergies.push({
        name: `${this.formatActivityName(parsedQuery.activity)} Optimization`,
        description: `Build aligns well with ${parsedQuery.activity} requirements`,
        strength: alignmentScore > 0.7 ? 'high' : 'medium',
        confidence: alignmentScore,
        details: this.getActivityAlignmentDetails(buildData, activityData)
      });
    }

    return synergies;
  }

  /**
   * Generate synergy recommendations
   */
  generateSynergyRecommendations(analysis, buildData, parsedQuery) {
    const recommendations = [];

    // Recommend missing pieces for high-potential synergies
    const potentialSynergies = this.findPotentialSynergies(buildData, parsedQuery);

    for (const potential of potentialSynergies) {
      if (potential.confidence > 0.7) {
        recommendations.push({
          type: 'enhancement',
          priority: 'high',
          suggestion: potential.suggestion,
          impact: potential.impact,
          confidence: potential.confidence
        });
      }
    }

    // Recommend optimization based on existing synergies
    if (analysis.elemental.length > 0) {
      const elementalRec = this.generateElementalRecommendations(analysis.elemental, parsedQuery);
      recommendations.push(...elementalRec);
    }

    return recommendations.slice(0, 5); // Limit to top 5
  }

  /**
   * Identify potential build warnings
   */
  identifyBuildWarnings(buildData, parsedQuery) {
    const warnings = [];

    // Anti-synergy detection
    const antiSynergies = this.detectAntiSynergies(buildData);
    warnings.push(...antiSynergies);

    // Activity mismatch warnings
    if (parsedQuery.activity) {
      const activityMismatches = this.detectActivityMismatches(buildData, parsedQuery.activity);
      warnings.push(...activityMismatches);
    }

    // Exotic conflicts
    const exoticConflicts = this.detectExoticConflicts(buildData);
    warnings.push(...exoticConflicts);

    return warnings;
  }

  /**
   * Calculate overall synergy confidence
   */
  calculateOverallConfidence(analysis) {
    let totalConfidence = 0;
    let totalWeight = 0;

    // Weight different synergy types
    const weights = {
      elemental: 0.3,
      crossSystem: 0.4,
      trigger: 0.2,
      activity: 0.1
    };

    for (const [type, synergies] of Object.entries(analysis)) {
      if (Array.isArray(synergies) && synergies.length > 0) {
        const avgConfidence = synergies.reduce((sum, syn) => sum + (syn.confidence || 0), 0) / synergies.length;
        const weight = weights[type] || 0.1;

        totalConfidence += avgConfidence * weight;
        totalWeight += weight;
      }
    }

    return totalWeight > 0 ? totalConfidence / totalWeight : 0.5;
  }

  // ========== Helper Methods ==========

  /**
   * Evaluate cross-system rule matching
   */
  evaluateCrossSystemRule(rule, buildData, parsedQuery) {
    let matchScore = 0;
    let totalChecks = 0;

    // Check each condition category
    const conditions = rule.conditions;

    // Guardian class check
    if (conditions.guardianClass) {
      totalChecks++;
      if (parsedQuery.guardianClass === conditions.guardianClass) {
        matchScore++;
      }
    }

    // Damage type check
    if (conditions.damageType) {
      totalChecks++;
      if (parsedQuery.damageType === conditions.damageType) {
        matchScore++;
      }
    }

    // Abilities check
    if (conditions.abilities && buildData.abilities) {
      totalChecks++;
      const matchingAbilities = this.countMatchingAbilities(conditions.abilities, buildData.abilities);
      matchScore += matchingAbilities / conditions.abilities.length;
    }

    // Weapons check
    if (conditions.weapons && buildData.weapons) {
      totalChecks++;
      const weaponMatch = this.evaluateWeaponConditions(conditions.weapons, buildData.weapons, parsedQuery);
      matchScore += weaponMatch;
    }

    // Mods check
    if (conditions.mods && buildData.mods) {
      totalChecks++;
      const modMatch = this.countMatchingMods(conditions.mods, buildData.mods);
      matchScore += modMatch / conditions.mods.length;
    }

    // Exotics check
    if (conditions.exotics && buildData.exotics) {
      totalChecks++;
      const exoticMatch = this.countMatchingExotics(conditions.exotics, buildData.exotics);
      matchScore += exoticMatch / conditions.exotics.length;
    }

    return totalChecks > 0 ? matchScore / totalChecks : 0;
  }

  /**
   * Extract triggers from build components
   */
  extractBuildTriggers(buildData) {
    const triggers = {
      on_kill: 0,
      on_precision: 0,
      on_ability_use: 0,
      on_damage_taken: 0
    };

    // Count triggers from weapons
    if (buildData.weapons) {
      for (const weapon of Object.values(buildData.weapons)) {
        if (weapon?.effects) {
          for (const effect of weapon.effects) {
            if (effect.includes('kill') || effect.includes('final_blow')) triggers.on_kill++;
            if (effect.includes('precision') || effect.includes('critical')) triggers.on_precision++;
          }
        }
      }
    }

    // Count triggers from abilities
    if (buildData.abilities) {
      for (const ability of Object.values(buildData.abilities)) {
        if (ability?.triggers) {
          for (const trigger of ability.triggers) {
            if (trigger.includes('kill')) triggers.on_kill++;
            if (trigger.includes('precision')) triggers.on_precision++;
            if (trigger.includes('ability') || trigger.includes('cast')) triggers.on_ability_use++;
            if (trigger.includes('damage') && trigger.includes('taking')) triggers.on_damage_taken++;
          }
        }
      }
    }

    // Count triggers from mods
    if (buildData.mods) {
      for (const mod of buildData.mods) {
        if (mod?.effects) {
          for (const effect of mod.effects) {
            if (effect.includes('kill')) triggers.on_kill++;
            if (effect.includes('precision')) triggers.on_precision++;
            if (effect.includes('ability')) triggers.on_ability_use++;
            if (effect.includes('damage_taken')) triggers.on_damage_taken++;
          }
        }
      }
    }

    return triggers;
  }

  /**
   * Calculate activity alignment score
   */
  calculateActivityAlignment(buildData, activityData) {
    let score = 0;
    let totalChecks = 0;

    // Check weapon types alignment
    if (buildData.weapons && activityData.weaponTypes) {
      totalChecks++;
      const weaponAlignment = this.calculateWeaponTypeAlignment(buildData.weapons, activityData.weaponTypes);
      score += weaponAlignment;
    }

    // Check mod system alignment
    if (buildData.mods && activityData.modSystems) {
      totalChecks++;
      const modAlignment = this.calculateModSystemAlignment(buildData.mods, activityData.modSystems);
      score += modAlignment;
    }

    // Check stat priorities alignment
    if (buildData.stats && activityData.statPriorities) {
      totalChecks++;
      const statAlignment = this.calculateStatAlignment(buildData.stats, activityData.statPriorities);
      score += statAlignment;
    }

    return totalChecks > 0 ? score / totalChecks : 0.5;
  }

  /**
   * Detect anti-synergies in build
   */
  detectAntiSynergies(buildData) {
    const antiSynergies = [];

    // Conflicting exotic effects
    if (buildData.exotics && buildData.exotics.length > 1) {
      const conflicts = this.findExoticConflicts(buildData.exotics);
      antiSynergies.push(...conflicts);
    }

    // Conflicting mod systems (CwL vs Wells)
    if (buildData.mods) {
      const modConflicts = this.findModSystemConflicts(buildData.mods);
      antiSynergies.push(...modConflicts);
    }

    // Element mismatches
    const elementMismatches = this.findElementMismatches(buildData);
    antiSynergies.push(...elementMismatches);

    return antiSynergies;
  }

  // ========== Utility Methods ==========

  /**
   * Count abilities matching damage type
   */
  countElementalAbilities(abilities, damageType) {
    if (!abilities || !damageType) return 0;

    return Object.values(abilities)
      .filter(ability => ability?.element === damageType)
      .length;
  }

  /**
   * Find mods that enhance specific element
   */
  findElementalMods(mods, damageType) {
    if (!mods || !damageType) return [];

    return mods.filter(mod => {
      const name = mod.name?.toLowerCase() || '';
      const description = mod.description?.toLowerCase() || '';

      return name.includes(damageType) ||
             description.includes(damageType) ||
             mod.element === damageType;
    });
  }

  /**
   * Count matching abilities between condition and build
   */
  countMatchingAbilities(conditionAbilities, buildAbilities) {
    let matches = 0;

    for (const conditionAbility of conditionAbilities) {
      for (const buildAbility of Object.values(buildAbilities)) {
        if (buildAbility?.name?.toLowerCase().includes(conditionAbility.toLowerCase()) ||
            buildAbility?.key?.toLowerCase() === conditionAbility.toLowerCase()) {
          matches++;
          break;
        }
      }
    }

    return matches;
  }

  /**
   * Evaluate weapon conditions
   */
  evaluateWeaponConditions(conditionWeapons, buildWeapons, parsedQuery) {
    let score = 0;

    for (const condition of conditionWeapons) {
      if (condition === 'void_weapons' && parsedQuery.damageType === 'void') {
        // Check if any weapons match the damage type
        const voidWeapons = Object.values(buildWeapons)
          .filter(weapon => weapon?.element === 'void');
        score += Math.min(1, voidWeapons.length / 2); // Up to 1 point for 2+ void weapons
      } else if (condition === 'high_dps_weapons') {
        // Check for high DPS weapon types
        const highDpsTypes = ['linear_fusion', 'rocket_launcher', 'sniper_rifle'];
        const highDpsWeapons = Object.values(buildWeapons)
          .filter(weapon => weapon?.type &&
                  highDpsTypes.some(type => weapon.type.toLowerCase().includes(type)));
        score += Math.min(1, highDpsWeapons.length);
      }
    }

    return Math.min(1, score / conditionWeapons.length);
  }

  /**
   * Count matching mods
   */
  countMatchingMods(conditionMods, buildMods) {
    let matches = 0;

    // Ensure conditionMods is valid
    if (!conditionMods || !Array.isArray(conditionMods) || conditionMods.length === 0) {
      return matches;
    }

    // Handle case where buildMods is null, undefined, or invalid
    if (!buildMods) {
      return matches;
    }

    // Handle case where buildMods is an object with mod categories
    let allMods = [];
    if (buildMods && typeof buildMods === 'object' && !Array.isArray(buildMods)) {
      // Collect all mods from all categories into a single array
      for (const category of ['combat', 'general', 'elementalWells', 'chargedWithLight', 'stats', 'artifact']) {
        if (buildMods[category] && Array.isArray(buildMods[category])) {
          allMods.push(...buildMods[category]);
        }
      }
    } else if (Array.isArray(buildMods)) {
      // If buildMods is already an array, use it directly
      allMods = buildMods;
    } else {
      // buildMods is neither a valid object nor an array
      console.warn('buildMods has unexpected format:', typeof buildMods, buildMods);
      return matches;
    }

    // Ensure we have mods to check against
    if (allMods.length === 0) {
      return matches;
    }

    for (const conditionMod of conditionMods) {
      if (!conditionMod || typeof conditionMod !== 'string') {
        continue; // Skip invalid condition mods
      }

      for (const buildMod of allMods) {
        if (!buildMod) {
          continue; // Skip null/undefined mods
        }

        // Check if mod names or keys match
        const modName = buildMod?.name?.toLowerCase() || '';
        const modKey = buildMod?.key?.toLowerCase() || '';
        const conditionLower = conditionMod.toLowerCase();

        if (modName.includes(conditionLower) || modKey === conditionLower) {
          matches++;
          break;
        }
      }
    }

    return matches;
  }

  /**
   * Count matching exotics
   */
  countMatchingExotics(conditionExotics, buildExotics) {
    let matches = 0;

    for (const conditionExotic of conditionExotics) {
      for (const buildExotic of buildExotics) {
        if (buildExotic?.name?.toLowerCase().includes(conditionExotic.toLowerCase())) {
          matches++;
          break;
        }
      }
    }

    return matches;
  }

  /**
   * Format trigger name for display
   */
  formatTriggerName(triggerType) {
    return triggerType.replace('on_', '').replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Format activity name for display
   */
  formatActivityName(activity) {
    const activityMap = {
      'raid': 'Raid',
      'dungeon': 'Dungeon',
      'grandmaster': 'Grandmaster',
      'pvp': 'PvP',
      'gambit': 'Gambit'
    };

    return activityMap[activity] || activity.charAt(0).toUpperCase() + activity.slice(1);
  }

  /**
   * Find potential synergies with missing components
   */
  findPotentialSynergies(buildData, parsedQuery) {
    const potentials = [];

    // Check for almost-complete synergy rules
    const crossSystemRules = this.synergyNetwork.get('cross_system') || [];

    for (const rule of crossSystemRules) {
      const matchScore = this.evaluateCrossSystemRule(rule, buildData, parsedQuery);

      if (matchScore > 0.4 && matchScore < 0.7) {
        const missing = this.identifyMissingComponents(rule, buildData, parsedQuery);

        potentials.push({
          name: rule.name,
          suggestion: `Add ${missing.join(', ')} to complete synergy`,
          impact: rule.description,
          confidence: 0.6 + (matchScore * 0.3),
          missingComponents: missing
        });
      }
    }

    return potentials;
  }

  /**
   * Identify missing components for a synergy rule
   */
  identifyMissingComponents(rule, buildData, parsedQuery) {
    const missing = [];

    // Check what's missing from the rule conditions
    const conditions = rule.conditions;

    if (conditions.abilities && buildData.abilities) {
      const missingAbilities = conditions.abilities.filter(ability =>
        !Object.values(buildData.abilities).some(buildAbility =>
          buildAbility?.name?.toLowerCase().includes(ability.toLowerCase())
        )
      );
      missing.push(...missingAbilities);
    }

    if (conditions.mods && buildData.mods) {
      const missingMods = conditions.mods.filter(mod =>
        !buildData.mods.some(buildMod =>
          buildMod?.name?.toLowerCase().includes(mod.toLowerCase())
        )
      );
      missing.push(...missingMods);
    }

    return missing.slice(0, 3); // Limit to 3 most important missing pieces
  }

  /**
   * Generate elemental recommendations
   */
  generateElementalRecommendations(elementalSynergies, parsedQuery) {
    const recommendations = [];

    if (elementalSynergies.length > 0 && parsedQuery.damageType) {
      const elementalData = this.synergyNetwork.get('elemental')?.[parsedQuery.damageType];

      if (elementalData) {
        recommendations.push({
          type: 'optimization',
          priority: 'medium',
          suggestion: `Consider ${elementalData.modSynergies[0]} for enhanced ${parsedQuery.damageType} synergy`,
          impact: `Boosts ${parsedQuery.damageType} weapon and ability effectiveness`,
          confidence: 0.75
        });
      }
    }

    return recommendations;
  }

  /**
   * Calculate weapon type alignment with activity
   */
  calculateWeaponTypeAlignment(weapons, activityWeaponTypes) {
    let matches = 0;

    for (const weapon of Object.values(weapons)) {
      if (weapon?.type) {
        const weaponType = weapon.type.toLowerCase().replace(/\s+/g, '_');
        if (activityWeaponTypes.some(type => weaponType.includes(type))) {
          matches++;
        }
      }
    }

    return Math.min(1, matches / Object.keys(weapons).length);
  }

  /**
   * Calculate mod system alignment with activity
   */
  calculateModSystemAlignment(mods, activityModSystems) {
    for (const system of activityModSystems) {
      const systemMods = mods.filter(mod =>
        mod.name?.toLowerCase().includes(system.toLowerCase().replace(/_/g, ' '))
      );

      if (systemMods.length >= 2) {
        return 1.0; // Found complete mod system
      } else if (systemMods.length === 1) {
        return 0.5; // Partial system
      }
    }

    return 0.2; // No matching systems
  }

  /**
   * Calculate stat alignment with activity priorities
   */
  calculateStatAlignment(stats, activityStatPriorities) {
    let score = 0;

    for (const stat of activityStatPriorities) {
      const statValue = stats[stat] || 0;
      if (statValue >= 80) score += 1; // High tier
      else if (statValue >= 60) score += 0.7; // Medium tier
      else if (statValue >= 40) score += 0.4; // Low tier
    }

    return Math.min(1, score / activityStatPriorities.length);
  }

  /**
   * Find exotic conflicts
   */
  findExoticConflicts(exotics) {
    const conflicts = [];

    // Can only equip one exotic weapon and one exotic armor
    const exoticWeapons = exotics.filter(exotic => exotic.type === 'weapon');
    const exoticArmor = exotics.filter(exotic => exotic.type === 'armor');

    if (exoticWeapons.length > 1) {
      conflicts.push({
        type: 'exotic_conflict',
        severity: 'high',
        message: 'Cannot equip multiple exotic weapons',
        conflictingItems: exoticWeapons.map(e => e.name)
      });
    }

    if (exoticArmor.length > 1) {
      conflicts.push({
        type: 'exotic_conflict',
        severity: 'high',
        message: 'Cannot equip multiple exotic armor pieces',
        conflictingItems: exoticArmor.map(e => e.name)
      });
    }

    return conflicts;
  }

  /**
   * Find mod system conflicts
   */
  findModSystemConflicts(mods) {
    const conflicts = [];

    const cwlMods = mods.filter(mod => mod.name?.toLowerCase().includes('charged') ||
                                     mod.name?.toLowerCase().includes('light'));
    const wellMods = mods.filter(mod => mod.name?.toLowerCase().includes('well') ||
                                       mod.name?.toLowerCase().includes('font'));

    if (cwlMods.length > 0 && wellMods.length > 0) {
      conflicts.push({
        type: 'mod_system_mixing',
        severity: 'medium',
        message: 'Mixing Charged with Light and Elemental Well mods reduces efficiency',
        suggestion: 'Focus on one mod system for better synergy'
      });
    }

    return conflicts;
  }

  /**
   * Find element mismatches
   */
  findElementMismatches(buildData) {
    const mismatches = [];

    // Check for element consistency issues
    if (buildData.weapons && buildData.abilities) {
      const weaponElements = new Set(
        Object.values(buildData.weapons)
          .map(weapon => weapon?.element)
          .filter(element => element && element !== 'kinetic')
      );

      const abilityElements = new Set(
        Object.values(buildData.abilities)
          .map(ability => ability?.element)
          .filter(element => element)
      );

      if (weaponElements.size > 1 && abilityElements.size === 1) {
        const abilityElement = Array.from(abilityElements)[0];
        if (!weaponElements.has(abilityElement)) {
          mismatches.push({
            type: 'element_mismatch',
            severity: 'low',
            message: `Weapon elements don't match ${abilityElement} abilities`,
            suggestion: `Consider using more ${abilityElement} weapons for better synergy`
          });
        }
      }
    }

    return mismatches;
  }

  /**
   * Get activity alignment details
   */
  getActivityAlignmentDetails(buildData, activityData) {
    const details = [];

    // Check each alignment category
    if (buildData.weapons) {
      const weaponAlignment = this.calculateWeaponTypeAlignment(buildData.weapons, activityData.weaponTypes);
      details.push(`Weapon types: ${Math.round(weaponAlignment * 100)}% aligned`);
    }

    if (buildData.mods) {
      const modAlignment = this.calculateModSystemAlignment(buildData.mods, activityData.modSystems);
      details.push(`Mod systems: ${Math.round(modAlignment * 100)}% aligned`);
    }

    return details;
  }

  /**
   * Detect activity mismatches
   */
  detectActivityMismatches(buildData, activity) {
    const mismatches = [];

    const activityData = this.synergyNetwork.get('activities')?.[activity];
    if (!activityData) return mismatches;

    // Check for weapon type mismatches
    if (buildData.weapons) {
      const weaponAlignment = this.calculateWeaponTypeAlignment(buildData.weapons, activityData.weaponTypes);

      if (weaponAlignment < 0.3) {
        mismatches.push({
          type: 'activity_weapon_mismatch',
          severity: 'medium',
          message: `Weapon types not optimal for ${activity}`,
          suggestion: `Consider using ${activityData.weaponTypes.join(', ')} for better performance`
        });
      }
    }

    return mismatches;
  }
}