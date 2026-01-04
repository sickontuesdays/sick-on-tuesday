/**
 * Clan Panel - Clan info, roster, and weekly progress
 */

import { apiClient } from '../api/bungie-api-client.js';

export class ClanPanel {
  constructor(containerEl) {
    this.container = containerEl;
    this.clanInfo = null;
    this.clanMembers = null;
    this.currentTab = 'overview';
  }

  /**
   * Initialize clan panel
   */
  async init() {
    this.render();
  }

  /**
   * Load clan data
   */
  async load() {
    try {
      this.showLoading();

      const data = await apiClient.getClan();
      this.clanInfo = data.clanInfo;
      this.clanMembers = data.members;

      this.render();
    } catch (error) {
      console.error('Clan load error:', error);
      this.showError(error.message);
    }
  }

  /**
   * Render clan panel
   */
  render() {
    if (!this.clanInfo) {
      this.showAuthRequired();
      return;
    }

    let html = `
      <div class="clan-panel">
        <div class="clan-header">
          ${this.renderClanHeader()}
        </div>
        <div class="clan-tabs">
          <button class="tab-btn ${this.currentTab === 'overview' ? 'active' : ''}" data-tab="overview">Overview</button>
          <button class="tab-btn ${this.currentTab === 'roster' ? 'active' : ''}" data-tab="roster">Roster</button>
          <button class="tab-btn ${this.currentTab === 'progress' ? 'active' : ''}" data-tab="progress">Progress</button>
        </div>
        <div class="clan-content">
          ${this.renderContent()}
        </div>
      </div>
    `;

    this.container.innerHTML = html;
    this.attachEventListeners();
  }

  /**
   * Render clan header
   */
  renderClanHeader() {
    const clan = this.clanInfo;
    const banner = clan.clanBannerData;

    return `
      <div class="clan-banner">
        <div class="clan-emblem" style="background-color: ${this.getBannerColor(banner?.decalColor)}">
          <span class="clan-tag">[${clan.clanInfo?.clanCallsign || 'CLAN'}]</span>
        </div>
        <div class="clan-info">
          <h3 class="clan-name">${clan.name || 'Unknown Clan'}</h3>
          <div class="clan-motto">"${clan.motto || ''}"</div>
          <div class="clan-stats">
            <span class="member-count">${clan.memberCount || 0} Members</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render content based on current tab
   */
  renderContent() {
    switch (this.currentTab) {
      case 'overview':
        return this.renderOverview();
      case 'roster':
        return this.renderRoster();
      case 'progress':
        return this.renderProgress();
      default:
        return this.renderOverview();
    }
  }

  /**
   * Render overview tab
   */
  renderOverview() {
    const clan = this.clanInfo;

    return `
      <div class="clan-overview">
        <div class="about-section">
          <h4>About</h4>
          <p>${clan.about || 'No description provided.'}</p>
        </div>

        <div class="clan-stats-grid">
          <div class="stat-card">
            <span class="stat-value">${clan.memberCount || 0}</span>
            <span class="stat-label">Members</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">${this.getOnlineCount()}</span>
            <span class="stat-label">Online</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">${this.getActiveThisWeek()}</span>
            <span class="stat-label">Active This Week</span>
          </div>
        </div>

        <div class="clan-features">
          <h4>Clan Features</h4>
          <div class="feature-list">
            <div class="feature-item ${clan.features?.invitePermissionOverride ? 'enabled' : 'disabled'}">
              Open Invites: ${clan.features?.invitePermissionOverride ? 'Yes' : 'No'}
            </div>
            <div class="feature-item ${clan.allowChat ? 'enabled' : 'disabled'}">
              Clan Chat: ${clan.allowChat ? 'Enabled' : 'Disabled'}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render roster tab
   */
  renderRoster() {
    if (!this.clanMembers || this.clanMembers.length === 0) {
      return '<div class="no-data">No members found</div>';
    }

    // Sort by online status first, then by name
    const sorted = [...this.clanMembers].sort((a, b) => {
      const aOnline = a.isOnline ? 1 : 0;
      const bOnline = b.isOnline ? 1 : 0;
      if (bOnline !== aOnline) return bOnline - aOnline;
      return (a.destinyUserInfo?.displayName || '').localeCompare(b.destinyUserInfo?.displayName || '');
    });

    let html = '<div class="roster-list">';

    sorted.forEach(member => {
      const user = member.destinyUserInfo || {};
      const bungie = member.bungieNetUserInfo || {};
      const isOnline = member.isOnline;

      html += `
        <div class="roster-item ${isOnline ? 'online' : 'offline'}">
          <div class="member-avatar">
            <span class="status-dot ${isOnline ? 'online' : 'offline'}"></span>
          </div>
          <div class="member-info">
            <div class="member-name">
              ${user.bungieGlobalDisplayName || bungie.displayName || user.displayName || 'Unknown'}
              ${user.bungieGlobalDisplayNameCode ? `<span class="name-code">#${user.bungieGlobalDisplayNameCode}</span>` : ''}
            </div>
            <div class="member-role">${this.getMemberRole(member.memberType)}</div>
          </div>
          <div class="member-status">
            ${isOnline ? '<span class="online-badge">Online</span>' : '<span class="offline-badge">Offline</span>'}
          </div>
        </div>
      `;
    });

    html += '</div>';
    return html;
  }

  /**
   * Render progress tab
   */
  renderProgress() {
    // This would show clan weekly progress, challenges, etc.
    return `
      <div class="clan-progress">
        <div class="progress-section">
          <h4>Weekly Clan XP</h4>
          <div class="progress-bar-container">
            <div class="progress-bar" style="width: 75%"></div>
            <span class="progress-text">75,000 / 100,000 XP</span>
          </div>
        </div>

        <div class="progress-section">
          <h4>Weekly Engrams Earned</h4>
          <div class="engram-grid">
            <div class="engram earned">Crucible</div>
            <div class="engram earned">Vanguard</div>
            <div class="engram">Gambit</div>
            <div class="engram">Nightfall</div>
          </div>
        </div>

        <div class="progress-section">
          <h4>Clan Challenges</h4>
          <div class="challenge-list">
            <div class="challenge-item completed">
              <span class="challenge-name">Complete Strikes</span>
              <span class="challenge-progress">50/50</span>
            </div>
            <div class="challenge-item">
              <span class="challenge-name">Win Crucible Matches</span>
              <span class="challenge-progress">12/25</span>
            </div>
            <div class="challenge-item">
              <span class="challenge-name">Complete Gambit Matches</span>
              <span class="challenge-progress">8/20</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Get member role string
   */
  getMemberRole(memberType) {
    const roles = {
      0: 'None',
      1: 'Beginner',
      2: 'Member',
      3: 'Admin',
      4: 'Acting Founder',
      5: 'Founder'
    };
    return roles[memberType] || 'Member';
  }

  /**
   * Get online member count
   */
  getOnlineCount() {
    if (!this.clanMembers) return 0;
    return this.clanMembers.filter(m => m.isOnline).length;
  }

  /**
   * Get members active this week
   */
  getActiveThisWeek() {
    if (!this.clanMembers) return 0;

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    return this.clanMembers.filter(m => {
      if (!m.lastOnlineStatusChange) return false;
      const lastOnline = new Date(m.lastOnlineStatusChange * 1000);
      return lastOnline > oneWeekAgo;
    }).length;
  }

  /**
   * Get banner color from data
   */
  getBannerColor(colorData) {
    if (!colorData) return '#4a4a4a';
    const { red, green, blue } = colorData;
    return `rgb(${red || 74}, ${green || 74}, ${blue || 74})`;
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
        <span>Loading clan data...</span>
      </div>
    `;
  }

  /**
   * Show auth required state
   */
  showAuthRequired() {
    this.container.innerHTML = `
      <div class="panel-auth">
        <p>Sign in to view your clan</p>
      </div>
    `;
  }

  /**
   * Show error state
   */
  showError(message) {
    this.container.innerHTML = `
      <div class="panel-error">
        <p>Error loading clan</p>
        <small>${message}</small>
        <button onclick="window.dashboard?.panelManager?.loadPanel('clan')">Retry</button>
      </div>
    `;
  }
}

export default ClanPanel;
