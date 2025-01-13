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

const FetchProfile = () => {
  // Initialize states with localStorage values
  const [orgDetails, setOrgDetails] = useState(() => {
    const saved = localStorage.getItem('orgDetails');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  
  // Initialize all form states with localStorage
  const [name, setName] = useState(() => localStorage.getItem('orgName') || "");
  const [newName, setNewName] = useState(() => localStorage.getItem('orgName') || "");
  const [username, setUsername] = useState(() => localStorage.getItem('orgUsername') || "");
  const [newUsername, setNewUsername] = useState(() => localStorage.getItem('orgUsername') || "");
  const [bio, setBio] = useState(() => localStorage.getItem('orgBio') || "");
  const [newBio, setNewBio] = useState(() => localStorage.getItem('orgBio') || "");
  const [photoURL, setPhotoURL] = useState(() => localStorage.getItem('orgPhotoURL') || "");
  const [newPhotoURL, setNewPhotoURL] = useState(() => localStorage.getItem('orgPhotoURL') || "");
  const [bannerImage, setBannerImage] = useState(() => localStorage.getItem('orgBannerImage') || "");
  const [newBannerImage, setNewBannerImage] = useState(() => localStorage.getItem('orgBannerImage') || "");
  const [usernameError, setUsernameError] = useState("");

  // Fetch data from Firestore
  const fetchOrgData = async (uid) => {
    try {
      const db = getFirestore();
      const orgDocRef = doc(db, "Organisations", uid);
      const docSnap = await getDoc(orgDocRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Update state and localStorage atomically
        const updateStateAndStorage = (key, value) => {
          localStorage.setItem(`org${key}`, value || "");
          return value || "";
        };

        // Set all the data
        setOrgDetails(data);
        setName(updateStateAndStorage('Name', data.name));
        setNewName(updateStateAndStorage('Name', data.name));
        setUsername(updateStateAndStorage('Username', data.username));
        setNewUsername(updateStateAndStorage('Username', data.username));
        setBio(updateStateAndStorage('Bio', data.bio));
        setNewBio(updateStateAndStorage('Bio', data.bio));
        setPhotoURL(updateStateAndStorage('PhotoURL', data.photoURL));
        setNewPhotoURL(updateStateAndStorage('PhotoURL', data.photoURL));
        setBannerImage(updateStateAndStorage('BannerImage', data.bannerImage));
        setNewBannerImage(updateStateAndStorage('BannerImage', data.bannerImage));
        
        // Store complete details
        localStorage.setItem('orgDetails', JSON.stringify(data));
      } else {
        // For new users, initialize with empty values but preserve phone number
        const auth = getAuth();
        const user = auth.currentUser;
        if (user) {
          const newData = {
            phoneNumber: user.phoneNumber || "",
            name: localStorage.getItem('orgName') || "",
            username: localStorage.getItem('orgUsername') || "",
            bio: localStorage.getItem('orgBio') || "",
            photoURL: localStorage.getItem('orgPhotoURL') || "",
            bannerImage: localStorage.getItem('orgBannerImage') || "",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          
          await setDoc(orgDocRef, newData);
          setOrgDetails(newData);
          localStorage.setItem('orgDetails', JSON.stringify(newData));
        }
      }
    } catch (err) {
      console.error("Error fetching org data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Monitor authentication state
  useEffect(() => {
    const auth = getAuth();
    let isSubscribed = true;
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && isSubscribed) {
        // Don't clear states, just fetch new data
        await fetchOrgData(user.uid);
      } else if (!user) {
        // User logged out - keep localStorage but update UI state
        setOrgDetails(prev => {
          // Keep the previous details in localStorage
          return null;
        });
        setLoading(false);
        setError("User not authenticated");
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
        return;
      }
  
      const db = getFirestore();
      const orgDocRef = doc(db, "Organisations", user.uid);
  
      // Username validation
      if (newUsername && newUsername !== username) {
        const usernameQuery = query(
          collection(db, "Organisations"),
          where("username", "==", newUsername.toLowerCase())
        );
        const querySnapshot = await getDocs(usernameQuery);
  
        if (!querySnapshot.empty) {
          setUsernameError("Username is already taken. Please choose another.");
          setLoading(false);
          return;
        }
      }
  
      const updates = {
        ...(orgDetails || {}), // Preserve existing data
        name: newName,
        username: newUsername.toLowerCase(),
        bio: newBio,
        photoURL: newPhotoURL,
        bannerImage: newBannerImage,
        updatedAt: new Date().toISOString()
      };
  
      // Update Firestore
      await updateDoc(orgDocRef, updates);
      
      // Update both state and localStorage atomically
      setOrgDetails(updates);
      localStorage.setItem('orgDetails', JSON.stringify(updates));
      
      // Update individual fields
      setName(newName);
      setUsername(newUsername);
      setBio(newBio);
      setPhotoURL(newPhotoURL);
      setBannerImage(newBannerImage);
      
      localStorage.setItem('orgName', newName);
      localStorage.setItem('orgUsername', newUsername);
      localStorage.setItem('orgBio', newBio);
      localStorage.setItem('orgPhotoURL', newPhotoURL);
      localStorage.setItem('orgBannerImage', newBannerImage);
      
      setUsernameError("");
      setEditMode(false);
    } catch (err) {
      console.error("Error saving profile:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="org-profile-container">
      {/* Display Organisation Details */}
      <div className="org-main-info">
        <div className="org-banner-section">
          <div className="org-banner">
            <img
              src={bannerImage || "/api/placeholder/1200/300"}
              alt="Organization Banner"
              className="banner-image"
              style={{ width: "100%", height: "200px", objectFit: "cover", borderRadius: "10px" }}
            />
          </div>
          <div className="org-photo">
            {photoURL ? (
              <img src={photoURL} alt="Profile" style={{ width: "150px", borderRadius: "50%" }} />
            ) : (
              <p>No profile photo available</p>
            )}
          </div>
        </div>
        <div className="org-name">
          <span>{name || "Name"}</span>
        </div>
        <div className="org-username">
          <span>@{username || "Username"}</span>
        </div>
        <div className="org-bio">
          <span>{bio || "Bio"}</span>
        </div>
        <div className="org-phone">
          <span>📱 Phone Number: {orgDetails?.phoneNumber || "Not available"}</span>
        </div>
      </div>

      {/* Button to toggle Edit Form */}
      <button onClick={() => setEditMode(!editMode)}>
        {editMode ? "Cancel" : "Edit Profile"}
      </button>

      {/* Edit Form */}
      {editMode && (
        <div className="edit-form">
          <label htmlFor="name">Enter Name:</label>
          <input
            id="name"
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Enter your name"
          />

          <label htmlFor="username">Enter Unique Username:</label>
          <input
            id="username"
            type="text"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            placeholder="Enter a unique username"
          />
          {usernameError && <div style={{ color: "red" }}>{usernameError}</div>}

          <label htmlFor="bio">Enter Bio:</label>
          <textarea
            id="bio"
            value={newBio}
            onChange={(e) => setNewBio(e.target.value)}
            placeholder="Write a short bio"
          />

          <label htmlFor="photoURL">Enter Profile Photo URL:</label>
          <input
            id="photoURL"
            type="text"
            value={newPhotoURL}
            onChange={(e) => setNewPhotoURL(e.target.value)}
            placeholder="Enter photo URL"
          />

          <label htmlFor="bannerImage">Enter Banner Image URL:</label>
          <input
            id="bannerImage"
            type="text"
            value={newBannerImage}
            onChange={(e) => setNewBannerImage(e.target.value)}
            placeholder="Enter banner image URL"
          />

          <button onClick={handleSaveProfile}>Save</button>
        </div>
      )}
    </div>
  );
};

export default FetchProfile;