// DEPRECATED: This file is replaced by the new infrastructure architecture
// Please use: import { app, auth, db, storage } from '@/infrastructure/firebase';

// Backward compatibility exports
export { 
  getFirebaseApp as app,
  getFirebaseAuth as auth,
  getFirestore as db,
  getFirebaseStorage as storage
} from './index'; 