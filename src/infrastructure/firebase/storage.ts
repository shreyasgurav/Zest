import {
  getStorage,
  FirebaseStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
  getMetadata,
  updateMetadata,
  StorageReference,
  UploadMetadata,
  UploadResult,
  UploadTask,
  uploadBytesResumable
} from 'firebase/storage';
import { getFirebaseApp } from './config';
import { UPLOAD_CONFIG } from '@/shared/config/constants';

// Initialize Firebase Storage
let storageInstance: FirebaseStorage;

export const getFirebaseStorage = (): FirebaseStorage => {
  if (!storageInstance) {
    const app = getFirebaseApp();
    storageInstance = getStorage(app);
  }
  return storageInstance;
};

// Storage service class
export class StorageService {
  private storage: FirebaseStorage;

  constructor() {
    this.storage = getFirebaseStorage();
  }

  // File validation
  private validateFile(file: File, type: 'image' | 'document' = 'image'): void {
    const config = type === 'image' ? UPLOAD_CONFIG.images : UPLOAD_CONFIG.documents;
    
    // Check file size
    if (file.size > config.maxSize) {
      throw new Error(`File size exceeds ${config.maxSize / (1024 * 1024)}MB limit`);
    }
    
    // Check file type
    if (!(config.allowedTypes as unknown as string[]).includes(file.type)) {
      throw new Error(`File type ${file.type} is not allowed`);
    }
    
    // Check file extension
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (extension && !(config.allowedExtensions as unknown as string[]).includes(extension)) {
      throw new Error(`File extension ${extension} is not allowed`);
    }
  }

  // Generate unique filename
  private generateFileName(originalName: string, prefix?: string): string {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);
    const extension = originalName.split('.').pop();
    const nameWithoutExtension = originalName.replace(/\.[^/.]+$/, '');
    
    const safeName = nameWithoutExtension
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 20);
    
    return `${prefix ? prefix + '/' : ''}${timestamp}-${randomId}-${safeName}.${extension}`;
  }

  // Upload file with progress tracking
  async uploadFile(
    file: File,
    path: string,
    options: {
      onProgress?: (progress: number) => void;
      metadata?: UploadMetadata;
      validateAs?: 'image' | 'document';
    } = {}
  ): Promise<{ url: string; path: string; metadata: any }> {
    try {
      // Validate file
      if (options.validateAs) {
        this.validateFile(file, options.validateAs);
      }

      // Create storage reference
      const storageRef = ref(this.storage, path);
      
      // Prepare metadata
      const metadata: UploadMetadata = {
        contentType: file.type,
        customMetadata: {
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
          size: file.size.toString(),
          ...options.metadata?.customMetadata
        },
        ...options.metadata
      };

      // Upload with progress tracking if callback provided
      if (options.onProgress) {
        const uploadTask = uploadBytesResumable(storageRef, file, metadata);
        
        return new Promise((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              options.onProgress!(progress);
            },
            (error) => {
              console.error('Upload error:', error);
              reject(error);
            },
            async () => {
              try {
                const url = await getDownloadURL(uploadTask.snapshot.ref);
                const uploadMetadata = await getMetadata(uploadTask.snapshot.ref);
                resolve({
                  url,
                  path,
                  metadata: uploadMetadata
                });
              } catch (error) {
                reject(error);
              }
            }
          );
        });
      } else {
        // Simple upload without progress
        const uploadResult = await uploadBytes(storageRef, file, metadata);
        const url = await getDownloadURL(uploadResult.ref);
        const uploadMetadata = await getMetadata(uploadResult.ref);
        
        return {
          url,
          path,
          metadata: uploadMetadata
        };
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  // Upload image with automatic path generation
  async uploadImage(
    file: File,
    folder: 'events' | 'profiles' | 'activities' | 'general' = 'general',
    options: {
      onProgress?: (progress: number) => void;
      userId?: string;
    } = {}
  ): Promise<{ url: string; path: string }> {
    this.validateFile(file, 'image');
    
    const fileName = this.generateFileName(file.name);
    const path = `${folder}/${options.userId || 'public'}/${fileName}`;
    
    const result = await this.uploadFile(file, path, {
      onProgress: options.onProgress,
      validateAs: 'image',
      metadata: {
        customMetadata: {
          folder,
          userId: options.userId || 'anonymous',
          category: 'image'
        }
      }
    });
    
    return {
      url: result.url,
      path: result.path
    };
  }

  // Upload document
  async uploadDocument(
    file: File,
    folder: string = 'documents',
    options: {
      onProgress?: (progress: number) => void;
      userId?: string;
    } = {}
  ): Promise<{ url: string; path: string }> {
    this.validateFile(file, 'document');
    
    const fileName = this.generateFileName(file.name);
    const path = `${folder}/${options.userId || 'public'}/${fileName}`;
    
    const result = await this.uploadFile(file, path, {
      onProgress: options.onProgress,
      validateAs: 'document',
      metadata: {
        customMetadata: {
          folder,
          userId: options.userId || 'anonymous',
          category: 'document'
        }
      }
    });
    
    return {
      url: result.url,
      path: result.path
    };
  }

  // Get download URL for existing file
  async getDownloadURL(path: string): Promise<string> {
    try {
      const storageRef = ref(this.storage, path);
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error('Error getting download URL:', error);
      throw error;
    }
  }

  // Delete file
  async deleteFile(path: string): Promise<void> {
    try {
      const storageRef = ref(this.storage, path);
      await deleteObject(storageRef);
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  // Get file metadata
  async getFileMetadata(path: string): Promise<any> {
    try {
      const storageRef = ref(this.storage, path);
      return await getMetadata(storageRef);
    } catch (error) {
      console.error('Error getting file metadata:', error);
      throw error;
    }
  }

  // Update file metadata
  async updateFileMetadata(path: string, metadata: any): Promise<any> {
    try {
      const storageRef = ref(this.storage, path);
      return await updateMetadata(storageRef, metadata);
    } catch (error) {
      console.error('Error updating file metadata:', error);
      throw error;
    }
  }

  // List files in folder
  async listFiles(folderPath: string): Promise<StorageReference[]> {
    try {
      const folderRef = ref(this.storage, folderPath);
      const result = await listAll(folderRef);
      return result.items;
    } catch (error) {
      console.error('Error listing files:', error);
      throw error;
    }
  }

  // Batch delete files
  async deleteFiles(paths: string[]): Promise<void> {
    try {
      const deletePromises = paths.map(path => this.deleteFile(path));
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error deleting files:', error);
      throw error;
    }
  }

  // Get file size
  async getFileSize(path: string): Promise<number> {
    try {
      const metadata = await this.getFileMetadata(path);
      return metadata.size;
    } catch (error) {
      console.error('Error getting file size:', error);
      throw error;
    }
  }

  // Check if file exists
  async fileExists(path: string): Promise<boolean> {
    try {
      await this.getFileMetadata(path);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Create presigned URL (for temporary access)
  async createPresignedURL(path: string, expirationTime: number = 3600000): Promise<string> {
    // Note: Firebase Storage doesn't have presigned URLs like AWS S3
    // This method returns a regular download URL
    // You could implement token-based access control here if needed
    return this.getDownloadURL(path);
  }
}

// Create singleton instance
export const storageService = new StorageService();

// Helper functions
export const uploadImage = (
  file: File,
  folder: 'events' | 'profiles' | 'activities' | 'general' = 'general',
  options?: { onProgress?: (progress: number) => void; userId?: string }
) => storageService.uploadImage(file, folder, options);

export const uploadDocument = (
  file: File,
  folder: string = 'documents',
  options?: { onProgress?: (progress: number) => void; userId?: string }
) => storageService.uploadDocument(file, folder, options);

export const deleteFile = (path: string) => storageService.deleteFile(path);

// Export Firebase Storage utilities
export {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
  getMetadata,
  updateMetadata,
  uploadBytesResumable
};

export type {
  StorageReference,
  UploadMetadata,
  UploadResult,
  UploadTask
}; 