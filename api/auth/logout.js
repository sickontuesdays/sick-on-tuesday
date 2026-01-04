// api/auth/logout.js
// Handle user logout

const bungieOAuth = require('../../lib/bungie-oauth');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    res.setHeader('Set-Cookie', [
      bungieOAuth.createLogoutCookie('bungie_session'),
      bungieOAuth.createLogoutCookie('oauth_state')
    ]);

    // Check if it's an API request or browser redirect
    const acceptHeader = req.headers.accept || '';
    if (acceptHeader.includes('application/json')) {
      return res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
    }

    res.redirect('/?logout=success');

  } catch (error) {
    console.error('Logout error:', error);
    res.redirect('/?error=logout_failed');
  }
};
