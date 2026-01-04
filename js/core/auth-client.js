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
  }

  /**
   * Initialize auth client and check session
   */
  async init() {
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

      // Notify listeners if auth state changed
      if (wasAuthenticated !== this.isAuthenticated) {
        this.notifyListeners();
      }

      return data;
    } catch (error) {
      console.error('Session check failed:', error);
      this.isAuthenticated = false;
      this.user = null;
      return { authenticated: false, user: null };
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
