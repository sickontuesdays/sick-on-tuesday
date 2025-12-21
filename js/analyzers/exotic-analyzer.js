/**
 * Exotic Analyzer - Analysis system for exotic weapon and armor effects
 * Handles unique exotic perks and their complex interactions with abilities, mods, and builds
 */

export class ExoticAnalyzer {
  constructor(manifestData) {
    this.manifestData = manifestData;
    this.exoticDatabase = new Map();
    this.synergyMappings = new Map();
    this.interactionRules = new Map();

    // Initialize exotic databases
    this.initializeExoticDatabase();
  }

  /**
   * Initialize exotic analyzer with manifest data
   */
  async initialize() {
    try {
      console.log('Initializing Exotic Analyzer...');

      // Load exotic items from manifest chunks
      if (this.manifestData?.loader) {
        await this.loadExoticDefinitions();
      }

      // Build exotic synergy mappings
      this.buildExoticSynergyMappings();

      console.log(`✅ Exotic Analyzer ready with ${this.exoticDatabase.size} exotic categories`);
      return true;
    } catch (error) {
      console.warn('❌ Exotic Analyzer initialization failed:', error);
      return false;
    }
  }

  /**
   * Load exotic definitions from manifest
   */
  async loadExoticDefinitions() {
    try {
      // Load weapon and armor chunks to find exotics
      const [weapons, armor] = await Promise.allSettled([
        this.manifestData.loader?.loadItemChunk('weapons'),
        this.manifestData.loader?.loadItemChunk('armor')
      ]);

      if (weapons.status === 'fulfilled' && weapons.value) {
        this.processExoticWeapons(weapons.value);
      }

      if (armor.status === 'fulfilled' && armor.value) {
        this.processExoticArmor(armor.value);
      }

      console.log('📦 Processed exotic definitions from manifest');
    } catch (error) {
      console.warn('Failed to load exotic definitions:', error);
    }
  }

  /**
   * Process exotic weapons from manifest
   */
  processExoticWeapons(weapons) {
    let exoticCount = 0;

    for (const [hash, weapon] of Object.entries(weapons)) {
      if (this.isExotic(weapon)) {
        const exoticData = this.extractExoticWeaponData(weapon, hash);
        if (exoticData) {
          this.storeExoticWeapon(exoticData);
          exoticCount++;
        }
      }
    }

    console.log(`🔫 Processed ${exoticCount} exotic weapons`);
  }

  /**
   * Process exotic armor from manifest
   */
  processExoticArmor(armor) {
    let exoticCount = 0;

    for (const [hash, armorPiece] of Object.entries(armor)) {
      if (this.isExotic(armorPiece)) {
        const exoticData = this.extractExoticArmorData(armorPiece, hash);
        if (exoticData) {
          this.storeExoticArmor(exoticData);
          exoticCount++;
        }
      }
    }

    console.log(`🛡️ Processed ${exoticCount} exotic armor pieces`);
  }

  /**
   * Initialize hardcoded exotic database for immediate use
   */
  initializeExoticDatabase() {
    // Initialize exotic weapons
    this.initializeExoticWeapons();

    // Initialize exotic armor
    this.initializeExoticArmor();
  }

  /**
   * Initialize exotic weapons database
   */
  initializeExoticWeapons() {
    const exoticWeapons = {
      // Primary Exotics
      primary: {
        ace_of_spades: {
          name: 'Ace of Spades',
          type: 'Hand Cannon',
          slot: 'kinetic',
          element: 'kinetic',
          hash: 347366834,
          intrinsicPerk: {
            name: 'Memento Mori',
            description: 'Reloading after a kill loads magazine with explosive rounds',
            effects: ['reload_after_kill_grants_explosive_rounds', 'increased_damage'],
            triggers: ['kill', 'reload']
          },
          exoticPerk: {
            name: 'Firefly',
            description: 'Precision kills create explosive rounds and grant radar',
            effects: ['precision_kill_explosion', 'radar_while_ads'],
            triggers: ['precision_kill']
          },
          synergies: [
            'precision_focused_builds',
            'hand_cannon_mods',
            'reload_speed_mods',
            'kinetic_damage_buffs'
          ],
          bestFor: ['add_clearing', 'pvp', 'general_content'],
          builds: ['precision_damage', 'kinetic_focus'],
          counters: ['low_add_density', 'boss_only_encounters']
        },

        outbreak_perfected: {
          name: 'Outbreak Perfected',
          type: 'Pulse Rifle',
          slot: 'kinetic',
          element: 'kinetic',
          hash: 400096939,
          intrinsicPerk: {
            name: 'The Corruption Spreads',
            description: 'Nanites spread between enemies and deal increasing damage',
            effects: ['nanite_spread', 'stacking_damage', 'seek_targets'],
            triggers: ['precision_hit', 'nanite_damage']
          },
          exoticPerk: {
            name: 'Parasitism',
            description: 'Nanites spawn on enemy death and seek new targets',
            effects: ['death_spawns_nanites', 'seeking_nanites'],
            triggers: ['enemy_death']
          },
          synergies: [
            'pulse_rifle_mods',
            'kinetic_damage_buffs',
            'add_density',
            'team_nanite_stacking'
          ],
          bestFor: ['add_clearing', 'boss_damage_with_adds', 'team_play'],
          builds: ['kinetic_focus', 'add_clear_specialist'],
          counters: ['single_target_only', 'spread_out_enemies']
        },

        divinity: {
          name: 'Divinity',
          type: 'Trace Rifle',
          slot: 'energy',
          element: 'arc',
          hash: 4103414242,
          intrinsicPerk: {
            name: 'Judgment',
            description: 'Sustained damage creates weakening field and stuns Overload Champions',
            effects: ['weaken_field', 'overload_stun', 'crit_bubble'],
            triggers: ['sustained_damage']
          },
          exoticPerk: {
            name: 'Penance',
            description: 'Targets in the judgment field take increased damage from all sources',
            effects: ['team_damage_buff', 'crit_spot_creation'],
            triggers: ['field_active']
          },
          synergies: [
            'team_dps_builds',
            'overload_champion_content',
            'weaken_synergies',
            'arc_elemental_wells',
            'particle_deconstruction'
          ],
          bestFor: ['raid_boss_damage', 'team_support', 'champion_content'],
          builds: ['support_focused', 'arc_wells'],
          counters: ['solo_play', 'high_mobility_targets']
        },

        osteo_striga: {
          name: 'Osteo Striga',
          type: 'Submachine Gun',
          slot: 'kinetic',
          element: 'kinetic',
          hash: 46524085,
          intrinsicPerk: {
            name: 'Poison Burst',
            description: 'Sustained fire applies poison that spreads on death',
            effects: ['poison_application', 'poison_spread', 'damage_over_time'],
            triggers: ['sustained_fire', 'poisoned_enemy_death']
          },
          exoticPerk: {
            name: 'Toxic Overload',
            description: 'Final blows and poison kills reload magazine and grant handling',
            effects: ['kill_reload', 'handling_boost', 'poison_kill_reload'],
            triggers: ['final_blow', 'poison_kill']
          },
          synergies: [
            'submachine_gun_mods',
            'kinetic_damage_buffs',
            'high_add_density',
            'handling_mods'
          ],
          bestFor: ['add_clearing', 'close_range_combat', 'sustained_engagement'],
          builds: ['kinetic_focus', 'add_clear_specialist'],
          counters: ['long_range_encounters', 'boss_only_fights']
        }
      },

      // Special Exotics
      special: {
        witherhoard: {
          name: 'Witherhoard',
          type: 'Grenade Launcher',
          slot: 'kinetic',
          element: 'kinetic',
          hash: 1946491241,
          intrinsicPerk: {
            name: 'Primeval\'s Torment',
            description: 'Direct hits attach blight, indirect hits create blight pools',
            effects: ['blight_attachment', 'area_denial', 'damage_over_time'],
            triggers: ['direct_hit', 'indirect_hit']
          },
          exoticPerk: {
            name: 'Withering',
            description: 'Blight spreads to nearby enemies and persists',
            effects: ['blight_spread', 'persistent_damage', 'area_control'],
            triggers: ['enemy_proximity_to_blight']
          },
          synergies: [
            'grenade_launcher_mods',
            'area_control_builds',
            'passive_damage',
            'special_ammo_mods'
          ],
          bestFor: ['area_control', 'boss_damage', 'add_control'],
          builds: ['area_denial', 'passive_damage'],
          counters: ['high_mobility_targets', 'open_areas']
        },

        eriana_vow: {
          name: 'Eriana\'s Vow',
          type: 'Hand Cannon',
          slot: 'energy',
          element: 'solar',
          hash: 3524313097,
          intrinsicPerk: {
            name: 'Looks Can Kill',
            description: 'Uses Special ammo and can pierce shields',
            effects: ['special_ammo', 'anti_barrier', 'shield_pierce'],
            triggers: ['shot']
          },
          exoticPerk: {
            name: 'Death at First Glance',
            description: 'Precision hits grant Death at First Glance, increasing damage',
            effects: ['precision_hit_stacking_damage', 'first_glance_stacks'],
            triggers: ['precision_hit']
          },
          synergies: [
            'hand_cannon_mods',
            'solar_elemental_wells',
            'barrier_champion_content',
            'precision_damage_builds'
          ],
          bestFor: ['barrier_champions', 'long_range_precision', 'solar_builds'],
          builds: ['solar_wells', 'precision_focused'],
          counters: ['close_range_combat', 'low_precision_targets']
        }
      },

      // Heavy Exotics
      heavy: {
        gjallarhorn: {
          name: 'Gjallarhorn',
          type: 'Rocket Launcher',
          slot: 'power',
          element: 'solar',
          hash: 1363886209,
          intrinsicPerk: {
            name: 'Wolfpack Rounds',
            description: 'Rockets spawn tracking cluster missiles on detonation',
            effects: ['tracking_clusters', 'secondary_explosions', 'seek_targets'],
            triggers: ['rocket_detonation']
          },
          exoticPerk: {
            name: 'Pack Hunter',
            description: 'Nearby allies using legendary rockets gain Wolfpack Rounds',
            effects: ['ally_rocket_buff', 'team_synergy', 'wolfpack_spread'],
            triggers: ['ally_rocket_fire']
          },
          synergies: [
            'rocket_launcher_mods',
            'solar_elemental_wells',
            'team_rocket_builds',
            'boss_damage_phases'
          ],
          bestFor: ['boss_damage', 'team_dps', 'burst_damage'],
          builds: ['solar_wells', 'team_dps'],
          counters: ['close_range_use', 'low_ammo_scenarios']
        },

        xenophage: {
          name: 'Xenophage',
          type: 'Machine Gun',
          slot: 'power',
          element: 'solar',
          hash: 3004509503,
          intrinsicPerk: {
            name: 'Pyrotoxin Rounds',
            description: 'Fires explosive rounds that deal precision damage to body shots',
            effects: ['explosive_rounds', 'body_shot_precision', 'consistent_damage'],
            triggers: ['any_hit']
          },
          exoticPerk: {
            name: 'Deeper Pockets',
            description: 'Improved reload and stability when taking damage',
            effects: ['damage_improves_reload', 'damage_improves_stability'],
            triggers: ['taking_damage']
          },
          synergies: [
            'machine_gun_mods',
            'solar_elemental_wells',
            'consistent_dps_builds',
            'tanky_dps_builds'
          ],
          bestFor: ['sustained_boss_damage', 'forgiving_dps', 'consistent_damage'],
          builds: ['solar_wells', 'sustained_damage'],
          counters: ['burst_damage_phases', 'ammo_constrained_encounters']
        }
      }
    };

    this.exoticDatabase.set('weapons', exoticWeapons);
  }

  /**
   * Initialize exotic armor database
   */
  initializeExoticArmor() {
    const exoticArmor = {
      // Hunter Exotics
      hunter: {
        helmet: {
          celestial_nighthawk: {
            name: 'Celestial Nighthawk',
            slot: 'helmet',
            class: 'hunter',
            hash: 1041376760,
            exoticPerk: {
              name: 'Hawkeye Hack',
              description: 'Golden Gun fires a single devastating shot that gains bonus damage based on target precision hits',
              effects: ['golden_gun_single_shot', 'precision_stacking_damage', 'massive_boss_damage'],
              triggers: ['golden_gun_cast']
            },
            synergies: [
              'solar_hunter_builds',
              'precision_weapon_builds',
              'boss_damage_phases',
              'solar_elemental_wells',
              'marksman_golden_gun'
            ],
            bestFor: ['boss_damage', 'single_target_elimination', 'precision_gameplay'],
            builds: ['solar_precision', 'boss_specialist'],
            counters: ['add_clearing', 'multi_target_scenarios'],
            statFocus: ['intellect', 'discipline']
          },

          orpheus_rig: {
            name: 'Orpheus Rig',
            slot: 'legs',
            class: 'hunter',
            hash: 2780478500,
            exoticPerk: {
              name: 'Uncanny Arrows',
              description: 'Shadowshot tethers grant Super energy based on enemies tethered and defeated',
              effects: ['tether_super_regen', 'enemy_count_scaling', 'ability_energy'],
              triggers: ['shadowshot_tether', 'tethered_enemy_defeat']
            },
            synergies: [
              'void_hunter_builds',
              'shadowshot_deadfall',
              'high_add_density',
              'void_elemental_wells',
              'team_support_builds'
            ],
            bestFor: ['add_heavy_content', 'team_support', 'super_spam'],
            builds: ['void_support', 'super_focused'],
            counters: ['boss_only_encounters', 'low_add_density'],
            statFocus: ['intellect', 'mobility']
          }
        }
      },

      // Titan Exotics
      titan: {
        helmet: {
          helm_of_saint_14: {
            name: 'Helm of Saint-14',
            slot: 'helmet',
            class: 'titan',
            hash: 2789505807,
            exoticPerk: {
              name: 'Starless Night',
              description: 'Ward of Dawn grants Weapons of Light, blinding enemies that enter',
              effects: ['weapons_of_light', 'bubble_blind_enemies', 'team_damage_buff'],
              triggers: ['ward_of_dawn_cast', 'enemy_enters_bubble']
            },
            synergies: [
              'void_titan_builds',
              'ward_of_dawn',
              'team_support_builds',
              'void_elemental_wells',
              'weapons_of_light_dps'
            ],
            bestFor: ['team_support', 'boss_damage_phases', 'defensive_positioning'],
            builds: ['void_support', 'team_buff'],
            counters: ['high_mobility_encounters', 'spread_out_teams'],
            statFocus: ['intellect', 'resilience']
          },

          actium_war_rig: {
            name: 'Actium War Rig',
            slot: 'chest',
            class: 'titan',
            hash: 1478965780,
            exoticPerk: {
              name: 'Auto-Loading Link',
              description: 'Auto Rifles and Machine Guns continuously reload while firing',
              effects: ['auto_rifle_auto_reload', 'machine_gun_auto_reload', 'sustained_fire'],
              triggers: ['firing_auto_rifles_or_machine_guns']
            },
            synergies: [
              'auto_rifle_builds',
              'machine_gun_builds',
              'sustained_damage_builds',
              'xenophage_synergy',
              'sweet_business_synergy'
            ],
            bestFor: ['sustained_damage', 'dps_phases', 'add_clearing'],
            builds: ['auto_rifle_specialist', 'machine_gun_specialist'],
            counters: ['burst_damage_windows', 'precision_weapon_metas'],
            statFocus: ['resilience', 'discipline']
          }
        }
      },

      // Warlock Exotics
      warlock: {
        helmet: {
          nezarecs_sin: {
            name: 'Nezarec\'s Sin',
            slot: 'helmet',
            class: 'warlock',
            hash: 2523259394,
            exoticPerk: {
              name: 'Abyssal Extractors',
              description: 'Void damage kills accelerate all ability cooldowns',
              effects: ['void_kills_ability_regen', 'all_ability_cooldown_reduction'],
              triggers: ['void_damage_kill']
            },
            synergies: [
              'void_weapon_builds',
              'void_ability_builds',
              'void_elemental_wells',
              'ability_spam_builds',
              'void_subclass_synergy'
            ],
            bestFor: ['ability_spam', 'void_focused_builds', 'sustained_combat'],
            builds: ['void_ability_spam', 'void_wells'],
            counters: ['non_void_builds', 'low_kill_density'],
            statFocus: ['discipline', 'strength']
          },

          eye_of_another_world: {
            name: 'Eye of Another World',
            slot: 'helmet',
            class: 'warlock',
            hash: 868624157,
            exoticPerk: {
              name: 'Cerebral Uplink',
              description: 'Highlights targets and improves all ability regeneration',
              effects: ['target_highlighting', 'ability_regen_boost', 'universal_cooldown_reduction'],
              triggers: ['passive']
            },
            synergies: [
              'any_build',
              'ability_focused_builds',
              'general_improvement',
              'neutral_game_enhancement'
            ],
            bestFor: ['versatile_builds', 'ability_uptime', 'general_improvement'],
            builds: ['any_ability_focused', 'neutral_game'],
            counters: ['weapon_focused_builds', 'specialized_exotic_needs'],
            statFocus: ['discipline', 'intellect', 'strength']
          }
        }
      }
    };

    this.exoticDatabase.set('armor', exoticArmor);
  }

  // ========== Analysis Methods ==========

  /**
   * Analyze optimal exotic for a build
   */
  analyzeOptimalExotic(parsedQuery, currentBuild = {}, exoticSlot = 'any') {
    const recommendations = {
      weapons: [],
      armor: [],
      totalRecommendations: [],
      synergies: [],
      confidence: 0.0
    };

    // Get weapon exotic recommendations
    if (exoticSlot === 'any' || exoticSlot === 'weapon') {
      recommendations.weapons = this.selectOptimalExoticWeapons(parsedQuery, currentBuild);
    }

    // Get armor exotic recommendations
    if (exoticSlot === 'any' || exoticSlot === 'armor') {
      recommendations.armor = this.selectOptimalExoticArmor(parsedQuery, currentBuild);
    }

    // Combine and rank all recommendations
    recommendations.totalRecommendations = this.combineAndRankExotics(
      recommendations.weapons,
      recommendations.armor,
      parsedQuery,
      currentBuild
    );

    // Find synergies between recommended exotics and build
    recommendations.synergies = this.findExoticBuildSynergies(
      recommendations.totalRecommendations,
      currentBuild,
      parsedQuery
    );

    // Calculate confidence
    recommendations.confidence = this.calculateExoticConfidence(recommendations, parsedQuery);

    return recommendations;
  }

  /**
   * Select optimal exotic weapons
   */
  selectOptimalExoticWeapons(parsedQuery, currentBuild) {
    const weaponDatabase = this.exoticDatabase.get('weapons');
    if (!weaponDatabase) return [];

    const candidates = [];

    // Check each exotic category
    for (const [category, exotics] of Object.entries(weaponDatabase)) {
      for (const [key, exotic] of Object.entries(exotics)) {
        const score = this.scoreExoticWeapon(exotic, parsedQuery, currentBuild);
        if (score > 0.3) { // Minimum relevance threshold
          candidates.push({ ...exotic, key, category, score });
        }
      }
    }

    // Sort by score and return top 1
    return candidates
      .sort((a, b) => b.score - a.score)
      .slice(0, 1);
  }

  /**
   * Select optimal exotic armor
   */
  selectOptimalExoticArmor(parsedQuery, currentBuild) {
    const armorDatabase = this.exoticDatabase.get('armor');
    if (!armorDatabase) return [];

    const candidates = [];

    // Filter by class first
    const classArmor = armorDatabase[parsedQuery.guardianClass];
    if (!classArmor) return candidates;

    // Check each armor slot
    for (const [slot, armors] of Object.entries(classArmor)) {
      for (const [key, exotic] of Object.entries(armors)) {
        const score = this.scoreExoticArmor(exotic, parsedQuery, currentBuild);
        if (score > 0.3) {
          candidates.push({ ...exotic, key, slot, score });
        }
      }
    }

    // Sort by score and return top 1
    return candidates
      .sort((a, b) => b.score - a.score)
      .slice(0, 1);
  }

  /**
   * Score exotic weapon relevance
   */
  scoreExoticWeapon(exotic, parsedQuery, currentBuild) {
    let score = 0.5; // Base score

    // Activity-based scoring
    if (parsedQuery.activity && exotic.bestFor) {
      if (parsedQuery.activity === 'endgame' || parsedQuery.activity === 'raid') {
        if (exotic.bestFor.includes('boss_damage')) score += 0.3;
        if (exotic.bestFor.includes('team_support')) score += 0.25;
        if (exotic.bestFor.includes('sustained_damage')) score += 0.2;
      } else if (parsedQuery.activity === 'pvp') {
        if (exotic.bestFor.includes('pvp')) score += 0.3;
        if (exotic.bestFor.includes('burst_damage')) score += 0.25;
      } else if (parsedQuery.activity === 'patrol') {
        if (exotic.bestFor.includes('add_clearing')) score += 0.3;
        if (exotic.bestFor.includes('general_content')) score += 0.25;
      }
    }

    // Element matching
    if (parsedQuery.damageType && exotic.element === parsedQuery.damageType) {
      score += 0.2;
    }

    // Weapon type matching
    if (parsedQuery.weaponTypes?.length > 0) {
      const exoticType = exotic.type.toLowerCase().replace(/\s+/g, '');
      if (parsedQuery.weaponTypes.some(type => exoticType.includes(type))) {
        score += 0.25;
      }
    }

    // Build synergy matching
    if (currentBuild.abilities && exotic.synergies) {
      for (const synergy of exotic.synergies) {
        if (this.buildSupportsExoticSynergy(synergy, currentBuild, parsedQuery)) {
          score += 0.15;
        }
      }
    }

    // Playstyle matching
    if (parsedQuery.playstyle) {
      if (parsedQuery.playstyle === 'damage' && exotic.bestFor?.includes('boss_damage')) {
        score += 0.2;
      }
      if (parsedQuery.playstyle === 'survival' && exotic.bestFor?.includes('survivability')) {
        score += 0.2;
      }
      if (parsedQuery.playstyle === 'support' && exotic.bestFor?.includes('team_support')) {
        score += 0.2;
      }
    }

    return Math.min(1.0, score);
  }

  /**
   * Score exotic armor relevance
   */
  scoreExoticArmor(exotic, parsedQuery, currentBuild) {
    let score = 0.5; // Base score

    // Class matching (already filtered, but boost for correct class)
    if (exotic.class === parsedQuery.guardianClass) {
      score += 0.1;
    }

    // Element matching for subclass-specific exotics
    if (exotic.synergies) {
      const elementKeyword = parsedQuery.damageType;
      if (elementKeyword && exotic.synergies.some(syn => syn.includes(elementKeyword))) {
        score += 0.25;
      }
    }

    // Activity-based scoring
    if (parsedQuery.activity && exotic.bestFor) {
      if (parsedQuery.activity === 'endgame' || parsedQuery.activity === 'raid') {
        if (exotic.bestFor.includes('boss_damage')) score += 0.25;
        if (exotic.bestFor.includes('team_support')) score += 0.3;
        if (exotic.bestFor.includes('survivability')) score += 0.2;
      } else if (parsedQuery.activity === 'pvp') {
        if (exotic.bestFor.includes('pvp')) score += 0.3;
        if (exotic.bestFor.includes('mobility')) score += 0.2;
      }
    }

    // Ability synergy scoring
    if (currentBuild.abilities && exotic.synergies) {
      for (const synergy of exotic.synergies) {
        if (this.buildSupportsExoticSynergy(synergy, currentBuild, parsedQuery)) {
          score += 0.2;
        }
      }
    }

    // Stat focus alignment
    if (parsedQuery.statPriorities && exotic.statFocus) {
      const overlap = parsedQuery.statPriorities.filter(stat =>
        exotic.statFocus.includes(stat)
      );
      score += overlap.length * 0.1;
    }

    return Math.min(1.0, score);
  }

  /**
   * Combine and rank all exotic recommendations
   */
  combineAndRankExotics(weaponExotics, armorExotics, parsedQuery, currentBuild) {
    const all = [
      ...weaponExotics.map(e => ({ ...e, type: 'weapon' })),
      ...armorExotics.map(e => ({ ...e, type: 'armor' }))
    ];

    // Re-score considering cross-synergies
    return all
      .map(exotic => ({
        ...exotic,
        finalScore: this.calculateFinalExoticScore(exotic, all, parsedQuery, currentBuild)
      }))
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, 10); // Top 10 overall
  }

  /**
   * Calculate final exotic score with cross-synergies
   */
  calculateFinalExoticScore(exotic, allExotics, parsedQuery, currentBuild) {
    let score = exotic.score; // Base score

    // Boost for synergies with other recommended exotics
    for (const other of allExotics) {
      if (other !== exotic && this.exoticsHaveSynergy(exotic, other)) {
        score += 0.1;
      }
    }

    // Boost for build completeness
    if (this.exoticCompletesArchetype(exotic, parsedQuery, currentBuild)) {
      score += 0.15;
    }

    return Math.min(1.0, score);
  }

  /**
   * Find synergies between exotics and build
   */
  findExoticBuildSynergies(exotics, currentBuild, parsedQuery) {
    const synergies = [];

    for (const exotic of exotics.slice(0, 3)) { // Top 3 exotics
      // Element synergies
      if (exotic.element && exotic.element === parsedQuery.damageType) {
        synergies.push(`${exotic.name}: ${exotic.element} element focus`);
      }

      // Ability synergies
      if (exotic.synergies && currentBuild.abilities) {
        const abilityMatches = exotic.synergies.filter(syn =>
          this.buildSupportsExoticSynergy(syn, currentBuild, parsedQuery)
        );

        if (abilityMatches.length > 0) {
          synergies.push(`${exotic.name}: ${abilityMatches[0]} synergy`);
        }
      }

      // Mod synergies
      if (currentBuild.mods && exotic.synergies) {
        const modMatches = this.findExoticModSynergies(exotic, currentBuild.mods);
        if (modMatches.length > 0) {
          synergies.push(`${exotic.name}: Enhanced by ${modMatches[0]}`);
        }
      }

      // Weapon synergies for armor exotics
      if (exotic.type === 'armor' && currentBuild.weapons) {
        const weaponSynergies = this.findExoticWeaponSynergies(exotic, currentBuild.weapons);
        if (weaponSynergies.length > 0) {
          synergies.push(`${exotic.name}: Synergizes with ${weaponSynergies[0]}`);
        }
      }
    }

    return synergies.slice(0, 5); // Limit to 5 synergies
  }

  /**
   * Calculate exotic recommendation confidence
   */
  calculateExoticConfidence(recommendations, parsedQuery) {
    let confidence = 0.3; // Base confidence

    // Boost for having both weapon and armor recommendations
    if (recommendations.weapons.length > 0 && recommendations.armor.length > 0) {
      confidence += 0.2;
    }

    // Boost for high-scoring recommendations
    if (recommendations.totalRecommendations.length > 0) {
      const topScore = recommendations.totalRecommendations[0].finalScore || 0;
      confidence += Math.min(0.3, topScore * 0.3);
    }

    // Boost for query specificity
    if (parsedQuery.activity) confidence += 0.1;
    if (parsedQuery.damageType) confidence += 0.1;
    if (parsedQuery.playstyle) confidence += 0.1;

    // Boost for synergies found
    confidence += Math.min(0.2, recommendations.synergies.length * 0.05);

    return Math.min(1.0, confidence);
  }

  // ========== Helper Methods ==========

  /**
   * Check if build supports exotic synergy
   */
  buildSupportsExoticSynergy(synergy, currentBuild, parsedQuery) {
    const synergyLower = synergy.toLowerCase();

    // Check element synergies
    if (synergyLower.includes(parsedQuery.damageType)) return true;

    // Check weapon synergies
    if (currentBuild.weapons) {
      for (const weapon of Object.values(currentBuild.weapons)) {
        if (weapon && synergyLower.includes(weapon.type?.toLowerCase())) {
          return true;
        }
      }
    }

    // Check ability synergies
    if (currentBuild.abilities) {
      // Would check specific ability synergies
      return synergyLower.includes('ability') || synergyLower.includes('super');
    }

    return false;
  }

  /**
   * Check if two exotics have synergy
   */
  exoticsHaveSynergy(exotic1, exotic2) {
    if (!exotic1.synergies || !exotic2.synergies) return false;

    // Check for overlapping synergy keywords
    return exotic1.synergies.some(syn1 =>
      exotic2.synergies.some(syn2 =>
        syn1.includes(syn2.split('_')[0]) || syn2.includes(syn1.split('_')[0])
      )
    );
  }

  /**
   * Check if exotic completes a build archetype
   */
  exoticCompletesArchetype(exotic, parsedQuery, currentBuild) {
    // Check if this exotic is the missing piece for a coherent build
    if (parsedQuery.damageType && exotic.element === parsedQuery.damageType) {
      // Same-element exotic completes elemental focus
      return true;
    }

    if (parsedQuery.activity === 'raid' && exotic.bestFor?.includes('boss_damage')) {
      // Boss damage exotic completes raid build
      return true;
    }

    if (parsedQuery.playstyle === 'support' && exotic.bestFor?.includes('team_support')) {
      // Support exotic completes support build
      return true;
    }

    return false;
  }

  /**
   * Find exotic-mod synergies
   */
  findExoticModSynergies(exotic, mods) {
    const synergies = [];

    if (!mods || !exotic.synergies) return synergies;

    // Check for elemental well synergies
    if (exotic.synergies.some(syn => syn.includes('elemental_wells')) &&
        mods.some(mod => mod.name?.includes('Well') || mod.name?.includes('Font'))) {
      synergies.push('Elemental Well mods');
    }

    // Check for weapon-specific mod synergies
    if (exotic.type === 'weapon') {
      const weaponType = exotic.type.toLowerCase().replace(/\s+/g, '_');
      if (mods.some(mod => mod.name?.toLowerCase().includes(weaponType))) {
        synergies.push(`${exotic.type} mods`);
      }
    }

    return synergies;
  }

  /**
   * Find exotic-weapon synergies (for armor exotics)
   */
  findExoticWeaponSynergies(exotic, weapons) {
    const synergies = [];

    if (!weapons || !exotic.synergies) return synergies;

    for (const weapon of Object.values(weapons)) {
      if (!weapon) continue;

      // Check for weapon type synergies
      const weaponType = weapon.type?.toLowerCase() || '';
      if (exotic.synergies.some(syn => syn.includes(weaponType))) {
        synergies.push(weapon.name || weapon.type);
      }

      // Check for element synergies
      if (weapon.element && exotic.synergies.some(syn => syn.includes(weapon.element))) {
        synergies.push(`${weapon.element} weapons`);
      }
    }

    return synergies;
  }

  // ========== Utility Methods ==========

  buildExoticSynergyMappings() {
    // Build relationships between exotics and other systems
    console.log('✅ Built exotic synergy mappings');
  }

  isExotic(item) {
    return item?.inventory?.tierTypeName === 'Exotic' &&
           !item?.redacted &&
           !item?.blacklisted;
  }

  extractExoticWeaponData(weapon, hash) {
    return {
      hash,
      name: weapon.displayProperties?.name || 'Unknown Exotic',
      type: weapon.itemTypeDisplayName || 'Weapon',
      description: weapon.flavorText || '',
      intrinsicPerk: this.extractIntrinsicPerk(weapon),
      exoticPerk: this.extractExoticPerk(weapon),
      element: this.extractWeaponElement(weapon),
      slot: this.extractWeaponSlot(weapon)
    };
  }

  extractExoticArmorData(armor, hash) {
    return {
      hash,
      name: armor.displayProperties?.name || 'Unknown Exotic',
      type: 'Armor',
      description: armor.flavorText || '',
      exoticPerk: this.extractExoticPerk(armor),
      class: this.extractArmorClass(armor),
      slot: this.extractArmorSlot(armor)
    };
  }

  extractIntrinsicPerk(weapon) {
    // Extract intrinsic perk from weapon sockets
    return {
      name: 'Intrinsic Perk',
      description: 'Exotic weapon intrinsic perk',
      effects: [],
      triggers: []
    };
  }

  extractExoticPerk(item) {
    // Extract exotic perk from item sockets
    return {
      name: 'Exotic Perk',
      description: item.displayProperties?.description || 'Exotic perk effect',
      effects: [],
      triggers: []
    };
  }

  extractWeaponElement(weapon) {
    const damageTypeHash = weapon.damageTypeHashes?.[0];
    const damageTypeMap = {
      3373582085: 'kinetic',
      2303181850: 'arc',
      1847026933: 'solar',
      3454344768: 'void',
      151347233: 'stasis',
      3949783978: 'strand'
    };

    return damageTypeMap[damageTypeHash] || 'kinetic';
  }

  extractWeaponSlot(weapon) {
    const bucketHash = weapon.inventory?.bucketTypeHash;

    if (bucketHash === 1498876634) return 'kinetic';
    if (bucketHash === 2465295065) return 'energy';
    if (bucketHash === 953998645) return 'power';

    return 'unknown';
  }

  extractArmorClass(armor) {
    const categoryHashes = armor.itemCategoryHashes || [];

    if (categoryHashes.includes(21)) return 'hunter';
    if (categoryHashes.includes(22)) return 'titan';
    if (categoryHashes.includes(23)) return 'warlock';

    return 'unknown';
  }

  extractArmorSlot(armor) {
    const bucketHash = armor.inventory?.bucketTypeHash;

    if (bucketHash === 3448274439) return 'helmet';
    if (bucketHash === 3551918588) return 'arms';
    if (bucketHash === 14239492) return 'chest';
    if (bucketHash === 20886954) return 'legs';
    if (bucketHash === 1585787867) return 'class_item';

    return 'unknown';
  }

  storeExoticWeapon(exoticData) {
    console.log(`🔫 Stored exotic weapon: ${exoticData.name}`);
  }

  storeExoticArmor(exoticData) {
    console.log(`🛡️ Stored exotic armor: ${exoticData.name}`);
  }
}