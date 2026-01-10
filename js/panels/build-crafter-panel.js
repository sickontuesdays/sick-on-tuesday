/**
 * Build Crafter Panel - Complete build generation from user's inventory
 * Uses the BuildEngine to create optimized loadouts with actual items
 */

import { apiClient } from '../api/bungie-api-client.js';
import { inventoryProcessor } from '../utils/inventory-processor.js';
import { storageManager } from '../core/storage-manager.js';
import { buildEngine } from '../utils/build-engine.js';

export class BuildCrafterPanel {
  constructor(containerEl) {
    this.container = containerEl;
    this.inventory = null;
    this.currentClass = null;
    this.currentBuild = null;
    this.savedBuilds = [];
    this.inputValue = '';
    this.isLoading = false;
    this.isEquipping = false;
  }

  /**
   * Initialize build crafter panel
   */
  async init() {
    this.loadSavedBuilds();
    this.render();
  }

  /**
   * Load inventory data
   */
  async load() {
    try {
      this.showLoading('Loading inventory...');

      const profileData = await apiClient.getProfile();
      this.inventory = inventoryProcessor.processProfile(profileData);

      // Set inventory in build engine
      buildEngine.setInventory(this.inventory);

      // Get first character's class
      const charId = Object.keys(this.inventory.characters)[0];
      if (charId) {
        this.currentClass = this.inventory.characters[charId].className.toLowerCase();
      }

      this.render();
    } catch (error) {
      console.error('Build crafter load error:', error);
      this.showError(error.message);
    }
  }

  /**
   * Load saved builds from storage
   */
  loadSavedBuilds() {
    this.savedBuilds = storageManager.getLoadouts() || [];
  }

  /**
   * Render build crafter panel
   */
  render() {
    let html = `
      <div class="build-crafter-panel">
        <div class="crafter-input-section">
          <h4>Build Crafter</h4>
          <p class="crafter-description">Describe your ideal build and we'll create a complete loadout from your inventory.</p>
          <div class="input-wrapper">
            <input type="text"
                   class="build-input"
                   placeholder="e.g., 'solar titan build for raids' or 'void hunter with invis for GMs'"
                   value="${this.inputValue}">
            <button class="generate-btn" ${!this.inventory ? 'disabled' : ''}>
              ${this.isLoading ? 'Generating...' : 'Generate Build'}
            </button>
          </div>
          <div class="quick-tags">
            <span class="quick-tag" data-tag="solar">Solar</span>
            <span class="quick-tag" data-tag="arc">Arc</span>
            <span class="quick-tag" data-tag="void">Void</span>
            <span class="quick-tag" data-tag="stasis">Stasis</span>
            <span class="quick-tag" data-tag="strand">Strand</span>
            <span class="quick-tag" data-tag="prismatic">Prismatic</span>
          </div>
          <div class="quick-tags activity-tags">
            <span class="quick-tag" data-tag="raid">Raid</span>
            <span class="quick-tag" data-tag="dungeon">Dungeon</span>
            <span class="quick-tag" data-tag="gm">GM</span>
            <span class="quick-tag" data-tag="pvp">PvP</span>
            <span class="quick-tag" data-tag="gambit">Gambit</span>
          </div>
        </div>

        ${!this.inventory ? this.renderLoginPrompt() : ''}
        ${this.currentBuild ? this.renderBuildResult() : this.renderBuildPlaceholder()}
        ${this.renderSavedBuilds()}
      </div>
    `;

    this.container.innerHTML = html;
    this.attachEventListeners();
  }

  /**
   * Render login prompt
   */
  renderLoginPrompt() {
    return `
      <div class="login-prompt">
        <p>Log in with Bungie to access your inventory and generate builds.</p>
      </div>
    `;
  }

  /**
   * Render build placeholder
   */
  renderBuildPlaceholder() {
    if (!this.inventory) return '';

    return `
      <div class="build-placeholder">
        <p>Describe your ideal build using natural language.</p>
        <p class="placeholder-examples">Examples:</p>
        <ul>
          <li>"Solar titan build for raids with sunspots"</li>
          <li>"Void hunter build with invisibility for GMs"</li>
          <li>"Arc warlock for PvP with high recovery"</li>
          <li>"Strand build with grapple for add clear"</li>
        </ul>
      </div>
    `;
  }

  /**
   * Render generated build result
   */
  renderBuildResult() {
    const build = this.currentBuild;

    return `
      <div class="build-result">
        <div class="build-header">
          <h4>${build.name}</h4>
          <div class="build-meta">
            <span class="subclass-element ${build.element.toLowerCase()}">${build.element}</span>
            <span class="subclass-class">${build.class}</span>
            ${build.activity ? `<span class="activity-type">${build.activity.name}</span>` : ''}
          </div>
          <div class="build-actions">
            <button class="save-build-btn">Save</button>
            <button class="share-build-btn">Share</button>
            ${build.canEquip ? `<button class="equip-build-btn" ${this.isEquipping ? 'disabled' : ''}>${this.isEquipping ? 'Equipping...' : 'Equip Build'}</button>` : ''}
          </div>
        </div>

        <div class="build-content">
          ${this.renderSubclassSection(build.subclass)}
          ${this.renderWeaponsSection(build.weapons)}
          ${this.renderArmorSection(build.armor)}
          ${this.renderStatsSection(build.stats, build.secondaryBonuses)}
          ${this.renderArtifactSection(build.artifactMods)}
          ${build.notes ? `<div class="build-notes"><h5>Notes</h5><p>${build.notes}</p></div>` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Render subclass section
   */
  renderSubclassSection(subclass) {
    if (!subclass) return '';

    return `
      <div class="build-section subclass-section">
        <h5>Subclass Configuration</h5>
        <div class="subclass-super">
          <span class="label">Super:</span>
          <span class="value">${subclass.super || 'Default'}</span>
        </div>

        <div class="aspects-container">
          <span class="label">Aspects:</span>
          <div class="aspect-list">
            ${subclass.aspects?.map(a => `
              <div class="aspect-item" title="${a.description || ''}">
                ${a.icon ? `<img src="${a.icon}" alt="${a.name}" class="aspect-icon">` : ''}
                <span class="aspect-name">${a.name}</span>
                ${a.fragmentSlots ? `<span class="fragment-slots">${a.fragmentSlots} slots</span>` : ''}
              </div>
            `).join('') || '<span class="no-data">None selected</span>'}
          </div>
        </div>

        <div class="fragments-container">
          <span class="label">Fragments:</span>
          <div class="fragment-list">
            ${subclass.fragments?.map(f => `
              <div class="fragment-item" title="${f.description || ''}">
                ${f.icon ? `<img src="${f.icon}" alt="${f.name}" class="fragment-icon">` : ''}
                <span class="fragment-name">${f.name}</span>
                ${f.statBonuses && Object.keys(f.statBonuses).length > 0 ?
                  `<span class="stat-bonuses">${Object.entries(f.statBonuses).map(([stat, val]) =>
                    `${val > 0 ? '+' : ''}${val} ${stat.charAt(0).toUpperCase()}`
                  ).join(', ')}</span>` : ''}
              </div>
            `).join('') || '<span class="no-data">None selected</span>'}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render weapons section
   */
  renderWeaponsSection(weapons) {
    if (!weapons) return '';

    return `
      <div class="build-section weapons-section">
        <h5>Weapons</h5>
        <div class="weapons-grid">
          ${this.renderWeaponSlot('Kinetic', weapons.kinetic)}
          ${this.renderWeaponSlot('Energy', weapons.energy)}
          ${this.renderWeaponSlot('Power', weapons.power)}
        </div>
      </div>
    `;
  }

  /**
   * Render single weapon slot
   */
  renderWeaponSlot(slotName, weapon) {
    if (!weapon) {
      return `
        <div class="weapon-slot empty">
          <span class="slot-label">${slotName}</span>
          <span class="no-weapon">No weapon selected</span>
        </div>
      `;
    }

    return `
      <div class="weapon-slot ${weapon.isExotic ? 'exotic' : 'legendary'}">
        <span class="slot-label">${slotName}</span>
        <div class="weapon-item">
          ${weapon.icon ? `<img src="${weapon.icon}" alt="${weapon.name}" class="weapon-icon">` : ''}
          <div class="weapon-info">
            <span class="weapon-name">${weapon.name}</span>
            <span class="weapon-power">${weapon.primaryStat?.value || '???'}</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render armor section
   */
  renderArmorSection(armor) {
    if (!armor) return '';

    return `
      <div class="build-section armor-section">
        <h5>Armor</h5>
        <div class="armor-grid">
          ${this.renderArmorSlot('Helmet', armor.helmet)}
          ${this.renderArmorSlot('Gauntlets', armor.gauntlets)}
          ${this.renderArmorSlot('Chest', armor.chest)}
          ${this.renderArmorSlot('Legs', armor.legs)}
          ${this.renderArmorSlot('Class', armor.class)}
        </div>
      </div>
    `;
  }

  /**
   * Render single armor slot
   */
  renderArmorSlot(slotName, armorData) {
    const armor = armorData?.item;
    const mods = armorData?.mods || [];

    if (!armor) {
      return `
        <div class="armor-slot empty">
          <span class="slot-label">${slotName}</span>
          <span class="no-armor">No armor selected</span>
        </div>
      `;
    }

    return `
      <div class="armor-slot ${armor.isExotic ? 'exotic' : 'legendary'}">
        <span class="slot-label">${slotName}</span>
        <div class="armor-item">
          ${armor.icon ? `<img src="${armor.icon}" alt="${armor.name}" class="armor-icon">` : ''}
          <div class="armor-info">
            <span class="armor-name">${armor.name}</span>
            ${armor.stats ? `
              <div class="armor-stats-mini">
                <span title="Mobility">${armor.stats.mobility || 0}</span>
                <span title="Resilience">${armor.stats.resilience || 0}</span>
                <span title="Recovery">${armor.stats.recovery || 0}</span>
                <span title="Discipline">${armor.stats.discipline || 0}</span>
                <span title="Intellect">${armor.stats.intellect || 0}</span>
                <span title="Strength">${armor.stats.strength || 0}</span>
              </div>
            ` : ''}
          </div>
        </div>
        ${mods.length > 0 ? `
          <div class="armor-mods">
            ${mods.map(m => `<span class="mod-chip" title="${m.name}">${m.name}</span>`).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Render stats section
   */
  renderStatsSection(stats, secondaryBonuses) {
    if (!stats) return '';

    const statOrder = ['mobility', 'resilience', 'recovery', 'discipline', 'intellect', 'strength'];

    return `
      <div class="build-section stats-section">
        <h5>Total Stats</h5>
        <div class="stats-grid">
          ${statOrder.map(stat => {
            const value = stats[stat] || 0;
            const tier = Math.min(10, Math.floor(value / 10));
            const hasSecondary = secondaryBonuses && secondaryBonuses[stat];

            return `
              <div class="stat-row ${hasSecondary ? 'has-secondary' : ''}">
                <span class="stat-name">${stat.charAt(0).toUpperCase() + stat.slice(1)}</span>
                <div class="stat-bar-container">
                  <div class="stat-bar" style="width: ${Math.min(100, value)}%"></div>
                  ${value > 100 ? `<div class="stat-bar-overflow" style="width: ${value - 100}%"></div>` : ''}
                </div>
                <span class="stat-value">${value}</span>
                <span class="stat-tier">T${tier}</span>
                ${hasSecondary ? `<span class="secondary-bonus" title="${secondaryBonuses[stat].description}">${secondaryBonuses[stat].description}</span>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Render artifact section
   */
  renderArtifactSection(artifactMods) {
    if (!artifactMods || artifactMods.length === 0) return '';

    return `
      <div class="build-section artifact-section">
        <h5>Recommended Artifact Mods</h5>
        <div class="artifact-mods">
          ${artifactMods.map(mod => `
            <div class="artifact-mod ${mod.priority}">
              <span class="mod-name">${mod.name}</span>
              <span class="mod-priority">${mod.priority}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Render saved builds section
   */
  renderSavedBuilds() {
    if (this.savedBuilds.length === 0) {
      return `
        <div class="saved-builds-section">
          <h4>Saved Builds</h4>
          <p class="no-builds">No saved builds yet</p>
        </div>
      `;
    }

    return `
      <div class="saved-builds-section">
        <h4>Saved Builds (${this.savedBuilds.length})</h4>
        <div class="saved-builds-list">
          ${this.savedBuilds.map((build, index) => `
            <div class="saved-build-item" data-build-index="${index}">
              <div class="build-info">
                <span class="build-name">${build.name}</span>
                <span class="build-element ${(build.element || '').toLowerCase()}">${build.element} ${build.class}</span>
              </div>
              <div class="build-actions">
                <button class="load-btn" data-index="${index}">Load</button>
                <button class="delete-btn" data-index="${index}">Delete</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Generate build from natural language input
   */
  async generateBuild(input) {
    if (!this.inventory) {
      alert('Please log in first to access your inventory.');
      return;
    }

    this.isLoading = true;
    this.inputValue = input;
    this.render();

    try {
      // Use the build engine to generate a complete build
      const build = await buildEngine.generateBuild(input, null, this.currentClass);
      this.currentBuild = build;
    } catch (error) {
      console.error('Build generation error:', error);
      alert('Failed to generate build: ' + error.message);
    } finally {
      this.isLoading = false;
      this.render();
    }
  }

  /**
   * Equip the current build
   */
  async equipBuild() {
    if (!this.currentBuild || !this.inventory) return;

    this.isEquipping = true;
    this.render();

    try {
      const charId = Object.keys(this.inventory.characters)[0];
      if (!charId) throw new Error('No character found');

      const itemIds = [];

      // Collect weapon item IDs
      if (this.currentBuild.weapons) {
        if (this.currentBuild.weapons.kinetic?.itemInstanceId) {
          itemIds.push(this.currentBuild.weapons.kinetic.itemInstanceId);
        }
        if (this.currentBuild.weapons.energy?.itemInstanceId) {
          itemIds.push(this.currentBuild.weapons.energy.itemInstanceId);
        }
        if (this.currentBuild.weapons.power?.itemInstanceId) {
          itemIds.push(this.currentBuild.weapons.power.itemInstanceId);
        }
      }

      // Collect armor item IDs
      if (this.currentBuild.armor) {
        for (const slot of ['helmet', 'gauntlets', 'chest', 'legs', 'class']) {
          const armorData = this.currentBuild.armor[slot];
          if (armorData?.item?.itemInstanceId) {
            itemIds.push(armorData.item.itemInstanceId);
          }
        }
      }

      if (itemIds.length === 0) {
        throw new Error('No items to equip');
      }

      // Equip all items
      await apiClient.equipItems(itemIds, charId);

      alert('Build equipped successfully!');

      // Refresh inventory
      await this.load();
    } catch (error) {
      console.error('Equip build error:', error);
      alert('Failed to equip build: ' + error.message);
    } finally {
      this.isEquipping = false;
      this.render();
    }
  }

  /**
   * Save current build
   */
  saveBuild() {
    if (!this.currentBuild) return;

    const buildToSave = {
      ...this.currentBuild,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };

    this.savedBuilds.push(buildToSave);
    storageManager.saveLoadout(buildToSave);
    this.render();
  }

  /**
   * Delete saved build
   */
  deleteBuild(index) {
    const build = this.savedBuilds[index];
    if (build) {
      this.savedBuilds.splice(index, 1);
      storageManager.deleteLoadout(build.id);
      this.render();
    }
  }

  /**
   * Load saved build
   */
  loadBuild(index) {
    const build = this.savedBuilds[index];
    if (build) {
      this.currentBuild = build;
      this.render();
    }
  }

  /**
   * Generate share link
   */
  generateShareLink() {
    if (!this.currentBuild) return null;

    const buildData = {
      n: this.currentBuild.name,
      c: this.currentBuild.class,
      e: this.currentBuild.element,
      s: this.currentBuild.subclass?.super,
      a: this.currentBuild.subclass?.aspects?.map(a => a.name),
      f: this.currentBuild.subclass?.fragments?.map(f => f.name)
    };

    const encoded = btoa(JSON.stringify(buildData));
    return `${window.location.origin}${window.location.pathname}?build=${encoded}`;
  }

  /**
   * Copy share link to clipboard
   */
  async shareBuild() {
    const link = this.generateShareLink();
    if (!link) return;

    try {
      await navigator.clipboard.writeText(link);
      alert('Build link copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy link:', err);
      prompt('Copy this link:', link);
    }
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Generate build button
    const generateBtn = this.container.querySelector('.generate-btn');
    const input = this.container.querySelector('.build-input');

    if (generateBtn && input) {
      generateBtn.addEventListener('click', () => {
        const value = input.value.trim();
        if (value) {
          this.generateBuild(value);
        }
      });

      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          const value = input.value.trim();
          if (value) {
            this.generateBuild(value);
          }
        }
      });
    }

    // Quick tags
    this.container.querySelectorAll('.quick-tag').forEach(tag => {
      tag.addEventListener('click', () => {
        const input = this.container.querySelector('.build-input');
        if (input) {
          const currentValue = input.value.trim();
          const tagValue = tag.dataset.tag;

          if (currentValue.toLowerCase().includes(tagValue)) {
            // Remove tag if already present
            input.value = currentValue.replace(new RegExp(tagValue, 'gi'), '').trim();
            tag.classList.remove('active');
          } else {
            // Add tag
            input.value = currentValue ? `${currentValue} ${tagValue}` : tagValue;
            tag.classList.add('active');
          }
        }
      });
    });

    // Save build button
    const saveBtn = this.container.querySelector('.save-build-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveBuild());
    }

    // Share build button
    const shareBtn = this.container.querySelector('.share-build-btn');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => this.shareBuild());
    }

    // Equip build button
    const equipBtn = this.container.querySelector('.equip-build-btn');
    if (equipBtn) {
      equipBtn.addEventListener('click', () => this.equipBuild());
    }

    // Load/delete saved builds
    this.container.querySelectorAll('.load-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.loadBuild(parseInt(btn.dataset.index));
      });
    });

    this.container.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('Delete this build?')) {
          this.deleteBuild(parseInt(btn.dataset.index));
        }
      });
    });
  }

  /**
   * Show loading state
   */
  showLoading(message = 'Loading...') {
    this.container.innerHTML = `
      <div class="panel-loading">
        <div class="loading-spinner"></div>
        <span>${message}</span>
      </div>
    `;
  }

  /**
   * Show error state
   */
  showError(message) {
    this.container.innerHTML = `
      <div class="panel-error">
        <p>Error loading build crafter</p>
        <small>${message}</small>
        <button onclick="window.dashboard?.panelManager?.loadPanel('build-crafter')">Retry</button>
      </div>
    `;
  }
}

export default BuildCrafterPanel;
