// api/inventory/profile.js
// Vercel Function to fetch user profile/inventory data from Bungie API

const bungieOAuth = require('../../lib/bungie-oauth');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify user session
    const sessionToken = req.cookies?.bungie_session;
    if (!sessionToken) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const sessionData = await bungieOAuth.verifySessionToken(sessionToken);
    if (!sessionData) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    // Extract membership info from session
    const user = sessionData.user;
    const accessToken = sessionData.accessToken;

    if (!user.primaryMembershipType || !user.primaryMembershipId) {
      return res.status(400).json({ error: 'No primary membership found' });
    }

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

    const bungieUrl = `https://www.bungie.net/Platform/Destiny2/${user.primaryMembershipType}/Profile/${user.primaryMembershipId}/?components=${components}`;

    console.log('Fetching inventory data for user:', user.displayName);

    // Make request to Bungie API with server-side API key
    const response = await fetch(bungieUrl, {
      method: 'GET',
      headers: {
        'X-API-Key': process.env.BUNGIE_API_KEY,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('Bungie API request failed:', response.status, response.statusText);
      if (response.status === 401) {
        return res.status(401).json({ error: 'Authentication expired' });
      }
      if (response.status === 429) {
        return res.status(429).json({ error: 'Rate limited by Bungie API' });
      }
      return res.status(response.status).json({ error: `Bungie API error: ${response.statusText}` });
    }

    const data = await response.json();

    // Check Bungie-specific error codes
    if (data.ErrorCode !== 1) {
      console.error('Bungie API error:', data.ErrorCode, data.Message);
      return res.status(400).json({
        error: `Bungie Error ${data.ErrorCode}: ${data.Message}`,
        errorCode: data.ErrorCode
      });
    }

    // Return the inventory data with membership info
    const responseData = {
      membershipData: {
        membershipType: user.primaryMembershipType,
        membershipId: user.primaryMembershipId,
        displayName: user.displayName,
        platforms: user.platforms || []
      },
      profileData: data.Response,
      fetchTimestamp: Date.now()
    };

    console.log('Successfully fetched inventory data for:', user.displayName);

    res.status(200).json(responseData);

  } catch (error) {
    console.error('Inventory fetch error:', error);

    if (error.message?.includes('fetch')) {
      return res.status(503).json({
        error: 'Failed to connect to Bungie API',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};