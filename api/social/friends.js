// api/social/friends.js
// Get Bungie friends list with online status and activity

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

    const accessToken = sessionData.accessToken;

    // Get friends list
    const friends = await bungieAPI.getFriendList(accessToken);

    // Process friends to extract relevant data
    const processedFriends = (friends.friends || []).map(friend => ({
      bungieGlobalDisplayName: friend.bungieGlobalDisplayName,
      bungieGlobalDisplayNameCode: friend.bungieGlobalDisplayNameCode,
      bungieNetMembershipId: friend.bungieNetMembershipId,
      onlineStatus: friend.onlineStatus,
      onlineTitle: friend.onlineTitle,
      relationship: friend.relationship,
      lastSeenBungieNetUserMembershipId: friend.lastSeenBungieNetUserMembershipId,
      bungieNetUser: friend.bungieNetUser ? {
        membershipId: friend.bungieNetUser.membershipId,
        displayName: friend.bungieNetUser.displayName,
        profilePicturePath: friend.bungieNetUser.profilePicturePath,
        isOnline: friend.bungieNetUser.isOnline,
        statusText: friend.bungieNetUser.statusText,
        cachedBungieGlobalDisplayName: friend.bungieNetUser.cachedBungieGlobalDisplayName,
        cachedBungieGlobalDisplayNameCode: friend.bungieNetUser.cachedBungieGlobalDisplayNameCode
      } : null,
      destinyUserInfo: friend.destinyUserInfo ? {
        membershipType: friend.destinyUserInfo.membershipType,
        membershipId: friend.destinyUserInfo.membershipId,
        displayName: friend.destinyUserInfo.displayName,
        isPublic: friend.destinyUserInfo.isPublic,
        LastSeenDisplayName: friend.destinyUserInfo.LastSeenDisplayName
      } : null
    }));

    // Sort: online first, then by name
    processedFriends.sort((a, b) => {
      const aOnline = a.onlineStatus === 1 || a.bungieNetUser?.isOnline;
      const bOnline = b.onlineStatus === 1 || b.bungieNetUser?.isOnline;

      if (aOnline && !bOnline) return -1;
      if (!aOnline && bOnline) return 1;

      const aName = a.bungieGlobalDisplayName || a.bungieNetUser?.displayName || '';
      const bName = b.bungieGlobalDisplayName || b.bungieNetUser?.displayName || '';
      return aName.localeCompare(bName);
    });

    res.status(200).json({
      friends: processedFriends,
      totalCount: processedFriends.length,
      onlineCount: processedFriends.filter(f => f.onlineStatus === 1 || f.bungieNetUser?.isOnline).length,
      fetchTimestamp: Date.now()
    });

  } catch (error) {
    console.error('Friends fetch error:', error);
    res.status(error.status || 500).json({
      error: error.message || 'Failed to fetch friends',
      errorCode: error.errorCode
    });
  }
};
