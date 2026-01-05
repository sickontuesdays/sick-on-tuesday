/**
 * Friends List Panel - Displays Bungie friends with online status and activity
 */

import { apiClient } from '../api/bungie-api-client.js';
import { authClient } from '../core/auth-client.js';

export class FriendsList {
  constructor(containerEl) {
    this.container = containerEl;
    this.friends = [];
    this.refreshInterval = null;
    this.isExpanded = true;

    // Load expanded state from localStorage (default to expanded)
    const savedState = localStorage.getItem('sot_friends_expanded');
    this.isExpanded = savedState !== 'false';
  }

  /**
   * Initialize friends list
   */
  async init() {
    // Apply initial expanded state
    this.applyExpandedState();

    // Setup header bar click handler
    this.setupHeaderToggle();

    // Listen for auth changes
    authClient.onAuthChange(({ isAuthenticated }) => {
      if (isAuthenticated) {
        this.load();
      } else {
        this.showAuthRequired();
      }
    });

    // Initial load
    if (authClient.checkAuthenticated()) {
      await this.load();
    } else {
      this.showAuthRequired();
    }

    // Start refresh interval (every 60 seconds)
    this.refreshInterval = setInterval(() => {
      if (authClient.checkAuthenticated()) {
        this.load();
      }
    }, 60 * 1000);
  }

  /**
   * Setup header bar toggle
   */
  setupHeaderToggle() {
    const headerBar = document.getElementById('friendsHeaderBar');
    if (headerBar) {
      headerBar.addEventListener('click', () => this.toggleExpanded());
    }
  }

  /**
   * Apply expanded/collapsed state
   */
  applyExpandedState() {
    const sidebar = document.getElementById('friendsSidebar');
    if (sidebar) {
      sidebar.classList.toggle('expanded', this.isExpanded);
    }
  }

  /**
   * Toggle expanded/collapsed state
   */
  toggleExpanded() {
    this.isExpanded = !this.isExpanded;
    localStorage.setItem('sot_friends_expanded', this.isExpanded.toString());
    this.applyExpandedState();
  }

  /**
   * Update online count in header bar
   */
  updateOnlineCount(count) {
    const countEl = document.getElementById('friendsOnlineCount');
    if (countEl) {
      countEl.textContent = count;
    }
  }

  /**
   * Load friends data
   */
  async load() {
    try {
      this.showLoading();

      const data = await apiClient.getFriends();
      this.friends = data.friends || [];

      this.render();

    } catch (error) {
      console.error('Friends list error:', error);
      this.showError(error.message);
    }
  }

  /**
   * Render friends list
   */
  render() {
    const online = this.friends.filter(f => this.isOnline(f));
    const offline = this.friends.filter(f => !this.isOnline(f));

    // Update the online count in the header bar
    this.updateOnlineCount(online.length);

    let html = `
      <div class="friends-list-container">
        <div class="friends-sections">
    `;

    // Online section
    if (online.length > 0) {
      html += `
        <div class="friends-section online">
          <div class="section-header">
            <span class="status-dot online"></span>
            Online (${online.length})
          </div>
          <div class="friends-items">
      `;

      online.forEach(friend => {
        html += this.renderFriendItem(friend, true);
      });

      html += '</div></div>';
    }

    // Offline section (collapsed by default, show first 10)
    if (offline.length > 0) {
      html += `
        <div class="friends-section offline">
          <div class="section-header collapsible" onclick="window.friendsList?.toggleOffline()">
            <span class="status-dot offline"></span>
            Offline (${offline.length})
            <span class="expand-icon">▼</span>
          </div>
          <div class="friends-items collapsed" id="offline-friends">
      `;

      offline.slice(0, 20).forEach(friend => {
        html += this.renderFriendItem(friend, false);
      });

      if (offline.length > 20) {
        html += `<div class="more-friends">+${offline.length - 20} more</div>`;
      }

      html += '</div></div>';
    }

    // Empty state
    if (this.friends.length === 0) {
      html += `
        <div class="no-friends">
          <p>No friends found</p>
          <small>Add friends on Bungie.net</small>
        </div>
      `;
    }

    html += '</div></div>';

    this.container.innerHTML = html;
  }

  /**
   * Render single friend item
   */
  renderFriendItem(friend, isOnline) {
    const name = friend.bungieGlobalDisplayName ||
                 friend.bungieNetUser?.displayName ||
                 'Unknown';

    const nameCode = friend.bungieGlobalDisplayNameCode ?
                     `#${friend.bungieGlobalDisplayNameCode}` : '';

    const avatar = friend.bungieNetUser?.profilePicturePath ?
                   `https://www.bungie.net${friend.bungieNetUser.profilePicturePath}` :
                   null;

    const status = friend.bungieNetUser?.statusText || '';
    const activity = friend.onlineTitle || '';

    return `
      <div class="friend-item ${isOnline ? 'online' : 'offline'}">
        <div class="friend-avatar">
          ${avatar ?
            `<img src="${avatar}" alt="${name}" class="avatar-img">` :
            `<div class="avatar-placeholder">${name.charAt(0).toUpperCase()}</div>`
          }
          <span class="status-indicator ${isOnline ? 'online' : 'offline'}"></span>
        </div>
        <div class="friend-info">
          <div class="friend-name">
            ${name}
            <span class="friend-code">${nameCode}</span>
          </div>
          ${isOnline && activity ? `<div class="friend-activity">${activity}</div>` : ''}
          ${status && !activity ? `<div class="friend-status">${status}</div>` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Check if friend is online
   */
  isOnline(friend) {
    return friend.onlineStatus === 1 ||
           friend.bungieNetUser?.isOnline === true;
  }

  /**
   * Toggle offline section
   */
  toggleOffline() {
    const offlineSection = document.getElementById('offline-friends');
    if (offlineSection) {
      offlineSection.classList.toggle('collapsed');
    }
  }

  /**
   * Show loading state
   */
  showLoading() {
    this.container.innerHTML = `
      <div class="friends-loading">
        <div class="loading-spinner"></div>
        <span>Loading friends...</span>
      </div>
    `;
  }

  /**
   * Show auth required state
   */
  showAuthRequired() {
    // Reset online count
    this.updateOnlineCount(0);

    this.container.innerHTML = `
      <div class="friends-list-container">
        <div class="friends-auth-content">
          <p>Sign in to see your friends</p>
        </div>
      </div>
    `;
  }

  /**
   * Show error state
   */
  showError(message) {
    this.container.innerHTML = `
      <div class="friends-error">
        <h4>Friends</h4>
        <p>Error loading friends</p>
        <button onclick="window.friendsList?.load()">Retry</button>
      </div>
    `;
  }

  /**
   * Refresh friends list
   */
  refresh() {
    if (authClient.checkAuthenticated()) {
      this.load();
    }
  }

  /**
   * Get online friends count
   */
  getOnlineCount() {
    return this.friends.filter(f => this.isOnline(f)).length;
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }
}

export default FriendsList;
