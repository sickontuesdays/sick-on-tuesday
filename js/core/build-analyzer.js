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

    // Extract activity type
    if (normalized.includes('raid') || normalized.includes('dungeon')) {
      parsed.activity = 'endgame';
      parsed.statPriorities.push('resilience', 'recovery', 'damage');
    } else if (normalized.includes('pvp') || normalized.includes('crucible') || normalized.includes('trials')) {
      parsed.activity = 'pvp';
      parsed.statPriorities.push('mobility', 'recovery', 'handling');
    } else if (normalized.includes('gambit')) {
      parsed.activity = 'gambit';
      parsed.statPriorities.push('range', 'damage', 'reload');
    }

    // Extract playstyle
    if (normalized.includes('dps') || normalized.includes('damage') || normalized.includes('boss')) {
      parsed.playstyle = 'damage';
      parsed.statPriorities.push('impact', 'range', 'stability');
    } else if (normalized.includes('tank') || normalized.includes('survive') || normalized.includes('defensive')) {
      parsed.playstyle = 'survival';
      parsed.statPriorities.push('resilience', 'recovery');
    } else if (normalized.includes('support') || normalized.includes('heal') || normalized.includes('buff')) {
      parsed.playstyle = 'support';
      parsed.statPriorities.push('intellect', 'discipline', 'strength');
    } else if (normalized.includes('speed') || normalized.includes('mobility') || normalized.includes('fast')) {
      parsed.playstyle = 'mobility';
      parsed.statPriorities.push('mobility', 'handling', 'reload');
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
   * Calculate weapon relevance score
   */
  calculateWeaponScore(weapon, parsedQuery) {
    let score = 1.0;

    // Damage type matching
    if (parsedQuery.damageType) {
      const damageTypeHash = weapon.damageTypeHashes?.[0];
      if (this.matchesDamageType(damageTypeHash, parsedQuery.damageType)) {
        score += 2.0;
      }
    }

    // Weapon type matching
    if (parsedQuery.weaponTypes.length > 0) {
      const weaponType = this.getWeaponType(weapon);
      if (parsedQuery.weaponTypes.some(type => weaponType.includes(type))) {
        score += 3.0;
      }
    }

    // Activity bonus
    if (parsedQuery.activity === 'endgame' && weapon.inventory.tierTypeName === 'Exotic') {
      score += 1.5;
    }

    // Synergy bonus (if analysis ready)
    if (this.analysisReady) {
      score += this.calculateSynergyScore(weapon);
    }

    return score;
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

  calculateStatScore(armor, statPriorities) {
    // Would calculate how well armor stats match priorities
    return 0.5; // Placeholder
  }

  calculateSynergyScore(item) {
    // Calculate how well item synergizes with cached synergies
    return 0.0; // Placeholder
  }
}