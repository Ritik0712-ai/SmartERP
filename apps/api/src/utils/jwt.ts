import jwt, { SignOptions, JwtPayload } from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { env } from '../config/env';

// ====== JWT (access tokens) ======

export interface AccessTokenPayload extends JwtPayload {
  sub: string; // userId
  email: string;
  type: 'access';
}

export function signAccessToken(payload: { userId: string; email: string }): string {
  const opts: SignOptions = {
    expiresIn: env.jwt.accessExpiresIn as SignOptions['expiresIn'],
  };
  return jwt.sign(
    { sub: payload.userId, email: payload.email, type: 'access' },
    env.jwt.accessSecret,
    opts,
  );
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.jwt.accessSecret) as AccessTokenPayload;
  if (decoded.type !== 'access') {
    throw new Error('Invalid token type');
  }
  return decoded;
}

// ====== Refresh tokens (opaque, hashed) ======

export function generateRefreshToken(): { token: string; tokenHash: string; expiresAt: Date } {
  const token = crypto.randomBytes(64).toString('hex'); // 128-char hex
  const tokenHash = hashRefreshToken(token);
  const expiresAt = new Date(Date.now() + parseExpiryMs(env.jwt.refreshExpiresIn));
  return { token, tokenHash, expiresAt };
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// ====== Passwords ======

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ====== Helpers ======

/**
 * Parses expiry strings like "15m", "7d", "1h" into milliseconds.
 */
function parseExpiryMs(expiry: string): number {
  const match = /^(\d+)([smhd])$/.exec(expiry);
  if (!match) return 7 * 24 * 60 * 60 * 1000; // default 7d
  const value = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      return 7 * 24 * 60 * 60 * 1000;
  }
}
