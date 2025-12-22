// lib/auth-client.js
// Vanilla JavaScript authentication manager (replaces React hooks)

class AuthManager extends EventTarget {
  constructor() {
    super()

    // State
    this.session = null
    this.isLoading = true
    this.error = null

    // Initialize
    this.init()
  }

  // Initialize the auth manager
  init() {
    console.log('🔐 Initializing authentication manager...')

    // Check session on startup
    this.checkSession()

    // Check session every 5 minutes
    this.sessionInterval = setInterval(() => {
      this.checkSession()
    }, 5 * 60 * 1000)

    // Handle page visibility changes (check when page becomes visible)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.checkSession()
      }
    })

    // Check for auth success/error in URL parameters
    this.handleAuthRedirect()
  }

  // Handle auth redirect with success/error parameters
  handleAuthRedirect() {
    const urlParams = new URLSearchParams(window.location.search)
    const authParam = urlParams.get('auth')
    const errorParam = urlParams.get('error')
    const descParam = urlParams.get('desc')

    if (authParam === 'success') {
      console.log('🎉 Authentication successful!')
      // Clear URL parameters
      this.clearUrlParams()
      // Force session check
      this.checkSession()
    } else if (errorParam) {
      const errorMessage = descParam ? `${errorParam}: ${decodeURIComponent(descParam)}` : errorParam
      console.error('❌ Authentication error:', errorMessage)
      this.setError(`Login failed: ${errorMessage}`)
      this.clearUrlParams()
    }
  }

  // Clear auth-related URL parameters
  clearUrlParams() {
    const url = new URL(window.location)
    url.searchParams.delete('auth')
    url.searchParams.delete('error')
    url.searchParams.delete('desc')
    window.history.replaceState({}, document.title, url.toString())
  }

  // Check current session
  async checkSession() {
    try {
      this.setLoading(true)
      this.clearError()

      const response = await fetch('/api/auth/session', {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })

      if (response.ok) {
        const data = await response.json()

        if (data.authenticated && data.user) {
          this.setSession({
            user: data.user,
            expiresAt: data.expiresAt,
            timeUntilExpiry: data.timeUntilExpiry,
            needsRefresh: data.needsRefresh
          })

          console.log('✅ Session active:', {
            user: data.user.displayName,
            expiresIn: Math.round(data.timeUntilExpiry / 1000 / 60) + ' minutes'
          })

          // If session needs refresh, it was already handled by the API
          if (data.needsRefresh) {
            console.log('🔄 Session will be refreshed on next API call')
          }
        } else {
          this.setSession(null)
          console.log('ℹ️ No active session')
        }
      } else {
        console.error('❌ Session check failed:', response.status)
        this.setSession(null)
      }
    } catch (error) {
      console.error('❌ Error checking session:', error)
      this.setError('Failed to check authentication status')
      this.setSession(null)
    } finally {
      this.setLoading(false)
    }
  }

  // Login (redirect to Bungie OAuth)
  login(redirectUrl = '/') {
    try {
      // Store intended destination
      if (redirectUrl !== '/') {
        sessionStorage.setItem('auth_redirect', redirectUrl)
      }

      console.log('🔗 Redirecting to Bungie OAuth...')

      // Redirect to Bungie OAuth
      window.location.href = '/api/auth/bungie-login'
    } catch (error) {
      console.error('❌ Error initiating login:', error)
      this.setError('Failed to initiate login')
    }
  }

  // Logout
  async logout() {
    try {
      this.setLoading(true)

      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })

      if (response.ok) {
        this.setSession(null)
        console.log('👋 Logged out successfully')

        // Clear any stored redirect
        sessionStorage.removeItem('auth_redirect')

        // Optionally reload the page to clear state
        window.location.reload()
      } else {
        console.error('❌ Logout failed:', response.status)
        // Clear session locally even if server logout fails
        this.setSession(null)
      }
    } catch (error) {
      console.error('❌ Error during logout:', error)
      this.setError('Logout failed')
      // Clear session anyway
      this.setSession(null)
    } finally {
      this.setLoading(false)
    }
  }

  // Refresh session
  async refreshSession() {
    await this.checkSession()
  }

  // State setters with event emission
  setSession(session) {
    this.session = session
    this.dispatchEvent(new CustomEvent('sessionchange', { detail: session }))
  }

  setLoading(loading) {
    this.isLoading = loading
    this.dispatchEvent(new CustomEvent('loadingchange', { detail: loading }))
  }

  setError(error) {
    this.error = error
    this.dispatchEvent(new CustomEvent('errorchange', { detail: error }))
  }

  clearError() {
    this.setError(null)
  }

  // Getters (equivalent to React hooks)
  getSession() {
    return this.session
  }

  getUser() {
    return this.session?.user || null
  }

  isAuthenticated() {
    return !!this.session?.user
  }

  getDestinyMemberships() {
    return this.session?.user?.destinyMemberships || []
  }

  getPrimaryMembership() {
    const user = this.session?.user
    if (!user) return null

    return {
      membershipType: user.primaryMembershipType,
      membershipId: user.primaryMembershipId
    }
  }

  getPlatforms() {
    return this.session?.user?.platforms || []
  }

  getUserAvatar() {
    return this.session?.user?.avatar || null
  }

  // Get access token for API calls
  getAccessToken() {
    // Note: Access tokens are stored securely in HTTP-only cookies
    // and are sent automatically with API requests
    // This method is for checking if we have an active session
    return this.session ? 'available' : null
  }

  // Check if token needs refresh
  needsRefresh() {
    return this.session?.needsRefresh || false
  }

  // Get time until expiry
  getTimeUntilExpiry() {
    return this.session?.timeUntilExpiry || 0
  }

  // Cleanup
  destroy() {
    if (this.sessionInterval) {
      clearInterval(this.sessionInterval)
    }
  }
}

// Create singleton instance
const authManager = new AuthManager()

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = authManager
} else if (typeof window !== 'undefined') {
  window.authManager = authManager
}

// Also make it available as default export for ES6 modules
export default authManager