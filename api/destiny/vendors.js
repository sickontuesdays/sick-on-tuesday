// api/destiny/vendors.js
// Get vendor data (Xur, Banshee, Ada-1, etc.)

const bungieOAuth = require('../../lib/bungie-oauth');
const bungieAPI = require('../../lib/bungie-api');

// Known vendor hashes (name -> hash mapping for convenience)
const VENDOR_HASHES = {
  xur: 2190858386,
  banshee: 672118013,
  ada1: 350061650,
  drifter: 248695599,
  zavala: 69482069,
  shaxx: 3603221665,
  saint14: 765357505,
  saladin: 895295461,
  rahool: 2255782930,
  tess: 3361454721,
  ikora: 1976548992,
  hawthorne: 3347378076,
  devrim: 396892126,
  failsafe: 1576276905,
  eris: 1616085565,
  petra: 1841717884,
  variks: 2531198101
};

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { vendor, characterId } = req.query;

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

    if (!characterId) {
      return res.status(400).json({ error: 'Missing characterId parameter' });
    }

    let result;

    if (vendor) {
      // Determine vendor hash - accept either name string or hash number
      let vendorHash;

      if (!isNaN(vendor)) {
        // It's a number (hash passed directly)
        vendorHash = parseInt(vendor);
      } else if (VENDOR_HASHES[vendor.toLowerCase()]) {
        // It's a known vendor name
        vendorHash = VENDOR_HASHES[vendor.toLowerCase()];
      } else {
        return res.status(400).json({ error: 'Unknown vendor' });
      }

      // Get specific vendor
      result = await bungieAPI.getVendor(
        user.primaryMembershipType,
        user.primaryMembershipId,
        characterId,
        vendorHash,
        accessToken
      );
    } else {
      // Get all vendors
      result = await bungieAPI.getVendors(
        user.primaryMembershipType,
        user.primaryMembershipId,
        characterId,
        accessToken
      );
    }

    res.status(200).json({
      vendorData: result,
      vendorHashes: VENDOR_HASHES,
      fetchTimestamp: Date.now()
    });

  } catch (error) {
    console.error('Vendor fetch error:', error);
    res.status(error.status || 500).json({
      error: error.message || 'Failed to fetch vendor data',
      errorCode: error.errorCode
    });
  }
};
