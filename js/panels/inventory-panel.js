/**
 * Inventory Panel - Full DIM-style inventory management with transfers and equipping
 */

import { apiClient } from '../api/bungie-api-client.js';
import { inventoryProcessor } from '../utils/inventory-processor.js';
import { manifestLoader } from '../api/manifest-loader.js';

export class InventoryPanel {
  constructor(containerEl) {
    this.container = containerEl;
    this.inventory = null;
    this.profileData = null;

    // View state
    this.currentView = 'character'; // character, vault
    this.currentCharacter = null;
    this.currentCategory = 'all'; // all, weapons, armor, general

    // Filter state
    this.sortBy = 'default';
    this.filterTier = 'all';
    this.searchTerm = '';

    // Selected item for actions
    this.selectedItem = null;

    // Transfer state
    this.isTransferring = false;
  }

  /**
   * Initialize inventory panel
   */
  async init() {
    this.createItemModal();
    this.render();
  }

  /**
   * Load inventory data
   */
  async load() {
    try {
      this.showLoading();

      // Ensure manifest analysis data is loaded for item definitions
      // This is critical for item categorization and display
      await manifestLoader.loadAnalysisData();

      this.profileData = await apiClient.getProfile();
      this.inventory = inventoryProcessor.processProfile(this.profileData);

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
   * Create item details modal
   */
  createItemModal() {
    const existing = document.getElementById('itemModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'itemModal';
    modal.className = 'item-modal';
    modal.innerHTML = `
      <div class="item-modal-content">
        <div class="item-modal-header">
          <div class="item-modal-icon"></div>
          <div class="item-modal-info">
            <h3 class="item-modal-name">Item Name</h3>
            <div class="item-modal-type">Item Type</div>
          </div>
          <button class="item-modal-close">&times;</button>
        </div>
        <div class="item-modal-body">
          <div class="item-modal-stats"></div>
          <div class="item-modal-perks"></div>
        </div>
        <div class="item-modal-actions">
          <button class="item-action-equip" data-action="equip">Equip</button>
          <button class="item-action-transfer" data-action="transfer">Transfer</button>
          <button class="item-action-vault" data-action="vault">Send to Vault</button>
        </div>
        <div class="item-modal-transfer-targets" style="display: none;">
          <div class="transfer-header">Transfer to:</div>
          <div class="transfer-options"></div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // Setup modal listeners
    modal.querySelector('.item-modal-close').addEventListener('click', () => this.closeItemModal());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.closeItemModal();
    });

    // Action buttons
    modal.querySelector('.item-action-equip').addEventListener('click', () => this.equipSelectedItem());
    modal.querySelector('.item-action-vault').addEventListener('click', () => this.sendToVault());
    modal.querySelector('.item-action-transfer').addEventListener('click', () => this.showTransferOptions());
  }

  /**
   * Render inventory panel
   */
  render() {
    if (!this.inventory) {
      this.showAuthRequired();
      return;
    }

    const html = `
      <div class="inventory-panel-full">
        ${this.renderToolbar()}
        <div class="inventory-main">
          ${this.renderCharacterBar()}
          <div class="inventory-grid-container">
            ${this.renderInventoryContent()}
          </div>
        </div>
      </div>
    `;

    this.container.innerHTML = html;
    this.attachEventListeners();
  }

  /**
   * Render toolbar with filters and search
   */
  renderToolbar() {
    return `
      <div class="inventory-toolbar">
        <div class="toolbar-left">
          <div class="category-tabs">
            <button class="cat-tab ${this.currentCategory === 'all' ? 'active' : ''}" data-cat="all">All</button>
            <button class="cat-tab ${this.currentCategory === 'weapons' ? 'active' : ''}" data-cat="weapons">Weapons</button>
            <button class="cat-tab ${this.currentCategory === 'armor' ? 'active' : ''}" data-cat="armor">Armor</button>
            <button class="cat-tab ${this.currentCategory === 'general' ? 'active' : ''}" data-cat="general">General</button>
          </div>
        </div>
        <div class="toolbar-right">
          <input type="text" class="inventory-search" placeholder="Search items..." value="${this.searchTerm}">
          <select class="inventory-filter-tier">
            <option value="all" ${this.filterTier === 'all' ? 'selected' : ''}>All Tiers</option>
            <option value="6" ${this.filterTier === '6' ? 'selected' : ''}>Exotic</option>
            <option value="5" ${this.filterTier === '5' ? 'selected' : ''}>Legendary</option>
            <option value="4" ${this.filterTier === '4' ? 'selected' : ''}>Rare</option>
          </select>
          <select class="inventory-sort">
            <option value="default" ${this.sortBy === 'default' ? 'selected' : ''}>Default</option>
            <option value="power" ${this.sortBy === 'power' ? 'selected' : ''}>Power</option>
            <option value="name" ${this.sortBy === 'name' ? 'selected' : ''}>Name</option>
            <option value="rarity" ${this.sortBy === 'rarity' ? 'selected' : ''}>Rarity</option>
          </select>
          <button class="refresh-btn" title="Refresh inventory">↻</button>
        </div>
      </div>
    `;
  }

  /**
   * Render character selection bar
   */
  renderCharacterBar() {
    const chars = this.inventory.characters;
    let html = '<div class="character-bar">';

    // Character buttons - using text labels instead of icons
    for (const [charId, char] of Object.entries(chars)) {
      const isActive = this.currentView === 'character' && charId === this.currentCharacter;
      // Use text class name: Titan, Warlock, Hunter
      const className = this.getClassName(char.classType);

      html += `
        <button class="char-select-btn ${isActive ? 'active' : ''}" data-char-id="${charId}">
          <div class="char-label">
            <span class="char-class-text">${className}</span>
            <span class="char-power-level">${char.light}</span>
          </div>
        </button>
      `;
    }

    // Vault button
    const vaultCount = this.inventory.vault?.items?.length || 0;
    html += `
      <button class="char-select-btn vault-btn ${this.currentView === 'vault' ? 'active' : ''}" data-view="vault">
        <div class="char-label">
          <span class="char-class-text">Vault</span>
          <span class="char-power-level">${vaultCount} items</span>
        </div>
      </button>
    `;

    html += '</div>';
    return html;
  }

  /**
   * Get class name text
   */
  getClassName(classType) {
    const classNames = ['Titan', 'Hunter', 'Warlock'];
    return classNames[classType] || 'Unknown';
  }

  /**
   * Render inventory content
   */
  renderInventoryContent() {
    if (this.currentView === 'vault') {
      return this.renderVaultInventory();
    }
    return this.renderCharacterInventory();
  }

  /**
   * Render character inventory with equipped items
   */
  renderCharacterInventory() {
    const charId = this.currentCharacter;
    const char = this.inventory.characters[charId];
    const equipped = this.inventory.equipped[charId];

    if (!char) return '<div class="no-data">No character selected</div>';

    let html = '<div class="character-inventory">';

    // Equipped Items Section
    html += '<div class="equipped-section">';
    html += '<div class="section-header"><h4>Equipped</h4></div>';
    html += '<div class="equipped-grid">';

    // Weapons
    html += '<div class="equip-column weapons-column">';
    html += '<div class="column-label">Weapons</div>';
    html += this.renderEquippedSlot(equipped?.weapons?.kinetic, 'Kinetic', charId);
    html += this.renderEquippedSlot(equipped?.weapons?.energy, 'Energy', charId);
    html += this.renderEquippedSlot(equipped?.weapons?.power, 'Power', charId);
    html += '</div>';

    // Armor
    html += '<div class="equip-column armor-column">';
    html += '<div class="column-label">Armor</div>';
    html += this.renderEquippedSlot(equipped?.armor?.helmet, 'Helmet', charId);
    html += this.renderEquippedSlot(equipped?.armor?.gauntlets, 'Arms', charId);
    html += this.renderEquippedSlot(equipped?.armor?.chest, 'Chest', charId);
    html += this.renderEquippedSlot(equipped?.armor?.legs, 'Legs', charId);
    html += this.renderEquippedSlot(equipped?.armor?.class, 'Class', charId);
    html += '</div>';

    // Ghost
    html += '<div class="equip-column ghost-column">';
    html += '<div class="column-label">Ghost</div>';
    html += this.renderEquippedSlot(equipped?.ghost, 'Ghost', charId);
    html += '</div>';

    html += '</div></div>';

    // Carried Section (weapons and armor not equipped)
    html += '<div class="carried-section">';
    html += '<div class="section-header"><h4>Carried</h4></div>';

    const inventory = char.inventory || {};
    let carriedItems = this.getFilteredCarriedItems(inventory);

    if (carriedItems.length === 0) {
      html += '<div class="no-items">No carried items</div>';
    } else {
      html += '<div class="inventory-items-grid">';
      carriedItems.forEach(item => {
        html += this.renderInventoryItem(item, charId);
      });
      html += '</div>';
    }

    html += '</div>';

    // Inventory Section (consumables, mods, materials, etc.)
    html += '<div class="inventory-section">';
    html += '<div class="section-header"><h4>Inventory</h4></div>';

    let inventoryItems = this.getFilteredInventoryItems(inventory);

    if (inventoryItems.length === 0) {
      html += '<div class="no-items">No inventory items</div>';
    } else {
      html += '<div class="inventory-items-grid">';
      inventoryItems.forEach(item => {
        html += this.renderInventoryItem(item, charId);
      });
      html += '</div>';
    }

    html += '</div></div>';
    return html;
  }

  /**
   * Render vault inventory
   */
  renderVaultInventory() {
    const vault = this.inventory.vault;
    if (!vault || !vault.items) {
      return '<div class="no-data">Vault empty</div>';
    }

    let items = this.getFilteredVaultItems(vault);

    let html = '<div class="vault-inventory">';
    html += '<div class="section-header"><h4>Vault Items</h4><span class="item-count">' + items.length + ' items</span></div>';

    if (items.length === 0) {
      html += '<div class="no-items">No items match your filters</div>';
    } else {
      // Group by category
      const weapons = items.filter(i => i.isWeapon);
      const armor = items.filter(i => i.isArmor);
      const other = items.filter(i => !i.isWeapon && !i.isArmor);

      if (this.currentCategory === 'all' || this.currentCategory === 'weapons') {
        if (weapons.length > 0) {
          html += '<div class="vault-category">';
          html += '<div class="category-label">Weapons (' + weapons.length + ')</div>';
          html += '<div class="inventory-items-grid">';
          weapons.forEach(item => {
            html += this.renderInventoryItem(item, 'vault');
          });
          html += '</div></div>';
        }
      }

      if (this.currentCategory === 'all' || this.currentCategory === 'armor') {
        if (armor.length > 0) {
          html += '<div class="vault-category">';
          html += '<div class="category-label">Armor (' + armor.length + ')</div>';
          html += '<div class="inventory-items-grid">';
          armor.forEach(item => {
            html += this.renderInventoryItem(item, 'vault');
          });
          html += '</div></div>';
        }
      }

      if (this.currentCategory === 'all' || this.currentCategory === 'general') {
        if (other.length > 0) {
          html += '<div class="vault-category">';
          html += '<div class="category-label">General (' + other.length + ')</div>';
          html += '<div class="inventory-items-grid">';
          other.forEach(item => {
            html += this.renderInventoryItem(item, 'vault');
          });
          html += '</div></div>';
        }
      }
    }

    html += '</div>';
    return html;
  }

  /**
   * Render equipped slot
   */
  renderEquippedSlot(item, slotName, charId) {
    if (!item) {
      return `
        <div class="equipped-slot empty">
          <div class="slot-placeholder"></div>
          <span class="slot-label">${slotName}</span>
        </div>
      `;
    }

    const tierClass = `tier-${item.tierTypeName?.toLowerCase() || 'common'}`;
    const damageColor = item.isWeapon ? inventoryProcessor.getDamageTypeColor(item.damageType) : '';

    return `
      <div class="equipped-slot ${tierClass}"
           data-instance-id="${item.itemInstanceId}"
           data-item-hash="${item.itemHash}"
           data-location="equipped"
           data-char-id="${charId}">
        ${item.icon ? `<img src="${item.icon}" alt="${item.name}" class="slot-icon">` : '<div class="slot-placeholder"></div>'}
        <div class="slot-power" style="color: ${damageColor}">${item.primaryStat?.value || ''}</div>
        <span class="slot-label">${slotName}</span>
        ${item.isExotic ? '<div class="exotic-marker"></div>' : ''}
      </div>
    `;
  }

  /**
   * Render inventory item
   */
  renderInventoryItem(item, location) {
    const tierClass = `tier-${item.tierTypeName?.toLowerCase() || 'common'}`;
    const damageColor = item.isWeapon ? inventoryProcessor.getDamageTypeColor(item.damageType) : '';

    return `
      <div class="inventory-item ${tierClass}"
           data-instance-id="${item.itemInstanceId}"
           data-item-hash="${item.itemHash}"
           data-location="${location}">
        ${item.icon ? `<img src="${item.icon}" alt="${item.name}" class="item-icon">` : '<div class="item-placeholder"></div>'}
        ${item.primaryStat?.value ? `<div class="item-power" style="color: ${damageColor}">${item.primaryStat.value}</div>` : ''}
        ${item.quantity > 1 ? `<div class="item-quantity">x${item.quantity}</div>` : ''}
        ${item.isExotic ? '<div class="exotic-marker"></div>' : ''}
        <div class="item-hover-info">
          <div class="hover-name">${item.name}</div>
          <div class="hover-type">${item.tierTypeName || ''}</div>
        </div>
      </div>
    `;
  }

  /**
   * Get filtered items from character inventory (legacy - all items)
   */
  getFilteredItems(inventory) {
    let items = [];

    switch (this.currentCategory) {
      case 'weapons':
        items = [...(inventory.weapons || [])];
        break;
      case 'armor':
        items = [...(inventory.armor || [])];
        break;
      case 'general':
        items = [...(inventory.mods || []), ...(inventory.consumables || []), ...(inventory.other || [])];
        break;
      default:
        items = [
          ...(inventory.weapons || []),
          ...(inventory.armor || []),
          ...(inventory.mods || []),
          ...(inventory.consumables || []),
          ...(inventory.other || [])
        ];
    }

    // Apply tier filter
    if (this.filterTier !== 'all') {
      items = items.filter(i => i.tierType === parseInt(this.filterTier));
    }

    // Apply search
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      items = items.filter(i => i.name?.toLowerCase().includes(term));
    }

    // Apply sorting
    items = this.sortItems(items);

    return items;
  }

  /**
   * Get filtered carried items (weapons and armor only)
   */
  getFilteredCarriedItems(inventory) {
    let items = [];

    switch (this.currentCategory) {
      case 'weapons':
        items = [...(inventory.weapons || [])];
        break;
      case 'armor':
        items = [...(inventory.armor || [])];
        break;
      case 'general':
        // General category doesn't show in Carried section
        return [];
      default:
        items = [
          ...(inventory.weapons || []),
          ...(inventory.armor || [])
        ];
    }

    // Apply tier filter
    if (this.filterTier !== 'all') {
      items = items.filter(i => i.tierType === parseInt(this.filterTier));
    }

    // Apply search
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      items = items.filter(i => i.name?.toLowerCase().includes(term));
    }

    // Apply sorting
    items = this.sortItems(items);

    return items;
  }

  /**
   * Get filtered inventory items (consumables, mods, materials, etc.)
   */
  getFilteredInventoryItems(inventory) {
    let items = [];

    switch (this.currentCategory) {
      case 'weapons':
      case 'armor':
        // Weapons/armor category doesn't show in Inventory section
        return [];
      case 'general':
        items = [...(inventory.mods || []), ...(inventory.consumables || []), ...(inventory.other || [])];
        break;
      default:
        items = [
          ...(inventory.mods || []),
          ...(inventory.consumables || []),
          ...(inventory.other || [])
        ];
    }

    // Apply tier filter
    if (this.filterTier !== 'all') {
      items = items.filter(i => i.tierType === parseInt(this.filterTier));
    }

    // Apply search
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      items = items.filter(i => i.name?.toLowerCase().includes(term));
    }

    // Apply sorting
    items = this.sortItems(items);

    return items;
  }

  /**
   * Get filtered vault items
   */
  getFilteredVaultItems(vault) {
    let items = [...vault.items];

    // Apply category filter
    if (this.currentCategory === 'weapons') {
      items = items.filter(i => i.isWeapon);
    } else if (this.currentCategory === 'armor') {
      items = items.filter(i => i.isArmor);
    } else if (this.currentCategory === 'general') {
      items = items.filter(i => !i.isWeapon && !i.isArmor);
    }

    // Apply tier filter
    if (this.filterTier !== 'all') {
      items = items.filter(i => i.tierType === parseInt(this.filterTier));
    }

    // Apply search
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      items = items.filter(i => i.name?.toLowerCase().includes(term));
    }

    // Apply sorting
    items = this.sortItems(items);

    return items;
  }

  /**
   * Sort items
   */
  sortItems(items) {
    const sorted = [...items];

    switch (this.sortBy) {
      case 'power':
        sorted.sort((a, b) => (b.primaryStat?.value || 0) - (a.primaryStat?.value || 0));
        break;
      case 'name':
        sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        break;
      case 'rarity':
        sorted.sort((a, b) => (b.tierType || 0) - (a.tierType || 0));
        break;
      default:
        // Keep default order
        break;
    }

    return sorted;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Character selection
    this.container.querySelectorAll('.char-select-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const charId = btn.dataset.charId;
        const view = btn.dataset.view;

        if (view === 'vault') {
          this.currentView = 'vault';
        } else if (charId) {
          this.currentView = 'character';
          this.currentCharacter = charId;
        }
        this.render();
      });
    });

    // Category tabs
    this.container.querySelectorAll('.cat-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.currentCategory = tab.dataset.cat;
        this.render();
      });
    });

    // Filters
    const tierFilter = this.container.querySelector('.inventory-filter-tier');
    if (tierFilter) {
      tierFilter.addEventListener('change', () => {
        this.filterTier = tierFilter.value;
        this.render();
      });
    }

    const sortSelect = this.container.querySelector('.inventory-sort');
    if (sortSelect) {
      sortSelect.addEventListener('change', () => {
        this.sortBy = sortSelect.value;
        this.render();
      });
    }

    // Search
    const searchInput = this.container.querySelector('.inventory-search');
    if (searchInput) {
      let debounceTimer;
      searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          this.searchTerm = searchInput.value;
          this.render();
        }, 300);
      });
    }

    // Refresh button
    const refreshBtn = this.container.querySelector('.refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.load());
    }

    // Item click - open modal
    this.container.querySelectorAll('.equipped-slot:not(.empty), .inventory-item').forEach(item => {
      item.addEventListener('click', () => {
        this.openItemModal(item);
      });
    });
  }

  /**
   * Open item modal
   */
  openItemModal(itemEl) {
    const instanceId = itemEl.dataset.instanceId;
    const itemHash = itemEl.dataset.itemHash;
    const location = itemEl.dataset.location;
    const charId = itemEl.dataset.charId;

    // Find the item
    const item = this.findItem(instanceId, itemHash);
    if (!item) return;

    this.selectedItem = {
      ...item,
      location,
      characterId: charId || this.currentCharacter
    };

    const modal = document.getElementById('itemModal');
    if (!modal) return;

    // Populate modal
    const iconEl = modal.querySelector('.item-modal-icon');
    const nameEl = modal.querySelector('.item-modal-name');
    const typeEl = modal.querySelector('.item-modal-type');
    const statsEl = modal.querySelector('.item-modal-stats');
    const perksEl = modal.querySelector('.item-modal-perks');

    iconEl.innerHTML = item.icon ? `<img src="${item.icon}" alt="${item.name}">` : '';
    iconEl.className = `item-modal-icon tier-${item.tierTypeName?.toLowerCase() || 'common'}`;
    nameEl.textContent = item.name;
    typeEl.textContent = `${item.tierTypeName || ''} ${item.isWeapon ? inventoryProcessor.getWeaponTypeName(item.itemSubType) : 'Armor'}`;

    // Stats
    let statsHtml = '';
    if (item.primaryStat?.value) {
      const statName = item.isWeapon ? 'Attack' : 'Defense';
      statsHtml += `<div class="modal-stat"><span class="stat-name">${statName}</span><span class="stat-value">${item.primaryStat.value}</span></div>`;
    }
    if (item.stats) {
      for (const [name, value] of Object.entries(item.stats)) {
        if (name !== 'total') {
          statsHtml += `<div class="modal-stat"><span class="stat-name">${name}</span><span class="stat-value">${value}</span></div>`;
        }
      }
    }
    statsEl.innerHTML = statsHtml;

    // Show/hide action buttons based on context
    const equipBtn = modal.querySelector('.item-action-equip');
    const transferBtn = modal.querySelector('.item-action-transfer');
    const vaultBtn = modal.querySelector('.item-action-vault');

    equipBtn.style.display = location !== 'equipped' && location !== 'vault' ? 'block' : 'none';
    vaultBtn.style.display = location !== 'vault' ? 'block' : 'none';
    transferBtn.style.display = 'block';

    // Hide transfer targets
    modal.querySelector('.item-modal-transfer-targets').style.display = 'none';

    modal.classList.add('active');
  }

  /**
   * Close item modal
   */
  closeItemModal() {
    const modal = document.getElementById('itemModal');
    if (modal) {
      modal.classList.remove('active');
      this.selectedItem = null;
    }
  }

  /**
   * Find item by instance ID or hash
   */
  findItem(instanceId, itemHash) {
    // Search in equipped
    for (const charEquip of Object.values(this.inventory.equipped)) {
      for (const category of [charEquip.weapons, charEquip.armor]) {
        for (const item of Object.values(category || {})) {
          if (item?.itemInstanceId === instanceId) return item;
        }
      }
    }

    // Search in character inventories
    for (const char of Object.values(this.inventory.characters)) {
      if (char.inventory) {
        for (const items of Object.values(char.inventory)) {
          const found = items?.find(i => i.itemInstanceId === instanceId);
          if (found) return found;
        }
      }
    }

    // Search in vault
    if (this.inventory.vault?.items) {
      const found = this.inventory.vault.items.find(i => i.itemInstanceId === instanceId);
      if (found) return found;
    }

    return null;
  }

  /**
   * Equip selected item
   */
  async equipSelectedItem() {
    if (!this.selectedItem || this.isTransferring) return;

    try {
      this.isTransferring = true;
      this.showTransferStatus('Equipping...');

      // API expects: equipItems(itemIds, characterId)
      await apiClient.equipItems(
        [this.selectedItem.itemInstanceId],
        this.selectedItem.characterId
      );

      this.showTransferStatus('Equipped!', 'success');
      setTimeout(() => {
        this.closeItemModal();
        this.load(); // Refresh inventory
      }, 500);

    } catch (error) {
      console.error('Equip error:', error);
      this.showTransferStatus('Failed to equip: ' + error.message, 'error');
    } finally {
      this.isTransferring = false;
    }
  }

  /**
   * Send item to vault
   */
  async sendToVault() {
    if (!this.selectedItem || this.isTransferring) return;

    try {
      this.isTransferring = true;
      this.showTransferStatus('Sending to vault...');

      // API expects: transferItem(itemReferenceHash, stackSize, transferToVault, itemId, characterId)
      await apiClient.transferItem(
        this.selectedItem.itemHash,
        this.selectedItem.quantity || 1,
        true, // toVault
        this.selectedItem.itemInstanceId,
        this.selectedItem.characterId
      );

      this.showTransferStatus('Sent to vault!', 'success');
      setTimeout(() => {
        this.closeItemModal();
        this.load();
      }, 500);

    } catch (error) {
      console.error('Transfer error:', error);
      this.showTransferStatus('Failed to transfer: ' + error.message, 'error');
    } finally {
      this.isTransferring = false;
    }
  }

  /**
   * Show transfer options
   */
  showTransferOptions() {
    const modal = document.getElementById('itemModal');
    if (!modal) return;

    const targetsEl = modal.querySelector('.item-modal-transfer-targets');
    const optionsEl = modal.querySelector('.transfer-options');

    // Build transfer options
    let html = '';

    // Add character options
    for (const [charId, char] of Object.entries(this.inventory.characters)) {
      if (charId !== this.selectedItem?.characterId) {
        html += `
          <button class="transfer-target" data-target="${charId}">
            <span class="target-icon">${this.getClassIcon(char.classType)}</span>
            <span class="target-name">${char.className}</span>
          </button>
        `;
      }
    }

    // Add vault option if not already in vault
    if (this.selectedItem?.location !== 'vault') {
      html += `
        <button class="transfer-target" data-target="vault">
          <span class="target-icon">🔒</span>
          <span class="target-name">Vault</span>
        </button>
      `;
    }

    optionsEl.innerHTML = html;
    targetsEl.style.display = 'block';

    // Add click handlers
    optionsEl.querySelectorAll('.transfer-target').forEach(btn => {
      btn.addEventListener('click', () => {
        this.transferToTarget(btn.dataset.target);
      });
    });
  }

  /**
   * Transfer item to target
   */
  async transferToTarget(target) {
    if (!this.selectedItem || this.isTransferring) return;

    try {
      this.isTransferring = true;
      const stackSize = this.selectedItem.quantity || 1;

      if (target === 'vault') {
        this.showTransferStatus('Sending to vault...');
        // API expects: transferItem(itemReferenceHash, stackSize, transferToVault, itemId, characterId)
        await apiClient.transferItem(
          this.selectedItem.itemHash,
          stackSize,
          true, // toVault
          this.selectedItem.itemInstanceId,
          this.selectedItem.characterId
        );
      } else {
        // Transfer to vault first if coming from another character
        if (this.selectedItem.location !== 'vault') {
          this.showTransferStatus('Moving via vault...');
          await apiClient.transferItem(
            this.selectedItem.itemHash,
            stackSize,
            true, // toVault
            this.selectedItem.itemInstanceId,
            this.selectedItem.characterId
          );
        }

        // Then transfer from vault to target character
        this.showTransferStatus('Transferring...');
        await apiClient.transferItem(
          this.selectedItem.itemHash,
          stackSize,
          false, // fromVault
          this.selectedItem.itemInstanceId,
          target
        );
      }

      this.showTransferStatus('Transferred!', 'success');
      setTimeout(() => {
        this.closeItemModal();
        this.load();
      }, 500);

    } catch (error) {
      console.error('Transfer error:', error);
      this.showTransferStatus('Failed: ' + error.message, 'error');
    } finally {
      this.isTransferring = false;
    }
  }

  /**
   * Show transfer status
   */
  showTransferStatus(message, type = 'info') {
    const modal = document.getElementById('itemModal');
    if (!modal) return;

    let statusEl = modal.querySelector('.transfer-status');
    if (!statusEl) {
      statusEl = document.createElement('div');
      statusEl.className = 'transfer-status';
      modal.querySelector('.item-modal-content').appendChild(statusEl);
    }

    statusEl.textContent = message;
    statusEl.className = `transfer-status ${type}`;
    statusEl.style.display = 'block';

    if (type !== 'info') {
      setTimeout(() => {
        statusEl.style.display = 'none';
      }, 3000);
    }
  }

  /**
   * Get class icon
   */
  getClassIcon(classType) {
    const icons = ['⚔️', '🏹', '✨'];
    return icons[classType] || '❓';
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
