// lib/bungie-api.js
// Comprehensive Bungie API client for all Destiny 2 data

class BungieAPI {
  constructor() {
    this.apiKey = process.env.BUNGIE_API_KEY;
    this.baseUrl = 'https://www.bungie.net/Platform';
    this.statsUrl = 'https://stats.bungie.net/Platform';
  }

  /**
   * Make authenticated API request
   */
  async request(endpoint, accessToken = null, options = {}) {
    const headers = {
      'X-API-Key': this.apiKey,
      'Content-Type': 'application/json'
    };

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    const data = await response.json();

    if (!response.ok || data.ErrorCode !== 1) {
      const error = new Error(data.Message || `API Error: ${response.status}`);
      error.errorCode = data.ErrorCode;
      error.status = response.status;
      throw error;
    }

    return data.Response;
  }

  // ==================== PROFILE & INVENTORY ====================

  /**
   * Get complete player profile with all components
   */
  async getProfile(membershipType, membershipId, accessToken, components = []) {
    if (components.length === 0) {
      // Default comprehensive component list
      components = [
        100, // Profiles
        102, // ProfileInventories (vault)
        103, // ProfileCurrencies
        104, // ProfileProgression
        200, // Characters
        201, // CharacterInventories
        202, // CharacterProgressions
        205, // CharacterEquipment
        300, // ItemInstances
        302, // ItemPerks
        304, // ItemStats
        305, // ItemSockets
        306, // ItemReusablePlugs
        800, // Collectibles
        900, // Records
        1000 // Transitory (current activity)
      ];
    }

    const componentStr = components.join(',');
    return this.request(
      `/Destiny2/${membershipType}/Profile/${membershipId}/?components=${componentStr}`,
      accessToken
    );
  }

  /**
   * Get character-specific data
   */
  async getCharacter(membershipType, membershipId, characterId, accessToken, components = []) {
    if (components.length === 0) {
      components = [200, 201, 202, 205, 300, 302, 304, 305];
    }
    const componentStr = components.join(',');
    return this.request(
      `/Destiny2/${membershipType}/Profile/${membershipId}/Character/${characterId}/?components=${componentStr}`,
      accessToken
    );
  }

  // ==================== ITEM OPERATIONS ====================

  /**
   * Transfer item between character and vault
   */
  async transferItem(membershipType, itemReferenceHash, stackSize, transferToVault, itemId, characterId, accessToken) {
    return this.request('/Destiny2/Actions/Items/TransferItem/', accessToken, {
      method: 'POST',
      body: {
        itemReferenceHash,
        stackSize,
        transferToVault,
        itemId,
        characterId,
        membershipType
      }
    });
  }

  /**
   * Equip item to character
   */
  async equipItem(membershipType, itemId, characterId, accessToken) {
    return this.request('/Destiny2/Actions/Items/EquipItem/', accessToken, {
      method: 'POST',
      body: {
        itemId,
        characterId,
        membershipType
      }
    });
  }

  /**
   * Equip multiple items at once
   */
  async equipItems(membershipType, itemIds, characterId, accessToken) {
    return this.request('/Destiny2/Actions/Items/EquipItems/', accessToken, {
      method: 'POST',
      body: {
        itemIds,
        characterId,
        membershipType
      }
    });
  }

  /**
   * Lock/unlock item
   */
  async setItemLockState(membershipType, itemId, characterId, state, accessToken) {
    return this.request('/Destiny2/Actions/Items/SetLockState/', accessToken, {
      method: 'POST',
      body: {
        state,
        itemId,
        characterId,
        membershipType
      }
    });
  }

  /**
   * Pull item from postmaster
   */
  async pullFromPostmaster(membershipType, itemReferenceHash, stackSize, itemId, characterId, accessToken) {
    return this.request('/Destiny2/Actions/Items/PullFromPostmaster/', accessToken, {
      method: 'POST',
      body: {
        itemReferenceHash,
        stackSize,
        itemId,
        characterId,
        membershipType
      }
    });
  }

  // ==================== LOADOUTS ====================

  /**
   * Equip in-game loadout
   */
  async equipLoadout(membershipType, characterId, loadoutIndex, accessToken) {
    return this.request('/Destiny2/Actions/Loadouts/EquipLoadout/', accessToken, {
      method: 'POST',
      body: {
        loadoutIndex,
        characterId,
        membershipType
      }
    });
  }

  /**
   * Snapshot current loadout
   */
  async snapshotLoadout(membershipType, characterId, loadoutIndex, colorHash, iconHash, nameHash, accessToken) {
    return this.request('/Destiny2/Actions/Loadouts/SnapshotLoadout/', accessToken, {
      method: 'POST',
      body: {
        loadoutIndex,
        characterId,
        membershipType,
        colorHash,
        iconHash,
        nameHash
      }
    });
  }

  // ==================== VENDORS ====================

  /**
   * Get all vendors for character
   */
  async getVendors(membershipType, membershipId, characterId, accessToken) {
    const components = [400, 401, 402].join(','); // Sales, Categories, Sockets
    return this.request(
      `/Destiny2/${membershipType}/Profile/${membershipId}/Character/${characterId}/Vendors/?components=${components}`,
      accessToken
    );
  }

  /**
   * Get specific vendor details
   */
  async getVendor(membershipType, membershipId, characterId, vendorHash, accessToken) {
    const components = [400, 401, 402].join(',');
    return this.request(
      `/Destiny2/${membershipType}/Profile/${membershipId}/Character/${characterId}/Vendors/${vendorHash}/?components=${components}`,
      accessToken
    );
  }

  /**
   * Get public Xur inventory (no auth needed)
   */
  async getPublicXurVendor() {
    // Xur's vendor hash
    const xurHash = 2190858386;
    return this.request(`/Destiny2/Vendors/?components=400,402`);
  }

  // ==================== ACTIVITIES & MILESTONES ====================

  /**
   * Get public milestones (weekly rotations, etc.)
   */
  async getPublicMilestones() {
    return this.request('/Destiny2/Milestones/');
  }

  /**
   * Get activity history for character
   */
  async getActivityHistory(membershipType, membershipId, characterId, mode = 0, count = 25, page = 0) {
    return this.request(
      `/Destiny2/${membershipType}/Account/${membershipId}/Character/${characterId}/Stats/Activities/?mode=${mode}&count=${count}&page=${page}`
    );
  }

  /**
   * Get post-game carnage report
   */
  async getPGCR(activityId) {
    return this.request(`/Destiny2/Stats/PostGameCarnageReport/${activityId}/`);
  }

  /**
   * Get player stats
   */
  async getHistoricalStats(membershipType, membershipId, characterId = '0') {
    return this.request(
      `/Destiny2/${membershipType}/Account/${membershipId}/Character/${characterId}/Stats/`
    );
  }

  /**
   * Get account-wide stats
   */
  async getAccountStats(membershipType, membershipId, groups = [1, 2, 3]) {
    const groupStr = groups.join(',');
    return this.request(
      `/Destiny2/${membershipType}/Account/${membershipId}/Stats/?groups=${groupStr}`
    );
  }

  // ==================== CLAN / GROUPS ====================

  /**
   * Get clan for user
   */
  async getGroupsForMember(membershipType, membershipId) {
    return this.request(`/GroupV2/User/${membershipType}/${membershipId}/0/1/`);
  }

  /**
   * Get clan details
   */
  async getClan(groupId) {
    return this.request(`/GroupV2/${groupId}/`);
  }

  /**
   * Get clan members
   */
  async getClanMembers(groupId, currentpage = 1) {
    return this.request(`/GroupV2/${groupId}/Members/?currentpage=${currentpage}`);
  }

  /**
   * Get clan weekly reward state
   */
  async getClanWeeklyRewardState(groupId) {
    return this.request(`/Destiny2/Clan/${groupId}/WeeklyRewardState/`);
  }

  // ==================== SOCIAL / FRIENDS ====================

  /**
   * Get friends list
   */
  async getFriendList(accessToken) {
    return this.request('/Social/Friends/', accessToken);
  }

  /**
   * Get friend request list
   */
  async getFriendRequestList(accessToken) {
    return this.request('/Social/Friends/Requests/', accessToken);
  }

  /**
   * Get platform friends
   */
  async getPlatformFriendList(friendPlatform, accessToken) {
    return this.request(`/Social/PlatformFriends/${friendPlatform}/`, accessToken);
  }

  // ==================== NEWS & CONTENT ====================

  /**
   * Get Destiny 2 news articles from public RSS feed
   * This fetches from the public RSS endpoint which has fresher data than Platform API
   */
  async getNewsArticles(pageToken = '', categoryFilter = 'destiny') {
    // Use public RSS feed directly instead of Platform API for fresher content
    const rssUrl = `https://www.bungie.net/en/Rss/News${categoryFilter ? `?category=${categoryFilter}` : ''}`;

    const response = await fetch(rssUrl, {
      headers: {
        'Accept': 'application/rss+xml, application/xml, text/xml',
      }
    });

    if (!response.ok) {
      throw new Error(`RSS fetch failed: ${response.status}`);
    }

    const xmlText = await response.text();

    // Parse RSS XML to extract articles
    const articles = this.parseRssXml(xmlText);

    return { NewsArticles: articles };
  }

  /**
   * Parse RSS XML and extract news articles
   */
  parseRssXml(xmlText) {
    const articles = [];

    // Simple regex-based XML parsing for RSS items
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xmlText)) !== null) {
      const itemXml = match[1];

      const getTag = (tag) => {
        const tagMatch = itemXml.match(new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}>([\\s\\S]*?)<\\/${tag}>`));
        return tagMatch ? (tagMatch[1] || tagMatch[2] || '').trim() : '';
      };

      articles.push({
        Title: getTag('title'),
        Link: getTag('link'),
        Description: getTag('description'),
        PubDate: getTag('pubDate'),
        ImagePath: this.extractImageFromDescription(getTag('description'))
      });
    }

    return articles;
  }

  /**
   * Extract image URL from RSS description HTML
   */
  extractImageFromDescription(description) {
    const imgMatch = description.match(/src=["']([^"']+)["']/);
    if (imgMatch && imgMatch[1]) {
      let imgUrl = imgMatch[1];
      // Convert to relative path if it's a bungie.net URL
      if (imgUrl.includes('bungie.net')) {
        imgUrl = imgUrl.replace(/https?:\/\/www\.bungie\.net/, '');
      }
      return imgUrl;
    }
    return null;
  }

  /**
   * Get content by ID
   */
  async getContentById(id, locale = 'en') {
    return this.request(`/Content/GetContentById/${id}/${locale}/`);
  }

  // ==================== MANIFEST ====================

  /**
   * Get manifest metadata
   */
  async getManifest() {
    return this.request('/Destiny2/Manifest/');
  }

  /**
   * Get definition from manifest
   */
  async getDestinyEntityDefinition(entityType, hashIdentifier) {
    return this.request(`/Destiny2/Manifest/${entityType}/${hashIdentifier}/`);
  }

  // ==================== SEARCH ====================

  /**
   * Search for player by name
   */
  async searchDestinyPlayer(membershipType, displayName) {
    return this.request(`/Destiny2/SearchDestinyPlayer/${membershipType}/${encodeURIComponent(displayName)}/`);
  }

  /**
   * Search by Bungie global display name
   */
  async searchByGlobalNamePost(displayNamePrefix, page = 0) {
    return this.request('/User/Search/GlobalName/' + page + '/', null, {
      method: 'POST',
      body: {
        displayNamePrefix
      }
    });
  }

  // ==================== SEASONS ====================

  /**
   * Get current season info from profile
   */
  async getSeasonInfo(membershipType, membershipId, accessToken) {
    const profile = await this.getProfile(membershipType, membershipId, accessToken, [100, 104, 202]);

    return {
      currentSeasonHash: profile.profile?.data?.currentSeasonHash,
      currentSeasonRewardPowerCap: profile.profile?.data?.currentSeasonRewardPowerCap,
      seasonHashes: profile.profile?.data?.seasonHashes,
      characterProgressions: profile.characterProgressions?.data
    };
  }

  // ==================== RECORDS / TRIUMPHS ====================

  /**
   * Get records (triumphs) for profile
   */
  async getRecords(membershipType, membershipId, accessToken) {
    return this.getProfile(membershipType, membershipId, accessToken, [900]);
  }

  // ==================== COLLECTIBLES ====================

  /**
   * Get collectibles for profile
   */
  async getCollectibles(membershipType, membershipId, accessToken) {
    return this.getProfile(membershipType, membershipId, accessToken, [800]);
  }
}

module.exports = new BungieAPI();
