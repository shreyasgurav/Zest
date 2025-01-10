import React, { useState } from 'react';
import './OrganisationProfile.css';

function OrganisationProfile() {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [orgDetails, setOrgDetails] = useState({
    name: "Mood Indigo IIT Bombay",
    username: "moodindigo",
    category: "College Fest",
    bio: "Mood Indigo is Asia's largest college cultural festival conducted annually by the student body of IIT Bombay.",
    bannerImage: "data:image/jpeg;base64,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",
    profileImage: "https://media.licdn.com/dms/image/v2/C560BAQGLMKVj7H5ecw/company-logo_200_200/company-logo_200_200/0/1631318286396?e=1744243200&v=beta&t=lLrqI9ogsiyLzCykr1NyyfZX5NJ9raaX3CSDakkOqlg"
  });



  const upcomingEvents = [
    {
      id: 1,
      title: "AI Workshop 2025",
      date: "Feb 15, 2025",
      time: "2:00 PM",
      attendees: 156,
      image: "/event-placeholder-1.jpg"
    },
    {
      id: 2,
      title: "Machine Learning Bootcamp",
      date: "Mar 1, 2025",
      time: "10:00 AM",
      attendees: 89,
      image: "/event-placeholder-2.jpg"
    }
  ];

  const pastEvents = [
    {
      id: 3,
      title: "Web3 Conference",
      date: "Jan 5, 2025",
      time: "11:00 AM",
      attendees: 234,
      image: "/event-placeholder-3.jpg"
    },
    {
      id: 4,
      title: "Python for Beginners",
      date: "Dec 20, 2024",
      time: "3:00 PM",
      attendees: 178,
      image: "/event-placeholder-4.jpg"
    }
  ];

  return (
    <div className="org-profile-container">
      <div className="org-banner-section">
        <div className="org-banner">
          <img 
            src={orgDetails.bannerImage} 
            alt="Organization Banner"
            className="banner-image"
          />
        </div>
        <div className="org-profile-image-container">
          <img 
            src={orgDetails.profileImage} 
            alt="Organization Profile"
            className="org-profile-image"
          />
        </div>
      </div>

      <div className="org-details-section">
        <div className="org-main-info">
          <h1 className="org-name">{orgDetails.name}</h1>
          <span className="org-username">@{orgDetails.username}</span>
        {/*  <div className="org-category">
            <span className="category-tag">{orgDetails.category}</span>
          </div>
      */}  
        </div>

        <div className="org-bio">
          <p>{orgDetails.bio}</p>
        </div>


        { /* Number of Subscribers
        <div className="org-stats">
          <div className="stat-item">
            <span className="stat-number">10K+</span>
            <span className="stat-label">Members</span>
          </div>
        </div>
        */}
        { /* Subscribe Button
        <button className="subscribe-button">
          Subscribe
        </button>
        */}
      </div>



       {/* Events Section */}
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
          {activeTab === 'upcoming' ? (
            <div className="events-grid">
              {upcomingEvents.map(event => (
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
          ) : (
            <div className="events-grid">
              {pastEvents.map(event => (
                <div key={event.id} className="event-card">
                  <div className="event-image">
                    <img src={event.image} alt={event.title} />
                  </div>
                  <div className="event-details">
                    <h3>{event.title}</h3>
                    <div className="event-info">
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
          )}
        </div>
      </div>
    </div>
  );
}

export default OrganisationProfile;