/**
 * Storage Manager - Handles localStorage operations for layouts and tabs
 * Extracted from sick-on-tuesday dashboard
 */

export class StorageManager {
  constructor() {
    // Storage keys - maintain compatibility with existing data
    this.TABS_KEY = 'sot_tabs_meta_v5';
    this.LAYOUT_KEY_PREFIX = 'sot_layout_';
    this.ACTIVE_TAB_KEY = 'sot_active_tab_id_v5';
  }

  // ========== Tab Management ==========

  /**
   * Load tabs metadata from localStorage
   */
  loadTabsMeta() {
    try {
      const raw = localStorage.getItem(this.TABS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) {
          return parsed;
        }
      }
    } catch (error) {
      console.warn('Failed to load tabs metadata:', error);
    }

    // Return default tab if no valid data
    const defaultTabs = [{
      id: 'layout1',
      name: 'Layout 1',
      color: '#7dd3fc'
    }];

    this.saveTabsMeta(defaultTabs);
    return defaultTabs;
  }

  /**
   * Save tabs metadata to localStorage
   */
  saveTabsMeta(tabs) {
    try {
      localStorage.setItem(this.TABS_KEY, JSON.stringify(tabs));
      return true;
    } catch (error) {
      console.error('Failed to save tabs metadata:', error);
      return false;
    }
  }

  /**
   * Get active tab ID
   */
  getActiveTabId() {
    try {
      return localStorage.getItem(this.ACTIVE_TAB_KEY);
    } catch (error) {
      console.warn('Failed to get active tab ID:', error);
      return null;
    }
  }

  /**
   * Set active tab ID
   */
  setActiveTabId(tabId) {
    try {
      localStorage.setItem(this.ACTIVE_TAB_KEY, tabId);
      return true;
    } catch (error) {
      console.error('Failed to set active tab ID:', error);
      return false;
    }
  }

  /**
   * Create new tab with unique ID
   */
  createTab(name, color = '#7dd3fc') {
    const tabs = this.loadTabsMeta();
    const id = `layout${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newTab = { id, name, color };
    tabs.push(newTab);

    if (this.saveTabsMeta(tabs)) {
      return newTab;
    }

    return null;
  }

  /**
   * Delete tab and its associated layout
   */
  deleteTab(tabId) {
    const tabs = this.loadTabsMeta();
    const tabIndex = tabs.findIndex(tab => tab.id === tabId);

    if (tabIndex === -1) return false;

    // Remove tab from metadata
    tabs.splice(tabIndex, 1);

    // Delete associated layout
    this.deleteLayout(tabId);

    return this.saveTabsMeta(tabs);
  }

  /**
   * Update tab properties
   */
  updateTab(tabId, updates) {
    const tabs = this.loadTabsMeta();
    const tab = tabs.find(t => t.id === tabId);

    if (!tab) return false;

    Object.assign(tab, updates);
    return this.saveTabsMeta(tabs);
  }

  // ========== Layout Management ==========

  /**
   * Save layout for a specific tab
   */
  saveLayout(tabId, layoutData) {
    if (!tabId || !layoutData) return false;

    try {
      const data = Array.isArray(layoutData) ? layoutData : [layoutData];
      const cleanData = data.map(({ id, x, y, w, h, hidden }) => ({
        id, x, y, w, h, hidden: !!hidden
      }));

      localStorage.setItem(this.LAYOUT_KEY_PREFIX + tabId, JSON.stringify(cleanData));
      return true;
    } catch (error) {
      console.error('Failed to save layout:', error);
      return false;
    }
  }

  /**
   * Load layout for a specific tab
   */
  loadLayout(tabId, defaultLayout = []) {
    if (!tabId) return defaultLayout;

    try {
      const raw = localStorage.getItem(this.LAYOUT_KEY_PREFIX + tabId);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (error) {
      console.warn('Failed to load layout:', error);
    }

    return defaultLayout;
  }

  /**
   * Delete layout data
   */
  deleteLayout(tabId) {
    try {
      localStorage.removeItem(this.LAYOUT_KEY_PREFIX + tabId);
      return true;
    } catch (error) {
      console.error('Failed to delete layout:', error);
      return false;
    }
  }

  /**
   * Check if layout exists for tab
   */
  hasLayout(tabId) {
    try {
      return localStorage.getItem(this.LAYOUT_KEY_PREFIX + tabId) !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Copy layout from one tab to another
   */
  copyLayout(fromTabId, toTabId) {
    const layout = this.loadLayout(fromTabId);
    if (layout.length > 0) {
      return this.saveLayout(toTabId, layout);
    }
    return false;
  }

  // ========== Bulk Operations ==========

  /**
   * Delete multiple tabs and their layouts
   * Returns undo data for restoration
   */
  bulkDeleteTabs(tabIds) {
    if (!Array.isArray(tabIds) || tabIds.length === 0) return null;

    const tabs = this.loadTabsMeta();
    const undoData = {
      metas: [],
      layouts: {},
      indices: [],
      prevActiveId: this.getActiveTabId()
    };

    // Collect data for undo
    tabIds.forEach(id => {
      const index = tabs.findIndex(t => t.id === id);
      if (index !== -1) {
        undoData.metas.push({ ...tabs[index] });
        undoData.indices.push(index);

        const layoutKey = this.LAYOUT_KEY_PREFIX + id;
        const layoutData = localStorage.getItem(layoutKey);
        if (layoutData) {
          undoData.layouts[id] = layoutData;
        }
      }
    });

    // Perform deletion
    const remainingTabs = tabs.filter(t => !tabIds.includes(t.id));

    if (remainingTabs.length < 1) {
      throw new Error('Cannot delete all tabs');
    }

    // Delete layouts
    tabIds.forEach(id => this.deleteLayout(id));

    // Save remaining tabs
    if (this.saveTabsMeta(remainingTabs)) {
      return undoData;
    }

    return null;
  }

  /**
   * Restore tabs from undo data
   */
  restoreFromUndo(undoData) {
    if (!undoData || !undoData.metas || !Array.isArray(undoData.metas)) {
      return false;
    }

    const tabs = this.loadTabsMeta();

    // Restore tab metadata
    undoData.metas.forEach((meta, i) => {
      const index = undoData.indices[i];
      tabs.splice(index, 0, meta);
    });

    // Restore layouts
    for (const tabId in undoData.layouts) {
      localStorage.setItem(this.LAYOUT_KEY_PREFIX + tabId, undoData.layouts[tabId]);
    }

    // Save metadata and restore active tab
    if (this.saveTabsMeta(tabs)) {
      if (undoData.prevActiveId) {
        this.setActiveTabId(undoData.prevActiveId);
      }
      return true;
    }

    return false;
  }

  // ========== Utility Functions ==========

  /**
   * Get storage usage information
   */
  getStorageStats() {
    try {
      const tabs = this.loadTabsMeta();
      const layouts = {};
      let totalSize = 0;

      // Calculate size of tabs metadata
      const tabsSize = JSON.stringify(tabs).length;
      totalSize += tabsSize;

      // Calculate size of each layout
      tabs.forEach(tab => {
        const layoutData = localStorage.getItem(this.LAYOUT_KEY_PREFIX + tab.id);
        if (layoutData) {
          layouts[tab.id] = layoutData.length;
          totalSize += layoutData.length;
        }
      });

      return {
        totalSize,
        tabsMetaSize: tabsSize,
        layoutSizes: layouts,
        tabCount: tabs.length,
        layoutCount: Object.keys(layouts).length
      };
    } catch (error) {
      console.error('Failed to calculate storage stats:', error);
      return null;
    }
  }

  /**
   * Clear all dashboard data (with confirmation)
   */
  clearAllData() {
    try {
      // Get all keys for this dashboard
      const keysToRemove = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key === this.TABS_KEY ||
          key === this.ACTIVE_TAB_KEY ||
          key.startsWith(this.LAYOUT_KEY_PREFIX)
        )) {
          keysToRemove.push(key);
        }
      }

      // Remove all keys
      keysToRemove.forEach(key => localStorage.removeItem(key));

      return true;
    } catch (error) {
      console.error('Failed to clear data:', error);
      return false;
    }
  }

  /**
   * Export all data for backup
   */
  exportData() {
    try {
      const tabs = this.loadTabsMeta();
      const layouts = {};

      tabs.forEach(tab => {
        const layout = this.loadLayout(tab.id);
        if (layout.length > 0) {
          layouts[tab.id] = layout;
        }
      });

      return {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        tabs,
        layouts,
        activeTabId: this.getActiveTabId()
      };
    } catch (error) {
      console.error('Failed to export data:', error);
      return null;
    }
  }

  /**
   * Import data from backup
   */
  importData(data) {
    try {
      if (!data || !data.tabs || !Array.isArray(data.tabs)) {
        throw new Error('Invalid import data format');
      }

      // Save tabs
      if (!this.saveTabsMeta(data.tabs)) {
        throw new Error('Failed to save tabs metadata');
      }

      // Save layouts
      if (data.layouts) {
        for (const tabId in data.layouts) {
          if (!this.saveLayout(tabId, data.layouts[tabId])) {
            console.warn(`Failed to import layout for tab ${tabId}`);
          }
        }
      }

      // Set active tab
      if (data.activeTabId) {
        this.setActiveTabId(data.activeTabId);
      }

      return true;
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  }
}