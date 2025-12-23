// js/api/bungie-inventory-api.js
// Comprehensive Bungie API client for user inventory and build data

export class BungieInventoryAPI {
  constructor(authManager, manifestLoader) {
    this.authManager = authManager;
    this.manifestLoader = manifestLoader;
    this.baseURL = 'https://www.bungie.net/Platform';
    this.cache = new Map();
    this.rateLimiter = new RateLimiter(8); // Conservative 8 requests per second
  }

  /**
   * Get comprehensive user data for build analysis
   * Includes all characters, equipment, inventories, vault, progressions
   */
  async getCompleteUserData() {
    try {
      // Check authentication
      if (!this.authManager.isAuthenticated()) {
        throw new Error('User not authenticated');
      }

      const user = this.authManager.getUser();
      const primaryMembership = this.authManager.getPrimaryMembership();

      if (!primaryMembership) {
        throw new Error('No primary membership found');
      }

      const cacheKey = `complete_data_${primaryMembership.membershipType}_${primaryMembership.membershipId}`;

      // Check cache (5 minute expiry)
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < 5 * 60 * 1000) {
          console.log('📦 Using cached inventory data');
          return cached.data;
        }
      }

      console.log('🔄 Fetching fresh inventory data from Bungie API...');

      // Rate limiting
      await this.rateLimiter.wait();

      // Comprehensive component list for complete build data
      const components = [
        200, // Characters - Character list and base stats
        201, // CharacterInventories - Non-equipped items
        205, // CharacterEquipment - Currently equipped gear
        102, // ProfileInventories - Vault contents
        103, // ProfileCurrencies - Materials and currencies
        300, // ItemInstances - Unique weapon/armor rolls
        304, // ItemStats - Stat values on items
        305, // ItemSockets - Mod slots and installed mods
        309, // CharacterProgressions - Subclass unlocks, artifact progression
        302, // CharacterActivities - Current activities/loadouts
        900, // Records - Triumph completion (for unlock tracking)
        800  // Collectibles - Collection badges (for exotic tracking)
      ].join(',');

      const url = `/Destiny2/${primaryMembership.membershipType}/Profile/${primaryMembership.membershipId}/?components=${components}`;

      const response = await this.makeAuthenticatedRequest(url);

      // Process and enhance the data
      const processedData = {
        membershipData: {
          membershipType: primaryMembership.membershipType,
          membershipId: primaryMembership.membershipId,
          displayName: user.displayName,
          platforms: user.platforms
        },
        profileData: response,
        fetchTimestamp: Date.now()
      };

      // Cache the result
      this.cache.set(cacheKey, {
        data: processedData,
        timestamp: Date.now()
      });

      console.log('✅ Successfully fetched comprehensive user data');
      return processedData;

    } catch (error) {
      console.error('❌ Error fetching user data:', error);
      throw this.enhanceError(error);
    }
  }

  /**
   * Get specific character data
   */
  async getCharacterData(characterId) {
    try {
      const primaryMembership = this.authManager.getPrimaryMembership();
      if (!primaryMembership) {
        throw new Error('No primary membership found');
      }

      await this.rateLimiter.wait();

      const components = '200,201,205,300,304,305,309,302'; // Character-specific components
      const url = `/Destiny2/${primaryMembership.membershipType}/Profile/${primaryMembership.membershipId}/Character/${characterId}/?components=${components}`;

      return await this.makeAuthenticatedRequest(url);

    } catch (error) {
      console.error('❌ Error fetching character data:', error);
      throw this.enhanceError(error);
    }
  }

  /**
   * Get vault contents only
   */
  async getVaultData() {
    try {
      const primaryMembership = this.authManager.getPrimaryMembership();
      if (!primaryMembership) {
        throw new Error('No primary membership found');
      }

      await this.rateLimiter.wait();

      const components = '102,300,304,305'; // Profile inventory with item details
      const url = `/Destiny2/${primaryMembership.membershipType}/Profile/${primaryMembership.membershipId}/?components=${components}`;

      return await this.makeAuthenticatedRequest(url);

    } catch (error) {
      console.error('❌ Error fetching vault data:', error);
      throw this.enhanceError(error);
    }
  }

  /**
   * Make authenticated request to Bungie API
   */
  async makeAuthenticatedRequest(endpoint) {
    const accessToken = this.authManager.getAccessToken();
    if (!accessToken) {
      throw new Error('No access token available');
    }

    const headers = {
      'X-API-Key': process.env.BUNGIE_API_KEY || this.getBungieApiKey(),
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'GET',
      headers: headers
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication expired - please sign in again');
      }
      if (response.status === 429) {
        throw new Error('Rate limited by Bungie API - please wait');
      }
      throw new Error(`Bungie API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Check Bungie-specific error codes
    if (data.ErrorCode !== 1) {
      throw new Error(`Bungie Error ${data.ErrorCode}: ${data.Message}`);
    }

    return data.Response;
  }

  /**
   * Get Bungie API key from environment or configuration
   */
  getBungieApiKey() {
    // In a real implementation, this should come from environment variables
    // For now, we'll assume it's available through the auth system
    return this.authManager.apiKey || null;
  }

  /**
   * Enhance error messages for better user experience
   */
  enhanceError(error) {
    if (error.message?.includes('401')) {
      return new Error('Your session has expired. Please sign in again.');
    }
    if (error.message?.includes('429')) {
      return new Error('Too many requests. Please wait a moment and try again.');
    }
    if (error.message?.includes('network')) {
      return new Error('Network error. Please check your connection.');
    }
    return error;
  }

  /**
   * Clear cache (useful for forcing refresh)
   */
  clearCache() {
    this.cache.clear();
    console.log('🗑️ API cache cleared');
  }

  /**
   * Get cache status
   */
  getCacheStatus() {
    return {
      entries: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

/**
 * Rate limiter to respect Bungie API limits
 */
class RateLimiter {
  constructor(requestsPerSecond = 10) {
    this.requestsPerSecond = requestsPerSecond;
    this.requests = [];
  }

  async wait() {
    const now = Date.now();
    const oneSecondAgo = now - 1000;

    // Remove old requests
    this.requests = this.requests.filter(time => time > oneSecondAgo);

    // Wait if limit exceeded
    if (this.requests.length >= this.requestsPerSecond) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = oldestRequest + 1000 - now;
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.wait(); // Recursive call to recheck
      }
    }

    this.requests.push(now);
  }
}

export default BungieInventoryAPI;