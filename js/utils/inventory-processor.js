// js/utils/inventory-processor.js
// Data transformation utilities for Bungie inventory data

export class InventoryProcessor {
  constructor(manifestLoader) {
    this.manifestLoader = manifestLoader;
    this.loadedChunks = new Set(); // Track what chunks are already loaded for performance
  }

  /**
   * Process raw API data into Build-Ready JSON format
   * Resolves hashes, organizes by character, extracts build-relevant data
   */
  static async processBuildReadyData(apiResponse, manifestLoader) {
    try {
      console.log('🔄 Processing inventory data for build analysis...');

      const processor = new InventoryProcessor(manifestLoader);
      const profileData = apiResponse.profileData;
      const membershipData = apiResponse.membershipData;

      // Build the comprehensive data structure
      const buildReadyData = {
        metadata: {
          displayName: membershipData.displayName,
          membershipType: membershipData.membershipType,
          membershipId: membershipData.membershipId,
          platforms: membershipData.platforms,
          fetchTimestamp: apiResponse.fetchTimestamp,
          dataVersion: '1.0'
        },
        characters: {},
        vault: {},
        summary: {}
      };

      // Process each character
      if (profileData.characters && profileData.characters.data) {
        for (const [characterId, character] of Object.entries(profileData.characters.data)) {
          const characterData = await processor.processCharacter(
            characterId,
            character,
            profileData
          );

          // Use class type as key (Titan, Hunter, Warlock)
          const className = await processor.getClassName(character.classHash);
          buildReadyData.characters[className.toLowerCase()] = characterData;
        }
      }

      // Process vault
      buildReadyData.vault = await processor.processVault(profileData);

      // Generate summary statistics
      buildReadyData.summary = processor.generateSummary(buildReadyData);

      console.log('✅ Successfully processed inventory data');
      return buildReadyData;

    } catch (error) {
      console.error('❌ Error processing inventory data:', error);
      throw error;
    }
  }

  /**
   * Return raw API data unchanged
   */
  static processRawData(apiResponse) {
    return apiResponse;
  }

  /**
   * Process individual character data
   */
  async processCharacter(characterId, character, profileData) {
    try {
      const characterData = {
        characterId: characterId,
        class: await this.getClassName(character.classHash),
        race: await this.getRaceName(character.raceHash),
        gender: await this.getGenderName(character.genderHash),
        light: character.light,
        stats: await this.processCharacterStats(character),
        equipped: await this.processEquippedItems(characterId, profileData),
        inventory: await this.processCharacterInventory(characterId, profileData),
        subclass: await this.processSubclass(characterId, profileData),
        progressions: await this.processProgressions(characterId, profileData),
        armorStats: await this.calculateArmorStats(characterId, profileData)
      };

      return characterData;

    } catch (error) {
      console.error(`❌ Error processing character ${characterId}:`, error);
      return {
        characterId: characterId,
        error: error.message
      };
    }
  }

  /**
   * Process equipped items for a character
   */
  async processEquippedItems(characterId, profileData) {
    const equipped = {
      weapons: {
        kinetic: null,
        energy: null,
        power: null
      },
      armor: {
        helmet: null,
        arms: null,
        chest: null,
        legs: null,
        classItem: null
      },
      subclass: null
    };

    if (!profileData.characterEquipment?.data?.[characterId]?.items) {
      return equipped;
    }

    const equippedItems = profileData.characterEquipment.data[characterId].items;

    for (const item of equippedItems) {
      const processedItem = await this.processItem(item, profileData);

      // Categorize by bucket hash
      switch (item.bucketHash) {
        case 1498876634: // Kinetic Weapons
          equipped.weapons.kinetic = processedItem;
          break;
        case 2465295065: // Energy Weapons
          equipped.weapons.energy = processedItem;
          break;
        case 953998645: // Power Weapons
          equipped.weapons.power = processedItem;
          break;
        case 3448274439: // Helmet
          equipped.armor.helmet = processedItem;
          break;
        case 3551918588: // Arms
          equipped.armor.arms = processedItem;
          break;
        case 14239492: // Chest
          equipped.armor.chest = processedItem;
          break;
        case 20886954: // Legs
          equipped.armor.legs = processedItem;
          break;
        case 1585787867: // Class Item
          equipped.armor.classItem = processedItem;
          break;
        case 3284755031: // Subclass
          equipped.subclass = processedItem;
          break;
      }
    }

    return equipped;
  }

  /**
   * Process character inventory (non-equipped items)
   */
  async processCharacterInventory(characterId, profileData) {
    const inventory = {
      weapons: [],
      armor: [],
      materials: [],
      consumables: []
    };

    if (!profileData.characterInventories?.data?.[characterId]?.items) {
      return inventory;
    }

    const inventoryItems = profileData.characterInventories.data[characterId].items;

    for (const item of inventoryItems) {
      const processedItem = await this.processItem(item, profileData);
      const category = this.determineItemCategory(item.bucketHash);

      if (inventory[category]) {
        inventory[category].push(processedItem);
      }
    }

    return inventory;
  }

  /**
   * Process vault contents
   */
  async processVault(profileData) {
    const vault = {
      weapons: [],
      armor: [],
      materials: [],
      consumables: []
    };

    if (!profileData.profileInventory?.data?.items) {
      return vault;
    }

    const vaultItems = profileData.profileInventory.data.items;

    for (const item of vaultItems) {
      const processedItem = await this.processItem(item, profileData);
      const category = this.categorizeVaultItem(item.bucketHash);

      if (vault[category]) {
        vault[category].push(processedItem);
      }
    }

    return vault;
  }

  /**
   * Process individual item with full details
   */
  async processItem(item, profileData) {
    try {
      // Determine item category and load appropriate manifest chunk
      const category = this.determineItemCategory(item.bucketHash);
      await this.ensureChunkLoaded(category);

      // Get manifest chunk and look up item definition
      const itemChunk = await this.manifestLoader.loadItemChunk(category);
      const itemDef = itemChunk[item.itemHash];

      const processedItem = {
        itemHash: item.itemHash,
        itemInstanceId: item.itemInstanceId,
        name: itemDef?.displayProperties?.name || `Unknown_${item.itemHash}`,
        description: itemDef?.displayProperties?.description || 'No description available',
        icon: itemDef?.displayProperties?.icon || null,
        quantity: item.quantity || 1,
        itemType: itemDef?.itemTypeDisplayName || this.getItemTypeFromBucket(item.bucketHash),
        tier: itemDef?.inventory?.tierTypeName || 'Unknown',
        bucketHash: item.bucketHash,
        transferStatus: item.transferStatus,
        lockable: item.lockable,
        state: item.state
      };

      // Add instance-specific data if available
      if (item.itemInstanceId && profileData.itemComponents?.instances?.data?.[item.itemInstanceId]) {
        const instance = profileData.itemComponents.instances.data[item.itemInstanceId];
        processedItem.damageTypeHash = instance.damageTypeHash;
        processedItem.primaryStat = instance.primaryStat;
        processedItem.canEquip = instance.canEquip;
        processedItem.cannotEquipReason = instance.cannotEquipReason;
      }

      // Add stats if available
      if (item.itemInstanceId && profileData.itemComponents?.stats?.data?.[item.itemInstanceId]) {
        const stats = profileData.itemComponents.stats.data[item.itemInstanceId];
        processedItem.stats = await this.processItemStats(stats.stats);
      }

      // Add sockets/mods if available
      if (item.itemInstanceId && profileData.itemComponents?.sockets?.data?.[item.itemInstanceId]) {
        const sockets = profileData.itemComponents.sockets.data[item.itemInstanceId];
        processedItem.sockets = await this.processItemSockets(sockets.sockets);
      }

      return processedItem;

    } catch (error) {
      console.error(`Error processing item ${item.itemHash}:`, error);
      return {
        itemHash: item.itemHash,
        error: error.message
      };
    }
  }

  /**
   * Process character stats
   */
  async processCharacterStats(character) {
    const stats = {};

    if (character.stats) {
      try {
        const essentialData = await this.manifestLoader.loadEssentialData();
        for (const [statHash, value] of Object.entries(character.stats)) {
          const statDef = essentialData.stats[statHash];
          if (statDef) {
            stats[statDef.displayProperties.name.toLowerCase()] = value;
          } else {
            stats[`stat_${statHash}`] = value;
          }
        }
      } catch (error) {
        console.error('Error processing character stats:', error);
        // Fallback to raw stat data
        for (const [statHash, value] of Object.entries(character.stats)) {
          stats[`stat_${statHash}`] = value;
        }
      }
    }

    return stats;
  }

  /**
   * Process subclass configuration
   */
  async processSubclass(characterId, profileData) {
    // This would process subclass data, aspects, fragments, etc.
    // Implementation depends on specific Bungie API structure
    return {
      equipped: null,
      aspects: [],
      fragments: [],
      grenades: [],
      melees: [],
      classAbilities: []
    };
  }

  /**
   * Process progressions (artifact, subclass unlocks, etc.)
   */
  async processProgressions(characterId, profileData) {
    const progressions = {};

    if (profileData.characterProgressions?.data?.[characterId]?.progressions) {
      const charProgressions = profileData.characterProgressions.data[characterId].progressions;

      for (const [progressionHash, progression] of Object.entries(charProgressions)) {
        // Store progression data with hash key for now - names would require additional manifest loading
        progressions[`progression_${progressionHash}`] = {
          hash: progressionHash,
          level: progression.level,
          progressToNextLevel: progression.progressToNextLevel,
          nextLevelAt: progression.nextLevelAt,
          currentProgress: progression.currentProgress
        };
      }
    }

    return progressions;
  }

  /**
   * Helper methods
   */
  async getClassName(classHash) {
    try {
      const essentialData = await this.manifestLoader.loadEssentialData();
      const classDef = essentialData.classes[classHash];
      return classDef?.displayProperties?.name || 'Unknown Class';
    } catch (error) {
      console.error('Error getting class name:', error);
      return 'Unknown Class';
    }
  }

  async getRaceName(raceHash) {
    try {
      // Race definitions are not in essential data, use a lookup table for now
      const raceNames = {
        2803282938: 'Awoken',
        3887404748: 'Human',
        898834093: 'Exo'
      };
      return raceNames[raceHash] || 'Unknown Race';
    } catch (error) {
      console.error('Error getting race name:', error);
      return 'Unknown Race';
    }
  }

  async getGenderName(genderHash) {
    try {
      // Gender definitions lookup table
      const genderNames = {
        3111576190: 'Male',
        2204441813: 'Female'
      };
      return genderNames[genderHash] || 'Unknown Gender';
    } catch (error) {
      console.error('Error getting gender name:', error);
      return 'Unknown Gender';
    }
  }

  async getTierName(tierHash) {
    try {
      // Tier definitions lookup table
      const tierNames = {
        4008398120: 'Legendary',
        2759499571: 'Exotic',
        3340296461: 'Rare',
        2395677314: 'Common',
        3685308718: 'Basic'
      };
      return tierNames[tierHash] || 'Unknown Tier';
    } catch (error) {
      console.error('Error getting tier name:', error);
      return 'Unknown Tier';
    }
  }

  determineItemCategory(bucketHash) {
    // Map bucket hashes to manifest chunks for efficient item definition loading
    const bucketToCategory = {
      // Weapons
      1498876634: 'weapons',    // Kinetic Weapons
      2465295065: 'weapons',    // Energy Weapons
      953998645: 'weapons',     // Power Weapons

      // Armor
      3448274439: 'armor',      // Helmet
      3551918588: 'armor',      // Arms
      14239492: 'armor',        // Chest
      20886954: 'armor',        // Legs
      1585787867: 'armor',      // Class Item

      // Consumables and materials
      1469714392: 'consumables', // General consumables
      2422292810: 'consumables', // Modifications

      // Subclass
      3284755031: 'consumables', // Subclass (treated as consumable for manifest lookup)

      // Vault
      138197802: 'consumables'   // General vault items
    };

    return bucketToCategory[bucketHash] || 'consumables';
  }

  categorizeVaultItem(bucketHash) {
    // Map vault item bucket hashes to display categories
    // This is different from determineItemCategory which is for manifest loading
    const bucketToCategory = {
      // Weapons
      1498876634: 'weapons',    // Kinetic Weapons
      2465295065: 'weapons',    // Energy Weapons
      953998645: 'weapons',     // Power Weapons

      // Armor
      3448274439: 'armor',      // Helmet
      3551918588: 'armor',      // Arms/Gauntlets
      14239492: 'armor',        // Chest Armor
      20886954: 'armor',        // Leg Armor
      1585787867: 'armor',      // Class Item

      // Materials & Consumables
      1469714392: 'materials',  // General consumables/materials (most vault items)
      2422292810: 'materials',  // Modifications
      138197802: 'materials',   // General vault items

      // Consumables (things that are actually consumed)
      269153547: 'consumables', // Consumables bucket
      1506418338: 'consumables', // Consumable-specific items

      // Subclass
      3284755031: 'materials'   // Subclass (treat as materials for vault display)
    };

    return bucketToCategory[bucketHash] || 'materials';
  }

  async ensureChunkLoaded(category) {
    if (!this.loadedChunks.has(category)) {
      await this.manifestLoader.loadItemChunk(category);
      this.loadedChunks.add(category);
    }
  }

  async processItemStats(statsData) {
    const stats = {};

    try {
      const essentialData = await this.manifestLoader.loadEssentialData();

      for (const [statHash, statValue] of Object.entries(statsData)) {
        const statDef = essentialData.stats[statHash];
        if (statDef) {
          stats[statDef.displayProperties.name.toLowerCase()] = statValue.value;
        } else {
          // Fallback for unknown stats
          stats[`stat_${statHash}`] = statValue.value;
        }
      }
    } catch (error) {
      console.error('Error processing item stats:', error);
      // Return raw stat data if manifest fails
      for (const [statHash, statValue] of Object.entries(statsData)) {
        stats[`stat_${statHash}`] = statValue.value;
      }
    }

    return stats;
  }

  async processItemSockets(socketsData) {
    const sockets = [];

    // Load plugs/mods chunk for socket name resolution
    try {
      await this.ensureChunkLoaded('consumables'); // Many mods are in consumables
      const consumablesChunk = await this.manifestLoader.loadItemChunk('consumables');

      for (const socket of socketsData) {
        if (socket.plugHash) {
          // Look up plug/mod definition in manifest
          const plugDef = consumablesChunk[socket.plugHash];

          sockets.push({
            plugHash: socket.plugHash,
            name: plugDef?.displayProperties?.name || `Mod_${socket.plugHash}`,
            description: plugDef?.displayProperties?.description || '',
            icon: plugDef?.displayProperties?.icon || null,
            isEnabled: socket.isEnabled,
            isVisible: socket.isVisible
          });
        }
      }
    } catch (error) {
      console.error('Error processing item sockets:', error);
      // Fallback to basic socket info if manifest lookup fails
      for (const socket of socketsData) {
        if (socket.plugHash) {
          sockets.push({
            plugHash: socket.plugHash,
            name: `Mod_${socket.plugHash}`,
            description: '',
            icon: null,
            isEnabled: socket.isEnabled,
            isVisible: socket.isVisible
          });
        }
      }
    }

    return sockets;
  }

  /**
   * Calculate total armor stats for a character
   */
  async calculateArmorStats(characterId, profileData) {
    // Calculate total armor stats (Mobility, Resilience, Recovery, etc.)
    const armorStats = {
      mobility: 0,
      resilience: 0,
      recovery: 0,
      discipline: 0,
      intellect: 0,
      strength: 0
    };

    // Sum stats from equipped armor pieces
    if (profileData.characterEquipment?.data?.[characterId]?.items) {
      const equippedItems = profileData.characterEquipment.data[characterId].items;

      for (const item of equippedItems) {
        if (this.isArmorItem(item.bucketHash) && item.itemInstanceId) {
          const itemStats = profileData.itemComponents?.stats?.data?.[item.itemInstanceId];
          if (itemStats?.stats) {
            await this.addItemStatsToTotal(itemStats.stats, armorStats);
          }
        }
      }
    }

    return armorStats;
  }

  /**
   * Check if an item is an armor piece based on bucket hash
   */
  isArmorItem(bucketHash) {
    const armorBuckets = [
      3448274439, // Helmet
      3551918588, // Arms/Gauntlets
      14239492,   // Chest Armor
      20886954,   // Leg Armor
      1585787867  // Class Item
    ];
    return armorBuckets.includes(bucketHash);
  }

  /**
   * Add individual item stats to armor totals
   */
  async addItemStatsToTotal(itemStatsData, armorStats) {
    try {
      const essentialData = await this.manifestLoader.loadEssentialData();

      // Map of stat hashes to stat names
      const armorStatHashes = {
        2996146975: 'mobility',    // Mobility
        392767087: 'resilience',   // Resilience
        1943323491: 'recovery',    // Recovery
        1735777505: 'discipline',  // Discipline
        144602215: 'intellect',    // Intellect
        4244567218: 'strength'     // Strength
      };

      for (const [statHash, statValue] of Object.entries(itemStatsData)) {
        const statKey = armorStatHashes[statHash];
        if (statKey && armorStats.hasOwnProperty(statKey)) {
          armorStats[statKey] += statValue.value || 0;
        }
      }
    } catch (error) {
      console.error('Error adding item stats to total:', error);
      // Continue processing other items even if one fails
    }
  }

  /**
   * Get item type from bucket hash
   */
  getItemTypeFromBucket(bucketHash) {
    const bucketTypes = {
      // Weapons
      1498876634: 'Kinetic Weapon',
      2465295065: 'Energy Weapon',
      953998645: 'Power Weapon',

      // Armor
      3448274439: 'Helmet',
      3551918588: 'Gauntlets',
      14239492: 'Chest Armor',
      20886954: 'Leg Armor',
      1585787867: 'Class Item',

      // Other
      138197802: 'General', // Vault
      1469714392: 'Consumables',
      2422292810: 'Modifications'
    };

    return bucketTypes[bucketHash] || 'Unknown';
  }

  /**
   * Generate summary statistics
   */
  generateSummary(buildReadyData) {
    const summary = {
      totalCharacters: Object.keys(buildReadyData.characters).length,
      totalItems: 0,
      weaponCounts: { kinetic: 0, energy: 0, power: 0 },
      armorCounts: { helmet: 0, arms: 0, chest: 0, legs: 0, classItem: 0 },
      exoticCounts: { weapons: 0, armor: 0 },
      vaultUsage: 0
    };

    // Count items across characters and vault
    for (const character of Object.values(buildReadyData.characters)) {
      if (character.inventory) {
        summary.totalItems += character.inventory.weapons.length || 0;
        summary.totalItems += character.inventory.armor.length || 0;
        summary.totalItems += character.inventory.materials.length || 0;
        summary.totalItems += character.inventory.consumables.length || 0;
      }
    }

    if (buildReadyData.vault) {
      summary.totalItems += buildReadyData.vault.weapons.length || 0;
      summary.totalItems += buildReadyData.vault.armor.length || 0;
      summary.totalItems += buildReadyData.vault.materials.length || 0;
      summary.totalItems += buildReadyData.vault.consumables.length || 0;

      summary.vaultUsage = (buildReadyData.vault.weapons.length || 0) +
                          (buildReadyData.vault.armor.length || 0);
    }

    return summary;
  }
}

export default InventoryProcessor;