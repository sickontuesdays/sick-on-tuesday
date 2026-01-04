// api/inventory/profile.js
// Fetch complete user profile and inventory data

const bungieOAuth = require('../../lib/bungie-oauth');
const bungieAPI = require('../../lib/bungie-api');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sessionToken = req.cookies?.bungie_session;
    if (!sessionToken) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const sessionData = await bungieOAuth.verifySessionToken(sessionToken);
    if (!sessionData) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const user = sessionData.user;
    const accessToken = sessionData.accessToken;

    if (!user.primaryMembershipType || !user.primaryMembershipId) {
      return res.status(400).json({ error: 'No primary membership found' });
    }

    console.log('Fetching profile for:', user.displayName);

    const profileData = await bungieAPI.getProfile(
      user.primaryMembershipType,
      user.primaryMembershipId,
      accessToken
    );

    res.status(200).json({
      membershipData: {
        membershipType: user.primaryMembershipType,
        membershipId: user.primaryMembershipId,
        displayName: user.displayName,
        platforms: user.platforms || []
      },
      profileData,
      fetchTimestamp: Date.now()
    });

  } catch (error) {
    console.error('Profile fetch error:', error);

    if (error.status === 401) {
      return res.status(401).json({ error: 'Authentication expired' });
    }
    if (error.status === 429) {
      return res.status(429).json({ error: 'Rate limited by Bungie API' });
    }

    res.status(500).json({
      error: 'Failed to fetch profile',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
