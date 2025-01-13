import React, { useState, useEffect } from 'react';
import { auth } from '../../../firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { toast } from 'react-toastify';
import { db, storage } from '../../../firebase';
import './OrganisationProfile.css';

function OrganisationProfile() {
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [orgDetails, setOrgDetails] = useState({
    name: "",
    username: "",
    category: "",
    bio: "",
    phoneNumber: "",
    bannerImage: "",
    profileImage: ""
  });
  
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    category: "",
    bio: "",
    phoneNumber: "",
    bannerImage: "",
    profileImage: ""
  });

  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [uploadProgress, setUploadProgress] = useState({ profile: 0, banner: 0 });

  const upcomingEvents = [
    {
      id: 1,
      title: "AI Workshop 2025",
      date: "Feb 15, 2025",
      time: "2:00 PM",
      attendees: 156,
      image: "/api/placeholder/400/300"
    },
    {
      id: 2,
      title: "Machine Learning Bootcamp",
      date: "Mar 1, 2025",
      time: "10:00 AM",
      attendees: 89,
      image: "/api/placeholder/400/300"
    }
  ];

  const pastEvents = [
    {
      id: 3,
      title: "Web3 Conference",
      date: "Jan 5, 2025",
      time: "11:00 AM",
      attendees: 234,
      image: "/api/placeholder/400/300"
    },
    {
      id: 4,
      title: "Python for Beginners",
      date: "Dec 20, 2024",
      time: "3:00 PM",
      attendees: 178,
      image: "/api/placeholder/400/300"
    }
  ];

  useEffect(() => {
    const fetchOrgData = async () => {
      try {
        setIsLoading(true);
        const user = auth.currentUser;
        if (user) {
          const docRef = doc(db, "Organisations", user.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            setOrgDetails({
              ...data,
              phoneNumber: data.phoneNumber || ''
            });
            setFormData({
              ...data,
              phoneNumber: data.phoneNumber || ''
            });
            
            if (data.phoneNumber && !data.name && !data.username) {
              setIsEditing(true);
            }
          }
        }
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching organization data:", error);
        setIsLoading(false);
        toast.error("Error loading organization data");
      }
    };
  
    fetchOrgData();
  }, []);

  const checkUsernameAvailability = async (username) => {
    if (username.length < 3) {
      setUsernameError("Username must be at least 3 characters");
      return false;
    }

    try {
      const q = query(
        collection(db, "Organisations"),
        where("username", "==", username.toLowerCase())
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.empty || 
             (querySnapshot.docs.length === 1 && 
              querySnapshot.docs[0].id === auth.currentUser?.uid);
    } catch (error) {
      console.error("Error checking username:", error);
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
      
      if (!isAvailable && newUsername !== orgDetails.username) {
        setUsernameError("Username is already taken");
      }
    }
  };

  const handleImageUpload = async (file, type) => {
    if (!file) return null;

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
      return null;
    }
  };

  const handleFileChange = async (e, type) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = await handleImageUpload(file, type);
      if (url) {
        setFormData(prev => ({
          ...prev,
          [type === 'profile' ? 'profileImage' : 'bannerImage']: url
        }));
      }
    }
  };

  const handleUpdateProfile = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      if (!formData.name.trim() || !formData.username) {
        toast.error("Name and username are required");
        return;
      }

      if (usernameError) {
        toast.error("Please fix username errors");
        return;
      }

      const orgRef = doc(db, "Organisations", user.uid);
      await setDoc(orgRef, {
        ...formData,
        username: formData.username.toLowerCase(),
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setOrgDetails(formData);
      setIsEditing(false);
      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Error updating profile");
    }
  };

  if (isLoading) {
    return <div className="loading-spinner">Loading...</div>;
  }

  return (
    <div className="org-profile-container">
      <div className="org-banner-section">
        <div className="org-banner">
          <img 
            src={orgDetails.bannerImage || "/api/placeholder/1200/300"} 
            alt="Organization Banner"
            className="banner-image"
          />
          {isEditing && (
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e, 'banner')}
              className="banner-upload"
            />
          )}
        </div>
        <div className="org-profile-image-container">
          <img 
            src={orgDetails.profileImage || "/api/placeholder/150/150"} 
            alt="Organization Profile"
            className="org-profile-image"
          />
          {isEditing && (
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e, 'profile')}
              className="profile-upload"
            />
          )}
        </div>
      </div>

      <div className="org-details-section">
        {isEditing ? (
          <div className="edit-profile-container">
            <div className="input-group">
              <label>Organization Name* :</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="profile-input"
                placeholder="Enter organization name"
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
                  required
                />
              </div>
              {isCheckingUsername && <span className="checking">Checking availability...</span>}
              {usernameError && <span className="error">{usernameError}</span>}
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
            </div>

            <div className="input-group">
              <label>Phone Number:</label>
              <input
                type="tel"
                value={formData.phoneNumber || ''}
                className="profile-input disabled-input"
                placeholder="Phone number"
                disabled
              />
              <span className="helper-text">Phone number cannot be changed</span>
            </div>

            

            <div className="button-group">
              <button 
                className="save-cancel-button"
                onClick={handleUpdateProfile}
                disabled={isCheckingUsername || !!usernameError}
              >
                Save
              </button>
              <button 
                className="save-cancel-button" 
                onClick={() => {
                  setIsEditing(false);
                  setFormData(orgDetails);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="org-main-info">
              <h1 className="org-name">{orgDetails.name}</h1>
              <span className="org-username">@{orgDetails.username}</span>
              {orgDetails.category && (
                <span className="category-tag">{orgDetails.category}</span>
              )}
              {orgDetails.phoneNumber && (
                <div className="org-phone">
                  <span>📱 {orgDetails.phoneNumber.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')}</span>
                </div>
              )}
            </div>

            <div className="org-bio">
              <p>{orgDetails.bio}</p>
            </div>

            <button className="edit-profile-button" onClick={() => setIsEditing(true)}>
              Edit Profile
            </button>
          </>
        )}
      </div>

      <div className="events-section">
        <div className="events-nav">
          <button 
            className={`event-nav-button ${activeTab === 'upcoming' ? 'active' : ''}`}
            onClick={() => setActiveTab('upcoming')}
          >
            Upcoming
          </button>
          <button 
            className={`event-nav-button ${activeTab === 'past' ? 'active' : ''}`}
            onClick={() => setActiveTab('past')}
          >
            Past
          </button>
        </div>
        
        <div className="events-container">
          <div className="events-grid">
            {(activeTab === 'upcoming' ? upcomingEvents : pastEvents).map(event => (
              <div key={event.id} className="event-card">
                <div className="event-image">
                  <img src={event.image} alt={event.title} />
                </div>
                <div className="event-details">
                  <h3>{event.title}</h3>
                  <div className="profile-event-info">
                    <span className="event-date">{event.date}</span>
                    <span className="event-time">{event.time}</span>
                  </div>
                  <div className="event-attendees">
                    {event.attendees} attendees
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrganisationProfile;