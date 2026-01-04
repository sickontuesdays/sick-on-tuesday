/**
 * Vendors Panel - Displays all Destiny 2 vendors with their current inventories
 */

import { apiClient } from '../api/bungie-api-client.js';
import { manifestLoader } from '../api/manifest-loader.js';

// Key vendor hashes
const VENDOR_HASHES = {
  XUR: 2190858386,
  BANSHEE: 672118013,
  ADA_1: 350061650,
  SAINT_14: 765357505,
  ZAVALA: 69482069,
  SHAXX: 3603221665,
  DRIFTER: 248695599,
  IKORA: 1976548992,
  HAWTHORNE: 3347378076,
  RAHOOL: 2255782930,
  SPIDER: 863940356,
  EVERVERSE: 3361454721,
  STARHORSE: 2140454730,
  WAR_TABLE: 4095127185
};

export class VendorsPanel {
  constructor(containerEl) {
    this.container = containerEl;
    this.vendors = {};
    this.currentVendor = null;
    this.characterId = null;
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

      // Load key vendors
      const vendorsToLoad = [
        VENDOR_HASHES.XUR,
        VENDOR_HASHES.BANSHEE,
        VENDOR_HASHES.ADA_1,
        VENDOR_HASHES.SAINT_14,
        VENDOR_HASHES.ZAVALA,
        VENDOR_HASHES.SHAXX
      ];

      for (const vendorHash of vendorsToLoad) {
        try {
          // Parameters: vendorHash first, characterId second
          const vendorData = await apiClient.getVendor(vendorHash, this.characterId);
          if (vendorData) {
            this.vendors[vendorHash] = vendorData;
          }
        } catch (err) {
          console.warn(`Failed to load vendor ${vendorHash}:`, err);
        }
      }

      // Set default vendor
      if (!this.currentVendor && Object.keys(this.vendors).length > 0) {
        this.currentVendor = parseInt(Object.keys(this.vendors)[0]);
      }

      this.render();
    } catch (error) {
      console.error('Vendors load error:', error);
      this.showError(error.message);
    }
  }

  /**
   * Render vendors panel
   */
  render() {
    if (Object.keys(this.vendors).length === 0) {
      this.showAuthRequired();
      return;
    }

    let html = `
      <div class="vendors-panel">
        <div class="vendors-sidebar">
          ${this.renderVendorList()}
        </div>
        <div class="vendors-content">
          ${this.renderVendorContent()}
        </div>
      </div>
    `;

    this.container.innerHTML = html;
    this.attachEventListeners();
  }

  /**
   * Render vendor list sidebar
   */
  renderVendorList() {
    const vendorNames = {
      [VENDOR_HASHES.XUR]: { name: 'Xûr', icon: '🌑' },
      [VENDOR_HASHES.BANSHEE]: { name: 'Banshee-44', icon: '🔫' },
      [VENDOR_HASHES.ADA_1]: { name: 'Ada-1', icon: '🎨' },
      [VENDOR_HASHES.SAINT_14]: { name: 'Saint-14', icon: '⚔️' },
      [VENDOR_HASHES.ZAVALA]: { name: 'Zavala', icon: '🛡️' },
      [VENDOR_HASHES.SHAXX]: { name: 'Shaxx', icon: '🏆' },
      [VENDOR_HASHES.DRIFTER]: { name: 'Drifter', icon: '🎲' },
      [VENDOR_HASHES.IKORA]: { name: 'Ikora', icon: '📚' },
      [VENDOR_HASHES.HAWTHORNE]: { name: 'Hawthorne', icon: '🦅' },
      [VENDOR_HASHES.RAHOOL]: { name: 'Rahool', icon: '💎' }
    };

    let html = '<div class="vendor-list">';

    for (const [hash, data] of Object.entries(this.vendors)) {
      const vendorInfo = vendorNames[hash] || { name: `Vendor ${hash}`, icon: '👤' };
      const isActive = parseInt(hash) === this.currentVendor ? 'active' : '';

      html += `
        <button class="vendor-btn ${isActive}" data-vendor="${hash}">
          <span class="vendor-icon">${vendorInfo.icon}</span>
          <span class="vendor-name">${vendorInfo.name}</span>
        </button>
      `;
    }

    html += '</div>';
    return html;
  }

  /**
   * Render vendor content
   */
  renderVendorContent() {
    const vendor = this.vendors[this.currentVendor];
    if (!vendor) {
      return '<div class="no-vendor">Select a vendor</div>';
    }

    const sales = vendor.sales?.data || {};
    const items = Object.values(sales);

    if (items.length === 0) {
      return '<div class="no-vendor">No items available from this vendor</div>';
    }

    let html = '<div class="vendor-items">';

    items.forEach(sale => {
      html += this.renderVendorItem(sale);
    });

    html += '</div>';
    return html;
  }

  /**
   * Render single vendor item
   */
  renderVendorItem(sale) {
    const itemHash = sale.itemHash;
    const definition = manifestLoader.getItemDefinition(itemHash);

    if (!definition) {
      return '';
    }

    const name = definition.displayProperties?.name || 'Unknown Item';
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
        costHtml += `<span class="cost">${cost.quantity} ${costName}</span>`;
      });
      costHtml += '</div>';
    }

    return `
      <div class="vendor-item ${tierClass}" data-item-hash="${itemHash}">
        ${icon ? `<img src="${icon}" alt="${name}" class="item-icon">` : '<div class="item-placeholder"></div>'}
        <div class="item-info">
          <div class="item-name">${name}</div>
          ${costHtml}
        </div>
      </div>
    `;
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
    this.container.querySelectorAll('.vendor-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentVendor = parseInt(btn.dataset.vendor);
        this.render();
      });
    });
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
