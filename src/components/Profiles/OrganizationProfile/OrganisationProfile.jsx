import React, { useState, useEffect } from 'react';
import { auth, db } from '../../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import EditOrganizationProfile from './EditOrganizationProfile/EditOrganizationProfile';
import './OrganisationProfile.css';

function OrganisationProfile() {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [orgDetails, setOrgDetails] = useState({
    name: "",
    username: "",
    category: "",
    bio: "",
    phoneNumber: "",
    bannerImage: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBwgHBgkIBwgKCgkLDRYPDQwMDRsUFRAWIB0iIiAdHx8kKDQsJCYxJx8fLT0tMTU3Ojo6Iys/RD84QzQ5OjcBCgoKDQwNGg8PGjclHyU3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3N//AABEIAJQAlAMBIgACEQEDEQH/xAAWAAEBAQAAAAAAAAAAAAAAAAAAAQb/xAAWEAEBAQAAAAAAAAAAAAAAAAAAAUH/xAAVAQEBAAAAAAAAAAAAAAAAAAAAAv/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/ANOApIAAAAqACouAIAKgAAAAACwBAAAAAAFSACkNAAARQEAAAAAAAAAAAAVAFEUAAEAAAAAAAAAAFQAAFEUCAAAAgAAAAAAAKABUVABQEBQAQFEAAABQEUABAFRQEVFAAAABAAAAFQBQAAAQUBFQAVIoAAAAIAAAAACggLBAAUBFRQAAAAKi0ARUABQQAFRQEVFAABAAUQAVFAEUCoqAAAAAAAKgCiAAAAACgBQAEAAAAAAAAAFgAP/Z",
    profileImage: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBwgHBgkIBwgKCgkLDRYPDQwMDRsUFRAWIB0iIiAdHx8kKDQsJCYxJx8fLT0tMTU3Ojo6Iys/RD84QzQ5OjcBCgoKDQwNGg8PGjclHyU3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3N//AABEIAJQAlAMBIgACEQEDEQH/xAAWAAEBAQAAAAAAAAAAAAAAAAAAAQb/xAAWEAEBAQAAAAAAAAAAAAAAAAAAAUH/xAAVAQEBAAAAAAAAAAAAAAAAAAAAAv/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/ANOApIAAAAqACouAIAKgAAAAACwBAAAAAAFSACkNAAARQEAAAAAAAAAAAAVAFEUAAEAAAAAAAAAAFQAAFEUCAAAAgAAAAAAAKABUVABQEBQAQFEAAABQEUABAFRQEVFAAAABAAAAFQBQAAAQUBFQAVIoAAAAIAAAAACggLBAAUBFRQAAAAKi0ARUABQQAFRQEVFAABAAUQAVFAEUCoqAAAAAAAKgCiAAAAACgBQAEAAAAAAAAAFgAP/Z"
  });

  // Define events data
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
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
          if (user) {
            const docRef = doc(db, "organizations", user.uid);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
              const data = docSnap.data();
              setOrgDetails(prevDetails => ({
                ...prevDetails,
                ...data
              }));
            } else {
              console.log("No such organization!");
            }
          }
          setIsLoading(false);
        });
        
        return unsubscribe;
      } catch (error) {
        console.error("Error fetching organization data:", error);
        setIsLoading(false);
      }
    };

    fetchOrgData();
  }, []);

  if (isLoading) {
    return <div>Loading...</div>;
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
        </div>
        <div className="org-profile-image-container">
          <img 
            src={orgDetails.profileImage || "/api/placeholder/150/150"} 
            alt="Organization Profile"
            className="org-profile-image"
          />
        </div>
      </div>

      <div className="org-details-section">
        {isEditing ? (
          <EditOrganizationProfile 
            orgDetails={orgDetails}
            setOrgDetails={setOrgDetails}
            setIsEditing={setIsEditing}
          />
        ) : (
          <>
            <div className="org-main-info">
              <h1 className="org-name">{orgDetails.name || "Organization Name"}</h1>
              <span className="org-username">@{orgDetails.username || "username"}</span>
              {orgDetails.category && (
                <span className="category-tag">{orgDetails.category || "catagory"}</span>
              )}
            </div>

            <div className="org-bio">
              <p>{orgDetails.bio || "Bio of the organisation"}</p>
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