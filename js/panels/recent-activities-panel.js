/**
 * Recent Activities Panel - Shows player's activity history with detail view
 */

import { apiClient } from '../api/bungie-api-client.js';
import { manifestLoader } from '../api/manifest-loader.js';

export class RecentActivitiesPanel {
  constructor(containerEl) {
    this.container = containerEl;
    this.activities = [];
    this.characterId = null;
    this.viewMode = 'list'; // 'list' or 'detail'
    this.selectedActivity = null;
    this.currentPage = 0;
    this.pageSize = 10;
  }

  /**
   * Initialize panel
   */
  async init() {
    this.render();
  }

  /**
   * Load activities data
   */
  async load() {
    try {
      this.showLoading();

      // Get profile to find character ID
      const profile = await apiClient.getProfile();
      const charIds = Object.keys(profile?.profileData?.characters?.data || {});
      this.characterId = charIds[0] || null;

      if (!this.characterId) {
        this.showAuth();
        return;
      }

      // Load activity history
      const activitiesData = await apiClient.getActivities(this.characterId, 0, 25, this.currentPage);

      // Process activities with definitions
      this.activities = await this.processActivities(activitiesData?.activities?.activities || []);

      this.render();
    } catch (error) {
      console.error('Recent activities load error:', error);
      this.showError(error.message);
    }
  }

  /**
   * Process activities and fetch their definitions
   */
  async processActivities(rawActivities) {
    const processed = [];

    for (const activity of rawActivities) {
      const details = activity.activityDetails || {};
      const values = activity.values || {};

      // Get activity name from definition or mode
      let activityName = manifestLoader.getActivityModeName(details.mode);
      let activityDesc = '';

      // Try to get activity definition for more specific name
      if (details.directorActivityHash) {
        const def = await manifestLoader.getActivityDefinition(details.directorActivityHash);
        if (def?.displayProperties?.name) {
          activityName = def.displayProperties.name;
          activityDesc = def.displayProperties.description || '';
        }
      }

      processed.push({
        instanceId: details.instanceId,
        activityHash: details.directorActivityHash,
        referenceId: details.referenceId,
        mode: details.mode,
        modeName: manifestLoader.getActivityModeName(details.mode),
        name: activityName,
        description: activityDesc,
        date: new Date(activity.period),
        completed: values.completed?.basic?.value === 1,
        standing: values.standing?.basic?.value, // 0 = Victory, 1 = Defeat
        kills: values.kills?.basic?.value || 0,
        deaths: values.deaths?.basic?.value || 0,
        assists: values.assists?.basic?.value || 0,
        kd: values.killsDeathsRatio?.basic?.value || 0,
        score: values.score?.basic?.value || 0,
        duration: values.activityDurationSeconds?.basic?.value || 0,
        playerCount: values.playerCount?.basic?.value || 0,
        teamScore: values.teamScore?.basic?.value || 0,
        opponentScore: values.opponentsDefeated?.basic?.value || 0
      });
    }

    return processed;
  }

  /**
   * Render panel
   */
  render() {
    let html = '';

    if (this.viewMode === 'detail' && this.selectedActivity) {
      html = this.renderDetailView();
    } else {
      html = this.renderListView();
    }

    this.container.innerHTML = html;
    this.attachEventListeners();
  }

  /**
   * Render list view
   */
  renderListView() {
    if (!this.activities || this.activities.length === 0) {
      return '<div class="no-data">No recent activities found</div>';
    }

    let html = `
      <div class="recent-activities-panel">
        <div class="activities-list">
    `;

    this.activities.forEach((activity, index) => {
      const date = activity.date.toLocaleDateString();
      const time = activity.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const kd = activity.kd.toFixed(2);

      // Determine outcome styling
      let outcomeClass = '';
      let outcomeText = '';
      if (activity.standing !== undefined) {
        outcomeClass = activity.standing === 0 ? 'victory' : 'defeat';
        outcomeText = activity.standing === 0 ? 'Victory' : 'Defeat';
      } else if (activity.completed) {
        outcomeClass = 'completed';
        outcomeText = 'Completed';
      }

      // Get mode icon
      const modeIcon = this.getModeIcon(activity.mode);

      html += `
        <div class="activity-item" data-index="${index}">
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

    html += `
        </div>
        <div class="activities-pagination">
          <button class="page-btn prev" ${this.currentPage === 0 ? 'disabled' : ''}>Previous</button>
          <span class="page-info">Page ${this.currentPage + 1}</span>
          <button class="page-btn next" ${this.activities.length < this.pageSize ? 'disabled' : ''}>Next</button>
        </div>
      </div>
    `;

    return html;
  }

  /**
   * Render detail view
   */
  renderDetailView() {
    const activity = this.selectedActivity;
    if (!activity) return this.renderListView();

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
   * Format duration in seconds to readable string
   */
  formatDuration(seconds) {
    if (!seconds) return '0m';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Activity item click handlers
    this.container.querySelectorAll('.activity-item').forEach(item => {
      item.addEventListener('click', () => {
        const index = parseInt(item.dataset.index);
        this.selectedActivity = this.activities[index];
        this.viewMode = 'detail';
        this.render();
      });
    });

    // Back button
    const backBtn = this.container.querySelector('.back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        this.viewMode = 'list';
        this.selectedActivity = null;
        this.render();
      });
    }

    // Pagination
    const prevBtn = this.container.querySelector('.page-btn.prev');
    const nextBtn = this.container.querySelector('.page-btn.next');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (this.currentPage > 0) {
          this.currentPage--;
          this.load();
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        this.currentPage++;
        this.load();
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
   * Show auth required
   */
  showAuth() {
    this.container.innerHTML = `
      <div class="panel-auth">
        <p>Sign in to view your recent activities</p>
        <button onclick="window.dashboard?.auth?.login()">Sign In with Bungie</button>
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
        <button onclick="window.dashboard?.panelManager?.loadPanel('recent-activities')">Retry</button>
      </div>
    `;
  }
}

export default RecentActivitiesPanel;
