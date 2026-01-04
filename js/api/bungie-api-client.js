/**
 * Bungie API Client - Client-side API wrapper with caching and rate limiting
 */

import { authClient } from '../core/auth-client.js';

class RateLimiter {
  constructor(requestsPerSecond = 10) {
    this.requestsPerSecond = requestsPerSecond;
    this.requests = [];
  }

  async wait() {
    const now = Date.now();
    const oneSecondAgo = now - 1000;

    this.requests = this.requests.filter(time => time > oneSecondAgo);

    if (this.requests.length >= this.requestsPerSecond) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = oldestRequest + 1000 - now;
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.wait();
      }
    }

    this.requests.push(now);
  }
}

export class BungieAPIClient {
  constructor() {
    this.cache = new Map();
    this.rateLimiter = new RateLimiter(8);
    this.pendingRequests = new Map();
  }

  /**
   * Make API request with caching and rate limiting
   */
  async request(endpoint, options = {}) {
    const cacheKey = `${endpoint}_${JSON.stringify(options)}`;
    const cacheTTL = options.cacheTTL ?? 5 * 60 * 1000; // 5 min default

    // Check cache
    if (!options.noCache && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < cacheTTL) {
        return cached.data;
      }
    }

    // Dedupe concurrent identical requests
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    const requestPromise = this.executeRequest(endpoint, options);
    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;

      // Cache result
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * Execute API request
   */
  async executeRequest(endpoint, options = {}) {
    await this.rateLimiter.wait();

    const response = await fetch(endpoint, {
      method: options.method || 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    if (!response.ok) {
      const error = new Error(`API Error: ${response.status}`);
      error.status = response.status;
      try {
        error.data = await response.json();
      } catch { }
      throw error;
    }

    return response.json();
  }

  // ==================== PROFILE & INVENTORY ====================

  /**
   * Get complete user profile
   */
  async getProfile() {
    return this.request('/api/inventory/profile');
  }

  /**
   * Transfer item
   */
  async transferItem(itemReferenceHash, stackSize, transferToVault, itemId, characterId) {
    return this.request('/api/inventory/transfer', {
      method: 'POST',
      body: { itemReferenceHash, stackSize, transferToVault, itemId, characterId },
      noCache: true
    });
  }

  /**
   * Equip item(s)
   */
  async equipItems(itemIds, characterId) {
    return this.request('/api/inventory/equip', {
      method: 'POST',
      body: { itemIds, characterId },
      noCache: true
    });
  }

  // ==================== VENDORS ====================

  /**
   * Get all vendors for character
   */
  async getVendors(characterId) {
    return this.request(`/api/destiny/vendors?characterId=${characterId}`);
  }

  /**
   * Get specific vendor
   * @param {number} vendorHash - The vendor's hash (e.g., 2190858386 for Xur)
   * @param {string} characterId - The character ID to check vendor for
   */
  async getVendor(vendorHash, characterId) {
    return this.request(`/api/destiny/vendors?vendor=${vendorHash}&characterId=${characterId}`);
  }

  // ==================== ACTIVITIES & MILESTONES ====================

  /**
   * Get public milestones (weekly rotations)
   */
  async getMilestones() {
    return this.request('/api/destiny/milestones', { cacheTTL: 60 * 60 * 1000 }); // 1 hour
  }

  /**
   * Get activity history
   */
  async getActivities(characterId, mode = 0, count = 25, page = 0) {
    return this.request(
      `/api/destiny/activities?characterId=${characterId}&mode=${mode}&count=${count}&page=${page}`
    );
  }

  /**
   * Get player stats
   */
  async getStats(characterId = null, type = null) {
    let url = '/api/destiny/stats';
    const params = [];
    if (characterId) params.push(`characterId=${characterId}`);
    if (type) params.push(`type=${type}`);
    if (params.length) url += '?' + params.join('&');
    return this.request(url);
  }

  // ==================== SOCIAL ====================

  /**
   * Get friends list
   */
  async getFriends() {
    return this.request('/api/social/friends', { cacheTTL: 60 * 1000 }); // 1 min
  }

  /**
   * Get clan data
   */
  async getClan(action = null) {
    let url = '/api/social/clan';
    if (action) url += `?action=${action}`;
    return this.request(url);
  }

  /**
   * Get clan members
   */
  async getClanMembers(page = 1) {
    return this.request(`/api/social/clan?action=members&page=${page}`);
  }

  // ==================== NEWS ====================

  /**
   * Get Destiny news
   */
  async getNews(page = 0, category = 'destiny') {
    const params = [];
    if (page !== null && page !== undefined) params.push(`page=${page}`);
    if (category) params.push(`category=${category}`);
    const queryString = params.length > 0 ? `?${params.join('&')}` : '';

    return this.request(`/api/destiny/news${queryString}`, {
      cacheTTL: 15 * 60 * 1000 // 15 min
    });
  }

  // ==================== MANIFEST ====================

  /**
   * Get manifest definition
   */
  async getManifestDefinition(tableName) {
    return this.request(`/api/manifest/definition?tableName=${tableName}`, {
      cacheTTL: 24 * 60 * 60 * 1000 // 24 hours
    });
  }

  // ==================== CACHE MANAGEMENT ====================

  /**
   * Clear all cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Clear specific cache entry
   */
  clearCacheEntry(endpoint) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(endpoint)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache stats
   */
  getCacheStats() {
    return {
      entries: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

export const apiClient = new BungieAPIClient();
export default BungieAPIClient;
