/**
 * Storage Manager - LocalStorage persistence for layouts, settings, and cache
 */

export class StorageManager {
  constructor() {
    this.prefix = 'sot_';
    this.version = 'v1';

    // Storage keys
    this.KEYS = {
      TABS_META: `${this.prefix}tabs_meta_${this.version}`,
      ACTIVE_TAB: `${this.prefix}active_tab_${this.version}`,
      LAYOUT_PREFIX: `${this.prefix}layout_`,
      SETTINGS: `${this.prefix}settings_${this.version}`,
      PANEL_VISIBILITY: `${this.prefix}panels_${this.version}`,
      LOADOUTS: `${this.prefix}loadouts_${this.version}`,
      CACHE_PREFIX: `${this.prefix}cache_`
    };
  }

  // ==================== LAYOUT TABS ====================

  /**
   * Load tabs metadata
   */
  loadTabsMeta() {
    const raw = localStorage.getItem(this.KEYS.TABS_META);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      } catch { }
    }

    // Default tabs
    const defaultTabs = [{ id: 'layout1', name: 'Default Layout', color: '#7dd3fc' }];
    localStorage.setItem(this.KEYS.TABS_META, JSON.stringify(defaultTabs));
    return defaultTabs;
  }

  /**
   * Save tabs metadata
   */
  saveTabsMeta(tabs) {
    localStorage.setItem(this.KEYS.TABS_META, JSON.stringify(tabs));
  }

  /**
   * Create new tab
   */
  createTab(name, color = '#7dd3fc') {
    const tabs = this.loadTabsMeta();
    const id = `layout${Date.now()}`;
    const newTab = { id, name, color };
    tabs.push(newTab);
    this.saveTabsMeta(tabs);
    return newTab;
  }

  /**
   * Update tab
   */
  updateTab(tabId, updates) {
    const tabs = this.loadTabsMeta();
    const index = tabs.findIndex(t => t.id === tabId);
    if (index !== -1) {
      tabs[index] = { ...tabs[index], ...updates };
      this.saveTabsMeta(tabs);
      return tabs[index];
    }
    return null;
  }

  /**
   * Delete tab
   */
  deleteTab(tabId) {
    const tabs = this.loadTabsMeta();
    const filtered = tabs.filter(t => t.id !== tabId);
    if (filtered.length === 0) {
      // Keep at least one tab
      return false;
    }
    this.saveTabsMeta(filtered);
    // Also delete associated layout
    localStorage.removeItem(this.KEYS.LAYOUT_PREFIX + tabId);
    return true;
  }

  /**
   * Get active tab ID
   */
  getActiveTabId() {
    return localStorage.getItem(this.KEYS.ACTIVE_TAB);
  }

  /**
   * Set active tab ID
   */
  setActiveTabId(tabId) {
    localStorage.setItem(this.KEYS.ACTIVE_TAB, tabId);
  }

  // ==================== LAYOUTS ====================

  /**
   * Save layout for tab
   */
  saveLayout(tabId, layoutData) {
    localStorage.setItem(this.KEYS.LAYOUT_PREFIX + tabId, JSON.stringify(layoutData));
  }

  /**
   * Load layout for tab
   */
  loadLayout(tabId, defaultLayout = []) {
    const raw = localStorage.getItem(this.KEYS.LAYOUT_PREFIX + tabId);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch { }
    }
    return defaultLayout;
  }

  // ==================== SETTINGS ====================

  /**
   * Get all settings
   */
  getSettings() {
    const raw = localStorage.getItem(this.KEYS.SETTINGS);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch { }
    }
    return this.getDefaultSettings();
  }

  /**
   * Save settings
   */
  saveSettings(settings) {
    localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(settings));
  }

  /**
   * Get single setting
   */
  getSetting(key, defaultValue = null) {
    const settings = this.getSettings();
    return settings[key] ?? defaultValue;
  }

  /**
   * Set single setting
   */
  setSetting(key, value) {
    const settings = this.getSettings();
    settings[key] = value;
    this.saveSettings(settings);
  }

  /**
   * Default settings
   */
  getDefaultSettings() {
    return {
      theme: 'dark',
      accentColor: '#7dd3fc',
      autoRefresh: true,
      refreshInterval: 5 * 60 * 1000, // 5 minutes
      showFriendsOnline: true,
      compactMode: false,
      animationsEnabled: true
    };
  }

  // ==================== PANEL VISIBILITY ====================

  /**
   * Get panel visibility state
   */
  getPanelVisibility() {
    const raw = localStorage.getItem(this.KEYS.PANEL_VISIBILITY);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch { }
    }
    return {};
  }

  /**
   * Set panel visibility
   */
  setPanelVisibility(panelId, visible) {
    const visibility = this.getPanelVisibility();
    visibility[panelId] = visible;
    localStorage.setItem(this.KEYS.PANEL_VISIBILITY, JSON.stringify(visibility));
  }

  // ==================== LOADOUTS ====================

  /**
   * Get saved loadouts
   */
  getLoadouts() {
    const raw = localStorage.getItem(this.KEYS.LOADOUTS);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch { }
    }
    return [];
  }

  /**
   * Save loadout
   */
  saveLoadout(loadout) {
    const loadouts = this.getLoadouts();
    const id = loadout.id || `loadout_${Date.now()}`;
    const existing = loadouts.findIndex(l => l.id === id);

    const newLoadout = {
      ...loadout,
      id,
      savedAt: Date.now()
    };

    if (existing !== -1) {
      loadouts[existing] = newLoadout;
    } else {
      loadouts.push(newLoadout);
    }

    localStorage.setItem(this.KEYS.LOADOUTS, JSON.stringify(loadouts));
    return newLoadout;
  }

  /**
   * Delete loadout
   */
  deleteLoadout(loadoutId) {
    const loadouts = this.getLoadouts();
    const filtered = loadouts.filter(l => l.id !== loadoutId);
    localStorage.setItem(this.KEYS.LOADOUTS, JSON.stringify(filtered));
  }

  /**
   * Save all loadouts (bulk save)
   */
  saveLoadouts(loadouts) {
    localStorage.setItem(this.KEYS.LOADOUTS, JSON.stringify(loadouts));
  }

  // ==================== CACHE ====================

  /**
   * Get cached data
   */
  getCache(key, maxAge = 5 * 60 * 1000) {
    const raw = localStorage.getItem(this.KEYS.CACHE_PREFIX + key);
    if (raw) {
      try {
        const cached = JSON.parse(raw);
        if (Date.now() - cached.timestamp < maxAge) {
          return cached.data;
        }
      } catch { }
    }
    return null;
  }

  /**
   * Set cached data
   */
  setCache(key, data) {
    localStorage.setItem(this.KEYS.CACHE_PREFIX + key, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  }

  /**
   * Clear cache
   */
  clearCache() {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.KEYS.CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  }

  // ==================== UTILITIES ====================

  /**
   * Export all data
   */
  exportData() {
    const data = {
      tabs: this.loadTabsMeta(),
      activeTab: this.getActiveTabId(),
      settings: this.getSettings(),
      loadouts: this.getLoadouts(),
      panelVisibility: this.getPanelVisibility(),
      layouts: {}
    };

    // Export all layouts
    const tabs = this.loadTabsMeta();
    tabs.forEach(tab => {
      data.layouts[tab.id] = this.loadLayout(tab.id);
    });

    return data;
  }

  /**
   * Import data
   */
  importData(data) {
    if (data.tabs) this.saveTabsMeta(data.tabs);
    if (data.activeTab) this.setActiveTabId(data.activeTab);
    if (data.settings) this.saveSettings(data.settings);
    if (data.loadouts) {
      localStorage.setItem(this.KEYS.LOADOUTS, JSON.stringify(data.loadouts));
    }
    if (data.panelVisibility) {
      localStorage.setItem(this.KEYS.PANEL_VISIBILITY, JSON.stringify(data.panelVisibility));
    }
    if (data.layouts) {
      Object.entries(data.layouts).forEach(([tabId, layout]) => {
        this.saveLayout(tabId, layout);
      });
    }
  }

  /**
   * Clear all data
   */
  clearAll() {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        localStorage.removeItem(key);
      }
    });
  }

  /**
   * Get storage usage
   */
  getStorageUsage() {
    let total = 0;
    const breakdown = {};

    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(this.prefix)) {
        const size = (localStorage.getItem(key) || '').length * 2; // UTF-16
        total += size;
        breakdown[key] = size;
      }
    });

    return {
      total,
      totalKB: (total / 1024).toFixed(2),
      breakdown
    };
  }
}

export const storageManager = new StorageManager();
export default StorageManager;
