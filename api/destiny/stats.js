// api/destiny/stats.js
// Get player stats (PvP, PvE, overall)

const bungieOAuth = require('../../lib/bungie-oauth');
const bungieAPI = require('../../lib/bungie-api');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { characterId, type } = req.query;

    const sessionToken = req.cookies?.bungie_session;
    if (!sessionToken) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const sessionData = await bungieOAuth.verifySessionToken(sessionToken);
    if (!sessionData) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const user = sessionData.user;

    let stats;

    if (type === 'account') {
      // Account-wide stats
      stats = await bungieAPI.getAccountStats(
        user.primaryMembershipType,
        user.primaryMembershipId
      );
    } else {
      // Character-specific or all characters
      stats = await bungieAPI.getHistoricalStats(
        user.primaryMembershipType,
        user.primaryMembershipId,
        characterId || '0'
      );
    }

    res.status(200).json({
      stats,
      fetchTimestamp: Date.now()
    });

  } catch (error) {
    console.error('Stats fetch error:', error);
    res.status(error.status || 500).json({
      error: error.message || 'Failed to fetch stats',
      errorCode: error.errorCode
    });
  }
};
