'use client';

import React, { useEffect, useState } from "react";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { toast } from "react-toastify";
import OrganisationProfileSkeleton from "./OrganisationProfileSkeleton";
import DashboardSection from '../Dashboard/DashboardSection/DashboardSection';
import PhotoUpload from '../PhotoUpload/PhotoUpload';
import styles from "./OrganisationProfile.module.css";

interface OrganisationData {
  uid?: string;
  phoneNumber?: string;
  isActive?: boolean;
  role?: string;
  name?: string;
  username?: string;
  bio?: string;
  photoURL?: string;
  bannerImage?: string;
  createdAt?: string;
  updatedAt?: string;
  settings?: {
    notifications?: boolean;
    emailUpdates?: boolean;
    privacy?: {
      profileVisibility?: string;
      contactVisibility?: string;
    };
  };
}

const OrganisationProfile: React.FC = () => {
  const [orgDetails, setOrgDetails] = useState<OrganisationData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<boolean>(false);
  
  const [name, setName] = useState<string>("");
  const [newName, setNewName] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [newUsername, setNewUsername] = useState<string>("");
  const [bio, setBio] = useState<string>("");
  const [newBio, setNewBio] = useState<string>("");
  const [photoURL, setPhotoURL] = useState<string>("");
  const [newPhotoURL, setNewPhotoURL] = useState<string>("");
  const [bannerImage, setBannerImage] = useState<string>("");
  const [newBannerImage, setNewBannerImage] = useState<string>("");
  const [usernameError, setUsernameError] = useState<string>("");
  const [isCheckingUsername, setIsCheckingUsername] = useState<boolean>(false);

  const fetchOrgData = async (uid: string) => {
    console.log("Fetching org data for:", uid);
    try {
      const db = getFirestore();
      const orgDocRef = doc(db, "Organisations", uid);
      const docSnap = await getDoc(orgDocRef);
  
      if (docSnap.exists()) {
        console.log("Document exists in Firestore");
        const data = docSnap.data() as OrganisationData;
        
        setOrgDetails(data);
        setName(data.name || "");
        setNewName(data.name || "");
        setUsername(data.username || "");
        setNewUsername(data.username || "");
        setBio(data.bio || "");
        setNewBio(data.bio || "");
        setPhotoURL(data.photoURL || "");
        setNewPhotoURL(data.photoURL || "");
        setBannerImage(data.bannerImage || "");
        setNewBannerImage(data.bannerImage || "");
        
        localStorage.setItem('orgDetails', JSON.stringify(data));
        localStorage.setItem('orgName', data.name || "");
        localStorage.setItem('orgUsername', data.username || "");
        localStorage.setItem('orgBio', data.bio || "");
        localStorage.setItem('orgPhotoURL', data.photoURL || "");
        localStorage.setItem('orgBannerImage', data.bannerImage || "");
      } else {
        console.log("Document doesn't exist in Firestore");
        const auth = getAuth();
        const user = auth.currentUser;
        
        if (user) {
          const newData: OrganisationData = {
            phoneNumber: user.phoneNumber || "",
            isActive: true,
            role: "Organisation",
            settings: {
              emailUpdates: false,
              notifications: true,
              privacy: {
                contactVisibility: "followers",
                profileVisibility: "public"
              }
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
  
          await setDoc(orgDocRef, newData);
          setOrgDetails(newData);
        }
      }
    } catch (err) {
      console.error("Error in fetchOrgData:", err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const checkUsernameAvailability = async (username: string): Promise<boolean> => {
    if (!username || username.length < 3) {
      setUsernameError("Username must be at least 3 characters");
      return false;
    }

    try {
      const db = getFirestore();
      const usernameQuery = query(
        collection(db, "Organisations"),
        where("username", "==", username.toLowerCase())
      );
      
      const querySnapshot = await getDocs(usernameQuery);
      const isAvailable = querySnapshot.empty || 
        (querySnapshot.docs[0].id === getAuth().currentUser?.uid);
      
      if (!isAvailable) {
        setUsernameError("Username is already taken");
      }
      return isAvailable;
    } catch (err) {
      console.error("Error checking username:", err);
      setUsernameError("Error checking username availability");
      return false;
    }
  };

  const handleUsernameChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUsername = e.target.value;
    setNewUsername(newUsername);
    setUsernameError("");
    
    if (newUsername.length >= 3) {
      setIsCheckingUsername(true);
      await checkUsernameAvailability(newUsername);
      setIsCheckingUsername(false);
    }
  };

  useEffect(() => {
    const auth = getAuth();
    let isSubscribed = true;
    
    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      console.log("Auth state changed:", user?.uid);
      
      if (user && isSubscribed) {
        await fetchOrgData(user.uid);
      } else if (!user) {
        setOrgDetails(null);
        setError(null);
        setEditMode(false);
      }
    });
  
    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, []);

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      const auth = getAuth();
      const user = auth.currentUser;
  
      if (!user) {
        setError("User not authenticated");
        toast.error("Please login to save profile");
        return;
      }
  
      if (newUsername) {
        const isUsernameAvailable = await checkUsernameAvailability(newUsername);
        if (!isUsernameAvailable) {
          setLoading(false);
          return;
        }
      }
  
      const db = getFirestore();
      const orgDocRef = doc(db, "Organisations", user.uid);
  
      const updates = {
        name: newName,
        username: newUsername.toLowerCase(),
        bio: newBio,
        photoURL: newPhotoURL,
        bannerImage: newBannerImage,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(orgDocRef, updates);
      
      const updatedOrgDetails = { ...orgDetails, ...updates };
      setOrgDetails(updatedOrgDetails);
      setName(newName);
      setUsername(newUsername);
      setBio(newBio);
      setPhotoURL(newPhotoURL);
      setBannerImage(newBannerImage);
      
      localStorage.setItem('orgDetails', JSON.stringify(updates));
      localStorage.setItem('orgName', newName);
      localStorage.setItem('orgUsername', newUsername);
      localStorage.setItem('orgBio', newBio);
      localStorage.setItem('orgPhotoURL', newPhotoURL);
      localStorage.setItem('orgBannerImage', newBannerImage);
      
      setUsernameError("");
      setEditMode(false);
      toast.success("Profile updated successfully!");
    } catch (err) {
      console.error("Error saving profile:", err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      toast.error("Error saving profile");
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoChange = (imageUrl: string) => {
    setNewPhotoURL(imageUrl);
  };

  const handleBannerChange = (imageUrl: string) => {
    setNewBannerImage(imageUrl);
  };

  if (loading) {
    return <OrganisationProfileSkeleton />;
  }

  if (error && !orgDetails) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className={styles.orgProfileContainer}>
      {/* Display Organisation Details */}
      <div className={styles.orgProfileContainer}>
        <div className={styles.orgBannerSection}>
          <div className={styles.orgBanner}>
            {bannerImage ? (
              <img
                src={bannerImage}
                alt="Organization Banner"
                className={styles.bannerImage}
              />
            ) : (
              <div className={styles.defaultBanner} />
            )}
          </div>
          <div className={styles.orgProfileImageContainer}>
            {photoURL ? (
              <img 
                src={photoURL} 
                alt="Profile"
                className={styles.orgProfileImage}
              />
            ) : (
              <div className={styles.noPhoto}>No profile photo</div>
            )}
          </div>
        </div>
        
        <div className={styles.orgDetailsSection}>
          <div className={styles.orgName}>
            <h3>{name || "Organization Name"}</h3>
          </div>
          <div className={styles.orgUsername}>
            <span>@{username || "username"}</span>
          </div>
          <div className={styles.orgBio}>
            <p>{bio || "No bio available"}</p>
          </div>

          {/* Edit Profile Button */}
          {!editMode && (
            <button 
            onClick={() => setEditMode(true)}
            className={styles.editProfileButton}
            >
              Edit Profile
            </button>
          )}
        </div>
      </div>

      {/* Edit Form */}
      {editMode && (
        <div className={styles.editProfileContainer}>
          <div className={styles.photoUploadSection}>
            <h3>Profile Photo</h3>
            <PhotoUpload
              currentImageUrl={newPhotoURL}
              onImageChange={handlePhotoChange}
              type="profile"
            />
          </div>

          <div className={styles.photoUploadSection}>
            <h3>Banner Image</h3>
            <PhotoUpload
              currentImageUrl={newBannerImage}
              onImageChange={handleBannerChange}
              type="banner"
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="name">Organization Name :</label>
            <input
              id="name"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter organization name"
              className={styles.profileInput}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="username">Username :</label>
            <input
              id="username"
              type="text"
              value={newUsername}
              onChange={handleUsernameChange}
              placeholder="Enter username"
              className={styles.profileInput}
            />
            {isCheckingUsername && <span className={styles.checking}>Checking username...</span>}
            {usernameError && <span className={styles.error}>{usernameError}</span>}
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="bio">Bio:</label>
            <textarea
              id="bio"
              value={newBio}
              onChange={(e) => setNewBio(e.target.value)}
              placeholder="Write a bio"
              className={styles.profileInput}
              rows={4}
            />
          </div>

          <div className={styles.inputGroup}>
              <label>Phone Number:</label>
              <input
                type="tel"
                value={orgDetails?.phoneNumber || ""}
                className={styles.profileInput}
                placeholder="Phone number"
                disabled
              />
              <span className={styles.helperText}>Phone number cannot be changed</span>
            </div>

          <div className={styles.buttonGroup}>
            <button 
              onClick={handleSaveProfile}
              disabled={isCheckingUsername || !!usernameError}
              className={styles.saveCancleButton}
            >
              Save
            </button>
            <button 
              onClick={() => setEditMode(false)}
              className={styles.saveCancleButton}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      <div className={styles.orgDashboardSection}>
        <DashboardSection />
      </div>
    </div>
  );
};

export default OrganisationProfile; 