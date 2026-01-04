/**
 * Stats Panel - Player statistics across all activities
 */

import { apiClient } from '../api/bungie-api-client.js';

export class StatsPanel {
  constructor(containerEl) {
    this.container = containerEl;
    this.stats = null;
    this.characters = null;
    this.currentTab = 'overall';
    this.currentCharacter = null;
  }

  /**
   * Initialize stats panel
   */
  async init() {
    this.render();
  }

  /**
   * Load stats data
   */
  async load() {
    try {
      this.showLoading();

      const [statsData, profile] = await Promise.all([
        apiClient.getStats().catch(() => null),
        apiClient.getProfile().catch(() => null)
      ]);

      this.stats = statsData;
      this.characters = profile?.profileData?.characters?.data;

      if (this.characters && !this.currentCharacter) {
        this.currentCharacter = Object.keys(this.characters)[0];
      }

      this.render();
    } catch (error) {
      console.error('Stats load error:', error);
      this.showError(error.message);
    }
  }

  /**
   * Render stats panel
   */
  render() {
    let html = `
      <div class="stats-panel">
        <div class="stats-tabs">
          <button class="tab-btn ${this.currentTab === 'overall' ? 'active' : ''}" data-tab="overall">Overall</button>
          <button class="tab-btn ${this.currentTab === 'pve' ? 'active' : ''}" data-tab="pve">PvE</button>
          <button class="tab-btn ${this.currentTab === 'pvp' ? 'active' : ''}" data-tab="pvp">PvP</button>
          <button class="tab-btn ${this.currentTab === 'gambit' ? 'active' : ''}" data-tab="gambit">Gambit</button>
        </div>
        <div class="stats-content">
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
    if (!this.stats) {
      return '<div class="no-data">Sign in to view your stats</div>';
    }

    const mergedStats = this.stats?.mergedAllCharacters?.merged;
    if (!mergedStats) {
      return '<div class="no-data">No stats data available</div>';
    }

    switch (this.currentTab) {
      case 'overall':
        return this.renderOverallStats(mergedStats);
      case 'pve':
        return this.renderPvEStats(mergedStats);
      case 'pvp':
        return this.renderPvPStats(mergedStats);
      case 'gambit':
        return this.renderGambitStats(mergedStats);
      default:
        return this.renderOverallStats(mergedStats);
    }
  }

  /**
   * Render overall stats
   */
  renderOverallStats(stats) {
    const allPvE = stats.allPvE?.allTime || {};
    const allPvP = stats.allPvP?.allTime || {};

    return `
      <div class="stats-grid">
        <div class="stats-section">
          <h4>Combat</h4>
          ${this.renderStatRow('Kills', this.getStat(allPvE, 'kills') + this.getStat(allPvP, 'kills'))}
          ${this.renderStatRow('Deaths', this.getStat(allPvE, 'deaths') + this.getStat(allPvP, 'deaths'))}
          ${this.renderStatRow('Assists', this.getStat(allPvE, 'assists') + this.getStat(allPvP, 'assists'))}
          ${this.renderStatRow('K/D Ratio', this.calculateKD(allPvE, allPvP))}
        </div>

        <div class="stats-section">
          <h4>Activities</h4>
          ${this.renderStatRow('Activities Completed', this.getStat(allPvE, 'activitiesCleared') + this.getStat(allPvP, 'activitiesWon'))}
          ${this.renderStatRow('Public Events', this.getStat(allPvE, 'publicEventsCompleted'))}
          ${this.renderStatRow('Raids Cleared', this.getStat(allPvE, 'activitiesCleared'))}
          ${this.renderStatRow('Time Played', this.formatTime(this.getStat(allPvE, 'secondsPlayed') + this.getStat(allPvP, 'secondsPlayed')))}
        </div>

        <div class="stats-section">
          <h4>Best Performances</h4>
          ${this.renderStatRow('Best Single Game Kills', Math.max(this.getStat(allPvE, 'bestSingleGameKills'), this.getStat(allPvP, 'bestSingleGameKills')))}
          ${this.renderStatRow('Longest Kill Spree', Math.max(this.getStat(allPvE, 'longestKillSpree'), this.getStat(allPvP, 'longestKillSpree')))}
          ${this.renderStatRow('Precision Kills', this.getStat(allPvE, 'precisionKills') + this.getStat(allPvP, 'precisionKills'))}
          ${this.renderStatRow('Orbs Generated', this.getStat(allPvE, 'orbsDropped') + this.getStat(allPvP, 'orbsDropped'))}
        </div>
      </div>
    `;
  }

  /**
   * Render PvE stats
   */
  renderPvEStats(stats) {
    const pve = stats.allPvE?.allTime || {};

    return `
      <div class="stats-grid">
        <div class="stats-section">
          <h4>Combat</h4>
          ${this.renderStatRow('Kills', this.getStat(pve, 'kills'))}
          ${this.renderStatRow('Deaths', this.getStat(pve, 'deaths'))}
          ${this.renderStatRow('Assists', this.getStat(pve, 'assists'))}
          ${this.renderStatRow('K/D Ratio', this.getStat(pve, 'killsDeathsRatio', true))}
          ${this.renderStatRow('Precision Kills', this.getStat(pve, 'precisionKills'))}
        </div>

        <div class="stats-section">
          <h4>Activities</h4>
          ${this.renderStatRow('Activities Entered', this.getStat(pve, 'activitiesEntered'))}
          ${this.renderStatRow('Activities Cleared', this.getStat(pve, 'activitiesCleared'))}
          ${this.renderStatRow('Public Events', this.getStat(pve, 'publicEventsCompleted'))}
          ${this.renderStatRow('Heroic Public Events', this.getStat(pve, 'heroicPublicEventsCompleted'))}
        </div>

        <div class="stats-section">
          <h4>Time</h4>
          ${this.renderStatRow('Time Played', this.formatTime(this.getStat(pve, 'secondsPlayed')))}
          ${this.renderStatRow('Longest Single Life', this.formatTime(this.getStat(pve, 'longestSingleLife')))}
          ${this.renderStatRow('Average Lifespan', this.formatTime(this.getStat(pve, 'averageLifespan')))}
        </div>
      </div>
    `;
  }

  /**
   * Render PvP stats
   */
  renderPvPStats(stats) {
    const pvp = stats.allPvP?.allTime || {};

    return `
      <div class="stats-grid">
        <div class="stats-section">
          <h4>Combat</h4>
          ${this.renderStatRow('Kills', this.getStat(pvp, 'kills'))}
          ${this.renderStatRow('Deaths', this.getStat(pvp, 'deaths'))}
          ${this.renderStatRow('Assists', this.getStat(pvp, 'assists'))}
          ${this.renderStatRow('K/D Ratio', this.getStat(pvp, 'killsDeathsRatio', true))}
          ${this.renderStatRow('KDA Ratio', this.getStat(pvp, 'killsDeathsAssists', true))}
          ${this.renderStatRow('Efficiency', this.getStat(pvp, 'efficiency', true))}
        </div>

        <div class="stats-section">
          <h4>Matches</h4>
          ${this.renderStatRow('Matches Played', this.getStat(pvp, 'activitiesEntered'))}
          ${this.renderStatRow('Matches Won', this.getStat(pvp, 'activitiesWon'))}
          ${this.renderStatRow('Win Rate', this.calculateWinRate(pvp))}
          ${this.renderStatRow('Combat Rating', this.getStat(pvp, 'combatRating'))}
        </div>

        <div class="stats-section">
          <h4>Best Performances</h4>
          ${this.renderStatRow('Best Single Game', this.getStat(pvp, 'bestSingleGameKills'))}
          ${this.renderStatRow('Longest Spree', this.getStat(pvp, 'longestKillSpree'))}
          ${this.renderStatRow('Most Precision Kills', this.getStat(pvp, 'mostPrecisionKills'))}
          ${this.renderStatRow('Weapon Kills', this.getStat(pvp, 'weaponKillsAll'))}
        </div>
      </div>
    `;
  }

  /**
   * Render Gambit stats
   */
  renderGambitStats(stats) {
    // Gambit stats are typically under allPvECompetitive
    const gambit = stats.allPvECompetitive?.allTime || {};

    if (Object.keys(gambit).length === 0) {
      return '<div class="no-data">No Gambit stats available</div>';
    }

    return `
      <div class="stats-grid">
        <div class="stats-section">
          <h4>Combat</h4>
          ${this.renderStatRow('Kills', this.getStat(gambit, 'kills'))}
          ${this.renderStatRow('Deaths', this.getStat(gambit, 'deaths'))}
          ${this.renderStatRow('Guardian Kills', this.getStat(gambit, 'invasionKills'))}
          ${this.renderStatRow('Motes Deposited', this.getStat(gambit, 'motesDeposited'))}
        </div>

        <div class="stats-section">
          <h4>Matches</h4>
          ${this.renderStatRow('Matches Played', this.getStat(gambit, 'activitiesEntered'))}
          ${this.renderStatRow('Matches Won', this.getStat(gambit, 'activitiesWon'))}
          ${this.renderStatRow('Win Rate', this.calculateWinRate(gambit))}
          ${this.renderStatRow('Primevals Killed', this.getStat(gambit, 'primevalKills'))}
        </div>

        <div class="stats-section">
          <h4>Invasions</h4>
          ${this.renderStatRow('Invasions', this.getStat(gambit, 'invasions'))}
          ${this.renderStatRow('Invaders Killed', this.getStat(gambit, 'invaderKills'))}
          ${this.renderStatRow('Motes Lost', this.getStat(gambit, 'motesLost'))}
          ${this.renderStatRow('Blockers Sent', this.getStat(gambit, 'smallBlockersSent'))}
        </div>
      </div>
    `;
  }

  /**
   * Render a stat row
   */
  renderStatRow(label, value) {
    return `
      <div class="stat-row">
        <span class="stat-label">${label}</span>
        <span class="stat-value">${value}</span>
      </div>
    `;
  }

  /**
   * Get stat value safely
   */
  getStat(stats, key, isDecimal = false) {
    const stat = stats[key];
    if (!stat) return 0;

    const value = stat.basic?.value || 0;
    if (isDecimal) {
      return value.toFixed(2);
    }
    return Math.floor(value).toLocaleString();
  }

  /**
   * Calculate combined K/D
   */
  calculateKD(pve, pvp) {
    const kills = (pve.kills?.basic?.value || 0) + (pvp.kills?.basic?.value || 0);
    const deaths = (pve.deaths?.basic?.value || 0) + (pvp.deaths?.basic?.value || 0);
    if (deaths === 0) return kills.toFixed(2);
    return (kills / deaths).toFixed(2);
  }

  /**
   * Calculate win rate
   */
  calculateWinRate(stats) {
    const played = stats.activitiesEntered?.basic?.value || 0;
    const won = stats.activitiesWon?.basic?.value || 0;
    if (played === 0) return '0%';
    return ((won / played) * 100).toFixed(1) + '%';
  }

  /**
   * Format time from seconds
   */
  formatTime(seconds) {
    if (!seconds || seconds === 0) return '0h';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
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
        <span>Loading stats...</span>
      </div>
    `;
  }

  /**
   * Show error state
   */
  showError(message) {
    this.container.innerHTML = `
      <div class="panel-error">
        <p>Error loading stats</p>
        <small>${message}</small>
        <button onclick="window.dashboard?.panelManager?.loadPanel('stats')">Retry</button>
      </div>
    `;
  }
}

export default StatsPanel;
