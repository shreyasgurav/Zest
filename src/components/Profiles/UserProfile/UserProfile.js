// UserProfile.jsx
import React, { useEffect, useState, useRef } from "react";
import { auth, db, storage } from "../../firebase";
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { toast } from "react-toastify";
import "./UserProfile.css";

function ProfileSkeleton() {
  return (
    <div className="user-profile-container">
      <div className="profile-main-section">
        <div className="profile-left-section">
          <div className="profile-avatar skeleton-avatar animate-pulse" />
        </div>
        <div className="profile-right-section">
          <div className="profile-info">
            <div className="skeleton-name animate-pulse" />
            <div className="skeleton-username animate-pulse" />
            <div className="skeleton-bio animate-pulse" />
            <div className="skeleton-button animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

function UserProfile() {
  const [userDetails, setUserDetails] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    bio: "",
    phone: "",
    email: ""
  });
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [phoneError, setPhoneError] = useState("");

  const fetchUserData = async () => {
    try {
      setIsLoading(true);
      const unsubscribe = auth.onAuthStateChanged(async (user) => {
        if (user) {
          const docRef = doc(db, "Users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserDetails({ ...data, email: user.email });
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
      return unsubscribe;
    } catch (error) {
      console.error("Error fetching user data:", error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = fetchUserData();
    return () => unsubscribe;
  }, []);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (2MB limit)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size should be less than 2MB');
      return;
    }

    try {
      setUploading(true);
      const user = auth.currentUser;
      
      // Create a reference to the profile picture in storage
      const storageRef = ref(storage, `profilePics/${user.uid}`);
      
      // Upload the file
      await uploadBytes(storageRef, file);
      
      // Get the download URL
      const downloadURL = await getDownloadURL(storageRef);
      
      // Update user profile in Auth
      await updateProfile(user, {
        photoURL: downloadURL
      });
      
      // Update in Firestore
      const userRef = doc(db, "Users", user.uid);
      await updateDoc(userRef, {
        photo: downloadURL
      });
      
      // Update local state
      setUserDetails(prev => ({
        ...prev,
        photo: downloadURL
      }));
      
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

  const checkUsernameAvailability = async (username) => {
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

  const handleUsernameChange = async (e) => {
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

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
    setFormData({ ...formData, phone: value });
    setPhoneError(value.length === 10 ? "" : "Phone number must be 10 digits");
  };

  const handleUpdateProfile = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

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

      // Check if phone is already linked to another account
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

      await updateProfile(user, {
        displayName: formData.name
      });

      const userRef = doc(db, "Users", user.uid);
      const userData = {
        name: formData.name,
        username: formData.username.toLowerCase(),
        bio: formData.bio,
        phone: formData.phone,
        providers: {
          ...(userDetails?.providers || {}),
          google: user.providerData.some(p => p.providerId === 'google.com')
        }
      };

      await updateDoc(userRef, userData);
      setUserDetails({ ...userData, email: user.email });
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
        <div className="page-container">
          <div className="user-profile-container">
            <div className="profile-main-section">
              <div className="profile-left-section">
                <div className="profile-avatar" onClick={handlePhotoClick} style={{ cursor: 'pointer' }}>
                  {uploading ? (
                    <div className="upload-overlay">Uploading...</div>
                  ) : (
                    <>
                      <img
                        className="avatar-image"
                        src={userDetails.photo || "/default-avatar.png"}
                        alt="Profile"
                      />
                      <div className="avatar-overlay">
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
              
              <div className="profile-right-section">
                {isEditing ? (
                  <div className="edit-profile-container">
                    <div className="input-group">
                      <label>Name:</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="profile-input"
                        placeholder="Enter your name"
                      />
                    </div>

                    <div className="input-group">
                      <label>Username:</label>
                      <div className="username-input-container">
                        <span className="username-at-symbol">@</span>
                        <input
                          type="text"
                          value={formData.username}
                          onChange={handleUsernameChange}
                          className="username-input"
                          placeholder="username"
                        />
                      </div>
                      {isCheckingUsername && <span>Checking availability...</span>}
                      {usernameError && <span className="error">{usernameError}</span>}
                    </div>

                    <div className="input-group">
                      <label>Bio:</label>
                      <textarea
                        value={formData.bio}
                        onChange={(e) => setFormData({...formData, bio: e.target.value})}
                        className="profile-input bio-input"
                        placeholder="Tell us about yourself"
                        maxLength={200}
                      />
                    </div>

                    <div className="input-group">
                      <label>Phone:</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={handlePhoneChange}
                        className="profile-input"
                        placeholder="Enter 10-digit phone number"
                        maxLength={10}
                      />
                      {phoneError && <span className="error">{phoneError}</span>}
                    </div>

                    <div className="input-group">
                      <label>Email:</label>
                      <input
                        type="email"
                        value={formData.email}
                        className="profile-input disabled-input"
                        disabled
                      />
                    </div>

                    <div className="button-group">
                      <button 
                        className="save-cancel-button"
                        onClick={handleUpdateProfile}
                        disabled={isCheckingUsername || usernameError}
                      >
                        Save
                      </button>
                      <button 
                        className="save-cancel-button" 
                        onClick={() => {
                          setIsEditing(false);
                          setFormData({
                            ...userDetails,
                            email: userDetails.email
                          });
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="profile-info">
                    <h2 className="profile-name">{userDetails.name}</h2>
                    <div className="username-display">
                      <span className="username">@{userDetails.username}</span>
                    </div>
                    {userDetails.bio && (
                      <div className="bio-display">
                        <p>{userDetails.bio}</p>
                      </div>
                    )}
                    <button className="edit-profile-button" onClick={() => setIsEditing(true)}>
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