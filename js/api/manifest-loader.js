/**
 * Manifest Loader - Loads and caches Destiny 2 manifest definitions
 * Supports tiered loading for performance
 */

import { apiClient } from './bungie-api-client.js';

export class ManifestLoader {
  constructor() {
    this.cache = new Map();
    this.loadingPromises = new Map();
    this.isInitialized = false;
    this.essentialData = null;
    this.analysisData = null;

    // Use GitHub CDN for direct file access
    this.cdnBaseUrl = 'https://raw.githubusercontent.com/sickontuesdays/destiny-manifest-data/main/';
  }

  // ==================== TIER 1: ESSENTIAL DATA ====================

  /**
   * Load essential data for immediate UI needs
   */
  async loadEssentialData() {
    if (this.essentialData) return this.essentialData;

    console.log('Loading essential manifest data...');

    try {
      const [stats, damageTypes, classes, itemCategories] = await Promise.all([
        this.loadDefinition('DestinyStatDefinition'),
        this.loadDefinition('DestinyDamageTypeDefinition'),
        this.loadDefinition('DestinyClassDefinition'),
        this.loadDefinition('DestinyItemCategoryDefinition')
      ]);

      this.essentialData = {
        stats: stats || {},
        damageTypes: damageTypes || {},
        classes: classes || {},
        itemCategories: itemCategories || {}
      };

      console.log('Essential data loaded');
      return this.essentialData;
    } catch (error) {
      console.error('Failed to load essential data:', error);
      throw error;
    }
  }

  // ==================== TIER 2: ANALYSIS DATA ====================

  /**
   * Load analysis data for build recommendations
   */
  async loadAnalysisData() {
    if (this.analysisData) return this.analysisData;

    console.log('Loading analysis manifest data...');

    try {
      const [perks, plugSets, sockets, inventoryItems] = await Promise.all([
        this.loadDefinition('DestinySandboxPerkDefinition'),
        this.loadDefinition('DestinyPlugSetDefinition'),
        this.loadDefinition('DestinySocketTypeDefinition'),
        this.loadDefinition('DestinyInventoryItemDefinition')
      ]);

      this.analysisData = {
        perks: perks || {},
        plugSets: plugSets || {},
        sockets: sockets || {},
        inventoryItems: inventoryItems || {}
      };

      console.log('Analysis data loaded');
      return this.analysisData;
    } catch (error) {
      console.error('Failed to load analysis data:', error);
      return { perks: {}, plugSets: {}, sockets: {}, inventoryItems: {} };
    }
  }

  // ==================== CORE LOADING ====================

  /**
   * Load a definition from cache, API, or CDN
   */
  async loadDefinition(definitionName) {
    // Check cache
    if (this.cache.has(definitionName)) {
      return this.cache.get(definitionName);
    }

    // Check if already loading
    if (this.loadingPromises.has(definitionName)) {
      return this.loadingPromises.get(definitionName);
    }

    // Start loading
    const loadPromise = this.fetchDefinition(definitionName);
    this.loadingPromises.set(definitionName, loadPromise);

    try {
      const data = await loadPromise;
      this.cache.set(definitionName, data);
      return data;
    } finally {
      this.loadingPromises.delete(definitionName);
    }
  }

  /**
   * Fetch definition from API or CDN
   */
  async fetchDefinition(definitionName) {
    console.log(`Fetching ${definitionName}...`);

    // Try API endpoint first
    try {
      const data = await apiClient.getManifestDefinition(definitionName);
      return data;
    } catch (apiError) {
      console.warn(`API fetch failed for ${definitionName}, trying CDN...`);
    }

    // Fallback to direct CDN
    try {
      const response = await fetch(`${this.cdnBaseUrl}${definitionName}.json`);
      if (response.ok) {
        return response.json();
      }
    } catch (cdnError) {
      console.warn(`CDN fetch failed for ${definitionName}`);
    }

    // Try chunked files
    return this.loadChunkedDefinition(definitionName);
  }

  /**
   * Load chunked definition files
   */
  async loadChunkedDefinition(definitionName) {
    const chunks = [];

    for (let i = 1; i <= 10; i++) {
      try {
        const response = await fetch(`${this.cdnBaseUrl}${definitionName}_part${i}.json`);
        if (response.ok) {
          const data = await response.json();
          chunks.push(data);
        } else {
          break;
        }
      } catch {
        break;
      }
    }

    if (chunks.length === 0) {
      throw new Error(`No data found for ${definitionName}`);
    }

    // Merge chunks
    return Object.assign({}, ...chunks);
  }

  // ==================== INITIALIZATION ====================

  /**
   * Initialize manifest loader with progressive loading
   */
  async initialize() {
    if (this.isInitialized) {
      return {
        essential: this.essentialData,
        analysis: this.analysisData
      };
    }

    // Load essential data immediately
    await this.loadEssentialData();

    // Start analysis data load in background
    this.loadAnalysisData().catch(error => {
      console.warn('Background analysis data load failed:', error);
    });

    this.isInitialized = true;

    return {
      essential: this.essentialData,
      analysisPromise: this.loadAnalysisData()
    };
  }

  // ==================== CONVENIENCE METHODS ====================

  getStats() { return this.essentialData?.stats || {}; }
  getDamageTypes() { return this.essentialData?.damageTypes || {}; }
  getClasses() { return this.essentialData?.classes || {}; }
  getItemCategories() { return this.essentialData?.itemCategories || {}; }
  getPerks() { return this.analysisData?.perks || {}; }
  getInventoryItems() { return this.analysisData?.inventoryItems || {}; }

  /**
   * Get item definition by hash
   */
  getItemDefinition(hash) {
    return this.analysisData?.inventoryItems?.[hash] || null;
  }

  /**
   * Get stat definition by hash
   */
  getStatDefinition(hash) {
    return this.essentialData?.stats?.[hash] || null;
  }

  /**
   * Get damage type definition by hash
   */
  getDamageTypeDefinition(hash) {
    return this.essentialData?.damageTypes?.[hash] || null;
  }

  /**
   * Get milestone definition by hash
   * Note: Milestones are dynamic and come from the API response directly,
   * this is a fallback that returns null (milestones should use API data)
   */
  getMilestoneDefinition(hash) {
    // Milestones definitions are not cached in manifest - return null
    // The activities panel should use the milestone data from the API response directly
    return null;
  }

  /**
   * Get activity definition by hash
   */
  async getActivityDefinition(hash) {
    if (!this.activityDefinitions) {
      try {
        this.activityDefinitions = await this.loadDefinition('DestinyActivityDefinition');
      } catch (e) {
        console.warn('Failed to load activity definitions:', e);
        this.activityDefinitions = {};
      }
    }
    return this.activityDefinitions?.[hash] || null;
  }

  /**
   * Get activity mode definition by mode number
   */
  getActivityModeName(mode) {
    const modeNames = {
      0: 'None',
      2: 'Story',
      3: 'Strike',
      4: 'Raid',
      5: 'All PvP',
      6: 'Patrol',
      7: 'All PvE',
      10: 'Control',
      12: 'Clash',
      15: 'Crimson Doubles',
      16: 'Nightfall',
      17: 'Heroic Nightfall',
      18: 'All Strikes',
      19: 'Iron Banner',
      25: 'All Mayhem',
      31: 'Supremacy',
      32: 'Private Matches',
      37: 'Survival',
      38: 'Countdown',
      39: 'Trials of the Nine',
      40: 'Social',
      43: 'Iron Banner Control',
      44: 'Iron Banner Clash',
      45: 'Iron Banner Supremacy',
      46: 'Nightfall Scored',
      47: 'Nightfall Scored Prestige',
      48: 'Rumble',
      49: 'All Doubles',
      50: 'Doubles',
      54: 'Black Armory Run',
      55: 'Salvage',
      56: 'Iron Banner Salvage',
      57: 'PvP Competitive',
      58: 'PvP Quickplay',
      59: 'Clash Quickplay',
      60: 'Clash Competitive',
      61: 'Control Quickplay',
      62: 'Control Competitive',
      63: 'Gambit',
      64: 'All PvE Competitive',
      65: 'Breakthrough',
      66: 'Black Armory Forge',
      67: 'Salvage Competitive',
      68: 'Iron Banner Rumble',
      69: 'Iron Banner Lockdown',
      70: 'Reckoning',
      71: 'Menagerie',
      72: 'Vex Offensive',
      73: 'Nightmare Hunt',
      74: 'Elimination',
      75: 'Momentum',
      76: 'Dungeon',
      77: 'Sundial',
      78: 'Trials of Osiris',
      79: 'Dares of Eternity',
      80: 'Offensive',
      81: 'Rift',
      82: 'Zone Control',
      83: 'Iron Banner Rift',
      84: 'Trials of Osiris',
      85: 'Wellspring',
      86: 'PsiOps Battleground',
      87: 'Iron Banner Fortress',
      88: 'Lightfall',
      89: 'Defiant Battleground',
      90: 'Terminal Overload'
    };
    return modeNames[mode] || `Mode ${mode}`;
  }

  /**
   * Search items by name
   */
  searchItems(query, limit = 20) {
    const items = this.analysisData?.inventoryItems || {};
    const results = [];
    const lowerQuery = query.toLowerCase();

    for (const [hash, item] of Object.entries(items)) {
      if (results.length >= limit) break;

      const name = item.displayProperties?.name?.toLowerCase() || '';
      if (name.includes(lowerQuery)) {
        results.push({ hash, ...item });
      }
    }

    return results;
  }

  // ==================== CACHE MANAGEMENT ====================

  clearCache() {
    this.cache.clear();
    this.essentialData = null;
    this.analysisData = null;
    this.isInitialized = false;
  }

  getCacheStats() {
    return {
      entries: this.cache.size,
      hasEssential: !!this.essentialData,
      hasAnalysis: !!this.analysisData,
      isInitialized: this.isInitialized,
      loadingCount: this.loadingPromises.size
    };
  }

  getLoadingStatus() {
    return {
      isInitialized: this.isInitialized,
      hasEssentialData: !!this.essentialData,
      hasAnalysisData: !!this.analysisData,
      currentlyLoading: Array.from(this.loadingPromises.keys()),
      cachedDefinitions: Array.from(this.cache.keys())
    };
  }
}

// Item category constants
export const ITEM_CATEGORIES = {
  WEAPON: 1,
  KINETIC_WEAPON: 2,
  ENERGY_WEAPON: 3,
  POWER_WEAPON: 4,
  AUTO_RIFLE: 5,
  HAND_CANNON: 6,
  PULSE_RIFLE: 7,
  SCOUT_RIFLE: 8,
  FUSION_RIFLE: 9,
  SNIPER_RIFLE: 10,
  SHOTGUN: 11,
  MACHINE_GUN: 12,
  ROCKET_LAUNCHER: 13,
  SIDEARM: 14,
  SWORD: 54,
  GRENADE_LAUNCHER: 153950757,
  LINEAR_FUSION: 1504945536,
  TRACE_RIFLE: 2489664120,
  BOW: 3317538576,
  GLAIVE: 3871742104,
  SUBMACHINE_GUN: 3954685534,
  ARMOR: 20,
  HELMET: 45,
  GAUNTLETS: 46,
  CHEST_ARMOR: 47,
  LEG_ARMOR: 48,
  CLASS_ARMOR: 49,
  GHOST: 39,
  SHIP: 42,
  SPARROW: 43,
  EMBLEM: 19,
  SHADER: 41,
  MOD: 59,
  CONSUMABLE: 35
};

// Damage type constants
export const DAMAGE_TYPES = {
  KINETIC: 3373582085,
  ARC: 2303181850,
  SOLAR: 1847026933,
  VOID: 3454344768,
  STASIS: 151347233,
  STRAND: 3949783978
};

// Bucket type hashes
export const BUCKET_HASHES = {
  KINETIC_WEAPONS: 1498876634,
  ENERGY_WEAPONS: 2465295065,
  POWER_WEAPONS: 953998645,
  HELMET: 3448274439,
  GAUNTLETS: 3551918588,
  CHEST_ARMOR: 14239492,
  LEG_ARMOR: 20886954,
  CLASS_ARMOR: 1585787867,
  GHOST: 4023194814,
  VEHICLE: 2025709351,
  SHIPS: 284967655,
  SUBCLASS: 3284755031,
  GENERAL: 138197802,
  CONSUMABLES: 1469714392,
  MODIFICATIONS: 3313201758
};

export const manifestLoader = new ManifestLoader();
export default ManifestLoader;
