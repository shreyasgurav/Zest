import { FirebaseApp } from 'firebase/app';
import { Auth } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';
import { FirebaseStorage } from 'firebase/storage';

// Check if we're in the browser
const isClient = typeof window !== 'undefined';

// Initialize Firebase variables with proper types
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

// Function to initialize Firebase
async function initializeFirebase() {
  if (!isClient) return;

  try {
    const { initializeFirebase } = await import('./initFirebase');
    app = initializeFirebase();

    const { getAuth } = await import('firebase/auth');
    const { getFirestore } = await import('firebase/firestore');
    const { getStorage } = await import('firebase/storage');

    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
    throw error;
  }
}

// Initialize Firebase only in the browser
if (isClient) {
  initializeFirebase().catch(console.error);
}

// Export functions that ensure Firebase is initialized
export function getFirebaseApp(): FirebaseApp {
  if (!isClient) throw new Error('Firebase can only be accessed client-side');
  if (!app) throw new Error('Firebase app not initialized');
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!isClient) throw new Error('Firebase can only be accessed client-side');
  if (!auth) throw new Error('Firebase auth not initialized');
  return auth;
}

export function getFirebaseDb(): Firestore {
  if (!isClient) throw new Error('Firebase can only be accessed client-side');
  if (!db) throw new Error('Firebase Firestore not initialized');
  return db;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (!isClient) throw new Error('Firebase can only be accessed client-side');
  if (!storage) throw new Error('Firebase storage not initialized');
  return storage;
}

// For backward compatibility
export { app, auth, db, storage }; 