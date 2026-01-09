/**
 * Inventory Processor - DIM-style item categorization and processing
 * Combines manifest definitions with instance data for accurate categorization
 */

import { manifestLoader, ITEM_CATEGORIES, DAMAGE_TYPES, BUCKET_HASHES } from '../api/manifest-loader.js';

// Weapon bucket hashes
const WEAPON_BUCKETS = {
  [BUCKET_HASHES.KINETIC_WEAPONS]: 'kinetic',
  [BUCKET_HASHES.ENERGY_WEAPONS]: 'energy',
  [BUCKET_HASHES.POWER_WEAPONS]: 'power'
};

// Armor bucket hashes
const ARMOR_BUCKETS = {
  [BUCKET_HASHES.HELMET]: 'helmet',
  [BUCKET_HASHES.GAUNTLETS]: 'gauntlets',
  [BUCKET_HASHES.CHEST_ARMOR]: 'chest',
  [BUCKET_HASHES.LEG_ARMOR]: 'legs',
  [BUCKET_HASHES.CLASS_ARMOR]: 'class'
};

// Class names
const CLASS_NAMES = {
  0: 'Titan',
  1: 'Hunter',
  2: 'Warlock'
};

// Tier types
const TIER_TYPES = {
  0: 'Unknown',
  1: 'Currency',
  2: 'Basic',
  3: 'Common',
  4: 'Rare',
  5: 'Legendary',
  6: 'Exotic'
};

// Stat hashes - Armor
const STAT_HASHES = {
  ATTACK: 1480404414,
  DEFENSE: 3897883278,
  MOBILITY: 2996146975,
  RESILIENCE: 392767087,
  RECOVERY: 1943323491,
  DISCIPLINE: 1735777505,
  INTELLECT: 144602215,
  STRENGTH: 4244567218
};

// Stat hashes - Weapons
const WEAPON_STAT_HASHES = {
  IMPACT: 4043523819,
  RANGE: 1240592695,
  STABILITY: 155624089,
  HANDLING: 943549884,
  RELOAD_SPEED: 4188031367,
  AIM_ASSISTANCE: 1345609583,
  ZOOM: 3555269338,
  MAGAZINE: 3871231066,
  ROUNDS_PER_MINUTE: 4284893193,
  CHARGE_TIME: 2961396640,
  DRAW_TIME: 447667954,
  ACCURACY: 1591432999,
  BLAST_RADIUS: 3614673599,
  VELOCITY: 2523465841,
  AIRBORNE: 2714457168,
  SHIELD_DURATION: 1842278586,
  CHARGE_RATE: 3022301683
};

export class InventoryProcessor {
  constructor() {
    this.manifestLoader = manifestLoader;
  }

  /**
   * Process complete profile data into organized inventory
   */
  processProfile(profileData) {
    const result = {
      characters: {},
      vault: { items: [], categories: {} },
      currencies: [],
      equipped: {},
      postmaster: {},
      summary: {
        totalItems: 0,
        weaponCount: 0,
        armorCount: 0,
        modCount: 0
      }
    };

    if (!profileData?.profileData) return result;

    const { profileData: data } = profileData;

    // Process characters
    if (data.characters?.data) {
      for (const [charId, charData] of Object.entries(data.characters.data)) {
        result.characters[charId] = this.processCharacter(charData);
      }
    }

    // Process character equipment
    if (data.characterEquipment?.data) {
      for (const [charId, equipData] of Object.entries(data.characterEquipment.data)) {
        result.equipped[charId] = this.processEquipment(
          equipData.items,
          data.itemComponents?.instances?.data,
          data.itemComponents?.stats?.data,
          data.itemComponents?.sockets?.data
        );
      }
    }

    // Process character inventories
    if (data.characterInventories?.data) {
      for (const [charId, invData] of Object.entries(data.characterInventories.data)) {
        if (!result.characters[charId]) continue;

        result.characters[charId].inventory = this.processInventory(
          invData.items,
          data.itemComponents?.instances?.data,
          data.itemComponents?.stats?.data,
          data.itemComponents?.sockets?.data
        );
      }
    }

    // Process vault (profile inventory)
    if (data.profileInventory?.data?.items) {
      result.vault = this.processVault(
        data.profileInventory.data.items,
        data.itemComponents?.instances?.data,
        data.itemComponents?.stats?.data,
        data.itemComponents?.sockets?.data
      );
    }

    // Process currencies
    if (data.profileCurrencies?.data?.items) {
      result.currencies = data.profileCurrencies.data.items.map(item => ({
        itemHash: item.itemHash,
        quantity: item.quantity
      }));
    }

    // Calculate summary
    this.calculateSummary(result);

    return result;
  }

  /**
   * Process character data
   */
  processCharacter(charData) {
    return {
      characterId: charData.characterId,
      classType: charData.classType,
      className: CLASS_NAMES[charData.classType] || 'Unknown',
      light: charData.light,
      emblemPath: charData.emblemPath,
      emblemBackgroundPath: charData.emblemBackgroundPath,
      emblemColor: charData.emblemColor,
      stats: charData.stats,
      raceType: charData.raceType,
      genderType: charData.genderType,
      dateLastPlayed: charData.dateLastPlayed,
      minutesPlayedTotal: charData.minutesPlayedTotal,
      inventory: []
    };
  }

  /**
   * Process equipped items
   */
  processEquipment(items, instances, stats, sockets) {
    const equipped = {
      weapons: { kinetic: null, energy: null, power: null },
      armor: { helmet: null, gauntlets: null, chest: null, legs: null, class: null },
      subclass: null,
      ghost: null,
      sparrow: null,
      ship: null
    };

    for (const item of items) {
      const processed = this.processItem(item, instances, stats, sockets);
      if (!processed) continue;

      const bucketHash = item.bucketHash;

      // Weapons
      if (WEAPON_BUCKETS[bucketHash]) {
        equipped.weapons[WEAPON_BUCKETS[bucketHash]] = processed;
      }
      // Armor
      else if (ARMOR_BUCKETS[bucketHash]) {
        equipped.armor[ARMOR_BUCKETS[bucketHash]] = processed;
      }
      // Subclass
      else if (bucketHash === BUCKET_HASHES.SUBCLASS) {
        equipped.subclass = processed;
      }
      // Ghost
      else if (bucketHash === BUCKET_HASHES.GHOST) {
        equipped.ghost = processed;
      }
      // Sparrow
      else if (bucketHash === BUCKET_HASHES.VEHICLE) {
        equipped.sparrow = processed;
      }
      // Ship
      else if (bucketHash === BUCKET_HASHES.SHIPS) {
        equipped.ship = processed;
      }
    }

    return equipped;
  }

  /**
   * Process inventory items
   */
  processInventory(items, instances, stats, sockets) {
    const inventory = {
      weapons: [],
      armor: [],
      mods: [],
      consumables: [],
      other: []
    };

    for (const item of items) {
      const processed = this.processItem(item, instances, stats, sockets);
      if (!processed) continue;

      if (processed.isWeapon) {
        inventory.weapons.push(processed);
      } else if (processed.isArmor) {
        inventory.armor.push(processed);
      } else if (processed.isMod) {
        inventory.mods.push(processed);
      } else if (processed.isConsumable) {
        inventory.consumables.push(processed);
      } else {
        inventory.other.push(processed);
      }
    }

    return inventory;
  }

  /**
   * Process vault items
   * Only includes actual vault items (weapons/armor), not shared profile items (consumables, mods)
   * Shared items like raid banners, consumables, and currencies are in profileInventory
   * but have bucket location: 0 (profile) rather than location: 2 (vault)
   */
  processVault(items, instances, stats, sockets) {
    const vault = {
      items: [],
      categories: {
        weapons: { kinetic: [], energy: [], power: [] },
        armor: { helmet: [], gauntlets: [], chest: [], legs: [], class: [] },
        other: []
      }
    };

    // Shared profile buckets that are NOT actual vault items
    // These are account-wide items that appear in profileInventory but aren't "in the vault"
    const sharedProfileBuckets = new Set([
      BUCKET_HASHES.CONSUMABLES,   // 1469714392 - Raid banners, consumables
      BUCKET_HASHES.MODIFICATIONS  // 3313201758 - Mods
    ]);

    for (const item of items) {
      // Skip shared profile items (consumables, mods, etc.)
      // These appear in profileInventory but aren't actual vault items
      if (sharedProfileBuckets.has(item.bucketHash)) {
        continue;
      }

      const processed = this.processItem(item, instances, stats, sockets);
      if (!processed) continue;

      vault.items.push(processed);

      // Categorize
      if (processed.isWeapon && processed.weaponSlot) {
        vault.categories.weapons[processed.weaponSlot]?.push(processed);
      } else if (processed.isArmor && processed.armorSlot) {
        vault.categories.armor[processed.armorSlot]?.push(processed);
      } else {
        vault.categories.other.push(processed);
      }
    }

    return vault;
  }

  /**
   * Process single item with definition + instance data
   * This is the DIM-style approach: combining static definitions with live instance data
   */
  processItem(item, instances, stats, sockets) {
    const definition = this.manifestLoader.getItemDefinition(item.itemHash);
    if (!definition) return null;

    const instance = instances?.[item.itemInstanceId];
    const itemStats = stats?.[item.itemInstanceId];
    const itemSockets = sockets?.[item.itemInstanceId];

    // Build processed item
    const processed = {
      // Basic info
      itemHash: item.itemHash,
      itemInstanceId: item.itemInstanceId,
      bucketHash: item.bucketHash,
      quantity: item.quantity || 1,

      // From definition
      name: definition.displayProperties?.name || 'Unknown',
      description: definition.displayProperties?.description || '',
      icon: definition.displayProperties?.icon
        ? `https://www.bungie.net${definition.displayProperties.icon}`
        : null,
      tierType: definition.inventory?.tierType || 0,
      tierTypeName: TIER_TYPES[definition.inventory?.tierType] || 'Unknown',
      itemType: definition.itemType,
      itemSubType: definition.itemSubType,
      classType: definition.classType,
      itemCategoryHashes: definition.itemCategoryHashes || [],

      // From instance (if available)
      primaryStat: instance?.primaryStat || null,
      damageType: instance?.damageType || 0,
      damageTypeHash: instance?.damageTypeHash,
      energy: instance?.energy || null,
      isEquipped: instance?.isEquipped || false,
      canEquip: instance?.canEquip ?? true,

      // Computed flags
      isWeapon: false,
      isArmor: false,
      isMod: false,
      isConsumable: false,
      isExotic: false,

      // Slots
      weaponSlot: null,
      armorSlot: null
    };

    // Determine item type using DIM's multi-layer validation
    this.categorizeItem(processed, definition, instance);

    // Add stats if available
    if (itemStats?.stats) {
      if (processed.isWeapon) {
        processed.stats = this.processWeaponStats(itemStats.stats);
      } else if (processed.isArmor) {
        processed.stats = this.processArmorStats(itemStats.stats);
      }
    }

    // Add sockets/perks if available (for weapons and armor)
    if (itemSockets?.sockets && (processed.isWeapon || processed.isArmor)) {
      processed.sockets = this.processSockets(itemSockets.sockets, definition);
    }

    return processed;
  }

  /**
   * Categorize item using DIM's multi-layer validation
   */
  categorizeItem(item, definition, instance) {
    const bucketHash = item.bucketHash;
    const itemType = definition.itemType;
    const primaryStat = instance?.primaryStat;
    const categoryHashes = definition.itemCategoryHashes || [];

    // LAYER 1: Check if it's a weapon
    // Weapons have itemType 3 (weapons) and attack stat (1480404414)
    if (WEAPON_BUCKETS[bucketHash]) {
      if (itemType === 3 && primaryStat?.statHash === STAT_HASHES.ATTACK) {
        item.isWeapon = true;
        item.weaponSlot = WEAPON_BUCKETS[bucketHash];
      }
    }

    // LAYER 2: Check if it's armor
    // Armor has itemType 2 and defense stat (3897883278)
    if (ARMOR_BUCKETS[bucketHash]) {
      if (itemType === 2) {
        // For armor, check for defense stat or energy capacity
        if (primaryStat?.statHash === STAT_HASHES.DEFENSE || instance?.energy) {
          item.isArmor = true;
          item.armorSlot = ARMOR_BUCKETS[bucketHash];
        }
      }
    }

    // LAYER 3: Check for mods
    if (itemType === 19 || categoryHashes.includes(ITEM_CATEGORIES.MOD)) {
      item.isMod = true;
    }

    // LAYER 4: Check for consumables
    if (itemType === 35 || categoryHashes.includes(ITEM_CATEGORIES.CONSUMABLE)) {
      item.isConsumable = true;
    }

    // LAYER 5: Check exotic status
    if (definition.inventory?.tierType === 6) {
      item.isExotic = true;
    }
  }

  /**
   * Process armor stats (Mobility, Resilience, etc.)
   */
  processArmorStats(statsData) {
    const statNames = {
      [STAT_HASHES.MOBILITY]: 'Mobility',
      [STAT_HASHES.RESILIENCE]: 'Resilience',
      [STAT_HASHES.RECOVERY]: 'Recovery',
      [STAT_HASHES.DISCIPLINE]: 'Discipline',
      [STAT_HASHES.INTELLECT]: 'Intellect',
      [STAT_HASHES.STRENGTH]: 'Strength'
    };

    const processed = {};

    for (const [hash, data] of Object.entries(statsData)) {
      const statName = statNames[hash];
      if (statName) {
        processed[statName.toLowerCase()] = data.value;
      }
    }

    // Calculate total
    processed.total = Object.values(processed).reduce((sum, val) => sum + (val || 0), 0);

    return processed;
  }

  /**
   * Process weapon stats (Impact, Range, Stability, etc.)
   */
  processWeaponStats(statsData) {
    const statNames = {
      [WEAPON_STAT_HASHES.IMPACT]: 'Impact',
      [WEAPON_STAT_HASHES.RANGE]: 'Range',
      [WEAPON_STAT_HASHES.STABILITY]: 'Stability',
      [WEAPON_STAT_HASHES.HANDLING]: 'Handling',
      [WEAPON_STAT_HASHES.RELOAD_SPEED]: 'Reload Speed',
      [WEAPON_STAT_HASHES.AIM_ASSISTANCE]: 'Aim Assist',
      [WEAPON_STAT_HASHES.ZOOM]: 'Zoom',
      [WEAPON_STAT_HASHES.MAGAZINE]: 'Magazine',
      [WEAPON_STAT_HASHES.ROUNDS_PER_MINUTE]: 'RPM',
      [WEAPON_STAT_HASHES.CHARGE_TIME]: 'Charge Time',
      [WEAPON_STAT_HASHES.DRAW_TIME]: 'Draw Time',
      [WEAPON_STAT_HASHES.ACCURACY]: 'Accuracy',
      [WEAPON_STAT_HASHES.BLAST_RADIUS]: 'Blast Radius',
      [WEAPON_STAT_HASHES.VELOCITY]: 'Velocity',
      [WEAPON_STAT_HASHES.AIRBORNE]: 'Airborne',
      [WEAPON_STAT_HASHES.SHIELD_DURATION]: 'Shield Duration',
      [WEAPON_STAT_HASHES.CHARGE_RATE]: 'Charge Rate'
    };

    const processed = {};

    for (const [hash, data] of Object.entries(statsData)) {
      const statName = statNames[hash];
      if (statName) {
        processed[statName] = data.value;
      }
    }

    return processed;
  }

  /**
   * Process item sockets (perks, mods, etc.)
   */
  processSockets(socketsData, definition) {
    const sockets = [];
    const socketEntries = definition?.sockets?.socketEntries || [];

    for (let i = 0; i < socketsData.length; i++) {
      const socket = socketsData[i];
      const socketEntry = socketEntries[i];

      // Skip empty sockets
      if (!socket.plugHash) continue;

      // Get plug definition from manifest
      const plugDef = this.manifestLoader.getItemDefinition(socket.plugHash);
      if (!plugDef) continue;

      // Determine socket type from category
      const socketCategoryHash = socketEntry?.socketTypeHash;
      const isVisible = socket.isVisible !== false;

      // Only include visible sockets with display properties
      if (!isVisible || !plugDef.displayProperties?.name) continue;

      sockets.push({
        plugHash: socket.plugHash,
        name: plugDef.displayProperties.name,
        description: plugDef.displayProperties.description || '',
        icon: plugDef.displayProperties.icon
          ? `https://www.bungie.net${plugDef.displayProperties.icon}`
          : null,
        isEnabled: socket.isEnabled !== false,
        // Categorize the socket type
        isPerk: this.isWeaponPerk(plugDef),
        isMod: this.isModSocket(plugDef),
        isIntrinsic: this.isIntrinsicPerk(plugDef),
        isMasterwork: this.isMasterwork(plugDef),
        socketIndex: i
      });
    }

    return sockets;
  }

  /**
   * Check if plug is a weapon perk (column perks)
   */
  isWeaponPerk(plugDef) {
    const categoryHashes = plugDef.itemCategoryHashes || [];
    // Weapon perk category hashes
    return categoryHashes.includes(610365472) || // Weapon Perks
           categoryHashes.includes(7906839) ||   // Weapon Perks (Barrels, etc.)
           plugDef.plug?.plugCategoryIdentifier?.includes('frames') ||
           plugDef.plug?.plugCategoryIdentifier?.includes('barrels') ||
           plugDef.plug?.plugCategoryIdentifier?.includes('magazines') ||
           plugDef.plug?.plugCategoryIdentifier?.includes('traits');
  }

  /**
   * Check if plug is a mod
   */
  isModSocket(plugDef) {
    const categoryHashes = plugDef.itemCategoryHashes || [];
    return categoryHashes.includes(59) || // Mod category
           plugDef.plug?.plugCategoryIdentifier?.includes('mod');
  }

  /**
   * Check if plug is an intrinsic perk (exotic perk, frame type)
   */
  isIntrinsicPerk(plugDef) {
    return plugDef.plug?.plugCategoryIdentifier?.includes('intrinsics') ||
           plugDef.itemTypeDisplayName?.toLowerCase().includes('intrinsic');
  }

  /**
   * Check if plug is a masterwork
   */
  isMasterwork(plugDef) {
    return plugDef.plug?.plugCategoryIdentifier?.includes('masterworks') ||
           plugDef.itemTypeDisplayName?.toLowerCase().includes('masterwork');
  }

  /**
   * Calculate inventory summary
   */
  calculateSummary(result) {
    let totalItems = 0;
    let weaponCount = 0;
    let armorCount = 0;
    let modCount = 0;

    // Count vault items
    if (result.vault?.items) {
      totalItems += result.vault.items.length;
      result.vault.items.forEach(item => {
        if (item.isWeapon) weaponCount++;
        if (item.isArmor) armorCount++;
        if (item.isMod) modCount++;
      });
    }

    // Count character items
    for (const char of Object.values(result.characters)) {
      if (char.inventory) {
        totalItems += (char.inventory.weapons?.length || 0);
        totalItems += (char.inventory.armor?.length || 0);
        totalItems += (char.inventory.mods?.length || 0);
        totalItems += (char.inventory.consumables?.length || 0);
        totalItems += (char.inventory.other?.length || 0);

        weaponCount += (char.inventory.weapons?.length || 0);
        armorCount += (char.inventory.armor?.length || 0);
        modCount += (char.inventory.mods?.length || 0);
      }
    }

    result.summary = {
      totalItems,
      weaponCount,
      armorCount,
      modCount
    };
  }

  /**
   * Get weapon type name from subtype
   */
  getWeaponTypeName(itemSubType) {
    const types = {
      6: 'Auto Rifle',
      7: 'Shotgun',
      8: 'Machine Gun',
      9: 'Hand Cannon',
      10: 'Rocket Launcher',
      11: 'Fusion Rifle',
      12: 'Sniper Rifle',
      13: 'Pulse Rifle',
      14: 'Scout Rifle',
      17: 'Sidearm',
      18: 'Sword',
      22: 'Linear Fusion Rifle',
      23: 'Grenade Launcher',
      24: 'Submachine Gun',
      25: 'Trace Rifle',
      28: 'Combat Bow',
      31: 'Glaive'
    };
    return types[itemSubType] || 'Unknown';
  }

  /**
   * Get damage type name
   */
  getDamageTypeName(damageType) {
    const types = {
      0: 'None',
      1: 'Kinetic',
      2: 'Arc',
      3: 'Solar',
      4: 'Void',
      5: 'Raid',
      6: 'Stasis',
      7: 'Strand'
    };
    return types[damageType] || 'Unknown';
  }

  /**
   * Get damage type color
   */
  getDamageTypeColor(damageType) {
    const colors = {
      0: '#ffffff',
      1: '#c3bcb4',
      2: '#7dd3fc',
      3: '#f97316',
      4: '#a855f7',
      5: '#ffffff',
      6: '#38bdf8',
      7: '#22c55e'
    };
    return colors[damageType] || '#ffffff';
  }
}

export const inventoryProcessor = new InventoryProcessor();
export default InventoryProcessor;
