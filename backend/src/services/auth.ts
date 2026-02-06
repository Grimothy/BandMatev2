import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../lib/prisma';

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

// Parse expiry string to seconds for jwt.sign
function parseExpiryToSeconds(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 60 * 60; // Default 7 days in seconds

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 60 * 60;
    case 'd': return value * 24 * 60 * 60;
    default: return 7 * 24 * 60 * 60;
  }
}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: parseExpiryToSeconds(config.jwt.accessExpiry),
  });
}

export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: parseExpiryToSeconds(config.jwt.refreshExpiry),
  });
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, config.jwt.accessSecret) as TokenPayload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, config.jwt.refreshSecret) as TokenPayload;
  } catch {
    return null;
  }
}

export async function saveRefreshToken(userId: string, token: string): Promise<void> {
  // Calculate expiry based on config (default 7 days)
  const expiryMs = parseExpiry(config.jwt.refreshExpiry);
  const expiresAt = new Date(Date.now() + expiryMs);

  await prisma.refreshToken.create({
    data: {
      id: uuidv4(),
      token,
      userId,
      expiresAt,
    },
  });
}

export async function deleteRefreshToken(token: string): Promise<void> {
  await prisma.refreshToken.deleteMany({
    where: { token },
  });
}

export async function deleteAllUserRefreshTokens(userId: string): Promise<void> {
  await prisma.refreshToken.deleteMany({
    where: { userId },
  });
}

export async function isRefreshTokenValid(token: string): Promise<boolean> {
  const stored = await prisma.refreshToken.findUnique({
    where: { token },
  });

  if (!stored) return false;
  if (stored.expiresAt < new Date()) {
    await deleteRefreshToken(token);
    return false;
  }

  return true;
}

function parseExpiry(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000; // Default 7 days

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return 7 * 24 * 60 * 60 * 1000;
  }
}

// Cleanup expired tokens periodically
export async function cleanupExpiredTokens(): Promise<void> {
  await prisma.refreshToken.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });
}
