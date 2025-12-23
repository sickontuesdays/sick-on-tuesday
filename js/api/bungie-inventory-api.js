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

      // Use server-side endpoint for secure API access
      const response = await fetch('/api/inventory/profile', {
        method: 'GET',
        credentials: 'include', // Include cookies for session authentication
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication expired - please sign in again');
        }
        if (response.status === 429) {
          throw new Error('Rate limited by Bungie API - please wait');
        }
        const errorText = await response.text();
        throw new Error(`API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();

      // Cache the result
      this.cache.set(cacheKey, {
        data: data,
        timestamp: Date.now()
      });

      console.log('✅ Successfully fetched comprehensive user data');
      return data;

    } catch (error) {
      console.error('❌ Error fetching user data:', error);
      throw this.enhanceError(error);
    }
  }

  /**
   * Get specific character data
   * NOTE: Currently using getCompleteUserData() as it includes all character data
   * This method would need a separate server-side endpoint if needed independently
   */
  async getCharacterData(characterId) {
    // For now, use complete data and filter for specific character
    const completeData = await this.getCompleteUserData();

    // Extract character-specific data from complete response
    if (completeData?.profileData?.characters?.data?.[characterId]) {
      return {
        characters: { [characterId]: completeData.profileData.characters.data[characterId] },
        characterInventories: completeData.profileData.characterInventories?.data?.[characterId],
        characterEquipment: completeData.profileData.characterEquipment?.data?.[characterId],
        itemInstances: completeData.profileData.itemInstances?.data,
        itemStats: completeData.profileData.itemStats?.data,
        itemSockets: completeData.profileData.itemSockets?.data
      };
    }

    throw new Error(`Character ${characterId} not found`);
  }

  /**
   * Get vault contents only
   * NOTE: Currently using getCompleteUserData() as it includes vault data
   * This method would need a separate server-side endpoint if needed independently
   */
  async getVaultData() {
    // For now, use complete data and extract vault information
    const completeData = await this.getCompleteUserData();

    return {
      profileInventory: completeData?.profileData?.profileInventory?.data,
      itemInstances: completeData?.profileData?.itemInstances?.data,
      itemStats: completeData?.profileData?.itemStats?.data,
      itemSockets: completeData?.profileData?.itemSockets?.data
    };
  }

  /**
   * Make authenticated request to Bungie API
   * NOTE: This method has been replaced with server-side endpoint calls
   * Direct client-side API calls are not used to avoid exposing API keys
   */
  /*
  async makeAuthenticatedRequest(endpoint) {
    // This method is no longer used - all API calls go through server-side endpoints
    throw new Error('Direct API calls not supported - use server-side endpoints');
  }
  */

  /**
   * Get Bungie API key from environment or configuration
   * NOTE: API keys are now handled server-side only for security
   */
  /*
  getBungieApiKey() {
    // API keys are no longer accessible client-side for security reasons
    throw new Error('API keys are handled server-side only');
  }
  */

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