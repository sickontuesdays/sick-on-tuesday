/**
 * Build Analyzer - Comprehensive intelligent analysis system for Destiny 2 builds
 * Uses trait-based synergy detection, abilities, mods, exotics, and natural language processing
 */

import { AbilitiesAnalyzer } from '../analyzers/abilities-analyzer.js';
import { ModAnalyzer } from '../analyzers/mod-analyzer.js';
import { ExoticAnalyzer } from '../analyzers/exotic-analyzer.js';
import { ComprehensiveSynergyEngine } from './comprehensive-synergy-engine.js';

export class BuildAnalyzer {
  constructor(manifestLoader) {
    this.loader = manifestLoader;
    this.synergyCache = new Map();
    this.analysisReady = false;
    this.curatedBuilds = new Map();

    // Initialize comprehensive analyzer modules
    this.abilitiesAnalyzer = null;
    this.modAnalyzer = null;
    this.exoticAnalyzer = null;
    this.synergyEngine = null;

    // Initialize curated build templates
    this.initializeCuratedBuilds();
  }

  /**
   * Initialize analyzer with manifest data
   */
  async initialize() {
    try {
      console.log('Initializing Comprehensive Build Analyzer...');

      // Load essential data immediately
      const { essential, analysisPromise } = await this.loader.initialize();
      this.essentialData = essential;

      console.log('Essential data loaded, initializing analyzer modules...');

      // Initialize all analyzer modules with essential data
      this.abilitiesAnalyzer = new AbilitiesAnalyzer(this.essentialData);
      this.modAnalyzer = new ModAnalyzer(this.essentialData);
      this.exoticAnalyzer = new ExoticAnalyzer(this.essentialData);

      console.log('Analyzer modules initialized, building initial synergy graph...');

      // Start building synergy graph in background when analysis data is ready
      if (analysisPromise) {
        analysisPromise.then(analysisData => {
          this.analysisData = analysisData;

          // Initialize comprehensive synergy engine with all data
          this.synergyEngine = new ComprehensiveSynergyEngine(
            this.essentialData,
            analysisData,
            this.abilitiesAnalyzer,
            this.modAnalyzer,
            this.exoticAnalyzer
          );

          this.buildSynergyGraph();
          this.analysisReady = true;
          console.log('Comprehensive Build Analyzer fully initialized');
        }).catch(error => {
          console.warn('Analysis data failed to load, using curated builds with basic analyzers:', error);
          // Still initialize synergy engine with available data
          this.synergyEngine = new ComprehensiveSynergyEngine(
            this.essentialData,
            {},
            this.abilitiesAnalyzer,
            this.modAnalyzer,
            this.exoticAnalyzer
          );
        });
      }

      return true;
    } catch (error) {
      console.error('Failed to initialize Comprehensive Build Analyzer:', error);
      throw error;
    }
  }

  // ========== Build Generation ==========

  /**
   * Generate comprehensive build based on user query
   */
  async generateBuild(query, preferences = {}) {
    const parsedQuery = this.parseQuery(query);

    // Check if we have comprehensive analysis capability
    const hasAnalysisData = this.analysisData && Object.keys(this.analysisData.perks || {}).length > 0;
    const hasEssentialData = this.essentialData && Object.keys(this.essentialData.traits || {}).length > 0;
    const hasComprehensiveSystem = this.synergyEngine && this.abilitiesAnalyzer && this.modAnalyzer && this.exoticAnalyzer;

    if (hasAnalysisData && hasEssentialData && hasComprehensiveSystem) {
      try {
        console.log('🧠 Using comprehensive build generation with full system');

        // Generate comprehensive build using new system
        const comprehensiveBuild = await this.generateComprehensiveBuild(parsedQuery, preferences);

        if (comprehensiveBuild && comprehensiveBuild.confidence > 0.6) {
          console.log(`✅ Generated comprehensive build: ${comprehensiveBuild.name} (${Math.round(comprehensiveBuild.confidence * 100)}% confidence)`);
          return comprehensiveBuild;
        }
      } catch (error) {
        console.warn('⚠️ Comprehensive generation failed, trying intelligent fallback:', error);
      }
    }

    // Fallback to original intelligent system
    if (hasAnalysisData && hasEssentialData) {
      try {
        console.log('🧠 Using original intelligent build generation');

        // Determine what item chunks we need
        const requiredChunks = this.determineRequiredChunks(parsedQuery);

        // Load required item data
        const itemChunks = await this.loader.loadItemChunks(requiredChunks);

        // Filter items by user constraints
        const candidateItems = this.filterCandidateItems(itemChunks, parsedQuery, preferences);

        // Generate optimized build combinations
        const builds = this.generateOptimizedBuilds(candidateItems, parsedQuery, preferences);

        if (builds.length > 0) {
          console.log(`✅ Generated intelligent build: ${builds[0].name} (${Math.round(builds[0].confidence * 100)}% confidence)`);
          return builds[0];
        }
      } catch (error) {
        console.warn('⚠️ Intelligent generation failed, falling back:', error);
      }
    }

    // Enhanced fallback using available data
    console.log('📋 Using enhanced curated build');
    return this.getEnhancedCuratedBuild(parsedQuery, preferences);
  }

  // ========== Natural Language Processing ==========

  /**
   * Parse user query into structured requirements
   */
  parseQuery(query) {
    const normalized = query.toLowerCase().trim();
    const parsed = {
      guardianClass: null,
      damageType: null,
      activity: null,
      playstyle: null,
      weaponTypes: [],
      statPriorities: [],
      traits: [],
      keywords: []
    };

    // Extract guardian class
    if (normalized.includes('hunter')) parsed.guardianClass = 'hunter';
    else if (normalized.includes('titan')) parsed.guardianClass = 'titan';
    else if (normalized.includes('warlock')) parsed.guardianClass = 'warlock';

    // Extract damage type/element
    if (normalized.includes('void')) parsed.damageType = 'void';
    else if (normalized.includes('solar')) parsed.damageType = 'solar';
    else if (normalized.includes('arc')) parsed.damageType = 'arc';
    else if (normalized.includes('stasis')) parsed.damageType = 'stasis';
    else if (normalized.includes('strand')) parsed.damageType = 'strand';

    // Extract activity type (enhanced with specific raid names)
    if (normalized.includes('raid') || normalized.includes('dungeon') ||
        normalized.includes('root of nightmares') || normalized.includes('king\'s fall') ||
        normalized.includes('vow of the disciple') || normalized.includes('deep stone crypt') ||
        normalized.includes('last wish') || normalized.includes('garden of salvation')) {
      parsed.activity = 'raid';
      parsed.statPriorities.push('resilience', 'recovery', 'damage');
    } else if (normalized.includes('grandmaster') || normalized.includes('gm') ||
               normalized.includes('master nightfall') || normalized.includes('nightfall')) {
      parsed.activity = 'grandmaster';
      parsed.statPriorities.push('resilience', 'recovery', 'range');
    } else if (normalized.includes('pvp') || normalized.includes('crucible') || normalized.includes('trials')) {
      parsed.activity = 'pvp';
      parsed.statPriorities.push('mobility', 'recovery', 'handling');
    } else if (normalized.includes('gambit')) {
      parsed.activity = 'gambit';
      parsed.statPriorities.push('range', 'damage', 'reload');
    } else if (normalized.includes('dungeon') || normalized.includes('spire') ||
               normalized.includes('prophecy') || normalized.includes('pit')) {
      parsed.activity = 'dungeon';
      parsed.statPriorities.push('resilience', 'recovery', 'damage');
    }

    // Extract playstyle (enhanced with missing keywords)
    if (normalized.includes('ad clear') || normalized.includes('add clear') ||
        normalized.includes('crowd control') || normalized.includes('trash mob') ||
        normalized.includes('clearing ads') || normalized.includes('mob control')) {
      parsed.playstyle = 'ad_clear';
      parsed.statPriorities.push('range', 'reload', 'stability');
      parsed.keywords.push('explosive', 'aoe', 'crowd_control');
    } else if (normalized.includes('sneaky') || normalized.includes('stealth') ||
               normalized.includes('invisible') || normalized.includes('invis') ||
               normalized.includes('invisibility') || normalized.includes('sneak')) {
      parsed.playstyle = 'stealth';
      parsed.statPriorities.push('mobility', 'recovery', 'handling');
      parsed.keywords.push('void', 'invisibility', 'smoke', 'dodge');
    } else if (normalized.includes('reviving') || normalized.includes('revive') ||
               normalized.includes('resurrect') || normalized.includes('rescue') ||
               normalized.includes('res teammates') || normalized.includes('saving')) {
      parsed.playstyle = 'support_revive';
      parsed.statPriorities.push('resilience', 'recovery', 'mobility');
      parsed.keywords.push('invisibility', 'overshield', 'healing', 'protection');
    } else if (normalized.includes('dps') || normalized.includes('damage') ||
               normalized.includes('boss') || normalized.includes('single target')) {
      parsed.playstyle = 'boss_damage';
      parsed.statPriorities.push('impact', 'range', 'stability');
      parsed.keywords.push('precision', 'heavy', 'exotic');
    } else if (normalized.includes('tank') || normalized.includes('survive') ||
               normalized.includes('defensive') || normalized.includes('bubble')) {
      parsed.playstyle = 'tank';
      parsed.statPriorities.push('resilience', 'recovery');
      parsed.keywords.push('overshield', 'barrier', 'protection');
    } else if (normalized.includes('support') || normalized.includes('heal') ||
               normalized.includes('buff') || normalized.includes('well')) {
      parsed.playstyle = 'support_healing';
      parsed.statPriorities.push('intellect', 'discipline', 'strength');
      parsed.keywords.push('healing', 'buff', 'team');
    } else if (normalized.includes('speed') || normalized.includes('mobility') ||
               normalized.includes('fast') || normalized.includes('sprint')) {
      parsed.playstyle = 'mobility';
      parsed.statPriorities.push('mobility', 'handling', 'reload');
      parsed.keywords.push('lightweight', 'handling', 'movement');
    }

    // Extract weapon preferences
    const weaponKeywords = {
      'hand cannon': 'handcannon',
      'auto rifle': 'autorifle',
      'pulse rifle': 'pulserifle',
      'scout rifle': 'scoutrifle',
      'fusion rifle': 'fusionrifle',
      'sniper rifle': 'sniperrifle',
      'linear fusion': 'linearfusion',
      'rocket launcher': 'rocketlauncher',
      'grenade launcher': 'grenadelauncher',
      'machine gun': 'machinegun',
      'shotgun': 'shotgun',
      'sidearm': 'sidearm',
      'submachine gun': 'submachinegun',
      'bow': 'bow',
      'sword': 'sword',
      'glaive': 'glaive'
    };

    for (const [keyword, type] of Object.entries(weaponKeywords)) {
      if (normalized.includes(keyword)) {
        parsed.weaponTypes.push(type);
      }
    }

    // Extract trait keywords
    if (this.essentialData?.traits) {
      for (const [traitHash, trait] of Object.entries(this.essentialData.traits)) {
        const traitName = trait.displayProperties?.name?.toLowerCase();
        if (traitName && normalized.includes(traitName)) {
          parsed.traits.push({
            hash: traitHash,
            name: traitName,
            confidence: 0.9
          });
        }
      }
    }

    // Store original query for reference
    parsed.originalQuery = query;
    parsed.keywords = normalized.split(/\s+/).filter(word => word.length > 2);

    return parsed;
  }

  // ========== Comprehensive Build Generation ==========

  /**
   * Generate comprehensive build using all analyzer modules
   */
  async generateComprehensiveBuild(parsedQuery, preferences = {}) {
    try {
      console.log('🔬 Starting comprehensive build analysis...');

      // Step 1: Determine what item chunks we need
      const requiredChunks = this.determineRequiredChunks(parsedQuery);
      console.log(`📦 Loading required chunks: ${requiredChunks.join(', ')}`);

      // Step 2: Load required item data
      const itemChunks = await this.loader.loadItemChunks(requiredChunks);

      // Step 3: Filter items by user constraints
      const candidateItems = this.filterCandidateItems(itemChunks, parsedQuery, preferences);

      // Step 4: Analyze optimal abilities
      console.log('⚡ Analyzing optimal abilities...');
      const abilitiesRecommendation = this.abilitiesAnalyzer.analyzeOptimalAbilities(parsedQuery, candidateItems);

      // Step 5: Analyze optimal mods
      console.log('🔧 Analyzing optimal mods...');
      const modsRecommendation = this.modAnalyzer.analyzeOptimalMods(parsedQuery, candidateItems);

      // Step 6: Analyze optimal exotic
      console.log('⭐ Analyzing optimal exotics...');
      const exoticsRecommendation = this.exoticAnalyzer.analyzeOptimalExotic(parsedQuery, candidateItems);

      // Step 7: Generate weapon/armor combinations
      console.log('⚔️ Generating weapon/armor combinations...');
      const builds = this.generateOptimizedBuilds(candidateItems, parsedQuery, preferences);
      const baseBuild = builds[0] || this.createFallbackBuild(parsedQuery);

      // Step 8: Combine everything into comprehensive build
      const comprehensiveBuild = {
        ...baseBuild,

        // Add comprehensive components
        abilities: abilitiesRecommendation,
        mods: modsRecommendation,
        exotics: exoticsRecommendation,

        // Enhanced stats combining all systems
        enhancedStats: this.calculateComprehensiveStats(baseBuild, abilitiesRecommendation, modsRecommendation),

        // Calculate comprehensive synergies
        comprehensiveSynergies: await this.synergyEngine.analyzeComprehensiveBuild({
          weapons: baseBuild.weapons,
          armor: baseBuild.armor || {},
          abilities: abilitiesRecommendation,
          mods: modsRecommendation,
          exotics: exoticsRecommendation
        }, parsedQuery),

        // Updated metadata
        source: 'comprehensive_analysis',
        analyzedComponents: {
          weapons: true,
          armor: true,
          abilities: true,
          mods: true,
          exotics: true
        }
      };

      // Step 9: Calculate final confidence score
      comprehensiveBuild.confidence = this.calculateComprehensiveConfidence(comprehensiveBuild, parsedQuery);

      console.log(`✅ Generated comprehensive build with ${Math.round(comprehensiveBuild.confidence * 100)}% confidence`);
      return comprehensiveBuild;

    } catch (error) {
      console.error('❌ Comprehensive build generation failed:', error);
      throw error;
    }
  }

  /**
   * Calculate comprehensive stats from all build components
   */
  calculateComprehensiveStats(baseBuild, abilities, mods) {
    const stats = {
      mobility: 50,
      resilience: 50,
      recovery: 50,
      discipline: 50,
      intellect: 50,
      strength: 50
    };

    // Add base armor stats if available
    if (baseBuild.stats) {
      Object.assign(stats, baseBuild.stats);
    }

    // Add ability stat bonuses
    if (abilities.statBonuses) {
      for (const [stat, bonus] of Object.entries(abilities.statBonuses)) {
        stats[stat] = Math.min(100, stats[stat] + bonus);
      }
    }

    // Add mod stat bonuses
    if (mods.statBonuses) {
      for (const [stat, bonus] of Object.entries(mods.statBonuses)) {
        stats[stat] = Math.min(100, stats[stat] + bonus);
      }
    }

    return stats;
  }

  /**
   * Calculate overall confidence for comprehensive build
   */
  calculateComprehensiveConfidence(build, parsedQuery) {
    let confidence = 0.5; // Base confidence

    // Factor in base build confidence
    if (build.confidence) {
      confidence += build.confidence * 0.3;
    }

    // Factor in abilities confidence
    if (build.abilities && build.abilities.confidence) {
      confidence += build.abilities.confidence * 0.2;
    }

    // Factor in mods confidence
    if (build.mods && build.mods.confidence) {
      confidence += build.mods.confidence * 0.2;
    }

    // Factor in exotics confidence
    if (build.exotics && build.exotics.confidence) {
      confidence += build.exotics.confidence * 0.15;
    }

    // Factor in synergies confidence
    if (build.comprehensiveSynergies && build.comprehensiveSynergies.confidence) {
      confidence += build.comprehensiveSynergies.confidence * 0.15;
    }

    return Math.min(0.95, confidence);
  }

  /**
   * Create fallback build when optimization fails
   */
  createFallbackBuild(parsedQuery) {
    return {
      name: this.generateBuildName(parsedQuery),
      description: 'Comprehensive build based on query analysis',
      weapons: {
        kinetic: { name: 'Primary Weapon', type: 'Primary' },
        energy: { name: 'Special Weapon', type: 'Special' },
        power: { name: 'Heavy Weapon', type: 'Heavy' }
      },
      confidence: 0.4,
      source: 'fallback'
    };
  }

  // ========== Synergy Analysis ==========

  /**
   * Build synergy graph from manifest data
   */
  buildSynergyGraph() {
    if (!this.analysisData?.perks || !this.essentialData?.traits) {
      console.warn('Missing data for synergy graph construction');
      return;
    }

    console.log('Building synergy graph...');
    let synergyCount = 0;

    for (const [perkHash, perk] of Object.entries(this.analysisData.perks)) {
      const description = perk.displayProperties?.description || '';
      if (description.length < 10) continue;

      const relatedTraits = this.findTraitsInText(description);

      if (relatedTraits.length > 0) {
        this.synergyCache.set(perkHash, {
          perk,
          traits: relatedTraits,
          confidence: this.calculateSynergyConfidence(perk, relatedTraits, description),
          patterns: this.extractPatterns(description)
        });
        synergyCount++;
      }
    }

    console.log(`Built synergy graph with ${synergyCount} synergies`);
  }

  /**
   * Find trait keywords in perk descriptions
   */
  findTraitsInText(text) {
    if (!this.essentialData?.traits) return [];

    const found = [];
    const normalized = text.toLowerCase();

    for (const [traitHash, trait] of Object.entries(this.essentialData.traits)) {
      const traitName = trait.displayProperties?.name?.toLowerCase();
      if (!traitName || traitName.length < 3) continue;

      // Look for exact matches and partial matches
      if (normalized.includes(traitName)) {
        found.push({
          hash: traitHash,
          name: traitName,
          trait,
          matchType: 'exact'
        });
      }
      // Also check for keyword variants (e.g., "void" matches "volatile")
      else if (this.isTraitVariant(traitName, normalized)) {
        found.push({
          hash: traitHash,
          name: traitName,
          trait,
          matchType: 'variant'
        });
      }
    }

    return found;
  }

  /**
   * Check if text contains trait variants
   */
  isTraitVariant(traitName, text) {
    // Define common trait families
    const traitFamilies = {
      void: ['void', 'volatile', 'suppression', 'weaken', 'devour'],
      solar: ['solar', 'scorch', 'ignition', 'radiant', 'restoration'],
      arc: ['arc', 'jolt', 'blind', 'amplified', 'ionic'],
      stasis: ['stasis', 'slow', 'freeze', 'shatter', 'crystal'],
      strand: ['strand', 'sever', 'unraveling', 'tangle', 'threadling']
    };

    for (const [family, variants] of Object.entries(traitFamilies)) {
      if (variants.includes(traitName)) {
        return variants.some(variant => text.includes(variant));
      }
    }

    return false;
  }

  /**
   * Calculate confidence score for synergy
   */
  calculateSynergyConfidence(perk, traits, description) {
    let confidence = 0.0;

    // Base confidence from trait matches
    confidence += traits.length * 0.3;

    // Bonus for exact trait names
    const exactMatches = traits.filter(t => t.matchType === 'exact').length;
    confidence += exactMatches * 0.2;

    // Bonus for trigger words
    const triggerWords = ['when', 'grants', 'increases', 'while', 'after'];
    const triggerCount = triggerWords.filter(word => description.toLowerCase().includes(word)).length;
    confidence += triggerCount * 0.1;

    // Bonus for effect words
    const effectWords = ['damage', 'bonus', 'buff', 'debuff', 'enhanced'];
    const effectCount = effectWords.filter(word => description.toLowerCase().includes(word)).length;
    confidence += effectCount * 0.05;

    return Math.min(1.0, confidence);
  }

  /**
   * Extract synergy patterns from descriptions
   */
  extractPatterns(description) {
    const patterns = [];
    const text = description.toLowerCase();

    // Pattern: "When X, Y gains Z"
    const triggerPattern = /when\s+([^,]+),\s*([^.]+)\s+(gains?|increases?|grants?)\s+([^.]+)/gi;
    let match;
    while ((match = triggerPattern.exec(text)) !== null) {
      patterns.push({
        type: 'conditional',
        trigger: match[1],
        effect: match[4],
        target: match[2]
      });
    }

    // Pattern: "X weapons deal Y damage"
    const weaponPattern = /(\w+)\s+weapons?\s+(deal|gain|have)\s+([^.]+)/gi;
    while ((match = weaponPattern.exec(text)) !== null) {
      patterns.push({
        type: 'weapon_bonus',
        weaponType: match[1],
        effect: match[3]
      });
    }

    return patterns;
  }

  // ========== Build Optimization ==========

  /**
   * Determine what item chunks are needed for the query
   */
  determineRequiredChunks(parsedQuery) {
    const chunks = ['weapons']; // Always need weapons

    // Add armor if not weapon-only query
    if (!parsedQuery.weaponTypes.length || parsedQuery.statPriorities.length) {
      chunks.push('armor');
    }

    // Add consumables for mods if building for endgame
    if (parsedQuery.activity === 'endgame' || parsedQuery.playstyle === 'survival') {
      chunks.push('consumables');
    }

    return chunks;
  }

  /**
   * Filter items based on user constraints
   */
  filterCandidateItems(itemChunks, parsedQuery, preferences) {
    const candidates = {
      kinetic: [],
      energy: [],
      power: [],
      helmet: [],
      gauntlets: [],
      chest: [],
      legs: [],
      classItem: []
    };

    // Process weapons
    if (itemChunks.weapons) {
      this.categorizeWeapons(itemChunks.weapons, candidates, parsedQuery, preferences);
    }

    // Process armor
    if (itemChunks.armor) {
      this.categorizeArmor(itemChunks.armor, candidates, parsedQuery, preferences);
    }

    return candidates;
  }

  /**
   * Categorize weapons by slot and filter by preferences
   */
  categorizeWeapons(weaponsData, candidates, parsedQuery, preferences) {
    for (const [hash, weapon] of Object.entries(weaponsData)) {
      if (!weapon || !weapon.inventory) continue;

      // Apply filters
      if (preferences?.includeRare === false && weapon.inventory?.tierTypeName === 'Rare') continue;
      if (weapon.redacted || weapon.blacklisted) continue;

      // Determine slot
      const bucketHash = weapon.inventory.bucketTypeHash;
      let slot = null;

      if (bucketHash === 1498876634) slot = 'kinetic';  // Kinetic weapons
      else if (bucketHash === 2465295065) slot = 'energy';   // Energy weapons
      else if (bucketHash === 953998645) slot = 'power';     // Power weapons

      if (slot && candidates[slot]) {
        // Calculate score for this weapon
        const score = this.calculateWeaponScore(weapon, parsedQuery);
        candidates[slot].push({ ...weapon, hash, score });
      }
    }

    // Sort by score and limit results
    ['kinetic', 'energy', 'power'].forEach(slot => {
      candidates[slot].sort((a, b) => b.score - a.score);
      candidates[slot] = candidates[slot].slice(0, 20); // Limit for performance
    });
  }

  /**
   * Categorize armor by slot and filter by preferences
   */
  categorizeArmor(armorData, candidates, parsedQuery, preferences) {
    for (const [hash, armor] of Object.entries(armorData)) {
      if (!armor || !armor.inventory) continue;

      // Apply filters
      if (preferences?.includeRare === false && armor.inventory?.tierTypeName === 'Rare') continue;
      if (armor.redacted || armor.blacklisted) continue;

      // Filter by class if specified
      if (parsedQuery.guardianClass && !this.isArmorForClass(armor, parsedQuery.guardianClass)) {
        continue;
      }

      // Determine slot
      const bucketHash = armor.inventory.bucketTypeHash;
      let slot = null;

      if (bucketHash === 3448274439) slot = 'helmet';    // Helmet
      else if (bucketHash === 3551918588) slot = 'gauntlets'; // Gauntlets
      else if (bucketHash === 14239492) slot = 'chest';       // Chest armor
      else if (bucketHash === 20886954) slot = 'legs';        // Leg armor
      else if (bucketHash === 1585787867) slot = 'classItem'; // Class item

      if (slot && candidates[slot]) {
        const score = this.calculateArmorScore(armor, parsedQuery);
        candidates[slot].push({ ...armor, hash, score });
      }
    }

    // Sort by score and limit results
    ['helmet', 'gauntlets', 'chest', 'legs', 'classItem'].forEach(slot => {
      candidates[slot].sort((a, b) => b.score - a.score);
      candidates[slot] = candidates[slot].slice(0, 15); // Limit for performance
    });
  }

  /**
   * Calculate weapon relevance score (enhanced with playstyle-specific scoring)
   */
  calculateWeaponScore(weapon, parsedQuery) {
    let score = 0.5; // Start with lower base score to allow differentiation
    let contextMultiplier = 1.0;

    // Damage type matching
    if (parsedQuery.damageType) {
      const damageTypeHash = weapon.damageTypeHashes?.[0];
      if (this.matchesDamageType(damageTypeHash, parsedQuery.damageType)) {
        contextMultiplier += 0.5;
      }
    }

    // Weapon type matching
    if (parsedQuery.weaponTypes.length > 0) {
      const weaponType = this.getWeaponType(weapon);
      if (parsedQuery.weaponTypes.some(type => weaponType.includes(type))) {
        contextMultiplier += 0.7;
      }
    }

    // Playstyle-specific scoring (CRITICAL FOR DIVERSITY)
    contextMultiplier += this.getPlaystyleBonus(weapon, parsedQuery);

    // Activity-specific bonuses
    contextMultiplier += this.getActivityBonus(weapon, parsedQuery);

    // Synergy bonus (if analysis ready)
    if (this.analysisReady) {
      contextMultiplier += this.calculateSynergyScore(weapon) * 0.3;
    }

    // Add randomization to break ties and ensure diversity
    const randomFactor = 0.85 + (Math.random() * 0.3); // 0.85 - 1.15

    const finalScore = Math.min(1.0, score * contextMultiplier * randomFactor);
    return Math.max(0.1, finalScore); // Ensure minimum score
  }

  /**
   * Get playstyle-specific weapon bonus
   */
  getPlaystyleBonus(weapon, parsedQuery) {
    if (!parsedQuery.playstyle) return 0;

    const weaponName = weapon.displayProperties?.name?.toLowerCase() || '';
    const weaponDesc = weapon.displayProperties?.description?.toLowerCase() || '';
    const weaponType = this.getWeaponType(weapon)?.toLowerCase() || '';
    let bonus = 0;

    switch (parsedQuery.playstyle) {
      case 'ad_clear':
        // Favor weapons good for crowd control
        if (weaponType.includes('auto rifle') || weaponType.includes('pulse rifle')) bonus += 0.4;
        if (weaponType.includes('machine gun') || weaponType.includes('submachine gun')) bonus += 0.3;
        if (weaponName.includes('explosive') || weaponDesc.includes('explosive')) bonus += 0.5;
        if (weaponName.includes('dragonfly') || weaponDesc.includes('dragonfly')) bonus += 0.4;
        if (weaponName.includes('chain reaction') || weaponDesc.includes('chain reaction')) bonus += 0.5;
        // Specific weapons good for ad clear
        if (weaponName.includes('osteo striga') || weaponName.includes('riskrunner')) bonus += 0.6;
        break;

      case 'stealth':
        // Favor weapons that work well with stealth gameplay
        if (weaponType.includes('bow') || weaponType.includes('scout rifle')) bonus += 0.5;
        if (weaponType.includes('sniper rifle') || weaponType.includes('linear fusion')) bonus += 0.4;
        if (weaponName.includes('graviton lance') || weaponName.includes('le monarque')) bonus += 0.6;
        if (weaponDesc.includes('invisible') || weaponDesc.includes('stealth')) bonus += 0.7;
        // Void weapons for invisibility synergy
        if (parsedQuery.damageType === 'void' || weaponDesc.includes('void')) bonus += 0.3;
        break;

      case 'support_revive':
        // Favor weapons for support/reviving role
        if (weaponType.includes('scout rifle') || weaponType.includes('pulse rifle')) bonus += 0.4;
        if (weaponType.includes('bow') || weaponType.includes('hand cannon')) bonus += 0.3;
        if (weaponName.includes('polaris lance') || weaponName.includes('mida')) bonus += 0.5;
        // Range and safety priority for reviving
        if (weaponDesc.includes('range') || weaponDesc.includes('precision')) bonus += 0.2;
        break;

      case 'boss_damage':
        // Favor high single-target damage weapons
        if (weaponType.includes('linear fusion rifle') || weaponType.includes('rocket launcher')) bonus += 0.6;
        if (weaponType.includes('sniper rifle') || weaponType.includes('fusion rifle')) bonus += 0.4;
        if (weaponName.includes('sleeper simulant') || weaponName.includes('whisper')) bonus += 0.7;
        if (weaponName.includes('dragon\'s breath') || weaponName.includes('gjallarhorn')) bonus += 0.6;
        if (weapon.inventory?.tierTypeName === 'Exotic') bonus += 0.3;
        break;

      case 'tank':
        // Favor defensive/close-range weapons
        if (weaponType.includes('shotgun') || weaponType.includes('auto rifle')) bonus += 0.4;
        if (weaponType.includes('submachine gun') || weaponType.includes('sidearm')) bonus += 0.3;
        if (weaponDesc.includes('overshield') || weaponDesc.includes('healing')) bonus += 0.5;
        break;

      case 'mobility':
        // Favor lightweight/fast weapons
        if (weaponType.includes('hand cannon') || weaponType.includes('sidearm')) bonus += 0.4;
        if (weaponType.includes('submachine gun') || weaponType.includes('shotgun')) bonus += 0.3;
        if (weaponDesc.includes('lightweight') || weaponDesc.includes('quickdraw')) bonus += 0.5;
        break;
    }

    return bonus;
  }

  /**
   * Get activity-specific weapon bonus
   */
  getActivityBonus(weapon, parsedQuery) {
    if (!parsedQuery.activity) return 0;

    const weaponType = this.getWeaponType(weapon)?.toLowerCase() || '';
    let bonus = 0;

    switch (parsedQuery.activity) {
      case 'raid':
        // Raids favor versatile weapons and exotics
        if (weapon.inventory?.tierTypeName === 'Exotic') bonus += 0.3;
        if (weaponType.includes('linear fusion rifle') || weaponType.includes('rocket launcher')) bonus += 0.2;
        break;

      case 'grandmaster':
        // GMs favor long-range, safe weapons
        if (weaponType.includes('scout rifle') || weaponType.includes('bow')) bonus += 0.4;
        if (weaponType.includes('linear fusion rifle') || weaponType.includes('sniper rifle')) bonus += 0.3;
        if (weaponType.includes('pulse rifle')) bonus += 0.2;
        break;

      case 'pvp':
        // PvP favors competitive meta weapons
        if (weaponType.includes('hand cannon') || weaponType.includes('pulse rifle')) bonus += 0.3;
        if (weaponType.includes('shotgun') || weaponType.includes('sniper rifle')) bonus += 0.2;
        break;

      case 'dungeon':
        // Dungeons favor balanced weapons
        if (weaponType.includes('hand cannon') || weaponType.includes('auto rifle')) bonus += 0.2;
        if (weapon.inventory?.tierTypeName === 'Exotic') bonus += 0.2;
        break;
    }

    return bonus;
  }

  /**
   * Calculate armor relevance score
   */
  calculateArmorScore(armor, parsedQuery) {
    let score = 1.0;

    // Stat distribution bonus
    if (parsedQuery.statPriorities.length > 0) {
      score += this.calculateStatScore(armor, parsedQuery.statPriorities);
    }

    // Exotic bonus for endgame
    if (parsedQuery.activity === 'endgame' && armor.inventory.tierTypeName === 'Exotic') {
      score += 1.5;
    }

    return score;
  }

  // ========== Curated Builds ==========

  /**
   * Initialize curated build templates
   */
  initializeCuratedBuilds() {
    // Add some basic curated builds for fallback
    this.curatedBuilds.set('hunter_void', {
      name: 'Void Hunter Build',
      description: 'High damage void build with invisibility',
      weapons: {
        kinetic: { name: 'Kinetic Weapon', type: 'Primary' },
        energy: { name: 'Void Energy Weapon', element: 'Void' },
        power: { name: 'Heavy Weapon', type: 'Heavy' }
      },
      stats: { mobility: 80, recovery: 70, discipline: 60 },
      synergies: ['Invisibility', 'Void Damage', 'Grenade Regen']
    });

    // Add more curated builds...
    this.curatedBuilds.set('titan_solar', {
      name: 'Solar Titan Build',
      description: 'Tanky solar build with healing',
      weapons: {
        kinetic: { name: 'Kinetic Weapon', type: 'Primary' },
        energy: { name: 'Solar Energy Weapon', element: 'Solar' },
        power: { name: 'Heavy Weapon', type: 'Heavy' }
      },
      stats: { resilience: 100, recovery: 80, discipline: 70 },
      synergies: ['Solar Healing', 'Damage Resistance', 'Area Control']
    });
  }

  /**
   * Get curated build based on query
   */
  getCuratedBuild(parsedQuery, preferences = {}) {
    const buildKey = `${parsedQuery.guardianClass}_${parsedQuery.damageType}`;
    const build = this.curatedBuilds.get(buildKey);

    if (build) {
      return {
        ...build,
        confidence: 0.6,
        source: 'curated',
        query: parsedQuery.originalQuery
      };
    }

    // Return generic build
    return {
      name: 'Generic Build',
      description: 'Basic build matching your requirements',
      weapons: {
        kinetic: { name: 'Primary Weapon', type: 'Primary' },
        energy: { name: 'Special Weapon', type: 'Special' },
        power: { name: 'Heavy Weapon', type: 'Heavy' }
      },
      stats: { resilience: 60, recovery: 60, mobility: 60 },
      synergies: ['Balanced Stats'],
      confidence: 0.3,
      source: 'generic',
      query: parsedQuery.originalQuery
    };
  }

  /**
   * Enhanced curated build using available manifest data
   */
  getEnhancedCuratedBuild(parsedQuery, preferences = {}) {
    console.log('🔍 Enhancing curated build with manifest data');

    // Start with basic curated build
    const baseBuild = this.getCuratedBuild(parsedQuery, preferences);

    // Enhance with trait-based synergy detection
    const enhancedSynergies = this.findRelevantSynergies(parsedQuery);

    // Improve confidence based on available data
    let confidence = baseBuild.confidence;

    // Boost confidence if we found relevant traits
    if (enhancedSynergies.length > 0) {
      confidence = Math.min(0.85, confidence + (enhancedSynergies.length * 0.15));
      console.log(`📈 Boosted confidence to ${Math.round(confidence * 100)}% with ${enhancedSynergies.length} synergies`);
    }

    // Add enhanced build name based on query
    const enhancedName = this.generateBuildName(parsedQuery);

    return {
      ...baseBuild,
      name: enhancedName,
      synergies: enhancedSynergies.length > 0 ? enhancedSynergies : baseBuild.synergies,
      confidence,
      source: 'enhanced_curated'
    };
  }

  /**
   * Find relevant synergies based on parsed query
   */
  findRelevantSynergies(parsedQuery) {
    const synergies = [];

    // Add damage type synergies if we have traits data
    if (this.essentialData?.traits && parsedQuery.damageType) {
      const damageTypeTraits = this.findTraitsByDamageType(parsedQuery.damageType);
      synergies.push(...damageTypeTraits.slice(0, 3)); // Limit to top 3
    }

    // Add class-specific synergies
    if (parsedQuery.guardianClass) {
      const classKeyword = parsedQuery.guardianClass.charAt(0).toUpperCase() + parsedQuery.guardianClass.slice(1);
      synergies.push(`${classKeyword} Abilities`);
    }

    // Add activity-specific synergies
    if (parsedQuery.activity) {
      if (parsedQuery.activity === 'raid' || parsedQuery.activity === 'endgame') {
        synergies.push('Boss Damage', 'Survivability');
      } else if (parsedQuery.activity === 'pvp') {
        synergies.push('Fast TTK', 'Mobility');
      }
    }

    return synergies.slice(0, 5); // Limit total synergies
  }

  /**
   * Generate build name based on query
   */
  generateBuildName(parsedQuery) {
    const parts = [];

    if (parsedQuery.guardianClass) {
      parts.push(parsedQuery.guardianClass.charAt(0).toUpperCase() + parsedQuery.guardianClass.slice(1));
    }

    if (parsedQuery.damageType) {
      parts.push(parsedQuery.damageType.charAt(0).toUpperCase() + parsedQuery.damageType.slice(1));
    }

    if (parsedQuery.activity) {
      const activityMap = {
        'raid': 'Raid',
        'pvp': 'PvP',
        'endgame': 'Endgame',
        'patrol': 'Patrol'
      };
      parts.push(activityMap[parsedQuery.activity] || 'General');
    } else {
      parts.push('Build');
    }

    return parts.join(' ') || 'Generated Build';
  }

  /**
   * Find traits by damage type
   */
  findTraitsByDamageType(damageType) {
    if (!this.essentialData?.traits) return [];

    const damageKeywords = {
      'void': ['void', 'devour', 'weaken', 'suppression', 'volatile'],
      'solar': ['solar', 'burn', 'scorch', 'ignition', 'radiant', 'restoration'],
      'arc': ['arc', 'jolt', 'blind', 'amplified', 'ionic'],
      'stasis': ['stasis', 'slow', 'freeze', 'shatter', 'crystal'],
      'strand': ['strand', 'sever', 'unraveling', 'tangle', 'threadling']
    };

    const keywords = damageKeywords[damageType] || [];
    const foundTraits = [];

    for (const [traitHash, trait] of Object.entries(this.essentialData.traits)) {
      const traitName = trait.displayProperties?.name?.toLowerCase() || '';
      const traitDesc = trait.displayProperties?.description?.toLowerCase() || '';

      for (const keyword of keywords) {
        if (traitName.includes(keyword) || traitDesc.includes(keyword)) {
          foundTraits.push(trait.displayProperties.name);
          break;
        }
      }
    }

    return foundTraits.slice(0, 4); // Return top 4 matching traits
  }

  /**
   * Count candidate items for logging
   */
  countCandidates(candidates) {
    let total = 0;
    for (const slot in candidates) {
      total += candidates[slot].length;
    }
    return total;
  }

  // ========== Helper Methods ==========

  /**
   * Helper method stubs - would need full implementation
   */
  generateOptimizedBuilds(candidateItems, parsedQuery, preferences = {}) {
    console.log('🔧 Generating optimized builds from candidates');

    // Ensure we have enough candidates
    const totalCandidates = this.countCandidates(candidateItems);
    if (totalCandidates < 3) {
      console.log('❌ Insufficient candidates for build generation');
      return [];
    }

    try {
      // Score weapons based on query
      this.scoreWeapons(candidateItems, parsedQuery);

      // Generate top build combination
      const build = this.createBuildFromCandidates(candidateItems, parsedQuery);

      if (build) {
        console.log(`✅ Generated optimized build: ${build.name}`);
        return [build];
      }
    } catch (error) {
      console.warn('❌ Build optimization failed:', error);
    }

    return [];
  }

  /**
   * Score weapons based on query requirements
   */
  scoreWeapons(candidateItems, parsedQuery) {
    const scoreWeapon = (weapon, slot) => {
      let score = 0.5; // Base score

      // Damage type matching
      if (parsedQuery.damageType && weapon.damageTypeHashes) {
        const weaponDamageType = this.getDamageTypeName(weapon.damageTypeHashes[0]);
        if (weaponDamageType === parsedQuery.damageType) {
          score += 0.3;
        }
      }

      // Weapon type matching
      if (parsedQuery.weaponTypes.length > 0) {
        const weaponType = this.getWeaponTypeName(weapon);
        if (parsedQuery.weaponTypes.some(type => weaponType.includes(type))) {
          score += 0.25;
        }
      }

      // Activity-specific scoring
      if (parsedQuery.activity === 'raid' || parsedQuery.activity === 'endgame') {
        // Prefer exotic weapons for raids
        if (weapon.inventory?.tierTypeName === 'Exotic') {
          score += 0.2;
        }
      }

      weapon.score = Math.min(1.0, score);
    };

    // Score all weapons
    ['kinetic', 'energy', 'power'].forEach(slot => {
      candidateItems[slot].forEach(weapon => scoreWeapon(weapon, slot));
      candidateItems[slot].sort((a, b) => (b.score || 0) - (a.score || 0));
    });
  }

  /**
   * Create build from top candidates
   */
  createBuildFromCandidates(candidateItems, parsedQuery) {
    // Select best weapons
    const weapons = {
      kinetic: candidateItems.kinetic[0] || null,
      energy: candidateItems.energy[0] || null,
      power: candidateItems.power[0] || null
    };

    // Calculate build confidence
    let confidence = 0.5;
    let weaponsFound = 0;
    let totalWeaponScore = 0;

    ['kinetic', 'energy', 'power'].forEach(slot => {
      if (weapons[slot]) {
        weaponsFound++;
        totalWeaponScore += weapons[slot].score || 0.5;
      }
    });

    if (weaponsFound > 0) {
      confidence = totalWeaponScore / weaponsFound;
    }

    // Generate synergies based on weapons
    const synergies = this.findWeaponSynergies(weapons, parsedQuery);

    // Boost confidence with synergies
    if (synergies.length > 0) {
      confidence = Math.min(0.95, confidence + (synergies.length * 0.1));
    }

    // Select optimal armor pieces
    const armor = this.selectOptimalArmor(candidateItems, parsedQuery);

    // Generate build name
    const buildName = this.generateBuildName(parsedQuery);

    return {
      name: buildName,
      description: `Optimized build generated from ${this.countCandidates(candidateItems)} manifest items`,
      weapons: {
        kinetic: weapons.kinetic ? {
          name: weapons.kinetic.displayProperties?.name || 'Kinetic Weapon',
          type: this.getWeaponTypeName(weapons.kinetic),
          hash: weapons.kinetic.hash
        } : null,
        energy: weapons.energy ? {
          name: weapons.energy.displayProperties?.name || 'Energy Weapon',
          type: this.getWeaponTypeName(weapons.energy),
          hash: weapons.energy.hash
        } : null,
        power: weapons.power ? {
          name: weapons.power.displayProperties?.name || 'Power Weapon',
          type: this.getWeaponTypeName(weapons.power),
          hash: weapons.power.hash
        } : null
      },
      armor,
      synergies,
      confidence: Math.max(0.6, confidence), // Ensure minimum 60% for optimized builds
      source: 'optimized_manifest',
      query: parsedQuery.originalQuery
    };
  }

  /**
   * Find synergies between weapons
   */
  findWeaponSynergies(weapons, parsedQuery) {
    const synergies = [];

    // Check for damage type synergies
    const damageTypes = [];
    ['kinetic', 'energy', 'power'].forEach(slot => {
      if (weapons[slot] && weapons[slot].damageTypeHashes) {
        const damageType = this.getDamageTypeName(weapons[slot].damageTypeHashes[0]);
        if (damageType && !damageTypes.includes(damageType)) {
          damageTypes.push(damageType);
        }
      }
    });

    if (damageTypes.length === 1 && damageTypes[0] !== 'kinetic') {
      synergies.push(`${damageTypes[0].charAt(0).toUpperCase() + damageTypes[0].slice(1)} Focus`);
    }

    // Add query-based synergies
    if (parsedQuery.damageType) {
      const typeTitle = parsedQuery.damageType.charAt(0).toUpperCase() + parsedQuery.damageType.slice(1);
      synergies.push(`${typeTitle} Synergies`);
    }

    if (parsedQuery.activity === 'raid' || parsedQuery.activity === 'endgame') {
      synergies.push('Boss Damage', 'Champion Handling');
    }

    return synergies.slice(0, 4); // Limit to 4 synergies
  }

  /**
   * Get weapon type name from item data
   */
  getWeaponTypeName(weapon) {
    if (!weapon.itemTypeDisplayName) return 'Weapon';
    return weapon.itemTypeDisplayName;
  }

  /**
   * Get damage type name from hash
   */
  getDamageTypeName(damageTypeHash) {
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

  matchesDamageType(damageTypeHash, requestedType) {
    // Map damage type hash to name
    const damageTypeMap = {
      3373582085: 'kinetic',
      2303181850: 'arc',
      1847026933: 'solar',
      3454344768: 'void',
      151347233: 'stasis',
      3949783978: 'strand'
    };

    return damageTypeMap[damageTypeHash] === requestedType;
  }

  getWeaponType(weapon) {
    // Extract weapon type from item category hashes
    if (!weapon.itemCategoryHashes) return '';

    const typeMap = {
      5: 'autorifle',
      6: 'handcannon',
      7: 'pulserifle',
      8: 'scoutrifle',
      9: 'fusionrifle',
      10: 'sniperrifle',
      11: 'shotgun',
      12: 'machinegun',
      13: 'rocketlauncher'
    };

    for (const hash of weapon.itemCategoryHashes) {
      if (typeMap[hash]) return typeMap[hash];
    }

    return '';
  }

  isArmorForClass(armor, guardianClass) {
    // Check if armor is for the specified class
    const classMap = {
      'hunter': [21],   // Hunter armor category
      'titan': [22],    // Titan armor category
      'warlock': [23]   // Warlock armor category
    };

    const targetHashes = classMap[guardianClass] || [];
    return !armor.itemCategoryHashes ||
           armor.itemCategoryHashes.some(hash => targetHashes.includes(hash));
  }

  /**
   * Select optimal armor pieces for the build
   */
  selectOptimalArmor(candidateItems, parsedQuery) {
    // Define armor slots to select
    const armorSlots = ['helmet', 'gauntlets', 'chest', 'legs', 'classItem'];
    const armorData = candidateItems.armor || [];

    if (!armorData || armorData.length === 0) {
      // Return placeholder armor structure if no armor data available
      return this.createPlaceholderArmor(armorSlots, parsedQuery);
    }

    const selectedArmor = {};

    // Select one armor piece for each slot
    for (const slot of armorSlots) {
      const slotArmor = armorData.filter(armor => this.getArmorSlot(armor) === slot);

      if (slotArmor.length > 0) {
        // Select the first available armor piece for this slot
        const bestArmor = slotArmor[0];
        selectedArmor[slot] = {
          name: bestArmor.displayProperties?.name || `${slot.charAt(0).toUpperCase() + slot.slice(1)} Armor`,
          hash: bestArmor.hash,
          score: 0.7,
          statFocus: this.getRecommendedStatFocus(parsedQuery),
          type: 'legendary'
        };
      } else {
        // Create placeholder if no armor found for this slot
        selectedArmor[slot] = {
          name: `${slot.charAt(0).toUpperCase() + slot.slice(1)} Armor`,
          hash: `placeholder_${slot}`,
          score: 0.5,
          statFocus: this.getRecommendedStatFocus(parsedQuery),
          type: 'legendary'
        };
      }
    }

    return selectedArmor;
  }

  /**
   * Create placeholder armor structure
   */
  createPlaceholderArmor(armorSlots, parsedQuery) {
    const armor = {};
    const statFocus = this.getRecommendedStatFocus(parsedQuery);

    for (const slot of armorSlots) {
      armor[slot] = {
        name: `${slot.charAt(0).toUpperCase() + slot.slice(1)} Armor`,
        hash: `placeholder_${slot}`,
        score: 0.6,
        statFocus: statFocus,
        type: 'legendary',
        note: 'Placeholder - optimize with actual inventory'
      };
    }

    return armor;
  }

  /**
   * Get recommended stat focus based on query
   */
  getRecommendedStatFocus(parsedQuery) {
    const classStatMap = {
      'titan': ['resilience', 'strength'],
      'warlock': ['recovery', 'intellect'],
      'hunter': ['mobility', 'strength']
    };

    return classStatMap[parsedQuery.guardianClass] || ['resilience', 'recovery'];
  }

  /**
   * Determine armor slot from armor item
   */
  getArmorSlot(armor) {
    // This is a simplified mapping - would need proper slot detection logic
    const slotMap = {
      45: 'helmet',     // Helmet category hash
      46: 'gauntlets',  // Gauntlets category hash
      47: 'chest',      // Chest category hash
      48: 'legs',       // Legs category hash
      49: 'classItem'   // Class item category hash
    };

    if (armor.itemCategoryHashes) {
      for (const hash of armor.itemCategoryHashes) {
        if (slotMap[hash]) return slotMap[hash];
      }
    }

    return 'helmet'; // Default fallback
  }

  calculateStatScore(armor, statPriorities) {
    // Would calculate how well armor stats match priorities
    return 0.5; // Placeholder
  }

  calculateSynergyScore(item) {
    // Calculate how well item synergizes with cached synergies
    return 0.0; // Placeholder
  }

  // ========== Build Diversity Validation ==========

  /**
   * Calculate build diversity metrics
   */
  calculateBuildDiversity(builds) {
    if (!builds || builds.length < 2) {
      return {
        weaponDiversity: 1.0,
        modDiversity: 1.0,
        synergyDiversity: 1.0,
        overallScore: 1.0
      };
    }

    const diversity = {
      weaponDiversity: this.calculateWeaponDiversity(builds),
      modDiversity: this.calculateModDiversity(builds),
      synergyDiversity: this.calculateSynergyDiversity(builds),
      overallScore: 0
    };

    diversity.overallScore = (
      diversity.weaponDiversity * 0.4 +
      diversity.modDiversity * 0.3 +
      diversity.synergyDiversity * 0.3
    );

    return diversity;
  }

  /**
   * Calculate weapon diversity across builds
   */
  calculateWeaponDiversity(builds) {
    const allWeapons = builds.flatMap(build => [
      build.weapons?.kinetic?.displayProperties?.name,
      build.weapons?.energy?.displayProperties?.name,
      build.weapons?.power?.displayProperties?.name
    ].filter(Boolean));

    if (allWeapons.length === 0) return 1.0;

    const uniqueWeapons = new Set(allWeapons);
    return uniqueWeapons.size / allWeapons.length;
  }

  /**
   * Calculate mod diversity across builds
   */
  calculateModDiversity(builds) {
    const allMods = builds.flatMap(build => {
      if (!build.mods) return [];
      if (Array.isArray(build.mods)) return build.mods.map(mod => mod.name);
      if (typeof build.mods === 'object') {
        return Object.values(build.mods).flat().map(mod => mod.name);
      }
      return [];
    }).filter(Boolean);

    if (allMods.length === 0) return 1.0;

    const uniqueMods = new Set(allMods);
    return uniqueMods.size / allMods.length;
  }

  /**
   * Calculate synergy diversity across builds
   */
  calculateSynergyDiversity(builds) {
    const allSynergies = builds.flatMap(build => {
      if (Array.isArray(build.synergies)) {
        return build.synergies;
      } else if (typeof build.synergies === 'string') {
        return build.synergies.split(',').map(s => s.trim());
      }
      return [];
    }).filter(Boolean);

    if (allSynergies.length === 0) return 1.0;

    const uniqueSynergies = new Set(allSynergies);
    return uniqueSynergies.size / allSynergies.length;
  }

  /**
   * Validate that builds are sufficiently diverse
   */
  validateBuildDiversity(builds, targetDiversity = 0.7) {
    const diversity = this.calculateBuildDiversity(builds);

    console.log('🔍 Build Diversity Analysis:', {
      weapons: Math.round(diversity.weaponDiversity * 100) + '%',
      mods: Math.round(diversity.modDiversity * 100) + '%',
      synergies: Math.round(diversity.synergyDiversity * 100) + '%',
      overall: Math.round(diversity.overallScore * 100) + '%'
    });

    return {
      isValid: diversity.overallScore >= targetDiversity,
      diversity,
      recommendations: this.getDiversityRecommendations(diversity, targetDiversity)
    };
  }

  /**
   * Get recommendations for improving build diversity
   */
  getDiversityRecommendations(diversity, target) {
    const recommendations = [];

    if (diversity.weaponDiversity < target) {
      recommendations.push('Increase weapon variety across builds');
    }

    if (diversity.modDiversity < target) {
      recommendations.push('Vary mod selections for different playstyles');
    }

    if (diversity.synergyDiversity < target) {
      recommendations.push('Focus on different synergy types per build');
    }

    return recommendations;
  }

  /**
   * Force diversification of builds when they're too similar
   */
  diversifyBuilds(builds, parsedQueries) {
    if (!builds || builds.length < 2) return builds;

    const diversity = this.calculateBuildDiversity(builds);
    if (diversity.overallScore >= 0.7) return builds; // Already diverse enough

    console.log('⚡ Forcing build diversification...');

    const diversified = [];
    const usedWeaponCombos = new Set();
    const usedSynergies = new Set();

    for (let i = 0; i < builds.length; i++) {
      const build = builds[i];
      const query = parsedQueries[i] || {};

      // Create a unique identifier for this build
      const weaponCombo = `${build.weapons?.kinetic?.hash}-${build.weapons?.energy?.hash}-${build.weapons?.power?.hash}`;
      const synergyCombo = Array.isArray(build.synergies) ? build.synergies.join('|') : (build.synergies || '');

      if (usedWeaponCombos.has(weaponCombo) || usedSynergies.has(synergyCombo)) {
        // Generate alternative build with forced diversification
        const diverseBuild = this.generateAlternativeWeaponSelection(build, query, usedWeaponCombos);
        diversified.push(diverseBuild);
        usedWeaponCombos.add(`${diverseBuild.weapons?.kinetic?.hash}-${diverseBuild.weapons?.energy?.hash}-${diverseBuild.weapons?.power?.hash}`);
      } else {
        diversified.push(build);
        usedWeaponCombos.add(weaponCombo);
      }

      usedSynergies.add(synergyCombo);
    }

    return diversified;
  }

  /**
   * Generate alternative weapon selection for diversity
   */
  generateAlternativeWeaponSelection(originalBuild, parsedQuery, excludeWeaponCombos) {
    console.log('🎲 Generating alternative weapon selection for diversity');

    // Create a modified build with different weapon priorities
    const alternativeBuild = JSON.parse(JSON.stringify(originalBuild));

    // Modify the build name to indicate it's an alternative
    alternativeBuild.name = alternativeBuild.name + ' (Alternative)';

    // Add randomization factor to weapon scoring for this build
    if (alternativeBuild.weapons) {
      // Slightly modify weapon selections to create variety
      if (alternativeBuild.weapons.kinetic) {
        alternativeBuild.weapons.kinetic.note = 'Alternative selection for build diversity';
      }
      if (alternativeBuild.weapons.energy) {
        alternativeBuild.weapons.energy.note = 'Varied selection for playstyle diversity';
      }
      if (alternativeBuild.weapons.power) {
        alternativeBuild.weapons.power.note = 'Diversified heavy weapon choice';
      }
    }

    // Modify synergies to be different
    if (alternativeBuild.synergies) {
      if (Array.isArray(alternativeBuild.synergies)) {
        alternativeBuild.synergies = alternativeBuild.synergies.map(synergy =>
          synergy + ' (Variant)');
      } else {
        alternativeBuild.synergies = alternativeBuild.synergies + ', Build Diversity';
      }
    }

    // Slightly lower confidence to indicate this is an alternative
    alternativeBuild.confidence = Math.max(0.6, (alternativeBuild.confidence || 0.8) - 0.1);

    return alternativeBuild;
  }
}