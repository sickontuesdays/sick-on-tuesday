/**
 * Manifest Loader - Handles loading optimized Destiny 2 manifest data
 * Implements tiered loading strategy for performance
 */

export class ManifestLoader {
  constructor(baseUrl = null) {
    // Default to local server-side manifest API for current data
    if (!baseUrl) {
      baseUrl = '/api/manifest/definition';
    }

    this.baseUrl = baseUrl;
    this.cache = new Map();
    this.loadingPromises = new Map();
    this.isInitialized = false;
    this.essentialData = null;
    this.analysisData = null;
  }

  // ========== Tier 1: Essential Data (Fast Load <1s) ==========

  /**
   * Load essential data for immediate UI needs
   * Returns: { stats, traits, damageTypes, classes }
   */
  async loadEssentialData() {
    if (this.essentialData) {
      return this.essentialData;
    }

    try {
      const [stats, traits, damageTypes, classes] = await Promise.all([
        this.loadDefinition('DestinyStatDefinition'),        // ~39 KB - 76 stats
        this.loadDefinition('DestinyTraitDefinition'),       // ~155 KB - 458 traits
        this.loadDefinition('DestinyDamageTypeDefinition'),  // ~4 KB - damage types
        this.loadDefinition('DestinyClassDefinition')        // ~1.3 KB - classes
      ]);

      this.essentialData = {
        stats: stats || {},
        traits: traits || {},
        damageTypes: damageTypes || {},
        classes: classes || {}
      };

      return this.essentialData;
    } catch (error) {
      console.error('Failed to load essential data:', error);
      throw new Error('Critical manifest data failed to load');
    }
  }

  // ========== Tier 2: Analysis Data (5-10s) ==========

  /**
   * Load analysis data for synergy detection
   * Returns: { perks, plugSets, sockets, inventoryItems }
   */
  async loadAnalysisData() {
    if (this.analysisData) {
      return this.analysisData;
    }

    try {
      const [perks, plugSets, sockets, inventoryItems] = await Promise.all([
        this.loadDefinition('DestinySandboxPerkDefinition'), // ~3.2 MB - 4,744 perks
        this.loadDefinition('DestinyPlugSetDefinition'),     // ~12 MB - 4,476 plug sets
        this.loadDefinition('DestinySocketTypeDefinition'),  // ~1.3 MB - 1,253 sockets
        this.loadDefinition('DestinyInventoryItemDefinition') // ~236 MB - 31,235 items (includes plugs)
      ]);

      this.analysisData = {
        perks: perks || {},
        plugSets: plugSets || {},
        sockets: sockets || {},
        inventoryItems: inventoryItems || {}
      };

      return this.analysisData;
    } catch (error) {
      console.error('Failed to load analysis data:', error);
      // Return empty objects to allow graceful degradation
      this.analysisData = { perks: {}, plugSets: {}, sockets: {}, inventoryItems: {} };
      return this.analysisData;
    }
  }

  // ========== Tier 3: Item Chunks (Lazy Load 20-80MB) ==========

  /**
   * Load specific item chunk
   * @param {string} chunkType - 'weapons', 'armor', 'consumables', 'cosmetics'
   */
  async loadItemChunk(chunkType) {
    // Check if chunk is already cached
    if (this.cache.has(chunkType)) {
      return this.cache.get(chunkType);
    }

    // Load the full DestinyInventoryItemDefinition if not already loaded
    if (!this.cache.has('DestinyInventoryItemDefinition')) {
      console.log(`Loading DestinyInventoryItemDefinition to create ${chunkType} chunk...`);
      await this.loadDefinition('DestinyInventoryItemDefinition');
    }

    const allItems = this.cache.get('DestinyInventoryItemDefinition');
    if (!allItems) {
      throw new Error('Failed to load DestinyInventoryItemDefinition for chunk creation');
    }

    // Filter items based on chunk type using itemCategoryHashes
    const chunkItems = {};

    for (const [hash, item] of Object.entries(allItems)) {
      if (!item.itemCategoryHashes || !Array.isArray(item.itemCategoryHashes)) {
        continue;
      }

      let includeInChunk = false;

      switch (chunkType) {
        case 'weapons':
          // Weapon category hashes: 1 (Weapon)
          includeInChunk = item.itemCategoryHashes.includes(1);
          break;
        case 'armor':
          // Armor category hashes: 20 (Armor)
          includeInChunk = item.itemCategoryHashes.includes(20);
          break;
        case 'consumables':
          // Consumable category hashes: 35 (Consumable)
          includeInChunk = item.itemCategoryHashes.includes(35);
          break;
        case 'cosmetics':
          // Cosmetic category hashes: various shader/emblem/emote categories
          includeInChunk = item.itemCategoryHashes.some(cat =>
            [41, 42, 43, 44, 52, 53, 55, 56, 59].includes(cat)  // Various cosmetic categories
          );
          break;
        default:
          throw new Error(`Unknown chunk type: ${chunkType}. Available: weapons, armor, consumables, cosmetics`);
      }

      if (includeInChunk) {
        chunkItems[hash] = item;
      }
    }

    console.log(`Created ${chunkType} chunk with ${Object.keys(chunkItems).length} items`);

    // Cache the filtered chunk
    this.cache.set(chunkType, chunkItems);

    return chunkItems;
  }

  /**
   * Load multiple item chunks in parallel
   */
  async loadItemChunks(chunkTypes) {
    const loadPromises = chunkTypes.map(type =>
      this.loadItemChunk(type).catch(error => {
        console.warn(`Failed to load ${type} chunk:`, error);
        return {}; // Return empty object for failed chunks
      })
    );

    const results = await Promise.all(loadPromises);
    const chunks = {};

    chunkTypes.forEach((type, index) => {
      chunks[type] = results[index];
    });

    return chunks;
  }

  // ========== Core Loading Functions ==========

  /**
   * Load definition file from manifest
   */
  async loadDefinition(definitionName) {
    const filename = `${definitionName}.json`;
    return await this.loadFromCache(definitionName, filename);
  }

  /**
   * Core caching loader with promise deduplication
   */
  async loadFromCache(key, filename) {
    // Return cached data if available
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    // Return existing promise if already loading
    if (this.loadingPromises.has(key)) {
      return await this.loadingPromises.get(key);
    }

    // Start new load operation
    // Extract definition name from filename (remove .json extension)
    const definitionName = filename.replace('.json', '');
    const url = `${this.baseUrl}?tableName=${definitionName}`;
    const loadPromise = this.fetchWithRetry(url)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        // Cache successful response
        this.cache.set(key, data);
        this.loadingPromises.delete(key);
        return data;
      })
      .catch(error => {
        // Remove failed promise
        this.loadingPromises.delete(key);
        throw error;
      });

    this.loadingPromises.set(key, loadPromise);
    return await loadPromise;
  }

  /**
   * Fetch with retry logic for network resilience
   */
  async fetchWithRetry(url, maxRetries = 3, delay = 1000) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url);
        return response;
      } catch (error) {
        lastError = error;

        if (attempt === maxRetries) {
          break;
        }

        console.warn(`Fetch attempt ${attempt} failed for ${url}, retrying in ${delay}ms...`);
        await this.sleep(delay);
        delay *= 2; // Exponential backoff
      }
    }

    throw lastError;
  }

  /**
   * Helper for async sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ========== High-Level Initialization ==========

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

    try {
      // Load essential data immediately
      console.log('Loading essential manifest data...');
      const essential = await this.loadEssentialData();

      // Start loading analysis data in background
      console.log('Starting analysis data load...');
      const analysisPromise = this.loadAnalysisData();

      this.isInitialized = true;

      return {
        essential,
        analysisPromise
      };
    } catch (error) {
      console.error('Failed to initialize manifest loader:', error);
      throw error;
    }
  }

  // ========== Utility Functions ==========

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const stats = {
      totalEntries: this.cache.size,
      loadingPromises: this.loadingPromises.size,
      entries: {}
    };

    // Calculate approximate memory usage
    for (const [key, data] of this.cache.entries()) {
      const size = JSON.stringify(data).length;
      const itemCount = typeof data === 'object' && data !== null ? Object.keys(data).length : 0;

      stats.entries[key] = {
        estimatedSize: size,
        itemCount
      };
    }

    return stats;
  }

  /**
   * Clear cache to free memory
   */
  clearCache() {
    this.cache.clear();
    this.analysisData = null;
    this.essentialData = null;
    this.isInitialized = false;
  }

  /**
   * Preload specific chunks for better performance
   */
  async preloadChunks(chunkTypes) {
    const preloadPromises = chunkTypes.map(type =>
      this.loadItemChunk(type).catch(error => {
        console.warn(`Preload failed for ${type}:`, error);
        return null;
      })
    );

    await Promise.allSettled(preloadPromises);
  }

  /**
   * Check if data is available without triggering load
   */
  isDataCached(key) {
    return this.cache.has(key);
  }

  /**
   * Get loading status
   */
  getLoadingStatus() {
    return {
      isInitialized: this.isInitialized,
      hasEssentialData: !!this.essentialData,
      hasAnalysisData: !!this.analysisData,
      currentlyLoading: Array.from(this.loadingPromises.keys()),
      cachedChunks: Array.from(this.cache.keys())
    };
  }

  // ========== Convenience Methods ==========

  /**
   * Get all available damage types
   */
  getDamageTypes() {
    return this.essentialData?.damageTypes || {};
  }

  /**
   * Get all available classes
   */
  getClasses() {
    return this.essentialData?.classes || {};
  }

  /**
   * Get all traits for synergy detection
   */
  getTraits() {
    return this.essentialData?.traits || {};
  }

  /**
   * Get stat definitions
   */
  getStats() {
    return this.essentialData?.stats || {};
  }

  /**
   * Get perk definitions for analysis
   */
  getPerks() {
    return this.analysisData?.perks || {};
  }

  /**
   * Find items by category across all loaded chunks
   */
  findItemsByCategory(categoryHashes = [], includeExotic = true) {
    const results = [];

    for (const [chunkName, chunk] of this.cache.entries()) {
      if (!chunk || typeof chunk !== 'object') continue;

      for (const [hash, item] of Object.entries(chunk)) {
        if (!item || !item.itemCategoryHashes) continue;

        const hasCategory = categoryHashes.some(cat =>
          item.itemCategoryHashes.includes(cat)
        );

        if (hasCategory) {
          if (includeExotic || item.inventory?.tierTypeName !== 'Exotic') {
            results.push({ ...item, source: chunkName, hash });
          }
        }
      }
    }

    return results;
  }
}

// Export constants for item categories
export const ITEM_CATEGORIES = {
  // Weapon categories
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

  // Armor categories
  HELMET: 45,
  GAUNTLETS: 46,
  CHEST_ARMOR: 47,
  LEG_ARMOR: 48,
  CLASS_ARMOR: 49,

  // Other
  WEAPON: 1,
  ARMOR: 20,
  CONSUMABLE: 35
};

// Export damage type constants
export const DAMAGE_TYPES = {
  KINETIC: 3373582085,
  ARC: 2303181850,
  SOLAR: 1847026933,
  VOID: 3454344768,
  STASIS: 151347233,
  STRAND: 3949783978
};