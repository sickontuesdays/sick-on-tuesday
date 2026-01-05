/**
 * Season Panel - Current season info, artifact, and seasonal challenges
 */

import { apiClient } from '../api/bungie-api-client.js';
import { manifestLoader } from '../api/manifest-loader.js';

// Known season data - updated regularly
const SEASON_DATA = {
  // Season hashes mapped to episode names (from Bungie API)
  seasons: {
    4243480805: { name: 'Episode: Heresy', number: 28, episode: 'Heresy' },
    2758726568: { name: 'Episode: Revenant', number: 27, episode: 'Revenant' },
    2139932084: { name: 'Episode: Echoes', number: 26, episode: 'Echoes' },
    3749926913: { name: 'The Final Shape', number: 25, episode: 'The Final Shape' }
  },
  // Fallback if season hash not found
  current: {
    name: 'Episode: Heresy',
    number: 28,
    episode: 'Heresy',
    startDate: '2025-01-07',
    endDate: '2025-04-08'
  }
};

export class SeasonPanel {
  constructor(containerEl) {
    this.container = containerEl;
    this.profileData = null;
    this.seasonHash = null;
    this.characterProgressions = null;
    this.characters = null;
  }

  /**
   * Initialize season panel
   */
  async init() {
    this.render();
  }

  /**
   * Load season data
   */
  async load() {
    try {
      this.showLoading();

      // Try to get profile data if authenticated
      try {
        const profile = await apiClient.getProfile();

        // Extract season data
        if (profile?.profileData) {
          this.profileData = profile.profileData;
          this.seasonHash = profile.profileData.profile?.data?.currentSeasonHash;
          this.characterProgressions = profile.profileData.characterProgressions?.data;
          this.characters = profile.profileData.characters?.data;
        }
      } catch (authError) {
        // Not authenticated - use static season data only
        console.log('Season panel: Using static data (not authenticated)');
        this.profileData = null;
        this.seasonHash = null;
        this.characterProgressions = null;
        this.characters = null;
      }

      this.render();
    } catch (error) {
      console.error('Season load error:', error);
      this.showError(error.message);
    }
  }

  /**
   * Render season panel
   */
  render() {
    let html = `
      <div class="season-panel">
        ${this.renderSeasonHeader()}
        ${this.renderSeasonProgress()}
        ${this.renderArtifact()}
        ${this.renderChallenges()}
      </div>
    `;

    this.container.innerHTML = html;
  }

  /**
   * Render season header
   */
  renderSeasonHeader() {
    // Season info from manifest or calculated
    const seasonInfo = this.getSeasonInfo();

    // Get character light levels if available
    let charactersHtml = '';
    if (this.characters) {
      charactersHtml = '<div class="season-characters">';
      for (const [charId, char] of Object.entries(this.characters)) {
        const className = ['Titan', 'Hunter', 'Warlock'][char.classType] || 'Unknown';
        charactersHtml += `
          <div class="season-char">
            <span class="char-class">${className}</span>
            <span class="char-power">${char.light}</span>
          </div>
        `;
      }
      charactersHtml += '</div>';
    }

    return `
      <div class="season-header">
        <div class="season-logo">
          <span class="season-icon">⚡</span>
        </div>
        <div class="season-info">
          <h3 class="season-name">${seasonInfo.name}</h3>
          <div class="season-number">Season ${seasonInfo.number}</div>
          <div class="season-dates">
            <span>${seasonInfo.startDate} - ${seasonInfo.endDate}</span>
          </div>
          <div class="season-remaining">
            ${seasonInfo.daysRemaining > 0 ? `${seasonInfo.daysRemaining} days remaining` : 'Season ended'}
          </div>
        </div>
      </div>
      <div class="season-power-info">
        <div class="power-cap-display">
          <span class="power-label">Power Cap</span>
          <span class="power-value">${seasonInfo.powerCap}</span>
        </div>
        ${charactersHtml}
      </div>
    `;
  }

  /**
   * Render season pass progress
   */
  renderSeasonProgress() {
    const progress = this.getSeasonPassProgress();

    return `
      <div class="season-progress">
        <h4>Season Pass</h4>
        <div class="pass-progress">
          <div class="progress-bar-container">
            <div class="progress-bar" style="width: ${progress.percentage}%"></div>
          </div>
          <div class="progress-info">
            <span class="current-rank">Rank ${progress.rank}</span>
            <span class="xp-progress">${this.formatNumber(progress.xp)} / ${this.formatNumber(progress.nextRankXP)} XP</span>
          </div>
        </div>
        <div class="rank-rewards">
          <div class="reward-item ${progress.rank >= 1 ? 'unlocked' : ''}">1</div>
          <div class="reward-item ${progress.rank >= 25 ? 'unlocked' : ''}">25</div>
          <div class="reward-item ${progress.rank >= 50 ? 'unlocked' : ''}">50</div>
          <div class="reward-item ${progress.rank >= 75 ? 'unlocked' : ''}">75</div>
          <div class="reward-item ${progress.rank >= 100 ? 'unlocked' : ''}">100</div>
        </div>
      </div>
    `;
  }

  /**
   * Render artifact section
   */
  renderArtifact() {
    const artifact = this.getArtifactInfo();

    return `
      <div class="artifact-section">
        <h4>Seasonal Artifact</h4>
        <div class="artifact-card">
          <div class="artifact-header">
            <span class="artifact-icon">⚡</span>
            <div class="artifact-info">
              <span class="artifact-name">${artifact.name}</span>
              <span class="artifact-power">+${artifact.bonusPower} Power</span>
            </div>
          </div>
          <div class="artifact-progress">
            <div class="progress-bar-container">
              <div class="progress-bar" style="width: ${artifact.progressPercent}%"></div>
            </div>
            <span class="artifact-xp">${this.formatNumber(artifact.xp)} XP</span>
          </div>
          <div class="artifact-mods">
            <span>Unlocked Mods: ${artifact.unlockedMods}/${artifact.totalMods}</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render seasonal challenges
   */
  renderChallenges() {
    const challenges = this.getSeasonalChallenges();

    return `
      <div class="challenges-section">
        <h4>Seasonal Challenges</h4>
        <div class="challenges-grid">
          ${challenges.map(challenge => `
            <div class="challenge-item ${challenge.completed ? 'completed' : ''}">
              <div class="challenge-check">${challenge.completed ? '✓' : ''}</div>
              <div class="challenge-info">
                <span class="challenge-name">${challenge.name}</span>
                <span class="challenge-desc">${challenge.description}</span>
              </div>
              <div class="challenge-progress">
                <span>${challenge.progress}/${challenge.goal}</span>
              </div>
            </div>
          `).join('')}
        </div>
        <div class="challenges-summary">
          <span>Completed: ${challenges.filter(c => c.completed).length}/${challenges.length}</span>
        </div>
      </div>
    `;
  }

  /**
   * Get season info
   */
  getSeasonInfo() {
    // Try to get season info from API hash
    let seasonInfo = SEASON_DATA.current;

    if (this.seasonHash && SEASON_DATA.seasons[this.seasonHash]) {
      seasonInfo = SEASON_DATA.seasons[this.seasonHash];
    }

    // Get power cap from API if available
    const powerCap = this.profileData?.profile?.data?.currentSeasonRewardPowerCap || 2010;

    // Calculate dates
    const now = new Date();
    const seasonStart = new Date(seasonInfo.startDate || SEASON_DATA.current.startDate);
    const seasonEnd = new Date(seasonInfo.endDate || SEASON_DATA.current.endDate);
    const daysRemaining = Math.max(0, Math.ceil((seasonEnd - now) / (1000 * 60 * 60 * 24)));

    return {
      name: seasonInfo.name,
      number: seasonInfo.number,
      episode: seasonInfo.episode,
      powerCap,
      startDate: seasonStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      endDate: seasonEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      daysRemaining
    };
  }

  /**
   * Get season pass progress
   */
  getSeasonPassProgress() {
    // Try to get from character progressions
    if (this.characterProgressions) {
      const charId = Object.keys(this.characterProgressions)[0];
      const progressions = this.characterProgressions[charId]?.progressions;

      // Season pass progression hash would be here
      // For now, return placeholder
    }

    return {
      rank: 47,
      xp: 85000,
      nextRankXP: 100000,
      percentage: 85
    };
  }

  /**
   * Get artifact info
   */
  getArtifactInfo() {
    if (this.characterProgressions) {
      const charId = Object.keys(this.characterProgressions)[0];
      const progressions = this.characterProgressions[charId];

      // Try to get artifact data
      // Artifact progression would be here
    }

    return {
      name: 'Ergo Sum',
      bonusPower: 12,
      xp: 1250000,
      progressPercent: 65,
      unlockedMods: 9,
      totalMods: 25
    };
  }

  /**
   * Get seasonal challenges
   */
  getSeasonalChallenges() {
    // Placeholder challenges - would come from API
    return [
      { name: 'Crucible Challenger', description: 'Win Crucible matches', progress: 15, goal: 25, completed: false },
      { name: 'Vanguard Veteran', description: 'Complete Strikes', progress: 50, goal: 50, completed: true },
      { name: 'Gambit Grinder', description: 'Complete Gambit matches', progress: 8, goal: 20, completed: false },
      { name: 'Raid Ready', description: 'Complete raid encounters', progress: 12, goal: 12, completed: true },
      { name: 'Exotic Hunter', description: 'Collect exotic weapons', progress: 3, goal: 5, completed: false },
      { name: 'Masterwork Maven', description: 'Masterwork weapons', progress: 4, goal: 10, completed: false }
    ];
  }

  /**
   * Format large numbers
   */
  formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  }

  /**
   * Show loading state
   */
  showLoading() {
    this.container.innerHTML = `
      <div class="panel-loading">
        <div class="loading-spinner"></div>
        <span>Loading season data...</span>
      </div>
    `;
  }

  /**
   * Show error state
   */
  showError(message) {
    this.container.innerHTML = `
      <div class="panel-error">
        <p>Error loading season data</p>
        <small>${message}</small>
        <button onclick="window.dashboard?.panelManager?.loadPanel('season')">Retry</button>
      </div>
    `;
  }
}

export default SeasonPanel;
