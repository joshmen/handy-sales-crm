/**
 * Server-side in-memory store for 2FA temp tokens.
 * Used to avoid passing JWT temp tokens in URL query params during OAuth 2FA redirect.
 * Tokens are one-time use and expire after 60 seconds.
 */
import { randomBytes } from 'crypto';

interface StoredToken {
  tempToken: string;
  expiresAt: number;
}

const store = new Map<string, StoredToken>();

const TTL_MS = 60_000; // 60 seconds
const CLEANUP_INTERVAL = 30_000; // cleanup every 30s

// Periodic cleanup of expired entries
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    store.forEach((value, key) => {
      if (value.expiresAt < now) store.delete(key);
    });
  }, CLEANUP_INTERVAL).unref?.();
}

/** Store a temp token and return a short reference code. */
export function storeTempToken(tempToken: string): string {
  const ref = randomBytes(16).toString('hex');
  store.set(ref, { tempToken, expiresAt: Date.now() + TTL_MS });
  return ref;
}

/** Exchange a reference code for the temp token (one-time use). Returns null if expired/invalid. */
export function exchangeTempToken(ref: string): string | null {
  const entry = store.get(ref);
  if (!entry) return null;
  store.delete(ref); // one-time use
  if (entry.expiresAt < Date.now()) return null;
  return entry.tempToken;
}
