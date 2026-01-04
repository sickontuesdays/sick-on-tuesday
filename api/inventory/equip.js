// api/inventory/equip.js
// Equip items to character

const bungieOAuth = require('../../lib/bungie-oauth');
const bungieAPI = require('../../lib/bungie-api');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
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

    const { itemIds, characterId } = req.body;

    if (!characterId) {
      return res.status(400).json({ error: 'Missing characterId' });
    }

    const user = sessionData.user;
    const accessToken = sessionData.accessToken;

    let result;

    // Single item or multiple items
    if (Array.isArray(itemIds) && itemIds.length > 1) {
      result = await bungieAPI.equipItems(
        user.primaryMembershipType,
        itemIds,
        characterId,
        accessToken
      );
    } else {
      const itemId = Array.isArray(itemIds) ? itemIds[0] : itemIds;
      if (!itemId) {
        return res.status(400).json({ error: 'Missing itemId' });
      }
      result = await bungieAPI.equipItem(
        user.primaryMembershipType,
        itemId,
        characterId,
        accessToken
      );
    }

    res.status(200).json({
      success: true,
      result
    });

  } catch (error) {
    console.error('Equip error:', error);
    res.status(error.status || 500).json({
      error: error.message || 'Equip failed',
      errorCode: error.errorCode
    });
  }
};
