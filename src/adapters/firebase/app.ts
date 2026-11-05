import { getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const SEED_APP = "hoa-seed";

export function readFirebaseConfig(): FirebaseOptions | null {
  const env = import.meta.env;
  const apiKey = env.VITE_FIREBASE_API_KEY?.trim();
  const authDomain = env.VITE_FIREBASE_AUTH_DOMAIN?.trim();
  const projectId = env.VITE_FIREBASE_PROJECT_ID?.trim();
  const appId = env.VITE_FIREBASE_APP_ID?.trim();
  if (!apiKey || !authDomain || !projectId || !appId) return null;
  return {
    apiKey,
    authDomain,
    projectId,
    appId,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim() || undefined,
  };
}

export function isFirebaseEnabled(): boolean {
  return readFirebaseConfig() !== null;
}

function requireConfig(): FirebaseOptions {
  const config = readFirebaseConfig();
  if (!config) {
    throw new Error(
      "Firebase keys are missing. Copy .env.example to .env, fill in the web app config, and restart the dev server.",
    );
  }
  return config;
}

export function getFirebaseApp(): FirebaseApp {
  const existing = getApps().find((app) => app.name === "[DEFAULT]");
  if (existing) return existing;
  return initializeApp(requireConfig());
}

export function getSeedApp(): FirebaseApp {
  const existing = getApps().find((app) => app.name === SEED_APP);
  if (existing) return existing;
  return initializeApp(requireConfig(), SEED_APP);
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

export function getSeedAuth(): Auth {
  return getAuth(getSeedApp());
}

export function getFirebaseDb(): Firestore {
  return getFirestore(getFirebaseApp());
}

export function getFirebaseStorage(): FirebaseStorage {
  return getStorage(getFirebaseApp());
}
