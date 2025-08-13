"use client";
// UserProfile.jsx
import React, { useEffect, useState, useRef } from "react";
import { auth, db, storage } from "@/infrastructure/firebase";
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { updateProfile, User, onAuthStateChanged } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { toast } from "react-toastify";
import PhotoUpload from "@/components/forms/PhotoUpload/PhotoUpload";
import { FaCamera, FaCrop, FaTimes } from 'react-icons/fa';
import styles from "./UserProfile.module.css";

interface UserDetails {
  name: string;
  username: string;
  bio: string;
  phone: string;
  email: string;
  contactEmail: string;
  photo?: string;
  providers?: {
    google?: boolean;
    phone?: boolean;
  };
}

interface FormData {
  name: string;
  username: string;
  bio: string;
  phone: string;
  email: string;
  contactEmail: string;
}

function ProfileSkeleton() {
  return (
    <div className={styles.userProfileContainer}>
      <div className={styles.profileMainSection}>
        <div className={styles.profileLeftSection}>
          <div className={`${styles.profileAvatar} ${styles.skeletonAvatar} ${styles.animatePulse}`} />
        </div>
        <div className={styles.profileRightSection}>
          <div className={styles.profileInfo}>
            <div className={`${styles.skeletonName} ${styles.animatePulse}`} />
            <div className={`${styles.skeletonUsername} ${styles.animatePulse}`} />
            <div className={`${styles.skeletonBio} ${styles.animatePulse}`} />
            <div className={`${styles.skeletonButton} ${styles.animatePulse}`} />
          </div>
        </div>
      </div>
    </div>
  );
}

function UserProfile() {
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [isEditingExistingPhoto, setIsEditingExistingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    username: "",
    bio: "",
    phone: "",
    email: "",
    contactEmail: ""
  });
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState<string>("");

  const fetchUserData = async () => {
    try {
      setIsLoading(true);
      const unsubscribe = onAuthStateChanged(auth(), async (user: User | null) => {
        if (user) {
          const docRef = doc(db(), "Users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            const userDetails = { 
              name: data.name || "",
              username: data.username || "",
              bio: data.bio || "",
              email: user.email || "", 
              phone: user.phoneNumber || data.phone || "",
              contactEmail: data.contactEmail || "",
              photo: data.photo || "",
              providers: data.providers || {}
            };
            setUserDetails(userDetails);
            setFormData({
              name: data.name || "",
              username: data.username || "",
              bio: data.bio || "",
              phone: user.phoneNumber || data.phone || "",
              email: user.email || "",
              contactEmail: data.contactEmail || ""
            });
          }
          setIsLoading(false);
        }
      });
      return () => unsubscribe();
    } catch (error) {
      console.error("Error fetching user data:", error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const handlePhotoClick = () => {
    setShowPhotoModal(true);
  };

  const handleUploadPhotoClick = () => {
    setShowPhotoModal(false);
    setIsEditingExistingPhoto(false);
    setShowPhotoUpload(true);
  };

  const handleEditPhotoClick = () => {
    setShowPhotoModal(false);
    setIsEditingExistingPhoto(true);
    setShowPhotoUpload(true);
  };

  const handlePhotoChange = async (imageUrl: string) => {
    try {
      const user = auth().currentUser;
      if (!user) return;

      // Update Firebase Auth profile
      await updateProfile(user, { photoURL: imageUrl });
      
      // Update Firestore document
      const userRef = doc(db(), "Users", user.uid);
      await updateDoc(userRef, { photo: imageUrl });
      
      // Update local state
      setUserDetails(prev => prev ? { ...prev, photo: imageUrl } : null);
      setShowPhotoUpload(false);
      
      toast.success('Profile picture updated successfully!');
    } catch (error) {
      console.error('Error updating profile picture:', error);
      toast.error('Failed to update profile picture');
    }
  };

  const closePhotoModal = () => {
    setShowPhotoModal(false);
    setShowPhotoUpload(false);
    setIsEditingExistingPhoto(false);
  };

  const checkUsernameAvailability = async (username: string): Promise<boolean> => {
    if (username.length < 3) {
      setUsernameError("Username must be at least 3 characters");
      return false;
    }
    
    const { checkGlobalUsernameAvailability } = await import('@/domains/authentication/services/auth.service');
    const currentUser = auth().currentUser;
    const result = await checkGlobalUsernameAvailability(
      username, 
      currentUser?.uid
    );
    
    if (!result.available) {
      const takenByMessage = result.takenBy === 'user' ? 'another user' :
                           result.takenBy === 'artist' ? 'an artist' :
                           result.takenBy === 'organisation' ? 'an organization' :
                           result.takenBy === 'venue' ? 'a venue' : 'someone else';
      setUsernameError(`Username is already taken by ${takenByMessage}`);
    }
    
    return result.available;
  };

  const handleUsernameChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUsername = e.target.value;
    setFormData({ ...formData, username: newUsername });
    setUsernameError("");
    if (newUsername.length >= 3) {
      setIsCheckingUsername(true);
      const isAvailable = await checkUsernameAvailability(newUsername);
      setIsCheckingUsername(false);
      if (!isAvailable && newUsername !== userDetails?.username) {
        setUsernameError("Username is already taken");
      }
    }
  };

  const handleUpdateProfile = async () => {
    try {
      const user = auth().currentUser;
      if (!user || !userDetails) return;
      
      // Validate required fields
      if (!formData.name.trim()) {
        toast.error("Name is required");
        return;
      }
      
      if (!formData.contactEmail.trim()) {
        toast.error("Contact email is required");
        return;
      }
      
      if (!formData.username.trim()) {
        toast.error("Username is required");
        return;
      }
      
      // Check username availability
      if (formData.username && formData.username.length >= 3) {
        const isAvailable = await checkUsernameAvailability(formData.username);
        if (!isAvailable && formData.username !== userDetails.username) {
          setUsernameError("Username is already taken");
          return;
        }
      }

      // Update Firebase Auth display name
      await updateProfile(user, { displayName: formData.name });
      
      // Update Firestore document
      const userRef = doc(db(), "Users", user.uid);
      const userData = {
        name: formData.name,
        username: formData.username.toLowerCase(),
        bio: formData.bio,
        contactEmail: formData.contactEmail,
        email: formData.contactEmail, // Ensure email field is updated for booking compatibility
        updatedAt: new Date().toISOString(),
        providers: {
          ...(userDetails.providers || {}),
          google: user.providerData.some((p: any) => p.providerId === 'google.com'),
          phone: user.providerData.some((p: any) => p.providerId === 'phone')
        }
      };
      
      await updateDoc(userRef, userData);
      
      // Update local state with the new data
      const updatedUserDetails = { 
        ...userDetails,
        name: formData.name,
        username: formData.username.toLowerCase(),
        bio: formData.bio,
        contactEmail: formData.contactEmail,
        email: formData.contactEmail
      };
      
      setUserDetails(updatedUserDetails);
      
      setIsEditing(false);
      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Error updating profile");
    }
  };

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  return (
    <div>
      {userDetails ? (
        <div className={styles.pageContainer}>
          <div className={styles.userProfileContainer}>
            <div className={styles.profileMainSection}>
              <div className={styles.profileLeftSection}>
                <div className={styles.profileAvatar} onClick={handlePhotoClick} style={{ cursor: 'pointer' }}>
                  {userDetails.photo ? (
                    <img
                      className={styles.avatarImage}
                      src={userDetails.photo}
                      alt="Profile"
                      onError={(e) => {
                        // Fallback to initials if image fails to load
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.add(styles.showInitials);
                      }}
                    />
                  ) : null}
                  <div className={`${styles.defaultAvatar} ${!userDetails.photo ? styles.showInitials : ''}`}>
                    {userDetails.name ? userDetails.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'US'}
                  </div>
                  <div className={styles.avatarOverlay}>
                    <span>Edit Photo</span>
                  </div>
                </div>
              </div>
              <div className={styles.profileRightSection}>
                {isEditing ? (
                  <div className={styles.editProfileContainer}>
                    <div className={styles.inputGroup}>
                      <label>
                        Name: 
                        <span className={styles.requiredIndicator}>*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className={styles.profileInput}
                        placeholder="Enter your name"
                      />
                    </div>
                    <div className={styles.inputGroup}>
                      <label>
                        Username: 
                        <span className={styles.requiredIndicator}>*</span>
                      </label>
                      <div className={styles.usernameInputContainer}>
                        <span className={styles.usernameAtSymbol}>@</span>
                        <input
                          type="text"
                          value={formData.username}
                          onChange={handleUsernameChange}
                          className={styles.usernameInput}
                          placeholder="username"
                        />
                      </div>
                      {isCheckingUsername && <span>Checking availability...</span>}
                      {usernameError && <span className={styles.error}>{usernameError}</span>}
                    </div>
                    <div className={styles.inputGroup}>
                      <label>
                        Bio: 
                        <span className={styles.optionalIndicator}>(optional)</span>
                      </label>
                      <textarea
                        value={formData.bio}
                        onChange={(e) => setFormData({...formData, bio: e.target.value})}
                        className={`${styles.profileInput} ${styles.bioInput}`}
                        placeholder="Tell us about yourself"
                        maxLength={200}
                        rows={4}
                      />
                      <span className={styles.helperText}>{formData.bio.length}/200 characters</span>
                    </div>
                    <div className={styles.inputGroup}>
                      <label>
                        Contact Email: 
                        <span className={styles.requiredIndicator}>*</span>
                      </label>
                      <input
                        type="email"
                        value={formData.contactEmail}
                        onChange={(e) => setFormData({...formData, contactEmail: e.target.value})}
                        className={styles.profileInput}
                        placeholder="Enter contact email"
                      />
                      <span className={styles.helperText}>Public contact email for others to reach you</span>
                    </div>
                    <div className={styles.inputGroup}>
                      <label>
                        Phone Number: 
                        <span className={styles.requiredIndicator}>*</span>
                      </label>
                      <input
                        type="tel"
                        value={userDetails.phone}
                        className={`${styles.profileInput} ${styles.disabledInput}`}
                        placeholder="Phone number (verified)"
                        disabled
                        readOnly
                      />
                      <span className={styles.helperText}>✅ Already verified during login</span>
                    </div>
                    <div className={styles.buttonGroup}>
                      <button 
                        className={styles.saveCancelButton}
                        onClick={handleUpdateProfile}
                        disabled={isCheckingUsername || !!usernameError}
                      >
                        Save
                      </button>
                      <button 
                        className={styles.saveCancelButton} 
                        onClick={() => {
                          setIsEditing(false);
                          setFormData({
                            name: userDetails.name,
                            username: userDetails.username,
                            bio: userDetails.bio,
                            phone: userDetails.phone,
                            email: userDetails.email,
                            contactEmail: userDetails.contactEmail
                          });
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={styles.profileInfo}>
                    <h2 className={styles.profileName}>{userDetails.name}</h2>
                    <div className={styles.usernameDisplay}>
                      <span className={styles.username}>@{userDetails.username}</span>
                    </div>
                    {userDetails.bio && (
                      <div className={styles.bioDisplay}>
                        <p>{userDetails.bio}</p>
                      </div>
                    )}
                    <button className={styles.editProfileButton} onClick={() => setIsEditing(true)}>
                      Edit Profile
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Photo Options Modal */}
          {showPhotoModal && (
            <div className={styles.modalOverlay} onClick={closePhotoModal}>
              <div className={styles.photoModal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                  <h3>Edit Photo</h3>
                  <button className={styles.closeButton} onClick={closePhotoModal}>
                    <FaTimes />
                  </button>
                </div>
                <div className={styles.modalContent}>
                  <button className={styles.photoOption} onClick={handleUploadPhotoClick}>
                    <FaCamera className={styles.optionIcon} />
                    <span>Upload Photo</span>
                  </button>
                  {userDetails.photo && (
                    <button className={styles.photoOption} onClick={handleEditPhotoClick}>
                      <FaCrop className={styles.optionIcon} />
                      <span>Edit Photo</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Photo Upload/Crop Modal */}
          {showPhotoUpload && (
            <div className={styles.modalOverlay} onClick={closePhotoModal}>
              <div className={styles.uploadModal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                  <h3>{isEditingExistingPhoto ? 'Edit Profile Photo' : 'Upload & Crop Photo'}</h3>
                  <button className={styles.closeButton} onClick={closePhotoModal}>
                    <FaTimes />
                  </button>
                </div>
                <div className={styles.modalContent}>
                  <PhotoUpload
                    currentImageUrl={userDetails.photo}
                    onImageChange={handlePhotoChange}
                    type="profile"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
}

export default UserProfile;