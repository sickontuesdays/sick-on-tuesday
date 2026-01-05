/**
 * Auth Client - Client-side authentication management
 * Handles session state, login/logout, and user data
 */

export class AuthClient {
  constructor() {
    this.user = null;
    this.isAuthenticated = false;
    this.sessionCheckInterval = null;
    this.listeners = new Set();

    // localStorage keys for persistence
    this.STORAGE_KEYS = {
      AUTH_STATE: 'sot_auth_state',
      USER_DATA: 'sot_user_data',
      LAST_CHECK: 'sot_auth_last_check'
    };
  }

  /**
   * Initialize auth client and check session
   */
  async init() {
    // Restore cached auth state immediately for faster UI update
    this.restoreCachedAuthState();

    // Verify with server (will update if different)
    await this.checkSession();

    // Check session every 5 minutes
    this.sessionCheckInterval = setInterval(() => {
      this.checkSession();
    }, 5 * 60 * 1000);

    // Handle URL params (auth success/error)
    this.handleAuthParams();

    return this;
  }

  /**
   * Restore cached auth state from localStorage
   */
  restoreCachedAuthState() {
    try {
      const cachedState = localStorage.getItem(this.STORAGE_KEYS.AUTH_STATE);
      const cachedUser = localStorage.getItem(this.STORAGE_KEYS.USER_DATA);
      const lastCheck = localStorage.getItem(this.STORAGE_KEYS.LAST_CHECK);

      if (cachedState === 'authenticated' && cachedUser) {
        // Check if the cached state is still reasonably fresh (within 24 hours)
        const lastCheckTime = lastCheck ? parseInt(lastCheck, 10) : 0;
        const hoursSinceCheck = (Date.now() - lastCheckTime) / (1000 * 60 * 60);

        if (hoursSinceCheck < 24) {
          this.isAuthenticated = true;
          this.user = JSON.parse(cachedUser);
          console.log('Auth: Restored cached session');
        }
      }
    } catch (error) {
      console.warn('Auth: Failed to restore cached state:', error);
    }
  }

  /**
   * Cache auth state to localStorage
   */
  cacheAuthState() {
    try {
      if (this.isAuthenticated && this.user) {
        localStorage.setItem(this.STORAGE_KEYS.AUTH_STATE, 'authenticated');
        localStorage.setItem(this.STORAGE_KEYS.USER_DATA, JSON.stringify(this.user));
        localStorage.setItem(this.STORAGE_KEYS.LAST_CHECK, Date.now().toString());
      } else {
        localStorage.removeItem(this.STORAGE_KEYS.AUTH_STATE);
        localStorage.removeItem(this.STORAGE_KEYS.USER_DATA);
        localStorage.removeItem(this.STORAGE_KEYS.LAST_CHECK);
      }
    } catch (error) {
      console.warn('Auth: Failed to cache state:', error);
    }
  }

  /**
   * Check current session status
   */
  async checkSession() {
    try {
      const response = await fetch('/api/auth/session', {
        credentials: 'include'
      });

      const data = await response.json();

      const wasAuthenticated = this.isAuthenticated;

      this.isAuthenticated = data.authenticated;
      this.user = data.user || null;

      // Cache the auth state for persistence
      this.cacheAuthState();

      // Notify listeners if auth state changed
      if (wasAuthenticated !== this.isAuthenticated) {
        this.notifyListeners();
      }

      return data;
    } catch (error) {
      console.error('Session check failed:', error);
      // Don't clear auth state on network errors - keep cached state
      // Only clear if we get a definitive "not authenticated" response
      return { authenticated: this.isAuthenticated, user: this.user };
    }
  }

  /**
   * Handle auth URL parameters
   */
  handleAuthParams() {
    const params = new URLSearchParams(window.location.search);

    if (params.get('auth') === 'success') {
      console.log('Authentication successful');
      this.notifyListeners();
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }

    if (params.get('error')) {
      console.error('Auth error:', params.get('error'));
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }

    if (params.get('logout') === 'success') {
      console.log('Logged out successfully');
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }

  /**
   * Initiate login flow
   */
  login() {
    window.location.href = '/api/auth/bungie-login';
  }

  /**
   * Logout user
   */
  async logout() {
    try {
      await fetch('/api/auth/logout', {
        credentials: 'include'
      });

      this.isAuthenticated = false;
      this.user = null;

      // Clear cached auth state
      this.cacheAuthState();

      this.notifyListeners();

      // Optionally redirect
      window.location.href = '/?logout=success';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }

  /**
   * Get current user
   */
  getUser() {
    return this.user;
  }

  /**
   * Get primary Destiny membership
   */
  getPrimaryMembership() {
    if (!this.user) return null;

    return {
      membershipType: this.user.primaryMembershipType,
      membershipId: this.user.primaryMembershipId
    };
  }

  /**
   * Get all Destiny memberships
   */
  getDestinyMemberships() {
    return this.user?.destinyMemberships || [];
  }

  /**
   * Check if authenticated
   */
  checkAuthenticated() {
    return this.isAuthenticated;
  }

  /**
   * Subscribe to auth state changes
   */
  onAuthChange(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of auth change
   */
  notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback({
          isAuthenticated: this.isAuthenticated,
          user: this.user
        });
      } catch (error) {
        console.error('Auth listener error:', error);
      }
    });
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
    }
    this.listeners.clear();
  }
}

// Export singleton instance
export const authClient = new AuthClient();
export default AuthClient;
