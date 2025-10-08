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

export { 
  FirestoreService, 
  firestoreService, 
  getFirestore,
  doc,
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  onSnapshot
} from './firestore';

export { 
  StorageService, 
  storageService, 
  uploadImage, 
  uploadDocument, 
  deleteFile,
  getFirebaseStorage 
} from './storage';

// Firebase Admin - Server-side only, DO NOT export to client
// export * from './firebase-admin';

// Backward compatibility with existing firebase.ts
export { getFirebaseApp as app } from './config';
export { getFirebaseAuth as auth } from './auth';
export { getFirestore as db } from './firestore';
export { getFirebaseStorage as storage } from './storage'; 