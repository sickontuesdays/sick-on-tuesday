/**
 * Panel Manager - Manages all dashboard panels and their data loading
 */

import { apiClient } from '../api/bungie-api-client.js';
import { manifestLoader } from '../api/manifest-loader.js';
import { inventoryProcessor } from '../utils/inventory-processor.js';
import { authClient } from '../core/auth-client.js';

// Import panel components
import { InventoryPanel } from './inventory-panel.js';
import { VendorsPanel } from './vendors-panel.js';
import { ActivitiesPanel } from './activities-panel.js';
import { RecentActivitiesPanel } from './recent-activities-panel.js';
import { StatsPanel } from './stats-panel.js';
import { ClanPanel } from './clan-panel.js';
import { NewsPanel } from './news-panel.js';
import { RotatorsPanel } from './rotators-panel.js';
import { SeasonPanel } from './season-panel.js';
import { BuildCrafterPanel } from './build-crafter-panel.js';

export class PanelManager {
  constructor() {
    this.panels = new Map();
    this.panelInstances = new Map();
    this.refreshIntervals = new Map();
    this.authClient = authClient;
    this.profileData = null;
    this.characterId = null;
  }

  /**
   * Initialize all panels
   */
  async init() {
    // Initialize panel instances
    this.initializePanelInstances();

    // Load panels that don't require authentication immediately
    await this.loadPublicPanels();

    // Listen for auth changes
    this.authClient.onAuthChange(({ isAuthenticated }) => {
      if (isAuthenticated) {
        this.loadAllPanels();
      } else {
        this.clearAuthPanels();
        // Reload public panels to show non-auth view
        this.loadPublicPanels();
      }
    });

    // Initial load if authenticated
    if (this.authClient.checkAuthenticated()) {
      await this.loadAllPanels();
    }

    // Start refresh intervals
    this.startRefreshIntervals();
  }

  /**
   * Load panels that don't require authentication
   */
  async loadPublicPanels() {
    const publicPanelIds = ['rotators-panel', 'news-panel', 'season-panel'];

    const loadPromises = publicPanelIds.map(id => {
      const instance = this.panelInstances.get(id);
      if (instance && typeof instance.load === 'function') {
        return instance.load().catch(err => {
          console.warn(`Failed to load public panel ${id}:`, err);
        });
      }
      return Promise.resolve();
    });

    await Promise.all(loadPromises);
  }

  /**
   * Initialize panel component instances
   */
  initializePanelInstances() {
    const panelConfig = [
      { id: 'inventory-panel', Class: InventoryPanel },
      { id: 'vendors-panel', Class: VendorsPanel },
      { id: 'activities-panel', Class: ActivitiesPanel },
      { id: 'stats-panel', Class: StatsPanel },
      { id: 'clan-panel', Class: ClanPanel },
      { id: 'news-panel', Class: NewsPanel },
      { id: 'rotators-panel', Class: RotatorsPanel },
      { id: 'season-panel', Class: SeasonPanel },
      { id: 'build-crafter-panel', Class: BuildCrafterPanel }
    ];

    panelConfig.forEach(({ id, Class }) => {
      const containerEl = document.getElementById(id);
      if (containerEl) {
        try {
          const instance = new Class(containerEl);
          instance.init();
          this.panelInstances.set(id, instance);
        } catch (error) {
          console.warn(`Failed to initialize panel ${id}:`, error);
        }
      }
    });
  }

  /**
   * Load all panel data
   */
  async loadAllPanels() {
    try {
      // Load profile first to get character ID
      await this.loadProfile();

      // Load all panel instances
      const loadPromises = [];

      this.panelInstances.forEach((instance, id) => {
        if (instance && typeof instance.load === 'function') {
          loadPromises.push(
            instance.load().catch(err => {
              console.warn(`Failed to load panel ${id}:`, err);
            })
          );
        }
      });

      await Promise.all(loadPromises);

      // Note: Legacy loaders for season/milestones/news are no longer called
      // The panel class instances (SeasonPanel, RotatorsPanel, NewsPanel) handle rendering
      // This prevents overwriting the detailed data with simpler views

      if (this.profileData && this.characterId) {
        await Promise.all([
          this.loadInventoryPanel(),
          this.loadVendorsPanel(),
          this.loadStatsPanel(),
          this.loadClanPanel()
          // Activities panel is handled by ActivitiesPanel class instance
        ]);
      }

    } catch (error) {
      console.error('Failed to load panels:', error);
    }
  }

  /**
   * Load a specific panel by ID
   */
  loadPanel(panelId) {
    const instance = this.panelInstances.get(panelId);
    if (instance && typeof instance.load === 'function') {
      return instance.load();
    }
    return Promise.resolve();
  }

  /**
   * Get a panel instance by ID
   */
  getPanel(panelId) {
    return this.panelInstances.get(panelId);
  }

  /**
   * Load profile data
   */
  async loadProfile() {
    try {
      this.profileData = await apiClient.getProfile();

      // Get first character ID
      if (this.profileData?.profileData?.characters?.data) {
        const characters = Object.keys(this.profileData.profileData.characters.data);
        this.characterId = characters[0];
      }

      return this.profileData;
    } catch (error) {
      console.error('Failed to load profile:', error);
      this.showPanelError('profile', error.message);
      return null;
    }
  }

  // ==================== PANEL LOADERS ====================

  /**
   * Load Season Overview panel
   */
  async loadSeasonPanel() {
    const panelEl = document.getElementById('season-panel');
    if (!panelEl) return;

    try {
      this.showPanelLoading('season-panel');

      if (!this.profileData?.profileData) {
        this.showPanelAuth('season-panel');
        return;
      }

      const profile = this.profileData.profileData.profile?.data;
      const progressions = this.profileData.profileData.characterProgressions?.data;

      let html = '<div class="season-content">';

      // Current season info
      if (profile?.currentSeasonHash) {
        html += `
          <div class="season-header">
            <h4>Current Season</h4>
            <div class="power-cap">Power Cap: ${profile.currentSeasonRewardPowerCap || 'Unknown'}</div>
          </div>
        `;
      }

      // Artifact power
      if (profile?.seasonHashes?.length > 0) {
        html += `
          <div class="season-stat">
            <span class="label">Active Seasons:</span>
            <span class="value">${profile.seasonHashes.length}</span>
          </div>
        `;
      }

      // Character light levels
      if (this.profileData.profileData.characters?.data) {
        html += '<div class="characters-light">';
        for (const [charId, char] of Object.entries(this.profileData.profileData.characters.data)) {
          const className = ['Titan', 'Hunter', 'Warlock'][char.classType] || 'Unknown';
          html += `
            <div class="char-light">
              <span class="class-icon">${this.getClassIcon(char.classType)}</span>
              <span class="class-name">${className}</span>
              <span class="light-level">${char.light}</span>
            </div>
          `;
        }
        html += '</div>';
      }

      html += '</div>';

      panelEl.innerHTML = html;
      this.panels.set('season-panel', { loaded: true });

    } catch (error) {
      console.error('Season panel error:', error);
      this.showPanelError('season-panel', error.message);
    }
  }

  /**
   * Load Milestones/Rotators panel
   */
  async loadMilestonesPanel() {
    const panelEl = document.getElementById('rotators-panel');
    if (!panelEl) return;

    try {
      this.showPanelLoading('rotators-panel');

      const milestonesData = await apiClient.getMilestones();
      const milestones = milestonesData.milestones || {};

      let html = '<div class="rotators-content">';

      // Parse known milestone hashes for weekly activities
      const knownMilestones = {
        2029743966: { name: 'Nightfall', type: 'Strike' },
        3603098564: { name: 'Raid', type: 'Raid' },
        2712317338: { name: 'Dungeon', type: 'Dungeon' },
        3312774044: { name: 'Crucible', type: 'PvP' },
        1437935813: { name: 'Weekly Vanguard', type: 'Strike' },
        3448738070: { name: 'Weekly Gambit', type: 'Gambit' }
      };

      let foundAny = false;

      for (const [hash, data] of Object.entries(milestones)) {
        const known = knownMilestones[hash];
        if (known && data.activities?.length > 0) {
          foundAny = true;
          html += `
            <div class="rotator-item">
              <div class="rotator-type">${known.type}</div>
              <div class="rotator-name">${known.name}</div>
              <div class="rotator-activities">${data.activities.length} active</div>
            </div>
          `;
        }
      }

      if (!foundAny) {
        html += '<div class="no-data">Weekly activities data loading...</div>';
      }

      html += '</div>';
      panelEl.innerHTML = html;
      this.panels.set('rotators-panel', { loaded: true });

    } catch (error) {
      console.error('Milestones panel error:', error);
      this.showPanelError('rotators-panel', error.message);
    }
  }

  /**
   * Load Vendors panel - uses VendorsPanel class
   */
  async loadVendorsPanel() {
    const panelEl = document.getElementById('vendors-panel');
    if (!panelEl) return;

    if (!this.characterId) {
      this.showPanelAuth('vendors-panel');
      return;
    }

    try {
      // Use VendorsPanel class for full vendor functionality
      if (!this.vendorsPanel) {
        this.vendorsPanel = new VendorsPanel(panelEl);
        await this.vendorsPanel.init();
      }

      // Load the vendors data
      await this.vendorsPanel.load();
      this.panels.set('vendors-panel', { loaded: true });

    } catch (error) {
      console.error('Vendors panel error:', error);
      this.showPanelError('vendors-panel', error.message);
    }
  }

  /**
   * Load Inventory panel
   */
  async loadInventoryPanel() {
    const panelEl = document.getElementById('inventory-panel');
    if (!panelEl) return;

    if (!this.profileData) {
      this.showPanelAuth('inventory-panel');
      return;
    }

    try {
      this.showPanelLoading('inventory-panel');

      // Process inventory with DIM-style categorization
      const processed = inventoryProcessor.processProfile(this.profileData);

      let html = '<div class="inventory-content">';

      // Character tabs
      html += '<div class="character-tabs">';
      for (const [charId, char] of Object.entries(processed.characters)) {
        const isActive = charId === this.characterId ? 'active' : '';
        html += `
          <button class="char-tab ${isActive}" data-char-id="${charId}">
            ${this.getClassIcon(char.classType)}
            <span class="char-light">${char.light}</span>
          </button>
        `;
      }
      html += '<button class="char-tab" data-char-id="vault">🔒 Vault</button>';
      html += '</div>';

      // Character content
      html += '<div class="character-content">';

      // Active character equipment
      const activeChar = processed.characters[this.characterId];
      const equipped = processed.equipped[this.characterId];

      if (equipped) {
        html += '<div class="equipped-section">';
        html += '<h5>Equipped</h5>';
        html += '<div class="equipped-grid">';

        // Weapons
        ['kinetic', 'energy', 'power'].forEach(slot => {
          const weapon = equipped.weapons[slot];
          if (weapon) {
            html += this.renderItemCard(weapon, 'weapon');
          }
        });

        // Armor
        ['helmet', 'gauntlets', 'chest', 'legs', 'class'].forEach(slot => {
          const armor = equipped.armor[slot];
          if (armor) {
            html += this.renderItemCard(armor, 'armor');
          }
        });

        html += '</div></div>';
      }

      // Vault summary
      html += `
        <div class="vault-summary">
          <h5>Vault (${processed.vault.items.length} items)</h5>
          <div class="vault-stats">
            <span>Weapons: ${processed.summary.weaponCount}</span>
            <span>Armor: ${processed.summary.armorCount}</span>
            <span>Mods: ${processed.summary.modCount}</span>
          </div>
        </div>
      `;

      html += '</div></div>';
      panelEl.innerHTML = html;
      this.panels.set('inventory-panel', { loaded: true, data: processed });

      // Add tab switching
      this.setupInventoryTabs(panelEl, processed);

    } catch (error) {
      console.error('Inventory panel error:', error);
      this.showPanelError('inventory-panel', error.message);
    }
  }

  /**
   * Load Stats/Telemetry panel
   */
  async loadStatsPanel() {
    const panelEl = document.getElementById('stats-panel');
    if (!panelEl) return;

    if (!this.characterId) {
      this.showPanelAuth('stats-panel');
      return;
    }

    try {
      this.showPanelLoading('stats-panel');

      const statsData = await apiClient.getStats(null, 'account');

      let html = '<div class="stats-content">';

      const allStats = statsData.stats?.mergedAllCharacters?.results || {};

      // PvE stats
      if (allStats.allPvE?.allTime) {
        const pve = allStats.allPvE.allTime;
        html += `
          <div class="stats-section">
            <h5>PvE Stats</h5>
            <div class="stat-grid">
              <div class="stat-item">
                <span class="stat-label">Kills</span>
                <span class="stat-value">${this.formatNumber(pve.kills?.basic?.value)}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Deaths</span>
                <span class="stat-value">${this.formatNumber(pve.deaths?.basic?.value)}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">K/D</span>
                <span class="stat-value">${pve.killsDeathsRatio?.basic?.displayValue || 'N/A'}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Activities</span>
                <span class="stat-value">${this.formatNumber(pve.activitiesCleared?.basic?.value)}</span>
              </div>
            </div>
          </div>
        `;
      }

      // PvP stats
      if (allStats.allPvP?.allTime) {
        const pvp = allStats.allPvP.allTime;
        html += `
          <div class="stats-section">
            <h5>PvP Stats</h5>
            <div class="stat-grid">
              <div class="stat-item">
                <span class="stat-label">Kills</span>
                <span class="stat-value">${this.formatNumber(pvp.kills?.basic?.value)}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">K/D</span>
                <span class="stat-value">${pvp.killsDeathsRatio?.basic?.displayValue || 'N/A'}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Wins</span>
                <span class="stat-value">${this.formatNumber(pvp.activitiesWon?.basic?.value)}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Win %</span>
                <span class="stat-value">${pvp.winLossRatio?.basic?.displayValue || 'N/A'}</span>
              </div>
            </div>
          </div>
        `;
      }

      html += '</div>';
      panelEl.innerHTML = html;
      this.panels.set('stats-panel', { loaded: true });

    } catch (error) {
      console.error('Stats panel error:', error);
      this.showPanelError('stats-panel', error.message);
    }
  }

  /**
   * Load Clan panel
   */
  async loadClanPanel() {
    const panelEl = document.getElementById('clan-panel');
    if (!panelEl) return;

    try {
      this.showPanelLoading('clan-panel');

      const clanData = await apiClient.getClan('members');

      let html = '<div class="clan-content">';

      if (!clanData.hasClan) {
        html += '<div class="no-clan">Not in a clan</div>';
      } else {
        const clan = clanData.clan;
        html += `
          <div class="clan-header">
            <h4>${clan.name}</h4>
            <span class="clan-tag">[${clan.clanCallsign || '???'}]</span>
          </div>
          <div class="clan-motto">${clan.motto || ''}</div>
          <div class="clan-stats">
            <span>Members: ${clan.memberCount}</span>
          </div>
        `;

        // Online members
        if (clanData.members?.results) {
          const onlineMembers = clanData.members.results.filter(m => m.isOnline);
          html += `
            <div class="online-members">
              <h5>Online (${onlineMembers.length})</h5>
              <div class="member-list">
          `;

          onlineMembers.slice(0, 10).forEach(member => {
            const name = member.destinyUserInfo?.bungieGlobalDisplayName ||
                         member.destinyUserInfo?.displayName ||
                         'Unknown';
            html += `<div class="member-item online">${name}</div>`;
          });

          if (onlineMembers.length > 10) {
            html += `<div class="member-more">+${onlineMembers.length - 10} more</div>`;
          }

          html += '</div></div>';
        }
      }

      html += '</div>';
      panelEl.innerHTML = html;
      this.panels.set('clan-panel', { loaded: true });

    } catch (error) {
      console.error('Clan panel error:', error);
      this.showPanelError('clan-panel', error.message);
    }
  }

  /**
   * Load News panel
   */
  async loadNewsPanel() {
    const panelEl = document.getElementById('news-panel');
    if (!panelEl) return;

    try {
      this.showPanelLoading('news-panel');

      const newsData = await apiClient.getNews();

      let html = '<div class="news-content">';

      if (newsData.articles?.length > 0) {
        newsData.articles.slice(0, 5).forEach(article => {
          const date = new Date(article.pubDate).toLocaleDateString();
          // Ensure links are absolute URLs to bungie.net
          let link = article.link || article.Link || '#';
          if (link && link !== '#' && !link.startsWith('http')) {
            link = `https://www.bungie.net${link.startsWith('/') ? '' : '/'}${link}`;
          }
          html += `
            <div class="news-item">
              <a href="${link}" target="_blank" rel="noopener">
                <div class="news-title">${article.title || article.Title || 'Untitled'}</div>
                <div class="news-date">${date}</div>
              </a>
            </div>
          `;
        });
      } else {
        html += '<div class="no-data">No news available</div>';
      }

      html += '</div>';
      panelEl.innerHTML = html;
      this.panels.set('news-panel', { loaded: true });

    } catch (error) {
      console.error('News panel error:', error);
      this.showPanelError('news-panel', error.message);
    }
  }

  /**
   * Load Activities panel
   */
  async loadActivitiesPanel() {
    const panelEl = document.getElementById('activities-panel');
    if (!panelEl) return;

    if (!this.characterId) {
      this.showPanelAuth('activities-panel');
      return;
    }

    try {
      this.showPanelLoading('activities-panel');

      const activitiesData = await apiClient.getActivities(this.characterId, 0, 10);

      let html = '<div class="activities-content">';

      if (activitiesData.activities?.activities?.length > 0) {
        html += '<h5>Recent Activities</h5><div class="activity-list">';

        activitiesData.activities.activities.slice(0, 5).forEach(activity => {
          const date = new Date(activity.period).toLocaleDateString();
          const values = activity.values;
          const kills = values?.kills?.basic?.value || 0;
          const deaths = values?.deaths?.basic?.value || 0;

          html += `
            <div class="activity-item">
              <div class="activity-mode">Activity</div>
              <div class="activity-stats">${kills} K / ${deaths} D</div>
              <div class="activity-date">${date}</div>
            </div>
          `;
        });

        html += '</div>';
      } else {
        html += '<div class="no-data">No recent activities</div>';
      }

      html += '</div>';
      panelEl.innerHTML = html;
      this.panels.set('activities-panel', { loaded: true });

    } catch (error) {
      console.error('Activities panel error:', error);
      this.showPanelError('activities-panel', error.message);
    }
  }

  // ==================== HELPERS ====================

  /**
   * Render item card
   */
  renderItemCard(item, type) {
    const tierClass = item.tierTypeName?.toLowerCase() || 'common';
    const damageColor = item.damageType ? inventoryProcessor.getDamageTypeColor(item.damageType) : '#ffffff';

    return `
      <div class="item-card ${tierClass} ${type}" data-hash="${item.itemHash}">
        ${item.icon ? `<img src="${item.icon}" alt="${item.name}" class="item-icon">` : ''}
        <div class="item-info">
          <div class="item-name">${item.name}</div>
          ${item.primaryStat ? `<div class="item-power" style="color: ${damageColor}">${item.primaryStat.value}</div>` : ''}
        </div>
        ${item.isExotic ? '<div class="exotic-badge">★</div>' : ''}
      </div>
    `;
  }

  /**
   * Setup inventory tab switching
   */
  setupInventoryTabs(panelEl, processed) {
    const tabs = panelEl.querySelectorAll('.char-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const charId = tab.dataset.charId;
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        // TODO: Switch displayed content
      });
    });
  }

  /**
   * Get class icon
   */
  getClassIcon(classType) {
    const icons = ['⚔️', '🏹', '✨']; // Titan, Hunter, Warlock
    return icons[classType] || '❓';
  }

  /**
   * Format large numbers
   */
  formatNumber(num) {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }

  /**
   * Show loading state
   */
  showPanelLoading(panelId) {
    const panel = document.getElementById(panelId);
    if (panel) {
      panel.innerHTML = `
        <div class="panel-loading">
          <div class="loading-spinner"></div>
          <span>Loading...</span>
        </div>
      `;
    }
  }

  /**
   * Show auth required state
   */
  showPanelAuth(panelId) {
    const panel = document.getElementById(panelId);
    if (panel) {
      panel.innerHTML = `
        <div class="panel-auth">
          <span>Sign in to view</span>
        </div>
      `;
    }
  }

  /**
   * Show error state
   */
  showPanelError(panelId, message) {
    const panel = document.getElementById(panelId);
    if (panel) {
      panel.innerHTML = `
        <div class="panel-error">
          <span>Error: ${message}</span>
          <button onclick="window.panelManager?.loadAllPanels()">Retry</button>
        </div>
      `;
    }
  }

  /**
   * Clear all panels
   */
  clearAllPanels() {
    this.panels.forEach((_, panelId) => {
      this.showPanelAuth(panelId);
    });
    this.profileData = null;
    this.characterId = null;
  }

  /**
   * Clear only auth-required panels (not public ones)
   */
  clearAuthPanels() {
    const publicPanelIds = ['rotators-panel', 'news-panel', 'season-panel'];
    const authPanelIds = ['inventory-panel', 'vendors-panel', 'stats-panel', 'clan-panel', 'activities-panel', 'build-crafter-panel'];

    authPanelIds.forEach(panelId => {
      this.showPanelAuth(panelId);
    });

    this.profileData = null;
    this.characterId = null;
  }

  /**
   * Start refresh intervals
   */
  startRefreshIntervals() {
    // Refresh profile every 5 minutes
    this.refreshIntervals.set('profile', setInterval(() => {
      if (this.authClient.checkAuthenticated()) {
        this.loadProfile().then(() => this.loadInventoryPanel());
      }
    }, 5 * 60 * 1000));

    // Refresh friends every minute
    this.refreshIntervals.set('friends', setInterval(() => {
      if (this.authClient.checkAuthenticated()) {
        this.loadFriendsPanel();
      }
    }, 60 * 1000));
  }

  /**
   * Stop refresh intervals
   */
  stopRefreshIntervals() {
    this.refreshIntervals.forEach(interval => clearInterval(interval));
    this.refreshIntervals.clear();
  }

  /**
   * Cleanup
   */
  destroy() {
    this.stopRefreshIntervals();
    this.panels.clear();
  }
}

export const panelManager = new PanelManager();
export default PanelManager;
