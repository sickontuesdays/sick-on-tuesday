/**
 * Inventory Panel - DIM-style inventory display with filtering and sorting
 */

import { apiClient } from '../api/bungie-api-client.js';
import { inventoryProcessor } from '../utils/inventory-processor.js';
import { manifestLoader } from '../api/manifest-loader.js';

export class InventoryPanel {
  constructor(containerEl) {
    this.container = containerEl;
    this.inventory = null;
    this.currentView = 'all'; // all, weapons, armor, mods
    this.currentCharacter = null;
    this.sortBy = 'power';
    this.filterTier = 'all';
  }

  /**
   * Initialize inventory panel
   */
  async init() {
    this.render();
  }

  /**
   * Load inventory data
   */
  async load() {
    try {
      this.showLoading();

      const profileData = await apiClient.getProfile();
      this.inventory = inventoryProcessor.processProfile(profileData);

      // Set default character
      const charIds = Object.keys(this.inventory.characters);
      if (charIds.length > 0 && !this.currentCharacter) {
        this.currentCharacter = charIds[0];
      }

      this.render();
    } catch (error) {
      console.error('Inventory load error:', error);
      this.showError(error.message);
    }
  }

  /**
   * Render inventory panel
   */
  render() {
    if (!this.inventory) {
      this.showAuthRequired();
      return;
    }

    let html = `
      <div class="inventory-panel">
        <div class="inventory-toolbar">
          ${this.renderCharacterSelector()}
          ${this.renderViewTabs()}
          ${this.renderFilters()}
        </div>
        <div class="inventory-content">
          ${this.renderInventoryContent()}
        </div>
      </div>
    `;

    this.container.innerHTML = html;
    this.attachEventListeners();
  }

  /**
   * Render character selector
   */
  renderCharacterSelector() {
    const chars = this.inventory.characters;
    let html = '<div class="char-selector">';

    for (const [charId, char] of Object.entries(chars)) {
      const isActive = charId === this.currentCharacter ? 'active' : '';
      const emblem = char.emblemPath ? `https://www.bungie.net${char.emblemPath}` : '';

      html += `
        <button class="char-btn ${isActive}" data-char-id="${charId}">
          ${emblem ? `<img src="${emblem}" alt="${char.className}">` : ''}
          <span class="char-class">${char.className}</span>
          <span class="char-power">${char.light}</span>
        </button>
      `;
    }

    // Vault button
    html += `
      <button class="char-btn ${this.currentCharacter === 'vault' ? 'active' : ''}" data-char-id="vault">
        <span class="vault-icon">📦</span>
        <span class="char-class">Vault</span>
        <span class="char-power">${this.inventory.vault?.items?.length || 0}</span>
      </button>
    `;

    html += '</div>';
    return html;
  }

  /**
   * Render view tabs
   */
  renderViewTabs() {
    const views = [
      { id: 'all', label: 'All' },
      { id: 'weapons', label: 'Weapons' },
      { id: 'armor', label: 'Armor' },
      { id: 'mods', label: 'Mods' }
    ];

    let html = '<div class="view-tabs">';
    views.forEach(view => {
      const isActive = this.currentView === view.id ? 'active' : '';
      html += `<button class="view-tab ${isActive}" data-view="${view.id}">${view.label}</button>`;
    });
    html += '</div>';

    return html;
  }

  /**
   * Render filters
   */
  renderFilters() {
    return `
      <div class="inventory-filters">
        <select class="filter-tier" data-filter="tier">
          <option value="all">All Tiers</option>
          <option value="6">Exotic</option>
          <option value="5">Legendary</option>
          <option value="4">Rare</option>
          <option value="3">Common</option>
        </select>
        <select class="filter-sort" data-filter="sort">
          <option value="power">Power</option>
          <option value="name">Name</option>
          <option value="type">Type</option>
          <option value="tier">Tier</option>
        </select>
      </div>
    `;
  }

  /**
   * Render inventory content
   */
  renderInventoryContent() {
    if (this.currentCharacter === 'vault') {
      return this.renderVaultContent();
    }

    const char = this.inventory.characters[this.currentCharacter];
    if (!char) return '<div class="no-data">No character selected</div>';

    const equipped = this.inventory.equipped[this.currentCharacter];
    const inventory = char.inventory;

    let html = '';

    // Equipped section
    if (equipped && this.currentView !== 'mods') {
      html += this.renderEquippedSection(equipped);
    }

    // Inventory section
    if (inventory) {
      html += this.renderInventorySection(inventory);
    }

    return html;
  }

  /**
   * Render equipped items section
   */
  renderEquippedSection(equipped) {
    let html = '<div class="equipped-section">';
    html += '<h4 class="section-title">Equipped</h4>';

    // Weapons row
    if (this.currentView === 'all' || this.currentView === 'weapons') {
      html += '<div class="equipped-row weapons">';
      html += this.renderEquippedItem(equipped.weapons.kinetic, 'Kinetic');
      html += this.renderEquippedItem(equipped.weapons.energy, 'Energy');
      html += this.renderEquippedItem(equipped.weapons.power, 'Power');
      html += '</div>';
    }

    // Armor row
    if (this.currentView === 'all' || this.currentView === 'armor') {
      html += '<div class="equipped-row armor">';
      html += this.renderEquippedItem(equipped.armor.helmet, 'Helmet');
      html += this.renderEquippedItem(equipped.armor.gauntlets, 'Gauntlets');
      html += this.renderEquippedItem(equipped.armor.chest, 'Chest');
      html += this.renderEquippedItem(equipped.armor.legs, 'Legs');
      html += this.renderEquippedItem(equipped.armor.class, 'Class');
      html += '</div>';
    }

    html += '</div>';
    return html;
  }

  /**
   * Render single equipped item
   */
  renderEquippedItem(item, slotName) {
    if (!item) {
      return `<div class="equipped-slot empty"><span class="slot-name">${slotName}</span></div>`;
    }

    const tierClass = `tier-${item.tierTypeName?.toLowerCase() || 'common'}`;
    const damageColor = inventoryProcessor.getDamageTypeColor(item.damageType);

    return `
      <div class="equipped-slot ${tierClass}" data-item-id="${item.itemInstanceId}" title="${item.name}">
        ${item.icon ? `<img src="${item.icon}" alt="${item.name}" class="item-icon">` : ''}
        <div class="item-power" style="color: ${damageColor}">${item.primaryStat?.value || ''}</div>
        <span class="slot-name">${slotName}</span>
      </div>
    `;
  }

  /**
   * Render inventory section
   */
  renderInventorySection(inventory) {
    let items = [];

    switch (this.currentView) {
      case 'weapons':
        items = inventory.weapons || [];
        break;
      case 'armor':
        items = inventory.armor || [];
        break;
      case 'mods':
        items = inventory.mods || [];
        break;
      default:
        items = [
          ...(inventory.weapons || []),
          ...(inventory.armor || []),
          ...(inventory.mods || []),
          ...(inventory.consumables || [])
        ];
    }

    // Apply filters
    items = this.applyFilters(items);

    // Apply sorting
    items = this.applySorting(items);

    if (items.length === 0) {
      return '<div class="no-items">No items found</div>';
    }

    let html = '<div class="inventory-grid">';
    items.forEach(item => {
      html += this.renderInventoryItem(item);
    });
    html += '</div>';

    return html;
  }

  /**
   * Render vault content
   */
  renderVaultContent() {
    const vault = this.inventory.vault;
    if (!vault || !vault.items) {
      return '<div class="no-data">Vault empty</div>';
    }

    let items = [];

    switch (this.currentView) {
      case 'weapons':
        items = [
          ...vault.categories.weapons.kinetic,
          ...vault.categories.weapons.energy,
          ...vault.categories.weapons.power
        ];
        break;
      case 'armor':
        items = [
          ...vault.categories.armor.helmet,
          ...vault.categories.armor.gauntlets,
          ...vault.categories.armor.chest,
          ...vault.categories.armor.legs,
          ...vault.categories.armor.class
        ];
        break;
      case 'mods':
        items = vault.categories.mods || [];
        break;
      default:
        items = vault.items;
    }

    items = this.applyFilters(items);
    items = this.applySorting(items);

    let html = `
      <div class="vault-header">
        <span>Vault Items: ${items.length}</span>
      </div>
      <div class="inventory-grid">
    `;

    items.forEach(item => {
      html += this.renderInventoryItem(item);
    });

    html += '</div>';
    return html;
  }

  /**
   * Render single inventory item
   */
  renderInventoryItem(item) {
    const tierClass = `tier-${item.tierTypeName?.toLowerCase() || 'common'}`;
    const damageColor = item.isWeapon ? inventoryProcessor.getDamageTypeColor(item.damageType) : '';

    return `
      <div class="inventory-item ${tierClass}" data-item-id="${item.itemInstanceId}" data-item-hash="${item.itemHash}">
        ${item.icon ? `<img src="${item.icon}" alt="${item.name}" class="item-icon">` : '<div class="item-placeholder"></div>'}
        ${item.primaryStat?.value ? `<div class="item-power" style="color: ${damageColor}">${item.primaryStat.value}</div>` : ''}
        ${item.quantity > 1 ? `<div class="item-quantity">${item.quantity}</div>` : ''}
        <div class="item-tooltip">
          <div class="tooltip-name">${item.name}</div>
          <div class="tooltip-type">${item.tierTypeName} ${item.isWeapon ? inventoryProcessor.getWeaponTypeName(item.itemSubType) : ''}</div>
        </div>
      </div>
    `;
  }

  /**
   * Apply filters to items
   */
  applyFilters(items) {
    if (this.filterTier !== 'all') {
      const tier = parseInt(this.filterTier);
      items = items.filter(i => i.tierType === tier);
    }
    return items;
  }

  /**
   * Apply sorting to items
   */
  applySorting(items) {
    const sorted = [...items];

    switch (this.sortBy) {
      case 'power':
        sorted.sort((a, b) => (b.primaryStat?.value || 0) - (a.primaryStat?.value || 0));
        break;
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'tier':
        sorted.sort((a, b) => b.tierType - a.tierType);
        break;
      case 'type':
        sorted.sort((a, b) => (a.itemSubType || 0) - (b.itemSubType || 0));
        break;
    }

    return sorted;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Character selector
    this.container.querySelectorAll('.char-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentCharacter = btn.dataset.charId;
        this.render();
      });
    });

    // View tabs
    this.container.querySelectorAll('.view-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.currentView = tab.dataset.view;
        this.render();
      });
    });

    // Filters
    this.container.querySelectorAll('select[data-filter]').forEach(select => {
      select.addEventListener('change', () => {
        if (select.dataset.filter === 'tier') {
          this.filterTier = select.value;
        } else if (select.dataset.filter === 'sort') {
          this.sortBy = select.value;
        }
        this.render();
      });
    });

    // Item click for details
    this.container.querySelectorAll('.inventory-item, .equipped-slot').forEach(item => {
      item.addEventListener('click', () => {
        const itemId = item.dataset.itemId;
        const itemHash = item.dataset.itemHash;
        if (itemId || itemHash) {
          this.showItemDetails(itemId, itemHash);
        }
      });
    });
  }

  /**
   * Show item details modal
   */
  showItemDetails(itemInstanceId, itemHash) {
    // Find the item
    let item = null;

    // Search equipped
    for (const charEquip of Object.values(this.inventory.equipped)) {
      for (const slotItems of [charEquip.weapons, charEquip.armor]) {
        for (const slot of Object.values(slotItems)) {
          if (slot?.itemInstanceId === itemInstanceId) {
            item = slot;
            break;
          }
        }
      }
    }

    // Search inventory
    if (!item) {
      for (const char of Object.values(this.inventory.characters)) {
        if (char.inventory) {
          for (const category of Object.values(char.inventory)) {
            const found = category.find(i => i.itemInstanceId === itemInstanceId);
            if (found) {
              item = found;
              break;
            }
          }
        }
      }
    }

    // Search vault
    if (!item && this.inventory.vault?.items) {
      item = this.inventory.vault.items.find(i => i.itemInstanceId === itemInstanceId);
    }

    if (item) {
      console.log('Item details:', item);
      // TODO: Show modal with item details
    }
  }

  /**
   * Show loading state
   */
  showLoading() {
    this.container.innerHTML = `
      <div class="panel-loading">
        <div class="loading-spinner"></div>
        <span>Loading inventory...</span>
      </div>
    `;
  }

  /**
   * Show auth required state
   */
  showAuthRequired() {
    this.container.innerHTML = `
      <div class="panel-auth">
        <p>Sign in to view your inventory</p>
      </div>
    `;
  }

  /**
   * Show error state
   */
  showError(message) {
    this.container.innerHTML = `
      <div class="panel-error">
        <p>Error loading inventory</p>
        <small>${message}</small>
        <button onclick="window.dashboard?.panelManager?.loadPanel('inventory')">Retry</button>
      </div>
    `;
  }
}

export default InventoryPanel;
