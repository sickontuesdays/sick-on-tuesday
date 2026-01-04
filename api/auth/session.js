// api/auth/session.js
// Check and refresh user session

const bungieOAuth = require('../../lib/bungie-oauth');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sessionToken = req.cookies?.bungie_session;

    if (!sessionToken) {
      return res.status(200).json({
        authenticated: false,
        user: null,
        message: 'No session found'
      });
    }

    const sessionData = await bungieOAuth.verifySessionToken(sessionToken);

    if (!sessionData) {
      res.setHeader('Set-Cookie', [bungieOAuth.createLogoutCookie('bungie_session')]);
      return res.status(200).json({
        authenticated: false,
        user: null,
        message: 'Invalid or expired session'
      });
    }

    // Check if token needs refresh (less than 1 hour remaining)
    const timeUntilExpiry = sessionData.expiresAt - Date.now();
    const shouldRefresh = timeUntilExpiry < (60 * 60 * 1000);

    let updatedSession = sessionData;

    if (shouldRefresh && sessionData.refreshToken) {
      try {
        console.log('Refreshing access token...');
        const refreshResponse = await bungieOAuth.refreshAccessToken(sessionData.refreshToken);

        if (refreshResponse.access_token) {
          updatedSession = {
            ...sessionData,
            accessToken: refreshResponse.access_token,
            refreshToken: refreshResponse.refresh_token || sessionData.refreshToken,
            expiresAt: Date.now() + (refreshResponse.expires_in * 1000),
            expiresIn: refreshResponse.expires_in,
            lastRefreshed: Date.now()
          };

          const newSessionToken = await bungieOAuth.createSessionToken(updatedSession);
          res.setHeader('Set-Cookie', [
            bungieOAuth.createSecureCookie('bungie_session', newSessionToken, 7 * 24 * 60 * 60)
          ]);

          console.log('Token refreshed successfully');
        }
      } catch (refreshError) {
        console.error('Failed to refresh token:', refreshError);
      }
    }

    return res.status(200).json({
      authenticated: true,
      user: updatedSession.user,
      expiresAt: new Date(updatedSession.expiresAt).toISOString(),
      timeUntilExpiry: updatedSession.expiresAt - Date.now()
    });

  } catch (error) {
    console.error('Session check error:', error);
    res.setHeader('Set-Cookie', [bungieOAuth.createLogoutCookie('bungie_session')]);
    return res.status(200).json({
      authenticated: false,
      user: null,
      message: 'Session check failed'
    });
  }
};
