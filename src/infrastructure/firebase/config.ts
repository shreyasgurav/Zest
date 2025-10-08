import { initializeApp, getApps, FirebaseApp } from 'firebase/app';

// Firebase configuration interface
interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

// Get Firebase configuration from environment variables
const getFirebaseConfig = (): FirebaseConfig => {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
  };

  // Validate required fields
  const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
  const missingFields = requiredFields.filter(field => !config[field as keyof typeof config]);

  if (missingFields.length > 0) {
    throw new Error(`Missing Firebase configuration: ${missingFields.join(', ')}`);
  }

  // Debug: Log configuration status (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('Firebase Config Check:', {
      apiKey: config.apiKey ? 'Set' : 'Missing',
      authDomain: config.authDomain ? 'Set' : 'Missing',
      projectId: config.projectId ? 'Set' : 'Missing',
      storageBucket: config.storageBucket ? 'Set' : 'Missing',
      messagingSenderId: config.messagingSenderId ? 'Set' : 'Missing',
      appId: config.appId ? 'Set' : 'Missing',
      measurementId: config.measurementId ? 'Set' : 'Not provided'
    });
  }

  return config as FirebaseConfig;
};

// Initialize Firebase app
let firebaseApp: FirebaseApp;

export const initializeFirebase = (): FirebaseApp => {
  if (!firebaseApp) {
    const config = getFirebaseConfig();
    
    // Check if an app is already initialized
    if (getApps().length === 0) {
      firebaseApp = initializeApp(config);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Firebase app initialized successfully');
        console.log('App Check status: DISABLED (for phone auth compatibility)');
      }
    } else {
      firebaseApp = getApps()[0];
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Using existing Firebase app instance');
      }
    }
  }
  
  return firebaseApp;
};

// Get Firebase app instance
export const getFirebaseApp = (): FirebaseApp => {
  if (!firebaseApp) {
    return initializeFirebase();
  }
  return firebaseApp;
};

// Export the configuration for use in other services
export { getFirebaseConfig };
export type { FirebaseConfig }; 