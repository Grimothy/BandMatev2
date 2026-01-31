import { config } from '../config/env';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { getInvitationByToken, acceptInvitation } from './invitations';

const prisma = new PrismaClient();

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  refresh_token?: string;
  id_token?: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

export { GoogleUserInfo };

/**
 * Check if Google OAuth is enabled and properly configured
 */
export function isGoogleOAuthEnabled(): boolean {
  return (
    config.google.enabled &&
    !!config.google.clientId &&
    !!config.google.clientSecret
  );
}

/**
 * Generate the Google OAuth authorization URL
 * Optionally includes invitation token in state parameter
 */
export function getGoogleAuthUrl(invitationToken?: string): string {
  const params = new URLSearchParams({
    client_id: config.google.clientId,
    redirect_uri: config.google.callbackUrl,
    response_type: 'code',
    scope: 'email profile',
    access_type: 'offline',
    prompt: 'consent',
  });

  // Include invitation token in state if provided
  if (invitationToken) {
    params.set('state', invitationToken);
  }

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<GoogleTokenResponse> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: config.google.clientId,
      client_secret: config.google.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: config.google.callbackUrl,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code for tokens: ${error}`);
  }

  return response.json() as Promise<GoogleTokenResponse>;
}

/**
 * Get user info from Google using access token
 */
export async function getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get user info: ${error}`);
  }

  return response.json() as Promise<GoogleUserInfo>;
}

/**
 * Find existing user by Google profile (for returning users)
 * Returns null if user doesn't exist
 */
export async function findExistingGoogleUser(googleUser: GoogleUserInfo) {
  // Check if user exists with this Google ID
  let user = await prisma.user.findFirst({
    where: {
      authProvider: 'google',
      providerId: googleUser.id,
    },
  });

  if (user) {
    // Update user info in case it changed
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: googleUser.name,
        avatarUrl: googleUser.picture,
      },
    });
    return user;
  }

  // Check if user exists with same email (local account) - link it
  const existingUser = await prisma.user.findUnique({
    where: { email: googleUser.email },
  });

  if (existingUser) {
    // Link the Google account to existing user
    user = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        authProvider: 'google',
        providerId: googleUser.id,
        avatarUrl: googleUser.picture || existingUser.avatarUrl,
      },
    });
    return user;
  }

  // User doesn't exist
  return null;
}

/**
 * Create a new user from Google profile using an invitation
 * Requires a valid invitation token
 */
export async function createGoogleUserWithInvitation(
  googleUser: GoogleUserInfo,
  invitationToken: string
) {
  // Validate invitation
  const invitation = await getInvitationByToken(invitationToken);
  
  if (!invitation) {
    throw new Error('Invalid or expired invitation');
  }

  // Verify invitation email matches Google email
  if (invitation.email.toLowerCase() !== googleUser.email.toLowerCase()) {
    throw new Error('Google account email does not match invitation email');
  }

  // Create the user
  const user = await prisma.user.create({
    data: {
      id: uuidv4(),
      email: googleUser.email,
      name: invitation.name || googleUser.name,
      password: null, // OAuth users don't have passwords
      authProvider: 'google',
      providerId: googleUser.id,
      avatarUrl: googleUser.picture,
      role: invitation.role,
    },
  });

  // Accept the invitation (marks as used and adds to projects)
  await acceptInvitation(invitationToken, user.id);

  return user;
}
