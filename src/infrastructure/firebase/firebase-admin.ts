import admin from 'firebase-admin';

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  // Check if we have service account credentials
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  // Skip initialization during build time if credentials are not available
  const isBuildTime = process.env.NODE_ENV === 'production' && !privateKey && !clientEmail;
  
  if (isBuildTime) {
    console.warn('Skipping Firebase Admin SDK initialization during build time - credentials not available');
  } else {
    console.log('Initializing Firebase Admin SDK...');
    console.log('Project ID:', projectId);
    console.log('Client Email:', clientEmail);
    console.log('Private Key exists:', !!privateKey);

    if (privateKey && clientEmail && projectId) {
      try {
        // Use service account credentials
        console.log('Using service account credentials');
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey: privateKey.replace(/\\n/g, '\n'), // Handle escaped newlines
          }),
          projectId,
          databaseURL: `https://${projectId}.firebaseio.com`,
        });
        console.log('Firebase Admin SDK initialized successfully with service account');
      } catch (error) {
        console.error('Failed to initialize Firebase Admin SDK with service account:', error);
        throw error;
      }
    } else if (process.env.NODE_ENV === 'development') {
      // For local development, use emulator or application default credentials
      console.warn('Firebase Admin: Using development mode. Consider setting up service account credentials for production.');
      try {
        admin.initializeApp({
          projectId,
          databaseURL: `https://${projectId}.firebaseio.com`,
        });
        console.log('Firebase Admin SDK initialized in development mode');
      } catch (error) {
        console.error('Failed to initialize Firebase Admin SDK:', error);
        throw new Error('Firebase Admin SDK initialization failed. Please set up service account credentials.');
      }
    } else {
      // Production mode requires service account credentials
      throw new Error('Firebase Admin SDK requires service account credentials in production. Please set FIREBASE_PRIVATE_KEY and FIREBASE_CLIENT_EMAIL environment variables.');
    }
  }
}

// Only create adminDb if Firebase Admin is initialized
let adminDb: admin.firestore.Firestore | null = null;

try {
  if (admin.apps.length > 0) {
    adminDb = admin.firestore();
    // Admin SDK should bypass security rules automatically
    // No need to manually configure emulator settings
  }
} catch (error) {
  console.warn('Firebase Admin Firestore not available:', error);
}

export { adminDb }; 