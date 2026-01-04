// lib/bungie-oauth.js
// Centralized Bungie OAuth implementation for Vercel Functions

const { SignJWT, jwtVerify } = require('jose');

class BungieOAuth {
  constructor() {
    this.clientId = process.env.BUNGIE_CLIENT_ID;
    this.clientSecret = process.env.BUNGIE_CLIENT_SECRET;
    this.apiKey = process.env.BUNGIE_API_KEY;
    this.baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

    // OAuth endpoints
    this.authorizationUrl = 'https://www.bungie.net/en/OAuth/Authorize';
    this.tokenUrl = 'https://www.bungie.net/Platform/App/OAuth/Token/';
    this.userInfoUrl = 'https://www.bungie.net/Platform/User/GetMembershipsForCurrentUser/';

    // Redirect URI must match Bungie app settings exactly
    this.redirectUri = `${this.baseUrl}/api/auth/bungie-callback`;

    // JWT secret
    this.secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'default-secret-change-this');
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
    });
    return `${this.authorizationUrl}?${params.toString()}`;
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
      });

      const response = await fetch(this.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-API-Key': this.apiKey
        },
        body: body.toString()
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Token exchange failed:', data);
        throw new Error(`Token exchange failed: ${JSON.stringify(data)}`);
      }

      return data;
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      throw error;
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
      });

      const data = await response.json();

      if (!response.ok || data.ErrorCode !== 1) {
        console.error('Failed to get user info:', data);
        throw new Error(`Failed to get user info: ${data.Message || 'Unknown error'}`);
      }

      return data.Response;
    } catch (error) {
      console.error('Error fetching user info:', error);
      throw error;
    }
  }

  /**
   * Create JWT session token
   */
  async createSessionToken(sessionData) {
    const token = await new SignJWT(sessionData)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(this.secret);

    return token;
  }

  /**
   * Verify JWT session token
   */
  async verifySessionToken(token) {
    try {
      const { payload } = await jwtVerify(token, this.secret);

      if (payload.exp && Date.now() >= payload.exp * 1000) {
        return null;
      }

      return payload;
    } catch (error) {
      console.error('Session verification failed:', error);
      return null;
    }
  }

  /**
   * Generate random state for CSRF protection
   */
  generateState(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Process user data from Bungie API response
   */
  processUserData(userInfo) {
    const bungieUser = userInfo.bungieNetUser;
    const destinyMemberships = userInfo.destinyMemberships || [];

    const primaryMembership = destinyMemberships.find(
      m => m.membershipId === userInfo.primaryMembershipId
    ) || destinyMemberships[0];

    return {
      membershipId: bungieUser.membershipId,
      displayName: bungieUser.uniqueName || bungieUser.displayName,
      displayNameCode: bungieUser.displayNameCode,
      profilePicturePath: bungieUser.profilePicturePath,
      profileThemeName: bungieUser.profileThemeName,
      userTitleDisplay: bungieUser.userTitleDisplay,
      locale: bungieUser.locale,

      destinyMemberships: destinyMemberships.map(m => ({
        membershipType: m.membershipType,
        membershipId: m.membershipId,
        displayName: m.displayName,
        crossSaveOverride: m.crossSaveOverride,
        applicableMembershipTypes: m.applicableMembershipTypes
      })),

      primaryMembershipType: primaryMembership?.membershipType,
      primaryMembershipId: primaryMembership?.membershipId,
      platforms: destinyMemberships.map(m => this.getPlatformName(m.membershipType)),
      avatar: bungieUser.profilePicturePath ?
        `https://www.bungie.net${bungieUser.profilePicturePath}` : null
    };
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
    };
    return platforms[membershipType] || 'Unknown';
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
      });

      const response = await fetch(this.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-API-Key': this.apiKey
        },
        body: body.toString()
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Token refresh failed:', data);
        throw new Error('Failed to refresh token');
      }

      return data;
    } catch (error) {
      console.error('Error refreshing token:', error);
      throw error;
    }
  }

  /**
   * Create HTTP-only secure cookie
   */
  createSecureCookie(name, value, maxAge = 7 * 24 * 60 * 60) {
    const isProduction = process.env.NODE_ENV === 'production';
    const sameSite = isProduction ? 'None' : 'Lax';
    const secure = isProduction ? 'Secure' : '';

    return `${name}=${value}; Max-Age=${maxAge}; Path=/; HttpOnly; SameSite=${sameSite}; ${secure}`.trim();
  }

  /**
   * Create logout cookie (expires immediately)
   */
  createLogoutCookie(name) {
    const isProduction = process.env.NODE_ENV === 'production';
    const sameSite = isProduction ? 'None' : 'Lax';
    const secure = isProduction ? 'Secure' : '';

    return `${name}=; Max-Age=0; Path=/; HttpOnly; SameSite=${sameSite}; ${secure}`.trim();
  }
}

const bungieOAuth = new BungieOAuth();
module.exports = bungieOAuth;
