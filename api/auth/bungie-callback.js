// api/auth/bungie-callback.js
// Vercel Function to handle OAuth callback from Bungie with proper error handling

const bungieOAuth = require('../../lib/bungie-oauth')

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { code, state, error: oauthError, error_description } = req.query

    console.log('OAuth callback received:', {
      hasCode: !!code,
      hasState: !!state,
      error: oauthError
    })

    // Check for OAuth errors from Bungie
    if (oauthError) {
      console.error('OAuth error from Bungie:', oauthError, error_description)
      return res.redirect(`/?error=${encodeURIComponent(oauthError)}&desc=${encodeURIComponent(error_description || '')}`)
    }

    // Validate required parameters
    if (!code || !state) {
      console.error('Missing required OAuth parameters')
      return res.redirect('/?error=invalid_callback')
    }

    // Verify state parameter for CSRF protection
    const storedState = req.cookies?.oauth_state

    if (!storedState) {
      console.error('No stored state found in cookie')
      return res.redirect('/?error=no_state_cookie')
    }

    if (storedState !== state) {
      console.error('State mismatch - possible CSRF attempt', {
        stored: storedState.substring(0, 8) + '...',
        received: state.substring(0, 8) + '...'
      })
      return res.redirect('/?error=state_mismatch')
    }

    console.log('State verified, exchanging code for tokens...')

    // Exchange authorization code for tokens
    const tokenResponse = await bungieOAuth.exchangeCodeForTokens(code)

    if (!tokenResponse.access_token) {
      console.error('No access token in response:', tokenResponse)
      throw new Error('No access token received')
    }

    console.log('Tokens received, fetching user info...')

    // Get user information
    const userInfo = await bungieOAuth.getUserInfo(tokenResponse.access_token)

    if (!userInfo?.bungieNetUser) {
      console.error('Invalid user info response:', userInfo)
      throw new Error('Failed to get user profile')
    }

    console.log('User info received:', {
      membershipId: userInfo.bungieNetUser.membershipId,
      displayName: userInfo.bungieNetUser.displayName
    })

    // Process user data
    const userData = bungieOAuth.processUserData(userInfo)

    // Create session data
    const sessionData = {
      user: userData,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      tokenType: tokenResponse.token_type || 'Bearer',
      expiresAt: Date.now() + (tokenResponse.expires_in * 1000),
      expiresIn: tokenResponse.expires_in,
      membershipId: tokenResponse.membership_id,
      issuedAt: Date.now()
    }

    // Create JWT session token
    const sessionToken = await bungieOAuth.createSessionToken(sessionData)

    // Set cookies using helper method
    const sessionCookie = bungieOAuth.createSecureCookie('bungie_session', sessionToken, 7 * 24 * 60 * 60)
    const clearStateCookie = bungieOAuth.createLogoutCookie('oauth_state')

    res.setHeader('Set-Cookie', [sessionCookie, clearStateCookie])

    console.log('Authentication successful:', {
      user: userData.displayName,
      platforms: userData.platforms,
      destinyMemberships: userData.destinyMemberships.length
    })

    // Redirect to home with success message
    res.redirect('/?auth=success')

  } catch (error) {
    console.error('OAuth callback error:', error)

    // Log detailed error in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Detailed error:', {
        message: error.message,
        stack: error.stack,
        response: error.response
      })
    }

    // Clear any partial session data
    const clearSessionCookie = bungieOAuth.createLogoutCookie('bungie_session')
    const clearStateCookie = bungieOAuth.createLogoutCookie('oauth_state')

    res.setHeader('Set-Cookie', [clearSessionCookie, clearStateCookie])

    // Redirect with error message
    const errorMessage = error.message || 'Authentication failed'
    res.redirect(`/?error=${encodeURIComponent(errorMessage)}`)
  }
}