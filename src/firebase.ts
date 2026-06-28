import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInAnonymously, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Configure Firebase Client from Environment Variables
const firebaseConfig = {
  apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY || "AIzaSyBI4qQRten4GsE6ZWqM9__xYXE8rnAv2LY",
  authDomain: (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN || "elegant-bucksaw-46ppv.firebaseapp.com",
  projectId: (import.meta as any).env.VITE_FIREBASE_PROJECT_ID || "elegant-bucksaw-46ppv",
  storageBucket: (import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET || "elegant-bucksaw-46ppv.firebasestorage.app",
  messagingSenderId: (import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID || "480389351703",
  appId: (import.meta as any).env.VITE_FIREBASE_APP_ID || "1:480389351703:web:206add0e7c9f60b8df8f52"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, "ai-studio-zentora-be26a5fa-8fd0-432f-98ee-915ad9958cc1");
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export function signInGuest() {
  return signInAnonymously(auth);
}

export function registerWithEmailAndPassword(email: string, name: string, pass: string) {
  return createUserWithEmailAndPassword(auth, email, pass).then((userCredential) => {
    return updateProfile(userCredential.user, { displayName: name }).then(() => userCredential);
  });
}

export function loginWithEmailAndPassword(email: string, pass: string) {
  return signInWithEmailAndPassword(auth, email, pass);
}

// Standardized operation types for Firestore Error Reporting
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

/**
 * Mandatory Error Handler for Firestore Permission & Missing Auth Diagnostics
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  
  console.error('Firestore Error Diagnostics:', JSON.stringify(errInfo, null, 2));
  throw new Error(JSON.stringify(errInfo));
}
