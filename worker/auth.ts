/**
 * Firebase ID Token Verification for Cloudflare Worker
 * Performs strict RS256 signature validation against Firebase's public JWKS.
 */

export interface AuthContext {
  uid: string;
  email?: string;
  isAnonymous?: boolean;
}

export interface D1Result<T = unknown> {
  results?: T[];
  success?: boolean;
  meta?: any;
  error?: string;
}

export interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  all<T = unknown>(): Promise<D1Result<T>>;
  run<T = unknown>(): Promise<D1Result<T>>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<any>;
}

export interface WorkerEnv {
  DB?: D1Database;
  FIREBASE_PROJECT_ID?: string;
  NODE_VERSION?: string;
}

const FIREBASE_JWKS_URL =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

interface JWKKey {
  kty: string;
  alg?: string;
  use?: string;
  kid: string;
  n: string;
  e: string;
}

interface JWKCache {
  keys: Map<string, CryptoKey>;
  expiresAt: number;
}

let cachedJwks: JWKCache | null = null;

/**
 * Parses the Cache-Control max-age header to determine expiration in milliseconds.
 */
function parseMaxAge(cacheControlHeader: string | null): number {
  if (!cacheControlHeader) return 3600 * 1000;
  const match = cacheControlHeader.match(/max-age=(\d+)/i);
  if (match && match[1]) {
    const seconds = parseInt(match[1], 10);
    if (!isNaN(seconds) && seconds > 0) {
      return seconds * 1000;
    }
  }
  return 3600 * 1000;
}

/**
 * Fetches and imports Firebase public keys, caching them in memory according to Cache-Control.
 */
async function getFirebasePublicKeys(): Promise<Map<string, CryptoKey>> {
  const now = Date.now();
  if (cachedJwks && cachedJwks.expiresAt > now) {
    return cachedJwks.keys;
  }

  const response = await fetch(FIREBASE_JWKS_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch Firebase JWKS: ${response.status} ${response.statusText}`);
  }

  const maxAgeMs = parseMaxAge(response.headers.get('Cache-Control'));
  const jwksData: { keys?: JWKKey[] } = await response.json();
  const keysArray = jwksData.keys || [];

  const keyMap = new Map<string, CryptoKey>();

  for (const jwk of keysArray) {
    if (jwk.kty === 'RSA' && jwk.kid) {
      try {
        const cryptoKey = await crypto.subtle.importKey(
          'jwk',
          jwk,
          {
            name: 'RSASSA-PKCS1-v1_5',
            hash: { name: 'SHA-256' },
          },
          false,
          ['verify']
        );
        keyMap.set(jwk.kid, cryptoKey);
      } catch (importErr) {
        console.warn(`Failed to import JWK for kid ${jwk.kid}:`, importErr);
      }
    }
  }

  cachedJwks = {
    keys: keyMap,
    expiresAt: now + maxAgeMs,
  };

  return keyMap;
}

/**
 * Base64URL string decoding to Uint8Array.
 */
function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (base64.length % 4)) % 4;
  const padded = base64.padEnd(base64.length + padLength, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Verifies a Firebase ID token via official JWKS RS256 signature verification.
 */
export async function verifyFirebaseIdToken(
  authHeader: string | null,
  expectedProjectId?: string
): Promise<AuthContext | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const idToken = authHeader.substring(7).trim();
  if (!idToken) {
    return null;
  }

  try {
    const parts = idToken.split('.');
    if (parts.length !== 3) {
      console.warn('Invalid JWT format');
      return null;
    }

    const [headerB64, payloadB64, signatureB64] = parts;

    // Decode header
    const headerStr = atob(headerB64.replace(/-/g, '+').replace(/_/g, '/'));
    const header: { alg?: string; kid?: string } = JSON.parse(headerStr);

    if (header.alg !== 'RS256' || !header.kid) {
      console.warn('JWT header does not specify RS256 algorithm or missing kid');
      return null;
    }

    // Decode payload
    const payloadStr = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload: {
      aud?: string;
      iss?: string;
      sub?: string;
      exp?: number;
      iat?: number;
      email?: string;
      user_id?: string;
    } = JSON.parse(payloadStr);

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp < now) {
      console.warn('Firebase ID token has expired');
      return null;
    }

    // Check issued at (allow clock skew of up to 5 minutes into future)
    if (!payload.iat || payload.iat > now + 300) {
      console.warn('Firebase ID token issued in the future');
      return null;
    }

    // Check project ID matching
    if (expectedProjectId) {
      if (payload.aud !== expectedProjectId) {
        console.warn(`Token aud mismatch: expected ${expectedProjectId}, got ${payload.aud}`);
        return null;
      }
      if (payload.iss !== `https://securetoken.google.com/${expectedProjectId}`) {
        console.warn(`Token iss mismatch: expected https://securetoken.google.com/${expectedProjectId}, got ${payload.iss}`);
        return null;
      }
    } else if (payload.iss && !payload.iss.startsWith('https://securetoken.google.com/')) {
      console.warn('Token iss does not start with https://securetoken.google.com/');
      return null;
    }

    // Verify RS256 signature using public key corresponding to header.kid
    const publicKeys = await getFirebasePublicKeys();
    let cryptoKey = publicKeys.get(header.kid);

    // If key not found, try refreshing keys once in case keys were rotated
    if (!cryptoKey) {
      cachedJwks = null;
      const refreshedKeys = await getFirebasePublicKeys();
      cryptoKey = refreshedKeys.get(header.kid);
    }

    if (!cryptoKey) {
      console.warn(`No matching public key found for kid: ${header.kid}`);
      return null;
    }

    const dataToVerify = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const signatureBytes = base64UrlToUint8Array(signatureB64);

    const isValidSignature = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      signatureBytes as any,
      dataToVerify
    );

    if (!isValidSignature) {
      console.warn('Firebase ID token RS256 signature verification failed');
      return null;
    }

    const verifiedUid = payload.sub || payload.user_id;
    if (!verifiedUid) {
      console.warn('Token payload missing subject (uid)');
      return null;
    }

    return {
      uid: verifiedUid,
      email: payload.email,
      isAnonymous: false,
    };
  } catch (err) {
    console.error('Firebase token verification error:', err);
    return null;
  }
}
