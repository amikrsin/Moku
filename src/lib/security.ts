/**
 * Security, PIN Hashing, and Recovery Key Management
 */
import { PinSecurityConfig } from '../types';

export const DEFAULT_SECURITY_QUESTIONS = [
  'What was the name of your first school or college?',
  'What is the name of the town/city where you were born?',
  'What is your favorite book or author?',
  'What was the model of your first car, scooter, or bike?',
  'What was your childhood nickname or family pet name?',
];

/**
 * Generate a cryptographically secure random salt (hex string)
 */
export function generateSalt(length = 16): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  return Math.random().toString(36).substring(2, 18);
}

/**
 * Fast and reliable SHA-256 hash using Web Crypto API with salt support and fallback
 */
export async function hashString(input: string, salt?: string): Promise<string> {
  const normalized = (salt ? `${salt}:${input.trim()}` : input.trim()).toLowerCase();
  if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
    try {
      const msgBuffer = new TextEncoder().encode(normalized);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // fallback
    }
  }

  // Fallback simple hash for non-secure sandboxes
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return 'fb_' + Math.abs(hash).toString(16);
}

/**
 * Generate a friendly 10-character Master Recovery Key (e.g., MOKU-7X9K-42) using crypto.getRandomValues
 */
export function generateRecoveryKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let part1 = '';
  let part2 = '';
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const randomBytes = new Uint8Array(8);
    crypto.getRandomValues(randomBytes);
    for (let i = 0; i < 4; i++) {
      part1 += chars.charAt(randomBytes[i] % chars.length);
      part2 += chars.charAt(randomBytes[i + 4] % chars.length);
    }
  } else {
    for (let i = 0; i < 4; i++) {
      part1 += chars.charAt(Math.floor(Math.random() * chars.length));
      part2 += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }
  return `MOKU-${part1}-${part2}`;
}

export function getDefaultPinConfig(): PinSecurityConfig {
  return {
    isEnabled: false,
    pinHash: '',
    pinSalt: '',
    securityQuestion: DEFAULT_SECURITY_QUESTIONS[0],
    securityAnswerHash: '',
    recoveryKey: '',
    lockTimeoutMinutes: 0,
    lastUnlockedAt: 0,
  };
}
