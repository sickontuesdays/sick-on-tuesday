// api/auth/bungie-callback.js
// Handle OAuth callback from Bungie

const bungieOAuth = require('../../lib/bungie-oauth');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code, state, error: oauthError, error_description } = req.query;

    if (oauthError) {
      console.error('OAuth error from Bungie:', oauthError, error_description);
      return res.redirect(`/?error=${encodeURIComponent(oauthError)}`);
    }

    if (!code || !state) {
      console.error('Missing required OAuth parameters');
      return res.redirect('/?error=invalid_callback');
    }

    const storedState = req.cookies?.oauth_state;

    if (!storedState || storedState !== state) {
      console.error('State mismatch - possible CSRF attempt');
      return res.redirect('/?error=state_mismatch');
    }

    console.log('State verified, exchanging code for tokens...');

    const tokenResponse = await bungieOAuth.exchangeCodeForTokens(code);

    if (!tokenResponse.access_token) {
      throw new Error('No access token received');
    }

    console.log('Tokens received, fetching user info...');

    const userInfo = await bungieOAuth.getUserInfo(tokenResponse.access_token);

    if (!userInfo?.bungieNetUser) {
      throw new Error('Failed to get user profile');
    }

    const userData = bungieOAuth.processUserData(userInfo);

    const sessionData = {
      user: userData,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      tokenType: tokenResponse.token_type || 'Bearer',
      expiresAt: Date.now() + (tokenResponse.expires_in * 1000),
      expiresIn: tokenResponse.expires_in,
      membershipId: tokenResponse.membership_id,
      issuedAt: Date.now()
    };

    const sessionToken = await bungieOAuth.createSessionToken(sessionData);

    res.setHeader('Set-Cookie', [
      bungieOAuth.createSecureCookie('bungie_session', sessionToken, 7 * 24 * 60 * 60),
      bungieOAuth.createLogoutCookie('oauth_state')
    ]);

    console.log('Authentication successful:', userData.displayName);

    res.redirect('/?auth=success');

  } catch (error) {
    console.error('OAuth callback error:', error);

    res.setHeader('Set-Cookie', [
      bungieOAuth.createLogoutCookie('bungie_session'),
      bungieOAuth.createLogoutCookie('oauth_state')
    ]);

    res.redirect(`/?error=${encodeURIComponent(error.message || 'auth_failed')}`);
  }
};
