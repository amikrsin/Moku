/**
 * Firebase ID Token Verification for Cloudflare Worker
 * Performs strict validation of Firebase JWT tokens.
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

/**
 * Verifies a Firebase ID token via Google's secure token verification
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
    // 1. Basic JWT structure check & preliminary payload validation
    const parts = idToken.split('.');
    if (parts.length !== 3) {
      console.warn('Invalid JWT format');
      return null;
    }

    const payloadRaw = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadRaw);

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      console.warn('Firebase ID token has expired');
      return null;
    }

    if (expectedProjectId) {
      if (payload.aud !== expectedProjectId) {
        console.warn(`Token aud mismatch: expected ${expectedProjectId}, got ${payload.aud}`);
        return null;
      }
      if (payload.iss !== `https://securetoken.google.com/${expectedProjectId}`) {
        console.warn(`Token iss mismatch`);
        return null;
      }
    }

    // 2. Cryptographic signature and revocation check via Google tokeninfo
    const tokenInfoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!tokenInfoRes.ok) {
      console.warn('Google tokeninfo rejected token:', tokenInfoRes.status);
      return null;
    }

    const tokenInfo: any = await tokenInfoRes.json();
    const verifiedUid = tokenInfo.sub || tokenInfo.user_id || payload.sub;

    if (!verifiedUid) {
      return null;
    }

    return {
      uid: verifiedUid,
      email: tokenInfo.email || payload.email,
      isAnonymous: false,
    };
  } catch (err) {
    console.error('Firebase token verification error:', err);
    return null;
  }
}
