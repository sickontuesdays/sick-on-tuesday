/**
 * Vendors Panel - Displays all Destiny 2 vendors with their current inventories
 */

import { apiClient } from '../api/bungie-api-client.js';
import { manifestLoader } from '../api/manifest-loader.js';

// All vendor hashes with metadata - Only actual D2 vendors
const VENDORS = {
  // Tower Vendors
  ZAVALA: { hash: 69482069, name: 'Commander Zavala', icon: '🛡️', location: 'Tower', category: 'vanguard' },
  SHAXX: { hash: 3603221665, name: 'Lord Shaxx', icon: '🏆', location: 'Tower', category: 'crucible' },
  IKORA: { hash: 1976548992, name: 'Ikora Rey', icon: '📚', location: 'Tower', category: 'vanguard' },
  BANSHEE: { hash: 672118013, name: 'Banshee-44', icon: '🔫', location: 'Tower', category: 'gunsmith' },
  ADA_1: { hash: 350061650, name: 'Ada-1', icon: '🎨', location: 'Tower', category: 'armor' },
  SAINT_14: { hash: 765357505, name: 'Saint-14', icon: '⚔️', location: 'Tower', category: 'trials' },
  DRIFTER: { hash: 248695599, name: 'The Drifter', icon: '🎲', location: 'Tower', category: 'gambit' },
  HAWTHORNE: { hash: 3347378076, name: 'Suraya Hawthorne', icon: '🦅', location: 'Tower', category: 'clan' },
  RAHOOL: { hash: 2255782930, name: 'Master Rahool', icon: '💎', location: 'Tower', category: 'cryptarch' },

  // Special Vendors
  XUR: { hash: 2190858386, name: 'Xûr', icon: '🌑', location: 'Weekend Only', category: 'exotic' },
  EVERVERSE: { hash: 3361454721, name: 'Tess Everis', icon: '✨', location: 'Tower', category: 'eververse' },

  // Destination Vendors
  DEVRIM: { hash: 396892126, name: 'Devrim Kay', icon: '🎯', location: 'EDZ', category: 'destination' },
  FAILSAFE: { hash: 1576276905, name: 'Failsafe', icon: '🤖', location: 'Nessus', category: 'destination' },
  ERIS: { hash: 1616085565, name: 'Eris Morn', icon: '🌙', location: 'Moon', category: 'destination' },
  VARIKS: { hash: 2531198101, name: 'Variks', icon: '❄️', location: 'Europa', category: 'destination' },
  PETRA: { hash: 1841717884, name: 'Petra Venj', icon: '👁️', location: 'Dreaming City', category: 'destination' },

  // Event Vendors (only available during events)
  SALADIN: { hash: 895295461, name: 'Lord Saladin', icon: '🔥', location: 'Tower (Iron Banner)', category: 'iron_banner' }
};

export class VendorsPanel {
  constructor(containerEl) {
    this.container = containerEl;
    this.vendorData = {}; // Loaded vendor inventory data
    this.currentVendor = null; // Currently selected vendor (hash)
    this.characterId = null;
    this.viewMode = 'list'; // 'list' or 'detail'
    this.categoryFilter = 'all';
    this.navigationHistory = [];
  }

  /**
   * Initialize vendors panel
   */
  async init() {
    this.render();
  }

  /**
   * Load vendors data
   */
  async load() {
    try {
      this.showLoading();

      // Get current character
      const profile = await apiClient.getProfile();
      const charIds = Object.keys(profile.profileData?.characters?.data || {});
      this.characterId = charIds[0];

      if (!this.characterId) {
        this.showError('No character found');
        return;
      }

      // Start with list view showing all vendors
      this.viewMode = 'list';
      this.render();
    } catch (error) {
      console.error('Vendors load error:', error);
      this.showError(error.message);
    }
  }

  /**
   * Load specific vendor's inventory
   */
  async loadVendorInventory(vendorHash) {
    try {
      if (!this.characterId) {
        console.warn('No character ID available');
        return null;
      }

      // Check if already loaded
      if (this.vendorData[vendorHash]) {
        return this.vendorData[vendorHash];
      }

      const data = await apiClient.getVendor(vendorHash, this.characterId);
      if (data) {
        this.vendorData[vendorHash] = data;
      }
      return data;
    } catch (err) {
      console.warn(`Failed to load vendor ${vendorHash}:`, err);
      return null;
    }
  }

  /**
   * Render vendors panel
   */
  render() {
    if (!this.characterId) {
      this.showAuthRequired();
      return;
    }

    let html = `<div class="vendors-panel">`;

    if (this.viewMode === 'list') {
      html += this.renderVendorsList();
    } else if (this.viewMode === 'detail') {
      html += this.renderVendorDetail();
    }

    html += `</div>`;

    this.container.innerHTML = html;
    this.attachEventListeners();
  }

  /**
   * Render all vendors list (grid view)
   */
  renderVendorsList() {
    // Category filters
    const categories = [
      { id: 'all', name: 'All' },
      { id: 'vanguard', name: 'Vanguard' },
      { id: 'crucible', name: 'Crucible' },
      { id: 'destination', name: 'Destinations' },
      { id: 'seasonal', name: 'Seasonal' }
    ];

    let html = `
      <div class="vendors-header">
        <div class="vendors-filters">
          ${categories.map(cat => `
            <button class="filter-btn ${this.categoryFilter === cat.id ? 'active' : ''}" data-category="${cat.id}">
              ${cat.name}
            </button>
          `).join('')}
        </div>
      </div>
      <div class="vendors-grid">
    `;

    // Get vendors filtered by category
    const vendors = Object.entries(VENDORS).filter(([key, vendor]) => {
      if (this.categoryFilter === 'all') return true;
      return vendor.category === this.categoryFilter;
    });

    // Group by location
    const byLocation = {};
    vendors.forEach(([key, vendor]) => {
      if (!byLocation[vendor.location]) {
        byLocation[vendor.location] = [];
      }
      byLocation[vendor.location].push({ key, ...vendor });
    });

    // Render by location
    for (const [location, locationVendors] of Object.entries(byLocation)) {
      html += `
        <div class="vendor-location-group">
          <div class="location-header">${location}</div>
          <div class="vendor-cards">
      `;

      locationVendors.forEach(vendor => {
        html += `
          <button class="vendor-card" data-vendor-hash="${vendor.hash}" data-vendor-key="${vendor.key}">
            <span class="vendor-icon">${vendor.icon}</span>
            <div class="vendor-info">
              <span class="vendor-name">${vendor.name}</span>
              <span class="vendor-category">${this.formatCategory(vendor.category)}</span>
            </div>
            <span class="vendor-arrow">→</span>
          </button>
        `;
      });

      html += `</div></div>`;
    }

    html += `</div>`;
    return html;
  }

  /**
   * Render vendor detail view
   */
  renderVendorDetail() {
    const vendorInfo = this.getVendorInfo(this.currentVendor);
    const vendorData = this.vendorData[this.currentVendor];

    let html = `
      <div class="vendor-detail-header">
        <button class="back-btn" data-action="back">← Back to Vendors</button>
        <div class="vendor-title">
          <span class="vendor-icon-large">${vendorInfo?.icon || '👤'}</span>
          <div>
            <h3>${vendorInfo?.name || 'Unknown Vendor'}</h3>
            <span class="vendor-location">${vendorInfo?.location || ''}</span>
          </div>
        </div>
      </div>
      <div class="vendor-detail-content">
    `;

    if (!vendorData) {
      html += `
        <div class="vendor-loading">
          <div class="loading-spinner"></div>
          <span>Loading vendor inventory...</span>
        </div>
      `;
    } else {
      // Render inventory sections
      html += this.renderVendorInventory(vendorData);
    }

    html += `</div>`;
    return html;
  }

  /**
   * Render vendor inventory (items, bounties, quests)
   */
  renderVendorInventory(vendorData) {
    // API response wraps data in vendorData property
    const actualData = vendorData.vendorData || vendorData;
    const sales = actualData.sales?.data || {};
    const items = Object.values(sales);

    console.log('Vendor data structure:', Object.keys(vendorData));
    console.log('Sales items found:', items.length);

    if (items.length === 0) {
      return '<div class="no-items">No items currently available from this vendor</div>';
    }

    // Categorize items
    const weapons = [];
    const armor = [];
    const bounties = [];
    const quests = [];
    const other = [];

    items.forEach(sale => {
      const def = manifestLoader.getItemDefinition(sale.itemHash);
      if (!def) {
        other.push(sale);
        return;
      }

      const itemType = def.itemType;
      const itemSubType = def.itemSubType;

      // Bounties (itemType 26)
      if (itemType === 26) {
        bounties.push(sale);
      }
      // Quests (itemType 12 or certain subTypes)
      else if (itemType === 12) {
        quests.push(sale);
      }
      // Weapons (itemType 3)
      else if (itemType === 3) {
        weapons.push(sale);
      }
      // Armor (itemType 2)
      else if (itemType === 2) {
        armor.push(sale);
      }
      else {
        other.push(sale);
      }
    });

    let html = '';

    // Render each section
    if (bounties.length > 0) {
      html += this.renderInventorySection('Bounties', bounties, 'bounty');
    }
    if (quests.length > 0) {
      html += this.renderInventorySection('Quests', quests, 'quest');
    }
    if (weapons.length > 0) {
      html += this.renderInventorySection('Weapons', weapons, 'weapon');
    }
    if (armor.length > 0) {
      html += this.renderInventorySection('Armor', armor, 'armor');
    }
    if (other.length > 0) {
      html += this.renderInventorySection('Other Items', other, 'other');
    }

    return html;
  }

  /**
   * Render inventory section
   */
  renderInventorySection(title, items, type) {
    let html = `
      <div class="inventory-section">
        <div class="section-header">
          <h4>${title}</h4>
          <span class="item-count">${items.length}</span>
        </div>
        <div class="inventory-items ${type}-items">
    `;

    items.forEach(sale => {
      html += this.renderVendorItem(sale, type);
    });

    html += `</div></div>`;
    return html;
  }

  /**
   * Get vendor info from VENDORS constant
   */
  getVendorInfo(hash) {
    for (const [key, vendor] of Object.entries(VENDORS)) {
      if (vendor.hash === hash) {
        return vendor;
      }
    }
    return null;
  }

  /**
   * Format category name
   */
  formatCategory(category) {
    const names = {
      vanguard: 'Vanguard',
      crucible: 'Crucible',
      gambit: 'Gambit',
      gunsmith: 'Gunsmith',
      armor: 'Armor',
      trials: 'Trials',
      clan: 'Clan',
      cryptarch: 'Cryptarch',
      utility: 'Utility',
      exotic: 'Exotic',
      eververse: 'Eververse',
      destination: 'Destination',
      event: 'Event',
      bounties: 'Bounties',
      iron_banner: 'Iron Banner',
      seasonal: 'Seasonal'
    };
    return names[category] || category;
  }

  /**
   * Render single vendor item
   */
  renderVendorItem(sale, type = 'other') {
    const itemHash = sale.itemHash;
    const definition = manifestLoader.getItemDefinition(itemHash);

    if (!definition) {
      return '';
    }

    const name = definition.displayProperties?.name || 'Unknown Item';
    const description = definition.displayProperties?.description || '';
    const icon = definition.displayProperties?.icon
      ? `https://www.bungie.net${definition.displayProperties.icon}`
      : null;
    const tierType = definition.inventory?.tierType || 0;
    const tierClass = this.getTierClass(tierType);

    // Parse costs
    let costHtml = '';
    if (sale.costs && sale.costs.length > 0) {
      costHtml = '<div class="item-costs">';
      sale.costs.forEach(cost => {
        const costDef = manifestLoader.getItemDefinition(cost.itemHash);
        const costName = costDef?.displayProperties?.name || 'Currency';
        const costIcon = costDef?.displayProperties?.icon
          ? `<img src="https://www.bungie.net${costDef.displayProperties.icon}" class="cost-icon">`
          : '';
        costHtml += `<span class="cost">${costIcon}${cost.quantity}</span>`;
      });
      costHtml += '</div>';
    }

    // Check if item can be acquired
    const canAcquire = sale.saleStatus === 0; // 0 means available
    const acquireClass = canAcquire ? 'can-acquire' : 'cannot-acquire';

    return `
      <div class="vendor-item ${tierClass} ${acquireClass} ${type}-item" data-item-hash="${itemHash}" data-vendor-item-index="${sale.vendorItemIndex}">
        ${icon ? `<img src="${icon}" alt="${name}" class="item-icon">` : '<div class="item-placeholder"></div>'}
        <div class="item-details">
          <div class="item-name">${name}</div>
          ${type === 'bounty' || type === 'quest' ? `<div class="item-desc">${this.truncate(description, 60)}</div>` : ''}
          ${costHtml}
        </div>
      </div>
    `;
  }

  /**
   * Truncate text
   */
  truncate(text, length) {
    if (!text) return '';
    return text.length > length ? text.substring(0, length) + '...' : text;
  }

  /**
   * Get tier CSS class
   */
  getTierClass(tierType) {
    const tiers = {
      6: 'tier-exotic',
      5: 'tier-legendary',
      4: 'tier-rare',
      3: 'tier-common',
      2: 'tier-basic'
    };
    return tiers[tierType] || 'tier-common';
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Vendor card clicks (go to detail view)
    this.container.querySelectorAll('.vendor-card').forEach(card => {
      card.addEventListener('click', async () => {
        const vendorHash = parseInt(card.dataset.vendorHash);
        this.navigationHistory.push({ viewMode: this.viewMode, vendor: this.currentVendor });
        this.currentVendor = vendorHash;
        this.viewMode = 'detail';
        this.render();

        // Load vendor inventory after rendering
        const data = await this.loadVendorInventory(vendorHash);
        if (data) {
          this.render(); // Re-render with inventory data
        }
      });
    });

    // Category filter clicks
    this.container.querySelectorAll('.filter-btn[data-category]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.categoryFilter = btn.dataset.category;
        this.render();
      });
    });

    // Back button
    this.container.querySelectorAll('.back-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.goBack();
      });
    });

    // Item clicks (future: show item detail or acquire)
    this.container.querySelectorAll('.vendor-item').forEach(item => {
      item.addEventListener('click', () => {
        const itemHash = item.dataset.itemHash;
        console.log('Clicked item:', itemHash);
        // Future: Show item detail modal or acquire item
      });
    });
  }

  /**
   * Navigate back
   */
  goBack() {
    if (this.navigationHistory.length > 0) {
      const prev = this.navigationHistory.pop();
      this.viewMode = prev.viewMode;
      this.currentVendor = prev.vendor;
    } else {
      this.viewMode = 'list';
      this.currentVendor = null;
    }
    this.render();
  }

  /**
   * Show loading state
   */
  showLoading() {
    this.container.innerHTML = `
      <div class="panel-loading">
        <div class="loading-spinner"></div>
        <span>Loading vendors...</span>
      </div>
    `;
  }

  /**
   * Show auth required state
   */
  showAuthRequired() {
    this.container.innerHTML = `
      <div class="panel-auth">
        <p>Sign in to view vendors</p>
      </div>
    `;
  }

  /**
   * Show error state
   */
  showError(message) {
    this.container.innerHTML = `
      <div class="panel-error">
        <p>Error loading vendors</p>
        <small>${message}</small>
        <button onclick="window.dashboard?.panelManager?.loadPanel('vendors')">Retry</button>
      </div>
    `;
  }
}

export default VendorsPanel;
