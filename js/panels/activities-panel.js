/**
 * Activities Panel - Current activities, raids, dungeons, weekly content, and recent history
 */

import { apiClient } from '../api/bungie-api-client.js';
import { manifestLoader } from '../api/manifest-loader.js';
import { storageManager } from '../core/storage-manager.js';

export class ActivitiesPanel {
  constructor(containerEl) {
    this.container = containerEl;
    this.activities = null;
    this.milestones = null;
    this.recentActivities = [];
    this.characterId = null;
    this.currentTab = 'recent'; // Default to recent activities
    this.viewMode = 'list'; // 'list' or 'detail' for recent activities
    this.selectedActivity = null;

    // Restore saved state
    this.restoreState();
  }

  /**
   * Initialize activities panel
   */
  async init() {
    this.render();
  }

  /**
   * Restore saved state from storage
   */
  restoreState() {
    const savedState = storageManager.loadPanelState('activities', {
      currentTab: 'recent',
      viewMode: 'list'
    });
    this.currentTab = savedState.currentTab || 'recent';
    // Always start in list mode (don't restore detail view)
    this.viewMode = 'list';
    this.selectedActivity = null;
  }

  /**
   * Save current state to storage
   */
  saveState() {
    storageManager.savePanelState('activities', {
      currentTab: this.currentTab,
      viewMode: 'list' // Always save as list mode
    });
  }

  /**
   * Load activities data
   */
  async load() {
    try {
      this.showLoading();

      // Get profile to find character ID
      let profile = null;
      try {
        profile = await apiClient.getProfile();
        const charIds = Object.keys(profile?.profileData?.characters?.data || {});
        this.characterId = charIds[0] || null;
      } catch (e) {
        // Not authenticated - continue without activities
      }

      // Load milestones (public, no auth needed) and recent activities (needs characterId)
      const [milestones, activitiesData] = await Promise.all([
        apiClient.getMilestones().catch(() => null),
        this.characterId
          ? apiClient.getActivities(this.characterId, 0, 25).catch(() => null)
          : Promise.resolve(null)
      ]);

      this.milestones = milestones?.milestones || milestones;
      this.activities = activitiesData;

      // Process recent activities with proper names
      if (activitiesData?.activities?.activities) {
        this.recentActivities = await this.processRecentActivities(activitiesData.activities.activities);
      }

      this.render();
    } catch (error) {
      console.error('Activities load error:', error);
      this.showError(error.message);
    }
  }

  /**
   * Process recent activities and get their names from manifest
   */
  async processRecentActivities(rawActivities) {
    const processed = [];

    for (const activity of rawActivities.slice(0, 15)) {
      const details = activity.activityDetails || {};
      const values = activity.values || {};

      // Get activity name from mode definition
      let activityName = manifestLoader.getActivityModeName(details.mode);
      let activityDesc = '';

      // Try to get more specific name from activity definition
      if (details.directorActivityHash) {
        try {
          const def = await manifestLoader.getActivityDefinition(details.directorActivityHash);
          if (def?.displayProperties?.name) {
            activityName = def.displayProperties.name;
            activityDesc = def.displayProperties.description || '';
          }
        } catch (e) {
          // Use mode name as fallback
        }
      }

      processed.push({
        instanceId: details.instanceId,
        activityHash: details.directorActivityHash,
        mode: details.mode,
        modeName: manifestLoader.getActivityModeName(details.mode),
        name: activityName,
        description: activityDesc,
        date: new Date(activity.period),
        completed: values.completed?.basic?.value === 1,
        standing: values.standing?.basic?.value,
        kills: values.kills?.basic?.value || 0,
        deaths: values.deaths?.basic?.value || 0,
        assists: values.assists?.basic?.value || 0,
        kd: values.killsDeathsRatio?.basic?.value || 0,
        score: values.score?.basic?.value || 0,
        duration: values.activityDurationSeconds?.basic?.value || 0,
        playerCount: values.playerCount?.basic?.value || 0
      });
    }

    return processed;
  }

  /**
   * Render activities panel
   */
  render() {
    // If in detail view for recent activity, render detail instead
    if (this.currentTab === 'recent' && this.viewMode === 'detail' && this.selectedActivity) {
      this.container.innerHTML = this.renderActivityDetail();
      this.attachEventListeners();
      // Show navigation buttons in title bar
      if (window.panelNav) {
        window.panelNav.show('activities', {
          back: () => this.goBack(),
          home: () => this.goHome()
        });
      }
      return;
    }

    // Hide navigation buttons when in list view
    if (window.panelNav) {
      window.panelNav.hide('activities');
    }

    let html = `
      <div class="activities-panel">
        <div class="activities-tabs">
          <button class="tab-btn ${this.currentTab === 'recent' ? 'active' : ''}" data-tab="recent">Recent</button>
          <button class="tab-btn ${this.currentTab === 'weekly' ? 'active' : ''}" data-tab="weekly">Weekly</button>
          <button class="tab-btn ${this.currentTab === 'raids' ? 'active' : ''}" data-tab="raids">Raids</button>
          <button class="tab-btn ${this.currentTab === 'dungeons' ? 'active' : ''}" data-tab="dungeons">Dungeons</button>
          <button class="tab-btn ${this.currentTab === 'pvp' ? 'active' : ''}" data-tab="pvp">PvP</button>
        </div>
        <div class="activities-content">
          ${this.renderContent()}
        </div>
      </div>
    `;

    this.container.innerHTML = html;
    this.attachEventListeners();
  }

  /**
   * Navigate back to list view
   */
  goBack() {
    this.viewMode = 'list';
    this.selectedActivity = null;
    this.render();
  }

  /**
   * Navigate to home (Recent tab list view)
   */
  goHome() {
    this.currentTab = 'recent';
    this.viewMode = 'list';
    this.selectedActivity = null;
    this.render();
  }

  /**
   * Render content based on current tab
   */
  renderContent() {
    switch (this.currentTab) {
      case 'recent':
        return this.renderRecentActivities();
      case 'weekly':
        return this.renderWeeklyContent();
      case 'raids':
        return this.renderRaidsContent();
      case 'dungeons':
        return this.renderDungeonsContent();
      case 'pvp':
        return this.renderPvPContent();
      default:
        return this.renderRecentActivities();
    }
  }

  /**
   * Render recent activities list
   */
  renderRecentActivities() {
    if (!this.characterId) {
      return '<div class="no-data">Sign in to view your recent activities</div>';
    }

    if (!this.recentActivities || this.recentActivities.length === 0) {
      return '<div class="no-data">No recent activities found</div>';
    }

    let html = '<div class="recent-activities-list">';

    this.recentActivities.forEach((activity, index) => {
      const date = activity.date.toLocaleDateString();
      const time = activity.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const kd = activity.kd.toFixed(2);
      const modeIcon = this.getModeIcon(activity.mode);

      // Determine outcome
      let outcomeClass = '';
      let outcomeText = '';
      if (activity.standing !== undefined) {
        outcomeClass = activity.standing === 0 ? 'victory' : 'defeat';
        outcomeText = activity.standing === 0 ? 'Victory' : 'Defeat';
      } else if (activity.completed) {
        outcomeClass = 'completed';
        outcomeText = 'Completed';
      }

      html += `
        <div class="activity-item clickable" data-index="${index}">
          <div class="activity-icon">${modeIcon}</div>
          <div class="activity-main">
            <div class="activity-name">${activity.name}</div>
            <div class="activity-mode">${activity.modeName}</div>
          </div>
          <div class="activity-stats">
            <span class="stat-kd">${kd} K/D</span>
            <span class="stat-kills">${activity.kills}/${activity.deaths}/${activity.assists}</span>
          </div>
          <div class="activity-meta">
            ${outcomeText ? `<span class="activity-outcome ${outcomeClass}">${outcomeText}</span>` : ''}
            <span class="activity-date">${date}</span>
            <span class="activity-time">${time}</span>
          </div>
          <div class="activity-arrow">></div>
        </div>
      `;
    });

    html += '</div>';
    return html;
  }

  /**
   * Render activity detail view
   */
  renderActivityDetail() {
    const activity = this.selectedActivity;
    if (!activity) return '';

    const date = activity.date.toLocaleDateString();
    const time = activity.date.toLocaleTimeString();
    const duration = this.formatDuration(activity.duration);
    const kd = activity.kd.toFixed(2);
    const modeIcon = this.getModeIcon(activity.mode);

    let outcomeClass = '';
    let outcomeText = '';
    if (activity.standing !== undefined) {
      outcomeClass = activity.standing === 0 ? 'victory' : 'defeat';
      outcomeText = activity.standing === 0 ? 'Victory' : 'Defeat';
    } else if (activity.completed) {
      outcomeClass = 'completed';
      outcomeText = 'Completed';
    }

    return `
      <div class="activity-detail">
        <div class="detail-header">
          <button class="back-btn" data-action="back">< Back</button>
          <h3>${activity.name}</h3>
        </div>

        <div class="detail-content">
          <div class="detail-hero">
            <div class="hero-icon">${modeIcon}</div>
            <div class="hero-info">
              <div class="hero-mode">${activity.modeName}</div>
              ${outcomeText ? `<div class="hero-outcome ${outcomeClass}">${outcomeText}</div>` : ''}
            </div>
          </div>

          <div class="detail-stats-grid">
            <div class="stat-card">
              <div class="stat-label">Kills</div>
              <div class="stat-value">${activity.kills}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Deaths</div>
              <div class="stat-value">${activity.deaths}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Assists</div>
              <div class="stat-value">${activity.assists}</div>
            </div>
            <div class="stat-card highlight">
              <div class="stat-label">K/D Ratio</div>
              <div class="stat-value">${kd}</div>
            </div>
          </div>

          <div class="detail-info-grid">
            <div class="info-row">
              <span class="info-label">Score</span>
              <span class="info-value">${activity.score.toLocaleString()}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Duration</span>
              <span class="info-value">${duration}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Players</span>
              <span class="info-value">${activity.playerCount}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Date</span>
              <span class="info-value">${date} ${time}</span>
            </div>
          </div>

          ${activity.description ? `
            <div class="detail-description">
              <p>${activity.description}</p>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Get mode icon
   */
  getModeIcon(mode) {
    const icons = {
      3: '🎯', // Strike
      4: '👑', // Raid
      5: '⚔️', // PvP
      10: '🏴', // Control
      12: '💥', // Clash
      16: '🌙', // Nightfall
      19: '🔥', // Iron Banner
      37: '🏆', // Survival
      48: '🎲', // Rumble
      63: '🎯', // Gambit
      74: '💀', // Elimination
      76: '🏛️', // Dungeon
      78: '☀️', // Trials
      84: '☀️'  // Trials
    };
    return icons[mode] || '📋';
  }

  /**
   * Format duration in seconds
   */
  formatDuration(seconds) {
    if (!seconds) return '0m';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) return `${hours}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  }

  /**
   * Render weekly milestones
   */
  renderWeeklyContent() {
    if (!this.milestones || Object.keys(this.milestones).length === 0) {
      // Show static weekly content when no milestone data available
      return this.renderStaticWeeklyContent();
    }

    let html = '<div class="weekly-activities">';
    let hasContent = false;

    for (const [hash, milestone] of Object.entries(this.milestones)) {
      // Milestones from API include displayProperties directly in the milestone data
      // or we can display basic info from the milestone object itself
      const displayProps = milestone?.displayProperties || {};
      const name = displayProps.name || milestone?.milestoneName || `Milestone ${hash}`;
      const desc = displayProps.description || milestone?.milestoneDescription || '';
      const icon = displayProps.icon
        ? `https://www.bungie.net${displayProps.icon}`
        : null;

      // Skip if no name
      if (!name || name === `Milestone ${hash}`) continue;

      hasContent = true;
      html += `
        <div class="activity-card">
          <div class="activity-icon">
            ${icon ? `<img src="${icon}" alt="${name}">` : '<div class="icon-placeholder">📋</div>'}
          </div>
          <div class="activity-info">
            <div class="activity-name">${name}</div>
            <div class="activity-desc">${desc}</div>
          </div>
        </div>
      `;
    }

    if (!hasContent) {
      return this.renderStaticWeeklyContent();
    }

    html += '</div>';
    return html;
  }

  /**
   * Render static weekly content as fallback
   */
  renderStaticWeeklyContent() {
    const weeklyActivities = [
      { name: "Weekly Nightfall", desc: "Complete the weekly Nightfall Strike", icon: "🌙" },
      { name: "Weekly Crucible", desc: "Complete Crucible matches for Powerful gear", icon: "⚔️" },
      { name: "Weekly Gambit", desc: "Complete Gambit matches for Powerful gear", icon: "🎲" },
      { name: "Weekly Raid", desc: "Complete a raid for Pinnacle rewards", icon: "👑" },
      { name: "Weekly Dungeon", desc: "Complete a dungeon for Pinnacle rewards", icon: "🏛️" },
      { name: "Seasonal Challenges", desc: "Complete weekly seasonal challenges", icon: "📜" }
    ];

    let html = '<div class="weekly-activities">';

    weeklyActivities.forEach(activity => {
      html += `
        <div class="activity-card">
          <div class="activity-icon">
            <div class="icon-placeholder">${activity.icon}</div>
          </div>
          <div class="activity-info">
            <div class="activity-name">${activity.name}</div>
            <div class="activity-desc">${activity.desc}</div>
          </div>
        </div>
      `;
    });

    html += '</div>';
    return html;
  }

  /**
   * Render raids content
   */
  renderRaidsContent() {
    const raids = [
      { name: "Salvation's Edge", location: "The Pale Heart", difficulty: "Contest" },
      { name: "Crota's End", location: "Moon", difficulty: "Normal/Master" },
      { name: "Root of Nightmares", location: "Essence", difficulty: "Normal/Master" },
      { name: "King's Fall", location: "Dreadnaught", difficulty: "Normal/Master" },
      { name: "Vow of the Disciple", location: "Pyramid Ship", difficulty: "Normal/Master" },
      { name: "Vault of Glass", location: "Venus", difficulty: "Normal/Master" },
      { name: "Deep Stone Crypt", location: "Europa", difficulty: "Normal" },
      { name: "Garden of Salvation", location: "Black Garden", difficulty: "Normal" },
      { name: "Last Wish", location: "Dreaming City", difficulty: "Normal" }
    ];

    let html = '<div class="raids-list">';

    raids.forEach(raid => {
      html += `
        <div class="activity-card raid">
          <div class="raid-icon">⚔️</div>
          <div class="activity-info">
            <div class="activity-name">${raid.name}</div>
            <div class="activity-location">${raid.location}</div>
            <div class="activity-difficulty">${raid.difficulty}</div>
          </div>
        </div>
      `;
    });

    html += '</div>';
    return html;
  }

  /**
   * Render dungeons content
   */
  renderDungeonsContent() {
    const dungeons = [
      { name: "Vesper's Host", location: "Old Chicago", difficulty: "Normal/Master" },
      { name: "Warlord's Ruin", location: "EDZ", difficulty: "Normal/Master" },
      { name: "Ghosts of the Deep", location: "Titan", difficulty: "Normal/Master" },
      { name: "Spire of the Watcher", location: "Mars", difficulty: "Normal/Master" },
      { name: "Duality", location: "Leviathan", difficulty: "Normal/Master" },
      { name: "Grasp of Avarice", location: "Cosmodrome", difficulty: "Normal/Master" },
      { name: "Prophecy", location: "The Nine", difficulty: "Normal" },
      { name: "Pit of Heresy", location: "Moon", difficulty: "Normal" },
      { name: "Shattered Throne", location: "Dreaming City", difficulty: "Normal" }
    ];

    let html = '<div class="dungeons-list">';

    dungeons.forEach(dungeon => {
      html += `
        <div class="activity-card dungeon">
          <div class="dungeon-icon">🏛️</div>
          <div class="activity-info">
            <div class="activity-name">${dungeon.name}</div>
            <div class="activity-location">${dungeon.location}</div>
            <div class="activity-difficulty">${dungeon.difficulty}</div>
          </div>
        </div>
      `;
    });

    html += '</div>';
    return html;
  }

  /**
   * Render PvP content
   */
  renderPvPContent() {
    const pvpModes = [
      { name: "Trials of Osiris", type: "Competitive", schedule: "Fri-Tue" },
      { name: "Iron Banner", type: "Competitive", schedule: "Monthly" },
      { name: "Competitive", type: "Ranked", schedule: "Always" },
      { name: "Quickplay", type: "Casual", schedule: "Always" },
      { name: "Rumble", type: "Free-for-All", schedule: "Always" },
      { name: "Team Scorched", type: "Rotator", schedule: "Weekly" }
    ];

    let html = '<div class="pvp-list">';

    pvpModes.forEach(mode => {
      html += `
        <div class="activity-card pvp">
          <div class="pvp-icon">🎯</div>
          <div class="activity-info">
            <div class="activity-name">${mode.name}</div>
            <div class="activity-type">${mode.type}</div>
            <div class="activity-schedule">${mode.schedule}</div>
          </div>
        </div>
      `;
    });

    html += '</div>';
    return html;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Tab button clicks
    this.container.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentTab = btn.dataset.tab;
        this.viewMode = 'list';
        this.selectedActivity = null;
        this.saveState(); // Persist tab selection
        this.render();
      });
    });

    // Recent activity item clicks (for detail view)
    this.container.querySelectorAll('.activity-item.clickable').forEach(item => {
      item.addEventListener('click', () => {
        const index = parseInt(item.dataset.index);
        this.selectedActivity = this.recentActivities[index];
        this.viewMode = 'detail';
        this.render();
      });
    });

    // Back button in detail view
    const backBtn = this.container.querySelector('.back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        this.viewMode = 'list';
        this.selectedActivity = null;
        this.render();
      });
    }
  }

  /**
   * Show loading state
   */
  showLoading() {
    this.container.innerHTML = `
      <div class="panel-loading">
        <div class="loading-spinner"></div>
        <span>Loading activities...</span>
      </div>
    `;
  }

  /**
   * Show error state
   */
  showError(message) {
    this.container.innerHTML = `
      <div class="panel-error">
        <p>Error loading activities</p>
        <small>${message}</small>
        <button onclick="window.dashboard?.panelManager?.loadPanel('activities')">Retry</button>
      </div>
    `;
  }
}

export default ActivitiesPanel;
