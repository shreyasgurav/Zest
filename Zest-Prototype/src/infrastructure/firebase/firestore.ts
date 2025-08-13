import { 
  getFirestore as getFirestoreInstance, 
  Firestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  DocumentSnapshot,
  QuerySnapshot,
  QueryConstraint,
  serverTimestamp,
  writeBatch,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { getFirebaseApp } from './config';
import { FIREBASE_CONFIG } from '@/shared/config/constants';
import type { ApiResponse, PaginatedResponse } from '@/shared/types/common';

// Initialize Firestore
let firestoreInstance: Firestore;

export const getFirestore = (): Firestore => {
  if (!firestoreInstance) {
    const app = getFirebaseApp();
    firestoreInstance = getFirestoreInstance(app);
  }
  return firestoreInstance;
};

// Generic document operations
export class FirestoreService {
  private db: Firestore;

  constructor() {
    this.db = getFirestore();
  }

  // Get a single document
  async getDocument<T = any>(collectionName: string, documentId: string): Promise<T | null> {
    try {
      const docRef = doc(this.db, collectionName, documentId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as T;
      }
      
      return null;
    } catch (error) {
      console.error(`Error getting document from ${collectionName}:`, error);
      throw error;
    }
  }

  // Create a new document
  async createDocument<T = any>(collectionName: string, data: Partial<T>, customId?: string): Promise<string> {
    try {
      const timestamp = serverTimestamp();
      const documentData = {
        ...data,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      if (customId) {
        const docRef = doc(this.db, collectionName, customId);
        await setDoc(docRef, documentData);
        return customId;
      } else {
        const collectionRef = collection(this.db, collectionName);
        const docRef = await addDoc(collectionRef, documentData);
        return docRef.id;
      }
    } catch (error) {
      console.error(`Error creating document in ${collectionName}:`, error);
      throw error;
    }
  }

  // Update an existing document
  async updateDocument<T = any>(collectionName: string, documentId: string, data: Partial<T>): Promise<void> {
    try {
      const docRef = doc(this.db, collectionName, documentId);
      const updateData = {
        ...data,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error(`Error updating document in ${collectionName}:`, error);
      throw error;
    }
  }

  // Delete a document
  async deleteDocument(collectionName: string, documentId: string): Promise<void> {
    try {
      const docRef = doc(this.db, collectionName, documentId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error(`Error deleting document from ${collectionName}:`, error);
      throw error;
    }
  }

  // Get multiple documents with query
  async getDocuments<T = any>(
    collectionName: string,
    queryConstraints: QueryConstraint[] = []
  ): Promise<T[]> {
    try {
      const collectionRef = collection(this.db, collectionName);
      const q = query(collectionRef, ...queryConstraints);
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as T[];
    } catch (error) {
      console.error(`Error getting documents from ${collectionName}:`, error);
      throw error;
    }
  }

  // Get paginated documents
  async getPaginatedDocuments<T = any>(
    collectionName: string,
    pageSize: number = 20,
    lastDoc?: DocumentSnapshot,
    queryConstraints: QueryConstraint[] = []
  ): Promise<PaginatedResponse<T>> {
    try {
      const collectionRef = collection(this.db, collectionName);
      const constraints = [...queryConstraints, limit(pageSize)];
      
      if (lastDoc) {
        constraints.push(startAfter(lastDoc));
      }
      
      const q = query(collectionRef, ...constraints);
      const querySnapshot = await getDocs(q);
      
      const documents = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as T[];

      // Get total count (this might be expensive for large collections)
      const totalQuery = query(collectionRef, ...queryConstraints.filter(c => c.type !== 'limit'));
      const totalSnapshot = await getDocs(totalQuery);
      const total = totalSnapshot.size;

      return {
        success: true,
        data: documents,
        pagination: {
          page: lastDoc ? -1 : 1, // We don't track page numbers with cursor pagination
          limit: pageSize,
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      };
    } catch (error) {
      console.error(`Error getting paginated documents from ${collectionName}:`, error);
      throw error;
    }
  }

  // Batch operations
  async batchWrite(operations: Array<{
    type: 'set' | 'update' | 'delete';
    collection: string;
    id: string;
    data?: any;
  }>): Promise<void> {
    try {
      const batch = writeBatch(this.db);
      
      operations.forEach(operation => {
        const docRef = doc(this.db, operation.collection, operation.id);
        
        switch (operation.type) {
          case 'set':
            batch.set(docRef, {
              ...operation.data,
              updatedAt: serverTimestamp()
            });
            break;
          case 'update':
            batch.update(docRef, {
              ...operation.data,
              updatedAt: serverTimestamp()
            });
            break;
          case 'delete':
            batch.delete(docRef);
            break;
        }
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Error executing batch write:', error);
      throw error;
    }
  }

  // Real-time listener
  subscribeToDocument<T = any>(
    collectionName: string, 
    documentId: string, 
    callback: (data: T | null) => void
  ): Unsubscribe {
    const docRef = doc(this.db, collectionName, documentId);
    
    return onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        callback({ id: doc.id, ...doc.data() } as T);
      } else {
        callback(null);
      }
    }, (error) => {
      console.error(`Error listening to document ${documentId}:`, error);
    });
  }

  // Real-time listener for collection
  subscribeToCollection<T = any>(
    collectionName: string,
    callback: (data: T[]) => void,
    queryConstraints: QueryConstraint[] = []
  ): Unsubscribe {
    const collectionRef = collection(this.db, collectionName);
    const q = query(collectionRef, ...queryConstraints);
    
    return onSnapshot(q, (querySnapshot) => {
      const documents = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as T[];
      
      callback(documents);
    }, (error) => {
      console.error(`Error listening to collection ${collectionName}:`, error);
    });
  }

  // Search documents by field
  async searchDocuments<T = any>(
    collectionName: string,
    field: string,
    value: any,
    operator: '==' | '!=' | '<' | '<=' | '>' | '>=' | 'array-contains' | 'array-contains-any' | 'in' | 'not-in' = '=='
  ): Promise<T[]> {
    try {
      const collectionRef = collection(this.db, collectionName);
      const q = query(collectionRef, where(field, operator, value));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as T[];
    } catch (error) {
      console.error(`Error searching documents in ${collectionName}:`, error);
      throw error;
    }
  }
}

// Create a singleton instance
export const firestoreService = new FirestoreService();

// Export common Firestore utilities
export {
  doc,
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  onSnapshot
};

// Export types
export type {
  DocumentSnapshot,
  QuerySnapshot,
  QueryConstraint,
  Unsubscribe
}; 