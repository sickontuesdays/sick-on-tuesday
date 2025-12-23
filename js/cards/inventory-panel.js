// js/cards/inventory-panel.js
// Main inventory panel module following BuildCrafter pattern

import BungieInventoryAPI from '../api/bungie-inventory-api.js';
import InventoryProcessor from '../utils/inventory-processor.js';

export class InventoryPanel {
  constructor(cardElement, authManager, manifestLoader) {
    this.cardEl = cardElement;
    this.contentEl = cardElement.querySelector('#inventory-panel-content');
    this.authManager = authManager;
    this.manifestLoader = manifestLoader;

    // Initialize API and processor
    this.api = new BungieInventoryAPI(authManager, manifestLoader);
    this.processor = new InventoryProcessor(manifestLoader);

    // State management
    this.rawData = null;
    this.buildReadyData = null;
    this.currentCharacter = 'titan';
    this.isLoading = false;

    this.init();
  }

  init() {
    console.log('🎒 Initializing Inventory Panel...');

    // Listen for authentication changes
    this.authManager.addEventListener('sessionchange', this.onAuthChange.bind(this));
    this.authManager.addEventListener('loadingchange', this.onLoadingChange.bind(this));

    // Initial UI setup
    this.createUI();
    this.bindEvents();
    this.updateState();
  }

  createUI() {
    this.contentEl.innerHTML = `
      <div class="inventory-container">
        <!-- Authentication State -->
        <div id="auth-state" class="auth-state">
          <div class="sign-in-prompt">
            <h3>🔐 Sign In Required</h3>
            <p>Sign in with Bungie.net to view your inventory</p>
          </div>
        </div>

        <!-- Loading State -->
        <div id="loading-state" class="loading-state hidden">
          <div class="loading-spinner"></div>
          <p>Loading your inventory...</p>
        </div>

        <!-- Error State -->
        <div id="error-state" class="error-state hidden">
          <h3>❌ Error Loading Inventory</h3>
          <p id="error-message">Failed to load inventory data</p>
          <button id="retry-button" class="retry-btn">Retry</button>
        </div>

        <!-- Main Inventory Interface -->
        <div id="inventory-interface" class="inventory-interface hidden">
          <!-- Character Tabs -->
          <div class="inventory-tabs">
            <button class="tab active" data-character="titan">
              <span class="tab-icon">🛡️</span>
              <span class="tab-name">Titan</span>
            </button>
            <button class="tab" data-character="hunter">
              <span class="tab-icon">🏹</span>
              <span class="tab-name">Hunter</span>
            </button>
            <button class="tab" data-character="warlock">
              <span class="tab-icon">✨</span>
              <span class="tab-name">Warlock</span>
            </button>
            <button class="tab" data-character="vault">
              <span class="tab-icon">🏦</span>
              <span class="tab-name">Vault</span>
            </button>
          </div>

          <!-- Character Content -->
          <div class="character-content">
            <div id="character-info" class="character-info">
              <!-- Character stats and equipped items will be populated here -->
            </div>

            <div id="inventory-grid" class="inventory-grid">
              <!-- Inventory items will be populated here -->
            </div>
          </div>

          <!-- Download Controls -->
          <div class="download-controls">
            <button id="refresh-button" class="action-btn secondary">
              <span>🔄</span> Refresh
            </button>
            <button id="download-raw" class="action-btn secondary">
              <span>📄</span> Raw JSON
            </button>
            <button id="download-build" class="action-btn primary">
              <span>🔧</span> Build Data
            </button>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    // Tab switching
    this.contentEl.addEventListener('click', (e) => {
      if (e.target.closest('.tab')) {
        const character = e.target.closest('.tab').dataset.character;
        this.switchCharacter(character);
      }
    });

    // Download buttons
    this.contentEl.addEventListener('click', (e) => {
      if (e.target.closest('#download-raw')) {
        this.downloadRawJSON();
      } else if (e.target.closest('#download-build')) {
        this.downloadBuildReadyJSON();
      } else if (e.target.closest('#refresh-button')) {
        this.refreshData();
      } else if (e.target.closest('#retry-button')) {
        this.loadInventoryData();
      }
    });
  }

  onAuthChange() {
    console.log('🔄 Auth state changed, updating inventory panel...');
    this.updateState();
  }

  onLoadingChange() {
    // Could add loading indicators based on auth loading state
  }

  updateState() {
    if (!this.authManager.isAuthenticated()) {
      this.showAuthState();
    } else if (this.isLoading) {
      this.showLoadingState();
    } else if (!this.rawData) {
      // Authenticated but no data - load it
      this.loadInventoryData();
    } else {
      this.showInventoryInterface();
    }
  }

  async loadInventoryData() {
    if (!this.authManager.isAuthenticated()) {
      this.showAuthState();
      return;
    }

    try {
      this.isLoading = true;
      this.showLoadingState();

      console.log('🔄 Loading comprehensive inventory data...');

      // Fetch raw data from Bungie API
      this.rawData = await this.api.getCompleteUserData();

      // Process into Build-Ready format
      this.buildReadyData = await InventoryProcessor.processBuildReadyData(
        this.rawData,
        this.manifestLoader
      );

      console.log('✅ Inventory data loaded successfully');
      console.log('Characters found:', Object.keys(this.buildReadyData.characters));

      // Emit global event for other panels to use
      window.inventoryData = this.buildReadyData;
      document.dispatchEvent(new CustomEvent('inventoryLoaded', {
        detail: this.buildReadyData
      }));

      this.showInventoryInterface();

    } catch (error) {
      console.error('❌ Failed to load inventory:', error);
      this.showErrorState(error.message);
    } finally {
      this.isLoading = false;
    }
  }

  refreshData() {
    // Clear cache and reload
    this.api.clearCache();
    this.rawData = null;
    this.buildReadyData = null;
    this.loadInventoryData();
  }

  switchCharacter(character) {
    this.currentCharacter = character;

    // Update tab active state
    this.contentEl.querySelectorAll('.tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.character === character);
    });

    // Update character content
    this.renderCharacterContent(character);
  }

  renderCharacterContent(character) {
    const characterInfoEl = this.contentEl.querySelector('#character-info');
    const inventoryGridEl = this.contentEl.querySelector('#inventory-grid');

    if (!this.buildReadyData) {
      characterInfoEl.innerHTML = '<p>No data available</p>';
      inventoryGridEl.innerHTML = '';
      return;
    }

    if (character === 'vault') {
      this.renderVaultContent(characterInfoEl, inventoryGridEl);
    } else {
      this.renderCharacterData(character, characterInfoEl, inventoryGridEl);
    }
  }

  renderCharacterData(characterKey, infoEl, gridEl) {
    const characterData = this.buildReadyData.characters[characterKey];

    if (!characterData) {
      infoEl.innerHTML = `<p>No ${characterKey} character found</p>`;
      gridEl.innerHTML = '';
      return;
    }

    // Character info section
    infoEl.innerHTML = `
      <div class="character-header">
        <h3>${characterData.class} - Light ${characterData.light}</h3>
        <p class="character-details">${characterData.race} ${characterData.gender}</p>
      </div>

      <div class="character-stats">
        <div class="stat-grid">
          <div class="stat"><span class="stat-name">Mobility:</span> <span class="stat-value">${characterData.stats.mobility || 0}</span></div>
          <div class="stat"><span class="stat-name">Resilience:</span> <span class="stat-value">${characterData.stats.resilience || 0}</span></div>
          <div class="stat"><span class="stat-name">Recovery:</span> <span class="stat-value">${characterData.stats.recovery || 0}</span></div>
          <div class="stat"><span class="stat-name">Discipline:</span> <span class="stat-value">${characterData.stats.discipline || 0}</span></div>
          <div class="stat"><span class="stat-name">Intellect:</span> <span class="stat-value">${characterData.stats.intellect || 0}</span></div>
          <div class="stat"><span class="stat-name">Strength:</span> <span class="stat-value">${characterData.stats.strength || 0}</span></div>
        </div>
      </div>

      <div class="equipped-gear">
        <h4>Equipped Weapons</h4>
        <div class="equipped-weapons">
          ${this.renderEquippedWeapon('Kinetic', characterData.equipped.weapons.kinetic)}
          ${this.renderEquippedWeapon('Energy', characterData.equipped.weapons.energy)}
          ${this.renderEquippedWeapon('Power', characterData.equipped.weapons.power)}
        </div>
      </div>
    `;

    // Inventory grid
    const allItems = [
      ...(characterData.inventory.weapons || []),
      ...(characterData.inventory.armor || []),
      ...(characterData.inventory.materials || []).slice(0, 20), // Limit materials for space
      ...(characterData.inventory.consumables || []).slice(0, 10) // Limit consumables for space
    ];

    this.renderItemGrid(gridEl, allItems, `${characterKey.toUpperCase()} INVENTORY`);
  }

  renderVaultContent(infoEl, gridEl) {
    const vaultData = this.buildReadyData.vault;

    if (!vaultData) {
      infoEl.innerHTML = '<p>No vault data available</p>';
      gridEl.innerHTML = '';
      return;
    }

    // Vault info section
    const totalItems = (vaultData.weapons?.length || 0) +
                      (vaultData.armor?.length || 0) +
                      (vaultData.materials?.length || 0) +
                      (vaultData.consumables?.length || 0);

    infoEl.innerHTML = `
      <div class="vault-header">
        <h3>🏦 Vault</h3>
        <p class="vault-summary">Total Items: ${totalItems} / 500</p>
      </div>

      <div class="vault-categories">
        <div class="category"><span class="category-name">Weapons:</span> <span class="category-count">${vaultData.weapons?.length || 0}</span></div>
        <div class="category"><span class="category-name">Armor:</span> <span class="category-count">${vaultData.armor?.length || 0}</span></div>
        <div class="category"><span class="category-name">Materials:</span> <span class="category-count">${vaultData.materials?.length || 0}</span></div>
        <div class="category"><span class="category-name">Consumables:</span> <span class="category-count">${vaultData.consumables?.length || 0}</span></div>
      </div>
    `;

    // Vault grid (prioritize weapons and armor)
    const vaultItems = [
      ...(vaultData.weapons || []),
      ...(vaultData.armor || []),
      ...(vaultData.materials || []).slice(0, 30), // Limit materials
      ...(vaultData.consumables || []).slice(0, 20) // Limit consumables
    ];

    this.renderItemGrid(gridEl, vaultItems, 'VAULT CONTENTS');
  }

  renderEquippedWeapon(slot, weapon) {
    if (!weapon) {
      return `<div class="equipped-slot empty">${slot}: <span class="empty-text">Empty</span></div>`;
    }

    return `
      <div class="equipped-slot filled">
        <img src="${weapon.icon}" alt="${weapon.name}" class="weapon-icon" />
        <div class="weapon-info">
          <span class="weapon-name">${weapon.name}</span>
          <span class="weapon-type">${weapon.itemType}</span>
        </div>
      </div>
    `;
  }

  renderItemGrid(gridEl, items, title) {
    if (!items || items.length === 0) {
      gridEl.innerHTML = `
        <div class="section-header">${title}</div>
        <p class="empty-inventory">No items found</p>
      `;
      return;
    }

    const itemsHTML = items.slice(0, 50).map(item => `
      <div class="item" title="${item.name}\n${item.itemType}${item.tier ? ' - ' + item.tier : ''}">
        <img src="${item.icon}" alt="${item.name}" class="item-icon" />
        ${item.quantity > 1 ? `<span class="item-quantity">${item.quantity}</span>` : ''}
        <div class="item-info">
          <span class="item-name">${item.name}</span>
          <span class="item-type">${item.itemType}</span>
        </div>
      </div>
    `).join('');

    gridEl.innerHTML = `
      <div class="section-header">${title} (${items.length} items)</div>
      <div class="items-grid">
        ${itemsHTML}
        ${items.length > 50 ? `<div class="item more-items">+${items.length - 50} more...</div>` : ''}
      </div>
    `;
  }

  downloadRawJSON() {
    if (!this.rawData) {
      alert('No data available to download');
      return;
    }

    const blob = new Blob([JSON.stringify(this.rawData, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `destiny-inventory-raw-${Date.now()}.json`;
    a.click();

    URL.revokeObjectURL(url);
    console.log('💾 Raw JSON downloaded');
  }

  downloadBuildReadyJSON() {
    if (!this.buildReadyData) {
      alert('No processed data available to download');
      return;
    }

    const blob = new Blob([JSON.stringify(this.buildReadyData, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `destiny-build-data-${Date.now()}.json`;
    a.click();

    URL.revokeObjectURL(url);
    console.log('🔧 Build-Ready JSON downloaded');
  }

  // UI State Management Methods
  showAuthState() {
    this.hideAllStates();
    this.contentEl.querySelector('#auth-state').classList.remove('hidden');
  }

  showLoadingState() {
    this.hideAllStates();
    this.contentEl.querySelector('#loading-state').classList.remove('hidden');
  }

  showErrorState(message) {
    this.hideAllStates();
    const errorEl = this.contentEl.querySelector('#error-state');
    errorEl.querySelector('#error-message').textContent = message;
    errorEl.classList.remove('hidden');
  }

  showInventoryInterface() {
    this.hideAllStates();
    this.contentEl.querySelector('#inventory-interface').classList.remove('hidden');

    // Render the current character
    this.renderCharacterContent(this.currentCharacter);
  }

  hideAllStates() {
    ['#auth-state', '#loading-state', '#error-state', '#inventory-interface'].forEach(selector => {
      this.contentEl.querySelector(selector)?.classList.add('hidden');
    });
  }
}

export default InventoryPanel;