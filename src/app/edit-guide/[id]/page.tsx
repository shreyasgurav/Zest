'use client';

import React, { useEffect, useState } from 'react';
import { db, storage } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { useRouter, useParams } from "next/navigation";
import { Helmet } from 'react-helmet-async';
import styles from './EditGuide.module.css';

// Generate slug utility function
const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')         // Replace spaces with hyphens
    .replace(/-+/g, '-')          // Remove consecutive hyphens
    .trim();                      // Remove leading/trailing spaces
};

interface GuideData {
  name: string;
  cover_image: string;
  createdBy: string;
  slug?: string;
}

const EditGuide: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [guideName, setGuideName] = useState<string>("");
  const [guideImage, setGuideImage] = useState<File | null>(null);
  const [currentImageURL, setCurrentImageURL] = useState<string>("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });

    return () => unsubscribe();
  }, [auth]);

  useEffect(() => {
    const checkAuth = async () => {
      if (!currentUser) {
        setIsAuthorized(false);
        setIsLoading(false);
        return;
      }

      try {
        // Get the guide document
        const guideDoc = await getDoc(doc(db, "guides", id));
        
        if (!guideDoc.exists()) {
          router.push('/guides');
          return;
        }
        
        const guideData = guideDoc.data() as GuideData;
        
        // Check if user is the creator
        const isCreator = currentUser.uid === guideData.createdBy;
        const isAdmin = currentUser.email === 'shrreyasgurav@gmail.com';
        
        setIsAuthorized(isCreator || isAdmin);
        
        if (isCreator || isAdmin) {
          // Load the guide data
          setGuideName(guideData.name);
          setCurrentImageURL(guideData.cover_image);
          setImagePreview(guideData.cover_image);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching guide:", error);
        setIsLoading(false);
      }
    };

    if (currentUser !== null) {
      checkAuth();
    }
  }, [currentUser, id, router]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5242880) { // 5MB limit
        setMessage("Image size should be less than 5MB");
        return;
      }
      setGuideImage(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!guideName.trim()) {
      setMessage("Please enter a guide name");
      return;
    }
  
    setLoading(true);
    setMessage("");
  
    try {
      let coverImageUrl = currentImageURL;
      
      // Upload new guide image if provided
      if (guideImage) {
        const fileExtension = guideImage.name.split('.').pop();
        const fileName = `guides/covers/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
        const storageRef = ref(storage, fileName);
        await uploadBytes(storageRef, guideImage);
        coverImageUrl = await getDownloadURL(storageRef);
      }
  
      // Generate new slug from updated name
      const newSlug = generateSlug(guideName.trim());
  
      const guideData = {
        name: guideName.trim(),
        slug: newSlug,
        cover_image: coverImageUrl,
        updatedAt: new Date()
      };
  
      const guideRef = doc(db, "guides", id);
      await updateDoc(guideRef, guideData);
      
      setMessage("Guide updated successfully!");
      setTimeout(() => router.push(`/guides/${newSlug}`), 2000);
    } catch (error) {
      console.error("Error updating guide:", error);
      setMessage(`Failed to update guide: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <Helmet>
          <title>Loading... - Zest</title>
        </Helmet>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}>Loading...</div>
        </div>
      </>
    );
  }

  if (!isAuthorized) {
    return (
      <>
        <Helmet>
          <title>Unauthorized - Zest</title>
          <meta name="description" content="You don't have permission to edit this guide." />
        </Helmet>
        <div className={styles.unauthorizedMessageContainer}>
          <div className={styles.unauthorizedMessage}>
            <h1>Unauthorized Access</h1>
            <p>You don't have permission to edit this guide.</p>
            <button onClick={() => router.push('/guides')} className={styles.backButton}>
              Back to Guides
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Edit Guide - {guideName} - Zest</title>
        <meta name="description" content={`Edit the ${guideName} guide on Zest.`} />
      </Helmet>
      <div className={styles.createEventPage}>
        <div className={styles.createEventContainer}>
          <h1 className={styles.pageTitle}>Edit City Guide</h1>
          <form onSubmit={handleSubmit} className={styles.createEventForm}>
            {/* Guide Cover Section */}
            <div className={styles.formSection}>
              <h2>Guide Cover</h2>
              <div className={styles.formGroup}>
                <label>Guide Name</label>
                <input
                  type="text"
                  value={guideName}
                  onChange={(e) => setGuideName(e.target.value)}
                  placeholder="Enter guide name"
                  required
                />
              </div>
              <p className={styles.imageTip}>Please upload a landscape image for best results (max 5MB)</p>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className={styles.fileInput}
              />
              {imagePreview && (
                <div className={styles.imagePreview}>
                  <img src={imagePreview} alt="Preview" />
                </div>
              )}
            </div>

            {message && (
              <div className={`${styles.message} ${message.includes("success") ? styles.success : styles.error}`}>
                {message}
              </div>
            )}

            <div className={styles.formActions}>
              <button type="submit" className={styles.submitButton} disabled={loading}>
                {loading ? "Updating Guide..." : "Update Guide"}
              </button>
              <button 
                type="button" 
                className={styles.cancelButton} 
                onClick={() => router.push(`/guides/${generateSlug(guideName)}`)}
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default EditGuide;