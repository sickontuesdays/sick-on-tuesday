// api/auth/bungie-login.js
// Initiate Bungie OAuth flow

const bungieOAuth = require('../../lib/bungie-oauth');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!process.env.BUNGIE_CLIENT_ID || !process.env.BUNGIE_CLIENT_SECRET || !process.env.BUNGIE_API_KEY) {
      console.error('Missing Bungie OAuth configuration');
      return res.status(500).json({ error: 'OAuth not configured' });
    }

    const state = bungieOAuth.generateState();

    res.setHeader('Set-Cookie', [
      bungieOAuth.createSecureCookie('oauth_state', state, 600)
    ]);

    const authUrl = bungieOAuth.getAuthorizationUrl(state);

    console.log('Initiating OAuth flow for client:', process.env.BUNGIE_CLIENT_ID);

    res.redirect(302, authUrl);

  } catch (error) {
    console.error('Error in bungie-login:', error);
    res.redirect('/?error=oauth_init_failed');
  }
};
