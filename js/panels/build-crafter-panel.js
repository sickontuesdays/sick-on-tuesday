/**
 * Build Crafter Panel - Natural language build generation and loadout management
 */

import { apiClient } from '../api/bungie-api-client.js';
import { manifestLoader } from '../api/manifest-loader.js';
import { inventoryProcessor } from '../utils/inventory-processor.js';
import { storageManager } from '../core/storage-manager.js';

// Build archetypes with keywords
const BUILD_ARCHETYPES = {
  solar: {
    keywords: ['solar', 'sun', 'fire', 'burn', 'radiant', 'scorch', 'ignition'],
    exotics: {
      titan: ['Loreley Splendor Helm', 'Hallowfire Heart', 'Phoenix Cradle'],
      hunter: ['Celestial Nighthawk', 'Star-Eater Scales', 'Caliban\'s Hand'],
      warlock: ['Dawn Chorus', 'Sunbracers', 'Rain of Fire']
    },
    aspects: ['Sol Invictus', 'Consecration', 'Knock \'Em Down', 'Heat Rises'],
    fragments: ['Ember of Torches', 'Ember of Singeing', 'Ember of Ashes']
  },
  arc: {
    keywords: ['arc', 'lightning', 'electric', 'thunder', 'amplified', 'blind', 'jolt'],
    exotics: {
      titan: ['Cuirass of the Falling Star', 'Heart of Inmost Light', 'Dunemarchers'],
      hunter: ['Star-Eater Scales', 'Raiju\'s Harness', 'Lucky Raspberry'],
      warlock: ['Fallen Sunstar', 'Crown of Tempests', 'Getaway Artist']
    },
    aspects: ['Knockout', 'Juggernaut', 'Flow State', 'Electrostatic Mind'],
    fragments: ['Spark of Ions', 'Spark of Shock', 'Spark of Magnitude']
  },
  void: {
    keywords: ['void', 'purple', 'volatile', 'suppress', 'weaken', 'devour', 'invisibility', 'invis'],
    exotics: {
      titan: ['Helm of Saint-14', 'Ursa Furiosa', 'Doom Fang Pauldron'],
      hunter: ['Orpheus Rig', 'Omnioculus', 'Gyrfalcon\'s Hauberk'],
      warlock: ['Contraverse Hold', 'Nothing Manacles', 'Nezarec\'s Sin']
    },
    aspects: ['Offensive Bulwark', 'Bastion', 'Stylish Executioner', 'Child of the Old Gods'],
    fragments: ['Echo of Undermining', 'Echo of Instability', 'Echo of Persistence']
  },
  stasis: {
    keywords: ['stasis', 'ice', 'freeze', 'crystal', 'shatter', 'slow', 'cold'],
    exotics: {
      titan: ['Hoarfrost-Z', 'Precious Scars', 'Armamentarium'],
      hunter: ['Renewal Grasps', 'Mask of Bakris', 'Fr0st-EE5'],
      warlock: ['Osmiomancy Gloves', 'Verity\'s Brow', 'Eye of Another World']
    },
    aspects: ['Howl of the Storm', 'Tectonic Harvest', 'Grim Harvest', 'Bleak Watcher'],
    fragments: ['Whisper of Chains', 'Whisper of Shards', 'Whisper of Fissures']
  },
  strand: {
    keywords: ['strand', 'green', 'suspend', 'sever', 'tangle', 'unravel', 'woven'],
    exotics: {
      titan: ['Abeyant Leap', 'Synthoceps', 'Wormgod Caress'],
      hunter: ['Cyrtarachne\'s Facade', 'Speedloader Slacks', 'The Sixth Coyote'],
      warlock: ['Swarmers', 'Necrotic Grip', 'Apotheosis Veil']
    },
    aspects: ['Into the Fray', 'Drengr\'s Lash', 'Ensnaring Slam', 'Weaver\'s Call'],
    fragments: ['Thread of Continuity', 'Thread of Generation', 'Thread of Mind']
  },
  prismatic: {
    keywords: ['prismatic', 'transcend', 'transcendence', 'light', 'dark', 'all'],
    exotics: {
      titan: ['Heart of Inmost Light', 'Synthoceps', 'Cuirass of the Falling Star'],
      hunter: ['Assassin\'s Cowl', 'Star-Eater Scales', 'Wormhusk Crown'],
      warlock: ['Verity\'s Brow', 'Sunbracers', 'Apotheosis Veil']
    },
    aspects: ['Consecration', 'Stylish Executioner', 'Hellion', 'Weaver\'s Call'],
    fragments: ['Facet of Grace', 'Facet of Ruin', 'Facet of Dawn']
  }
};

// Activity-specific build templates
const ACTIVITY_BUILDS = {
  raid: {
    keywords: ['raid', 'pve', 'endgame', 'boss', 'dps'],
    focus: ['high damage', 'survivability', 'utility']
  },
  gm: {
    keywords: ['gm', 'grandmaster', 'nightfall', 'champion'],
    focus: ['champion mods', 'survivability', 'team support']
  },
  pvp: {
    keywords: ['pvp', 'crucible', 'trials', 'competitive', 'iron banner'],
    focus: ['mobility', 'recovery', 'ability cooldowns']
  },
  gambit: {
    keywords: ['gambit', 'invade', 'motes'],
    focus: ['ad clear', 'burst damage', 'survivability']
  }
};

export class BuildCrafterPanel {
  constructor(containerEl) {
    this.container = containerEl;
    this.inventory = null;
    this.currentClass = null;
    this.currentBuild = null;
    this.savedBuilds = [];
    this.inputValue = '';
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
      this.showLoading();

      const profileData = await apiClient.getProfile();
      this.inventory = inventoryProcessor.processProfile(profileData);

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
    this.savedBuilds = storageManager.getLoadouts();
  }

  /**
   * Render build crafter panel
   */
  render() {
    let html = `
      <div class="build-crafter-panel">
        <div class="crafter-input-section">
          <h4>Describe Your Build</h4>
          <div class="input-wrapper">
            <input type="text"
                   class="build-input"
                   placeholder="e.g., 'solar titan build for raids' or 'void hunter with invisibility'"
                   value="${this.inputValue}">
            <button class="generate-btn">Generate Build</button>
          </div>
          <div class="quick-tags">
            <span class="quick-tag" data-tag="solar">Solar</span>
            <span class="quick-tag" data-tag="arc">Arc</span>
            <span class="quick-tag" data-tag="void">Void</span>
            <span class="quick-tag" data-tag="stasis">Stasis</span>
            <span class="quick-tag" data-tag="strand">Strand</span>
            <span class="quick-tag" data-tag="prismatic">Prismatic</span>
            <span class="quick-tag" data-tag="raid">Raid</span>
            <span class="quick-tag" data-tag="pvp">PvP</span>
            <span class="quick-tag" data-tag="gm">GM</span>
          </div>
        </div>

        ${this.currentBuild ? this.renderBuildResult() : this.renderBuildPlaceholder()}

        ${this.renderSavedBuilds()}
      </div>
    `;

    this.container.innerHTML = html;
    this.attachEventListeners();
  }

  /**
   * Render build placeholder
   */
  renderBuildPlaceholder() {
    return `
      <div class="build-placeholder">
        <p>Describe your ideal build using natural language.</p>
        <p>Examples:</p>
        <ul>
          <li>"Solar titan build for raids with sunspots"</li>
          <li>"Void hunter build with invisibility for GMs"</li>
          <li>"Arc warlock PvP build for Trials"</li>
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
          <div class="build-actions">
            <button class="save-build-btn">Save Build</button>
            <button class="share-build-btn">Share</button>
            ${build.canEquip ? '<button class="equip-build-btn">Equip</button>' : ''}
          </div>
        </div>

        <div class="build-subclass">
          <span class="subclass-element ${build.element}">${build.element}</span>
          <span class="subclass-class">${build.class}</span>
        </div>

        <div class="build-sections">
          <div class="build-section exotic">
            <h5>Recommended Exotic</h5>
            <div class="exotic-item">
              <span class="exotic-name">${build.exotic || 'Any'}</span>
              <span class="exotic-reason">${build.exoticReason || ''}</span>
            </div>
          </div>

          <div class="build-section aspects">
            <h5>Aspects</h5>
            <div class="aspect-list">
              ${build.aspects.map(a => `<span class="aspect-item">${a}</span>`).join('')}
            </div>
          </div>

          <div class="build-section fragments">
            <h5>Fragments</h5>
            <div class="fragment-list">
              ${build.fragments.map(f => `<span class="fragment-item">${f}</span>`).join('')}
            </div>
          </div>

          ${build.stats ? `
            <div class="build-section stats">
              <h5>Recommended Stats</h5>
              <div class="stats-priority">
                ${build.stats.map((s, i) => `<span class="stat-item">${i + 1}. ${s}</span>`).join('')}
              </div>
            </div>
          ` : ''}

          ${build.weapons ? `
            <div class="build-section weapons">
              <h5>Weapon Suggestions</h5>
              <div class="weapon-list">
                ${build.weapons.map(w => `<span class="weapon-item">${w}</span>`).join('')}
              </div>
            </div>
          ` : ''}

          ${build.mods ? `
            <div class="build-section mods">
              <h5>Recommended Mods</h5>
              <div class="mod-list">
                ${build.mods.map(m => `<span class="mod-item">${m}</span>`).join('')}
              </div>
            </div>
          ` : ''}

          ${build.notes ? `
            <div class="build-section notes">
              <h5>Build Notes</h5>
              <p>${build.notes}</p>
            </div>
          ` : ''}
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
                <span class="build-element ${build.element}">${build.element} ${build.class}</span>
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
  generateBuild(input) {
    const inputLower = input.toLowerCase();

    // Detect class
    let buildClass = this.currentClass || 'titan';
    if (inputLower.includes('titan')) buildClass = 'titan';
    else if (inputLower.includes('hunter')) buildClass = 'hunter';
    else if (inputLower.includes('warlock')) buildClass = 'warlock';

    // Detect element
    let element = null;
    let archetype = null;

    for (const [key, data] of Object.entries(BUILD_ARCHETYPES)) {
      for (const keyword of data.keywords) {
        if (inputLower.includes(keyword)) {
          element = key;
          archetype = data;
          break;
        }
      }
      if (element) break;
    }

    // Default to solar if no element detected
    if (!element) {
      element = 'solar';
      archetype = BUILD_ARCHETYPES.solar;
    }

    // Detect activity type
    let activity = null;
    let activityBuild = null;

    for (const [key, data] of Object.entries(ACTIVITY_BUILDS)) {
      for (const keyword of data.keywords) {
        if (inputLower.includes(keyword)) {
          activity = key;
          activityBuild = data;
          break;
        }
      }
      if (activity) break;
    }

    // Build the recommendation
    const exotics = archetype.exotics[buildClass] || [];
    const exotic = exotics[0] || 'Any Exotic';

    const build = {
      name: this.generateBuildName(element, buildClass, activity),
      class: buildClass.charAt(0).toUpperCase() + buildClass.slice(1),
      element: element.charAt(0).toUpperCase() + element.slice(1),
      exotic: exotic,
      exoticReason: this.getExoticReason(exotic, element),
      aspects: archetype.aspects.slice(0, 2),
      fragments: archetype.fragments.slice(0, 4),
      stats: this.getStatPriority(activity),
      weapons: this.getWeaponSuggestions(element, activity),
      mods: this.getModSuggestions(element, activity),
      notes: this.generateBuildNotes(element, buildClass, activity),
      canEquip: !!this.inventory
    };

    this.currentBuild = build;
    this.render();
  }

  /**
   * Generate build name
   */
  generateBuildName(element, buildClass, activity) {
    const activityName = activity ? ` (${activity.toUpperCase()})` : '';
    return `${element.charAt(0).toUpperCase() + element.slice(1)} ${buildClass.charAt(0).toUpperCase() + buildClass.slice(1)}${activityName}`;
  }

  /**
   * Get exotic reason
   */
  getExoticReason(exotic, element) {
    const reasons = {
      'Loreley Splendor Helm': 'Automatic Sunspots for healing',
      'Cuirass of the Falling Star': 'Massive Thundercrash damage',
      'Helm of Saint-14': 'Blinding bubble and overshield',
      'Celestial Nighthawk': 'One-shot Golden Gun for boss DPS',
      'Orpheus Rig': 'Super energy on tethered enemies',
      'Star-Eater Scales': 'Enhanced super damage',
      'Dawn Chorus': 'Increased Daybreak damage',
      'Contraverse Hold': 'Grenade energy on hits',
      'Crown of Tempests': 'Faster ability regen'
    };

    return reasons[exotic] || `Synergizes well with ${element} builds`;
  }

  /**
   * Get stat priority based on activity
   */
  getStatPriority(activity) {
    if (activity === 'pvp') {
      return ['Recovery', 'Resilience', 'Mobility'];
    }
    if (activity === 'gm') {
      return ['Resilience', 'Recovery', 'Discipline'];
    }
    return ['Resilience', 'Discipline', 'Recovery'];
  }

  /**
   * Get weapon suggestions
   */
  getWeaponSuggestions(element, activity) {
    const elementWeapons = {
      solar: ['Sunshot', 'Prometheus Lens', 'Skyburner\'s Oath'],
      arc: ['Riskrunner', 'Trinity Ghoul', 'Thunderlord'],
      void: ['Graviton Lance', 'Le Monarque', 'Collective Obligation'],
      stasis: ['Ager\'s Scepter', 'Verglas Curve', 'Conditional Finality'],
      strand: ['Quicksilver Storm', 'Osteo Striga', 'Bad Juju'],
      prismatic: ['The Final Shape exotics', 'Ergo Sum', 'Still Hunt']
    };

    return elementWeapons[element] || ['Any legendary weapons'];
  }

  /**
   * Get mod suggestions
   */
  getModSuggestions(element, activity) {
    const elementMods = {
      solar: ['Font of Might', 'Radiant Light', 'Heal Thyself'],
      arc: ['Font of Might', 'Spark of Focus', 'Bolstering Detonation'],
      void: ['Font of Might', 'Reaping Wellmaker', 'Devour'],
      stasis: ['Font of Might', 'Elemental Shards', 'Whisper of Chains'],
      strand: ['Font of Might', 'Thread of Warding', 'Threadling grenades'],
      prismatic: ['Facet of Dawn', 'Facet of Hope', 'Super regen mods']
    };

    const activityMods = [];
    if (activity === 'gm') {
      activityMods.push('Champion mods', 'Resist mods');
    }

    return [...(elementMods[element] || []), ...activityMods];
  }

  /**
   * Generate build notes
   */
  generateBuildNotes(element, buildClass, activity) {
    let notes = `This ${element} ${buildClass} build focuses on `;

    if (activity === 'raid') {
      notes += 'high damage output and survivability for raid encounters.';
    } else if (activity === 'gm') {
      notes += 'staying alive and supporting your team in Grandmaster content.';
    } else if (activity === 'pvp') {
      notes += 'quick ability regeneration and movement in Crucible.';
    } else {
      notes += 'general gameplay with good ability uptime.';
    }

    return notes;
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
      x: this.currentBuild.exotic,
      a: this.currentBuild.aspects,
      f: this.currentBuild.fragments
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
          this.inputValue = value;
          this.generateBuild(value);
        }
      });

      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          const value = input.value.trim();
          if (value) {
            this.inputValue = value;
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

          if (currentValue.includes(tagValue)) {
            input.value = currentValue.replace(tagValue, '').trim();
          } else {
            input.value = currentValue ? `${currentValue} ${tagValue}` : tagValue;
          }

          tag.classList.toggle('active');
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
  showLoading() {
    this.container.innerHTML = `
      <div class="panel-loading">
        <div class="loading-spinner"></div>
        <span>Loading build crafter...</span>
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
