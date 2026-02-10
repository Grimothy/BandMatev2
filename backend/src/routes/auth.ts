import { Router, Request, Response } from 'express';
import { verifyPassword } from '../utils/password';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  saveRefreshToken,
  deleteRefreshToken,
  isRefreshTokenValid,
  deleteAllUserRefreshTokens,
} from '../services/auth';
import {
  isGoogleOAuthEnabled,
  getGoogleAuthUrl,
  exchangeCodeForTokens,
  getGoogleUserInfo,
  findExistingGoogleUser,
  createGoogleUserWithInvitation,
} from '../services/google-oauth';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { loginRateLimiter, authRateLimiter } from '../middleware/rateLimit';
import { config } from '../config/env';
import prisma from '../lib/prisma';

const router = Router();

// Cookie options - only use secure cookies when APP_URL is HTTPS
const isHttps = config.email.appUrl.startsWith('https://');
const cookieOptions = {
  httpOnly: true,
  secure: isHttps,
  sameSite: 'lax' as const,
  path: '/',
};

// Login - with rate limiting to prevent brute force attacks
router.post('/login', loginRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      res.status(401).json({ error: 'No account found with this email or the password is incorrect.' });
      return;
    }

    // Check if user has a password (OAuth users may not have one)
    if (!user.password) {
      res.status(401).json({ error: 'This account uses Google sign-in. Please use the "Continue with Google" button.' });
      return;
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      res.status(401).json({ error: 'No account found with this email or the password is incorrect.' });
      return;
    }

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Save refresh token to database
    await saveRefreshToken(user.id, refreshToken);

    // Update last login timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Set cookies
    res.cookie('accessToken', accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refreshToken', refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      accessToken,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Refresh token - with rate limiting
router.post('/refresh', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      res.status(401).json({ error: 'Refresh token required' });
      return;
    }

    // Verify token is valid in database
    const isValid = await isRefreshTokenValid(refreshToken);
    if (!isValid) {
      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    }

    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      await deleteRefreshToken(refreshToken);
      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    }

    // Get fresh user data
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      await deleteRefreshToken(refreshToken);
      res.status(401).json({ error: 'User not found' });
      return;
    }

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    // Delete old refresh token and save new one
    await deleteRefreshToken(refreshToken);
    await saveRefreshToken(user.id, newRefreshToken);

    // Set cookies
    res.cookie('accessToken', newAccessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', newRefreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      accessToken: newAccessToken,
    });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

// Logout
router.post('/logout', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
      await deleteRefreshToken(refreshToken);
    }

    // Clear cookies
    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/' });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Logout from all devices
router.post('/logout-all', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user) {
      await deleteAllUserRefreshTokens(req.user.id);
    }

    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/' });

    res.json({ message: 'Logged out from all devices' });
  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Get current user
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    res.json({ user: req.user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Check if Google OAuth is enabled
router.get('/google/enabled', (_req: Request, res: Response) => {
  res.json({ enabled: isGoogleOAuthEnabled() });
});

// Initiate Google OAuth flow
router.get('/google', (req: Request, res: Response) => {
  if (!isGoogleOAuthEnabled()) {
    res.status(400).json({ error: 'Google OAuth is not enabled' });
    return;
  }

  // Get invitation token from query if present
  const invitationToken = req.query.invitation as string | undefined;
  const authUrl = getGoogleAuthUrl(invitationToken);
  res.redirect(authUrl);
});

// Google OAuth callback
router.get('/google/callback', async (req: Request, res: Response) => {
  try {
    if (!isGoogleOAuthEnabled()) {
      res.status(400).json({ error: 'Google OAuth is not enabled' });
      return;
    }

    const { code, error: oauthError, state: invitationToken } = req.query;

    if (oauthError) {
      console.error('Google OAuth error:', oauthError);
      // Preserve invitation token in redirect if present
      const redirectUrl = invitationToken 
        ? `${config.email.appUrl}/accept-invite?token=${invitationToken}&error=oauth_denied`
        : `${config.email.appUrl}/login?error=oauth_denied`;
      res.redirect(redirectUrl);
      return;
    }

    if (!code || typeof code !== 'string') {
      const redirectUrl = invitationToken 
        ? `${config.email.appUrl}/accept-invite?token=${invitationToken}&error=no_code`
        : `${config.email.appUrl}/login?error=no_code`;
      res.redirect(redirectUrl);
      return;
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Get user info from Google
    const googleUser = await getGoogleUserInfo(tokens.access_token);

    let user;

    // First, try to find existing user
    user = await findExistingGoogleUser(googleUser);

    if (!user) {
      // User doesn't exist - need invitation
      if (!invitationToken || typeof invitationToken !== 'string') {
        // No invitation token - reject
        res.redirect(`${config.email.appUrl}/login?error=no_account`);
        return;
      }

      try {
        // Create user with invitation
        user = await createGoogleUserWithInvitation(googleUser, invitationToken);
      } catch (err) {
        console.error('Failed to create user with invitation:', err);
        const message = err instanceof Error ? err.message : 'invitation_failed';
        res.redirect(`${config.email.appUrl}/accept-invite?token=${invitationToken}&error=${encodeURIComponent(message)}`);
        return;
      }
    }

    // Update last login timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Generate our JWT tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Save refresh token to database
    await saveRefreshToken(user.id, refreshToken);

    // Set cookies
    res.cookie('accessToken', accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refreshToken', refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Redirect to frontend with success
    res.redirect(`${config.email.appUrl}/login?oauth=success`);
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    res.redirect(`${config.email.appUrl}/login?error=oauth_failed`);
  }
});

export default router;
