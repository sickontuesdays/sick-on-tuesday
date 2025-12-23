// js/utils/inventory-processor.js
// Data transformation utilities for Bungie inventory data

export class InventoryProcessor {
  constructor(manifestLoader) {
    this.manifestLoader = manifestLoader;
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
        progressions: await this.processProgressions(characterId, profileData)
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
      const itemDef = await this.manifestLoader.getDefinition('DestinyInventoryItemDefinition', item.itemHash);
      if (!itemDef) continue;

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
      const category = await this.categorizeItem(item.itemHash);

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
      const category = await this.categorizeItem(item.itemHash);

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
      const itemDef = await this.manifestLoader.getDefinition('DestinyInventoryItemDefinition', item.itemHash);
      if (!itemDef) {
        return {
          itemHash: item.itemHash,
          name: 'Unknown Item',
          error: 'Definition not found'
        };
      }

      const processedItem = {
        itemHash: item.itemHash,
        itemInstanceId: item.itemInstanceId,
        name: itemDef.displayProperties.name,
        description: itemDef.displayProperties.description,
        icon: itemDef.displayProperties.icon ? `https://bungie.net${itemDef.displayProperties.icon}` : null,
        quantity: item.quantity || 1,
        itemType: itemDef.itemTypeDisplayName,
        tier: await this.getTierName(itemDef.inventory.tierTypeHash),
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
      for (const [statHash, value] of Object.entries(character.stats)) {
        const statDef = await this.manifestLoader.getDefinition('DestinyStatDefinition', statHash);
        if (statDef) {
          stats[statDef.displayProperties.name.toLowerCase()] = value;
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
        const progressionDef = await this.manifestLoader.getDefinition('DestinyProgressionDefinition', progressionHash);
        if (progressionDef) {
          progressions[progressionDef.displayProperties.name] = {
            level: progression.level,
            progressToNextLevel: progression.progressToNextLevel,
            nextLevelAt: progression.nextLevelAt,
            currentProgress: progression.currentProgress
          };
        }
      }
    }

    return progressions;
  }

  /**
   * Helper methods
   */
  async getClassName(classHash) {
    const classDef = await this.manifestLoader.getDefinition('DestinyClassDefinition', classHash);
    return classDef?.displayProperties?.name || 'Unknown Class';
  }

  async getRaceName(raceHash) {
    const raceDef = await this.manifestLoader.getDefinition('DestinyRaceDefinition', raceHash);
    return raceDef?.displayProperties?.name || 'Unknown Race';
  }

  async getGenderName(genderHash) {
    const genderDef = await this.manifestLoader.getDefinition('DestinyGenderDefinition', genderHash);
    return genderDef?.displayProperties?.name || 'Unknown Gender';
  }

  async getTierName(tierHash) {
    const tierDef = await this.manifestLoader.getDefinition('DestinyItemTierTypeDefinition', tierHash);
    return tierDef?.displayProperties?.name || 'Unknown Tier';
  }

  async categorizeItem(itemHash) {
    const itemDef = await this.manifestLoader.getDefinition('DestinyInventoryItemDefinition', itemHash);
    if (!itemDef) return 'unknown';

    // Categorize based on item category hashes
    const categories = itemDef.itemCategoryHashes || [];

    if (categories.includes(1)) return 'weapons';      // Weapons
    if (categories.includes(20)) return 'armor';       // Armor
    if (categories.includes(61)) return 'consumables'; // Consumables

    return 'materials'; // Default for materials/currencies
  }

  async processItemStats(statsData) {
    const stats = {};

    for (const [statHash, statValue] of Object.entries(statsData)) {
      const statDef = await this.manifestLoader.getDefinition('DestinyStatDefinition', statHash);
      if (statDef) {
        stats[statDef.displayProperties.name.toLowerCase()] = statValue.value;
      }
    }

    return stats;
  }

  async processItemSockets(socketsData) {
    const sockets = [];

    for (const socket of socketsData) {
      if (socket.plugHash) {
        const plugDef = await this.manifestLoader.getDefinition('DestinyInventoryItemDefinition', socket.plugHash);
        if (plugDef) {
          sockets.push({
            plugHash: socket.plugHash,
            name: plugDef.displayProperties.name,
            description: plugDef.displayProperties.description,
            icon: plugDef.displayProperties.icon ? `https://bungie.net${plugDef.displayProperties.icon}` : null
          });
        }
      }
    }

    return sockets;
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