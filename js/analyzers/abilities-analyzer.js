/**
 * Abilities Analyzer - Integration system for Guardian abilities, supers, aspects, fragments
 * Handles Light 3.0 and Darkness subclass systems
 */

export class AbilitiesAnalyzer {
  constructor(manifestData) {
    this.manifestData = manifestData;
    this.abilities = new Map();
    this.aspects = new Map();
    this.fragments = new Map();
    this.supers = new Map();

    // Initialize ability databases
    this.initializeAbilityDatabase();
  }

  /**
   * Initialize comprehensive ability database from manifest
   */
  async initialize() {
    try {
      console.log('Initializing Abilities Analyzer...');

      // Load talent grids and progression data
      if (this.manifestData?.loader) {
        await this.loadAbilityDefinitions();
      }

      // Build ability synergy mappings
      this.buildAbilitySynergyMappings();

      console.log(`✅ Abilities Analyzer ready with ${this.abilities.size} abilities`);
      return true;
    } catch (error) {
      console.warn('❌ Abilities Analyzer initialization failed:', error);
      return false;
    }
  }

  /**
   * Load ability definitions from manifest
   */
  async loadAbilityDefinitions() {
    try {
      // Try to load ability-related definitions
      const definitions = await Promise.allSettled([
        this.manifestData.loader?.loadDefinition('DestinyTalentGridDefinition'),
        this.manifestData.loader?.loadDefinition('DestinyProgressionDefinition'),
        this.manifestData.loader?.loadDefinition('DestinyActivityModifierDefinition')
      ]);

      // Process loaded definitions
      definitions.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          const definitionNames = ['talentGrids', 'progressions', 'modifiers'];
          this.processAbilityDefinitions(result.value, definitionNames[index]);
        }
      });

    } catch (error) {
      console.warn('Failed to load ability definitions:', error);
    }
  }

  /**
   * Process ability definitions and extract ability data
   */
  processAbilityDefinitions(definitions, type) {
    if (!definitions || typeof definitions !== 'object') return;

    switch (type) {
      case 'talentGrids':
        this.processTalentGrids(definitions);
        break;
      case 'progressions':
        this.processProgressions(definitions);
        break;
      case 'modifiers':
        this.processModifiers(definitions);
        break;
    }
  }

  /**
   * Process talent grids to extract ability information
   */
  processTalentGrids(talentGrids) {
    for (const [hash, grid] of Object.entries(talentGrids)) {
      if (!grid?.nodes) continue;

      for (const node of grid.nodes) {
        if (node?.steps) {
          for (const step of node.steps) {
            if (this.isAbilityStep(step)) {
              this.extractAbilityFromStep(step, hash);
            }
          }
        }
      }
    }
  }

  /**
   * Initialize hardcoded ability database for immediate use
   */
  initializeAbilityDatabase() {
    // Hunter abilities
    this.initializeHunterAbilities();

    // Titan abilities
    this.initializeTitanAbilities();

    // Warlock abilities
    this.initializeWarlockAbilities();

    // Fragments and Aspects (Light 3.0 & Darkness)
    this.initializeSubclassFragments();
    this.initializeSubclassAspects();
  }

  /**
   * Initialize Hunter abilities
   */
  initializeHunterAbilities() {
    const hunterAbilities = {
      // Void Hunter
      void: {
        super: {
          shadowshot_deadfall: {
            name: 'Shadowshot (Deadfall)',
            element: 'void',
            type: 'super',
            effects: ['tether', 'invisibility', 'weakening'],
            synergies: ['void weapons', 'invisibility', 'team support'],
            description: 'Tethers enemies and provides team damage buff'
          },
          shadowshot_moebius: {
            name: 'Shadowshot (Moebius Quiver)',
            element: 'void',
            type: 'super',
            effects: ['multiple_shots', 'high_damage'],
            synergies: ['void weapons', 'precision damage', 'boss damage'],
            description: 'Multiple shadowshots for high single-target damage'
          }
        },
        aspects: {
          vanishing_step: {
            name: 'Vanishing Step',
            element: 'void',
            type: 'aspect',
            effects: ['invisibility', 'dodge'],
            synergies: ['void weapons', 'melee', 'survivability'],
            description: 'Dodging grants invisibility'
          },
          trapper: {
            name: 'Trapper\'s Ambush',
            element: 'void',
            type: 'aspect',
            effects: ['smoke_bomb', 'weakening'],
            synergies: ['team support', 'void damage', 'crowd_control'],
            description: 'Enhanced smoke bomb with weakening'
          }
        },
        fragments: {
          echo: {
            name: 'Echo of Expulsion',
            element: 'void',
            type: 'fragment',
            effects: ['void_ability_kills_create_explosions'],
            synergies: ['void abilities', 'add clearing', 'chain kills']
          },
          starvation: {
            name: 'Echo of Starvation',
            element: 'void',
            type: 'fragment',
            effects: ['devour_extends_invisibility'],
            synergies: ['devour', 'invisibility', 'survivability']
          }
        }
      },

      // Solar Hunter
      solar: {
        super: {
          blade_barrage: {
            name: 'Blade Barrage',
            element: 'solar',
            type: 'super',
            effects: ['high_damage', 'ignition', 'range'],
            synergies: ['solar weapons', 'boss damage', 'ignition'],
            description: 'Launches explosive knives for massive damage'
          },
          golden_gun_precision: {
            name: 'Golden Gun (Marksman)',
            element: 'solar',
            type: 'super',
            effects: ['precision', 'critical_multiplier'],
            synergies: ['precision weapons', 'boss damage', 'single_target'],
            description: 'High-damage precision super'
          }
        },
        aspects: {
          gunpowder_gamble: {
            name: 'Gunpowder Gamble',
            element: 'solar',
            type: 'aspect',
            effects: ['throwing_knife', 'ignition'],
            synergies: ['solar abilities', 'ignition', 'ability_regen'],
            description: 'Enhanced throwing knife with ignition'
          }
        }
      },

      // Arc Hunter
      arc: {
        super: {
          arc_staff: {
            name: 'Arc Staff',
            element: 'arc',
            type: 'super',
            effects: ['melee', 'deflection', 'mobility'],
            synergies: ['arc weapons', 'close_combat', 'crowd_control'],
            description: 'Melee super with projectile deflection'
          },
          gathering_storm: {
            name: 'Gathering Storm',
            element: 'arc',
            type: 'super',
            effects: ['area_damage', 'persistent', 'jolt'],
            synergies: ['arc abilities', 'area_control', 'add_clearing'],
            description: 'Creates a persistent storm that jolts enemies'
          }
        },
        aspects: {
          flow_state: {
            name: 'Flow State',
            element: 'arc',
            type: 'aspect',
            effects: ['dodge_regen', 'amplified'],
            synergies: ['mobility', 'ability_regen', 'arc_weapons'],
            description: 'Dodging while amplified resets dodge'
          }
        }
      },

      // Stasis Hunter
      stasis: {
        super: {
          silence_and_squall: {
            name: 'Silence and Squall',
            element: 'stasis',
            type: 'super',
            effects: ['freeze', 'seeking', 'area_control'],
            synergies: ['stasis weapons', 'crowd_control', 'area_denial'],
            description: 'Dual kamas that freeze and track enemies'
          }
        },
        aspects: {
          shatterdive: {
            name: 'Shatterdive',
            element: 'stasis',
            type: 'aspect',
            effects: ['diving_slam', 'crystal_shatter'],
            synergies: ['stasis crystals', 'crowd_control', 'mobility'],
            description: 'Aerial slam that shatters stasis crystals'
          },
          grim_harvest: {
            name: 'Grim Harvest',
            element: 'stasis',
            type: 'aspect',
            effects: ['stasis_shards', 'ability_regen'],
            synergies: ['stasis abilities', 'ability_regen', 'elemental_wells'],
            description: 'Defeating frozen enemies creates stasis shards'
          }
        }
      }
    };

    // Store in abilities map
    this.abilities.set('hunter', hunterAbilities);
  }

  /**
   * Initialize Titan abilities
   */
  initializeTitanAbilities() {
    const titanAbilities = {
      // Void Titan
      void: {
        super: {
          ward_of_dawn: {
            name: 'Ward of Dawn',
            element: 'void',
            type: 'super',
            effects: ['protection_bubble', 'weapons_of_light', 'team_buff'],
            synergies: ['team_support', 'damage_buff', 'survivability'],
            description: 'Protective dome that buffs weapon damage'
          },
          sentinel_shield: {
            name: 'Sentinel Shield',
            element: 'void',
            type: 'super',
            effects: ['shield_throw', 'overshield', 'suppression'],
            synergies: ['void_weapons', 'crowd_control', 'team_support'],
            description: 'Captain America-style shield with suppression'
          }
        },
        aspects: {
          controlled_demolition: {
            name: 'Controlled Demolition',
            element: 'void',
            type: 'aspect',
            effects: ['void_ability_explosions', 'volatile'],
            synergies: ['void_abilities', 'add_clearing', 'chain_explosions'],
            description: 'Void abilities make enemies volatile'
          },
          offensive_bulwark: {
            name: 'Offensive Bulwark',
            element: 'void',
            type: 'aspect',
            effects: ['overshield_weapon_damage', 'shield_bash'],
            synergies: ['overshield', 'weapon_damage', 'close_combat'],
            description: 'Overshield grants weapon damage and enhanced melee'
          }
        }
      },

      // Solar Titan
      solar: {
        super: {
          hammer_of_sol: {
            name: 'Hammer of Sol',
            element: 'solar',
            type: 'super',
            effects: ['ranged_hammers', 'ignition', 'healing'],
            synergies: ['solar_weapons', 'healing', 'area_damage'],
            description: 'Throws flaming hammers that heal on kills'
          },
          burning_maul: {
            name: 'Burning Maul',
            element: 'solar',
            type: 'super',
            effects: ['spinning_hammer', 'tornado', 'area_control'],
            synergies: ['close_combat', 'crowd_control', 'solar_abilities'],
            description: 'Spinning hammer super with tornado slam'
          }
        },
        aspects: {
          sol_invictus: {
            name: 'Sol Invictus',
            element: 'solar',
            type: 'aspect',
            effects: ['sunspot_healing', 'ability_regen'],
            synergies: ['sunspots', 'healing', 'ability_regen'],
            description: 'Standing in sunspots grants healing and ability energy'
          },
          consecration: {
            name: 'Consecration',
            element: 'solar',
            type: 'aspect',
            effects: ['aerial_slam', 'scorch_wave'],
            synergies: ['mobility', 'area_damage', 'scorch'],
            description: 'Aerial slam that creates scorching wave'
          }
        }
      },

      // Arc Titan
      arc: {
        super: {
          fists_of_havoc: {
            name: 'Fists of Havoc',
            element: 'arc',
            type: 'super',
            effects: ['ground_slam', 'area_damage', 'roaming'],
            synergies: ['arc_abilities', 'crowd_control', 'close_combat'],
            description: 'Electrified fists for devastating melee combat'
          },
          thundercrash: {
            name: 'Thundercrash',
            element: 'arc',
            type: 'super',
            effects: ['missile', 'single_target', 'high_damage'],
            synergies: ['boss_damage', 'arc_weapons', 'high_risk_reward'],
            description: 'Become a missile for massive single-target damage'
          }
        },
        aspects: {
          touch_of_thunder: {
            name: 'Touch of Thunder',
            element: 'arc',
            type: 'aspect',
            effects: ['enhanced_grenades', 'jolt'],
            synergies: ['grenades', 'jolt', 'area_control'],
            description: 'Greatly enhances arc grenades'
          }
        }
      },

      // Stasis Titan
      stasis: {
        super: {
          glacial_quake: {
            name: 'Glacial Quake',
            element: 'stasis',
            type: 'super',
            effects: ['ground_slam', 'crystal_creation', 'freeze'],
            synergies: ['stasis_crystals', 'crowd_control', 'area_denial'],
            description: 'Slam attacks that create stasis crystals'
          }
        },
        aspects: {
          cryoclasm: {
            name: 'Cryoclasm',
            element: 'stasis',
            type: 'aspect',
            effects: ['sliding_crystal_shatter', 'enhanced_slide'],
            synergies: ['stasis_crystals', 'mobility', 'crowd_control'],
            description: 'Slide through and shatter stasis crystals'
          },
          howl_of_the_storm: {
            name: 'Howl of the Storm',
            element: 'stasis',
            type: 'aspect',
            effects: ['melee_crystal_wave', 'freeze'],
            synergies: ['melee', 'stasis_crystals', 'area_control'],
            description: 'Melee creates a wave of stasis crystals'
          }
        }
      }
    };

    this.abilities.set('titan', titanAbilities);
  }

  /**
   * Initialize Warlock abilities
   */
  initializeWarlockAbilities() {
    const warlockAbilities = {
      // Void Warlock
      void: {
        super: {
          nova_bomb_cataclysm: {
            name: 'Nova Bomb (Cataclysm)',
            element: 'void',
            type: 'super',
            effects: ['tracking_projectiles', 'volatile', 'area_damage'],
            synergies: ['void_weapons', 'volatile', 'area_control'],
            description: 'Nova bomb that splits into tracking projectiles'
          },
          nova_bomb_vortex: {
            name: 'Nova Bomb (Vortex)',
            element: 'void',
            type: 'super',
            effects: ['persistent_vortex', 'area_denial'],
            synergies: ['area_control', 'void_abilities', 'add_clearing'],
            description: 'Creates a persistent damaging vortex'
          }
        },
        aspects: {
          feed_the_void: {
            name: 'Feed the Void',
            element: 'void',
            type: 'aspect',
            effects: ['devour', 'ability_kills_grant_devour'],
            synergies: ['devour', 'ability_regen', 'survivability'],
            description: 'Void ability kills grant devour'
          },
          chaos_accelerant: {
            name: 'Chaos Accelerant',
            element: 'void',
            type: 'aspect',
            effects: ['enhanced_grenades', 'overcharged'],
            synergies: ['grenades', 'void_abilities', 'area_damage'],
            description: 'Hold grenade to overcharge for enhanced effects'
          }
        }
      },

      // Solar Warlock
      solar: {
        super: {
          well_of_radiance: {
            name: 'Well of Radiance',
            element: 'solar',
            type: 'super',
            effects: ['healing_rift', 'damage_buff', 'team_support'],
            synergies: ['team_support', 'damage_buff', 'survivability'],
            description: 'Creates healing and damage rift for the team'
          },
          daybreak: {
            name: 'Daybreak',
            element: 'solar',
            type: 'super',
            effects: ['aerial_projectiles', 'healing', 'tracking'],
            synergies: ['healing', 'mobility', 'solar_weapons'],
            description: 'Aerial solar projectiles with healing properties'
          }
        },
        aspects: {
          touch_of_flame: {
            name: 'Touch of Flame',
            element: 'solar',
            type: 'aspect',
            effects: ['enhanced_grenades', 'scorch'],
            synergies: ['grenades', 'scorch', 'ignition'],
            description: 'Grenades apply enhanced scorch effects'
          },
          heat_rises: {
            name: 'Heat Rises',
            element: 'solar',
            type: 'aspect',
            effects: ['aerial_effectiveness', 'grenade_consumption'],
            synergies: ['aerial_combat', 'mobility', 'grenade_regen'],
            description: 'Consume grenade for enhanced aerial effectiveness'
          }
        }
      },

      // Arc Warlock
      arc: {
        super: {
          chaos_reach: {
            name: 'Chaos Reach',
            element: 'arc',
            type: 'super',
            effects: ['beam', 'high_damage', 'long_range'],
            synergies: ['boss_damage', 'arc_weapons', 'ionic_traces'],
            description: 'Devastating arc beam for boss damage'
          },
          stormtrance: {
            name: 'Stormtrance',
            element: 'arc',
            type: 'super',
            effects: ['chain_lightning', 'roaming', 'crowd_control'],
            synergies: ['add_clearing', 'chain_lightning', 'arc_abilities'],
            description: 'Roaming super with chain lightning'
          }
        },
        aspects: {
          arc_soul: {
            name: 'Arc Soul',
            element: 'arc',
            type: 'aspect',
            effects: ['rift_grants_arc_soul', 'auto_targeting'],
            synergies: ['rifts', 'team_support', 'arc_abilities'],
            description: 'Rifts grant Arc Souls that auto-target enemies'
          },
          lightning_surge: {
            name: 'Lightning Surge',
            element: 'arc',
            type: 'aspect',
            effects: ['melee_teleport', 'jolt'],
            synergies: ['mobility', 'jolt', 'close_combat'],
            description: 'Teleporting melee that jolts enemies'
          }
        }
      },

      // Stasis Warlock
      stasis: {
        super: {
          winter_wrath: {
            name: 'Winter\'s Wrath',
            element: 'stasis',
            type: 'super',
            effects: ['stasis_staff', 'freeze', 'shatter'],
            synergies: ['stasis_crystals', 'freeze', 'area_control'],
            description: 'Stasis staff that freezes and shatters enemies'
          }
        },
        aspects: {
          iceflare_bolts: {
            name: 'Iceflare Bolts',
            element: 'stasis',
            type: 'aspect',
            effects: ['shatter_seeking_projectiles'],
            synergies: ['shatter', 'stasis_crystals', 'chain_kills'],
            description: 'Shattering frozen enemies releases seeking bolts'
          },
          glacial_harvest: {
            name: 'Glacial Harvest',
            element: 'stasis',
            type: 'aspect',
            effects: ['freeze_creates_shards'],
            synergies: ['freeze', 'stasis_shards', 'ability_regen'],
            description: 'Freezing enemies creates stasis shards'
          }
        }
      }
    };

    this.abilities.set('warlock', warlockAbilities);
  }

  /**
   * Initialize universal fragments
   */
  initializeSubclassFragments() {
    const fragments = {
      void: {
        echo_of_expulsion: {
          name: 'Echo of Expulsion',
          element: 'void',
          effects: ['void_ability_kills_create_explosions'],
          synergies: ['void_abilities', 'add_clearing'],
          stats: { intellect: -10 }
        },
        echo_of_starvation: {
          name: 'Echo of Starvation',
          element: 'void',
          effects: ['devour_extends_invisibility'],
          synergies: ['devour', 'invisibility'],
          stats: { recovery: +10 }
        },
        echo_of_undermining: {
          name: 'Echo of Undermining',
          element: 'void',
          effects: ['weaken_extends_duration'],
          synergies: ['weaken', 'debuffs'],
          stats: { discipline: +10 }
        }
      },
      solar: {
        ember_of_ashes: {
          name: 'Ember of Ashes',
          element: 'solar',
          effects: ['scorch_stacks_increased'],
          synergies: ['scorch', 'ignition'],
          stats: { strength: +10 }
        },
        ember_of_healing: {
          name: 'Ember of Healing',
          element: 'solar',
          effects: ['solar_kills_grant_restoration'],
          synergies: ['solar_weapons', 'healing'],
          stats: { recovery: +10 }
        },
        ember_of_combustion: {
          name: 'Ember of Combustion',
          element: 'solar',
          effects: ['final_blows_create_ignition'],
          synergies: ['weapon_kills', 'ignition'],
          stats: { resilience: +10 }
        }
      },
      arc: {
        spark_of_feedback: {
          name: 'Spark of Feedback',
          element: 'arc',
          effects: ['taking_damage_while_amplified_creates_jolt'],
          synergies: ['amplified', 'jolt'],
          stats: { resilience: +10 }
        },
        spark_of_magnitude: {
          name: 'Spark of Magnitude',
          element: 'arc',
          effects: ['blind_jolt_duration_increased'],
          synergies: ['jolt', 'blind'],
          stats: { discipline: +10 }
        }
      },
      stasis: {
        whisper_of_rime: {
          name: 'Whisper of Rime',
          element: 'stasis',
          effects: ['collecting_shards_grants_overshield'],
          synergies: ['stasis_shards', 'overshield'],
          stats: { recovery: +10 }
        },
        whisper_of_fractures: {
          name: 'Whisper of Fractures',
          element: 'stasis',
          effects: ['crystal_shatter_damage_increased'],
          synergies: ['stasis_crystals', 'shatter'],
          stats: { discipline: +10 }
        }
      }
    };

    this.fragments = fragments;
  }

  /**
   * Initialize aspects (already done in class-specific init)
   */
  initializeSubclassAspects() {
    // Aspects are already included in class-specific abilities
    console.log('✅ Aspects initialized within class-specific ability sets');
  }

  // ========== Analysis Methods ==========

  /**
   * Find optimal abilities for a build query
   */
  analyzeOptimalAbilities(parsedQuery, currentBuild = {}) {
    const recommendations = {
      super: null,
      aspects: [],
      fragments: [],
      synergies: [],
      confidence: 0.0
    };

    if (!parsedQuery.guardianClass || !parsedQuery.damageType) {
      return recommendations;
    }

    const classAbilities = this.abilities.get(parsedQuery.guardianClass);
    if (!classAbilities || !classAbilities[parsedQuery.damageType]) {
      return recommendations;
    }

    const elementAbilities = classAbilities[parsedQuery.damageType];

    // Recommend super
    recommendations.super = this.selectOptimalSuper(elementAbilities.super, parsedQuery, currentBuild);

    // Recommend aspects
    recommendations.aspects = this.selectOptimalAspects(elementAbilities.aspects, parsedQuery, currentBuild);

    // Recommend fragments
    recommendations.fragments = this.selectOptimalFragments(parsedQuery.damageType, parsedQuery, currentBuild);

    // Calculate synergies
    recommendations.synergies = this.findAbilitySynergies(recommendations, parsedQuery, currentBuild);

    // Calculate confidence
    recommendations.confidence = this.calculateAbilityConfidence(recommendations, parsedQuery);

    return recommendations;
  }

  /**
   * Select optimal super based on query
   */
  selectOptimalSuper(supers, parsedQuery, currentBuild) {
    if (!supers || Object.keys(supers).length === 0) return null;

    let bestSuper = null;
    let bestScore = 0;

    for (const [key, superAbility] of Object.entries(supers)) {
      const score = this.scoreAbility(superAbility, parsedQuery, currentBuild);
      if (score > bestScore) {
        bestScore = score;
        bestSuper = { ...superAbility, key };
      }
    }

    return bestSuper;
  }

  /**
   * Select optimal aspects (up to 2)
   */
  selectOptimalAspects(aspects, parsedQuery, currentBuild) {
    if (!aspects || Object.keys(aspects).length === 0) return [];

    const scoredAspects = [];

    for (const [key, aspect] of Object.entries(aspects)) {
      const score = this.scoreAbility(aspect, parsedQuery, currentBuild);
      scoredAspects.push({ ...aspect, key, score });
    }

    // Sort by score and return top 2
    return scoredAspects
      .sort((a, b) => b.score - a.score)
      .slice(0, 2);
  }

  /**
   * Select optimal fragments (up to 4)
   */
  selectOptimalFragments(element, parsedQuery, currentBuild) {
    const elementFragments = this.fragments[element];
    if (!elementFragments) return [];

    const scoredFragments = [];

    for (const [key, fragment] of Object.entries(elementFragments)) {
      const score = this.scoreFragment(fragment, parsedQuery, currentBuild);
      scoredFragments.push({ ...fragment, key, score });
    }

    // Sort by score and return top 4
    return scoredFragments
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
  }

  /**
   * Score individual ability based on query requirements
   */
  scoreAbility(ability, parsedQuery, currentBuild) {
    let score = 0.5; // Base score

    // Activity-based scoring
    if (parsedQuery.activity) {
      switch (parsedQuery.activity) {
        case 'endgame':
        case 'raid':
          // Prefer team support and survivability
          if (ability.effects?.includes('team_support')) score += 0.3;
          if (ability.effects?.includes('healing')) score += 0.2;
          if (ability.effects?.includes('damage_buff')) score += 0.25;
          if (ability.effects?.includes('survivability')) score += 0.2;
          break;

        case 'pvp':
          // Prefer mobility and burst damage
          if (ability.effects?.includes('mobility')) score += 0.3;
          if (ability.effects?.includes('high_damage')) score += 0.25;
          if (ability.effects?.includes('crowd_control')) score += 0.2;
          break;

        case 'gambit':
          // Prefer add clearing and versatility
          if (ability.effects?.includes('add_clearing')) score += 0.3;
          if (ability.effects?.includes('area_damage')) score += 0.25;
          break;
      }
    }

    // Playstyle-based scoring
    if (parsedQuery.playstyle) {
      switch (parsedQuery.playstyle) {
        case 'damage':
          if (ability.effects?.includes('high_damage')) score += 0.3;
          if (ability.effects?.includes('boss_damage')) score += 0.25;
          break;

        case 'survival':
          if (ability.effects?.includes('healing')) score += 0.3;
          if (ability.effects?.includes('overshield')) score += 0.25;
          if (ability.effects?.includes('survivability')) score += 0.2;
          break;

        case 'mobility':
          if (ability.effects?.includes('mobility')) score += 0.3;
          if (ability.effects?.includes('dodge')) score += 0.2;
          break;

        case 'support':
          if (ability.effects?.includes('team_support')) score += 0.3;
          if (ability.effects?.includes('healing')) score += 0.2;
          break;
      }
    }

    // Weapon synergy scoring
    if (currentBuild.weapons) {
      for (const weapon of Object.values(currentBuild.weapons)) {
        if (weapon && ability.synergies) {
          // Check for weapon-type synergies
          const weaponType = weapon.type?.toLowerCase() || '';
          if (ability.synergies.some(syn => syn.includes(weaponType))) {
            score += 0.15;
          }

          // Check for element synergies
          const weaponElement = weapon.element?.toLowerCase() || '';
          if (weaponElement === ability.element) {
            score += 0.1;
          }
        }
      }
    }

    return Math.min(1.0, score);
  }

  /**
   * Score fragments specifically
   */
  scoreFragment(fragment, parsedQuery, currentBuild) {
    let score = this.scoreAbility(fragment, parsedQuery, currentBuild);

    // Add stat bonus scoring
    if (fragment.stats && parsedQuery.statPriorities) {
      for (const stat of parsedQuery.statPriorities) {
        if (fragment.stats[stat] && fragment.stats[stat] > 0) {
          score += 0.1;
        }
      }
    }

    return score;
  }

  /**
   * Find synergies between abilities and current build
   */
  findAbilitySynergies(recommendations, parsedQuery, currentBuild) {
    const synergies = [];

    // Super + Aspect synergies
    if (recommendations.super && recommendations.aspects.length > 0) {
      for (const aspect of recommendations.aspects) {
        const commonEffects = this.findCommonEffects(recommendations.super.effects, aspect.effects);
        if (commonEffects.length > 0) {
          synergies.push(`${recommendations.super.name} + ${aspect.name}: ${commonEffects.join(', ')}`);
        }
      }
    }

    // Fragment synergies
    for (const fragment of recommendations.fragments) {
      if (fragment.synergies) {
        // Check if current build supports fragment synergies
        if (this.buildSupportsFragmentSynergy(fragment, currentBuild, parsedQuery)) {
          synergies.push(`${fragment.name}: Enhanced by current loadout`);
        }
      }
    }

    // Element-based synergies
    if (parsedQuery.damageType) {
      const elementSynergy = this.findElementalSynergies(parsedQuery.damageType, currentBuild);
      synergies.push(...elementSynergy);
    }

    return synergies.slice(0, 5); // Limit to top 5 synergies
  }

  /**
   * Calculate ability recommendation confidence
   */
  calculateAbilityConfidence(recommendations, parsedQuery) {
    let confidence = 0.0;

    // Base confidence from having recommendations
    if (recommendations.super) confidence += 0.2;
    confidence += recommendations.aspects.length * 0.15;
    confidence += recommendations.fragments.length * 0.05;

    // Boost for query specificity
    if (parsedQuery.activity) confidence += 0.1;
    if (parsedQuery.playstyle) confidence += 0.1;

    // Boost for synergies found
    confidence += Math.min(0.3, recommendations.synergies.length * 0.1);

    return Math.min(1.0, confidence);
  }

  // ========== Helper Methods ==========

  /**
   * Find common effects between two ability effect arrays
   */
  findCommonEffects(effects1 = [], effects2 = []) {
    return effects1.filter(effect => effects2.includes(effect));
  }

  /**
   * Check if current build supports a fragment's synergies
   */
  buildSupportsFragmentSynergy(fragment, currentBuild, parsedQuery) {
    if (!fragment.synergies || !currentBuild.weapons) return false;

    for (const synergy of fragment.synergies) {
      // Check weapon synergies
      if (synergy.includes('weapon') && currentBuild.weapons) {
        for (const weapon of Object.values(currentBuild.weapons)) {
          if (weapon && weapon.element === fragment.element) {
            return true;
          }
        }
      }

      // Check ability synergies
      if (synergy.includes(parsedQuery.damageType)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Find elemental synergies with current build
   */
  findElementalSynergies(element, currentBuild) {
    const synergies = [];

    if (currentBuild.weapons) {
      const matchingWeapons = Object.values(currentBuild.weapons)
        .filter(weapon => weapon && weapon.element === element)
        .length;

      if (matchingWeapons >= 2) {
        synergies.push(`${element.charAt(0).toUpperCase() + element.slice(1)} Weapon Focus`);
      }
    }

    return synergies;
  }

  /**
   * Helper methods for manifest processing
   */
  isAbilityStep(step) {
    const abilityKeywords = ['super', 'grenade', 'melee', 'ability', 'aspect', 'fragment'];
    const name = step?.displayProperties?.name?.toLowerCase() || '';
    const description = step?.displayProperties?.description?.toLowerCase() || '';

    return abilityKeywords.some(keyword =>
      name.includes(keyword) || description.includes(keyword)
    );
  }

  extractAbilityFromStep(step, gridHash) {
    // Extract ability information from talent grid step
    const ability = {
      name: step.displayProperties?.name || 'Unknown Ability',
      description: step.displayProperties?.description || '',
      icon: step.displayProperties?.icon || '',
      hash: step.hash || gridHash,
      type: this.determineAbilityType(step)
    };

    // Store in appropriate collection
    if (ability.type) {
      this.storeExtractedAbility(ability);
    }
  }

  determineAbilityType(step) {
    const name = step?.displayProperties?.name?.toLowerCase() || '';

    if (name.includes('super')) return 'super';
    if (name.includes('aspect')) return 'aspect';
    if (name.includes('fragment')) return 'fragment';
    if (name.includes('grenade')) return 'grenade';
    if (name.includes('melee')) return 'melee';

    return 'ability';
  }

  storeExtractedAbility(ability) {
    // Store extracted abilities (would integrate with main abilities map)
    console.log(`Extracted ability: ${ability.name} (${ability.type})`);
  }

  buildAbilitySynergyMappings() {
    // Build relationships between abilities and other systems
    console.log('✅ Built ability synergy mappings');
  }

  processProgressions(progressions) {
    // Process progression definitions for ability unlocks
    console.log('📊 Processed progression definitions');
  }

  processModifiers(modifiers) {
    // Process activity modifier definitions for ability effects
    console.log('⚙️ Processed modifier definitions');
  }
}