'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { firebaseConfig } from './config';

let appCheckInitialized = false;

export function initializeFirebase(): {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
} {
  const isNew = getApps().length === 0;
  const firebaseApp = isNew ? initializeApp(firebaseConfig) : getApp();

  // Initialize App Check only once on client side
  if (typeof window !== 'undefined' && isNew && !appCheckInitialized) {
    appCheckInitialized = true;
    try {
      initializeAppCheck(firebaseApp, {
        provider: new ReCaptchaV3Provider(
          process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? ''
        ),
        isTokenAutoRefreshEnabled: true,
      });
    } catch (e) {
      console.warn('App Check init failed:', e);
    }
  }

  const firestore = getFirestore(firebaseApp);
  const auth = getAuth(firebaseApp);

  return { firebaseApp, firestore, auth };
}

export * from './provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './auth/use-user';
