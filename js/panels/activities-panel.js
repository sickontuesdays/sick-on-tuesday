/**
 * Activities Panel - Current activities, raids, dungeons, and weekly content
 */

import { apiClient } from '../api/bungie-api-client.js';
import { manifestLoader } from '../api/manifest-loader.js';

export class ActivitiesPanel {
  constructor(containerEl) {
    this.container = containerEl;
    this.activities = null;
    this.milestones = null;
    this.currentTab = 'weekly';
  }

  /**
   * Initialize activities panel
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

      const [activities, milestones] = await Promise.all([
        apiClient.getActivities().catch(() => null),
        apiClient.getMilestones().catch(() => null)
      ]);

      this.activities = activities;
      this.milestones = milestones?.milestones;

      this.render();
    } catch (error) {
      console.error('Activities load error:', error);
      this.showError(error.message);
    }
  }

  /**
   * Render activities panel
   */
  render() {
    let html = `
      <div class="activities-panel">
        <div class="activities-tabs">
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
   * Render content based on current tab
   */
  renderContent() {
    switch (this.currentTab) {
      case 'weekly':
        return this.renderWeeklyContent();
      case 'raids':
        return this.renderRaidsContent();
      case 'dungeons':
        return this.renderDungeonsContent();
      case 'pvp':
        return this.renderPvPContent();
      default:
        return this.renderWeeklyContent();
    }
  }

  /**
   * Render weekly milestones
   */
  renderWeeklyContent() {
    if (!this.milestones) {
      return '<div class="no-data">Sign in to view weekly activities</div>';
    }

    let html = '<div class="weekly-activities">';

    for (const [hash, milestone] of Object.entries(this.milestones)) {
      const definition = manifestLoader.getMilestoneDefinition(hash);
      if (!definition) continue;

      const name = definition.displayProperties?.name || 'Unknown';
      const desc = definition.displayProperties?.description || '';
      const icon = definition.displayProperties?.icon
        ? `https://www.bungie.net${definition.displayProperties.icon}`
        : null;

      // Check if this is a weekly/important milestone
      if (!definition.displayProperties?.name) continue;

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
    this.container.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentTab = btn.dataset.tab;
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
