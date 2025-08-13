'use client';

import React, { useState, useRef } from 'react';
import { storage } from '@/infrastructure/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { FaCamera, FaTrash } from 'react-icons/fa';
import styles from './PhotoUpload.module.css';

interface PhotoUploadProps {
  currentImageUrl?: string;
  onImageChange: (imageUrl: string) => void;
  type: 'profile' | 'banner';
}

const PhotoUpload: React.FC<PhotoUploadProps> = ({
  currentImageUrl,
  onImageChange,
  type
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image size should be less than 10MB');
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Auto upload when file is selected
    handleUpload(file);
  };

  const handleUpload = async (file: File) => {
    setLoading(true);
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error('User not authenticated. Please login again.');
      }

      const fileName = `${type}/${user.uid}/${Date.now()}.jpg`;
      const storageRef = ref(storage(), fileName);
      
      const metadata = {
        contentType: file.type,
        customMetadata: {
          uploadedBy: user.uid,
          uploadTime: new Date().toISOString(),
          imageType: type
        }
      };

      const uploadResult = await uploadBytes(storageRef, file, metadata);
      const downloadURL = await getDownloadURL(uploadResult.ref);
      
      onImageChange(downloadURL);
      
      // Clean up preview URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(null);
      setSelectedFile(null);
      
    } catch (error) {
      console.error('Upload error:', error);
      if (error instanceof Error) {
        alert(`Failed to upload image: ${error.message}`);
      } else {
        alert('Failed to upload image. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveImage = () => {
    onImageChange('');
  };

  // Cleanup preview URL on unmount
  React.useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <div className={styles.photoUploadContainer}>
      <div className={styles.uploadArea}>
        {currentImageUrl ? (
          <div className={styles.currentImageContainer}>
            <img 
              src={currentImageUrl} 
              alt={`Current ${type}`}
              className={type === 'profile' ? styles.profilePreview : styles.bannerPreview}
            />
            <div className={styles.imageActions}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={styles.changeButton}
                disabled={loading}
              >
                <FaCamera /> {loading ? 'Uploading...' : 'Change'}
              </button>
              <button
                type="button"
                onClick={handleRemoveImage}
                className={styles.removeButton}
                disabled={loading}
              >
                <FaTrash /> Remove
              </button>
            </div>
          </div>
        ) : (
          <div 
            className={`${styles.uploadPrompt} ${type === 'profile' ? styles.profilePrompt : styles.bannerPrompt}`}
            onClick={() => !loading && fileInputRef.current?.click()}
            style={{ cursor: loading ? 'wait' : 'pointer' }}
          >
            <FaCamera className={styles.uploadIcon} />
            <span>{loading ? 'Uploading...' : `Upload ${type === 'profile' ? 'Profile Photo' : 'Banner Image'}`}</span>
            <small>Click to select image (up to 10MB)</small>
          </div>
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className={styles.hiddenInput}
          disabled={loading}
        />
      </div>
    </div>
  );
};

export default PhotoUpload; 