"use client";
// UserProfile.jsx
import React, { useEffect, useState, useRef } from "react";
import { auth, db, storage } from "@/lib/firebase";
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { updateProfile, User } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { toast } from "react-toastify";
import styles from "./UserProfile.module.css";

interface UserDetails {
  name: string;
  username: string;
  bio: string;
  phone: string;
  email: string;
  photo?: string;
  providers?: {
    google?: boolean;
  };
}

interface FormData {
  name: string;
  username: string;
  bio: string;
  phone: string;
  email: string;
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
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    username: "",
    bio: "",
    phone: "",
    email: ""
  });
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState<string>("");
  const [phoneError, setPhoneError] = useState<string>("");

  const fetchUserData = async () => {
    try {
      setIsLoading(true);
      const unsubscribe = auth.onAuthStateChanged(async (user: User | null) => {
        if (user) {
          const docRef = doc(db, "Users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data() as Omit<UserDetails, 'email'>;
            setUserDetails({ ...data, email: user.email || "" });
            setFormData({
              name: data.name || "",
              username: data.username || "",
              bio: data.bio || "",
              phone: data.phone || "",
              email: user.email || ""
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size should be less than 2MB');
      return;
    }
    try {
      setUploading(true);
      const user = auth.currentUser;
      if (!user) return;
      const storageRef = ref(storage, `profilePics/${user.uid}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      await updateProfile(user, { photoURL: downloadURL });
      const userRef = doc(db, "Users", user.uid);
      await updateDoc(userRef, { photo: downloadURL });
      setUserDetails(prev => prev ? { ...prev, photo: downloadURL } : null);
      toast.success('Profile picture updated successfully!');
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      toast.error('Failed to update profile picture');
    } finally {
      setUploading(false);
    }
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const checkUsernameAvailability = async (username: string): Promise<boolean> => {
    if (username.length < 3) {
      setUsernameError("Username must be at least 3 characters");
      return false;
    }
    const q = query(
      collection(db, "Users"),
      where("username", "==", username.toLowerCase())
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.empty;
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

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
    setFormData({ ...formData, phone: value });
    setPhoneError(value.length === 10 ? "" : "Phone number must be 10 digits");
  };

  const handleUpdateProfile = async () => {
    try {
      const user = auth.currentUser;
      if (!user || !userDetails) return;
      if (formData.username && formData.username.length >= 3) {
        const isAvailable = await checkUsernameAvailability(formData.username);
        if (!isAvailable && formData.username !== userDetails.username) {
          setUsernameError("Username is already taken");
          return;
        }
      }
      if (phoneError) {
        toast.error("Please fix phone number validation errors");
        return;
      }
      if (formData.phone) {
        const phoneQuery = query(
          collection(db, "Users"),
          where("phone", "==", formData.phone)
        );
        const phoneSnapshot = await getDocs(phoneQuery);
        if (!phoneSnapshot.empty && phoneSnapshot.docs[0].id !== user.uid) {
          setPhoneError("This phone number is already linked to another account");
          return;
        }
      }
      await updateProfile(user, { displayName: formData.name });
      const userRef = doc(db, "Users", user.uid);
      const userData = {
        name: formData.name,
        username: formData.username.toLowerCase(),
        bio: formData.bio,
        phone: formData.phone,
        providers: {
          ...(userDetails.providers || {}),
          google: user.providerData.some((p: any) => p.providerId === 'google.com')
        }
      };
      await updateDoc(userRef, userData);
      setUserDetails({ ...userData, email: user.email || "" });
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
                  {uploading ? (
                    <div className={styles.uploadOverlay}>Uploading...</div>
                  ) : (
                    <>
                      <img
                        className={styles.avatarImage}
                        src={userDetails.photo || "/default-avatar.png"}
                        alt="Profile"
                      />
                      <div className={styles.avatarOverlay}>
                        <span>Change Photo</span>
                      </div>
                    </>
                  )}
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*"
                  style={{ display: 'none' }}
                />
              </div>
              <div className={styles.profileRightSection}>
                {isEditing ? (
                  <div className={styles.editProfileContainer}>
                    <div className={styles.inputGroup}>
                      <label>Name:</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className={styles.profileInput}
                        placeholder="Enter your name"
                      />
                    </div>
                    <div className={styles.inputGroup}>
                      <label>Username:</label>
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
                      <label>Bio:</label>
                      <textarea
                        value={formData.bio}
                        onChange={(e) => setFormData({...formData, bio: e.target.value})}
                        className={`${styles.profileInput} ${styles.bioInput}`}
                        placeholder="Tell us about yourself"
                        maxLength={200}
                      />
                    </div>
                    <div className={styles.inputGroup}>
                      <label>Phone:</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={handlePhoneChange}
                        className={styles.profileInput}
                        placeholder="Enter 10-digit phone number"
                        maxLength={10}
                      />
                      {phoneError && <span className={styles.error}>{phoneError}</span>}
                    </div>
                    <div className={styles.inputGroup}>
                      <label>Email:</label>
                      <input
                        type="email"
                        value={formData.email}
                        className={`${styles.profileInput} ${styles.disabledInput}`}
                        disabled
                      />
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
                            email: userDetails.email
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
        </div>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
}

export default UserProfile;