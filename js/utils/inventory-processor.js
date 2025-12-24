// js/utils/inventory-processor.js
// Data transformation utilities for Bungie inventory data

export class InventoryProcessor {
  constructor(manifestLoader) {
    this.manifestLoader = manifestLoader;
    this.loadedChunks = new Set(); // Track what chunks are already loaded for performance
    this.categoryCache = new Map(); // Cache itemHash -> category mappings for performance
    this.analysisDataPromise = null; // Promise for loading analysis data (including DestinyInventoryItemDefinition)
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
   * Process vault contents using itemCategoryHashes for proper categorization
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
      // Use itemCategoryHashes instead of bucketHash for proper categorization
      const category = await this.categorizeItemByManifest(item.itemHash);

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
   * Process subclass configuration (aspects, fragments, abilities)
   */
  async processSubclass(characterId, profileData) {
    const subclass = {
      equipped: null,
      aspects: [],
      fragments: [],
      abilities: {
        grenade: null,
        melee: null,
        classAbility: null,
        super: null
      },
      mods: []
    };

    try {
      // Get equipped subclass items (bucketHash: 3284755031)
      if (!profileData.characterEquipment?.data?.[characterId]?.items) {
        return subclass;
      }

      const equippedItems = profileData.characterEquipment.data[characterId].items;
      const subclassItems = equippedItems.filter(item => item.bucketHash === 3284755031);

      console.log(`🔍 Found ${subclassItems.length} subclass items for character ${characterId}`);
      console.log(`📊 Total equipped items for character: ${equippedItems.length}`);

      // Debug: Show all unique bucket hashes to understand what's equipped
      const bucketHashes = [...new Set(equippedItems.map(item => item.bucketHash))];
      console.log(`🗂️ All bucket hashes equipped:`, bucketHashes);

      // Debug: Show subclass items found
      console.log(`🎯 Subclass items found:`, subclassItems.map(item => ({
        hash: item.itemHash,
        bucket: item.bucketHash,
        instanceId: item.itemInstanceId
      })));

      for (const item of subclassItems) {
        const processedItem = await this.processSubclassItem(item, profileData);

        if (processedItem) {
          console.log(`📋 Processing subclass item: ${processedItem.name} (${processedItem.itemType})`);

          // Categorize by item type using manifest data
          const category = await this.categorizeSubclassItem(processedItem);

          console.log(`🏷️ Categorized "${processedItem.name}" as: ${category}`);

          // Handle main subclass (contains aspects/fragments in sockets)
          if (category === 'subclass') {
            subclass.equipped = processedItem;

            // Extract aspects, fragments, and abilities from subclass sockets
            await this.extractSubclassAbilities(item, profileData, subclass);
          } else {
            // Handle other items (shouldn't be many in this bucket)
            switch (category) {
              case 'aspect':
                subclass.aspects.push(processedItem);
                break;
              case 'fragment':
                subclass.fragments.push(processedItem);
                break;
              case 'grenade':
                subclass.abilities.grenade = processedItem;
                break;
              case 'melee':
                subclass.abilities.melee = processedItem;
                break;
              case 'classAbility':
                subclass.abilities.classAbility = processedItem;
                break;
              case 'super':
                subclass.abilities.super = processedItem;
                break;
              default:
                subclass.mods.push(processedItem);
            }
          }
        }
      }

      console.log(`✅ Subclass processing complete for character ${characterId}:`, {
        equipped: !!subclass.equipped,
        aspects: subclass.aspects.length,
        fragments: subclass.fragments.length,
        abilities: {
          grenade: !!subclass.abilities.grenade,
          melee: !!subclass.abilities.melee,
          classAbility: !!subclass.abilities.classAbility,
          super: !!subclass.abilities.super
        },
        mods: subclass.mods.length
      });

      return subclass;

    } catch (error) {
      console.error(`Error processing subclass for character ${characterId}:`, error);
      return subclass;
    }
  }

  /**
   * Process individual subclass item with socket data
   */
  async processSubclassItem(item, profileData) {
    try {
      // Get basic item data using specialized subclass manifest lookup
      const processedItem = await this.processSubclassItemManifest(item, profileData);

      // Add socket data if available
      if (item.itemInstanceId && profileData.itemComponents?.sockets?.data?.[item.itemInstanceId]) {
        const socketData = profileData.itemComponents.sockets.data[item.itemInstanceId];
        processedItem.sockets = [];

        for (const socket of socketData.sockets || []) {
          if (socket.plugHash) {
            try {
              // Look up plug details in manifest
              await this.ensureChunkLoaded('consumables');
              const consumablesChunk = await this.manifestLoader.loadItemChunk('consumables');
              const plugDef = consumablesChunk[socket.plugHash];

              processedItem.sockets.push({
                plugHash: socket.plugHash,
                name: plugDef?.displayProperties?.name || `Plug_${socket.plugHash}`,
                description: plugDef?.displayProperties?.description || '',
                icon: plugDef?.displayProperties?.icon || null,
                isEnabled: socket.isEnabled,
                isVisible: socket.isVisible
              });
            } catch (error) {
              // Fallback if manifest lookup fails
              processedItem.sockets.push({
                plugHash: socket.plugHash,
                name: `Plug_${socket.plugHash}`,
                isEnabled: socket.isEnabled,
                isVisible: socket.isVisible
              });
            }
          }
        }
      }

      return processedItem;
    } catch (error) {
      console.error('Error processing subclass item:', error);
      return null;
    }
  }

  /**
   * Process subclass item with multi-chunk manifest lookup
   */
  async processSubclassItemManifest(item, profileData) {
    // Try multiple manifest chunks since subclass items could be anywhere
    const chunksToTry = ['consumables', 'weapons', 'armor'];
    let itemDef = null;
    let foundInChunk = null;

    for (const chunkName of chunksToTry) {
      try {
        await this.ensureChunkLoaded(chunkName);
        const chunk = await this.manifestLoader.loadItemChunk(chunkName);

        if (chunk && chunk[item.itemHash]) {
          itemDef = chunk[item.itemHash];
          foundInChunk = chunkName;
          console.log(`📦 Found subclass item ${item.itemHash} in ${chunkName} chunk`);
          break;
        }
      } catch (error) {
        console.log(`⚠️ Failed to check ${chunkName} chunk for item ${item.itemHash}`);
        continue;
      }
    }

    const processedItem = {
      itemHash: item.itemHash,
      itemInstanceId: item.itemInstanceId,
      name: itemDef?.displayProperties?.name || `Unknown_${item.itemHash}`,
      description: itemDef?.displayProperties?.description || 'No description available',
      icon: itemDef?.displayProperties?.icon || null,
      quantity: item.quantity || 1,
      itemType: itemDef?.itemTypeDisplayName || 'Unknown',
      tier: itemDef?.inventory?.tierTypeName || 'Unknown',
      bucketHash: item.bucketHash,
      transferStatus: item.transferStatus,
      lockable: item.lockable,
      state: item.state,
      foundInChunk: foundInChunk
    };

    console.log(`🔎 Processed subclass item: ${processedItem.name} (type: ${processedItem.itemType}, tier: ${processedItem.tier})`);

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

    return processedItem;
  }

  /**
   * Categorize subclass item by type (aspect, fragment, ability, etc.)
   */
  async categorizeSubclassItem(processedItem) {
    try {
      // Use item name patterns to categorize (fallback method)
      const name = processedItem.name?.toLowerCase() || '';
      const itemType = processedItem.itemType?.toLowerCase() || '';

      console.log(`🔍 Categorizing: name="${name}", itemType="${itemType}"`);

      // Known patterns for subclass abilities and components
      if (name.includes('aspect') || itemType.includes('aspect')) {
        return 'aspect';
      }
      if (name.includes('fragment') || itemType.includes('fragment')) {
        return 'fragment';
      }
      if (name.includes('grenade') || itemType.includes('grenade')) {
        return 'grenade';
      }
      if (name.includes('melee') || itemType.includes('melee')) {
        return 'melee';
      }
      if (name.includes('rift') || name.includes('barricade') || name.includes('dodge') ||
          itemType.includes('class ability')) {
        return 'classAbility';
      }
      if (name.includes('super') || itemType.includes('super')) {
        return 'super';
      }
      if (itemType.includes('subclass')) {
        return 'subclass';
      }

      // Default to mod/unknown
      console.log(`⚠️ No category match found for "${name}" (${itemType}), defaulting to 'mod'`);
      return 'mod';
    } catch (error) {
      console.error('Error categorizing subclass item:', error);
      return 'mod';
    }
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
   * Categorize item using itemCategoryHashes from manifest (CORRECT METHOD)
   * Replaces bucket hash categorization which incorrectly used storage location
   */
  async categorizeItemByManifest(itemHash) {
    try {
      // Check cache first for performance
      if (this.categoryCache.has(itemHash)) {
        return this.categoryCache.get(itemHash);
      }

      const categories = await this.getItemCategories(itemHash);
      const category = this.determinePrimaryCategory(categories);

      // Cache the result for future lookups
      this.categoryCache.set(itemHash, category);

      return category;
    } catch (error) {
      console.warn(`Failed to categorize item ${itemHash}:`, error);
      return 'materials'; // Fallback to materials
    }
  }

  /**
   * Get itemCategoryHashes from manifest for proper categorization
   * Searches across all manifest chunks to find the item definition
   */
  async getItemCategories(itemHash) {
    // Search order: weapons, armor, consumables (most common to least common)
    const chunks = ['weapons', 'armor', 'consumables'];

    for (const chunkName of chunks) {
      try {
        await this.ensureChunkLoaded(chunkName);
        const chunk = await this.manifestLoader.loadItemChunk(chunkName);

        if (chunk && chunk[itemHash]) {
          const item = chunk[itemHash];

          // Primary: Use itemCategoryHashes (official Bungie API categorization)
          if (item.itemCategoryHashes && item.itemCategoryHashes.length > 0) {
            return item.itemCategoryHashes;
          }

          // Fallback: Use traitHashes for newer items
          if (item.traitHashes && item.traitHashes.length > 0) {
            return this.mapTraitHashesToCategories(item.traitHashes);
          }

          // Last resort: Use itemType
          if (item.itemType !== undefined) {
            return this.mapItemTypeToCategories(item.itemType);
          }
        }
      } catch (error) {
        // Continue to next chunk if this one fails
        continue;
      }
    }

    return []; // No categorization data found
  }

  /**
   * Determine primary category for items with multiple categories
   * Based on Destiny Item Manager (DIM) implementation and Bungie best practices
   */
  determinePrimaryCategory(itemCategoryHashes) {
    if (!itemCategoryHashes || itemCategoryHashes.length === 0) {
      return 'materials'; // Default fallback
    }

    // Priority order based on DIM implementation and Bungie API docs
    const categoryPriority = [
      { hash: 1, name: 'weapons' },      // Weapons (highest priority)
      { hash: 20, name: 'armor' },       // Armor
      { hash: 59, name: 'mods' },        // Mods (map to materials for vault display)
      { hash: 35, name: 'consumables' }, // Consumables
      { hash: 40, name: 'materials' }    // Materials (lowest priority)
    ];

    for (const priority of categoryPriority) {
      if (itemCategoryHashes.includes(priority.hash)) {
        // Map mods to materials for vault display consistency
        return priority.name === 'mods' ? 'materials' : priority.name;
      }
    }

    return 'materials'; // Default fallback
  }

  /**
   * Map traitHashes to categories for newer items (fallback method)
   */
  mapTraitHashesToCategories(traitHashes) {
    // This is a simplified implementation - traitHashes are more complex
    // For now, return empty array to use itemType fallback
    return [];
  }

  /**
   * Map itemType to categories (last resort fallback)
   */
  mapItemTypeToCategories(itemType) {
    // Map numeric itemType to category hashes
    const itemTypeToCategory = {
      1: [1],  // Weapons
      2: [1],  // Weapons
      3: [1],  // Weapons
      20: [20], // Armor
      // Add more mappings as needed
    };

    return itemTypeToCategory[itemType] || [];
  }

  /**
   * Extract abilities, aspects, and fragments from subclass socket data
   */
  async extractSubclassAbilities(subclassItem, profileData, subclass) {
    console.log(`🚨 SOCKET EXTRACTION METHOD CALLED - This should appear if method exists!`);
    try {
      console.log(`🔌 Extracting socket data for subclass item: ${subclassItem.itemInstanceId}`);

      // Get socket data for this subclass item
      const socketData = profileData.itemComponents?.sockets?.data?.[subclassItem.itemInstanceId];
      if (!socketData?.sockets) {
        console.log(`⚠️ No socket data found for subclass item ${subclassItem.itemInstanceId}`);
        return;
      }

      console.log(`📡 Found ${socketData.sockets.length} sockets for subclass item`);

      // Process each socket to find abilities, aspects, and fragments
      for (let socketIndex = 0; socketIndex < socketData.sockets.length; socketIndex++) {
        const socket = socketData.sockets[socketIndex];

        if (!socket.plugHash) {
          console.log(`🔌 Socket ${socketIndex}: No plugHash (empty socket)`);
          continue;
        }

        console.log(`🔌 Processing socket ${socketIndex}: plugHash ${socket.plugHash}`);

        // Look up the plug item in manifest
        const plugItem = await this.lookupPlugInManifest(socket.plugHash);
        if (!plugItem) {
          console.log(`❌ Socket ${socketIndex}: Could not find plugHash ${socket.plugHash} in manifest`);
          continue;
        }

        console.log(`🔍 Socket ${socketIndex}: Found "${plugItem.displayProperties?.name || 'Unknown'}" (${plugItem.itemTypeDisplayName || 'Unknown Type'})`);

        // Categorize the socket item
        const socketCategory = await this.categorizeSocketItem(plugItem);
        console.log(`🏷️ Socket ${socketIndex}: Categorized as "${socketCategory}"`);

        // Create processed socket item
        const processedSocketItem = {
          name: plugItem.displayProperties?.name || `Unknown_${socket.plugHash}`,
          description: plugItem.displayProperties?.description || '',
          icon: plugItem.displayProperties?.icon || '',
          hash: socket.plugHash,
          itemType: plugItem.itemTypeDisplayName || 'Unknown',
          socketIndex: socketIndex,
          isEnabled: socket.isEnabled || false,
          isVisible: socket.isVisible !== false
        };

        // Add to appropriate category based on socket item type
        switch (socketCategory) {
          case 'aspect':
            subclass.aspects.push(processedSocketItem);
            console.log(`➕ Added aspect: ${processedSocketItem.name}`);
            break;
          case 'fragment':
            subclass.fragments.push(processedSocketItem);
            console.log(`➕ Added fragment: ${processedSocketItem.name}`);
            break;
          case 'grenade':
            subclass.abilities.grenade = processedSocketItem;
            console.log(`➕ Added grenade ability: ${processedSocketItem.name}`);
            break;
          case 'melee':
            subclass.abilities.melee = processedSocketItem;
            console.log(`➕ Added melee ability: ${processedSocketItem.name}`);
            break;
          case 'classAbility':
            subclass.abilities.classAbility = processedSocketItem;
            console.log(`➕ Added class ability: ${processedSocketItem.name}`);
            break;
          case 'super':
            subclass.abilities.super = processedSocketItem;
            console.log(`➕ Added super ability: ${processedSocketItem.name}`);
            break;
          default:
            // Unknown socket items go to mods for now
            subclass.mods.push(processedSocketItem);
            console.log(`➕ Added unknown socket item to mods: ${processedSocketItem.name}`);
        }
      }

      console.log(`🎯 Socket extraction complete. Found: ${subclass.aspects.length} aspects, ${subclass.fragments.length} fragments, abilities: ${!!subclass.abilities.grenade}/${!!subclass.abilities.melee}/${!!subclass.abilities.classAbility}/${!!subclass.abilities.super}`);

    } catch (error) {
      console.error('Error extracting subclass abilities from sockets:', error);
    }
  }

  /**
   * Look up a plug item in DestinyInventoryItemDefinition
   * Fixed to use numeric keys first (matching working data viewer approach)
   */
  async lookupPlugInManifest(plugHash) {
    try {
      // Load the complete inventory definition table
      const analysisData = await this.manifestLoader.loadAnalysisData();

      if (!analysisData.inventoryItems) {
        console.warn('DestinyInventoryItemDefinition not loaded');
        return null;
      }

      let plugItem = null;

      // Try numeric key first (working data viewer approach)
      plugItem = analysisData.inventoryItems[plugHash];

      // Fallback: try string key if numeric fails
      if (!plugItem) {
        plugItem = analysisData.inventoryItems[String(plugHash)];
      }

      // Final fallback: try unsigned 32-bit conversion
      if (!plugItem && plugHash < 0) {
        const unsignedHash = plugHash >>> 0;
        plugItem = analysisData.inventoryItems[unsignedHash];
      }

      if (!plugItem) {
        console.warn(`Plug ${plugHash} not found in DestinyInventoryItemDefinition (tried numeric, string, and unsigned)`);
        return null;
      }

      // Don't filter blacklisted/redacted items - working data viewer doesn't
      // if (plugItem.blacklisted || plugItem.redacted) {
      //   console.warn(`Plug ${plugHash} is blacklisted or redacted`);
      //   return null;
      // }

      return plugItem;
    } catch (error) {
      console.error('Error looking up plug in manifest:', error);
      return null;
    }
  }

  /**
   * Normalize hash for consistent lookup (handle signed/unsigned conversion)
   */
  normalizeHash(hash) {
    if (typeof hash === 'string') {
      hash = parseInt(hash);
    }

    // Convert negative to unsigned 32-bit
    if (hash < 0) {
      return (hash >>> 0).toString();
    }

    return hash.toString();
  }

  /**
   * Ensure analysis data is loaded (including DestinyInventoryItemDefinition)
   */
  async ensureAnalysisDataLoaded() {
    if (!this.analysisDataPromise) {
      this.analysisDataPromise = this.manifestLoader.loadAnalysisData();
    }
    return await this.analysisDataPromise;
  }

  /**
   * Categorize a socket item based on its properties
   * FIXED: Based on actual manifest data analysis - all subclass items share category hashes 59 and 1043342778
   * We need to categorize by name patterns, not different category hashes
   */
  async categorizeSocketItem(plugItem) {
    if (!plugItem) return 'unknown';

    const itemType = plugItem.itemTypeDisplayName?.toLowerCase() || '';
    const name = plugItem.displayProperties?.name?.toLowerCase() || '';
    const description = plugItem.displayProperties?.description?.toLowerCase() || '';

    // Debug logging for problematic hashes we were testing
    const itemHash = plugItem.hash || 'unknown';
    if ([1282157891, 3721022585, 2463983862, 1680616210, 2470512752, 4037640975, 2111549310, 1051276350, 1051276348, 424005861].includes(itemHash)) {
      console.log(`🧪 Categorizing hash ${itemHash}: "${plugItem.displayProperties?.name}" with categories [${plugItem.itemCategoryHashes?.join(', ') || 'none'}]`);
    }

    // Verify this is a subclass-related item first
    if (plugItem.itemCategoryHashes) {
      const hasSubclassCategory = plugItem.itemCategoryHashes.includes(59) ||
                                  plugItem.itemCategoryHashes.includes(1043342778);

      if (!hasSubclassCategory) {
        return 'other'; // Not a subclass item
      }
    }

    // Categorize by name patterns (based on actual manifest data analysis)

    // Helper function to return result with debug logging
    const returnResult = (category) => {
      if ([1282157891, 3721022585, 2463983862, 1680616210, 2470512752, 4037640975, 2111549310, 1051276350, 1051276348, 424005861].includes(itemHash)) {
        console.log(`🏷️ Hash ${itemHash} categorized as: ${category}`);
      }
      return category;
    };

    // Prismatic fragments (Facets)
    if (name.includes('facet')) return returnResult('fragment');

    // Solar fragments (Embers)
    if (name.includes('ember')) return returnResult('fragment');

    // Arc fragments (Spark)
    if (name.includes('spark')) return returnResult('fragment');

    // Void fragments (Echo)
    if (name.includes('echo')) return returnResult('fragment');

    // Stasis fragments (Whisper)
    if (name.includes('whisper')) return returnResult('fragment');

    // Strand fragments (Thread)
    if (name.includes('thread') && name.includes('of')) return returnResult('fragment');

    // Empty fragment sockets
    if (name.includes('empty fragment socket')) return returnResult('fragment');

    // Empty aspect sockets
    if (name.includes('empty aspect socket')) return returnResult('aspect');

    // General fragment detection
    if (name.includes('fragment')) return returnResult('fragment');

    // General aspect detection
    if (name.includes('aspect')) return returnResult('aspect');

    // Class abilities (Dodge, Rift, Barricade)
    if (name.includes('dodge') || name.includes('rift') || name.includes('barricade') ||
        name.includes('barrier')) return returnResult('classAbility');

    // Movement abilities (Jump, Glide, Lift)
    if (name.includes('jump') || name.includes('glide') || name.includes('lift') ||
        name.includes('blink')) return returnResult('classAbility');

    // Grenade abilities
    if (name.includes('grenade') || name.includes('tripmine') || name.includes('pulse') ||
        name.includes('magnetic') || name.includes('fusion') || name.includes('storm') ||
        name.includes('lightning') || name.includes('solar') || name.includes('voidwall') ||
        name.includes('suppressor') || name.includes('scatter') || name.includes('axion') ||
        name.includes('vortex') || name.includes('spike') || name.includes('swarm')) return returnResult('grenade');

    // Melee abilities
    if (name.includes('knife') || name.includes('hammer') || name.includes('palm') ||
        name.includes('strike') || name.includes('charge') || name.includes('slap') ||
        name.includes('punch') || name.includes('lash') || name.includes('snap')) return returnResult('melee');

    // Super abilities (usually longer descriptive names)
    if (name.includes('golden gun') || name.includes('blade barrage') || name.includes('burning maul') ||
        name.includes('sentinel') || name.includes('nova') || name.includes('storm') ||
        name.includes('dawnblade') || name.includes('fists') || name.includes('tether') ||
        name.includes('spectral') || name.includes('chaos reach') || name.includes('well') ||
        name.includes('ward') || name.includes('banner') || name.includes('gathering storm') ||
        name.includes('needlestorm') || name.includes('silkstrike') || name.includes('bladefury')) return returnResult('super');

    // Ability-like items that don't fit other categories
    if (name.includes('grapple') || name.includes('woven') || name.includes('threaded')) return returnResult('ability');

    // Default for subclass items we can't categorize
    const result = 'ability';

    // Debug logging for the result
    if ([1282157891, 3721022585, 2463983862, 1680616210, 2470512752, 4037640975, 2111549310, 1051276350, 1051276348, 424005861].includes(itemHash)) {
      console.log(`🏷️ Hash ${itemHash} categorized as: ${result}`);
    }

    return result;
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