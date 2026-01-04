// api/inventory/transfer.js
// Transfer items between character and vault

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

    const { itemReferenceHash, stackSize, transferToVault, itemId, characterId } = req.body;

    if (!itemReferenceHash || !itemId || !characterId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const user = sessionData.user;
    const accessToken = sessionData.accessToken;

    const result = await bungieAPI.transferItem(
      user.primaryMembershipType,
      itemReferenceHash,
      stackSize || 1,
      transferToVault,
      itemId,
      characterId,
      accessToken
    );

    res.status(200).json({
      success: true,
      result
    });

  } catch (error) {
    console.error('Transfer error:', error);
    res.status(error.status || 500).json({
      error: error.message || 'Transfer failed',
      errorCode: error.errorCode
    });
  }
};
