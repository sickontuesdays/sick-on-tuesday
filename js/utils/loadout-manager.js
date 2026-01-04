/**
 * Loadout Manager - Handles loadout saving, loading, sharing, and equipping
 */

import { apiClient } from '../api/bungie-api-client.js';
import { storageManager } from '../core/storage-manager.js';
import { manifestLoader } from '../api/manifest-loader.js';

export class LoadoutManager {
  constructor() {
    this.loadouts = [];
    this.maxLoadouts = 50;
  }

  /**
   * Initialize loadout manager
   */
  init() {
    this.loadouts = storageManager.getLoadouts() || [];
  }

  /**
   * Get all loadouts
   */
  getLoadouts() {
    return this.loadouts;
  }

  /**
   * Get loadouts for a specific class
   */
  getLoadoutsForClass(className) {
    return this.loadouts.filter(l =>
      l.class?.toLowerCase() === className?.toLowerCase()
    );
  }

  /**
   * Get a loadout by ID
   */
  getLoadout(loadoutId) {
    return this.loadouts.find(l => l.id === loadoutId);
  }

  /**
   * Create a new loadout from current equipment
   */
  async createFromEquipped(name, characterId) {
    try {
      const profile = await apiClient.getProfile();

      if (!profile?.profileData) {
        throw new Error('Profile data not available');
      }

      const character = profile.profileData.characters?.data?.[characterId];
      const equipment = profile.profileData.characterEquipment?.data?.[characterId]?.items || [];
      const instances = profile.profileData.itemComponents?.instances?.data || {};

      if (!character) {
        throw new Error('Character not found');
      }

      const loadout = {
        id: this.generateId(),
        name: name || 'New Loadout',
        class: this.getClassName(character.classType),
        classType: character.classType,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        items: []
      };

      // Process equipped items
      equipment.forEach(item => {
        const instance = instances[item.itemInstanceId];
        const definition = manifestLoader.getItemDefinition(item.itemHash);

        if (definition) {
          loadout.items.push({
            itemHash: item.itemHash,
            itemInstanceId: item.itemInstanceId,
            bucketHash: item.bucketHash,
            name: definition.displayProperties?.name,
            icon: definition.displayProperties?.icon,
            tierType: definition.inventory?.tierType,
            isEquipped: true
          });
        }
      });

      // Save loadout
      this.loadouts.push(loadout);
      this.saveLoadouts();

      return loadout;
    } catch (error) {
      console.error('Failed to create loadout:', error);
      throw error;
    }
  }

  /**
   * Create a loadout from build crafter data
   */
  createFromBuild(buildData) {
    const loadout = {
      id: this.generateId(),
      name: buildData.name || 'Build Loadout',
      class: buildData.class,
      element: buildData.element,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      buildData: {
        exotic: buildData.exotic,
        aspects: buildData.aspects,
        fragments: buildData.fragments,
        stats: buildData.stats,
        mods: buildData.mods,
        notes: buildData.notes
      },
      items: []
    };

    this.loadouts.push(loadout);
    this.saveLoadouts();

    return loadout;
  }

  /**
   * Update an existing loadout
   */
  updateLoadout(loadoutId, updates) {
    const index = this.loadouts.findIndex(l => l.id === loadoutId);
    if (index === -1) {
      throw new Error('Loadout not found');
    }

    this.loadouts[index] = {
      ...this.loadouts[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.saveLoadouts();
    return this.loadouts[index];
  }

  /**
   * Delete a loadout
   */
  deleteLoadout(loadoutId) {
    const index = this.loadouts.findIndex(l => l.id === loadoutId);
    if (index === -1) {
      throw new Error('Loadout not found');
    }

    this.loadouts.splice(index, 1);
    this.saveLoadouts();
  }

  /**
   * Duplicate a loadout
   */
  duplicateLoadout(loadoutId) {
    const original = this.getLoadout(loadoutId);
    if (!original) {
      throw new Error('Loadout not found');
    }

    const duplicate = {
      ...JSON.parse(JSON.stringify(original)),
      id: this.generateId(),
      name: `${original.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.loadouts.push(duplicate);
    this.saveLoadouts();

    return duplicate;
  }

  /**
   * Equip a loadout (requires Bungie API support)
   */
  async equipLoadout(loadoutId, characterId) {
    const loadout = this.getLoadout(loadoutId);
    if (!loadout) {
      throw new Error('Loadout not found');
    }

    if (!loadout.items || loadout.items.length === 0) {
      throw new Error('Loadout has no items to equip');
    }

    const results = {
      success: [],
      failed: []
    };

    // Equip items one by one
    for (const item of loadout.items) {
      if (!item.itemInstanceId) continue;

      try {
        await apiClient.equipItem(item.itemInstanceId, characterId);
        results.success.push(item);
      } catch (error) {
        results.failed.push({
          item,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Generate a shareable link for a loadout
   */
  generateShareLink(loadoutId) {
    const loadout = this.getLoadout(loadoutId);
    if (!loadout) {
      throw new Error('Loadout not found');
    }

    // Create a compact shareable version
    const shareData = {
      n: loadout.name,
      c: loadout.class,
      e: loadout.element,
      b: loadout.buildData ? {
        x: loadout.buildData.exotic,
        a: loadout.buildData.aspects,
        f: loadout.buildData.fragments
      } : null,
      i: loadout.items?.map(item => ({
        h: item.itemHash,
        b: item.bucketHash
      })) || []
    };

    const encoded = btoa(JSON.stringify(shareData));
    const baseUrl = window.location.origin + window.location.pathname;

    return `${baseUrl}?loadout=${encoded}`;
  }

  /**
   * Import a loadout from a share link
   */
  importFromShareLink(shareData) {
    try {
      const decoded = JSON.parse(atob(shareData));

      const loadout = {
        id: this.generateId(),
        name: decoded.n || 'Imported Loadout',
        class: decoded.c,
        element: decoded.e,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        imported: true,
        buildData: decoded.b ? {
          exotic: decoded.b.x,
          aspects: decoded.b.a,
          fragments: decoded.b.f
        } : null,
        items: decoded.i?.map(item => ({
          itemHash: item.h,
          bucketHash: item.b
        })) || []
      };

      this.loadouts.push(loadout);
      this.saveLoadouts();

      return loadout;
    } catch (error) {
      console.error('Failed to import loadout:', error);
      throw new Error('Invalid loadout share link');
    }
  }

  /**
   * Export loadout to DIM format
   */
  exportToDIM(loadoutId) {
    const loadout = this.getLoadout(loadoutId);
    if (!loadout) {
      throw new Error('Loadout not found');
    }

    // DIM loadout format
    const dimLoadout = {
      id: loadout.id,
      name: loadout.name,
      classType: loadout.classType,
      equipped: loadout.items?.filter(i => i.isEquipped).map(item => ({
        hash: item.itemHash,
        id: item.itemInstanceId
      })) || [],
      unequipped: loadout.items?.filter(i => !i.isEquipped).map(item => ({
        hash: item.itemHash,
        id: item.itemInstanceId
      })) || []
    };

    return JSON.stringify(dimLoadout, null, 2);
  }

  /**
   * Import loadout from DIM format
   */
  importFromDIM(dimData) {
    try {
      const parsed = typeof dimData === 'string' ? JSON.parse(dimData) : dimData;

      const loadout = {
        id: this.generateId(),
        name: parsed.name || 'Imported from DIM',
        classType: parsed.classType,
        class: this.getClassName(parsed.classType),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        imported: true,
        importedFrom: 'DIM',
        items: []
      };

      // Add equipped items
      if (parsed.equipped) {
        parsed.equipped.forEach(item => {
          loadout.items.push({
            itemHash: item.hash,
            itemInstanceId: item.id,
            isEquipped: true
          });
        });
      }

      // Add unequipped items
      if (parsed.unequipped) {
        parsed.unequipped.forEach(item => {
          loadout.items.push({
            itemHash: item.hash,
            itemInstanceId: item.id,
            isEquipped: false
          });
        });
      }

      this.loadouts.push(loadout);
      this.saveLoadouts();

      return loadout;
    } catch (error) {
      console.error('Failed to import DIM loadout:', error);
      throw new Error('Invalid DIM loadout format');
    }
  }

  /**
   * Save loadouts to storage
   */
  saveLoadouts() {
    // Limit to max loadouts
    if (this.loadouts.length > this.maxLoadouts) {
      this.loadouts = this.loadouts.slice(-this.maxLoadouts);
    }

    storageManager.saveLoadouts(this.loadouts);
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `loadout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get class name from type
   */
  getClassName(classType) {
    const classes = ['Titan', 'Hunter', 'Warlock'];
    return classes[classType] || 'Unknown';
  }

  /**
   * Clear all loadouts
   */
  clearAll() {
    this.loadouts = [];
    this.saveLoadouts();
  }
}

export const loadoutManager = new LoadoutManager();
export default LoadoutManager;
