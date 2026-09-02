/**
 * Firebase Client Integration
 * Handles Google Sign-in and Local-Only Mode without fake fallbacks
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as fbSignOut, 
  User, 
  Auth,
  onAuthStateChanged 
} from 'firebase/auth';
import { UserProfile } from '../types';
import { storage } from './storage';

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET;
const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID;
const appId = import.meta.env.VITE_FIREBASE_APP_ID;

export function isFirebaseConfigured(): boolean {
  return !!(
    apiKey && 
    apiKey !== 'AIzaSyFakeKeyForPreviewDemoEnvironment12345' &&
    projectId &&
    projectId !== 'kakeibo-ledger'
  );
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

if (isFirebaseConfigured()) {
  try {
    const firebaseConfig = {
      apiKey,
      authDomain: authDomain || `${projectId}.firebaseapp.com`,
      projectId,
      storageBucket: storageBucket || `${projectId}.appspot.com`,
      messagingSenderId,
      appId,
    };
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0];
    }
    auth = getAuth(app);
  } catch (e) {
    console.error('Failed to initialize Firebase:', e);
  }
}

export function getFirebaseAuth(): Auth | null {
  return auth;
}

export async function getIdToken(): Promise<string | null> {
  if (!auth || !auth.currentUser) return null;
  try {
    return await auth.currentUser.getIdToken();
  } catch (err) {
    console.warn('Failed to retrieve Firebase ID token:', err);
    return null;
  }
}

export async function signInWithGoogle(): Promise<UserProfile> {
  if (!isFirebaseConfigured() || !auth) {
    throw new Error(
      'Cloud sync is not configured. Please add your Firebase environment variables to enable Google sign-in and cloud sync.'
    );
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  // Let real errors bubble up to caller so UI displays actual reason
  const result = await signInWithPopup(auth, provider);
  const user: User = result.user;
  const profile: UserProfile = {
    uid: user.uid,
    displayName: user.displayName || user.email?.split('@')[0] || 'Kakeibo User',
    email: user.email,
    photoURL: user.photoURL,
    isAnonymous: false,
  };

  storage.setUser(profile);
  return profile;
}

export function continueLocally(): UserProfile {
  const localUser: UserProfile = {
    uid: 'device-local-' + (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : '01'),
    displayName: 'This Device (Offline)',
    email: null,
    isAnonymous: true,
  };
  storage.setUser(localUser);
  return localUser;
}

export async function signOut(): Promise<void> {
  if (auth) {
    try {
      await fbSignOut(auth);
    } catch (e) {
      console.warn('Firebase sign out error:', e);
    }
  }
  const guestUser: UserProfile = {
    uid: 'device-user',
    displayName: 'This Device Only',
    email: null,
    isAnonymous: true,
  };
  storage.setUser(guestUser);
}
