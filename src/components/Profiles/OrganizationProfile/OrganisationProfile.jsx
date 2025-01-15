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
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { toast } from "react-toastify";
import "./OrganisationProfile.css";

const OrganisationProfile = () => {
  const [orgDetails, setOrgDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  
  const [name, setName] = useState("");
  const [newName, setNewName] = useState("");
  const [username, setUsername] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [bio, setBio] = useState("");
  const [newBio, setNewBio] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [newPhotoURL, setNewPhotoURL] = useState("");
  const [bannerImage, setBannerImage] = useState("");
  const [newBannerImage, setNewBannerImage] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);

  const fetchOrgData = async (uid) => {
    console.log("Fetching org data for:", uid);
    try {
      const db = getFirestore();
      const orgDocRef = doc(db, "Organisations", uid);
      const docSnap = await getDoc(orgDocRef);
  
      if (docSnap.exists()) {
        console.log("Document exists in Firestore");
        const data = docSnap.data();
        
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
          const newData = {
            phoneNumber: user.phoneNumber || "",
            isActive: true,
            role: "Organisation",
            settings: {
              emailUpdates: false,
              notifications: true
            },
            privacy: {
              contactVisibility: "followers",
              profileVisibility: "public"
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
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkUsernameAvailability = async (username) => {
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

  const handleUsernameChange = async (e) => {
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
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
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
        ...orgDetails,
        name: newName,
        username: newUsername.toLowerCase(),
        bio: newBio,
        photoURL: newPhotoURL,
        bannerImage: newBannerImage,
        updatedAt: new Date().toISOString()
      };
  
      await updateDoc(orgDocRef, updates);
      
      setOrgDetails(updates);
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
      setError(err.message);
      toast.error("Error saving profile");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error && !orgDetails) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="org-profile-container">
      {/* Display Organisation Details */}
      <div className="org-profile-container">
        <div className="org-banner-section">
          <div className="org-banner">
            <img
              src={bannerImage || "/api/placeholder/1200/300"}
              alt="Organization Banner"
              className="banner-image"
              style={{ width: "100%", height: "200px", objectFit: "cover", borderRadius: "10px" }}
            />
          </div>
          <div className="org-profile-image-container">
            {photoURL ? (
              <img 
                src={photoURL} 
                alt="Profile"
                className="org-profile-image"
              />
            ) : (
              <div className="no-photo">No profile photo</div>
            )}
          </div>
        </div>
        
        <div className="org-details-section">
          <div className="org-name">
            <h3>{name || "Organization Name"}</h3>
          </div>
          <div className="org-username">
            <span>@{username || "username"}</span>
          </div>
          <div className="org-bio">
            <p>{bio || "No bio available"}</p>
          </div>

          {/* Edit Profile Button */}
          {!editMode && (
            <button 
            onClick={() => setEditMode(true)}
            className="edit-profile-button"
            >
              Edit Profile
            </button>
          )}
        </div>
      </div>

      

      {/* Edit Form */}
      {editMode && (
        <div className="edit-profile-container">
          <div className="input-group">
            <label htmlFor="name">Organization Name :</label>
            <input
              id="name"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter organization name"
              className="profile-input"
            />
          </div>

          <div className="input-group">
            <label htmlFor="username">Username :</label>
            <input
              id="username"
              type="text"
              value={newUsername}
              onChange={handleUsernameChange}
              placeholder="Enter username"
              className="profile-input"
            />
            {isCheckingUsername && <span className="checking">Checking username...</span>}
            {usernameError && <span className="error">{usernameError}</span>}
          </div>

          <div className="input-group">
            <label htmlFor="bio">Bio:</label>
            <textarea
              id="bio"
              value={newBio}
              onChange={(e) => setNewBio(e.target.value)}
              placeholder="Write a bio"
              className="profile-input"
              rows="4"
            />
          </div>

          <div className="input-group">
              <label>Phone Number:</label>
              <input
                type="tel"
                value={orgDetails?.phoneNumber}
                className="profile-input"
                placeholder="Phone number"
                disabled
              />
              <span className="helper-text">Phone number cannot be changed</span>
            </div>

          <div className="input-group">
            <label htmlFor="photoURL">Profile Photo URL:</label>
            <input
              id="photoURL"
              type="text"
              value={newPhotoURL}
              onChange={(e) => setNewPhotoURL(e.target.value)}
              placeholder="Enter profile photo URL"
              className="profile-input"
            />
          </div>

          <div className="input-group">
            <label htmlFor="bannerImage">Banner Image URL:</label>
            <input
              id="bannerImage"
              type="text"
              value={newBannerImage}
              onChange={(e) => setNewBannerImage(e.target.value)}
              placeholder="Enter banner image URL"
              className="profile-input"
            />
          </div>

          <div className="button-group">
            <button 
              onClick={handleSaveProfile}
              disabled={isCheckingUsername || !!usernameError}
              className="save-cancle-button"
            >
              Save
            </button>
            <button 
              onClick={() => setEditMode(false)}
              className="save-cancle-button"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganisationProfile;