import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Check if we're in the browser
const isClient = typeof window !== 'undefined';

// Initialize Firebase variables with proper types
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

// Function to initialize Firebase
function initializeFirebase() {
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
  };

  // Validate required environment variables
  const requiredEnvVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID'
  ];

  const missingEnvVars = requiredEnvVars.filter(
    (envVar) => !process.env[envVar]
  );

  if (missingEnvVars.length > 0) {
    throw new Error(`Missing required Firebase environment variables: ${missingEnvVars.join(', ')}`);
  }

  // Initialize Firebase only if all required environment variables are present
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);

  return { app, auth, db, storage };
}

// Initialize Firebase only in the browser
if (isClient) {
  try {
    initializeFirebase();
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
    throw error; // Re-throw to prevent silent failures
  }
}

// Export initialized instances or throw error if accessed server-side
export function getFirebaseApp(): FirebaseApp {
  if (!isClient) throw new Error('Firebase can only be accessed client-side');
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!isClient) throw new Error('Firebase can only be accessed client-side');
  return auth;
}

export function getFirebaseDb(): Firestore {
  if (!isClient) throw new Error('Firebase can only be accessed client-side');
  return db;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (!isClient) throw new Error('Firebase can only be accessed client-side');
  return storage;
}

// For backward compatibility
export { app, auth, db, storage }; 