// Main Firebase services export
// This file provides a single entry point for all Firebase services

// Core Firebase
export * from './config';

// Service classes and instances
export { 
  AuthService, 
  authService, 
  isAuthenticated, 
  getCurrentUserId, 
  getCurrentUserEmail,
  getFirebaseAuth 
} from './auth';



// Firebase Admin - Server-side only, DO NOT export to client
// export * from './firebase-admin';

// Backward compatibility with existing firebase.ts
export { getFirebaseApp as app } from './config';
export { getFirebaseAuth as auth } from './auth';