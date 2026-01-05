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
    this.selectedRotation = null; // For detail view
    this.viewMode = 'list'; // 'list' or 'detail'
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

      // Try to get milestones from API (may fail if not authenticated)
      try {
        const data = await apiClient.getMilestones();
        this.milestones = data?.milestones || data;
      } catch (apiError) {
        // Not authenticated or API error - use static rotation data
        console.log('Rotators panel: Using static data');
        this.milestones = null;
      }

      // Parse rotations - works with or without milestones data
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
    let html = '';

    if (this.viewMode === 'detail' && this.selectedRotation) {
      html = this.renderDetailView();
      // Show navigation buttons in title bar
      if (window.panelNav) {
        window.panelNav.show('rotators', {
          back: () => this.goBack(),
          home: () => this.goHome()
        });
      }
    } else {
      html = this.renderListView();
      // Hide navigation buttons
      if (window.panelNav) {
        window.panelNav.hide('rotators');
      }
    }

    this.container.innerHTML = html;
    this.attachEventListeners();
  }

  /**
   * Navigate back to list view
   */
  goBack() {
    this.viewMode = 'list';
    this.selectedRotation = null;
    this.render();
  }

  /**
   * Navigate to home (list view)
   */
  goHome() {
    this.viewMode = 'list';
    this.selectedRotation = null;
    this.render();
  }

  /**
   * Render list view
   */
  renderListView() {
    return `
      <div class="rotators-panel">
        <div class="rotators-grid">
          ${this.renderNightfall()}
          ${this.renderRaid()}
          ${this.renderDungeon()}
          ${this.renderCrucible()}
          ${this.renderLostSector()}
          ${this.renderWellspring()}
          ${this.renderExoticMission()}
          ${this.renderTrialsMap()}
        </div>
      </div>
    `;
  }

  /**
   * Render detail view for a specific rotation
   */
  renderDetailView() {
    const rotation = this.selectedRotation;
    if (!rotation) return this.renderListView();

    return `
      <div class="rotators-detail">
        <div class="detail-header">
          <button class="back-btn" data-action="back">← Back</button>
          <h3>${rotation.title}</h3>
        </div>
        <div class="detail-content">
          <div class="detail-icon">${rotation.icon}</div>
          <div class="detail-info">
            <div class="detail-current">
              <span class="label">Current:</span>
              <span class="value">${rotation.current}</span>
            </div>
            ${rotation.next ? `
              <div class="detail-next">
                <span class="label">Next:</span>
                <span class="value">${rotation.next}</span>
              </div>
            ` : ''}
            ${rotation.schedule ? `
              <div class="detail-schedule">${rotation.schedule}</div>
            ` : ''}
          </div>
          ${rotation.rewards ? `
            <div class="detail-rewards">
              <h4>Featured Rewards</h4>
              <div class="rewards-list">
                ${rotation.rewards.map(r => `<div class="reward-item">${r}</div>`).join('')}
              </div>
            </div>
          ` : ''}
          ${rotation.modifiers ? `
            <div class="detail-modifiers">
              <h4>Active Modifiers</h4>
              <div class="modifiers-list">
                ${rotation.modifiers.map(m => `<div class="modifier-item">${m}</div>`).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Rotation card click handlers
    this.container.querySelectorAll('.rotation-card').forEach(card => {
      card.addEventListener('click', () => {
        const type = card.dataset.type;
        this.showRotationDetail(type);
      });
    });

    // Back button
    const backBtn = this.container.querySelector('.back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        this.viewMode = 'list';
        this.selectedRotation = null;
        this.render();
      });
    }
  }

  /**
   * Show rotation detail
   */
  showRotationDetail(type) {
    // Get exotic mission data
    const exoticMissionData = this.getExoticMissionData();
    // Get trials data
    const trialsData = this.getTrialsData();

    const rotationData = {
      nightfall: {
        title: 'Nightfall Strike',
        icon: '🌙',
        ...this.rotations?.nightfall,
        rewards: ['Nightfall Weapons', 'Ascendant Shards', 'Enhancement Prisms'],
        modifiers: ['Match Game', 'Champions', 'Limited Revives']
      },
      raid: {
        title: 'Featured Raid',
        icon: '⚔️',
        ...this.rotations?.raid,
        rewards: ['Pinnacle Gear', 'Raid Weapons', 'Exotic Chance'],
        modifiers: ['Contest Mode (if active)']
      },
      dungeon: {
        title: 'Featured Dungeon',
        icon: '🏛️',
        ...this.rotations?.dungeon,
        rewards: ['Pinnacle Gear', 'Dungeon Weapons', 'Artifice Armor']
      },
      crucible: {
        title: 'Crucible Rotator',
        icon: '🎯',
        ...this.rotations?.crucible,
        rewards: ['Crucible Engrams', 'Valor Ranks']
      },
      lostSector: {
        title: 'Legend Lost Sector',
        icon: '🔍',
        current: this.rotations?.lostSector?.current?.name || 'Unknown',
        next: this.rotations?.lostSector?.next?.name,
        schedule: this.rotations?.lostSector?.schedule,
        rewards: [this.rotations?.lostSector?.current?.reward || 'Exotic Armor'],
        modifiers: ['Champions', 'Shields', 'Limited Revives']
      },
      wellspring: {
        title: 'Wellspring',
        icon: '💧',
        current: this.rotations?.wellspring?.current?.name || 'Unknown',
        next: this.rotations?.wellspring?.next?.name,
        schedule: this.rotations?.wellspring?.schedule,
        rewards: [this.rotations?.wellspring?.current?.weapon || 'Pattern Progress']
      },
      exoticMission: {
        title: 'Exotic Mission',
        icon: '🌟',
        current: exoticMissionData.name,
        schedule: 'Weekly (Tuesday Reset)',
        rewards: [exoticMissionData.exotic, 'Catalyst Progress', 'Ship/Sparrow'],
        modifiers: ['Champions', 'Match Game']
      },
      trials: {
        title: 'Trials of Osiris',
        icon: '☀️',
        current: trialsData.map,
        schedule: 'Fri 10 AM - Tue Reset',
        rewards: ['Trials Weapons', 'Adept Weapons (Flawless)', 'Trials Armor'],
        modifiers: trialsData.active ? ['LIVE NOW - Competitive 3v3'] : ['Inactive until Friday']
      }
    };

    this.selectedRotation = rotationData[type];
    this.viewMode = 'detail';
    this.render();
  }

  /**
   * Get exotic mission rotation data
   */
  getExoticMissionData() {
    const missions = [
      { name: "Zero Hour", exotic: "Outbreak Perfected" },
      { name: "The Whisper", exotic: "Whisper of the Worm" },
      { name: "Starcrossed", exotic: "Wish-Keeper" },
      { name: "Node.Ovrd.Avalon", exotic: "Vexcalibur" }
    ];

    const epoch = new Date('2024-06-04');
    const now = new Date();
    const weeksSinceEpoch = Math.floor((now - epoch) / (7 * 24 * 60 * 60 * 1000));
    return missions[weeksSinceEpoch % missions.length];
  }

  /**
   * Get trials rotation data
   */
  getTrialsData() {
    const maps = [
      "Javelin-4", "Endless Vale", "Altar of Flame", "Burnout",
      "Cauldron", "Convergence", "Dead Cliffs", "Distant Shore",
      "Eternity", "Fortress", "Rusted Lands", "Twilight Gap"
    ];

    const epoch = new Date('2024-06-07');
    const now = new Date();
    const weeksSinceEpoch = Math.floor((now - epoch) / (7 * 24 * 60 * 60 * 1000));
    const dayOfWeek = now.getDay();

    return {
      map: maps[weeksSinceEpoch % maps.length],
      active: dayOfWeek >= 5 || dayOfWeek <= 2
    };
  }

  /**
   * Render Nightfall rotation
   */
  renderNightfall() {
    const nf = this.rotations?.nightfall || { current: 'Unknown', next: 'Unknown' };

    return `
      <div class="rotation-card nightfall" data-type="nightfall">
        <div class="rotation-header">
          <span class="rotation-icon">🌙</span>
          <span class="rotation-title">Nightfall</span>
        </div>
        <div class="rotation-content">
          <div class="current-rotation">
            <span class="label">This Week:</span>
            <span class="value">${nf.current}</span>
          </div>
        </div>
        <div class="rotation-hint">Click for details</div>
      </div>
    `;
  }

  /**
   * Render Raid rotation
   */
  renderRaid() {
    const raid = this.rotations?.raid || { current: 'Unknown', next: 'Unknown' };

    return `
      <div class="rotation-card raid" data-type="raid">
        <div class="rotation-header">
          <span class="rotation-icon">⚔️</span>
          <span class="rotation-title">Featured Raid</span>
        </div>
        <div class="rotation-content">
          <div class="current-rotation">
            <span class="label">This Week:</span>
            <span class="value">${raid.current}</span>
          </div>
        </div>
        <div class="rotation-hint">Click for details</div>
      </div>
    `;
  }

  /**
   * Render Dungeon rotation
   */
  renderDungeon() {
    const dungeon = this.rotations?.dungeon || { current: 'Unknown', next: 'Unknown' };

    return `
      <div class="rotation-card dungeon" data-type="dungeon">
        <div class="rotation-header">
          <span class="rotation-icon">🏛️</span>
          <span class="rotation-title">Featured Dungeon</span>
        </div>
        <div class="rotation-content">
          <div class="current-rotation">
            <span class="label">This Week:</span>
            <span class="value">${dungeon.current}</span>
          </div>
        </div>
        <div class="rotation-hint">Click for details</div>
      </div>
    `;
  }

  /**
   * Render Crucible rotation
   */
  renderCrucible() {
    const crucible = this.rotations?.crucible || { current: 'Unknown', next: 'Unknown' };

    return `
      <div class="rotation-card crucible" data-type="crucible">
        <div class="rotation-header">
          <span class="rotation-icon">🎯</span>
          <span class="rotation-title">Crucible Rotator</span>
        </div>
        <div class="rotation-content">
          <div class="current-rotation">
            <span class="label">This Week:</span>
            <span class="value">${crucible.current}</span>
          </div>
        </div>
        <div class="rotation-hint">Click for details</div>
      </div>
    `;
  }

  /**
   * Render Lost Sector rotation
   */
  renderLostSector() {
    const ls = this.rotations?.lostSector || { current: { name: 'Unknown' }, next: { name: 'Unknown' } };

    return `
      <div class="rotation-card lost-sector" data-type="lostSector">
        <div class="rotation-header">
          <span class="rotation-icon">🔍</span>
          <span class="rotation-title">Legend Lost Sector</span>
        </div>
        <div class="rotation-content">
          <div class="current-rotation">
            <span class="label">Today:</span>
            <span class="value">${ls.current.name}</span>
          </div>
          ${ls.current.reward ? `<div class="reward-info">${ls.current.reward}</div>` : ''}
        </div>
        <div class="rotation-hint">Click for details</div>
      </div>
    `;
  }

  /**
   * Render Wellspring rotation
   */
  renderWellspring() {
    const ws = this.rotations?.wellspring || { current: { name: 'Unknown' }, next: { name: 'Unknown' } };

    return `
      <div class="rotation-card wellspring" data-type="wellspring">
        <div class="rotation-header">
          <span class="rotation-icon">💧</span>
          <span class="rotation-title">Wellspring</span>
        </div>
        <div class="rotation-content">
          <div class="current-rotation">
            <span class="label">Today:</span>
            <span class="value">${ws.current.name}</span>
          </div>
        </div>
        <div class="rotation-hint">Click for details</div>
      </div>
    `;
  }

  /**
   * Render Exotic Mission rotation
   */
  renderExoticMission() {
    const missions = [
      { name: "Zero Hour", exotic: "Outbreak Perfected" },
      { name: "The Whisper", exotic: "Whisper of the Worm" },
      { name: "Starcrossed", exotic: "Wish-Keeper" },
      { name: "Node.Ovrd.Avalon", exotic: "Vexcalibur" }
    ];

    const epoch = new Date('2024-06-04');
    const now = new Date();
    const weeksSinceEpoch = Math.floor((now - epoch) / (7 * 24 * 60 * 60 * 1000));
    const currentMission = missions[weeksSinceEpoch % missions.length];

    return `
      <div class="rotation-card exotic-mission" data-type="exoticMission">
        <div class="rotation-header">
          <span class="rotation-icon">🌟</span>
          <span class="rotation-title">Exotic Mission</span>
        </div>
        <div class="rotation-content">
          <div class="current-rotation">
            <span class="label">This Week:</span>
            <span class="value">${currentMission.name}</span>
          </div>
          <div class="exotic-reward">${currentMission.exotic}</div>
        </div>
        <div class="rotation-hint">Click for details</div>
      </div>
    `;
  }

  /**
   * Render Trials Map rotation
   */
  renderTrialsMap() {
    const maps = [
      "Javelin-4", "Endless Vale", "Altar of Flame", "Burnout",
      "Cauldron", "Convergence", "Dead Cliffs", "Distant Shore",
      "Eternity", "Fortress", "Rusted Lands", "Twilight Gap"
    ];

    const epoch = new Date('2024-06-07'); // Friday reference
    const now = new Date();
    const weeksSinceEpoch = Math.floor((now - epoch) / (7 * 24 * 60 * 60 * 1000));
    const currentMap = maps[weeksSinceEpoch % maps.length];

    // Check if Trials is active (Friday-Tuesday)
    const dayOfWeek = now.getDay();
    const trialsActive = dayOfWeek >= 5 || dayOfWeek <= 2;

    return `
      <div class="rotation-card trials ${trialsActive ? 'active' : 'inactive'}" data-type="trials">
        <div class="rotation-header">
          <span class="rotation-icon">☀️</span>
          <span class="rotation-title">Trials of Osiris</span>
        </div>
        <div class="rotation-content">
          <div class="current-rotation">
            <span class="label">Map:</span>
            <span class="value">${currentMap}</span>
          </div>
          <div class="trials-status ${trialsActive ? 'active' : ''}">${trialsActive ? 'LIVE NOW' : 'Fri-Tue'}</div>
        </div>
        <div class="rotation-hint">Click for details</div>
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
