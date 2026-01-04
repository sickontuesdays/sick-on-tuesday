// api/destiny/activities.js
// Get activity history and stats

const bungieOAuth = require('../../lib/bungie-oauth');
const bungieAPI = require('../../lib/bungie-api');

// Activity mode types
const ACTIVITY_MODES = {
  none: 0,
  story: 2,
  strike: 3,
  raid: 4,
  allPvP: 5,
  patrol: 6,
  allPvE: 7,
  control: 10,
  clash: 12,
  crimsonDoubles: 15,
  nightfall: 16,
  heroicNightfall: 17,
  allStrikes: 18,
  ironBanner: 19,
  allMayhem: 25,
  supremacy: 31,
  survival: 37,
  countdown: 38,
  trialsOfTheNine: 39,
  social: 40,
  trialsCounts: 41,
  trialsOfOsiris: 84,
  dungeon: 82,
  gambit: 63,
  allCompetitive: 69
};

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { characterId, mode, count, page } = req.query;

    const sessionToken = req.cookies?.bungie_session;
    if (!sessionToken) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const sessionData = await bungieOAuth.verifySessionToken(sessionToken);
    if (!sessionData) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const user = sessionData.user;

    if (!characterId) {
      return res.status(400).json({ error: 'Missing characterId parameter' });
    }

    const activityMode = ACTIVITY_MODES[mode] ?? parseInt(mode) ?? 0;
    const activityCount = parseInt(count) || 25;
    const activityPage = parseInt(page) || 0;

    const activities = await bungieAPI.getActivityHistory(
      user.primaryMembershipType,
      user.primaryMembershipId,
      characterId,
      activityMode,
      activityCount,
      activityPage
    );

    res.status(200).json({
      activities,
      activityModes: ACTIVITY_MODES,
      fetchTimestamp: Date.now()
    });

  } catch (error) {
    console.error('Activities fetch error:', error);
    res.status(error.status || 500).json({
      error: error.message || 'Failed to fetch activities',
      errorCode: error.errorCode
    });
  }
};
