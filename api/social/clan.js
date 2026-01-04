// api/social/clan.js
// Get clan data, members, and weekly rewards

const bungieOAuth = require('../../lib/bungie-oauth');
const bungieAPI = require('../../lib/bungie-api');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action } = req.query;

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

    // First, get user's clan
    const groups = await bungieAPI.getGroupsForMember(
      user.primaryMembershipType,
      user.primaryMembershipId
    );

    if (!groups.results || groups.results.length === 0) {
      return res.status(200).json({
        hasClan: false,
        message: 'User is not in a clan'
      });
    }

    const clanGroup = groups.results.find(g => g.group.groupType === 1);
    if (!clanGroup) {
      return res.status(200).json({
        hasClan: false,
        message: 'User is not in a Destiny clan'
      });
    }

    const groupId = clanGroup.group.groupId;

    // Handle different actions
    let responseData = {
      hasClan: true,
      clan: {
        groupId: clanGroup.group.groupId,
        name: clanGroup.group.name,
        motto: clanGroup.group.motto,
        about: clanGroup.group.about,
        memberCount: clanGroup.group.memberCount,
        creationDate: clanGroup.group.creationDate,
        clanCallsign: clanGroup.group.clanInfo?.clanCallsign,
        clanBannerData: clanGroup.group.clanInfo?.clanBannerData,
        avatarPath: clanGroup.group.avatarPath,
        theme: clanGroup.group.theme
      },
      member: {
        memberType: clanGroup.member.memberType,
        isOnline: clanGroup.member.isOnline,
        groupId: clanGroup.member.groupId,
        joinDate: clanGroup.member.joinDate
      }
    };

    if (action === 'members') {
      // Get clan members
      const page = parseInt(req.query.page) || 1;
      const members = await bungieAPI.getClanMembers(groupId, page);

      responseData.members = {
        results: (members.results || []).map(m => ({
          memberType: m.memberType,
          isOnline: m.isOnline,
          lastOnlineStatusChange: m.lastOnlineStatusChange,
          joinDate: m.joinDate,
          destinyUserInfo: m.destinyUserInfo ? {
            membershipType: m.destinyUserInfo.membershipType,
            membershipId: m.destinyUserInfo.membershipId,
            displayName: m.destinyUserInfo.displayName,
            bungieGlobalDisplayName: m.destinyUserInfo.bungieGlobalDisplayName,
            bungieGlobalDisplayNameCode: m.destinyUserInfo.bungieGlobalDisplayNameCode
          } : null,
          bungieNetUserInfo: m.bungieNetUserInfo ? {
            membershipId: m.bungieNetUserInfo.membershipId,
            displayName: m.bungieNetUserInfo.displayName
          } : null
        })),
        totalResults: members.totalResults,
        hasMore: members.hasMore
      };
    }

    if (action === 'rewards' || action === 'weekly') {
      // Get weekly reward state
      try {
        const rewards = await bungieAPI.getClanWeeklyRewardState(groupId);
        responseData.weeklyRewards = rewards;
      } catch (e) {
        console.warn('Could not fetch weekly rewards:', e.message);
        responseData.weeklyRewards = null;
      }
    }

    responseData.fetchTimestamp = Date.now();

    res.status(200).json(responseData);

  } catch (error) {
    console.error('Clan fetch error:', error);
    res.status(error.status || 500).json({
      error: error.message || 'Failed to fetch clan data',
      errorCode: error.errorCode
    });
  }
};
