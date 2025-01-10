import React, { useState, useEffect } from 'react';
import { auth, db, storage } from '../../../../firebase';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { toast } from 'react-toastify';
import '../OrganisationProfile.css';

function EditOrganizationProfile({ orgDetails, setOrgDetails, setIsEditing }) {
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    bio: "",
    phoneNumber: "",
    category: "",
    profileImage: "",
    bannerImage: ""
  });

  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({
    profile: 0,
    banner: 0
  });

  useEffect(() => {
    if (orgDetails) {
      setFormData({
        name: orgDetails.name || "",
        username: orgDetails.username || "",
        bio: orgDetails.bio || "",
        phoneNumber: orgDetails.phoneNumber || "",
        category: orgDetails.category || "",
        profileImage: orgDetails.profileImage || "",
        bannerImage: orgDetails.bannerImage || ""
      });
    }
  }, [orgDetails]);

  const checkUsernameAvailability = async (username) => {
    if (username.length < 3) {
      setUsernameError("Username must be at least 3 characters");
      return false;
    }

    try {
      const organizationsRef = collection(db, 'organizations');
      const q = query(
        organizationsRef,
        where("username", "==", username.toLowerCase())
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.empty || 
             (querySnapshot.docs.length === 1 && 
              querySnapshot.docs[0].id === auth.currentUser?.uid);
    } catch (error) {
      console.error("Error checking username:", error);
      toast.error("Error checking username availability");
      return false;
    }
  };

  const handleUsernameChange = async (e) => {
    const newUsername = e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
    setFormData({ ...formData, username: newUsername });
    setUsernameError("");
    
    if (newUsername.length >= 3) {
      setIsCheckingUsername(true);
      const isAvailable = await checkUsernameAvailability(newUsername);
      setIsCheckingUsername(false);
      
      if (!isAvailable && newUsername !== orgDetails?.username) {
        setUsernameError("Username is already taken");
      }
    }
  };

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
    setFormData({ ...formData, phoneNumber: value });
    setPhoneError(value.length === 10 ? "" : "Phone number must be 10 digits");
  };

  const handleImageUpload = async (file, type) => {
    if (!file) return null;

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error(`${type} image must be less than 5MB`);
      return null;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error(`${type} image must be JPEG, PNG, or WebP`);
      return null;
    }

    try {
      const storageRef = ref(storage, `organizations/${auth.currentUser.uid}/${type}/${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(prev => ({
              ...prev,
              [type.toLowerCase()]: progress
            }));
          },
          (error) => {
            console.error(`Error uploading ${type} image:`, error);
            toast.error(`Error uploading ${type} image`);
            reject(null);
          },
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          }
        );
      });
    } catch (error) {
      console.error(`Error uploading ${type} image:`, error);
      toast.error(`Error uploading ${type} image`);
      return null;
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setIsSubmitting(true);
      const user = auth.currentUser;
      if (!user) {
        toast.error("No user logged in");
        return;
      }

      // Validate input fields
      if (!formData.name.trim()) {
        toast.error("Organization name is required");
        return;
      }

      if (!formData.username || formData.username.length < 3) {
        toast.error("Username must be at least 3 characters");
        return;
      }

      if (formData.username && formData.username.length >= 3) {
        const isAvailable = await checkUsernameAvailability(formData.username);
        if (!isAvailable && formData.username !== orgDetails.username) {
          setUsernameError("Username is already taken");
          return;
        }
      }

      if (phoneError) {
        toast.error("Please fix phone number validation errors");
        return;
      }

      // Check if organization document exists
      const orgRef = doc(db, "organizations", user.uid);
      const orgDoc = await getDoc(orgRef);

      const orgData = {
        name: formData.name.trim(),
        username: formData.username.toLowerCase(),
        bio: formData.bio.trim(),
        phoneNumber: formData.phoneNumber,
        category: formData.category.trim(),
        profileImage: formData.profileImage,
        bannerImage: formData.bannerImage,
        updatedAt: new Date().toISOString()
      };

      if (!orgDoc.exists()) {
        await setDoc(orgRef, {
          ...orgData,
          createdAt: new Date().toISOString()
        });
      } else {
        await updateDoc(orgRef, orgData);
      }

      setOrgDetails(prev => ({ ...prev, ...orgData }));
      setIsEditing(false);
      toast.success("Profile updated successfully!");
      
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error(`Error updating profile: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProfileImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = await handleImageUpload(file, 'Profile');
      if (imageUrl) {
        setFormData(prev => ({ ...prev, profileImage: imageUrl }));
      }
    }
  };

  const handleBannerImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = await handleImageUpload(file, 'Banner');
      if (imageUrl) {
        setFormData(prev => ({ ...prev, bannerImage: imageUrl }));
      }
    }
  };

  return (
    <div className="edit-profile-container">
      <div className="input-group">
        <label>Organization Name* :</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
          className="profile-input"
          placeholder="Enter organization name"
          maxLength={50}
          required
        />
      </div>

      <div className="input-group">
        <label>Username* :</label>
        <div className="username-input-container">
          <span className="username-at-symbol">@</span>
          <input
            type="text"
            value={formData.username}
            onChange={handleUsernameChange}
            className="username-input"
            placeholder="username"
            maxLength={30}
            required
          />
        </div>
        {isCheckingUsername && <span className="status-text">Checking availability...</span>}
        {usernameError && <span className="error">{usernameError}</span>}
      </div>

      <div className="input-group">
        <label>Category :</label>
        <input
          type="text"
          value={formData.category}
          onChange={(e) => setFormData({...formData, category: e.target.value})}
          className="profile-input"
          placeholder="Enter organization category"
          maxLength={30}
        />
      </div>

      <div className="input-group">
        <label>Bio :</label>
        <textarea
          value={formData.bio}
          onChange={(e) => setFormData({...formData, bio: e.target.value})}
          className="profile-input bio-input"
          placeholder="Tell us about your organization"
          maxLength={200}
        />
        <span className="char-count">{formData.bio.length}/200</span>
      </div>

      <div className="input-group">
        <label>Phone* :</label>
        <input
          type="tel"
          value={formData.phoneNumber}
          onChange={handlePhoneChange}
          className="profile-input"
          placeholder="Enter 10-digit phone number"
          maxLength={10}
          required
        />
        {phoneError && <span className="error">{phoneError}</span>}
      </div>

      <div className="input-group">
        <label>Profile Image :</label>
        <input
          type="file"
          onChange={handleProfileImageChange}
          accept="image/jpeg,image/png,image/webp"
          className="file-input"
        />
        {uploadProgress.profile > 0 && uploadProgress.profile < 100 && (
          <div className="progress-bar">
            <div 
              className="progress" 
              style={{width: `${uploadProgress.profile}%`}}
            ></div>
          </div>
        )}
      </div>

      <div className="input-group">
        <label>Banner Image :</label>
        <input
          type="file"
          onChange={handleBannerImageChange}
          accept="image/jpeg,image/png,image/webp"
          className="file-input"
        />
        {uploadProgress.banner > 0 && uploadProgress.banner < 100 && (
          <div className="progress-bar">
            <div 
              className="progress" 
              style={{width: `${uploadProgress.banner}%`}}
            ></div>
          </div>
        )}
      </div>

      <div className="button-group">
        <button 
          className="save-cancel-button"
          onClick={handleUpdateProfile}
          disabled={isSubmitting || isCheckingUsername || usernameError}
        >
          {isSubmitting ? "Saving..." : "Save"}
        </button>
        <button 
          className="save-cancel-button" 
          onClick={() => {
            setIsEditing(false);
            setFormData({
              ...orgDetails
            });
          }}
          disabled={isSubmitting}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default EditOrganizationProfile;