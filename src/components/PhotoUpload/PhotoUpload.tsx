'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import styles from './PhotoUpload.module.css';
import { FaCamera, FaCrop, FaCheck, FaTimes, FaTrash } from 'react-icons/fa';

interface PhotoUploadProps {
  currentImageUrl?: string;
  onImageChange: (imageUrl: string) => void;
  type: 'profile' | 'banner';
  aspectRatio?: number; // width/height ratio
  startWithCropping?: boolean; // New prop to start with cropping existing image
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

const PhotoUpload: React.FC<PhotoUploadProps> = ({
  currentImageUrl,
  onImageChange,
  type,
  aspectRatio = type === 'profile' ? 1 : 3,
  startWithCropping = false
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cropArea, setCropArea] = useState<CropArea>({ x: 0, y: 0, width: 200, height: 200 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const cropperRef = useRef<HTMLDivElement>(null);

  // Start with cropping existing image if requested
  useEffect(() => {
    if (startWithCropping && currentImageUrl) {
      console.log('Starting crop with existing image:', currentImageUrl);
      
      // For Firebase Storage images, we need to create a canvas-compatible version
      if (currentImageUrl.includes('firebasestorage.googleapis.com')) {
        console.log('Firebase Storage image detected, creating canvas-compatible version...');
        
        // Create a new image element to convert to canvas
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            // Create a canvas to convert the image
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            
            if (tempCtx) {
              tempCanvas.width = img.naturalWidth;
              tempCanvas.height = img.naturalHeight;
              tempCtx.drawImage(img, 0, 0);
              
              // Convert to blob and create object URL
              tempCanvas.toBlob((blob) => {
                if (blob) {
                  const objectUrl = URL.createObjectURL(blob);
                  setPreviewUrl(objectUrl);
                  setShowCropper(true);
                  setIsEditingExisting(true);
                  console.log('Canvas-compatible image created');
                } else {
                  console.error('Failed to create blob from canvas');
                  // Fallback to original URL
                  setPreviewUrl(currentImageUrl);
                  setShowCropper(true);
                  setIsEditingExisting(true);
                }
              }, 'image/jpeg', 0.9);
            } else {
              throw new Error('Could not get canvas context');
            }
          } catch (error) {
            console.error('Error creating canvas-compatible image:', error);
            // Fallback to original URL
            setPreviewUrl(currentImageUrl);
            setShowCropper(true);
            setIsEditingExisting(true);
          }
        };
        img.onerror = () => {
          console.error('Failed to load Firebase image, using direct URL');
          // Fallback to original URL
          setPreviewUrl(currentImageUrl);
          setShowCropper(true);
          setIsEditingExisting(true);
        };
        img.src = currentImageUrl;
      } else {
        // Non-Firebase images can be used directly
        setPreviewUrl(currentImageUrl);
        setShowCropper(true);
        setIsEditingExisting(true);
      }
    }
  }, [startWithCropping, currentImageUrl]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    setSelectedFile(file);
    setIsEditingExisting(false);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setShowCropper(true);
  };

  const initializeCrop = useCallback(() => {
    if (!imageRef.current) return;

    const img = imageRef.current;
    const imgRect = img.getBoundingClientRect();
    
    // Calculate initial crop area
    const cropWidth = Math.min(imgRect.width * 0.8, 300);
    const cropHeight = type === 'profile' ? cropWidth : cropWidth / aspectRatio;
    
    setCropArea({
      x: (imgRect.width - cropWidth) / 2,
      y: (imgRect.height - cropHeight) / 2,
      width: cropWidth,
      height: cropHeight
    });
  }, [aspectRatio, type]);

  const handleImageLoad = () => {
    console.log('Image loaded successfully, initializing crop');
    initializeCrop();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - cropArea.x,
      y: e.clientY - cropArea.y
    });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !imageRef.current) return;

    const imgRect = imageRef.current.getBoundingClientRect();
    const newX = Math.max(0, Math.min(e.clientX - dragStart.x, imgRect.width - cropArea.width));
    const newY = Math.max(0, Math.min(e.clientY - dragStart.y, imgRect.height - cropArea.height));

    setCropArea(prev => ({
      ...prev,
      x: newX,
      y: newY
    }));
  }, [isDragging, dragStart, cropArea.width, cropArea.height]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const getCroppedImage = async (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const canvas = canvasRef.current;
      const img = imageRef.current;
      
      if (!canvas || !img) {
        console.error('Canvas or image ref not available');
        reject(new Error('Canvas or image not available'));
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('Canvas context not available');
        reject(new Error('Canvas context not available'));
        return;
      }

      // Set canvas size based on crop area
      const outputWidth = 400;
      const outputHeight = type === 'profile' ? 400 : Math.round(400 / aspectRatio);
      
      canvas.width = outputWidth;
      canvas.height = outputHeight;

      // Calculate scale factor
      const scaleX = img.naturalWidth / img.width;
      const scaleY = img.naturalHeight / img.height;

      console.log('Cropping image:', {
        cropArea,
        scaleX,
        scaleY,
        outputWidth,
        outputHeight,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        displayWidth: img.width,
        displayHeight: img.height
      });

      // Clear canvas first
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, outputWidth, outputHeight);
      
      // Draw cropped image
      try {
        ctx.drawImage(
          img,
          cropArea.x * scaleX,
          cropArea.y * scaleY,
          cropArea.width * scaleX,
          cropArea.height * scaleY,
          0,
          0,
          outputWidth,
          outputHeight
        );
        console.log('Image drawn to canvas successfully');
      } catch (drawError) {
        console.error('Error drawing image to canvas:', drawError);
        throw new Error('Failed to draw image to canvas. Image might have CORS restrictions.');
      }

      canvas.toBlob((blob) => {
        if (blob) {
          console.log('Canvas blob created successfully:', blob.size, 'bytes');
          resolve(blob);
        } else {
          console.error('Failed to create blob from canvas');
          reject(new Error('Failed to create blob from canvas. The image might be corrupted.'));
        }
      }, 'image/jpeg', 0.9);
    });
  };

  const uploadToFirebase = async (blob: Blob): Promise<string> => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      console.log('Checking auth state:', { user: !!user, uid: user?.uid });
      
      if (!user) {
        throw new Error('User not authenticated. Please login again.');
      }

      const fileName = `${type}/${user.uid}/${Date.now()}.jpg`;
      const storageRef = ref(storage, fileName);
      
      console.log('Uploading to Firebase Storage:', { fileName, blobSize: blob.size });
      
      const metadata = {
        contentType: 'image/jpeg',
        customMetadata: {
          uploadedBy: user.uid,
          uploadTime: new Date().toISOString(),
          imageType: type
        }
      };

      const uploadResult = await uploadBytes(storageRef, blob, metadata);
      console.log('Upload completed, getting download URL...');
      
      const downloadURL = await getDownloadURL(uploadResult.ref);
      console.log('Got download URL:', downloadURL);
      
      return downloadURL;
    } catch (error) {
      console.error('Firebase upload error:', error);
      if (error instanceof Error) {
        throw new Error(`Upload failed: ${error.message}`);
      } else {
        throw new Error('Upload failed: Unknown error');
      }
    }
  };

  const handleCropConfirm = async () => {
    if (!previewUrl) {
      console.error('No preview URL available');
      alert('No image to process. Please try again.');
      return;
    }

    setLoading(true);
    try {
      console.log('Starting crop confirm process...');
      const croppedBlob = await getCroppedImage();
      console.log('Got cropped blob:', croppedBlob.size, 'bytes');
      
      const downloadUrl = await uploadToFirebase(croppedBlob);
      console.log('Upload successful, URL:', downloadUrl);
      
      onImageChange(downloadUrl);
      
      // Clean up object URLs
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
      
      setShowCropper(false);
      setSelectedFile(null);
      setPreviewUrl(null);
      setIsEditingExisting(false);
    } catch (error) {
      console.error('Error in crop confirm:', error);
      if (error instanceof Error) {
        alert(`Failed to upload image: ${error.message}`);
      } else {
        alert('Failed to upload image. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setSelectedFile(null);
    
    // Clean up object URLs for both new uploads and Firebase-converted images
    if (previewUrl && (previewUrl.startsWith('blob:') || !isEditingExisting)) {
      URL.revokeObjectURL(previewUrl);
    }
    
    setPreviewUrl(null);
    setIsEditingExisting(false);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = () => {
    onImageChange('');
  };

  return (
    <div className={styles.photoUploadContainer}>
      {!showCropper ? (
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
                >
                  <FaCamera /> Change
                </button>
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className={styles.removeButton}
                >
                  <FaTrash /> Remove
                </button>
              </div>
            </div>
          ) : (
            <div 
              className={`${styles.uploadPrompt} ${type === 'profile' ? styles.profilePrompt : styles.bannerPrompt}`}
              onClick={() => fileInputRef.current?.click()}
            >
              <FaCamera className={styles.uploadIcon} />
              <span>Upload {type === 'profile' ? 'Profile Photo' : 'Banner Image'}</span>
              <small>Click to select image</small>
            </div>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className={styles.hiddenInput}
          />
        </div>
      ) : (
        <div className={styles.cropperContainer}>
          <div className={styles.cropperHeader}>
            <h3>
              {isEditingExisting ? 'Edit' : 'Crop'} {type === 'profile' ? 'Profile Photo' : 'Banner Image'}
            </h3>
            <p>Drag to reposition</p>
            {process.env.NODE_ENV === 'development' && (
              <p style={{fontSize: '12px', color: '#888', wordBreak: 'break-all'}}>
                Debug: {previewUrl ? 'URL set' : 'No URL'} | Editing: {isEditingExisting ? 'Yes' : 'No'}
              </p>
            )}
          </div>
          
          <div className={styles.cropperWrapper} ref={cropperRef}>
            {previewUrl ? (
              <>
                <img
                  ref={imageRef}
                  src={previewUrl}
                  alt="Preview"
                  className={styles.cropperImage}
                  onLoad={handleImageLoad}
                  onError={(e) => console.log('Image failed to load in cropper:', e, previewUrl)}
                />
                
                <div
                  className={styles.cropOverlay}
                  style={{
                    left: cropArea.x,
                    top: cropArea.y,
                    width: cropArea.width,
                    height: cropArea.height,
                  }}
                  onMouseDown={handleMouseDown}
                >
                  <div className={styles.cropBorder}></div>
                </div>
              </>
            ) : (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '200px',
                color: '#888',
                fontSize: '14px'
              }}>
                Loading image...
              </div>
            )}
          </div>
          
          <canvas ref={canvasRef} className={styles.hiddenCanvas} />
          
          <div className={styles.cropperActions}>
            <button
              type="button"
              onClick={handleCropCancel}
              className={styles.cancelButton}
              disabled={loading}
            >
              <FaTimes /> Cancel
            </button>
            <button
              type="button"
              onClick={handleCropConfirm}
              className={styles.confirmButton}
              disabled={loading}
            >
              {loading ? (
                <span className={styles.spinner}></span>
              ) : (
                <>
                  <FaCheck /> {isEditingExisting ? 'Save' : 'Confirm'}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoUpload; 