/**
 * Rotators Panel - Weekly/daily rotating content (Nightfall, Raid, etc.)
 */

import { apiClient } from '../api/bungie-api-client.js';
import { manifestLoader } from '../api/manifest-loader.js';

export class RotatorsPanel {
  constructor(containerEl) {
    this.container = containerEl;
    this.milestones = null;
    this.rotations = null;
  }

  /**
   * Initialize rotators panel
   */
  async init() {
    this.render();
  }

  /**
   * Load rotator data
   */
  async load() {
    try {
      this.showLoading();

      const data = await apiClient.getMilestones();
      this.milestones = data.milestones;

      // Parse rotations from milestones
      this.parseRotations();

      this.render();
    } catch (error) {
      console.error('Rotators load error:', error);
      this.showError(error.message);
    }
  }

  /**
   * Parse rotations from milestone data
   */
  parseRotations() {
    this.rotations = {
      nightfall: this.getNightfallRotation(),
      raid: this.getRaidRotation(),
      dungeon: this.getDungeonRotation(),
      crucible: this.getCrucibleRotation(),
      lostSector: this.getLostSectorRotation(),
      wellspring: this.getWellspringRotation()
    };
  }

  /**
   * Get Nightfall rotation
   */
  getNightfallRotation() {
    // Nightfall rotation is typically on a weekly basis
    const nightfalls = [
      "The Arms Dealer",
      "The Glassway",
      "Warden of Nothing",
      "Birthplace of the Vile",
      "The Lightblade",
      "Proving Grounds"
    ];

    // Calculate current week
    const epoch = new Date('2024-06-04'); // Reset reference
    const now = new Date();
    const weeksSinceEpoch = Math.floor((now - epoch) / (7 * 24 * 60 * 60 * 1000));
    const index = weeksSinceEpoch % nightfalls.length;

    return {
      current: nightfalls[index],
      next: nightfalls[(index + 1) % nightfalls.length],
      schedule: 'Weekly (Tuesday Reset)'
    };
  }

  /**
   * Get Raid rotation
   */
  getRaidRotation() {
    const raids = [
      { name: "Last Wish", loot: "Pinnacle" },
      { name: "Garden of Salvation", loot: "Pinnacle" },
      { name: "Deep Stone Crypt", loot: "Pinnacle" },
      { name: "Vault of Glass", loot: "Pinnacle" },
      { name: "Vow of the Disciple", loot: "Pinnacle" },
      { name: "King's Fall", loot: "Pinnacle" },
      { name: "Root of Nightmares", loot: "Pinnacle" },
      { name: "Crota's End", loot: "Pinnacle" }
    ];

    const epoch = new Date('2024-06-04');
    const now = new Date();
    const weeksSinceEpoch = Math.floor((now - epoch) / (7 * 24 * 60 * 60 * 1000));
    const index = weeksSinceEpoch % raids.length;

    return {
      current: raids[index].name,
      next: raids[(index + 1) % raids.length].name,
      loot: raids[index].loot,
      schedule: 'Weekly (Tuesday Reset)'
    };
  }

  /**
   * Get Dungeon rotation
   */
  getDungeonRotation() {
    const dungeons = [
      "Shattered Throne",
      "Pit of Heresy",
      "Prophecy",
      "Grasp of Avarice",
      "Duality",
      "Spire of the Watcher",
      "Ghosts of the Deep",
      "Warlord's Ruin",
      "Vesper's Host"
    ];

    const epoch = new Date('2024-06-04');
    const now = new Date();
    const weeksSinceEpoch = Math.floor((now - epoch) / (7 * 24 * 60 * 60 * 1000));
    const index = weeksSinceEpoch % dungeons.length;

    return {
      current: dungeons[index],
      next: dungeons[(index + 1) % dungeons.length],
      schedule: 'Weekly (Tuesday Reset)'
    };
  }

  /**
   * Get Crucible rotation
   */
  getCrucibleRotation() {
    const modes = [
      "Team Scorched",
      "Momentum Control",
      "Mayhem",
      "Checkmate Control",
      "Clash",
      "Zone Control"
    ];

    const epoch = new Date('2024-06-04');
    const now = new Date();
    const weeksSinceEpoch = Math.floor((now - epoch) / (7 * 24 * 60 * 60 * 1000));
    const index = weeksSinceEpoch % modes.length;

    return {
      current: modes[index],
      next: modes[(index + 1) % modes.length],
      schedule: 'Weekly (Tuesday Reset)'
    };
  }

  /**
   * Get Lost Sector rotation
   */
  getLostSectorRotation() {
    const sectors = [
      { name: "K1 Crew Quarters", location: "Moon", reward: "Exotic Legs" },
      { name: "Concealed Void", location: "Europa", reward: "Exotic Arms" },
      { name: "Bunker E15", location: "Europa", reward: "Exotic Chest" },
      { name: "K1 Logistics", location: "Moon", reward: "Exotic Helmet" },
      { name: "Perdition", location: "Europa", reward: "Exotic Legs" },
      { name: "Bay of Drowned Wishes", location: "Dreaming City", reward: "Exotic Arms" }
    ];

    // Lost sectors rotate daily
    const epoch = new Date('2024-06-04');
    const now = new Date();
    const daysSinceEpoch = Math.floor((now - epoch) / (24 * 60 * 60 * 1000));
    const index = daysSinceEpoch % sectors.length;

    return {
      current: sectors[index],
      next: sectors[(index + 1) % sectors.length],
      schedule: 'Daily (Daily Reset)'
    };
  }

  /**
   * Get Wellspring rotation
   */
  getWellspringRotation() {
    const activities = [
      { name: "Attack", weapon: "Come to Pass (Auto Rifle)" },
      { name: "Defend", weapon: "Tarnation (Grenade Launcher)" },
      { name: "Attack", weapon: "Fel Taradiddle (Combat Bow)" },
      { name: "Defend", weapon: "Father's Sins (Sniper Rifle)" }
    ];

    const epoch = new Date('2024-06-04');
    const now = new Date();
    const daysSinceEpoch = Math.floor((now - epoch) / (24 * 60 * 60 * 1000));
    const index = daysSinceEpoch % activities.length;

    return {
      current: activities[index],
      next: activities[(index + 1) % activities.length],
      schedule: 'Daily (Daily Reset)'
    };
  }

  /**
   * Render rotators panel
   */
  render() {
    let html = `
      <div class="rotators-panel">
        <div class="rotators-grid">
          ${this.renderNightfall()}
          ${this.renderRaid()}
          ${this.renderDungeon()}
          ${this.renderCrucible()}
          ${this.renderLostSector()}
          ${this.renderWellspring()}
        </div>
      </div>
    `;

    this.container.innerHTML = html;
  }

  /**
   * Render Nightfall rotation
   */
  renderNightfall() {
    const nf = this.rotations?.nightfall || { current: 'Unknown', next: 'Unknown' };

    return `
      <div class="rotation-card nightfall">
        <div class="rotation-header">
          <span class="rotation-icon">🌙</span>
          <span class="rotation-title">Nightfall</span>
        </div>
        <div class="rotation-content">
          <div class="current-rotation">
            <span class="label">This Week:</span>
            <span class="value">${nf.current}</span>
          </div>
          <div class="next-rotation">
            <span class="label">Next:</span>
            <span class="value">${nf.next}</span>
          </div>
        </div>
        <div class="rotation-schedule">${nf.schedule || ''}</div>
      </div>
    `;
  }

  /**
   * Render Raid rotation
   */
  renderRaid() {
    const raid = this.rotations?.raid || { current: 'Unknown', next: 'Unknown' };

    return `
      <div class="rotation-card raid">
        <div class="rotation-header">
          <span class="rotation-icon">⚔️</span>
          <span class="rotation-title">Featured Raid</span>
        </div>
        <div class="rotation-content">
          <div class="current-rotation">
            <span class="label">This Week:</span>
            <span class="value">${raid.current}</span>
          </div>
          <div class="next-rotation">
            <span class="label">Next:</span>
            <span class="value">${raid.next}</span>
          </div>
          ${raid.loot ? `<div class="loot-info">Drops: ${raid.loot}</div>` : ''}
        </div>
        <div class="rotation-schedule">${raid.schedule || ''}</div>
      </div>
    `;
  }

  /**
   * Render Dungeon rotation
   */
  renderDungeon() {
    const dungeon = this.rotations?.dungeon || { current: 'Unknown', next: 'Unknown' };

    return `
      <div class="rotation-card dungeon">
        <div class="rotation-header">
          <span class="rotation-icon">🏛️</span>
          <span class="rotation-title">Featured Dungeon</span>
        </div>
        <div class="rotation-content">
          <div class="current-rotation">
            <span class="label">This Week:</span>
            <span class="value">${dungeon.current}</span>
          </div>
          <div class="next-rotation">
            <span class="label">Next:</span>
            <span class="value">${dungeon.next}</span>
          </div>
        </div>
        <div class="rotation-schedule">${dungeon.schedule || ''}</div>
      </div>
    `;
  }

  /**
   * Render Crucible rotation
   */
  renderCrucible() {
    const crucible = this.rotations?.crucible || { current: 'Unknown', next: 'Unknown' };

    return `
      <div class="rotation-card crucible">
        <div class="rotation-header">
          <span class="rotation-icon">🎯</span>
          <span class="rotation-title">Crucible Rotator</span>
        </div>
        <div class="rotation-content">
          <div class="current-rotation">
            <span class="label">This Week:</span>
            <span class="value">${crucible.current}</span>
          </div>
          <div class="next-rotation">
            <span class="label">Next:</span>
            <span class="value">${crucible.next}</span>
          </div>
        </div>
        <div class="rotation-schedule">${crucible.schedule || ''}</div>
      </div>
    `;
  }

  /**
   * Render Lost Sector rotation
   */
  renderLostSector() {
    const ls = this.rotations?.lostSector || { current: { name: 'Unknown' }, next: { name: 'Unknown' } };

    return `
      <div class="rotation-card lost-sector">
        <div class="rotation-header">
          <span class="rotation-icon">🔍</span>
          <span class="rotation-title">Legend Lost Sector</span>
        </div>
        <div class="rotation-content">
          <div class="current-rotation">
            <span class="label">Today:</span>
            <span class="value">${ls.current.name}</span>
            ${ls.current.location ? `<span class="location">${ls.current.location}</span>` : ''}
          </div>
          ${ls.current.reward ? `<div class="reward-info">Reward: ${ls.current.reward}</div>` : ''}
          <div class="next-rotation">
            <span class="label">Tomorrow:</span>
            <span class="value">${ls.next.name}</span>
          </div>
        </div>
        <div class="rotation-schedule">${ls.schedule || ''}</div>
      </div>
    `;
  }

  /**
   * Render Wellspring rotation
   */
  renderWellspring() {
    const ws = this.rotations?.wellspring || { current: { name: 'Unknown' }, next: { name: 'Unknown' } };

    return `
      <div class="rotation-card wellspring">
        <div class="rotation-header">
          <span class="rotation-icon">💧</span>
          <span class="rotation-title">Wellspring</span>
        </div>
        <div class="rotation-content">
          <div class="current-rotation">
            <span class="label">Today:</span>
            <span class="value">${ws.current.name}</span>
          </div>
          ${ws.current.weapon ? `<div class="weapon-info">${ws.current.weapon}</div>` : ''}
          <div class="next-rotation">
            <span class="label">Tomorrow:</span>
            <span class="value">${ws.next.name}</span>
          </div>
        </div>
        <div class="rotation-schedule">${ws.schedule || ''}</div>
      </div>
    `;
  }

  /**
   * Show loading state
   */
  showLoading() {
    this.container.innerHTML = `
      <div class="panel-loading">
        <div class="loading-spinner"></div>
        <span>Loading rotations...</span>
      </div>
    `;
  }

  /**
   * Show error state
   */
  showError(message) {
    this.container.innerHTML = `
      <div class="panel-error">
        <p>Error loading rotations</p>
        <small>${message}</small>
        <button onclick="window.dashboard?.panelManager?.loadPanel('rotators')">Retry</button>
      </div>
    `;
  }
}

export default RotatorsPanel;
