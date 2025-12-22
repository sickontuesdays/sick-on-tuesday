// lib/bungie-oauth.js
// Centralized Bungie OAuth implementation for Vercel Functions
// Adapted from the original Next.js version to work with serverless functions

// Using dynamic import for jose since it needs to work in Node.js runtime
let SignJWT, jwtVerify;

// Initialize jose imports
async function initJose() {
  if (!SignJWT) {
    const { SignJWT: JWT, jwtVerify: verify } = await import('jose');
    SignJWT = JWT;
    jwtVerify = verify;
  }
}

class BungieOAuth {
  constructor() {
    this.clientId = process.env.BUNGIE_CLIENT_ID
    this.clientSecret = process.env.BUNGIE_CLIENT_SECRET
    this.apiKey = process.env.BUNGIE_API_KEY
    this.baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

    // OAuth endpoints
    this.authorizationUrl = 'https://www.bungie.net/en/OAuth/Authorize'
    this.tokenUrl = 'https://www.bungie.net/Platform/App/OAuth/Token/'
    this.userInfoUrl = 'https://www.bungie.net/Platform/User/GetMembershipsForCurrentUser/'

    // Ensure redirect URI matches EXACTLY what's in Bungie app settings
    this.redirectUri = `${this.baseUrl}/api/auth/bungie-callback`

    // Initialize JWT secret
    this.secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'default-secret-change-this')
  }

  /**
   * Generate authorization URL for OAuth flow
   */
  getAuthorizationUrl(state) {
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      state: state
    })

    // Note: Bungie doesn't use scope parameter in URL
    // Scope is defined in app settings

    return `${this.authorizationUrl}?${params.toString()}`
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code) {
    try {
      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: this.clientId,
        client_secret: this.clientSecret
      })

      console.log('Token exchange request:', {
        url: this.tokenUrl,
        redirect_uri: this.redirectUri,
        client_id: this.clientId
      })

      const response = await fetch(this.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-API-Key': this.apiKey
        },
        body: body.toString()
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('Token exchange failed:', {
          status: response.status,
          error: data
        })
        throw new Error(`Token exchange failed: ${JSON.stringify(data)}`)
      }

      return data
    } catch (error) {
      console.error('Error exchanging code for tokens:', error)
      throw error
    }
  }

  /**
   * Get user info using access token
   */
  async getUserInfo(accessToken) {
    try {
      const response = await fetch(this.userInfoUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-API-Key': this.apiKey
        }
      })

      const data = await response.json()

      if (!response.ok || data.ErrorCode !== 1) {
        console.error('Failed to get user info:', data)
        throw new Error(`Failed to get user info: ${data.Message || 'Unknown error'}`)
      }

      return data.Response
    } catch (error) {
      console.error('Error fetching user info:', error)
      throw error
    }
  }

  /**
   * Create JWT session token
   */
  async createSessionToken(sessionData) {
    await initJose()

    const token = await new SignJWT(sessionData)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(this.secret)

    return token
  }

  /**
   * Verify JWT session token
   */
  async verifySessionToken(token) {
    await initJose()

    try {
      const { payload } = await jwtVerify(token, this.secret)

      // Check if token is expired
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        return null
      }

      return payload
    } catch (error) {
      console.error('Session verification failed:', error)
      return null
    }
  }

  /**
   * Generate random state for CSRF protection
   */
  generateState(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  /**
   * Process user data from Bungie API response
   */
  processUserData(userInfo) {
    const bungieUser = userInfo.bungieNetUser
    const destinyMemberships = userInfo.destinyMemberships || []

    // Find primary membership
    const primaryMembership = destinyMemberships.find(
      m => m.membershipId === userInfo.primaryMembershipId
    ) || destinyMemberships[0]

    return {
      // User info
      membershipId: bungieUser.membershipId,
      displayName: bungieUser.uniqueName || bungieUser.displayName,
      displayNameCode: bungieUser.displayNameCode,
      profilePicturePath: bungieUser.profilePicturePath,
      profileThemeName: bungieUser.profileThemeName,
      userTitleDisplay: bungieUser.userTitleDisplay,
      locale: bungieUser.locale,

      // Destiny memberships
      destinyMemberships: destinyMemberships.map(m => ({
        membershipType: m.membershipType,
        membershipId: m.membershipId,
        displayName: m.displayName,
        crossSaveOverride: m.crossSaveOverride,
        applicableMembershipTypes: m.applicableMembershipTypes
      })),

      // Primary membership
      primaryMembershipType: primaryMembership?.membershipType,
      primaryMembershipId: primaryMembership?.membershipId,

      // Platform names
      platforms: destinyMemberships.map(m => this.getPlatformName(m.membershipType)),

      // Avatar URL
      avatar: bungieUser.profilePicturePath ?
        `https://www.bungie.net${bungieUser.profilePicturePath}` : null
    }
  }

  /**
   * Get platform name from membership type
   */
  getPlatformName(membershipType) {
    const platforms = {
      0: 'None',
      1: 'Xbox',
      2: 'PlayStation',
      3: 'Steam',
      4: 'Blizzard',
      5: 'Stadia',
      6: 'EpicGames',
      10: 'Demon',
      254: 'BungieNext'
    }
    return platforms[membershipType] || 'Unknown'
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken) {
    try {
      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret
      })

      const response = await fetch(this.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-API-Key': this.apiKey
        },
        body: body.toString()
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('Token refresh failed:', data)
        throw new Error('Failed to refresh token')
      }

      return data
    } catch (error) {
      console.error('Error refreshing token:', error)
      throw error
    }
  }

  /**
   * Helper method to create HTTP-only cookie string
   */
  createSecureCookie(name, value, maxAge = 7 * 24 * 60 * 60) { // 7 days default
    const isProduction = process.env.NODE_ENV === 'production'
    const sameSite = isProduction ? 'None' : 'Lax'
    const secure = isProduction ? 'Secure' : ''

    return `${name}=${value}; Max-Age=${maxAge}; Path=/; HttpOnly; SameSite=${sameSite}; ${secure}`.trim()
  }

  /**
   * Helper method to create logout cookie (expires immediately)
   */
  createLogoutCookie(name) {
    const isProduction = process.env.NODE_ENV === 'production'
    const sameSite = isProduction ? 'None' : 'Lax'
    const secure = isProduction ? 'Secure' : ''

    return `${name}=; Max-Age=0; Path=/; HttpOnly; SameSite=${sameSite}; ${secure}`.trim()
  }
}

// Export singleton instance
const bungieOAuth = new BungieOAuth()

// For CommonJS compatibility in Vercel Functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = bungieOAuth
} else {
  // ES modules export
  export default bungieOAuth
}